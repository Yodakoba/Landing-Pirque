/**
 * El equipo: quién trabaja, en qué puesto, y qué día.
 *
 * Son tres listas y una regla. Las listas viven en la planilla —`Puestos`,
 * `Trabajadores`, `Turnos`— y la regla es cuánta gente hace falta por puesto
 * según cuántos comensales hay. Este archivo no toca la red: recibe filas y
 * devuelve objetos, así que todo lo de acá se prueba con node.
 *
 * **Nada de esto llega al sitio público.** Quién trabaja mañana no es dato de
 * un visitante: `/api/publico/fechas` sigue devolviendo tres campos y el
 * recorte está fijado por una prueba en `publico.ts`. Las pestañas de este
 * archivo simplemente no las lee esa ruta.
 */
import { normalizar, indices } from './columnas.ts';
import { esFecha, type Fecha } from './fechas.ts';

export const HOJA_PUESTOS = 'Puestos';
export const HOJA_TRABAJADORES = 'Trabajadores';
export const HOJA_TURNOS = 'Turnos';

export const COL_PUESTOS = {
  puesto: 'Puesto',
  cadaCuantas: 'Uno cada N personas'
} as const;

export const COL_TRABAJADORES = {
  nombre: 'Nombre',
  telefono: 'Teléfono',
  puesto: 'Puesto habitual',
  activo: 'Activo'
} as const;

export const COL_TURNOS = {
  fecha: 'Fecha',
  trabajador: 'Trabajador',
  puesto: 'Puesto'
} as const;

export interface Puesto {
  /** Como se escribe y como se muestra. */
  nombre: string;
  /**
   * Uno cada cuántos comensales. **Cero significa "sin regla puesta", no
   * "ninguno hace falta".**
   *
   * Es la única forma en que el panel puede contestar "¿estoy bien con este
   * equipo?", y es dato del negocio: cuántos garzones por mesa se atiende
   * bien no lo sabe el código. Por eso arranca vacío y, mientras lo esté, el
   * panel no opina en vez de inventar un número.
   */
  cadaCuantas: number;
}

export interface Trabajador {
  nombre: string;
  telefono: string;
  /** El puesto que hace normalmente. Solo preselecciona: no obliga a nada. */
  puesto: string;
  /**
   * Si sigue en el equipo. **Se desactiva en vez de borrarse** cuando alguien
   * deja de trabajar: borrarlo dejaría sus turnos pasados sin dueño, y esos
   * turnos son el registro de quién trabajó qué día.
   */
  activo: boolean;
}

export interface Turno {
  fecha: Fecha;
  trabajador: string;
  puesto: string;
  /** Fila en la planilla, para poder borrarla. */
  fila: number;
}

/**
 * Los puestos que nombró el cliente, en su orden.
 *
 * **Son el punto de partida, no la lista definitiva**: viven en la planilla y
 * se editan en /equipo. Están en el código solo para que el panel arranque
 * contra una planilla recién creada, igual que los menús.
 *
 * Las razones nacen en CERO, o sea sin poner. Cuántos garzones por comensal
 * es dato del negocio y no está escrito en ninguna parte del proyecto;
 * sembrarlo con un número plausible haría que el panel diera consejos que
 * nadie dio.
 */
export const POR_DEFECTO_PUESTOS: Puesto[] = [
  { nombre: 'Garzón', cadaCuantas: 0 },
  { nombre: 'Cocina', cadaCuantas: 0 },
  { nombre: 'Barra', cadaCuantas: 0 },
  { nombre: 'Asistente', cadaCuantas: 0 },
  { nombre: 'Runner', cadaCuantas: 0 },
  { nombre: 'Barman', cadaCuantas: 0 },
  { nombre: 'Bar asistente', cadaCuantas: 0 }
];

