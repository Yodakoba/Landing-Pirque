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
 * El mismo control se usa para el equipo y para las actividades extras: dos
 * pantallas que preguntan lo mismo tienen que preguntarlo igual.
 */
import { VINO } from '@/lib/equipo';

/**
 * Botones de verdad, no texto que se pueda apretar: `py-2` con `text-sm`
 * deja unos 40px de alto, que es lo que se acierta con el dedo. Un control
 * de 30px se falla, y fallar acá significa marcar a la persona equivocada.
 */
const BASE = 'flex items-center gap-1.5 rounded border px-3 py-2 '
           + 'text-sm font-semibold transition';

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
          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
          : 'border-hueso/20 text-hueso/50 hover:border-emerald-400/60 hover:text-emerald-200'}`}>
        <span aria-hidden>✓</span> Vino
      </button>
      <button type="button" aria-pressed={falto} onClick={() => cambiar(VINO.no)}
        title={falto ? 'Apreta de nuevo para dejarlo sin marcar' : `${quien} no llegó`}
        className={`${BASE} ${falto
          ? 'border-red-400 bg-red-500/20 text-red-200'
          : 'border-hueso/20 text-hueso/50 hover:border-red-400/60 hover:text-red-200'}`}>
        <span aria-hidden>✕</span> No vino
      </button>
    </div>
  );
}
