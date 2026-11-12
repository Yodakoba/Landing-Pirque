'use client';
/**
 * **La bandeja de aprobaciones** (2026-11-12, lo pidió el cliente): arriba
 * de la portada, para el gerente de operaciones, quien paga y el
 * administrador. Una tarjeta por cosa pendiente, que se resuelve ahí mismo
 * con un toque:
 *
 * - **Un descuento sobre el estándar** que pidió alguien al rectificar.
 * - **Un pedido de más cupo** del encargado (`lib/cupo.ts`).
 * - **Un día sobre su cupo**: un pago entró sobre reservas sin pagar.
 *
 * Dice quién pide qué en una frase, y debajo para qué día y por qué.
 * **Aprobar es un toque; rechazar pregunta**, porque deja a quien lo pidió
 * esperando una respuesta que hay que darle. Cualquier tipo nuevo de
 * `Pendiente` (`lib/aprobaciones.ts`) se dibuja en esta misma tarjeta.
 */
import { useState, type ReactNode } from 'react';
import type { Pendiente } from '@/lib/aprobaciones';
import { enPalabras, hoy } from '@/lib/fechas';
import { avisar } from './AvisoFlotante';

/** La cifra grande de la frase: el %, el cupo pedido, las personas de más. */
function Cifra({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-lg border-2 border-ambar-fuerte/70 bg-ambar/15 px-2
                     text-[22px] font-bold text-ambar-texto">{children}</span>
  );
}

/** Qué se le pide al servidor, y qué se le dice a quien aprueba. */
function respuesta(p: Pendiente, aprobar: boolean): { url: string; cuerpo: object; aviso: string } {
  if (p.tipo === 'descuento') {
    return { url: '/api/reservas/aprobar', cuerpo: { fila: p.fila, aprobar },
      aviso: aprobar ? `Aprobado: ${p.porcentaje}% para ${p.nombre}` : `Rechazado: el ${p.porcentaje}% de ${p.nombre}` };
  }
  if (p.tipo === 'cupo') {
    return { url: '/api/fechas/cupo', cuerpo: { fecha: p.fecha, accion: aprobar ? 'aprobar' : 'rechazar' },
      aviso: aprobar ? `Cupo subido a ${p.cupoPedido}. Revisa el equipo del día.` : `Rechazado: el cupo queda en ${p.cupoActual}` };
  }
  return { url: '/api/fechas/ampliar', cuerpo: { fecha: p.fecha },
    aviso: p.alcanza ? `Cupo ampliado a ${p.ampliarA}: caben todos. Revisa el equipo del día.`
      : `Cupo en ${p.ampliarA}, el máximo del recinto: todavía sobran ${p.tomadas - p.ampliarA}.` };
}