/** Un número escrito a mano en la planilla. Lo que no sea un entero ≥ 0 es 0. */
export function aEntero(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Lo que una persona escribe en una celda de sí/no.
 *
 * **La celda en blanco cuenta como SÍ**, al revés de lo que uno supondría.
 * El motivo: la fila existe porque alguien agregó a esa persona al equipo, y
 * un "Activo" vacío es descuido, no una baja. Si el blanco contara como no,
 * agregar un trabajador a mano en la planilla lo dejaría invisible en el
 * panel sin ningún aviso.
 */
export function esSi(v: unknown): boolean {
  const s = normalizar(String(v ?? ''));
  if (s === '') return true;
  return !['no', 'n', 'false', '0', 'inactivo', 'inactiva', 'baja'].includes(s);
}

/* ---------- Puestos ---------- */

export function leerPuestosDe(filas: string[][]): Puesto[] {
  const salida: Puesto[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    salida.push({ nombre, cadaCuantas: aEntero(filas[i]?.[1]) });
  }
  return salida;
}

export function aFilasPuestos(puestos: Puesto[]): string[][] {
  // Una razón en cero se escribe en blanco: en la planilla un "0" se lee
  // como "cero hacen falta" y lo que queremos decir es "sin poner".
  return [
    [COL_PUESTOS.puesto, COL_PUESTOS.cadaCuantas],
    ...puestos.map((p) => [p.nombre, p.cadaCuantas > 0 ? String(p.cadaCuantas) : ''])
  ];
}

/* ---------- Trabajadores ---------- */

export function leerTrabajadoresDe(filas: string[][]): Trabajador[] {
  const salida: Trabajador[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    salida.push({
      nombre,
      telefono: String(filas[i]?.[1] ?? '').trim(),
      puesto: String(filas[i]?.[2] ?? '').trim(),
      activo: esSi(filas[i]?.[3])
    });
  }
  return salida;
}

export function aFilasTrabajadores(gente: Trabajador[]): string[][] {
  return [
    [COL_TRABAJADORES.nombre, COL_TRABAJADORES.telefono,
     COL_TRABAJADORES.puesto, COL_TRABAJADORES.activo],
    ...gente.map((t) => [t.nombre, t.telefono, t.puesto, t.activo ? 'Sí' : 'No'])
  ];
}

/* ---------- Turnos ---------- */

/**
 * Los turnos de la pestaña, buscando cada columna POR SU ENCABEZADO.
 *
 * No por posición, al revés de `Puestos` y `Trabajadores`. La diferencia no
 * es gusto: esas dos se reescriben enteras cada vez que se guardan, así que
 * la posición la fija el panel. A `Turnos` se le agregan y se le borran
 * filas de a una, y le van a crecer columnas —asistencia, horas, ajustes—,
 * así que con posiciones fijas agregar una obligaría a reescribir todas las
 * filas ya guardadas. Es el mismo criterio que usa `Reservas`.
 */
export function leerTurnosDe(filas: string[][]): Turno[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_TURNOS);
  // Sin columna de fecha no hay nada que leer: inventar turnos a partir de
  // filas que no sabemos interpretar sería peor que no mostrar ninguno.
  if (i.fecha === -1 || i.trabajador === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));

  const salida: Turno[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const fecha = en(f, i.fecha).slice(0, 10);
    const trabajador = en(f, i.trabajador).trim();
    // Una fila sin fecha válida o sin nombre es basura o una fila vacía.
    // Un puesto en blanco sí se lee: significa "viene, sin puesto definido".
    if (!esFecha(fecha) || !trabajador) continue;
    salida.push({ fecha, trabajador, puesto: en(f, i.puesto).trim(), fila: n + 1 });
  }
  return salida;
}

/**
 * Un turno como fila, cada valor en la columna que le toca según el
 * encabezado. Las columnas que no manejamos quedan vacías en vez de
 * desplazar lo demás.
 */
export function filaTurno(encabezado: string[], t: Omit<Turno, 'fila'>): string[] {
  const i = indices(encabezado, COL_TURNOS);
  const fila = new Array(Math.max(encabezado.length, 3)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i.fecha, t.fecha);
  poner(i.trabajador, t.trabajador);
  poner(i.puesto, t.puesto);
  return fila;
}

export const ENCABEZADO_TURNOS: string[] =
  [COL_TURNOS.fecha, COL_TURNOS.trabajador, COL_TURNOS.puesto];

/**
 * Deja un plan del día listo para guardar: **una persona, un puesto.**
 *
 * Asignar a alguien a un segundo puesto el mismo día lo MUEVE, no lo duplica.
 * No es una limitación técnica, es lo que hace que el conteo sirva: una
 * persona contada como garzón y como barman al mismo tiempo haría decir al
 * panel que hay dos personas donde hay una, y justo ahí es donde se mira
 * para saber si alcanza el equipo.
 *
 * Gana la ÚLTIMA asignación, que es la que la persona acaba de hacer.
 */
export function normalizarPlan(turnos: Omit<Turno, 'fila'>[]): Omit<Turno, 'fila'>[] {
  const porPersona = new Map<string, Omit<Turno, 'fila'>>();
  for (const t of turnos) {
    const nombre = String(t.trabajador ?? '').trim();
    if (!nombre || !esFecha(t.fecha)) continue;
    porPersona.set(normalizar(nombre),
      { fecha: t.fecha, trabajador: nombre, puesto: String(t.puesto ?? '').trim() });
  }
  return [...porPersona.values()];
}

