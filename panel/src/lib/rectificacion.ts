/**
 * **Rectificar una reserva el día del servicio** (2026-11-12, lo pidió el
 * cliente).
 *
 * Una reserva dice lo que se pactó; la mesa, lo que pasó. Llegaron 4 y no 6,
 * un niño cambió de menú, se dio un 10% por un reclamo. Rectificar es anotar
 * **lo que pasó**, para que el panel cuadre con lo que se ingresa en Fudo.
 *
 * - **Se guarda aparte de la reserva** (`Personas reales`, `Menú real`,
 *   `Descuento`, `Rectificación`, `Aprobación`). La sincronización con
 *   Shopify reescribe personas, menú y monto de una compra en la tienda, y
 *   una cotización ganada reescribe su reserva cada vez que se guarda: si la
 *   rectificación pisara esos campos, se borraría sola. Aparte, se ven las
 *   dos cosas —lo reservado y lo que se cobró—.
 * - **Cambia los números del día** (lo decidió el cliente): las personas, lo
 *   que hay que preparar y el cupo usan lo rectificado (`personasEfectivas()`,
 *   `menuEfectivo()`). La reserva original se sigue viendo al lado.
 * - **Solo desde la apertura del día**, con permiso `rectificar`. Un día
 *   cerrado se rectifica como corrección, con el permiso `corregir`.
 * - **El motivo es obligatorio**: es lo que se va a preguntar un mes después.
 * - **El encargado da los descuentos estándar** —los de Configuración, 5, 10
 *   y 15—; cualquier otro queda **por aprobar** hasta que lo confirme el
 *   gerente, quien paga o el administrador (permiso `aprobar`). Mientras
 *   tanto no cuenta, y la caja de Fudo dice que no se ingrese todavía.
 *
 * Puro, sin red ni planilla, para poder probarlo.
 */
import type { Reserva } from './tipos.ts';

/** Lo que guarda una rectificación, además de las columnas originales. */
export interface Rectificacion {
  /** Cuántos llegaron de verdad. */
  personasReales?: number | null;
  /** Los menús que de verdad se sirvieron, en el formato de `Menú`. */
  menuReal?: string;
  /** El descuento en %, o `null`. */
  descuento?: number | null;
  /** *"2026-11-14 14:03 · Carla · Llegaron menos · comentario"*. Vacía: no está rectificada. */
  rectificacion?: string;
  /** '' sin aprobación pendiente · *Por aprobar* · *Aprobado · …* · *Rechazado · …*. */
  aprobacion?: string;
}

/** Los motivos rápidos: un botón cada uno, y siempre con un comentario escrito. */
export const MOTIVOS_RECTIFICACION = [
  'Llegaron menos', 'Llegaron más', 'Cambio de menú', 'Cortesía', 'Reclamo'
] as const;

/** Un comentario más corto que esto no explica nada. */
export const LARGO_MINIMO_COMENTARIO = 10;

/** Más que esto de diferencia en personas pide confirmar en una segunda pantalla. */
export const CAMBIO_GRANDE_PERSONAS = 5;

const ESTADO_POR_APROBAR = 'Por aprobar';

export function estaRectificada(r: Rectificacion): boolean {
  return !!String(r.rectificacion ?? '').trim();
}

/** La gente que cuenta: la que llegó si se rectificó, la reservada si no. */
export function personasEfectivas(r: Pick<Reserva, 'personas'> & Rectificacion): number {
  return estaRectificada(r) && r.personasReales != null
    ? Number(r.personasReales) || 0
    : Number(r.personas) || 0;
}

/** El menú que cuenta: el servido si se rectificó, el reservado si no. */
export function menuEfectivo(r: { menu: string } & Rectificacion): string {
  return estaRectificada(r) && String(r.menuReal ?? '').trim() ? String(r.menuReal) : r.menu;
}

export function porAprobar(r: Rectificacion): boolean {
  return String(r.aprobacion ?? '').startsWith(ESTADO_POR_APROBAR);
}

export function rechazado(r: Rectificacion): boolean {
  return /^rechazad/i.test(String(r.aprobacion ?? ''));
}

/**
 * El descuento que de verdad se aplica: **cero mientras esté por aprobar o
 * si se rechazó**. Un descuento que todavía nadie confirmó no puede llegar a
 * Fudo.
 */
export function descuentoVigente(r: Rectificacion): number {
  if (!estaRectificada(r) || porAprobar(r) || rechazado(r)) return 0;
  const d = Number(r.descuento);
  return Number.isFinite(d) && d > 0 ? Math.min(100, d) : 0;
}

/**
 * Si un descuento necesita aprobación: **cualquiera que no sea uno de los
 * estándar** de Configuración (lo pidió el cliente: *"el encargado puede
 * poner estos porcentajes estándar y si no, tiene que preguntar"*).
 */
export function necesitaAprobacion(descuento: number | null | undefined, estandar: number[]): boolean {
  const d = Number(descuento) || 0;
  return d > 0 && !estandar.includes(d);
}

/** Cuántas personas suma un texto de menú: "4 × Tradiciones + 2 × Niños" → 6. */
export function personasDelMenu(menu: string): number {
  let n = 0;
  for (const parte of String(menu ?? '').split(/\s*[+,·]\s*/)) {
    const m = /^(\d+)\s*[×x]/i.exec(parte.trim());
    if (m) n += Number(m[1]);
  }
  return n;
}

export interface PedidoRectificacion {
  personas: number;
  menu: string;
  descuento: number | null;
  motivo: string;
  comentario: string;
}

/**
 * Lo que impide guardar. Vacío: se puede. Lo comprueba el servidor y la
 * pantalla usa la misma función para apagar el botón.
 */
