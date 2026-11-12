import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { puedeTocarReserva, type Rol } from '@/lib/auth';
import { editarReserva, anotar, leerReservas, reservasDeCotizaciones } from '@/lib/datos';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { ocupaLugar, tienePrioridad } from '@/lib/ocupacion';
import { marcaLiberada } from '@/lib/sobrecupo';
import { empujarDias } from '@/lib/crm-escribir';
import { guardaDelDia } from '@/lib/guardaCierre';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * **Soltar una reserva sin pagar porque el día se llenó** (2026-11-12, la
 * regla del cliente: una reserva sin pagar queda sujeta a espacio).
 *
 * Escribe `Se cayó por cupo` con cuándo, quién y por qué, y con eso la
 * reserva deja de ocupar lugar (`ocupaLugar()`). **No toca su estado del
 * pago**: el de una reserva de Shopify lo reescribe la tienda, y la reserva
 * volvería sola a tomar su lugar. Avisarle al cliente lo hace la pantalla,
 * con el WhatsApp prellenado.
 *
 * - Solo una reserva **sin pagar**: una pagada o abonada tiene prioridad y
 *   no se suelta. Si hay que sacarla, es otra conversación —cancelarla, con
 *   su devolución—.
 * - **Una de una cotización no se suelta acá**: se cancela el evento desde
 *   la cotización, que es donde viven sus condiciones y su devolución. Si
 *   no, la cotización seguiría diciendo *Ganada* sin gente en el día.
 * - El vendedor suelta solo las suyas, como todo lo que toca una reserva.
 * - En un día cerrado es una corrección, con motivo.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fila = Number(cuerpo.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    const motivo = String(cuerpo.motivo ?? '').replace(/\s+/g, ' ').trim();
    if (!motivo) {
      return NextResponse.json({ error: 'Escribe por qué se suelta: queda en la bitácora y en la reserva.' }, { status: 400 });
    }
    const r = (await leerReservas()).find((x) => x.fila === fila);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });
    const quien = await quienEs(req);
    if (!puedeTocarReserva(quien.rol as Rol, quien.usuario, r.anotadaPor)) {
      return NextResponse.json({
        error: r.anotadaPor
          ? `Esa reserva la anotó ${r.anotadaPor}: pídele a esa persona o al encargado que la suelte.`
          : 'Esa reserva no la anotaste tú: pídele al encargado que la suelte.',
        permiso: true
      }, { status: 403 });
    }
    if (!ocupaLugar(r)) {
      return NextResponse.json({ error: 'Esa reserva ya no ocupa lugar: no hay nada que soltar.' }, { status: 409 });
    }
    if (tienePrioridad(r)) {
      return NextResponse.json({
        error: 'Esa reserva ya pagó (o abonó), así que tiene prioridad y no se suelta. '
          + 'Si de verdad no viene, cancélala con su devolución.'
      }, { status: 409 });
    }
    const deCotizacion = (await reservasDeCotizaciones()).get(r.id);
    if (deCotizacion) {
      return NextResponse.json({
        error: `Esta reserva viene de la cotización N° ${folioDe({ id: deCotizacion })}: `
          + 'si se cae, cancela el evento desde la cotización, que calcula la devolución.',
        cotizacion: deCotizacion
      }, { status: 409 });
    }
    const guarda = await guardaDelDia(req, [r.fecha], cuerpo.correccion ?? { motivo });
    if ('error' in guarda) return guarda.error;

    await editarReserva(fila, { liberada: marcaLiberada(ahoraEnChile(), quien.usuario, motivo) });
    await empujarDias([r.fecha]);
    await anotar({ ...quien, accion: 'Soltó una reserva por cupo',
      detalle: `${r.nombre} · ${r.fecha} · ${r.personas} personas · motivo: ${motivo}`
        + (/^\d+$/.test(r.id) ? ' · es de Shopify: cancelar también allá' : '') });
    return NextResponse.json({ ok: true, deShopify: /^\d+$/.test(r.id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
