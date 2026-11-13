/**
 * **Las pastillas de lo cotizado, iguales en todo el panel** (2026-11-13, lo
 * pidió el cliente: en la tarjeta de Cotizaciones *candidato* y *ganada*
 * eran pastillas y las personas posibles un texto suelto debajo —*"no
 * cambiar entre medio de nuevo el estilo por realmente el mismo tipo de
 * información"*—).
 *
 * El mismo dato iba de tres formas: en la portada una pastilla cuadrada con
 * un punto que decía *presupuesto*, en Cotizaciones un texto rosado y en
 * Turnos otra línea de texto. Ahora es esta, en las tres.
 *
 * **La forma dice qué tan firme es**, no solo el color (regla PlayStation):
 * - *posible* —un candidato, lo cotizado—: solo el borde.
 * - *hecho* —una ganada—: el borde y un relleno suave.
 * - *alerta* —esperando respuesta—: borde grueso.
 * - *propio* —tus candidatos y borradores sin mandar—: borde cortado.
 *
 * **La pastilla rosada cuenta solo lo mandado** (2026-11-13): un candidato
 * o un borrador no es gente posible todavía. Ver `CotizacionesVista`.
 */
import type { ReactNode } from 'react';

const BASE = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-semibold';

export const PASTILLA = {
  /** Un candidato: alguien preguntó. */
  candidato: `${BASE} border border-cielo/60 text-cielo-texto`,
  /** Lo cotizado y la gente posible: rosado, *todavía no se sabe*. */
  cotizado: `${BASE} border border-rosa/60 text-rosa-texto`,
  /** Una ganada: ya es reserva. */
  ganada: `${BASE} border border-verde-fuerte bg-verde/15 text-verde-texto`,
  /** Algo que espera a alguien. */
  alerta: `${BASE} border-2 border-ambar-fuerte text-ambar-texto`,
  /**
   * Lo propio y todavía sin mandar —candidatos y borradores de esta cuenta—:
   * borde cortado y sin color, porque no es gente que venga sino algo que
   * hacer (2026-11-13). Solo lo ve quien lo creó.
   */
  propio: `${BASE} border border-dashed border-hueso/50 text-hueso/80`,
  /**
   * **Lo de la propia sección en un calendario, en su tono** (2026-11-13, lo
   * pidió el cliente: en Extras *"los 40 mil… no deberían ser texto libre,
   * sino también como un botón, como en el otro calendario"*). Las
   * actividades de Extras en añil y el equipo de Turnos en dorado, con el
   * mismo borde que lo cotizado: es un dato del día, no algo hecho.
   */
  extras: `${BASE} border border-anil-fuerte/60 text-anil-texto`,
  equipo: `${BASE} border border-oro/60 text-oro`
} as const;

export function Pastilla({ tipo, children, title, className = '' }: {
  tipo: keyof typeof PASTILLA; children: ReactNode; title?: string;
  /** Para una celda angosta: que pueda cortar la línea en vez de salirse. */
  className?: string;
}) {
  return <span className={`${PASTILLA[tipo]} ${className}`} title={title}>{children}</span>;
}

/**
 * *1 cotización · 18 posibles*: lo cotizado de un día y la gente que podría
 * venir, en una sola pastilla rosada. `corta` deja solo la gente —o, sin
 * gente, cuántas cotizaciones— para una celda angosta como la de Turnos.
 */
export function PastillaCotizado({ cotizaciones = 0, posibles = 0, corta = false }: {
  cotizaciones?: number; posibles?: number; corta?: boolean;
}) {
  if (!cotizaciones && !posibles) return null;
  const cuantas = cotizaciones > 0 && `${cotizaciones} cotizaci${cotizaciones === 1 ? 'ón' : 'ones'}`;
  const gente = posibles > 0 && <><b className="font-bold tabular-nums">{posibles}</b> posibles</>;
  return (
    <span className={PASTILLA.cotizado} title="Gente que podría venir si se confirma: todavía no ocupa cupo">
      {corta ? (gente || cuantas) : <>{cuantas}{cuantas && gente && ' · '}{gente}</>}
    </span>
  );
}
