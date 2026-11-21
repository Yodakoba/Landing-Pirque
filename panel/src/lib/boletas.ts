/**
 * **Cuánto boletear**: el bruto que se escribe en el SII para que llegue el
 * neto correcto (2026-11-20).
 *
 * Lo pidió el cliente: que cada persona vea en su link el valor que tiene
 * que boletear, por semana y por mes —*"se tienen que arreglar entre
 * ellos"*—, que quien paga lo vea por persona, y que se muestren **el neto
 * y el bruto**, *"porque en el SII hay que poner el bruto correcto para
 * llegar al neto correcto"*. Y confirmó dos cosas el mismo día:
 *
 * - **Lo que calcula el panel es el neto**: lo que la persona recibe. El
 *   bruto se calcula hacia arriba, y la diferencia es la retención que la
 *   empresa paga en el F29. Por eso el costo real de una persona es el
 *   bruto.
 * - **Un *Adelanto* no baja la boleta**: es plata ya entregada, no un menor
 *   pago. *Llegó tarde* y *Rompió algo* sí la bajan, y las sumas la suben.
 *
 * **Qué entra**: lo que la persona ganó por su trabajo —sueldo o servicio,
 * con horas extra y ajustes—. **La propina nunca**, y **un contratado
 * tampoco** (su sueldo va por la liquidación): lo decide `pideBoleta()`.
 *
 * **Una boleta cubre días.** La pestaña `Boletas` guarda una fila por
 * periodo marcado; un día está respaldado si alguna boleta de esa persona lo
 * incluye. Así se puede boletear por semana o por mes, y mezclar, sin
 * contar nada dos veces.
 *
 * Puro y con pruebas (`prueba.ts`): lo usan el link personal, el informe y
 * el resumen del vendedor, y los tres tienen que dar el mismo número.
 */
import { esContratado, partesDeMotivo, tipoDeAjuste, VINO, type Ajuste, type Turno } from './equipo.ts';
import { normalizar } from './columnas.ts';
import type { Boleta } from './remuneraciones.ts';
import type { Fecha } from './fechas.ts';

/* ---------- La tasa ---------- */

/**
 * **La retención por año, en centésimas de punto** (1525 = 15,25%).
 *
 * La fija la ley, no el negocio —Ley 21.133, que la sube cada año hasta 17%
 * en 2028—, así que vive acá y no en Configuración, igual que el IVA: un
 * campo editable sería un lugar donde un cero mal tecleado sale impreso.
 * Fuente: sii.cl, *Boletas de honorarios*.
 */
const RETENCION: Record<number, number> = {
  2019: 1000, 2020: 1075, 2021: 1150, 2022: 1225, 2023: 1300,
  2024: 1375, 2025: 1450, 2026: 1525, 2027: 1600, 2028: 1700
};

/** La retención del año de esa fecha, en centésimas de punto. Desde 2028, 17%. */
export function retencionDelAno(fecha: Fecha): number {
  const ano = Number(String(fecha).slice(0, 4));
  if (!Number.isFinite(ano) || ano >= 2028) return RETENCION[2028];
  return RETENCION[ano] ?? RETENCION[2019];
}

/** `1525` → `"15,25%"`; `1600` → `"16%"`. */
export const tasaEnTexto = (centesimas: number) =>
  `${(centesimas / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })}%`;

/**
 * **Con qué tasa se va a emitir**: la del año en que se hace la boleta, que
 * es después de que termina el periodo. Si ya terminó, se emite hoy; si no,
 * al terminar. Importa justo en el cambio de año: la boleta de diciembre de
 * 2026 que se haga en enero ya va al 16%.
 */
export const fechaDeEmision = (hasta: Fecha, hoy: Fecha): Fecha => (hasta > hoy ? hasta : hoy);

/* ---------- El bruto para un neto ---------- */

/** Lo que retiene una boleta por ese bruto: redondeado al peso, como el SII. */
export const retencionDe = (bruto: number, centesimas: number) =>
  Math.round((bruto * centesimas) / 10000);

/** Lo que recibe quien emite una boleta por ese bruto. */
export const liquidoDe = (bruto: number, centesimas: number) => bruto - retencionDe(bruto, centesimas);

