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
 * **Un día cerrado no se edita: se corrige** (2026-11-03, decidido con el
 * cliente). Hasta ese día cerrar era solo una marca —el día se seguía
 * editando igual, y *Reabrir* borraba la marca sin desbloquear nada, porque
 * no había nada bloqueado—. Ahora cerrado quiere decir que ningún cambio
 * entra, salvo una **corrección**: la hace el administrador o quien paga
 * (`corregir`), lleva un motivo escrito, y el día **nunca deja de estar
 * cerrado** mientras tanto. Ver `corregirDiaCerrado()`.
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

/**
 * **Un día se cierra desde el mismo día en adelante, nunca antes**
 * (2026-11-05, lo pidió el cliente). Cerrar es declarar quién vino, y eso
 * no se sabe de un día que no ha ocurrido. Se compara como texto
 * `AAAA-MM-DD`, que ordena igual que las fechas, y `hoy` lo pone quien
 * llama con la hora de Chile.
 */
export const yaLlego = (fecha: Fecha, hoy: Fecha): boolean => fecha <= hoy;

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

/**
 * Si un cambio puede entrar a un día, mirando si está cerrado.
 *
 * **Es la única puerta**, y la usan todas las rutas que escriben algo de
 * un día —el equipo, las actividades extras y las reservas—, así que la
 * regla vive en un solo lugar:
 *
 * - **Un día abierto** recibe cualquier cambio, como siempre.
 * - **Un día cerrado** solo recibe una **corrección**: de quien tenga el
 *   permiso `corregir`, y **con su motivo escrito**. El motivo no es un
 *   adorno: es lo que se va a preguntar un mes después, sobre todo si ese
 *   día ya se pagó, y queda en la bitácora.
 *
 * **El día no se reabre para corregirlo.** Abrir, cambiar y volver a cerrar
 * son tres pasos, y el que se olvida es el último: queda un día abierto que
 * nadie nota. Así, la corrección entra con el día cerrado y el día sigue
 * cerrado después.
 *
 * Es pura —recibe si está cerrado y si quien llama puede corregir— para
 * poder probarla sin planilla.
 */
export function corregirDiaCerrado(
  { cerrado, puedeCorregir, motivo }:
  { cerrado: boolean; puedeCorregir: boolean; motivo?: unknown }
): { ok: true; correccion: string } | { ok: false; status: number; error: string } {
  if (!cerrado) return { ok: true, correccion: '' };
  if (!puedeCorregir) {
    return { ok: false, status: 409, error:
      'Este día está cerrado. Solo el administrador o quien hace los pagos puede corregirlo.' };
  }
  const m = typeof motivo === 'string' ? motivo.trim() : '';
  if (!m) {
    return { ok: false, status: 400, error:
      'Para corregir un día cerrado hay que escribir el motivo.' };
  }
  return { ok: true, correccion: m };
}
