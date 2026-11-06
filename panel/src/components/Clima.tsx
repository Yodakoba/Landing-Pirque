'use client';

/**
 * El pronóstico de un día en chico: "☀️ 28°".
 *
 * Va en los tres calendarios y en la página del día, siempre en el aire que
 * ya había bajo la fecha, para no cambiar el alto de nada —la misma regla
 * que `PuntoDia`—. El detalle (mínima, probabilidad de lluvia) va en el
 * `title`: a la vista, lo único que hace falta es saber si hay sol o agua.
 * En la página del día se suma cuánta agua.
 *
 * Un día sin pronóstico —más allá de unos 9 días, o si MET Norway no
 * respondió— no dibuja nada.
 *
 * **La fuente se cita**, porque lo pide la licencia de MET: en el `title`
 * de todos, y a la vista en el grande de la página del día.
 */
import { useEffect, useState } from 'react';
import { iconoDe, climaEnPalabras, FUENTE, type Clima as DatoClima } from '@/lib/clima';

/**
 * El pronóstico por fecha. Se pide una vez por pantalla; si falla, el mapa
 * queda vacío y los calendarios se dibujan sin íconos.
 */
export function usePronostico(): Map<string, DatoClima> {
  const [porFecha, setPorFecha] = useState<Map<string, DatoClima>>(() => new Map());
  useEffect(() => {
    fetch('/api/clima').then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.clima)) {
          setPorFecha(new Map((d.clima as DatoClima[]).map((c) => [c.fecha, c])));
        }
      })
      .catch(() => {});
  }, []);
  return porFecha;
}

/**
 * Los tres tamaños, que no son un gusto sino tres lugares distintos:
 *
 * - **`chico`** — las celdas de `/turnos` y `/extras`, donde el día entero
 *   mide 92px y el ícono va de refilón, bajo el número.
 * - **`tarjeta`** — la tarjeta del calendario de la portada. **Pasó de 10px
 *   a una pastilla con el ícono a 22** (2026-11-01, lo pidió el cliente:
 *   *"el icono del tiempo es demasiado chico, nadie lo va a detectar
 *   bien"*). Tenía razón: a 10px se perdía bajo la fecha, y ese dato es de
 *   los que se miran **antes** de decidir si el show ecuestre se hace o se
 *   arma adentro.
 * - **`grande`** — la página del día, que además dice cuánta agua y cita la
 *   fuente a la vista.
 */
type Tamano = 'chico' | 'tarjeta' | 'grande';

const CAJA: Record<Tamano, string> = {
  chico: 'gap-1 text-[12px] leading-none',
  // Pastilla: el pronóstico deja de ser un apéndice de la fecha y pasa a ser
  // una cosa con borde, que es lo que lo hace encontrable de un vistazo.
  tarjeta: 'gap-1.5 rounded-lg border border-hueso/10 bg-hueso/[0.04] px-2 py-1',
  grande: 'gap-1 text-sm'
};
const ICONO: Record<Tamano, string> = {
  chico: '', tarjeta: 'text-[22px] leading-none', grande: ''
};
const GRADO: Record<Tamano, string> = {
  chico: '', tarjeta: 'text-[15px] font-semibold tabular-nums text-hueso/85', grande: ''
};

export default function Clima({ c, grande = false, tamano }: {
  c?: DatoClima;
  /** Atajo viejo, equivale a `tamano="grande"`. */
  grande?: boolean;
  tamano?: Tamano;
}) {
  if (!c) return null;
  const t: Tamano = tamano ?? (grande ? 'grande' : 'chico');
  const { icono } = iconoDe(c.simbolo);
  const detalle = `${climaEnPalabras(c)} · datos de ${FUENTE.texto}`;
  return (
    <span title={detalle}
      className={`inline-flex items-center whitespace-nowrap font-normal normal-case
                  tracking-normal text-hueso/60 ${CAJA[t]}`}>
      <span aria-hidden className={ICONO[t]}>{icono}</span>
      {c.max !== null && <span aria-hidden className={GRADO[t]}>{Math.round(c.max)}°</span>}
      {/* En grande, cuánta agua. La probabilidad iría primero, pero MET no
          la da para Chile; los milímetros sí llegan siempre. */}
      {grande && (c.lluvia !== null && c.lluvia >= 30 ? (
        <span aria-hidden className="text-cielo-texto/80">{Math.round(c.lluvia)}% lluvia</span>
      ) : c.mm !== null && c.mm >= 1 && (
        <span aria-hidden className="text-cielo-texto/80">{Math.round(c.mm)} mm de lluvia</span>
      ))}
      {grande && (
        <a href={FUENTE.url} target="_blank" rel="noreferrer"
           className="ml-1 text-[10px] text-hueso/35 hover:text-hueso/60">
          {FUENTE.texto}
        </a>
      )}
      <span className="sr-only">{detalle}</span>
    </span>
  );
}
