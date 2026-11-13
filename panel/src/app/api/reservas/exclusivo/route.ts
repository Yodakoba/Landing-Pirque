import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { HOJA_RESERVAS, HOJA_FECHAS, estaCerrado, esExclusiva } from '@/lib/columnas';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { HOJA_CIERRES } from '@/lib/cierres';
import { HOJA_CONFIG } from '@/lib/config';
import { leerReservas, leerPresupuestos, leerFechas, editarReserva, crearReserva, anotar,
         reservasDeCotizaciones, abrirElDiaSiHaceFalta } from '@/lib/datos';
import { ocupaLugar } from '@/lib/ocupacion';
import { marcaLiberada } from '@/lib/sobrecupo';
import { empujarDias } from '@/lib/crm-escribir';
import { guardaDelDia } from '@/lib/guardaCierre';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy, esFecha } from '@/lib/fechas';
import { grupoDe } from '@/lib/cotizar';
import { ASISTENCIA } from '@/lib/columnas';
import {
  esExclusivo, exclusividadDe, liberacionDe, marcaLiberacion, motivoLiberada, montoADevolver,
  esDeShopify, notaReagendada
} from '@/lib/exclusivo';

export const dynamic = 'force-dynamic';

const ACCIONES = ['avisar', 'cancelar', 'reagendar', 'devuelta'] as const;
type Accion = typeof ACCIONES[number];

/**
 * **Liberar el día para un evento exclusivo, reserva por reserva**
 * (2026-11-12, segunda entrega; ver `lib/exclusivo.ts`). Solo en un día con
 * una cotización exclusiva cuyo pedido ya se **aprobó**.
 *
 * - `avisar` (permiso `operarDia`): quedó avisada. El WhatsApp lo abre la
 *   pantalla; esto deja escrito que se hizo, y quién.
 * - `cancelar` (`exclusividad`): deja su lugar (`Se cayó por cupo` con el
 *   motivo del evento exclusivo) y queda la devolución completa por hacer.
 * - `reagendar` (`exclusividad`, con `fecha`): **crea la reserva en el día
 *   nuevo** —con su pago, su nota y el pisco sour de regalo— y después
 *   libera la de este día. Se crea una nueva y no se le cambia la fecha
 *   porque la de una reserva de Shopify la reescribe la tienda en cada
 *   sincronización. Reserva primero: si lo segundo falla, se ve doble y se
 *   nota, en vez de perder a alguien.
 * - `devuelta` (`pagar`, desde el 2026-11-13): la devolución de una cancelada ya se hizo.
 *
 * Una reserva que viene de otra cotización no se toca acá: se cancela o se
 * mueve desde su cotización, que tiene sus condiciones y su devolución.
 */
