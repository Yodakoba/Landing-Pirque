import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { borrarFecha , anotar } from '@/lib/datos';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'dias');
  if (no) return no;
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    await borrarFecha(fila);
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Borró un día', detalle: `fila ${fila}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
