'use client';

/**
 * **El formulario de comentarios** (2026-11-12): el mismo en la ventana de
 * 💬 Comentar de la cabecera y en la misión *Tu voz* de la ayuda, donde va a
 * página completa. Ver `lib/comentarios.ts` y `/api/comentarios`.
 *
 * - **Tres decisiones, no siete campos.** Quién eres y tu rol los pone el
 *   servidor; la pantalla, quien lo abre. Acá se elige qué es y se escribe
 *   qué pasó y para qué.
 * - **Las cuatro clases son botones a la vista**, no un desplegable. La
 *   elegida lleva ✓ además del color.
 * - **Se manda a mano, no se autoguarda**: es un mensaje que le llega a
 *   alguien, como mandar una cotización.
 * - **Al mandarlo dice que quedó anotado** y ofrece escribir otro: uno por
 *   cosa, para que en la planilla se pueda trabajar cada uno.
 * - **Lo escrito y sin mandar se guarda en la pestaña** (`sessionStorage`):
 *   cerrar la ventana sin querer no lo borra. Se limpia al mandarlo.
 */
import { useEffect, useState } from 'react';
import { TIPOS_COMENTARIO, LARGO_TEXTO, LARGO_PARA, type TipoComentario } from '@/lib/comentarios';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

/** Lo que dice cada clase debajo de su nombre. */
const QUE_ES: Record<TipoComentario, string> = {
  '🧩 Me falta': 'Una función, un dato o un permiso',
  '🐞 Algo falla': 'Un error o algo que sale mal',
  '🤔 No se entiende': 'Un texto o un paso confuso',
  '💡 Idea': 'Algo que andaría mejor de otra forma'
};

const BORRADOR = 'brasas-comentario-borrador';
const leerBorrador = (): { tipo?: TipoComentario | ''; texto?: string; para?: string } => {
  try { return JSON.parse(sessionStorage.getItem(BORRADOR) ?? '{}'); } catch { return {}; }
};

export interface ComentarioMandado { tipo: TipoComentario; texto: string; pantalla: string }

export default function FormularioComentario({ pantalla, onCerrar, onMandado, tipoInicial = '' }: {
  /** Desde qué pantalla se escribe; va con el comentario. */
  pantalla: string;
  /** En una ventana: el botón para cerrarla. Sin esto, el formulario va suelto. */
  onCerrar?: () => void;
  /** Avisa lo que se mandó, para mostrarlo (la misión *Tu voz*). */
  onMandado?: (c: ComentarioMandado) => void;
  tipoInicial?: TipoComentario | '';
}) {
  const [tipo, setTipo] = useState<TipoComentario | ''>(tipoInicial);
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState('');
  const [leido, setLeido] = useState(false);
  // El borrador se lee después de dibujar: el servidor no tiene `sessionStorage`.
  useEffect(() => {
    const b = leerBorrador();
    if (!tipoInicial && b.tipo) setTipo(b.tipo);
    if (b.texto) setTexto(b.texto);
    if (b.para) setPara(b.para);
    setLeido(true);
  }, [tipoInicial]);
  useEffect(() => {
    if (!leido) return;
    try { sessionStorage.setItem(BORRADOR, JSON.stringify({ tipo, texto, para })); } catch { /* sin memoria */ }
  }, [leido, tipo, texto, para]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  async function enviar() {
    if (!tipo) { setError('Elige qué es.'); return; }
    if (!texto.trim()) { setError('Escribe qué pasó o qué necesitas.'); return; }
    setEnviando(true); setError('');
    try {
      const r = await fetch('/api/comentarios', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo, texto, para, pantalla })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'No se pudo mandar.');
      onMandado?.({ tipo, texto: texto.trim(), pantalla });
      setListo(true); setTipo(''); setTexto(''); setPara('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border-2 border-verde/50 bg-verde/10 px-4 py-3 text-[15px] leading-relaxed">
          <strong className="text-verde-texto">✓ Quedó anotado. Gracias.</strong>{' '}
          Ya está en la lista de pendientes, con tu nombre y la pantalla. Si tienes otra cosa,
          mándala aparte: uno por cosa se trabaja mejor.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setListo(false)}
            className={`boton min-h-[44px] ${onCerrar ? '' : 'boton-relleno'}`}>
            Escribir otro
          </button>
          {onCerrar && (
            <>
              <span className="flex-1" />
              <button type="button" onClick={onCerrar} className="boton boton-relleno min-h-[44px]">Cerrar</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[14px] text-hueso/70">
        Va con tu nombre y la pantalla <strong className="text-hueso">{pantalla}</strong>.
      </p>

      <p className="mt-4 text-[14px] font-semibold">1 · Qué es</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Qué es">
        {TIPOS_COMENTARIO.map((t) => {
          const elegido = tipo === t;
          return (
            <button key={t} type="button" aria-pressed={elegido}
              onClick={() => { setTipo(t); setError(''); }}
              className={`tecla flex min-h-[52px] flex-col items-start justify-center rounded-lg
                border-2 px-3 py-2 text-left ${elegido
                  ? 'border-oro bg-oro/15 text-hueso'
                  : 'border-hueso/20 text-hueso/80 hover:border-oro'}`}>
              <span className="text-[15px] font-semibold">{elegido ? '✓ ' : ''}{t}</span>
              <span className="text-[13px] text-hueso/60">{QUE_ES[t]}</span>
            </button>
          );
        })}
      </div>

      <label htmlFor={`texto-${pantalla}`} className="mt-4 block text-[14px] font-semibold">
        2 · Qué pasó o qué necesitas
      </label>
      <textarea id={`texto-${pantalla}`} rows={3} maxLength={LARGO_TEXTO} value={texto}
        onChange={(e) => { setTexto(e.target.value); setError(''); }}
        placeholder="Ej.: al recibir a la gente no veo si la reserva está pagada."
        className={`mt-1 ${ENTRADA}`} />

      <label htmlFor={`para-${pantalla}`} className="mt-3 block text-[14px] font-semibold">
        3 · Para qué lo necesitas en tu trabajo <span className="font-normal text-hueso/55">(opcional)</span>
      </label>
      <textarea id={`para-${pantalla}`} rows={2} maxLength={LARGO_PARA} value={para}
        onChange={(e) => setPara(e.target.value)}
        placeholder="Ej.: para cobrar en la entrada a quien no pagó en línea."
        className={`mt-1 ${ENTRADA}`} />

      {error && (
        <p role="alert" className="mt-3 rounded border-2 border-rojo/50 bg-rojo/10 px-3 py-2
                                    text-[14px] text-rojo-texto">
          {error}
        </p>
      )}

      <p className="mt-4 text-[13px] text-hueso/55">Si tienes una captura, mándala por WhatsApp.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="flex-1" />
        {onCerrar && (
          <button type="button" onClick={onCerrar} className="boton min-h-[44px]">Cancelar</button>
        )}
        <button type="button" onClick={enviar} disabled={enviando}
          className="boton boton-relleno min-h-[44px]">
          {enviando ? 'Mandando…' : 'Mandar comentario'}
        </button>
      </div>
    </div>
  );
}
