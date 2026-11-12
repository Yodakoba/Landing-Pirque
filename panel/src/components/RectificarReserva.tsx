'use client';
/**
 * **La ventana de rectificar una reserva** (2026-11-12, lo pidió el cliente).
 *
 * El día del servicio, lo que pasó en la mesa: cuántos llegaron, qué se
 * sirvió, un descuento, y **por qué** —obligatorio—. Botones grandes, cuatro
 * preguntas en orden, y abajo cómo queda en Fudo antes de guardar. La lógica
 * vive en `lib/rectificacion.ts` y el servidor la vuelve a comprobar.
 *
 * - **Un descuento que no es estándar queda por aprobar** salvo que quien
 *   rectifica lo pueda aprobar; la ventana lo dice antes de guardar.
 * - **Un cambio grande pide una segunda confirmación**: más de 5 personas de
 *   diferencia o un descuento sobre el tope estándar.
 */
import { useMemo, useState } from 'react';
import Dialogo from './Dialogo';
import IngresoFudo from './IngresoFudo';
import { avisar } from './AvisoFlotante';
import type { Reserva } from '@/lib/tipos';
import { paraReservar, type Menu } from '@/lib/menus';
import { desglosarMenu, componerMenu } from '@/lib/shopify';
import { comoIngresar } from '@/lib/fudo';
import {
  MOTIVOS_RECTIFICACION, LARGO_MINIMO_COMENTARIO, erroresRectificacion, avisosRectificacion,
  esCambioGrande, necesitaAprobacion, personasEfectivas, menuEfectivo, personasDelMenu, estaRectificada,
  marcaRectificacion, POR_APROBAR, marcaAprobacion
} from '@/lib/rectificacion';

const TONO = {
  ambar: 'border-ambar-fuerte/60 bg-ambar/10 text-ambar-texto',
  rojo: 'border-rojo-fuerte/60 bg-rojo/10 text-rojo-texto',
  cielo: 'border-cielo-fuerte/60 bg-cielo/10 text-cielo-texto'
};

const PREGUNTA = 'text-[15px] font-bold';

