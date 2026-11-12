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

export interface SobrecupoCorto {
  fecha: string;
  exceso: number;
  capacidad: number;
  tomadas: number;
  riesgo: { nombre: string; personas: number }[];
}

export default function AvisoSobrecupo({ dias }: { dias: SobrecupoCorto[] }) {
  if (!dias.length) return null;
  return (
    <div role="alert" className="mb-4 space-y-2 rounded-xl border-2 border-rojo-fuerte/70 bg-rojo/10 p-3">
      <p className="text-[16px] font-bold text-rojo-texto">
        ⚠ {dias.length === 1 ? 'Un día se pasó del cupo' : `${dias.length} días se pasaron del cupo`}
      </p>
      <p className="text-[14px] text-hueso/85">
        Entraron reservas pagadas sobre reservas sin pagar. Quien paga tiene preferencia:
        decide si amplías el cupo o sueltas una reserva sin pagar.
      </p>
      {dias.map((d) => (
        <a key={d.fecha} href={`/dia/${d.fecha}#sobrecupo`}
          className="tecla flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-rojo-fuerte/50
                     bg-panel px-3 py-2 hover:bg-rojo/10">
          <span className="text-[15px] font-bold first-letter:uppercase">{enPalabras(d.fecha)}</span>
          <span className="text-[14px] font-semibold text-rojo-texto">
            {d.exceso} {d.exceso === 1 ? 'persona' : 'personas'} sobre el cupo ({d.tomadas} de {d.capacidad})
          </span>
          <span className="text-[13px] text-hueso/75">
            En riesgo: {d.riesgo.map((r) => `${r.nombre || 'sin nombre'} (${r.personas})`).join(', ')}
          </span>
          <span className="boton ml-auto">Decidir →</span>
        </a>
      ))}
    </div>
  );
}
