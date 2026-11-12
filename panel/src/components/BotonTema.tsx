'use client';

/**
 * El interruptor entre el tema oscuro y el claro.
 *
 * **Arranca en claro** (2026-11-01, lo decidió el cliente: *"cambia la
 * configuración predeterminada a diurno, es mucho más lindo"*). Hasta
 * entonces arrancaba en oscuro, con el argumento de que el equipo había
 * aprendido el panel así; ganó el otro, que es que esto se abre de día y en
 * un teléfono, muchas veces al sol.
 *
 * **Lo que NO cambió es que no sigue a `prefers-color-scheme`**, y ese
 * argumento sí se sostiene: el panel lo usa gente a la que recién se le
 * enseñó dónde queda cada cosa, y que la pantalla dependa de una
 * configuración del sistema operativo que nadie recuerda haber tocado deja a
 * media docena de personas viendo cosas distintas. Hay un valor por defecto,
 * y encima la decisión de cada uno.
 *
 * **Se recuerda en `localStorage`**, o sea por navegador y por dispositivo:
 * el teléfono de la jefa de turno puede estar en oscuro y el computador de
 * la oficina en claro. Si está bloqueado —navegación privada— el panel abre
 * en claro y el botón sigue funcionando para esa sesión; molesto, no roto.
 *
 * **Quien pinta el tema al cargar NO es este componente**, sino el guion de
 * `layout.tsx`, que corre antes de dibujar. Si esperara a React, a quien
 * eligió el oscuro le aparecería la pantalla clara y pegaría un salto a
 * negro en cada carga.
 */
import { useEffect, useState } from 'react';

export const LLAVE_TEMA = 'brasas-tema';

export default function BotonTema() {
  const [claro, setClaro] = useState(true);

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
      /* **36px, no 26** (2026-11-12): era uno de los tres botones que la
         revisión PlayStation marcaba bajo el piso. Redondo y del mismo
         alto que lo que lo rodea, con el signo a 16px. */
      className="tecla inline-flex h-9 w-9 shrink-0 items-center justify-center
                 rounded-full border border-hueso/20 text-base
                 text-hueso/60 hover:border-oro hover:text-oro">
      <span aria-hidden>{claro ? '☾' : '☀'}</span>
      <span className="sr-only">
        {claro ? 'Cambiar al tema oscuro' : 'Cambiar al tema claro'}
      </span>
    </button>
  );
}
