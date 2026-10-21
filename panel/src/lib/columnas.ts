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
  asistencia: 'Asistencia'
} as const;

export const COL_FECHAS = {
  fecha: 'Fecha',
  capacidad: 'Capacidad Máx',
  apertura: 'Hora Apertura',
  estado: 'Estado',
  notas: 'Notas'
} as const;

/** Las dos modalidades, como vienen del SKU del pedido. */
export const TIPO_PAGO = {
  directo: 'Pago directo',
  local: 'Solo reserva'
} as const;

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
  'activa', 'activo', 'abierta', 'abierto', 'disponible', 'habil', 'si', 'ok'
]);

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
