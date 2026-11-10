/**
 * **Los comprobantes de pago en Google Drive** (2026-11-10).
 *
 * Se guardan en una **unidad compartida** del Workspace del cliente (la que
 * dice `drive_comprobantes` en Configuración), y no en Vercel Blob, por lo
 * que se decidió con el cliente:
 *
 * - **Son privados.** Un comprobante trae nombre, RUT y cuenta bancaria del
 *   cliente. Blob los serviría por un link público; acá el archivo solo se
 *   ve **a través del panel**, que comprueba el permiso de quien lo pide, o
 *   en el Drive de quien tenga acceso a la unidad.
 * - **Quedan del negocio**, al lado de la planilla y no en una cuenta de
 *   Vercel que todavía hay que migrar.
 *
 * **Tiene que ser una unidad compartida**: una cuenta de servicio no tiene
 * espacio propio en Drive, así que no puede ser dueña de archivos en un
 * Drive personal. La cuenta del panel es miembro de la unidad con rol
 * *Gestor de contenido*, que sube, ordena y borra, y no administra miembros.
 *
 * El alcance es `drive.file`: el panel solo ve lo que él mismo creó.
 *
 * Una carpeta por cotización (`Cotización 1002 – Eventos del Maipo`), para
 * que quien revise en Drive encuentre todo junto.
 */
import { Readable } from 'node:stream';
import { google, type drive_v3 } from 'googleapis';
import { autenticacion } from './sheets.ts';

let cliente: drive_v3.Drive | null = null;
function drive(): drive_v3.Drive {
  if (!cliente) cliente = google.drive({ version: 'v3', auth: autenticacion() });
  return cliente;
}

/** Comillas y barras fuera: el nombre va dentro de una consulta de Drive. */
const paraConsulta = (t: string) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** La carpeta de una cotización dentro de la unidad, creándola si no está. */
async function carpeta(unidad: string, nombre: string): Promise<string> {
  const r = await drive().files.list({
    corpora: 'drive', driveId: unidad,
    includeItemsFromAllDrives: true, supportsAllDrives: true,
    q: `name = '${paraConsulta(nombre)}' and mimeType = 'application/vnd.google-apps.folder'`
      + ` and '${unidad}' in parents and trashed = false`,
    fields: 'files(id)', pageSize: 1
  });
  const ya = r.data.files?.[0]?.id;
  if (ya) return ya;
  const c = await drive().files.create({
    supportsAllDrives: true,
    requestBody: { name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [unidad] },
    fields: 'id'
  });
  if (!c.data.id) throw new Error('Drive no devolvió la carpeta.');
  return c.data.id;
}

/** Sube un comprobante y devuelve el id del archivo. */
export async function subirComprobante(o: {
  unidad: string; carpeta: string; nombre: string; tipo: string; datos: Buffer;
}): Promise<string> {
  const padre = await carpeta(o.unidad, o.carpeta);
  const r = await drive().files.create({
    supportsAllDrives: true,
    requestBody: { name: o.nombre, parents: [padre] },
    media: { mimeType: o.tipo, body: Readable.from(o.datos) },
    fields: 'id'
  });
  if (!r.data.id) throw new Error('Drive no devolvió el archivo.');
  return r.data.id;
}

/** Baja un comprobante para mostrarlo a través del panel. */
export async function leerComprobante(id: string): Promise<{ tipo: string; nombre: string; datos: Buffer }> {
  const meta = await drive().files.get({ fileId: id, supportsAllDrives: true, fields: 'name,mimeType' });
  const r = await drive().files.get(
    { fileId: id, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  return {
    tipo: meta.data.mimeType ?? 'application/octet-stream',
    nombre: meta.data.name ?? 'comprobante',
    datos: Buffer.from(r.data as ArrayBuffer)
  };
}

/**
 * Un error de Drive en palabras del panel. Los dos que se van a ver al
 * estrenarlo son de configuración, no del código, y conviene que la
 * pantalla diga cuál.
 */
export function errorDeDrive(e: unknown): string {
  const m = String((e as Error)?.message ?? e);
  if (/has not been used|is disabled|accessNotConfigured/i.test(m)) {
    return 'La Google Drive API no está activada en el proyecto de Google Cloud.';
  }
  if (/not found|notFound|insufficient|forbidden|403|404/i.test(m)) {
    return 'El panel no tiene acceso a la unidad de comprobantes: revisa que su cuenta sea miembro con rol Gestor de contenido.';
  }
  return 'No se pudo guardar en Google Drive. Inténtalo de nuevo.';
}
