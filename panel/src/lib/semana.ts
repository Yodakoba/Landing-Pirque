/**
 * **La línea de cada semana del calendario** (2026-11-05, lo pidió el
 * cliente).
 *
 * Decía *"17 personas · 2 públicos"*, y ese "2 públicos" contaba **días**
 * abiertos al público: no se entendía, y además ya se ve en cada tarjeta de
 * abajo. Ahora dice lo que no se ve sin sumar —cuánta gente y cuántas
 * reservas— y después **solo lo que se sale de lo normal**, en pastillas.
 *
 * - **Hasta tres avisos**, en orden de urgencia: más que eso deja de ser
 *   una línea y pasa a ser una lista que nadie lee.
 * - **Uno por tipo**, nombrando los días: *"Sáb y dom casi llenos"* y no
 *   dos pastillas que dicen lo mismo.
 * - **Sin avisos, la línea es solo el conteo**, y eso ya dice que es una
 *   semana normal.
 *
 * Es puro y no toca la red: recibe lo que la pantalla ya tiene cargado.
 */
import type { Ocupacion, Reserva } from './tipos.ts';
import type { EventosDelDia } from './crm.ts';
import { ocupaLugar } from './ocupacion.ts';
import { diaSemana, type Fecha } from './fechas.ts';

export type Tono = 'rojo' | 'ambar' | 'oro' | 'cielo' | 'rosa';

export interface AvisoSemana {
  texto: string;
  tono: Tono;
}

export interface LineaSemana {
  personas: number;
  reservas: number;
  avisos: AvisoSemana[];
}

/** Cuántos avisos caben en la línea. */
export const MAX_AVISOS = 3;

const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dia = (f: Fecha) => DIA[diaSemana(f)] ?? f;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ["sáb"] → "sáb" · ["sáb","dom"] → "sáb y dom" · tres → "vie, sáb y dom". */
export function listaDeDias(fechas: Fecha[]): string {
  const d = fechas.map(dia);
  if (d.length <= 1) return d.join('');
  return `${d.slice(0, -1).join(', ')} y ${d[d.length - 1]}`;
}

export function lineaDeSemana(entrada: {
  dias: Ocupacion[];
  reservas: Reserva[];
  /** Desde cuántas personas una reserva es "grupo grande" (Config). */
  grupoGrande: number;
  /** Lo del CRM, por fecha. */
  crm?: Record<Fecha, EventosDelDia | undefined>;
  /** Cuántos faltan en el equipo según las reglas, por fecha. */
  faltanEquipo?: Record<Fecha, number | undefined>;
}): LineaSemana {
  const { dias, grupoGrande, crm = {}, faltanEquipo = {} } = entrada;
  const fechas = new Set(dias.map((d) => d.fecha));
  const reservas = entrada.reservas.filter((r) => fechas.has(r.fecha) && ocupaLugar(r));

  const personas = dias.reduce((n, d) => n + d.tomadas, 0);
  const avisos: AvisoSemana[] = [];

  // 1. Un día cerrado con gente reservada: hay que avisarle a esa gente.
  const cerradosConGente = dias.filter((d) => d.bloqueada && d.tomadas > 0);
  if (cerradosConGente.length) {
    const n = cerradosConGente.reduce((s, d) => s + d.tomadas, 0);
    avisos.push({ tono: 'rojo', texto: `${mayuscula(listaDeDias(cerradosConGente.map((d) => d.fecha)))} `
      + `${cerradosConGente.length === 1 ? 'cerrado' : 'cerrados'} con ${n} `
      + `${n === 1 ? 'persona' : 'personas'}` });
  }

  // 1b. Sobrecupo (2026-11-12): un pago entró sobre reservas sin pagar y
  //     hay que decidir si se amplía el cupo o se suelta a alguien. Ese día
  //     ya no se dice "lleno": sería decir lo mismo dos veces, más suave.
  const sobre = dias.filter((d) => (d.sobrecupo ?? 0) > 0);
  if (sobre.length) {
    const n = sobre.reduce((s, d) => s + d.sobrecupo, 0);
    avisos.push({ tono: 'rojo', texto: `Sobrecupo el ${listaDeDias(sobre.map((d) => d.fecha))}: `
      + `${n} ${n === 1 ? 'persona' : 'personas'} de más` });
  }

  // 2. Lleno o casi lleno. Los dos van en la misma pastilla si los hay: un
  //    día lleno es lo mismo que uno casi lleno, más urgente.
  const abiertos = dias.filter((d) => !d.bloqueada && d.capacidad > 0 && !((d.sobrecupo ?? 0) > 0));
  const llenos = abiertos.filter((d) => d.quedan <= 0);
  const casi = abiertos.filter((d) => d.quedan > 0 && d.semaforo === 'rojo');
  if (llenos.length) {
    avisos.push({ tono: 'rojo', texto: `${mayuscula(listaDeDias(llenos.map((d) => d.fecha)))} `
      + (llenos.length === 1 ? 'lleno' : 'llenos') });
  }
  if (casi.length) {
    avisos.push({ tono: 'ambar', texto: `${mayuscula(listaDeDias(casi.map((d) => d.fecha)))} `
      + (casi.length === 1 ? 'casi lleno' : 'casi llenos') });
  }

  // 3. Grupos grandes. Uno solo se dice con su tamaño; varios, cuántos.
  if (grupoGrande > 0) {
    const grandes = reservas.filter((r) => r.personas >= grupoGrande)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (grandes.length === 1) {
      avisos.push({ tono: 'oro',
        texto: `${mayuscula(dia(grandes[0].fecha))}: grupo de ${grandes[0].personas}` });
    } else if (grandes.length > 1) {
      const dd = [...new Set(grandes.map((r) => r.fecha))];
      avisos.push({ tono: 'oro',
        texto: `${grandes.length} grupos grandes · ${listaDeDias(dd)}` });
    }
  }

  // 4. Falta equipo según las reglas de cada puesto.
  const sinEquipo = dias.filter((d) => (faltanEquipo[d.fecha] ?? 0) > 0).map((d) => d.fecha);
  if (sinEquipo.length) {
    avisos.push({ tono: 'ambar', texto: `Falta equipo el ${listaDeDias(sinEquipo)}` });
  }

  // 5. Ganados del CRM que todavía no son reservas.
  const ganados = dias.filter((d) => (crm[d.fecha]?.personasConfirmadas ?? 0) > 0);
  if (ganados.length) {
    const n = ganados.reduce((s, d) => s + (crm[d.fecha]?.personasConfirmadas ?? 0), 0);
    avisos.push({ tono: 'cielo',
      texto: `${n} del CRM el ${listaDeDias(ganados.map((d) => d.fecha))}` });
  }

  // 6. Presupuestos vigentes.
  const presupuestos = dias.reduce((n, d) => n + d.presupuestos, 0);
  if (presupuestos > 0) {
    const posibles = dias.reduce((n, d) => n + d.presupuestadas, 0);
    avisos.push({ tono: 'rosa',
      texto: `${presupuestos} ${presupuestos === 1 ? 'presupuesto' : 'presupuestos'}`
        + (posibles ? ` · ${posibles} posibles` : '') });
  }

  return { personas, reservas: reservas.length, avisos: avisos.slice(0, MAX_AVISOS) };
}
