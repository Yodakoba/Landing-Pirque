'use client';
/**
 * **La bandeja de aprobaciones** (2026-11-12, lo pidió el cliente): arriba
 * de la portada, para el gerente de operaciones, quien paga y el
 * administrador. Una fila por cosa pendiente (desde el 2026-11-13; antes
 * eran tarjetas grandes), que se resuelve ahí mismo con un toque:
 *
 * - **Un descuento sobre el estándar** que pidió alguien al rectificar.
 * - **Un pedido de más cupo** del encargado (`lib/cupo.ts`).
 * - **Un día sobre su cupo**: un pago entró sobre reservas sin pagar.
 * - **Liberar un día para un evento exclusivo** (2026-11-12): solo a quien
 *   tiene `exclusividad`. Además de aprobar o rechazar, *Dejar de vender
 *   este día* mientras se decide. Aprobar fuera de plazo pide motivo.
 *
 * - **Lo que revisa pagos** (2026-11-13, `plata.ts`; regla *"la plata la
 *   cierra el encargado de pagos"*): un pago de reserva anotado a mano, un
 *   descuento ya aplicado y una cuenta o tarifa cambiada por otro. Solo a
 *   quien tiene `pagar`. No frenan nada —ya rigen—, así que no se rechazan:
 *   **✓ Revisado**, **✓ Visto** o **✓ Confirmar**, y si algo está mal se
 *   corrige en la reserva o en la ficha, que es donde está.
 *
 * Dice quién pide qué en una frase, y debajo para qué día y por qué.
 * **Aprobar es un toque; rechazar pregunta**, porque deja a quien lo pidió
 * esperando una respuesta que hay que darle. Cualquier tipo nuevo de
 * `Pendiente` (`lib/aprobaciones.ts`) se dibuja en esta misma fila.
 */
