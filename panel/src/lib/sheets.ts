/**
 * El cliente de Google Sheets. Corre SOLO en el servidor: la clave privada
 * de la service account no puede llegar al navegador.
 */
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import { AsyncLocalStorage } from 'node:async_hooks';
import { celdas } from './celdas.ts';

// La planilla, y los eventos del calendario. El segundo se agregó el
// 2026-10-21 al jubilar el Apps Script, que era quien los creaba.
//
// Es `calendar.events` y no `calendar` a propósito: alcanza para crear y
// editar eventos del calendario que se nos haya compartido, y no para
// crear, borrar ni listar calendarios de la cuenta.
const ALCANCE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
  // Los comprobantes de pago (2026-11-10). `drive.file` y no `drive`: el
  // panel solo ve los archivos y carpetas que él mismo creó, no el resto de
  // la unidad compartida.
  'https://www.googleapis.com/auth/drive.file'
];

let cliente: sheets_v4.Sheets | null = null;

export function idPlanilla(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('Falta GOOGLE_SHEET_ID en el entorno.');
  return id;
}

let credencial: InstanceType<typeof google.auth.JWT> | null = null;

/**
 * La cuenta de servicio, una sola para la planilla y el calendario.
 *
 * Está aparte porque el calendario también la usa: tener dos credenciales
 * con la misma clave privada sería dos lugares donde equivocarse.
 */
export function autenticacion() {
  if (credencial) return credencial;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const clave = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !clave) {
    throw new Error(
      'Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY. Ver .env.example.'
    );
  }

  credencial = new google.auth.JWT({
    email,
    // En un .env los saltos de línea van como \n literales. Si no se
    // deshacen, la librería falla con un error de clave inválida que no
    // dice nada sobre el verdadero motivo.
    key: clave.replace(/\\n/g, '\n'),
    scopes: ALCANCE
  });
  return credencial;
}

export function sheets(): sheets_v4.Sheets {
  if (cliente) return cliente;
  cliente = google.sheets({ version: 'v4', auth: autenticacion() });
  return cliente;
}

/**
 * El título REAL de una pestaña, buscándolo sin distinguir mayúsculas ni
 * tildes.
 *
 * Existe porque los nombres de pestaña en la API SÍ distinguen mayúsculas:
 * pedir "Fechas Hábiles" cuando la pestaña se llama "Fechas hábiles" falla
 * con "Unable to parse range", que no dice nada sobre la hache. Pasó en la
 * primera conexión real.
 *
 * Se consulta una vez y se recuerda. **Pero una pestaña que no está en lo
 * recordado se vuelve a buscar antes de darla por inexistente**, y eso no es
 * una precaución teórica: arregla un error que se vio en producción el
 * 2026-10-22.
 *
 * El panel corre en varias instancias a la vez y cada una recuerda lo suyo
 * mientras vive. La instancia A crea la pestaña `Turnos` la primera vez que
 * se guarda un equipo; la instancia B ya había mirado el libro antes y sigue
 * creyendo que no existe. Desde ahí, en B:
 *
 * - leer turnos devuelve vacío **en silencio** —el `catch` de `leerTurnos()`
 *   no distingue "no hay pestaña" de "no pude leerla"—, así que el día se ve
 *   sin equipo aunque esté guardado;
 * - y guardar falla con `addSheet: A sheet with the name "Turnos" already
 *   exists`, que es la pestaña que la propia planilla ya tiene.
 *
 * Volver a mirar cuesta una llamada, y solo cuando no se encontró.
 */
let titulos: Map<string, string> | null = null;
/** El id de cada pestaña por su título real: no cambia nunca. */
let ids = new Map<string, number>();

