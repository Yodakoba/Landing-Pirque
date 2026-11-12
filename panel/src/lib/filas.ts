/**
 * Traducir entre las filas de la planilla y los objetos del panel, en los
 * dos sentidos: armar una fila para escribirla, y leer las filas que vuelven.
 *
 * Vive aparte de datos.ts a propósito: acá no se importa googleapis, así que
 * esto se puede probar sin red y sin credenciales. Es justo la pieza donde un
 * error se ve recién en la planilla del cliente, ya escrito.
 */
import { indices, COL_RESERVAS, COL_FECHAS, esManual } from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';
import { esFecha } from './fechas.ts';

const num = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Respeta el orden REAL del encabezado, no el nuestro.
 *
 * `previa` es la fila como está hoy en la planilla. Cuando viene, esto es una
 * edición parcial: **solo se escriben los campos presentes en `r`**, y lo que
 * no venga queda tal cual. Eso es lo que permite marcar la asistencia de una
 * reserva mandando solo `{asistencia}` sin borrarle el nombre y el correo.
 */
export function filaReserva(
  enc: string[], r: Partial<Reserva>, previa?: string[]
): unknown[] {
  const i = indices(enc, COL_RESERVAS);
  const fila = previa ? [...previa] : new Array(enc.length).fill('');
  while (fila.length < enc.length) fila.push('');
  // `undefined` significa "no tocar esta columna"; `null` significa "vaciarla".
  const poner = (k: number, v: unknown) => {
    if (k !== -1 && v !== undefined) fila[k] = v ?? '';
  };
  poner(i.id, r.id);
  poner(i.fecha, r.fecha);
  poner(i.nombre, r.nombre);
  poner(i.email, r.email);
  poner(i.telefono, r.telefono);
  poner(i.menu, r.menu);
  poner(i.personas, r.personas);
  poner(i.monto, r.monto);
  poner(i.tipoPago, r.tipoPago);
  poner(i.estadoPago, r.estadoPago);
  poner(i.creada, r.creada);
  poner(i.asistencia, r.asistencia);
  poner(i.notaPago, r.notaPago);
  poner(i.llegaron, r.llegaron === undefined ? undefined : r.llegaron === null ? '' : r.llegaron);
  poner(i.avisoRecepcion, r.avisoRecepcion);
  poner(i.abonado, r.abonado === undefined ? undefined : r.abonado === null ? '' : r.abonado);
  poner(i.eventoCRM, r.eventoCRM);
  poner(i.anotadaPor, r.anotadaPor);
  poner(i.liberada, r.liberada);
  poner(i.personasReales, r.personasReales === undefined ? undefined : r.personasReales === null ? '' : r.personasReales);
  poner(i.menuReal, r.menuReal);
  poner(i.descuento, r.descuento === undefined ? undefined : r.descuento === null ? '' : r.descuento);
  poner(i.rectificacion, r.rectificacion);
  poner(i.aprobacion, r.aprobacion);
  return fila;
}

/** Lo mismo para la hoja de fechas hábiles. */
export function filaFecha(
  enc: string[], f: Partial<FechaHabil>, previa?: string[]
): unknown[] {
  const i = indices(enc, COL_FECHAS);
  const fila = previa ? [...previa] : new Array(enc.length).fill('');
  while (fila.length < enc.length) fila.push('');
  const poner = (k: number, v: unknown) => {
    if (k !== -1 && v !== undefined) fila[k] = v ?? '';
  };
  poner(i.fecha, f.fecha);
  poner(i.capacidad, f.capacidad);
  poner(i.apertura, f.apertura);
  poner(i.estado, f.estado);
  poner(i.notas, f.notas);
  poner(i.cupoPedido, f.cupoPedido);
  return fila;
}

/**
 * En qué fila está el pedido con ese id, o -1 si no está.
 *
 * Vive acá, separado de la escritura, porque **es la pieza que hace
 * idempotente al sincronizador** y por eso hay que poder probarla. Si esta
 * búsqueda falla, Shopify reintenta un webhook y la misma reserva se anota
 * dos veces, descontando cupo dos veces de un día real.
 *
 * Compara como texto y sin espacios: el id de Shopify es numérico, y la
 * planilla lo devuelve como número o como cadena según cómo quedó
 * formateada la celda. Un `1007` y un `"1007 "` son el mismo pedido.
 *
 * Devuelve la fila 1-based como la ve la planilla, igual que `Reserva.fila`.
 */
export function buscarFilaPorId(
  filas: string[][], enc: string[], id: unknown
): number {
  const i = indices(enc, COL_RESERVAS);
  const buscado = String(id ?? '').trim();
  // Un id vacío no puede calzar con las filas sin id, que son justamente
  // las que hay que ignorar.
  if (i.id === -1 || buscado === '') return -1;
  for (let n = 1; n < filas.length; n++) {
    if (String(filas[n]?.[i.id] ?? '').trim() === buscado) return n + 1;
  }
  return -1;
}

