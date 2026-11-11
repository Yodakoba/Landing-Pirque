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
import { canonizar, aPrecio, type Menu } from './menus.ts';
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
  creado: 'Creado',
  /**
   * La ficha del cliente (2026-11-10). **Al final y por nombre**, así que una
   * planilla vieja sin esta columna se sigue leyendo igual: se agrega sola la
   * primera vez que hace falta (`asegurarColumna()`). Desde la Fase 2 es lo
   * único que el presupuesto guarda del cliente; mientras tanto conviven con
   * `Cliente`, `Email` y `Teléfono`, que no se borran para no perder nada.
   */
  idCliente: 'ID Cliente',
  // ---- Fase 2 de las cotizaciones (2026-11-10). Todas al final y por
  // nombre: una planilla vieja se sigue leyendo, y las columnas se agregan
  // solas la primera vez que se guarda.
  /** Cuánta gente dice el cliente que viene. Lo que siguen las líneas por persona. */
  invitados: 'Invitados',
  /**
   * Cuando todavía no hay día: "marzo o abril", "fin de año". Con esto la
   * `Fecha` puede ir vacía. Una cotización sin día **no ocupa ninguna
   * fecha** ni suma posibles en el calendario: aparece en su lista aparte.
   */
  periodo: 'Periodo',
  tipoEvento: 'Tipo de evento',
  /**
   * El id de la primera cotización de un grupo de alternativas. Dos
   * cotizaciones con el mismo grupo son opciones A y B para el mismo
   * cliente; cuando una gana, las otras pasan solas a *No elegida*.
   */
  grupo: 'Grupo',
  /** Descuento sobre el total, en %. */
  descuento: 'Descuento total',
  /** Por qué se perdió. Texto, como la nota de pago. */
  motivo: 'Motivo',
  /**
   * Con qué documento se vende (2026-11-10): sin documento, boleta o
   * factura. **En blanco es "por definir"**, y así quedan las de antes: no
   * se inventa un valor. Por ahora no cambia el precio.
   */
  documento: 'Documento',
  /**
   * Las condiciones de pago de esta cotización, si se negociaron otras
   * (2026-11-10). **En blanco rige Configuración**; un 0 en el anticipo es
   * *sin anticipo*, que es distinto de en blanco. Ver `condicionesDe()`.
   */
  anticipo: 'Anticipo %',
  saldoDias: 'Saldo días antes',
  /**
   * **La UF con que se convirtieron sus líneas en UF**, y de qué día
   * (2026-11-10). Queda fija: el cliente ya recibió una cifra en pesos, y no
   * puede moverse sola. Se cambia a mano con *Usar la UF de hoy*.
   */
  uf: 'UF',
  fechaUF: 'Fecha UF',
  // ---- El contrato (Fase 4, 2026-11-10). Al final y por nombre, como las
  // demás: se agregan solas la primera vez que se guarda.
  /** El horario del evento, "13:00 a 18:00". En blanco rige Configuración. */
  horario: 'Horario',
  /** Si el contrato lleva la cláusula de la Ley 20.393 ("sí" o en blanco). */
  ley20393: 'Ley 20.393',
  /** Lo acordado aparte, que va al contrato como su última cláusula. */
  acuerdos: 'Acuerdos adicionales',
  /**
   * **El contrato firmado**: el id del archivo en Drive. Se firma en papel
   * y se sube la foto o el PDF; que esté es lo que dice "firmado". Ver
   * `lib/contrato.ts`.
   */
  contrato: 'Contrato firmado',
  contratoSubidoPor: 'Contrato subido por',
  contratoSubido: 'Contrato subido',
  // ---- La cancelación (2026-11-11). Al final y por nombre.
  /**
   * **Las condiciones de cancelación de esta cotización**: cuántos cambios
   * de fecha, hasta cuántos días antes se cancela y qué % de lo pagado se
   * devuelve. **En blanco rige Configuración**, igual que el anticipo. Son
   * las que imprime el contrato y las que aplica *Cancelar evento*.
   */
  cambiosFecha: 'Cambios de fecha',
  cancelacionDias: 'Cancelación días',
  reembolso: 'Reembolso %',
  /** Lo que se acordó devolver al cancelar, en pesos. */
  devolucion: 'Devolución acordada',
  canceladaPor: 'Cancelada por',
  cancelada: 'Cancelada',
  /**
   * **Qué le hizo al día marcarla ganada** (2026-11-11): `creado` si el día
   * no estaba en el calendario, `reabierto` si estaba cerrado, vacío si no
   * le hizo nada. Es lo que permite deshacerlo al cancelar: un día que
   * existía solo por esta cotización vuelve a no existir.
   */
  diaAbierto: 'Día abierto',
  /**
   * **El seguimiento** (2026-11-11). `Enviada` es el día en que se le mandó
   * por primera vez: desde ahí corre la vigencia y desde ahí cuenta en el
   * calendario principal. `Último seguimiento` es el último "sigue
   * esperando" o cambio de etapa, para no volver a preguntar antes de
   * tiempo. Los dos plazos son de esta cotización; en blanco rige
   * Configuración.
   */
  enviada: 'Enviada',
  ultimoSeguimiento: 'Último seguimiento',
  seguimientoDias: 'Recordar a los días',
  avisoEvento: 'Preguntar días antes'
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
  personas: 'Personas',
  /** Descuento de esta línea, en %. */
  descuento: 'Descuento',
  /**
   * Si el precio escrito ya trae el IVA (`Incluido`) o se le suma (`+ IVA`).
   * Se copia del catálogo al agregar la línea y queda con ella. **En blanco
   * es `Incluido`**: así las líneas de antes de la Fase 2 dan el mismo
   * total que daban.
   */
  iva: 'IVA',
  /** Si la cantidad sigue al número de invitados: "sí" o en blanco. */
  sigue: 'Sigue invitados',
  /**
   * El precio en UF, si el producto se cobra en UF (2026-11-10). El
   * `Precio unitario` es su conversión a pesos con la UF de la cotización;
   * en blanco, la línea es en pesos como siempre.
   */
  precioUF: 'Precio UF'
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
  /**
   * El primer estado (2026-11-10): alguien preguntó y todavía no se le
   * cotiza nada. Tiene cliente, fecha (o periodo) e invitados, y nada más.
   */
  candidato: 'Candidato',
  borrador: 'Borrador',
  enviado: 'Enviada',
  negociacion: 'Negociación',
  /** Ganada: tiene su reserva. Se llega solo por "Marcar ganada". */
  aceptado: 'Ganada',
  /** Perdida, con su motivo. */
  rechazado: 'Perdida',
  /** Otra alternativa del mismo grupo ganó. La pone el sistema. */
  noElegida: 'No elegida',
  /**
   * **Ganada y después cancelada** (2026-11-11). Se llega solo por
   * *Cancelar evento*, que cancela su reserva —libera el cupo— y anota lo
   * que se acordó devolver. No vuelve atrás: si el cliente vuelve, es otra
   * cotización.
   */
  cancelada: 'Cancelada'
} as const;

