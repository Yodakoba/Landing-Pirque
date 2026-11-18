/**
 * **Dejar la base en cero para el paso a producción** (2026-11-18). Qué se
 * vacía y qué se conserva vive en `lib/produccion.ts`, en una lista fija.
 *
 * - `GET` dice cuántas filas tiene cada pestaña, a qué tienda de Shopify
 *   está conectado el panel y si hay calendario. Una tanda de lecturas.
 * - `POST` borra. Exige haber hecho la copia de la planilla y escribir la
 *   palabra; lo comprueba acá, no la pantalla. Primero los eventos de
 *   Calendar (salen de las reservas, que todavía están), después las
 *   pestañas en una sola llamada, después vuelve a abrir los días de la regla
 *   (`abrirDiasDeLaRegla()`, para que el sitio no quede sin fechas), y al
 *   final la bitácora, que ya quedó vacía: esta es su primera línea.
 *
 * Solo el permiso `mantencion` (el administrador).
 */
import { NextResponse } from 'next/server';
import { conLecturas, leerHoja, vaciarHojas, idPlanilla, esPestanaQueNoExiste } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { anotar, abrirDiasDeLaRegla, leerConfig } from '@/lib/datos';
import { deDiasSemana } from '@/lib/config';
import { HOJA_RESERVAS, COL_RESERVAS, normalizar } from '@/lib/columnas';
import { idDeEvento } from '@/lib/calendario';
import { borrarEvento, hayCalendario } from '@/lib/google-calendar';
import {
  SE_VACIAN, SE_CONSERVAN, PALABRA_PARA_BORRAR, confirmado, filasConDatos,
  tiendaDe, detalleDeLaLimpieza, idsConEvento
} from '@/lib/produccion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TODAS = [...SE_VACIAN, ...SE_CONSERVAN].map((p) => p.hoja);

/** Lo que hay en cada pestaña: `null` si no existe. */
async function contar(): Promise<{ cuantas: Record<string, number | null>; reservas: string[][] }> {
  const cuantas: Record<string, number | null> = {};
  let reservas: string[][] = [];
  await Promise.all(TODAS.map(async (h) => {
    try {
      const filas = await leerHoja(h);
      cuantas[h] = filasConDatos(filas);
      if (h === HOJA_RESERVAS) reservas = filas;
    } catch (e) {
      if (!esPestanaQueNoExiste(e)) throw e;
      cuantas[h] = null;
    }
  }));
  return { cuantas, reservas };
}

/** Los ids de las reservas, por el nombre de su columna. */
function idsDeReservas(filas: string[][]): string[] {
  const enc = (filas[0] ?? []).map(normalizar);
  const i = enc.indexOf(normalizar(COL_RESERVAS.id));
  return i < 0 ? [] : filas.slice(1).map((f) => f[i] ?? '');
}

export const GET = conLecturas(TODAS, async function GET(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  try {
    const [{ cuantas, reservas }, cfg] = await Promise.all([contar(), leerConfig()]);
    return NextResponse.json({
      seVacian: SE_VACIAN.map((p) => ({ ...p, filas: cuantas[p.hoja] })),
      seConservan: SE_CONSERVAN.map((p) => ({ ...p, filas: cuantas[p.hoja] })),
      eventos: hayCalendario() ? idsConEvento(idsDeReservas(reservas)).length : 0,
      calendario: hayCalendario(),
      tienda: tiendaDe(process.env.SHOPIFY_DOMINIO),
      palabra: PALABRA_PARA_BORRAR,
      // Lo que se vuelve a abrir solo después de borrar.
      regla: { dias: deDiasSemana(cfg.diasAbiertos).replace(/,\s*/g, ', '), hasta: cfg.diasAFuturo, cupo: cfg.cupoNormal },
      planilla: `https://docs.google.com/spreadsheets/d/${idPlanilla()}`
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas(TODAS, async function POST(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  const quien = await quienEs(req);

  let cuerpo: unknown = null;
  try { cuerpo = await req.json(); } catch { /* cuerpo vacío: no confirma */ }
  if (!confirmado(cuerpo)) {
    return NextResponse.json({
      error: `Para borrar hay que marcar que hiciste la copia de la planilla y escribir ${PALABRA_PARA_BORRAR}.`
    }, { status: 400 });
  }

  try {
    const { cuantas, reservas } = await contar();

    // Los eventos primero: salen de las reservas, que después ya no están.
    let eventos = 0, eventosFallidos = 0;
    if (hayCalendario()) {
      const ids = idsConEvento(idsDeReservas(reservas));
      for (let i = 0; i < ids.length; i += 5) {
        await Promise.all(ids.slice(i, i + 5).map(async (id) => {
          try { await borrarEvento(idDeEvento(id)); eventos++; }
          catch (e) { eventosFallidos++; console.error('No se pudo borrar el evento', id, e); }
        }));
      }
    }

    const vaciadas = await vaciarHojas(SE_VACIAN.map((p) => p.hoja));

    // Los días de la regla, de vuelta: sin esto el sitio queda sin fechas
    // hasta la tarea de mañana. Si falla, lo borrado ya está borrado: se dice
    // y la tarea diaria los abre igual.
    let abiertos = 0, sinAbrir = false;
    try { abiertos = (await abrirDiasDeLaRegla()).length; }
    catch (e) { sinAbrir = true; console.error('No se pudieron abrir los días de la regla', e); }

    const numeros: Record<string, number> = {};
    for (const p of SE_VACIAN) numeros[p.hoja] = cuantas[p.hoja] ?? 0;
    await anotar({ ...quien, accion: 'Dejó la base en cero para producción',
      detalle: detalleDeLaLimpieza(numeros, eventos)
        + (eventosFallidos ? ` · ${eventosFallidos} eventos no se pudieron borrar` : '')
        + (abiertos ? ` · abrió ${abiertos} días de la regla` : '') });

    return NextResponse.json({
      ok: true,
      vaciadas,
      filas: Object.values(numeros).reduce((a, b) => a + b, 0),
      eventos, eventosFallidos, abiertos, sinAbrir
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
