'use client';

/**
 * La línea que dice si lo que se escribió quedó guardado.
 *
 * **Sin botón de guardar, esto es lo único que lo cuenta**, así que no puede
 * ser un ícono: dice la palabra. Y el caso que de verdad importa es el malo
 * —se escribió un monto y el servidor lo rechazó—, por eso el error va en
 * rojo, con el motivo y un *Reintentar* al lado. Quedarse callado ahí sería
 * dejar a alguien creyendo que anotó algo que no existe.
 */
import type { EstadoGuardado } from './usarAutoguardado';

export default function AvisoGuardado({ estado, error, onReintentar }: {
  estado: EstadoGuardado;
  error?: string;
  onReintentar?: () => void;
}) {
  if (estado === 'error') {
    return (
      <p className="text-xs text-red-400" role="alert">
        No se pudo guardar{error ? `: ${error}` : '.'}{' '}
        {onReintentar && (
          <button onClick={onReintentar} className="underline hover:text-red-300">
            Reintentar
          </button>
        )}
      </p>
    );
  }
  if (estado === 'guardando') {
    return <p className="text-xs text-hueso/50">Guardando…</p>;
  }
  if (estado === 'guardado') {
    return (
      <p className="text-xs text-emerald-400/80" aria-live="polite">
        ✓ Guardado
      </p>
    );
  }
  return null;
}
