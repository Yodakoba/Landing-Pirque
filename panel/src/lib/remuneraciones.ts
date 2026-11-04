/**
 * Lo que ya se le pagó a cada persona, y lo que falta.
 *
 * Lo pidió el cliente el 2026-11-01, pensando en quien hace la
 * transferencia: *"un check de pago… pero que también tendrá la posibilidad
 * de decir yo pagué solo 100 de esto"*.
 *
 * **Se guardan los pagos, no un check.** Una casilla "pagado sí/no" más un
 * campo "monto pagado" son dos datos que pueden contradecirse —alguien
 * marca la casilla y deja el monto en cero, o al revés— y entonces el panel
 * tendría dos verdades sobre la misma plata. Acá el hecho que se guarda es
 * **el pago**: cuánto, cuándo y quién lo registró. Que esté pagado del todo
 * se deduce de sumarlos, igual que "Vencido" se deduce de la fecha en los
 * presupuestos y no se guarda.
 *
 * Lo que eso gana, y que un check no da:
 *
 * - **Un pago parcial no es un caso especial**, es un pago más chico. Pagar
 *   el resto después es otra fila, y la suma cierra sola.
 *   No hay ningún estado intermedio que alguien tenga que mantener.
 * - **Queda el rastro.** Cuándo se pagó, cuánto y quién lo anotó, que es
 *   exactamente lo que alguien va a querer saber un mes después. Un check
 *   no deja nada de eso.
 *
 * **Se llama `remuneraciones.ts` y no `pagos.ts` porque ese nombre ya está
 * tomado** por el estado del pago de una reserva —`paid`, `pending`— que es
 * plata que entra. Esta es plata que sale. La pestaña de la planilla sí se
 * llama `Pagos`, porque ahí no hay colisión y es como lo diría una persona.
 */
import { aEntero } from './equipo.ts';
import { normalizar } from './columnas.ts';
import { esFecha, type Fecha } from './fechas.ts';

export const HOJA_PAGOS = 'Pagos';

/**
 * Una fila por pago. **Por nombre de columna**, como `Turnos` y `Cierres`:
 * se le agregan y se le borran filas de a una, y le van a crecer columnas.
 */
export const COL_PAGOS = {
  id: 'ID',
  fecha: 'Fecha de pago',
  quien: 'Trabajador',
  /**
   * El periodo **por el que** se pagó, no el día en que se transfirió.
   *
   * Es lo que permite que el informe de una semana muestre lo que se pagó
   * por esa semana, y que el del mes muestre los dos pagos semanales que
   * cayeron adentro. Guardar solo la fecha de la transferencia no alcanza:
   * se paga el lunes la semana que terminó el domingo, así que la fecha del
   * pago cae fuera del periodo que está saldando.
   */
  desde: 'Periodo desde',
  hasta: 'Periodo hasta',
  monto: 'Monto',
  nota: 'Nota',
  registradoPor: 'Registrado por',
  /**
   * **Qué se pagó**: sueldo, propina o servicio (2026-11-04).
   *
   * Lo pidió el cliente porque *"legalmente tiene que ser un pago por
   * propina y un pago por sueldos"*: son dos transferencias, y cada una
   * tiene que poder decir cuál es. Va al final, así que la planilla que ya
   * tiene pagos solo gana una columna — y **un pago viejo, con la celda en
   * blanco, sigue contando para el total** (ver `desglosePago()`).
   */
  concepto: 'Concepto'
} as const;

/**
 * Los conceptos de un pago.
 *
 * - **Sueldo**: lo que un trabajador gana por sus turnos —jornadas, horas
 *   extra y ajustes—.
 * - **Propina**: su parte del reparto. Es plata que pasa por el negocio, no
 *   que sale de él, y por eso va en su propia transferencia.
 * - **Servicio**: lo que se le paga a una actividad extra —un jinete, una
 *   pintacaritas—. No es un sueldo y no recibe propina.
 */
export const CONCEPTO = {
  sueldo: 'Sueldo',
  propina: 'Propina',
  servicio: 'Servicio'
} as const;
export type Concepto = typeof CONCEPTO[keyof typeof CONCEPTO];

