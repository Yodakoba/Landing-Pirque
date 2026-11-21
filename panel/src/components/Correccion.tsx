'use client';

/**
 * Las dos piezas de **corregir un día cerrado** (2026-11-03), compartidas por
 * la ventana del equipo y la de las actividades extras: dos pantallas que
 * hacen lo mismo tienen que verse igual, y una sola definición es lo que lo
 * garantiza.
 *
 * - `AvisoCierre`: arriba, dice que el día está cerrado, quién lo cerró y qué
 *   se puede hacer —corregirlo, o a quién pedírselo—. Mientras se corrige,
 *   dice eso.
 * - `PieCorreccion`: abajo, la lista de lo que cambió, la casilla que la
 *   confirma y los dos botones, descartar o guardar.
 *
 * La regla de fondo vive en `corregirDiaCerrado()` y la comprueba el
 * servidor; esto es solo cómo se ve.
 */
import type { Cierre } from '@/lib/cierres';
import AyudaCorta from './AyudaCorta';

export function AvisoCierre({ cierre, puedeCorregir, corrigiendo, onCorregir }: {
  cierre?: Cierre;
  puedeCorregir: boolean;
  corrigiendo: boolean;
  onCorregir: () => void;
}) {
  if (corrigiendo) {
    return (
      // En el computador lo dice el pie de la corrección, que está a la vista
      // en la misma pantalla: una fila menos.
      <p className="mt-3 rounded border border-ambar/60 bg-ambar/10 px-3 py-2
                    text-sm text-ambar-texto lg:hidden">
        <strong>Estás corrigiendo un día cerrado.</strong> Se guarda con
        <em> Guardar corrección</em>.
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded border
                    border-verde/40 bg-verde/5 px-3 py-2">
      <p className="flex-1 text-sm text-hueso/80">
        <strong className="text-verde-texto">✓ Día cerrado</strong>
        {cierre?.quien && <> por {cierre.quien}</>}
        {cierre?.cuando && <>, {cierre.cuando}</>}.
        {/* Qué quiere decir y quién lo corrige, en su `?` (2026-11-21, regla
            *lo que explica va en su ?*). */}
      </p>
      <AyudaCorta tema="diaCerrado" />
      {puedeCorregir && (
        <button onClick={onCorregir}
          className="boton border-ambar-fuerte font-semibold text-ambar-texto">
          Corregir este día
        </button>
      )}
    </div>
  );
}

/**
 * El pie mientras se corrige: **la lista de lo que cambió, una casilla para
 * confirmarla y guardar** (2026-11-21, lo pidió el cliente: *"sobra este
 * motivo de la corrección… haz una casilla, confirmar, y luego la lista de
 * los cambios que aplicaste. Y luego guardar"*).
 *
 * Antes pedía escribir un motivo. Cada cambio ya trae su porqué —un ajuste
 * lleva su motivo y cómo se pagó—, así que la lista la arma el panel
 * (`lib/correccion.ts`) y es eso lo que queda en la bitácora, a nombre de
 * quien corrigió. *Guardar corrección* es el único relleno y se apaga hasta
 * que haya algún cambio y la casilla esté marcada. Si después de marcarla
 * se cambia algo más, la casilla se suelta sola: lo confirmado era otra
 * lista.
 */
export function PieCorreccion({
  cambios, confirmado, onConfirmado, onCancelar, onGuardar, guardando, porQueNo
}: {
  /** Lo que cambió respecto del día como estaba cerrado, con palabras. */
  cambios: string[];
  confirmado: boolean;
  onConfirmado: (v: boolean) => void;
  onCancelar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  /** Otro motivo para no poder guardar todavía, dicho en pantalla. */
  porQueNo?: string;
}) {
  const sinCambios = cambios.length === 0;
  return (
    <div className="mt-4 rounded border border-ambar/50 p-3 lg:mt-2 lg:flex lg:items-center lg:gap-4 lg:bg-ambar/[0.06]
                    lg:px-3 lg:py-2">
      <div className="min-w-0 lg:flex-1">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/70">
          <span className="hidden text-ambar-texto lg:inline">Estás corrigiendo un día cerrado · </span>
          Lo que cambia<span className="lg:hidden"> en este día cerrado</span>
        </p>
        {sinCambios ? (
          <p className="mt-1 text-[14px] text-hueso/60">Todavía no cambiaste nada.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[14px] lg:columns-2 lg:gap-x-8">
            {cambios.map((c, i) => <li key={`${i}-${c}`} className="break-inside-avoid">{c}</li>)}
          </ul>
        )}
      </div>
      <div className="lg:shrink-0">
        <div className="lg:flex lg:items-center lg:gap-2">
        <label className={`mt-3 flex min-h-[44px] items-center gap-2.5 rounded-lg border-2 px-3 text-[15px]
                           font-semibold lg:mt-0 ${sinCambios ? 'border-hueso/15 text-hueso/45'
            : confirmado ? 'cursor-pointer border-verde-fuerte bg-verde/10 text-verde-texto'
            : 'cursor-pointer border-ambar-fuerte/70 text-hueso'}`}>
          <input type="checkbox" checked={confirmado} disabled={sinCambios || guardando}
            onChange={(e) => onConfirmado(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[rgb(var(--verde-fuerte))]" />
          Confirmo {cambios.length === 1 ? 'este cambio' : 'estos cambios'}
        </label>
        <div className="mt-3 flex flex-nowrap items-center gap-2 lg:mt-0">
          <span className="flex-1" />
          <button onClick={onCancelar} disabled={guardando} className="boton whitespace-nowrap">
            Cancelar<span className="hidden sm:inline"> corrección</span>
          </button>
          <button onClick={onGuardar} disabled={guardando || sinCambios || !confirmado || !!porQueNo}
            className="boton boton-relleno boton-hito whitespace-nowrap">
            {guardando ? 'Guardando…' : 'Guardar corrección'}
          </button>
        </div>
        </div>
        {(porQueNo || (!sinCambios && !confirmado)) && (
          <p className="mt-2 text-[13px] text-hueso/60 lg:mt-1 lg:text-right">
            {porQueNo ?? 'Marca la casilla para guardar: queda en la bitácora con tu nombre.'}
          </p>
        )}
      </div>
    </div>
  );
}
