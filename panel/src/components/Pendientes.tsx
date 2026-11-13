'use client';
/**
 * **Los pendientes, en una fila de pastillas** (2026-11-13, lo pidió el
 * cliente mirando Cotizaciones: los avisos apilados, cada uno con su fila de
 * pastillas, *"se anotan como lista Excel"* y empujaban el calendario a tres
 * pantallas en el celular).
 *
 * - **Una pastilla por tipo**, con su número y su ícono, **en orden de
 *   urgencia**: lo que tiene algo vencido va primero y con fondo rojo suave.
 * - **Apretar una abre su lista ahí mismo, una a la vez**; apretarla de nuevo
 *   la cierra. Cerradas, todas ocupan una o dos líneas.
 * - **La lista son filas cortas** (`FilaPendiente`): quién, lo que importa y
 *   *Abrir →*.
 */
import { useState } from 'react';

export type TonoPendiente = 'rojo' | 'ambar' | 'verde' | 'rosa' | 'neutro';

export interface Pendiente {
  clave: string;
  icono: string;
  /** *"5 cobros por revisar"*. */
  texto: string;
  /** *"1 vencido"*: va al lado, más fuerte. */
  urgente?: string;
  tono: TonoPendiente;
  /** Una frase que dice qué hacer, arriba de la lista abierta. */
  ayuda?: string;
  lista: React.ReactNode;
}

const PASTILLA: Record<TonoPendiente, string> = {
  rojo: 'border-rojo-fuerte/70 bg-rojo/10 text-rojo-texto',
  ambar: 'border-ambar-fuerte/60 bg-ambar/[0.08] text-ambar-texto',
  verde: 'border-verde-fuerte/60 bg-verde/[0.08] text-verde-texto',
  rosa: 'border-rosa-fuerte/50 bg-rosa/[0.08] text-rosa-texto',
  neutro: 'border-hueso/25 bg-panel text-hueso/85'
};
const CAJA: Record<TonoPendiente, string> = {
  rojo: 'border-rojo-fuerte/50 bg-rojo/[0.06]',
  ambar: 'border-ambar-fuerte/40 bg-ambar/[0.05]',
  verde: 'border-verde-fuerte/40 bg-verde/[0.05]',
  rosa: 'border-rosa-fuerte/40 bg-rosa/[0.05]',
  neutro: 'border-hueso/20 bg-panel'
};

export default function Pendientes({ items, titulo = 'Pendientes' }: { items: Pendiente[]; titulo?: string }) {
  const [abierta, setAbierta] = useState('');
  if (!items.length) return null;
  const abiertaItem = items.find((x) => x.clave === abierta);
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={titulo}>
        <span className="text-[13px] font-semibold uppercase tracking-widest text-hueso/65">{titulo}</span>
        {items.map((x) => (
          <button key={x.clave} type="button" aria-expanded={abierta === x.clave}
            onClick={() => setAbierta(abierta === x.clave ? '' : x.clave)}
            className={`tecla inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-2 px-3 text-[14px] font-semibold
              ${PASTILLA[x.tono]} ${abierta === x.clave ? 'ring-2 ring-oro/60' : ''}`}>
            <span aria-hidden>{x.icono}</span>{x.texto}
            {x.urgente && <span className="rounded-full bg-rojo-fuerte px-1.5 text-[13px] font-bold text-white">{x.urgente}</span>}
            <span aria-hidden className="text-[13px] opacity-70">{abierta === x.clave ? '▴' : '▾'}</span>
          </button>
        ))}
      </div>
      {abiertaItem && (
        <div className={`mt-2 rounded-xl border-2 p-2 ${CAJA[abiertaItem.tono]}`}>
          {abiertaItem.ayuda && <p className="px-1 pb-2 text-[14px] text-hueso/80">{abiertaItem.ayuda}</p>}
          {abiertaItem.lista}
        </div>
      )}
    </div>
  );
}

/** Una fila corta de una lista de pendientes: quién, el dato y *Abrir →*. */
export function FilaPendiente({ quien, dato, rojo = false, onAbrir }: {
  quien: string; dato: string; rojo?: boolean; onAbrir: () => void;
}) {
  return (
    <button type="button" onClick={onAbrir}
      className={`tecla flex min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border bg-panel px-3 py-1.5 text-left
        hover:border-oro ${rojo ? 'border-rojo-fuerte/60' : 'border-hueso/15'}`}>
      <span className="text-[15px] font-semibold">{quien}</span>
      <span className={`text-[14px] ${rojo ? 'font-semibold text-rojo-texto' : 'text-hueso/75'}`}>{dato}</span>
      <span className="ml-auto text-[14px] font-semibold text-oro">Abrir →</span>
    </button>
  );
}
