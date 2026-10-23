/**
 * Traducir un pedido de Shopify a una fila de la planilla.
 *
 * Esto es un puerto de lo que ya hacía `leerReserva()` en el Apps Script
 * (backend/Codigo.gs), y las decisiones vienen de ahí: no son nuevas, están
 * pagadas con horas de mirar pedidos reales. Lo que cambia es el destino
 * —las 12 columnas del panel en vez de las 15 de la planilla vieja— y que
 * acá se puede probar.
 *
 * No hay nada de red en este archivo, a propósito: recibe el objeto del
 * pedido y devuelve la reserva. Así las reglas raras de Shopify se prueban
 * con pedidos de mentira en vez de descubrirse en producción.
 */
import { TIPO_PAGO, ESTADO_PAGO } from './columnas.ts';
import type { Reserva } from './tipos.ts';
import { esFecha } from './fechas.ts';
import { canonizar, type Menu } from './menus.ts';
import { telefonoNormal, correoNormal } from './contacto.ts';

/** Lo que nos importa de un pedido. El resto del objeto de Shopify es enorme. */
export interface PedidoShopify {
  id?: number | string;
  name?: string;
  email?: string;
  contact_email?: string;
  phone?: string;
  total_price?: string | number;
  created_at?: string;
  cancelled_at?: string | null;
  financial_status?: string;
  customer?: Record<string, unknown> | null;
  billing_address?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
  line_items?: LineaShopify[];
}

export interface LineaShopify {
  title?: string;
  variant_title?: string;
  quantity?: number | string;
  properties?: { name?: string; value?: string }[];
}

const texto = (v: unknown): string => (v == null ? '' : String(v)).trim();

/**
 * En qué está el pedido.
 *
 * Una cancelación gana sobre cualquier estado de pago: un pedido anulado
 * conserva su `financial_status`, así que mirar solo ese campo deja una
 * reserva cancelada tomando cupo hasta que alguien procese la devolución.
 *
 * Que `authorized` quede como pendiente es a propósito: la tarjeta está
 * retenida pero la plata no se cobró. Equivocarse hacia "falta cobrar" hace
 * que alguien lo revise; equivocarse hacia "pagada" hace que nadie lo
 * revise.
 */
export function estadoDe(p: PedidoShopify): string {
  if (p.cancelled_at) return ESTADO_PAGO.cancelado;
  const f = texto(p.financial_status).toLowerCase();
  if (f === 'refunded') return ESTADO_PAGO.reembolsado;
  if (f === 'voided') return ESTADO_PAGO.anulado;
  if (f === 'paid') return ESTADO_PAGO.pagado;
  return ESTADO_PAGO.pendiente;
}

/**
 * El nombre, mirando los tres lugares donde Shopify lo puede tener.
 *
 * No es paranoia: `customer` viene vacío en dos casos distintos. Uno, que
 * el pedido no tenga cliente asociado. Dos, y más común, que la app no
 * tenga el permiso de datos protegidos del cliente — `read_orders` por sí
 * solo no alcanza, y Shopify devuelve el pedido completo **omitiendo las
 * llaves** del nombre, el correo y el teléfono, sin avisar que los censuró.
 *
 * En ese segundo caso las direcciones también vienen censuradas y este
 * respaldo no salva nada, pero en el primero sí, y cuesta seis líneas.
 */
export function nombreDe(p: PedidoShopify): string {
  const c = (p.customer ?? {}) as Record<string, unknown>;
  const porCliente = `${texto(c.first_name)} ${texto(c.last_name)}`.trim();
  if (porCliente) return porCliente;

  const dir = ((p.billing_address ?? p.shipping_address) ?? {}) as Record<string, unknown>;
  const porDireccion = texto(dir.name);
  if (porDireccion) return porDireccion;

  return `${texto(dir.first_name)} ${texto(dir.last_name)}`.trim();
}

/**
 * El correo. `email` es el que la persona escribió en el checkout y es el
 * que corresponde; `customer.email` es el de la ficha del cliente y puede
 * ser otro si reservó con un correo distinto al de su cuenta.
 */
export function emailDe(p: PedidoShopify): string {
  const c = (p.customer ?? {}) as Record<string, unknown>;
  // En minúsculas, por lo mismo que el teléfono se empareja: `Ana@X.CL` y
  // `ana@x.cl` son la misma casilla y dos cadenas distintas.
  return correoNormal(texto(p.email) || texto(p.contact_email) || texto(c.email));
}

/**
 * El teléfono, y acá estaba el hueco: `order.phone` viene vacío casi
 * siempre. El checkout no pide un teléfono suelto, lo pide DENTRO de la
 * dirección, así que el número está en `billing_address.phone`.
 *
 * Mirar solo `order.phone` y `customer.phone` era quedarse con los dos
 * lugares que normalmente están vacíos.
 */
