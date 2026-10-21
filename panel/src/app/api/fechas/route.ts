import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { leerFechas, guardarFecha , anotar } from '@/lib/datos';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const no = await exigir(req, 'ver');
  if (no) return no;
  try {
    return NextResponse.json({ fechas: await leerFechas() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const no = await exigir(req, 'dias');
  if (no) return no;
  try {
    const b = await req.json();
    if (!b.fecha) return NextResponse.json({ error: 'Falta la fecha.' }, { status: 400 });
    await guardarFecha({
      fecha: b.fecha,
      capacidad: Number(b.capacidad) || 0,
      apertura: b.apertura || '13:00',
      estado: b.estado || 'Abierta',
      notas: b.notas ?? ''
    });
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Cambió un día',
      detalle: `${b.fecha} · ${b.estado || 'Abierta'} · cupo ${Number(b.capacidad) || 0}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
