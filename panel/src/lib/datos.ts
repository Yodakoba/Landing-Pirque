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
import { leerHoja, agregarFila, agregarFilas, escribirFila, borrarFila, borrarFilas,
         escribirBloque, asegurarEncabezado, esPestanaQueNoExiste } from './sheets.ts';
import {
  HOJA_RESERVAS, HOJA_FECHAS, COL_RESERVAS, COL_FECHAS,
  indices, faltantes
} from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';
import { filaReserva, filaFecha, buscarFilaPorId } from './filas.ts';
import { HOJA_CONFIG, leerConfigDe, aFilasConfig, POR_DEFECTO,
         type Config } from './config.ts';
import { camposDeShopify } from './shopify.ts';
import { HOJA_MENUS, leerMenusDe, aFilasMenus, POR_DEFECTO_MENUS,
         type Menu } from './menus.ts';
import { esFecha, type Fecha } from './fechas.ts';
import { normalizar } from './columnas.ts';
import { HOJA_USUARIOS, leerUsuariosDe, aFilasUsuarios, type Usuario } from './usuarios.ts';
import {
  HOJA_BITACORA, ENCABEZADO_BITACORA, filaBitacora, leerBitacoraDe,
  ahoraEnChile, recortar, type Anotacion
} from './bitacora.ts';
import {
  HOJA_PUESTOS, HOJA_TRABAJADORES, HOJA_TURNOS, ENCABEZADO_TURNOS,
  leerPuestosDe, aFilasPuestos, leerTrabajadoresDe, aFilasTrabajadores,
  leerTurnosDe, filaTurno, normalizarPlan, COL_TURNOS,
  POR_DEFECTO_PUESTOS, type Puesto, type Trabajador, type Turno
} from './equipo.ts';

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
  const [res, fec, tur] = await Promise.all([
    leerHoja(HOJA_RESERVAS).catch(() => [] as string[][]),
    leerHoja(HOJA_FECHAS).catch(() => [] as string[][]),
    // Los turnos también se leen por encabezado, así que también pueden
    // fallar en silencio si alguien renombra una columna a mano.
    leerHoja(HOJA_TURNOS).catch(() => [] as string[][])
  ]);
  return {
    [HOJA_TURNOS]: {
      existe: tur.length > 0,
      encabezado: tur[0] ?? [],
      faltan: faltantes(tur[0] ?? [], COL_TURNOS),
      filas: Math.max(0, tur.length - 1)
    },
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

/* ---------- Menús ---------- */

/**
 * La lista de menús. Si la pestaña no existe, los de siempre.
 *
 * Mismo criterio que la configuración: el panel arranca contra una planilla
 * recién creada y la pestaña solo hace falta para cambiar algo.
 */
export async function leerMenus(): Promise<Menu[]> {
  try {
    const lista = leerMenusDe(await leerHoja(HOJA_MENUS));
    return lista.length ? lista : POR_DEFECTO_MENUS;
  } catch {
    return POR_DEFECTO_MENUS;
  }
}

/** Reescribe la pestaña entera, creándola si hace falta. */
export async function guardarMenus(menus: Menu[]): Promise<void> {
  await escribirBloque(HOJA_MENUS, aFilasMenus(menus));
}

/* ---------- El equipo ---------- */

/**
 * Los puestos. Si la pestaña no existe, los siete de siempre.
 *
 * Mismo criterio que los menús y la configuración: el panel arranca contra
 * una planilla recién creada, y la pestaña solo hace falta para cambiar algo.
 */
export async function leerPuestos(): Promise<Puesto[]> {
  try {
    const lista = leerPuestosDe(await leerHoja(HOJA_PUESTOS));
    return lista.length ? lista : POR_DEFECTO_PUESTOS;
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return POR_DEFECTO_PUESTOS;
    throw e;
  }
}

export async function guardarPuestos(puestos: Puesto[]): Promise<void> {
  await escribirBloque(HOJA_PUESTOS, aFilasPuestos(puestos));
}

/**
 * Los trabajadores. Acá NO hay lista por defecto: quiénes son es dato del
 * negocio, y sembrar nombres inventados sería peor que una lista vacía.
 */
export async function leerTrabajadores(): Promise<Trabajador[]> {
  try {
    return leerTrabajadoresDe(await leerHoja(HOJA_TRABAJADORES));
  } catch (e) {
    // Lista vacía SOLO si la pestaña todavía no existe. Cualquier otra falla
    // se propaga: un "no hay trabajadores" cuando en realidad no se pudo leer
    // manda a buscar el problema donde no está, y además deja guardar la
    // lista encima de una que no se alcanzó a leer.
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

export async function guardarTrabajadores(gente: Trabajador[]): Promise<void> {
  await escribirBloque(HOJA_TRABAJADORES, aFilasTrabajadores(gente));
}

/** Todos los turnos. Si la pestaña no existe todavía, ninguno. */
export async function leerTurnos(): Promise<Turno[]> {
  try {
    return leerTurnosDe(await leerHoja(HOJA_TURNOS));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Reemplaza el equipo de UN día, sin tocar los demás.
 *
 * Borra las filas de esa fecha y escribe las nuevas. Se hace así —y no
 * reescribiendo la pestaña entera— porque la pestaña entera son todos los
 * fines de semana del año: un error al guardar el equipo de un sábado no
 * puede llevarse por delante el historial de los otros.
 *
 * **El riesgo a asumir es el mismo que ya tiene el resto del panel**: entre
 * leer y escribir no hay bloqueo, así que dos personas planificando el mismo
 * día a la vez pueden pisarse. Con dos o tres personas y un día por vez es
 * improbable; vale saber que es posible.
 */
export async function guardarEquipoDelDia(
  fecha: Fecha, turnos: Omit<Turno, 'fila'>[]
): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_TURNOS, ENCABEZADO_TURNOS);
  const enc = filas[0] ?? ENCABEZADO_TURNOS;

  const previas = leerTurnosDe(filas).filter((t) => t.fecha === fecha).map((t) => t.fila);
  // Una persona, un puesto por día. Lo garantiza normalizarPlan(), no la
  // interfaz: una llamada directa a la API tiene que obedecer la misma regla.
  const nuevos = normalizarPlan(turnos.map((t) => ({ ...t, fecha })));

  // **Los sueldos los propone el servidor, no el navegador.**
  //
  // Un turno al que todavía no se le pasó lista hereda los valores de la
  // ficha del trabajador. Así el encargado puede pasar lista y corregir
  // montos sin que su pantalla reciba nunca la tabla de sueldos del equipo
  // entero — que no necesita y que no es dato suyo.
  //
  // **Solo mientras la asistencia esté sin marcar.** Pasada la lista, lo que
  // venga manda: ahí el monto ya es un hecho del día y no una propuesta, y
  // volver a aplicarle la ficha reescribiría una corrección hecha a mano.
  const fichas = new Map((await leerTrabajadores()).map((t) => [normalizar(t.nombre), t]));
  for (const t of nuevos) {
    if (t.asistencia !== '') continue;
    const ficha = fichas.get(normalizar(t.trabajador));
    if (!ficha) continue;
    if (!t.pagoJornada) t.pagoJornada = ficha.pagoJornada;
    if (!t.valorHora) t.valorHora = ficha.valorHora;
  }

  // Borrar PRIMERO y agregar después. Al revés, las filas nuevas moverían
  // los índices de las viejas y se borrarían las equivocadas.
  await borrarFilas(HOJA_TURNOS, previas);
  await agregarFilas(HOJA_TURNOS, nuevos.map((t) => filaTurno(enc, t)));
}

/* ---------- Las cuentas del panel ---------- */

/**
 * Los usuarios. Si la pestaña no existe, ninguno.
 *
 * **Que no haya usuarios no deja a nadie afuera**: `PANEL_USUARIO` y
 * `PANEL_CLAVE` siguen siendo una cuenta de administrador que vive en el
 * entorno. Es la puerta de emergencia, y existe justamente para el día en
 * que la planilla no responda o alguien borre la última cuenta.
 */
export async function leerUsuarios(): Promise<Usuario[]> {
  try {
    return leerUsuariosDe(await leerHoja(HOJA_USUARIOS));
  } catch {
    return [];
  }
}

export async function guardarUsuarios(lista: Usuario[]): Promise<void> {
  await escribirBloque(HOJA_USUARIOS, aFilasUsuarios(lista));
}

/* ---------- La bitácora ---------- */

/**
 * Anota una acción.
 *
 * **Si falla, no voltea la acción.** Es una decisión con filo: significa que
 * en teoría puede quedar un cambio hecho y sin registrar. La alternativa
 * —cancelar la reserva que alguien acaba de anotar porque la planilla no
 * aceptó una línea de registro— es peor para el negocio, y el fallo queda en
 * los logs de Vercel para que no desaparezca del todo.
 */
export async function anotar(a: {
  /** Quién lo hizo. Es el mismo campo que devuelve `quienEs()`, para que
      una ruta pueda escribir `{ ...quien, accion }` sin traducir nada. */
  usuario: string; rol: string; accion: string; detalle?: unknown;
}): Promise<void> {
  try {
    await asegurarEncabezado(HOJA_BITACORA, ENCABEZADO_BITACORA);
    await agregarFila(HOJA_BITACORA, filaBitacora({
      cuando: ahoraEnChile(),
      quien: a.usuario,
      rol: a.rol,
      accion: a.accion,
      detalle: recortar(a.detalle)
    }));
  } catch (e) {
    console.error('No se pudo anotar en la bitácora:', (e as Error).message, a);
  }
}

/** Las últimas anotaciones, de la más reciente a la más antigua. */
export async function leerBitacora(cuantas = 200): Promise<Anotacion[]> {
  try {
    const todas = leerBitacoraDe(await leerHoja(HOJA_BITACORA));
    // Se agregan al final, así que las últimas filas son las más nuevas.
    return todas.slice(-cuantas).reverse();
  } catch {
    return [];
  }
}
