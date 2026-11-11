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
import { ESTADO_DIA, estaCerrado, esExclusiva } from './columnas.ts';
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

/**
 * **Qué le hizo al día abrirlo para una reserva** (2026-11-11): `creado` si
 * no existía, `reabierto` si estaba cerrado, vacío si solo le puso cupo o no
 * le hizo nada. Lo guarda la cotización ganada para poder deshacerlo.
 */
export function queLeHizo(actual: FechaHabil | undefined): '' | 'creado' | 'reabierto' {
  if (!actual) return 'creado';
  if (estaCerrado(actual.estado)) return 'reabierto';
  return '';
}

/**
 * **Deshacer lo que se le hizo a un día al ganar una cotización**, cuando
 * se cancela (2026-11-11, lo pidió el cliente: *"si solo había un evento
 * cotizado, este se cancela, hazlo desaparecer"*).
 *
 * - Solo si **no le queda ninguna otra reserva que ocupe lugar**: con gente
 *   de otro lado, el día sigue como está.
 * - `creado` → se **borra** la fila: el día vuelve a no existir.
 * - `reabierto` → vuelve a **cerrado**, con su cupo y sus notas.
 * - Un día que ya existía abierto no se toca: no lo abrió esta cotización.
 */
export function deshacerDia(
  actual: FechaHabil | undefined, hizo: string, otrasReservas: number
): { borrar: true } | { dia: Omit<FechaHabil, 'fila'> } | null {
  if (!actual || otrasReservas > 0) return null;
  if (hizo === 'creado') return { borrar: true };
  if (hizo === 'reabierto') {
    const { fila: _f, ...resto } = actual;
    return { dia: { ...resto, estado: ESTADO_DIA.cerrada } };
  }
  return null;
}

/**
 * **¿Cabe esta cotización en su día?** (2026-11-11, lo pidió el cliente: un
 * vendedor arma el borrador con cupo de sobra, después Shopify u otro llena
 * el día, y al ganarla *"los 150 no alcanzan"*). Se mira el día **como va a
 * quedar al ganarla** —el mismo cupo que le pondría `diaParaReservaManual()`
 * a uno que no existe o está cerrado—, menos lo que ya está tomado.
 *
 * Un día exclusivo con alguien adentro no cabe: el recinto ya está arrendado.
 * La usan `/convertir`, que lo rechaza, y la ventana de cotizar, que lo avisa
 * antes de que alguien apriete.
 */
export function cupoParaGanar(
  actual: Pick<FechaHabil, 'estado' | 'capacidad'> | undefined,
  fecha: string,
  cfg: Pick<Config, 'cupoNormal' | 'horaApertura'>,
  tomadas: number,
  personas: number
): { cabe: boolean; capacidad: number; libres: number; exclusivo: boolean } {
  const dia = diaParaReservaManual(
    actual ? { fecha, apertura: '', notas: '', fila: 0, ...actual } as FechaHabil : undefined,
    fecha, cfg as Config);
  const capacidad = dia ? dia.capacidad : (actual?.capacidad ?? cfg.cupoNormal);
  const libres = capacidad - Math.max(0, tomadas);
  const exclusivo = !!actual && esExclusiva(actual.estado) && tomadas > 0;
  return { cabe: !exclusivo && personas <= libres, capacidad, libres, exclusivo };
}
