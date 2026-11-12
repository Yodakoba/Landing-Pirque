/**
 * **¿Cambió algo desde que cargó la pantalla?** (2026-11-12, lo pidió el
 * cliente). La encargada abre el calendario a las 10 y lo deja abierto;
 * entra una compra por Shopify y los números de su pantalla quedan viejos
 * sin que nada lo diga.
 *
 * La respuesta es una **firma**: un resumen corto de las reservas y los días
 * de la planilla. Si la firma que tiene la pantalla no es la que da el
 * servidor ahora, algo cambió y la pantalla se recarga.
 *
 * Es lo que hace barata la revisión: preguntar por la firma lee dos
 * pestañas en **una sola lectura** a Google (`/api/cambios`), y la carga
 * completa —unas cuatro lecturas— se hace solo cuando de verdad hay
 * cambios. El límite es de 60 lecturas por minuto para todo el panel.
 *
 * Puro, sin red ni planilla, para poder probarlo.
 */
import type { Reserva, FechaHabil } from './tipos.ts';
import { ocupaLugar } from './ocupacion.ts';

/** Cada cuánto se revisa con la pantalla a la vista: dos minutos. */
export const REVISAR_CADA = 2 * 60 * 1000;
/** Si Google pide calma, se espera el doble cada vez, hasta este techo. */
export const REVISAR_COMO_MAXIMO = 10 * 60 * 1000;
/** Al volver a la pestaña se revisa al tiro, salvo que se haya revisado hace menos que esto. */
export const VOLVER_A_REVISAR = 30 * 1000;
/** Cuánto dura marcado en dorado un día que cambió. */
export const MARCA_DURA = 60 * 1000;

/** FNV-1a de 32 bits: corto, estable y sin dependencias. No es seguridad, es "¿es lo mismo?". */
function fnv(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * La firma de las reservas y los días. **Sin el número de fila**: es dónde
 * está escrita la reserva, no qué dice, y borrar una fila de más arriba lo
 * corre en todas las de abajo sin que ninguna haya cambiado. Que una reserva
 * desaparezca igual cambia la firma, porque deja de estar.
 */
export function firmaDe(reservas: Reserva[], fechas: FechaHabil[]): string {
  const r = reservas.map(({ fila: _f, ...resto }) => resto);
  const f = fechas.map(({ fila: _f, ...resto }) => resto);
  return fnv(JSON.stringify(r)) + fnv(JSON.stringify(f));
}

/** Cuánta gente ocupa lugar en cada día. Es lo que se compara para decir qué cambió. */
export function personasPorDia(reservas: Reserva[]): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const r of reservas) {
    if (!ocupaLugar(r)) continue;
    salida[r.fecha] = (salida[r.fecha] ?? 0) + (Number(r.personas) || 0);
  }
  return salida;
}

/**
 * **Qué días cambiaron de gente**, comparando la pantalla de antes con la
 * de ahora: `+12` si llegaron, `−4` si se fueron. Los días sin diferencia
 * no salen, aunque haya cambiado otra cosa (un pago, un nombre): eso se
 * actualiza igual, pero no hay número que destacar.
 */
export function diferencias(
  antes: Record<string, number>, ahora: Record<string, number>
): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const f of new Set([...Object.keys(antes), ...Object.keys(ahora)])) {
    const d = (ahora[f] ?? 0) - (antes[f] ?? 0);
    if (d !== 0) salida[f] = d;
  }
  return salida;
}

/** El intervalo que sigue: de vuelta a dos minutos si salió bien, el doble si Google pidió calma. */
export function siguienteIntervalo(actual: number, salioBien: boolean): number {
  return salioBien ? REVISAR_CADA : Math.min(actual * 2, REVISAR_COMO_MAXIMO);
}
