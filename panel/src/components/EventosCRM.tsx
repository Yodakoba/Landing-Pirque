/**
 * Lo que el CRM del socio tiene para un día nuestro.
 *
 * Existe porque la mitad que lee el CRM se escribió el 2026-11-02 **y nunca
 * se dibujó en ninguna pantalla**: la ruta `/api/crm/eventos` funcionaba y
 * ninguna pantalla la llamaba. Lo notó el cliente mirando el domingo 22 de
 * noviembre —*"no debería mostrarse la reserva ganada ya?"*— con la tarjeta
 * diciendo `0/150 personas` sobre un día que el socio tiene vendido a 150.
 *
 * ## Dos colores, porque son dos cosas
 *
 * El cliente propuso el rosado de los presupuestos, y tiene razón **para la
 * mitad**: un evento del CRM en `Cotizado`, `Nuevo` o `Contactado` **es** un
 * presupuesto —el de otro— y rosado ya significa exactamente eso acá,
 * "cotizado, todavía no confirmado". Mismo significado, mismo color.
 *
 * **Para un `Ganado` diría lo contrario de lo que es.** Rosado quiere decir
 * "todavía no se sabe", y de un ganado sí se sabe: es gente que viene. Y es
 * justo la mitad peligrosa —las 150 personas del 22, las 190 del 18 de
 * diciembre—, así que pintarla del color de lo que todavía no se sabe sería
 * tranquilizar sobre lo único que no hay que estar tranquilo.
 *
 * Los ganados van en **cielo**, que es el color de un día privado, y por el
 * mismo motivo: gente que viene por un camino que no es el formulario del
 * sitio. Un ganado del CRM es exactamente eso.
 *
 * ## Lo que se ve es lo que todavía no está anotado
 *
 * El cliente lo cerró así: *"cuando viene un presupuesto ganado desde el
 * CRM, nosotros lo convertimos en una reserva y le damos las informaciones
 * que solo nosotros sabemos poner en sistema"*. O sea que esto **no es una
 * vista paralela, es una bandeja de entrada**: lo que aparece acá es lo que
 * falta pasar al panel, y al anotarlo desaparece — porque ya ocupa cupo de
 * verdad y seguir mostrándolo sería contar la misma gente dos veces.
 *
 * Por eso el ganado lleva su botón. Lo que el CRM sabe —quién, qué día,
 * cuánta gente— se propone; **lo que solo sabemos acá** —los menús, el
 * monto, el teléfono— se escribe en el formulario de siempre.
 *
 * ## Mientras no está anotado, no toca el cupo
 *
 * No entra en `tomadas`, no descuenta de `quedan`, no mueve el semáforo y no
 * llega al sitio. Es una capa aparte, como `posibles` en los presupuestos, y
 * por el motivo que dio el cliente: **un sistema que no controlamos no puede
 * cerrarle un sábado al sitio público sin que nadie lo mire.** Lo que lo
 * hace contar es que una persona lo mire y lo anote, que es justo el paso
 * que esto agrega.
 */
import type { EventoCRM, EventosDelDia } from '@/lib/crm';

/** La forma en que el panel pide los eventos de un día. */
export const SIN_EVENTOS: EventosDelDia = {
  confirmados: [], tentativos: [], personasConfirmadas: 0, personasTentativas: 0
};

export const hayAlgo = (e: EventosDelDia) =>
  e.confirmados.length > 0 || e.tentativos.length > 0;

