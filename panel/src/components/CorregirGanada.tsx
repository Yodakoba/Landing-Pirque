'use client';
/**
 * **Corregir una cotización ganada** (2026-11-12, lo pidió el cliente).
 *
 * Tres salidas, cada una un botón grande con lo que pasa:
 *
 * - **Volver a antes de ganar**: la reserva sale del calendario de reservas,
 *   el día vuelve a como estaba y la cotización queda con su anticipo,
 *   lista para ganarla de nuevo cuando corresponda.
 * - **El cliente eligió la B**: lo mismo, y los pagos pasan a la B. Después
 *   se marca ganada la B como siempre.
 * - **El cliente ya no viene**: eso no es corregir, es cancelar el evento,
 *   que calcula la devolución. Abre esa ventana.
 *
 * Lo hace `/api/presupuestos/corregir`.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { avisar } from './AvisoFlotante';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, esFecha } from '@/lib/fechas';
import type { Presupuesto } from '@/lib/presupuestos';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

export default function CorregirGanada({ p, letra, gente, otras, onCerrar, onCancelarEvento, onListo }: {
  p: Presupuesto;
  letra: string;
  gente: number;
  /** Las otras alternativas a las que se pueden pasar los pagos. */
  otras: { id: string; letra: string; total: number }[];
  onCerrar: () => void;
  onCancelarEvento: () => void;
  /** Se corrigió: `hacia` es la alternativa que hay que abrir, o ''. */
  onListo: (hacia: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function corregir(hacia: string) {
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/corregir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, hacia, motivo })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { setError(d.error || 'No se pudo corregir.'); return; }
      const destino = otras.find((o) => o.id === hacia);
      avisar(destino
        ? `Listo: ahora márcala ganada en la ${destino.letra}${d.movidos ? ', que ya tiene los pagos' : ''}`
        : 'Listo: la reserva salió del calendario y la cotización volvió a antes de ganar');
      onListo(hacia);
    } finally { setGuardando(false); }
  }

  const cuando = esFecha(p.fecha) ? `del ${enPalabras(p.fecha)}` : '';
  return (
    <Dialogo titulo="Corregir la ganada" onCerrar={onCerrar}>
      <p className="mt-3 text-[16px]">
        {letra ? <>La <strong>alternativa {letra}</strong> está</> : 'Esta cotización está'} marcada ganada:
        su reserva de <strong>{gente} personas</strong> {cuando} está en el calendario. ¿Qué pasó?
      </p>

      <div className="mt-4 space-y-3">
        {otras.map((o) => (
          <button key={o.id} type="button" disabled={guardando} onClick={() => void corregir(o.id)}
            className="tecla flex w-full items-center gap-4 rounded-xl border-2 border-cielo-fuerte/70 bg-cielo/10
                       p-3 text-left hover:bg-cielo/20 disabled:opacity-50">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cielo-fuerte
                             text-[30px] font-extrabold text-tinta">{o.letra}</span>
            <span>
              <span className="block text-[17px] font-bold">El cliente eligió la {o.letra} · {enPesos(o.total)}</span>
              <span className="block text-[14px] text-hueso/80">
                La reserva sale del calendario y los pagos pasan a la {o.letra}. Después la marcas ganada.
              </span>
            </span>
          </button>
        ))}

        <button type="button" disabled={guardando} onClick={() => void corregir('')}
          className="tecla w-full rounded-xl border-2 border-ambar/70 bg-ambar/10 p-3 text-left
                     hover:bg-ambar/20 disabled:opacity-50">
          <span className="block text-[17px] font-bold">↩ Volver a antes de ganar</span>
          <span className="block text-[14px] text-hueso/80">
            La reserva sale del calendario y la cotización queda con su anticipo, lista para ganarla de nuevo.
          </span>
        </button>

        <button type="button" disabled={guardando} onClick={onCancelarEvento}
          className="tecla w-full rounded-xl border-2 border-rojo-fuerte/60 p-3 text-left
                     hover:bg-rojo/10 disabled:opacity-50">
          <span className="block text-[17px] font-bold text-rojo-texto">✕ El cliente ya no viene</span>
          <span className="block text-[14px] text-hueso/80">
            Eso es cancelar el evento: libera el cupo y calcula la devolución.
          </span>
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
          Por qué (queda en la bitácora; obligatorio si el día ya se cerró)
        </span>
        <input className={`${ENTRADA} mt-1`} value={motivo} onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: se marcó la A por error" />
      </label>

      {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}
      {guardando && <p className="mt-3 text-[15px] text-hueso/75">Corrigiendo…</p>}

      <div className="mt-5 flex justify-end">
        <button type="button" className="boton min-h-[48px]" onClick={onCerrar}>Volver</button>
      </div>
    </Dialogo>
  );
}
