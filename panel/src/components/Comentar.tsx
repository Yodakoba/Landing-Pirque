'use client';

/**
 * **💬 Comentar**, en la cabecera de todas las pantallas (2026-11-12): el
 * botón y su ventana. El formulario es `FormularioComentario`, el mismo de la
 * misión *Tu voz* de la ayuda, y guarda lo escrito si se cierra sin mandar.
 */
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Dialogo from './Dialogo';
import FormularioComentario from './FormularioComentario';
import { pantallaDeRuta } from '@/lib/ayudaRol';

export default function Comentar() {
  const ruta = usePathname();
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      {/* **En rosado, para que se vea en todas las pantallas** (2026-11-13, lo
          pidió el cliente: el formulario tiene que estar *muy presente*). Es
          el color de Tu voz en la ayuda; no es relleno, así que no compite con
          el botón principal de cada pantalla. */}
      <button type="button" onClick={() => setAbierta(true)}
        className="tecla boton border-2 border-rosa-fuerte/70 bg-rosa/10 font-bold text-rosa-texto"
        title="Cuéntanos un error, una duda o algo que te falta">
        💬 Comentar
      </button>

      {abierta && (
        <Dialogo titulo="Comentar" onCerrar={() => setAbierta(false)}>
          <p className="mt-2 text-[14px] text-hueso/70">
            Errores, dudas, ideas y, sobre todo, lo que te falta para tu trabajo.
          </p>
          <div className="mt-3">
            <FormularioComentario pantalla={pantallaDeRuta(ruta)} onCerrar={() => setAbierta(false)} />
          </div>
        </Dialogo>
      )}
    </>
  );
}
