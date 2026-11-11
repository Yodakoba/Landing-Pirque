/**
 * Las reglas de armar una cotización (Fase 2, 2026-11-10).
 *
 * Todo lo que el servidor decide al guardar vive acá, puro y con pruebas:
 * cuánta gente es cada línea, qué es monto fijo, la regla del
 * show ecuestre y de dónde sale el cliente. La pantalla propone lo mismo
 * para que se vea mientras se escribe, pero **lo que se guarda lo decide
 * esto**, porque una llamada directa a la API tiene que obedecer las mismas
 * reglas que un clic.
 */
import { normalizar, estaCerrado, esPrivada } from './columnas.ts';
import { canonizar, TIPO_PRODUCTO, IVA_PRECIO, MONEDA, COBRO, type Menu } from './menus.ts';
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
 * - **Ninguna línea sigue sola a los invitados** (2026-11-11, lo decidió el
 *   cliente): 10 invitados pueden ser 8 desayunos y 6 onces. La once nace
 *   con los invitados y se ajusta con − y +. Las líneas viejas que venían
 *   marcadas conservan la cantidad con que se guardaron.
 * - **Un monto fijo —arriendo, show— es siempre 1**: va o no va, y no hay
 *   cantidad que cambiar, ni en la pantalla ni llamando a la API.
 * - **El show ecuestre en un día público va siempre, incluido y a cero.**
 *   Si no viene, se agrega; si viene con precio, se le quita. En un día
 *   privado es una línea más, que se agrega o no y cobra su precio.
 */
export function prepararLineas(
  entrantes: LineaEntrante[],
  catalogo: Menu[],
  invitados: number,
  diaPublico: boolean,
  /**
   * El valor de la UF de la cotización. **Una línea en UF toma su precio en
   * pesos de acá**, siempre: así lo que se ve y lo que se guarda salen de la
   * misma cuenta. Sin UF, la línea conserva el precio que traía.
   */
  uf = 0
): Omit<LineaPresupuesto, 'fila'>[] {
  const show = showDe(catalogo);
  const lineas = normalizarLineas(entrantes).map((l) => {
    const prod = productoDe(l.concepto, catalogo);
    const esMenu = prod?.tipo === TIPO_PRODUCTO.menu;
    const montoFijo = !!prod && normalizar(prod.cobro) === normalizar(COBRO.fijo);
    const sigue = false;
    const cantidad = montoFijo ? 1 : l.cantidad;
    const esShow = !!prod && prod.tipo === TIPO_PRODUCTO.show;
    return {
      ...l,
      concepto: prod?.nombre ?? l.concepto,
      sigue,
      cantidad,
      personas: esMenu ? cantidad : 0,
      // En un día público el show va incluido: ni precio ni descuento.
      precio: esShow && diaPublico ? 0
        : l.precioUF && uf > 0 ? Math.round(l.precioUF * uf) : l.precio,
      descuento: esShow && diaPublico ? 0 : l.descuento
    };
  });
  if (diaPublico && show && !lineas.some((l) => l.concepto === show.nombre)) {
    lineas.push({
      presupuesto: lineas[0]?.presupuesto ?? '', concepto: show.nombre,
      cantidad: 1, precio: 0, personas: 0, descuento: 0, ivaIncluido: true, sigue: false,
      precioUF: 0
    });
  }
  return lineas;
}

/** Una línea nueva para un producto del catálogo, como la propone la pantalla. */
/**
 * **Un producto del catálogo va una sola vez por cotización** (2026-11-12,
 * lo pidió el cliente: *"no quiero que se puedan poner dos veces el mismo
 * ítem"*). Lo Pirque se cotiza una vez con cuánta gente lo come, y los niños
 * en su propia línea; dos líneas de Lo Pirque solo confunden. Se compara sin
 * tildes ni mayúsculas, como el resto del panel.
 *
 * Da vuelta lo que decía este proyecto el 2026-11-01 (*"dos líneas del mismo
 * concepto no se juntan"*, por el caso de una cortesía a precio cero): una
 * cortesía va ahora como descuento de la línea. Lo que ya tenga dos líneas
 * de antes no se junta solo: se ve como está y se corrige a mano.
 */
