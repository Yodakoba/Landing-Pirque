/**
 * **El equipo de ventas: cómo se le paga a cada vendedor y cuánto le toca**
 * (2026-11-12, lo pidió el cliente: *"el vendedor necesita tener un resumen
 * al estilo del trabajador… y en el informe… lo mismo que para los
 * trabajadores y los extras, para gestionar los pagos"*).
 *
 * Las reglas las fijó el cliente:
 *
 * - **Cómo se paga es flexible y por vendedor**: un sueldo fijo al mes, un %
 *   de comisión y un monto por evento ganado, cualquiera o todos. Se
 *   escriben en su ficha (pestaña `Vendedores`), junto a su cuenta bancaria.
 * - **La comisión se gana cuando el cliente pagó todo**: cuenta en el
 *   periodo del cobro que completó el total. Una cancelada no deja comisión.
 * - **Sobre el total con IVA**, editable por vendedor (`Base comisión`:
 *   *Total con IVA* o *Neto*).
 * - **El sueldo fijo cuenta el último día de cada mes**: un periodo que
 *   incluye ese día lo suma. Así una semana no lo parte y un rango de dos
 *   meses suma los dos, sin prorratear nada.
 *
 * Puro, sin red ni planilla.
 */
import type { Fecha } from './fechas.ts';
import { sumarDias } from './fechas.ts';
import { bancoVacio, type Banco, COL_BANCO } from './banco.ts';
import { indices, normalizar } from './columnas.ts';
import { type Presupuesto, type LineaPresupuesto, ESTADO_PRESUPUESTO, estadoNormal,
         lineasDe, cuentasDe } from './presupuestos.ts';
import type { Cobro } from './cobros.ts';

export const HOJA_VENDEDORES = 'Vendedores';

/** Por nombre de columna: se agregan filas de a una y le pueden crecer columnas. */
export const COL_VENDEDORES = {
  usuario: 'Usuario',
  nombre: 'Nombre',
  sueldoFijo: 'Sueldo fijo mensual',
  comisionPct: 'Comisión %',
  montoEvento: 'Monto por evento',
  base: 'Base comisión',
  ...COL_BANCO,
  nota: 'Nota de pago'
} as const;
export const ENCABEZADO_VENDEDORES = Object.values(COL_VENDEDORES);

export const BASE_COMISION = { total: 'Total con IVA', neto: 'Neto' } as const;
export type BaseComision = keyof typeof BASE_COMISION;

export interface FichaVendedor {
  /** El usuario de su cuenta: es lo que une la ficha con sus cotizaciones. */
  usuario: string;
  nombre: string;
  sueldoFijo: number;
  /** En %, con decimales: 2,5 es 2,5%. */
  comisionPct: number;
  montoEvento: number;
  base: BaseComision;
  banco: Banco;
  /** Fila en la planilla; 0 si todavía no tiene. */
  fila: number;
}

export const fichaVacia = (usuario: string, nombre = ''): FichaVendedor => ({
  usuario, nombre, sueldoFijo: 0, comisionPct: 0, montoEvento: 0, base: 'total', banco: bancoVacio(), fila: 0
});

const entero = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
/** Un % que acepta coma decimal: "2,5" es 2,5. Entre 0 y 100. */
export function porcentaje(v: unknown): number {
  const n = Number(String(v ?? '').replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : 0;
}
const baseDe = (v: unknown): BaseComision => (/neto/i.test(String(v ?? '')) ? 'neto' : 'total');

export function leerVendedoresDe(filas: string[][]): FichaVendedor[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_VENDEDORES);
  const en = (f: string[], k: number) => (k >= 0 ? String(f[k] ?? '') : '');
  return filas.slice(1).map((f, n) => ({
    usuario: en(f, i.usuario).trim(),
    nombre: en(f, i.nombre).trim(),
    sueldoFijo: entero(en(f, i.sueldoFijo)),
    comisionPct: porcentaje(en(f, i.comisionPct)),
    montoEvento: entero(en(f, i.montoEvento)),
    base: baseDe(en(f, i.base)),
    banco: {
      titular: en(f, i.titular).trim(), rut: en(f, i.rut).trim(), banco: en(f, i.banco).trim(),
      tipo: en(f, i.tipo).trim(), numero: en(f, i.numero).trim(), correo: en(f, i.correo).trim(),
      nota: en(f, i.nota).trim()
    },
    fila: n + 2
  })).filter((v) => v.usuario);
}

export function filaVendedor(v: FichaVendedor, enc: string[]): string[] {
  const i = indices(enc, COL_VENDEDORES);
  const fila = enc.map(() => '');
  const poner = (k: number, x: unknown) => { if (k >= 0) fila[k] = String(x ?? ''); };
  poner(i.usuario, v.usuario); poner(i.nombre, v.nombre);
  poner(i.sueldoFijo, v.sueldoFijo || ''); poner(i.comisionPct, v.comisionPct ? String(v.comisionPct).replace('.', ',') : '');
  poner(i.montoEvento, v.montoEvento || ''); poner(i.base, BASE_COMISION[v.base]);
  poner(i.titular, v.banco.titular); poner(i.rut, v.banco.rut); poner(i.banco, v.banco.banco);
  poner(i.tipo, v.banco.tipo); poner(i.numero, v.banco.numero); poner(i.correo, v.banco.correo);
  poner(i.nota, v.banco.nota);
  return fila;
}

/** La ficha de un usuario, o una vacía si nadie se la llenó todavía. */
export function fichaDe(fichas: FichaVendedor[], usuario: string, nombre = ''): FichaVendedor {
  return fichas.find((f) => normalizar(f.usuario) === normalizar(usuario)) ?? fichaVacia(usuario, nombre);
}

