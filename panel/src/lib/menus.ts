/**
 * Qué menús existen.
 *
 * **Una sola forma de escribir cada menú, y tiene que ser la misma en
 * Shopify, en el sitio y acá.** Se decidió así el 2026-10-21, descartando un
 * sistema de alias: una lista de equivalencias es tolerante, pero también
 * permite que los nombres se desalineen sin que nadie se entere, y
 * mantenerla es trabajo.
 *
 * **Lo que reemplaza al alias es un aviso.** `desconocidos()` compara lo que
 * Shopify está vendiendo contra esta lista, y el panel lo muestra en
 * amarillo. Así la garantía de que los nombres coinciden deja de ser una
 * promesa y pasa a ser una comprobación: el día que alguien renombre un
 * producto en la tienda, el panel lo dice.
 *
 * **La contra a asumir, y no es chica:** Shopify guarda el título del
 * producto DENTRO de cada pedido al momento de la compra, así que renombrar
 * no reescribe los pedidos viejos. Tras un rename, las reservas anteriores
 * van a contarse aparte, con su nombre antiguo, y arreglarlo es editar esas
 * filas en la planilla. Por eso **conviene renombrar temprano**, y por eso
 * el aviso importa: hace visible el momento en que pasa.
 *
 * Lo que sí se corrige solo son mayúsculas, tildes y espacios de sobra. Eso
 * no es un segundo nombre, es el mismo escrito con descuido.
 */
import { normalizar } from './columnas.ts';

export const HOJA_MENUS = 'Menús';
export const COL_MENUS = { menu: 'Menú' } as const;

export interface Menu {
  /** Como se escribe, como se muestra, y como se llama en Shopify. */
  nombre: string;
}

/**
 * Los cinco que existen hoy: los cuatro niveles del landing más el de niños,
 * que es uno solo y se suma a cualquiera.
 *
 * **Sin el prefijo "Menú"**, que es como se llaman en el sitio público, en el
 * landing y en CLAUDE.md. Esta lista es solo el punto de partida: vive en la
 * planilla y se edita ahí.
 */
export const POR_DEFECTO_MENUS: Menu[] = [
  { nombre: 'Tradiciones' },
  { nombre: 'Lo Pirque' },
  { nombre: 'A Brasas abiertas' },
  { nombre: 'Sommelier' },
  { nombre: 'Niños' }
];

/** Las filas de la pestaña `Menús` como lista. */
export function leerMenusDe(filas: string[][]): Menu[] {
  const salida: Menu[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    salida.push({ nombre });
  }
  return salida;
}

/** La lista como filas, para escribirla de vuelta. */
export function aFilasMenus(menus: Menu[]): string[][] {
  return [[COL_MENUS.menu], ...menus.map((m) => [m.nombre])];
}

/**
 * El nombre tal como está escrito en la lista.
 *
 * Solo arregla **mayúsculas, tildes y espacios de sobra**: `TRADICIONES`,
 * `tradiciones ` y `Tradiciones` son el mismo menú escrito con más o menos
 * cuidado, no dos menús. No hay equivalencias entre nombres distintos: para
 * eso estaba el sistema de alias, que se descartó.
 *
 * **Lo que no está en la lista se devuelve tal cual.** No se descarta ni se
 * fuerza al más parecido: un menú que la tienda empezó a vender ayer tiene
 * que aparecer en el panel, y `desconocidos()` lo reporta para que se agregue.
 * Inventar a cuál se parece sería peor que no saber.
 */
export function canonizar(texto: unknown, menus: Menu[] = POR_DEFECTO_MENUS): string {
  const crudo = String(texto ?? '').trim();
  if (!crudo) return '';
  const buscado = normalizar(crudo);
  for (const m of menus) if (normalizar(m.nombre) === buscado) return m.nombre;
  return crudo;
}

/**
 * Los menús que aparecen en las reservas y que NO están en la lista.
 *
 * **Es el mecanismo que reemplaza a los alias.** Sin equivalencias, lo único
 * que mantiene alineados a Shopify, al sitio y al panel es que alguien se
 * entere cuando dejan de estarlo. Esto es ese alguien: si la tienda renombra
 * un producto o empieza a vender uno nuevo, el panel lo dice en amarillo en
 * vez de que se descubra cuando los totales del día no cuadren.
 */
export function desconocidos(vistos: string[], menus: Menu[]): string[] {
  const conocidos = new Set(menus.map((m) => normalizar(m.nombre)));
  // Se deduplica por la forma NORMALIZADA y se conserva la primera
  // escritura. Si no, "Nuevo", "nuevo" y "NUEVO" se reportan como tres menus
  // distintos y el aviso dice que faltan tres cuando falta uno.
  const salida: string[] = [];
  const yaVistos = new Set<string>();
  for (const v of vistos) {
    const limpio = String(v).trim();
    if (!limpio) continue;
    const clave = normalizar(limpio);
    if (conocidos.has(clave) || yaVistos.has(clave)) continue;
    yaVistos.add(clave);
    salida.push(limpio);
  }
  return salida;
}
