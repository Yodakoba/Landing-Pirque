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
         escribirBloque, asegurarEncabezado, asegurarColumna, asegurarHoja, leerEncabezado,
         esPestanaQueNoExiste } from './sheets.ts';
import {
  HOJA_RESERVAS, HOJA_FECHAS, COL_RESERVAS, COL_FECHAS,
  indices, faltantes, esManual, ESTADO_DIA, esExclusiva, esPrivada, estaCerrado
} from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';
import { diaParaReservaManual, queLeHizo, deshacerDia } from './dias.ts';
import { ocupaLugar } from './ocupacion.ts';
import { filaReserva, filaFecha, buscarFilaPorId, leerReservasDe,
         idsRepetidos } from './filas.ts';
import { HOJA_CONFIG, leerConfigDe, aFilasConfig, POR_DEFECTO,
         type Config } from './config.ts';
import { camposDeShopify } from './shopify.ts';
import { HOJA_MENUS, leerMenusDe, aFilasMenus, POR_DEFECTO_MENUS,
         type Menu } from './menus.ts';
import { esFecha, hoy, type Fecha } from './fechas.ts';
import { normalizar } from './columnas.ts';
import { HOJA_USUARIOS, leerUsuariosDe, aFilasUsuarios, type Usuario } from './usuarios.ts';
import { HOJA_CIERRES, COL_CIERRES, ENCABEZADO_CIERRES, leerCierresDe,
         type Cierre } from './cierres';
import { HOJA_PAGOS, ENCABEZADO_PAGOS, COL_PAGOS, leerPagosDe, filaPago, nuevoIdPago,
         HOJA_BOLETAS, ENCABEZADO_BOLETAS, leerBoletasDe, filaBoleta,
         type PagoEquipo, type Boleta } from './remuneraciones';
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
import {
  HOJA_PRESUPUESTOS, HOJA_LINEAS, ENCABEZADO_PRESUPUESTOS, ENCABEZADO_LINEAS,
  COL_PRESUPUESTOS, leerPresupuestosDe, filaPresupuesto, leerLineasDe, filaLinea,
  normalizarLineas, posiblesPorDia, lineasDe, reservaDesdePresupuesto, totalDe,
  type Presupuesto, type LineaPresupuesto, type Posibles, type LineaEntrante,
  ESTADO_PRESUPUESTO
} from './presupuestos.ts';
import { conCliente } from './cotizar.ts';
import { HOJA_COBROS, ENCABEZADO_COBROS, leerCobrosDe, filaCobro, cobrosDe, estadoCobros,
         type Cobro } from './cobros.ts';
import { liberaCupo, pagoPorCobros } from './pagos.ts';
import { ESTADO_PAGO } from './columnas.ts';
import {
  HOJA_COLABORADORES, HOJA_ACTIVIDADES, ENCABEZADO_ACTIVIDADES,
  leerColaboradoresDe, aFilasColaboradores, leerExtrasDe, filaExtra,
  normalizarExtras, type Colaborador, type Extra
} from './extras.ts';
import {
  HOJA_CLIENTES, ENCABEZADO_CLIENTES, leerClientesDe, filaCliente, nuevoIdCliente,
  migrarAClientes, type Cliente
} from './clientes.ts';

const num = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/* ---------- Reservas ---------- */

export async function leerReservas(): Promise<Reserva[]> {
  return leerReservasDe(await leerHoja(HOJA_RESERVAS));
}
export { leerReservasDe };

export async function crearReserva(r: Omit<Reserva, 'id' | 'fila' | 'creada'>): Promise<string> {
  const filas = await leerHoja(HOJA_RESERVAS, true);
  // La nota de pago y el evento del CRM llegaron después que la planilla, así
  // que sus columnas pueden no estar. Se agregan solas la primera vez: sin
  // esto el campo se escribiría en el formulario y no quedaría en ninguna
  // parte — una columna que el panel conoce y la planilla no se lee vacía, y
  // `filaReserva()` saltea su índice en silencio.
  //
  // **El del CRM se asegura siempre, no solo cuando viene con valor.** Si se
  // creara recién al anotar el primer ganado, la fila que lo estrena sería
  // justamente la que no lo encuentra.
  let enc = await asegurarColumna(
    HOJA_RESERVAS, filas[0] ?? [], COL_RESERVAS.notaPago);
  enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.eventoCRM);
  // **Se asegura siempre, no solo cuando viene con valor**, por lo mismo que
  // la de arriba: si se creara recién al anotar la primera reserva de un
  // vendedor, esa fila sería justamente la que no encuentra la columna — y
  // entonces la reserva nacería sin dueño y él no podría borrarla.
  enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.anotadaPor);
  // Las de la recepción (2026-11-11), por lo mismo.
  enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.llegaron);
  enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.avisoRecepcion);
  enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.abonado);
  // MANUAL- para que no pueda chocar con un id de Shopify, que es numérico.
  const id = 'MANUAL-' + Date.now();
  await agregarFila(HOJA_RESERVAS, filaReserva(enc, {
    ...r, id, creada: new Date().toISOString()
  }));
  return id;
}

