import { NextResponse } from 'next/server';
import { marcarBoleta, anotar } from '@/lib/datos';
import { exigir, quienEs } from '@/lib/permisos';
import { esFecha } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * Marca o desmarca que llegó la boleta de una persona por un periodo
 * (2026-11-04).
 *
 * **Es del permiso `pagar`**, igual que registrar un pago: decir que el
 * papel que respalda un pago llegó es parte de pagar, y queda en la
 * bitácora con nombre y hora. El encargado ve el informe, pero no marca.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const c = (await req.json()) as Record<string, unknown>;
    const quien = String(c.quien ?? '').trim();
    const desde = String(c.desde ?? '').slice(0, 10);
    const hasta = String(c.hasta ?? '').slice(0, 10);
    if (!quien || !esFecha(desde) || !esFecha(hasta) || desde > hasta) {
      return NextResponse.json({ error: 'Falta la persona o el periodo.' }, { status: 400 });
    }
    const recibida = c.recibida === true;
    const yo = await quienEs(req);
    await marcarBoleta(quien, desde, hasta, recibida, yo.usuario);
    await anotar({ ...yo,
      accion: recibida ? 'Marcó boleta recibida' : 'Desmarcó una boleta',
      detalle: `${quien} · ${desde} a ${hasta}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
