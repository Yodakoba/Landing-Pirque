/**
 * **La plata la cierra el encargado de pagos** (regla del cliente,
 * 2026-11-13: *"en movimientos muy claves el encargado de pagos tiene la
 * última palabra si se trata de plata… la regla lo deja responsable a él"*).
 *
 * Anotar un movimiento lo hace quien corresponde; **confirmarlo es de quien
 * tiene `pagar`**, y queda a su nombre. Esto no frena a nadie: lo que se
 * anota rige en el acto, y lo que pagos todavía no vio le llega a su bandeja
 * (`aprobaciones.ts`). Tres cosas, aprobadas por el cliente el mismo día:
 *
 * 1. **El pago de una reserva anotada a mano** —Pagada o Abonada, por
 *    transferencia o en efectivo—. Quien lo marca queda en `Pago anotado`;
 *    pagos lo revisa y queda en `Pago revisado` con la *firma* de lo que vio.
 *    Si el pago cambia después, la firma ya no calza y vuelve a la bandeja.
 * 2. **Un descuento de rectificación ya aplicado** (estándar o aprobado por
 *    operaciones): pagos lo ve y queda en `Descuento revisado`.
 * 3. **La cuenta bancaria o la tarifa** de alguien del equipo o de un extra,
 *    cambiada por quien no es pagos: queda *por confirmar* hasta que pagos
 *    la confirme, y el informe lo avisa antes de transferir.
 *
 * Puro y con pruebas.
 */
import type { Reserva } from './tipos.ts';
import { ESTADO_PAGO } from './columnas.ts';
import { ocupaLugar } from './ocupacion.ts';
import { descuentoVigente } from './rectificacion.ts';
import type { Banco } from './banco.ts';

/** *"2026-11-13 14:03 · Tomás · <firma>"*: cuándo, quién y qué se vio. */
export function marcaPlata(cuando: string, quien: string, firma = ''): string {
  return [cuando, quien || 'alguien', firma].filter((x, i) => i < 2 || x).join(' · ');
}

export function partesMarca(marca: string | undefined): { cuando: string; quien: string; firma: string } | null {
  const t = String(marca ?? '').trim();
  if (!t) return null;
  const [cuando = '', quien = '', ...resto] = t.split(' · ');
  return { cuando, quien, firma: resto.join(' · ') };
}

/** Un pedido de Shopify tiene id numérico: su pago lo pone la tienda. */
const deShopify = (id: string) => /^\d+$/.test(String(id ?? '').trim());

/** Lo que se revisa de un pago: si cambia, la revisión deja de valer. */
export const firmaPago = (r: Pick<Reserva, 'estadoPago' | 'abonado' | 'monto' | 'notaPago'>) =>
  [r.estadoPago, r.abonado ?? '', r.monto ?? '', String(r.notaPago ?? '').trim()].join('|');

/**
 * **Un pago de reserva que pagos todavía no revisó.** Solo las anotadas en
 * el panel —las de Shopify las cobra la tienda; las de una cotización van
 * por sus cobros, que se revisan allá— y solo las que alguien marcó pagadas
 * o abonadas **desde que existe esto** (`Pago anotado`): las de antes no
 * llenan la bandeja de golpe.
 */
export function pagoPorRevisar(r: Reserva, deCotizacion: boolean): boolean {
  if (deShopify(r.id) || deCotizacion || !ocupaLugar(r)) return false;
  if (r.estadoPago !== ESTADO_PAGO.pagado && r.estadoPago !== ESTADO_PAGO.abonado) return false;
  if (!partesMarca(r.pagoAnotado)) return false;
  return partesMarca(r.pagoRevisado)?.firma !== firmaPago(r);
}

/** Lo que se ve de un descuento: el % y la rectificación que lo trajo. */
export const firmaDescuento = (r: Pick<Reserva, 'descuento' | 'rectificacion'>) =>
  [r.descuento ?? '', String(r.rectificacion ?? '').trim()].join('|');

/** Un descuento ya aplicado —estándar o aprobado— que pagos todavía no vio. */
export function descuentoPorVer(r: Reserva): boolean {
  if (!ocupaLugar(r) || !(descuentoVigente(r) > 0)) return false;
  return partesMarca(r.descuentoRevisado)?.firma !== firmaDescuento(r);
}