/** Lee un concepto escrito a mano: sin distinguir mayúsculas ni tildes. */
export function conceptoDe(v: unknown): Concepto | '' {
  const n = normalizar(String(v ?? ''));
  if (n === normalizar(CONCEPTO.propina)) return CONCEPTO.propina;
  if (n === normalizar(CONCEPTO.sueldo)) return CONCEPTO.sueldo;
  if (n === normalizar(CONCEPTO.servicio)) return CONCEPTO.servicio;
  return '';
}

export const ENCABEZADO_PAGOS: string[] = Object.values(COL_PAGOS);

export interface PagoEquipo {
  id: string;
  /** Cuándo se transfirió. */
  fecha: Fecha;
  /** A quién. Es el nombre, como en `Turnos` y en `Actividades`. */
  quien: string;
  desde: Fecha;
  hasta: Fecha;
  monto: number;
  nota: string;
  registradoPor: string;
  /** Qué se pagó. Vacío en los pagos anotados antes del 2026-11-04. */
  concepto: Concepto | '';
  /** Fila en la planilla, para poder borrarla. */
  fila: number;
}

export function nuevoIdPago(ahora = Date.now()): string {
  return `PAGO-${ahora.toString(36).toUpperCase()}`;
}

export function leerPagosDe(filas: string[][]): PagoEquipo[] {
  if (filas.length < 2) return [];
  const enc = filas[0].map((c) => normalizar(String(c ?? '')));
  const col = (nombre: string) => enc.indexOf(normalizar(nombre));
  const iQuien = col(COL_PAGOS.quien);
  if (iQuien === -1) return [];

  const iId = col(COL_PAGOS.id);
  const iFecha = col(COL_PAGOS.fecha);
  const iDesde = col(COL_PAGOS.desde);
  const iHasta = col(COL_PAGOS.hasta);
  const iMonto = col(COL_PAGOS.monto);
  const iNota = col(COL_PAGOS.nota);
  const iReg = col(COL_PAGOS.registradoPor);
  const iConcepto = col(COL_PAGOS.concepto);
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());

  const salida: PagoEquipo[] = [];
  for (let n = 1; n < filas.length; n++) {
    const quien = en(filas[n], iQuien);
    if (!quien) continue;
    salida.push({
      id: en(filas[n], iId),
      fecha: en(filas[n], iFecha).slice(0, 10),
      quien,
      desde: en(filas[n], iDesde).slice(0, 10),
      hasta: en(filas[n], iHasta).slice(0, 10),
      // Con signo: un pago corregido hacia atrás se anota en negativo en vez
      // de borrar la fila, y así no se pierde el rastro de lo que pasó.
      monto: aEntero(en(filas[n], iMonto), true),
      nota: en(filas[n], iNota),
      registradoPor: en(filas[n], iReg),
      concepto: conceptoDe(en(filas[n], iConcepto)),
      fila: n + 1
    });
  }
  return salida;
}

export function filaPago(p: Omit<PagoEquipo, 'fila'>, enc: string[]): string[] {
  const i = (nombre: string) => enc.findIndex((c) => normalizar(String(c)) === normalizar(nombre));
  const fila = new Array(Math.max(enc.length, ENCABEZADO_PAGOS.length)).fill('');
  const poner = (k: number, v: string | number) => { if (k !== -1) fila[k] = v; };
  poner(i(COL_PAGOS.id), p.id);
  poner(i(COL_PAGOS.fecha), p.fecha);
  poner(i(COL_PAGOS.quien), p.quien);
  poner(i(COL_PAGOS.desde), p.desde);
  poner(i(COL_PAGOS.hasta), p.hasta);
  poner(i(COL_PAGOS.monto), p.monto);
  poner(i(COL_PAGOS.nota), p.nota);
  poner(i(COL_PAGOS.registradoPor), p.registradoPor);
  poner(i(COL_PAGOS.concepto), p.concepto);
  return fila;
}

