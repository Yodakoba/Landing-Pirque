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
export const COL_MENUS = {
  menu: 'Menú',
  precioEnLinea: 'Precio en línea',
  precioEnLocal: 'Precio en el local',
  // Desde el 2026-11-10 esta pestaña es **el catálogo de productos** del
  // panel, no solo los menús del sitio: lo que se cotiza sale de acá, igual
  // que lo que se reserva. Un solo catálogo para no tener dos listas de
  // nombres que se desalineen. Las columnas nuevas van AL FINAL, así que
  // una planilla vieja se sigue leyendo igual (ver `leerMenusDe()`).
  tipo: 'Tipo',
  sitioPublico: 'Sitio público',
  cotizacion: 'Cotización',
  cobro: 'Cobro',
  precioCotizacion: 'Precio cotización',
  iva: 'IVA',
  moneda: 'Moneda'
} as const;

/**
 * Qué es un producto. **Define qué es gente y qué no**: solo las líneas de
 * tipo Menú suman invitados. La once y el desayuno se cobran por persona,
 * pero son los mismos invitados; el arriendo y el show no son gente. Así una
 * cotización no necesita una columna "personas" que alguien tenga que llenar.
 */
export const TIPO_PRODUCTO = {
  menu: 'Menú',
  extra: 'Extra',
  arriendo: 'Arriendo',
  show: 'Show'
} as const;
export type TipoProducto = (typeof TIPO_PRODUCTO)[keyof typeof TIPO_PRODUCTO];

export const COBRO = { porPersona: 'Por persona', fijo: 'Monto fijo' } as const;
export type Cobro = (typeof COBRO)[keyof typeof COBRO];

/** Si el precio escrito ya trae el IVA o se le suma. */
export const IVA_PRECIO = { incluido: 'Incluido', mas: '+ IVA' } as const;
export type IvaPrecio = (typeof IVA_PRECIO)[keyof typeof IVA_PRECIO];

export const MONEDA = { pesos: 'Pesos', uf: 'UF' } as const;
export type Moneda = (typeof MONEDA)[keyof typeof MONEDA];

export interface Menu {
  /** Como se escribe, como se muestra, y como se llama en Shopify. */
  nombre: string;
  /**
   * Los dos precios, en pesos. Cero significa **sin precio puesto**, no
   * gratis: así se distingue "nadie lo ha llenado" de "vale cero".
   *
   * **Son dos porque el negocio tiene dos modalidades**: pagar por
   * adelantado sale más barato que pagar en el local. Un precio solo
   * obligaría a elegir cuál de los dos mentir.
   *
   * **Solo rigen para las reservas hechas a mano.** Lo que viene de Shopify
   * trae su propio total y ese manda: la tienda es la que cobra. Por eso
   * esto no es una segunda verdad sobre el precio — es la única que hay
   * cuando no hay pedido de Shopify de dónde sacarlo.
   */
  precioEnLinea: number;
  precioEnLocal: number;
  tipo: TipoProducto;
  /**
   * Si se vende en el sitio y en las reservas: es lo que ofrece el
   * formulario de reserva a mano. **No toca Shopify**, que sigue vendiendo
   * lo suyo; esto ordena el panel.
   */
  sitioPublico: boolean;
  /** Si se puede cotizar. Tradiciones, por ejemplo, queda solo para el sitio. */
  cotizacion: boolean;
  cobro: Cobro;
  /**
   * El precio que **propone** una cotización. Se puede cambiar en cada
   * cotización: es parte de la negociación. Cero es sin poner. En UF lleva
   * decimales (2,61 UF por persona), por eso no pasa por `aMonto()`.
   */
  precioCotizacion: number;
  iva: IvaPrecio;
  moneda: Moneda;
}

/**
 * Un producto nuevo, con los valores que no cambian nada de lo que ya había:
 * un menú, que se vende en el sitio, que **no** se cotiza hasta que alguien
 * lo decida, por persona, con IVA incluido y en pesos. Es también lo que
 * vale una celda en blanco al leer una planilla vieja.
 */
