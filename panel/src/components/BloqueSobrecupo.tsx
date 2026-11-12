'use client';
/**
 * **El sobrecupo de un día, y la decisión** (2026-11-12, la regla del
 * cliente: una reserva sin pagar queda sujeta a espacio, y quien paga tiene
 * preferencia).
 *
 * Aparece en la página del día solo cuando el día se pasó de su cupo. Ofrece
 * las dos salidas, cada una con lo que pasa:
 *
 * - **Ampliar el cupo** hasta que quepan todos, sin pasar de la capacidad
 *   máxima del recinto (`/api/fechas/ampliar`). Después hay que mirar el
 *   equipo: con más gente hacen falta más personas.
 * - **Soltar** una reserva sin pagar (`/api/reservas/soltar`) y avisarle al
 *   cliente por WhatsApp con el mensaje ya escrito (`mensajeCaida()`).
 *
 * Sugiere a quién soltar —las más nuevas, hasta cubrir el exceso— pero no
 * decide: eso es de quien mira el día. Una reserva que viene de una
 * cotización no se suelta acá: se cancela desde su cotización.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { avisar } from './AvisoFlotante';
import type { Reserva } from '@/lib/tipos';
import { enRiesgo, sugerirSoltar, cupoAmpliado, mensajeCaida } from '@/lib/sobrecupo';
import { puedeTocarReserva, type Rol } from '@/lib/auth';
import { enPalabras } from '@/lib/fechas';
import { enlaceWhatsApp } from '@/lib/contacto';
import { folioDe } from '@/lib/presupuestos';

export interface CupoDelDia {
  fecha: string;
  capacidad: number;
  tomadas: number;
  sobrecupo: number;
}

const MOTIVO = 'El día se llenó con reservas pagadas';

/** El botón que abre WhatsApp con el aviso para el cliente, o nada si no hay teléfono. */
export function AvisarCaida({ r }: { r: Pick<Reserva, 'nombre' | 'telefono' | 'fecha'> }) {
  const href = enlaceWhatsApp(r.telefono, mensajeCaida(r.nombre, enPalabras(r.fecha)));
  if (!href) {
    return <span className="text-[13px] text-ambar-texto">Sin celular anotado: avísale por otro medio.</span>;
  }
  return (
    // Como `abrirFuera()` de la cotización: `window.open` y, si el navegador
    // lo bloquea —no avisa—, en la misma pestaña.
    <a href={href} target="_blank" rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        const w = window.open(href, '_blank');
        if (w) { try { w.opener = null; } catch { /* da igual */ } } else window.location.href = href;
      }}
      className="tecla boton border-verde-fuerte/60 text-verde-texto">
      Avisarle por WhatsApp
    </a>
  );
}

