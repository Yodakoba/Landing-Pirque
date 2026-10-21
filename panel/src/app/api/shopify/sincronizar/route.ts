/**
 * La reconciliación: le pregunta a Shopify por los pedidos recientes y
 * anota lo que falte.
 *
 * **No reemplaza al webhook, lo respalda.** El webhook da inmediatez; esto
 * recupera lo que se haya perdido —una caída, un despliegue a mitad de
 * camino, un webhook que nunca se creó— y es lo que hace que el sistema se
 * repare solo. Era la propiedad buena de preguntar cada 5 minutos, y se
 * conserva sin necesitar el plan Pro de Vercel.
 *
 * Corre una vez al día por vercel.json, que es lo que permite el plan
 * gratuito, y también se puede llamar a mano desde el panel.
 *
 * Mira una ventana de días hacia atrás en vez de guardar "hasta dónde
 * llegué": una marca guardada se puede perder o quedar adelantada, y
 * entonces el hueco no se rellena nunca. Pedir de más es gratis porque
 * guardarPedido() es idempotente.
 */
import { NextResponse } from 'next/server';
import { pedidosDesde, configurado } from '@/lib/admin';
import { aReserva } from '@/lib/shopify';
import { guardarPedido } from '@/lib/datos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DIAS_ATRAS = 10;

export async function GET(req: Request) {
  // La tarea programada de Vercel llega con un secreto en la cabecera. A
  // mano, desde el panel, llega con la contraseña del panel, que el
  // middleware ya verificó antes de que esto corra.
  const esperado = process.env.CRON_SECRET;
  const cabecera = req.headers.get('authorization');
  const deVercel = !!esperado && cabecera === `Bearer ${esperado}`;
  const delPanel = req.headers.get('x-panel') === 'si';
  if (!deVercel && !delPanel) {
    return new NextResponse('No autorizado.', { status: 401 });
  }

  if (!configurado()) {
    return NextResponse.json(
      { error: 'Shopify no está configurado: faltan SHOPIFY_DOMINIO o SHOPIFY_ADMIN_TOKEN.' },
      { status: 503 }
    );
  }

  try {
    const desde = new Date(Date.now() - DIAS_ATRAS * 24 * 60 * 60 * 1000);
    const pedidos = await pedidosDesde(desde);

    let creadas = 0, actualizadas = 0, ignorados = 0;
    const fallidos: string[] = [];

    for (const p of pedidos) {
      const reserva = aReserva(p);
      if (!reserva) { ignorados++; continue; }
      try {
        // En serie y no en paralelo: son dos escritores sobre la misma
        // planilla —esto y el webhook— y la API de Sheets no da bloqueo.
        // Veinte escrituras simultáneas se pisan entre ellas.
        if (await guardarPedido(reserva) === 'creada') creadas++;
        else actualizadas++;
      } catch (e) {
        // Un pedido que falla no puede detener los demás.
        fallidos.push(String(reserva.id));
        console.error('[sincronizar] pedido', reserva.id, e);
      }
    }

    const resumen = { revisados: pedidos.length, creadas, actualizadas, ignorados, fallidos };
    console.log('[sincronizar]', JSON.stringify(resumen));
    return NextResponse.json(resumen);
  } catch (e) {
    console.error('[sincronizar]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