/**
 * El estado guardado, con los nombres de hoy.
 *
 * Hasta el 2026-11-10 se guardaban `Enviado`, `Aceptado` y `Rechazado`; se
 * leen como `Enviada`, `Ganada` y `Perdida` sin reescribir la planilla.
 */
export function estadoNormal(texto: unknown): string {
  const t = normalizar(String(texto ?? ''));
  if (!t) return '';
  const viejos: Record<string, string> = {
    enviado: ESTADO_PRESUPUESTO.enviado,
    aceptado: ESTADO_PRESUPUESTO.aceptado,
    rechazado: ESTADO_PRESUPUESTO.rechazado
  };
  if (viejos[t]) return viejos[t];
  return Object.values(ESTADO_PRESUPUESTO).find((e) => normalizar(e) === t)
    ?? String(texto).trim();
}

/** Los estados que ya no van a cambiar solos: la conversación terminó. */
export const ESTADOS_CERRADOS: string[] = [
  ESTADO_PRESUPUESTO.aceptado, ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida,
  ESTADO_PRESUPUESTO.cancelada
];

export type EstadoPresupuesto =
  (typeof ESTADO_PRESUPUESTO)[keyof typeof ESTADO_PRESUPUESTO];

export interface LineaPresupuesto {
  presupuesto: string;
  concepto: string;
  cantidad: number;
  /** El precio acordado para ESTA cotización, no el de la pestaña `Menús`. */
  precio: number;
  personas: number;
  /** Descuento de la línea, en %. 0 es sin descuento. */
  descuento: number;
  /** Si el precio trae el IVA. Ver `COL_LINEAS.iva`. */
  ivaIncluido: boolean;
  /** Si la cantidad seguía a los invitados. Ya no se usa (2026-11-11): se
   *  escribe siempre en no, y la columna queda por las filas viejas. */
  sigue: boolean;
  /** El precio en UF, o 0 si la línea es en pesos. */
  precioUF: number;
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
  /** La ficha en `Clientes`. Vacío en los presupuestos de antes de las fichas. */
  idCliente: string;
  invitados: number;
  /** Cuando no hay día exacto. Con periodo, `fecha` puede ser `''`. */
  periodo: string;
  tipoEvento: string;
  grupo: string;
  /** Descuento sobre el total, en %. */
  descuento: number;
  motivo: string;
  /** `''` es por definir. Ver `DOCUMENTO`. */
  documento: Documento;
  /** El anticipo en %, o `null` si rige Configuración. 0 es sin anticipo. */
  anticipo: number | null;
  /** Días antes del evento para el saldo, o `null` si rige Configuración. */
  saldoDias: number | null;
  /** El valor de la UF fijado en esta cotización, o 0 si no tiene. */
  uf: number;
  fechaUF: string;
  /** El horario del evento para el contrato; vacío rige Configuración. */
  horario: string;
  ley20393: boolean;
  acuerdos: string;
  /** El id en Drive del contrato firmado, o vacío si todavía no se sube. */
  contrato: string;
  contratoSubidoPor: string;
  contratoSubido: string;
  /** Las condiciones de cancelación; `null` rige Configuración. */
  cambiosFecha: number | null;
  cancelacionDias: number | null;
  reembolso: number | null;
  /** Lo acordado devolver al cancelar, en pesos. 0 si no se cancela o no se devuelve. */
  devolucion: number;
  canceladaPor: string;
  cancelada: string;
  /** `creado`, `reabierto` o vacío: ver `COL_PRESUPUESTOS.diaAbierto`. */
  diaAbierto: string;
  /** El día en que se le mandó, o vacío. Ver `COL_PRESUPUESTOS.enviada`. */
  enviada: string;
  ultimoSeguimiento: string;
  /** Los plazos del seguimiento; `null` rige Configuración. */
  seguimientoDias: number | null;
  avisoEvento: number | null;
  fila: number;
}

