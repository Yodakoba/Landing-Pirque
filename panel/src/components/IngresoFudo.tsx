/**
 * **Cómo se ingresa en Fudo**, dicho a primera vista (2026-11-11, lo pidió el
 * cliente). Lo arma el servidor (`comoIngresar()`); acá solo se dibuja, igual
 * en la recepción, en la página del día y en la cara *Reservas* de /turnos.
 *
 * Se distingue por forma además de color: un ícono grande al inicio —✓ ya
 * pagó, $ se cobra, ½ abonó una parte, ! ojo— y la franja de su color.
 */
import type { Acordado, Ingreso } from '@/lib/fudo';

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
        {ingreso.acordado && <LoAcordado acordado={ingreso.acordado} compacto={compacto} />}
        <ul className={`mt-0.5 ${compacto ? 'text-[13px]' : 'text-[14px]'} text-hueso/85`}>
          {ingreso.lineas.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}

/**
 * **Lo acordado en la cotización ganada** (2026-11-20, lo pidió el cliente):
 * cada línea tal como se firmó, para cerrar la mesa en Fudo con esos precios
 * y no con los de la carta.
 *
 * **Lo que manda es el valor en Fudo, con IVA**, porque Fudo siempre cuenta
 * con IVA: va a la derecha de cada línea, en negrita y en su pastilla. Debajo,
 * chico, cómo se acordó (*+ IVA* o *IVA incluido*) y el precio de lista si
 * se negoció otro. **Lo negociado se distingue por forma**: en negrita y con
 * *≠* al inicio.
 */
function LoAcordado({ acordado, compacto }: { acordado: Acordado; compacto: boolean }) {
  const letra = compacto ? 'text-[14px]' : 'text-[15px]';
  return (
    <div className="mt-1.5 rounded-lg border-2 border-oro/50 bg-oro/[0.06] px-2.5 py-2">
      <p className="text-[13px] font-bold uppercase tracking-wide text-oro">
        📋 Acordado en la cotización N° {acordado.folio}
      </p>
      <p className="text-[13px] font-semibold text-hueso/75">Valores con IVA: así se ingresan en Fudo.</p>
      <ul className={`mt-1 space-y-1.5 ${letra}`}>
        {acordado.lineas.map((l) => (
          <li key={l.que + l.enFudo}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className={l.distinto ? 'font-bold text-hueso' : 'text-hueso/85'}>
                {l.distinto && <span aria-label="acordado distinto de la lista" className="mr-1 text-oro">≠</span>}
                {l.que}
              </span>
              {/* Se parte en el *·* y no en medio de un monto: en un
                  teléfono el precio por unidad y el total van en dos renglones. */}
              <span className="max-w-full rounded-md bg-oro/15 px-1.5 font-bold tabular-nums text-hueso">
                {('En Fudo ' + l.enFudo).split(' · ').map((parte, i) => (
                  <span key={i}>{i > 0 && ' · '}<span className="whitespace-nowrap">{parte}</span></span>
                ))}
              </span>
            </div>
            {l.detalle && <span className="block text-[13px] text-hueso/65">{l.detalle}</span>}
          </li>
        ))}
      </ul>
      <p className={`mt-2 border-t border-oro/30 pt-1.5 font-bold ${letra}`}>
        Total en Fudo, con IVA: {'$' + Math.round(acordado.total).toLocaleString('es-CL')}
      </p>
    </div>
  );
}

/**
 * **La marca en la fila cerrada** (2026-11-20): esta reserva no se cobra con
 * la carta. Solo aparece cuando la cotización tiene algo negociado —un
 * precio distinto del de lista o un descuento—, para que quien abre la mesa
 * lo sepa antes de abrirla. La misma forma de las otras marcas de la fila.
 */
export function MarcaAcordado({ ingreso }: { ingreso: Ingreso | null | undefined }) {
  if (!ingreso?.acordado || !ingreso.acordado.lineas.some((l) => l.distinto)) return null;
  return (
    <span title={`Precios acordados en la cotización N° ${ingreso.acordado.folio}: ciérrala con esos precios`}
      className="shrink-0 whitespace-nowrap rounded-full border-2 border-oro/60 bg-oro/10 px-2 py-0.5
                 text-[13px] font-bold text-oro">≠ Acordado</span>
  );
}
