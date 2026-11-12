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
 * - **El % va por etapas, como los socios comerciales** (2026-11-12, modelo
 *   A que eligió el cliente): tres etapas por personas del evento —la 1
 *   desde la primera persona; la 2 y la 3 desde donde diga la ficha, 55 y 77
 *   de partida, los cortes de los socios—, cada una con su %. **Más un bono
 *   en puntos sobre las líneas de los productos marcados *Bono vendedor***
 *   (los menús más valiosos), para empujar la venta.
 * - **La comisión se gana cuando el cliente pagó todo**: cuenta en el
 *   periodo del cobro que completó el total. Una cancelada no deja comisión.
 * - **Sobre el neto** (desde el 2026-11-12; antes total con IVA), editable
 *   por vendedor (`Base comisión`: *Neto* o *Total con IVA*).
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
import type { Menu } from './menus.ts';
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
  etapa2Desde: 'Etapa 2 desde',
  etapa2Pct: 'Etapa 2 %',
  etapa3Desde: 'Etapa 3 desde',
  etapa3Pct: 'Etapa 3 %',
  bonoPuntos: 'Bono premium (puntos)',
  /** `Vendedor` o `Socio comercial` (2026-11-12). En blanco, vendedor. */
  tipoFicha: 'Tipo',
  /** Desde cuántas personas rige la etapa 1. En blanco, desde la primera. */
  etapa1Desde: 'Etapa 1 desde',
  /** Del vendedor: qué % de su comisión cobra cuando la venta trae un socio. */
  conSocio: 'Con socio cobra %',
  /** `no` es desactivado. Solo los socios: un vendedor se desactiva en *Cuentas*. */
  activo: 'Activo',
  /** El link personal del socio (`/mi/<token>`). Vacío: sin link. */
  token: 'Token de acceso',
  ...COL_BANCO,
  nota: 'Nota de pago'
} as const;
export const ENCABEZADO_VENDEDORES = Object.values(COL_VENDEDORES);

export const BASE_COMISION = { total: 'Total con IVA', neto: 'Neto' } as const;

/**
 * **Dos tipos de ficha en la misma lista** (2026-11-12, lo decidió el
 * cliente): el vendedor, con cuenta en el panel, y el **socio comercial**
 * —una agencia, un chofer, una municipalidad— que trae clientes y cobra su
 * comisión, **sin cuenta**. La fórmula es la misma; cambian los números de
 * partida y que el socio se elige en la cotización.
 */
export const TIPO_FICHA = { vendedor: 'Vendedor', socio: 'Socio comercial' } as const;
export type TipoFicha = keyof typeof TIPO_FICHA;
const tipoDe = (v: unknown): TipoFicha => (/socio/i.test(String(v ?? '')) ? 'socio' : 'vendedor');

/** Cuánto de su comisión cobra el vendedor cuando la venta viene con un socio, de partida. */
export const CON_SOCIO_DEFECTO = 50;
export type BaseComision = keyof typeof BASE_COMISION;

export interface FichaVendedor {
  /** El usuario de su cuenta: es lo que une la ficha con sus cotizaciones. */
  usuario: string;
  nombre: string;
  /** Vendedor o socio comercial. El socio se identifica por su id (`S-0001`) en `usuario`. */
  tipo: TipoFicha;
  /** Un socio desactivado deja de ofrecerse en la cotización; sus ventas siguen. */
  activo: boolean;
  /** Desde cuántas personas rige la etapa 1: bajo eso no hay comisión. 0 es desde la primera. */
  etapa1Desde: number;
  /** Del vendedor: el % de su comisión que cobra cuando la venta viene con un socio. */
  conSocio: number;
  /** El link personal de un socio (2026-11-12). El vendedor entra con su cuenta. */
  token: string;
  sueldoFijo: number;
  /** En %, con decimales: 2,5 es 2,5%. Es la **etapa 1**: desde la primera persona. */
  comisionPct: number;
  /** Desde cuántas personas rige la etapa 2, y su %. Un % en 0 es sin etapa 2. */
  etapa2Desde: number;
  etapa2Pct: number;
  etapa3Desde: number;
  etapa3Pct: number;
  /** Puntos que suman las líneas de productos con *Bono vendedor*. */
  bonoPuntos: number;
  montoEvento: number;
  base: BaseComision;
  banco: Banco;
  /** Fila en la planilla; 0 si todavía no tiene. */
  fila: number;
}

