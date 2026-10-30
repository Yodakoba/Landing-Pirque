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

/**
 * Cómo estaba el scroll del `body` ANTES de que se abriera la primera
 * ventana. Es del grupo, no de cada ventana, y ahí está la diferencia.
 *
 * **Esto arregla un bug real** (2026-10-30, lo reportó el cliente): se abría
 * el día en `/turnos`, dentro la ficha de alguien, se cerraba la ficha con
 * *Cancelar* y el día clicando afuera — y la página quedaba **trabada, sin
 * poder subir a ver el menú**. El `body` se quedaba en `overflow: hidden`
 * para siempre y había que recargar.
 *
 * La causa es que cada ventana guardaba por su cuenta "cómo estaba esto
 * antes", y con dos abiertas la segunda guardaba `hidden` —puesto por la
 * primera— como si fuera el estado original. Bastaba con que los efectos
 * corrieran en cierto orden para que la de abajo terminara restaurando
 * `hidden` al cerrarse. Un valor compartido no se puede guardar por copias.
 *
 * Ahora lo guarda **la primera que abre** y lo restaura **la última que
 * cierra**, que es lo que de verdad significa "mientras haya una ventana".
 */
let scrollDeAntes: string | null = null;

function trabarElFondo(id: string) {
  if (abiertas.length === 0) scrollDeAntes = document.body.style.overflow;
  abiertas.push(id);
  document.body.style.overflow = 'hidden';
}

function soltarElFondo(id: string) {
  const i = abiertas.lastIndexOf(id);
  if (i !== -1) abiertas.splice(i, 1);
  if (abiertas.length === 0) {
    document.body.style.overflow = scrollDeAntes ?? '';
    scrollDeAntes = null;
  }
}

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

  /**
   * `onCerrar` por referencia, para que el efecto corra **una vez por
   * ventana** y no en cada dibujado.
   *
   * Antes estaba en las dependencias, y como todas las pantallas lo pasan
   * como una función escrita ahí mismo —`onCerrar={() => salir()}`— era una
   * función distinta cada vez: el efecto se desmontaba y se volvía a montar
   * constantemente. Eso rompía **las dos cosas que este efecto cuida**: el
   * scroll del fondo (ver `scrollDeAntes`) y la pila de Escape, porque al
   * re-montarse la ventana de abajo se sacaba y se volvía a poner **encima**
   * de la de arriba, y entonces Escape cerraba la equivocada.
   */
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    // Mientras hay una ventana abierta, lo de atrás no se hace scroll: es
    // desorientador ver moverse la página que no estás tocando.
    trabarElFondo(id);
    // Solo la de más arriba responde a Escape.
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abiertas[abiertas.length - 1] === id) {
        cerrar.current();
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      soltarElFondo(id);
    };
  }, [id]);

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
      {/* El clic de adentro no llega al fondo, así que no cierra nada.

          **`normal-case font-normal tracking-normal` no es decorativo.** Una
          ventana se dibuja donde está escrita, no en la raíz del documento,
          así que hereda el estilo de lo que la rodea. El `?` de ayuda vive al
          lado del título de la pantalla, o sea **dentro de un `<h1>` en
          mayúsculas**: sin esto, la explicación entera salía GRITADA Y EN
          NEGRITA, que además de feo es ilegible en tres párrafos. Se arregla
          acá y no sacando el `?` del título, porque cualquier ventana que se
          abra mañana desde otro lugar tendría el mismo problema. */}
      <div className={`mx-auto mt-10 ${ancho} rounded border border-hueso/15
                       bg-panel p-5 font-normal normal-case tracking-normal`}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-oro">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
