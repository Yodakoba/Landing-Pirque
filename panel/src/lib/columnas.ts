/**
 * Los nombres de columna de la planilla, en UN solo lugar.
 *
 * Están tal como los especificó el encargo. Si los encabezados reales de la
 * planilla no dicen exactamente esto, **este es el único archivo que hay que
 * tocar** — no las rutas ni los componentes.
 *
 * La comparación normaliza mayúsculas, espacios Y TILDES. Eso último importa:
 * el Apps Script que escribe la planilla normaliza mayúsculas y espacios pero
 * NO tildes, así que "Menú" y "menu" son columnas distintas para él. Acá se
 * aceptan las dos para que el panel no se caiga por una tilde.
 *
 * Y si algo no calza, no se falla en silencio: /api/diagnostico lo dice.
 */

export const HOJA_RESERVAS = 'Reservas';
export const HOJA_FECHAS = 'Fechas Hábiles';

export const COL_RESERVAS = {
  id: 'ID Orden',
  fecha: 'Fecha Reserva',
  nombre: 'Nombre',
  email: 'Email',
  telefono: 'Teléfono',
  menu: 'Menú',
  personas: 'Personas',
  monto: 'Monto',
  tipoPago: 'Tipo Pago',
  estadoPago: 'Estado Pago Shopify',
  creada: 'Creada',
  asistencia: 'Asistencia',
  notaPago: 'Nota de pago',
  /**
   * **Lo que anota la anfitriona en la entrada** (2026-11-11). `Llegaron` es
   * cuánta gente llegó de verdad, en blanco si nadie lo anotó; no cambia
   * `Personas` —eso lo decide el jefe de turno editando la reserva—.
   * `Aviso recepción` es lo que la anfitriona le avisa al jefe de turno, y se
   * vacía cuando alguien lo marca resuelto.
   */
  llegaron: 'Llegaron',
  avisoRecepcion: 'Aviso recepción',
  /**
   * **Cuánto abonó una reserva *Abonada*** (2026-11-11): la plata que ya
   * entró de una que pagó una parte. En blanco si no se sabe —Shopify no lo
   * dice en el estado—. Una reserva de una cotización lo toma de sus cobros.
   */
  abonado: 'Abonado',
  /**
   * De qué evento del CRM del socio salió esta reserva.
   *
   * **Es lo que impide contar la misma gente dos veces** (2026-11-03). Un
   * ganado del socio se ve en el panel como gente que viene y que el cupo no
   * cuenta; al anotarlo como reserva pasa a contar, y entonces tiene que
   * dejar de verse como pendiente — si no, el día mostraría las mismas 150
   * personas en los dos lados. Mismo papel que el `ID Reserva` de un
   * presupuesto, y por el mismo motivo.
   *
   * Vacío en todas las demás: una reserva de Shopify o anotada a mano no
   * viene de ningún evento del socio.
   */
  eventoCRM: 'ID Evento CRM',
  /**
   * Con qué cuenta del panel se anotó esta reserva.
   *
   * **Existe para una sola pregunta** (2026-11-05): ¿esta reserva es del
   * vendedor que la está queriendo borrar? Hasta ese día nadie la hacía
   * —los tres roles que entraban podían tocar cualquier fila— y el dato no
   * estaba en ninguna parte: la bitácora lo registra, pero es un rastro
   * para preguntarle a alguien, no un campo de la fila que se pueda mirar
   * al atender un `DELETE`.
   *
   * **La escribe el servidor con el usuario de la sesión, y no se acepta
   * del navegador**, igual que `Tipo Pago`. Si se aceptara, un vendedor
   * podría adjudicarse la reserva de otro y borrarla.
   *
   * **Vacía quiere decir sin dueño**, y eso es correcto en los dos casos en
   * que pasa: una reserva de Shopify la anotó el webhook y no una persona,
   * y las que ya estaban en la planilla son de antes de que esto existiera.
   * Ninguna es de ningún vendedor. Ver `puedeTocarReserva()`.
   */
  anotadaPor: 'Anotada por',
  /**
   * **Se cayó por cupo** (2026-11-12): una reserva sin pagar que se soltó
   * porque un pago llenó el día. Guarda cuándo, quién y por qué; vacía es
   * que sigue en pie. Se agrega sola la primera vez que se suelta una.
   *
   * **Es una columna propia y no un estado del pago**, a propósito: el
   * estado lo reescribe la sincronización con Shopify en cada pasada, y una
   * reserva de Shopify que allá sigue *por pagar* volvería a tomar su lugar
   * sin que nadie se entere. Esta columna Shopify no la toca
   * (`camposDeShopify()`), y `ocupaLugar()` la respeta.
   */
  liberada: 'Se cayó por cupo',
  /**
   * **La rectificación del día** (2026-11-12): lo que de verdad pasó en la
   * mesa, aparte de lo reservado. Ver `rectificacion.ts`. Shopify y la
   * cotización no las tocan: si las pisaran, la rectificación se borraría
   * sola en la próxima sincronización.
   */
  personasReales: 'Personas reales',
  menuReal: 'Menú real',
  descuento: 'Descuento',
  rectificacion: 'Rectificación',
  aprobacion: 'Aprobación',
  /**
   * **Cómo va esta reserva cuando su día se libera para un evento
   * exclusivo** (2026-11-12, `lib/exclusivo.ts`): *Avisada*, *Cancelada*,
   * *Devuelta* o *Reagendada*, con quién y cuándo. Shopify no la toca
   * (`camposDeShopify()`). Lo que libera el lugar sigue siendo `liberada`.
   */
  liberacion: 'Evento exclusivo'
} as const;

