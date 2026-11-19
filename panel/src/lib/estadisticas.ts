/**
 * **Las estadísticas de reservas** (2026-11-19, lo pidió el cliente: *"un
 * botón de estadísticas… filtrable por fecha, semana o mes o personalizado…
 * cuántas reservas se hicieron en este rango de tiempo, cuál es la tasa de
 * no-shows, cuál es el valor promedio"*, para operaciones hacia arriba y
 * *"para que la gerencia pueda ver también números en grandes rasgos"*).
 * Aprobó la propuesta entera, con el filtro *Todo · Visitas · Eventos*.
 *
 * **Puro y sin red**: lo importa la pantalla, que calcula en el navegador
 * con lo que manda `/api/estadisticas` —una fila chica por reserva, sin
 * nombres ni contactos—. Así cambiar el periodo o un filtro no lee la
 * planilla de nuevo.
 *
 * **Las reglas son las del calendario**, armadas en el servidor con las
 * mismas funciones: qué ocupa lugar (`ocupaLugar()`), cuánta gente cuenta un
 * día (`personasEnLaMesa()`), qué está pagado y de dónde viene la reserva.
 * Una estadística que contara distinto que el calendario sería un tercer
 * número para el mismo día.
 */
import { diaSemana, sumarDias, sumarMeses, semanaDe, diasDelMes, type Fecha } from './fechas.ts';

/** De dónde viene una reserva: las dos de Shopify, a mano o de una cotización. */
export type Origen = 'directo' | 'soloReserva' | 'mano' | 'cotizacion';
/** *Todo · Visitas · Eventos*: visitas son Shopify y a mano; eventos, las cotizaciones. */
export type Tipo = 'todo' | 'visitas' | 'eventos';
/** Por qué fecha se mira: la de la visita o la del día en que se reservó. */
export type Base = 'visita' | 'reservada';
export type Modo = 'dia' | 'semana' | 'mes' | 'personalizado';

export interface Rango { desde: Fecha; hasta: Fecha }

/** Una reserva, como la manda `/api/estadisticas`. */
export interface FilaEst {
  fecha: Fecha;
  /** El día en que se reservó, en hora de Chile; vacío si no se sabe. */
  reservadaEl: Fecha | '';
  origen: Origen;
  /** Si ocupa su lugar: una cancelada, reembolsada o caída por cupo, no. */
  ocupa: boolean;
  /** La gente que cuenta el día: la rectificada más la agregada en la mesa. */
  personas: number;
  asistencia: '' | 'si' | 'no';
  /** Vino, pero llegaron menos de las reservadas: cuántas faltaron. */
  faltaron: number;
  monto: number | null;
  /** Lo ya pagado de ese monto. */
  pagado: number;
  /** La cuenta final de la mesa (Fudo), si se anotó. */
  valorFinal: number | null;
  menus: { menu: string; cantidad: number }[];
}

/** Un día del calendario: su cupo y si recibe gente (no cerrado y con cupo). */
export interface DiaEst { fecha: Fecha; cupo: number; abierto: boolean }

export const NOMBRE_ORIGEN: Record<Origen, string> = {
  directo: 'Shopify · Pago directo',
  soloReserva: 'Shopify · Solo reserva',
  mano: 'Anotadas a mano',
  cotizacion: 'Cotizaciones (eventos)'
};
const ORDEN_ORIGEN: Origen[] = ['directo', 'soloReserva', 'mano', 'cotizacion'];

/** Los tramos de anticipación, en su orden natural. */
export const TRAMOS = [
  { id: 'mismo', nombre: 'El mismo día', hasta: 0 },
  { id: 'semana', nombre: '1 a 6 días antes', hasta: 6 },
  { id: 'mes', nombre: '1 a 4 semanas antes', hasta: 30 },
  { id: 'mas', nombre: 'Más de un mes antes', hasta: Infinity }
] as const;

/** Lunes a domingo, que es como se lee una semana en Chile. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];
export const NOMBRE_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/* ---------- El periodo ---------- */

const utc = (f: Fecha) => { const [a, m, d] = f.split('-').map(Number); return Date.UTC(a, m - 1, d); };

