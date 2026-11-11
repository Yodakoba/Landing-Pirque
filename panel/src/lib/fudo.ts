/**
 * **Cómo se ingresa una reserva en Fudo** (2026-11-11, lo pidió el cliente).
 *
 * Quien recibe a la gente —la anfitriona o el jefe de turno— abre la mesa en
 * Fudo, que es donde se cobra. Lo que tiene que saber a primera vista es una
 * sola cosa: **con qué precio la ingresa**.
 *
 * - **Ya pagó** (pago directo en Shopify, o una reserva marcada Pagada): se
 *   ingresa como *pago directo*. No se le cobra el menú.
 * - **Solo reserva / por pagar**: se cobra **el precio sin descuento**, el de
 *   pagar en el local —Tradiciones a $49.000, no a $44.000—.
 * - **Abonada**: ya dejó una parte; se cobra el resto.
 * - **De una cotización**: el precio es el acordado, no el de la carta.
 * - **Compró pago directo y no pagó**: es la señal de que la regla de medios
 *   de pago de Shopify no aplicó. No se adivina: se avisa al jefe de turno.
 *
 * Es pura y la calcula el servidor, así la pantalla de la entrada recibe la
 * instrucción ya armada y no los datos con que se arma.
 */
import type { Reserva } from './tipos.ts';
import { ESTADO_PAGO, TIPO_PAGO, esManual } from './columnas.ts';
import { liberaCupo } from './pagos.ts';
import { desglosarMenu } from './shopify.ts';
import type { Menu } from './menus.ts';

export interface Ingreso {
  /** verde ya pagó · ámbar se cobra · cielo abonó una parte · rojo ojo. */
  tono: 'verde' | 'ambar' | 'cielo' | 'rojo';
  titulo: string;
  /** Una línea por menú, y lo que haga falta decir debajo. */
  lineas: string[];
}

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/** El menú de la carta, aunque la reserva lo diga con el "Menú" adelante. */
const comparable = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/^menu\s+/, '').trim();
const enCarta = (nombre: string, menus: Menu[]) =>
  menus.find((m) => comparable(m.nombre) === comparable(nombre));

export function comoIngresar(
  r: Pick<Reserva, 'id' | 'menu' | 'tipoPago' | 'estadoPago' | 'monto'> & { abonado?: number | null },
  menus: Menu[],
  deCotizacion = false
): Ingreso | null {
  if (liberaCupo(r.estadoPago)) return null;
  const estado = String(r.estadoPago || '').trim().toLowerCase();
  const platos = desglosarMenu(r.menu, menus);
  const deShopify = !deCotizacion && !esManual(r.id);
  const directo = deShopify && r.tipoPago === TIPO_PAGO.directo;

  if (estado === ESTADO_PAGO.pagado) {
    return {
      tono: 'verde',
      titulo: 'Ya pagó · ingrésalo como pago directo',
      lineas: [
        ...platos.map((p) => `${p.cantidad} × ${p.menu} · pago directo`),
        'No se le cobra el menú: lo que consuma aparte, sí.'
      ]
    };
  }

  if (directo) {
    return {
      tono: 'rojo',
      titulo: 'Compró pago directo pero no aparece pagado',
      lineas: ['Antes de abrir la mesa, avísale al jefe de turno: no la ingreses todavía.']
    };
  }

  // Lo que hay que cobrar del menú: el acordado en una cotización, o el
  // precio sin descuento de cada menú.
  const conPrecio = platos.map((p) => {
    const m = enCarta(p.menu, menus);
    return { ...p, precio: m?.precioEnLocal ?? 0 };
  });
  const todosConPrecio = conPrecio.length > 0 && conPrecio.every((p) => p.precio > 0);
  const deCarta = conPrecio.reduce((n, p) => n + p.cantidad * p.precio, 0);
  const lineasMenu = deCotizacion
    ? platos.map((p) => `${p.cantidad} × ${p.menu}`)
    : conPrecio.map((p) => p.precio > 0
      ? `${p.cantidad} × ${p.menu} a ${pesos(p.precio)} · sin descuento`
      : `${p.cantidad} × ${p.menu} · sin precio en Productos`);
  const total = deCotizacion ? (r.monto ?? 0) : todosConPrecio ? deCarta : (r.monto ?? 0);

  if (estado === ESTADO_PAGO.abonado) {
    const abonado = r.abonado ?? 0;
    const resto = total > 0 && abonado > 0 ? Math.max(0, total - abonado) : 0;
    return {
      tono: 'cielo',
      titulo: abonado > 0 ? `Abonó ${pesos(abonado)} · cobra el resto` : 'Abonó una parte · cobra el resto',
      lineas: [
        ...lineasMenu,
        resto > 0 ? `Falta por cobrar: ${pesos(resto)}` : 'Pregúntale al jefe de turno cuánto falta.'
      ]
    };
  }

  return {
    tono: 'ambar',
    titulo: deCotizacion ? 'Por pagar · precio de la cotización'
      : deShopify ? 'Solo reserva · cobra el precio sin descuento'
      : 'Por pagar · cobra el precio sin descuento',
    lineas: [
      ...lineasMenu,
      ...(total > 0 ? [`Total a cobrar: ${pesos(total)}`] : []),
      ...(deCotizacion ? ['Es lo acordado en la cotización, no el precio de la carta.'] : [])
    ]
  };
}
