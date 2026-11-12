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
      <button type="button" onClick={() => setAbierta(true)} className="tecla boton"
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
