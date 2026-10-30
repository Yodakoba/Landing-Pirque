'use client';

/**
 * El punto de color de un día, **con su palabra debajo**.
 *
 * Nació el 2026-10-23 de un pedido del cliente, y la razón es de espacio:
 * decir "privado · no está en el sitio" en una línea aparte empujaba la
 * tarjeta hacia abajo, y entonces los días de una misma semana dejaban de
 * medir lo mismo según su estado. Bajo el punto, en cambio, **hay espacio de
 * sobra y nada se mueve**: la palabra ocupa el aire que ya estaba ahí.
 *
 * Y vale para **todos los calendarios** —la portada, `/turnos`, `/extras`—,
 * que es como lo pidió: un día se lee igual en cualquier pantalla. Por eso
 * esto es un componente y no tres bloques parecidos.
 *
 * Los cinco estados son excluyentes y se leen de arriba abajo:
 *
 * - **preparación** — hay equipo y no entra público. Gana sobre "cerrado"
 *   porque es más específico: ese día igual se trabaja.
 * - **cerrado** · **privado** · **sin cupo** · **público**.
 */
import type { Ocupacion } from '@/lib/tipos';
import { PUNTO_TARJETA, sinConfigurar } from './TarjetaDia';

type Estado = 'preparacion' | 'cerrado' | 'privado' | 'sinCupo' | 'publico';

const PALABRA: Record<Estado, { texto: string; clase: string; punto?: string }> = {
  preparacion: { texto: 'preparación', clase: 'text-oro/80', punto: '🟡' },
  cerrado: { texto: 'cerrado', clase: 'text-rojo-texto/80' },
  privado: { texto: 'privado', clase: 'text-cielo-texto/80' },
  sinCupo: { texto: 'sin cupo', clase: 'text-hueso/35' },
  publico: { texto: 'público', clase: 'text-hueso/40' }
};

export function estadoDia(d: Ocupacion | undefined, preparacion = false): Estado | null {
  if (preparacion) return 'preparacion';
  if (!d) return null;
  if (d.bloqueada) return 'cerrado';
  if (d.privada) return 'privado';
  if (sinConfigurar(d)) return 'sinCupo';
  return 'publico';
}

export default function PuntoDia({ d, preparacion = false }: {
  /** La ocupación del día, o `undefined` si ese día no recibe público. */
  d?: Ocupacion;
  /** Si ese día tiene equipo y no abre: entonces es de preparación. */
  preparacion?: boolean;
}) {
  const estado = estadoDia(d, preparacion);
  // Un día sin ocupación y sin equipo no es ningún estado: no hay nada que
  // decir de él, y una palabra ahí sería ruido en todas las celdas vacías.
  if (!estado) return null;
  const { texto, clase, punto } = PALABRA[estado];

  return (
    <span className="flex shrink-0 flex-col items-end leading-none">
      <span aria-hidden>{punto ?? (d ? PUNTO_TARJETA(d) : '🟡')}</span>
      <span className={`mt-1 text-[9px] uppercase tracking-wide ${clase}`}>
        {texto}
      </span>
    </span>
  );
}
