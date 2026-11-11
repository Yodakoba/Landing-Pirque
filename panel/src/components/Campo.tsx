'use client';
import AyudaCorta from './AyudaCorta';

/**
 * Un campo con su rótulo encima.
 *
 * El rótulo va pegado al campo y no en una cabecera de tabla lejana: con una
 * tarjeta por persona, una fila de encabezados arriba del todo obligaría a
 * contar columnas para saber qué es cada caja.
 *
 * **Vive en su propio archivo y fuera de todo componente, y eso no es
 * estilo.** Un componente declarado dentro de otro es una función nueva en
 * cada dibujado, así que para React es **otro tipo de elemento**: desmonta
 * lo que había y monta uno nuevo. Con un `input` adentro eso significa
 * perder el foco a la primera letra — se escribía una y el resto del nombre
 * se iba al vacío. Así se rompió `/equipo` el día que pasó a tarjetas, y el
 * síntoma no se parece en nada a su causa.
 */
export default function Campo({ etiqueta, ancho, ayuda, children }: {
  etiqueta: string;
  /** Una llave de `AYUDAS_CORTAS`: pone el `?` chico al lado del rótulo. */
  ayuda?: string;
  /** Clases de ancho; en una ventana angosta suele ser `w-full`. */
  ancho: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${ancho}`}>
      {/* **13px al 60%, no 10 al 35** (2026-11-01). Era el rótulo más chico
          del panel y está en el lugar donde menos corresponde: es lo único
          que dice qué se está escribiendo en esa caja. La regla pone el piso
          en 13 y reserva las opacidades bajas para lo secundario — un rótulo
          que hay que leer para no escribir el precio en la casilla de las
          personas no lo es.

          Vale para las cuatro pantallas que lo usan de una vez, que es la
          gracia de que esto viva en un archivo. */}
      <span className="mb-1 block text-[13px] font-medium uppercase
                       tracking-wide text-hueso/60">
        {etiqueta}
        {ayuda && <AyudaCorta tema={ayuda} />}
      </span>
      {children}
    </label>
  );
}
