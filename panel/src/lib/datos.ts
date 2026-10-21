/**
 * Leer y escribir las dos hojas. Traduce entre las filas de la planilla y
 * los objetos del panel, usando el mapeo de columnas.ts.
 *
 * SOBRE ESCRIBIR, que conviene tener presente: el Apps Script que sincroniza
 * los pedidos de Shopify también escribe esta planilla. Son dos escritores
 * sin bloqueo entre ellos, así que dos escrituras simultáneas pueden pisarse.
 * El riesgo es bajo con este volumen —reservas de fin de semana, no un flujo
 * continuo— pero es real. Por eso las reservas creadas acá llevan un id
 * MANUAL-<timestamp>: no pueden chocar con los ids numéricos de Shopify.
 */
import { leerHoja, agregarFila, escribirFila, borrarFila, escribirBloque } from './sheets.ts';
import {
  HOJA_RESERVAS, HOJA_FECHAS, COL_RESERVAS, COL_FECHAS,
  indices, faltantes
} from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';
import { filaReserva, filaFecha, buscarFilaPorId } from './filas.ts';
import { HOJA_CONFIG, leerConfigDe, aFilasConfig, POR_DEFECTO,
         type Config } from './config.ts';
import { camposDeShopify } from './shopify.ts';
import { esFecha } from './fechas.ts';

const num = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/* ---------- Reservas ---------- */

export async function leerReservas(): Promise<Reserva[]> {
  const filas = await leerHoja(HOJA_RESERVAS);
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_RESERVAS);
  const en = (f: string[], k: number) => (k === -1 ? '' : (f[k] ?? ''));

  const salida: Reserva[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const fecha = String(en(f, i.fecha)).slice(0, 10);
    if (!esFecha(fecha)) continue;          // filas vacías o con basura, fuera
    const monto = en(f, i.monto);
    salida.push({
      id: String(en(f, i.id)),
      fecha,
      nombre: String(en(f, i.nombre)),
      email: String(en(f, i.email)),
      telefono: String(en(f, i.telefono)),
      menu: String(en(f, i.menu)),
      personas: num(en(f, i.personas)),
      monto: monto === '' ? null : num(monto),
      tipoPago: String(en(f, i.tipoPago)) as Reserva['tipoPago'],
      estadoPago: String(en(f, i.estadoPago)),
      creada: String(en(f, i.creada)),
      asistencia: String(en(f, i.asistencia)),
      fila: n + 1                            // 1-based, y la 1 es el encabezado
    });
  }
  return salida;
}

export async function crearReserva(r: Omit<Reserva, 'id' | 'fila' | 'creada'>): Promise<string> {
  const filas = await leerHoja(HOJA_RESERVAS);
  const enc = filas[0] ?? [];
  // MANUAL- para que no pueda chocar con un id de Shopify, que es numérico.
  const id = 'MANUAL-' + Date.now();
  await agregarFila(HOJA_RESERVAS, filaReserva(enc, {
    ...r, id, creada: new Date().toISOString()
  }));
  return id;
}

export async function editarReserva(fila: number, cambios: Partial<Reserva>): Promise<void> {
  const filas = await leerHoja(HOJA_RESERVAS);
  const enc = filas[0] ?? [];
  const previa = filas[fila - 1];
  if (!previa) throw new Error(`La fila ${fila} ya no existe en la planilla.`);
  await escribirFila(HOJA_RESERVAS, fila, filaReserva(enc, cambios, previa));
}

export async function borrarReserva(fila: number): Promise<void> {
  await borrarFila(HOJA_RESERVAS, fila);
}

/* ---------- Fechas hábiles ---------- */

export async function leerFechas(): Promise<FechaHabil[]> {
  const filas = await leerHoja(HOJA_FECHAS);
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_FECHAS);
  const en = (f: string[], k: number) => (k === -1 ? '' : (f[k] ?? ''));

  const salida: FechaHabil[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const fecha = String(en(f, i.fecha)).slice(0, 10);
    if (!esFecha(fecha)) continue;
    salida.push({
      fecha,
      capacidad: num(en(f, i.capacidad)),
      apertura: String(en(f, i.apertura)) || '13:00',
      // Se pasa tal cual lo que diga la celda, incluso en blanco: quien decide
      // si eso es abierto o cerrado es estaCerrado(), en un solo lugar.
      estado: String(en(f, i.estado)),
      notas: String(en(f, i.notas)),
      fila: n + 1
    });
  }
  return salida;
}

