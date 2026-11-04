'use client';

/**
 * **El aviso que sale abajo de la pantalla y se va solo** (2026-11-04).
 *
 * Lo pidió el cliente: al apretar *Copiar link personal* no pasaba nada a
 * la vista. El mensaje "Link copiado" existía, pero se dibujaba **arriba de
 * la página**, y el botón vive en una ficha o una semana más abajo: el aviso
 * quedaba fuera de la pantalla y el botón parecía muerto. Copiar no cambia
 * nada visible, así que sin un aviso que se vea no hay forma de saber que
 * funcionó.
 *
 * - **Uno solo para todo el panel**, montado en el layout. Las pantallas no
 *   lo dibujan: llaman `avisar('…')`, que manda un evento del navegador. Así
 *   no hay que pasar un estado por cinco componentes para decir dos palabras.
 * - **Fijo abajo al centro**, por encima de las ventanas (`z-[60]`, las
 *   ventanas van en 50): se copia también desde adentro de una.
 * - **Se va solo a los 3 segundos.** Es una confirmación, no algo que haya
 *   que cerrar; uno nuevo reemplaza al anterior y reinicia la cuenta.
 * - **`role="status"`**, así un lector de pantalla también lo dice.
 */
import { useEffect, useRef, useState } from 'react';

const EVENTO = 'brasas-aviso';

/**
 * Muestra un aviso corto abajo de la pantalla. `atencion` lo pinta en ámbar
 * y con "!" en vez del ✓ verde: un aviso de que **no** pasó lo esperado
 * —no se descargó nada, quedó alguien fuera— no puede verse igual que uno
 * de que salió bien.
 */
export function avisar(texto: string, tono: 'ok' | 'atencion' = 'ok') {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { texto, tono } }));
}

/**
 * Copia un texto y lo confirma con un aviso. Sin portapapeles —pasa en
 * algunos navegadores sin HTTPS— lo muestra para copiarlo a mano, en vez de
 * no hacer nada.
 */
export function copiarConAviso(texto: string, aviso: string, siFalla: string) {
  if (!navigator.clipboard) { window.prompt(siFalla, texto); return; }
  navigator.clipboard.writeText(texto)
    .then(() => avisar(aviso))
    .catch(() => window.prompt(siFalla, texto));
}

export default function AvisoFlotante() {
  const [aviso, setAviso] = useState<{ texto: string; tono: 'ok' | 'atencion' } | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const oir = (e: Event) => {
      setAviso((e as CustomEvent<{ texto: string; tono: 'ok' | 'atencion' }>).detail);
      clearTimeout(reloj.current);
      reloj.current = setTimeout(() => setAviso(null), 3000);
    };
    window.addEventListener(EVENTO, oir);
    return () => { window.removeEventListener(EVENTO, oir); clearTimeout(reloj.current); };
  }, []);

  return (
    <div role="status" aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      {aviso && (
        <p className={`aviso-flotante flex items-center gap-2 rounded-full border-2 bg-panel
                       px-5 py-3 text-[15px] font-semibold text-hueso shadow-lg ${
          aviso.tono === 'ok' ? 'border-verde-fuerte' : 'border-ambar-fuerte'}`}>
          <span aria-hidden className={aviso.tono === 'ok'
            ? 'text-verde-texto' : 'font-black text-ambar-texto'}>
            {aviso.tono === 'ok' ? '✓' : '!'}
          </span>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
