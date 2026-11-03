/**
 * La guarda del servidor para escribir en un día: ¿está cerrado, y si lo
 * está, esto es una corrección válida?
 *
 * Envuelve a `corregirDiaCerrado()` —que es pura y tiene sus pruebas— con
 * lo que solo se sabe en una ruta: qué días están cerrados en la planilla y
 * qué rol tiene quien llama. Vive aparte para que cada ruta que escribe un
 * día la llame igual, y que la regla no quede copiada en cinco lugares.
 *
 * **La comprueba el servidor y no solo la pantalla**, como todo en este
 * panel: una llamada directa a la API tiene que obedecer la misma regla que
 * un clic. Si no, el bloqueo sería solo un botón apagado.
 */
import { NextResponse } from 'next/server';
import { leerCierres } from './datos';
import { corregirDiaCerrado, estaCerrado } from './cierres';
import { puede, type Rol } from './auth';
import { quienEs } from './permisos';

/**
 * Devuelve la respuesta de error si el cambio no puede entrar, o el motivo
 * de la corrección (vacío si ningún día estaba cerrado).
 *
 * Recibe **varias fechas** porque editar una reserva puede moverla de día:
 * si el de origen o el de destino está cerrado, es una corrección.
 */
export async function guardaDelDia(
  req: Request, fechas: string[], correccion: unknown
): Promise<{ error: NextResponse } | { motivo: string }> {
  const cierres = await leerCierres();
  const cerrado = fechas.some((f) => f && estaCerrado(cierres, f));
  const { rol } = await quienEs(req);
  const motivo = (correccion as { motivo?: unknown } | null | undefined)?.motivo;
  const r = corregirDiaCerrado({
    cerrado, puedeCorregir: puede(rol as Rol, 'corregir'), motivo
  });
  if (!r.ok) return { error: NextResponse.json({ error: r.error }, { status: r.status }) };
  return { motivo: r.correccion };
}
