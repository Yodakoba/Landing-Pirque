'use client';

/**
 * **La pregunta antes de cerrar el día** (2026-11-05, lo pidió el cliente).
 *
 * Cierra el encargado —es quien vivió el día y quien sabe si está todo—,
 * pero *"tiene que advertir muy bien: ¿está seguro? Ahora está cerrando el
 * día… ¿controlaste que todos los detalles están ingresados?"*. Después de
 * cerrar, cualquier problema pasa por quien hace los pagos.
 *
 * Por eso no es un `confirm()` de una línea, que se acepta sin leer: es una
 * ventana con **la lista de lo que se está declarando**, cada cosa con su
 * marca —✓ si está, ! en ámbar si falta o conviene mirarla—, y dos botones
 * que dicen lo que hacen: *Volver a revisar* y *Sí, cerrar el día*.
 *
 * Lo que bloquea de verdad —alguien sin marcar— ni siquiera deja llegar
 * acá: el botón de cerrar está apagado. Lo que se lista con ! son avisos
 * (propina en cero, una actividad sin confirmar): pueden ser ciertos, y por
 * eso se preguntan en vez de impedir.
 */
import Dialogo from './Dialogo';

export interface PuntoDeCierre {
  /** Qué se revisa: "Equipo", "Propina del día"… */
  que: string;
  /** Lo que hay: "6 vinieron · 1 no llegó", "$45.000"… */
  valor: string;
  /** `false` pinta un ! en ámbar: no impide cerrar, pide mirarlo. */
  bien: boolean;
}

export default function ConfirmarCierre({ fecha, puntos, cerrando, onCerrar, onVolver }: {
  /** El día, ya en palabras: "sábado 1 de noviembre". */
  fecha: string;
  puntos: PuntoDeCierre[];
  cerrando: boolean;
  onCerrar: () => void;
  onVolver: () => void;
}) {
  const avisos = puntos.filter((p) => !p.bien).length;
  return (
    <Dialogo titulo="¿Cerrar el día?" onCerrar={onVolver}>
      <p className="mt-2 text-[16px]">
        Vas a cerrar el <strong>{fecha}</strong>.
        Revisa que esté todo ingresado:
      </p>

      <ul className="mt-4 space-y-2">
        {puntos.map((p) => (
          <li key={p.que}
            className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${
              p.bien ? 'border-verde/30 bg-verde/5' : 'border-ambar/50 bg-ambar/5'}`}>
            <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center
                                         rounded-full text-[15px] font-black ${p.bien
              ? 'bg-verde-fuerte text-tinta' : 'bg-ambar-fuerte text-tinta'}`}>
              {p.bien ? '✓' : '!'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
                {p.que}
              </span>
              <span className={`block text-[15px] font-semibold ${
                p.bien ? '' : 'text-ambar-texto'}`}>{p.valor}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-xl border-2 border-rojo/40 bg-rojo/5 px-3 py-2.5 text-[15px]">
        <strong>Después de cerrar ya no se puede cambiar nada.</strong> Si algo
        quedó mal, solo quien hace los pagos lo puede corregir. Queda anotado
        que lo cerraste tú, con la hora.
      </p>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onVolver}
          className="boton min-h-[44px] justify-center text-[15px]">
          Volver a revisar
        </button>
        <button type="button" onClick={onCerrar} disabled={cerrando}
          className="boton boton-relleno min-h-[44px] justify-center text-[15px]">
          {cerrando ? 'Cerrando…'
            : avisos ? 'Sí, está bien así: cerrar el día' : 'Sí, cerrar el día'}
        </button>
      </div>
    </Dialogo>
  );
}
