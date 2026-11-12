/**
 * **El evento exclusivo, y el camino para liberar un día** (2026-11-12, lo
 * pidió el cliente).
 *
 * Una cotización con **arriendo** pregunta *"¿el día es exclusivo?"* —no se
 * asume: con buena negociación puede haber arriendo y un segundo grupo—. Si
 * es exclusivo y ese día ya tiene reservas de otros, **no se automatiza
 * nada**: el vendedor ve la alarma y le pide a la gerencia liberar el día, y
 * decide el encargado de pagos, la gerencia general o el administrador
 * (permiso `exclusividad`), caso a caso.
 *
 * - **El plazo**: con menos de `exclusivo_dias_minimos` días (7) para el
 *   evento, pedirlo va como **caso especial**, y aprobarlo pide motivo.
 * - **Ganar exclusiva exige el día libre**: mientras quede otra reserva que
 *   ocupe lugar, `/convertir` lo rechaza. Liberar es cancelar o mover esas
 *   reservas, con su aviso al cliente.
 *
 * Puro, sin red ni planilla.
 */
import type { Fecha } from './fechas.ts';
import type { Menu } from './menus.ts';
import { TIPO_PRODUCTO, canonizar } from './menus.ts';
import { diasEntre } from './cobros.ts';

export const EXCLUSIVIDAD = {
  pedida: 'Pedida',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada'
} as const;
export type EstadoExclusividad = '' | 'pedida' | 'aprobada' | 'rechazada';

/** Si alguna línea de la cotización es de tipo Arriendo en el catálogo. */
export function tieneArriendo(lineas: { concepto: string }[], catalogo: Menu[]): boolean {
  return lineas.some((l) => {
    const nombre = canonizar(l.concepto, catalogo);
    return catalogo.some((m) => m.nombre === nombre && m.tipo === TIPO_PRODUCTO.arriendo);
  });
}

/** Si la respuesta guardada dice que es exclusivo. */
export const esExclusivo = (respuesta: string | undefined) => /^s[ií]$/i.test(String(respuesta ?? '').trim());

/** Lo que se guarda en `Exclusividad`: *"Pedida · Cristóbal · 2026-11-12 10:05 · caso especial"*. */
export function marcaExclusividad(estado: keyof typeof EXCLUSIVIDAD, quien: string, cuando: string, nota = ''): string {
  const limpia = String(nota ?? '').replace(/\s+/g, ' ').trim();
  return [EXCLUSIVIDAD[estado], quien || 'alguien', cuando, limpia].filter(Boolean).join(' · ');
}

/** Lee la marca de `Exclusividad`. */
export function exclusividadDe(marca: string | undefined): {
  estado: EstadoExclusividad; quien: string; cuando: string; nota: string;
} {
  const [cabeza = '', quien = '', cuando = '', ...resto] = String(marca ?? '').split(' · ').map((x) => x.trim());
  const estado: EstadoExclusividad = cabeza === EXCLUSIVIDAD.pedida ? 'pedida'
    : cabeza === EXCLUSIVIDAD.aprobada ? 'aprobada'
    : cabeza === EXCLUSIVIDAD.rechazada ? 'rechazada' : '';
  return { estado, quien, cuando, nota: resto.join(' · ') };
}

/** Días que faltan para el evento, y si está dentro del plazo para liberar el día. */
export function plazoParaLiberar(fecha: Fecha, hoy: Fecha, diasMinimos: number): {
  faltan: number; enPlazo: boolean;
} {
  const faltan = diasEntre(hoy, fecha);
  return { faltan, enPlazo: faltan >= Math.max(0, diasMinimos) };
}

/**
 * **El mensaje para quien hay que mover** (2026-11-12, lo pidió el cliente):
 * disculpas, y dos salidas —devolución completa, u otra fecha con un pisco
 * sour de regalo—. Un solo lugar para cambiarlo.
 */
export function mensajeLiberacion(nombre: string, diaEnPalabras: string): string {
  const quien = String(nombre ?? '').trim().split(/\s+/)[0] || '';
  return `Hola${quien ? ` ${quien}` : ''}, te escribimos de Brasas de Lo Pirque por tu reserva del ${diaEnPalabras}. `
    + 'Te pedimos disculpas: ese día el recinto quedó reservado para un evento privado y no vamos a poder recibirte. '
    + 'Te ofrecemos dos opciones: la devolución completa de lo que pagaste, o cambiar tu reserva a otra fecha '
    + 'y te esperamos con un pisco sour de regalo. ¿Cuál prefieres?';
}
