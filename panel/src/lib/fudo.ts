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
import { estaRectificada, personasEfectivas, menuEfectivo, descuentoVigente, porAprobar, rechazado,
         type Rectificacion } from './rectificacion.ts';
import { leerAgregados, A_LA_CARTA } from './mesa.ts';
import { IVA, cuentasDe, folioDe, type LineaPresupuesto, type Presupuesto } from './presupuestos.ts';
import { COBRO, IVA_PRECIO, MONEDA, precioParaCotizar } from './menus.ts';

/**
 * **Lo acordado en la cotización ganada** (2026-11-20, lo pidió el cliente):
 * *"si el arriendo estándar es 2,5 millones más IVA, pero se acordó un
 * descuento o un precio fijo para el show ecuestre o para el arriendo…
 * tiene que cerrarlo de esta forma"*. Una línea por línea de la cotización,
 * tal como se firmó, para que quien cierra la mesa la ingrese en Fudo con
 * esos precios y no con los de la carta.
 *
 * **El número que manda es el de Fudo, con IVA** (lo pidió el cliente el
 * mismo día: *"Fudo siempre cuenta con IVA… eso es el valor que tiene que
 * ingresar"*). Cada línea dice en grande cuánto se ingresa —el precio con
 * IVA y con su descuento— y abajo, chico, cómo se acordó: *+ IVA* o *IVA
 * incluido*, y el precio de lista si se negoció otro.
 *
 * **Solo lo reciben el encargado de turno, operaciones y los roles de
 * arriba** (y el vendedor, de lo suyo): la anfitriona sigue viendo la caja
 * de siempre, sin el detalle. Lo decide la ruta, no esta función.
 */
export interface LineaAcordada {
  /** Qué es: *48 × Tradiciones*, *Arriendo del recinto*. */
  que: string;
  /** Lo que se ingresa en Fudo, con IVA: *$44.100 c/u · $2.116.800*. */
  enFudo: string;
  /** Cómo se acordó, para quien quiera comparar con la cotización. */
  detalle: string;
  /** El precio no es el de la lista, o lleva descuento: se marca. */
  distinto: boolean;
}

export interface Acordado {
  folio: string;
  /** Una por línea, en el orden de la cotización, y el descuento total al final. */
  lineas: LineaAcordada[];
  /** El total con IVA de la cotización: lo que se acordó por todo. */
  total: number;
}

export interface Ingreso {
  /** verde ya pagó · ámbar se cobra · cielo abonó una parte · rojo ojo. */
  tono: 'verde' | 'ambar' | 'cielo' | 'rojo';
  titulo: string;
  /** Una línea por menú, y lo que haga falta decir debajo. */
  lineas: string[];
  /** Lo acordado en la cotización, si la reserva viene de una y la cuenta puede verlo. */
  acordado?: Acordado;
}

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/** El menú de la carta, aunque la reserva lo diga con el "Menú" adelante. */
const comparable = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/^menu\s+/, '').trim();
const enCarta = (nombre: string, menus: Menu[]) =>
  menus.find((m) => comparable(m.nombre) === comparable(nombre));

/**
 * **La gente que se sumó a la mesa** (2026-11-17, `mesa.ts`): se cobra
 * aparte, sea cual sea el pago de la reserva. Un menú agregado, al precio del
 * local —no pagó por adelantado—; *a la carta*, lo que consuma.
 */
function lineasAgregados(agregados: string | undefined, menus: Menu[]): string[] {
  return leerAgregados(agregados).map((a) => {
    if (a.menu === A_LA_CARTA) return `+ ${a.cantidad} a la carta · se cobra lo que consuman`;
    const precio = enCarta(a.menu, menus)?.precioEnLocal ?? 0;
    return precio > 0
      ? `+ ${a.cantidad} × ${a.menu} a ${pesos(precio)} · agregado, se cobra aparte`
      : `+ ${a.cantidad} × ${a.menu} · agregado, se cobra aparte`;
  });
}

/**
 * **Lo acordado, línea por línea**, de la cotización ganada `p` con sus
 * líneas. El precio de lista sale del catálogo (`precioParaCotizar()`, el
 * mismo que propone una cotización nueva) y se escribe solo cuando el
 * acordado es otro: así lo que se negoció salta a la vista.
 *
 * - **En Fudo, con IVA**: el precio de la línea con su descuento, y si se
 *   acordó *+ IVA*, multiplicado por 1,19. Redondeado al peso, que es lo que
 *   se escribe en Fudo; el total de la línea es ese precio por la cantidad.
 * - **Un monto fijo** (arriendo, show) va sin cantidad: va o no va.
 * - **A cero** dice *$0 · incluido, sin costo*: el show de un día público, o
 *   una cortesía. Para quien cierra la mesa es lo mismo: no se cobra.
 * - **En UF** no se compara con la lista, porque la UF de la cotización
 *   quedó fija el día que se cotizó; se dice el precio en pesos acordado.
 * - El total es el de la cotización (`cuentasDe()`), con el descuento sobre
 *   el total y el IVA: el mismo número del documento que firmó el cliente.
 */
