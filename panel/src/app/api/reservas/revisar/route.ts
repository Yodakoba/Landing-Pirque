import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_RESERVAS } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { editarReserva, anotar, leerReservas } from '@/lib/datos';
import { ahoraEnChile } from '@/lib/bitacora';
import { firmaDescuento, firmaPago, marcaPlata } from '@/lib/plata';
import { pagoEnEspanol } from '@/lib/pagos';

export const dynamic = 'force-dynamic';

/**
 * **Pagos revisa lo que se anotó** (2026-11-13, `plata.ts`): el pago de una
 * reserva anotada a mano (`que: 'pago'`) o un descuento ya aplicado
 * (`que: 'descuento'`). Queda a su nombre, con la firma de lo que vio: si
 * después cambia, vuelve a su bandeja. Solo `pagar`.
 */
export const POST = conLecturas([HOJA_RESERVAS], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fila = Number(cuerpo.fila);
    const que = cuerpo.que === 'descuento' ? 'descuento' : cuerpo.que === 'pago' ? 'pago' : '';
    if (!(fila > 1) || !que) return NextResponse.json({ error: 'Falta qué revisar.' }, { status: 400 });
    const r = (await leerReservas()).find((x) => x.fila === fila);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });
    const quien = await quienEs(req);
    const ahora = ahoraEnChile();
    if (que === 'pago') {
      await editarReserva(fila, { pagoRevisado: marcaPlata(ahora, quien.usuario, firmaPago(r)) });
      await anotar({ ...quien, accion: 'Revisó un pago',
        detalle: `${r.nombre} · ${r.fecha} · ${pagoEnEspanol(r.estadoPago)}` + (r.notaPago ? ` · ${r.notaPago}` : '') });
    } else {
      await editarReserva(fila, { descuentoRevisado: marcaPlata(ahora, quien.usuario, firmaDescuento(r)) });
      await anotar({ ...quien, accion: 'Vio un descuento',
        detalle: `${r.nombre} · ${r.fecha} · ${r.descuento}% · ${r.rectificacion}` });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