/** Cuántos días tiene un rango, contando los dos extremos. */
export function largoDe(r: Rango): number {
  return Math.round((utc(r.hasta) - utc(r.desde)) / 86_400_000) + 1;
}

/** Días entre dos fechas (b − a). Negativo si b va antes. */
export function diasEntre(a: Fecha, b: Fecha): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

/** El rango de un día, una semana (lunes a domingo) o un mes, alrededor de una fecha. */
export function rangoDe(modo: Exclude<Modo, 'personalizado'>, ancla: Fecha): Rango {
  if (modo === 'dia') return { desde: ancla, hasta: ancla };
  if (modo === 'semana') { const l = semanaDe(ancla); return { desde: l, hasta: sumarDias(l, 6) }; }
  const dias = diasDelMes(ancla.slice(0, 7));
  return { desde: dias[0], hasta: dias[dias.length - 1] };
}

/** ◀ ▶: el periodo siguiente o el anterior del mismo modo. */
export function moverRango(modo: Modo, r: Rango, n: number): Rango {
  if (modo === 'mes') return rangoDe('mes', `${sumarMeses(r.desde.slice(0, 7), n)}-01`);
  const largo = modo === 'dia' ? 1 : modo === 'semana' ? 7 : largoDe(r);
  return { desde: sumarDias(r.desde, n * largo), hasta: sumarDias(r.hasta, n * largo) };
}

/**
 * **Con qué se compara**: el periodo anterior del mismo largo, justo antes.
 * Un mes se compara con el mes anterior entero, aunque tenga otro largo:
 * noviembre contra octubre es lo que se espera leer.
 */
export function anteriorDe(modo: Modo, r: Rango): Rango {
  return moverRango(modo === 'mes' ? 'mes' : 'personalizado', r, -1);
}

/** Un rango escrito a mano, ordenado y con tope de dos años. `null` si no se entiende. */
export function rangoPersonalizado(desde: string, hasta: string): Rango | null {
  const ok = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f);
  if (!ok(desde) || !ok(hasta)) return null;
  const r = desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde };
  return largoDe(r) > 731 ? { desde: r.desde, hasta: sumarDias(r.desde, 730) } : r;
}

/* ---------- Las cuentas ---------- */

export interface Resumen {
  reservas: number;
  personas: number;
  /** Personas ÷ cupo de los días que reciben gente. `null` mirando por fecha en que se reservó. */
  ocupacion: { personas: number; cupo: number; pct: number | null } | null;
  /** Personas por reserva, con un decimal. */
  grupo: number | null;
  noShow: { marcadas: number; noVino: number; personas: number; sinMarcar: number; pct: number | null };
  llegaronMenos: { reservas: number; personas: number };
  canceladas: { reservas: number; personas: number; pct: number | null };
  plata: {
    total: number; pagado: number; porCobrar: number;
    porReserva: number | null; porPersona: number | null; sinMonto: number;
  };
  cuentaFinal: { mesas: number; porPersona: number | null; deMasPorPersona: number | null };
  origen: { id: Origen; nombre: string; reservas: number; personas: number }[];
  menus: { menu: string; cantidad: number }[];
  anticipacion: { tramos: { id: string; nombre: string; reservas: number }[]; mediana: number | null; sinDato: number };
  porDia: { dia: number; nombre: string; dias: number; personas: number; promedio: number }[];
  serie: { clave: Fecha; personas: number; cupo: number | null }[];
  /** La serie va por semana (rango largo) o por día. */
  serieSemanal: boolean;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
const sumar = <T>(xs: T[], f: (x: T) => number) => xs.reduce((n, x) => n + f(x), 0);

/** Si la fila entra en *Todo · Visitas · Eventos*. */
export function enTipo(f: Pick<FilaEst, 'origen'>, tipo: Tipo): boolean {
  if (tipo === 'todo') return true;
  return (f.origen === 'cotizacion') === (tipo === 'eventos');
}

/** La fecha por la que se cuenta la fila. */
export function fechaDe(f: Pick<FilaEst, 'fecha' | 'reservadaEl'>, base: Base): Fecha | '' {
  return base === 'visita' ? f.fecha : f.reservadaEl;
}

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
}