export function yaEstaEnLaCotizacion(lineas: { concepto: string }[], producto: string): boolean {
  const n = normalizar(producto);
  return !!n && lineas.some((l) => normalizar(l.concepto) === n);
}

export function lineaDeProducto(
  m: Menu, presupuesto: string, invitados: number, precio: number,
  /** Cuánta gente ya está en los menús de la cotización. */
  yaEnMenus = 0
): Omit<LineaPresupuesto, 'fila'> {
  const porPersona = normalizar(m.cobro) === normalizar('Por persona');
  // Nada sigue solo a los invitados (2026-11-11): la once nace con todos y
  // se ajusta a mano, porque no todos la toman.
  const sigue = false;
  // **Un menú nuevo toma los invitados que faltan, no todos** (2026-11-10,
  // lo reclamó el cliente: 40 invitados, Lo Pirque con 40 y el de niños con
  // otros 40 eran 80). El primero toma los 40; el segundo nace en 0 y se le
  // escribe cuántos, bajándole al primero. Sin invitados, nace en 1.
  const cantidad = !porPersona ? 1
    : m.tipo === TIPO_PRODUCTO.menu
      ? (invitados > 0 ? Math.max(0, invitados - yaEnMenus) : 1)
      : Math.max(1, invitados);
  return {
    presupuesto, concepto: m.nombre, cantidad, precio,
    personas: m.tipo === TIPO_PRODUCTO.menu ? cantidad : 0,
    descuento: 0, ivaIncluido: m.iva !== IVA_PRECIO.mas, sigue,
    // En UF, la línea guarda su precio en UF y lo convierte `prepararLineas()`.
    precioUF: m.moneda === MONEDA.uf ? m.precioCotizacion : 0
  };
}

/**
 * **Cambia la cantidad de un menú y se la descuenta al primero** (2026-11-10,
 * lo pidió el cliente). Con 40 invitados, Lo Pirque nace con 40 y Niños con
 * 0; subir Niños a 10 deja Lo Pirque en 30, y bajarlo se los devuelve. Así
 * los menús siguen sumando los invitados sin hacer la resta a mano.
 *
 * - El primero en la lista es el que absorbe la diferencia, y **nunca baja
 *   de cero**: si no le queda, el otro no sube más de lo que había.
 * - Cambiar el primero, o cualquier línea que no sea un menú, no mueve nada
 *   más: ahí el aviso de que no calzan dice lo que pasa.
 * - Sin invitados tampoco: no hay un total que conservar.
 */
