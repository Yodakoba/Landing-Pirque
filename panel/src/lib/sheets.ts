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

/** Lee una hoja entera. Devuelve [] si está vacía. */
export async function leerHoja(hoja: string): Promise<string[][]> {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: idPlanilla(),
    range: `'${hoja}'`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING'
  });
  return (res.data.values ?? []).map((f) => f.map((c) => (c == null ? '' : String(c))));
}

/** Agrega una fila al final. */
export async function agregarFila(hoja: string, fila: unknown[]): Promise<void> {
  await sheets().spreadsheets.values.append({
    spreadsheetId: idPlanilla(),
    range: `'${hoja}'`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [fila] }
  });
}

/** Reescribe una fila completa. `fila` es 1-based, como la ve la planilla. */
export async function escribirFila(hoja: string, fila: number, valores: unknown[]): Promise<void> {
  await sheets().spreadsheets.values.update({
    spreadsheetId: idPlanilla(),
    range: `'${hoja}'!A${fila}`,
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
  const h = (libro.data.sheets ?? []).find((s) => s.properties?.title === hoja);
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
