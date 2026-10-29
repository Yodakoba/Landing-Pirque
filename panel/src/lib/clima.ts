/**
 * El pronóstico del tiempo para los días del calendario.
 *
 * **Sale de MET Norway** (api.met.no, el instituto meteorológico noruego),
 * que es gratis **también para uso comercial**: solo pide que se cite la
 * fuente y que cada consulta diga quién la hace. Se eligió el 2026-10-29
 * sobre Open-Meteo, que fue lo primero que se montó: su versión gratuita es
 * para uso no comercial, y un panel de un restaurante no lo es. Además
 * limita por IP, y en la primera prueba rebotó con "Daily API request limit
 * exceeded" porque la IP de salida era compartida —lo mismo que puede pasar
 * en Vercel.
 *
 * Lo pidió el cliente **para el panel, no para el sitio**. Es dato operativo
 * —armar adentro si llueve, avisarle a los jinetes— y en el sitio público un
 * ícono de lluvia sobre un sábado espantaría reservas.
 *
 * Límites que vale tener escritos:
 *
 * - **Llega a unos 9 o 10 días.** Hora a hora los primeros dos o tres, y de
 *   a seis horas después. Un día más lejano no trae ícono: mostrar algo ahí
 *   sería inventarlo.
 * - **Es un pronóstico.** Se muestra en chico, como dato, no como promesa.
 *
 * Esto es lógica pura, sin red: la llamada la hace `/api/clima`.
 */
import { fechaEnZona, ZONA } from './fechas.ts';

/**
 * **Pirque, aproximado.** El centro de la comuna, no el lote exacto: a esta
 * escala el modelo no distingue unas cuadras. MET pide no mandar más de
 * cuatro decimales, justamente porque más precisión no cambia nada y le
 * rompe la caché.
 */
export const PIRQUE = { latitud: -33.67, longitud: -70.58 };

/**
 * Quién pregunta. **MET lo exige**: una petición sin un User-Agent que
 * identifique la aplicación y cómo contactar a sus dueños se rechaza con
 * 403. Va el correo público del negocio.
 */
export const IDENTIFICACION = 'BrasasDeLoPirque-panel/1.0 (brasasdelopirque.cl; contacto@lopirque.cl)';

/** La cita que pide la licencia de MET (CC BY 4.0). */
export const FUENTE = { texto: 'MET Norway', url: 'https://www.met.no/en' };

export interface Clima {
  fecha: string;
  /** El símbolo de MET sin su sufijo de día o noche: `rain`, `clearsky`… */
  simbolo: string;
  max: number | null;
  min: number | null;
  /**
   * Probabilidad máxima de lluvia en el horario, en %, **si MET la da — y
   * para Chile no la da** (comprobado el 2026-10-29: la respuesta no trae un
   * solo `probability_of_precipitation`). Se deja leída por si aparece; lo
   * que sí llega son los milímetros.
   */
  lluvia: number | null;
  /** Milímetros de agua pronosticados en el día completo. */
  mm: number | null;
}

/**
 * La versión `complete` y no la `compact`, porque es la única que trae la
 * **probabilidad** de lluvia. Pesa más, pero se pide una vez por hora.
 */
export function urlPronostico(): string {
  const q = new URLSearchParams({
    lat: String(PIRQUE.latitud),
    lon: String(PIRQUE.longitud)
  });
  return `https://api.met.no/weatherapi/locationforecast/2.0/complete?${q}`;
}

/**
 * **El horario en que el tiempo importa: de 10 a 19.** Se abre de 13 a 18 y
 * se monta antes. Un chubasco a las cuatro de la mañana no cambia nada del
 * día, y si el ícono lo mostrara, la mitad de los días saldría con lluvia.
 * Las temperaturas y los milímetros, en cambio, son del día completo.
 */
export const HORARIO = { desde: 10, hasta: 19 };

/** La hora de Chile de un instante, 0 a 23. */
export function horaEnChile(instante: Date): number {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA, hour: '2-digit', hourCycle: 'h23'
  }).format(instante);
  return Number(h) % 24;
}

/**
 * Qué tan malo es un símbolo para un día de campo, de 0 (despejado) a 9
 * (tormenta). Sirve para quedarse con **el peor del horario**: si a las
 * tres llueve, el día es de lluvia aunque la mañana haya salido con sol.
 */
export function iconoDe(simbolo: string): { icono: string; texto: string; gravedad: number } {
  const s = simbolo.replace(/_(day|night|polartwilight)$/, '');
  if (s.includes('thunder')) return { icono: '⛈️', texto: 'tormenta', gravedad: 9 };
  if (s.includes('snow')) return { icono: '🌨️', texto: 'nieve', gravedad: 8 };
  if (s.includes('sleet')) return { icono: '🌨️', texto: 'aguanieve', gravedad: 7 };
  if (s.startsWith('heavyrain') || s.startsWith('rain')) {
    return { icono: '🌧️', texto: 'lluvia', gravedad: 6 };
  }
  if (s.startsWith('lightrain')) return { icono: '🌦️', texto: 'lluvia débil', gravedad: 5 };
  if (s === 'fog') return { icono: '🌫️', texto: 'niebla', gravedad: 4 };
  if (s === 'partlycloudy') return { icono: '⛅', texto: 'parcialmente nublado', gravedad: 2 };
  if (s === 'fair') return { icono: '🌤️', texto: 'mayormente despejado', gravedad: 1 };
  if (s === 'clearsky') return { icono: '☀️', texto: 'despejado', gravedad: 0 };
  // `cloudy` y cualquier símbolo que no conozcamos. Equivocarse hacia el sol
  // es lo que hace que alguien no prepare nada.
  return { icono: '☁️', texto: 'nublado', gravedad: 3 };
}