/* ---------- La cuenta y la tarifa del equipo y los extras ---------- */

const bancoIgual = (a: Banco, b: Banco) =>
  (['titular', 'rut', 'banco', 'tipo', 'numero', 'correo'] as const).every((k) => String(a?.[k] ?? '') === String(b?.[k] ?? ''));

/**
 * Qué cambió de lo que se paga, en palabras: *cuenta bancaria*, *pago por
 * jornada*… Vacío si no cambió nada de plata.
 */
export function cambiosDePlata(
  antes: { banco: Banco; pagoJornada?: number; valorHora?: number; modalidad?: string; monto?: number } | null,
  despues: { banco: Banco; pagoJornada?: number; valorHora?: number; modalidad?: string; monto?: number }
): string[] {
  const vacio = { titular: '', rut: '', banco: '', tipo: '', numero: '', correo: '', nota: '' };
  const a = antes ?? { banco: vacio, pagoJornada: 0, valorHora: 0, modalidad: despues.modalidad, monto: 0 };
  const que: string[] = [];
  if (!bancoIgual(a.banco ?? vacio, despues.banco ?? vacio)) que.push('cuenta bancaria');
  if ((a.pagoJornada ?? 0) !== (despues.pagoJornada ?? 0)) que.push('pago por jornada');
  if ((a.valorHora ?? 0) !== (despues.valorHora ?? 0)) que.push('valor hora extra');
  if ((a.modalidad ?? '') !== (despues.modalidad ?? '')) que.push('modalidad');
  if ((a.monto ?? 0) !== (despues.monto ?? 0)) que.push('monto habitual');
  return que;
}

/**
 * **Lo que queda por confirmar después de guardar una ficha.** Si quien la
 * guarda es pagos y tocó la plata, queda confirmado: lo vio al escribirlo.
 * Si es otro, se suma a lo que ya estuviera pendiente, con su nombre.
 */
export function porConfirmarDespues(previa: string, que: string[], quien: string, cuando: string,
  esPagos: boolean): string {
  if (!que.length) return previa ?? '';
  if (esPagos) return '';
  const antes = partesMarca(previa)?.firma.split(', ').filter(Boolean) ?? [];
  const todo = [...antes, ...que.filter((x) => !antes.includes(x))];
  return marcaPlata(cuando, quien, todo.join(', '));
}

const PAGADA_O_ABONADA = (e: string | undefined) => e === ESTADO_PAGO.pagado || e === ESTADO_PAGO.abonado;

/**
 * **Las marcas que deja guardar el pago de una reserva** a mano. Si el pago
 * quedó Pagada o Abonada y cambió algo de lo que se revisa, queda anotado a
 * nombre de quien lo guarda; si además es pagos, queda revisado en el acto:
 * lo vio al escribirlo. Sin cambios de pago, nada.
 */
export function marcasDePago(
  antes: Pick<Reserva, 'estadoPago' | 'abonado' | 'monto' | 'notaPago'> | null | undefined,
  cambios: Partial<Pick<Reserva, 'estadoPago' | 'abonado' | 'monto' | 'notaPago'>>,
  quien: string, cuando: string, esPagos: boolean
): { pagoAnotado?: string; pagoRevisado?: string } {
  const tocaPago = (['estadoPago', 'abonado', 'monto', 'notaPago'] as const).some((k) => cambios[k] !== undefined);
  if (!tocaPago) return {};
  const base = { estadoPago: '', abonado: null, monto: null, notaPago: '', ...(antes ?? {}) };
  const final = { ...base, ...Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)) } as typeof base;
  if (!PAGADA_O_ABONADA(final.estadoPago)) return {};
  if (antes && PAGADA_O_ABONADA(antes.estadoPago) && firmaPago(base as Reserva) === firmaPago(final as Reserva)) return {};
  return {
    pagoAnotado: marcaPlata(cuando, quien),
    ...(esPagos ? { pagoRevisado: marcaPlata(cuando, quien, firmaPago(final as Reserva)) } : {})
  };
}
