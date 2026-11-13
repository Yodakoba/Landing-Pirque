/**
 * **El tono de cada calendario** (2026-11-13, lo pidió el cliente): Reservas,
 * Cotizaciones y Turnos tienen que *"sentirse iguales, pero distintivos"*.
 *
 * - **Igual en los tres**: la fecha (`FechaDia`), las tarjetas pintadas por el
 *   estado del día y la forma de la caja de la semana o del mes. Se leen igual.
 * - **Distinto, para saber dónde estás**: un tono por sección, en la banda del
 *   título y en el marco de las cajas. Reservas en **dorado** (el calendario
 *   principal), Cotizaciones en **rosado** (el color que ya significa
 *   "cotizado") y Turnos en **celeste** (el equipo).
 *
 * Las clases van escritas enteras —no armadas con `${tono}`— porque Tailwind
 * solo genera las que encuentra literalmente en el código.
 */
export type Tono = 'oro' | 'rosa' | 'cielo';

export const TONO: Record<Tono, {
  banda: string; icono: string; titulo: string;
  /** La caja de una semana (o del mes, en Turnos). */
  caja: string;
  /** La caja de la semana en curso. */
  cajaAhora: string;
  /** La pastilla *ESTA SEMANA*. */
  pastilla: string;
}> = {
  oro: {
    banda: 'border-oro/50 bg-oro/10', icono: 'bg-oro text-white', titulo: 'text-oro',
    caja: 'border-oro/25 bg-oro/[0.03]', cajaAhora: 'border-oro/70 bg-oro/[0.06] border-2',
    pastilla: 'bg-oro text-tinta'
  },
  rosa: {
    banda: 'border-rosa-fuerte/50 bg-rosa/10', icono: 'bg-rosa-fuerte text-white', titulo: 'text-rosa-texto',
    caja: 'border-rosa-fuerte/25 bg-rosa/[0.04]', cajaAhora: 'border-rosa-fuerte/70 bg-rosa/[0.08] border-2',
    pastilla: 'bg-rosa-fuerte text-tinta'
  },
  cielo: {
    banda: 'border-cielo-fuerte/50 bg-cielo/10', icono: 'bg-cielo-fuerte text-white', titulo: 'text-cielo-texto',
    caja: 'border-cielo-fuerte/25 bg-cielo/[0.04]', cajaAhora: 'border-cielo-fuerte/70 bg-cielo/[0.08] border-2',
    pastilla: 'bg-cielo-fuerte text-tinta'
  }
};

/** La banda del título de un calendario: ícono, sección, nombre y su `?`. */
export default function BandaSeccion({ tono, icono, seccion, titulo, ayuda, children }: {
  tono: Tono; icono: string;
  /** La palabra corta de arriba: *RESERVAS*, *COTIZACIONES*, *TURNOS*. */
  seccion: string;
  titulo: string;
  /** El `?` de la pantalla. */
  ayuda?: React.ReactNode;
  /** La frase de abajo, si la hay. */
  children?: React.ReactNode;
}) {
  const t = TONO[tono];
  return (
    <header className={`mb-4 flex items-start gap-3 rounded-2xl border-2 px-4 py-3 ${t.banda}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[26px] shadow-sm ${t.icono}`}
        aria-hidden>{icono}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-black uppercase tracking-widest ${t.titulo}`}>{seccion}</p>
        <h1 className="flex flex-wrap items-center text-xl font-bold uppercase tracking-wide">
          {titulo}{ayuda}
        </h1>
        {children && <div className="mt-1 max-w-2xl text-[15px] text-hueso/75">{children}</div>}
      </div>
    </header>
  );
}
