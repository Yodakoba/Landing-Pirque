import { NextResponse } from 'next/server';
import { leerFechas, guardarFecha } from '@/lib/datos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ fechas: await leerFechas() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