export const COL_FECHAS = {
  fecha: 'Fecha',
  capacidad: 'Capacidad Máx',
  apertura: 'Hora Apertura',
  estado: 'Estado',
  notas: 'Notas',
  /** El pedido de subir el cupo, esperando al gerente (2026-11-12). Ver `lib/cupo.ts`. */
  cupoPedido: 'Cupo pedido'
} as const;

/**
 * Las dos modalidades, **como vienen del SKU del pedido**.
 *
 * Y esa frase es toda la regla: `tipoPagoDe()` las saca del `variant_title`,
 * o sea de qué variante se compró en la tienda. **Es un hecho del pedido de
 * Shopify, no una opinión de nadie**, así que una reserva anotada a mano no
 * puede tener ninguna de las dos: no compró ninguna variante.
 *
 * Hasta el 2026-10-30 el formulario manual la dejaba elegir, y eso hacía dos
 * daños. Obligaba a inventar un dato —una reserva pagada por transferencia
 * no es "Pago directo"— y contaminaba la única señal que tenemos de que la
 * regla de medios de pago de Shopify dejó de aplicar: el aviso de "pago
 * directo sin pagar" se podía disparar a mano, sin que hubiera pasado nada
 * en la tienda.
 *
 * Lo que sí vale para las dos: **cómo va el pago** (`ESTADO_PAGO`), que es
 * lo único que el formulario manual pregunta hoy.
 */
export const TIPO_PAGO = {
  directo: 'Pago directo',
  local: 'Solo reserva'
} as const;

/**
 * El prefijo del id de una reserva anotada a mano.
 *
 * No es cosmético: el sincronizador usa la columna del id para saber qué
 * pedidos ya anotó, y los ids de Shopify son números, así que no pueden
 * chocar con esto.
 */
export const ID_MANUAL = 'MANUAL-';

/** Si esta reserva se anotó a mano, o sea si NO viene de un pedido. */
export function esManual(id: unknown): boolean {
  return String(id ?? '').trim().toUpperCase().startsWith(ID_MANUAL);
}

/**
 * El `financial_status` de Shopify, tal cual —la columna se llama "Estado
 * Pago Shopify", así que lleva el código de Shopify y no una traducción.
 *
 * `cancelado` no es un financial_status: un pedido anulado en Shopify
 * conserva el suyo (puede quedar en `paid` y reembolsarse después). Se
 * escribe aparte para que una cancelación libere el cupo de inmediato, sin
 * esperar a que alguien procese la devolución.
 */
export const ESTADO_PAGO = {
  pagado: 'paid',
  pendiente: 'pending',
  /** Pagó una parte: el `partially_paid` de Shopify (2026-11-11). */
  abonado: 'partially_paid',
  reembolsado: 'refunded',
  anulado: 'voided',
  cancelado: 'cancelled'
} as const;

