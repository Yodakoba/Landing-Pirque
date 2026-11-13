'use client';
/**
 * **El aviso de sobrecupo** (2026-11-12): un pago entró sobre reservas sin
 * pagar y el día quedó por encima de su cupo. Quien paga tiene preferencia,
 * así que el pago ya está adentro; lo que falta es decidir qué pasa con las
 * reservas sin pagar de ese día —ampliar el cupo o soltarlas—, y eso se
 * hace en la página del día, a la que lleva cada línea.
 *
 * Va en rojo arriba del calendario de la portada y de Cotizaciones. El
 * vendedor lo ve solo cuando una de las reservas en riesgo es suya
 * (`diasConSobrecupo()`), porque es él quien le avisa a su cliente.
 */
import { enPalabras } from '@/lib/fechas';
import AyudaCorta from './AyudaCorta';

export interface SobrecupoCorto {
  fecha: string;
  exceso: number;
  capacidad: number;
  tomadas: number;
  riesgo: { nombre: string; personas: number }[];
}

/**
 * **Una línea roja por día** (2026-11-13, lo pidió el cliente: *"mucho más
 * chico, alarmante, igual"*). Antes era una caja con título y párrafo; la
 * explicación pasó al `?`. Lo que queda a la vista es lo que se decide: qué
 * día, cuánto se pasó, quién está en riesgo y *Decidir →*.
 */
export default function AvisoSobrecupo({ dias }: { dias: SobrecupoCorto[] }) {
  if (!dias.length) return null;
  return (
    <div role="alert" className="mb-3 space-y-1.5">
      {dias.map((d, i) => (
        <div key={d.fecha} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-rojo-fuerte/70
                                      bg-rojo/10 px-3 py-1.5">
          <span className="text-[15px] font-bold text-rojo-texto">
            ⚠ <span className="first-letter:uppercase">{enPalabras(d.fecha)}</span>: {d.exceso} {d.exceso === 1 ? 'persona' : 'personas'} sobre el cupo
          </span>
          <span className="text-[14px] text-hueso/80">
            {d.tomadas} de {d.capacidad} · en riesgo: {d.riesgo.map((r) => `${r.nombre || 'sin nombre'} (${r.personas})`).join(', ')}
          </span>
          {i === 0 && (
            <AyudaCorta titulo="Sobrecupo">
              Entraron reservas pagadas sobre reservas sin pagar. Quien paga tiene preferencia: en el día se decide
              si se amplía el cupo o se suelta una reserva sin pagar.
            </AyudaCorta>
          )}
          <a href={`/dia/${d.fecha}#sobrecupo`} className="boton ml-auto !border-rojo-fuerte font-semibold text-rojo-texto">Decidir →</a>
        </div>
      ))}
    </div>
  );
}
