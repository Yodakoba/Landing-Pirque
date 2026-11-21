'use client';

/**
 * **El puesto habitual de una persona, elegido de los puestos que existen**
 * (2026-11-21).
 *
 * Lo pidió el cliente con una foto de la ficha que se abre desde el equipo
 * del día: *"el puesto habitual se debería alimentar desde los posibles
 * puestos existentes, como un drop-down"*. Ahí era un campo de texto, y en la
 * foto decía *Parrillero* mientras el puesto se llama *Asistente parrillero*.
 * El puesto habitual es lo que preselecciona a la persona en el planificador:
 * escrito de otra forma no preselecciona nada, y nadie se entera.
 *
 * La ficha de la lista de Equipo ya lo elegía de una lista; la de la ventana,
 * no. Ahora las dos usan esta pieza, así que no pueden volver a separarse.
 *
 * - Un puesto guardado antes que ya no está en la lista **se conserva** como
 *   opción, marcado *(ya no existe)*: si no, guardar la ficha lo borraría sin
 *   avisar.
 * - Uno escrito con otras mayúsculas o tildes se reconoce como el de la lista.
 */
import { normalizar } from '@/lib/columnas';

export default function ElegirPuesto({ valor, puestos, quien, className, onCambio }: {
  valor: string;
  /** Los nombres de los puestos, en el orden de la pestaña Puestos. */
  puestos: string[];
  /** De quién es, para el nombre accesible del campo. */
  quien: string;
  className: string;
  onCambio: (puesto: string) => void;
}) {
  const elegido = puestos.find((p) => normalizar(p) === normalizar(valor)) ?? valor;
  return (
    <select value={elegido} className={className}
      aria-label={`Puesto habitual de ${quien || 'esta persona'}`}
      onChange={(e) => onCambio(e.target.value)}>
      <option value="">—</option>
      {puestos.map((p) => <option key={p} value={p}>{p}</option>)}
      {elegido && !puestos.includes(elegido) && (
        <option value={elegido}>{elegido} (ya no existe)</option>
      )}
    </select>
  );
}
