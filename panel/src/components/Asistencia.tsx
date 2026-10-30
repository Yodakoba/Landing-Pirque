'use client';

/**
 * ¿Vino o no vino?, en dos botones grandes.
 *
 * **Era un desplegable y no servía** (2026-10-30, lo pidió el cliente). Esto
 * lo usa la jefa de turno un sábado a las once de la mañana, con el teléfono
 * en la mano, y gente que no ha manejado sistemas así en su vida. Un
 * `<select>` esconde las opciones hasta que alguien adivina que hay que
 * abrirlo, y lo que muestra es un guion: no dice qué hay que hacer.
 *
 * Dos botones a la vista dicen la frase completa —**Vino** / **No vino**—
 * antes de tocar nada. El que se aprieta queda **pintado**, verde o rojo, y
 * el otro apagado: el estado se ve de lejos, sin leer.
 *
 * **Apretar el que ya está marcado lo desmarca**, que es la única forma de
 * volver a "no sé todavía" sin inventar un tercer botón. Va dicho en el
 * `title`, y el caso normal —marcar una vez— no necesita saberlo.
 *
 * El mismo control se usa para el equipo, para las actividades extras y
 * para la asistencia de los clientes en la tabla del día: pantallas que
 * preguntan lo mismo tienen que preguntarlo igual. Los valores de `VINO` y
 * los de `ASISTENCIA` —la columna de `Reservas`— son el mismo `Sí` / `No`,
 * así que el control sirve para las dos sin traducir nada.
 */
import { VINO } from '@/lib/equipo';

/**
 * Botones de verdad, no texto que se pueda apretar: `py-2` con `text-sm`
 * deja unos 40px de alto, que es lo que se acierta con el dedo. Un control
 * de 30px se falla, y fallar acá significa marcar a la persona equivocada.
 */
const BASE = 'tecla flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 '
           + 'text-sm font-semibold';

/**
 * El punto del semáforo, que es lo que se lee de lejos.
 *
 * Lo pidió el cliente junto con lo de los botones: un semáforo donde la
 * palabra sea la confirmación y el color la respuesta. El punto se llena
 * cuando ese estado está elegido y queda hueco cuando no, así que la fila
 * se entiende sin leer ninguna de las dos palabras —y sin depender solo del
 * color, que para quien no lo distingue no diría nada.
 */
function Foco({ encendido }: { encendido: boolean }) {
  return (
    <span aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-current ${
        encendido ? 'bg-current' : 'bg-transparent opacity-50'}`} />
  );
}

export default function Asistencia({ valor, onCambio, quien }: {
  /** Lo que hay guardado: `VINO.si`, `VINO.no` o vacío. */
  valor: string;
  onCambio: (v: string) => void;
  /** Para los lectores de pantalla: "¿Vino Ana Soto?". */
  quien: string;
}) {
  const vino = valor === VINO.si;
  const falto = valor === VINO.no;
  const cambiar = (a: string) => onCambio(valor === a ? VINO.sinMarcar : a);

  return (
    <div role="group" aria-label={`¿Vino ${quien}?`}
         className="flex shrink-0 flex-wrap gap-1">
      <button type="button" aria-pressed={vino} onClick={() => cambiar(VINO.si)}
        title={vino ? 'Apreta de nuevo para dejarlo sin marcar' : `${quien} llegó`}
        className={`${BASE} ${vino
          ? 'border-verde bg-verde/15 text-verde-texto shadow-[0_0_0_3px_rgb(var(--verde)/0.14)]'
          : 'border-hueso/20 text-hueso/50 hover:border-verde/60 hover:text-verde-texto'}`}>
        <Foco encendido={vino} /> Vino
      </button>
      <button type="button" aria-pressed={falto} onClick={() => cambiar(VINO.no)}
        title={falto ? 'Apreta de nuevo para dejarlo sin marcar' : `${quien} no llegó`}
        className={`${BASE} ${falto
          ? 'border-rojo bg-rojo/15 text-rojo-texto shadow-[0_0_0_3px_rgb(var(--rojo)/0.14)]'
          : 'border-hueso/20 text-hueso/50 hover:border-rojo/60 hover:text-rojo-texto'}`}>
        <Foco encendido={falto} /> No vino
      </button>
    </div>
  );
}
