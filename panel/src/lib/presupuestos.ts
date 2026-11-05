/**
 * Los presupuestos: lo que se cotiza antes de que exista una reserva.
 *
 * Lo pidió el cliente como una capa comercial que hoy no existe: armar una
 * cotización para una agencia o un matrimonio, mandársela, y **verla en el
 * día** sin que ocupe cupo. Su frase fija todo el diseño: *"no puede que
 * solo por enviar un presupuesto se ocupen cupos confirmados dentro del
 * día… hasta que no se confirme, no toca nada de lo concreto"*.
 *
 * **La tercera categoría, que es lo que no existía.** Hasta ahora una
 * reserva era una de dos cosas: ocupa su lugar, o lo liberó. Un presupuesto
 * no es ninguna: es *"todavía no se sabe"*. Meterlo en la lista de los que
 * liberan lo habría mostrado en rojo junto a las canceladas —"ya no viene"—
 * que es exactamente lo contrario de lo que es.
 *
 * | | Cuenta cupo | Dónde se ve |
 * |---|---|---|
 * | Confirmada (`paid`, `pending`) | **sí** | la barra, el semáforo, el sitio |
 * | **Presupuesto vigente** | **no** | su propia línea, aparte |
 * | Ya no viene (`cancelled`…) | no | el azulejo rojo |
 *
 * **Por qué pestañas propias y no columnas en `Reservas`.** Es el mismo
 * criterio que se usó con `Actividades`: vigencia, estado y líneas con
 * precio no significan nada en una reserva de Shopify, y una tabla con
 * media fila vacía es la forma más segura de que alguien sume lo que no
 * debe. Además un presupuesto cotiza cosas que una reserva no modela —el
 * arriendo del recinto, el show ecuestre— y eso no cabe en un `Menú` y un
 * `Personas`.
 *
 * **El precio se propone, no se impone.** La línea nace con el precio de la
 * pestaña `Menús` y se puede editar: *"eso es parte de las negociaciones,
 * entonces se necesita esta libertad"*. Una vez escrito, el precio de la
 * línea **es** el precio — al convertirse en reserva se transcribe el
 * negociado, no se recalcula desde `Menús`. Mismo criterio que los sueldos
 * de un turno, y por el mismo motivo: lo acordado no puede cambiar solo
 * porque mañana cambie una tarifa.
 */
import { normalizar, indices, ESTADO_PAGO } from './columnas.ts';
import { canonizar, type Menu } from './menus.ts';
import { componerMenu } from './shopify.ts';
import { esFecha, sumarDias, type Fecha } from './fechas.ts';

export const HOJA_PRESUPUESTOS = 'Presupuestos';
export const HOJA_LINEAS = 'Presupuesto Líneas';

/**
 * La cabecera de un presupuesto. **Por nombre de columna**, como `Reservas`
 * y `Turnos`: acá se agregan y se borran filas de a una, y es una pestaña
 * que va a crecer columnas. Con posiciones fijas, agregar una obligaría a
 * reescribir todas las filas ya guardadas.
 */
export const COL_PRESUPUESTOS = {
  id: 'ID',
  fecha: 'Fecha',
  cliente: 'Cliente',
  email: 'Email',
  telefono: 'Teléfono',
  estado: 'Estado',
  validoHasta: 'Válido hasta',
  token: 'Token',
  notas: 'Notas',
  /**
   * El `ID Orden` de la reserva que nació de este presupuesto.
   *
   * **Es el campo que impide contar dos veces a la misma gente**, y por eso
   * es el que decide si el presupuesto sigue sumando como posible. Ver
   * `cuentaComoPosible()`.
   */
  idReserva: 'ID Reserva',
  creadoPor: 'Creado por',
  creado: 'Creado'
} as const;

