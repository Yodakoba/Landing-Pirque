'use client';

/**
 * El pronóstico de un día en chico: "☀️ 28°".
 *
 * Va en los tres calendarios y en la página del día, siempre en el aire que
 * ya había bajo la fecha, para no cambiar el alto de nada —la misma regla
 * que `PuntoDia`—. El detalle (mínima, probabilidad de lluvia) va en el
 * `title`: a la vista, lo único que hace falta es saber si hay sol o agua.
 *
 * Un día sin pronóstico —más allá de los 16 días, o si Open-Meteo no
 * respondió— no dibuja nada.
 */
import { useEffect, useState } from 'react';
import { iconoDe, climaEnPalabras, type Clima as DatoClima } from '@/lib/clima';

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

export default function Clima({ c, grande = false }: { c?: DatoClima; grande?: boolean }) {
  if (!c) return null;
  const { icono } = iconoDe(c.codigo);
  const detalle = climaEnPalabras(c);
  return (
    <span title={detalle}
      className={`inline-flex items-center gap-1 whitespace-nowrap font-normal normal-case
                  tracking-normal text-hueso/60 ${grande ? 'text-sm' : 'text-[10px] leading-none'}`}>
      <span aria-hidden>{icono}</span>
      {c.max !== null && <span aria-hidden>{Math.round(c.max)}°</span>}
      {grande && c.lluvia !== null && c.lluvia >= 30 && (
        <span aria-hidden className="text-sky-300/80">{Math.round(c.lluvia)}% lluvia</span>
      )}
      <span className="sr-only">{detalle}</span>
    </span>
  );
}
