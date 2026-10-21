'use client';

/**
 * La ventana modal del panel.
 *
 * Se cierra de tres formas, y las tres importan por razones distintas:
 *
 * - **Clic afuera.** Es lo que la gente intenta primero, y si no pasa nada
 *   la ventana se siente trabada.
 * - **Escape.** Es lo que espera quien usa el teclado.
 * - **El botón Cancelar.** Es lo único visible, y lo único que funciona si
 *   algo del JavaScript falla.
 *
 * El clic se cierra en `mousedown` sobre el fondo y no en `click`, porque un
 * `click` se dispara también cuando alguien empieza a arrastrar texto
 * ADENTRO del formulario y suelta afuera: eso cerraría la ventana en medio
 * de una selección y se perdería lo escrito.
 */
import { useEffect, useId, useRef } from 'react';

/**
 * Qué ventanas hay abiertas, de la más vieja a la más nueva.
 *
 * Existe porque desde una ventana se puede abrir otra —planificar el equipo
 * y, desde ahí, crear un trabajador— y los dos escuchan Escape en el
 * documento. Sin esta pila, una tecla cerraría las dos de golpe y se
 * perdería lo que estaba a medio escribir en la de atrás.
 */
const abiertas: string[] = [];

export default function Dialogo({
  titulo, onCerrar, children, ancho = 'max-w-lg'
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  /**
   * El ancho máximo, como clase de Tailwind. Lo trae configurable porque
   * planificar el equipo son varias columnas y en `max-w-lg` quedarían
   * apiladas de a una; los formularios de una columna siguen con el de
   * siempre.
   */
  ancho?: string;
}) {
  const fondo = useRef<HTMLDivElement>(null);
  const empezoEnElFondo = useRef(false);
  const id = useId();

  useEffect(() => {
    abiertas.push(id);
    // Solo la de más arriba responde a Escape.
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abiertas[abiertas.length - 1] === id) onCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    // Mientras hay una ventana abierta, lo de atrás no se hace scroll: es
    // desorientador ver moverse la página que no estás tocando.
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      const i = abiertas.lastIndexOf(id);
      if (i !== -1) abiertas.splice(i, 1);
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = antes;
    };
  }, [onCerrar, id]);

  return (
    <div
      ref={fondo}
      onMouseDown={(e) => { empezoEnElFondo.current = e.target === fondo.current; }}
      onMouseUp={(e) => {
        if (empezoEnElFondo.current && e.target === fondo.current) onCerrar();
        empezoEnElFondo.current = false;
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"
      style={{ zIndex: 50 + abiertas.length }}
      role="dialog" aria-modal="true" aria-label={titulo}>
      {/* El clic de adentro no llega al fondo, así que no cierra nada. */}
      <div className={`mx-auto mt-10 ${ancho} rounded border border-hueso/15 bg-panel p-5`}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-oro">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