function clave(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

let titulosEnVuelo: Promise<Map<string, string>> | null = null;
function leerTitulos(): Promise<Map<string, string>> {
  // Varias lecturas que llegan juntas a una instancia recién prendida
  // comparten la misma consulta del libro.
  if (!titulosEnVuelo) {
    titulosEnVuelo = leerTitulosYa();
    const p = titulosEnVuelo;
    const soltar = () => { if (titulosEnVuelo === p) titulosEnVuelo = null; };
    p.then(soltar, soltar);
  }
  return titulosEnVuelo;
}

async function leerTitulosYa(): Promise<Map<string, string>> {
  const libro = await conReintento(() => sheets().spreadsheets.get({
    spreadsheetId: idPlanilla(), fields: 'sheets.properties(title,sheetId)'
  }));
  ids = new Map((libro.data.sheets ?? [])
    .filter((s) => s.properties?.title && s.properties.sheetId != null)
    .map((s) => [s.properties!.title!, s.properties!.sheetId!]));
  titulos = new Map(
    (libro.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => !!t)
      .map((t) => [clave(t), t])
  );
  return titulos;
}

/**
 * Si el error es "esa pestaña no existe" y no otra cosa.
 *
 * Lo usan los lectores que tienen un valor por defecto —puestos, menús,
 * configuración— para distinguir **una planilla recién creada**, donde la
 * pestaña todavía no está y el defecto es correcto, de **una falla de
 * verdad**, donde devolver el defecto sería mostrar datos que no son.
 */
export function esPestanaQueNoExiste(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith('No hay ninguna pestaña llamada');
}

export async function nombreReal(hoja: string): Promise<string> {
  let mapa = titulos;
  // Si hubo que leer el libro recién, lo que dice es de ahora mismo y no hay
  // nada que volver a mirar.
  let alDia = false;
  if (!mapa) { mapa = await leerTitulos(); alDia = true; }

  let real = mapa.get(clave(hoja));
  // No estaba en lo que recordábamos. Puede que la pestaña se haya creado
  // después —otra instancia, o alguien a mano en la planilla—, así que se
  // mira una vez más antes de decir que no existe.
  if (!real && !alDia) {
    mapa = await leerTitulos();
    real = mapa.get(clave(hoja));
  }
  if (!real) {
    throw new Error(
      `No hay ninguna pestaña llamada "${hoja}" en la planilla. ` +
      `Las que hay: ${[...mapa.values()].join(', ')}.`
    );
  }
  return real;
}

/**
 * **El límite de Google, dicho en español** (2026-11-12). La API de Sheets
 * deja 60 lecturas por minuto **para la cuenta del panel**, que es una sola
 * para todos los que lo usan. Pasado eso responde 429 con un texto en
 * inglés que en pantalla no le dice nada a nadie. Lo que importa saber es
 * que no se perdió nada y que en medio minuto vuelve a andar.
 */
export const MENSAJE_LIMITE =
  'La planilla de Google recibió demasiadas consultas en este minuto. Espera unos ' +
  '30 segundos: lo que ya estaba guardado no se perdió, y lo que falta se reintenta.';

export function esLimiteDeGoogle(e: unknown): boolean {
  const x = e as { code?: number; status?: number; message?: string } | null;
  return x?.code === 429 || x?.status === 429 || /quota exceeded/i.test(String(x?.message ?? ''));
}

/**
 * **Las lecturas se juntan** (2026-11-12). La API de Sheets cobra el cupo
 * por consulta, no por pestaña: pedir siete pestañas en un `batchGet` cuesta
 * **una** lectura, y pedirlas de a una cuesta siete. Abrir el calendario
 * llegó a gastar 20 de las 60 que hay por minuto para todo el panel.
 *
 * Funciona así: la primera lectura que llega abre una **tanda** y espera unos
 * milisegundos; todas las que lleguen mientras tanto —las de un
 * `Promise.all`, o las de otra petición que entró al mismo tiempo— van en la
 * misma consulta. Dos lecturas de la misma pestaña en la misma tanda, o
 * mientras otra está en vuelo, comparten la respuesta.
 *
 * **No se recuerda nada entre peticiones.** Se probó guardar lo leído tres
 * segundos y se sacó el mismo día: en Vercel cada ruta corre aparte, así que
 * una escritura en una ruta no le borraba el recuerdo a otra, y *Marcar
 * ganada* volvía a aparecer en una cotización ya ganada. Dentro de UNA
 * petición sí se recuerda —ver `conLecturas()`—, porque ahí no hay otra
 * instancia que escriba sin avisar.
 */
const lecturas = new Map<string, Promise<string[][]>>();
interface Pedida { hoja: string; res: (f: string[][]) => void; rej: (e: unknown) => void }
let tanda: Map<string, Pedida> | null = null;
/** Cuánto espera una tanda a que lleguen las demás lecturas. */
const ESPERA_TANDA = 8;

/**
 * Lo leído dentro de una petición. Lo abre `conLecturas()`; fuera de ella no
 * hay ámbito y cada lectura va a la planilla.
 */
const ambito = new AsyncLocalStorage<Map<string, Promise<string[][]>>>();

/**
 * Envuelve una ruta para que **lo que ya leyó en esta petición no lo vuelva a
 * leer**. Un autoguardado de una cotización leía la pestaña de cotizaciones
 * dos veces, y la configuración, y los menús… Lo que la propia petición
 * escribe se olvida en el acto, así que nunca lee un dato suyo viejo.
 *
 * `precargar` son las pestañas que la ruta va a necesitar: se piden juntas al
 * entrar, en una sola consulta, aunque después se lean de a una.
 */
export function conLecturas<A extends unknown[], R>(
  precargar: string[], fn: (...a: A) => Promise<R>
): (...a: A) => Promise<R> {
  return (...a: A) => ambito.run(new Map(), () => {
    for (const h of precargar) leerHoja(h).catch(() => {});
    return fn(...a);
  });
}

function olvidar(hoja: string) {
  const k = clave(hoja);
  lecturas.delete(k);
  ambito.getStore()?.delete(k);
}

/** Espera y vuelve a intentar si Google dice que se pasó del límite. */
async function conReintento<T>(fn: () => Promise<T>): Promise<T> {
  // Cortas a propósito: una petición no puede quedarse esperando el minuto
  // entero, y el cupo se va liberando de a poco.
  const esperas = [1500, 4000];
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (!esLimiteDeGoogle(e)) throw e;
      if (i >= esperas.length) throw new Error(MENSAJE_LIMITE);
      await new Promise((r) => setTimeout(r, esperas[i]));
    }
  }
}

