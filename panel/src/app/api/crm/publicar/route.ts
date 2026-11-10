/**
 * La reconciliación hacia el calendario del socio: publica nuestros días y
 * saca los que dejaron de calificar.
 *
 * **No reemplaza al empujón, lo respalda**, igual que
 * `/api/shopify/sincronizar` respalda al webhook. El empujón al guardar un
 * día da inmediatez; esto recupera lo que se haya perdido —el CRM caído, un
 * despliegue a mitad de camino, una reserva que entró por webhook sin que
 * nadie tocara el día— y es lo que hace que el calendario del socio se repare
 * solo.
 *
 * Es una ruta aparte de `/api/shopify/sincronizar` a propósito: son dos
 * servicios de terceros distintos y una falla en uno no puede dejar al otro
 * sin correr. **El orden entre las dos no está garantizado** —en el plan
 * gratuito de Vercel la hora es aproximada y el minuto no se respeta— y no
 * hace falta que lo esté: esto publica la ocupación que haya en ese momento,
 * y si entró una reserva en el medio, la corrige mañana.
 *
 * Corre una vez al día por `vercel.json`, que es lo que permite el plan
 * gratuito, y también se puede llamar a mano.
 */
import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import { iguales } from '@/lib/auth';
import { configurado, reconciliarTodo, retirarTodo } from '@/lib/crm-escribir';
import { CRM_APAGADO } from '@/lib/crm';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  // Las dos formas legítimas de llegar acá, igual que la de Shopify: la tarea
  // programada de Vercel con su secreto, o un administrador a mano. Una
  // cabecera inventada no sirve: el permiso se comprueba de verdad.
  const esperado = process.env.CRON_SECRET;
  const cabecera = req.headers.get('authorization') ?? '';
  const deVercel = !!esperado && iguales(cabecera, `Bearer ${esperado}`);
  if (!deVercel) {
    const no = await exigir(req, 'mantencion');
    if (no) return no;
  }

  if (!configurado()) {
    // 200 y no un error: que el CRM no esté configurado es un estado
    // legítimo del panel, no una falla. Igual que `/api/crm/eventos`.
    return NextResponse.json({ configurado: false, guardados: 0, eliminados: 0 });
  }

  // **Apagada la conexión, la tarea diaria retira lo nuestro** en vez de
  // publicarlo. Ver `CRM_APAGADO`.
  if (CRM_APAGADO) {
    try {
      const r = await retirarTodo();
      return NextResponse.json({ configurado: true, apagado: true, ...r });
    } catch (e) {
      console.error('[crm:retirar]', e);
      return NextResponse.json(
        { configurado: true, apagado: true, error: (e as Error).message }, { status: 502 });
    }
  }

  try {
    const r = await reconciliarTodo();
    return NextResponse.json({
      configurado: true,
      desde: r.desde,
      hasta: r.hasta,
      guardados: r.guardados,
      eliminados: r.eliminados,
      // Qué se mandó y qué se sacó, para poder revisarlo sin abrir los logs
      // de Vercel. Son fechas y títulos: nada de clientes ni de notas.
      publicados: r.publicar.map((d) => `${d.fecha} · ${d.titulo}`),
      borrados: r.borrar,
      // Los que no se pudieron sacar, nombrados en vez de callados: se
      // reintentan mañana, pero uno que aparezca todos los días es algo que
      // hay que ir a mirar.
      fallaron: r.fallaron
    });
  } catch (e) {
    console.error('[crm:publicar]', e);
    return NextResponse.json(
      { configurado: true, error: (e as Error).message }, { status: 502 }
    );
  }
}
