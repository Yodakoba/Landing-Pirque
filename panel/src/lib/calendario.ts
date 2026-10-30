/**
 * El evento de Google Calendar de una reserva.
 *
 * Esto lo hacía el Apps Script y es lo único que el panel no cubría. Se
 * port<>ó el 2026-10-21 al jubilarlo. El criterio del título viene de allá y
 * vale la pena conservarlo: **en el celular se ve el título del evento y
 * nada más**, así que ahí va lo que hay que tener en la mano cuando llega
 * la gente — cuántos son, quién, y si falta cobrarles.
 *
 * Sin red: recibe la reserva y devuelve el evento. Lo que habla con Google
 * vive en google.ts.
 */
import { createHash } from 'node:crypto';
import type { Reserva } from './tipos.ts';
import { faltaCobrar, enPesos } from './ocupacion.ts';
import { ZONA } from './fechas.ts';

export interface Evento {
  id: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

/**
 * El id del evento, derivado del pedido.
 *
 * **Así no hace falta guardar el id del evento en la planilla**, que es lo
 * que hacía el Apps Script con una columna extra. Google deja elegir el id
 * al crear: si ya existe responde 409 y entonces se actualiza en vez de
 * crear. Eso resuelve el problema de verdad, que es que Shopify manda
 * `orders/updated` cada vez que el pedido cambia — sin un id estable, cada
 * aviso crearía un evento nuevo y el calendario se llenaría de duplicados.
 *
 * **Es un hash y no el id tal cual**, porque Google solo acepta minúsculas
 * de la `a` a la `v` y dígitos: un `MANUAL-123` tiene un guión que no entra.
 * Reemplazar los caracteres inválidos por uno válido parece más simple pero
 * hace chocar dos ids distintos, y dos reservas compartiendo evento es peor
 * que un id ilegible. El hexadecimal de un sha256 cae entero dentro del
 * alfabeto que Google permite.
 *
 * El id del pedido no se pierde: va escrito en la descripción del evento.
 */
export function idDeEvento(idPedido: string): string {
  const hash = createHash('sha256').update(String(idPedido ?? ''), 'utf8').digest('hex');
  return 'r' + hash.slice(0, 32);
}

/** "13:00" -> [13, 0]. Lo que no se entienda cae en la hora de respaldo. */
function hora(texto: string, respaldo: number): [number, number] {
  const m = /^(\d{1,2})\s*[:.]?\s*(\d{2})?/.exec(String(texto ?? '').trim());
  if (!m) return [respaldo, 0];
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (!(h >= 0 && h <= 23) || !(min >= 0 && min <= 59)) return [respaldo, 0];
  return [h, min];
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

/**
 * El evento de una reserva.
 *
 * La hora va **con la zona por nombre** y no con un desfase calculado: así
 * el horario de verano lo resuelve Google y no nosotros. Es el mismo
 * cuidado que el resto del proyecto tiene con las fechas.
 */
export function eventoDe(
  r: Reserva | Omit<Reserva, 'fila'>,
  apertura = '13:00',
  cierre = '18:00'
): Evento {
  const [hi, mi] = hora(apertura, 13);
  const [hf, mf] = hora(cierre, 18);
  const en = (h: number, m: number) => `${r.fecha}T${dosCifras(h)}:${dosCifras(m)}:00`;

  const porCobrar = faltaCobrar(r as Reserva);
  const titulo = [
    `${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}`,
    r.nombre || 'Sin nombre',
    porCobrar ? 'POR COBRAR' : null
  ].filter(Boolean).join(' · ');

  const lineas = [
    `Menú: ${r.menu || '—'}`,
    `Personas: ${r.personas}`,
    // La modalidad solo existe si el pedido vino de Shopify. En una
    // anotada a mano la línea se omite, en vez de decir "sin especificar"
    // como si alguien hubiera olvidado llenarla.
    r.tipoPago ? `Modalidad: ${r.tipoPago}` : null,
    `Estado del pago: ${r.estadoPago || '—'}`,
    r.notaPago ? `Cómo pagó: ${r.notaPago}` : null,
    r.monto != null ? `Monto: ${enPesos(Number(r.monto))}` : 'Monto: sin anotar',
    r.email ? `Email: ${r.email}` : null,
    r.telefono ? `Teléfono: ${r.telefono}` : null,
    `Pedido: ${r.id}`
  ].filter(Boolean);

  return {
    id: idDeEvento(r.id),
    summary: titulo,
    description: lineas.join('\n'),
    start: { dateTime: en(hi, mi), timeZone: ZONA },
    end: { dateTime: en(hf, mf), timeZone: ZONA }
  };
}
