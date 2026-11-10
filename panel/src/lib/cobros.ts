/**
 * **Las condiciones de pago y los cobros al cliente** de una cotización
 * (2026-11-10).
 *
 * Se llama `cobros` y no `pagos` porque `pagos.ts` ya es el estado del pago
 * de una reserva, y `remuneraciones.ts` es la plata que sale al equipo. Esto
 * es la plata que **entra** de un cliente que cotizó un evento.
 *
 * **Se guardan los cobros, no una casilla de "pagado"**, igual que los
 * pagos al equipo: que el anticipo esté pagado se deduce de sumarlos. Un
 * pago parcial es un cobro más chico, y deshacer uno anotado por error es
 * borrar su fila.
 *
 * Puro: sin `googleapis`, para probarlo sin red.
 */
import { indices } from './columnas.ts';
import { esFecha, sumarDias, type Fecha } from './fechas.ts';

export const HOJA_COBROS = 'Cobros';

export const COL_COBROS = {
  id: 'ID',
  presupuesto: 'ID Presupuesto',
  fecha: 'Fecha de pago',
  concepto: 'Concepto',
  monto: 'Monto',
  /** Cómo pagó: texto libre, como la nota de pago de una reserva. */
  medio: 'Medio',
  nota: 'Nota',
  registradoPor: 'Registrado por',
  cuando: 'Cuándo'
} as const;
export const ENCABEZADO_COBROS: string[] = Object.values(COL_COBROS);

export const CONCEPTO_COBRO = {
  anticipo: 'Anticipo',
  saldo: 'Saldo',
  otro: 'Otro'
} as const;
export type ConceptoCobro = (typeof CONCEPTO_COBRO)[keyof typeof CONCEPTO_COBRO];

export interface Cobro {
  id: string;
  presupuesto: string;
  fecha: Fecha;
  concepto: ConceptoCobro;
  /** En pesos. Puede ser negativo: una devolución. */
  monto: number;
  medio: string;
  nota: string;
  registradoPor: string;
  cuando: string;
  fila: number;
}

/* ---------- las condiciones ---------- */

export interface Condiciones {
  /** El anticipo en %. 0 es sin anticipo. */
  pct: number;
  anticipo: number;
  saldo: number;
  /** Días antes del evento para el saldo. */
  dias: number;
  /** Hasta cuándo se paga el saldo, o `''` si todavía no hay día. */
  saldoHasta: string;
}

/**
 * **La única función que dice cuánto es el anticipo y cuándo vence el
 * saldo.** La usan la pantalla, el documento que recibe el cliente y —en la
 * Fase 4— el contrato, para que no vuelvan a decir cosas distintas.
 *
 * Lo de la cotización manda; lo que dejó en blanco lo pone Configuración.
 * El anticipo se redondea al peso y el saldo es la resta, así que los dos
 * suman el total siempre.
 */
export function condicionesDe(
  p: { anticipo: number | null; saldoDias: number | null; fecha: string },
  total: number,
  cfg: { anticipoPct: number; saldoDias: number }
): Condiciones {
  const pct = p.anticipo ?? cfg.anticipoPct;
  const anticipo = Math.round((total * pct) / 100);
  const dias = p.saldoDias ?? cfg.saldoDias;
  return {
    pct, anticipo, saldo: total - anticipo, dias,
    saldoHasta: esFecha(p.fecha) ? sumarDias(p.fecha, -dias) : ''
  };
}

/* ---------- cuánto va pagado ---------- */

export interface EstadoCobros {
  pagado: number;
  /** Lo que falta del total. Nunca negativo. */
  falta: number;
  /** Lo que falta del anticipo. 0 si está cubierto o si no hay anticipo. */
  faltaAnticipo: number;
  /** Si el anticipo ya está pagado, o no hay anticipo. */
  anticipoListo: boolean;
  completo: boolean;
}

/**
 * Cuánto va pagado de una cotización.
 *
 * **Todo lo cobrado cuenta primero para el anticipo**, sin importar con qué
 * concepto se anotó: si el cliente pagó todo de una, el anticipo también
 * está pagado. El concepto es para leer los cobros, no para sumarlos.
 */
