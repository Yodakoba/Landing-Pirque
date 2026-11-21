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
 *
 * Con `dentro`, la tarjeta **vive adentro de otra** —una persona dentro de
 * su puesto, en la ventana del equipo del día— y su borde baja a 2px y se
 * aclara: el marco que manda es el del grupo (`marcoGrupo`). Ver ahí.
 */
export function marcoTarjeta(abierta: boolean, tono: TonoTarjeta = 'normal', tenida = false, dentro = false): string {
  const base = `rounded-2xl ${dentro ? 'border-2' : 'border-[3px]'}`;
  if (abierta) return `${base} border-oro bg-panel shadow-lg ${dentro ? 'ring-2' : 'ring-4'} ring-oro/25`;
  const sombra = dentro ? 'shadow-sm' : 'shadow-md';
  switch (tono) {
    case 'verde': return `${base} border-verde-fuerte/80 ${sombra} ${tenida ? 'bg-verde/[0.06]' : 'bg-panel'}`;
    case 'rojo': return `${base} border-rojo-fuerte/70 ${sombra} ${tenida ? 'bg-rojo/[0.05]' : 'bg-panel'}`;
    case 'apagada': return `${base} border-dashed border-hueso/40 bg-transparent`;
    default: return `${base} ${dentro ? 'border-hueso/35' : 'border-hueso/55'} bg-panel ${sombra}`;
  }
}

/**
 * **El marco de un grupo de tarjetas**: un puesto en la ventana del equipo del
 * día (2026-11-21, lo pidió el cliente: *"los bordes de las tarjetas de los
 * distintos puestos… también pueden ayudar a ordenar la vista"*). Con `falta`,
 * en ámbar: el puesto que no alcanza se ve desde lejos.
 *
 * **El marco del grupo es el más marcado de todo lo que tiene adentro**
 * (2026-11-21, lo pidió el cliente con una foto: *"debería ser más grueso el
 * marco de la tarjeta que los marcos de los botones e informaciones dentro de
 * la tarjeta… para identificar bien a buena vista, aquí estoy dentro de una
 * tarjeta. Entonces el marco principal y luego adentro los marcos son
 * menos"*). Nació con los 3px de siempre pero **más claro** que las tarjetas
 * de adentro, y se leía al revés: la persona parecía la tarjeta y el puesto
 * una línea fina. Ahora son tres escalones, de afuera hacia adentro:
 *
 * | Qué | Borde |
 * |---|---|
 * | El grupo (el puesto) | 3px, oscuro (`hueso/60`) |
 * | La tarjeta de adentro (`marcoTarjeta(…, dentro)`) | 2px, medio (`hueso/35`) |
 * | Botones y campos | 2px o menos, claros (`hueso/20`) |
 *
 * El título del grupo va con `TITULO_GRUPO`, en negrita: es el nombre de la
 * tarjeta.
 */
export function marcoGrupo(falta = false): string {
  return `rounded-2xl border-[3px] shadow-md ${falta ? 'border-ambar-fuerte bg-ambar/5' : 'border-hueso/60 bg-hueso/[0.03]'}`;
}

/** El título de un grupo: el nombre del puesto, en negrita y un punto más grande. */
export const TITULO_GRUPO = 'text-[16px] font-bold leading-tight';

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
