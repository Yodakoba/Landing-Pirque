import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_RESERVAS, HOJA_FECHAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { exigir, quienEs } from '@/lib/permisos';
import { puede, type Rol } from '@/lib/auth';
import { editarReserva, anotar, leerReservas, leerFechas, leerConfig } from '@/lib/datos';
import { ocupaLugar } from '@/lib/ocupacion';
import { yaAbrio } from '@/lib/cierres';
import { ahoraEnChile } from '@/lib/bitacora';
import { empujarDias } from '@/lib/crm-escribir';
import { guardaDelDia } from '@/lib/guardaCierre';
import {
  erroresRectificacion, necesitaAprobacion, marcaRectificacion, marcaAprobacion, POR_APROBAR,
  resumenRectificacion, estaRectificada, LARGO_MINIMO_COMENTARIO
} from '@/lib/rectificacion';

export const dynamic = 'force-dynamic';

/**
 * **Rectificar una reserva el día del servicio** (2026-11-12, lo pidió el
 * cliente). Anota lo que de verdad pasó en la mesa —cuántos llegaron, qué
 * menús, un descuento— con motivo obligatorio. Ver `lib/rectificacion.ts`.
 *
 * - Permiso `rectificar`: administrador, gerente, encargado y quien paga.
 *   **Cualquier reserva del día**, también la de otro vendedor: esa es la
 *   diferencia con editar, que es solo la propia.
 * - **Solo desde la apertura del día** (`yaAbrio()`): antes la reserva no
 *   ha llegado. Un día cerrado es una corrección (`guardaDelDia()`), o sea
 *   del gerente, quien paga o el administrador.
 * - **Un descuento que no es estándar queda por aprobar**, salvo que quien
 *   rectifica pueda aprobarlo (permiso `aprobar`).
 * - No toca las columnas de la reserva: escribe las suyas, que Shopify y la
 *   cotización no reescriben.
 */
export const POST = conLecturas([HOJA_RESERVAS, HOJA_FECHAS, HOJA_CONFIG, HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'rectificar');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fila = Number(cuerpo.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    const [reservas, fechas, cfg] = await Promise.all([leerReservas(), leerFechas(), leerConfig()]);
    const r = reservas.find((x) => x.fila === fila);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });
    if (!ocupaLugar(r)) {
      return NextResponse.json({ error: 'Esa reserva ya no viene: no hay nada que rectificar.' }, { status: 409 });
    }
    const apertura = fechas.find((f) => f.fecha === r.fecha)?.apertura || cfg.horaApertura;
    if (!yaAbrio(r.fecha, apertura, ahoraEnChile())) {
      return NextResponse.json({
        error: `Una reserva se rectifica desde la apertura de su día (${apertura}). Antes, la cambia quien la anotó.`
      }, { status: 409 });
    }

    const pedido = {
      personas: Math.round(Number(cuerpo.personas)),
      menu: String(cuerpo.menu ?? '').trim(),
      descuento: cuerpo.descuento === null || cuerpo.descuento === '' || cuerpo.descuento === undefined
        ? null : Number(cuerpo.descuento),
      motivo: String(cuerpo.motivo ?? '').trim().slice(0, 60),
      comentario: String(cuerpo.comentario ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)
    };
    const errores = erroresRectificacion(pedido);
    if (errores.length) return NextResponse.json({ error: errores.join(' ') }, { status: 400 });

    const guarda = await guardaDelDia(req, [r.fecha], cuerpo.correccion ?? { motivo: `${pedido.motivo}: ${pedido.comentario}` });
    if ('error' in guarda) return guarda.error;

    const quien = await quienEs(req);
    const ahora = ahoraEnChile();
    const descuento = pedido.descuento && pedido.descuento > 0 ? pedido.descuento : null;
    const aprobacion = !necesitaAprobacion(descuento, cfg.descuentos) ? ''
      : puede(quien.rol as Rol, 'aprobar') ? marcaAprobacion(true, quien.usuario, ahora) : POR_APROBAR;
    const cambios = {
      personasReales: pedido.personas,
      menuReal: pedido.menu,
      descuento,
      rectificacion: marcaRectificacion(ahora, quien.usuario, pedido.motivo, pedido.comentario),
      aprobacion
    };
    await editarReserva(fila, cambios);
    await empujarDias([r.fecha]);
    await anotar({ ...quien, accion: 'Rectificó una reserva',
      detalle: `${r.nombre} · ${r.fecha} · ${resumenRectificacion({ ...r, ...cambios })} · ${pedido.motivo}: ${pedido.comentario}`
        + (aprobacion === POR_APROBAR ? ' · descuento por aprobar' : '') });
    return NextResponse.json({ ok: true, porAprobar: aprobacion === POR_APROBAR });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * **Deshacer una rectificación** mientras el día esté abierto: la deshace
 * quien la hizo, o quien puede aprobar. Pide motivo y queda en la bitácora.
 */
export const DELETE = conLecturas([HOJA_RESERVAS], async function DELETE(req: Request) {
  const no = await exigir(req, 'rectificar');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fila = Number(cuerpo.fila);
    const motivo = String(cuerpo.motivo ?? '').replace(/\s+/g, ' ').trim();
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    if (motivo.length < LARGO_MINIMO_COMENTARIO) {
      return NextResponse.json({ error: 'Escribe por qué se deshace: queda anotado.' }, { status: 400 });
    }
    const r = (await leerReservas()).find((x) => x.fila === fila);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });
    if (!estaRectificada(r)) return NextResponse.json({ error: 'Esa reserva no está rectificada.' }, { status: 409 });
    const quien = await quienEs(req);
    const autor = String(r.rectificacion ?? '').split(' · ')[1] ?? '';
    const propia = autor.trim().toLowerCase() === quien.usuario.trim().toLowerCase();
    if (!propia && !puede(quien.rol as Rol, 'aprobar')) {
      return NextResponse.json({
        error: `La rectificó ${autor || 'otra persona'}: la deshace esa persona, el gerente o quien paga.`, permiso: true
      }, { status: 403 });
    }
    const guarda = await guardaDelDia(req, [r.fecha], cuerpo.correccion ?? { motivo });
    if ('error' in guarda) return guarda.error;
    await editarReserva(fila, { personasReales: null, menuReal: '', descuento: null, rectificacion: '', aprobacion: '' });
    await empujarDias([r.fecha]);
    await anotar({ ...quien, accion: 'Deshizo una rectificación',
      detalle: `${r.nombre} · ${r.fecha} · era: ${r.rectificacion} · motivo: ${motivo}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
