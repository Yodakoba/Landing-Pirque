/**
 * **Quién sube el cupo de un día** (2026-11-12, lo pidió el cliente): el
 * gerente de operaciones, quien paga o el administrador (permiso `cupo`).
 * El encargado sigue abriendo, cerrando y bajando cupos, pero **para subirlo
 * lo pide**, y el pedido le llega al gerente a la bandeja de aprobaciones,
 * igual que un descuento sobre el estándar.
 *
 * El pedido se guarda en la columna `Cupo pedido` de `Fechas Hábiles`:
 * *"140 · Carla · 2026-11-14 14:03 · viene un grupo de la agencia"*.
 * Aprobarlo sube el cupo —nunca sobre la capacidad máxima del recinto— y
 * vacía la columna; rechazarlo solo la vacía.
 *
 * Puro, sin red ni planilla.
 */

/**
 * Hasta dónde llega el cupo **sin pedir aprobación**: el cupo que el día ya
 * tiene, o el de siempre si todavía no tiene (un día nuevo, o uno en cero).
 * Bajarlo o dejarlo igual nunca pide nada.
 */
export function limiteSinAprobar(capacidadActual: number | null | undefined, cupoNormal: number): number {
  const actual = Number(capacidadActual) || 0;
  return actual > 0 ? actual : Math.max(0, Number(cupoNormal) || 0);
}

/** Si dejar el día con `nuevo` es subirle el cupo. */
export function subeElCupo(capacidadActual: number | null | undefined, nuevo: number, cupoNormal: number): boolean {
  return (Number(nuevo) || 0) > limiteSinAprobar(capacidadActual, cupoNormal);
}

/** Lo que se guarda en `Cupo pedido`. */
export function marcaCupoPedido(cupo: number, quien: string, cuando: string, motivo: string): string {
  const limpio = String(motivo ?? '').replace(/\s+/g, ' ').trim();
  return [String(Math.round(cupo)), quien || 'alguien', cuando, limpio].filter(Boolean).join(' · ');
}

export interface CupoPedido { cupo: number; quien: string; cuando: string; motivo: string }

/** El pedido de una celda de `Cupo pedido`, o `null` si no hay (o no se entiende). */
export function cupoPedidoDe(marca: string | null | undefined): CupoPedido | null {
  const partes = String(marca ?? '').split(' · ').map((s) => s.trim());
  const cupo = Number(partes[0]);
  if (!partes[0] || !Number.isInteger(cupo) || cupo <= 0) return null;
  const [, quien = '', cuando = '', ...resto] = partes;
  return { cupo, quien, cuando, motivo: resto.join(' · ') };
}

/** El cupo que queda al aprobar: lo pedido, sin pasar del recinto ni bajar lo que ya hay. */
export function cupoAlAprobar(pedido: number, actual: number, capacidadMaxima: number): number {
  return Math.max(Number(actual) || 0, Math.min(Number(pedido) || 0, Math.max(1, Number(capacidadMaxima) || 0)));
}
