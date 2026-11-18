/**
 * **Dejar la base en cero para el paso a producción** (2026-11-18, lo pidió
 * el cliente: *"resetear todo a cero menos los trabajadores, el equipo que
 * ya se ingresó, porque eso viene del mundo real"*). Lo que se vacía y lo
 * que se conserva lo decidió el cliente el mismo día, sobre la propuesta.
 *
 * - **Se vacía** lo que fueron pruebas: reservas (con sus eventos en Google
 *   Calendar), cotizaciones, clientes, cobros, turnos, cierres, actividades
 *   agendadas, pagos, boletas, días abiertos y la bitácora. Los encabezados
 *   quedan: la planilla sigue sirviendo.
 * - **Se conserva** lo del mundo real y lo que es configuración: el equipo
 *   —trabajadores y puestos—, las cuentas, la configuración, los productos
 *   con sus precios, las fichas de los extras y de los vendedores y socios,
 *   y los comentarios.
 *
 * Es una lista fija a propósito: elegir pestaña por pestaña en una pantalla
 * sería una forma de borrar el equipo por un toque de más.
 *
 * Puro: lo usan la ruta y las pruebas. **No lo importa la pantalla**: trae
 * `usuarios.ts`, que usa `node:crypto`; la pantalla recibe las listas de la
 * ruta.
 */
import { HOJA_RESERVAS, HOJA_FECHAS } from './columnas.ts';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS } from './presupuestos.ts';
import { HOJA_CLIENTES } from './clientes.ts';
import { HOJA_COBROS } from './cobros.ts';
import { HOJA_PUESTOS, HOJA_TRABAJADORES, HOJA_TURNOS } from './equipo.ts';
import { HOJA_CIERRES } from './cierres.ts';
import { HOJA_ACTIVIDADES, HOJA_COLABORADORES } from './extras.ts';
import { HOJA_PAGOS, HOJA_BOLETAS } from './remuneraciones.ts';
import { HOJA_BITACORA } from './bitacora.ts';
import { HOJA_USUARIOS } from './usuarios.ts';
import { HOJA_CONFIG } from './config.ts';
import { HOJA_MENUS } from './menus.ts';
import { HOJA_VENDEDORES } from './vendedores.ts';

export interface PestanaProduccion { hoja: string; que: string }

/** Lo que se vacía, en el orden en que se lee en la pantalla. */
export const SE_VACIAN: PestanaProduccion[] = [
  { hoja: HOJA_RESERVAS, que: 'Reservas, y sus eventos en Google Calendar' },
  { hoja: HOJA_PRESUPUESTOS, que: 'Cotizaciones' },
  { hoja: HOJA_LINEAS, que: 'Productos de las cotizaciones' },
  { hoja: HOJA_CLIENTES, que: 'Clientes' },
  { hoja: HOJA_COBROS, que: 'Pagos de los clientes' },
  { hoja: HOJA_TURNOS, que: 'Turnos del equipo' },
  { hoja: HOJA_CIERRES, que: 'Días cerrados' },
  { hoja: HOJA_ACTIVIDADES, que: 'Actividades extras agendadas' },
  { hoja: HOJA_PAGOS, que: 'Pagos al equipo, extras y vendedores' },
  { hoja: HOJA_BOLETAS, que: 'Boletas' },
  { hoja: HOJA_FECHAS, que: 'Días abiertos y sus cupos' },
  { hoja: HOJA_BITACORA, que: 'Bitácora' }
];

/** Lo que se conserva. Los comentarios viven en otra planilla y no se tocan. */
export const SE_CONSERVAN: PestanaProduccion[] = [
  { hoja: HOJA_TRABAJADORES, que: 'Trabajadores' },
  { hoja: HOJA_PUESTOS, que: 'Puestos' },
  { hoja: HOJA_USUARIOS, que: 'Cuentas' },
  { hoja: HOJA_CONFIG, que: 'Configuración' },
  { hoja: HOJA_MENUS, que: 'Productos y precios' },
  { hoja: HOJA_COLABORADORES, que: 'Fichas de los extras' },
  { hoja: HOJA_VENDEDORES, que: 'Fichas de vendedores y socios' }
];

/** Lo que hay que escribir para que se borre. */
export const PALABRA_PARA_BORRAR = 'BORRAR';

/**
 * **Si se puede seguir**: hay que haber dicho que se hizo la copia de la
 * planilla y escribir la palabra. Las dos las comprueba el servidor.
 */
export function confirmado(cuerpo: unknown): boolean {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  return c.copia === true && String(c.palabra ?? '').trim().toUpperCase() === PALABRA_PARA_BORRAR;
}

/** Cuántas filas de datos tiene una pestaña leída: sin el encabezado ni las filas vacías. */
export function filasConDatos(filas: string[][]): number {
  return filas.slice(1).filter((f) => f.some((c) => String(c ?? '').trim())).length;
}

/**
 * **A qué tienda está conectado el panel**, para decirlo antes de borrar: si
 * sigue en la de desarrollo, la revisión diaria con Shopify vuelve a traer
 * sus pedidos de prueba.
 */
export function tiendaDe(dominio: string | undefined): { dominio: string; desarrollo: boolean } {
  const d = String(dominio ?? '').trim();
  return { dominio: d, desarrollo: !d || /development|dev\b|-dev\.|desarrollo/i.test(d) };
}

/** La línea de la bitácora: qué se vació y cuántas filas. */
export function detalleDeLaLimpieza(cuantas: Record<string, number>, eventos: number): string {
  const partes = SE_VACIAN.filter((p) => cuantas[p.hoja] > 0).map((p) => `${p.hoja} ${cuantas[p.hoja]}`);
  return (partes.length ? partes.join(' · ') : 'no había nada que borrar')
    + (eventos ? ` · ${eventos} eventos de Calendar` : '');
}

/**
 * **Los eventos de Google Calendar que hay que borrar**: los de las reservas
 * de Shopify, que son las únicas que el panel escribe allá (el webhook y la
 * revisión diaria). Su id es el número del pedido; las anotadas a mano y las
 * de una cotización no tienen evento. Sin repetir.
 */
export function idsConEvento(ids: string[]): string[] {
  return [...new Set(ids.map((i) => String(i ?? '').trim()).filter((i) => /^\d+$/.test(i)))];
}
