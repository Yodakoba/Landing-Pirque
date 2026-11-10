'use client';

/**
 * **El botón de guardar del panel, uno solo para todas las pantallas**
 * (2026-11-10, lo pidió el cliente como regla: *"cuando un botón ya se
 * guardó, que me indique con algún mensajito… y cuando no hay nada para
 * guardar, que esté en gris"*).
 *
 * Tres estados, y cada uno se ve distinto sin leer:
 *
 * | | Cómo se ve |
 * |---|---|
 * | Hay cambios | dorado relleno, dice *Guardar* (o lo que diga `texto`) |
 * | Guardando | apagado, dice *Guardando…* |
 * | Nada que guardar | **gris** y apagado, dice **✓ Guardado** |
 *
 * Así se siente que apretarlo hizo algo: el botón mismo cambia a *✓
 * Guardado* en vez de quedar igual. Y un botón gris no invita a apretarlo
 * dos veces por las dudas.
 *
 * Quien lo usa solo dice si hay cambios (`sucio`); no tiene que acordarse de
 * los tres textos ni del color de cada uno.
 */
export default function BotonGuardar({
  sucio, guardando, onClick, texto = 'Guardar', className = ''
}: {
  sucio: boolean;
  guardando: boolean;
  onClick: () => void;
  texto?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={guardando || !sucio}
      aria-live="polite"
      className={`boton min-h-[44px] px-5 font-semibold ${sucio && !guardando
        ? 'boton-relleno'
        : '!border-hueso/20 !bg-hueso/10 !text-hueso/70'} ${className}`}>
      {guardando ? 'Guardando…' : sucio ? texto : '✓ Guardado'}
    </button>
  );
}