/**
 * **El bruto para ese neto**: el neto dividido por lo que queda después de
 * la retención, hacia arriba. Es el mismo que dan las calculadoras de
 * boletas (con 15,25%, $500.000 → $589.971) y **asegura el neto con
 * cualquier redondeo**: lo que se recibe es el neto, o a lo más un peso más.
 * Una boleta un peso más chica ya no alcanza.
 */
export function brutoParaNeto(neto: number, centesimas: number): number {
  const n = Math.round(neto);
  if (n <= 0) return 0;
  return Math.ceil((n * 10000) / (10000 - centesimas));
}

/* ---------- El documento: boleta o factura (2026-11-20) ---------- */

/**
 * **Con qué documento se le paga a alguien.** El equipo y los extras,
 * siempre con boleta de honorarios. Un vendedor o un socio comercial, con
 * boleta o con factura: lo dice su ficha (lo pidió el cliente el
 * 2026-11-20, *"en los dos, boleta o factura"*).
 */
export type Documento = 'boleta' | 'factura';

export interface ComoSeDocumenta {
  documento: Documento;
  /**
   * **Si lo que gana ya trae el impuesto.** Con boleta, *retención
   * incluida*: lo que gana es el bruto, y se le transfiere el bruto menos la
   * retención. Con factura, *IVA incluido*: lo que gana es el total de la
   * factura. Si va **aparte**, con boleta lo que gana es el neto y el bruto
   * se calcula hacia arriba (así el equipo), y con factura se le suma el IVA.
   * De partida, **incluido** para vendedores y socios (lo decidió el cliente,
   * *"por ahora… incluyendo el IVA… y que sea incluida la retención"*), y
   * editable en cada ficha.
   */
  incluido: boolean;
}

/** El equipo y los extras: boleta, y lo que calcula el panel es el neto. */
export const BOLETA_NETO: ComoSeDocumenta = { documento: 'boleta', incluido: false };

/** El IVA de una factura, en centésimas de punto. Lo fija la ley, como la retención. */
export const IVA_CENTESIMAS = 1900;

export interface Desglose {
  documento: Documento;
  incluido: boolean;
  /** Lo que se escribe en el documento: el bruto de la boleta, o el total de la factura con IVA. */
  enDocumento: number;
  /** La retención de la boleta (la paga la empresa en el F29), o el IVA de la factura. */
  impuesto: number;
  /** El neto: lo que recibe quien boletea, o la factura sin IVA. */
  neto: number;
  /** **Lo que se le transfiere**: el neto de la boleta, o el total de la factura. */
  aTransferir: number;
  /** En centésimas de punto: 1525 = 15,25% de retención; 1900 = 19% de IVA. */
  tasa: number;
}

/**
 * **El documento por un monto**, según cómo se documenta. `retencion` es la
 * tasa de la boleta (`retencionDelAno()`); la factura usa el IVA. Las
 * cuentas siempre cuadran: lo que va en el documento es el neto más el
 * impuesto, y el impuesto sale de restar.
 */
export function desgloseDocumento(monto: number, como: ComoSeDocumenta, retencion: number): Desglose {
  const m = Math.max(0, Math.round(monto));
  const base = { documento: como.documento, incluido: como.incluido };
  if (como.documento === 'factura') {
    if (como.incluido) {
      const neto = Math.round((m * 10000) / (10000 + IVA_CENTESIMAS));
      return { ...base, enDocumento: m, impuesto: m - neto, neto, aTransferir: m, tasa: IVA_CENTESIMAS };
    }
    const iva = Math.round((m * IVA_CENTESIMAS) / 10000);
    return { ...base, enDocumento: m + iva, impuesto: iva, neto: m, aTransferir: m + iva, tasa: IVA_CENTESIMAS };
  }
  if (como.incluido) {
    const ret = retencionDe(m, retencion);
    return { ...base, enDocumento: m, impuesto: ret, neto: m - ret, aTransferir: m - ret, tasa: retencion };
  }
  const bruto = brutoParaNeto(m, retencion);
  return { ...base, enDocumento: bruto, impuesto: bruto - m, neto: m, aTransferir: m, tasa: retencion };
}

/**
 * El desglose de la boleta del equipo, desde su neto. **La retención se
 * muestra como bruto menos neto**, para que los tres números siempre
 * cuadren en pantalla; el SII la calcula del bruto y puede ajustar un peso.
 */
export const desgloseDe = (neto: number, centesimas: number): Desglose =>
  desgloseDocumento(neto, BOLETA_NETO, centesimas);

