/**
 * La lógica de ocupación y semáforo. Sin dependencias y sin tocar la red: es
 * lo que se puede probar de verdad, y por eso vive separada de las rutas.
 */
import type { Reserva, FechaHabil, Ocupacion, Semaforo } from './tipos.ts';
import { TIPO_PAGO, ESTADO_PAGO, estaCerrado } from './columnas.ts';
import type { Fecha } from './fechas.ts';

/**
 * Los cortes del semáforo, como fracción de la capacidad.
 *
 * Amarillo entra en 0.6 y rojo en 0.85. Un día lleno es rojo, obviamente,
 * pero el rojo empieza antes: a 51 de 60 ya no caben dos familias, y eso es
 * lo que hay que ver de un vistazo.
 */
export const CORTES = { amarillo: 0.6, rojo: 0.85 };

export function semaforo(tomadas: number, capacidad: number): Semaforo {
  if (capacidad <= 0) return 'rojo';
  const r = tomadas / capacidad;
  if (r >= CORTES.rojo) return 'rojo';
  if (r >= CORTES.amarillo) return 'amarillo';
  return 'verde';
}

/**
 * Una reserva reembolsada o anulada NO ocupa lugar: la silla se libera.
 * Una pendiente SÍ ocupa: el cliente viene igual, paga al llegar.
 */
export function ocupaLugar(r: Reserva): boolean {
  const e = String(r.estadoPago || '').trim().toLowerCase();
  return e !== ESTADO_PAGO.reembolsado && e !== ESTADO_PAGO.anulado;
}

export function deEseDia(reservas: Reserva[], fecha: Fecha): Reserva[] {
  return reservas.filter((r) => r.fecha === fecha);
}

/**
 * El desglose de un día: cuántas personas, y de esas cuántas ya pagaron
 * online y cuántas pagan en el local.
 */
export function ocupacionDe(
  reservas: Reserva[],
  dia: FechaHabil
): Ocupacion {
  const delDia = deEseDia(reservas, dia.fecha).filter(ocupaLugar);

  let online = 0;
  let local = 0;
  for (const r of delDia) {
    const n = Number(r.personas) || 0;
    if (r.tipoPago === TIPO_PAGO.local) local += n;
    else online += n;
  }
  const tomadas = online + local;
  // Una sola definición de "cerrado", compartida con la pantalla de fechas.
  // Ver estaCerrado(): falla cerrando a propósito.
  const bloqueada = estaCerrado(dia.estado);

  return {
    fecha: dia.fecha,
    capacidad: dia.capacidad,
    tomadas,
    quedan: Math.max(0, dia.capacidad - tomadas),
    online,
    local,
    semaforo: bloqueada ? 'rojo' : semaforo(tomadas, dia.capacidad),
    bloqueada,
    notas: dia.notas || ''
  };
}

export function ocupacionDeTodos(
  reservas: Reserva[],
  dias: FechaHabil[]
): Ocupacion[] {
  return dias.map((d) => ocupacionDe(reservas, d));
}
