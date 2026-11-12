/**
 * **La bandeja de aprobaciones** (2026-11-12, lo pidió el cliente): lo que
 * el gerente de operaciones —y quien paga y el administrador— tiene que
 * aprobar, apenas entra al panel. *"Hey, tienes que aprobar el descuento
 * extra que pidió la Fran"*.
 *
 * Hoy hay un solo tipo, el descuento fuera de lo estándar de una
 * rectificación. **Está armada para crecer**: cada cosa por aprobar es un
 * `Pendiente` con su tipo, y un tipo nuevo es una función más que agrega
 * los suyos a la lista. La pantalla dibuja cualquiera igual: quién pide qué,
 * para qué, por qué, y dos botones.
 *
 * Puro, sin red ni planilla.
 */
import type { Reserva } from './tipos.ts';
import { ocupaLugar } from './ocupacion.ts';
import { estaRectificada, porAprobar, personasEfectivas, partesRectificacion } from './rectificacion.ts';

export interface Pendiente {
  /** Qué se aprueba. Un tipo nuevo se suma acá. */
  tipo: 'descuento';
  /** Única en la lista: sirve de `key` y para saber cuál se está guardando. */
  clave: string;
  /** La fila de la reserva, que es lo que pide `/api/reservas/aprobar`. */
  fila: number;
  fecha: string;
  /** Quién lo pidió, tal como firmó la rectificación. */
  pide: string;
  /** Cuándo lo pidió: *"2026-11-14 14:03"*. */
  cuando: string;
  /** El nombre de la reserva. */
  nombre: string;
  personas: number;
  /** El % pedido. */
  porcentaje: number;
  motivo: string;
  comentario: string;
}

/** Los descuentos por aprobar, del día más antiguo al más nuevo: lo de hoy no puede esperar a lo de la otra semana. */
export function pendientesDeAprobar(reservas: Reserva[]): Pendiente[] {
  const lista: Pendiente[] = [];
  for (const r of reservas) {
    if (!ocupaLugar(r) || !estaRectificada(r) || !porAprobar(r)) continue;
    const p = partesRectificacion(r.rectificacion ?? '');
    lista.push({
      tipo: 'descuento', clave: `descuento-${r.fila}`, fila: r.fila, fecha: r.fecha,
      pide: p.quien || 'alguien', cuando: p.cuando, nombre: r.nombre || 'sin nombre',
      personas: personasEfectivas(r), porcentaje: Number(r.descuento) || 0,
      motivo: p.motivo, comentario: p.comentario
    });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cuando.localeCompare(b.cuando));
}
