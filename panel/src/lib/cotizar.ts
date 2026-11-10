/**
 * Las reglas de armar una cotización (Fase 2, 2026-11-10).
 *
 * Todo lo que el servidor decide al guardar vive acá, puro y con pruebas:
 * cuánta gente es cada línea, qué líneas siguen a los invitados, la regla del
 * show ecuestre y de dónde sale el cliente. La pantalla propone lo mismo
 * para que se vea mientras se escribe, pero **lo que se guarda lo decide
 * esto**, porque una llamada directa a la API tiene que obedecer las mismas
 * reglas que un clic.
 */
import { normalizar, estaCerrado, esPrivada } from './columnas.ts';
import { canonizar, TIPO_PRODUCTO, IVA_PRECIO, type Menu } from './menus.ts';
import {
  normalizarLineas, ESTADO_PRESUPUESTO, estadoNormal,
  type LineaEntrante, type LineaPresupuesto, type Presupuesto
} from './presupuestos.ts';
import type { Cliente } from './clientes.ts';
import type { FechaHabil } from './tipos.ts';

/** El producto del catálogo que corresponde a una línea, si hay uno. */
export function productoDe(concepto: string, catalogo: Menu[]): Menu | undefined {
  const nombre = canonizar(concepto, catalogo);
  return catalogo.find((m) => m.nombre === nombre);
}

/**
 * Si un día es **público**: está en `Fechas Hábiles`, abierto y no privado.
 *
 * Un día que no está en la hoja **cuenta como privado** (lo decidió el
 * cliente): una cotización para un martes cualquiera es un evento aparte,
 * no un día en que el restaurante abre al público.
 */
export function esDiaPublico(fecha: string, fechas: Pick<FechaHabil, 'fecha' | 'estado'>[]): boolean {
  const d = fechas.find((f) => f.fecha === fecha);
  if (!d) return false;
  return !estaCerrado(d.estado) && !esPrivada(d.estado);
}

/** El show ecuestre del catálogo: el primer producto de tipo Show. */
export function showDe(catalogo: Menu[]): Menu | undefined {
  // Uno desactivado ya no se agrega solo a un día público.
  return catalogo.find((m) => m.activo && m.tipo === TIPO_PRODUCTO.show);
}

/**
 * Deja las líneas listas para guardar, con las reglas del negocio:
 *
 * - **La gente sale del tipo del producto**: una línea de un producto de
 *   tipo Menú son tantas personas como su cantidad; cualquier otra —la once,
 *   el arriendo, el show, una línea libre— son cero. Ya no hay una columna
 *   de personas que alguien tenga que llenar a mano.
 * - **Las que siguen a los invitados toman su número**, aunque vengan con
 *   otra cantidad: si el cliente pasa de 40 a 55, la once pasa a 55.
 * - **El show ecuestre en un día público va siempre, incluido y a cero.**
 *   Si no viene, se agrega; si viene con precio, se le quita. En un día
 *   privado es una línea más, que se agrega o no y cobra su precio.
 */
export function prepararLineas(
  entrantes: LineaEntrante[],
  catalogo: Menu[],
  invitados: number,
  diaPublico: boolean
): Omit<LineaPresupuesto, 'fila'>[] {
  const show = showDe(catalogo);
  const lineas = normalizarLineas(entrantes).map((l) => {
    const prod = productoDe(l.concepto, catalogo);
    const cantidad = l.sigue && invitados > 0 ? invitados : l.cantidad;
    const esMenu = prod?.tipo === TIPO_PRODUCTO.menu;
    const esShow = !!prod && prod.tipo === TIPO_PRODUCTO.show;
    return {
      ...l,
      concepto: prod?.nombre ?? l.concepto,
      cantidad,
      personas: esMenu ? cantidad : 0,
      // En un día público el show va incluido: ni precio ni descuento.
      precio: esShow && diaPublico ? 0 : l.precio,
      descuento: esShow && diaPublico ? 0 : l.descuento
    };
  });
  if (diaPublico && show && !lineas.some((l) => l.concepto === show.nombre)) {
    lineas.push({
      presupuesto: lineas[0]?.presupuesto ?? '', concepto: show.nombre,
      cantidad: 1, precio: 0, personas: 0, descuento: 0, ivaIncluido: true, sigue: false
    });
  }
  return lineas;
}