export function acordadoDe(
  p: Pick<Presupuesto, 'id' | 'descuento'>,
  lineas: LineaPresupuesto[],
  menus: Menu[]
): Acordado {
  const propias = lineas.filter((l) => l.presupuesto === p.id);
  const salida: LineaAcordada[] = propias.map((l) => {
    const m = enCarta(l.concepto, menus);
    const fijo = m?.cobro === COBRO.fijo;
    const cantidad = fijo ? 1 : Math.max(0, l.cantidad);
    const que = fijo ? l.concepto : `${cantidad} × ${l.concepto}`;
    if (l.precio <= 0) {
      return { que, enFudo: '$0 · incluido, sin costo', detalle: '', distinto: false };
    }
    const masIva = l.ivaIncluido === false;
    const d = Number(l.descuento) || 0;
    const unidad = Math.round(l.precio * (1 - d / 100) * (masIva ? 1 + IVA : 1));
    const enUF = (l.precioUF ?? 0) > 0 || m?.moneda === MONEDA.uf;
    const lista = enUF ? 0 : precioParaCotizar(m);
    const otroPrecio = lista > 0 && Math.round(l.precio) !== Math.round(lista);
    const ivaLista = m?.iva === IVA_PRECIO.mas ? ' + IVA' : ' IVA incluido';
    return {
      que,
      enFudo: cantidad > 1 ? `${pesos(unidad)} c/u · ${pesos(unidad * cantidad)}` : pesos(unidad),
      detalle: `acordado ${pesos(l.precio)}${masIva ? ' + IVA' : ' IVA incluido'}`
        + (d > 0 ? ` · −${d}%` : '')
        + (otroPrecio ? ` · lista ${pesos(lista)}${ivaLista}` : '')
        + (enUF ? ' · en UF, a la UF de la cotización' : ''),
      distinto: otroPrecio || d > 0
    };
  });
  const dTotal = Number(p.descuento) || 0;
  if (dTotal > 0) {
    salida.push({ que: 'Descuento sobre el total', enFudo: `−${dTotal}% a la cuenta`, detalle: '', distinto: true });
  }
  return { folio: folioDe(p), lineas: salida, total: cuentasDe(propias, dTotal).total };
}

/**
 * **Lo acordado de cada reserva que nació de una cotización**, por id de
 * reserva. La cotización es la que tiene esa reserva en su `ID Reserva`:
 * la ganada. Puro: las rutas le pasan lo que ya leyeron en su tanda.
 */
export function acordadosPorReserva(
  presupuestos: Pick<Presupuesto, 'id' | 'descuento' | 'idReserva'>[],
  lineas: LineaPresupuesto[],
  menus: Menu[]
): Map<string, Acordado> {
  const salida = new Map<string, Acordado>();
  for (const p of presupuestos) {
    if (!p.idReserva) continue;
    salida.set(p.idReserva, acordadoDe(p, lineas, menus));
  }
  return salida;
}

