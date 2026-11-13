'use client';
/**
 * **Liberar el día para un evento exclusivo** (2026-11-12, segunda entrega;
 * ver `lib/exclusivo.ts`). Aparece en la página del día cuando una
 * cotización exclusiva de ese día tiene su pedido **aprobado** y todavía no
 * se gana, y mientras quede alguna devolución por hacer.
 *
 * Una tarjeta por reserva que sigue ocupando el día, con tres pasos:
 *
 * 1. **Avisarle**: WhatsApp con las disculpas y las dos salidas
 *    (`mensajeLiberacion()`: devolución completa, u otra fecha con un pisco
 *    sour de regalo), y *✓ Ya le avisé*, que lo deja escrito.
 * 2. **Lo que eligió**: *↺ Cambiar de fecha* (crea la reserva en el día
 *    nuevo, con la nota del regalo) o *✕ Cancelar y devolver*.
 * 3. **La devolución**: si pagó, queda en *Devoluciones por hacer* hasta que
 *    alguien marque *✓ Devolución hecha*. Las de Shopify se reembolsan allá.
 *
 * Avisar lo hace quien maneja los días (`dias`); cambiar, cancelar y
 * devolver, quien decide la exclusividad (`exclusividad`). **Lo que mueve
 * plata o un lugar pregunta antes**, en la misma tarjeta.
 */
import { useState } from 'react';
import { avisar } from './AvisoFlotante';
import PastillaPago from './PastillaPago';
import type { Reserva } from '@/lib/tipos';
import type { Presupuesto } from '@/lib/presupuestos';
import { folioDe } from '@/lib/presupuestos';
import { grupoDe } from '@/lib/cotizar';
import { ocupaLugar, enPesos } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';
import { enlaceWhatsApp } from '@/lib/contacto';
import BotonWhatsApp, { usarFirmaWhatsApp } from './BotonWhatsApp';
import {
  exclusividadDe, liberacionDe, mensajeLiberacion, montoADevolver, esDeShopify
} from '@/lib/exclusivo';

/** Abre WhatsApp como en la cotización: `window.open` y, si se bloquea, en la misma pestaña. */

