/**
 * **Cómo se ingresa en Fudo**, dicho a primera vista (2026-11-11, lo pidió el
 * cliente). Lo arma el servidor (`comoIngresar()`); acá solo se dibuja, igual
 * en la recepción, en la página del día y en la cara *Reservas* de /turnos.
 *
 * Se distingue por forma además de color: un ícono grande al inicio —✓ ya
 * pagó, $ se cobra, ½ abonó una parte, ! ojo— y la franja de su color.
 */
import type { Ingreso } from '@/lib/fudo';

const ESTILO: Record<Ingreso['tono'], { caja: string; texto: string; icono: string }> = {
  verde: { caja: 'border-verde-fuerte/60 bg-verde/10', texto: 'text-verde-texto', icono: '✓' },
  ambar: { caja: 'border-ambar-fuerte/60 bg-ambar/10', texto: 'text-ambar-texto', icono: '$' },
  cielo: { caja: 'border-cielo-fuerte/60 bg-cielo/10', texto: 'text-cielo-texto', icono: '½' },
  rojo: { caja: 'border-rojo-fuerte/70 bg-rojo/10', texto: 'text-rojo-texto', icono: '!' }
};

/**
 * **Solo el círculo** (2026-11-13), para la fila cerrada de la recepción:
 * cómo viene el pago sin abrir la reserva. La misma forma y el mismo ícono
 * de la caja, y el título entero como nombre accesible.
 */
export function IconoFudo({ ingreso }: { ingreso: Ingreso | null | undefined }) {
  if (!ingreso) return null;
  const e = ESTILO[ingreso.tono];
  return (
    <span role="img" aria-label={`En Fudo: ${ingreso.titulo}`} title={ingreso.titulo}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-current
                  text-[17px] font-extrabold ${e.texto} ${e.caja}`}>{e.icono}</span>
  );
}

export default function IngresoFudo({ ingreso, compacto = false }: {
  ingreso: Ingreso | null | undefined; compacto?: boolean;
}) {
  if (!ingreso) return null;
  const e = ESTILO[ingreso.tono];
  return (
    <div className={`flex gap-2.5 rounded-xl border-2 ${e.caja} ${compacto ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2
                                    border-current text-[17px] font-extrabold ${e.texto}`}>{e.icono}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">En Fudo</p>
        <p className={`font-bold leading-tight ${compacto ? 'text-[14px]' : 'text-[16px]'} ${e.texto}`}>
          {ingreso.titulo}
        </p>
        <ul className={`mt-0.5 ${compacto ? 'text-[13px]' : 'text-[14px]'} text-hueso/85`}>
          {ingreso.lineas.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}
