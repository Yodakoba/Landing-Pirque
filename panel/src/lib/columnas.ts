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
  creada: 'Creada'
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

/** El `financial_status` de Shopify, tal cual. */
export const ESTADO_PAGO = {
  pagado: 'paid',
  pendiente: 'pending',
  reembolsado: 'refunded',
  anulado: 'voided'
} as const;

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
