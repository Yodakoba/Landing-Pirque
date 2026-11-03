/**
 * Publicar nuestros días en el calendario del socio.
 *
 * El porqué de cada decisión —qué día va en qué color, qué se borra y qué se
 * deja quieto, por qué el título no lleva la ocupación escrita— está en
 * `crm.ts`, que es la parte pura y la que tiene pruebas. Acá vive lo que toca
 * la red y la planilla, por lo mismo que `datos.ts` está separado de
 * `filas.ts`: así `prueba.ts` corre sin credenciales y sin salir a internet.
 *
 * **La clave es `CRM_API_KEY`, una variable de Vercel.** Con ella se puede
 * escribir y borrar en la tabla del socio, así que nunca baja al navegador:
 * todo lo de este archivo corre del lado del servidor. Ojo con el nombre —
 * cualquier cosa que empiece con `NEXT_PUBLIC_` la publica Next en el bundle.
 *
 * **Sin la variable no falla**: devuelve `configurado: false` y no hace nada.
 * El panel tiene que funcionar antes de que nadie configure nada.
 */
import {
  CRM_API, NUESTRO_LUGAR, type DiaPublicado, diaParaElCRM, leerPublicados,
  reconciliar, cuerpoDe, tandas, idExterno, type AccionesCRM
} from './crm.ts';
import { leerReservas, leerFechas, leerConfig } from './datos.ts';
import { ocupacionDe } from './ocupacion.ts';
import { hoy, sumarDias, esFecha, type Fecha } from './fechas.ts';
import type { FechaHabil } from './tipos.ts';

/**
 * Cuánto se espera al CRM. **Es un empujón, no el guardado**: si su API está
 * lenta, la jefa de turno no puede quedarse mirando un botón porque un
 * servicio de un tercero no contesta. Lo que se pierda lo recupera la
 * reconciliación diaria, que es justamente para eso.
 */
const ESPERA_MS = 6000;

export const configurado = () => !!process.env.CRM_API_KEY;