export default function RectificarReserva({
  r, catalogo, descuentos, puedeAprobar, deCotizacion, quedan, onListo, onCerrar
}: {
  r: Reserva;
  catalogo: Menu[];
  /** Los descuentos estándar de Configuración. */
  descuentos: number[];
  puedeAprobar: boolean;
  deCotizacion: boolean;
  /** Lugares que quedan ese día, para avisar si se pasa del cupo. */
  quedan: number | null;
  onListo: () => void;
  onCerrar: () => void;
}) {
  // Parte de lo ya rectificado; si no, de lo que dijo la recepción; si no, de lo reservado.
  const [personas, setPersonas] = useState<number>(
    estaRectificada(r) ? personasEfectivas(r) : r.personas);
  const [cuenta, setCuenta] = useState<Record<string, number>>(() => {
    const c: Record<string, number> = {};
    for (const p of desglosarMenu(menuEfectivo(r), catalogo)) c[p.menu] = (c[p.menu] ?? 0) + p.cantidad;
    return c;
  });
  const [descuento, setDescuento] = useState<number | null>(r.descuento ?? null);
  const [otro, setOtro] = useState(() =>
    r.descuento && !descuentos.includes(r.descuento) ? String(r.descuento) : '');
  const [motivo, setMotivo] = useState('');
  const [comentario, setComentario] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Los menús que se ofrecen: los del sitio, más los que ya trae la reserva
  // (una cotización puede traer uno que no se vende en el sitio).
  const opciones = useMemo(() => {
    const nombres = paraReservar(catalogo).map((m) => m.nombre);
    for (const m of Object.keys(cuenta)) if (!nombres.includes(m)) nombres.push(m);
    for (const p of desglosarMenu(r.menu, catalogo)) if (!nombres.includes(p.menu)) nombres.push(p.menu);
    return nombres;
  }, [catalogo, cuenta, r.menu]);

  const menu = componerMenu(cuenta);
  const enMenus = personasDelMenu(menu);
  const pedido = { personas, menu, descuento, motivo, comentario };
  const errores = erroresRectificacion(pedido);
  const pagada = String(r.estadoPago).toLowerCase() === 'paid';
  const avisos = avisosRectificacion(r, pedido, { pagada, deCotizacion, quedan, estandar: descuentos, puedeAprobar });
  const grande = esCambioGrande(r, pedido, descuentos);
  const quedaPorAprobar = necesitaAprobacion(descuento, descuentos) && !puedeAprobar;

  // Cómo queda en Fudo, con la misma función que usa el servidor.
  const vista = comoIngresar({
    ...r, personasReales: personas, menuReal: menu, descuento,
    rectificacion: marcaRectificacion('ahora', 'tú', motivo || '…', comentario || '…'),
    aprobacion: necesitaAprobacion(descuento, descuentos)
      ? (puedeAprobar ? marcaAprobacion(true, 'tú', 'ahora') : POR_APROBAR) : ''
  }, catalogo, deCotizacion);

  const mover = (nombre: string, d: number) =>
    setCuenta((c) => ({ ...c, [nombre]: Math.max(0, (c[nombre] ?? 0) + d) }));

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch('/api/reservas/rectificar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fila: r.fila, personas, menu, descuento, motivo, comentario })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); setConfirmando(false); return; }
      avisar(d.porAprobar ? 'Rectificada · el descuento quedó por aprobar' : 'Reserva rectificada',
        d.porAprobar ? 'atencion' : 'ok');
      onListo();
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={`Rectificar · ${r.nombre || 'sin nombre'}`} onCerrar={onCerrar}>
      <p className="mt-2 text-[15px] text-hueso/80">
        Reservó <strong>{r.personas}</strong> {r.personas === 1 ? 'persona' : 'personas'} · {r.menu || 'sin menú'}.
        Anota lo que de verdad pasó en la mesa, para que cuadre con Fudo.
      </p>

      {confirmando ? (
        /* **La segunda confirmación de un cambio grande.** */
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border-2 border-ambar-fuerte/60 bg-ambar/10 p-4">
            <p className="text-[17px] font-bold text-ambar-texto">✋ Es un cambio grande</p>
            <p className="mt-1 text-[15px]">
              {r.personas} → <strong>{personas}</strong> personas
              {descuento ? <> · descuento <strong>{descuento}%</strong></> : null}.
              Queda anotado con tu nombre y lo va a revisar quien paga.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="boton min-h-[44px]" onClick={() => setConfirmando(false)}>
              Volver a revisar
            </button>
            <button type="button" className="boton boton-relleno boton-hito" disabled={guardando}
              onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Sí, guardar la rectificación'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {/* 1 · Cuántos llegaron */}
          <section>
            <p className={PREGUNTA}>1 · ¿Cuántos llegaron?</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Uno menos" className="boton h-12 w-12 justify-center text-[22px]"
                  onClick={() => setPersonas((n) => Math.max(0, n - 1))}>−</button>
                <input type="number" min={0} value={personas} aria-label="Personas que llegaron"
                  onChange={(e) => setPersonas(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                  className="h-12 w-20 rounded-lg border-2 border-hueso/20 bg-tinta text-center text-[22px] font-bold
                             tabular-nums focus:border-oro focus:outline-none" />
                <button type="button" aria-label="Uno más" className="boton h-12 w-12 justify-center text-[22px]"
                  onClick={() => setPersonas((n) => n + 1)}>+</button>
              </div>
              {r.llegaron != null && r.llegaron !== personas && (
                <button type="button" className="boton min-h-[44px] !border-ambar-fuerte/60 text-ambar-texto"
                  onClick={() => setPersonas(r.llegaron ?? personas)}>
                  📣 Usar lo de la recepción: llegaron {r.llegaron}
                </button>
              )}
            </div>
          </section>

          {/* 2 · Qué se sirvió */}
          <section>
            <p className={PREGUNTA}>2 · ¿Qué se sirvió?</p>
            <ul className="mt-2 space-y-1.5">
              {opciones.map((nombre) => (
                <li key={nombre} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 ${
                  (cuenta[nombre] ?? 0) > 0 ? 'border-oro/50 bg-oro/5' : 'border-hueso/15'}`}>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{nombre}</span>
                  <button type="button" aria-label={`Uno menos de ${nombre}`} className="boton h-10 w-10 justify-center text-[18px]"
                    onClick={() => mover(nombre, -1)}>−</button>
                  <span className="w-8 text-center text-[17px] font-bold tabular-nums">{cuenta[nombre] ?? 0}</span>
                  <button type="button" aria-label={`Uno más de ${nombre}`} className="boton h-10 w-10 justify-center text-[18px]"
                    onClick={() => mover(nombre, 1)}>+</button>
                </li>
              ))}
            </ul>
            <p className={`mt-2 text-[14px] font-semibold ${enMenus === personas ? 'text-verde-texto' : 'text-ambar-texto'}`}>
              {enMenus === personas
                ? `✓ Calzan: ${enMenus} ${enMenus === 1 ? 'menú' : 'menús'} para ${personas} ${personas === 1 ? 'persona' : 'personas'}`
                : `! Los menús suman ${enMenus} y llegaron ${personas}`}
            </p>
          </section>

          {/* 3 · Descuento */}
          <section>
            <p className={PREGUNTA}>3 · ¿Hubo descuento?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[null, ...descuentos].map((d) => {
                const elegido = d === null ? !descuento : descuento === d && !otro;
                return (
                  <button key={String(d)} type="button" aria-pressed={elegido}
                    onClick={() => { setDescuento(d); setOtro(''); }}
                    className={`boton min-h-[44px] rounded-full ${elegido ? 'border-oro bg-oro/15 font-bold text-oro' : ''}`}>
                    {d === null ? 'Sin descuento' : `${d}%`}
                  </button>
                );
              })}
              <label className={`flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3 ${
                otro ? 'border-ambar-fuerte/70 bg-ambar/10' : 'border-hueso/20'}`}>
                <span className="text-[14px] font-semibold">Otro</span>
                <input type="number" min={1} max={100} value={otro} placeholder="…" aria-label="Otro descuento en %"
                  onChange={(e) => {
                    setOtro(e.target.value);
                    const n = Number(e.target.value);
                    setDescuento(n > 0 ? Math.min(100, n) : null);
                  }}
                  className="w-14 bg-transparent text-[15px] font-bold tabular-nums focus:outline-none" />
                <span className="text-[14px]">%</span>
              </label>
            </div>
            {quedaPorAprobar && (
              <p className="mt-2 text-[14px] font-semibold text-ambar-texto">
                ⏳ No es estándar: queda por aprobar del encargado de operaciones o quien paga.
              </p>
            )}
          </section>

          {/* 4 · Por qué */}
          <section>
            <p className={PREGUNTA}>4 · ¿Por qué? <span className="font-normal text-hueso/65">(obligatorio)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOTIVOS_RECTIFICACION.map((m) => (
                <button key={m} type="button" aria-pressed={motivo === m} onClick={() => setMotivo(m)}
                  className={`boton min-h-[44px] rounded-full ${motivo === m ? 'border-oro bg-oro/15 font-bold text-oro' : ''}`}>
                  {m}
                </button>
              ))}
            </div>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2}
              placeholder="Cuenta qué pasó. Queda anotado con tu nombre."
              className="mt-2 w-full rounded-lg border-2 border-hueso/20 bg-tinta px-3 py-2 text-[15px]
                         focus:border-oro focus:outline-none" />
            {comentario.trim().length > 0 && comentario.trim().length < LARGO_MINIMO_COMENTARIO && (
              <p className="text-[13px] text-ambar-texto">Un poco más: al menos {LARGO_MINIMO_COMENTARIO} letras.</p>
            )}
          </section>

          {avisos.length > 0 && (
            <div className="space-y-1.5">
              {avisos.map((a) => (
                <p key={a.texto} className={`rounded-lg border-2 px-3 py-2 text-[14px] font-semibold ${TONO[a.tono]}`}>
                  {a.texto}
                </p>
              ))}
            </div>
          )}

          {/* Cómo queda en Fudo, antes de guardar. */}
          {vista && (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-hueso/60">Así queda en Fudo</p>
              <IngresoFudo ingreso={vista} />
            </div>
          )}

          {errores.length > 0 && (
            <ul className="space-y-0.5 text-[14px] text-hueso/75">
              {errores.map((e) => <li key={e}>○ {e}</li>)}
            </ul>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-hueso/10 pt-3">
            <button type="button" className="boton min-h-[44px]" onClick={onCerrar}>Cancelar</button>
            <button type="button" className="boton boton-relleno boton-hito"
              disabled={errores.length > 0 || guardando}
              onClick={() => (grande ? setConfirmando(true) : void guardar())}>
              {guardando ? 'Guardando…' : '✎ Guardar rectificación'}
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