/** Una fila por línea cotizada. También por nombre de columna. */
export const COL_LINEAS = {
  presupuesto: 'ID Presupuesto',
  concepto: 'Concepto',
  cantidad: 'Cantidad',
  precio: 'Precio unitario',
  /**
   * Cuántas personas representa esta línea.
   *
   * **No se deduce de la cantidad, y esa es la decisión.** `20 × Tradiciones`
   * son 20 personas; `1 × Arriendo del recinto` son 0. Sin esta columna
   * habría que adivinar cuáles conceptos son gente, y adivinar acá es
   * publicar un número de personas que nadie dio. Al agregar un menú se
   * propone igual a la cantidad; en una línea libre nace en cero.
   */
  personas: 'Personas'
} as const;

export const ENCABEZADO_PRESUPUESTOS: string[] = Object.values(COL_PRESUPUESTOS);
export const ENCABEZADO_LINEAS: string[] = Object.values(COL_LINEAS);

/**
 * En qué va un presupuesto.
 *
 * **"Vencido" no está acá a propósito: se deduce de la fecha**, no se
 * guarda. Un estado guardado habría necesitado que algo lo marcara cada
 * día, y mientras eso no corriera un presupuesto se vería vigente por
 * olvido — que es justo el error que importa, porque un presupuesto vencido
 * que parece vigente sigue reservando gente que ya no viene. Ver
 * `estaVencido()`.
 */
export const ESTADO_PRESUPUESTO = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado'
} as const;

export type EstadoPresupuesto =
  (typeof ESTADO_PRESUPUESTO)[keyof typeof ESTADO_PRESUPUESTO];

export interface LineaPresupuesto {
  presupuesto: string;
  concepto: string;
  cantidad: number;
  /** El precio acordado para ESTA cotización, no el de la pestaña `Menús`. */
  precio: number;
  personas: number;
  fila: number;
}

export interface Presupuesto {
  id: string;
  fecha: Fecha;
  cliente: string;
  email: string;
  telefono: string;
  estado: string;
  /** `AAAA-MM-DD`, o vacío si este presupuesto no caduca. */
  validoHasta: string;
  /** La llave de su link. Vacío mientras no se haya creado. */
  token: string;
  notas: string;
  idReserva: string;
  creadoPor: string;
  creado: string;
  fila: number;
}

/** Lo que un día tiene cotizado y todavía sin confirmar. */
export interface Posibles {
  /** Cuántos presupuestos vigentes hay ese día. */
  presupuestos: number;
  /** Cuánta gente sumarían si todos se confirmaran. */
  personas: number;
  /** Cuánta plata, por lo mismo. */
  total: number;
}

export const SIN_POSIBLES: Posibles = { presupuestos: 0, personas: 0, total: 0 };

/* ---------- números ---------- */

/**
 * Un entero, tolerante con lo que alguien teclee en la planilla.
 *
 * Vive acá y no se importa de `equipo.ts` para que este archivo no dependa
 * del equipo: son dos cosas que no tienen nada que ver, y el día que una se
 * mueva la otra no tiene por qué enterarse.
 */
