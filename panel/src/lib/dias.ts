/**
 * Qué hacerle al día cuando se anota una reserva a mano.
 *
 * Anotar una reserva para un día que no está abierto dejaba ese día en el
 * calendario **gris y con cupo 0**, o sea visible pero inservible: había que
 * acordarse de abrirlo aparte. Esto lo abre solo.
 *
 * **Siempre como PRIVADO, nunca como público.** Es la regla que hace que
 * esto se pueda hacer sin pensarlo cada vez: abrir un día al público es una
 * decisión comercial —lo ve cualquiera, cualquiera compra— y no puede ser el
 * efecto secundario de anotar una reserva de teléfono. Privado deja el día
 * usable en el panel y fuera del sitio.
 *
 * Sin red: recibe el día como está y devuelve cómo tiene que quedar, o
 * `null` si no hay nada que cambiar.
 */
import { ESTADO_DIA, estaCerrado } from './columnas.ts';
import type { FechaHabil } from './tipos.ts';
import type { Config } from './config.ts';

export function diaParaReservaManual(
  actual: FechaHabil | undefined,
  fecha: string,
  cfg: Config
): Omit<FechaHabil, 'fila'> | null {
  // No existe: se crea privado, con el cupo de siempre.
  if (!actual) {
    return {
      fecha,
      capacidad: cfg.cupoNormal,
      apertura: cfg.horaApertura,
      estado: ESTADO_DIA.privada,
      notas: ''
    };
  }

  // Cerrado: se abre, pero solo para nosotros. Se le respeta el cupo que
  // tuviera: si alguien puso 30 a propósito, no se lo pisamos con 60.
  if (estaCerrado(actual.estado)) {
    return {
      fecha,
      capacidad: actual.capacidad > 0 ? actual.capacidad : cfg.cupoNormal,
      apertura: actual.apertura || cfg.horaApertura,
      estado: ESTADO_DIA.privada,
      notas: actual.notas
    };
  }

  // Existe y no está cerrado, pero sin cupo: se le pone el de siempre y se
  // le respeta el estado. Un día que ya era público sigue siendo público.
  if (actual.capacidad <= 0) {
    return {
      fecha,
      capacidad: cfg.cupoNormal,
      apertura: actual.apertura || cfg.horaApertura,
      estado: actual.estado || ESTADO_DIA.privada,
      notas: actual.notas
    };
  }

  // Abierto y con cupo: no hay nada que hacerle.
  return null;
}
