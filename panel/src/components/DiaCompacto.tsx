'use client';

/**
 * **Un día del calendario, en chico** (2026-11-05).
 *
 * Lo pidió el cliente: *"solo las próximas 2 semanas tienen los paneles
 * completamente abiertos, y a partir de la tercera semana las fechas se
 * convierten en un campo más chico, y apenas lo aprieto se abre toda la
 * línea"*. Con 90 días de tarjetas completas había que hacer scroll hasta
 * perder la orientación, y lo que se mira de un sábado de dentro de un mes
 * es poco: qué día es, cómo está y cuánta gente va.
 *
 * Es **un botón entero**: apretarlo abre la semana completa, con sus
 * tarjetas de siempre. Lleva el mismo color de borde que la tarjeta grande
 * y la misma palabra bajo el punto (`PuntoDia`), para que un día se lea
 * igual en chico y en grande.
 */
import type { Ocupacion } from '@/lib/tipos';
import { enPalabras } from '@/lib/fechas';
import PuntoDia from './PuntoDia';
import { COLOR_TARJETA, sinConfigurar } from './TarjetaDia';

export default function DiaCompacto({ d, onAbrir }: {
  d: Ocupacion;
  onAbrir: () => void;
}) {
  const conCupo = !sinConfigurar(d) && d.capacidad > 0;
  return (
    <button type="button" onClick={onAbrir}
      title="Ampliar la semana"
      className={`tecla flex w-full min-w-0 flex-col gap-1.5 rounded-xl border-2 px-3 py-2
                  text-left hover:border-oro/70 ${COLOR_TARJETA(d)}`}>
      {/* Arriba la fecha y el estado; abajo la barra y cuánta gente. En
          dos líneas para que la fecha no se corte en una columna angosta. */}
      <span className="flex w-full items-start justify-between gap-2">
        <span className="min-w-0 text-[15px] font-semibold leading-tight first-letter:uppercase">
          {enPalabras(d.fecha)}
        </span>
        <PuntoDia d={d} />
      </span>
      <span className="flex w-full items-center gap-3">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-hueso/15">
          {conCupo && (
            <span className="block h-full bg-verde-fuerte"
              style={{ width: `${Math.min(100, Math.round((d.tomadas / d.capacidad) * 100))}%` }} />
          )}
        </span>
        <span className="shrink-0 text-[15px] font-bold tabular-nums">
          {d.tomadas}
          {conCupo && <span className="text-hueso/50">/{d.capacidad}</span>}
          <span className="ml-1 text-[13px] font-normal text-hueso/65">pers.</span>
        </span>
      </span>
    </button>
  );
}