export async function editarReserva(fila: number, cambios: Partial<Reserva>): Promise<void> {
  const filas = await leerHoja(HOJA_RESERVAS, true);
  let enc = cambios.notaPago === undefined
    ? (filas[0] ?? [])
    : await asegurarColumna(HOJA_RESERVAS, filas[0] ?? [], COL_RESERVAS.notaPago);
  // Las de la anfitriona se agregan solas la primera vez que se escriben.
  if (cambios.llegaron !== undefined) enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.llegaron);
  if (cambios.avisoRecepcion !== undefined) enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.avisoRecepcion);
  if (cambios.abonado !== undefined) enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.abonado);
  if (cambios.liberada !== undefined) enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.liberada);
  // La rectificación del día (2026-11-12): sus cinco columnas se agregan
  // juntas la primera vez que alguien rectifica.
  if (cambios.rectificacion !== undefined) {
    for (const c of [COL_RESERVAS.personasReales, COL_RESERVAS.menuReal, COL_RESERVAS.descuento,
                     COL_RESERVAS.rectificacion, COL_RESERVAS.aprobacion]) {
      enc = await asegurarColumna(HOJA_RESERVAS, enc, c);
    }
  }
  if (cambios.aprobacion !== undefined) enc = await asegurarColumna(HOJA_RESERVAS, enc, COL_RESERVAS.aprobacion);
  const previa = filas[fila - 1];
  if (!previa) throw new Error(`La fila ${fila} ya no existe en la planilla.`);
  await escribirFila(HOJA_RESERVAS, fila, filaReserva(enc, cambios, previa));
}

export async function borrarReserva(fila: number): Promise<void> {
  await borrarFila(HOJA_RESERVAS, fila);
}

/* ---------- Fechas hábiles ---------- */

/** `fresca`: para quien va a borrar o escribir por número de fila. */
export async function leerFechas(fresca = false): Promise<FechaHabil[]> {
  const filas = await leerHoja(HOJA_FECHAS, fresca);
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
      cupoPedido: String(en(f, i.cupoPedido)),
      fila: n + 1
    });
  }
  return salida;
}

