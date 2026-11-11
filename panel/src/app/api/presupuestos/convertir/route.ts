import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerLineasPresupuesto, guardarPresupuesto,
  crearReserva, leerMenus, leerClientes, anotar, leerConfig, leerCobros,
  actualizarPagoDeReserva, abrirElDiaSiHaceFalta, leerFechas, leerReservas
} from '@/lib/datos';
import { cupoParaGanar } from '@/lib/dias';
import { ocupaLugar } from '@/lib/ocupacion';
import { condicionesDe, estadoCobros, cobrosDe, puedeGanar } from '@/lib/cobros';
import { enPesos } from '@/lib/ocupacion';
import { conCliente, otrasAlternativas } from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { esFecha } from '@/lib/fechas';
import {
  lineasDe, reservaDesdePresupuesto, folioDe, estadoVisible, totalDe,
  ESTADO_PRESUPUESTO
} from '@/lib/presupuestos';
import { hoy } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * Convierte un presupuesto aceptado en una reserva de verdad.
 *
 * **Es el paso que mueve el cupo**, y por eso es una acción propia y no un
 * efecto de cambiar el estado a "Aceptado": marcar que el cliente dijo que
 * sí y tomarle el lugar son dos decisiones, y la segunda es la que le quita
 * la silla a otro.
 *
 * **El orden importa y es deliberado: primero la reserva, después el
 * vínculo.** Las dos escrituras van a la planilla y no hay transacción que
 * las junte, así que hay que elegir cuál falla mejor:
 *
 * - **Reserva primero**: si el vínculo falla, queda la reserva ocupando su
 *   lugar **y** el presupuesto contando como posible. Se ve doble, es feo y
 *   **se nota en el acto** — alguien lo arregla.
 * - **Vínculo primero**: si la reserva falla, el presupuesto deja de contar
 *   como posible y no existe ninguna reserva. Esa gente desaparece de las
 *   dos listas y **nadie se entera** hasta que llegan.
 *
 * El error visible gana siempre sobre el invisible.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { id } = await req.json();
    const [lista, clientes] = await Promise.all([leerPresupuestos(), leerClientes()]);
    const original = lista.find((x) => x.id === String(id ?? '').trim());
    if (!original) {
      return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    }
    const p = conCliente(original, clientes);
    const quien = await quienEs(req);
    // El vendedor gana solo las suyas, igual que solo edita las suyas.
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que no es tuya para ganarla.`,
        permiso: true
      }, { status: 403 });
    }
    // Una reserva vive en un día: sin fecha exacta no hay dónde ponerla.
    if (!esFecha(p.fecha)) {
      return NextResponse.json({
        error: 'Ponle el día exacto antes de marcarla ganada: la reserva vive en un día.'
      }, { status: 400 });
    }
    // Convertir dos veces crearía dos reservas para la misma gente, y la
    // segunda sí ocuparía cupo de más. Se comprueba acá y no solo en la
    // pantalla: dos clics seguidos llegan como dos peticiones.
    if (p.idReserva) {
      return NextResponse.json({
        error: 'Este presupuesto ya se convirtió en reserva.'
      }, { status: 409 });
    }
    const visible = estadoVisible(p, hoy());
    if (visible === 'Vencida' || visible === ESTADO_PRESUPUESTO.rechazado
        || visible === ESTADO_PRESUPUESTO.noElegida) {
      return NextResponse.json({
        error: `Este presupuesto está ${visible.toLowerCase()}. `
             + 'Renueva su vigencia o vuelve a marcarlo antes de convertirlo.'
      }, { status: 409 });
    }

    // **Ganar una alternativa es elegirla** (2026-11-12, lo decidió el
    // cliente: *"ganar elige sola"*). Hasta ese día había que elegir antes
    // con cuál se quedó, y era un paso más que se perdía: la ventana de
    // confirmar ya dice qué otras pasan a "No elegida", que es lo de abajo.

    const [lineas, menus] = await Promise.all([
      leerLineasPresupuesto(), leerMenus()
    ]);
    const suyas = lineasDe(lineas, p.id);
    // Un candidato sin líneas se puede ganar si dijo cuánta gente viene: la
    // reserva ocupa esos lugares. Sin líneas ni invitados no hay qué reservar.
    if (suyas.length === 0 && !(p.invitados > 0)) {
      return NextResponse.json({
        error: 'Esta cotización no tiene nada cotizado ni invitados todavía.'
      }, { status: 400 });
    }

    // **Si hay anticipo, tiene que estar pagado** (2026-11-10, lo decidió el
    // cliente): ganar le toma la fecha a otro, y eso se hace con la plata
    // del anticipo adentro. Una cotización con anticipo 0 se gana sin él.
    const [cfg, cobros] = await Promise.all([leerConfig(), leerCobros()]);
    const total = totalDe(suyas, p.descuento);
    const cond = condicionesDe(p, total, cfg);
    const cobrado = estadoCobros({ anticipo: cond.anticipo, total }, cobrosDe(cobros, p.id));
    // Desde el 2026-11-11 también basta el contrato firmado (`puedeGanar()`).
    if (!puedeGanar(cobrado.anticipoListo, !!String(p.contrato ?? '').trim())) {
      return NextResponse.json({
        error: `Falta el anticipo: ${enPesos(cobrado.faltaAnticipo)}. Anota el cobro, `
          + 'sube el contrato firmado, o déjala sin anticipo si así se acordó.'
      }, { status: 409 });
    }

    // Quién lo convirtió queda como dueña de la reserva: la anotó una
    // persona, así que tiene dueño como cualquier otra anotada a mano.
    // **El cupo** (2026-11-11): si mientras se cotizaba el día se llenó, no se
    // toma la reserva. Se le dice a quien cotiza qué hacer, no solo que no.
    const nueva = reservaDesdePresupuesto(p, suyas, menus, quien.usuario);
    const [fechas, reservas] = await Promise.all([leerFechas(), leerReservas()]);
    /**
     * **Una ganada que quedó a medias se vuelve a vincular, no se duplica**
     * (2026-11-12). Ganar escribe primero la reserva y después el vínculo en
     * la cotización; si lo segundo falla —el límite de Google, por
     * ejemplo— la cotización sigue apareciendo sin ganar, y apretar *Marcar
     * ganada* otra vez creaba una segunda reserva para la misma gente. Si
     * ya existe la reserva de esta cotización (su nota dice "De la
     * cotización N° …") y ninguna otra cotización la reclama, se usa esa.
     */
    const nota = `De la cotización N° ${folioDe(p)}`;
    const aMedias = reservas.find((x) => x.fecha === p.fecha && ocupaLugar(x)
      && String(x.notaPago ?? '').startsWith(nota)
      && !lista.some((o) => o.idReserva === x.id));
    const tomadas = reservas.filter((x) => x.fecha === p.fecha && ocupaLugar(x) && x.id !== aMedias?.id)
      .reduce((n, x) => n + (x.personas || 0), 0);
    const cupo = cupoParaGanar(fechas.find((f) => f.fecha === p.fecha), p.fecha, cfg, tomadas, nueva.personas);
    if (!cupo.cabe && !aMedias) {
      return NextResponse.json({
        error: cupo.exclusivo
          ? 'Ese día está arrendado en exclusiva a otro cliente: no podemos tomar la reserva. '
            + 'Comunícate con la administración para ver otra fecha, o si habrá que cancelar la cotización.'
          : `Se está excediendo el cupo del día: quedan ${Math.max(0, cupo.libres)} lugares y la `
            + `cotización es de ${nueva.personas} personas. No podemos tomar la reserva. Comunícate con `
            + 'la administración para ver si se pueden abrir más cupos, o si habrá que cancelar la cotización.',
        cupo
      }, { status: 409 });
    }

    const idReserva = aMedias ? aMedias.id : await crearReserva(nueva);
    // **Ganar abre el día**, igual que anotar una reserva a mano: si no
    // estaba en el calendario se crea privado con el cupo de siempre, y si
    // estaba cerrado se abre para nosotros. Sin esto el día quedaba "sin
    // cupo" con la gente de la cotización adentro.
    const diaAbierto = await abrirElDiaSiHaceFalta(p.fecha);
    // Y recién ahora el vínculo, que es lo que apaga el conteo de posibles.
    // Se guarda la cotización ORIGINAL, no la que tiene el cliente resuelto:
    // las columnas viejas de cliente siguen en blanco si tenía ficha.
    const { fila: _fila, ...sinFila } = original;
    await guardarPresupuesto({
      ...sinFila, estado: ESTADO_PRESUPUESTO.aceptado, idReserva, diaAbierto
    });
    // **Las otras alternativas del grupo pasan a "No elegida"** (lo decidió
    // el cliente): ya no son gente posible, porque el cliente eligió otra.
    for (const otra of otrasAlternativas(original, lista)) {
      const { fila: _f, ...resto } = otra;
      await guardarPresupuesto({ ...resto, estado: ESTADO_PRESUPUESTO.noElegida });
    }

    // Si ya pagó todo, la reserva nace pagada.
    await actualizarPagoDeReserva(p.id);

    await anotar({ ...quien,
      accion: 'Marcó ganada una cotización',
      detalle: `${folioDe(p)} · ${p.cliente} · ${p.fecha} · reserva ${idReserva}` });
    return NextResponse.json({ idReserva });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
