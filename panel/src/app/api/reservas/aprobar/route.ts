import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_RESERVAS } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { firmaDescuento, marcaPlata } from '@/lib/plata';
import { puede, type Rol } from '@/lib/auth';
import { editarReserva, anotar, leerReservas } from '@/lib/datos';
import { ahoraEnChile } from '@/lib/bitacora';
import { porAprobar, marcaAprobacion } from '@/lib/rectificacion';

export const dynamic = 'force-dynamic';

/**
 * **Aprobar o rechazar un descuento sobre el estándar** (2026-11-12). Lo
 * hacen el gerente de operaciones, quien paga o el administrador (permiso
 * `aprobar`). Mientras está por aprobar, el descuento no cuenta y la caja
 * de Fudo dice que no se ingrese.
 */
export const POST = conLecturas([HOJA_RESERVAS], async function POST(req: Request) {
  const no = await exigir(req, 'aprobar');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fila = Number(cuerpo.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    const aprobado = cuerpo.aprobar === true;
    const r = (await leerReservas()).find((x) => x.fila === fila);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });
    if (!porAprobar(r)) return NextResponse.json({ error: 'Ese descuento ya no está por aprobar.' }, { status: 409 });
    const quien = await quienEs(req);
    const ahora = ahoraEnChile();
    await editarReserva(fila, {
      aprobacion: marcaAprobacion(aprobado, quien.usuario, ahora),
      // Si lo aprueba pagos, ya lo vio (`plata.ts`).
      ...(aprobado && puede(quien.rol as Rol, 'pagar')
        ? { descuentoRevisado: marcaPlata(ahora, quien.usuario, firmaDescuento(r)) } : {})
    });
    await anotar({ ...quien, accion: aprobado ? 'Aprobó un descuento' : 'Rechazó un descuento',
      detalle: `${r.nombre} · ${r.fecha} · ${r.descuento}% · ${r.rectificacion}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