async function despachar(): Promise<void> {
  const pedidas = [...(tanda?.values() ?? [])];
  tanda = null;
  // El nombre real de cada pestaña. Una que no existe falla sola, sin
  // arrastrar a las demás.
  const listas: (Pedida & { real: string })[] = [];
  for (const x of pedidas) {
    try { listas.push({ ...x, real: await nombreReal(x.hoja) }); } catch (e) { x.rej(e); }
  }
  if (!listas.length) return;
  try {
    const res = await conReintento(() => sheets().spreadsheets.values.batchGet({
      spreadsheetId: idPlanilla(),
      ranges: listas.map((x) => `'${x.real}'`),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    }));
    const rangos = res.data.valueRanges ?? [];
    listas.forEach((x, i) => x.res((rangos[i]?.values ?? [])
      .map((f) => f.map((c) => (c == null ? '' : String(c))))));
  } catch (e) {
    for (const x of listas) x.rej(e);
  }
}

/** Pide una pestaña: se suma a la tanda abierta, o abre una. */
function pedir(hoja: string): Promise<string[][]> {
  const k = clave(hoja);
  const hay = lecturas.get(k);
  if (hay) return hay;
  if (!tanda) { tanda = new Map(); setTimeout(() => void despachar(), ESPERA_TANDA); }
  const ya = tanda.get(k);
  const filas = new Promise<string[][]>((res, rej) => {
    if (!ya) tanda!.set(k, { hoja, res, rej });
    else tanda!.set(k, {
      hoja,
      res: (f) => { ya.res(f); res(f); },
      rej: (e) => { ya.rej(e); rej(e); }
    });
  });
  lecturas.set(k, filas);
  // Contestó (bien o mal): la siguiente lectura vuelve a preguntar.
  const soltar = () => { if (lecturas.get(k) === filas) lecturas.delete(k); };
  filas.then(soltar, soltar);
  return filas;
}

