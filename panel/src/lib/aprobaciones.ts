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
import type { FechaHabil, Ocupacion, Reserva } from './tipos.ts';
import { ocupaLugar } from './ocupacion.ts';
import { estaRectificada, porAprobar, personasEfectivas, partesRectificacion } from './rectificacion.ts';
import { cupoPedidoDe } from './cupo.ts';
import { cupoAmpliado } from './sobrecupo.ts';
import type { Presupuesto } from './presupuestos.ts';
import { esExclusivo, exclusividadDe, plazoParaLiberar } from './exclusivo.ts';

/** Lo que tienen todas las cosas por aprobar. */
interface Base {
  /** Única en la lista: sirve de `key` y para saber cuál se está guardando. */
  clave: string;
  fecha: string;
  /** Quién lo pidió; vacío si nadie lo pidió (un sobrecupo lo trae un pago). */
  pide: string;
  /** Cuándo lo pidió: *"2026-11-14 14:03"*. */
  cuando: string;
  motivo: string;
  comentario: string;
}

/** Un descuento sobre el estándar, de una rectificación. */
export interface PendienteDescuento extends Base {
  tipo: 'descuento';
  /** La fila de la reserva, que es lo que pide `/api/reservas/aprobar`. */
  fila: number;
  nombre: string;
  personas: number;
  porcentaje: number;
}

/** Un pedido de subir el cupo de un día (`lib/cupo.ts`). */
export interface PendienteCupo extends Base {
  tipo: 'cupo';
  cupoActual: number;
  cupoPedido: number;
  tomadas: number;
}

/** Un día que se pasó de su cupo: un pago entró sobre reservas sin pagar. */
export interface PendienteSobrecupo extends Base {
  tipo: 'sobrecupo';
  cupoActual: number;
  tomadas: number;
  exceso: number;
  /** A cuánto se amplía con un toque, sin pasar del recinto. */
  ampliarA: number;
  /** Si ampliando caben todos. */
  alcanza: boolean;
}

/**
 * **Un pedido de liberar un día para un evento exclusivo** (2026-11-12,
 * `lib/exclusivo.ts`). Lo decide quien tiene `exclusividad`.
 */
export interface PendienteExclusivo extends Base {
  tipo: 'exclusivo';
  /** La cotización: es lo que pide `/api/presupuestos/exclusivo`. */
  id: string;
  folio: string;
  cliente: string;
  invitados: number;
  /** Las otras reservas de ese día, y su gente: lo que habría que mover. */
  reservas: number;
  personas: number;
  faltan: number;
  enPlazo: boolean;
  diasMinimos: number;
  /** Si el día ya dejó de venderse por este pedido. */
  pausado: boolean;
}

/** Lo que se aprueba. Un tipo nuevo se suma a esta unión. */
export type Pendiente = PendienteDescuento | PendienteCupo | PendienteSobrecupo | PendienteExclusivo;

const porFecha = (a: Pendiente, b: Pendiente) => a.fecha.localeCompare(b.fecha) || a.cuando.localeCompare(b.cuando);

/** Los descuentos por aprobar, del día más antiguo al más nuevo: lo de hoy no puede esperar a lo de la otra semana. */
export function pendientesDeAprobar(reservas: Reserva[]): PendienteDescuento[] {
  const lista: PendienteDescuento[] = [];
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
  return lista.sort(porFecha) as PendienteDescuento[];
}

/** Los pedidos de subir el cupo. `tomadas`: cuánta gente ya ocupa cada día. */
export function pendientesDeCupo(fechas: FechaHabil[], tomadas: Record<string, number> = {}): PendienteCupo[] {
  const lista: PendienteCupo[] = [];
  for (const f of fechas) {
    const p = cupoPedidoDe(f.cupoPedido);
    if (!p || p.cupo <= f.capacidad) continue;
    lista.push({
      tipo: 'cupo', clave: `cupo-${f.fecha}`, fecha: f.fecha, pide: p.quien || 'alguien', cuando: p.cuando,
      motivo: '', comentario: p.motivo, cupoActual: f.capacidad, cupoPedido: p.cupo,
      tomadas: tomadas[f.fecha] ?? 0
    });
  }
  return lista.sort(porFecha) as PendienteCupo[];
}

/**
 * Los días sobre su cupo. **Uno que ya tiene un pedido de cupo no se
 * repite**: el pedido es la misma decisión, con quién lo pidió.
 */
export function pendientesDeSobrecupo(
  dias: Pick<Ocupacion, 'fecha' | 'capacidad' | 'tomadas' | 'sobrecupo'>[],
  capacidadMaxima: number, conPedido: Set<string> = new Set()
): PendienteSobrecupo[] {
  const lista: PendienteSobrecupo[] = [];
  for (const d of dias) {
    if (!(d.sobrecupo > 0) || conPedido.has(d.fecha)) continue;
    const a = cupoAmpliado(d.tomadas, capacidadMaxima);
    lista.push({
      tipo: 'sobrecupo', clave: `sobrecupo-${d.fecha}`, fecha: d.fecha, pide: '', cuando: '',
      motivo: '', comentario: '', cupoActual: d.capacidad, tomadas: d.tomadas, exceso: d.sobrecupo,
      ampliarA: a.cupo, alcanza: a.alcanza
    });
  }
  return lista;
}

/**
 * Los pedidos de liberar un día. `folio` arma el número de la cotización
 * (el del grupo), para no importar acá la lógica de alternativas.
 */
export function pendientesDeExclusivo(
  presupuestos: Pick<Presupuesto, 'id' | 'fecha' | 'cliente' | 'invitados' | 'exclusivo' | 'exclusividad' | 'diaPausado' | 'idReserva'>[],
  reservas: Reserva[], hoy: string, diasMinimos: number, folio: (id: string) => string = (id) => id
): PendienteExclusivo[] {
  const lista: PendienteExclusivo[] = [];
  for (const p of presupuestos) {
    const d = exclusividadDe(p.exclusividad);
    if (d.estado !== 'pedida' || !esExclusivo(p.exclusivo) || !p.fecha) continue;
    const otras = reservas.filter((r) => r.fecha === p.fecha && ocupaLugar(r) && r.id !== p.idReserva);
    const plazo = plazoParaLiberar(p.fecha, hoy, diasMinimos);
    lista.push({
      tipo: 'exclusivo', clave: `exclusivo-${p.id}`, fecha: p.fecha, pide: d.quien || 'alguien', cuando: d.cuando,
      motivo: '', comentario: '', id: p.id, folio: folio(p.id), cliente: p.cliente || 'sin nombre',
      invitados: Number(p.invitados) || 0, reservas: otras.length,
      personas: otras.reduce((n, r) => n + (Number(r.personas) || 0), 0),
      faltan: plazo.faltan, enPlazo: plazo.enPlazo, diasMinimos, pausado: !!p.diaPausado
    });
  }
  return lista.sort(porFecha) as PendienteExclusivo[];
}

/** Todo junto, del día más antiguo al más nuevo. */
export function juntarPendientes(...listas: Pendiente[][]): Pendiente[] {
  return listas.flat().sort(porFecha);
}
