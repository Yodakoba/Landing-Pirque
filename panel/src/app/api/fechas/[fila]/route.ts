import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { borrarFecha, leerFechas, anotar } from '@/lib/datos';
import { empujarDia } from '@/lib/crm-escribir';

export const dynamic = 'force-dynamic';

export async function DELETE(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'dias');
  if (no) return no;
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    // Se lee ANTES de borrarla, por dos cosas: después no queda de dónde
    // sacar la fecha para la bitácora —y "fila 7" no le sirve a nadie dentro
    // de un mes, igual que en las reservas— y es la fecha que hay que
    // empujarle al socio.
    const antes = (await leerFechas()).find((f) => f.fila === fila);
    await borrarFecha(fila);
    // Sacar el día de la hoja lo deja sin estado y sin cupo, así que
    // probablemente deje de calificar. `empujarDia()` decide si se manda
    // distinto o se saca; si todavía tiene reservas, se queda.
    if (antes) await empujarDia(antes.fecha);
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Borró un día',
      detalle: antes ? `${antes.fecha} · cupo ${antes.capacidad}` : `fila ${fila}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