/**
 * **Todo lo de un periodo**, sobre lo que se mira: el rango, por qué fecha y
 * qué tipo. `hoy` decide qué días ya pasaron (el no-show solo mira esos).
 */
export function resumen(
  filas: FilaEst[], dias: DiaEst[], rango: Rango,
  o: { base: Base; tipo: Tipo; hoy: Fecha }
): Resumen {
  const enRango = (f: Fecha | '') => !!f && f >= rango.desde && f <= rango.hasta;
  const del = filas.filter((f) => enTipo(f, o.tipo) && enRango(fechaDe(f, o.base)));
  const vivas = del.filter((f) => f.ocupa);
  const caidas = del.filter((f) => !f.ocupa);
  const reservas = vivas.length;
  const personas = sumar(vivas, (f) => f.personas);

  // Ocupación: solo tiene sentido por la fecha de la visita.
  let ocupacion: Resumen['ocupacion'] = null;
  if (o.base === 'visita') {
    const cupo = sumar(dias.filter((d) => d.abierto && enRango(d.fecha)), (d) => d.cupo);
    ocupacion = { personas, cupo, pct: pct(personas, cupo) };
  }

  // No-show: de lo que ya pasó (hoy incluido, si se marcó).
  const pasadas = vivas.filter((f) => f.fecha <= o.hoy);
  const marcadas = pasadas.filter((f) => f.asistencia);
  const noVino = marcadas.filter((f) => f.asistencia === 'no');
  const noShow = {
    marcadas: marcadas.length, noVino: noVino.length, personas: sumar(noVino, (f) => f.personas),
    sinMarcar: pasadas.filter((f) => !f.asistencia && f.fecha < o.hoy).length,
    pct: pct(noVino.length, marcadas.length)
  };
  const menos = vivas.filter((f) => f.asistencia === 'si' && f.faltaron > 0);

  // La plata: lo reservado de lo que sigue en pie.
  const conMonto = vivas.filter((f) => f.monto != null && f.monto > 0);
  const total = sumar(conMonto, (f) => f.monto ?? 0);
  const pagado = sumar(conMonto, (f) => Math.min(f.pagado, f.monto ?? 0));
  const personasConMonto = sumar(conMonto, (f) => f.personas);

  // La cuenta final: las mesas que la anotaron.
  const mesas = vivas.filter((f) => f.valorFinal != null && f.valorFinal > 0 && f.asistencia !== 'no');
  const personasMesas = sumar(mesas, (f) => f.personas);
  const conAmbos = mesas.filter((f) => f.monto != null && f.monto > 0);
  const personasAmbos = sumar(conAmbos, (f) => f.personas);

  // Anticipación.
  const conFecha = vivas.filter((f) => f.reservadaEl);
  const antes = conFecha.map((f) => Math.max(0, diasEntre(f.reservadaEl as Fecha, f.fecha)));
  const tramos = TRAMOS.map((t, i) => ({
    id: t.id, nombre: t.nombre,
    reservas: antes.filter((d) => d <= t.hasta && (i === 0 || d > TRAMOS[i - 1].hasta)).length
  }));

  // Por día de la semana: personas promedio por día que recibió gente.
  const fechasPorDia = new Map<number, Set<Fecha>>();
  const anotar = (f: Fecha) => {
    const d = diaSemana(f);
    if (!fechasPorDia.has(d)) fechasPorDia.set(d, new Set());
    fechasPorDia.get(d)!.add(f);
  };
  if (o.base === 'visita') for (const d of dias) if (d.abierto && enRango(d.fecha)) anotar(d.fecha);
  for (const f of vivas) anotar(f.fecha);
  const porDia = ORDEN_SEMANA.filter((d) => fechasPorDia.has(d)).map((d) => {
    const p = sumar(vivas.filter((f) => diaSemana(f.fecha) === d), (f) => f.personas);
    const n = fechasPorDia.get(d)!.size;
    return { dia: d, nombre: NOMBRE_DIA[d], dias: n, personas: p, promedio: Math.round(p / n) };
  });

  // La serie: por día (los días que reciben gente o tienen reservas) o por semana.
  const serieSemanal = largoDe(rango) > 62;
  const clave = (f: Fecha) => (serieSemanal ? semanaDe(f) : f);
  const serie = new Map<Fecha, { personas: number; cupo: number | null }>();
  const punto = (k: Fecha) => {
    if (!serie.has(k)) serie.set(k, { personas: 0, cupo: o.base === 'visita' ? 0 : null });
    return serie.get(k)!;
  };
  if (o.base === 'visita') {
    for (const d of dias) if (d.abierto && enRango(d.fecha)) { const p = punto(clave(d.fecha)); p.cupo = (p.cupo ?? 0) + d.cupo; }
  }
  for (const f of vivas) punto(clave(fechaDe(f, o.base) as Fecha)).personas += f.personas;

  return {
    reservas, personas, ocupacion,
    grupo: reservas ? Math.round((personas / reservas) * 10) / 10 : null,
    noShow,
    llegaronMenos: { reservas: menos.length, personas: sumar(menos, (f) => f.faltaron) },
    canceladas: { reservas: caidas.length, personas: sumar(caidas, (f) => f.personas), pct: pct(caidas.length, del.length) },
    plata: {
      total, pagado, porCobrar: total - pagado,
      porReserva: conMonto.length ? Math.round(total / conMonto.length) : null,
      porPersona: personasConMonto ? Math.round(total / personasConMonto) : null,
      sinMonto: vivas.length - conMonto.length
    },
    cuentaFinal: {
      mesas: mesas.length,
      porPersona: personasMesas ? Math.round(sumar(mesas, (f) => f.valorFinal ?? 0) / personasMesas) : null,
      deMasPorPersona: personasAmbos
        ? Math.round((sumar(conAmbos, (f) => f.valorFinal ?? 0) - sumar(conAmbos, (f) => f.monto ?? 0)) / personasAmbos)
        : null
    },
    origen: ORDEN_ORIGEN.map((id) => {
      const de = vivas.filter((f) => f.origen === id);
      return { id, nombre: NOMBRE_ORIGEN[id], reservas: de.length, personas: sumar(de, (f) => f.personas) };
    }).filter((x) => x.reservas > 0),
    menus: [...vivas.reduce((m, f) => {
      for (const x of f.menus) m.set(x.menu, (m.get(x.menu) ?? 0) + x.cantidad);
      return m;
    }, new Map<string, number>())].map(([menu, cantidad]) => ({ menu, cantidad }))
      .filter((x) => x.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad || a.menu.localeCompare(b.menu)),
    anticipacion: { tramos, mediana: mediana(antes), sinDato: vivas.length - conFecha.length },
    porDia,
    serie: [...serie].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ clave: k, ...v })),
    serieSemanal
  };
}

/* ---------- La comparación ---------- */

export type Sentido = 'sube' | 'baja' | 'igual';

/**
 * **Cuánto cambió contra el periodo anterior.** Un número se compara en %;
 * una tasa (ocupación, no-show, cancelaciones) en **puntos**, porque pasar de
 * 10% a 15% no es "subió 50%". `null` si no hay con qué comparar.
 */
export function cambio(
  ahora: number | null, antes: number | null, enPuntos = false
): { texto: string; sentido: Sentido } | null {
  if (ahora == null || antes == null) return null;
  if (enPuntos) {
    const d = ahora - antes;
    return { texto: d === 0 ? '= igual' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} ${Math.abs(d) === 1 ? 'punto' : 'puntos'}`,
             sentido: d > 0 ? 'sube' : d < 0 ? 'baja' : 'igual' };
  }
  if (antes === 0) return ahora === 0 ? { texto: '= igual', sentido: 'igual' } : null;
  const p = Math.round(((ahora - antes) / antes) * 100);
  return { texto: p === 0 ? '= igual' : `${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%`, sentido: p > 0 ? 'sube' : p < 0 ? 'baja' : 'igual' };
}