export function nuevoProducto(p: Partial<Menu> & { nombre: string }): Menu {
  // El nombre primero, para que el objeto se lea —y se compare— igual que
  // uno leído de la planilla.
  const { nombre, ...resto } = p;
  return {
    nombre, precioEnLinea: 0, precioEnLocal: 0,
    tipo: TIPO_PRODUCTO.menu, sitioPublico: true, cotizacion: false,
    cobro: COBRO.porPersona, precioCotizacion: 0,
    iva: IVA_PRECIO.incluido, moneda: MONEDA.pesos,
    ...resto
  };
}

/**
 * Los seis que existen hoy: los cuatro niveles del landing, el de niños y el
 * de pequeños, que se suman a cualquiera.
 *
 * **Sin el prefijo "Menú"**, que es como se llaman en el sitio público, en el
 * landing y en CLAUDE.md. Esta lista es solo el punto de partida: vive en la
 * planilla y se edita ahí.
 */
/**
 * Los precios nacen en CERO a propósito, o sea sin poner.
 *
 * Los montos existen escritos en el proyecto, pero están incompletos —hay
 * precio en línea para dos de los cinco y precio en el local para otros
 * cuatro— y son de la tienda de desarrollo. Sembrar una tabla a medias es
 * peor que dejarla vacía: la mitad correcta hace confiar en la otra mitad.
 * Los llena el cliente en /menus, que es de donde salen los precios.
 */
export const POR_DEFECTO_MENUS: Menu[] = [
  nuevoProducto({ nombre: 'Tradiciones' }),
  nuevoProducto({ nombre: 'Lo Pirque' }),
  nuevoProducto({ nombre: 'A Brasas abiertas' }),
  nuevoProducto({ nombre: 'Sommelier' }),
  nuevoProducto({ nombre: 'Niños' }),
  // Publicado en la tienda el 2026-11-02, de 0 a 3 años. Nació allá como
  // "Menú de pequeños" —con prefijo, al revés que los otros cinco— y el
  // cliente lo renombró a "Pequeños" el mismo día, así que canonizar()
  // empareja. Si vuelven a no calzar, desconocidos() lo reporta en
  // amarillo: ése es el aviso, no un error.
  nuevoProducto({ nombre: 'Pequeños' })
];