export function erroresRectificacion(p: PedidoRectificacion): string[] {
  const errores: string[] = [];
  if (!Number.isInteger(p.personas) || p.personas < 0) errores.push('Las personas tienen que ser un número desde 0.');
  if (p.descuento != null && (!(p.descuento >= 0) || p.descuento > 100)) {
    errores.push('El descuento va de 0 a 100%.');
  }
  const enMenus = personasDelMenu(p.menu);
  if (p.personas > 0 && String(p.menu ?? '').trim() && enMenus !== p.personas) {
    errores.push(`Los menús suman ${enMenus} y llegaron ${p.personas}: hazlos calzar.`);
  }
  if (!String(p.motivo ?? '').trim()) errores.push('Elige el motivo.');
  if (String(p.comentario ?? '').trim().length < LARGO_MINIMO_COMENTARIO) {
    errores.push(`Escribe qué pasó (al menos ${LARGO_MINIMO_COMENTARIO} letras): queda anotado.`);
  }
  return errores;
}

export interface Aviso { tono: 'ambar' | 'rojo' | 'cielo'; texto: string }

/**
 * **Los avisos según el caso**, para que quien rectifica sepa qué pasa antes
 * de guardar. No impiden guardar: lo dicen.
 */
export function avisosRectificacion(
  r: Pick<Reserva, 'personas' | 'estadoPago'>,
  p: Pick<PedidoRectificacion, 'personas' | 'descuento'>,
  extra: { pagada: boolean; deCotizacion: boolean; quedan?: number | null; estandar: number[]; puedeAprobar: boolean }
): Aviso[] {
  const avisos: Aviso[] = [];
  const dif = p.personas - (Number(r.personas) || 0);
  if (extra.pagada && dif < 0) {
    avisos.push({ tono: 'ambar', texto: `Pagó por ${r.personas}. La diferencia no se devuelve desde acá: avísale a quien hace los pagos.` });
  }
  if (extra.pagada && dif > 0) {
    avisos.push({ tono: 'cielo', texto: `Pagó por ${r.personas}: cobra en Fudo ${dif === 1 ? 'la persona extra' : `las ${dif} personas extra`} a precio del local.` });
  }
  if (extra.deCotizacion) {
    avisos.push({ tono: 'cielo', texto: 'La cotización y el contrato no cambian: esto es solo lo que pasó el día.' });
  }
  if (dif > 0 && extra.quedan != null && dif > extra.quedan) {
    avisos.push({ tono: 'rojo', texto: `Con ${dif} más el día pasa su cupo (quedaban ${Math.max(0, extra.quedan)}).` });
  }
  if (necesitaAprobacion(p.descuento, extra.estandar)) {
    avisos.push(extra.puedeAprobar
      ? { tono: 'ambar', texto: `El ${p.descuento}% no es un descuento estándar: queda aprobado por ti.` }
      : { tono: 'ambar', texto: `El ${p.descuento}% no es un descuento estándar: queda por aprobar. Hasta que lo apruebe el encargado de operaciones o quien paga, en Fudo no se ingresa.` });
  }
  return avisos;
}

/** Si el cambio es grande: pide una segunda confirmación. */
export function esCambioGrande(
  r: Pick<Reserva, 'personas'>, p: Pick<PedidoRectificacion, 'personas' | 'descuento'>, estandar: number[]
): boolean {
  const tope = Math.max(0, ...estandar);
  return Math.abs(p.personas - (Number(r.personas) || 0)) > CAMBIO_GRANDE_PERSONAS
    || (Number(p.descuento) || 0) > tope;
}

/** Lo que se guarda en `Rectificación`: cuándo, quién, el motivo y el comentario. */
export function marcaRectificacion(cuando: string, quien: string, motivo: string, comentario: string): string {
  const limpio = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();
  return [cuando, quien || 'alguien', limpio(motivo), limpio(comentario)].filter(Boolean).join(' · ');
}

/** Lo que se guarda en `Aprobación`. */
export function marcaAprobacion(aprobado: boolean, quien: string, cuando: string): string {
  return `${aprobado ? 'Aprobado' : 'Rechazado'} · ${quien || 'alguien'} · ${cuando}`;
}

export const POR_APROBAR = ESTADO_POR_APROBAR;

/** La línea corta de una reserva rectificada: *"6 → 4 pers. · −10%"*. */
export function resumenRectificacion(r: Pick<Reserva, 'personas' | 'menu'> & Rectificacion): string {
  if (!estaRectificada(r)) return '';
  const partes: string[] = [];
  const reales = personasEfectivas(r);
  if (reales !== (Number(r.personas) || 0)) partes.push(`${r.personas} → ${reales} pers.`);
  if (String(r.menuReal ?? '').trim() && r.menuReal !== r.menu) partes.push('menú cambiado');
  const d = Number(r.descuento) || 0;
  if (d > 0) partes.push(`−${d}%${porAprobar(r) ? ' por aprobar' : rechazado(r) ? ' rechazado' : ''}`);
  return partes.join(' · ') || 'sin cambios de números';
}

/**
 * Las partes de la marca de `Rectificación`: *"2026-11-14 14:03 · Carla ·
 * Llegaron menos · llegaron cuatro de seis"*. El comentario puede traer su
 * propio `·`, así que todo lo que sigue al motivo es comentario.
 */
export function partesRectificacion(marca: string): { cuando: string; quien: string; motivo: string; comentario: string } {
  const [cuando = '', quien = '', motivo = '', ...resto] = String(marca ?? '').split(' · ').map((s) => s.trim());
  return { cuando, quien, motivo, comentario: resto.join(' · ') };
}