export async function guardarFecha(d: Omit<FechaHabil, 'fila'>): Promise<void> {
  const filas = await leerHoja(HOJA_FECHAS);
  const enc = filas[0] ?? [];
  const i = indices(enc, COL_FECHAS);
  // Una fecha no puede estar dos veces: si ya está, se actualiza.
  const n = filas.findIndex((f, k) =>
    k > 0 && i.fecha !== -1 && String(f[i.fecha] ?? '').slice(0, 10) === d.fecha);
  if (n > 0) await escribirFila(HOJA_FECHAS, n + 1, filaFecha(enc, d, filas[n]));
  else await agregarFila(HOJA_FECHAS, filaFecha(enc, d));
}

export async function borrarFecha(fila: number): Promise<void> {
  await borrarFila(HOJA_FECHAS, fila);
}

/* ---------- Diagnóstico ---------- */

/**
 * Qué columnas no se encontraron. Existe porque el modo de falla natural de
 * esto es quedarse callado: si un encabezado no calza, la columna se lee
 * vacía y el panel se ve bien con datos que no están.
 */
export async function diagnostico() {
  const [res, fec] = await Promise.all([
    leerHoja(HOJA_RESERVAS).catch(() => [] as string[][]),
    leerHoja(HOJA_FECHAS).catch(() => [] as string[][])
  ]);
  return {
    [HOJA_RESERVAS]: {
      existe: res.length > 0,
      encabezado: res[0] ?? [],
      faltan: faltantes(res[0] ?? [], COL_RESERVAS),
      filas: Math.max(0, res.length - 1)
    },
    [HOJA_FECHAS]: {
      existe: fec.length > 0,
      encabezado: fec[0] ?? [],
      faltan: faltantes(fec[0] ?? [], COL_FECHAS),
      filas: Math.max(0, fec.length - 1)
    }
  };
}

/* ---------- Configuración ---------- */

/**
 * Los parámetros del negocio.
 *
 * **Si la pestaña `Config` no existe, devuelve los valores por defecto en
 * vez de fallar.** Es deliberado: el panel tiene que arrancar contra una
 * planilla recién creada, y esa pestaña solo hace falta para cambiar algo.
 */
export async function leerConfig(): Promise<Config> {
  try {
    return leerConfigDe(await leerHoja(HOJA_CONFIG));
  } catch {
    return POR_DEFECTO;
  }
}

/** Reescribe la pestaña entera, creándola si hace falta. */
export async function guardarConfig(c: Config): Promise<void> {
  await escribirBloque(HOJA_CONFIG, aFilasConfig(c));
}

/* ---------- Guardar un pedido de Shopify ---------- */

/**
 * Anota o actualiza la reserva de un pedido, buscándola por `ID Orden`.
 *
 * **Es idempotente, y eso no es un lujo: Shopify REINTENTA.** Si nuestra
 * respuesta tarda o falla, manda el mismo webhook otra vez, y además
 * `orders/updated` llega cada vez que el pedido cambia. Sin buscar primero,
 * la misma reserva se anotaría dos, tres o diez veces, y cada copia
 * descontaría cupo de un día real.
 *
 * Al actualizar solo se escriben las columnas de Shopify: la asistencia que
 * alguien marcó a mano no se pisa. Ver `camposDeShopify()`.
 *
 * Devuelve qué pasó, para poder contarlo en el registro sin tener que
 * adivinarlo después.
 */
export async function guardarPedido(
  r: Omit<Reserva, 'fila'>
): Promise<'creada' | 'actualizada'> {
  const filas = await leerHoja(HOJA_RESERVAS);
  const enc = filas[0] ?? [];
  const fila = buscarFilaPorId(filas, enc, r.id);

  if (fila > 1) {
    await escribirFila(HOJA_RESERVAS, fila,
      filaReserva(enc, camposDeShopify(r), filas[fila - 1]));
    return 'actualizada';
  }
  await agregarFila(HOJA_RESERVAS, filaReserva(enc, r));
  return 'creada';
}
