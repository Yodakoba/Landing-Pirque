/**
 * **Qué cambió al corregir un día cerrado, dicho con palabras** (2026-11-21).
 *
 * Lo pidió el cliente con una foto de la ventana: *"sobra este motivo de la
 * corrección… el que entra con su cuenta y cambia algo —pone un adelanto y
 * pone la marca adelanto— ya se puede ver después por qué se hizo. En vez de
 * escribir, haz una casilla, confirmar, y luego la lista de los cambios que
 * aplicaste. Y luego guardar."*
 *
 * Hasta ese día, corregir un día cerrado pedía escribir un motivo, y ese
 * texto libre era lo que quedaba en la bitácora. Pero cada cambio ya trae su
 * porqué —un ajuste lleva su motivo y cómo se pagó; *de No vino a Vino* se
 * explica solo—, así que el motivo era escribir de nuevo lo que la pantalla
 * ya sabía. Ahora **la lista de cambios la arma el panel**, se muestra antes
 * de guardar con una casilla para confirmarla, y **esa lista es lo que queda
 * en la bitácora**, a nombre de quien corrigió.
 *
 * Es pura y tiene pruebas: compara el día como estaba con el día como queda.
 * La usan la ventana del equipo y la de las actividades extras.
 */
import { VINO, type Ajuste, type Turno } from './equipo.ts';
import { ajustesDe, type Extra } from './extras.ts';

const pesos = (n: number) => '$' + Math.abs(Math.round(n)).toLocaleString('es-CL');
const llano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
/** Cómo se dice una asistencia: la del equipo, la de un extra y la de una reserva. */
export const asistenciaEnPalabras = (v: string) => (v === VINO.si ? 'Vino' : v === VINO.no ? 'No vino' : 'sin marcar');

/** Un ajuste, como se lee en su línea: *un descuento de $4.000 (Adelanto · Transferencia)*. */
const ajusteEnPalabras = (a: Ajuste) =>
  `${a.monto < 0 ? 'un descuento' : 'una suma'} de ${pesos(a.monto)}${a.motivo.trim() ? ` (${a.motivo.trim()})` : ''}`;

/**
 * Los ajustes que se agregaron y los que se quitaron. Se comparan por monto
 * y motivo: uno al que se le cambió el monto sale como uno quitado y otro
 * agregado, que es lo que pasó.
 */
function cambiosDeAjustes(antes: Ajuste[], despues: Ajuste[]): string[] {
  const llave = (a: Ajuste) => `${Math.round(a.monto)}|${a.motivo.trim()}`;
  const vale = (a: Ajuste) => !!a.monto || !!a.motivo.trim();
  const quedan = antes.filter(vale).map(llave);
  const nuevos: Ajuste[] = [];
  for (const a of despues.filter(vale)) {
    const i = quedan.indexOf(llave(a));
    if (i === -1) nuevos.push(a); else quedan.splice(i, 1);
  }
  const quitados = antes.filter(vale).filter((a) => {
    const i = quedan.indexOf(llave(a));
    if (i === -1) return false;
    quedan.splice(i, 1);
    return true;
  });
  return [
    ...nuevos.map((a) => `se agregó ${ajusteEnPalabras(a)}`),
    ...quitados.map((a) => `se quitó ${ajusteEnPalabras(a)}`)
  ];
}

type TurnoDelDia = Pick<Turno, 'trabajador' | 'puesto' | 'asistencia' | 'pagoJornada' | 'horasExtra' | 'valorHora' | 'ajustes'>;

/**
 * Los cambios en el equipo de un día: quién entró o salió, la asistencia, el
 * puesto, la jornada, las horas extra, los ajustes y la propina del día.
 *
 * La propina se compara por el total del día, que es lo que se escribe: la
 * parte de cada uno es una consecuencia y listarla repetiría el mismo cambio
 * una vez por persona.
 */