/* ---------- Lo que se mira ---------- */

export interface LineaDePlan {
  puesto: string;
  asignados: string[];
  /** Cuántos sugiere la razón del puesto. 0 = sin regla puesta. */
  sugeridos: number;
  /** Cuántos faltan para llegar a la sugerencia. 0 si alcanza o si no hay regla. */
  faltan: number;
}

/** Cuántos hacen falta en un puesto para tanta gente. 0 = sin regla puesta. */
export function sugeridos(p: Puesto | undefined, personas: number): number {
  if (!p || p.cadaCuantas <= 0 || personas <= 0) return 0;
  return Math.ceil(personas / p.cadaCuantas);
}

/**
 * El plan de un día, puesto por puesto, con lo asignado y lo que sugiere la
 * razón.
 *
 * Incluye los puestos VACÍOS a propósito: el que no tiene a nadie es
 * precisamente el que hay que ver. Y al final agrega los puestos que
 * aparecen en los turnos pero no en la lista —alguien los escribió a mano en
 * la planilla, o se renombró un puesto— porque esconderlos escondería gente
 * que sí está asignada a trabajar.
 */
export function planDelDia(
  turnos: Turno[], puestos: Puesto[], fecha: Fecha, personas: number
): LineaDePlan[] {
  const delDia = turnos.filter((t) => t.fecha === fecha);
  const porPuesto = new Map<string, string[]>();
  for (const t of delDia) {
    const clave = normalizar(t.puesto);
    if (!porPuesto.has(clave)) porPuesto.set(clave, []);
    porPuesto.get(clave)!.push(t.trabajador);
  }

  const salida: LineaDePlan[] = [];
  const usados = new Set<string>();
  for (const p of puestos) {
    const clave = normalizar(p.nombre);
    usados.add(clave);
    const asignados = porPuesto.get(clave) ?? [];
    const quiero = sugeridos(p, personas);
    salida.push({
      puesto: p.nombre,
      asignados,
      sugeridos: quiero,
      faltan: Math.max(0, quiero - asignados.length)
    });
  }
  // Los que no están en la lista, con el nombre tal como se escribió.
  for (const t of delDia) {
    const clave = normalizar(t.puesto);
    if (usados.has(clave)) continue;
    usados.add(clave);
    salida.push({
      puesto: t.puesto || 'Sin puesto',
      asignados: porPuesto.get(clave) ?? [],
      sugeridos: 0,
      faltan: 0
    });
  }
  return salida;
}

export interface ResumenEquipo {
  /** Cuánta gente hay asignada en total. */
  total: number;
  /** Solo los puestos con alguien, para el resumen corto de la tarjeta. */
  porPuesto: { puesto: string; cuantos: number }[];
  /** Cuántos faltan en total según las razones puestas. 0 = alcanza o sin reglas. */
  faltan: number;
}

/**
 * El resumen chico, el que va al dorso de la tarjeta del día.
 *
 * Omite los puestos vacíos: en cuatro líneas de una tarjeta lo que importa
 * es qué hay, y lo que falta va en un solo número.
 */
export function resumenEquipo(
  turnos: Turno[], puestos: Puesto[], fecha: Fecha, personas: number
): ResumenEquipo {
  const plan = planDelDia(turnos, puestos, fecha, personas);
  return {
    total: turnos.filter((t) => t.fecha === fecha).length,
    porPuesto: plan
      .filter((l) => l.asignados.length > 0)
      .map((l) => ({ puesto: l.puesto, cuantos: l.asignados.length })),
    faltan: plan.reduce((n, l) => n + l.faltan, 0)
  };
}

/**
 * Los nombres que aparecen en los turnos y NO están en la lista de
 * trabajadores.
 *
 * Mismo mecanismo que `desconocidos()` para los menús, y por el mismo
 * motivo: sin alias ni equivalencias, lo único que mantiene alineadas las
 * dos listas es que alguien se entere cuando dejan de estarlo. Pasa al
 * renombrar a una persona que ya tenía turnos asignados.
 */
export function sinFicha(turnos: Turno[], gente: Trabajador[]): string[] {
  const conocidos = new Set(gente.map((t) => normalizar(t.nombre)));
  const salida: string[] = [];
  const ya = new Set<string>();
  for (const t of turnos) {
    const clave = normalizar(t.trabajador);
    if (!clave || conocidos.has(clave) || ya.has(clave)) continue;
    ya.add(clave);
    salida.push(t.trabajador);
  }
  return salida;
}
