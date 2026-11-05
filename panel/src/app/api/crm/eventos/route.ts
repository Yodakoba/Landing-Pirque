import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import {
  CRM_API, NUESTRO_LUGAR, leerEventos, eventosPorFecha, periodosNuestros,
  anotadosDe
} from '@/lib/crm';
import { leerReservas } from '@/lib/datos';
import { esFecha } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * Los eventos del CRM del socio que ocurren en nuestro recinto.
 * Ver `src/lib/crm.ts` para el porqué de cada decisión.
 *
 * **Es una ruta aparte y no un campo de `/api/ocupacion`**, a propósito: si
 * el CRM no responde, el calendario se tiene que dibujar igual. Mezclarlo
 * habría puesto un servicio de un tercero en el camino de la pantalla que
 * contesta cuánta gente viene — es la misma asimetría de
 * `posiblesDeLosDias()`, y por el mismo motivo.
 *
 * **La clave vive en `CRM_API_KEY`, una variable de Vercel**, del lado del
 * servidor. Nunca baja al navegador, y por eso la llamada se hace acá y no
 * desde la pantalla: con ella se pueden **escribir y borrar** las fechas que
 * este panel publica en el calendario del socio.
 *
 * **Sin la variable no falla: devuelve vacío y lo dice.** El panel tiene que
 * funcionar antes de que nadie configure nada, igual que funciona antes de
 * que exista la pestaña de presupuestos.
 *
 * La respuesta de afuera se guarda **una hora** en la caché de datos de
 * Vercel, que es lo que el socio pidió ("leer una vez por hora está
 * perfecto"). La ruta sigue siendo dinámica: el permiso se revisa en cada
 * petición; lo que se reutiliza es la respuesta del CRM.
 */
export async function GET(req: Request) {
  // **`presupuestos` y no `ver`** (2026-11-05), por lo mismo que `/api/equipo`:
  // esto no son nuestras reservas, son las cotizaciones y los cerrados del
  // socio. Es la misma capa comercial que los presupuestos —de hecho la
  // mitad son el presupuesto de otro— así que va con ese permiso, que hoy
  // tienen exactamente los tres roles que lo veían antes.
  const no = await exigir(req, 'presupuestos');
  if (no) return no;

  const clave = process.env.CRM_API_KEY;
  if (!clave) {
    return NextResponse.json({ dias: {}, periodos: [], configurado: false });
  }

  // El rango lo manda la pantalla, igual que `/api/ocupacion`: los
  // calendarios dibujan cualquier mes y pedir los 221 eventos para mostrar
  // uno es trabajo al pedo. Una fecha con basura se ignora en vez de
  // romper, así que sin parámetros se piden todos.
  const q = new URL(req.url).searchParams;
  const url = new URL(CRM_API);
  // **El filtro por lugar va acá Y otra vez al agrupar.** Este ahorra datos;
  // el de `eventosPorFecha()` es el que garantiza que no se cuele el recinto
  // de otro negocio si el parámetro deja de aplicarse, como pasaba el
  // 2026-11-02 antes de que el socio lo implementara.
  url.searchParams.set('lugar', NUESTRO_LUGAR);
  for (const k of ['desde', 'hasta']) {
    const v = q.get(k);
    if (esFecha(v)) url.searchParams.set(k, v);
  }

  try {
    const r = await fetch(url, {
      headers: { 'x-api-key': clave },
      next: { revalidate: 60 * 60 }
    });
    if (!r.ok) throw new Error(`El CRM respondió ${r.status}`);
    const eventos = leerEventos(await r.json());
    // **Lo ya anotado se filtra acá y no en la caché.** La respuesta del CRM
    // se guarda una hora; las reservas cambian en cualquier momento, así que
    // quién ya tiene su reserva se vuelve a preguntar en cada llamada. Si la
    // planilla no responde, se sigue mostrando todo: de más, nunca de menos.
    const anotados = anotadosDe(await leerReservas().catch(() => []));
    return NextResponse.json({
      dias: Object.fromEntries(eventosPorFecha(eventos, anotados)),
      periodos: periodosNuestros(eventos),
      configurado: true
    });
  } catch (e) {
    console.error('[crm]', e);
    // Vacío y con el motivo, como el clima: lo peor que puede pasar es que
    // no se vea la línea del CRM, no que no se vea el día.
    return NextResponse.json(
      { dias: {}, periodos: [], configurado: true, error: 'No se pudo leer el CRM.' },
      { status: 502 }
    );
  }
}