/**
 * Si este pago cuenta dentro del periodo que se está mirando.
 *
 * **El pago tiene que caber entero**: se cuenta cuando el periodo por el que
 * se pagó está dentro del que se muestra. Así, pagar la semana del 9 aparece
 * al mirar esa semana **y** al mirar noviembre entero, que es como se usa.
 *
 * **La contra a asumir, y conviene saberla:** mirar un rango de tres días
 * metido dentro de una semana ya pagada **no** muestra ese pago, porque ese
 * pago no es de esos tres días — es de la semana. Repartirlo a prorrata
 * sería inventar: nadie pagó "un tercio del martes". Con el uso normal
 * —se paga el periodo que se está mirando— no aparece.
 */
export const cuentaEnPeriodo = (p: PagoEquipo, desde: Fecha, hasta: Fecha) =>
  !!p.desde && !!p.hasta && p.desde >= desde && p.hasta <= hasta;

/** Cuánto se le pagó ya a esta persona por este periodo. */
export function pagadoDe(
  pagos: PagoEquipo[], quien: string, desde: Fecha, hasta: Fecha
): number {
  const clave = normalizar(quien);
  if (!clave) return 0;
  return pagos
    .filter((p) => normalizar(p.quien) === clave && cuentaEnPeriodo(p, desde, hasta))
    .reduce((s, p) => s + p.monto, 0);
}

/**
 * En qué va el pago de una persona.
 *
 * **Es lo que dibuja el check, y se deduce de los montos** — no hay un
 * estado guardado que pueda decir otra cosa que la suma.
 *
 * `pagado` cuando ya se cubrió todo, y también cuando no había nada que
 * transferir: una persona que no vino en todo el periodo no queda eternamente
 * "pendiente" por cero pesos.
 */
export type EstadoPago = 'pagado' | 'parcial' | 'pendiente';

export function estadoDePago(aTransferir: number, pagado: number): EstadoPago {
  if (aTransferir <= 0) return 'pagado';
  if (pagado >= aTransferir) return 'pagado';
  return pagado > 0 ? 'parcial' : 'pendiente';
}

/**
 * Lo que se le transfiere a una persona: su remuneración **más** su propina.
 *
 * **No contradice que la propina vaya aparte**, que es la regla de
 * `pagoDe()` y del informe: esa plata no sale del negocio, pasa por él, y
 * por eso nunca se suma al costo del equipo. Pero a la hora de transferir
 * sale **una sola plata a una sola cuenta**, y hasta ahora había que
 * sumarla a mano mirando dos columnas. Ésta es esa suma, y vive acá y no
 * dentro de `pagoDe()` justamente para que el costo del equipo siga sin
 * verla.
 */
export const aTransferirDe = (total: number, propina: number) =>
  Math.max(0, Math.round(total)) + Math.max(0, Math.round(propina));

/** Lo que todavía falta transferirle. Nunca negativo. */
export const faltaDe = (aTransferir: number, pagado: number) =>
  Math.max(0, aTransferir - pagado);

/**
 * Un pago que llega del navegador, limpiado.
 *
 * El servidor no confía en el cliente, igual que en las demás puertas: el
 * monto se vuelve un entero, las fechas se comprueban, y `id`, `fecha` y
 * `registradoPor` **no se aceptan de afuera** — los pone el servidor, porque
 * son el rastro de quién lo anotó y cuándo.
 */
export function pagoDelCuerpo(crudo: unknown): {
  quien: string; desde: Fecha; hasta: Fecha; monto: number; nota: string;
  concepto: Concepto | '';
} | null {
  const c = (crudo ?? {}) as Record<string, unknown>;
  const quien = String(c.quien ?? '').trim();
  const desde = String(c.desde ?? '').slice(0, 10);
  const hasta = String(c.hasta ?? '').slice(0, 10);
  if (!quien || !esFecha(desde) || !esFecha(hasta) || desde > hasta) return null;
  // Con signo: un pago en negativo es la corrección de uno de más.
  const monto = aEntero(c.monto, true);
  if (!monto) return null;
  // Un concepto que no es de la lista se descarta, igual que un tipo de
  // cuenta inventado: llegaría hasta la planilla que se manda a Chipax.
  return { quien, desde, hasta, monto, nota: String(c.nota ?? '').trim(),
           concepto: conceptoDe(c.concepto) };
}

