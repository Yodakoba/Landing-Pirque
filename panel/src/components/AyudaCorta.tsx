'use client';

/**
 * El `?` chico que va al lado de un rótulo, de un botón o de un bloque.
 *
 * Lo pidió el cliente (2026-11-11): *"mejor un signo de interrogación más y
 * que explica esta sección específica en corto que solo un gran signo de
 * interrogación arriba y tengo que leer todo el chorizo"*. El `?` del título
 * (`Ayuda.tsx`) explica la pantalla; éste explica **una sola cosa**, en dos
 * o tres frases, justo donde se está decidiendo.
 *
 * Tres detalles que no son de gusto:
 *
 * - **La cajita se dibuja en un portal**, en `document.body`. Este `?` vive
 *   muchas veces dentro de un `<label>` (`Campo`): sin portal, tocar el texto
 *   de la explicación "activaría" el campo —enfocaría la caja o, peor,
 *   marcaría una casilla— y además heredaría el `uppercase` del rótulo.
 * - **El clic no sube**: `preventDefault` + `stopPropagation`, por lo mismo.
 *   Un `?` dentro de una línea que se abre al apretarla no puede abrirla.
 * - **Escape cierra la cajita y nada más.** Se escucha en captura sobre
 *   `window`, o sea antes que `Dialogo`, y se marca como usado: `Dialogo`
 *   ignora un Escape con `defaultPrevented`, así que la ventana de atrás —una
 *   cotización a medio escribir— no se cierra con él.
 *
 * El texto vive en `ayudas.ts` (`AYUDAS_CORTAS`), todo junto, salvo cuando
 * sale de datos —los permisos de un rol—, que se pasa como `children`.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AYUDAS_CORTAS } from '@/lib/ayudas';

export default function AyudaCorta({ tema, titulo, children }: {
  /** La llave en `AYUDAS_CORTAS`. */
  tema?: string;
  /** Para cuando el texto llega como `children`. */
  titulo?: string;
  children?: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const a = tema ? AYUDAS_CORTAS[tema] : undefined;
  const t = a?.titulo ?? titulo ?? '';

  useEffect(() => {
    if (!abierta) return;
    function tecla(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault(); e.stopPropagation();
      setAbierta(false);
    }
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [abierta]);

  if (!a && !children) return null;

  return (
    <>
      <button type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAbierta(true); }}
        aria-label={`Qué es esto: ${t}`}
        className="ml-1.5 inline-flex h-[30px] w-[30px] shrink-0 items-center
                   justify-center rounded-full border border-hueso/30 align-middle
                   text-[14px] font-bold normal-case leading-none tracking-normal
                   text-hueso/70 hover:border-oro hover:text-oro">
        ?
      </button>

      {abierta && typeof document !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" aria-label={t}
          onClick={() => setAbierta(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center
                     bg-black/50 p-4">
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-hueso/20 bg-panel
                       p-4 text-left normal-case tracking-normal shadow-xl">
            <p className="text-[15px] font-semibold text-oro">{t}</p>
            <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-hueso/85">
              {a ? a.texto.map((p, i) => <p key={i}>{p}</p>) : children}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" autoFocus onClick={() => setAbierta(false)}
                className="boton boton-relleno min-h-[40px] px-5">Entendido</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
