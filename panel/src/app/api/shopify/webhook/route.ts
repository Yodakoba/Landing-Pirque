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
import { guardarPedido } from '@/lib/datos';

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
    const reserva = aReserva(pedido);

    // Un pedido sin _booking_date no es una reserva: puede ser cualquier
    // otra cosa vendida en la tienda. Se responde 200 igual, porque para
    // Shopify el webhook SÍ se entregó bien; un error haría que lo
    // reintente para siempre.
    if (!reserva) {
      return NextResponse.json({ ok: true, ignorado: 'sin fecha de reserva' });
    }

    const que = await guardarPedido(reserva);
    console.log(`[webhook] ${req.headers.get('x-shopify-topic')} pedido ${reserva.id}: ${que}`);
    return NextResponse.json({ ok: true, [que]: reserva.id });
  } catch (e) {
    // Acá sí conviene fallar: un 500 hace que Shopify reintente, y si la
    // planilla estaba caída un momento el reintento la salva. El guardado
    // es idempotente, así que reintentar no duplica nada.
    console.error('[webhook]', e);
    return NextResponse.json({ error: 'No pudimos anotar la reserva.' }, { status: 500 });
  }
}