/**
 * Lee una hoja entera. Devuelve [] si está vacía.
 *
 * `fresca` se salta lo recordado en la petición: es para las lecturas que
 * buscan **en qué fila escribir**. Ahí un número de fila de hace un segundo
 * puede ser otra fila si alguien borró una entremedio.
 */
export async function leerHoja(hoja: string, fresca = false): Promise<string[][]> {
  const k = clave(hoja);
  const recuerdo = ambito.getStore();
  let filas = !fresca ? recuerdo?.get(k) : undefined;
  if (!filas) {
    filas = pedir(hoja);
    if (recuerdo) {
      recuerdo.set(k, filas);
      const p = filas;
      p.catch(() => { if (recuerdo.get(k) === p) recuerdo.delete(k); });
    }
  }
  // Copias, para que quien la modifique no le cambie la fila a otro.
  return (await filas).map((f) => [...f]);
}

/**
 * Solo la primera fila, para saber si la pestaña tiene encabezado sin
 * traerla entera. Es lo que usa la bitácora, que crece con cada acción.
 */
export async function leerEncabezado(hoja: string): Promise<string[]> {
  const res = await conReintento(async () => sheets().spreadsheets.values.get({
    spreadsheetId: idPlanilla(),
    range: `'${await nombreReal(hoja)}'!1:1`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  }));
  return (res.data.values?.[0] ?? []).map((c) => (c == null ? '' : String(c)));
}

/** El id interno de una pestaña, sin leer el libro entero cada vez. */
async function idDeHoja(hoja: string): Promise<number> {
  const real = await nombreReal(hoja);
  if (!ids.has(real)) await leerTitulos();
  const id = ids.get(real);
  if (id == null) throw new Error(`No existe la hoja "${hoja}" en la planilla.`);
  return id;
}

