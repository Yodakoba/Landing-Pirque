import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import { borrarFecha } from '@/lib/datos';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { fila: string } }) {
  const no = exigir(req, 'dias');
  if (no) return no;
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    await borrarFecha(fila);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