/* ---------- Lo que entra en la boleta ---------- */

/** Un monto con su día: un turno, una actividad, una comisión. */
export interface MontoDelDia { fecha: Fecha; monto: number }

/** **Un adelanto no baja la boleta**: es plata ya entregada (lo confirmó el cliente). */
export const esAdelanto = (a: Pick<Ajuste, 'monto' | 'motivo' | 'tipo'>) =>
  tipoDeAjuste(a as Ajuste) === 'resta' && partesDeMotivo(a.motivo).razon === 'Adelanto';

/**
 * Lo que un turno pone en la boleta: lo mismo que `pagoDe()` —jornada,
 * horas extra y ajustes, nunca bajo cero— **sin restar los adelantos**. Un
 * contratado pone cero: su sueldo no va con boleta.
 */
export function paraBoletaDeTurno(t: Pick<Turno,
  'asistencia' | 'modalidad' | 'pagoJornada' | 'horasExtra' | 'valorHora' | 'ajustes'> & Pick<Partial<Turno>, 'suelto'>): number {
  const ajustes = (t.ajustes ?? []).filter((a) => !esAdelanto(a)).reduce((n, a) => n + (a.monto || 0), 0);
  // **Un ajuste fuera de turno** (2026-11-21) cuenta tal cual, también
  // negativo: un *Rompió algo* un día sin turno baja la boleta del periodo.
  // Un adelanto no, igual que en un turno.
  if (t.suelto) return Math.round(ajustes);
  if (t.asistencia !== VINO.si || esContratado(t.modalidad)) return 0;
  return Math.max(0, Math.round((t.pagoJornada || 0) + (t.horasExtra || 0) * (t.valorHora || 0) + ajustes));
}

/** Los turnos de una persona como montos por día, para `cuentaBoleta()`. */
export function montosDeTurnos(turnos: Turno[], nombre: string): MontoDelDia[] {
  const clave = normalizar(nombre);
  return turnos.filter((t) => normalizar(t.trabajador) === clave)
    .map((t) => ({ fecha: t.fecha, monto: paraBoletaDeTurno(t) }));
}

/** Lo mismo para una actividad extra: monto y ajuste, sin restar un adelanto. */
export function paraBoletaDeExtra(e: { estado: string; monto: number; ajuste: number; motivo: string; ajustes?: Ajuste[] }): number {
  if (e.estado !== VINO.si) return 0;
  // Con la lista (2026-11-21), cada ajuste por separado, como en un turno: un
  // *Adelanto* no baja la boleta y lo demás sí. Sin ella, el ajuste de siempre.
  const ajuste = e.ajustes
    ? e.ajustes.reduce((n, a) => n + (esAdelanto(a) ? 0 : (a.monto || 0)), 0)
    : esAdelanto({ monto: e.ajuste || 0, motivo: e.motivo }) ? 0 : (e.ajuste || 0);
  return Math.max(0, Math.round((e.monto || 0) + ajuste));
}

export function montosDeExtras(
  extras: { fecha: Fecha; colaborador: string; estado: string; monto: number; ajuste: number; motivo: string }[],
  nombre: string
): MontoDelDia[] {
  const clave = normalizar(nombre);
  return extras.filter((e) => normalizar(e.colaborador) === clave)
    .map((e) => ({ fecha: e.fecha, monto: paraBoletaDeExtra(e) }));
}

/**
 * Lo de un vendedor: cada comisión el día en que el cliente terminó de
 * pagar (`pagadaEl`, como en `resumenDelPeriodo()`) y su sueldo fijo el
 * último día de cada mes (`fines`, de `finesDeMesEntre()`).
 */
export function montosDeVendedor(
  ventas: { pagadaEl: Fecha | ''; comision: number; cancelada?: boolean }[], sueldoFijo: number, fines: Fecha[]
): MontoDelDia[] {
  return [
    ...ventas.filter((v) => !v.cancelada && v.pagadaEl).map((v) => ({ fecha: v.pagadaEl as Fecha, monto: Math.round(v.comision) })),
    ...(sueldoFijo > 0 ? fines.map((fecha) => ({ fecha, monto: Math.round(sueldoFijo) })) : [])
  ];
}

/* ---------- Lo que falta boletear ---------- */

