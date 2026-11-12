/**
 * **El pago de una reserva, dicho igual en todas partes** (2026-11-11, lo
 * pidió el cliente: un solo vocabulario para Shopify, las cotizaciones y las
 * reservas a mano). Dos cosas, en ese orden:
 *
 * 1. **De dónde viene**: *Shopify · Pago directo*, *Shopify · Solo reserva*,
 *    *Cotización* o *Anotada a mano*. Dice también quién manda en el pago.
 * 2. **Cómo va**: ✓ Pagada · ½ Abonada · ○ Por pagar, o en rojo si ya no
 *    viene. El ícono es lo que la distingue sin leer y sin distinguir colores.
 */
import type { Reserva } from '@/lib/tipos';
import { ESTADO_PAGO, TIPO_PAGO, esManual } from '@/lib/columnas';
import { liberaCupo, pagoEnEspanol } from '@/lib/pagos';

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

export function origenDe(r: Pick<Reserva, 'id' | 'tipoPago'>, deCotizacion = false): string {
  if (deCotizacion) return 'Cotización';
  if (esManual(r.id)) return 'Anotada a mano';
  return r.tipoPago ? `Shopify · ${r.tipoPago}` : 'Shopify';
}

export default function PastillaPago({ r, deCotizacion = false, sinOrigen = false }: {
  r: Pick<Reserva, 'id' | 'tipoPago' | 'estadoPago' | 'notaPago'> & { abonado?: number | null; liberada?: string };
  deCotizacion?: boolean;
  /** Sin la línea de origen, cuando ya la dice lo que rodea a la pastilla. */
  sinOrigen?: boolean;
}) {
  const e = String(r.estadoPago || '').trim().toLowerCase();
  // Se cayó por cupo (2026-11-12): libera el lugar aunque el estado del pago
  // siga diciendo *por pagar*, y se dice con esas palabras.
  const cayo = !!String(r.liberada ?? '').trim();
  const libera = cayo || liberaCupo(e);
  const [icono, clase] = libera ? ['✕', 'border-rojo-fuerte/60 bg-rojo/10 text-rojo-texto']
    : e === ESTADO_PAGO.pagado ? ['✓', 'border-verde-fuerte/60 bg-verde/10 text-verde-texto']
    : e === ESTADO_PAGO.abonado ? ['½', 'border-cielo-fuerte/60 bg-cielo/10 text-cielo-texto']
    : ['○', 'border-ambar-fuerte/60 bg-ambar/10 text-ambar-texto'];
  const directo = !deCotizacion && !esManual(r.id) && r.tipoPago === TIPO_PAGO.directo;
  return (
    <div className="space-y-1">
      {!sinOrigen && (
        <p className={`text-[13px] font-semibold ${directo ? 'text-verde-texto' : 'text-hueso/70'}`}>
          {origenDe(r, deCotizacion)}
        </p>
      )}
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-2.5 py-0.5
                        text-[14px] font-bold ${clase}`}>
        <span aria-hidden>{icono}</span>
        {cayo ? 'Se cayó por cupo' : pagoEnEspanol(e) || 'Por pagar'}
        {e === ESTADO_PAGO.abonado && (r.abonado ?? 0) > 0 && (
          <span className="font-semibold">· {pesos(r.abonado ?? 0)}</span>
        )}
      </span>
      {cayo && <p className="text-[13px] text-rojo-texto">{r.liberada}</p>}
      {r.notaPago && <p className="text-[13px] text-hueso/65">{r.notaPago}</p>}
    </div>
  );
}