export default function BloqueLiberar({ fecha, reservas, cotizacion, deCotizacion, puedeAvisar, puedeDecidir, onCambio }: {
  fecha: string;
  reservas: Reserva[];
  /** La cotización exclusiva aprobada de este día, si la hay. */
  cotizacion?: Presupuesto;
  /** Id de reserva → id de la cotización de la que viene. */
  deCotizacion: Record<string, string>;
  puedeAvisar: boolean;
  puedeDecidir: boolean;
  onCambio: () => void;
}) {
  const [guardando, setGuardando] = useState('');
  const firma = usarFirmaWhatsApp();
  /** La tarjeta con una pregunta abierta: qué se va a hacer y con qué reserva. */
  const [preguntando, setPreguntando] = useState<{ fila: number; que: 'cancelar' | 'reagendar' | 'devuelta' } | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');

  const pendientes = cotizacion ? reservas.filter((r) => ocupaLugar(r)) : [];
  const resueltas = reservas.filter((r) => ['cancelada', 'devuelta', 'reagendada'].includes(liberacionDe(r.liberacion).estado));
  const porDevolver = resueltas.filter((r) => liberacionDe(r.liberacion).estado === 'cancelada' && montoADevolver(r) > 0);
  if (!cotizacion && !porDevolver.length) return null;

  const avisadas = pendientes.filter((r) => liberacionDe(r.liberacion).estado === 'avisada').length;
  const decision = exclusividadDe(cotizacion?.exclusividad);
  const folio = cotizacion ? folioDe({ id: grupoDe(cotizacion) }) : '';
  const dia = enPalabras(fecha);

  async function hacer(r: Reserva, accion: 'avisar' | 'cancelar' | 'reagendar' | 'devuelta', extra: object = {}) {
    setGuardando(`${r.fila}-${accion}`);
    try {
      const res = await fetch('/api/reservas/exclusivo', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fila: r.fila, accion, ...extra })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      setPreguntando(null); setNuevaFecha('');
      avisar(accion === 'avisar' ? `${r.nombre}: avisada`
        : accion === 'cancelar' ? (d.devolver > 0 ? `${r.nombre}: cancelada. Falta devolverle ${enPesos(d.devolver)}` : `${r.nombre}: cancelada`)
        : accion === 'reagendar' ? `${r.nombre}: cambiada al ${enPalabras(String((extra as { fecha?: string }).fecha))}`
        : `${r.nombre}: devolución hecha`);
      onCambio();
    } finally {
      setGuardando('');
    }
  }

  const ocupado = (r: Reserva) => guardando.startsWith(`${r.fila}-`);

  return (
    <section id="liberar" aria-label="Liberar el día para un evento exclusivo"
      className="mb-5 rounded-2xl border-2 border-morado-fuerte/70 bg-morado/[0.08] p-3 sm:p-4">
      {cotizacion && (
        <>
          <h2 className="text-[19px] font-bold text-morado-texto">🟣 Liberando el día para un evento exclusivo</h2>
          <p className="mt-1 text-[15px]">
            Cotización N° {folio} · <b>{cotizacion.cliente || 'sin nombre'}</b>
            {decision.quien && <> · aprobó <b>{decision.quien}</b></>}
            {decision.nota && <span className="text-hueso/75"> · {decision.nota}</span>}
          </p>
          {pendientes.length ? (
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-[15px]">
              <span className="rounded-lg border-2 border-ambar-fuerte/70 bg-ambar/15 px-2 text-[20px] font-bold text-ambar-texto">
                {pendientes.length}
              </span>
              {pendientes.length === 1 ? 'reserva sigue en el día' : 'reservas siguen en el día'}
              {' · '}{avisadas} {avisadas === 1 ? 'avisada' : 'avisadas'}
            </p>
          ) : (
            <div className="mt-3 rounded-xl border-2 border-verde-fuerte/70 bg-verde/10 p-3">
              <p className="text-[17px] font-bold text-verde-texto">✓ El día quedó libre</p>
              <p className="mt-1 text-[15px]">Ya se puede marcar ganada la cotización: el día queda exclusivo.</p>
              <a href={`/presupuestos?abrir=${encodeURIComponent(cotizacion.id)}`}
                className="tecla boton boton-relleno mt-2 min-h-[48px]">Abrir la cotización N° {folio} →</a>
            </div>
          )}
          <p className="mt-2 text-[14px] text-hueso/75">
            A cada una: avísale con disculpas y ofrécele la devolución completa u otra fecha con un pisco
            sour de regalo. Después anota lo que eligió.
          </p>
        </>
      )}

      {pendientes.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {pendientes.map((r) => {
            const lib = liberacionDe(r.liberacion);
            const idCot = deCotizacion[r.id];
            const devolver = montoADevolver(r);
            const wa = enlaceWhatsApp(r.telefono, mensajeLiberacion(r.nombre, dia, firma));
            const pregunta = preguntando?.fila === r.fila ? preguntando.que : null;
            return (
              <li key={r.fila} className="flex flex-col rounded-xl border-2 border-hueso/15 bg-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[17px] font-bold">{r.nombre || 'Sin nombre'}</p>
                    <p className="text-[14px] text-hueso/75">{r.personas} {r.personas === 1 ? 'persona' : 'personas'}{r.menu ? ` · ${r.menu}` : ''}</p>
                  </div>
                  <PastillaPago r={r} deCotizacion={!!idCot} />
                </div>
                <p className={`mt-2 text-[14px] font-semibold ${lib.estado === 'avisada' ? 'text-verde-texto' : 'text-ambar-texto'}`}>
                  {lib.estado === 'avisada' ? `✓ Avisada por ${lib.quien} · ${lib.cuando}` : '○ Todavía sin avisar'}
                </p>

                {idCot ? (
                  <a href={`/presupuestos?abrir=${encodeURIComponent(idCot)}`} className="tecla boton mt-3 min-h-[44px] w-full justify-center !whitespace-normal text-center">
                    Viene de una cotización: se mueve desde ahí →
                  </a>
                ) : pregunta === 'cancelar' ? (
                  <div className="mt-3 rounded-lg border-2 border-rojo-fuerte/50 bg-rojo/10 p-3">
                    <p className="text-[15px] font-semibold text-rojo-texto">
                      ¿Cancelar la reserva de {r.nombre}? Deja su lugar en el día
                      {devolver > 0 ? ` y queda por devolverle ${enPesos(devolver)}.` : '. No pagó nada, así que no hay devolución.'}
                    </p>
                    {esDeShopify(r.id) && (
                      <p className="mt-1 text-[14px]">
                        Es de Shopify: cancela también el pedido N° {r.id} allá{devolver > 0 ? ' y haz el reembolso' : ''}. El panel no puede.
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={ocupado(r)} onClick={() => void hacer(r, 'cancelar')}
                        className="boton min-h-[44px] !border-rojo-fuerte bg-rojo-fuerte !text-[15px] !font-bold text-tinta disabled:opacity-50">
                        {ocupado(r) ? 'Guardando…' : 'Sí, cancelar'}
                      </button>
                      <button type="button" className="boton min-h-[44px]" onClick={() => setPreguntando(null)}>No, volver</button>
                    </div>
                  </div>
                ) : pregunta === 'reagendar' ? (
                  <div className="mt-3 rounded-lg border-2 border-cielo-fuerte/60 bg-cielo/10 p-3">
                    <label className="block text-[15px] font-semibold">
                      ¿A qué día se cambia?
                      <input type="date" min={hoy()} value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)}
                        className="mt-1 block min-h-[44px] w-full rounded border border-hueso/25 bg-tinta px-3 text-[16px]" />
                    </label>
                    {nuevaFecha && (
                      <p className="mt-2 text-[14px]">
                        Se anota en el {enPalabras(nuevaFecha)} con sus {r.personas} personas, su pago y la nota del pisco
                        sour de regalo, y deja su lugar acá.
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={!nuevaFecha || ocupado(r)}
                        onClick={() => void hacer(r, 'reagendar', { fecha: nuevaFecha })}
                        className="boton min-h-[44px] !border-cielo-fuerte bg-cielo-fuerte !text-[15px] !font-bold text-tinta disabled:opacity-50">
                        {ocupado(r) ? 'Guardando…' : 'Sí, cambiar de fecha'}
                      </button>
                      <button type="button" className="boton min-h-[44px]" onClick={() => { setPreguntando(null); setNuevaFecha(''); }}>
                        No, volver
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {wa ? (
                      <BotonWhatsApp enlace={wa}>💬 Avisarle por WhatsApp</BotonWhatsApp>
                    ) : (
                      <span className="text-[14px] text-ambar-texto">Sin celular anotado: avísale por otro medio.</span>
                    )}
                    {puedeAvisar && lib.estado !== 'avisada' && (
                      <button type="button" disabled={ocupado(r)} onClick={() => void hacer(r, 'avisar')}
                        className="boton min-h-[44px]">✓ Ya le avisé</button>
                    )}
                    {puedeDecidir && (
                      <>
                        <button type="button" onClick={() => { setPreguntando({ fila: r.fila, que: 'reagendar' }); setNuevaFecha(''); }}
                          className="boton min-h-[44px] !border-cielo-fuerte/70 text-cielo-texto">↺ Cambiar de fecha</button>
                        <button type="button" onClick={() => setPreguntando({ fila: r.fila, que: 'cancelar' })}
                          className="boton min-h-[44px] !border-rojo-fuerte/60 text-rojo-texto">
                          ✕ Cancelar{devolver > 0 ? ` y devolver ${enPesos(devolver)}` : ''}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {porDevolver.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-ambar-fuerte/70 bg-ambar/10 p-3">
          <h3 className="text-[17px] font-bold text-ambar-texto">💸 Devoluciones por hacer</h3>
          <ul className="mt-2 space-y-2">
            {porDevolver.map((r) => {
              const devolver = montoADevolver(r);
              return (
                <li key={r.fila} className="rounded-lg border border-hueso/15 bg-panel p-3">
                  <p className="text-[15px]">
                    <b>{enPesos(devolver)}</b> a <b>{r.nombre}</b>
                    {esDeShopify(r.id)
                      ? <> · reembólsalo en Shopify, pedido N° {r.id} (Pedidos → el pedido → Reembolsar)</>
                      : <> · {r.notaPago ? `pagó: ${r.notaPago}` : 'por transferencia'}</>}
                  </p>
                  {puedeDecidir && (preguntando?.fila === r.fila && preguntando.que === 'devuelta' ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold">¿Ya le devolviste {enPesos(devolver)}?</span>
                      <button type="button" disabled={ocupado(r)} onClick={() => void hacer(r, 'devuelta')}
                        className="boton min-h-[44px] !border-verde-fuerte bg-verde-fuerte !font-bold text-tinta disabled:opacity-50">
                        {ocupado(r) ? 'Guardando…' : 'Sí, ya se devolvió'}
                      </button>
                      <button type="button" className="boton min-h-[44px]" onClick={() => setPreguntando(null)}>No, volver</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setPreguntando({ fila: r.fila, que: 'devuelta' })}
                      className="boton mt-2 min-h-[44px] !border-verde-fuerte/60 text-verde-texto">✓ Devolución hecha</button>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {cotizacion && resueltas.length > 0 && (
        <details className="mt-3">
          <summary className="tecla boton min-h-[44px] cursor-pointer">Ya resueltas ({resueltas.length})</summary>
          <ul className="mt-2 space-y-1 text-[14px]">
            {resueltas.map((r) => {
              const lib = liberacionDe(r.liberacion);
              return (
                <li key={r.fila}>
                  <b>{r.nombre}</b> · {r.personas} personas · {lib.estado === 'reagendada'
                    ? `cambiada ${lib.nota.replace(/^al (\d{4}-\d{2}-\d{2})$/, (_, f) => `al ${enPalabras(f)}`)}`
                    : lib.estado === 'devuelta' ? 'cancelada y devuelta'
                    : montoADevolver(r) > 0 ? 'cancelada, falta la devolución' : 'cancelada, sin pago'} · {lib.quien}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
