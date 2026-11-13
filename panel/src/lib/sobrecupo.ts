/**
 * **El sobrecupo** (2026-11-12, la regla del cliente): una reserva sin pagar
 * queda sujeta a espacio. Quien paga —en línea, o con su anticipo— tiene
 * preferencia, así que un pago puede entrar aunque el día ya esté lleno de
 * reservas sin pagar. Cuando eso pasa el día queda **por encima de su cupo**,
 * y alguien tiene que decidir una de dos cosas:
 *
 * - **Ampliar el cupo** de ese día, hasta la capacidad máxima del recinto
 *   (`capacidad_maxima` en Configuración), y traer más equipo; o
 * - **Soltar** una o más reservas sin pagar y avisarle a ese cliente que se
 *   cayó su reserva.
 *
 * Este archivo es la parte pura: quién está en riesgo, a quién se sugiere
 * soltar, hasta dónde se puede ampliar y el mensaje para el cliente. Sin red
 * y sin planilla, para poder probarlo.
 */
import type { Reserva, Ocupacion } from './tipos.ts';
import { ocupaLugar, tienePrioridad } from './ocupacion.ts';
import { puedeTocarReserva, type Rol } from './auth.ts';
import { saludoAlCliente } from './contacto.ts';

/**
 * Las reservas de un día **que se pueden soltar**: ocupan lugar y no tienen
 * prioridad (no pagaron nada). Primero las más nuevas: la que llegó al
 * último es la primera candidata, igual que en una lista de espera.
 */
export function enRiesgo(reservas: Reserva[], fecha: string): Reserva[] {
  return reservas
    .filter((r) => r.fecha === fecha && ocupaLugar(r) && !tienePrioridad(r))
    .sort((a, b) => String(b.creada ?? '').localeCompare(String(a.creada ?? '')));
}

/**
 * **Cuáles soltar para que el día vuelva a caber**: de la más nueva a la más
 * vieja, hasta cubrir el exceso. Es una sugerencia —la decisión es de quien
 * mira el día—, y por eso devuelve ids y no hace nada.
 */
export function sugerirSoltar(riesgo: Reserva[], exceso: number): Set<string> {
  const salida = new Set<string>();
  let cubierto = 0;
  for (const r of riesgo) {
    if (cubierto >= exceso) break;
    salida.add(r.id);
    cubierto += Number(r.personas) || 0;
  }
  return salida;
}

/**
 * **Hasta dónde se puede ampliar el cupo de un día**: lo justo para que
 * quepan todos, nunca más que la capacidad máxima del recinto. Si ni con el
 * máximo caben, igual hay que soltar a alguien.
 */
export function cupoAmpliado(tomadas: number, capacidadMaxima: number): {
  cupo: number; alcanza: boolean;
} {
  const cupo = Math.min(Math.max(0, tomadas), Math.max(1, capacidadMaxima));
  return { cupo, alcanza: cupo >= tomadas };
}

/** Lo que se guarda en `Se cayó por cupo`: cuándo, quién y por qué. */
export function marcaLiberada(cuando: string, quien: string, motivo: string): string {
  const m = motivo.replace(/\s+/g, ' ').trim();
  return [cuando, quien || 'alguien', m].filter(Boolean).join(' · ');
}

/**
 * **El WhatsApp para el cliente cuya reserva se cayó.** Un solo lugar, para
 * cambiar el tono sin buscarlo en las pantallas. Sobrio, tuteo de Chile y
 * con la salida a mano: otra fecha, o pagar si vuelve a haber lugar.
 */
export function mensajeCaida(nombre: string, fechaEnPalabras: string,
  /** Quién lo manda y de qué empresa (2026-11-13): ver `saludoAlCliente()`. */
  firma: { quien?: string; empresa?: string } = {}): string {
  return `${saludoAlCliente(nombre, firma.quien, firma.empresa)}. `
    + `Tu reserva para el ${fechaEnPalabras} estaba sin pagar y, como ese día se llenó `
    + 'con reservas pagadas, no pudimos mantenerla. Lo sentimos mucho. '
    + 'Si quieres, te ayudamos a buscar otra fecha.';
}

/** Un día con sobrecupo, listo para avisar. */
export interface DiaConSobrecupo {
  fecha: string;
  exceso: number;
  capacidad: number;
  tomadas: number;
  /** Las reservas sin pagar de ese día, las más nuevas primero. */
  riesgo: Reserva[];
}

/**
 * **Los días que se pasaron del cupo**, con sus reservas en riesgo.
 *
 * Con `rol` y `usuario`, el **vendedor** ve solo los días donde la reserva
 * en riesgo es suya (`puedeTocarReserva()`): es a él a quien le toca
 * avisarle a su cliente, y los demás días no son su conversación. Los
 * demás roles los ven todos.
 */
export function diasConSobrecupo(
  dias: Pick<Ocupacion, 'fecha' | 'sobrecupo' | 'capacidad' | 'tomadas'>[],
  reservas: Reserva[],
  rol?: Rol,
  usuario = ''
): DiaConSobrecupo[] {
  const salida: DiaConSobrecupo[] = [];
  for (const d of dias) {
    if (!(d.sobrecupo > 0)) continue;
    const riesgo = enRiesgo(reservas, d.fecha);
    if (rol && !riesgo.some((r) => puedeTocarReserva(rol, usuario, r.anotadaPor))) continue;
    salida.push({ fecha: d.fecha, exceso: d.sobrecupo, capacidad: d.capacidad, tomadas: d.tomadas, riesgo });
  }
  return salida;
}

/**
 * **El aviso que el vendedor le manda a la administración** (2026-11-12):
 * ampliar el cupo no es decisión suya, así que lo que le toca es avisar. El
 * texto va listo para pegar en WhatsApp: qué día, cuánto se pasó y cuáles
 * de las reservas en riesgo son suyas, para que la respuesta sea concreta.
 */
export function avisoParaAdministracion(
  fechaEnPalabras: string, tomadas: number, capacidad: number,
  mias: Pick<Reserva, 'nombre' | 'personas'>[]
): string {
  const exceso = Math.max(0, tomadas - capacidad);
  const suyas = mias.length
    ? ` Mis reservas sin pagar ese día: ${mias.map((r) => `${r.nombre || 'sin nombre'} (${r.personas})`).join(', ')}.`
    : '';
  return `Hola, hay sobrecupo el ${fechaEnPalabras}: ${tomadas} personas para ${capacidad} lugares `
    + `(${exceso} de más).${suyas} ¿Ampliamos el cupo o suelto alguna?`;
}