async function pedir(ruta: string, init: RequestInit = {}) {
  const clave = process.env.CRM_API_KEY;
  if (!clave) throw new Error('Falta CRM_API_KEY.');
  const r = await fetch(`${CRM_API}${ruta}`, {
    ...init,
    headers: { 'x-api-key': clave, 'Content-Type': 'application/json',
      ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(ESPERA_MS),
    cache: 'no-store'
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = (cuerpo as { error?: string }).error;
    throw new Error(`El CRM respondió ${r.status}${e ? `: ${e}` : ''}`);
  }
  return cuerpo as Record<string, unknown>;
}

/** Lo que ya está publicado allá. */
export async function leerDelCRM(): Promise<DiaPublicado[]> {
  return leerPublicados(await pedir('/externos'));
}

/**
 * Manda días. El cuerpo es **un array pelado**: ver `cuerpoDe()`, donde está
 * anotado contra qué se comprobó.
 */
export async function mandar(dias: DiaPublicado[]): Promise<number> {
  let guardados = 0;
  for (const tanda of tandas(dias)) {
    const r = await pedir('/externos',
      { method: 'POST', body: JSON.stringify(cuerpoDe(tanda)) });
    guardados += Number(r.guardados) || 0;
  }
  return guardados;
}

/**
 * Saca días. `DELETE` es idempotente del lado del socio —un id que no existe
 * responde 200 con `{"eliminados": 0}`, nunca error— así que no hace falta
 * comprobar antes si está.
 *
 * **Un borrado que falla no detiene a los que vienen detrás**, al revés que
 * `mandar()`. La diferencia es real: un `POST` es una llamada para toda la
 * tanda, así que si falla no hay nada que salvar; acá son una llamada por id,
 * y abortar en la primera dejaría que **un solo id permanentemente malo
 * bloqueara la limpieza para siempre** — cada corrida volvería a estrellarse
 * en el mismo. Los que fallaron se devuelven para que la respuesta los
 * nombre; se reintentan mañana.
 */
export async function sacar(ids: string[]): Promise<{ eliminados: number; fallaron: string[] }> {
  let eliminados = 0;
  const fallaron: string[] = [];
  for (const id of ids) {
    try {
      const r = await pedir(`/externos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      eliminados += Number(r.eliminados) || 0;
    } catch (e) {
      console.error('[crm:borrar]', id, e);
      fallaron.push(id);
    }
  }
  return { eliminados, fallaron };
}

/**
 * Los días nuestros que hay que publicar en un rango.
 *
 * Mira **lo que hay en la hoja y los días con reservas**, no los que la regla
 * abriría: un día que la regla abre y que nadie configuró todavía no tiene
 * cupo ni reservas, así que `diaParaElCRM()` le devolvería `null` de todas
 * formas. Pedirle a la planilla una lista más larga para descartarla después
 * es trabajo al pedo.
 */
export async function diasDeseados(desde: Fecha, hasta: Fecha): Promise<DiaPublicado[]> {
  const [reservas, fechas, cfg] = await Promise.all([
    leerReservas(), leerFechas(), leerConfig()
  ]);
  const enRango = (f: string) => f >= desde && f <= hasta;
  const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
  const dias = [...new Set([
    ...fechas.map((f) => f.fecha).filter(enRango),
    ...reservas.map((r) => r.fecha).filter(enRango)
  ])].sort();

  const salida: DiaPublicado[] = [];
  for (const f of dias) {
    const dia: FechaHabil = porFecha.get(f) ?? {
      // Igual que en `/api/ocupacion`: capacidad 0 y estado en blanco. Un día
      // que nadie configuró no está abierto, pero tampoco está cerrado.
      fecha: f, capacidad: 0, apertura: cfg.horaApertura, estado: '', notas: '', fila: -1
    };
    const d = diaParaElCRM(ocupacionDe(reservas, dia, cfg.cortes));
    if (d) salida.push(d);
  }
  return salida;
}

/** El resultado de una reconciliación, para contarlo en la respuesta. */
export interface Resultado extends AccionesCRM {
  desde: Fecha;
  hasta: Fecha;
  guardados: number;
  eliminados: number;
  /** Ids que no se pudieron sacar. Se reintentan en la corrida siguiente. */
  fallaron: string[];
}

/**
 * La reconciliación completa: lee lo publicado, manda lo que cambió y saca lo
 * que ya no califica.
 *
 * La ventana llega hasta `dias_a_futuro` de la configuración, el mismo
 * horizonte que el calendario del panel. Más allá de ahí esta función **no
 * opina**, y el porqué está en `reconciliar()`.
 */
export async function reconciliarTodo(): Promise<Resultado> {
  const cfg = await leerConfig();
  const desde = hoy();
  const hasta = sumarDias(desde, cfg.diasAFuturo);
  const [deseados, publicados] = await Promise.all([
    diasDeseados(desde, hasta), leerDelCRM()
  ]);
  const plan = reconciliar(deseados, publicados, desde, hasta);
  // Primero mandar y después borrar, en ese orden: si algo falla en el medio,
  // lo peor que puede pasar es que quede un día de más en su calendario —que
  // es visible y se arregla mañana— y no un día que desaparece de los dos
  // lados sin que nadie se entere. Es el mismo criterio que convertir un
  // presupuesto en reserva.
  const guardados = await mandar(plan.publicar);
  const { eliminados, fallaron } = await sacar(plan.borrar);
  return { ...plan, desde, hasta, guardados, eliminados, fallaron };
}

/**
 * El empujón de uno o varios días, para cuando alguien los acaba de tocar.
 *
 * **Nunca lanza y nunca bloquea el guardado.** Si el CRM no responde, el
 * panel guarda igual y la reconciliación diaria lo pone al día: es la misma
 * asimetría de `posiblesDeLosDias()` — un servicio de un tercero no se mete
 * en el camino de la pantalla que contesta cuánta gente viene.
 *
 * Se espera la respuesta en vez de dejarla corriendo sola porque en Vercel la
 * función se apaga cuando la petición termina: un `fetch` sin `await` se
 * queda a medio camino. De ahí el tope de `ESPERA_MS`.
 *
 * Y publica o borra según corresponda: un día que se reabre, o al que se le
 * cancela la última reserva, deja de calificar, y entonces lo que hay que
 * hacer es sacarlo. Sin eso le quedaría un día naranjo fantasma.
 *
 * **Recibe varios días y lee la planilla una sola vez.** Editar una reserva
 * puede moverla de fecha, y entonces hay dos días que cambiaron: el que la
 * perdió y el que la ganó. Llamar dos veces costaría seis lecturas para
 * contestar lo mismo.
 */
export async function empujarDias(fechas: Fecha[]): Promise<void> {
  if (!configurado()) return;
  const dias = [...new Set(fechas.filter(esFecha))];
  if (!dias.length) return;
  try {
    const [reservas, enLaHoja, cfg] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig()
    ]);
    const mandar_: DiaPublicado[] = [];
    const sacar_: string[] = [];
    for (const fecha of dias) {
      const dia: FechaHabil = enLaHoja.find((f) => f.fecha === fecha) ?? {
        fecha, capacidad: 0, apertura: cfg.horaApertura, estado: '', notas: '', fila: -1
      };
      const d = diaParaElCRM(ocupacionDe(reservas, dia, cfg.cortes));
      if (d) mandar_.push(d);
      else sacar_.push(idExterno(fecha));
    }
    if (mandar_.length) await mandar(mandar_);
    if (sacar_.length) await sacar(sacar_);
  } catch (e) {
    // A propósito solo al log: el guardado ya ocurrió y es lo que importa.
    console.error('[crm:empujon]', dias.join(', '), e);
  }
}

/** Un día solo, que es el caso corriente. */
export const empujarDia = (fecha: Fecha) => empujarDias([fecha]);

export { NUESTRO_LUGAR };
