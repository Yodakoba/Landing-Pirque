/**
 * **El botón *Mías*, igual en todo el panel** (2026-11-13, lo pidió el
 * cliente: *"ya en varios textos existe el botón mías —reserva mía,
 * cotización mía— y quiero que sutilmente le des un aspecto uniforme por
 * todo el sitio… no cambies nada en la estructura"*).
 *
 * Había tres formas: *Mías / De todos* en Cotizaciones con borde celeste, el
 * *👤 Mías* de la página del día y el *Mías / Todas* del bloque de sobrecupo,
 * los dos en dorado —el mismo dorado de los filtros del pago en la página
 * del día—. Ahora es uno solo:
 *
 * - **Pastilla redonda con 👤** (y 👥 para su pareja *De todos* / *Todas*),
 *   el número en una burbujita al lado.
 * - **Elegido, en celeste**, el que ya usaba Cotizaciones: así se distingue
 *   de los filtros dorados que pueden ir al lado.
 *
 * Solo el aspecto: cada pantalla sigue decidiendo qué filtra y cómo.
 */
import type { ReactNode } from 'react';

function Pastilla({ icono, texto, cuantas, elegido, onClick }: {
  icono: string; texto: ReactNode; cuantas?: number; elegido: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={elegido}
      className={`boton min-h-[44px] gap-1.5 rounded-full px-3.5 ${elegido
        ? '!border-cielo-fuerte bg-cielo/15 font-semibold text-cielo-texto' : ''}`}>
      <span aria-hidden>{icono}</span>
      {texto}
      {cuantas !== undefined && (
        <span className={`min-w-[1.5rem] rounded-full px-1.5 text-center text-[13px] font-bold tabular-nums ${elegido
          ? 'bg-cielo-fuerte/25' : 'bg-hueso/10'}`}>{cuantas}</span>
      )}
    </button>
  );
}

/** *👤 Mías*: lo de esta cuenta. */
export function BotonMias(p: { cuantas?: number; elegido: boolean; onClick: () => void; texto?: string }) {
  return <Pastilla icono="👤" texto={p.texto ?? 'Mías'} cuantas={p.cuantas} elegido={p.elegido} onClick={p.onClick} />;
}

/** *👥 De todos* / *👥 Todas*: la pareja de *Mías*, donde la hay. */
export function BotonTodos(p: { cuantas?: number; elegido: boolean; onClick: () => void; texto: string }) {
  return <Pastilla icono="👥" texto={p.texto} cuantas={p.cuantas} elegido={p.elegido} onClick={p.onClick} />;
}
