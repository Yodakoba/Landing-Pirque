/**
 * **La tarjeta de una lista que se abre**: el marco, el signo + / − y el pie
 * para cerrarla (2026-11-21, lo pidió el cliente: *"aplica los bordes más
 * marcados en todos lados… se debería sentir en cada pestaña de forma
 * similar si mostramos información similar"*).
 *
 * Nació en el informe y es **la misma pieza** en cada lista de fichas que se
 * abren —Informe, Equipo, Extras, Vendedores, Clientes, Productos y la
 * Recepción—, por la regla de coherencia: lo que en una pantalla es una
 * tarjeta con borde marcado no es una línea fina en otra.
 *
 * - **Cerrada**: borde de 3px y oscuro, más grueso que cualquier línea de
 *   adentro (que van de 1 a 2px y claras), con sombra. Así se ve dónde
 *   empieza y dónde termina cada una.
 * - **Abierta**: borde dorado entero con un anillo ancho.
 * - **Tonos**: verde (pagada, o llegó), rojo (no vino), y **apagada** para lo
 *   desactivado, con el borde cortado: se distingue por forma, no solo por
 *   color.
 *
 * Sin estado ni efectos: son clases y dos piezas chicas.
 */
export type TonoTarjeta = 'normal' | 'verde' | 'rojo' | 'apagada';

/**
 * Las clases del `<li>` de cada tarjeta. Con `tenida`, el verde y el rojo
 * tiñen también el fondo (la Recepción: llegó o no vino, de lejos).
 */
export function marcoTarjeta(abierta: boolean, tono: TonoTarjeta = 'normal', tenida = false): string {
  const base = 'rounded-2xl border-[3px]';
  if (abierta) return `${base} border-oro bg-panel shadow-lg ring-4 ring-oro/25`;
  switch (tono) {
    case 'verde': return `${base} border-verde-fuerte/80 shadow-md ${tenida ? 'bg-verde/[0.06]' : 'bg-panel'}`;
    case 'rojo': return `${base} border-rojo-fuerte/70 shadow-md ${tenida ? 'bg-rojo/[0.05]' : 'bg-panel'}`;
    case 'apagada': return `${base} border-dashed border-hueso/40 bg-transparent`;
    default: return `${base} border-hueso/55 bg-panel shadow-md`;
  }
}

/** El espacio entre una tarjeta y la siguiente: 12px, y 8px en el computador. */
export const LISTA_TARJETAS = 'space-y-3 lg:space-y-2';

/** La línea que separa la cabecera de lo de adentro, en una tarjeta abierta. */
export const CUERPO_ABIERTO = 'border-t-2 border-oro/30';

/**
 * **El signo de abrir**: un círculo con + cerrada, y relleno en dorado con −
 * abierta. El tamaño lo puede cambiar quien lo usa (`tamano`).
 */
export function SignoAbrir({ abierta, tamano = 'h-7 w-7 text-[15px]' }: { abierta: boolean; tamano?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full border-2 font-bold ${tamano} ${
      abierta ? 'border-oro bg-oro text-tinta' : 'border-hueso/30 text-hueso/70'}`}>
      {abierta ? '−' : '+'}
    </span>
  );
}

/** **El pie de una tarjeta abierta**: dice dónde termina y la cierra sin subir. */
export function PieCerrar({ nombre, onCerrar, className = '' }: { nombre: string; onCerrar: () => void; className?: string }) {
  return (
    <button type="button" onClick={onCerrar}
      className={`flex min-h-[40px] w-full items-center justify-center gap-2 rounded-b-xl border-t-2
                  border-oro/30 text-[14px] font-semibold text-oro lg:min-h-[36px] ${className}`}>
      ▴ Cerrar{nombre ? ` · ${nombre}` : ''}
    </button>
  );
}