/** Un monto escrito a mano. Aguanta "$44.000", "44000" y "44 000". */
export function aMonto(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/**
 * Un precio que puede llevar decimales, para la UF: "2,61", "2.61", "$1.500.000".
 *
 * Un punto seguido de tres dígitos es separador de miles (formato chileno);
 * cualquier otro punto o coma es el decimal. Redondea a dos decimales.
 */
export function aPrecio(v: unknown): number {
  const crudo = String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const n = Number(crudo);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

/** "sí", "si", "x", "true", "1" son sí; lo demás es no. */
function esSiCelda(v: unknown): boolean {
  return ['si', 'sí', 'x', 'true', '1', 'yes'].includes(String(v ?? '').trim().toLowerCase());
}

/** Una celda que tiene que ser uno de unos valores fijos; si no, el defecto. */
function unoDe<T extends string>(v: unknown, valores: readonly T[], porDefecto: T): T {
  const buscado = normalizar(String(v ?? ''));
  return valores.find((x) => normalizar(x) === buscado) ?? porDefecto;
}

/** Las filas de la pestaña `Menús` como lista. */
export function leerMenusDe(filas: string[][]): Menu[] {
  const salida: Menu[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    const f = filas[i] ?? [];
    // **Una celda en blanco vale lo que vale `nuevoProducto()`**: las filas
    // escritas antes del catálogo no tienen estas columnas, y tienen que
    // seguir siendo exactamente lo que eran — menús que se venden en el
    // sitio y que no se cotizan.
    const blanco = (k: number) => String(f[k] ?? '').trim() === '';
    const base = nuevoProducto({ nombre });
    salida.push({
      nombre,
      precioEnLinea: aMonto(f[1]),
      precioEnLocal: aMonto(f[2]),
      tipo: unoDe(f[3], Object.values(TIPO_PRODUCTO), base.tipo),
      sitioPublico: blanco(4) ? base.sitioPublico : esSiCelda(f[4]),
      cotizacion: blanco(5) ? base.cotizacion : esSiCelda(f[5]),
      cobro: unoDe(f[6], Object.values(COBRO), base.cobro),
      precioCotizacion: aPrecio(f[7]),
      iva: unoDe(f[8], Object.values(IVA_PRECIO), base.iva),
      moneda: unoDe(f[9], Object.values(MONEDA), base.moneda)
    });
  }
  return salida;
}

/** La lista como filas, para escribirla de vuelta. */
export function aFilasMenus(menus: Menu[]): string[][] {
  // Un precio en cero se escribe en blanco, no como "0": en la planilla un
  // cero se lee como "vale cero" y lo que queremos decir es "sin poner".
  const monto = (n: number) => (n > 0 ? String(n) : '');
  const siNo = (b: boolean) => (b ? 'sí' : 'no');
  return [
    Object.values(COL_MENUS),
    ...menus.map((m) => [
      m.nombre, monto(m.precioEnLinea), monto(m.precioEnLocal),
      m.tipo, siNo(m.sitioPublico), siNo(m.cotizacion), m.cobro,
      monto(m.precioCotizacion), m.iva, m.moneda
    ])
  ];
}

/**
 * Lo que ofrece el formulario de reserva a mano: los menús que se venden en
 * el sitio. Una once o un show no son un menú que se cocine por persona en
 * una reserva del día, así que no aparecen ahí.
 */
export function paraReservar(menus: Menu[]): Menu[] {
  return menus.filter((m) => m.tipo === TIPO_PRODUCTO.menu && m.sitioPublico);
}

/** Lo que se puede cotizar. */
export function paraCotizar(menus: Menu[]): Menu[] {
  return menus.filter((m) => m.cotizacion);
}

/**
 * El precio que propone una cotización: el suyo, y si no tiene, el de pagar
 * en el local —que es el que muestra el landing B2B—. Cero si no hay ninguno.
 */
export function precioParaCotizar(m: Menu | undefined): number {
  if (!m) return 0;
  return m.precioCotizacion || m.precioEnLocal || m.precioEnLinea;
}

/**
 * El precio que corresponde a un menú según cómo se paga.
 *
 * Devuelve 0 si no hay precio puesto, y quien llame decide qué hacer con
 * eso. Acá no se adivina el otro precio ni se inventa un recargo: el
 * recargo de pagar en el local es dato del negocio y puede cambiar.
 */
export function precioDe(menu: Menu | undefined, enElLocal: boolean): number {
  if (!menu) return 0;
  return enElLocal ? menu.precioEnLocal : menu.precioEnLinea;
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

/**
 * Lo que llega del navegador, convertido en un producto válido.
 *
 * Pasa por las mismas reglas que una celda de la planilla: un tipo, un cobro
 * o una moneda que no existen vuelven a su valor de siempre en vez de quedar
 * escritos. Lo que se guarda es exactamente lo que se va a volver a leer.
 */
export function limpiarProducto(m: Partial<Record<keyof Menu, unknown>>): Menu {
  const base = nuevoProducto({ nombre: String(m?.nombre ?? '').trim() });
  return {
    ...base,
    precioEnLinea: aMonto(m?.precioEnLinea),
    precioEnLocal: aMonto(m?.precioEnLocal),
    tipo: unoDe(m?.tipo, Object.values(TIPO_PRODUCTO), base.tipo),
    sitioPublico: typeof m?.sitioPublico === 'boolean' ? m.sitioPublico : base.sitioPublico,
    cotizacion: typeof m?.cotizacion === 'boolean' ? m.cotizacion : base.cotizacion,
    cobro: unoDe(m?.cobro, Object.values(COBRO), base.cobro),
    precioCotizacion: aPrecio(m?.precioCotizacion),
    iva: unoDe(m?.iva, Object.values(IVA_PRECIO), base.iva),
    moneda: unoDe(m?.moneda, Object.values(MONEDA), base.moneda)
  };
}
