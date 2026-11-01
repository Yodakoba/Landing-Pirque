'use client';

/**
 * El botón que convierte el presupuesto en PDF.
 *
 * **Es la impresión del navegador, no una librería.** Se eligió así sobre
 * generar el archivo en el servidor, y las razones son concretas: una
 * librería de PDF pesa megas en la función de Vercel, obliga a incrustar
 * fuentes para que salgan las tildes y la ñ, y cada cambio de diseño cuesta
 * el triple. Con `window.print()` el navegador ofrece "Guardar como PDF"
 * —en el teléfono también— y lo que sale es un PDF de verdad, con el mismo
 * diseño que se ve en pantalla.
 *
 * Y queda algo que un archivo no da: **el link sigue vivo**. Si mañana se
 * corrige un precio, el cliente abre el mismo link y ve lo corregido, en
 * vez de quedarse con un adjunto viejo que nadie sabe que lo es.
 */
export default function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="boton boton-relleno">
      Descargar PDF
    </button>
  );
}
