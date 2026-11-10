'use client';

/**
 * El botón que trae de vuelta lo desactivado, en `/equipo`, `/extras` y
 * Productos (2026-11-10, lo pidió el cliente: *"un botón grande, bien
 * visible"*).
 *
 * Era una casilla de 13px en una sola de las tres pantallas. Lo desactivado
 * no se borra —sus turnos, sus días o sus ventas son el registro— así que
 * estas listas solo crecen, y lo único que separa la lista de hoy de la de
 * hace dos años es este botón: tiene que verse.
 *
 * - **Dice cuántos son**, para que nadie los dé por perdidos.
 * - **Apretado queda marcado** (tinte dorado, no relleno: el relleno de la
 *   pantalla es *Guardar*) y cambia a *Ocultar*.
 * - **Si no hay ninguno no se dibuja**: un botón que no trae nada enseña a
 *   desconfiar de los demás.
 *
 * Un solo componente para las tres, para que se usen igual.
 */
export default function MostrarDesactivados({
  cuantos, visible, onCambio
}: {
  cuantos: number;
  visible: boolean;
  onCambio: (v: boolean) => void;
}) {
  if (cuantos <= 0) return null;
  return (
    <button type="button" aria-pressed={visible} onClick={() => onCambio(!visible)}
      className={`boton mb-3 min-h-[44px] px-4 text-[14px] font-semibold ${visible
        ? '!border-oro bg-oro/15 text-hueso'
        : ''}`}>
      {visible ? 'Ocultar desactivados' : 'Mostrar desactivados'}
      <span className="ml-2 rounded-full border border-hueso/30 px-2 py-0.5 text-[13px]">
        {cuantos}
      </span>
    </button>
  );
}