export function aEntero(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Lo que cuesta una línea. */
export const totalDeLinea = (l: Pick<LineaPresupuesto, 'cantidad' | 'precio'>) =>
  Math.max(0, l.cantidad) * l.precio;

/** Lo que cuesta el presupuesto completo. */
export const totalDe = (lineas: LineaPresupuesto[]) =>
  lineas.reduce((n, l) => n + totalDeLinea(l), 0);

/** Cuánta gente cotiza el presupuesto completo. */
export const personasDe = (lineas: LineaPresupuesto[]) =>
  lineas.reduce((n, l) => n + Math.max(0, l.personas), 0);

/* ---------- el IVA ---------- */

/**
 * El IVA chileno.
 *
 * **Es una constante y no una fila de `Config`**, al revés que la vigencia.
 * La diferencia es quién lo decide: cuántos días vale una cotización lo fija
 * el cliente y lo puede cambiar mañana, pero la tasa del IVA la fija la ley
 * y es la misma para todos. Dejarla editable sería ofrecer un campo donde un
 * cero o un 12 mal tecleados saldrían impresos en un documento que va a la
 * contabilidad de una empresa. Si algún día la ley la cambia, es esta línea.
 */
export const IVA = 0.19;

export interface Desglose {
  /** Lo cotizado sin impuesto. */
  neto: number;
  /** El impuesto. */
  iva: number;
  /** Lo que el cliente paga. Es el total de las líneas, tal cual. */
  total: number;
}

/**
 * El desglose de un total **que ya trae el IVA incluido**.
 *
 * Esa es la decisión de fondo y la dio el cliente: *"los precios que nosotros
 * ofrecemos hoy son con IVA"*. O sea que el total **no cambia** al desglosar
 * —sigue siendo lo que se le cobra— y lo que se calcula hacia atrás es el
 * neto. Al revés, sumándole 19% a lo escrito, cada presupuesto habría salido
 * un 19% más caro que el precio que anuncia el resto del sitio.
 *
 * **El IVA sale de restar, no de multiplicar**, y eso no es un atajo: con
 * `neto × 0,19` los tres números no siempre suman —`44.000` da neto 36.975 e
 * IVA 7.025,25— y un documento que va a la contabilidad de una empresa no
 * puede tener un peso que no cuadra. Restando, `neto + iva === total`
 * siempre. Mismo criterio que `repartirPropina()`, que reparte hasta el
 * último peso en vez de dejar decimales.
 *
 * **Va sobre el total y no línea por línea**, también a propósito: la suma de
 * los netos redondeados de cada línea no da el neto del total, así que un
 * documento con las dos cosas tendría dos netos distintos. Y a quien recibe
 * la cotización le sirve el neto del total, que es el que pasa a su
 * contabilidad.
 */
export function desglosarIVA(total: number, tasa = IVA): Desglose {
  const t = Math.max(0, Math.round(total));
  const neto = Math.round(t / (1 + tasa));
  return { neto, iva: t - neto, total: t };
}

/* ---------- vigencia ---------- */

/**
 * Hasta cuándo vale un presupuesto creado hoy.
 *
 * El plazo lo fijó el cliente en 15 días y vive en la pestaña `Config`, no
 * acá: cambiarlo no puede obligar a redesplegar. Con `dias` en cero o
 * negativo el presupuesto **no caduca**, que es lo que corresponde a "sin
 * vencimiento" — y no una fecha en el pasado, que lo mataría al nacer.
 */
export function validoHastaDe(desde: Fecha, dias: number): string {
  if (!esFecha(desde) || !Number.isFinite(dias) || dias <= 0) return '';
  return sumarDias(desde, Math.round(dias));
}

/**
 * Si ya se le pasó el plazo.
 *
 * Se compara como texto `AAAA-MM-DD`, igual que todas las fechas de este
 * proyecto: pasarlas por `Date` las corre de día según el huso del
 * servidor, y Vercel no está en Chile.
 *
 * **El último día todavía vale.** "Válido hasta el 15" se lee como que el
 * 15 sirve, así que solo vence a partir del 16.
 */
export function estaVencido(p: Pick<Presupuesto, 'validoHasta'>, hoy: Fecha): boolean {
  const hasta = String(p.validoHasta ?? '').slice(0, 10);
  if (!esFecha(hasta)) return false;
  return hasta < hoy;
}

/**
 * Cuántos días le quedan de vigencia.
 *
 * Devuelve `null` cuando no caduca o cuando **ya venció**: las dos cosas no
 * son "le quedan N días" y confundirlas haría que un vencido apareciera
 * entre los que están por vencer, o al revés. Vencer tiene su propia
 * pregunta, `estaVencido()`.
 *
 * **Se cuenta sumando días al texto, no restando fechas.** Es la misma
 * razón de siempre: pasar una fecha por `Date` la corre de día según el
 * huso del servidor, y Vercel no está en Chile. Con un horizonte chico
 * —se pregunta para avisar, no para un informe— sumar unos pocos días es
 * más barato que cualquier resta, y no puede equivocarse.
 */
export function diasParaVencer(
  p: Pick<Presupuesto, 'validoHasta'>, hoy: Fecha, horizonte = 60
): number | null {
  const hasta = String(p.validoHasta ?? '').slice(0, 10);
  if (!esFecha(hasta) || hasta < hoy) return null;
  for (let n = 0; n <= horizonte; n++) if (sumarDias(hoy, n) === hasta) return n;
  // Más allá del horizonte no interesa cuántos son: no está por vencer.
  return null;
}

/**
 * Cuántos días antes se avisa que un presupuesto está por vencer.
 *
 * **Es una constante y no una fila de `Config`**, al revés que la vigencia.
 * La diferencia: cuántos días vale una cotización es un **plazo comercial**
 * que el cliente negocia y puede querer cambiar; cuántos días antes se lo
 * recuerda el panel es cuándo conviene avisar, que no es dato del negocio.
 * Agregar una fila a la planilla por cada número del panel la convierte en
 * un archivo de configuración que nadie quiere mantener.
 */
export const DIAS_AVISO_VENCIMIENTO = 3;

/**
 * Si está vigente pero se le acaba el plazo.
 *
 * **No incluye a los ya vencidos**, a propósito: son dos avisos distintos
 * —*"apúrate"* y *"se te pasó"*— y juntarlos borraría justamente el que
 * todavía se puede atender. Tampoco incluye a los que ya tienen reserva ni
 * a los rechazados: ahí el plazo dejó de importar.
 */
export function porVencer(
  p: Presupuesto, hoy: Fecha, dias = DIAS_AVISO_VENCIMIENTO
): boolean {
  if (!cuentaComoPosible(p, hoy)) return false;
  const quedan = diasParaVencer(p, hoy);
  return quedan !== null && quedan <= dias;
}

/**
 * Los que vencieron **sin que nadie los cerrara**.
 *
 * Uno rechazado o ya convertido en reserva no entra: esos terminaron. Lo
 * que queda acá es una conversación que se enfrió sola, y el panel la
 * nombra para que alguien decida — renovarla o marcarla rechazada— en vez
 * de que desaparezca sola de la lista.
 */
export function vencidoSinCerrar(p: Presupuesto, hoy: Fecha): boolean {
  if (String(p.idReserva ?? '').trim()) return false;
  if (normalizar(p.estado) === normalizar(ESTADO_PRESUPUESTO.rechazado)) return false;
  return estaVencido(p, hoy);
}

/**
 * **Si este presupuesto suma como gente posible en su día.**
 *
 * Es la regla central de toda esta capa, y es una sola condición a
 * propósito, porque cubre los dos errores opuestos:
 *
 * - **Contar dos veces.** Al aceptarse, un presupuesto se convierte en
 *   reserva, y esa reserva ya ocupa cupo. Si además siguiera contando como
 *   posible, el día mostraría la misma gente dos veces — 43 confirmadas más
 *   43 posibles. Por eso lo que lo apaga es **tener reserva**, no estar
 *   marcado "Aceptado".
 * - **Desaparecer de las dos listas.** Si lo apagara el estado "Aceptado",
 *   un presupuesto marcado así cuya conversión falló no estaría ni entre
 *   las reservas ni entre los posibles: gente que viene y que nadie ve.
 *   Mirando el `ID Reserva` eso no puede pasar — mientras no exista la
 *   reserva, el presupuesto sigue a la vista.
 *
 * Un borrador también cuenta, y es deliberado: una cotización a medio
 * escribir es igual de posible que una mandada, y el día la muestra con su
 * estado al lado para que se vea cuál es cuál.
 */
export function cuentaComoPosible(p: Presupuesto, hoy: Fecha): boolean {
  if (String(p.idReserva ?? '').trim()) return false;
  if (normalizar(p.estado) === normalizar(ESTADO_PRESUPUESTO.rechazado)) return false;
  return !estaVencido(p, hoy);
}

/** En qué va, con el vencimiento ya resuelto, para mostrarlo. */
export function estadoVisible(p: Presupuesto, hoy: Fecha): string {
  if (String(p.idReserva ?? '').trim()) return 'Confirmado';
  if (normalizar(p.estado) === normalizar(ESTADO_PRESUPUESTO.rechazado)) {
    return ESTADO_PRESUPUESTO.rechazado;
  }
  if (estaVencido(p, hoy)) return 'Vencido';
  return String(p.estado ?? '').trim() || ESTADO_PRESUPUESTO.borrador;
}

/**
 * Lo que cada día tiene cotizado y sin confirmar.
 *
 * Devuelve un mapa por fecha porque así se calcula **una vez** para los 90
 * días del calendario, en vez de recorrer la lista entera por cada día.
 */
export function posiblesPorDia(
  presupuestos: Presupuesto[],
  lineas: LineaPresupuesto[],
  hoy: Fecha
): Map<Fecha, Posibles> {
  const porPresupuesto = new Map<string, LineaPresupuesto[]>();
  for (const l of lineas) {
    const k = l.presupuesto;
    if (!porPresupuesto.has(k)) porPresupuesto.set(k, []);
    porPresupuesto.get(k)!.push(l);
  }

  const salida = new Map<Fecha, Posibles>();
  for (const p of presupuestos) {
    if (!cuentaComoPosible(p, hoy)) continue;
    const suyas = porPresupuesto.get(p.id) ?? [];
    const antes = salida.get(p.fecha) ?? { ...SIN_POSIBLES };
    salida.set(p.fecha, {
      presupuestos: antes.presupuestos + 1,
      personas: antes.personas + personasDe(suyas),
      total: antes.total + totalDe(suyas)
    });
  }
  return salida;
}

/** Las líneas de un presupuesto, en el orden en que están escritas. */
export const lineasDe = (lineas: LineaPresupuesto[], id: string) =>
  lineas.filter((l) => l.presupuesto === id);

/* ---------- convertirlo en reserva ---------- */

/**
 * Lo que se anota en `Reservas` cuando el cliente acepta.
 *
 * **Se transcribe el precio negociado, no se recalcula desde `Menús`.** Lo
 * pidió el cliente con el porqué: *"cuando se transforma en reserva
 * confirmada, se transcribe el precio de este presupuesto enviado, porque
 * eso es parte de las negociaciones"*. Si se recalculara, el descuento que
 * se acordó por teléfono desaparecería en el momento exacto en que pasa a
 * ser plata que alguien tiene que cobrar.
 *
 * **Al `Menú` solo van las líneas que representan gente**, y el filtro es
 * la columna `Personas`, no la lista de menús. El arriendo del recinto y el
 * show ecuestre cuestan y no se cocinan: meterlos ahí haría que la página
 * del día le pidiera a la cocina preparar "1 × Arriendo del recinto".
 *
 * **Se probó primero con `canonizar()` contra la pestaña `Menús` y estaba
 * mal**, aunque parezca el camino obvio: esa función devuelve **tal cual**
 * lo que no reconoce —a propósito, para que un plato que la tienda empezó a
 * vender ayer aparezca igual en el panel— así que no sirve de filtro, y
 * convertirla en uno habría hecho desaparecer en silencio un menú nuevo de
 * la lista de lo que hay que cocinar. La columna `Personas`, en cambio, es
 * donde alguien **ya dijo** qué línea es gente. Un menú que todavía no está
 * en el catálogo pasa igual, y `desconocidos()` lo reclama en la página del
 * día, que es el mecanismo que el panel ya tiene para eso.
 *
 * `canonizar()` sí se usa, pero para lo suyo: emparejar mayúsculas y tildes
 * para que `tradiciones` y `Tradiciones` se sumen como el mismo plato.
 *
 * Nace en **por pagar**, no en pagada: aceptar un presupuesto es
 * comprometerse a venir, no haber transferido. Si ya pagó, se corrige en la
 * página del día — que es donde se corrige cualquier estado de pago.
 */
export function reservaDesdePresupuesto(
  p: Presupuesto,
  lineas: LineaPresupuesto[],
  menus: Menu[],
  /** Con qué cuenta se convirtió. Queda como dueña de la reserva. */
  anotadaPor = ''
): {
  fecha: Fecha; nombre: string; email: string; telefono: string;
  menu: string; personas: number; monto: number;
  tipoPago: ''; estadoPago: string; asistencia: string; notaPago: string;
  eventoCRM: '';
  anotadaPor: string;
} {
  const cuenta: Record<string, number> = {};
  for (const l of lineas) {
    // Cero personas es una línea que no se cocina.
    if (l.personas <= 0) continue;
    const nombre = canonizar(l.concepto, menus);
    if (!nombre) continue;
    cuenta[nombre] = (cuenta[nombre] ?? 0) + Math.max(0, l.cantidad);
  }
  return {
    fecha: p.fecha,
    nombre: p.cliente,
    email: p.email,
    telefono: p.telefono,
    menu: componerMenu(cuenta),
    personas: personasDe(lineas),
    monto: totalDe(lineas),
    // **Solo lo escribe Shopify**, igual que en una reserva anotada a mano:
    // acá no se compró ninguna variante.
    tipoPago: '',
    estadoPago: ESTADO_PAGO.pendiente,
    asistencia: '',
    notaPago: `Del presupuesto N° ${folioDe(p)}`,
    // No sale del CRM del socio: sale de un presupuesto nuestro.
    eventoCRM: '',
    // Quién la convirtió. Es una reserva anotada por una persona, así que
    // tiene dueño como cualquier otra.
    anotadaPor
  };
}

/* ---------- ids y tokens ---------- */

/**
 * El id de un presupuesto.
 *
 * Lleva prefijo por lo mismo que `MANUAL-` en las reservas: los ids de
 * Shopify son números, así que un prefijo garantiza que nunca choquen, y de
 * paso cualquiera que mire la planilla sabe qué está viendo.
 */
export function nuevoId(ahora = Date.now()): string {
  return `PRE-${ahora}`;
}

/** El número que se le muestra al cliente: `PRE-1762… ` no es un folio. */
export function folioDe(p: Pick<Presupuesto, 'id'>): string {
  const n = String(p.id ?? '').replace(/^PRE-/, '');
  // Los últimos seis dígitos del timestamp alcanzan para distinguir dos
  // presupuestos en una conversación, que es para lo único que sirve el
  // folio. El id completo sigue siendo el de la planilla.
  return n.length > 6 ? n.slice(-6) : n;
}

/**
 * De quién es este link.
 *
 * **Un token vacío no encuentra nada**, aunque haya presupuestos sin token.
 * Si calzara, entrar a `/presupuesto/` sin nada detrás abriría la primera
 * cotización de la lista — con el precio que se le ofreció a otro cliente.
 * Es la misma guarda que `trabajadorPorToken()`, y acá importa más.
 *
 * Se compara con `iguales()` desde la página, que no distingue en tiempo:
 * acá solo se busca.
 */
export function porToken(lista: Presupuesto[], token: string): Presupuesto | null {
  const t = String(token ?? '').trim();
  if (!t) return null;
  return lista.find((p) => p.token && p.token === t) ?? null;
}

/* ---------- leer y escribir ---------- */

export function leerPresupuestosDe(filas: string[][]): Presupuesto[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_PRESUPUESTOS);
  // Sin id o sin fecha no hay nada que leer. Inventar un presupuesto a
  // partir de una fila que no sabemos interpretar sería mostrar gente
  // posible que nadie cotizó.
  if (i.id === -1 || i.fecha === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));

  const salida: Presupuesto[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const id = en(f, i.id).trim();
    const fecha = en(f, i.fecha).slice(0, 10);
    if (!id || !esFecha(fecha)) continue;
    salida.push({
      id,
      fecha,
      cliente: en(f, i.cliente).trim(),
      email: en(f, i.email).trim(),
      telefono: en(f, i.telefono).trim(),
      estado: en(f, i.estado).trim(),
      validoHasta: en(f, i.validoHasta).slice(0, 10),
      token: en(f, i.token).trim(),
      notas: en(f, i.notas).trim(),
      idReserva: en(f, i.idReserva).trim(),
      creadoPor: en(f, i.creadoPor).trim(),
      creado: en(f, i.creado).trim(),
      fila: n + 1
    });
  }
  return salida;
}

