/**
 * El cliente de Google Sheets. Corre SOLO en el servidor: la clave privada
 * de la service account no puede llegar al navegador.
 */
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const ALCANCE = ['https://www.googleapis.com/auth/spreadsheets'];

let cliente: sheets_v4.Sheets | null = null;

export function idPlanilla(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('Falta GOOGLE_SHEET_ID en el entorno.');
  return id;
}

export function sheets(): sheets_v4.Sheets {
  if (cliente) return cliente;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const clave = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !clave) {
    throw new Error(
      'Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY. Ver .env.example.'
    );
  }

  const auth = new google.auth.JWT({
    email,
    // En un .env los saltos de línea van como \n literales. Si no se
    // deshacen, la librería falla con un error de clave inválida que no
    // dice nada sobre el verdadero motivo.
    key: clave.replace(/\\n/g, '\n'),
    scopes: ALCANCE
  });

  cliente = google.sheets({ version: 'v4', auth });
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
 * Se consulta una vez y se recuerda.
 */
let titulos: Map<string, string> | null = null;

function clave(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export async function nombreReal(hoja: string): Promise<string> {
  if (!titulos) {
    const libro = await sheets().spreadsheets.get({ spreadsheetId: idPlanilla() });
    titulos = new Map(
      (libro.data.sheets ?? [])
        .map((s) => s.properties?.title)
        .filter((t): t is string => !!t)
        .map((t) => [clave(t), t])
    );
  }
  const real = titulos.get(clave(hoja));
  if (!real) {
    throw new Error(
      `No hay ninguna pestaña llamada "${hoja}" en la planilla. ` +
      `Las que hay: ${[...titulos.values()].join(', ')}.`
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
    await sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: { requests: [{ addSheet: { properties: { title: hoja } } }] }
    });
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
