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
