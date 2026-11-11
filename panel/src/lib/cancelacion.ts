/**
 * **Cancelar una cotización ganada, y lo que se devuelve** (2026-11-11).
 *
 * Lo pidió el cliente: *"puede pasar igual que la reserva se cae… cambiar el
 * estado a cancelado y cómo gestionar si hay devolución de dinero"*. Y fijó
 * la regla: **el % se aplica sobre lo que pagó el cliente**, y tiene que ser
 * coherente con el contrato y con lo negociado en la cotización.
 *
 * Por eso las condiciones de cancelación son **las mismas** que imprime el
 * contrato (`tranquilidadDe()`): Configuración trae el valor por defecto y
 * cada cotización lo puede cambiar. Un solo lugar las resuelve
 * (`tranquilidadDeCotizacion()`), y lo usan el contrato y la cancelación:
 * lo que se firma es lo que se aplica.
 *
 * Puro, sin red: se prueba en `prueba.ts`.
 */
import { esFecha, type Fecha } from './fechas.ts';
import { diasEntre } from './cobros.ts';
import type { Tranquilidad } from './contrato.ts';

/** Las condiciones de la cotización, o las de Configuración donde estén en blanco. */
export function tranquilidadDeCotizacion(
  p: { cambiosFecha: number | null; cancelacionDias: number | null; reembolso: number | null },
  cfg: Tranquilidad
): Tranquilidad {
  return {
    cambiosFecha: p.cambiosFecha ?? cfg.cambiosFecha,
    cancelacionDias: p.cancelacionDias ?? cfg.cancelacionDias,
    reembolsoPct: p.reembolso ?? cfg.reembolsoPct
  };
}

export interface Sugerencia {
  /** Días entre hoy y el evento. */
  dias: number;
  /** Si se cancela dentro del plazo del contrato. */
  enPlazo: boolean;
  /** Lo que el cliente pagó, sin contar devoluciones. */
  pagado: number;
  pct: number;
  /** Lo que corresponde devolver según el contrato. Se puede cambiar. */
  devolver: number;
}

/**
 * **Cuánto corresponde devolver** según las condiciones de la cotización.
 *
 * El contrato dice *"podrá cancelar hasta con N días de anticipación y con un
 * reembolso del X% de lo pagado"*: con N días o más, se devuelve el X% de lo
 * pagado; con menos, nada. **Sin días de cancelación (0) el contrato no
 * promete poder cancelar**, así que no corresponde devolver nada. Lo pagado
 * no cuenta las devoluciones ya hechas: el % es sobre lo que entró.
 *
 * Es una sugerencia: el monto se negocia y se puede cambiar al cancelar.
 */
export function devolucionSugerida(
  cobros: { monto: number; concepto: string }[],
  evento: Fecha, hoy: Fecha, t: Tranquilidad
): Sugerencia {
  const pagado = Math.max(0, cobros
    .filter((c) => c.concepto !== CONCEPTO_DEVOLUCION)
    .reduce((n, c) => n + c.monto, 0));
  const dias = esFecha(evento) && esFecha(hoy) ? diasEntre(hoy, evento) : 0;
  const enPlazo = t.cancelacionDias > 0 && dias >= t.cancelacionDias;
  const pct = t.reembolsoPct;
  return { dias, enPlazo, pagado, pct, devolver: enPlazo ? Math.round((pagado * pct) / 100) : 0 };
}

/** El concepto de un cobro que devuelve plata. Va en negativo. */
export const CONCEPTO_DEVOLUCION = 'Devolución';

/**
 * **Lo que falta devolver**: lo acordado al cancelar menos lo ya devuelto.
 * Lo devuelto son los cobros *Devolución*, que van en negativo. Nunca baja
 * de cero: devolver de más se ve en los cobros, no como un número raro acá.
 */
export function faltaDevolver(acordado: number,
  cobros: { monto: number; concepto: string }[]): { devuelto: number; falta: number } {
  const devuelto = -cobros.filter((c) => c.concepto === CONCEPTO_DEVOLUCION)
    .reduce((n, c) => n + c.monto, 0);
  return { devuelto, falta: Math.max(0, acordado - devuelto) };
}

/**
 * Las condiciones de cancelación en una frase, para la ventana de cotizar:
 * lo mismo que dirá el contrato, en corto.
 */
export function frasesCancelacion(t: Tranquilidad): string {
  const cambios = t.cambiosFecha > 0
    ? `Puede cambiar la fecha ${t.cambiosFecha === 1 ? 'una vez' : `${t.cambiosFecha} veces`}`
    : 'No se ofrecen cambios de fecha';
  const cancela = t.cancelacionDias > 0
    ? `cancelar hasta ${t.cancelacionDias} días antes ${t.reembolsoPct > 0
        ? `con devolución del ${t.reembolsoPct}% de lo pagado` : 'sin devolución'}`
    : 'no se ofrece cancelar';
  return `${cambios}, y ${cancela}.`;
}
