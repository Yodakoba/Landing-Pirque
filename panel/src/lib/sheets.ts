/**
 * El cliente de Google Sheets. Corre SOLO en el servidor: la clave privada
 * de la service account no puede llegar al navegador.
 */
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

// La planilla, y los eventos del calendario. El segundo se agregó el
// 2026-10-21 al jubilar el Apps Script, que era quien los creaba.
//
// Es `calendar.events` y no `calendar` a propósito: alcanza para crear y
// editar eventos del calendario que se nos haya compartido, y no para
// crear, borrar ni listar calendarios de la cuenta.
const ALCANCE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events'
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

function clave(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

async function leerTitulos(): Promise<Map<string, string>> {
  const libro = await sheets().spreadsheets.get({ spreadsheetId: idPlanilla() });
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

/** Lee una hoja entera. Devuelve [] si está vacía. */
export async function leerHoja(hoja: string): Promise<string[][]> {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: idPlanilla(),
    range: `'${await nombreReal(hoja)}'`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING'
  });
  return (res.data.values ?? []).map((f) => f.map((c) => (c == null ? '' : String(c))));
}

/** Agrega una fila al final. */
export async function agregarFila(hoja: string, fila: unknown[]): Promise<void> {
  await sheets().spreadsheets.values.append({
    spreadsheetId: idPlanilla(),
    range: `'${await nombreReal(hoja)}'`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [fila] }
  });
}

/** Reescribe una fila completa. `fila` es 1-based, como la ve la planilla. */
export async function escribirFila(hoja: string, fila: number, valores: unknown[]): Promise<void> {
  await sheets().spreadsheets.values.update({
    spreadsheetId: idPlanilla(),
    range: `'${await nombreReal(hoja)}'!A${fila}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [valores] }
  });
}

/**
 * Borra una fila de verdad, corriendo las de abajo.
 *
 * Necesita el id numérico de la hoja, que no es su nombre. Por eso la
 * consulta previa: es la única forma de traducir uno al otro.
 */
export async function borrarFila(hoja: string, fila: number): Promise<void> {
  const libro = await sheets().spreadsheets.get({ spreadsheetId: idPlanilla() });
  const real = await nombreReal(hoja);
  const h = (libro.data.sheets ?? []).find((s) => s.properties?.title === real);
  const sheetId = h?.properties?.sheetId;
  if (sheetId == null) throw new Error(`No existe la hoja "${hoja}" en la planilla.`);

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
}

/**
 * Crea una pestaña si no existe, y devuelve su título real.
 *
 * El panel la usa para la pestaña `Config`: así no hay que preparar nada a
 * mano antes de guardar la configuración por primera vez. Es segura de
 * repetir.
 */
export async function asegurarHoja(hoja: string): Promise<string> {
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
}

/**
 * Reescribe un bloque entero desde A1.
 *
 * Para tablas chicas y de tamaño fijo, como `Config`. No borra lo que
 * quede más abajo, así que no sirve para una lista que se acorta.
 */
export async function escribirBloque(hoja: string, filas: unknown[][]): Promise<void> {
  await sheets().spreadsheets.values.update({
    spreadsheetId: idPlanilla(),
    range: `'${await asegurarHoja(hoja)}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: filas }
  });
}

/**
 * Agrega varias filas de una vez.
 *
 * Una llamada en vez de N: guardar el equipo de un día son diez o quince
 * filas, y quince llamadas a la API serían quince oportunidades de quedar a
 * medio camino.
 */
export async function agregarFilas(hoja: string, filas: unknown[][]): Promise<void> {
  if (!filas.length) return;
  await sheets().spreadsheets.values.append({
    spreadsheetId: idPlanilla(),
    range: `'${await nombreReal(hoja)}'`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: filas }
  });
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
  const orden = [...new Set(filas)].filter((n) => n > 1).sort((a, b) => b - a);
  if (!orden.length) return;

  const libro = await sheets().spreadsheets.get({ spreadsheetId: idPlanilla() });
  const real = await nombreReal(hoja);
  const h = (libro.data.sheets ?? []).find((s) => s.properties?.title === real);
  const sheetId = h?.properties?.sheetId;
  if (sheetId == null) throw new Error(`No existe la hoja "${hoja}" en la planilla.`);

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
}

/**
 * Deja la pestaña creada y con su encabezado, y devuelve las filas que tiene.
 *
 * Para las pestañas a las que se les agregan filas de a una, como `Turnos`:
 * `escribirBloque` no sirve ahí porque reescribe desde A1, y acá lo que hace
 * falta es que la primera fila diga los nombres de las columnas y nada más.
 */
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
