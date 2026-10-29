/**
 * El pronóstico del tiempo para los días del calendario.
 *
 * **Sale de Open-Meteo** (open-meteo.com): gratis, sin cuenta ni llave, y con
 * la fecha devuelta en hora de Chile si se le pide. Lo último importa: las
 * fechas llegan como texto `AAAA-MM-DD` y se cruzan tal cual con las del
 * panel, sin pasar por un `Date` que las corra de día.
 *
 * Lo pidió el cliente el 2026-10-29 **para el panel, no para el sitio**. Es
 * dato operativo —armar adentro si llueve, avisarle a los jinetes— y en el
 * sitio público un ícono de lluvia sobre un sábado espantaría reservas.
 *
 * Dos límites que vale tener escritos:
 *
 * - **El pronóstico llega a 16 días, y es confiable a unos 7.** Un día más
 *   lejano no trae ícono: mostrar algo ahí sería inventarlo.
 * - **Es un pronóstico.** Por eso se muestra en chico, como dato, y no como
 *   un aviso que alguien pueda leer como promesa.
 *
 * Esto es lógica pura, sin red: la llamada la hace `/api/clima`.
 */

/**
 * **Pirque, aproximado.** El centro de la comuna, no el lote exacto: a esta
 * escala el modelo del tiempo no distingue unas cuadras, y la ubicación del
 * lote no está escrita en el proyecto más que como link de Maps.
 */
export const PIRQUE = { latitud: -33.67, longitud: -70.58 };

/** Cuántos días pide. Es el máximo que da Open-Meteo. */
export const DIAS_PRONOSTICO = 16;

export interface Clima {
  fecha: string;
  /** Código WMO del tiempo del día, el que usa Open-Meteo. */
  codigo: number;
  max: number | null;
  min: number | null;
  /** Probabilidad máxima de lluvia en el día, en %. */
  lluvia: number | null;
}

export function urlPronostico(dias = DIAS_PRONOSTICO): string {
  const q = new URLSearchParams({
    latitude: String(PIRQUE.latitud),
    longitude: String(PIRQUE.longitud),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'America/Santiago',
    forecast_days: String(dias)
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

const numero = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * La respuesta de Open-Meteo, día por día.
 *
 * Viene en columnas —una lista de fechas, una de códigos, una de máximas—
 * y se pasa a una fila por día. **Un día sin código se descarta**: sin saber
 * si hay sol o lluvia no hay ícono que poner, y una temperatura sola al lado
 * de nada se lee como un error.
 */
export function climaDe(respuesta: unknown): Clima[] {
  const d = (respuesta as { daily?: Record<string, unknown[]> })?.daily;
  if (!d || !Array.isArray(d.time)) return [];
  const col = (k: string) => (Array.isArray(d[k]) ? d[k] : []);
  const codigos = col('weather_code');
  const max = col('temperature_2m_max');
  const min = col('temperature_2m_min');
  const lluvia = col('precipitation_probability_max');

  return d.time.flatMap((f, i) => {
    const codigo = numero(codigos[i]);
    if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f) || codigo === null) {
      return [];
    }
    return [{
      fecha: f, codigo,
      max: numero(max[i]), min: numero(min[i]), lluvia: numero(lluvia[i])
    }];
  });
}

/**
 * El ícono y su palabra, según el código WMO.
 *
 * Se agrupan en lo que importa para un día de campo: sol, nubes, niebla,
 * llovizna, lluvia, nieve y tormenta. Los códigos que no están en la tabla
 * caen en "nublado" antes que en "despejado": equivocarse hacia el sol es
 * lo que hace que alguien no prepare nada.
 */
export function iconoDe(codigo: number): { icono: string; texto: string } {
  if (codigo === 0) return { icono: '☀️', texto: 'despejado' };
  if (codigo === 1) return { icono: '🌤️', texto: 'mayormente despejado' };
  if (codigo === 2) return { icono: '⛅', texto: 'parcialmente nublado' };
  if (codigo === 3) return { icono: '☁️', texto: 'nublado' };
  if (codigo === 45 || codigo === 48) return { icono: '🌫️', texto: 'niebla' };
  if (codigo >= 51 && codigo <= 57) return { icono: '🌦️', texto: 'llovizna' };
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) {
    return { icono: '🌧️', texto: 'lluvia' };
  }
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) {
    return { icono: '🌨️', texto: 'nieve' };
  }
  if (codigo >= 95 && codigo <= 99) return { icono: '⛈️', texto: 'tormenta' };
  return { icono: '☁️', texto: 'nublado' };
}

/** "lluvia · máx 18° · mín 9° · 70% de lluvia", para el `title`. */
export function climaEnPalabras(c: Clima): string {
  const partes = [`Pronóstico: ${iconoDe(c.codigo).texto}`];
  if (c.max !== null) partes.push(`máx ${Math.round(c.max)}°`);
  if (c.min !== null) partes.push(`mín ${Math.round(c.min)}°`);
  if (c.lluvia !== null) partes.push(`${Math.round(c.lluvia)}% de lluvia`);
  return partes.join(' · ');
}
