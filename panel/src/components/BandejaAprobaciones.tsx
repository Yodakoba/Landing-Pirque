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
 * - **Liberar un día para un evento exclusivo** (2026-11-12): solo a quien
 *   tiene `exclusividad`. Además de aprobar o rechazar, *Dejar de vender
 *   este día* mientras se decide. Aprobar fuera de plazo pide motivo.
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
function respuesta(p: Pendiente, aprobar: boolean, motivo = ''): { url: string; cuerpo: object; aviso: string } {
  if (p.tipo === 'exclusivo') {
    return { url: '/api/presupuestos/exclusivo', cuerpo: { id: p.id, accion: aprobar ? 'aprobar' : 'rechazar', motivo },
      aviso: aprobar ? `Aprobado: el ${enPalabras(p.fecha)} deja de venderse. Falta avisarles a las ${p.reservas} reservas.`
        : `Rechazado: avísale a ${p.pide}` };
  }
  if (p.tipo === 'descuento') {
    return { url: '/api/reservas/aprobar', cuerpo: { fila: p.fila, aprobar },
      aviso: aprobar ? `Aprobado: ${p.porcentaje}% para ${p.nombre}` : `Rechazado: el ${p.porcentaje}% de ${p.nombre}` };
  }
  if (p.tipo === 'cupo') {
    return { url: '/api/fechas/cupo', cuerpo: { fecha: p.fecha, accion: aprobar ? 'aprobar' : 'rechazar' },
      aviso: aprobar ? `Cupo subido a ${p.cupoPedido}. Revisa el equipo del día.` : `Rechazado: el cupo queda en ${p.cupoActual}` };
  }
  return { url: '/api/fechas/ampliar', cuerpo: { fecha: p.fecha },
    aviso: p.tipo !== 'sobrecupo' ? '' : p.alcanza ? `Cupo ampliado a ${p.ampliarA}: caben todos. Revisa el equipo del día.`
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
  /** Un pedido de exclusivo que se está por aprobar: pregunta, y a veces pide motivo. */
  const [aprobando, setAprobando] = useState('');
  const [motivo, setMotivo] = useState('');
  const [listas, setListas] = useState<string[]>([]);
  const visibles = pendientes.filter((p) => !listas.includes(p.clave));
  if (!visibles.length) return null;

  async function responder(p: Pendiente, aprobar: boolean) {
    setGuardando(p.clave);
    try {
      const { url, cuerpo, aviso } = respuesta(p, aprobar, motivo.trim());
      const res = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo)
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      // Sale de la bandeja en el acto; la recarga trae el resto al día.
      setListas((l) => [...l, p.clave]);
      setRechazando(''); setAprobando(''); setMotivo('');
      avisar(aviso, aprobar ? 'ok' : 'atencion');
      onCambio();
    } finally {
      setGuardando('');
    }
  }

  /** Dejar de vender el día mientras se decide: pregunta, porque cierra el día al sitio. */
  async function pausar(p: Pendiente) {
    if (p.tipo !== 'exclusivo') return;
    if (!confirm(`¿Dejar de vender el ${enPalabras(p.fecha)}? El sitio deja de ofrecerlo mientras decides. `
      + 'Las reservas que ya tiene siguen igual.')) return;
    setGuardando(p.clave);
    try {
      const res = await fetch('/api/presupuestos/exclusivo', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, accion: 'pausar' })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(`El ${enPalabras(p.fecha)} ya no se vende`);
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
                {p.tipo === 'exclusivo' && <><b>{p.pide}</b> pide liberar el día para un{' '}
                  <span className="inline-block rounded-lg border-2 border-morado-fuerte/70 bg-morado/15 px-2
                                   text-[20px] font-bold text-morado-texto">🟣 evento exclusivo</span></>}
              </p>
              {/* Para qué. */}
              <p className="mt-2 text-[15px]">
                {p.tipo === 'descuento' && <>para <b>{p.nombre}</b> · {p.personas} {p.personas === 1 ? 'persona' : 'personas'}</>}
                {p.tipo === 'cupo' && <>hoy es <b>{p.cupoActual}</b> · ya reservaron <b>{p.tomadas}</b></>}
                {p.tipo === 'sobrecupo' && <>reservaron <b>{p.tomadas}</b> con cupo <b>{p.cupoActual}</b>: entraron
                  pagos sobre reservas sin pagar</>}
                {p.tipo === 'exclusivo' && <>Cotización N° {p.folio} · <b>{p.cliente}</b>
                  {p.invitados > 0 && <> · {p.invitados} invitados</>}<br />
                  ese día hay que mover <b>{p.reservas} {p.reservas === 1 ? 'reserva' : 'reservas'}</b> ·{' '}
                  <b>{p.personas}</b> {p.personas === 1 ? 'persona' : 'personas'}</>}
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
              {p.tipo === 'exclusivo' && (
                <p className={`mt-2 text-[14px] ${p.enPlazo ? 'text-hueso/75' : 'font-semibold text-ambar-texto'}`}>
                  {p.enPlazo
                    ? `Faltan ${p.faltan} días: dentro del plazo de ${p.diasMinimos}.`
                    : `Caso especial: faltan ${p.faltan} ${p.faltan === 1 ? 'día' : 'días'}, menos de ${p.diasMinimos}. Para aprobar, escribe el motivo.`}
                </p>
              )}
              {p.tipo === 'exclusivo' && (p.pausado ? (
                <p className="mt-2 rounded-lg border-2 border-dashed border-morado-fuerte/60 px-3 py-2 text-[14px] font-semibold">
                  ⏸ Este día ya no se vende mientras decides.
                </p>
              ) : rechazando !== p.clave && aprobando !== p.clave && (
                <button type="button" disabled={ocupado} onClick={() => void pausar(p)}
                  className="boton mt-3 min-h-[48px] w-full justify-center !whitespace-normal text-center !border-morado-fuerte/70 !text-[15px] !font-semibold text-morado-texto">
                  ⏸ Dejar de vender el día
                </button>
              ))}

              {p.tipo === 'exclusivo' && aprobando === p.clave ? (
                <div className="mt-3 rounded-lg border-2 border-verde-fuerte/60 bg-verde/10 p-3">
                  <p className="text-[15px] font-semibold text-verde-texto">
                    ¿Aprobar? El día deja de venderse, y hay que avisarles a las {p.reservas}{' '}
                    {p.reservas === 1 ? 'reserva' : 'reservas'} para devolverles el dinero o cambiarles la fecha.
                  </p>
                  <label className="mt-2 block text-[14px]">
                    {p.enPlazo ? 'Motivo (opcional)' : 'Motivo del caso especial'}
                    <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded border border-hueso/25 bg-tinta px-3 text-[15px]" />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={ocupado || (!p.enPlazo && motivo.trim().length < 5)}
                      className="boton min-h-[44px] !border-verde-fuerte bg-verde-fuerte !text-[15px] !font-bold text-tinta disabled:opacity-50"
                      onClick={() => void responder(p, true)}>
                      {ocupado ? 'Guardando…' : 'Sí, aprobar y liberar'}
                    </button>
                    <button type="button" className="boton min-h-[44px]" onClick={() => { setAprobando(''); setMotivo(''); }}>
                      No, volver
                    </button>
                  </div>
                </div>
              ) : rechazando === p.clave ? (
                <div className="mt-3 rounded-lg border-2 border-rojo-fuerte/50 bg-rojo/10 p-3">
                  <p className="text-[15px] font-semibold text-rojo-texto">
                    {p.tipo === 'exclusivo'
                      ? `¿Rechazar? La cotización no se puede ganar como exclusiva${p.pausado ? ' y el día vuelve a venderse' : ''}. ${p.pide} ve el motivo.`
                      : p.tipo === 'descuento'
                      ? `¿Rechazar el ${p.porcentaje}%? Se cobra sin descuento, y avísale a ${p.pide}.`
                      : `¿Rechazar? El cupo queda en ${p.tipo === 'cupo' ? p.cupoActual : ''}, y avísale a ${p.pide}.`}
                  </p>
                  {p.tipo === 'exclusivo' && (
                    <label className="mt-2 block text-[14px]">
                      Motivo
                      <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded border border-hueso/25 bg-tinta px-3 text-[15px]" />
                    </label>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={ocupado || (p.tipo === 'exclusivo' && motivo.trim().length < 3)}
                      className="boton min-h-[44px] !border-rojo-fuerte bg-rojo-fuerte !text-[15px] !font-bold text-tinta disabled:opacity-50"
                      onClick={() => void responder(p, false)}>
                      {ocupado ? 'Guardando…' : 'Sí, rechazar'}
                    </button>
                    <button type="button" className="boton min-h-[44px]" onClick={() => { setRechazando(''); setMotivo(''); }}>
                      No, volver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(p.tipo !== 'sobrecupo' || p.ampliarA > p.cupoActual) && (
                    <button type="button" disabled={ocupado}
                      className="boton min-h-[52px] !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta"
                      onClick={() => {
                        if (p.tipo === 'exclusivo') { setAprobando(p.clave); setRechazando(''); setMotivo(''); }
                        else void responder(p, true);
                      }}>
                      {ocupado ? 'Guardando…'
                        : p.tipo === 'exclusivo' ? '✓ Aprobar'
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
                      onClick={() => { setRechazando(p.clave); setAprobando(''); setMotivo(''); }}>
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