export function filaPresupuesto(
  encabezado: string[], p: Omit<Presupuesto, 'fila'>
): string[] {
  const i = indices(encabezado, COL_PRESUPUESTOS);
  const fila = new Array(
    Math.max(encabezado.length, ENCABEZADO_PRESUPUESTOS.length)
  ).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i.id, p.id);
  poner(i.fecha, p.fecha);
  poner(i.cliente, p.cliente);
  poner(i.email, p.email);
  poner(i.telefono, p.telefono);
  poner(i.estado, p.estado);
  poner(i.validoHasta, p.validoHasta);
  poner(i.token, p.token);
  poner(i.notas, p.notas);
  poner(i.idReserva, p.idReserva);
  poner(i.creadoPor, p.creadoPor);
  poner(i.creado, p.creado);
  return fila;
}

export function leerLineasDe(filas: string[][]): LineaPresupuesto[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_LINEAS);
  if (i.presupuesto === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));

  const salida: LineaPresupuesto[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const presupuesto = en(f, i.presupuesto).trim();
    const concepto = en(f, i.concepto).trim();
    // Una línea sin presupuesto no pertenece a nada, y una sin concepto no
    // se puede mostrar: es una fila que quedó a medio escribir.
    if (!presupuesto || !concepto) continue;
    salida.push({
      presupuesto,
      concepto,
      cantidad: aEntero(en(f, i.cantidad)),
      precio: aEntero(en(f, i.precio)),
      personas: aEntero(en(f, i.personas)),
      fila: n + 1
    });
  }
  return salida;
}

