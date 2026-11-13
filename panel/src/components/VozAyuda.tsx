'use client';

/**
 * **💬 Tu voz** en la página `/ayuda`.
 *
 * - **2026-11-13, primera vuelta**: el cliente pidió que el formulario *"esté
 *   muy presente… en primer paso"*, y fue el bloque grande de arriba, abierto.
 * - **2026-11-13, segunda vuelta**: *"que no ocupe desde el inicio todo el
 *   espacio… lo primero que tengo que ver es: haz esta tarea"*. Ahora **parte
 *   cerrado**: una barra rosada de una línea con **💬 Coméntame**, y el
 *   formulario se abre al apretarlo. El título es **Aquí tu voz cuenta**: el
 *   *"Tu voz manda"* de la primera vuelta sonaba a texto genérico (lo dijo el
 *   cliente). Así se ve al tiro que se puede comentar, sin tapar las misiones.
 *
 * **Se abre desde varios lugares**, todos con el mismo botón y la misma
 * palabra: la barra de arriba, el botón flotante, *¿Esto no te sirve?
 * Coméntame* de cada misión y *🙋 Lo necesito* de un poder bloqueado. Los dos
 * últimos dejan el pedido armado (`key` vuelve a armar el formulario) y la
 * página sube hasta aquí. Quien abre la página es `AyudaRol`, que lo controla.
 */
import { useEffect, useState } from 'react';
import FormularioComentario, { type ComentarioMandado } from './FormularioComentario';
import type { TipoComentario } from '@/lib/comentarios';

export interface Pedido { pantalla: string; tipo: TipoComentario | ''; texto: string; vez: number }

const LLAVE = 'brasas-comentarios-mandados';
const leer = (): ComentarioMandado[] => {
  try { return JSON.parse(localStorage.getItem(LLAVE) ?? '[]'); } catch { return []; }
};

export default function VozAyuda({ pedido, abierto, onAbrir, onCerrar }: {
  pedido: Pedido; abierto: boolean; onAbrir: () => void; onCerrar: () => void;
}) {
  const [mandados, setMandados] = useState<ComentarioMandado[]>([]);
  useEffect(() => { setMandados(leer()); }, []);

  return (
    <section id="tu-voz" aria-label="Aquí tu voz cuenta"
      className={`scroll-mt-4 overflow-hidden rounded-2xl border-2 border-rosa-fuerte/60 bg-rosa/10 ${abierto ? 'border-[3px]' : ''}`}>
      {/* La barra: siempre a la vista. Cerrada es todo lo que ocupa. */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rosa-fuerte text-[24px]" aria-hidden>💬</span>
        <div className="min-w-0 flex-1 basis-[13rem] leading-snug">
          <h2 className="text-[17px] font-black uppercase tracking-wide text-rosa-texto">Aquí tu voz cuenta</h2>
          <p className="text-[15px] text-hueso/80">
            ¿Algo no funciona, no se entiende o te falta? Mándame tu comentario y lo arreglamos.
          </p>
        </div>
        {abierto ? (
          <button type="button" onClick={onCerrar} aria-expanded
            className="boton min-h-[44px] w-full border-2 border-rosa-fuerte/50 text-rosa-texto sm:w-auto">
            Cerrar ✕
          </button>
        ) : (
          <button type="button" onClick={onAbrir} aria-expanded={false} aria-controls="tu-voz-formulario"
            className="tecla boton min-h-[48px] w-full border-[3px] sm:w-auto border-rosa-fuerte bg-rosa/20 px-5 text-[16px] font-black text-rosa-texto">
            💬 Coméntame
          </button>
        )}
      </div>

      {abierto && (
        <div id="tu-voz-formulario"
          className="grid gap-4 border-t-2 border-rosa-fuerte/30 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)] md:items-start">
          <div className="rounded-2xl border-2 border-rosa-fuerte/30 bg-panel p-4">
            <FormularioComentario key={pedido.vez} pantalla={pedido.pantalla || 'Ayuda'}
              tipoInicial={pedido.tipo} textoInicial={pedido.texto}
              onMandado={(c) => {
                const lista = [c, ...mandados].slice(0, 6);
                setMandados(lista);
                try { localStorage.setItem(LLAVE, JSON.stringify(lista)); } catch { /* sin memoria */ }
              }} />
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border-2 border-ambar-fuerte/30 bg-panel p-4">
              <h3 className="text-[15px] font-black uppercase tracking-wide text-ambar-texto">💡 Lo que más sirve</h3>
              <ul className="mt-2 space-y-2 text-[14px] text-hueso/80">
                <li>🧩 <em>«Al recibir a la gente no veo si la reserva está pagada.»</em></li>
                <li>🐞 <em>«Al guardar la cotización me salió un error.»</em></li>
                <li>🤔 <em>«No entendí qué hace Cerrar el día.»</em></li>
              </ul>
              <p className="mt-3 text-[14px] text-hueso/70">
                Una cosa por comentario. Si piensas <strong>«¿y por qué no puedo hacer esto?»</strong>, eso es justo lo que buscamos.
              </p>
            </div>
            {mandados.length > 0 && (
              <div className="rounded-2xl border-2 border-verde-fuerte/30 bg-panel p-4">
                <h3 className="text-[15px] font-black uppercase tracking-wide text-verde-texto">✓ Ya mandaste</h3>
                <ul className="mt-2 space-y-1.5">
                  {mandados.map((c, i) => (
                    <li key={i} className="rounded-lg border border-hueso/15 px-3 py-2 text-[14px]">
                      <span className="font-semibold">{c.tipo}</span>{' '}
                      <span className="text-hueso/75">{c.texto.length > 80 ? c.texto.slice(0, 80) + '…' : c.texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
