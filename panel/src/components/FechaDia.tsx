/**
 * **La fecha de un día**, la misma en Reservas, Cotizaciones y Turnos
 * (2026-11-13, lo pidió el cliente: que los calendarios *"se sientan
 * iguales"*, con la fecha **como la mostraba Cotizaciones**: el día de la
 * semana corto y el número grande, *MIÉ 11*).
 *
 * Gana espacio frente a *"Miércoles 11 de noviembre"*. El mes lo dice la caja
 * de la semana o del mes; donde no hay caja —un aviso suelto— va chico detrás
 * (`conMes`: *DOM 8 nov*). El nombre completo va igual para los lectores de
 * pantalla (`aria-label`).
 */
import type { ReactNode } from 'react';
import { diaSemana, enPalabras, hoy } from '@/lib/fechas';

/**
 * **Hoy y esta semana se marcan igual en todos los calendarios** (2026-11-13,
 * lo pidió el cliente: Cotizaciones pintaba la semana en rosado *"que no lo
 * haces en ningún otro lado… sigue a un hilo conectivo"*, y el rosado se
 * juntaba con los avisos rojos de arriba). Antes había cuatro formas: un
 * fondo dorado casi invisible en Reservas, uno rosado en Cotizaciones y un
 * anillo dorado en Turnos y Extras —el mismo anillo que en Cotizaciones
 * quiere decir *día abierto*—.
 *
 * Ahora es **una palabra en una pastilla con borde, sin color**: *HOY* junto
 * a la fecha del día (la pone `FechaDia` sola) y *ESTA SEMANA* junto al rango
 * de la semana. El color queda para lo que significa algo: el estado del día
 * y los avisos.
 */
export function MarcaAhora({ children, relleno = false }: { children: ReactNode;
  /** *HOY* va relleno (2026-11-13): más fuerte que *ESTA SEMANA*, delineada. */
  relleno?: boolean }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border-2 border-hueso/60 px-2 py-px
                     text-[13px] font-bold uppercase leading-tight tracking-wide ${relleno
                       ? '!border-hueso bg-hueso text-tinta' : 'text-hueso'}`}>
      {children}
    </span>
  );
}

/**
 * **Hoy, bien marcado** (2026-11-13, lo pidió el cliente: la pastilla *HOY*
 * estaba bien, *"pero ayuda mucho si está bien marcado el día hoy"*). Un
 * borde grueso del color del texto alrededor de la tarjeta o la celda de
 * hoy, **el mismo en los cuatro calendarios** (Reservas, Cotizaciones,
 * Turnos y Extras). Neutro a propósito: el dorado ya quiere decir *el día
 * que abriste*. Es `outline`, así que no mueve nada de lugar, y va encima
 * de las celdas vecinas.
 */
export const MARCO_HOY = 'relative z-[1] outline outline-[3px] outline-offset-1 outline-hueso';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** El número según dónde va: la tarjeta, la tarjeta achicada, la celda de Turnos o un aviso. */
const NUMERO = { tarjeta: 'text-[28px]', chica: 'text-[20px]', celda: 'text-[18px]', aviso: 'text-[15px]' } as const;

export default function FechaDia({ fecha, tamano = 'tarjeta', chica = false, conMes = false, apagada = false }: {
  fecha: string;
  tamano?: keyof typeof NUMERO;
  /** Atajo de `tamano="chica"`: la tarjeta achicada de una semana lejana. */
  chica?: boolean;
  /** Para un aviso fuera de una caja de semana o de mes: *DOM 8 nov*. */
  conMes?: boolean;
  /** Un día sin nada en Turnos: más claro, no borrado. */
  apagada?: boolean;
}) {
  const t = chica ? 'chica' : tamano;
  return (
    <span className={`inline-flex items-baseline gap-1.5 leading-none ${apagada ? 'text-hueso/55' : ''}`}
      aria-label={fecha === hoy() ? `Hoy, ${enPalabras(fecha)}` : enPalabras(fecha)}>
      <span aria-hidden className="text-[13px] font-bold uppercase tracking-wide opacity-75">
        {DIAS[diaSemana(fecha)]}
      </span>
      <span aria-hidden className={`tabular-nums ${NUMERO[t]} ${apagada ? 'font-medium' : 'font-black'}`}>
        {Number(fecha.slice(8))}
      </span>
      {conMes && (
        <span aria-hidden className="text-[13px] font-semibold opacity-75">{MESES[Number(fecha.slice(5, 7)) - 1]}</span>
      )}
      {t !== 'aviso' && fecha === hoy() && <span className="self-center"><MarcaAhora relleno>hoy</MarcaAhora></span>}
    </span>
  );
}
