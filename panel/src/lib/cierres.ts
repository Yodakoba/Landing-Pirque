/**
 * Cerrar un día: la declaración de que ya está todo anotado.
 *
 * **Nace el 2026-10-23, al sacar "Pasar lista" como paso aparte.** El
 * cliente lo dijo así: se planifica en el calendario con las reservas a la
 * vista, se confirma en `/turnos` —quién vino, la propina, los montos— y
 * *"una vez que el día pasó, el panel puede mostrar: oiga, falta confirmar
 * tantos trabajadores y actividades extras para cerrar el día"*.
 *
 * **Por qué es un dato y no se deduce.** Se podría decir que un día está
 * cerrado cuando nadie quedó sin marcar, pero eso confunde dos cosas: que
 * no falte nada por marcar es una condición, y que alguien haya **revisado
 * y dado por cerrado** es un hecho. Un día sin equipo asignado cumpliría la
 * condición sin que nadie lo haya mirado, y un día donde falta agregar a
 * quien llegó de más se vería completo justamente porque falta. Cerrar es
 * alguien diciendo "ya está", con su nombre y la hora.
 *
 * Por lo mismo **se puede reabrir**: aparece un ajuste olvidado, alguien
 * reclama su propina. Reabrir queda anotado en la bitácora como cualquier
 * otra acción.
 */
import { VINO, type Turno } from './equipo.ts';
import type { Extra } from './extras.ts';
import type { Fecha } from './fechas.ts';

export const HOJA_CIERRES = 'Cierres';

/** Una fila por día cerrado. Por nombre de columna, como `Turnos`. */
export const COL_CIERRES = {
  fecha: 'Fecha',
  quien: 'Cerrado por',
  cuando: 'Cuándo'
} as const;

export const ENCABEZADO_CIERRES: string[] = Object.values(COL_CIERRES);

export interface Cierre {
  fecha: Fecha;
  quien: string;
  cuando: string;
  /** Fila en la planilla, para poder borrarla al reabrir. */
  fila: number;
}

export function leerCierresDe(filas: string[][]): Cierre[] {
  if (filas.length < 2) return [];
  const enc = filas[0].map((c) => String(c ?? '').trim().toLowerCase());
  const col = (nombre: string) => enc.indexOf(nombre.toLowerCase());
  const iF = col(COL_CIERRES.fecha);
  if (iF === -1) return [];
  const iQ = col(COL_CIERRES.quien);
  const iC = col(COL_CIERRES.cuando);
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());

  const salida: Cierre[] = [];
  for (let n = 1; n < filas.length; n++) {
    const fecha = en(filas[n], iF).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    salida.push({ fecha, quien: en(filas[n], iQ), cuando: en(filas[n], iC), fila: n + 1 });
  }
  return salida;
}

export const estaCerrado = (cierres: Cierre[], fecha: Fecha) =>
  cierres.some((c) => c.fecha === fecha);

export const cierreDe = (cierres: Cierre[], fecha: Fecha) =>
  cierres.find((c) => c.fecha === fecha);

/**
 * Lo que falta para poder cerrar un día.
 *
 * **Lo único que bloquea es la asistencia sin marcar**, porque es lo que
 * decide si una jornada se paga o no: un turno sin marcar no suma nada, así
 * que cerrar con turnos a medias sería cerrar con el total mal.
 *
 * La propina y las actividades extras **se avisan pero no bloquean**. Un
 * día sin propina existe —no todos los días dejan—, y una actividad sin
 * confirmar es plata de otro bolsillo que se arregla en su propia página.
 * Bloquear por ellas obligaría a inventar un cero para poder cerrar, y un
 * cero inventado es peor que un aviso.
 */
export function faltaParaCerrar(
  turnos: Turno[], extras: Extra[], fecha: Fecha
): { sinMarcar: number; extrasSinConfirmar: number; conEquipo: number; sinPropina: boolean } {
  const delDia = turnos.filter((t) => t.fecha === fecha);
  const exDelDia = extras.filter((e) => e.fecha === fecha);
  return {
    sinMarcar: delDia.filter((t) => !t.asistencia).length,
    extrasSinConfirmar: exDelDia.filter((e) => !e.estado).length,
    conEquipo: delDia.length,
    // Nadie anotó propina y sí hubo gente que vino: vale la pena decirlo.
    sinPropina: delDia.some((t) => t.asistencia === VINO.si)
                && delDia.every((t) => !t.propina)
  };
}

/** Si el día se puede cerrar: hay a quién marcar y no falta nadie por marcar. */
export function sePuedeCerrar(turnos: Turno[], extras: Extra[], fecha: Fecha): boolean {
  const f = faltaParaCerrar(turnos, extras, fecha);
  return f.conEquipo > 0 && f.sinMarcar === 0;
}

/**
 * Los días **ya pasados** con equipo asignado y algo sin confirmar.
 *
 * Es lo que el calendario del equipo muestra arriba: la lista de lo que hay
 * que ir a cerrar. Un día que todavía no llega no está pendiente —nadie
 * puede decir quién vino a un sábado que no ha ocurrido—, y por eso `hoy`
 * se pasa como argumento en vez de leerlo acá: así la prueba puede pararse
 * en cualquier fecha sin tocar el reloj.
 */
export function diasPorCerrar(
  turnos: Turno[], extras: Extra[], cierres: Cierre[], hoy: Fecha
): Fecha[] {
  const fechas = new Set<Fecha>();
  for (const t of turnos) if (t.fecha < hoy) fechas.add(t.fecha);
  return [...fechas]
    .filter((f) => !estaCerrado(cierres, f))
    .sort();
}