export default function BandejaAprobaciones({ pendientes, onCambio, verReserva }: {
  pendientes: Pendiente[];
  /** Después de responder: recargar lo que corresponda. */
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
      const { url, cuerpo, aviso } = respuesta(p, aprobar);
      const res = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo)
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      // Sale de la bandeja en el acto; la recarga trae el resto al día.
      setListas((l) => [...l, p.clave]);
      setRechazando('');
      avisar(aviso, aprobar ? 'ok' : 'atencion');
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
        Cada una espera tu respuesta: mientras tanto, no cambia nada.
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibles.map((p) => {
          const ocupado = guardando === p.clave;
          return (
            <li key={p.clave} className="flex flex-col rounded-xl border-2 border-hueso/15 bg-panel p-4">
              {/* Quién pide qué, en una frase. */}
              <p className="text-[17px] leading-snug">
                {p.tipo === 'descuento' && <><b>{p.pide}</b> pide un <Cifra>{p.porcentaje}%</Cifra> de descuento</>}
                {p.tipo === 'cupo' && <><b>{p.pide}</b> pide subir el cupo a <Cifra>{p.cupoPedido}</Cifra></>}
                {p.tipo === 'sobrecupo' && <>Hay <Cifra>{p.exceso}</Cifra> {p.exceso === 1 ? 'persona' : 'personas'} sobre el cupo</>}
              </p>
              {/* Para qué. */}
              <p className="mt-2 text-[15px]">
                {p.tipo === 'descuento' && <>para <b>{p.nombre}</b> · {p.personas} {p.personas === 1 ? 'persona' : 'personas'}</>}
                {p.tipo === 'cupo' && <>hoy es <b>{p.cupoActual}</b> · ya reservaron <b>{p.tomadas}</b></>}
                {p.tipo === 'sobrecupo' && <>reservaron <b>{p.tomadas}</b> con cupo <b>{p.cupoActual}</b>: entraron
                  pagos sobre reservas sin pagar</>}
              </p>
              <p className="text-[14px] text-hueso/70">
                <span className="inline-block first-letter:uppercase">{enPalabras(p.fecha)}</span>
                {p.fecha === hoy() && <span className="ml-2 rounded-full border border-oro/60 px-2 text-[13px] font-semibold text-oro">hoy</span>}
                {p.cuando && <> · lo pidió a las {p.cuando.slice(11) || p.cuando}</>}
              </p>
              {(p.motivo || p.comentario) && (
                <p className="mt-2 rounded-lg border border-hueso/15 bg-hueso/[0.04] px-3 py-2 text-[14px]">
                  {p.motivo && <b>{p.motivo}</b>}{p.motivo && p.comentario && ' · '}
                  {p.comentario && <span className="text-hueso/80">“{p.comentario}”</span>}
                </p>
              )}
              {p.tipo === 'sobrecupo' && !p.alcanza && (
                <p className="mt-2 text-[14px] text-ambar-texto">
                  {p.ampliarA > p.cupoActual
                    ? `${p.ampliarA} es el máximo del recinto: igual sobran ${p.tomadas - p.ampliarA}, así que habrá que soltar a alguien.`
                    : 'El cupo ya está en el máximo del recinto: hay que soltar una reserva sin pagar.'}
                </p>
              )}

              {rechazando === p.clave ? (
                <div className="mt-3 rounded-lg border-2 border-rojo-fuerte/50 bg-rojo/10 p-3">
                  <p className="text-[15px] font-semibold text-rojo-texto">
                    {p.tipo === 'descuento'
                      ? `¿Rechazar el ${p.porcentaje}%? Se cobra sin descuento, y avísale a ${p.pide}.`
                      : `¿Rechazar? El cupo queda en ${p.tipo === 'cupo' ? p.cupoActual : ''}, y avísale a ${p.pide}.`}
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
                  {(p.tipo !== 'sobrecupo' || p.ampliarA > p.cupoActual) && (
                    <button type="button" disabled={ocupado}
                      className="boton min-h-[52px] !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta"
                      onClick={() => void responder(p, true)}>
                      {ocupado ? 'Guardando…'
                        : p.tipo === 'descuento' ? `✓ Aprobar ${p.porcentaje}%`
                        : p.tipo === 'cupo' ? `✓ Subir a ${p.cupoPedido}`
                        : `✓ Ampliar a ${p.ampliarA}`}
                    </button>
                  )}
                  {p.tipo === 'sobrecupo' ? (
                    <a href={`/dia/${p.fecha}#sobrecupo`}
                      className="tecla boton min-h-[52px] justify-center !text-[16px] !font-semibold">
                      Soltar una reserva →
                    </a>
                  ) : (
                    <button type="button" disabled={ocupado}
                      className="boton min-h-[52px] !border-rojo-fuerte/60 !text-[16px] !font-semibold text-rojo-texto"
                      onClick={() => setRechazando(p.clave)}>
                      ✕ Rechazar
                    </button>
                  )}
                </div>
              )}
              {p.tipo === 'descuento' && verReserva
                ? <button type="button" className="boton mt-2 self-start" onClick={() => verReserva(p)}>Ver la reserva →</button>
                : p.tipo !== 'sobrecupo' && <a href={`/dia/${p.fecha}`} className="tecla boton mt-2 self-start">Ver el día →</a>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
