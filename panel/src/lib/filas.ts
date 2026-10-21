/**
 * Armar una fila de la planilla a partir de un objeto del panel.
 *
 * Vive aparte de datos.ts a propósito: acá no se importa googleapis, así que
 * esto se puede probar sin red y sin credenciales. Es justo la pieza donde un
 * error se ve recién en la planilla del cliente, ya escrito.
 */
import { indices, COL_RESERVAS, COL_FECHAS } from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';

/**
 * Respeta el orden REAL del encabezado, no el nuestro.
 *
 * `previa` es la fila como está hoy en la planilla. Cuando viene, esto es una
 * edición parcial: **solo se escriben los campos presentes en `r`**, y lo que
 * no venga queda tal cual. Eso es lo que permite marcar la asistencia de una
 * reserva mandando solo `{asistencia}` sin borrarle el nombre y el correo.
 */
export function filaReserva(
  enc: string[], r: Partial<Reserva>, previa?: string[]
): unknown[] {
  const i = indices(enc, COL_RESERVAS);
  const fila = previa ? [...previa] : new Array(enc.length).fill('');
  while (fila.length < enc.length) fila.push('');
  // `undefined` significa "no tocar esta columna"; `null` significa "vaciarla".
  const poner = (k: number, v: unknown) => {
    if (k !== -1 && v !== undefined) fila[k] = v ?? '';
  };
  poner(i.id, r.id);
  poner(i.fecha, r.fecha);
  poner(i.nombre, r.nombre);
  poner(i.email, r.email);
  poner(i.telefono, r.telefono);
  poner(i.menu, r.menu);
  poner(i.personas, r.personas);
  poner(i.monto, r.monto);
  poner(i.tipoPago, r.tipoPago);
  poner(i.estadoPago, r.estadoPago);
  poner(i.creada, r.creada);
  poner(i.asistencia, r.asistencia);
  return fila;
}

/** Lo mismo para la hoja de fechas hábiles. */
export function filaFecha(
  enc: string[], f: Partial<FechaHabil>, previa?: string[]
): unknown[] {
  const i = indices(enc, COL_FECHAS);
  const fila = previa ? [...previa] : new Array(enc.length).fill('');
  while (fila.length < enc.length) fila.push('');
  const poner = (k: number, v: unknown) => {
    if (k !== -1 && v !== undefined) fila[k] = v ?? '';
  };
  poner(i.fecha, f.fecha);
  poner(i.capacidad, f.capacidad);
  poner(i.apertura, f.apertura);
  poner(i.estado, f.estado);
  poner(i.notas, f.notas);
  return fila;
}

/**
 * En qué fila está el pedido con ese id, o -1 si no está.
 *
 * Vive acá, separado de la escritura, porque **es la pieza que hace
 * idempotente al sincronizador** y por eso hay que poder probarla. Si esta
 * búsqueda falla, Shopify reintenta un webhook y la misma reserva se anota
 * dos veces, descontando cupo dos veces de un día real.
 *
 * Compara como texto y sin espacios: el id de Shopify es numérico, y la
 * planilla lo devuelve como número o como cadena según cómo quedó
 * formateada la celda. Un `1007` y un `"1007 "` son el mismo pedido.
 *
 * Devuelve la fila 1-based como la ve la planilla, igual que `Reserva.fila`.
 */
export function buscarFilaPorId(
  filas: string[][], enc: string[], id: unknown
): number {
  const i = indices(enc, COL_RESERVAS);
  const buscado = String(id ?? '').trim();
  // Un id vacío no puede calzar con las filas sin id, que son justamente
  // las que hay que ignorar.
  if (i.id === -1 || buscado === '') return -1;
  for (let n = 1; n < filas.length; n++) {
    if (String(filas[n]?.[i.id] ?? '').trim() === buscado) return n + 1;
  }
  return -1;
}
