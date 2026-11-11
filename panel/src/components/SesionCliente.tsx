'use client';

/**
 * **Quién está mirando, para las pantallas** (2026-11-11). El rol y la vista
 * gerencia bajan una sola vez desde el layout —que los lee de la cookie
 * firmada, en el servidor— y cualquier componente los pregunta con
 * `usarSoloMira()` sin que cada página tenga que pasarlos de mano en mano.
 *
 * **Solo decide qué se dibuja.** Escribir lo vuelve a comprobar cada ruta
 * con `exigir()`; esto es para que quien mira con la vista gerencia no se
 * encuentre botones que el servidor después le rechaza.
 */
import { createContext, useContext } from 'react';
import { puede, type Accion, type Rol } from '@/lib/auth';

const Sesion = createContext<{ rol: string; gerencia: boolean }>({ rol: '', gerencia: false });

export function SesionCliente({ rol, gerencia, children }: {
  rol: string; gerencia: boolean; children: React.ReactNode;
}) {
  return <Sesion.Provider value={{ rol, gerencia }}>{children}</Sesion.Provider>;
}

/**
 * **Si esta parte se mira y no se toca**: la cuenta la ve por la vista
 * gerencia, pero su rol no tiene `accion`. Sin vista gerencia es siempre
 * `false`, así que para todos los demás nada cambia.
 */
export function usarSoloMira(accion: Accion): boolean {
  const { rol, gerencia } = useContext(Sesion);
  return gerencia && !puede(rol as Rol, accion);
}

/** La franja que lo dice dentro de una ventana o de un bloque. */
export function AvisoSoloMira({ que = 'esto' }: { que?: string }) {
  return (
    <p className="mt-3 rounded-xl border-2 border-cielo-fuerte/60 bg-cielo/10 px-3 py-2 text-[14px]">
      <strong className="text-cielo-texto">👁 Solo miras {que}.</strong>{' '}
      Lo ves por la vista gerencia; tu rol no lo cambia.
    </p>
  );
}