export function telefonoDe(p: PedidoShopify): string {
  const c = (p.customer ?? {}) as Record<string, unknown>;
  const fact = (p.billing_address ?? {}) as Record<string, unknown>;
  const envio = (p.shipping_address ?? {}) as Record<string, unknown>;
  const crudo = texto(p.phone) || texto(fact.phone) || texto(envio.phone)
                || texto(c.phone);
  // Shopify lo entrega como lo escribió el cliente en el checkout: con +56,
  // sin él, con puntos. Se guarda con la forma del panel para que la columna
  // sirva para algo después —mandar un WhatsApp, cruzar con una ficha— sin
  // tener que adivinar el formato fila por fila. Un número extranjero se
  // guarda tal cual: `telefonoNormal` solo toca lo que reconoce.
  return telefonoNormal(crudo);
}

/** La fecha viaja en `_booking_date`, que el sitio pone en cada línea. */
export function fechaDe(p: PedidoShopify): string | null {
  for (const l of p.line_items ?? []) {
    for (const prop of l.properties ?? []) {
      if (prop.name === '_booking_date' && prop.value) {
        const f = texto(prop.value).slice(0, 10);
        if (esFecha(f)) return f;
      }
    }
  }
  return null;
}

/**
 * Qué modalidad se compró, sacada del nombre de la variante.
 *
 * Se anota porque **el sitio no controla cómo se paga**: el medio de pago
 * se elige en el checkout de Shopify. Alguien puede comprar la variante con
 * descuento y después elegir pagar en el local. Eso lo cierran las reglas
 * de la tienda, que son del lado de Shopify y **si dejan de aplicar no
 * avisan**: una fila que diga "Pago directo" junto a "pending" es
 * exactamente ese caso, y es la única forma de enterarse.
 */
export function tipoPagoDe(p: PedidoShopify): string {
  const vistas: string[] = [];
  for (const l of p.line_items ?? []) {
    const v = texto(l.variant_title);
    if (v && !vistas.includes(v)) vistas.push(v);
  }
  if (!vistas.length) return '';
  // Un pedido con las dos modalidades no debería existir, pero si existe se
  // anota tal cual en vez de elegir una: inventar una sola esconde el caso.
  return vistas.join(' + ');
}

/**
 * Las personas del pedido: adultos más niños.
 *
 * **El cupo son personas totales, niños incluidos** — es lo que limita
 * sillas, mesas y comida. Por eso va un solo número y no dos columnas.
 */
export function personasDe(p: PedidoShopify): number {
  let total = 0;
  for (const l of p.line_items ?? []) total += Number(l.quantity) || 0;
  return total;
}

/** El separador entre la cantidad y el menú. Un solo lugar, para leer y escribir. */
export const POR = ' × ';

/**
 * Qué se pidió y cuánto de cada cosa: `"2 × Menú Tradiciones + 1 × Menú Niños"`.
 *
 * **Antes decía solo `"Menú Tradiciones"`**, sin cantidades y **sin el menú
 * de niños**, que quedaba fuera a propósito por pensarse como "qué comen los
 * adultos". Con eso un pedido de 2 Tradiciones + 1 Niños se veía igual que
 * uno de 3 Tradiciones, y **la cocina no podía saber qué preparar**. Las
 * personas ya iban juntas en su columna; lo que faltaba era el desglose.
 *
 * Va como texto y no en columnas nuevas porque los menús cambian —hoy son
 * tres, mañana pueden ser cuatro— y una columna por menú obligaría a tocar
 * la planilla cada vez. Así también se lee solo para quien abra la hoja.
 */
