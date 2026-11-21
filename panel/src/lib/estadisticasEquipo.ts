/**
 * **Las estadísticas del equipo** (2026-11-21, lo pidió el cliente: *"un botón
 * estadísticas… cuánto fueron los sueldos, las propinas, en gráficas de las
 * últimas 4 semanas… relacionar al valor de reservas… si hay una gráfica con
 * palos, mostrar el monto total en un palo, pero la relación entre los
 * distintos puestos en distintos colores"*).
 *
 * Va en la página de **Estadísticas** que ya existía (`lib/estadisticas.ts`,
 * las de reservas), como una segunda vista, *👥 Equipo*, con el mismo
 * periodo y las mismas piezas. Puro y con pruebas: el servidor arma los días
 * con esto y la pantalla los agrupa por semana o por día. **No sale ningún nombre**: solo montos por
 * puesto y por día, que es lo que una gráfica necesita.
 *
 * - **El sueldo del equipo** es lo de cada turno que vino (`pagoDe()`, el
 *   mismo del informe), por su puesto. Un contratado suma solo sus horas
 *   extra y ajustes, igual que en el informe: su sueldo no sale de acá.
 * - **Las actividades extras** van como un puesto más, *Actividades extras*.
 * - **No entran** los ajustes fuera de turno (son adelantos de plata que ya
 *   se cuenta en otro turno), las comisiones de los vendedores ni la
 *   retención de las boletas: es el costo del equipo del día.
 * - **La propina va aparte**: no es costo del negocio, pasa por él.
 * - **Las ventas**: por cada reserva que ocupa su lugar y ya pasó, **el valor
 *   final de la mesa si se anotó**, y si no, el monto de la reserva. Cuánto
 *   de eso es valor final anotado también se cuenta, para decir qué tan
 *   cerca del dato de Fudo está el número.
 */
import { pagoDe, VINO, type Turno } from './equipo.ts';
import { costoDeExtra, type Extra } from './extras.ts';
import { ocupaLugar } from './ocupacion.ts';
import { personasEfectivas } from './rectificacion.ts';
import { semanaDe, sumarDias, esFecha, type Fecha } from './fechas.ts';
import type { Reserva } from './tipos.ts';

/** El nombre del "puesto" de las actividades extras en las gráficas. */
export const EXTRAS = 'Actividades extras';
/** Un turno sin puesto escrito. */
export const SIN_PUESTO = 'Sin puesto';

export interface DiaEstadistica {
  fecha: Fecha;
  /** Lo que costó el equipo ese día, por puesto (y `EXTRAS`). */
  porPuesto: Record<string, number>;
  /** Cuántas jornadas (turnos que vino) hubo, por puesto. */
  jornadas: Record<string, number>;
  propina: number;
  /** La gente de las reservas que ocuparon su lugar (la rectificada si la hay). */
  personas: number;
  reservas: number;
  /** Valor final si se anotó; si no, el monto de la reserva. */
  ventas: number;
  /** De `ventas`, lo que vino de un valor final anotado. */
  ventasAnotadas: number;
  reservasConValor: number;
}

const vacio = (fecha: Fecha): DiaEstadistica => ({
  fecha, porPuesto: {}, jornadas: {}, propina: 0, personas: 0, reservas: 0,
  ventas: 0, ventasAnotadas: 0, reservasConValor: 0
});

/**
 * Los días entre `desde` y `hasta` con algo que contar. Las reservas solo
 * cuentan **hasta `hoy`**: una de mañana todavía no vendió nada.
 */
