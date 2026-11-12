'use client';
/**
 * **La bandeja de aprobaciones** (2026-11-12, lo pidió el cliente): arriba
 * de la portada, para quien puede aprobar —el gerente de operaciones, quien
 * paga y el administrador—. Una tarjeta por cosa pendiente, que se aprueba
 * ahí mismo con un toque.
 *
 * - **Dice quién pide qué en una frase**: *"Fran pide un 25% de descuento"*,
 *   y debajo para quién, cuánta gente, qué día y por qué.
 * - **Aprobar es un toque; rechazar pregunta**, porque un rechazo no se
 *   deshace desde acá y deja a quien lo pidió con la mesa abierta.
 * - **Cualquier tipo se dibuja igual** (`Pendiente` en `lib/aprobaciones.ts`):
 *   cuando se sume otra cosa por aprobar, entra a esta misma bandeja.
 */
import { useState } from 'react';
import type { Pendiente } from '@/lib/aprobaciones';
import { enPalabras, hoy } from '@/lib/fechas';
import { avisar } from './AvisoFlotante';

export default function BandejaAprobaciones({ pendientes, onCambio, verReserva }: {
  pendientes: Pendiente[];
  /** Después de aprobar o rechazar: recargar lo que corresponda. */
  onCambio: () => void;
  /** En la página del día, abrir la reserva ahí mismo; si no, se va a su día. */
  verReserva?: (p: Pendiente) => void;
}) {
  const [guardando, setGuardando] = useState('');
  const [rechazando, setRechazando] = useState('');
  const [listas, setListas] = useState<string[]>([]);
  const visibles = pendientes.filter((p) => !listas.includes(p.clave));
  if (!visibles.length) return null;

  async function responder(p: Pendiente, aprobar: boolean) {
    setGuardando(p.clave);
    try {
      const res = await fetch('/api/reservas/aprobar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fila: p.fila, aprobar })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      // Sale de la bandeja en el acto; la recarga trae el resto al día.
      setListas((l) => [...l, p.clave]);
      setRechazando('');
      avisar(aprobar ? `Aprobado: ${p.porcentaje}% para ${p.nombre}` : `Rechazado: el ${p.porcentaje}% de ${p.nombre}`,
        aprobar ? 'ok' : 'atencion');
      onCambio();
    } finally {
      setGuardando('');
    }
  }

  return (
    <section aria-label="Por aprobar"
      className="mb-5 rounded-2xl border-2 border-ambar-fuerte/70 bg-ambar/10 p-3 sm:p-4">
      <h2 className="flex flex-wrap items-center gap-2 text-[18px] font-bold text-ambar-texto">
        <span aria-hidden>🔔</span>
        {visibles.length === 1 ? 'Tienes algo que aprobar' : `Tienes ${visibles.length} cosas que aprobar`}
      </h2>
      <p className="mt-1 text-[14px] text-hueso/70">
        Mientras no lo apruebes, el descuento no cuenta y en Fudo no se ingresa.
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibles.map((p) => {
          const ocupado = guardando === p.clave;
          const esHoy = p.fecha === hoy();
          return (
            <li key={p.clave} className="flex flex-col rounded-xl border-2 border-hueso/15 bg-panel p-4">
              <p className="text-[17px] leading-snug">
                <b>{p.pide}</b> pide un{' '}
                <span className="inline-block rounded-lg border-2 border-ambar-fuerte/70 bg-ambar/15 px-2
                                 text-[22px] font-bold text-ambar-texto">{p.porcentaje}%</span>{' '}
                de descuento
              </p>
              <p className="mt-2 text-[15px]">
                para <b>{p.nombre}</b> · {p.personas} {p.personas === 1 ? 'persona' : 'personas'}
              </p>
              <p className="text-[14px] text-hueso/70">
                <span className="inline-block first-letter:uppercase">{enPalabras(p.fecha)}</span>
                {esHoy && <span className="ml-2 rounded-full border border-oro/60 px-2 text-[13px] font-semibold text-oro">hoy</span>}
                {p.cuando && <> · lo pidió a las {p.cuando.slice(11) || p.cuando}</>}
              </p>
              {(p.motivo || p.comentario) && (
                <p className="mt-2 rounded-lg border border-hueso/15 bg-hueso/[0.04] px-3 py-2 text-[14px]">
                  {p.motivo && <b>{p.motivo}</b>}{p.motivo && p.comentario && ' · '}
                  {p.comentario && <span className="text-hueso/80">“{p.comentario}”</span>}
                </p>
              )}

              {rechazando === p.clave ? (
                <div className="mt-3 rounded-lg border-2 border-rojo-fuerte/50 bg-rojo/10 p-3">
                  <p className="text-[15px] font-semibold text-rojo-texto">
                    ¿Rechazar el {p.porcentaje}%? Se cobra sin descuento, y avísale a {p.pide}.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={ocupado}
                      className="boton min-h-[44px] !border-rojo-fuerte bg-rojo-fuerte !text-[15px] !font-bold text-tinta"
                      onClick={() => void responder(p, false)}>
                      {ocupado ? 'Guardando…' : 'Sí, rechazar'}
                    </button>
                    <button type="button" className="boton min-h-[44px]" onClick={() => setRechazando('')}>
                      No, volver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={ocupado}
                    className="boton min-h-[52px] !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta"
                    onClick={() => void responder(p, true)}>
                    {ocupado ? 'Guardando…' : `✓ Aprobar ${p.porcentaje}%`}
                  </button>
                  <button type="button" disabled={ocupado}
                    className="boton min-h-[52px] !border-rojo-fuerte/60 !text-[16px] !font-semibold text-rojo-texto"
                    onClick={() => setRechazando(p.clave)}>
                    ✕ Rechazar
                  </button>
                </div>
              )}
              {verReserva
                ? <button type="button" className="boton mt-2 self-start" onClick={() => verReserva(p)}>Ver la reserva →</button>
                : <a href={`/dia/${p.fecha}`} className="tecla boton mt-2 self-start">Ver el día →</a>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