export function comoIngresar(
  r: Pick<Reserva, 'id' | 'menu' | 'tipoPago' | 'estadoPago' | 'monto'>
    & { abonado?: number | null; personas?: number; agregados?: string } & Rectificacion,
  menus: Menu[],
  deCotizacion = false,
  /** Lo acordado en su cotización, para las cuentas que pueden verlo. */
  acordado?: Acordado
): Ingreso | null {
  if (liberaCupo(r.estadoPago)) return null;
  const estado = String(r.estadoPago || '').trim().toLowerCase();
  // **Lo rectificado manda** (2026-11-12): los menús que de verdad se
  // sirvieron, las personas que llegaron y el descuento ya aprobado.
  const rectificada = estaRectificada(r);
  const platos = desglosarMenu(menuEfectivo(r), menus);
  const reservadas = Number(r.personas) || 0;
  const reales = personasEfectivas({ personas: reservadas, ...r });
  const dif = rectificada ? reales - reservadas : 0;
  const desc = descuentoVigente(r);
  const pedido = Number(r.descuento) || 0;
  const notasRect: string[] = !rectificada ? [] : [
    ...(dif !== 0 ? [`✎ Rectificada: ${reservadas} → ${reales} personas`] : []),
    ...(porAprobar(r) && pedido > 0 ? [`Descuento de ${pedido}% por aprobar: no lo ingreses todavía.`] : []),
    ...(rechazado(r) && pedido > 0 ? [`El descuento de ${pedido}% no fue aprobado.`] : [])
  ];
  const conDescuento = (total: number) => desc > 0 ? Math.round(total * (1 - desc / 100)) : total;
  const deShopify = !deCotizacion && !esManual(r.id);
  const directo = deShopify && r.tipoPago === TIPO_PAGO.directo;
  // Con lo acordado a mano, las líneas de la cotización reemplazan a la lista
  // de menús: dicen lo mismo y además el arriendo, el show y los descuentos.
  const conAcordado = deCotizacion && !!acordado;
  const extra = conAcordado ? { acordado } : {};

  if (estado === ESTADO_PAGO.pagado) {
    return {
      tono: 'verde',
      titulo: 'Ya pagó · ingrésalo como pago directo',
      ...extra,
      lineas: [
        ...(conAcordado ? [] : platos.map((p) => `${p.cantidad} × ${p.menu} · pago directo`)),
        ...notasRect,
        ...(dif > 0 ? [`Llegaron ${dif} más de lo pagado: cóbralos aparte a precio del local.`] : []),
        ...(dif < 0 ? [`Llegaron ${-dif} menos: lo pagado no se devuelve desde acá, avísale a quien paga.`] : []),
        ...(desc > 0 ? [`Descuento −${desc}% sobre lo que se cobre aparte.`] : []),
        ...lineasAgregados(r.agregados, menus),
        conAcordado ? 'No se le cobra lo de la cotización: lo que consuma aparte, sí.'
          : 'No se le cobra el menú: lo que consuma aparte, sí.'
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
  // De una cotización, si cambió la gente se cobra lo acordado por persona.
  const porPersona = deCotizacion && reservadas > 0 && (r.monto ?? 0) > 0 ? (r.monto ?? 0) / reservadas : 0;
  const lineasMenu = deCotizacion
    ? [...(conAcordado ? [] : platos.map((p) => `${p.cantidad} × ${p.menu}`)),
       ...(dif !== 0 && porPersona > 0 ? [`Acordado por persona: ${pesos(porPersona)} × ${reales}`] : [])]
    : conPrecio.map((p) => p.precio > 0
      ? `${p.cantidad} × ${p.menu} a ${pesos(p.precio)} · sin descuento`
      : `${p.cantidad} × ${p.menu} · sin precio en Productos`);
  const bruto = deCotizacion
    ? (dif !== 0 && porPersona > 0 ? Math.round(porPersona * reales) : (r.monto ?? 0))
    : todosConPrecio ? deCarta : (r.monto ?? 0);
  const total = conDescuento(bruto);
  const lineaDescuento = desc > 0 && bruto > 0 ? [`Descuento −${desc}%: −${pesos(bruto - total)}`] : [];

  if (estado === ESTADO_PAGO.abonado) {
    const abonado = r.abonado ?? 0;
    const resto = total > 0 && abonado > 0 ? Math.max(0, total - abonado) : 0;
    return {
      tono: 'cielo',
      titulo: abonado > 0 ? `Abonó ${pesos(abonado)} · cobra el resto` : 'Abonó una parte · cobra el resto',
      ...extra,
      lineas: [
        ...lineasMenu,
        ...notasRect,
        ...lineaDescuento,
        resto > 0 ? `${conAcordado ? 'Falta por cobrar, con IVA' : 'Falta por cobrar'}: ${pesos(resto)}` : 'Pregúntale al jefe de turno cuánto falta.',
        ...lineasAgregados(r.agregados, menus)
      ]
    };
  }

  return {
    tono: 'ambar',
    titulo: deCotizacion ? 'Por pagar · precio de la cotización'
      : deShopify ? 'Solo reserva · cobra el precio sin descuento'
      : 'Por pagar · cobra el precio sin descuento',
    ...extra,
    lineas: [
      ...lineasMenu,
      ...notasRect,
      ...lineaDescuento,
      // Con lo acordado a la vista, su total ya está en la caja: se repite
      // solo si es otro (llegó otra cantidad de gente, o hay un descuento del día).
      ...(total > 0 && !(conAcordado && total === acordado?.total)
        ? [`${conAcordado ? 'Total a cobrar, con IVA' : 'Total a cobrar'}: ${pesos(total)}`] : []),
      // Con lo acordado a la vista, su título ya lo dice.
      ...(deCotizacion && !conAcordado ? ['Es lo acordado en la cotización, no el precio de la carta.'] : []),
      ...lineasAgregados(r.agregados, menus)
    ]
  };
}
