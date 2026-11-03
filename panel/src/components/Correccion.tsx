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
 * - `PieCorreccion`: abajo, el motivo obligatorio y los dos botones,
 *   descartar o guardar.
 *
 * La regla de fondo vive en `corregirDiaCerrado()` y la comprueba el
 * servidor; esto es solo cómo se ve.
 */
import type { Cierre } from '@/lib/cierres';

export function AvisoCierre({ cierre, puedeCorregir, corrigiendo, onCorregir }: {
  cierre?: Cierre;
  puedeCorregir: boolean;
  corrigiendo: boolean;
  onCorregir: () => void;
}) {
  if (corrigiendo) {
    return (
      <p className="mt-3 rounded border border-ambar/60 bg-ambar/10 px-3 py-2
                    text-sm text-ambar-texto">
        <strong>Estás corrigiendo un día cerrado.</strong> Nada se guarda hasta que
        aprietes <em>Guardar corrección</em>, y el día sigue cerrado después.
      </p>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded border
                    border-verde/40 bg-verde/5 px-3 py-2">
      <p className="flex-1 text-sm text-hueso/80">
        <strong className="text-verde-texto">✓ Día cerrado</strong>
        {cierre?.quien && <> por {cierre.quien}</>}
        {cierre?.cuando && <>, {cierre.cuando}</>}.{' '}
        {puedeCorregir
          ? <>Está en solo lectura. Si hay que cambiar algo, corrígelo con un motivo.</>
          : <>Está en solo lectura. Si hay que cambiar algo, pídeselo al
              administrador o a quien hace los pagos.</>}
      </p>
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
 * El pie mientras se corrige. *Guardar corrección* es el único relleno, y
 * se apaga sin motivo: el motivo es lo que se va a preguntar un mes
 * después, sobre todo si ese día ya se pagó, y queda en la bitácora.
 */
export function PieCorreccion({
  motivo, onMotivo, onCancelar, onGuardar, guardando, porQueNo
}: {
  motivo: string;
  onMotivo: (m: string) => void;
  onCancelar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  /** Otro motivo para no poder guardar todavía, dicho en pantalla. */
  porQueNo?: string;
}) {
  const sinMotivo = !motivo.trim();
  return (
    <div className="mt-4 rounded border border-ambar/50 p-3">
      <label className="block text-[13px] font-semibold text-hueso/70">
        Motivo de la corrección
        <input value={motivo} onChange={(e) => onMotivo(e.target.value)}
          placeholder="Ej.: faltó anotar la propina, Juan sí vino"
          className="mt-1 w-full rounded border border-hueso/20 bg-tinta px-2 py-2
                     text-sm focus:border-oro focus:outline-none" />
      </label>
      <div className="mt-3 flex flex-nowrap items-center gap-2">
        <span className="flex-1" />
        <button onClick={onCancelar} disabled={guardando} className="boton whitespace-nowrap">
          Cancelar<span className="hidden sm:inline"> corrección</span>
        </button>
        <button onClick={onGuardar} disabled={guardando || sinMotivo || !!porQueNo}
          className="boton boton-relleno whitespace-nowrap">
          {guardando ? 'Guardando…' : 'Guardar corrección'}
        </button>
      </div>
      {(sinMotivo || porQueNo) && (
        <p className="mt-2 text-[13px] text-hueso/60">
          {sinMotivo
            ? 'Para guardar, escribe el motivo: queda en la bitácora con tu nombre.'
            : porQueNo}
        </p>
      )}
    </div>
  );
}
