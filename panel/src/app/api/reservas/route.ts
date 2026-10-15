import { NextResponse } from 'next/server';
import { leerReservas, crearReserva } from '@/lib/datos';

export const dynamic = 'force-dynamic';   // nunca cachear: son datos vivos

export async function GET() {
  try {
    return NextResponse.json({ reservas: await leerReservas() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.fecha || !b.nombre) {
      return NextResponse.json(
        { error: 'La fecha y el nombre son obligatorios.' }, { status: 400 });
    }
    if (!(Number(b.personas) > 0)) {
      return NextResponse.json(
        { error: 'Una reserva sin personas no es una reserva.' }, { status: 400 });
    }
    const id = await crearReserva({
      fecha: b.fecha, nombre: b.nombre, email: b.email ?? '',
      telefono: b.telefono ?? '', menu: b.menu ?? '', personas: Number(b.personas),
      // El monto queda en blanco a propósito: los precios viven en Shopify y
      // en el sitio. Que el panel los fije sería una segunda verdad.
      monto: null, tipoPago: b.tipoPago ?? '', estadoPago: b.estadoPago ?? ''
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
