/**
 * **El tono de cada calendario** (2026-11-13, lo pidió el cliente): Reservas,
 * Cotizaciones y Turnos tienen que *"sentirse iguales, pero distintivos"*.
 *
 * - **Igual en los tres**: la fecha (`FechaDia`), las tarjetas pintadas por el
 *   estado del día y la forma de la caja de la semana o del mes. Se leen igual.
 * - **Distinto, para saber dónde estás**: un tono por sección, en la banda del
 *   título y en el marco de las cajas. Reservas en **dorado** (el calendario
 *   principal), Cotizaciones en **rosado** (el color que ya significa
 *   "cotizado"), Turnos en **celeste** (el equipo) y, desde el 2026-11-13,
 *   Extras en **añil** (las actividades que se contratan aparte).
 *
 * Las clases van escritas enteras —no armadas con `${tono}`— porque Tailwind
 * solo genera las que encuentra literalmente en el código.
 */
export type Tono = 'oro' | 'rosa' | 'cielo' | 'anil';

export const TONO: Record<Tono, {
  banda: string; icono: string; titulo: string;
  /**
   * La caja de una semana (o del mes, en Turnos y Extras). **Solo el borde
   * fino lleva el tono, sin fondo** (2026-11-13, lo pidió el cliente: el
   * fondo rosado de Cotizaciones *"se junta mucho con los avisos en rojo"*).
   * **La semana en curso va en la misma caja**: la marca `MarcaAhora`, igual
   * en todos.
   */
  caja: string;
}> = {
  oro: {
    banda: 'border-oro/50 bg-oro/10', icono: 'bg-oro text-white', titulo: 'text-oro',
    caja: 'border-oro/30'
  },
  rosa: {
    banda: 'border-rosa-fuerte/50 bg-rosa/10', icono: 'bg-rosa-fuerte text-white', titulo: 'text-rosa-texto',
    caja: 'border-rosa-fuerte/30'
  },
  cielo: {
    banda: 'border-cielo-fuerte/50 bg-cielo/10', icono: 'bg-cielo-fuerte text-white', titulo: 'text-cielo-texto',
    caja: 'border-cielo-fuerte/30'
  },
  anil: {
    banda: 'border-anil-fuerte/50 bg-anil/10', icono: 'bg-anil-fuerte text-white', titulo: 'text-anil-texto',
    caja: 'border-anil-fuerte/30'
  }
};

/**
 * La banda del título de un calendario: ícono, sección, nombre y su `?`.
 *
 * **En una línea** (2026-11-13, lo pidió el cliente: la banda de dos pisos
 * —el rótulo *COTIZACIONES* sobre el título *COTIZACIONES*, con un ícono de
 * 48px— medía unos 110px y empujaba el calendario hacia abajo). Ahora mide
 * unos 48: ícono chico, la sección y el título juntos —una sola vez si son
 * iguales—, el `?` y la frase al lado, chica. El tono sigue en el borde
 * izquierdo grueso y el fondo suave, que es lo que dice dónde se está.
 */
export default function BandaSeccion({ tono, icono, seccion, titulo, ayuda, children, alCerrar }: {
  tono: Tono; icono: string;
  /** La palabra corta: *RESERVAS*, *COTIZACIONES*, *TURNOS*. */
  seccion: string;
  titulo: string;
  /** El `?` de la pantalla. */
  ayuda?: React.ReactNode;
  /** La frase, si la hay: va chica, al lado del título. */
  children?: React.ReactNode;
  /**
   * Si la frase se puede cerrar para siempre: *✕ No mostrar más* al lado
   * (2026-11-13). Ver `usarAvisoCerrable`.
   */
  alCerrar?: () => void;
}) {
  const t = TONO[tono];
  const mismo = seccion.trim().toLowerCase() === titulo.trim().toLowerCase();
  return (
    <header className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-l-[6px] px-3 py-1.5 ${t.banda}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[18px] ${t.icono}`}
        aria-hidden>{icono}</span>
      {/* El título se parte adentro y nunca se va debajo del ícono; el `?`
          queda a su derecha. En un teléfono son dos líneas a lo más. */}
      <h1 className="min-w-0 flex-1 text-[15px] font-bold uppercase leading-tight tracking-wide sm:flex-none sm:text-[17px]">
        {!mismo && <span className={`font-black tracking-widest ${t.titulo}`}>{seccion}</span>}
        {!mismo && <span aria-hidden className="mx-1.5 text-hueso/40">·</span>}
        <span>{titulo}</span>
      </h1>
      {ayuda && <span className="shrink-0">{ayuda}</span>}
      {children && <p className="min-w-0 basis-full text-[14px] text-hueso/70 sm:basis-auto sm:flex-1">{children}</p>}
      {children && alCerrar && (
        <button type="button" onClick={alCerrar} title="Ya lo leí: no volver a mostrarlo"
          className="boton !min-h-[36px] shrink-0 !px-3 !text-[14px]">
          ✕ No mostrar más
        </button>
      )}
    </header>
  );
}