/**
 * Las filas de la pestaña, ya como reservas. **Puro, para poder probarlo.**
 *
 * **Una fila cuyo `ID Orden` ya apareció se descarta**, y eso es lo único
 * raro que hace esta función. El motivo, confirmado por el cliente el
 * 2026-11-01 con dos filas idénticas del pedido `7345141809369`:
 *
 * `guardarPedido()` es idempotente *buscando primero por esa columna*, pero
 * eso es **leer-y-después-escribir sin bloqueo**, y la API de Sheets no da
 * ninguno. Shopify manda `orders/create` y `orders/paid` casi juntos,
 * reintenta si tardamos más de cinco segundos, y la reconciliación diaria es
 * un tercer escritor: dos que lean la planilla antes de que el otro escriba
 * agregan los dos. **La ventana no se puede cerrar sin un candado que no
 * existe** — lo que sí se puede es dejar de contar dos veces lo mismo.
 *
 * Y eso es correcto por definición: **el mismo `ID Orden` es el mismo
 * pedido**. Sin esto, el día cuenta esa gente dos veces, el cupo se achica
 * solo, la cocina prepara de más y el total del día miente.
 *
 * **No se esconde: se avisa.** La fila que sobrevive lleva `duplicadas` con
 * cuántas filas hay, la página del día lo marca y `/api/diagnostico` las
 * nombra, para que alguien borre la de más en la planilla. Borrarla desde
 * acá sería peor: el panel no sabe si alguien la duplicó a mano queriendo.
 *
 * Las anotadas a mano no entran en esto: su id es `MANUAL-<timestamp>` y es
 * único por construcción.
 */
export function leerReservasDe(filas: string[][]): Reserva[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_RESERVAS);
  const en = (f: string[], k: number) => (k === -1 ? '' : (f[k] ?? ''));

  const salida: Reserva[] = [];
  const vistas = new Map<string, Reserva>();
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const fecha = String(en(f, i.fecha)).slice(0, 10);
    if (!esFecha(fecha)) continue;          // filas vacías o con basura, fuera

    const id = String(en(f, i.id));
    const repetible = id.trim() !== '' && !esManual(id);
    const antes = repetible ? vistas.get(id.trim()) : undefined;
    if (antes) {
      // Se queda la primera —la que ya tiene su `fila`, por la que se edita—
      // y esta solo suma al contador que después lo delata en pantalla.
      antes.duplicadas = (antes.duplicadas ?? 1) + 1;
      continue;
    }

    const monto = en(f, i.monto);
    const reserva: Reserva = {
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
      notaPago: String(en(f, i.notaPago)),
      llegaron: String(en(f, i.llegaron)).trim() === '' ? null : num(en(f, i.llegaron)),
      avisoRecepcion: String(en(f, i.avisoRecepcion)),
      abonado: String(en(f, i.abonado)).trim() === '' ? null : num(en(f, i.abonado)),
      eventoCRM: String(en(f, i.eventoCRM)),
      anotadaPor: String(en(f, i.anotadaPor)),
      liberada: String(en(f, i.liberada)),
      personasReales: String(en(f, i.personasReales)).trim() === '' ? null : num(en(f, i.personasReales)),
      menuReal: String(en(f, i.menuReal)),
      descuento: String(en(f, i.descuento)).trim() === '' ? null : num(en(f, i.descuento)),
      rectificacion: String(en(f, i.rectificacion)),
      aprobacion: String(en(f, i.aprobacion)),
      fila: n + 1                            // 1-based, y la 1 es el encabezado
    };
    salida.push(reserva);
    if (repetible) vistas.set(id.trim(), reserva);
  }
  return salida;
}

/**
 * Los `ID Orden` que aparecen más de una vez, con cuántas filas tiene cada
 * uno. Vacío es lo normal.
 *
 * **El mismo id es el mismo pedido, por definición**: `guardarPedido()`
 * busca por esa columna justamente para no anotarlo dos veces. Que aparezca
 * repetido significa que dos escrituras se cruzaron —Shopify manda
 * `orders/create` y `orders/paid` casi juntos, y además reintenta— y las dos
 * leyeron la planilla antes de que la otra escribiera.
 *
 * Las anotadas a mano no cuentan: su id es `MANUAL-<timestamp>` y es único
 * por construcción.
 */
export function idsRepetidos(filas: string[][]): { id: string; filas: number }[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_RESERVAS);
  if (i.id === -1) return [];
  const cuenta = new Map<string, number>();
  for (let n = 1; n < filas.length; n++) {
    const id = String(filas[n]?.[i.id] ?? '').trim();
    if (!id || esManual(id)) continue;
    cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
  }
  return [...cuenta].filter(([, c]) => c > 1).map(([id, c]) => ({ id, filas: c }));
}
