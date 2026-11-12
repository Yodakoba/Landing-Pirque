'use client';

/**
 * **💬 Comentar**, en la cabecera de todas las pantallas (2026-11-12).
 *
 * Lo pidió el cliente al cerrar el testeo: que el formulario de comentarios
 * del recorrido quede dentro del panel, conectado a la misma planilla donde
 * ya los trabaja. Ver `lib/comentarios.ts` y `/api/comentarios`.
 *
 * - **Tres decisiones, no siete campos.** Quién eres, tu rol y la pantalla
 *   los pone el panel; acá se elige qué es y se escribe qué pasó y para qué.
 * - **Las cuatro clases son botones a la vista**, no un desplegable (regla
 *   PlayStation). La elegida lleva ✓ además del color.
 * - **Se manda a mano, no se autoguarda**: es un mensaje que le llega a
 *   alguien, como mandar una cotización. Mientras no se manda, lo escrito
 *   sigue ahí aunque se cierre la ventana.
 * - **Al mandarlo, la ventana dice que quedó anotado** y ofrece escribir
 *   otro: uno por cosa, para que en la planilla se pueda trabajar cada uno.
 */
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Dialogo from './Dialogo';
import { TIPOS_COMENTARIO, LARGO_TEXTO, LARGO_PARA, type TipoComentario } from '@/lib/comentarios';
import { pantallaDeRuta } from '@/lib/ayudaRol';

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

export default function Comentar() {
  const ruta = usePathname();
  const [abierta, setAbierta] = useState(false);
  const [tipo, setTipo] = useState<TipoComentario | ''>('');
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const pantalla = pantallaDeRuta(ruta);

  function abrir() { setListo(false); setError(''); setAbierta(true); }

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
      setListo(true); setTipo(''); setTexto(''); setPara('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button type="button" onClick={abrir} className="tecla boton"
        title="Cuéntanos un error, una duda o algo que te falta">
        💬 Comentar
      </button>

      {abierta && (
        <Dialogo titulo={listo ? 'Quedó anotado' : 'Comentar'} onCerrar={() => setAbierta(false)}>
          {listo ? (
            <>
              <p className="mt-3 text-[15px] leading-relaxed text-hueso/80">
                ✓ Gracias. Tu comentario ya está en la lista de pendientes, con tu
                nombre y la pantalla. Si tienes otra cosa, mándala aparte: uno por
                cosa se trabaja mejor.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setListo(false)} className="boton min-h-[44px]">
                  Escribir otro
                </button>
                <span className="flex-1" />
                <button type="button" onClick={() => setAbierta(false)}
                  className="boton boton-relleno min-h-[44px]">
                  Cerrar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-[14px] text-hueso/70">
                Va con tu nombre y la pantalla <strong className="text-hueso">{pantalla}</strong>.
                Errores, dudas, ideas y, sobre todo, lo que te falta para tu trabajo.
              </p>

              <p className="mt-4 text-[14px] font-semibold">Qué es</p>
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

              <label htmlFor="comentar-texto" className="mt-4 block text-[14px] font-semibold">
                Qué pasó o qué necesitas
              </label>
              <textarea id="comentar-texto" rows={3} maxLength={LARGO_TEXTO} value={texto}
                onChange={(e) => { setTexto(e.target.value); setError(''); }}
                placeholder="Ej.: al recibir a la gente no veo si la reserva está pagada."
                className={`mt-1 ${ENTRADA}`} />

              <label htmlFor="comentar-para" className="mt-3 block text-[14px] font-semibold">
                Para qué lo necesitas en tu trabajo <span className="font-normal text-hueso/55">(opcional)</span>
              </label>
              <textarea id="comentar-para" rows={2} maxLength={LARGO_PARA} value={para}
                onChange={(e) => setPara(e.target.value)}
                placeholder="Ej.: para cobrar en la entrada a quien no pagó en línea."
                className={`mt-1 ${ENTRADA}`} />

              {error && (
                <p role="alert" className="mt-3 rounded border-2 border-rojo/50 bg-rojo/10 px-3 py-2
                                            text-[14px] text-rojo-texto">
                  {error}
                </p>
              )}

              <p className="mt-4 text-[13px] text-hueso/55">
                Si tienes una captura, mándala por WhatsApp.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="flex-1" />
                <button type="button" onClick={() => setAbierta(false)} className="boton min-h-[44px]">
                  Cancelar
                </button>
                <button type="button" onClick={enviar} disabled={enviando}
                  className="boton boton-relleno min-h-[44px]">
                  {enviando ? 'Mandando…' : 'Mandar comentario'}
                </button>
              </div>
            </>
          )}
        </Dialogo>
      )}
    </>
  );
}