/** Agrega una fila al final. */
export async function agregarFila(hoja: string, fila: unknown[]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    await conReintento(async () => sheets().spreadsheets.values.append({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [celdas(fila)] }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/** Reescribe una fila completa. `fila` es 1-based, como la ve la planilla. */
export async function escribirFila(hoja: string, fila: number, valores: unknown[]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    await conReintento(async () => sheets().spreadsheets.values.update({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'!A${fila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [celdas(valores)] }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Borra una fila de verdad, corriendo las de abajo.
 *
 * Necesita el id numérico de la hoja, que no es su nombre. Por eso la
 * consulta previa: es la única forma de traducir uno al otro.
 */
export async function borrarFila(hoja: string, fila: number): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    const sheetId = await idDeHoja(hoja);
  
    await conReintento(async () => sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila }
          }
        }]
      }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Crea una pestaña si no existe, y devuelve su título real.
 *
 * El panel la usa para la pestaña `Config`: así no hay que preparar nada a
 * mano antes de guardar la configuración por primera vez. Es segura de
 * repetir.
 */
export async function asegurarHoja(hoja: string): Promise<string> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    try {
      return await nombreReal(hoja);
    } catch {
      try {
        await conReintento(async () => sheets().spreadsheets.batchUpdate({
          spreadsheetId: idPlanilla(),
          requestBody: { requests: [{ addSheet: { properties: { title: hoja } } }] }
        }));
      } catch (e) {
        // "A sheet with the name X already exists": alguien la creó entremedio.
        // Eso es justo lo que queríamos, así que no es un error — pero sí hay
        // que volver a mirar el libro, porque lo que recordábamos ya no sirve.
        titulos = null;
        return await nombreReal(hoja);
      }
      titulos = null;          // el cache quedó viejo: ahora hay una pestaña más
      return hoja;
    }
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Reescribe una pestaña entera desde A1, **y borra lo que quede debajo**.
 *
 * Ese segundo paso arregla un error real (2026-10-30): `values.update`
 * escribe las filas que uno le pasa y **deja intactas las de más abajo**,
 * así que sacar a alguien de una lista de cuatro escribía tres filas y la
 * cuarta se quedaba donde estaba. Quien quitaba a un trabajador lo veía
 * desaparecer de la pantalla y encontraba al último **duplicado** en la
 * planilla. Lo mismo valía para los puestos, los menús y los colaboradores:
 * todas las pestañas que se reescriben enteras.
 *
 * **Se escribe primero y se borra después**, en ese orden. Al revés, un
 * fallo entre las dos llamadas dejaría la pestaña vacía; así, lo peor que
 * puede pasar es quedarse con la fila de más, que es exactamente lo que
 * pasaba antes y se corrige al siguiente guardado.
 */
export async function escribirBloque(hoja: string, filas: unknown[][]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    const titulo = await asegurarHoja(hoja);
    await conReintento(async () => sheets().spreadsheets.values.update({
      spreadsheetId: idPlanilla(),
      range: `'${titulo}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: filas.map(celdas) }
    }));
    await conReintento(async () => sheets().spreadsheets.values.clear({
      spreadsheetId: idPlanilla(),
      range: `'${titulo}'!A${filas.length + 1}:ZZ`
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Agrega varias filas de una vez.
 *
 * Una llamada en vez de N: guardar el equipo de un día son diez o quince
 * filas, y quince llamadas a la API serían quince oportunidades de quedar a
 * medio camino.
 */
export async function agregarFilas(hoja: string, filas: unknown[][]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    if (!filas.length) return;
    await conReintento(async () => sheets().spreadsheets.values.append({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: filas.map(celdas) }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Borra varias filas de verdad, corriendo las de abajo.
 *
 * **Las ordena de mayor a menor antes de pedirlas**, y eso no es una
 * optimización: borrar la fila 5 corre la 9 al lugar 8, así que borrar de
 * arriba hacia abajo borraría filas equivocadas. De abajo hacia arriba, cada
 * índice sigue siendo válido cuando le toca.
 *
 * Va todo en un batchUpdate, así que o se borran todas o no se borra
 * ninguna: no puede quedar media reasignación aplicada.
 */
export async function borrarFilas(hoja: string, filas: number[]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    const orden = [...new Set(filas)].filter((n) => n > 1).sort((a, b) => b - a);
    if (!orden.length) return;
  
    const sheetId = await idDeHoja(hoja);
  
    await conReintento(async () => sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        requests: orden.map((fila) => ({
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila }
          }
        }))
      }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Deja la pestaña creada y con su encabezado, y devuelve las filas que tiene.
 *
 * Para las pestañas a las que se les agregan filas de a una, como `Turnos`:
 * `escribirBloque` no sirve ahí porque reescribe desde A1, y acá lo que hace
 * falta es que la primera fila diga los nombres de las columnas y nada más.
 */
/**
 * Deja la columna en el encabezado, y devuelve el encabezado que quedó.
 *
 * Una columna que el panel conoce y la planilla no se lee vacía y **no se
 * escribe en ninguna parte**: `filaReserva()` saltea los índices en -1. Eso
 * está bien para una planilla vieja que todavía no la tiene, y es una trampa
 * en el momento en que alguien escribe algo en ese campo y aprieta Guardar:
 * el formulario dice que guardó y el dato no está en ninguna parte.
 *
 * Por eso la columna se agrega sola la primera vez que hace falta —es lo
 * mismo que hace `asegurarHoja()` con una pestaña—, **al final y sin tocar
 * ninguna celda de datos**. Si ya está, esto no escribe nada.
 */
export async function asegurarColumna(
  hoja: string, encabezado: string[], columna: string
): Promise<string[]> {
  const limpio = (c: unknown) => String(c ?? '').trim().toLowerCase();
  if (encabezado.some((c) => limpio(c) === limpio(columna))) return encabezado;
  const nuevo = [...encabezado, columna];
  await escribirFila(hoja, 1, nuevo);
  return nuevo;
}

export async function asegurarEncabezado(
  hoja: string, encabezado: string[]
): Promise<string[][]> {
  await asegurarHoja(hoja);
  // Fresca: quien pide el encabezado va a buscar en qué fila escribir.
  const filas = await leerHoja(hoja, true);
  if (filas.length > 0 && (filas[0] ?? []).some((c) => String(c).trim() !== '')) {
    return filas;
  }
  await escribirFila(hoja, 1, encabezado);
  return [encabezado];
}