export function filaLinea(
  encabezado: string[], l: Omit<LineaPresupuesto, 'fila'>
): string[] {
  const i = indices(encabezado, COL_LINEAS);
  const fila = new Array(
    Math.max(encabezado.length, ENCABEZADO_LINEAS.length)
  ).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  const num = (n: number) => (n ? String(n) : '');
  poner(i.presupuesto, l.presupuesto);
  poner(i.concepto, l.concepto);
  poner(i.cantidad, num(l.cantidad));
  poner(i.precio, num(l.precio));
  poner(i.personas, num(l.personas));
  return fila;
}

/**
 * Deja las líneas listas para guardar.
 *
 * **No junta las repetidas**, al revés que `normalizarPlan()` o
 * `normalizarExtras()`, y la diferencia es real: dos turnos de la misma
 * persona el mismo día son un error —no puede estar en dos puestos— pero
 * dos líneas del mismo concepto pueden ser deliberadas, con precios
 * distintos: *20 × Tradiciones* al precio de lista y *5 × Tradiciones* de
 * cortesía a cero. Juntarlas borraría el acuerdo.
 *
 * Lo que sí hace es descartar las vacías y no dejar pasar cantidades
 * negativas, que solo podrían restar de un total que una persona va a leer.
 */
export function normalizarLineas(
  lineas: Omit<LineaPresupuesto, 'fila'>[]
): Omit<LineaPresupuesto, 'fila'>[] {
  const salida: Omit<LineaPresupuesto, 'fila'>[] = [];
  for (const l of lineas) {
    const concepto = String(l.concepto ?? '').trim();
    if (!concepto) continue;
    salida.push({
      presupuesto: l.presupuesto,
      concepto,
      cantidad: Math.max(0, aEntero(l.cantidad)),
      precio: Math.max(0, aEntero(l.precio)),
      personas: Math.max(0, aEntero(l.personas))
    });
  }
  return salida;
}
