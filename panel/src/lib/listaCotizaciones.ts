/**
 * **La lista de cotizaciones: la vista de la gerencia** (2026-11-17, lo
 * pidió el cliente: *"una sobrevista gerencial… permite buscar dentro de una
 * lista, filtrar por vendedor y hace distintos resúmenes"*). Se armó mirando
 * la *Lista* del CRM antiguo —sus seis tarjetas, los cierres por mes, los
 * filtros por etapa y por vendedor, el rango de fechas— y pasándola por las
 * reglas del panel. Reemplaza a *🔎 Buscar*: eran dos listas de lo mismo.
 *
 * Decidido con el cliente el mismo día:
 * - **El vendedor ve sus números**; las tarjetas de todo el equipo y *Por
 *   vendedor / Por socio* son de quien ve ventas: pagos, gerencia general,
 *   administrador **y el encargado de operaciones** (`veElEquipo()`).
 * - **El periodo va por la fecha del evento**, y también **por la fecha en
 *   que se cotizó**.
 * - **Va la tarjeta *Por cobrar***, que el CRM no tenía.
 *
 * Todo cuenta **un grupo de alternativas una sola vez**, igual que el
 * calendario. Puro y con pruebas.
 */
import {
  estadoVisible, cuentaComoPosible, seguimientoDe, porVencer, diasParaVencer, totalDe, lineasDe, gentePosible,
  folioDe, ESTADO_PRESUPUESTO, type Presupuesto, type LineaPresupuesto
} from './presupuestos.ts';
import { grupoDe, alternativasDe, principalDe } from './cotizar.ts';
import { normalizar } from './columnas.ts';
import { ROL } from './auth.ts';
import { esFecha, sumarDias, fechaEnZona } from './fechas.ts';

/** Qué se muestra: los estados, y lo que piden las tarjetas. */
export type FiltroLista = 'enCarrera' | 'esperando' | 'negociando' | 'ganadas' | 'cerradas' | 'todas'
  | 'mandadas' | 'porSeguir' | 'porCobrar';
export type PorFecha = 'evento' | 'cotizada';
/** Un rango de fechas, o `null`: todo. */
export type Rango = { desde: string; hasta: string } | null;

export interface ContextoLista {
  hoy: string;
  lineas: LineaPresupuesto[];
  cobros: { presupuesto: string; monto: number }[];
  /** El día en que se ganó cada cotización: cuando nació su reserva. */
  ganadaEl: Record<string, string>;
  seguimiento: { seguimientoDias: number; avisoEvento: number };
  /** Todas las cotizaciones, para juntar las alternativas. */
  todas: Presupuesto[];
}

/**
 * **Quién ve la lista del equipo** (lo decidió el cliente): pagos, la
 * gerencia general, el administrador y el encargado de operaciones. El
 * vendedor ve las suyas. Va con los roles escritos y no con un permiso:
 * `vendedores` lo tiene también el vendedor, por *Mi resumen*.
 */
export const ROLES_EQUIPO: string[] = [ROL.admin, ROL.pagos, ROL.gerencia, ROL.operaciones];
export function veElEquipo(rol: string): boolean {
  return ROLES_EQUIPO.includes(rol);
}

/** Una por grupo de alternativas: la ganada, o la primera que sigue abierta. */
export function unaPorGrupo(lista: Presupuesto[], ctx: Pick<ContextoLista, 'todas' | 'hoy'>): Presupuesto[] {
  const vistos = new Set<string>();
  const salida: Presupuesto[] = [];
  for (const p of lista) {
    const g = grupoDe(p);
    if (vistos.has(g)) continue;
    vistos.add(g);
    salida.push(principalDe(alternativasDe(p, ctx.todas), (x) => cuentaComoPosible(x, ctx.hoy)));
  }
  return salida;
}

export const totalDeCotizacion = (p: Presupuesto, ctx: Pick<ContextoLista, 'lineas'>) =>
  totalDe(lineasDe(ctx.lineas, p.id), p.descuento);

export const esGanada = (p: Presupuesto, hoy: string) => estadoVisible(p, hoy) === ESTADO_PRESUPUESTO.aceptado;
export const esPerdida = (p: Presupuesto, hoy: string) => estadoVisible(p, hoy) === ESTADO_PRESUPUESTO.rechazado;
const esCerrada = (e: string) => [ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida,
  ESTADO_PRESUPUESTO.cancelada, 'Vencida'].includes(e);

