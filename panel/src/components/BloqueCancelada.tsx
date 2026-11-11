'use client';
/**
 * **Una cotización cancelada, y su devolución** (2026-11-11).
 *
 * Dice quién la canceló, cuándo y por qué, y cuánto se acordó devolver
 * contra cuánto ya se devolvió. La devolución la anota **quien hace los
 * pagos** cuando transfiere: es un cobro *Devolución* en negativo, con su
 * comprobante y su revisión como cualquier otro cobro (`faltaDevolver()`).
 */
import { useState } from 'react';
import { avisar } from './AvisoFlotante';
import { enPesos } from '@/lib/ocupacion';
import { faltaDevolver } from '@/lib/cancelacion';
import { CONCEPTO_COBRO, montoCobro, type Cobro } from '@/lib/cobros';
import type { Presupuesto } from '@/lib/presupuestos';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

export default function BloqueCancelada({ p, cobros, puedePagar, onCobros }: {
  p: Presupuesto; cobros: Cobro[]; puedePagar: boolean; onCobros: (c: Cobro[]) => void;
}) {
  const { devuelto, falta } = faltaDevolver(p.devolucion, cobros);
  const [medio, setMedio] = useState('');
  const [parte, setParte] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function anotar(monto: number) {
    if (monto <= 0) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/cobros', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ presupuesto: p.id, concepto: CONCEPTO_COBRO.devolucion, monto, medio })
      });
      const d = await r.json().catch(() => ({ error: `No se pudo guardar (error ${r.status}).` }));
      if (d.error) { setError(d.error); return; }
      onCobros(d.cobros); setParte(null); setMedio('');
      avisar(`Devolución anotada · ${enPesos(monto)}`);
    } catch {
      setError('No hubo conexión con el panel.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded border border-rojo-fuerte/60 bg-rojo/5 p-3 text-[15px]">
      <p className="font-semibold text-rojo-texto">✕ Evento cancelado</p>
      <p className="mt-1 text-hueso/80">
        {p.canceladaPor && <>Lo canceló {p.canceladaPor}</>}
        {p.cancelada && <> el {p.cancelada.slice(0, 10)}</>}
        {p.motivo && <> · {p.motivo}</>}
      </p>
      <p className="mt-1 text-[14px] text-hueso/70">La reserva quedó cancelada y el día recuperó su cupo.</p>

      <div className="mt-3 border-t border-hueso/10 pt-3">
        {p.devolucion > 0 ? (
          <p>
            Devolución acordada <strong>{enPesos(p.devolucion)}</strong>
            {devuelto > 0 && <> · devuelto <strong>{enPesos(devuelto)}</strong></>}
            {' '}
            {falta > 0 ? (
              <span className="ml-1 inline-block whitespace-nowrap rounded-full border border-ambar/60 px-2 py-0.5 text-[13px]
                               font-semibold text-ambar-texto">falta devolver {enPesos(falta)}</span>
            ) : (
              <span className="ml-1 inline-block whitespace-nowrap rounded-full border border-verde-fuerte bg-verde/15 px-2 py-0.5
                               text-[13px] font-semibold text-verde-texto">✓ devuelta</span>
            )}
          </p>
        ) : (
          <p className="text-hueso/80">Sin devolución.</p>
        )}

        {falta > 0 && puedePagar && (
          <div className="mt-3 space-y-2">
            <input value={medio} onChange={(e) => setMedio(e.target.value)}
              placeholder="Cómo se devolvió: transferencia… (opcional)" className={`${ENTRADA} sm:w-96`} />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={guardando} onClick={() => void anotar(falta)}
                className="boton min-h-[48px] !border-verde-fuerte text-verde-texto hover:bg-verde/10">
                {guardando ? 'Guardando…' : `✓ Devuelto · ${enPesos(falta)}`}
              </button>
              <button type="button" disabled={guardando} className="boton min-h-[48px]"
                onClick={() => setParte(parte === null ? '' : null)}>Una parte</button>
            </div>
            {parte !== null && (
              <div className="flex flex-wrap items-end gap-2">
                <input inputMode="numeric" value={parte} placeholder="Monto" autoFocus
                  className={`${ENTRADA} w-40`} onChange={(e) => setParte(e.target.value)} />
                <button type="button" disabled={guardando || montoCobro(parte) <= 0}
                  onClick={() => void anotar(Math.abs(montoCobro(parte)))}
                  className="boton min-h-[44px]">Anotar</button>
              </div>
            )}
            <p className="text-[14px] text-hueso/70">
              Queda en los pagos del cliente, en negativo. Ahí se le sube el comprobante.
            </p>
          </div>
        )}
        {falta > 0 && !puedePagar && (
          <p className="mt-2 text-[14px] text-hueso/70">La devolución la anota quien hace los pagos.</p>
        )}
        {error && <p role="alert" className="mt-2 font-semibold text-rojo-texto">{error}</p>}
      </div>
    </div>
  );
}
