/**
 * Escribir los eventos del calendario.
 *
 * **Que falle el calendario no puede hacer que se pierda una reserva.** Es
 * la regla que traía el Apps Script y se conserva: la planilla es la fuente
 * de verdad, el evento es una comodidad. Por eso todo acá devuelve en vez
 * de lanzar, y quien llama registra y sigue.
 *
 * Usa la misma cuenta de servicio que lee la planilla, así que **el
 * calendario tiene que estar compartido con ese correo**, igual que la
 * planilla. Sin eso Google responde 403 y no hay forma de saberlo desde el
 * código: se ve en el log.
 */
import { google } from 'googleapis';
import { autenticacion } from './sheets.ts';
import type { Evento } from './calendario.ts';

export function hayCalendario(): boolean {
  return !!process.env.GOOGLE_CALENDAR_ID;
}

/**
 * Crea el evento, o lo actualiza si ya existía.
 *
 * El id lo decide el pedido, así que un `orders/updated` que llega diez
 * veces no deja diez eventos: el primero crea, los demás actualizan. Google
 * responde 409 cuando el id ya existe, y ese 409 es la señal, no un error.
 */
export async function guardarEvento(e: Evento): Promise<'creado' | 'actualizado' | 'omitido'> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return 'omitido';

  const cal = google.calendar({ version: 'v3', auth: autenticacion() });
  try {
    await cal.events.insert({ calendarId, requestBody: e });
    return 'creado';
  } catch (err) {
    const codigo = (err as { code?: number }).code;
    if (codigo !== 409) throw err;
    // Ya existe: se actualiza. `update` reemplaza el evento entero, que es
    // lo que queremos — si cambió el estado del pago, el título tiene que
    // dejar de decir POR COBRAR.
    await cal.events.update({ calendarId, eventId: e.id, requestBody: e });
    return 'actualizado';
  }
}

/**
 * Borra el evento de un pedido. Se usa cuando la reserva deja de ocupar
 * lugar: una cancelada en el calendario es peor que ninguna, porque alguien
 * cuenta sillas mirándolo.
 */
export async function borrarEvento(id: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return;
  const cal = google.calendar({ version: 'v3', auth: autenticacion() });
  try {
    await cal.events.delete({ calendarId, eventId: id });
  } catch (err) {
    // 404 y 410 significan que no está o ya se borró: el resultado es el
    // que queríamos, así que no es un error.
    const codigo = (err as { code?: number }).code;
    if (codigo !== 404 && codigo !== 410) throw err;
  }
}
