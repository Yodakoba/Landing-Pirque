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
import { estadoNormal } from './presupuestos.ts';

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
  cuando: 'Cuándo',
  // 2026-11-10, al final y por nombre: se agregan solas.
  /** El id del archivo en Google Drive. Vacío si no se subió. */
  comprobante: 'Comprobante',
  /**
   * **Quién revisó que la plata llegó**, y cuándo. Separa "el vendedor dice
   * que pagó" de "quien hace los pagos lo comprobó". Vacío es sin revisar.
   */
  revisadoPor: 'Revisado por',
  revisado: 'Revisado'
} as const;
export const ENCABEZADO_COBROS: string[] = Object.values(COL_COBROS);

export const CONCEPTO_COBRO = {
  anticipo: 'Anticipo',
  saldo: 'Saldo',
  otro: 'Otro',
  /**
   * Plata que se le devuelve al cliente al cancelar (2026-11-11). Va en
   * negativo y la anota quien paga. Ver `lib/cancelacion.ts`.
   */
  devolucion: 'Devolución'
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
  comprobante: string;
  revisadoPor: string;
  revisado: string;
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
      comprobante: en(f, i.comprobante),
      revisadoPor: en(f, i.revisadoPor), revisado: en(f, i.revisado),
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
  poner(i.comprobante, c.comprobante);
  poner(i.revisadoPor, c.revisadoPor);
  poner(i.revisado, c.revisado);
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

/**
 * Los cobros que **falta revisar**: quien hace los pagos todavía no
 * comprobó que esa plata llegó. Una devolución (monto negativo) también se
 * revisa: es plata que salió.
 */
export function porRevisar<C extends Pick<Cobro, 'revisadoPor'>>(cobros: C[]): C[] {
  return cobros.filter((c) => !c.revisadoPor);
}

/**
 * Los archivos que se aceptan como comprobante, y hasta qué tamaño. **4 MB
 * porque Vercel no recibe más de 4,5 MB** en una petición; las fotos las
 * achica la pantalla antes de subirlas (`achicarFoto()`), así que una foto
 * de celular llega muy por debajo.
 */
export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'image/heif', 'application/pdf'];
export const MAX_COMPROBANTE = 4 * 1024 * 1024;

/** Por qué no se acepta un archivo, o vacío si se acepta. */
export function problemaConArchivo(tipo: string, tamano: number): string {
  if (!TIPOS_COMPROBANTE.includes(tipo)) return 'El comprobante tiene que ser una foto o un PDF.';
  if (tamano <= 0) return 'El archivo está vacío.';
  if (tamano > MAX_COMPROBANTE) return 'El archivo pasa de 4 MB. Si es un PDF, prueba con una foto o una captura.';
  return '';
}

/* ---------- los avisos (2026-11-10) ---------- */

/** Cuántos días antes de que venza el saldo se empieza a avisar. */
export const DIAS_AVISO_SALDO = 7;

export interface AvisoCobro {
  id: string;
  /** El saldo que falta, o lo que falta para ganar. */
  monto: number;
  /** Días para que venza el saldo: negativo es vencido. */
  dias: number;
}

/**
 * Los avisos de plata de `/presupuestos`. Son dos, y piden cosas distintas:
 *
 * - **Pagaron el anticipo y no está ganada**: el cliente ya cumplió y nadie
 *   le tomó la fecha. Es el que más cuesta olvidar, porque otro puede
 *   reservar ese día mientras tanto.
 * - **El saldo de una ganada vence pronto, o ya venció**: dentro de
 *   `DIAS_AVISO_SALDO`, con lo que falta.
 *
 * Una cerrada (perdida, no elegida) no avisa nada. Puro: recibe los totales
 * ya calculados.
 */
export function avisosDeCobro(
  cotizaciones: {
    id: string; fecha: string; estado: string; idReserva: string;
    anticipo: number | null; saldoDias: number | null; total: number;
  }[],
  cobros: Pick<Cobro, 'presupuesto' | 'monto'>[],
  cfg: { anticipoPct: number; saldoDias: number },
  hoy: Fecha,
  cerrados: string[]
): { anticipoSinGanar: AvisoCobro[]; saldo: AvisoCobro[] } {
  const anticipoSinGanar: AvisoCobro[] = [];
  const saldo: AvisoCobro[] = [];
  for (const p of cotizaciones) {
    if ((cerrados.includes(p.estado) || cerrados.includes(estadoNormal(p.estado))) && !p.idReserva) continue;
    // Una cancelada conserva su reserva (cancelada), pero ya no se le cobra:
    // lo que queda es devolver, y eso tiene su propio aviso.
    if (p.estado === 'Cancelada') continue;
    const cond = condicionesDe(p, p.total, cfg);
    const e = estadoCobros({ anticipo: cond.anticipo, total: p.total },
      cobros.filter((c) => c.presupuesto === p.id));
    if (!p.idReserva) {
      // Solo si de verdad hubo anticipo y se pagó: una sin anticipo no
      // tiene nada que avisar acá.
      if (cond.pct > 0 && e.pagado > 0 && e.anticipoListo) {
        anticipoSinGanar.push({ id: p.id, monto: e.pagado, dias: 0 });
      }
      continue;
    }
    if (e.falta <= 0 || !cond.saldoHasta) continue;
    const dias = diasEntre(hoy, cond.saldoHasta);
    if (dias <= DIAS_AVISO_SALDO) saldo.push({ id: p.id, monto: e.falta, dias });
  }
  saldo.sort((a, b) => a.dias - b.dias);
  return { anticipoSinGanar, saldo };
}

/** Días de `a` a `b`, contando con fechas de texto (sin `Date` y sus husos). */
export function diasEntre(a: Fecha, b: Fecha): number {
  if (a === b) return 0;
  const paso = a < b ? 1 : -1;
  let n = 0;
  let f = a;
  while (f !== b && Math.abs(n) < 4000) { f = sumarDias(f, paso); n += paso; }
  return n;
}

/**
 * **Cuándo se puede marcar ganada** (2026-11-11, lo decidió el cliente:
 * *"en contratos obviamente solo puede marcar ganado si está el contrato"*).
 * Con el anticipo pagado —o sin anticipo acordado— **o** con el contrato
 * firmado subido. Una de las dos basta: el contrato firmado es el
 * compromiso del cliente aunque la plata llegue después. La usan la ruta
 * `/convertir` y la ventana de cotizar, para que digan lo mismo.
 */
export function puedeGanar(anticipoListo: boolean, contratoFirmado: boolean): boolean {
  return anticipoListo || contratoFirmado;
}
