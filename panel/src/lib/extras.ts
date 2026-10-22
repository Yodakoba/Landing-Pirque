/**
 * Las actividades extras: jinetes, pintacaritas, castillo inflable.
 *
 * Son lo que se contrata **fuera del equipo** para un día: un show ecuestre
 * con tres jinetes que cobran distinto, una niña que pinta caritas, la
 * empresa que trae el castillo. Se parecen al personal —se repiten, tienen
 * su monto, se pagan— y por eso este archivo es casi un espejo de
 * `equipo.ts`. Pero **se guardan y se miran por separado**, y eso lo pidió
 * el cliente con un motivo concreto: la planilla semanal que se manda al
 * grupo del restaurante no tiene por qué mostrar a los jinetes.
 *
 * Las dos diferencias que no son cosméticas:
 *
 * - **No hay propina.** La propina se reparte entre el equipo que atiende,
 *   no entre quien vino a hacer un show. Por eso acá no existe la columna,
 *   en vez de existir y quedar siempre en cero.
 * - **No hay jornada ni horas extra, hay un monto.** A un extra se le paga
 *   lo acordado por venir ese día; si cambia, cambia el monto. El ajuste con
 *   su motivo sigue estando, que es donde va cualquier diferencia — la misma
 *   convención que el equipo.
 *
 * **Lo que sí comparten es el vocabulario de la asistencia** (`VINO`), y a
 * propósito: "vino / no vino / sin marcar" significa lo mismo para una
 * persona del equipo que para un jinete, y tener dos palabras para lo mismo
 * es lo que después obliga a traducir en cada pantalla.
 */
import { normalizar, indices } from './columnas.ts';
import { aEntero, esSi, VINO } from './equipo.ts';
import type { Fecha } from './fechas.ts';

export const HOJA_COLABORADORES = 'Colaboradores';
export const HOJA_ACTIVIDADES = 'Actividades';

/**
 * La ficha de quien hace la actividad. **Posicional**, como `Trabajadores`:
 * esta pestaña se reescribe entera al guardar, así que el orden lo fija el
 * panel.
 */
export const COL_COLABORADORES = {
  nombre: 'Nombre',
  actividad: 'Actividad',
  telefono: 'Teléfono',
  activo: 'Activo',
  monto: 'Monto habitual',
  cuenta: 'Cuenta bancaria'
} as const;

/**
 * Una fila por (fecha, colaborador). **Por nombre de columna**, como
 * `Turnos` y `Reservas`: acá se agregan y se borran filas de a una, y es la
 * pestaña que va a crecer columnas. Con posiciones fijas, agregar una
 * obligaría a reescribir todas las filas ya guardadas.
 */
export const COL_ACTIVIDADES = {
  fecha: 'Fecha',
  colaborador: 'Colaborador',
  actividad: 'Actividad',
  estado: 'Vino',
  monto: 'Monto',
  ajuste: 'Ajuste',
  motivo: 'Motivo del ajuste'
} as const;

export const ENCABEZADO_ACTIVIDADES: string[] = Object.values(COL_ACTIVIDADES);

export interface Colaborador {
  nombre: string;
  /** Qué hace: show ecuestre, pintacaritas, castillo inflable. Texto libre. */
  actividad: string;
  telefono: string;
  /**
   * Si se le sigue contratando. **Se desactiva en vez de borrarse**, igual
   * que un trabajador: borrarlo dejaría sus días pasados con un nombre que
   * ya no está en ninguna parte, y esos días son el registro de lo que se
   * pagó.
   */
  activo: boolean;
  /**
   * Lo que cobra habitualmente, en pesos. **Es el valor de HOY**, el que se
   * propone al agregarlo a un día; lo que efectivamente se le pagó queda
   * anotado en la línea de ese día.
   *
   * Cero significa **sin poner**, no gratis.
   */
  monto: number;
  /**
   * Dónde se le transfiere. Vive en la ficha y no en la línea del día: si
   * alguien cambia de banco, se le paga a la cuenta nueva, también lo que
   * quedó pendiente. No es un hecho del día, es un dato de la persona.
   */
  cuenta: string;
}