export const POST = conLecturas([HOJA_RESERVAS, HOJA_PRESUPUESTOS, HOJA_FECHAS, HOJA_CIERRES, HOJA_CONFIG], async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const accion = String(b.accion ?? '') as Accion;
    if (!ACCIONES.includes(accion)) return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
    // **Dar una devolución por hecha es de pagos** (2026-11-13, regla del
    // cliente: la plata la cierra el encargado de pagos).
    const no = await exigir(req, accion === 'avisar' ? 'operarDia' : accion === 'devuelta' ? 'pagar' : 'exclusividad');
    if (no) return no;

    const fila = Number(b.fila);
    const [reservas, presupuestos] = await Promise.all([leerReservas(), leerPresupuestos()]);
    const r = reservas.find((x) => x.fila === fila);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });

    // El día tiene que estar liberándose: una exclusiva aprobada y sin ganar.
    const cot = presupuestos.find((p) => p.fecha === r.fecha && esExclusivo(p.exclusivo)
      && exclusividadDe(p.exclusividad).estado === 'aprobada' && !p.idReserva);
    const estado = liberacionDe(r.liberacion).estado;
    if (!cot && accion !== 'devuelta') {
      return NextResponse.json({ error: 'Ese día no tiene un evento exclusivo aprobado: no hay nada que liberar.' }, { status: 409 });
    }
    const quien = await quienEs(req);
    const cuando = ahoraEnChile();
    const folio = cot ? folioDe({ id: grupoDe(cot) }) : '';

    if (accion === 'devuelta') {
      if (estado !== 'cancelada' || montoADevolver(r) <= 0) return NextResponse.json({ error: 'Esa reserva no tiene una devolución pendiente.' }, { status: 409 });
      await editarReserva(fila, { liberacion: marcaLiberacion('devuelta', quien.usuario, cuando) });
      await anotar({ ...quien, accion: 'Hizo la devolución de una reserva liberada por un evento exclusivo',
        detalle: `${r.nombre} · ${r.fecha} · ${montoADevolver(r)}${esDeShopify(r.id) ? ` · pedido Shopify ${r.id}` : ''}` });
      return NextResponse.json({ ok: true });
    }

    if (!ocupaLugar(r)) {
      return NextResponse.json({ error: 'Esa reserva ya no ocupa lugar ese día: ya está resuelta.' }, { status: 409 });
    }
    const deCotizacion = (await reservasDeCotizaciones()).get(r.id);
    if (deCotizacion && accion !== 'avisar') {
      return NextResponse.json({
        error: `Esta reserva viene de la cotización N° ${folioDe({ id: deCotizacion })}: se cancela o se cambia `
          + 'de fecha desde esa cotización, que tiene sus condiciones y su devolución.',
        cotizacion: deCotizacion
      }, { status: 409 });
    }

    if (accion === 'avisar') {
      if (estado) return NextResponse.json({ ok: true });
      await editarReserva(fila, { liberacion: marcaLiberacion('avisada', quien.usuario, cuando) });
      await anotar({ ...quien, accion: 'Avisó a una reserva por un evento exclusivo', detalle: `${r.nombre} · ${r.fecha} · cotización N° ${folio}` });
      return NextResponse.json({ ok: true });
    }

    // En un día ya cerrado —el de la reserva o el nuevo— es una corrección.
    const guarda = await guardaDelDia(req, accion === 'reagendar' && esFecha(String(b.fecha ?? ''))
      ? [r.fecha, String(b.fecha)] : [r.fecha], b.correccion);
    if ('error' in guarda) return guarda.error;

    if (accion === 'cancelar') {
      const devolver = montoADevolver(r);
      await editarReserva(fila, {
        liberada: marcaLiberada(cuando, quien.usuario, motivoLiberada('cancelada')),
        liberacion: marcaLiberacion('cancelada', quien.usuario, cuando,
          devolver > 0 ? `devolver ${devolver}` : 'sin pago que devolver')
      });
      await empujarDias([r.fecha]);
      await anotar({ ...quien, accion: 'Canceló una reserva por un evento exclusivo',
        detalle: `${r.nombre} · ${r.fecha} · ${r.personas} personas · cotización N° ${folio}`
          + (devolver > 0 ? ` · devolver ${devolver}` : '') + (esDeShopify(r.id) ? ' · es de Shopify: cancelar y reembolsar allá' : '') });
      return NextResponse.json({ ok: true, devolver, deShopify: esDeShopify(r.id) });
    }

    // reagendar
    const nueva = String(b.fecha ?? '');
    if (!esFecha(nueva)) return NextResponse.json({ error: 'Elige el día nuevo.' }, { status: 400 });
    if (nueva === r.fecha) return NextResponse.json({ error: 'Es el mismo día: elige otro.' }, { status: 400 });
    if (nueva < hoy()) return NextResponse.json({ error: 'Ese día ya pasó.' }, { status: 400 });
    const dia = (await leerFechas()).find((f) => f.fecha === nueva);
    if (!dia || estaCerrado(dia.estado)) {
      return NextResponse.json({ error: 'Ese día no está abierto: elige uno del calendario.' }, { status: 409 });
    }
    if (esExclusiva(dia.estado)) {
      return NextResponse.json({ error: 'Ese día también está arrendado en exclusiva.' }, { status: 409 });
    }
    if (presupuestos.some((p) => p.fecha === nueva && esExclusivo(p.exclusivo)
        && exclusividadDe(p.exclusividad).estado === 'aprobada' && !p.idReserva)) {
      return NextResponse.json({ error: 'Ese día también se está liberando para un evento exclusivo.' }, { status: 409 });
    }
    const id = await crearReserva({
      fecha: nueva, nombre: r.nombre, email: r.email, telefono: r.telefono, menu: r.menu, personas: r.personas,
      monto: r.monto, tipoPago: '', estadoPago: r.estadoPago, abonado: r.abonado ?? null,
      notaPago: notaReagendada(r), eventoCRM: '', asistencia: ASISTENCIA.sinMarcar,
      // Sigue siendo de quien la anotó: el vendedor no pierde a su cliente.
      anotadaPor: r.anotadaPor || quien.usuario
    });
    await abrirElDiaSiHaceFalta(nueva);
    await editarReserva(fila, {
      liberada: marcaLiberada(cuando, quien.usuario, motivoLiberada('reagendada', nueva)),
      liberacion: marcaLiberacion('reagendada', quien.usuario, cuando, `al ${nueva}`)
    });
    await empujarDias([r.fecha, nueva]);
    await anotar({ ...quien, accion: 'Cambió de fecha una reserva por un evento exclusivo',
      detalle: `${r.nombre} · del ${r.fecha} al ${nueva} · ${r.personas} personas · cotización N° ${folio} · nueva ${id}` });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