export function cambiarCantidad<L extends { concepto: string; cantidad: number }>(
  lineas: L[], i: number, nueva: number, catalogo: Menu[], invitados: number
): L[] {
  const esMenu = (l: L) => productoDe(l.concepto, catalogo)?.tipo === TIPO_PRODUCTO.menu;
  const salida = lineas.map((l) => ({ ...l }));
  let cantidad = Math.max(0, Math.round(nueva) || 0);
  const primero = salida.findIndex(esMenu);
  if (invitados > 0 && esMenu(salida[i]) && primero !== -1 && primero !== i) {
    const antes = salida[i].cantidad;
    cantidad = Math.min(cantidad, antes + salida[primero].cantidad);
    salida[primero].cantidad -= cantidad - antes;
  }
  salida[i].cantidad = cantidad;
  return salida;
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
 * **Las alternativas de una cotización viven dentro de ella** (2026-11-10,
 * lo pidió el cliente: *"hay que quedarse en el mundo interno de esta
 * cotización, y ahí dentro veo las dos alternativas"*). Por dentro siguen
 * siendo filas aparte de `Presupuestos` con el mismo `Grupo`; lo que cambia
 * es cómo se muestran: **un número de cotización y una letra por
 * alternativa**, no dos números sueltos.
 */
export function alternativasDe<T extends Pick<Presupuesto, 'id' | 'grupo'>>(p: T, lista: T[]): T[] {
  const g = grupoDe(p);
  const del = lista.filter((x) => grupoDe(x) === g);
  if (!del.some((x) => x.id === p.id)) del.push(p);
  // En el orden en que se crearon: el id lleva la hora.
  return del.sort((a, b) => a.id.localeCompare(b.id));
}

/** La letra de una alternativa (A, B, C…), o vacío si es la única. */
export function letraDe<T extends Pick<Presupuesto, 'id' | 'grupo'>>(p: T, lista: T[]): string {
  const alts = alternativasDe(p, lista);
  if (alts.length < 2) return '';
  return String.fromCharCode(65 + alts.findIndex((x) => x.id === p.id));
}

/**
 * La que representa al grupo en las listas y el calendario: la ganada si
 * hay, si no la primera que sigue abierta, si no la primera. Así una
 * cotización con dos alternativas es **una** tarjeta, no dos.
 */
export function principalDe<T extends Presupuesto>(alts: T[], abierta: (p: T) => boolean): T {
  return alts.find((x) => !!x.idReserva) ?? alts.find(abierta) ?? alts[0];
}

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
 * **Si una alternativa sigue en carrera** (2026-11-11). Fuera quedan las
 * perdidas, las *No elegida* y las canceladas; la ganada sigue, porque es
 * la que el cliente eligió.
 */
export function sigueViva(p: Pick<Presupuesto, 'estado' | 'idReserva'>): boolean {
  const e = estadoNormal(p.estado);
  if (e === ESTADO_PRESUPUESTO.cancelada) return false;
  if (p.idReserva) return true;
  return e !== ESTADO_PRESUPUESTO.rechazado && e !== ESTADO_PRESUPUESTO.noElegida;
}

/** Las alternativas del grupo que siguen en carrera, en orden A, B, C. */
export function vivasDelGrupo(p: Presupuesto, lista: Presupuesto[]): Presupuesto[] {
  return alternativasDe(p, lista).filter(sigueViva);
}

/**
 * **Antes de ganar hay que elegir** (2026-11-11, lo pidió el cliente: *"antes
 * de marcar como ganado, tiene que decidir cuál de las alternativas usa"*).
 * Verdadero si a esta cotización todavía le queda otra alternativa en
 * carrera. La misma regla la usan `/convertir` y la pantalla.
 */
export function faltaElegir(p: Presupuesto, lista: Presupuesto[]): boolean {
  return !p.idReserva && sigueViva(p) && otrasAlternativas(p, lista).length > 0;
}

/**
 * **Lo que muestra el link del cliente** (2026-11-11): un solo link para todo
 * el grupo. Mientras se decide, las alternativas en carrera, A, B y C juntas;
 * elegida una —o ganada—, solo esa. Un candidato no va: todavía no es una
 * cotización. Si no queda ninguna viva —se perdió—, la del propio link.
 */
export function paraElLink(p: Presupuesto, lista: Presupuesto[]): Presupuesto[] {
  const vivas = vivasDelGrupo(p, lista)
    .filter((x) => estadoNormal(x.estado) !== ESTADO_PRESUPUESTO.candidato);
  const ganada = vivas.find((x) => !!x.idReserva);
  if (ganada) return [ganada];
  return vivas.length ? vivas : [p];
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

/**
 * **Cómo queda el grupo al deshacer una ganada** (2026-11-12, lo pidió el
 * cliente: marcó ganada la A cuando el cliente había elegido la B). La
 * ganada y las que pasaron a *No elegida* por ella vuelven a estar en
 * carrera: *Enviada* si ya se mandó, *Borrador* si no. Una *Perdida* o una
 * *Cancelada* se quedan como están: no las tocó la ganada.
 *
 * No se guarda en qué etapa estaba cada una antes de ganar, así que una que
 * iba en *Negociación* vuelve a *Enviada*. Es lo más cercano que se sabe, y
 * la conversación sigue igual.
 */
export function grupoSinGanar(
  ganada: Presupuesto, lista: Presupuesto[]
): { id: string; estado: string }[] {
  return alternativasDe(ganada, lista)
    .filter((a) => a.id === ganada.id || estadoNormal(a.estado) === ESTADO_PRESUPUESTO.noElegida)
    .map((a) => ({
      id: a.id,
      estado: String(a.enviada ?? '').trim() ? ESTADO_PRESUPUESTO.enviado : ESTADO_PRESUPUESTO.borrador
    }));
}