/**
 * La asistencia, para los no-shows. Vacío significa "todavía no se sabe":
 * no se puede marcar a alguien como ausente antes del día.
 */
export const ASISTENCIA = {
  sinMarcar: '',
  vino: 'Sí',
  noVino: 'No'
} as const;

/**
 * El estado de un día en "Fechas Hábiles".
 *
 * **Abierta / Cerrada**, porque son opuestos de verdad. "Activa / Cerrada"
 * no lo son, y "Abierta / Bloqueada" —lo que el panel escribía antes— suena
 * a dos cosas distintas: bloqueado da a entender "reservado para otra cosa",
 * no "no abre".
 *
 * Las 24 filas que trae la planilla dicen `Activa`. No se tocan y siguen
 * funcionando, porque estaCerrado() reconoce las dos; lo que el panel escriba
 * de aquí en adelante dirá `Abierta`.
 */
export const ESTADO_DIA = {
  abierta: 'Abierta',
  /**
   * Abierto para nosotros, **no ofrecido en el sitio**.
   *
   * Es el día del evento privado: se vendió entero, hay que verlo en el
   * panel con su reserva y su cupo, pero **no puede aparecer en el
   * calendario del sitio**, porque ahí significaría que cualquiera puede
   * comprar un lugar en el cumpleaños de otro.
   *
   * Sin este estado la única forma de ver ese día en el panel era abrirlo,
   * y abrirlo lo publicaba. Eran dos cosas que no tenían por qué ir juntas.
   */
  privada: 'Privada',
  /**
   * **Privado y exclusivo**: el recinto se arrendó completo a un solo
   * cliente.
   *
   * Es la distinción que pidió el cliente el 2026-11-02, y no es un matiz:
   * un día privado corriente **no toma el recinto en exclusiva** —pueden
   * correr dos eventos privados a la vez, y de hecho pasa—, mientras que un
   * día exclusivo sí. O sea que la pregunta "¿cabe otro evento este día?"
   * tiene respuestas opuestas en los dos, y hasta acá el panel no tenía
   * dónde anotar la diferencia.
   *
   * Para el panel es un día privado con todas sus letras: no se ofrece en el
   * sitio, recibe reservas, tiene cupo y hay que cocinar. Por eso
   * `esPrivada()` también lo reconoce, y todo lo que ya trataba bien a un
   * privado lo sigue tratando bien sin cambiar una línea.
   *
   * Lo que agrega es **que no cabe nadie más**, y eso es lo que el
   * calendario del socio necesita saber: un privado va en naranjo con su
   * ocupación, un exclusivo en rojo como un día cerrado.
   */
  exclusiva: 'Privada exclusiva',
  cerrada: 'Cerrada'
} as const;

/**
 * Qué se reconoce como día abierto. Se comparan normalizados, así que
 * `ACTIVA`, `activa ` y `Hábil` entran igual.
 *
 * Están los sinónimos que alguien puede escribir a mano, y los que el panel
 * mismo escribía antes, para que las filas viejas sigan leéndose.
 */
const ABIERTOS = new Set([
  'activa', 'activo', 'abierta', 'abierto', 'disponible', 'habil', 'si', 'ok',
  // Un día privado NO está cerrado: recibe reservas, solo que no se ofrece.
  // Y uno exclusivo tampoco: es un privado al que no le cabe nadie más.
  'privada', 'privado', 'privada exclusiva', 'privado exclusivo',
  'exclusiva', 'exclusivo'
]);

/**
 * Las formas de escribir "privada". Mismo criterio tolerante que el resto.
 *
 * **Las exclusivas entran acá a propósito**: un día exclusivo es un día
 * privado, y lo que no hace es admitir otro evento. Así todo lo que ya
 * pregunta `esPrivada()` —el recorte para el sitio, el color de la tarjeta,
 * el conteo de la semana— sigue acertando sin tocarse.
 */
const PRIVADOS = new Set([
  'privada', 'privado', 'evento privado', 'cerrado al publico',
  'privada exclusiva', 'privado exclusivo', 'exclusiva', 'exclusivo',
  'recinto completo', 'arriendo exclusivo'
]);