import { useState } from 'react';
import { DE_PAGOS, type Pendiente } from '@/lib/aprobaciones';
import PastillaPago from './PastillaPago';
import { enPalabras, hoy } from '@/lib/fechas';
import { avisar } from './AvisoFlotante';

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

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
  if (p.tipo === 'pago') {
    return { url: '/api/reservas/revisar', cuerpo: { fila: p.fila, que: 'pago' },
      aviso: `Revisado: el pago de ${p.nombre}` };
  }
  if (p.tipo === 'descuentoVisto') {
    return { url: '/api/reservas/revisar', cuerpo: { fila: p.fila, que: 'descuento' },
      aviso: `Visto: el ${p.porcentaje}% de ${p.nombre}` };
  }
  if (p.tipo === 'cuenta') {
    return { url: '/api/equipo/confirmar', cuerpo: { de: p.de, nombre: p.nombre },
      aviso: `Confirmado: ${p.que} de ${p.nombre}` };
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
  /** La fila abierta: su detalle, y ahí rechazar o el exclusivo. */
  const [detalle, setDetalle] = useState('');
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

  /** El pedido corto, en una línea: quién pide qué, para cuándo. */
  const frase = (p: Pendiente) => {
    const dia = <span className="first-letter:uppercase">{enPalabras(p.fecha)}</span>;
    if (p.tipo === 'descuento') return <><b>{p.pide}</b> pide <b className="text-ambar-texto">{p.porcentaje}%</b> de descuento · {p.nombre} · {dia}</>;
    if (p.tipo === 'cupo') return <><b>{p.pide}</b> pide subir el cupo a <b className="text-ambar-texto">{p.cupoPedido}</b> · {dia}</>;
    if (p.tipo === 'sobrecupo') return <>{dia}: <b className="text-rojo-texto">{p.exceso} {p.exceso === 1 ? 'persona' : 'personas'} sobre el cupo</b> ({p.tomadas} de {p.cupoActual})</>;
    if (p.tipo === 'pago') return <><b>{p.pide}</b> anotó el pago de <b>{p.nombre}</b>{p.monto ? <> · {pesos(p.monto)}</> : null} · {dia}</>;
    if (p.tipo === 'descuentoVisto') return <><b>{p.pide}</b> aplicó <b className="text-ambar-texto">{p.porcentaje}%</b> de descuento · {p.nombre} · {dia}{p.aprobo && <> · lo aprobó {p.aprobo}</>}</>;
    if (p.tipo === 'cuenta') return <><b>{p.pide}</b> cambió <b className="text-ambar-texto">{p.que}</b> de <b>{p.nombre}</b> · {p.de === 'trabajador' ? 'equipo' : 'extras'}</>;
    return <><b>{p.pide}</b> pide liberar {dia} para un <b className="text-morado-texto">🟣 evento exclusivo</b> · {p.cliente}</>;
  };

  return (
    <section aria-label="Por aprobar" className="mb-4 rounded-xl border-2 border-ambar-fuerte/60 bg-ambar/[0.08] p-2 sm:p-3">
      {/* **En filas, no en tarjetas** (2026-11-13, lo pidió el cliente: dos
          tarjetas grandes medían 420px y empujaban el calendario). Cada pedido
          es una línea con su botón principal a la vista; lo que necesita más
          explicación —el exclusivo, el motivo, el plazo— se abre en la fila. */}
      <h2 className="flex flex-wrap items-baseline gap-x-2 px-1 text-[15px] font-bold text-ambar-texto">
        <span aria-hidden>🔔</span>
        {(() => {
          // Lo de pagos se revisa, no se aprueba: el título dice lo que hay.
          const revisar = visibles.filter((p) => DE_PAGOS.has(p.tipo)).length;
          const verbo = revisar === visibles.length ? 'que revisar' : revisar ? 'que aprobar o revisar' : 'que aprobar';
          return visibles.length === 1 ? `1 cosa ${verbo}` : `${visibles.length} cosas ${verbo}`;
        })()}
        <span className="text-[13px] font-normal text-hueso/65"><span aria-hidden className="hidden sm:inline">· </span>mientras no respondas, no cambia nada</span>
      </h2>

      <ul className="mt-2 space-y-1.5">
        {visibles.map((p) => {
          const ocupado = guardando === p.clave;
          const abierto = detalle === p.clave || rechazando === p.clave || aprobando === p.clave;
          const principal = p.tipo === 'exclusivo' ? null : (p.tipo !== 'sobrecupo' || p.ampliarA > p.cupoActual) ? (
            <button type="button" disabled={ocupado}
              className="boton !min-h-[44px] !border-verde-fuerte bg-verde-fuerte !text-[15px] !font-bold text-tinta"
              onClick={() => void responder(p, true)}>
              {ocupado ? 'Guardando…'
                : p.tipo === 'descuento' ? `✓ Aprobar ${p.porcentaje}%`
                : p.tipo === 'cupo' ? `✓ Subir a ${p.cupoPedido}`
                : p.tipo === 'pago' ? '✓ Revisado'
                : p.tipo === 'descuentoVisto' ? '✓ Visto'
                : p.tipo === 'cuenta' ? '✓ Confirmar'
                : `✓ Ampliar a ${p.ampliarA}`}
            </button>
          ) : null;
          return (
            <li key={p.clave} className={`rounded-lg border bg-panel px-3 py-1.5 ${abierto ? 'border-oro/60' : 'border-hueso/15'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="min-w-[14rem] flex-1">
                  <p className="text-[15px] leading-snug">{frase(p)}</p>
                  {/* El pago con la misma pastilla de la reserva (`PastillaPago`). */}
                  {p.tipo === 'pago' && (
                    <div className="mt-1">
                      <PastillaPago sinOrigen r={{ id: 'MANUAL', tipoPago: '', estadoPago: p.estado === 'Abonada' ? 'partially_paid' : 'paid',
                        notaPago: p.nota, abonado: p.abonado }} />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {principal}
                  {p.tipo === 'sobrecupo' && (
                    <a href={`/dia/${p.fecha}#sobrecupo`} className="tecla boton !min-h-[44px] !text-[15px]">Soltar una →</a>
                  )}
                  {p.tipo === 'exclusivo' ? (
                    <button type="button" aria-expanded={abierto}
                      className="boton !min-h-[44px] !border-morado-fuerte/70 !text-[15px] !font-semibold text-morado-texto"
                      onClick={() => { setDetalle(abierto ? '' : p.clave); setRechazando(''); setAprobando(''); setMotivo(''); }}>
                      Ver y decidir {abierto ? '▴' : '▾'}
                    </button>
                  ) : p.tipo !== 'sobrecupo' && (
                    <button type="button" aria-expanded={abierto} aria-label={abierto ? 'Cerrar el detalle' : 'Ver el detalle o rechazar'}
                      className="boton !min-h-[44px] !text-[15px]"
                      onClick={() => { setDetalle(abierto ? '' : p.clave); setRechazando(''); setMotivo(''); }}>
                      {abierto ? '▴' : 'Más ▾'}
                    </button>
                  )}
                </div>
              </div>

              {abierto && (
                <div className="mt-2 space-y-2 border-t border-hueso/10 pt-2">
                  <p className="text-[14px] text-hueso/80">
                    {p.tipo === 'descuento' && <>Para <b>{p.nombre}</b> · {p.personas} {p.personas === 1 ? 'persona' : 'personas'}</>}
                    {p.tipo === 'cupo' && <>Hoy es <b>{p.cupoActual}</b> · ya reservaron <b>{p.tomadas}</b></>}
                    {p.tipo === 'pago' && <>Ya rige: la reserva cuenta como {p.estado.toLowerCase()}. Revísalo contra el banco o la caja; si algo no calza, corrígelo en la reserva</>}
                    {p.tipo === 'descuentoVisto' && <>Para <b>{p.nombre}</b> · {p.personas} {p.personas === 1 ? 'persona' : 'personas'} · ya rige en lo que se cobra</>}
                    {p.tipo === 'cuenta' && <>Ya rige. Antes de transferir, mira la ficha y confirma que los datos están bien</>}
                    {p.tipo === 'exclusivo' && <>Cotización N° {p.folio}{p.invitados > 0 && <> · {p.invitados} invitados</>} · ese día hay que mover{' '}
                      <b>{p.reservas} {p.reservas === 1 ? 'reserva' : 'reservas'}</b> · <b>{p.personas}</b> {p.personas === 1 ? 'persona' : 'personas'}</>}
                    {p.cuando && <> · {DE_PAGOS.has(p.tipo) ? 'lo anotó' : 'lo pidió'} {p.tipo === 'cuenta' ? `el ${enPalabras(p.cuando.slice(0, 10))} a las` : 'a las'} {p.cuando.slice(11) || p.cuando}</>}
                    {p.fecha === hoy() && p.tipo !== 'cuenta' && <span className="ml-2 rounded-full border border-oro/60 px-2 text-[13px] font-semibold text-oro">hoy</span>}
                  </p>
                  {(p.motivo || p.comentario) && (
                    <p className="rounded-lg border border-hueso/15 bg-hueso/[0.04] px-3 py-2 text-[14px]">
                      {p.motivo && <b>{p.motivo}</b>}{p.motivo && p.comentario && ' · '}
                      {p.comentario && <span className="text-hueso/80">“{p.comentario}”</span>}
                    </p>
                  )}
                  {p.tipo === 'exclusivo' && (
                    <p className={`text-[14px] ${p.enPlazo ? 'text-hueso/75' : 'font-semibold text-ambar-texto'}`}>
                      {p.enPlazo
                        ? `Faltan ${p.faltan} días: dentro del plazo de ${p.diasMinimos}.`
                        : `Caso especial: faltan ${p.faltan} ${p.faltan === 1 ? 'día' : 'días'}, menos de ${p.diasMinimos}. Para aprobar, escribe el motivo.`}
                    </p>
                  )}

                  {p.tipo === 'exclusivo' && aprobando === p.clave ? (
                    <div className="rounded-lg border-2 border-verde-fuerte/60 bg-verde/10 p-3">
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
                    <div className="rounded-lg border-2 border-rojo-fuerte/50 bg-rojo/10 p-3">
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
                    <div className="flex flex-wrap gap-2">
                      {p.tipo === 'exclusivo' && (p.pausado ? (
                        <span className="rounded-lg border-2 border-dashed border-morado-fuerte/60 px-3 py-2 text-[14px] font-semibold">
                          ⏸ Este día ya no se vende mientras decides.
                        </span>
                      ) : (
                        <button type="button" disabled={ocupado} onClick={() => void pausar(p)}
                          className="boton min-h-[44px] !border-morado-fuerte/70 !text-[15px] !font-semibold text-morado-texto">
                          ⏸ Dejar de vender el día
                        </button>
                      ))}
                      {p.tipo === 'exclusivo' && (
                        <button type="button" disabled={ocupado}
                          className="boton min-h-[44px] !border-verde-fuerte bg-verde-fuerte !text-[15px] !font-bold text-tinta"
                          onClick={() => { setAprobando(p.clave); setRechazando(''); setMotivo(''); }}>✓ Aprobar</button>
                      )}
                      {/* Lo de pagos ya rige: no se rechaza, se corrige donde está. */}
                      {!DE_PAGOS.has(p.tipo) && (
                        <button type="button" disabled={ocupado}
                          className="boton min-h-[44px] !border-rojo-fuerte/60 !text-[15px] !font-semibold text-rojo-texto"
                          onClick={() => { setRechazando(p.clave); setAprobando(''); setMotivo(''); }}>
                          ✕ Rechazar
                        </button>
                      )}
                      {p.tipo === 'cuenta'
                        ? <a href={p.de === 'trabajador' ? '/equipo' : '/extras'} className="tecla boton min-h-[44px]">Ver la ficha →</a>
                        : (p.tipo === 'descuento' || p.tipo === 'pago' || p.tipo === 'descuentoVisto') && verReserva
                        ? <button type="button" className="boton min-h-[44px]" onClick={() => verReserva(p)}>Ver la reserva →</button>
                        : <a href={`/dia/${p.fecha}`} className="tecla boton min-h-[44px]">Ver el día →</a>}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