export interface Extra {
  fecha: Fecha;
  colaborador: string;
  /**
   * Qué hizo ese día. Se copia de la ficha al agregarlo y queda congelada:
   * si mañana la misma persona pasa a hacer otra cosa, los días de antes
   * siguen diciendo lo que fue.
   */
  actividad: string;
  /** '' sin confirmar · 'Sí' vino · 'No' no vino. Ver `VINO`. */
  estado: string;
  /** Lo que se le paga por ese día, **congelado al confirmar**. */
  monto: number;
  /** Suma o resta suelta, en pesos. Negativa para un descuento. */
  ajuste: number;
  motivo: string;
  /** Fila en la planilla, para poder borrarla. */
  fila: number;
}

/**
 * Lo que cuesta una actividad del día: monto + ajuste.
 *
 * **Una actividad sin confirmar vale cero**, igual que un turno sin pasar
 * lista. Agendar no es pagar: hasta que alguien diga que el jinete llegó, el
 * panel no da por gastada esa plata. Nunca baja de cero, por lo mismo que un
 * turno: si hay que cobrarle algo a alguien, eso es otra conversación.
 */
export function costoDeExtra(e: Pick<Extra, 'estado' | 'monto' | 'ajuste'>): number {
  if (e.estado !== VINO.si) return 0;
  return Math.max(0, Math.round((e.monto || 0) + (e.ajuste || 0)));
}

/* ---------- Las fichas ---------- */

export function leerColaboradoresDe(filas: string[][]): Colaborador[] {
  const salida: Colaborador[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    salida.push({
      nombre,
      actividad: String(filas[i]?.[1] ?? '').trim(),
      telefono: String(filas[i]?.[2] ?? '').trim(),
      activo: esSi(filas[i]?.[3]),
      monto: aEntero(filas[i]?.[4]),
      // La columna puede no existir todavía: una planilla escrita antes de
      // que hubiera cuentas bancarias se lee igual, con todas en blanco.
      cuenta: String(filas[i]?.[5] ?? '').trim()
    });
  }
  return salida;
}

export function aFilasColaboradores(gente: Colaborador[]): string[][] {
  return [
    Object.values(COL_COLABORADORES) as string[],
    // Un monto en cero se escribe en blanco: en la planilla un "0" se lee
    // como "cobra cero" y lo que queremos decir es "sin poner".
    ...gente.map((c) => [c.nombre, c.actividad, c.telefono,
                         c.activo ? 'Sí' : 'No',
                         c.monto > 0 ? String(c.monto) : '',
                         c.cuenta])
  ];
}

/**
 * Las actividades que alguien hace, para ofrecerlas en un desplegable.
 *
 * **Salen de las fichas y no de una lista aparte.** Un catálogo propio sería
 * una segunda verdad: una actividad que nadie hace no sirve de nada, y una
 * que alguien hace y no está en el catálogo se vería como un error. Mismo
 * criterio que `menusConocidos()`.
 */
export function actividadesConocidas(gente: Colaborador[]): string[] {
  const vistas = new Map<string, string>();
  for (const c of gente) {
    const clave = normalizar(c.actividad);
    if (clave && !vistas.has(clave)) vistas.set(clave, c.actividad);
  }
  return [...vistas.values()].sort((a, b) => a.localeCompare(b));
}

/* ---------- Los días ---------- */

export function leerExtrasDe(filas: string[][]): Extra[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_ACTIVIDADES);
  // Sin fecha o sin nombre no hay nada que leer: inventar actividades a
  // partir de filas que no sabemos interpretar sería peor que no mostrar
  // ninguna.
  if (i.fecha === -1 || i.colaborador === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));

  const salida: Extra[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const fecha = en(f, i.fecha).slice(0, 10);
    const colaborador = en(f, i.colaborador).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !colaborador) continue;
    salida.push({
      fecha,
      colaborador,
      actividad: en(f, i.actividad).trim(),
      estado: en(f, i.estado).trim(),
      monto: aEntero(en(f, i.monto)),
      ajuste: aEntero(en(f, i.ajuste), true),
      motivo: en(f, i.motivo).trim(),
      fila: n + 1
    });
  }
  return salida;
}