/**
 * Un número que puede faltar: en blanco o ilegible es `null` —rige
 * Configuración—, y un número se acota entre 0 y `max`. **Un 0 escrito es
 * 0**, no "en blanco": es *sin anticipo*.
 */
export function numeroONulo(v: unknown, max: number): number | null {
  const t = String(v ?? '').trim().replace(',', '.').replace('%', '');
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(0, Math.round(n)));
}

/** Los documentos con que se puede vender. Vacío es *por definir*. */
export const DOCUMENTO = {
  sin: 'Sin documento',
  boleta: 'Boleta',
  factura: 'Factura'
} as const;
export type Documento = (typeof DOCUMENTO)[keyof typeof DOCUMENTO] | '';

/**
 * Un documento escrito a mano o llegado del navegador. Lo que no es uno de
 * los tres vuelve a *por definir*: un valor inventado llegaría hasta la
 * planilla de la contabilidad.
 */
export function documentoDe(v: unknown): Documento {
  const t = normalizar(String(v ?? ''));
  return Object.values(DOCUMENTO).find((d) => normalizar(d) === t) ?? '';
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

const pctValido = (n: unknown) => Math.min(100, Math.max(0, Number(n) || 0));

/** Lo que vale una línea tal como se escribió, con su descuento. */
export const totalDeLinea = (
  l: Pick<LineaPresupuesto, 'cantidad' | 'precio'> & { descuento?: number }
) => Math.round(Math.max(0, l.cantidad) * l.precio * (1 - pctValido(l.descuento) / 100));

/** El neto de una línea: sin IVA, ya con su descuento. Sin redondear. */
export function netoDeLinea(
  l: Pick<LineaPresupuesto, 'cantidad' | 'precio'> & { descuento?: number; ivaIncluido?: boolean },
  tasa = IVA
): number {
  const bruto = Math.max(0, l.cantidad) * l.precio * (1 - pctValido(l.descuento) / 100);
  return l.ivaIncluido === false ? bruto : bruto / (1 + tasa);
}

/**
 * **Las cuentas de una cotización, como se hacen en una cotización**
 * (2026-11-10): las líneas en neto, el descuento sobre el total, y el IVA
 * encima. Un precio del catálogo marcado "Incluido" se lleva a neto antes
 * de sumar; uno marcado "+ IVA" ya lo es. Una línea de antes de la Fase 2
 * no tiene la marca y cuenta como "Incluido", que es lo que siempre fue.
 *
 * **El total sale de sumar**: `neto + iva === total` siempre, por lo mismo
 * que `desglosarIVA()` —un documento que va a la contabilidad de una
 * empresa no puede tener un peso que no cuadra—.
 */
export interface Cuentas {
  /** La suma de las líneas en neto, antes del descuento total. */
  subtotal: number;
  /** Lo que resta el descuento sobre el total. */
  descuento: number;
  neto: number;
  iva: number;
  total: number;
}

export function cuentasDe(
  lineas: (Pick<LineaPresupuesto, 'cantidad' | 'precio'> &
           { descuento?: number; ivaIncluido?: boolean })[],
  descuentoTotal = 0,
  tasa = IVA
): Cuentas {
  // **Se suma en bruto y se baja a neto una sola vez.** Llevar cada línea a
  // neto, redondear y después volver a subir el IVA descuadra por un peso:
  // 44 menús a $64.000 con IVA son $2.816.000 y así salían $2.816.001. Una
  // línea "+ IVA" se sube a bruto multiplicando, que con precios en pesos
  // enteros da exacto.
  const bruto = lineas.reduce(
    (n, l) => n + netoDeLinea(l, tasa) * (1 + tasa), 0);
  const total = Math.round(bruto * (1 - pctValido(descuentoTotal) / 100));
  const subtotal = Math.round(bruto / (1 + tasa));
  const neto = Math.round(total / (1 + tasa));
  return { subtotal, descuento: subtotal - neto, neto, iva: total - neto, total };
}

/** El total con IVA de una cotización: lo que se cobra. */
export const totalDe = (
  lineas: (Pick<LineaPresupuesto, 'cantidad' | 'precio'> &
           { descuento?: number; ivaIncluido?: boolean })[],
  descuentoTotal = 0
) => cuentasDe(lineas, descuentoTotal).total;

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
export function estaVencido(
  p: Pick<Presupuesto, 'validoHasta'> & { estado?: string }, hoy: Fecha
): boolean {
  // **Lo que no se ha mandado no vence** (2026-11-11): la vigencia corre
  // desde el envío. Un borrador viejo sigue siendo un borrador.
  if (p.estado !== undefined) {
    const e = estadoNormal(p.estado);
    if (!e || e === ESTADO_PRESUPUESTO.candidato || e === ESTADO_PRESUPUESTO.borrador) return false;
  }
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
  if (ESTADOS_CERRADOS.includes(estadoNormal(p.estado))) return false;
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
/**
 * **Si ya se le mandó al cliente** (2026-11-11): Enviada o Negociación. Es
 * lo que separa una conversación interna —candidato, borrador— de una que
 * espera respuesta.
 */
export function estaMandada(estado: string): boolean {
  const e = estadoNormal(estado);
  return e === ESTADO_PRESUPUESTO.enviado || e === ESTADO_PRESUPUESTO.negociacion;
}

/**
 * **Si cuenta en el calendario principal** (2026-11-11, lo pidió el
 * cliente: *"recién ahí se transforma en una posible reserva… una vez que
 * se realmente envió"*). Solo lo mandado: un borrador cambia, se conversa,
 * y no es todavía gente que puede venir. En la pantalla de Cotizaciones
 * siguen todas (`cuentaComoPosible()`).
 */
export function cuentaEnElCalendario(p: Presupuesto, hoy: Fecha): boolean {
  return cuentaComoPosible(p, hoy) && estaMandada(p.estado);
}

export function cuentaComoPosible(p: Presupuesto, hoy: Fecha): boolean {
  if (String(p.idReserva ?? '').trim()) return false;
  const e = estadoNormal(p.estado);
  if (e === ESTADO_PRESUPUESTO.rechazado || e === ESTADO_PRESUPUESTO.noElegida) return false;
  return !estaVencido(p, hoy);
}

/**
 * Cuánta gente suma una cotización como posible: la de sus menús, y si
 * todavía no tiene menús —un candidato—, los invitados que dijo.
 */
export function gentePosible(p: Pick<Presupuesto, 'invitados'>, lineas: LineaPresupuesto[]): number {
  const deLineas = personasDe(lineas);
  return deLineas > 0 ? deLineas : Math.max(0, p.invitados || 0);
}

/** En qué va, con el vencimiento ya resuelto, para mostrarlo. */
export function estadoVisible(p: Presupuesto, hoy: Fecha): string {
  const e = estadoNormal(p.estado);
  // Una cancelada conserva su `ID Reserva` —el rastro de su reserva—, así
  // que se mira antes que eso.
  if (e === ESTADO_PRESUPUESTO.cancelada) return e;
  if (String(p.idReserva ?? '').trim()) return ESTADO_PRESUPUESTO.aceptado;
  if (e === ESTADO_PRESUPUESTO.rechazado || e === ESTADO_PRESUPUESTO.noElegida) return e;
  if (estaVencido(p, hoy)) return 'Vencida';
  return e || ESTADO_PRESUPUESTO.borrador;
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
  hoy: Fecha,
  /** El calendario principal cuenta solo lo mandado; ver `cuentaEnElCalendario()`. */
  soloMandadas = true
): Map<Fecha, Posibles> {
  const porPresupuesto = new Map<string, LineaPresupuesto[]>();
  for (const l of lineas) {
    const k = l.presupuesto;
    if (!porPresupuesto.has(k)) porPresupuesto.set(k, []);
    porPresupuesto.get(k)!.push(l);
  }

  // **Las alternativas de un mismo cliente no se suman** (2026-11-10): A y
  // B son dos versiones de la misma gente, así que de cada grupo cuenta
  // una sola, la de más personas, como un solo presupuesto. Sumarlas
  // mostraba 80 posibles donde hay 40.
  const porGrupo = new Map<string, { fecha: Fecha; personas: number; total: number }>();
  for (const p of presupuestos) {
    if (!(soloMandadas ? cuentaEnElCalendario(p, hoy) : cuentaComoPosible(p, hoy))) continue;
    // Sin día exacto no ocupa ninguna fecha: va en su lista aparte.
    if (!esFecha(p.fecha)) continue;
    const suyas = porPresupuesto.get(p.id) ?? [];
    const clave = `${p.fecha}|${p.grupo || p.id}`;
    const esta = { fecha: p.fecha, personas: gentePosible(p, suyas), total: totalDe(suyas, p.descuento) };
    const antes = porGrupo.get(clave);
    if (!antes || esta.personas > antes.personas) porGrupo.set(clave, esta);
  }
  const salida = new Map<Fecha, Posibles>();
  for (const g of porGrupo.values()) {
    const antes = salida.get(g.fecha) ?? { ...SIN_POSIBLES };
    salida.set(g.fecha, {
      presupuestos: antes.presupuestos + 1,
      personas: antes.personas + g.personas,
      total: antes.total + g.total
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
    // Sin menús —un candidato que se ganó tal cual— la gente son los
    // invitados que dijo: tiene que ocupar su cupo igual.
    personas: gentePosible(p, lineas),
    // El total de la cotización, con sus descuentos y el IVA: es lo que se
    // le va a cobrar.
    monto: totalDe(lineas, p.descuento),
    // **Solo lo escribe Shopify**, igual que en una reserva anotada a mano:
    // acá no se compró ninguna variante.
    tipoPago: '',
    estadoPago: ESTADO_PAGO.pendiente,
    asistencia: '',
    notaPago: `De la cotización N° ${folioDe(p)}`,
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
    const periodo = en(f, i.periodo).trim();
    // Sin día ni periodo no sabemos de cuándo es: una fila a medio escribir.
    if (!id || (!esFecha(fecha) && !periodo)) continue;
    salida.push({
      id,
      fecha: esFecha(fecha) ? fecha : '',
      periodo,
      invitados: Math.max(0, aEntero(en(f, i.invitados))),
      tipoEvento: en(f, i.tipoEvento).trim(),
      grupo: en(f, i.grupo).trim(),
      descuento: Math.min(100, Math.max(0, aEntero(en(f, i.descuento)))),
      motivo: en(f, i.motivo).trim(),
      documento: documentoDe(en(f, i.documento)),
      anticipo: numeroONulo(en(f, i.anticipo), 100),
      saldoDias: numeroONulo(en(f, i.saldoDias), 365),
      uf: aPrecio(en(f, i.uf)),
      fechaUF: en(f, i.fechaUF).slice(0, 10),
      horario: en(f, i.horario).trim(),
      ley20393: /^(s[ií]|x|1|true)$/i.test(en(f, i.ley20393).trim()),
      acuerdos: en(f, i.acuerdos).trim(),
      contrato: en(f, i.contrato).trim(),
      contratoSubidoPor: en(f, i.contratoSubidoPor).trim(),
      contratoSubido: en(f, i.contratoSubido).trim(),
      cambiosFecha: numeroONulo(en(f, i.cambiosFecha), 10),
      cancelacionDias: numeroONulo(en(f, i.cancelacionDias), 365),
      reembolso: numeroONulo(en(f, i.reembolso), 100),
      devolucion: Math.max(0, aEntero(en(f, i.devolucion))),
      canceladaPor: en(f, i.canceladaPor).trim(),
      cancelada: en(f, i.cancelada).trim(),
      diaAbierto: en(f, i.diaAbierto).trim(),
      enviada: en(f, i.enviada).slice(0, 10),
      ultimoSeguimiento: en(f, i.ultimoSeguimiento).slice(0, 10),
      seguimientoDias: numeroONulo(en(f, i.seguimientoDias), 365),
      avisoEvento: numeroONulo(en(f, i.avisoEvento), 365),
      cliente: en(f, i.cliente).trim(),
      email: en(f, i.email).trim(),
      telefono: en(f, i.telefono).trim(),
      estado: estadoNormal(en(f, i.estado)),
      validoHasta: en(f, i.validoHasta).slice(0, 10),
      token: en(f, i.token).trim(),
      notas: en(f, i.notas).trim(),
      idReserva: en(f, i.idReserva).trim(),
      idCliente: en(f, i.idCliente).trim(),
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
  poner(i.idCliente, p.idCliente);
  poner(i.invitados, p.invitados ? String(p.invitados) : '');
  poner(i.periodo, p.periodo);
  poner(i.tipoEvento, p.tipoEvento);
  poner(i.grupo, p.grupo);
  poner(i.descuento, p.descuento ? String(p.descuento) : '');
  poner(i.motivo, p.motivo);
  poner(i.documento, p.documento);
  poner(i.anticipo, p.anticipo === null ? '' : String(p.anticipo));
  poner(i.saldoDias, p.saldoDias === null ? '' : String(p.saldoDias));
  poner(i.uf, p.uf ? String(p.uf) : '');
  poner(i.fechaUF, p.uf ? p.fechaUF : '');
  poner(i.horario, p.horario);
  poner(i.ley20393, p.ley20393 ? 'sí' : '');
  poner(i.acuerdos, p.acuerdos);
  poner(i.contrato, p.contrato);
  poner(i.contratoSubidoPor, p.contratoSubidoPor);
  poner(i.contratoSubido, p.contratoSubido);
  poner(i.cambiosFecha, p.cambiosFecha === null ? '' : String(p.cambiosFecha));
  poner(i.cancelacionDias, p.cancelacionDias === null ? '' : String(p.cancelacionDias));
  poner(i.reembolso, p.reembolso === null ? '' : String(p.reembolso));
  poner(i.devolucion, p.devolucion ? String(p.devolucion) : '');
  poner(i.canceladaPor, p.canceladaPor);
  poner(i.cancelada, p.cancelada);
  poner(i.diaAbierto, p.diaAbierto);
  poner(i.enviada, p.enviada);
  poner(i.ultimoSeguimiento, p.ultimoSeguimiento);
  poner(i.seguimientoDias, p.seguimientoDias === null ? '' : String(p.seguimientoDias));
  poner(i.avisoEvento, p.avisoEvento === null ? '' : String(p.avisoEvento));
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
      descuento: Math.min(100, Math.max(0, aEntero(en(f, i.descuento)))),
      // En blanco es "Incluido": así una línea de antes de la Fase 2 da el
      // mismo total que daba.
      ivaIncluido: !/\+\s*iva/i.test(en(f, i.iva)),
      sigue: /^s[ií]$/i.test(en(f, i.sigue).trim()),
      precioUF: aPrecio(en(f, i.precioUF)),
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
  poner(i.descuento, num(l.descuento));
  poner(i.iva, l.ivaIncluido ? 'Incluido' : '+ IVA');
  poner(i.sigue, l.sigue ? 'sí' : '');
  poner(i.precioUF, l.precioUF ? String(l.precioUF) : '');
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
export type LineaEntrante = Omit<LineaPresupuesto, 'fila' | 'descuento' | 'ivaIncluido' | 'sigue' | 'precioUF'>
  & Partial<Pick<LineaPresupuesto, 'descuento' | 'ivaIncluido' | 'sigue' | 'precioUF'>>;

export function normalizarLineas(
  lineas: LineaEntrante[]
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
      personas: Math.max(0, aEntero(l.personas)),
      descuento: Math.min(100, Math.max(0, aEntero(l.descuento))),
      ivaIncluido: l.ivaIncluido !== false,
      sigue: !!l.sigue,
      precioUF: aPrecio(l.precioUF)
    });
  }
  return salida;
}

/**
 * **El seguimiento de una cotización mandada** (2026-11-11, lo pidió el
 * cliente: *"¿qué pasa con esta cotización enviada? ¿Aún está en
 * negociación o ya se perdió?"*). Devuelve por qué hay que preguntar, o
 * `null` si no toca:
 *
 * - `eventoCerca`: el evento está a `antesEvento` días o menos y sigue sin
 *   ganarse. Va primero porque es lo urgente.
 * - `sinRespuesta`: pasaron `dias` desde que se mandó —o desde el último
 *   "sigue esperando" o cambio de etapa— sin moverse.
 *
 * "Sigue esperando" posterga las dos preguntas otros `dias`. Un plazo en 0
 * apaga esa pregunta. Lo que ya se ganó, se perdió o venció no pregunta:
 * para lo vencido está su propio aviso.
 */
export function seguimientoDe(
  p: Presupuesto, hoy: Fecha,
  cfg: { seguimientoDias: number; avisoEvento: number }
): null | { motivo: 'eventoCerca'; dias: number } | { motivo: 'sinRespuesta'; dias: number } {
  if (!estaMandada(p.estado) || String(p.idReserva ?? '').trim()) return null;
  if (estaVencido(p, hoy)) return null;
  const dias = p.seguimientoDias ?? cfg.seguimientoDias;
  const antes = p.avisoEvento ?? cfg.avisoEvento;
  const base = [p.enviada, p.ultimoSeguimiento].filter(esFecha).sort().pop();
  const postergada = !!base && dias > 0 && p.ultimoSeguimiento === base
    && diasDesde(base, hoy) < dias;
  if (antes > 0 && esFecha(p.fecha) && p.fecha >= hoy && !postergada) {
    const faltan = diasDesde(hoy, p.fecha);
    if (faltan <= antes) return { motivo: 'eventoCerca', dias: faltan };
  }
  if (dias > 0 && base) {
    const pasaron = diasDesde(base, hoy);
    if (pasaron >= dias) return { motivo: 'sinRespuesta', dias: pasaron };
  }
  return null;
}

/** Días de `desde` a `hasta`, contando en fechas de texto (sin `Date` con huso). */
function diasDesde(desde: Fecha, hasta: Fecha): number {
  let n = 0;
  let f = desde;
  while (f < hasta && n < 4000) { f = sumarDias(f, 1); n++; }
  return n;
}