const gente = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`;

/**
 * La línea de la tarjeta del calendario: una pastilla por cada mitad.
 *
 * **Va debajo de la barra y de las pastillas de pago**, igual que la de los
 * presupuestos y por lo mismo: arriba está lo que ya es, y esto es gente que
 * el panel no cuenta. Mezclarlo con el número grande sería justo lo que el
 * cliente pidió que no pasara.
 *
 * Aparece **solo si hay algo**: un "0 eventos" es ruido en una tarjeta que se
 * mira para decidir.
 */
export function LineaCRM({ e, quedan }: { e: EventosDelDia; quedan?: number }) {
  if (!hayAlgo(e)) return null;
  // El aviso que hace falta: lo que el socio ya dio por cerrado no cabe en
  // lo que el panel todavía ofrece. Es `haySobreventa()`, escrito el
  // 2026-11-02 y sin usar hasta ahora.
  // **El aviso solo donde se sabe el cupo.** La tarjeta del calendario lo
  // tiene; la página del día no, y ahí un `quedan` inventado haría aparecer
  // o desaparecer la alarma por un dato que nadie miró.
  const choca = quedan !== undefined && e.personasConfirmadas > quedan;

  return (
    <p className="mt-2 flex flex-wrap gap-2 text-[13px]">
      {e.confirmados.length > 0 && (
        <span className={'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 '
          + (choca ? 'border-ambar/60 bg-ambar/10 text-ambar-texto'
                   : 'border-cielo/50 bg-cielo/10 text-cielo-texto')}>
          <span aria-hidden className={'h-2 w-2 rounded-full '
            + (choca ? 'bg-ambar-fuerte' : 'bg-cielo-fuerte')} />
          <strong className="tabular-nums">{e.confirmados.length}</strong>
          {e.confirmados.length === 1 ? 'ganado' : 'ganados'}
          {' · '}
          <strong className="tabular-nums">{e.personasConfirmadas}</strong> del CRM
        </span>
      )}
      {e.tentativos.length > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-md border
                         border-rosa/50 bg-rosa/10 px-2 py-1 text-rosa-texto">
          <span aria-hidden className="h-2 w-2 rounded-full bg-rosa-fuerte" />
          <strong className="tabular-nums">{e.tentativos.length}</strong>
          {e.tentativos.length === 1 ? 'cotizado' : 'cotizados'}
          {e.personasTentativas > 0 && (
            <> · <strong className="tabular-nums">{e.personasTentativas}</strong> posibles</>
          )}
        </span>
      )}
    </p>
  );
}

/**
 * El bloque de la página del día: quién, cuánta gente y en qué va.
 *
 * **Dice por qué no suma**, igual que el bloque de los presupuestos: es justo
 * lo que alguien daría por hecho mirando una tarjeta con gente.
 */
export function BloqueCRM(
  { e, quedan, onAnotar }:
  { e: EventosDelDia; quedan?: number; onAnotar?: (ev: EventoCRM) => void }
) {
  if (!hayAlgo(e)) return null;
  const choca = quedan !== undefined && e.personasConfirmadas > quedan;

  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
        En el CRM
      </h2>

      {/* El aviso va arriba del todo: es lo único de este bloque sobre lo que
          hay que hacer algo hoy. */}
      {choca && (
        <p className="mt-2 rounded border border-ambar/50 bg-ambar/10 px-3 py-2 text-[13px]
                      text-ambar-texto">
          <strong>El CRM ya tiene ganadas {gente(e.personasConfirmadas)} para este día</strong> y
          acá quedan {quedan} lugares. No caben juntos: conviene cerrar el día o
          avisarle antes de que el sitio siga vendiéndolo.
        </p>
      )}

      <ul className="mt-2 space-y-1.5">
        {[...e.confirmados, ...e.tentativos].map((x) => (
          <li key={x.id}
              className={'flex flex-wrap items-center gap-x-2 gap-y-1 rounded border px-3 py-2 '
                + 'text-[13px] '
                + (x.confirmado ? 'border-cielo/40 bg-cielo/[0.06]'
                                : 'border-rosa/40 bg-rosa/[0.06]')}>
            <strong className={x.confirmado ? 'text-cielo-texto' : 'text-rosa-texto'}>
              {x.nombre || 'sin nombre'}
            </strong>
            <span className="text-hueso/60">
              {x.tipo || 'sin tipo'} · <span className="tabular-nums">{gente(x.invitados)}</span>
            </span>
            <span className={'ml-auto rounded px-1.5 py-0.5 text-[12px] font-semibold '
              + (x.confirmado ? 'bg-cielo/15 text-cielo-texto' : 'bg-rosa/15 text-rosa-texto')}>
              {x.etapa || 'sin etapa'}
            </span>
            {x.vendedor && <span className="text-hueso/45">lo lleva {x.vendedor}</span>}
            {/* **Solo los ganados se ofrecen para anotar.** Un cotizado
                todavía no es gente que viene, y anotarlo le quitaría el
                lugar a alguien por un evento que el CRM todavía no da
                por ganado. */}
            {x.confirmado && onAnotar && (
              <button type="button" className="boton boton-angosto w-full sm:w-auto"
                      onClick={() => onAnotar(x)}>
                Anotar como reserva
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[13px] text-hueso/60">
        <strong>Esta gente todavía no ocupa cupo</strong>: los números de
        arriba no la cuentan. Al anotar un ganado como reserva pasa a
        contar — y por eso mismo desaparece de esta lista.
      </p>
    </section>
  );
}