/** Los cortes de los socios comerciales: de ahí parten las etapas 2 y 3. */
export const CORTES_SOCIOS = { etapa2: 55, etapa3: 77 } as const;

export const fichaVacia = (usuario: string, nombre = ''): FichaVendedor => ({
  usuario, nombre, tipo: 'vendedor', activo: true, etapa1Desde: 0, conSocio: CON_SOCIO_DEFECTO, token: '',
  sueldoFijo: 0, comisionPct: 0,
  etapa2Desde: CORTES_SOCIOS.etapa2, etapa2Pct: 0, etapa3Desde: CORTES_SOCIOS.etapa3, etapa3Pct: 0, bonoPuntos: 0,
  montoEvento: 0, base: 'neto', banco: bancoVacio(), fila: 0
});

/**
 * **El trato de partida de un socio comercial**: el del landing de socios
 * —5% desde 22 personas, 10% desde 55, 15% desde 77—, sobre el neto. Todo
 * editable en su ficha.
 */
export const TRATO_SOCIO = { desde: 22, pct: 5, etapa2Pct: 10, etapa3Pct: 15 } as const;

export const fichaSocio = (id: string, nombre: string): FichaVendedor => ({
  ...fichaVacia(id, nombre), tipo: 'socio', etapa1Desde: TRATO_SOCIO.desde, comisionPct: TRATO_SOCIO.pct,
  etapa2Pct: TRATO_SOCIO.etapa2Pct, etapa3Pct: TRATO_SOCIO.etapa3Pct, conSocio: 100
});

/** El id del próximo socio: `S-0001`, `S-0002`… */
export function nuevoIdSocio(fichas: Pick<FichaVendedor, 'usuario'>[]): string {
  const n = fichas.reduce((m, f) => {
    const x = /^S-(\d+)$/i.exec(f.usuario);
    return x ? Math.max(m, Number(x[1])) : m;
  }, 0);
  return `S-${String(n + 1).padStart(4, '0')}`;
}