export async function guardarFecha(d: Omit<FechaHabil, 'fila'>): Promise<void> {
  const filas = await leerHoja(HOJA_FECHAS, true);
  let enc = filas[0] ?? [];
  // `Cupo pedido` se agrega sola la primera vez que se escribe (2026-11-12).
  if (d.cupoPedido !== undefined && enc.length) enc = await asegurarColumna(HOJA_FECHAS, enc, COL_FECHAS.cupoPedido);
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
/** Dónde quedó un `#ERROR!` de la planilla, que es un dato perdido. */
function celdasConError(filas: string[][]): string[] {
  const salida: string[] = [];
  for (let n = 1; n < filas.length; n++) {
    for (const celda of filas[n] ?? []) {
      if (String(celda).startsWith('#ERROR')) { salida.push(`fila ${n + 1}`); break; }
    }
  }
  return salida;
}

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
      filas: Math.max(0, res.length - 1),
      // **Un `ID Orden` repetido es el mismo pedido anotado dos veces.** El
      // panel ya lo cuenta una sola vez al leer —ver `leerReservasDe()`— así
      // que el día no miente; lo que queda es la fila de más en la planilla,
      // y eso se nombra en vez de esconderse. Borrarla desde acá sería peor:
      // puede que alguien la haya duplicado a mano y editado.
      idsRepetidos: idsRepetidos(res),
      // Una celda que diga `#ERROR!` es un dato que la planilla se comió al
      // leerlo como fórmula. No debería volver a pasar —ver `valorSeguro()`—
      // pero las filas escritas antes del arreglo siguen ahí.
      celdasConError: celdasConError(res)
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
  const filas = await leerHoja(HOJA_RESERVAS, true);
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
  // **Pasada la lista, lo que venga manda**: ahí el monto ya es un hecho del
  // día y no una propuesta, y volver a aplicarle la ficha reescribiría una
  // corrección hecha a mano.
  //
  // **Salvo que el turno no traiga ningún monto**, y esa excepción no es un
  // detalle: desde que la asistencia también se marca en el planificador, un
  // turno puede nacer ya marcado "vino" y con los montos en cero —la pantalla
  // del encargado no recibe los sueldos de nadie, así que manda ceros—. Sin
  // esto esa persona quedaría congelada en $0 y el error aparecería recién el
  // día de pagar, que es el peor momento para descubrirlo.
  const fichas = new Map((await leerTrabajadores()).map((t) => [normalizar(t.nombre), t]));
  for (const t of nuevos) {
    if (t.asistencia !== '' && (t.pagoJornada || t.valorHora)) continue;
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

/* ---------- Las actividades extras ---------- */

/**
 * Quiénes hacen las actividades extras. Acá tampoco hay lista por defecto:
 * quién es el jinete es dato del negocio.
 */
export async function leerColaboradores(): Promise<Colaborador[]> {
  try {
    return leerColaboradoresDe(await leerHoja(HOJA_COLABORADORES));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

export async function guardarColaboradores(gente: Colaborador[]): Promise<void> {
  await escribirBloque(HOJA_COLABORADORES, aFilasColaboradores(gente));
}

/** Todas las actividades contratadas, de todos los días. */
export async function leerExtras(): Promise<Extra[]> {
  try {
    return leerExtrasDe(await leerHoja(HOJA_ACTIVIDADES));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Guarda las actividades de UN día: borra las de esa fecha y escribe las
 * nuevas, sin tocar los otros días.
 *
 * Mismo criterio que `guardarEquipoDelDia()`, y por el mismo motivo: la
 * pestaña entera es el año completo, y un error guardando un sábado no puede
 * llevarse por delante el historial.
 *
 * **El monto también lo propone el servidor.** Una línea sin confirmar
 * hereda el monto habitual de la ficha, así el encargado puede agendar y
 * corregir sin que su pantalla reciba nunca la lista de lo que cobra cada
 * proveedor. Y una línea que ya viene confirmada pero sin monto también lo
 * hereda: no es un cero corregido a mano, es uno al que nadie le puso
 * precio todavía — la misma excepción que en los turnos.
 */
export async function guardarExtrasDelDia(
  fecha: Fecha, lista: Omit<Extra, 'fila'>[]
): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_ACTIVIDADES, ENCABEZADO_ACTIVIDADES);
  const enc = filas[0] ?? ENCABEZADO_ACTIVIDADES;

  const previas = leerExtrasDe(filas).filter((e) => e.fecha === fecha).map((e) => e.fila);
  const nuevas = normalizarExtras(lista.map((e) => ({ ...e, fecha })));

  const fichas = new Map((await leerColaboradores()).map((c) => [normalizar(c.nombre), c]));
  for (const e of nuevas) {
    const ficha = fichas.get(normalizar(e.colaborador));
    if (!ficha) continue;
    if (!e.monto) e.monto = ficha.monto;
    if (!e.actividad) e.actividad = ficha.actividad;
  }

  await borrarFilas(HOJA_ACTIVIDADES, previas);
  await agregarFilas(HOJA_ACTIVIDADES, nuevas.map((e) => filaExtra(enc, e)));
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

/** Si esta instancia ya comprobó que la bitácora tiene encabezado. */
let bitacoraLista = false;

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
  /** Un administrador mirando como otro rol: la bitácora lo dice. */
  rolReal?: string;
}): Promise<void> {
  try {
    // **Sin leer la bitácora entera** (2026-11-12): antes cada acción del
    // panel traía la pestaña completa —la más larga de todas— solo para mirar
    // su primera fila, y eso gastaba una lectura del límite de Google por
    // cada clic. Ahora se mira solo el encabezado, una vez por instancia.
    if (!bitacoraLista) {
      await asegurarHoja(HOJA_BITACORA);
      const enc = await leerEncabezado(HOJA_BITACORA);
      if (!enc.some((c) => c.trim() !== '')) await escribirFila(HOJA_BITACORA, 1, ENCABEZADO_BITACORA);
      bitacoraLista = true;
    }
    await agregarFila(HOJA_BITACORA, filaBitacora({
      cuando: ahoraEnChile(),
      quien: a.usuario,
      rol: a.rolReal ? `${a.rolReal} (viendo como ${a.rol})` : a.rol,
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

/* ---------- Cierres de día ---------- */

export async function leerCierres(): Promise<Cierre[]> {
  try {
    return leerCierresDe(await leerHoja(HOJA_CIERRES));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Deja el día cerrado, o lo reabre.
 *
 * **Cerrar dos veces no agrega dos filas**: la pestaña es una fila por día
 * cerrado, y dos personas apretando el botón con un segundo de diferencia
 * no pueden dejar el registro diciendo que el día se cerró dos veces.
 */
export async function cerrarDia(fecha: Fecha, quien: string): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_CIERRES, ENCABEZADO_CIERRES);
  const enc = filas[0] ?? ENCABEZADO_CIERRES;
  const previas = leerCierresDe(filas).filter((c) => c.fecha === fecha).map((c) => c.fila);
  await borrarFilas(HOJA_CIERRES, previas);
  const i = (nombre: string) =>
    enc.findIndex((c) => String(c).trim().toLowerCase() === nombre.toLowerCase());
  const fila = new Array(Math.max(enc.length, ENCABEZADO_CIERRES.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i(COL_CIERRES.fecha), fecha);
  poner(i(COL_CIERRES.quien), quien);
  poner(i(COL_CIERRES.cuando), ahoraEnChile());
  await agregarFilas(HOJA_CIERRES, [fila]);
}

export async function reabrirDia(fecha: Fecha): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_CIERRES, ENCABEZADO_CIERRES);
  const previas = leerCierresDe(filas).filter((c) => c.fecha === fecha).map((c) => c.fila);
  await borrarFilas(HOJA_CIERRES, previas);
}

/* ---------- Pagos al equipo ---------- */

/**
 * Los pagos ya registrados.
 *
 * **Devuelve lista vacía si la pestaña no existe**, igual que los turnos y
 * las actividades: el informe tiene que funcionar antes de que nadie haya
 * pagado nada. Lo peor que puede pasar es que todo se vea pendiente, que es
 * exactamente lo que es.
 */
export async function leerPagosEquipo(): Promise<PagoEquipo[]> {
  try {
    return leerPagosDe(await leerHoja(HOJA_PAGOS));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Anota un pago. **Siempre agrega una fila, nunca edita una anterior.**
 *
 * Un pago es un hecho que pasó: corregirlo pisando el de antes borraría que
 * hubo dos movimientos. Si hay que devolver plata, se anota un pago en
 * negativo y quedan los dos en el registro.
 */
export async function anotarPagoEquipo(
  p: Omit<PagoEquipo, 'fila' | 'id' | 'fecha' | 'registradoPor'>,
  registradoPor: string
): Promise<PagoEquipo> {
  const filas = await asegurarEncabezado(HOJA_PAGOS, ENCABEZADO_PAGOS);
  // La columna Concepto llegó después que la pestaña (2026-11-04): se agrega
  // sola la primera vez, al final y sin tocar ninguna fila, igual que la
  // Nota de pago de las reservas. Sin esto el concepto se escribiría en
  // ninguna parte y el pago quedaría sin decir qué es.
  const enc = await asegurarColumna(HOJA_PAGOS, filas[0] ?? ENCABEZADO_PAGOS,
                                    COL_PAGOS.concepto);
  const completo = {
    ...p,
    id: nuevoIdPago(),
    // El día en que se transfirió lo pone el servidor: es parte del rastro,
    // no un dato que convenga dejar escribir desde afuera.
    fecha: hoy(),
    registradoPor
  };
  await agregarFilas(HOJA_PAGOS, [filaPago(completo, enc)]);
  return { ...completo, fila: -1 };
}

/**
 * Anota **varios pagos de una vez**, en una sola escritura (2026-11-04).
 *
 * Es para *"todos los sueldos de esta semana pagados"*: una transferencia
 * masiva salda a todos juntos, y anotarlos de a uno serían veinte idas a la
 * planilla. Cada pago sigue siendo **su propia fila**, con su persona y su
 * concepto: lo que se ahorra es el viaje, no el rastro.
 */
export async function anotarPagosEquipo(
  lista: Omit<PagoEquipo, 'fila' | 'id' | 'fecha' | 'registradoPor'>[],
  registradoPor: string
): Promise<PagoEquipo[]> {
  if (!lista.length) return [];
  const filas = await asegurarEncabezado(HOJA_PAGOS, ENCABEZADO_PAGOS);
  const enc = await asegurarColumna(HOJA_PAGOS, filas[0] ?? ENCABEZADO_PAGOS,
                                    COL_PAGOS.concepto);
  const base = Date.now();
  // Un id distinto por fila: el mismo milisegundo daría ids repetidos, y
  // borrar uno por error se llevaría a los demás.
  const completos = lista.map((p, k) => ({
    ...p, id: nuevoIdPago(base + k), fecha: hoy(), registradoPor
  }));
  await agregarFilas(HOJA_PAGOS, completos.map((c) => filaPago(c, enc)));
  return completos.map((c) => ({ ...c, fila: -1 }));
}

/** Borra un pago anotado por error. Se busca por id, no por posición. */
export async function borrarPagoEquipo(id: string): Promise<boolean> {
  const buscado = String(id ?? '').trim();
  if (!buscado) return false;
  const filas = await asegurarEncabezado(HOJA_PAGOS, ENCABEZADO_PAGOS);
  const suyas = leerPagosDe(filas).filter((p) => p.id === buscado).map((p) => p.fila);
  if (!suyas.length) return false;
  await borrarFilas(HOJA_PAGOS, suyas);
  return true;
}

/* ---------- Boletas (2026-11-04) ---------- */

/**
 * Las boletas recibidas. **Lista vacía si la pestaña no existe**: el
 * informe tiene que funcionar antes de que nadie marque ninguna, y entonces
 * todas se ven pendientes, que es lo que son.
 */
export async function leerBoletas(): Promise<Boleta[]> {
  try {
    return leerBoletasDe(await leerHoja(HOJA_BOLETAS));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Marca o desmarca la boleta de una persona para un periodo.
 *
 * **Marcar dos veces no agrega dos filas**, igual que cerrar un día. Y
 * desmarcar borra la fila en vez de escribir un "No": si no está, no llegó,
 * y así no hay dos filas que puedan decir cosas distintas.
 */
export async function marcarBoleta(
  quien: string, desde: Fecha, hasta: Fecha, recibida: boolean, registradoPor: string
): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_BOLETAS, ENCABEZADO_BOLETAS);
  const clave = normalizar(quien);
  const suyas = leerBoletasDe(filas)
    .filter((b) => normalizar(b.quien) === clave && b.desde === desde && b.hasta === hasta);
  if (recibida) {
    if (suyas.length) return;
    await agregarFilas(HOJA_BOLETAS, [filaBoleta({
      quien, desde, hasta, registradoPor, cuando: ahoraEnChile(), nota: ''
    }, filas[0] ?? ENCABEZADO_BOLETAS)]);
  } else if (suyas.length) {
    await borrarFilas(HOJA_BOLETAS, suyas.map((b) => b.fila));
  }
}

/* ---------- Presupuestos ---------- */

/**
 * Todos los presupuestos, de todos los días.
 *
 * Devuelve lista vacía si la pestaña no existe, igual que los turnos y las
 * actividades: **el panel tiene que funcionar antes de que nadie cotice
 * nada**, y no hay que preparar la planilla para que arranque. Cualquier
 * otra falla se propaga — ver `esPestanaQueNoExiste()`.
 */
export async function leerPresupuestos(): Promise<Presupuesto[]> {
  try {
    return leerPresupuestosDe(await leerHoja(HOJA_PRESUPUESTOS));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/** Todas las líneas cotizadas, de todos los presupuestos. */
export async function leerLineasPresupuesto(): Promise<LineaPresupuesto[]> {
  try {
    return leerLineasDe(await leerHoja(HOJA_LINEAS));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Lo que cada día tiene cotizado y sin confirmar, listo para la ocupación.
 *
 * **Si las pestañas no responden, devuelve el mapa vacío y no revienta.**
 * Es deliberado y es la asimetría correcta: sin esto, una falla leyendo los
 * presupuestos —una capa comercial— dejaría sin calendario a quien vino a
 * mirar las reservas, que es lo que de verdad sostiene el día. Lo peor que
 * puede pasar es que no se vea la línea rosada.
 */
export async function posiblesDeLosDias(hoy: Fecha): Promise<Map<string, Posibles>> {
  try {
    const [p, l] = await Promise.all([leerPresupuestos(), leerLineasPresupuesto()]);
    return posiblesPorDia(p, l, hoy);
  } catch {
    return new Map();
  }
}

/** Escribe un presupuesto: lo agrega si es nuevo, lo pisa si ya está. */
export async function guardarPresupuesto(p: Omit<Presupuesto, 'fila'>): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_PRESUPUESTOS, ENCABEZADO_PRESUPUESTOS);
  // Las columnas nuevas —la ficha, los invitados, el periodo…— se agregan
  // solas en una planilla de antes: sin esto se escribirían en ninguna parte.
  const enc = await asegurarColumnas(HOJA_PRESUPUESTOS,
    filas[0] ?? ENCABEZADO_PRESUPUESTOS, ENCABEZADO_PRESUPUESTOS);
  const fila = filaPresupuesto(enc, p);
  const previo = leerPresupuestosDe(filas).find((x) => x.id === p.id);
  if (previo) await escribirFila(HOJA_PRESUPUESTOS, previo.fila, fila);
  else await agregarFilas(HOJA_PRESUPUESTOS, [fila]);
}

/**
 * Reemplaza las líneas de UN presupuesto: borra las suyas y escribe las
 * nuevas, sin tocar las de los demás.
 *
 * Mismo criterio que `guardarEquipoDelDia()` y `guardarExtrasDelDia()`: la
 * pestaña entera son todas las cotizaciones del año, y un error guardando
 * una no puede llevarse por delante las otras.
 */
export async function guardarLineas(
  id: string, lineas: LineaEntrante[]
): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_LINEAS, ENCABEZADO_LINEAS);
  const enc = await asegurarColumnas(HOJA_LINEAS, filas[0] ?? ENCABEZADO_LINEAS,
    ENCABEZADO_LINEAS);
  const previas = leerLineasDe(filas).filter((l) => l.presupuesto === id).map((l) => l.fila);
  const nuevas = normalizarLineas(lineas.map((l) => ({ ...l, presupuesto: id })));
  // **Si no cambió nada, no se escribe** (2026-11-12): el autoguardado manda
  // las líneas cada vez, y borrarlas y volver a escribirlas iguales gastaba
  // dos escrituras del límite de Google por cada cambio en otra parte.
  const comoTexto = (f: unknown[]) => f.map((c) => String(c ?? '').trim()).join('\u0001').replace(/\u0001+$/, '');
  const antes = previas.map((n) => comoTexto(filas[n - 1] ?? []));
  const despues = nuevas.map((l) => comoTexto(filaLinea(enc, l)));
  if (antes.length === despues.length && antes.every((a, i) => a === despues[i])) return;
  await borrarFilas(HOJA_LINEAS, previas);
  await agregarFilas(HOJA_LINEAS, nuevas.map((l) => filaLinea(enc, l)));
}

/** Borra un presupuesto y sus líneas. */
export async function borrarPresupuesto(id: string): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_PRESUPUESTOS, ENCABEZADO_PRESUPUESTOS);
  const suya = leerPresupuestosDe(filas).find((x) => x.id === id);
  // Las líneas primero: si falla entremedio, es preferible un presupuesto
  // sin líneas —que se ve vacío y se nota— que líneas huérfanas apuntando a
  // un presupuesto que ya no existe y que nadie va a ir a buscar.
  await guardarLineas(id, []);
  if (suya) await borrarFilas(HOJA_PRESUPUESTOS, [suya.fila]);
}

/* ---------- Clientes ---------- */

/**
 * Las fichas de clientes. Lista vacía si la pestaña no existe: el panel
 * funciona antes de que nadie anote un cliente.
 */
export async function leerClientes(): Promise<Cliente[]> {
  try {
    return leerClientesDe(await leerHoja(HOJA_CLIENTES));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

/**
 * Crea una ficha y devuelve su id.
 *
 * **Vuelve a leer justo antes de escribir** para sacar el id: si otra
 * persona creó un cliente entre que se abrió la pantalla y ahora, el número
 * correlativo ya está tomado.
 */
export async function crearCliente(c: Omit<Cliente, 'fila' | 'id'>): Promise<string> {
  const filas = await asegurarEncabezado(HOJA_CLIENTES, ENCABEZADO_CLIENTES);
  // El giro llegó después: en una planilla vieja la columna se agrega sola.
  const enc = await asegurarColumnas(HOJA_CLIENTES, filas[0] ?? ENCABEZADO_CLIENTES,
    ENCABEZADO_CLIENTES);
  const id = nuevoIdCliente(leerClientesDe(filas));
  await agregarFilas(HOJA_CLIENTES, [filaCliente(enc, { ...c, id })]);
  return id;
}

/** Reescribe una ficha que ya existe. Devuelve false si no la encontró. */
export async function editarCliente(c: Omit<Cliente, 'fila'>): Promise<boolean> {
  const filas = await asegurarEncabezado(HOJA_CLIENTES, ENCABEZADO_CLIENTES);
  const enc = await asegurarColumnas(HOJA_CLIENTES, filas[0] ?? ENCABEZADO_CLIENTES,
    ENCABEZADO_CLIENTES);
  const previo = leerClientesDe(filas).find((x) => x.id === c.id);
  if (!previo) return false;
  await escribirFila(HOJA_CLIENTES, previo.fila, filaCliente(enc, c));
  return true;
}

export async function borrarCliente(id: string): Promise<boolean> {
  const filas = await asegurarEncabezado(HOJA_CLIENTES, ENCABEZADO_CLIENTES);
  const previo = leerClientesDe(filas).find((x) => x.id === id);
  if (!previo) return false;
  await borrarFilas(HOJA_CLIENTES, [previo.fila]);
  return true;
}

/**
 * Pasa los presupuestos de antes de las fichas a fichas, y los vincula.
 *
 * **Las fichas primero, el vínculo después**, por lo mismo que convertir un
 * presupuesto en reserva: si falla entremedio quedan fichas sin vincular
 * —que se ven y se arreglan corriendo esto de nuevo, que no duplica porque
 * busca parecidos—, y nunca presupuestos apuntando a fichas que no existen.
 */
export async function migrarPresupuestosAClientes(
  quien: string, ahora: string
): Promise<{ creadas: number; vinculados: number }> {
  const [presupuestos, clientes] = await Promise.all([leerPresupuestos(), leerClientes()]);
  const { nuevos, vinculos } = migrarAClientes(presupuestos, clientes, quien, ahora);
  if (nuevos.length) {
    const filas = await asegurarEncabezado(HOJA_CLIENTES, ENCABEZADO_CLIENTES);
    const enc = filas[0] ?? ENCABEZADO_CLIENTES;
    await agregarFilas(HOJA_CLIENTES, nuevos.map((c) => filaCliente(enc, c)));
  }
  let vinculados = 0;
  for (const p of presupuestos) {
    const idCliente = vinculos[p.id];
    if (!idCliente) continue;
    await guardarPresupuesto({ ...p, idCliente });
    vinculados++;
  }
  return { creadas: nuevos.length, vinculados };
}

/**
 * Deja las columnas que faltan al final del encabezado, de a una. Si ya
 * están todas no escribe nada.
 */
async function asegurarColumnas(hoja: string, encabezado: string[], columnas: string[]) {
  let enc = encabezado;
  for (const c of columnas) enc = await asegurarColumna(hoja, enc, c);
  return enc;
}

/* ---------- La reserva que nace de una cotización (Fase 2) ---------- */

/**
 * **Reescribe la reserva de una cotización ganada** con lo que la cotización
 * dice hoy: la fecha, el cliente, los menús, las personas y el monto.
 *
 * Es la mitad de la decisión "dos pestañas sincronizadas": la reserva es
 * una copia que escribe el sistema y **se edita solo desde la cotización**.
 * Lo que es del día —si vino, cómo va el pago, la nota de pago— no se toca:
 * eso no es de la cotización.
 *
 * Devuelve la fecha que tenía la reserva antes, para que quien llame pueda
 * avisar a los dos días si se movió. Vacío si no había reserva que tocar.
 */
/**
 * Deja el día usable después de anotarle una reserva: lo crea privado con el
 * cupo de siempre, abre uno cerrado, o le pone cupo a uno que no tenía
 * (`diaParaReservaManual()`). Lo usan la reserva a mano, **marcar ganada una
 * cotización** y la reserva que se reescribe al editar una ganada
 * (2026-11-11: una ganada caía en un día sin fila y el panel lo mostraba
 * *sin cupo*, con la gente adentro).
 *
 * **Si falla, la reserva ya está guardada y no se pierde.** El día se puede
 * abrir después desde el calendario; perder la reserva por esto sería
 * cambiar un problema chico por uno grande.
 */
export async function abrirElDiaSiHaceFalta(fecha: string): Promise<'' | 'creado' | 'reabierto'> {
  try {
    const [fechas, cfg] = await Promise.all([leerFechas(), leerConfig()]);
    const actual = fechas.find((f) => f.fecha === fecha);
    const nuevo = diaParaReservaManual(actual, fecha, cfg);
    if (!nuevo) return '';
    await guardarFecha(nuevo);
    // Qué se le hizo, para que una cotización cancelada lo pueda deshacer.
    return queLeHizo(actual);
  } catch (e) {
    console.error('[reservas] abrir el dia', fecha, e);
    return '';
  }
}

/**
 * **Al cancelar una cotización, el día vuelve a como estaba** si existía
 * solo por ella (2026-11-11): `creado` se borra, `reabierto` vuelve a
 * cerrado. Solo si no le queda ninguna otra reserva que ocupe lugar
 * (`deshacerDia()`). Si falla, la cancelación ya está hecha: el día queda
 * abierto y se puede borrar a mano desde el calendario.
 */
export async function devolverElDia(fecha: string, hizo: string, idReserva: string): Promise<string> {
  try {
    if (!hizo) return '';
    const [fechas, reservas] = await Promise.all([leerFechas(true), leerReservas()]);
    const actual = fechas.find((f) => f.fecha === fecha);
    const otras = reservas.filter((r) => r.fecha === fecha && r.id !== idReserva && ocupaLugar(r)).length;
    const que = deshacerDia(actual, hizo, otras);
    if (!que || !actual) return '';
    if ('borrar' in que) { await borrarFecha(actual.fila); return 'borrado'; }
    await guardarFecha(que.dia);
    return 'cerrado';
  } catch (e) {
    console.error('[cotizaciones] devolver el dia', fecha, e);
    return '';
  }
}

/**
 * **Deja el día privado exclusivo** al ganar una cotización exclusiva
 * (2026-11-12). Devuelve cómo estaba antes —o lo que ya se había guardado al
 * dejar de venderlo—, para volverlo atrás si se cancela. Si falla, la
 * reserva ya está: el día se marca exclusivo a mano desde el calendario.
 */
export async function dejarExclusivo(fecha: string, yaPausado: string): Promise<string> {
  try {
    const dia = (await leerFechas(true)).find((f) => f.fecha === fecha);
    if (!dia) return yaPausado;
    if (esExclusiva(dia.estado)) return yaPausado;
    const { fila: _f, ...sinFila } = dia;
    await guardarFecha({ ...sinFila, estado: ESTADO_DIA.exclusiva });
    return yaPausado || dia.estado || ESTADO_DIA.abierta;
  } catch (e) {
    console.error('[cotizaciones] dejar exclusivo', fecha, e);
    return yaPausado;
  }
}

/**
 * **Devuelve el día a como estaba antes del evento exclusivo** al cancelar o
 * deshacer la ganada (2026-11-12): solo si el día sigue existiendo, sigue
 * privado y ya no le queda otra reserva que ocupe lugar.
 */
export async function devolverExclusivo(fecha: string, diaPausado: string, idReserva: string): Promise<void> {
  try {
    if (!diaPausado) return;
    const [fechas, reservas] = await Promise.all([leerFechas(true), leerReservas()]);
    const dia = fechas.find((f) => f.fecha === fecha);
    if (!dia || !esPrivada(dia.estado) || estaCerrado(dia.estado)) return;
    if (reservas.some((r) => r.fecha === fecha && r.id !== idReserva && ocupaLugar(r))) return;
    const { fila: _f, ...sinFila } = dia;
    await guardarFecha({ ...sinFila, estado: diaPausado });
  } catch (e) {
    console.error('[cotizaciones] devolver exclusivo', fecha, e);
  }
}

export async function sincronizarReserva(idPresupuesto: string): Promise<string> {
  const [presupuestos, lineas, menus, clientes] = await Promise.all([
    leerPresupuestos(), leerLineasPresupuesto(), leerMenus(), leerClientes()
  ]);
  const p = presupuestos.find((x) => x.id === idPresupuesto);
  if (!p?.idReserva) return '';
  // Una cancelada ya liberó su cupo: reescribir su reserva —o abrirle el
  // día— la traería de vuelta. Editar la ficha del cliente pasa por acá.
  if (p.estado === ESTADO_PRESUPUESTO.cancelada) return '';
  const filas = await leerHoja(HOJA_RESERVAS, true);
  const fila = buscarFilaPorId(filas, filas[0] ?? [], p.idReserva);
  if (fila < 2) return '';
  const antes = leerReservasDe(filas).find((r) => r.fila === fila);
  const r = reservaDesdePresupuesto(conCliente(p, clientes), lineasDe(lineas, p.id), menus);
  await editarReserva(fila, {
    fecha: r.fecha, nombre: r.nombre, email: r.email, telefono: r.telefono,
    menu: r.menu, personas: r.personas, monto: r.monto
  });
  // El día de la reserva tiene que poder recibirla, también si se movió de
  // fecha. De paso arregla las ganadas de antes que quedaron sin día.
  const hizo = await abrirElDiaSiHaceFalta(r.fecha);
  if (antes && antes.fecha !== r.fecha) {
    // **El día que deja vuelve a como estaba** (2026-11-11): si se abrió
    // solo para esta cotización y no le queda otra reserva, se borra o
    // vuelve a cerrado, igual que al cancelar. Sin esto, mover una ganada
    // del 11 al 18 dejaba el 11 privado y vacío en el calendario.
    await devolverElDia(antes.fecha, p.diaAbierto, p.idReserva);
    // Y lo que queda anotado es qué se le hizo al día nuevo.
    if (hizo !== p.diaAbierto) {
      const { fila: _f, ...resto } = p;
      await guardarPresupuesto({ ...resto, diaAbierto: hizo });
    }
  }
  return antes?.fecha ?? '';
}

/**
 * Los ids de las reservas que nacieron de una cotización. Una reserva de
 * esta lista **no se edita a mano** (salvo lo del día): se edita su
 * cotización y el sistema la reescribe.
 */
export async function reservasDeCotizaciones(): Promise<Map<string, string>> {
  const presupuestos = await leerPresupuestos();
  const salida = new Map<string, string>();
  for (const p of presupuestos) if (p.idReserva) salida.set(p.idReserva, p.id);
  return salida;
}

/* ---------- Cobros al cliente (2026-11-10) ---------- */

/**
 * Los cobros de las cotizaciones. **Sin la pestaña, lista vacía**: el panel
 * tiene que funcionar antes de que nadie cobre nada.
 */
export async function leerCobros(): Promise<Cobro[]> {
  try {
    return leerCobrosDe(await leerHoja(HOJA_COBROS));
  } catch (e) {
    if (esPestanaQueNoExiste(e)) return [];
    throw e;
  }
}

export async function anotarCobro(c: Omit<Cobro, 'fila'>): Promise<void> {
  const filas = await asegurarEncabezado(HOJA_COBROS, ENCABEZADO_COBROS);
  const enc = await asegurarColumnas(HOJA_COBROS, filas[0] ?? ENCABEZADO_COBROS, ENCABEZADO_COBROS);
  await agregarFilas(HOJA_COBROS, [filaCobro(enc, c)]);
}

/**
 * Cambia un cobro que ya existe: el comprobante o la revisión. Devuelve el
 * cobro como quedó, o undefined si ya no estaba.
 */
export async function editarCobro(
  id: string, cambios: Partial<Pick<Cobro, 'comprobante' | 'revisadoPor' | 'revisado'>>
): Promise<Cobro | undefined> {
  const filas = await asegurarEncabezado(HOJA_COBROS, ENCABEZADO_COBROS);
  const enc = await asegurarColumnas(HOJA_COBROS, filas[0] ?? ENCABEZADO_COBROS, ENCABEZADO_COBROS);
  const c = leerCobrosDe(filas).find((x) => x.id === id);
  if (!c) return undefined;
  const nuevo = { ...c, ...cambios };
  const { fila: _f, ...sinFila } = nuevo;
  await escribirFila(HOJA_COBROS, c.fila, filaCobro(enc, sinFila));
  return nuevo;
}

/** Borra un cobro anotado por error. Devuelve el borrado, o undefined. */
export async function borrarCobro(id: string): Promise<Cobro | undefined> {
  const filas = await asegurarEncabezado(HOJA_COBROS, ENCABEZADO_COBROS);
  const c = leerCobrosDe(filas).find((x) => x.id === id);
  if (c) await borrarFilas(HOJA_COBROS, [c.fila]);
  return c;
}

/**
 * **Cancela la reserva de una cotización** (2026-11-11): la deja en
 * `cancelled`, que libera el cupo del día y el sitio lo vuelve a ofrecer.
 * La fila no se borra: es el rastro de que ese evento existió.
 */
/**
 * **Borra la reserva de una ganada por error** (2026-11-12). No la cancela:
 * esa reserva nunca debió existir, y una cancelada se seguiría viendo en el
 * día como gente que "ya no viene". Devuelve la reserva borrada, o
 * undefined si ya no estaba —así corregir dos veces no falla—.
 */
export async function borrarReservaDe(idReserva: string): Promise<Reserva | undefined> {
  if (!idReserva) return undefined;
  const filas = await leerHoja(HOJA_RESERVAS, true);
  const fila = buscarFilaPorId(filas, filas[0] ?? [], idReserva);
  if (fila < 2) return undefined;
  const r = leerReservasDe(filas).find((x) => x.id === idReserva);
  await borrarFila(HOJA_RESERVAS, fila);
  return r;
}

/**
 * **Pasa los cobros de una alternativa a otra** (2026-11-12): el cliente
 * pagó el anticipo del evento, y se anotó en la alternativa equivocada.
 * Cada cobro conserva su fecha, su comprobante y su revisión: lo único que
 * cambia es a qué cotización pertenece.
 */
export async function moverCobros(desde: string, hacia: string): Promise<number> {
  if (!desde || !hacia || desde === hacia) return 0;
  const filas = await asegurarEncabezado(HOJA_COBROS, ENCABEZADO_COBROS);
  const enc = await asegurarColumnas(HOJA_COBROS, filas[0] ?? ENCABEZADO_COBROS, ENCABEZADO_COBROS);
  const suyos = leerCobrosDe(filas).filter((c) => c.presupuesto === desde);
  for (const c of suyos) {
    const { fila, ...sinFila } = c;
    await escribirFila(HOJA_COBROS, fila, filaCobro(enc, { ...sinFila, presupuesto: hacia }));
  }
  return suyos.length;
}

export async function cancelarReservaDe(idReserva: string): Promise<boolean> {
  if (!idReserva) return false;
  const filas = await leerHoja(HOJA_RESERVAS, true);
  const fila = buscarFilaPorId(filas, filas[0] ?? [], idReserva);
  if (fila < 2) return false;
  await editarReserva(fila, { estadoPago: ESTADO_PAGO.cancelado });
  return true;
}

/**
 * **El estado del pago de la reserva de una cotización ganada sale de sus
 * cobros**: *Pagada* cuando cubren el total, *Abonada* con lo cobrado
 * mientras falte una parte (2026-11-11), *Por pagar* sin nada.
 *
 * Una reserva que liberó su lugar —cancelada, reembolsada, anulada— no se
 * toca: eso lo decidió una persona en el día, y un cobro no la revive.
 */
export async function actualizarPagoDeReserva(idPresupuesto: string): Promise<void> {
  const [presupuestos, lineas, cobros] = await Promise.all([
    leerPresupuestos(), leerLineasPresupuesto(), leerCobros()
  ]);
  const p = presupuestos.find((x) => x.id === idPresupuesto);
  if (!p?.idReserva) return;
  const filas = await leerHoja(HOJA_RESERVAS, true);
  const fila = buscarFilaPorId(filas, filas[0] ?? [], p.idReserva);
  if (fila < 2) return;
  const r = leerReservasDe(filas).find((x) => x.fila === fila);
  if (!r || liberaCupo(r.estadoPago)) return;
  const total = totalDe(lineasDe(lineas, p.id), p.descuento);
  const e = estadoCobros({ anticipo: 0, total }, cobrosDe(cobros, p.id));
  const { estado, abonado } = pagoPorCobros(total, e.pagado);
  if (r.estadoPago !== estado || (r.abonado ?? null) !== abonado) {
    await editarReserva(fila, { estadoPago: estado, abonado });
  }
}