const numero = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

interface Periodo {
  summary?: { symbol_code?: string };
  details?: Record<string, unknown>;
}

interface Paso {
  time?: string;
  data?: {
    instant?: { details?: Record<string, unknown> };
    next_1_hours?: Periodo;
    next_6_hours?: Periodo;
  };
}

interface Acumulado {
  simbolo: string | null;
  gravedad: number;
  max: number | null;
  min: number | null;
  lluvia: number | null;
  mm: number | null;
}

const mayor = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : Math.max(a, b);
const menor = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : Math.min(a, b);

/**
 * La respuesta de MET, de a un día con hora de Chile.
 *
 * MET entrega **instantes en UTC**, hora a hora al principio y de a seis
 * horas después, y cada instante trae lo que se espera para la hora o las
 * seis horas siguientes. Hay que juntarlos por día **de Chile**: un instante
 * a las 02:00 UTC es todavía el día anterior acá. Es la única conversión
 * por `Date` del archivo, y es de un instante a una fecha, que es lo que
 * `fechaEnZona()` sabe hacer bien; las fechas que salen son texto.
 *
 * - **El ícono** es el peor símbolo de los periodos que tocan el horario.
 * - **La lluvia en %** es la mayor probabilidad de esos mismos periodos.
 * - **Los milímetros** suman el día completo, sin contar dos veces: donde
 *   hay datos por hora se usan esos, y un periodo de seis horas solo cuenta
 *   desde donde terminaron los de una hora.
 *
 * Un día sin ningún periodo en el horario se descarta: sin saber si hay sol
 * o lluvia no hay ícono que poner. Pasa con el último día del pronóstico,
 * que a veces llega cortado en la madrugada.
 */
export function climaDe(respuesta: unknown): Clima[] {
  const pasos = (respuesta as { properties?: { timeseries?: unknown } })
    ?.properties?.timeseries;
  if (!Array.isArray(pasos)) return [];

  const dias = new Map<string, Acumulado>();
  let cubiertoHasta = 0;   // hasta dónde ya se sumaron milímetros, en ms

  for (const p of pasos as Paso[]) {
    const inicio = typeof p?.time === 'string' ? new Date(p.time) : null;
    if (!inicio || Number.isNaN(inicio.getTime()) || !p.data) continue;

    const fecha = fechaEnZona(inicio);
    const hora = horaEnChile(inicio);
    const d = dias.get(fecha) ?? {
      simbolo: null, gravedad: -1, max: null, min: null, lluvia: null, mm: null
    };
    dias.set(fecha, d);

    const t = numero(p.data.instant?.details?.air_temperature);
    d.max = mayor(d.max, t);
    d.min = menor(d.min, t);

    const horas = p.data.next_1_hours ? 1 : p.data.next_6_hours ? 6 : 0;
    const periodo = horas === 1 ? p.data.next_1_hours : p.data.next_6_hours;
    if (!periodo) continue;

    d.max = mayor(d.max, numero(periodo.details?.air_temperature_max));
    d.min = menor(d.min, numero(periodo.details?.air_temperature_min));

    const fin = inicio.getTime() + horas * 3600_000;
    const mm = numero(periodo.details?.precipitation_amount);
    if (mm !== null && inicio.getTime() >= cubiertoHasta) {
      d.mm = (d.mm ?? 0) + mm;
      cubiertoHasta = fin;
    }

    // ¿El periodo toca el horario? Se compara en horas del día, así que un
    // periodo de seis horas que parte a las 21 no alcanza al día siguiente:
    // a esa hora el horario de ese día ya pasó.
    const tocaHorario = hora < HORARIO.hasta && hora + horas > HORARIO.desde;
    const simbolo = periodo.summary?.symbol_code;
    if (!tocaHorario || typeof simbolo !== 'string') continue;

    const { gravedad } = iconoDe(simbolo);
    if (gravedad > d.gravedad) {
      d.gravedad = gravedad;
      d.simbolo = simbolo.replace(/_(day|night|polartwilight)$/, '');
    }
    d.lluvia = mayor(d.lluvia, numero(periodo.details?.probability_of_precipitation));
  }

  return [...dias.entries()]
    .filter(([, d]) => d.simbolo !== null)
    .map(([fecha, d]) => ({
      fecha, simbolo: d.simbolo as string,
      max: d.max, min: d.min, lluvia: d.lluvia,
      mm: d.mm === null ? null : Math.round(d.mm * 10) / 10
    }));
}

/** "lluvia · máx 18° · mín 9° · 4,8 mm", para el `title`. */
export function climaEnPalabras(c: Clima): string {
  const partes = [`Pronóstico: ${iconoDe(c.simbolo).texto}`];
  if (c.max !== null) partes.push(`máx ${Math.round(c.max)}°`);
  if (c.min !== null) partes.push(`mín ${Math.round(c.min)}°`);
  if (c.lluvia !== null) partes.push(`${Math.round(c.lluvia)}% de lluvia`);
  // Con coma decimal, como se escribe en Chile.
  if (c.mm !== null && c.mm >= 0.5) partes.push(`${String(c.mm).replace('.', ',')} mm`);
  return partes.join(' · ');
}
