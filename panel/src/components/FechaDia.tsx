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
import { diaSemana, enPalabras } from '@/lib/fechas';

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
      aria-label={enPalabras(fecha)}>
      <span aria-hidden className="text-[13px] font-bold uppercase tracking-wide opacity-75">
        {DIAS[diaSemana(fecha)]}
      </span>
      <span aria-hidden className={`tabular-nums ${NUMERO[t]} ${apagada ? 'font-medium' : 'font-black'}`}>
        {Number(fecha.slice(8))}
      </span>
      {conMes && (
        <span aria-hidden className="text-[13px] font-semibold opacity-75">{MESES[Number(fecha.slice(5, 7)) - 1]}</span>
      )}
    </span>
  );
}
