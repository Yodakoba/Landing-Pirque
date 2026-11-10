import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerLineasPresupuesto, guardarPresupuesto,
  crearReserva, leerMenus, leerClientes, anotar
} from '@/lib/datos';
import { conCliente, otrasAlternativas } from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { esFecha } from '@/lib/fechas';
import {
  lineasDe, reservaDesdePresupuesto, folioDe, estadoVisible,
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

    // Quién lo convirtió queda como dueña de la reserva: la anotó una
    // persona, así que tiene dueño como cualquier otra anotada a mano.
    const idReserva = await crearReserva(
      reservaDesdePresupuesto(p, suyas, menus, quien.usuario));
    // Y recién ahora el vínculo, que es lo que apaga el conteo de posibles.
    // Se guarda la cotización ORIGINAL, no la que tiene el cliente resuelto:
    // las columnas viejas de cliente siguen en blanco si tenía ficha.
    const { fila: _fila, ...sinFila } = original;
    await guardarPresupuesto({
      ...sinFila, estado: ESTADO_PRESUPUESTO.aceptado, idReserva
    });
    // **Las otras alternativas del grupo pasan a "No elegida"** (lo decidió
    // el cliente): ya no son gente posible, porque el cliente eligió otra.
    for (const otra of otrasAlternativas(original, lista)) {
      const { fila: _f, ...resto } = otra;
      await guardarPresupuesto({ ...resto, estado: ESTADO_PRESUPUESTO.noElegida });
    }

    await anotar({ ...quien,
      accion: 'Marcó ganada una cotización',
      detalle: `${folioDe(p)} · ${p.cliente} · ${p.fecha} · reserva ${idReserva}` });
    return NextResponse.json({ idReserva });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