export function menuDe(p: PedidoShopify, menus?: Menu[]): string {
  // Se acumula por título: dos líneas del mismo menú en modalidades distintas
  // son el mismo plato para la cocina.
  //
  // Se canoniza al ESCRIBIR, para que la planilla vaya quedando con un solo
  // nombre por plato. Y se vuelve a canonizar al leer, porque las filas ya
  // escritas y lo anotado a mano no pasan por acá.
  const porMenu = new Map<string, number>();
  for (const l of p.line_items ?? []) {
    const t = canonizar(texto(l.title), menus);
    if (!t) continue;
    porMenu.set(t, (porMenu.get(t) ?? 0) + (Number(l.quantity) || 0));
  }
  return [...porMenu]
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n}${POR}${t}`)
    .join(' + ');
}

/**
 * Lo contrario: de `"2 × Menú Tradiciones + 1 × Menú Niños"` a la lista.
 *
 * **Tolera el formato viejo y lo escrito a mano.** Una entrada sin cantidad
 * —`"Menú Tradiciones"`, que es como quedaron las filas anteriores a este
 * cambio y como alguien lo escribiría en la planilla— cuenta como 1. Es
 * preferible contar de menos que no contar: una fila vieja sigue sumando al
 * total del día en vez de desaparecer de él.
 *
 * Se aceptan `×` y `x`, porque en un teclado se escribe la equis.
 */
export function desglosarMenu(
  texto: unknown, menus?: Menu[]
): { menu: string; cantidad: number }[] {
  const salida: { menu: string; cantidad: number }[] = [];
  for (const parte of String(texto ?? '').split('+')) {
    const t = parte.trim();
    if (!t) continue;
    const m = /^(\d+)\s*[×x]\s*(.+)$/i.exec(t);
    // Canonizar acá es lo que hace que "Menú Tradiciones" de una fila vieja
    // y "Tradiciones" de una nueva se sumen como el mismo plato.
    const menu = canonizar((m ? m[2] : t).trim(), menus);
    const cantidad = m ? Number(m[1]) : 1;
    if (!menu) continue;
    const ya = salida.find((x) => x.menu === menu);
    if (ya) ya.cantidad += cantidad;
    else salida.push({ menu, cantidad });
  }
  return salida;
}

/**
 * El total por menú de un conjunto de reservas: lo que mira la cocina.
 *
 * Ordenado de mayor a menor, que es como se lee una lista de preparación.
 */
export function menusDe(
  reservas: { menu: string }[], menus?: Menu[]
): { menu: string; cantidad: number }[] {
  const total = new Map<string, number>();
  for (const r of reservas) {
    for (const { menu, cantidad } of desglosarMenu(r.menu, menus)) {
      total.set(menu, (total.get(menu) ?? 0) + cantidad);
    }
  }
  return [...total]
    .map(([menu, cantidad]) => ({ menu, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.menu.localeCompare(b.menu));
}

/**
 * El pedido completo como fila de la planilla.
 *
 * Devuelve `null` si el pedido no trae `_booking_date`: entonces no es una
 * reserva —puede ser cualquier otra cosa vendida en la tienda— y anotarlo
 * descontaría cupo de un día que nadie reservó.
 *
 * `asistencia` va en blanco siempre: es una marca que pone una persona el
 * día del evento, no un dato de Shopify. Y por eso mismo **el
 * sincronizador no puede escribirla**: ver `camposDeShopify()`.
 */
export function aReserva(p: PedidoShopify, menus?: Menu[]): Omit<Reserva, 'fila'> | null {
  const fecha = fechaDe(p);
  if (!fecha) return null;

  return {
    id: texto(p.id),
    fecha,
    nombre: nombreDe(p),
    email: emailDe(p),
    telefono: telefonoDe(p),
    menu: menuDe(p, menus),
    personas: personasDe(p),
    monto: p.total_price == null || texto(p.total_price) === ''
      ? null
      : Number(p.total_price),
    tipoPago: tipoPagoDe(p) as Reserva['tipoPago'],
    estadoPago: estadoDe(p),
    creada: texto(p.created_at),
    asistencia: ''
  };
}

/**
 * Lo que el sincronizador escribe al actualizar una fila que ya existe.
 *
 * **Deja fuera `asistencia` a propósito, y esa omisión es el punto.** Si
 * Shopify pisara esa columna, un pedido que se actualiza —un pago que se
 * confirma, una devolución— borraría el no-show que alguien marcó a mano el
 * sábado. Los datos de Shopify son de Shopify; la asistencia es nuestra.
 *
 * Tampoco se reescribe `creada`: la fecha en que entró el pedido no cambia.
 */
export function camposDeShopify(r: Omit<Reserva, 'fila'>): Partial<Reserva> {
  const { asistencia, creada, ...resto } = r;
  return resto;
}

/**
 * Los menús que ya se han vendido, sacados de las reservas que hay.
 *
 * **Para que el formulario manual ofrezca los nombres EXACTOS que usa
 * Shopify, en vez de una lista escrita a mano que se desincroniza.** Si
 * alguien anota "Tradiciones" donde Shopify escribe "Menú Tradiciones", el
 * total del día los cuenta como dos platos distintos y la cocina prepara
 * mal. Esto no puede pasar si los nombres salen del mismo lugar.
 *
 * El día uno, sin reservas, devuelve vacío y el formulario deja escribir el
 * nombre a mano. Es la única forma honesta de empezar: los nombres de los
 * productos son dato de la tienda, no nuestro.
 */
export function menusConocidos(
  reservas: { menu: string }[], menus?: Menu[]
): string[] {
  return menusDe(reservas, menus).map((m) => m.menu).sort((a, b) => a.localeCompare(b));
}

/** Arma el texto del menú desde un conteo por plato. Lo contrario de desglosarMenu(). */
export function componerMenu(cuenta: Record<string, number>): string {
  return Object.entries(cuenta)
    .filter(([, n]) => n > 0)
    .map(([menu, n]) => `${n}${POR}${menu}`)
    .join(' + ');
}

/** Cuántas personas son, según el conteo por plato. */
export function personasDeCuenta(cuenta: Record<string, number>): number {
  return Object.values(cuenta).reduce((s, n) => s + (Number(n) || 0), 0);
}
