/**
 * La lógica de ocupación y semáforo. Sin dependencias y sin tocar la red: es
 * lo que se puede probar de verdad, y por eso vive separada de las rutas.
 */
import type { Reserva, FechaHabil, Ocupacion, Semaforo } from './tipos.ts';
import { ESTADO_PAGO, estaCerrado, esPrivada, esExclusiva } from './columnas.ts';
import { liberaCupo } from './pagos.ts';
import { SIN_POSIBLES, type Posibles } from './presupuestos.ts';
import type { Fecha } from './fechas.ts';
import { POR_DEFECTO } from './config.ts';

/**
 * Los cortes del semáforo, como fracción de la capacidad.
 *
 * Amarillo entra en 0.6 y rojo en 0.85. Un día lleno es rojo, obviamente,
 * pero el rojo empieza antes: a 51 de 60 ya no caben dos familias, y eso es
 * lo que hay que ver de un vistazo.
 */
export const CORTES = POR_DEFECTO.cortes;

/**
 * Los cortes entran como parámetro con un valor por defecto, no como
 * constante leída de adentro: así esto sigue siendo una función pura que se
 * prueba con cortes de mentira, y el panel puede pasarle los de la planilla
 * sin que este archivo sepa que existe una planilla.
 */
export function semaforo(
  tomadas: number, capacidad: number, cortes = CORTES
): Semaforo {
  if (capacidad <= 0) return 'rojo';
  const r = tomadas / capacidad;
  if (r >= cortes.rojo) return 'rojo';
  if (r >= cortes.amarillo) return 'amarillo';
  return 'verde';
}

/**
 * Una reserva reembolsada o anulada NO ocupa lugar: la silla se libera.
 * Una pendiente SÍ ocupa: el cliente viene igual, paga al llegar.
 */
export function ocupaLugar(r: Reserva): boolean {
  return !liberaCupo(r.estadoPago);
}

/**
 * Si todavía hay que cobrarle a esta reserva.
 *
 * **Se decide por el ESTADO DEL PAGO, no por la modalidad comprada**, y esa
 * diferencia importa: una fila que diga "Pago directo" junto a "pending"
 * significa que la regla de medios de pago de Shopify no aplicó y la persona
 * eligió pagar en el local igual. Mirando la modalidad, esa plata no
 * aparecería en ninguna parte y nadie se la cobraría en la puerta.
 */
export function faltaCobrar(r: Reserva): boolean {
  if (!ocupaLugar(r)) return false;
  return String(r.estadoPago || '').trim().toLowerCase() !== ESTADO_PAGO.pagado;
}

/** Un monto en pesos, en formato chileno: 218000 -> "$218.000". */
export function enPesos(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

export function deEseDia(reservas: Reserva[], fecha: Fecha): Reserva[] {
  return reservas.filter((r) => r.fecha === fecha);
}

/**
 * El desglose de un día: cuántas personas, y de esas cuántas ya pagaron y a
 * cuántas hay que cobrarles.
 *
 * **Se decide por el ESTADO del pago, no por la modalidad comprada**, que es
 * lo mismo que hace faltaCobrar() y por el mismo motivo. Hasta el 2026-10-30
 * esto miraba `Tipo Pago`, o sea qué variante se compró, mientras la tarjeta
 * del calendario rotulaba el resultado como "X pagadas / X en el local". No
 * era lo mismo: una reserva que compró la variante de pagar en línea y
 * todavía dice "pending" se contaba como pagada, y esa plata no aparecía en
 * ninguna parte. El rótulo tenía razón; el cálculo se había quedado atrás.
 */
/**
 * **Lo cotizado y sin confirmar NO entra en ninguna cuenta de este archivo.**
 *
 * Viaja aparte, en `posibles`, y sale tal cual en dos campos propios. No se
 * suma a `tomadas`, no descuenta de `quedan` y no mueve el semáforo, que es
 * exactamente lo que pidió el cliente: *"no puede que solo por enviar un
 * presupuesto se ocupen cupos confirmados dentro del día"*.
 *
 * Que llegue como parámetro y no se calcule acá adentro es lo que mantiene
 * esta función pura y probable sin red — y además deja ver de un vistazo
 * que lo posible entra y sale sin tocar nada del medio.
 */
export function ocupacionDe(
  reservas: Reserva[],
  dia: FechaHabil,
  cortes = CORTES,
  posibles?: Map<string, Posibles>
): Ocupacion {
  const delDia = deEseDia(reservas, dia.fecha).filter(ocupaLugar);

  let pagadas = 0;
  let porPagar = 0;
  for (const r of delDia) {
    const n = Number(r.personas) || 0;
    if (faltaCobrar(r)) porPagar += n;
    else pagadas += n;
  }
  const tomadas = pagadas + porPagar;

  // La plata que hay que cobrar el mismo día, y cuántas reservas no tienen
  // monto. Las segundas se cuentan aparte a propósito: un total que omite
  // filas en silencio es peor que uno que dice cuántas le faltan.
  let porCobrar = 0;
  let sinMonto = 0;
  for (const r of delDia) {
    if (!faltaCobrar(r)) continue;
    if (r.monto == null) sinMonto++;
    else porCobrar += Number(r.monto) || 0;
  }
  // Una sola definición de "cerrado", compartida con la pantalla de fechas.
  // Ver estaCerrado(): falla cerrando a propósito.
  const bloqueada = estaCerrado(dia.estado);
  // Distinto de cerrada: recibe reservas, pero el sitio no la ofrece.
  const privada = esPrivada(dia.estado);
  // Y distinto de privada a secas: el recinto completo, sin espacio para
  // otro evento ese día. Las dos son ciertas en un día exclusivo.
  const exclusiva = esExclusiva(dia.estado);

  // Lo cotizado y sin confirmar. Se copia y no se usa: ver arriba.
  const pos = posibles?.get(dia.fecha) ?? SIN_POSIBLES;

  return {
    fecha: dia.fecha,
    capacidad: dia.capacidad,
    tomadas,
    quedan: Math.max(0, dia.capacidad - tomadas),
    pagadas,
    porPagar,
    porCobrar,
    sinMonto,
    privada,
    exclusiva,
    presupuestos: pos.presupuestos,
    presupuestadas: pos.personas,
    semaforo: bloqueada ? 'rojo' : semaforo(tomadas, dia.capacidad, cortes),
    bloqueada,
    notas: dia.notas || ''
  };
}

export function ocupacionDeTodos(
  reservas: Reserva[],
  dias: FechaHabil[],
  cortes = CORTES,
  posibles?: Map<string, Posibles>
): Ocupacion[] {
  return dias.map((d) => ocupacionDe(reservas, d, cortes, posibles));
}
