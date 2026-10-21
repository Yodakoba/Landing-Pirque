/**
 * El webhook de Shopify. Acá llegan los pedidos en cuanto ocurren.
 *
 * **Esta ruta existe porque Vercel da acceso a las cabeceras.** El backend
 * de Apps Script no podía: sin cabeceras no se puede verificar la firma
 * HMAC, y sin firma cualquiera que descubriera la URL podría inventar
 * reservas. Por eso allá se preguntaba cada 5 minutos en vez de recibir.
 *
 * Acá se recibe Y se pregunta: el webhook da inmediatez y la tarea diaria
 * de /api/shopify/sincronizar rellena lo que se haya perdido. Eso devuelve
 * la propiedad que hacía valiosa la consulta —recuperarse sola de una
 * caída— sin necesitar el plan Pro de Vercel, que es el único que permite
 * tareas más frecuentes que una vez al día.
 *
 * Es pública por fuerza —Shopify no puede autenticarse con nuestra
 * contraseña— así que la firma es lo único que la protege. Está en la lista
 * PUBLICAS de src/middleware.ts.
 */
import { NextResponse } from 'next/server';
import { firmaValida } from '@/lib/firma';
import { aReserva } from '@/lib/shopify';
import { guardarPedido, leerMenus, leerConfig } from '@/lib/datos';
import { eventoDe, idDeEvento } from '@/lib/calendario';
import { guardarEvento, borrarEvento, hayCalendario } from '@/lib/google-calendar';
import { ocupaLugar } from '@/lib/ocupacion';
import type { Reserva } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // El cuerpo CRUDO, sin parsear: la firma se calcula sobre el texto exacto
  // que llegó. Parsear y volver a serializar cambia un espacio y la firma
  // deja de calzar.
  const cuerpo = await req.text();
  const firma = req.headers.get('x-shopify-hmac-sha256');

  if (!firmaValida(cuerpo, firma, process.env.SHOPIFY_WEBHOOK_SECRET)) {
    // Sin detalles en la respuesta: a quien manda una firma inválida no se
    // le explica por qué falló.
    console.warn('[webhook] firma inválida',
      req.headers.get('x-shopify-topic') ?? 'sin topic');
    return new NextResponse('Firma inválida.', { status: 401 });
  }

  try {
    const pedido = JSON.parse(cuerpo);
    // Con la lista de menus para que el nombre quede canonizado al escribir:
    // "Menu Tradiciones" de la tienda se guarda como "Tradiciones".
    const reserva = aReserva(pedido, await leerMenus());

    // Un pedido sin _booking_date no es una reserva: puede ser cualquier
    // otra cosa vendida en la tienda. Se responde 200 igual, porque para
    // Shopify el webhook SÍ se entregó bien; un error haría que lo
    // reintente para siempre.
    if (!reserva) {
      return NextResponse.json({ ok: true, ignorado: 'sin fecha de reserva' });
    }

    const que = await guardarPedido(reserva);
    console.log(`[webhook] ${req.headers.get('x-shopify-topic')} pedido ${reserva.id}: ${que}`);

    await anotarEnElCalendario(reserva);

    return NextResponse.json({ ok: true, [que]: reserva.id });
  } catch (e) {
    // Acá sí conviene fallar: un 500 hace que Shopify reintente, y si la
    // planilla estaba caída un momento el reintento la salva. El guardado
    // es idempotente, así que reintentar no duplica nada.
    console.error('[webhook]', e);
    return NextResponse.json({ error: 'No pudimos anotar la reserva.' }, { status: 500 });
  }
}

/**
 * El evento del calendario, que es una comodidad y no la verdad.
 *
 * **Si falla, se registra y se sigue.** La planilla ya tiene la reserva; que
 * Google no responda, o que nadie haya compartido el calendario con la
 * cuenta de servicio, no puede hacer que el webhook devuelva error y que
 * Shopify lo reintente para siempre. Es la misma regla que traía el Apps
 * Script.
 *
 * Una reserva que deja de ocupar lugar —cancelada, reembolsada— **borra su
 * evento**: una cancelada que sigue en el calendario es peor que ninguna,
 * porque alguien cuenta sillas mirándolo.
 */
async function anotarEnElCalendario(reserva: Omit<Reserva, 'fila'>) {
  if (!hayCalendario()) return;
  try {
    if (!ocupaLugar(reserva as Reserva)) {
      await borrarEvento(idDeEvento(reserva.id));
      console.log(`[webhook] evento borrado: ${reserva.id}`);
      return;
    }
    const cfg = await leerConfig();
    const que = await guardarEvento(eventoDe(reserva, cfg.horaApertura, cfg.horaCierre));
    console.log(`[webhook] evento ${que}: ${reserva.id}`);
  } catch (e) {
    console.error('[webhook] calendario', e);
  }
}