export default function BloqueSobrecupo({ dia, reservas, capacidadMaxima, rol, usuario, conDias,
  deCotizacion, onCambio }: {
  dia: CupoDelDia;
  reservas: Reserva[];
  capacidadMaxima: number;
  rol: string;
  usuario: string;
  /** Si esta cuenta puede cambiar el cupo de un día (permiso `dias`). */
  conDias: boolean;
  /** Qué reservas vienen de una cotización: id de reserva → id de cotización. */
  deCotizacion: Record<string, string>;
  onCambio: () => void;
}) {
  const [soltando, setSoltando] = useState<Reserva | null>(null);
  const [motivo, setMotivo] = useState(MOTIVO);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  /** La que se acaba de soltar: queda abierta la ventana para avisarle. */
  const [soltada, setSoltada] = useState<{ r: Reserva; deShopify: boolean } | null>(null);

  const riesgo = enRiesgo(reservas, dia.fecha);
  const sugeridas = sugerirSoltar(riesgo, dia.sobrecupo);
  const ampliar = cupoAmpliado(dia.tomadas, capacidadMaxima);
  const puedeAmpliar = conDias && ampliar.cupo > dia.capacidad;

  async function ampliarCupo() {
    if (!confirm(`¿Subir el cupo del ${enPalabras(dia.fecha)} de ${dia.capacidad} a ${ampliar.cupo}? `
      + 'Recuerda revisar el equipo: con más gente hacen falta más personas.')) return;
    setOcupado(true); setError('');
    try {
      const r = await fetch('/api/fechas/ampliar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha: dia.fecha })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { setError(d.error || 'No se pudo ampliar el cupo.'); return; }
      avisar(d.alcanza
        ? `Cupo ampliado a ${d.cupo}: caben todos. Revisa el equipo del día.`
        : `Cupo en ${d.cupo}, el máximo del recinto: todavía sobran ${d.faltan}.`, d.alcanza ? 'ok' : 'atencion');
      onCambio();
    } finally { setOcupado(false); }
  }

  async function soltar() {
    if (!soltando) return;
    setOcupado(true); setError('');
    try {
      const r = await fetch('/api/reservas/soltar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fila: soltando.fila, motivo })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { setError(d.error || 'No se pudo soltar la reserva.'); return; }
      setSoltada({ r: soltando, deShopify: !!d.deShopify });
      setSoltando(null);
      onCambio();
    } finally { setOcupado(false); }
  }

  return (
    <section id="sobrecupo" className="mt-6 rounded-xl border-2 border-rojo-fuerte/70 bg-rojo/5 p-4">
      <h2 className="text-[17px] font-bold text-rojo-texto">
        ⚠ Sobrecupo: {dia.sobrecupo} {dia.sobrecupo === 1 ? 'persona' : 'personas'} sobre el cupo
        <span className="font-semibold"> ({dia.tomadas} de {dia.capacidad})</span>
      </h2>
      <p className="mt-1 text-[15px] text-hueso/85">
        Entraron reservas pagadas sobre reservas sin pagar. Quien paga tiene preferencia, así que ya
        están adentro. Decide: amplías el cupo y traes más equipo, o sueltas una reserva sin pagar y le
        avisas al cliente.
      </p>

      {conDias && (
        <div className="mt-3 rounded-lg border border-hueso/15 bg-panel p-3">
          {puedeAmpliar ? (
            <>
              <button type="button" disabled={ocupado} onClick={() => void ampliarCupo()}
                className="boton boton-relleno min-h-[48px] text-[15px]">
                Ampliar el cupo a {ampliar.cupo}
              </button>
              <p className="mt-1 text-[13px] text-hueso/70">
                {ampliar.alcanza
                  ? 'Caben todos. Después revisa el equipo del día.'
                  : `Es la capacidad máxima del recinto (${capacidadMaxima}): igual sobran `
                    + `${dia.tomadas - ampliar.cupo}, así que habrá que soltar a alguien.`}
              </p>
            </>
          ) : (
            <p className="text-[14px] text-hueso/80">
              El cupo ya está en la capacidad máxima del recinto ({capacidadMaxima}): hay que soltar una
              reserva sin pagar.
            </p>
          )}
        </div>
      )}

      <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
        Reservas sin pagar de este día
      </h3>
      {riesgo.length === 0 && (
        <p className="mt-1 text-[14px] text-hueso/75">No quedan reservas sin pagar: solo queda ampliar el cupo.</p>
      )}
      <ul className="mt-2 space-y-2">
        {riesgo.map((r) => {
          const cot = deCotizacion[r.id];
          const mia = puedeTocarReserva(rol as Rol, usuario, r.anotadaPor);
          return (
            <li key={r.id} className={`rounded-lg border bg-panel p-3 ${sugeridas.has(r.id)
              ? 'border-2 border-rojo-fuerte/60' : 'border-hueso/15'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[16px] font-bold">{r.nombre || 'Sin nombre'}</span>
                <span className="text-[15px]"><strong>{r.personas}</strong> personas</span>
                {sugeridas.has(r.id) && (
                  <span className="rounded-full border border-rojo-fuerte/60 px-2 py-0.5 text-[13px] font-semibold
                                   text-rojo-texto">sugerida: es de las últimas en llegar</span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-hueso/70">
                {/^\d+$/.test(r.id) ? 'Shopify · Solo reserva' : cot ? `Cotización N° ${folioDe({ id: cot })}` : 'Anotada a mano'}
                {r.anotadaPor ? ` · la anotó ${r.anotadaPor}` : ''}
                {r.creada ? ` · el ${String(r.creada).slice(0, 10)}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {cot ? (
                  <a href={`/presupuestos?abrir=${encodeURIComponent(cot)}`} className="tecla boton">
                    Abrir la cotización para cancelarla
                  </a>
                ) : mia ? (
                  <button type="button" disabled={ocupado} onClick={() => { setSoltando(r); setMotivo(MOTIVO); setError(''); }}
                    className="boton border-rojo-fuerte/60 text-rojo-texto">
                    Soltar esta reserva
                  </button>
                ) : (
                  <span className="text-[13px] text-hueso/70">
                    {r.anotadaPor ? `La anotó ${r.anotadaPor}: es quien la suelta.` : 'Solo el encargado la puede soltar.'}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && !soltando && <p role="alert" className="mt-2 text-[15px] font-semibold text-rojo-texto">{error}</p>}

      {soltando && (
        <Dialogo titulo="Soltar la reserva" onCerrar={() => setSoltando(null)}>
          <p className="mt-3 text-[16px]">
            La reserva de <strong>{soltando.nombre || 'sin nombre'}</strong> ({soltando.personas} personas) para
            el {enPalabras(soltando.fecha)} deja de ocupar su lugar. Queda marcada <strong>Se cayó por cupo</strong>,
            con tu nombre, y después le avisas al cliente.
          </p>
          {/^\d+$/.test(soltando.id) && (
            <p className="mt-2 rounded-lg border border-ambar/60 bg-ambar/10 p-2 text-[14px] text-ambar-texto">
              Es una reserva de Shopify: cancela también el pedido en la tienda, que el panel no lo hace solo.
            </p>
          )}
          <label className="mt-3 block">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">Por qué</span>
            <input className="mt-1 w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px]
                              focus:border-oro focus:outline-none"
              value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
          {error && <p role="alert" className="mt-2 text-[15px] font-semibold text-rojo-texto">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="boton min-h-[48px]" onClick={() => setSoltando(null)}>Volver</button>
            <button type="button" disabled={ocupado || !motivo.trim()} onClick={() => void soltar()}
              className="boton boton-hito border-rojo-fuerte bg-rojo-fuerte text-white">
              {ocupado ? 'Soltando…' : 'Sí, soltar la reserva'}
            </button>
          </div>
        </Dialogo>
      )}

      {soltada && (
        <Dialogo titulo="Avísale al cliente" onCerrar={() => setSoltada(null)}>
          <p className="mt-3 text-[16px]">
            La reserva de <strong>{soltada.r.nombre || 'sin nombre'}</strong> se soltó. Ahora avísale: el mensaje
            ya va escrito.
          </p>
          <p className="mt-2 rounded-lg border border-hueso/15 bg-panel p-3 text-[14px] text-hueso/85">
            {mensajeCaida(soltada.r.nombre, enPalabras(soltada.r.fecha))}
          </p>
          {soltada.deShopify && (
            <p className="mt-2 rounded-lg border border-ambar/60 bg-ambar/10 p-2 text-[14px] text-ambar-texto">
              No olvides cancelar el pedido en Shopify.
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="boton min-h-[48px]" onClick={() => setSoltada(null)}>Listo</button>
            <AvisarCaida r={soltada.r} />
          </div>
        </Dialogo>
      )}
    </section>
  );
}
