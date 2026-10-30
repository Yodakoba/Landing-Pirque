/**
 * El estado del pago de una reserva, dicho en español.
 *
 * **Lo que se guarda sigue siendo el código de Shopify** —`paid`, `pending`,
 * `refunded`, `voided`, `cancelled`— porque esa columna la escribe el webhook
 * y tiene que calzar con lo que manda la tienda. Lo que cambia es lo que se
 * lee en pantalla.
 *
 * Hasta el 2026-10-30 el panel mostraba el código pelado en la tabla del día
 * —`pending`— y el formulario decía `pending — paga al llegar`, o sea la
 * misma cosa dos veces y en dos idiomas. Quien abre una reserva un sábado es
 * la jefa de turno, en Pirque: la pantalla tiene que estar en español, y en
 * uno solo. El código de Shopify no se perdió, se dejó de mostrar donde no
 * le sirve a nadie.
 *
 * **Un código que no esté en la tabla se muestra tal cual.** Si algún día
 * Shopify inventa otro, o alguien escribe a mano en la planilla, ver el texto
 * crudo es mejor que ver una celda vacía: por lo menos se entiende que hay
 * algo que el panel no conoce.
 */
import { ESTADO_PAGO } from './columnas.ts';

/** La palabra que se muestra, una sola por estado. */
export const PAGO_PALABRA: Record<string, string> = {
  [ESTADO_PAGO.pagado]: 'Pagada',
  [ESTADO_PAGO.pendiente]: 'Por pagar',
  [ESTADO_PAGO.reembolsado]: 'Reembolsada',
  [ESTADO_PAGO.anulado]: 'Anulada',
  [ESTADO_PAGO.cancelado]: 'Cancelada'
};

/** Qué significa cada una, para el desplegable del formulario. */
export const PAGO_GLOSA: Record<string, string> = {
  [ESTADO_PAGO.pagado]: 'ya pagó',
  [ESTADO_PAGO.pendiente]: 'paga cuando llegue',
  [ESTADO_PAGO.cancelado]: 'avisó que no viene',
  [ESTADO_PAGO.reembolsado]: 'se le devolvió la plata',
  [ESTADO_PAGO.anulado]: 'se anuló antes de cobrarle'
};

/**
 * Los tres estados que liberan el cupo, en el orden en que se eligen a mano:
 * lo corriente es que alguien avise que no viene.
 *
 * **Esta lista es la única verdad sobre qué libera un lugar**: `ocupaLugar()`
 * la usa, y el formulario arma con ella su grupo "Ya no viene". Con dos
 * listas, el día que se agregue un estado el calendario y el formulario
 * dirían cosas distintas sobre la misma reserva.
 */
export const ESTADOS_QUE_LIBERAN: string[] = [
  ESTADO_PAGO.cancelado,
  ESTADO_PAGO.reembolsado,
  ESTADO_PAGO.anulado
];

/** Los dos en que la reserva sigue en pie, y la persona viene. */
export const ESTADOS_QUE_VIENEN: string[] = [
  ESTADO_PAGO.pagado,
  ESTADO_PAGO.pendiente
];

/** Si este estado deja libre la silla. */
export function liberaCupo(estado: string | null | undefined): boolean {
  return ESTADOS_QUE_LIBERAN.includes(String(estado || '').trim().toLowerCase());
}

/** `pending` -> "Por pagar". Lo que no conozca, lo devuelve tal cual. */
export function pagoEnEspanol(estado: string | null | undefined): string {
  const e = String(estado || '').trim();
  return PAGO_PALABRA[e.toLowerCase()] || e;
}

/** "Por pagar — paga cuando llegue", para las opciones del formulario. */
export function pagoConGlosa(estado: string): string {
  const glosa = PAGO_GLOSA[estado];
  return glosa ? `${pagoEnEspanol(estado)} — ${glosa}` : pagoEnEspanol(estado);
}
