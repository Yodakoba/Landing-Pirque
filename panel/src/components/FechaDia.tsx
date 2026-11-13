/**
 * **La fecha de una tarjeta de día**, la misma en los dos calendarios
 * (2026-11-13, lo pidió el cliente: que el calendario de reservas y el de
 * cotizaciones *"se sientan iguales, como ya estoy en el mismo mundo"*, con
 * la fecha **como la mostraba Cotizaciones**: el día de la semana corto y el
 * número grande, *MIÉ 11*).
 *
 * Gana espacio frente a *"Miércoles 11 de noviembre"*: el mes ya lo dice la
 * caja de la semana, y el número grande se encuentra de un vistazo. El nombre
 * completo va igual para los lectores de pantalla (`aria-label`).
 */
import { diaSemana, enPalabras } from '@/lib/fechas';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function FechaDia({ fecha, chica = false }: {
  fecha: string;
  /** La tarjeta achicada de una semana lejana. */
  chica?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-2" aria-label={enPalabras(fecha)}>
      <span aria-hidden className="text-[13px] font-bold uppercase tracking-wide text-hueso/70">
        {DIAS[diaSemana(fecha)]}
      </span>
      <span aria-hidden className={`font-black leading-none tabular-nums ${chica ? 'text-[20px]' : 'text-[28px]'}`}>
        {Number(fecha.slice(8))}
      </span>
    </span>
  );
}