/** Una línea nueva para un producto del catálogo, como la propone la pantalla. */
export function lineaDeProducto(
  m: Menu, presupuesto: string, invitados: number, precio: number
): Omit<LineaPresupuesto, 'fila'> {
  const porPersona = normalizar(m.cobro) === normalizar('Por persona');
  // Un menú por persona NO sigue a los invitados: 40 invitados pueden ser
  // 30 Tradiciones y 10 de niños. Lo que sigue es lo que toman todos, como
  // la once o el desayuno.
  const sigue = porPersona && m.tipo !== TIPO_PRODUCTO.menu;
  const cantidad = porPersona ? Math.max(1, invitados) : 1;
  return {
    presupuesto, concepto: m.nombre, cantidad, precio,
    personas: m.tipo === TIPO_PRODUCTO.menu ? cantidad : 0,
    descuento: 0, ivaIncluido: m.iva !== IVA_PRECIO.mas, sigue
  };
}

/**
 * El cliente de una cotización: **de la ficha** cuando la tiene, y de las
 * columnas viejas cuando es de antes de las fichas.
 *
 * Desde la Fase 2 una cotización nueva no copia el nombre ni el contacto:
 * guarda solo el `ID Cliente`, y esto lo resuelve al leer. Así corregir un
 * teléfono en la ficha lo corrige en todas sus cotizaciones de una vez.
 */
export function clienteDe(
  p: Pick<Presupuesto, 'idCliente' | 'cliente' | 'email' | 'telefono'>,
  clientes: Pick<Cliente, 'id' | 'nombre' | 'correo' | 'telefono' | 'empresa'>[]
): { nombre: string; email: string; telefono: string; empresa: string } {
  const c = p.idCliente ? clientes.find((x) => x.id === p.idCliente) : undefined;
  if (c) return { nombre: c.nombre, email: c.correo, telefono: c.telefono, empresa: c.empresa };
  return { nombre: p.cliente, email: p.email, telefono: p.telefono, empresa: '' };
}

/** La cotización con su cliente resuelto, para mostrar o convertir. */
export function conCliente<T extends Presupuesto>(p: T, clientes: Cliente[]): T {
  const c = clienteDe(p, clientes);
  return { ...p, cliente: c.nombre, email: c.email, telefono: c.telefono };
}

/** El grupo de alternativas de una cotización: el suyo, o ella misma. */
export const grupoDe = (p: Pick<Presupuesto, 'id' | 'grupo'>) => p.grupo || p.id;

/**
 * Las otras alternativas del mismo grupo que hay que marcar *No elegida*
 * cuando una gana. Las que ya están cerradas —perdidas, o con su propia
 * reserva— no se tocan.
 */
export function otrasAlternativas(ganadora: Presupuesto, lista: Presupuesto[]): Presupuesto[] {
  const g = grupoDe(ganadora);
  return lista.filter((p) => p.id !== ganadora.id && grupoDe(p) === g && !p.idReserva
    && estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.rechazado
    && estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.noElegida);
}

/**
 * Qué estados se pueden poner a mano. **Ganada no**: se llega solo por
 * "Marcar ganada", que crea la reserva. **No elegida tampoco**: la pone el
 * sistema cuando gana otra alternativa.
 */
export const ESTADOS_A_MANO: string[] = [
  ESTADO_PRESUPUESTO.candidato, ESTADO_PRESUPUESTO.borrador, ESTADO_PRESUPUESTO.enviado,
  ESTADO_PRESUPUESTO.negociacion, ESTADO_PRESUPUESTO.rechazado
];

/** Los motivos de pérdida que se ofrecen con un botón. Igual se escribe otro. */
export const MOTIVOS_PERDIDA = [
  'Precio', 'Fecha no disponible', 'Eligió otra opción', 'No respondió', 'Se canceló el evento'
];