export interface CuentaBoleta {
  /** Con qué documento, y si lo que gana trae el impuesto. */
  como: ComoSeDocumenta;
  /**
   * Lo que la persona ganó en el periodo, como lo dice su trato: el neto
   * para el equipo; con impuesto incluido, el bruto o el total de la factura.
   */
  total: number;
  /** Lo que ya está respaldado por documentos recibidos. */
  boleteado: number;
  /** **Lo que falta documentar**: días sin boleta o factura, y diferencias. */
  falta: number;
  /** El documento que falta: lo que va en él, su impuesto y su neto. */
  porBoletear: Desglose;
  /** El documento del periodo entero, como si fuera uno solo. */
  delPeriodo: Desglose;
  /** La marcada justo por este periodo, si hay. Es la que se marca y desmarca acá. */
  exacta: Boleta | null;
  /** Las de otros periodos que cubren días de este: *por semana*, o *la del mes*. */
  otras: Boleta[];
  /**
   * **Boletas por menos de lo que hoy suman sus días**: se marcó la boleta
   * y después alguien agregó una hora extra o corrigió un día. Solo las que
   * caben enteras en el periodo, solo las que guardaron su monto, y solo con
   * el impuesto aparte (lo que gana es el neto que se guardó).
   */
  diferencias: { boleta: Boleta; dice: number; suma: number }[];
}

/**
 * **Cuánto falta boletear en un periodo**, y con qué bruto.
 *
 * Cada monto del periodo se respalda con **la primera boleta que cubre su
 * día**, en el orden en que se marcaron. Así, si alguien boleteó dos
 * semanas sueltas y después cerró el mes con una boleta por lo que faltaba,
 * las semanas quedan con sus días y la del mes con el resto: nada se cuenta
 * dos veces y nada se pierde.
 *
 * `hoy` decide la tasa (`fechaDeEmision()`).
 */
export function cuentaBoleta(
  montos: MontoDelDia[], boletas: Boleta[], quien: string, desde: Fecha, hasta: Fecha, hoy: Fecha,
  como: ComoSeDocumenta = BOLETA_NETO
): CuentaBoleta {
  const clave = normalizar(quien);
  const suyas = boletas.filter((b) => clave && normalizar(b.quien) === clave)
    .sort((a, b) => a.fila - b.fila);
  const dentro = montos.filter((m) => m.monto > 0 && m.fecha >= desde && m.fecha <= hasta);
  let neto = 0;
  let sinBoleta = 0;
  const asignado = new Map<Boleta, number>();
  for (const m of dentro) {
    neto += m.monto;
    const b = suyas.find((x) => x.desde <= m.fecha && m.fecha <= x.hasta);
    if (b) asignado.set(b, (asignado.get(b) ?? 0) + m.monto);
    else sinBoleta += m.monto;
  }
  const diferencias: CuentaBoleta['diferencias'] = [];
  for (const [b, suma] of asignado) {
    if (!como.incluido && b.neto !== null && b.desde >= desde && b.hasta <= hasta && suma > b.neto) {
      diferencias.push({ boleta: b, dice: b.neto, suma });
    }
  }
  const falta = sinBoleta + diferencias.reduce((n, d) => n + d.suma - d.dice, 0);
  const tasa = retencionDelAno(fechaDeEmision(hasta, hoy));
  const exacta = suyas.find((b) => b.desde === desde && b.hasta === hasta) ?? null;
  return {
    como, total: neto, falta, boleteado: neto - falta,
    porBoletear: desgloseDocumento(falta, como, tasa),
    delPeriodo: desgloseDocumento(neto, como, tasa),
    exacta,
    otras: suyas.filter((b) => b !== exacta && b.desde <= hasta && b.hasta >= desde),
    diferencias
  };
}

/** Si a esa persona le falta una boleta en el periodo: ganó algo y no está todo respaldado. */
export const faltaBoleta = (c: CuentaBoleta) => c.falta > 0;

/**
 * **El neto que se guarda al marcar el documento del periodo**: lo que
 * respalda. Sin uno marcado, el neto de lo que falta; con uno por menos de
 * lo que hoy suma, lo que ya decía más la diferencia.
 */
export function netoAlMarcar(c: CuentaBoleta): number {
  if (!c.exacta) return c.porBoletear.neto;
  const dif = c.diferencias.find((d) => d.boleta === c.exacta);
  return dif ? dif.suma : (c.exacta.neto ?? c.porBoletear.neto);
}
