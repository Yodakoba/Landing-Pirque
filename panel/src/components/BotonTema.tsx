'use client';

/**
 * El interruptor entre el tema oscuro y el claro.
 *
 * **Arranca en oscuro, no en el del sistema** (2026-10-30). Seguir a
 * `prefers-color-scheme` suena más fino y acá habría sido un problema real:
 * el panel lo usa gente a la que recién se le enseñó dónde queda cada cosa,
 * y la mitad del equipo habría abierto un panel blanco sin haberlo pedido,
 * distinto del que le mostraron. Que sea una decisión de cada uno, y que se
 * recuerde, es más lento de descubrir y mucho más tranquilo de usar.
 *
 * **Se recuerda en `localStorage`**, o sea por navegador y por dispositivo:
 * el teléfono de la jefa de turno puede estar en claro y el computador de la
 * oficina en oscuro. Si está bloqueado —navegación privada— el panel abre en
 * oscuro y el botón sigue funcionando para esa sesión; molesto, no roto.
 *
 * **Quien pinta el tema al cargar NO es este componente**, sino el guion de
 * `layout.tsx`, que corre antes de dibujar. Si esperara a React, la pantalla
 * aparecería negra y pegaría un salto a blanco en cada carga.
 */
import { useEffect, useState } from 'react';

export const LLAVE_TEMA = 'brasas-tema';

export default function BotonTema() {
  const [claro, setClaro] = useState(false);

  // Lo que ya pintó el guion del `layout` es la verdad: acá solo se lee,
  // para que el botón nazca diciendo lo que corresponde.
  useEffect(() => {
    setClaro(document.documentElement.dataset.tema === 'claro');
  }, []);

  const cambiar = () => {
    const nuevo = !claro;
    setClaro(nuevo);
    document.documentElement.dataset.tema = nuevo ? 'claro' : 'oscuro';
    try {
      localStorage.setItem(LLAVE_TEMA, nuevo ? 'claro' : 'oscuro');
    } catch {
      // Navegación privada o cookies bloqueadas: vale para esta sesión.
    }
  };

  return (
    <button onClick={cambiar} type="button"
      aria-pressed={claro}
      title={claro ? 'Cambiar al tema oscuro' : 'Cambiar al tema claro'}
      className="tecla rounded-full border border-hueso/20 px-2.5 py-1 text-xs
                 text-hueso/60 hover:border-oro hover:text-oro">
      <span aria-hidden>{claro ? '☾' : '☀'}</span>
      <span className="sr-only">
        {claro ? 'Cambiar al tema oscuro' : 'Cambiar al tema claro'}
      </span>
    </button>
  );
}
