/**
 * **El evento exclusivo, y el camino para liberar un día** (2026-11-12, lo
 * pidió el cliente).
 *
 * Una cotización con **arriendo** pregunta *"¿el día es exclusivo?"* —no se
 * asume: con buena negociación puede haber arriendo y un segundo grupo—. Si
 * es exclusivo y ese día ya tiene reservas de otros, **no se automatiza
 * nada**: el vendedor ve la alarma y pide liberar el día, y decide el
 * encargado de operaciones, el de pagos, la gerencia general o el
 * administrador (permiso `exclusividad`), caso a caso.
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
import { saludoAlCliente } from './contacto.ts';

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
export function mensajeLiberacion(nombre: string, diaEnPalabras: string,
  /** Quién lo manda y de qué empresa (2026-11-13): ver `saludoAlCliente()`. */
  firma: { quien?: string; empresa?: string } = {}): string {
  return `${saludoAlCliente(nombre, firma.quien, firma.empresa)} por tu reserva del ${diaEnPalabras}. `
    + 'Te pedimos disculpas: ese día el recinto quedó reservado para un evento privado y no vamos a poder recibirte. '
    + 'Te ofrecemos dos opciones: la devolución completa de lo que pagaste, o cambiar tu reserva a otra fecha '
    + 'y te esperamos con un pisco sour de regalo. ¿Cuál prefieres?';
}

/* ---------- Liberar el día (segunda entrega, 2026-11-12) ---------- */

/**
 * **Cómo va cada reserva del día que se libera**: se le avisa, y después se
 * cancela con su devolución o se cambia de fecha. Va en la columna `Evento
 * exclusivo` de `Reservas`; lo que de verdad le quita el lugar es
 * `Se cayó por cupo` (`liberada`), igual que al soltar por cupo.
 */
export const LIBERACION = {
  avisada: 'Avisada',
  cancelada: 'Cancelada',
  devuelta: 'Devuelta',
  reagendada: 'Reagendada'
} as const;
export type EstadoLiberacion = '' | keyof typeof LIBERACION;

/** Lo que se guarda: *"Reagendada · Felipe · 2026-11-12 10:05 · al 2026-11-28"*. */
export function marcaLiberacion(estado: keyof typeof LIBERACION, quien: string, cuando: string, nota = ''): string {
  const limpia = String(nota ?? '').replace(/\s+/g, ' ').trim();
  return [LIBERACION[estado], quien || 'alguien', cuando, limpia].filter(Boolean).join(' · ');
}

/** Lee la marca de `Evento exclusivo`. */
export function liberacionDe(marca: string | undefined): {
  estado: EstadoLiberacion; quien: string; cuando: string; nota: string;
} {
  const [cabeza = '', quien = '', cuando = '', ...resto] = String(marca ?? '').split(' · ').map((x) => x.trim());
  const estado = (Object.keys(LIBERACION) as (keyof typeof LIBERACION)[])
    .find((k) => LIBERACION[k] === cabeza) ?? '';
  return { estado, quien, cuando, nota: resto.join(' · ') };
}

/** El motivo que va en `Se cayó por cupo`: así la pastilla dice por qué ya no viene. */
export const MOTIVO_EXCLUSIVO = 'Evento exclusivo';
export const motivoLiberada = (accion: 'cancelada' | 'reagendada', nueva = '') =>
  accion === 'cancelada' ? `${MOTIVO_EXCLUSIVO}: cancelada, devolución completa`
    : `${MOTIVO_EXCLUSIVO}: reagendada al ${nueva}`;
/** Si una reserva dejó su lugar por un evento exclusivo (y no por cupo). */
export const liberadaPorExclusivo = (liberada: string | undefined) =>
  String(liberada ?? '').includes(`${MOTIVO_EXCLUSIVO}:`);

/**
 * **Cuánto hay que devolverle** a una reserva que se cancela: lo pagado
 * entero —el cliente lo pidió así: *devolución completa*—, o lo abonado.
 * Una por pagar no puso plata y no tiene devolución.
 */
export function montoADevolver(r: { estadoPago: string; monto: number | null; abonado?: number | null }): number {
  const e = String(r.estadoPago ?? '').trim().toLowerCase();
  if (e === 'paid') return Math.max(0, Number(r.monto) || 0);
  if (e === 'partially_paid') return Math.max(0, Number(r.abonado) || 0);
  return 0;
}

/** De Shopify: el id es el número del pedido. La devolución se hace allá. */
export const esDeShopify = (id: string) => /^\d+$/.test(String(id ?? ''));

/**
 * **La nota de la reserva nueva al cambiarla de fecha**: de dónde viene, el
 * pisco sour de regalo —para que el equipo lo vea ese día— y, si venía de
 * Shopify, el pedido donde está el pago.
 */
export function notaReagendada(r: { id: string; fecha: string; notaPago: string }): string {
  return [`Reagendada desde el ${r.fecha} por un evento exclusivo`, '🎁 pisco sour de regalo',
    esDeShopify(r.id) ? `pedido Shopify ${r.id}` : '', String(r.notaPago ?? '').trim()]
    .filter(Boolean).join(' · ');
}
