/**
 * **El valor de la UF**, para cotizar productos que tienen su precio en UF
 * (2026-11-10).
 *
 * Lo pide el servidor a dos servicios públicos y gratuitos: **api.boostr.cl**
 * primero y **mindicador.cl** de respaldo. Los dos están abiertos en Network
 * access, y en Vercel no necesitan nada. El primero se eligió así porque al
 * probarlo el 2026-11-10 mindicador se quedaba sin responder a ratos.
 *
 * Este archivo es puro —lee las respuestas, no las pide— para probarlo sin
 * red. La llamada vive en `ufRed.ts`.
 *
 * **La UF de una cotización queda fija** (columnas `UF` y `Fecha UF` de
 * `Presupuestos`): el cliente ya recibió una cifra en pesos y no puede
 * moverse sola. Se cambia a mano con *Usar la UF de hoy*.
 */
import { esFecha } from './fechas.ts';

export interface ValorUF {
  valor: number;
  /** `AAAA-MM-DD` del valor. */
  fecha: string;
  fuente: string;
}

/**
 * Lo que no puede ser una UF. En 2026 vale unos $41.000; un valor fuera de
 * este rango es una respuesta rota, y convertir con él cotizaría mal por
 * órdenes de magnitud.
 */
export const UF_MINIMA = 10000;
export const UF_MAXIMA = 200000;

const creible = (v: number) => Number.isFinite(v) && v > UF_MINIMA && v < UF_MAXIMA;

/** `{"status":"success","data":{"date":"2026-11-10","value":41302.33}}` */
export function ufDeBoostr(json: unknown): ValorUF | null {
  const d = (json as { status?: string; data?: { date?: string; value?: number } })?.data;
  const valor = Number(d?.value);
  const fecha = String(d?.date ?? '').slice(0, 10);
  if (!creible(valor) || !esFecha(fecha)) return null;
  return { valor: Math.round(valor * 100) / 100, fecha, fuente: 'api.boostr.cl' };
}

/** `{"serie":[{"fecha":"2026-11-10T03:00:00.000Z","valor":41302.33}, …]}` */
export function ufDeMindicador(json: unknown): ValorUF | null {
  const s = (json as { serie?: { fecha?: string; valor?: number }[] })?.serie?.[0];
  const valor = Number(s?.valor);
  // La fecha viene como medianoche de Chile en UTC (03:00Z): los primeros
  // diez caracteres ya son el día de Chile.
  const fecha = String(s?.fecha ?? '').slice(0, 10);
  if (!creible(valor) || !esFecha(fecha)) return null;
  return { valor: Math.round(valor * 100) / 100, fecha, fuente: 'mindicador.cl' };
}

/** Un precio en UF a pesos, redondeado al peso. */
export const aPesos = (precioUF: number, uf: number) => Math.round(precioUF * uf);

/** "UF 2,61" — con coma decimal, como se escribe en Chile. */
export function enUF(n: number): string {
  return `UF ${n.toLocaleString('es-CL', { maximumFractionDigits: 2 })}`;
}
