'use client';
/**
 * **La ventana de cancelar un evento** (2026-11-11).
 *
 * Pregunta en serio, como cerrar un día: cancelar libera el cupo y no se
 * deshace. Muestra lo que dice el contrato de esta cotización —cuántos días
 * faltan, si está en plazo, cuánto pagó el cliente y qué % se devuelve— y
 * **propone** el monto a devolver, que se puede cambiar porque se negocia.
 * El cálculo lo hace el servidor (`devolucionSugerida()`), el mismo que
 * aplica al guardar.
 */
import { useEffect, useState } from 'react';
import Dialogo from './Dialogo';
import { avisar } from './AvisoFlotante';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';
import { montoCobro } from '@/lib/cobros';
import type { Presupuesto } from '@/lib/presupuestos';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

interface Sugerencia {
  dias: number; enPlazo: boolean; pagado: number; pct: number; devolver: number;
  cancelacionDias: number;
}

export default function CancelarEvento({ p, onCerrar, onListo }: {
  p: Presupuesto; onCerrar: () => void; onListo: () => void;
}) {
  const [s, setS] = useState<Sugerencia | null>(null);
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch(`/api/presupuestos/cancelar?id=${encodeURIComponent(p.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setS(d); setMonto(String(d.devolver));
      })
      .catch(() => setError('No hubo conexión con el panel.'));
  }, [p.id]);

  const devolver = Math.max(0, montoCobro(monto));
  const deMas = s ? devolver > s.pagado : false;

  async function cancelar() {
    if (!motivo.trim()) return setError('Escribe por qué se cancela.');
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/cancelar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, motivo, devolucion: devolver })
      });
      const d = await r.json().catch(() => ({ error: `No se pudo cancelar (error ${r.status}).` }));
      if (d.error) { setError(d.error); return; }
      avisar((d.devolucion ? `Evento cancelado · devolver ${enPesos(d.devolucion)}` : 'Evento cancelado')
        + (d.dia === 'borrado' ? ' · el día salió del calendario' : d.dia === 'cerrado' ? ' · el día volvió a cerrado' : ''));
      onListo();
    } catch {
      setError('No hubo conexión con el panel.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo titulo="Cancelar el evento" onCerrar={onCerrar}>
      <div className="space-y-4 text-[15px]">
        <p>
          {p.fecha && <span className="first-letter:uppercase inline-block font-semibold">{enPalabras(p.fecha)}</span>}
          {p.cliente && <> · {p.cliente}</>}
        </p>

        {!s && !error && <p className="text-hueso/70">Revisando el contrato…</p>}
        {s && (
          <ul className="space-y-1.5 rounded border border-hueso/15 bg-panel p-3">
            <li>
              {s.dias >= 0 ? <>Faltan <strong>{s.dias} días</strong> para el evento.</>
                : <>El evento fue hace <strong>{-s.dias} días</strong>.</>}
            </li>
            <li>
              {s.cancelacionDias > 0
                ? <>El contrato permite cancelar hasta <strong>{s.cancelacionDias} días antes</strong>
                    {' '}con devolución del <strong>{s.pct}% de lo pagado</strong>.</>
                : <>El contrato no ofrece cancelar.</>}
            </li>
            <li>
              {s.enPlazo
                ? <span className="font-semibold text-verde-texto">✓ Está en plazo.</span>
                : <span className="font-semibold text-ambar-texto">! Fuera de plazo: el contrato no obliga a devolver.</span>}
            </li>
            <li>El cliente pagó <strong>{enPesos(s.pagado)}</strong>.</li>
            <li>Según el contrato corresponde devolver <strong>{enPesos(s.devolver)}</strong>.</li>
          </ul>
        )}

        {s && (
          <>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Se le devuelve
              </span>
              <input inputMode="numeric" value={monto} className={`${ENTRADA} sm:w-48`}
                onChange={(e) => setMonto(e.target.value)} />
              <span className="mt-1 block text-[14px] text-hueso/70">
                Lo propone el contrato; si se negoció otra cosa, cámbialo. Queda anotado
                y lo transfiere quien hace los pagos.
              </span>
              {deMas && (
                <span className="mt-1 block text-[14px] font-semibold text-ambar-texto">
                  Es más de lo que pagó: se anota hasta {enPesos(s.pagado)}.
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Por qué se cancela
              </span>
              <textarea value={motivo} rows={2} className={ENTRADA}
                placeholder="Lo que dijo el cliente. Queda en la bitácora."
                onChange={(e) => setMotivo(e.target.value)} />
            </label>
            <p className="rounded border border-rojo-fuerte/50 bg-rojo/10 px-3 py-2 text-[14px]
                          font-semibold text-rojo-texto">
              La reserva se cancela y el día recupera su cupo. Si el día se abrió solo
              para este evento y no tiene otras reservas, sale del calendario. No se
              deshace: si el cliente vuelve, se hace una cotización nueva.
            </p>
          </>
        )}

        {error && <p role="alert" className="text-[15px] font-semibold text-rojo-texto">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="boton min-h-[48px]" onClick={onCerrar}>Volver</button>
          {s && (
            <button type="button" disabled={guardando || !motivo.trim()} onClick={() => void cancelar()}
              className="boton min-h-[48px] !border-rojo-fuerte bg-rojo/15 font-semibold text-rojo-texto
                         disabled:opacity-50">
              {guardando ? 'Cancelando…' : 'Sí, cancelar el evento'}
            </button>
          )}
        </div>
      </div>
    </Dialogo>
  );
}
