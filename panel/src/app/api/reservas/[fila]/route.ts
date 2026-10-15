import { NextResponse } from 'next/server';
import { editarReserva, borrarReserva } from '@/lib/datos';

export const dynamic = 'force-dynamic';

// La fila de la planilla es el identificador para editar: el ID Orden puede
// venir vacío en pedidos viejos, la fila nunca.
export async function PATCH(req: Request, { params }: { params: { fila: string } }) {
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    await editarReserva(fila, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { fila: string } }) {
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    await borrarReserva(fila);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