export function filaExtra(encabezado: string[], e: Omit<Extra, 'fila'>): string[] {
  const i = indices(encabezado, COL_ACTIVIDADES);
  const fila = new Array(
    Math.max(encabezado.length, ENCABEZADO_ACTIVIDADES.length)
  ).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  const monto = (n: number) => (n ? String(n) : '');
  poner(i.fecha, e.fecha);
  poner(i.colaborador, e.colaborador);
  poner(i.actividad, e.actividad);
  poner(i.estado, e.estado);
  poner(i.monto, monto(e.monto));
  poner(i.ajuste, monto(e.ajuste));
  poner(i.motivo, e.motivo);
  return fila;
}

/**
 * Deja el día listo para guardar: **una línea por colaborador.**
 *
 * Agregar dos veces a la misma persona el mismo día la deja una sola vez, y
 * gana la última. Es la misma regla que `normalizarPlan()` para el equipo y
 * por el mismo motivo: dos líneas de la misma persona harían decir al panel
 * que vinieron dos jinetes donde vino uno, y este es justo el lugar donde se
 * mira cuánto costó el día.
 *
 * Si de verdad hace falta pagarle dos cosas distintas al mismo proveedor, va
 * en una línea con el monto sumado y el detalle en el motivo.
 */
export function normalizarExtras(lista: Omit<Extra, 'fila'>[]): Omit<Extra, 'fila'>[] {
  const porNombre = new Map<string, Omit<Extra, 'fila'>>();
  for (const e of lista) {
    const nombre = String(e.colaborador ?? '').trim();
    if (!nombre) continue;
    porNombre.set(normalizar(nombre), { ...e, colaborador: nombre });
  }
  return [...porNombre.values()];
}

export const extrasDelDia = (lista: Extra[], fecha: Fecha) =>
  lista.filter((e) => e.fecha === fecha);

/** Lo que costaron las actividades de un día. Solo las confirmadas. */
export const costoExtrasDelDia = (lista: Extra[], fecha: Fecha) =>
  extrasDelDia(lista, fecha).reduce((s, e) => s + costoDeExtra(e), 0);

/* ---------- El informe ---------- */

export interface LineaExtra {
  colaborador: string;
  /** La última actividad que hizo en el periodo. */
  actividad: string;
  /** Días en que vino. */
  dias: number;
  noVino: number;
  /** Días agendados que nadie confirmó todavía. */
  sinConfirmar: number;
  montos: number;
  ajustes: number;
  total: number;
  /** Dónde pagarle. Sale de la ficha, no de los días. */
  cuenta: string;
}

/**
 * Lo que se le debe a cada colaborador entre `desde` y `hasta`, inclusive.
 *
 * **Muestra también a quien no vino y a quien quedó sin confirmar, con total
 * cero**, por lo mismo que el informe del equipo: una línea que desaparece
 * se lee como que no se contrató a nadie, y lo que pudo pasar es que nadie
 * cerró ese día.
 *
 * La cuenta bancaria la pone quien llama, desde las fichas: no viaja en la
 * línea del día porque no es un hecho de ese día.
 */
export function informeDeExtras(
  lista: Extra[], desde: Fecha, hasta: Fecha, cuentas = new Map<string, string>()
): LineaExtra[] {
  const porNombre = new Map<string, LineaExtra>();

  for (const e of lista) {
    if (e.fecha < desde || e.fecha > hasta) continue;
    const clave = normalizar(e.colaborador);
    if (!clave) continue;

    let l = porNombre.get(clave);
    if (!l) {
      l = {
        colaborador: e.colaborador, actividad: e.actividad,
        dias: 0, noVino: 0, sinConfirmar: 0,
        montos: 0, ajustes: 0, total: 0,
        cuenta: cuentas.get(clave) ?? ''
      };
      porNombre.set(clave, l);
    }
    if (e.actividad) l.actividad = e.actividad;

    if (e.estado === VINO.no) { l.noVino++; continue; }
    if (e.estado !== VINO.si) { l.sinConfirmar++; continue; }

    l.dias++;
    l.montos += e.monto || 0;
    l.ajustes += e.ajuste || 0;
    l.total += costoDeExtra(e);
  }

  return [...porNombre.values()].sort(
    (a, b) => b.total - a.total || a.colaborador.localeCompare(b.colaborador)
  );
}