/** Si la ficha dice cómo se le paga: sin nada, el resumen no puede calcular plata. */
export const tieneFormaDePago = (f: Pick<FichaVendedor, 'sueldoFijo' | 'comisionPct' | 'montoEvento'>) =>
  f.sueldoFijo > 0 || f.comisionPct > 0 || f.montoEvento > 0;

/* ---------- las ventas ---------- */

export interface Venta {
  id: string;
  /** El grupo, para el número de la cotización. */
  grupo: string;
  cliente: string;
  fechaEvento: Fecha;
  total: number;
  neto: number;
  pagado: number;
  /** El día del cobro que completó el total; vacío si todavía falta. */
  pagadaEl: Fecha | '';
  cancelada: boolean;
  /** Lo que le toca al vendedor por esta venta: el % sobre la base más el monto por evento. */
  comision: number;
}

/** La comisión de una venta, con las reglas de la ficha. */
export function comisionDe(f: Pick<FichaVendedor, 'comisionPct' | 'montoEvento' | 'base'>,
  v: Pick<Venta, 'total' | 'neto'>): number {
  const base = f.base === 'neto' ? v.neto : v.total;
  return Math.round(base * f.comisionPct / 100) + f.montoEvento;
}

/**
 * **El día en que el cliente terminó de pagar**: recorre los cobros en orden
 * y devuelve la fecha del que hizo llegar la suma al total. Una devolución
 * (negativa) puede bajarlo de nuevo, y entonces vuelve a faltar.
 */
export function pagadaEl(total: number, cobros: Pick<Cobro, 'fecha' | 'monto' | 'cuando'>[]): Fecha | '' {
  if (!(total > 0)) return '';
  let suma = 0;
  let dia: Fecha | '' = '';
  for (const c of [...cobros].sort((a, b) => (a.fecha + a.cuando).localeCompare(b.fecha + b.cuando))) {
    suma += c.monto;
    if (suma >= total) { if (!dia) dia = c.fecha; } else dia = '';
  }
  return dia;
}

/**
 * Las cotizaciones **ganadas** de un vendedor, con lo pagado y su comisión.
 * Las canceladas vienen marcadas y con comisión 0: una venta que se cayó no
 * deja comisión aunque el cliente hubiera pagado.
 */
export function ventasDe(usuario: string, presupuestos: Presupuesto[], lineas: LineaPresupuesto[],
  cobros: Cobro[], ficha: Pick<FichaVendedor, 'comisionPct' | 'montoEvento' | 'base'>): Venta[] {
  const yo = normalizar(usuario);
  return presupuestos
    .filter((p) => normalizar(p.creadoPor) === yo && (!!p.idReserva
      || estadoNormal(p.estado) === ESTADO_PRESUPUESTO.cancelada))
    .map((p) => {
      const cuentas = cuentasDe(lineasDe(lineas, p.id), p.descuento);
      const suyos = cobros.filter((c) => c.presupuesto === p.id);
      const cancelada = estadoNormal(p.estado) === ESTADO_PRESUPUESTO.cancelada;
      const pagado = suyos.reduce((n, c) => n + c.monto, 0);
      const v = { total: cuentas.total, neto: cuentas.neto };
      return {
        id: p.id, grupo: p.grupo || p.id, cliente: p.cliente || 'sin nombre', fechaEvento: p.fecha,
        total: cuentas.total, neto: cuentas.neto, pagado,
        pagadaEl: cancelada ? '' : pagadaEl(cuentas.total, suyos),
        cancelada, comision: cancelada ? 0 : comisionDe(ficha, v)
      } as Venta;
    })
    .sort((a, b) => (b.pagadaEl || b.fechaEvento).localeCompare(a.pagadaEl || a.fechaEvento));
}

/* ---------- el periodo ---------- */

/** Los últimos días de mes que caen en el periodo: cada uno suma un sueldo fijo. */
export function finesDeMesEntre(desde: Fecha, hasta: Fecha): Fecha[] {
  const fines: Fecha[] = [];
  let [a, m] = desde.slice(0, 7).split('-').map(Number);
  for (let n = 0; n < 240; n++) {
    const siguiente = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`;
    const fin = sumarDias(siguiente, -1);
    if (fin > hasta) break;
    if (fin >= desde) fines.push(fin);
    a = Number(siguiente.slice(0, 4)); m = Number(siguiente.slice(5, 7));
  }
  return fines;
}

export interface ResumenVendedor {
  /** Las ventas que el cliente terminó de pagar dentro del periodo: las que suman. */
  cuentan: Venta[];
  comisiones: number;
  /** Cuántos meses de sueldo fijo cierran en el periodo, y cuánto suman. */
  mesesFijo: number;
  sueldoFijo: number;
  /** Lo que se le debe por el periodo. */
  total: number;
}

export function resumenDelPeriodo(ficha: Pick<FichaVendedor, 'sueldoFijo'>, ventas: Venta[],
  desde: Fecha, hasta: Fecha): ResumenVendedor {
  const cuentan = ventas.filter((v) => !v.cancelada && v.pagadaEl && v.pagadaEl >= desde && v.pagadaEl <= hasta);
  const comisiones = cuentan.reduce((n, v) => n + v.comision, 0);
  const mesesFijo = ficha.sueldoFijo > 0 ? finesDeMesEntre(desde, hasta).length : 0;
  const sueldoFijo = mesesFijo * ficha.sueldoFijo;
  return { cuentan, comisiones, mesesFijo, sueldoFijo, total: comisiones + sueldoFijo };
}

/** Ganadas que el cliente todavía no termina de pagar: comisión que viene. */
export const porCobrar = (ventas: Venta[]) => ventas.filter((v) => !v.cancelada && !v.pagadaEl);