export function cambiosDelEquipo(
  antes: TurnoDelDia[], despues: TurnoDelDia[], propinaAntes = 0, propinaDespues = 0
): string[] {
  const cambios: string[] = [];
  const era = new Map(antes.map((t) => [llano(t.trabajador), t]));
  const es = new Map(despues.map((t) => [llano(t.trabajador), t]));
  for (const t of despues) {
    const a = era.get(llano(t.trabajador));
    if (!a) {
      cambios.push(`${t.trabajador}: se agregó al día, en ${t.puesto || 'sin puesto'}`
        + (t.asistencia ? ` (${asistenciaEnPalabras(t.asistencia)})` : ''));
      for (const c of cambiosDeAjustes([], t.ajustes ?? [])) cambios.push(`${t.trabajador}: ${c}`);
      continue;
    }
    const de: string[] = [];
    if (a.asistencia !== t.asistencia) {
      de.push(`de ${asistenciaEnPalabras(a.asistencia)} a ${asistenciaEnPalabras(t.asistencia)}`);
    }
    if (llano(a.puesto) !== llano(t.puesto)) de.push(`de ${a.puesto || 'sin puesto'} a ${t.puesto || 'sin puesto'}`);
    if ((a.pagoJornada || 0) !== (t.pagoJornada || 0)) {
      de.push(`jornada de ${pesos(a.pagoJornada || 0)} a ${pesos(t.pagoJornada || 0)}`);
    }
    if ((a.horasExtra || 0) !== (t.horasExtra || 0)) de.push(`horas extra de ${a.horasExtra || 0} a ${t.horasExtra || 0}`);
    // El valor de la hora solo importa si hay horas: si no, no cambia nada que se pague.
    if ((a.valorHora || 0) !== (t.valorHora || 0) && (t.horasExtra || 0) > 0) {
      de.push(`valor de la hora extra de ${pesos(a.valorHora || 0)} a ${pesos(t.valorHora || 0)}`);
    }
    de.push(...cambiosDeAjustes(a.ajustes ?? [], t.ajustes ?? []));
    for (const c of de) cambios.push(`${t.trabajador}: ${c}`);
  }
  for (const a of antes) if (!es.has(llano(a.trabajador))) cambios.push(`${a.trabajador}: se sacó del día`);
  if (Math.round(propinaAntes) !== Math.round(propinaDespues)) {
    cambios.push(`Propina del día: de ${pesos(propinaAntes)} a ${pesos(propinaDespues)}`);
  }
  return cambios;
}

type ExtraDelDia = Pick<Extra, 'colaborador' | 'actividad' | 'estado' | 'monto' | 'ajuste' | 'motivo'> & { ajustes?: Ajuste[] };

/** Los cambios en las actividades extras de un día. */
export function cambiosDeExtras(antes: ExtraDelDia[], despues: ExtraDelDia[]): string[] {
  const cambios: string[] = [];
  const era = new Map(antes.map((e) => [llano(e.colaborador), e]));
  const es = new Map(despues.map((e) => [llano(e.colaborador), e]));
  for (const e of despues) {
    const a = era.get(llano(e.colaborador));
    if (!a) {
      cambios.push(`${e.colaborador}: se agregó al día${e.actividad ? `, con ${e.actividad}` : ''}`
        + (e.estado ? ` (${asistenciaEnPalabras(e.estado)})` : ''));
      for (const c of cambiosDeAjustes([], ajustesDe(e))) cambios.push(`${e.colaborador}: ${c}`);
      continue;
    }
    const de: string[] = [];
    if (a.estado !== e.estado) de.push(`de ${asistenciaEnPalabras(a.estado)} a ${asistenciaEnPalabras(e.estado)}`);
    if (llano(a.actividad) !== llano(e.actividad)) de.push(`actividad de ${a.actividad || 'sin actividad'} a ${e.actividad || 'sin actividad'}`);
    if ((a.monto || 0) !== (e.monto || 0)) de.push(`monto de ${pesos(a.monto || 0)} a ${pesos(e.monto || 0)}`);
    de.push(...cambiosDeAjustes(ajustesDe(a), ajustesDe(e)));
    for (const c of de) cambios.push(`${e.colaborador}: ${c}`);
  }
  for (const a of antes) if (!es.has(llano(a.colaborador))) cambios.push(`${a.colaborador}: se sacó del día`);
  return cambios;
}

/** La asistencia de una reserva que se cambió durante la corrección. */
export const cambioDeReserva = (quien: string, antes: string, despues: string) =>
  `Reserva de ${quien || 'sin nombre'}: de ${asistenciaEnPalabras(antes)} a ${asistenciaEnPalabras(despues)}`;

/** Hasta cuánto texto de cambios se manda y se guarda en la bitácora. */
export const LARGO_MAXIMO_CAMBIOS = 900;

/**
 * La lista, en un solo texto para la bitácora. Si es muy larga se corta en
 * un cambio entero y dice cuántos más hubo: una celda de la planilla no es
 * lugar para un día reescrito completo.
 */
export function textoDeCambios(cambios: string[]): string {
  const partes: string[] = [];
  let largo = 0;
  for (const c of cambios) {
    if (partes.length && largo + c.length + 2 > LARGO_MAXIMO_CAMBIOS) break;
    partes.push(c);
    largo += c.length + 2;
  }
  const faltan = cambios.length - partes.length;
  return partes.join('; ') + (faltan > 0 ? `; y ${faltan} ${faltan === 1 ? 'cambio' : 'cambios'} más` : '');
}
