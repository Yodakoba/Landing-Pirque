'use client';

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
export default function Campo({ etiqueta, ancho, children }: {
  etiqueta: string;
  /** Clases de ancho; en una ventana angosta suele ser `w-full`. */
  ancho: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${ancho}`}>
      <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-hueso/35">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}