export function estadoCobros(c: Pick<Condiciones, 'anticipo'> & { total: number },
  cobros: Pick<Cobro, 'monto'>[]): EstadoCobros {
  const pagado = cobros.reduce((n, x) => n + x.monto, 0);
  const faltaAnticipo = Math.max(0, c.anticipo - pagado);
  return {
    pagado,
    falta: Math.max(0, c.total - pagado),
    faltaAnticipo,
    anticipoListo: faltaAnticipo === 0,
    // Sin total no hay qué dar por pagado: una cotización sin líneas
    // todavía no tiene precio.
    completo: c.total > 0 && pagado >= c.total
  };
}

/** Los cobros de una cotización, del más antiguo al más nuevo. */
export function cobrosDe(cobros: Cobro[], idPresupuesto: string): Cobro[] {
  return cobros.filter((c) => c.presupuesto === idPresupuesto)
    .sort((a, b) => (a.fecha + a.cuando).localeCompare(b.fecha + b.cuando));
}

/* ---------- la planilla ---------- */

function conceptoDe(v: unknown): ConceptoCobro {
  const t = String(v ?? '').trim().toLowerCase();
  return Object.values(CONCEPTO_COBRO).find((x) => x.toLowerCase() === t) ?? CONCEPTO_COBRO.otro;
}

/** Un monto en pesos que puede ser negativo: "−$20.000", "-20000". */
export function montoCobro(v: unknown): number {
  const t = String(v ?? '').replace(/[−–]/g, '-');
  const negativo = /^\s*-/.test(t);
  const n = Number(t.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? (negativo ? -n : n) : 0;
}

export function leerCobrosDe(filas: string[][]): Cobro[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_COBROS);
  if (i.id === -1 || i.presupuesto === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());
  const salida: Cobro[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n] ?? [];
    const id = en(f, i.id);
    const presupuesto = en(f, i.presupuesto);
    const monto = montoCobro(en(f, i.monto));
    if (!id || !presupuesto || !monto) continue;
    salida.push({
      id, presupuesto, monto,
      fecha: en(f, i.fecha).slice(0, 10),
      concepto: conceptoDe(en(f, i.concepto)),
      medio: en(f, i.medio), nota: en(f, i.nota),
      registradoPor: en(f, i.registradoPor), cuando: en(f, i.cuando),
      fila: n + 1
    });
  }
  return salida;
}

export function filaCobro(encabezado: string[], c: Omit<Cobro, 'fila'>): string[] {
  const i = indices(encabezado, COL_COBROS);
  const fila = new Array(Math.max(encabezado.length, ENCABEZADO_COBROS.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i.id, c.id);
  poner(i.presupuesto, c.presupuesto);
  poner(i.fecha, c.fecha);
  poner(i.concepto, c.concepto);
  poner(i.monto, String(c.monto));
  poner(i.medio, c.medio);
  poner(i.nota, c.nota);
  poner(i.registradoPor, c.registradoPor);
  poner(i.cuando, c.cuando);
  return fila;
}

/**
 * Lo que llega del navegador, convertido en un cobro válido, o un mensaje
 * de qué falta. Un concepto inventado vuelve a *Otro*; un monto en cero no
 * es un cobro.
 */
export function limpiarCobro(e: Record<string, unknown>, hoy: Fecha):
  { cobro: Pick<Cobro, 'fecha' | 'concepto' | 'monto' | 'medio' | 'nota'> } | { error: string } {
  const monto = typeof e.monto === 'number' ? Math.round(e.monto) : montoCobro(e.monto);
  if (!monto) return { error: 'Falta el monto.' };
  const fecha = String(e.fecha ?? '').slice(0, 10);
  return {
    cobro: {
      monto,
      fecha: esFecha(fecha) ? fecha : hoy,
      concepto: conceptoDe(e.concepto),
      medio: String(e.medio ?? '').trim(),
      nota: String(e.nota ?? '').trim()
    }
  };
}

/** Un id que no choca aunque se anoten dos en el mismo milisegundo. */
export function nuevoIdCobro(): string {
  return `COB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