const entero = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
/** Un % que acepta coma decimal: "2,5" es 2,5. Entre 0 y 100. */
export function porcentaje(v: unknown): number {
  const n = Number(String(v ?? '').replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : 0;
}
/**
 * **La comisión va sobre el neto por defecto** (2026-11-12, lo fijó el
 * cliente: *"tanto en socios comerciales como en los vendedores, la
 * comisión tenemos que calcularla sobre el neto"*). En blanco es neto; solo
 * una ficha que diga *Total con IVA* lo usa —sigue siendo editable—.
 */
const baseDe = (v: unknown): BaseComision => (/total/i.test(String(v ?? '')) ? 'total' : 'neto');

export function leerVendedoresDe(filas: string[][]): FichaVendedor[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_VENDEDORES);
  const en = (f: string[], k: number) => (k >= 0 ? String(f[k] ?? '') : '');
  return filas.slice(1).map((f, n) => ({
    usuario: en(f, i.usuario).trim(),
    nombre: en(f, i.nombre).trim(),
    tipo: tipoDe(en(f, i.tipoFicha)),
    activo: !/^no$/i.test(en(f, i.activo).trim()),
    etapa1Desde: entero(en(f, i.etapa1Desde)),
    // En blanco es el de partida; un 0 escrito es 0 (no cobra con socio).
    conSocio: en(f, i.conSocio).trim() === '' ? CON_SOCIO_DEFECTO : porcentaje(en(f, i.conSocio)),
    token: en(f, i.token).trim(),
    sueldoFijo: entero(en(f, i.sueldoFijo)),
    comisionPct: porcentaje(en(f, i.comisionPct)),
    etapa2Desde: entero(en(f, i.etapa2Desde)) || CORTES_SOCIOS.etapa2,
    etapa2Pct: porcentaje(en(f, i.etapa2Pct)),
    etapa3Desde: entero(en(f, i.etapa3Desde)) || CORTES_SOCIOS.etapa3,
    etapa3Pct: porcentaje(en(f, i.etapa3Pct)),
    bonoPuntos: porcentaje(en(f, i.bonoPuntos)),
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
  poner(i.tipoFicha, TIPO_FICHA[v.tipo]); poner(i.activo, v.activo ? '' : 'no');
  poner(i.etapa1Desde, v.etapa1Desde || '');
  poner(i.token, v.tipo === 'socio' ? v.token : '');
  poner(i.conSocio, v.tipo === 'vendedor' ? String(v.conSocio).replace('.', ',') : '');
  poner(i.sueldoFijo, v.sueldoFijo || ''); poner(i.comisionPct, v.comisionPct ? String(v.comisionPct).replace('.', ',') : '');
  poner(i.montoEvento, v.montoEvento || ''); poner(i.base, BASE_COMISION[v.base]);
  const pct = (n: number) => (n ? String(n).replace('.', ',') : '');
  poner(i.etapa2Desde, v.etapa2Desde); poner(i.etapa2Pct, pct(v.etapa2Pct));
  poner(i.etapa3Desde, v.etapa3Desde); poner(i.etapa3Pct, pct(v.etapa3Pct));
  poner(i.bonoPuntos, pct(v.bonoPuntos));
  poner(i.titular, v.banco.titular); poner(i.rut, v.banco.rut); poner(i.banco, v.banco.banco);
  poner(i.tipo, v.banco.tipo); poner(i.numero, v.banco.numero); poner(i.correo, v.banco.correo);
  poner(i.nota, v.banco.nota);
  return fila;
}

/** La ficha de un usuario, o una vacía si nadie se la llenó todavía. */
export function fichaDe(fichas: FichaVendedor[], usuario: string, nombre = ''): FichaVendedor {
  return fichas.find((f) => normalizar(f.usuario) === normalizar(usuario)) ?? fichaVacia(usuario, nombre);
}

/**
 * **El socio de un link personal** (2026-11-12). Un token vacío no encuentra
 * a nadie, y uno de un socio desactivado tampoco: desactivarlo apaga su link.
 */
export function socioPorToken(fichas: FichaVendedor[], token: string): FichaVendedor | undefined {
  const t = String(token ?? '').trim();
  if (!t) return undefined;
  return fichas.find((f) => f.tipo === 'socio' && f.activo && f.token === t);
}

/** Si la ficha dice cómo se le paga: sin nada, el resumen no puede calcular plata. */
export const tieneFormaDePago = (f: Pick<FichaVendedor, 'sueldoFijo' | 'comisionPct' | 'montoEvento'>
  & Partial<Pick<FichaVendedor, 'etapa2Pct' | 'etapa3Pct' | 'bonoPuntos'>>) =>
  f.sueldoFijo > 0 || f.comisionPct > 0 || f.montoEvento > 0
  || (f.etapa2Pct ?? 0) > 0 || (f.etapa3Pct ?? 0) > 0 || (f.bonoPuntos ?? 0) > 0;

export type ReglaComision = Pick<FichaVendedor, 'comisionPct' | 'etapa2Desde' | 'etapa2Pct' | 'etapa3Desde'
  | 'etapa3Pct' | 'bonoPuntos' | 'montoEvento' | 'base'> & Partial<Pick<FichaVendedor, 'etapa1Desde' | 'conSocio' | 'tipo'>>;

/** La etapa que alcanza un evento por su gente: la más alta con % puesto. */
/**
 * La etapa que alcanza un evento por su gente: la más alta con % puesto.
 * **Bajo el *desde* de la etapa 1 no hay etapa** (`etapa: 0`): un socio con
 * trato desde 22 no cobra por un grupo de 15.
 */
export function etapaDe(f: Pick<FichaVendedor, 'comisionPct' | 'etapa2Desde' | 'etapa2Pct' | 'etapa3Desde' | 'etapa3Pct'>
  & Partial<Pick<FichaVendedor, 'etapa1Desde'>>,
  personas: number): { etapa: 0 | 1 | 2 | 3; pct: number } {
  if (f.etapa3Pct > 0 && personas >= f.etapa3Desde) return { etapa: 3, pct: f.etapa3Pct };
  if (f.etapa2Pct > 0 && personas >= f.etapa2Desde) return { etapa: 2, pct: f.etapa2Pct };
  if ((f.etapa1Desde ?? 0) > 0 && personas < (f.etapa1Desde ?? 0)) return { etapa: 0, pct: 0 };
  return { etapa: 1, pct: f.comisionPct };
}

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
  /** Lo que le toca al vendedor por esta venta (ver `comisionDe()`). */
  comision: number;
  /** Cómo se calculó, en una frase. */
  detalle: string;
  personas: number;
  /** Si ya quedó guardada al pagarse todo, y no se recalcula. */
  congelada: boolean;
}

/** Lo que hace falta de una venta para calcular su comisión. */
export interface BaseVenta {
  total: number;
  neto: number;
  personas: number;
  /** Lo de las líneas con *Bono vendedor*, con los descuentos ya aplicados. */
  premium: { total: number; neto: number; productos: string[] };
}

const pctTexto = (n: number) => `${String(n).replace('.', ',')}%`;
const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/**
 * **La comisión de una venta** (modelo A, 2026-11-12): el % de la etapa que
 * alcanza por su gente sobre la base (total con IVA, o neto), **más** los
 * puntos de bono sobre las líneas de productos con *Bono vendedor*, **más**
 * el monto por evento. Devuelve también **cómo se calculó**, en una frase
 * que ven el vendedor y quien paga.
 */
export function comisionDe(f: ReglaComision, v: BaseVenta, conSocio = false): { monto: number; detalle: string } {
  const base = f.base === 'neto' ? v.neto : v.total;
  const { etapa, pct } = etapaDe(f, v.personas);
  const porEtapa = Math.round(base * pct / 100);
  const basePremium = f.base === 'neto' ? v.premium.neto : v.premium.total;
  const porBono = f.bonoPuntos > 0 ? Math.round(basePremium * f.bonoPuntos / 100) : 0;
  const partes = [
    pct > 0 ? `${v.personas} personas → etapa ${etapa}, ${pctTexto(pct)} = ${pesos(porEtapa)}`
      : etapa === 0 && f.comisionPct > 0 ? `${v.personas} personas: bajo el mínimo de ${f.etapa1Desde}` : '',
    porBono > 0 ? `bono ${v.premium.productos.join(' y ')} ${pctTexto(f.bonoPuntos)} = ${pesos(porBono)}` : '',
    f.montoEvento > 0 ? `${pesos(f.montoEvento)} por evento` : ''
  ].filter(Boolean);
  const entero = porEtapa + porBono + f.montoEvento;
  // **Con un socio, el vendedor cobra su parte** (2026-11-12, lo decidió el
  // cliente: 50% de partida, editable por vendedor). El socio cobra entero.
  const parte = conSocio && (f.tipo ?? 'vendedor') === 'vendedor' ? (f.conSocio ?? CON_SOCIO_DEFECTO) : 100;
  if (parte >= 100 || entero === 0) return { monto: entero, detalle: partes.join(' + ') };
  const monto = Math.round(entero * parte / 100);
  return { monto, detalle: `${partes.join(' + ')} · con socio, ${pctTexto(parte)} = ${pesos(monto)}` };
}

/** Lo guardado en `Comisión vendedor`: *"285000 · 60 personas → etapa 2, 3% = …"*. */
export function comisionCongelada(marca: string | undefined): { monto: number; detalle: string } | null {
  const t = String(marca ?? '').trim();
  if (!t) return null;
  const [monto, ...resto] = t.split(' · ');
  const n = Number(String(monto).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? { monto: n, detalle: resto.join(' · ') } : null;
}
export const marcaComision = (c: { monto: number; detalle: string }) => [String(c.monto), c.detalle].filter(Boolean).join(' · ');

/** La base de una venta: su total, su gente y lo de los productos con bono. */
export function baseDeVenta(p: Pick<Presupuesto, 'id' | 'descuento' | 'invitados'>, lineas: LineaPresupuesto[],
  menus: Pick<Menu, 'nombre' | 'bonoVendedor'>[]): BaseVenta {
  const suyas = lineasDe(lineas, p.id);
  const cuentas = cuentasDe(suyas, p.descuento);
  const conBono = (concepto: string) => menus.find((m) => m.bonoVendedor && normalizar(m.nombre) === normalizar(concepto));
  const premium = suyas.filter((l) => conBono(l.concepto));
  const cp = cuentasDe(premium, p.descuento);
  const personas = suyas.reduce((n, l) => n + Math.max(0, l.personas), 0) || Number(p.invitados) || 0;
  return { total: cuentas.total, neto: cuentas.neto, personas,
    premium: { total: premium.length ? cp.total : 0, neto: premium.length ? cp.neto : 0,
               productos: [...new Set(premium.map((l) => conBono(l.concepto)!.nombre))] } };
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
/**
 * De quién es una venta: la del vendedor, la que **creó**; la del socio, la
 * que lo **nombra** en `Socio comercial`.
 */
export const esVentaDe = (usuario: string, tipo: TipoFicha = 'vendedor') =>
  (p: Pick<Presupuesto, 'creadoPor' | 'socio'>) =>
    normalizar(tipo === 'socio' ? p.socio ?? '' : p.creadoPor) === normalizar(usuario) && !!usuario;

export function ventasDe(usuario: string, presupuestos: Presupuesto[], lineas: LineaPresupuesto[],
  cobros: Cobro[], ficha: ReglaComision, menus: Pick<Menu, 'nombre' | 'bonoVendedor'>[] = []): Venta[] {
  const suya = esVentaDe(usuario, ficha.tipo);
  const socio = ficha.tipo === 'socio';
  return presupuestos
    .filter((p) => suya(p) && (!!p.idReserva
      || estadoNormal(p.estado) === ESTADO_PRESUPUESTO.cancelada))
    .map((p) => {
      const b = baseDeVenta(p, lineas, menus);
      const suyos = cobros.filter((c) => c.presupuesto === p.id);
      const cancelada = estadoNormal(p.estado) === ESTADO_PRESUPUESTO.cancelada;
      const pagado = suyos.reduce((n, c) => n + c.monto, 0);
      // **La que ya quedó guardada al pagarse no se recalcula**: cambiar la
      // ficha vale para lo que se pague desde ese día.
      // Cada uno tiene su columna congelada: la del vendedor y la del socio.
      const guardada = comisionCongelada(socio ? p.comisionSocio : p.comisionVendedor);
      const c = guardada ?? comisionDe(ficha, b, !!p.socio);
      return {
        id: p.id, grupo: p.grupo || p.id, cliente: p.cliente || 'sin nombre', fechaEvento: p.fecha,
        total: b.total, neto: b.neto, pagado, personas: b.personas,
        pagadaEl: cancelada ? '' : pagadaEl(b.total, suyos),
        cancelada, comision: cancelada ? 0 : c.monto, detalle: cancelada ? 'cancelada: sin comisión' : c.detalle,
        congelada: !!guardada
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