/**
 * Las formas de escribir "exclusiva": el recinto completo, un solo cliente.
 *
 * Es un subconjunto de PRIVADOS y no una lista paralela de estados. Lo que
 * se escribe de aquí en adelante es `Privada exclusiva`; los sinónimos están
 * para lo que alguien teclee a mano en la planilla.
 */
const EXCLUSIVOS = new Set([
  'privada exclusiva', 'privado exclusivo', 'exclusiva', 'exclusivo',
  'recinto completo', 'arriendo exclusivo'
]);

/**
 * Si el día NO se ofrece en el sitio, aunque sí reciba reservas.
 *
 * Se pregunta aparte de estaCerrado() porque son dos cosas distintas: un
 * día privado está **abierto** —tiene cupo, tiene reservas, hay que
 * cocinar— y lo único que no hace es aparecer en el calendario público.
 */
export function esPrivada(estado: unknown): boolean {
  return PRIVADOS.has(normalizar(String(estado ?? '')));
}

/**
 * Si el recinto se arrendó **completo y en exclusiva** ese día.
 *
 * Se pregunta aparte de `esPrivada()`, y las dos son ciertas a la vez en un
 * día exclusivo: lo primero dice *no se ofrece en el sitio*, lo segundo
 * dice *no cabe otro evento*. Juntarlas en un estado solo era justamente lo
 * que impedía distinguir los dos casos que el cliente nombró.
 *
 * **Falla hacia lo menos restrictivo**, al revés que `estaCerrado()`, y
 * también a propósito: lo que no se reconoce queda como privado corriente.
 * Los dos errores no cuestan lo mismo. Un exclusivo leído como privado
 * deja que alguien cotice un segundo evento, y eso se descubre
 * conversando; un privado leído como exclusivo le marca al socio la fecha
 * como tomada y le hace perder una venta que sí se podía hacer, sin que
 * nadie se entere nunca.
 */
export function esExclusiva(estado: unknown): boolean {
  return EXCLUSIVOS.has(normalizar(String(estado ?? '')));
}

/**
 * Si un día NO recibe reservas.
 *
 * **Falla cerrando, a propósito, y esa asimetría es la razón de que esto sea
 * una función y no un `startsWith` repetido en dos archivos.** Antes se
 * tomaba por cerrado solo lo que empezaba con "bloq", o sea que cualquier
 * otra palabra caía en abierto: un `Cerrada`, un `Inactiva` o un error de
 * tecleo dejaban el día recibiendo reservas.
 *
 * Los dos errores posibles no cuestan lo mismo. Un día abierto que se lee
 * cerrado pierde reservas, y se nota en el panel. Un día cerrado que se lee
 * abierto deja entrar hasta 60 personas a un día que no abre, y se nota
 * cuando llegan. Por eso solo lo explícitamente reconocido abre.
 *
 * La celda **en blanco sí abre**: la fila existe porque alguien puso ese día
 * en el calendario, y el estado vacío es "sin novedad", no "cerrado".
 */
export function estaCerrado(estado: unknown): boolean {
  const e = normalizar(String(estado ?? ''));
  if (e === '') return false;
  return !ABIERTOS.has(e);
}

export type TipoPago = (typeof TIPO_PAGO)[keyof typeof TIPO_PAGO];

/**
 * "Capacidad Máx" -> "capacidad max". Sin tildes y sin mayúsculas, para que
 * una tilde de más o de menos en el encabezado no rompa nada.
 */
export function normalizar(s: string): string {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Dado el encabezado de la hoja, en qué posición está cada campo.
 * Devuelve -1 para los que no encuentra, y el diagnóstico los lista.
 */
export function indices<T extends Record<string, string>>(
  encabezado: string[],
  columnas: T
): Record<keyof T, number> {
  const norm = encabezado.map(normalizar);
  const salida = {} as Record<keyof T, number>;
  for (const campo of Object.keys(columnas) as (keyof T)[]) {
    salida[campo] = norm.indexOf(normalizar(columnas[campo]));
  }
  return salida;
}

/** Los campos que no aparecen en el encabezado. Vacío = todo bien. */
export function faltantes<T extends Record<string, string>>(
  encabezado: string[],
  columnas: T
): string[] {
  const idx = indices(encabezado, columnas);
  return (Object.keys(columnas) as (keyof T)[])
    .filter((c) => idx[c] === -1)
    .map((c) => columnas[c]);
}