/**
 * Los pagos de una persona que cuentan en el periodo, del más nuevo al más
 * viejo.
 *
 * Es `pagadoDe()` sin sumar: lo que el link personal necesita para mostrar
 * **cada** transferencia con su fecha y su nota, en vez de un total que no
 * se puede revisar. La condición de qué cuenta es la misma —
 * `cuentaEnPeriodo()`— para que la lista y la suma no puedan decir cosas
 * distintas.
 */
export function pagosEnPeriodo(
  pagos: PagoEquipo[], quien: string, desde: Fecha, hasta: Fecha
): PagoEquipo[] {
  const clave = normalizar(quien);
  if (!clave) return [];
  return pagos
    .filter((p) => normalizar(p.quien) === clave && cuentaEnPeriodo(p, desde, hasta))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

/**
 * Los pagos que **tocan** el periodo pero no caben entero dentro de él.
 *
 * Existen por la contra que `cuentaEnPeriodo()` tiene escrita: un pago
 * registrado por una quincena no aparece al mirar una sola de sus semanas,
 * porque no es de esa semana. Para quien paga eso es una nota al pie; para
 * el trabajador que abre su link es **"no me pagaron"**, que es lo contrario
 * de lo que pasó.
 *
 * Así que en vez de cambiar la regla —repartir un pago a prorrata sería
 * inventar: nadie pagó "un tercio del martes"— se nombra el caso y se dice
 * dónde mirarlo. Lo normal es que esta lista vaya vacía.
 */
export function pagosQueNoCaben(
  pagos: PagoEquipo[], quien: string, desde: Fecha, hasta: Fecha
): PagoEquipo[] {
  const clave = normalizar(quien);
  if (!clave) return [];
  return pagos.filter((p) =>
    normalizar(p.quien) === clave
    && !!p.desde && !!p.hasta
    // Se cruza con el periodo…
    && p.desde <= hasta && p.hasta >= desde
    // …pero no cabe entero, así que la suma no lo está contando.
    && !cuentaEnPeriodo(p, desde, hasta));
}

/* ---------- Sueldo y propina, cada uno con su pago (2026-11-04) ---------- */

/** En qué va una de las dos partes del pago de una persona. */
export interface Parte {
  /** Lo que corresponde por este concepto en el periodo. */
  debe: number;
  /** Lo que ya se pagó por este concepto. */
  pagado: number;
  falta: number;
  estado: EstadoPago;
}

/**
 * Lo que se le debe a una persona en el periodo, **partido en lo que no es
 * propina y la propina**, cada uno con lo pagado y lo que falta.
 *
 * Lo pidió el cliente: *"legalmente tiene que ser un pago por propina y un
 * pago por sueldos"*. Son dos transferencias, así que cada una tiene que
 * poder verse pagada o no por su cuenta.
 *
 * **Los pagos viejos, sin concepto, se reparten solos**: primero cubren el
 * sueldo y lo que sobre va a la propina. Así un pago anotado antes de que
 * existiera la columna sigue contando —el total no cambia— y no hay que
 * migrar la planilla. Es el orden en que se paga de costumbre: el sueldo es
 * lo que se debe, la propina lo que se reparte.
 *
 * `sueldo` es el total de la remuneración —o el monto, para una actividad
 * extra—, y `propina` es cero para quien no entra en el reparto.
 */
export function desglosePago(
  pagos: PagoEquipo[], quien: string, desde: Fecha, hasta: Fecha,
  sueldo: number, propina: number
): { sueldo: Parte; propina: Parte; total: Parte } {
  const suyos = pagosEnPeriodo(pagos, quien, desde, hasta);
  const deSueldo = suyos.filter((p) => p.concepto === CONCEPTO.sueldo
    || p.concepto === CONCEPTO.servicio).reduce((s, p) => s + p.monto, 0);
  const dePropina = suyos.filter((p) => p.concepto === CONCEPTO.propina)
    .reduce((s, p) => s + p.monto, 0);
  const sinConcepto = suyos.filter((p) => !p.concepto).reduce((s, p) => s + p.monto, 0);

  const debeS = Math.max(0, Math.round(sueldo));
  const debeP = Math.max(0, Math.round(propina));
  // Lo sin concepto llena primero el hueco del sueldo; lo que sobra, la
  // propina. Nunca más de lo que se debe en el sueldo, para que un pago
  // viejo por el total no deje la propina pendiente.
  const alSueldo = Math.max(0, Math.min(sinConcepto, debeS - deSueldo));
  const pagS = deSueldo + alSueldo;
  const pagP = dePropina + (sinConcepto - alSueldo);
  const parte = (debe: number, pagado: number): Parte => ({
    debe, pagado, falta: faltaDe(debe, pagado), estado: estadoDePago(debe, pagado)
  });
  return {
    sueldo: parte(debeS, pagS),
    propina: parte(debeP, pagP),
    total: parte(debeS + debeP, pagS + pagP)
  };
}

/* ---------- La boleta (2026-11-04) ---------- */

/**
 * **Si una persona tiene que mandar boleta por su pago.**
 *
 * Lo pidió el cliente pensando en Chipax, el sistema del resultado
 * operacional: el informe de pagos se exporta para alimentarlo, y cada pago
 * tiene que poder decir si está respaldado.
 *
 * - **Por turno** y **actividades extras**: sí. Cobran por el día, sin
 *   contrato, y la boleta es lo que justifica ese pago.
 * - **Contratados**: no. Su sueldo va por la liquidación, que es otro
 *   papel; acá solo aparecen sus horas extra y ajustes. El cliente lo dejó
 *   para después —*"no te quiero complicar la vida completa"*—.
 * - **La propina**: nunca. Es plata que pasa por el negocio, no un pago
 *   por un servicio.
 *
 * Va en una sola función porque la preguntan la pantalla y el CSV, y dos
 * copias de la misma condición es lo que se desalinea cuando cambie.
 */
export const pideBoleta = (tipo: 'equipo' | 'extra', contratado: boolean) =>
  tipo === 'extra' || !contratado;

export const HOJA_BOLETAS = 'Boletas';

/**
 * Una fila por persona y periodo con boleta recibida. **Si no está, no
 * llegó**: no hay una fila con "No" que pueda contradecir a otra con "Sí".
 * Es el mismo criterio de los cierres: el hecho se guarda, la ausencia se
 * deduce.
 */
export const COL_BOLETAS = {
  quien: 'Trabajador',
  desde: 'Periodo desde',
  hasta: 'Periodo hasta',
  registradoPor: 'Registrado por',
  cuando: 'Cuándo',
  nota: 'Nota'
} as const;

export const ENCABEZADO_BOLETAS: string[] = Object.values(COL_BOLETAS);

export interface Boleta {
  quien: string;
  desde: Fecha;
  hasta: Fecha;
  registradoPor: string;
  cuando: string;
  nota: string;
  fila: number;
}

export function leerBoletasDe(filas: string[][]): Boleta[] {
  if (filas.length < 2) return [];
  const enc = filas[0].map((c) => normalizar(String(c ?? '')));
  const col = (nombre: string) => enc.indexOf(normalizar(nombre));
  const iQuien = col(COL_BOLETAS.quien);
  if (iQuien === -1) return [];
  const iDesde = col(COL_BOLETAS.desde);
  const iHasta = col(COL_BOLETAS.hasta);
  const iReg = col(COL_BOLETAS.registradoPor);
  const iCuando = col(COL_BOLETAS.cuando);
  const iNota = col(COL_BOLETAS.nota);
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());
  const salida: Boleta[] = [];
  for (let n = 1; n < filas.length; n++) {
    const quien = en(filas[n], iQuien);
    const desde = en(filas[n], iDesde).slice(0, 10);
    const hasta = en(filas[n], iHasta).slice(0, 10);
    if (!quien || !esFecha(desde) || !esFecha(hasta)) continue;
    salida.push({ quien, desde, hasta, registradoPor: en(filas[n], iReg),
                  cuando: en(filas[n], iCuando), nota: en(filas[n], iNota), fila: n + 1 });
  }
  return salida;
}

