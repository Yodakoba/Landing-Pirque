/**
 * **Abre los días de la regla** (2026-11-18): los de *Días que se abre* de
 * aquí a *Días hacia adelante* que todavía no están en el calendario, como
 * día público con el cupo normal. Un día que ya tiene su fila no se toca.
 * La lógica vive en `diasPorAbrir()` (`lib/dias.ts`) y la escritura en
 * `abrirDiasDeLaRegla()` (`lib/datos.ts`).
 *
 * Corre una vez al día por `vercel.json`, con `CRON_SECRET`, y también la
 * puede llamar a mano el administrador. Si abrió algo, queda en la bitácora.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { esTareaProgramada } from '@/lib/auth';
import { abrirDiasDeLaRegla, anotar } from '@/lib/datos';
import { enCorto } from '@/lib/fechas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = conLecturas([], async function GET(req: Request) {
  const deVercel = esTareaProgramada(new URL(req.url).pathname,
    req.headers.get('authorization'), process.env.CRON_SECRET);
  if (!deVercel) {
    const no = await exigir(req, 'mantencion');
    if (no) return no;
  }
  try {
    const abiertos = await abrirDiasDeLaRegla();
    if (abiertos.length) {
      const quien = deVercel ? { usuario: 'Tarea diaria', rol: 'sistema' } : await quienEs(req);
      await anotar({ ...quien, accion: 'Abrió solos los días de la regla',
        detalle: `${abiertos.length} ${abiertos.length === 1 ? 'día' : 'días'}: ${abiertos.map(enCorto).join(', ')}` });
    }
    return NextResponse.json({ ok: true, abiertos });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
