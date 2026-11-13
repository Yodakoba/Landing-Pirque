'use client';

/**
 * **💬 Tu voz**, lo primero de la página `/ayuda` (2026-11-13).
 *
 * Lo pidió el cliente: *"el formulario tiene que estar muy presente,
 * accesible, fácil… en primer paso"*. Antes era la quinta misión y había que
 * llegar hasta ella. Ahora es el bloque grande de arriba, **con el formulario
 * abierto**, antes de las misiones: quien entra a la ayuda porque algo no le
 * funciona escribe ahí mismo, sin recorrer nada.
 *
 * - **Le llegan pedidos de abajo**: *¿Esto no te sirve? Cuéntalo* de una
 *   misión anota esa misión como pantalla, y *🙋 Lo necesito* de un poder
 *   bloqueado deja el pedido escrito. El formulario se vuelve a armar con eso
 *   (`key`), y la página sube hasta aquí.
 * - **Al lado, lo que más sirve** (ejemplos) y **lo que ya mandaste** desde
 *   este navegador, para ver que llegó.
 */
import { useEffect, useState } from 'react';
import FormularioComentario, { type ComentarioMandado } from './FormularioComentario';
import type { TipoComentario } from '@/lib/comentarios';

export interface Pedido { pantalla: string; tipo: TipoComentario | ''; texto: string; vez: number }

const LLAVE = 'brasas-comentarios-mandados';
const leer = (): ComentarioMandado[] => {
  try { return JSON.parse(localStorage.getItem(LLAVE) ?? '[]'); } catch { return []; }
};

export default function VozAyuda({ pedido, conComentar }: { pedido: Pedido; conComentar: boolean }) {
  const [mandados, setMandados] = useState<ComentarioMandado[]>([]);
  useEffect(() => { setMandados(leer()); }, []);

  return (
    <section id="tu-voz" aria-label="Tu voz" className="scroll-mt-4 overflow-hidden rounded-3xl border-[3px] border-rosa-fuerte/60 bg-rosa/10">
      <header className="flex items-start gap-4 border-b-2 border-rosa-fuerte/30 bg-rosa/15 px-4 py-4 sm:px-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rosa-fuerte text-[30px] shadow-md" aria-hidden>💬</span>
        <div className="min-w-0">
          <p className="text-[13px] font-black uppercase tracking-widest text-rosa-texto">Lo primero</p>
          <h2 className="text-[24px] font-black leading-tight sm:text-[28px]">Tu voz manda</h2>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-hueso/85">
            ¿Algo no funciona, no se entiende o <strong>te falta para tu trabajo</strong>? Escríbelo aquí, en
            medio minuto. Llega directo a la lista de lo que hay que arreglar.
          </p>
        </div>
      </header>

      {conComentar ? (
        <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)] md:items-start">
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
      ) : (
        <p className="m-4 rounded-xl border-2 border-ambar/50 bg-ambar/10 px-4 py-3 text-[15px] sm:m-6">
          Los comentarios todavía no están conectados. Mientras tanto, cuéntaselo a quien administra el panel.
        </p>
      )}
    </section>
  );
}
