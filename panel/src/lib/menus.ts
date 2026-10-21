/**
 * Qué menús existen, y cómo se llaman de verdad.
 *
 * **El problema que esto resuelve:** el nombre del menú era la llave. Shopify
 * guarda el título del producto DENTRO de cada pedido en el momento de la
 * compra, así que renombrar un producto no reescribe los pedidos viejos — y
 * la reconciliación diaria, al releerlos, seguiría escribiendo el nombre
 * antiguo para siempre. Con el nombre como llave, un solo rename parte el
 * total del día en dos platos que en realidad son uno.
 *
 * La solución es un nombre canónico con alias: todo lo que lee la columna
 * `Menú` traduce el texto crudo al menú de verdad. Un rename futuro se
 * arregla **agregando un alias**, sin tocar las filas viejas ni redesplegar.
 *
 * **No se guarda el id de variante**, que sería lo técnicamente más sólido
 * porque no cambia nunca. Convertiría esa columna en algo ilegible para una
 * persona, y esa planilla la abre gente. Los alias dan casi toda la
 * robustez sin ese costo.
 */
import { normalizar } from './columnas.ts';

export const HOJA_MENUS = 'Menús';
export const COL_MENUS = { menu: 'Menú', alias: 'Alias' } as const;

export interface Menu {
  /** Como se escribe y como se muestra. */
  nombre: string;
  /** Otras formas de escribir lo mismo. */
  alias: string[];
}

/**
 * Los cinco que existen hoy: los cuatro niveles del landing más el de niños,
 * que es uno solo y se suma a cualquiera.
 *
 * **Sin el prefijo "Menú"**, que es como se llaman en el sitio público, en el
 * landing y en CLAUDE.md. Los `Menú X` que hoy usa Shopify entran como alias,
 * así que las reservas ya anotadas se siguen entendiendo aunque la tienda
 * todavía no se renombre.
 *
 * Esta lista es solo el punto de partida: vive en la planilla y se edita ahí.
 */
export const POR_DEFECTO_MENUS: Menu[] = [
  { nombre: 'Tradiciones', alias: ['Menú Tradiciones'] },
  { nombre: 'Lo Pirque', alias: ['Menú Lo Pirque'] },
  { nombre: 'A Brasas abiertas', alias: ['Menú A Brasas abiertas', 'Brasas', 'Menú Brasas'] },
  { nombre: 'Sommelier', alias: ['Menú Sommelier'] },
  { nombre: 'Niños', alias: ['Menú Niños', 'Menú de niños', 'Niño'] }
];

/** Las filas de la pestaña `Menús` como lista. Los alias van separados por coma. */
export function leerMenusDe(filas: string[][]): Menu[] {
  const salida: Menu[] = [];
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre) continue;
    const alias = String(filas[i]?.[1] ?? '')
      .split(',').map((a) => a.trim()).filter(Boolean);
    salida.push({ nombre, alias });
  }
  return salida;
}

/** La lista como filas, para escribirla de vuelta. */
export function aFilasMenus(menus: Menu[]): string[][] {
  return [
    [COL_MENUS.menu, COL_MENUS.alias],
    ...menus.map((m) => [m.nombre, m.alias.join(', ')])
  ];
}

/**
 * El nombre de verdad de un menú escrito de cualquier forma.
 *
 * Compara normalizado —sin tildes, sin mayúsculas, sin espacios de sobra—
 * así que `MENU TRADICIONES`, `Menú Tradiciones` y `tradiciones ` caen todos
 * en `Tradiciones`.
 *
 * **Lo que no reconoce lo devuelve tal cual, limpio.** No se descarta ni se
 * fuerza al más parecido: un menú nuevo que Shopify empezó a vender ayer
 * tiene que aparecer en el panel aunque nadie lo haya agregado todavía a la
 * lista. Inventar a cuál se parece sería peor que no saber.
 */
export function canonizar(texto: unknown, menus: Menu[] = POR_DEFECTO_MENUS): string {
  const crudo = String(texto ?? '').trim();
  if (!crudo) return '';
  const buscado = normalizar(crudo);
  for (const m of menus) {
    if (normalizar(m.nombre) === buscado) return m.nombre;
    for (const a of m.alias) if (normalizar(a) === buscado) return m.nombre;
  }
  return crudo;
}

/**
 * Los menús que aparecen en las reservas y que NO están en la lista.
 *
 * Es lo que permite que la lista crezca sola: si Shopify empieza a vender
 * algo nuevo, el panel lo muestra y además avisa que conviene agregarlo con
 * sus alias, en vez de que alguien lo descubra cuando los totales no cuadren.
 */
export function desconocidos(vistos: string[], menus: Menu[]): string[] {
  const conocidos = new Set<string>();
  for (const m of menus) {
    conocidos.add(normalizar(m.nombre));
    for (const a of m.alias) conocidos.add(normalizar(a));
  }
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