export function estadisticasPorDia({ turnos, extras, reservas, desde, hasta, hoy }: {
  turnos: Turno[]; extras: Extra[]; reservas: (Reserva & { valorFinal?: number | null })[];
  desde: Fecha; hasta: Fecha; hoy: Fecha;
}): DiaEstadistica[] {
  const dias = new Map<Fecha, DiaEstadistica>();
  const dia = (f: Fecha) => { let d = dias.get(f); if (!d) { d = vacio(f); dias.set(f, d); } return d; };
  const enRango = (f: string) => esFecha(f) && f >= desde && f <= hasta;

  for (const t of turnos) {
    if (t.suelto || !enRango(t.fecha) || t.asistencia !== VINO.si) continue;
    const d = dia(t.fecha);
    const puesto = t.puesto.trim() || SIN_PUESTO;
    d.porPuesto[puesto] = (d.porPuesto[puesto] ?? 0) + pagoDe(t);
    d.jornadas[puesto] = (d.jornadas[puesto] ?? 0) + 1;
    d.propina += t.propina || 0;
  }
  for (const e of extras) {
    if (!enRango(e.fecha) || e.estado !== VINO.si) continue;
    const d = dia(e.fecha);
    d.porPuesto[EXTRAS] = (d.porPuesto[EXTRAS] ?? 0) + costoDeExtra(e);
    d.jornadas[EXTRAS] = (d.jornadas[EXTRAS] ?? 0) + 1;
  }
  for (const r of reservas) {
    if (!enRango(r.fecha) || r.fecha > hoy || !ocupaLugar(r)) continue;
    const d = dia(r.fecha);
    d.reservas++;
    d.personas += personasEfectivas(r);
    const final = r.valorFinal;
    if (final != null && Number.isFinite(Number(final))) {
      d.ventas += Number(final);
      d.ventasAnotadas += Number(final);
      d.reservasConValor++;
    } else {
      d.ventas += Number(r.monto) || 0;
    }
  }
  return [...dias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Lo que costó el equipo un día: todos sus puestos, extras incluidos. */
export const costoDelDia = (d: Pick<DiaEstadistica, 'porPuesto'>) =>
  Object.values(d.porPuesto).reduce((s, n) => s + n, 0);

export interface Bloque extends DiaEstadistica {
  /** La fecha que lo nombra: el día, o el lunes de su semana. */
  desde: Fecha;
  hasta: Fecha;
}

/**
 * Los días sumados por día o por semana (de lunes a domingo), **con los
 * bloques vacíos incluidos**: una semana sin nada es un dato, y saltársela
 * juntaría dos barras que no son vecinas.
 */
export function agrupar(dias: DiaEstadistica[], por: 'dia' | 'semana', desde: Fecha, hasta: Fecha): Bloque[] {
  const bloques: Bloque[] = [];
  const paso = por === 'dia' ? 1 : 7;
  let inicio = por === 'dia' ? desde : semanaDe(desde);
  while (inicio <= hasta) {
    const fin = sumarDias(inicio, paso - 1);
    // Una semana cortada por el periodo se nombra por su primer día adentro:
    // noviembre empieza el domingo 1, y esa barra es *1 nov*, no *26 oct*.
    const nombre = inicio < desde ? desde : inicio;
    const b: Bloque = { ...vacio(nombre), desde: nombre, hasta: fin > hasta ? hasta : fin };
    for (const d of dias) {
      if (d.fecha < inicio || d.fecha > fin) continue;
      for (const [k, v] of Object.entries(d.porPuesto)) b.porPuesto[k] = (b.porPuesto[k] ?? 0) + v;
      for (const [k, v] of Object.entries(d.jornadas)) b.jornadas[k] = (b.jornadas[k] ?? 0) + v;
      b.propina += d.propina; b.personas += d.personas; b.reservas += d.reservas;
      b.ventas += d.ventas; b.ventasAnotadas += d.ventasAnotadas; b.reservasConValor += d.reservasConValor;
    }
    bloques.push(b);
    inicio = sumarDias(inicio, paso);
  }
  return bloques;
}

export interface Resumen {
  costo: number;
  propinas: number;
  ventas: number;
  personas: number;
  reservas: number;
  reservasConValor: number;
  /** Costo del equipo por persona atendida, o `null` sin personas. */
  porPersona: number | null;
  /** El costo como % de las ventas, redondeado, o `null` sin ventas. */
  porcentaje: number | null;
}

export function resumenDe(bloques: Pick<DiaEstadistica, 'porPuesto' | 'propina' | 'ventas' | 'personas' | 'reservas' | 'reservasConValor'>[]): Resumen {
  const costo = bloques.reduce((s, b) => s + costoDelDia(b), 0);
  const ventas = bloques.reduce((s, b) => s + b.ventas, 0);
  const personas = bloques.reduce((s, b) => s + b.personas, 0);
  return {
    costo, ventas, personas,
    propinas: bloques.reduce((s, b) => s + b.propina, 0),
    reservas: bloques.reduce((s, b) => s + b.reservas, 0),
    reservasConValor: bloques.reduce((s, b) => s + b.reservasConValor, 0),
    porPersona: personas > 0 ? Math.round(costo / personas) : null,
    porcentaje: ventas > 0 ? Math.round((costo / ventas) * 100) : null
  };
}

export interface FilaPuesto { puesto: string; costo: number; jornadas: number; promedio: number; parte: number }

/**
 * Por puesto, del que más cuesta al que menos: jornadas, costo, promedio por
 * jornada y qué parte del total es (en %, redondeada).
 */
export function porPuesto(bloques: Pick<DiaEstadistica, 'porPuesto' | 'jornadas'>[]): FilaPuesto[] {
  const costo = new Map<string, number>();
  const jornadas = new Map<string, number>();
  for (const b of bloques) {
    for (const [k, v] of Object.entries(b.porPuesto)) costo.set(k, (costo.get(k) ?? 0) + v);
    for (const [k, v] of Object.entries(b.jornadas)) jornadas.set(k, (jornadas.get(k) ?? 0) + v);
  }
  const total = [...costo.values()].reduce((s, n) => s + n, 0);
  return [...costo.entries()]
    .map(([puesto, c]) => {
      const j = jornadas.get(puesto) ?? 0;
      return { puesto, costo: c, jornadas: j, promedio: j ? Math.round(c / j) : 0,
               parte: total ? Math.round((c / total) * 100) : 0 };
    })
    .sort((a, b) => b.costo - a.costo || a.puesto.localeCompare(b.puesto));
}

/**
 * **El orden de los colores**: el de la pestaña Puestos, y después los que
 * aparezcan sin estar ahí, con las actividades extras al final. Así un
 * puesto tiene siempre el mismo color, mire uno la semana que mire: el
 * color sigue al puesto, no a su lugar en el ranking.
 */
export function ordenDePuestos(conocidos: string[], vistos: string[]): string[] {
  const salida = [...conocidos.filter((p) => p && p !== EXTRAS)];
  for (const p of vistos) if (p !== EXTRAS && !salida.includes(p)) salida.push(p);
  return [...salida, EXTRAS];
}
