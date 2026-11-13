'use client';
/**
 * **Un aviso fijo, con su ✕** (2026-11-13, lo pidió el cliente: primero en
 * Cotizaciones y después *"en los otros avisos fijos del panel"*).
 *
 * Un aviso fijo es un texto que explica la pantalla y no cambia con los
 * datos. Va en **su propia cajita** —un fondo apenas marcado y un borde
 * fino— con **una ✕ redonda arriba a la derecha**: al apretarla
 * desaparece **la cajita entera**, no solo el texto. El primer corte ponía
 * *✕ No mostrar más* dentro de la banda de la sección, y al cerrarlo la banda
 * —que es el título y se queda— parecía el aviso sin cerrar.
 *
 * Se cierra para siempre por cuenta: ver `usarAvisoCerrable`. La clave tiene
 * que estar en `AVISOS_CERRABLES` (`lib/avisos.ts`).
 *
 * `className` lleva el margen y el ancho; la letra de adentro es la de
 * siempre de estos textos (14px, hueso al 75%).
 */
import type { ReactNode } from 'react';
import type { AvisoCerrable } from '@/lib/avisos';
import { usarAvisoCerrable } from './usarAvisoCerrable';

export default function AvisoFijo({ clave, className = '', children, delServidor }: {
  clave: AvisoCerrable;
  className?: string;
  children: ReactNode;
  /** Si la ruta de la pantalla ya trae la lista de la cuenta (Cotizaciones). */
  delServidor?: string[];
}) {
  const { leido, cerrar } = usarAvisoCerrable(clave, delServidor);
  if (leido) return null;
  return (
    <div role="note"
      className={`flex items-start gap-2 rounded-xl border border-hueso/15 bg-hueso/[0.03] py-1.5 pl-3 pr-1.5 ${className}`}>
      <div className="min-w-0 flex-1 py-2 text-[14px] leading-snug text-hueso/75">{children}</div>
      <button type="button" onClick={() => void cerrar()}
        aria-label="Cerrar este aviso: ya lo leí, no mostrarlo más" title="Ya lo leí: no mostrar más"
        className="tecla flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2
                   border-hueso/25 text-[16px] font-bold leading-none text-hueso/70
                   hover:border-hueso/50 hover:bg-hueso/10 hover:text-hueso">
        ✕
      </button>
    </div>
  );
}