export function filaBoleta(b: Omit<Boleta, 'fila'>, enc: string[]): string[] {
  const i = (nombre: string) => enc.findIndex((c) => normalizar(String(c)) === normalizar(nombre));
  const fila = new Array(Math.max(enc.length, ENCABEZADO_BOLETAS.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i(COL_BOLETAS.quien), b.quien);
  poner(i(COL_BOLETAS.desde), b.desde);
  poner(i(COL_BOLETAS.hasta), b.hasta);
  poner(i(COL_BOLETAS.registradoPor), b.registradoPor);
  poner(i(COL_BOLETAS.cuando), b.cuando);
  poner(i(COL_BOLETAS.nota), b.nota);
  return fila;
}

/**
 * La boleta de una persona para el periodo que se mira, si llegó.
 *
 * **Cuenta igual que un pago**: la boleta tiene que cubrir el periodo de
 * esa fila, y el periodo tiene que caber en el que se mira. Así la boleta
 * de la semana del 9 aparece al mirar esa semana y al mirar noviembre.
 */
export function boletaDe(
  boletas: Boleta[], quien: string, desde: Fecha, hasta: Fecha
): Boleta | undefined {
  const clave = normalizar(quien);
  if (!clave) return undefined;
  return boletas.find((b) => normalizar(b.quien) === clave
    && b.desde >= desde && b.hasta <= hasta);
}

/** Lo que dice la columna Boleta del CSV: "Sí", "No aplica" o en blanco. */
export const boletaEnPlanilla = (aplica: boolean, recibida: boolean) =>
  !aplica ? 'No aplica' : recibida ? 'Sí' : '';

/* ---------- Copiar los datos de la transferencia (2026-11-04) ---------- */

/**
 * **El orden en que se copian los datos de una transferencia.**
 *
 * Lo pidió el cliente: un botón que copie los datos de una persona con el
 * monto, para pegarlos en el panel del banco. **El orden exacto todavía no
 * está confirmado** —cada banco pide los campos a su manera, y hay que
 * probarlo con el del cliente—, así que vive en una sola lista: cambiar el
 * orden es mover una línea acá y nada más.
 *
 * Se copian **separados por tabulación**: pegado en una planilla cae un
 * campo por celda, y en un formulario web muchos bancos pasan de un campo
 * al siguiente con cada tab.
 */
export const ORDEN_TRANSFERENCIA = [
  'titular', 'rut', 'banco', 'tipo', 'numero', 'monto', 'correo', 'glosa'
] as const;

export interface DatosTransferencia {
  titular: string; rut: string; banco: string; tipo: string; numero: string;
  monto: number; correo: string; glosa: string;
}

/** El nombre de cada columna en la planilla para el banco. */
export const NOMBRE_COLUMNA_TRANSFERENCIA: Record<typeof ORDEN_TRANSFERENCIA[number], string> = {
  titular: 'Nombre del titular', rut: 'RUT', banco: 'Banco', tipo: 'Tipo de cuenta',
  numero: 'N° de cuenta', monto: 'Monto', correo: 'Correo', glosa: 'Glosa'
};

/** Una transferencia como fila, en el orden de `ORDEN_TRANSFERENCIA`. */
export const filaTransferencia = (d: DatosTransferencia): string[] =>
  ORDEN_TRANSFERENCIA.map((k) => String(d[k] ?? ''));

/**
 * Los datos de una transferencia como texto para pegar.
 *
 * **Es la misma fila que la planilla para el banco**, separada por tabs: el
 * botón de copiar y la transferencia masiva salen del mismo orden, así que
 * cuando se confirme lo que pide el banco se cambia una vez y vale para los
 * dos.
 */
export const textoTransferencia = (d: DatosTransferencia) =>
  filaTransferencia(d).join('\t');

/**
 * La glosa de la transferencia: qué es y de qué periodo —*"Sueldo 26/10 al
 * 01/11"*—.
 *
 * **Corta y sin símbolos raros**: los bancos cortan la glosa a unos 30
 * caracteres y varios rechazan el guion largo o las tildes. Las fechas van
 * en números por eso mismo, y no en palabras como en el resto del panel.
 */
export function glosaDe(concepto: Concepto, desde: Fecha, hasta: Fecha): string {
  const corta = (f: Fecha) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
  return `${concepto} ${corta(desde)} al ${corta(hasta)}`;
}
