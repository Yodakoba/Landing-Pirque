/**
 * El cliente de Google Sheets. Corre SOLO en el servidor: la clave privada
 * de la service account no puede llegar al navegador.
 */
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
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

async function leerTitulos(): Promise<Map<string, string>> {
  const libro = await amable(() => sheets().spreadsheets.get({ spreadsheetId: idPlanilla() }));
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

async function amable<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  }
}

/**
 * **Lo leído se recuerda tres segundos** (2026-11-12). Una sola petición
 * del panel suele leer la misma pestaña varias veces —guardar una
 * cotización lee las cotizaciones, después las líneas, después otra vez—, y
 * cada lectura cuenta contra el límite de 60 por minuto. Dos lecturas
 * simultáneas de la misma pestaña, además, comparten la misma llamada.
 *
 * **Cualquier escritura en esa pestaña la olvida en el acto** (`olvidar()`),
 * así que una instancia nunca lee lo que ella misma acaba de cambiar como
 * si no hubiera pasado. Lo que puede ver es lo escrito por **otra**
 * instancia de Vercel hasta tres segundos tarde, que es lo mismo que ya
 * pasaba con dos pestañas del navegador abiertas.
 */
const RECUERDO_MS = 3000;
const lecturas = new Map<string, { hasta: number; filas: Promise<string[][]> }>();

function olvidar(hoja: string) { lecturas.delete(clave(hoja)); }

/** Lee una hoja entera. Devuelve [] si está vacía. */
export async function leerHoja(hoja: string): Promise<string[][]> {
  const k = clave(hoja);
  const ahora = Date.now();
  const hay = lecturas.get(k);
  if (hay && hay.hasta > ahora) return (await hay.filas).map((f) => [...f]);
  const filas = amable(async () => {
    const res = await sheets().spreadsheets.values.get({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });
    return (res.data.values ?? []).map((f) => f.map((c) => (c == null ? '' : String(c))));
  });
  lecturas.set(k, { hasta: ahora + RECUERDO_MS, filas });
  // Una lectura que falla no se recuerda: la siguiente vuelve a preguntar.
  filas.catch(() => { if (lecturas.get(k)?.filas === filas) lecturas.delete(k); });
  // Copias, para que quien la modifique no le cambie la fila a otro.
  return (await filas).map((f) => [...f]);
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
    await sheets().spreadsheets.values.append({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [celdas(fila)] }
    });
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
    await sheets().spreadsheets.values.update({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'!A${fila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [celdas(valores)] }
    });
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
  
    await sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila }
          }
        }]
      }
    });
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
        await sheets().spreadsheets.batchUpdate({
          spreadsheetId: idPlanilla(),
          requestBody: { requests: [{ addSheet: { properties: { title: hoja } } }] }
        });
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
    await sheets().spreadsheets.values.update({
      spreadsheetId: idPlanilla(),
      range: `'${titulo}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: filas.map(celdas) }
    });
    await sheets().spreadsheets.values.clear({
      spreadsheetId: idPlanilla(),
      range: `'${titulo}'!A${filas.length + 1}:ZZ`
    });
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
    await sheets().spreadsheets.values.append({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: filas.map(celdas) }
    });
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
  
    await sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        requests: orden.map((fila) => ({
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila }
          }
        }))
      }
    });
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
  const filas = await leerHoja(hoja);
  if (filas.length > 0 && (filas[0] ?? []).some((c) => String(c).trim() !== '')) {
    return filas;
  }
  await escribirFila(hoja, 1, encabezado);
  return [encabezado];
}
