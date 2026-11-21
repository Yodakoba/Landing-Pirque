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
        /* **El `?` no mueve lo que tiene al lado** (2026-11-21, lo vio el
           cliente en la ficha de un trabajador: *"generas, por el signo de
           interrogación, saltos verticales, donde debería estar alineado
           todo"*). Medía 30px dentro de un renglón de 13px de letra, así que
           el nombre que lo llevaba quedaba 11px más alto que los de al lado,
           y su campo, 11px más abajo.

           Ahora el círculo mide **24px a la vista**, con un margen negativo
           que lo deja ocupando 16px del renglón: nunca lo agranda. **Lo que
           se aprieta mide 36px** —el `::before` lo extiende 6px a cada lado,
           más hacia arriba que hacia abajo, para no tapar el campo que va
           debajo—: antes eran 30. Vale para los 101 lugares que lo usan. */
        className="relative -my-1 ml-1.5 inline-flex h-6 w-6 shrink-0 items-center
                   justify-center rounded-full border-[1.5px] border-hueso/40 align-middle
                   text-[13px] font-bold normal-case leading-none tracking-normal
                   text-hueso/75 hover:border-oro hover:text-oro
                   before:absolute before:-inset-x-1.5 before:-bottom-1 before:-top-2 before:content-['']">
        ?
      </button>

      {abierta && typeof document !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" aria-label={t}
          onClick={() => setAbierta(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center
                     bg-black/50 p-4">
          {/* **Nunca más alta que la pantalla** (2026-11-11, lo reclamó el
              cliente: en un computador la lista de un rol cortaba el título
              arriba y *Entendido* abajo). El título y el botón quedan fijos;
              si el texto no cabe, se desplaza solo el medio. */}
          <div onClick={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col sm:max-w-lg rounded-lg border
                       border-hueso/20 bg-panel p-4 text-left normal-case tracking-normal shadow-xl">
            <p className="shrink-0 text-[15px] font-semibold text-oro">{t}</p>
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto text-[15px] leading-relaxed text-hueso/85">
              {a ? a.texto.map((p, i) => <p key={i}>{p}</p>) : children}
            </div>
            <div className="mt-4 flex shrink-0 justify-end">
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