/** Lo que falta cobrar de una ganada: su total menos lo cobrado (las devoluciones restan). */
export function faltaCobrarDe(p: Presupuesto, ctx: Pick<ContextoLista, 'hoy' | 'lineas' | 'cobros'>): number {
  if (!esGanada(p, ctx.hoy)) return 0;
  const cobrado = ctx.cobros.filter((c) => c.presupuesto === p.id).reduce((s, c) => s + (Number(c.monto) || 0), 0);
  return Math.max(0, totalDeCotizacion(p, ctx) - cobrado);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
  'octubre', 'noviembre', 'diciembre'];

/**
 * **Si el periodo escrito de una cotización sin día toca un rango**:
 * *"marzo o abril"*, *"entre julio y agosto de 2027"*. Busca los nombres de
 * mes y, si hay, el año. Lo que no nombra ningún mes no se puede ubicar: no
 * entra en un rango, solo en *Todo*.
 */
export function periodoTocaRango(texto: string, rango: { desde: string; hasta: string }): boolean {
  const t = normalizar(texto).replace('setiembre', 'septiembre');
  const meses = MESES.map((m, i) => (t.includes(m) ? i + 1 : 0)).filter(Boolean);
  if (!meses.length) return false;
  const anio = /\b(20\d\d)\b/.exec(t)?.[1];
  // Los meses del rango, como AAAA-MM.
  const delRango: string[] = [];
  for (let m = rango.desde.slice(0, 7); m <= rango.hasta.slice(0, 7);) {
    delRango.push(m);
    const [a, mm] = m.split('-').map(Number);
    m = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`;
  }
  return delRango.some((am) => meses.includes(Number(am.slice(5))) && (!anio || am.startsWith(anio)));
}

/** La fecha con que se filtra: la del evento, o el día en que se cotizó. */
export function enRango(p: Presupuesto, rango: Rango, porFecha: PorFecha): boolean {
  if (!rango) return true;
  if (porFecha === 'cotizada') {
    const f = String(p.creado ?? '').slice(0, 10);
    return esFecha(f) && f >= rango.desde && f <= rango.hasta;
  }
  if (esFecha(p.fecha)) return p.fecha >= rango.desde && p.fecha <= rango.hasta;
  return periodoTocaRango(p.periodo ?? '', rango);
}

/** El rango de un mes (`AAAA-MM`) o de la semana que parte el lunes dado. */
export function rangoDe(periodo: string): Rango {
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const [a, m] = periodo.split('-').map(Number);
    const fin = new Date(Date.UTC(a, m, 0)).getUTCDate();
    return { desde: `${periodo}-01`, hasta: `${periodo}-${String(fin).padStart(2, '0')}` };
  }
  if (esFecha(periodo)) return { desde: periodo, hasta: sumarDias(periodo, 6) };
  return null;
}

export function pasaFiltro(p: Presupuesto, filtro: FiltroLista, ctx: ContextoLista): boolean {
  const e = estadoVisible(p, ctx.hoy);
  switch (filtro) {
    case 'todas': return true;
    case 'enCarrera': return cuentaComoPosible(p, ctx.hoy);
    case 'esperando': return cuentaComoPosible(p, ctx.hoy) && e === ESTADO_PRESUPUESTO.enviado;
    case 'negociando': return cuentaComoPosible(p, ctx.hoy) && e === ESTADO_PRESUPUESTO.negociacion;
    case 'mandadas': return cuentaComoPosible(p, ctx.hoy)
      && (e === ESTADO_PRESUPUESTO.enviado || e === ESTADO_PRESUPUESTO.negociacion);
    case 'ganadas': return e === ESTADO_PRESUPUESTO.aceptado;
    case 'cerradas': return esCerrada(e);
    case 'porSeguir': return !!seguimientoDe(p, ctx.hoy, ctx.seguimiento);
    case 'porCobrar': return faltaCobrarDe(p, ctx) > 0;
  }
}

/** Busca en el cliente, el N°, el tipo de evento, quién la vende y el periodo. */
export function calzaBusqueda(p: Presupuesto, texto: string): boolean {
  const q = normalizar(texto.trim());
  if (!q) return true;
  return normalizar([p.cliente, folioDe({ id: grupoDe(p) }), p.tipoEvento, p.creadoPor, p.periodo]
    .filter(Boolean).join(' ')).includes(q);
}

export interface ResumenLista {
  enCarrera: { n: number; gente: number };
  cotizado: { monto: number; n: number; borradores: number; montoBorradores: number };
  ganado: { monto: number; n: number };
  tasa: { ganadas: number; perdidas: number; pct: number | null };
  porSeguir: number;
  porCobrar: { monto: number; n: number };
}

/** Las seis tarjetas, sobre lo que se está mirando (de quién y cuándo). */
export function resumenLista(base: Presupuesto[], ctx: ContextoLista): ResumenLista {
  const r: ResumenLista = {
    enCarrera: { n: 0, gente: 0 }, cotizado: { monto: 0, n: 0, borradores: 0, montoBorradores: 0 },
    ganado: { monto: 0, n: 0 }, tasa: { ganadas: 0, perdidas: 0, pct: null }, porSeguir: 0,
    porCobrar: { monto: 0, n: 0 }
  };
  for (const p of base) {
    const e = estadoVisible(p, ctx.hoy);
    const total = totalDeCotizacion(p, ctx);
    if (cuentaComoPosible(p, ctx.hoy)) {
      r.enCarrera.n++;
      r.enCarrera.gente += gentePosible(p, lineasDe(ctx.lineas, p.id));
      if (e === ESTADO_PRESUPUESTO.enviado || e === ESTADO_PRESUPUESTO.negociacion) {
        r.cotizado.n++; r.cotizado.monto += total;
      } else {
        r.cotizado.borradores++; r.cotizado.montoBorradores += total;
      }
    }
    if (e === ESTADO_PRESUPUESTO.aceptado) { r.ganado.n++; r.ganado.monto += total; r.tasa.ganadas++; }
    if (e === ESTADO_PRESUPUESTO.rechazado) r.tasa.perdidas++;
    if (seguimientoDe(p, ctx.hoy, ctx.seguimiento)) r.porSeguir++;
    const falta = faltaCobrarDe(p, ctx);
    if (falta > 0) { r.porCobrar.n++; r.porCobrar.monto += falta; }
  }
  const cerradas = r.tasa.ganadas + r.tasa.perdidas;
  r.tasa.pct = cerradas ? Math.round((r.tasa.ganadas / cerradas) * 100) : null;
  return r;
}

/** Lo ganado por mes, según el día en que se ganó: los últimos `n`, el más nuevo primero. */
export function ganadoPorMes(base: Presupuesto[], ctx: ContextoLista, n = 6): { mes: string; monto: number; cantidad: number }[] {
  const m = new Map<string, { monto: number; cantidad: number }>();
  for (const p of base) {
    const f = ctx.ganadaEl[p.id];
    if (!esGanada(p, ctx.hoy) || !esFecha(f)) continue;
    const mes = f.slice(0, 7);
    const x = m.get(mes) ?? { monto: 0, cantidad: 0 };
    x.monto += totalDeCotizacion(p, ctx); x.cantidad++;
    m.set(mes, x);
  }
  return [...m].sort((a, b) => b[0].localeCompare(a[0])).slice(0, n).map(([mes, x]) => ({ mes, ...x }));
}

/** Cuántas hay en cada botón de estado. */
export function cuentasPorFiltro(base: Presupuesto[], ctx: ContextoLista): Record<FiltroLista, number> {
  const filtros: FiltroLista[] = ['enCarrera', 'esperando', 'negociando', 'ganadas', 'cerradas', 'todas',
    'mandadas', 'porSeguir', 'porCobrar'];
  return Object.fromEntries(filtros.map((f) => [f, base.filter((p) => pasaFiltro(p, f, ctx)).length])) as Record<FiltroLista, number>;
}

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

export type Paso = { texto: string; tono: 'rojo' | 'ambar' | 'verde' | 'neutro' };

/**
 * **El próximo paso de cada cotización**, en pocas palabras y con su tono:
 * lo que la gerencia mira para saber a quién preguntarle. Lo que espera que
 * alguien la siga va primero; en una ganada, además, la plata.
 */
export function proximosPasos(p: Presupuesto, ctx: ContextoLista): Paso[] {
  const e = estadoVisible(p, ctx.hoy);
  const s = seguimientoDe(p, ctx.hoy, ctx.seguimiento);
  const pasos: Paso[] = [];
  if (s?.motivo === 'contratoSinFirmar') pasos.push({ texto: `contrato sin volver hace ${s.dias} días`, tono: 'ambar' });
  else if (s?.motivo === 'eventoCerca') pasos.push({ texto: s.dias === 0 ? 'el evento es hoy y no se gana' : `evento en ${s.dias} ${s.dias === 1 ? 'día' : 'días'} sin ganar`, tono: 'rojo' });
  else if (s?.motivo === 'sinRespuesta') pasos.push({ texto: `sin respuesta hace ${s.dias} días`, tono: 'rojo' });
  else if (porVencer(p, ctx.hoy)) {
    const d = diasParaVencer(p, ctx.hoy) ?? 0;
    pasos.push({ texto: d === 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : `vence en ${d} días`, tono: 'ambar' });
  }
  if (e === ESTADO_PRESUPUESTO.aceptado) {
    const falta = faltaCobrarDe(p, ctx);
    pasos.push(falta > 0 ? { texto: `falta cobrar ${pesos(falta)}`, tono: 'ambar' } : { texto: '✓ pagada', tono: 'verde' });
  }
  if (!pasos.length && e === ESTADO_PRESUPUESTO.rechazado && p.motivo) pasos.push({ texto: `perdida: ${p.motivo}`, tono: 'neutro' });
  if (!pasos.length && (e === ESTADO_PRESUPUESTO.candidato || e === ESTADO_PRESUPUESTO.borrador)) pasos.push({ texto: 'sin mandar', tono: 'neutro' });
  return pasos;
}

/**
 * **El orden**: en lo que sigue en carrera, lo más urgente arriba —lo que
 * espera respuesta, lo que vence— y después por fecha del evento; en las
 * ganadas, la más reciente primero; en lo demás, por fecha del evento.
 */
export function ordenarLista(lista: Presupuesto[], filtro: FiltroLista, ctx: ContextoLista): Presupuesto[] {
  const fecha = (p: Presupuesto) => (esFecha(p.fecha) ? p.fecha : '9999');
  const urgencia = (p: Presupuesto) => {
    const t = proximosPasos(p, ctx).map((x) => x.tono);
    return t.includes('rojo') ? 0 : t.includes('ambar') ? 1 : 2;
  };
  return [...lista].sort((a, b) => {
    if (filtro === 'ganadas') return (ctx.ganadaEl[b.id] ?? '').localeCompare(ctx.ganadaEl[a.id] ?? '') || fecha(a).localeCompare(fecha(b));
    if (filtro !== 'cerradas' && filtro !== 'todas') return urgencia(a) - urgencia(b) || fecha(a).localeCompare(fecha(b));
    return fecha(a).localeCompare(fecha(b));
  });
}

/** Quiénes venden, sacado de las cotizaciones, con cuántas tiene cada uno. */
export function vendedoresDe(lista: Presupuesto[]): { id: string; nombre: string; detalle: string }[] {
  const m = new Map<string, number>();
  for (const p of lista) {
    const v = String(p.creadoPor ?? '').trim();
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m].sort((a, b) => a[0].localeCompare(b[0], 'es'))
    .map(([v, n]) => ({ id: v, nombre: v, detalle: `${n} ${n === 1 ? 'cotización' : 'cotizaciones'}` }));
}

/**
 * **El día en que se ganó cada cotización**: el día en que nació su reserva,
 * en hora de Chile. La reserva se crea al ganar, así que no hace falta una
 * columna nueva. Un `Creada` sin hora (`2026-11-04 10:12`) se toma tal cual.
 */
export function ganadasEl(presupuestos: Pick<Presupuesto, 'id' | 'idReserva'>[],
  reservas: { id: string; creada?: string }[]): Record<string, string> {
  const porId = new Map(reservas.map((r) => [String(r.id), String(r.creada ?? '')]));
  const salida: Record<string, string> = {};
  for (const p of presupuestos) {
    const c = porId.get(String(p.idReserva ?? '').trim());
    if (!c) continue;
    const f = /T/.test(c) && !Number.isNaN(Date.parse(c)) ? fechaEnZona(new Date(c)) : c.slice(0, 10);
    if (esFecha(f)) salida[p.id] = f;
  }
  return salida;
}
