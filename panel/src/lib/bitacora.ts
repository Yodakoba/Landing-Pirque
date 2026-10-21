/**
 * La bitácora: qué se hizo, quién lo hizo y cuándo.
 *
 * Existe porque el panel pasó a tocar plata —montos por cobrar, y pronto
 * horas y ajustes de sueldo— y ahí "alguien cambió esto" no alcanza. Es la
 * razón por la que el panel tiene cuentas con nombre: sin ellas, cada línea
 * de acá diría "un encargado" y no serviría para nada.
 *
 * **Se escribe desde el servidor, nunca desde la interfaz.** Una llamada
 * directa a la API tiene que quedar registrada igual que un clic en un
 * botón; si el registro dependiera del navegador, bastaría con no usarlo.
 *
 * Lo que NO hace: no guarda el valor anterior de lo que se cambió. Eso sería
 * un historial completo, otra cosa y mucho más pesada. Acá queda el rastro
 * —quién, cuándo, sobre qué— que es lo que se necesita para preguntar.
 */
import { ZONA } from './fechas.ts';

export const HOJA_BITACORA = 'Bitácora';

export const COL_BITACORA = {
  cuando: 'Cuándo',
  quien: 'Quién',
  rol: 'Rol',
  accion: 'Acción',
  detalle: 'Detalle'
} as const;

export interface Anotacion {
  cuando: string;
  quien: string;
  rol: string;
  accion: string;
  detalle: string;
}

/**
 * La hora de Chile, como texto `AAAA-MM-DD HH:MM`.
 *
 * **En hora de Chile y no en UTC**, por el mismo motivo por el que las
 * fechas de las reservas se tratan como texto: una línea que diga que algo
 * pasó a las 03:40 cuando en el local eran las 00:40 manda a buscar al
 * turno equivocado. El servidor de Vercel no está en Chile.
 */
export function ahoraEnChile(instante = new Date(), zona = ZONA): string {
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(instante);
  // `sv-SE` da "2026-10-21 21:40", que ya es el formato que queremos.
  return partes.replace('T', ' ');
}

export const ENCABEZADO_BITACORA: string[] = [
  COL_BITACORA.cuando, COL_BITACORA.quien, COL_BITACORA.rol,
  COL_BITACORA.accion, COL_BITACORA.detalle
];

export function filaBitacora(a: Anotacion): string[] {
  return [a.cuando, a.quien, a.rol, a.accion, a.detalle];
}

export function leerBitacoraDe(filas: string[][]): Anotacion[] {
  const salida: Anotacion[] = [];
  for (let i = 1; i < filas.length; i++) {
    const f = filas[i] ?? [];
    const cuando = String(f[0] ?? '').trim();
    if (!cuando) continue;
    salida.push({
      cuando,
      quien: String(f[1] ?? '').trim(),
      rol: String(f[2] ?? '').trim(),
      accion: String(f[3] ?? '').trim(),
      detalle: String(f[4] ?? '').trim()
    });
  }
  return salida;
}

/**
 * Recorta un detalle para que una línea no se vuelva ilegible.
 *
 * 300 caracteres alcanzan para "Ana Pérez · 2026-11-14 · 4 personas" con
 * holgura. Lo que se corta lleva un "…" para que se note que había más, en
 * vez de parecer un dato que terminaba ahí.
 */
export function recortar(texto: unknown, largo = 300): string {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return limpio.length <= largo ? limpio : limpio.slice(0, largo - 1) + '…';
}
