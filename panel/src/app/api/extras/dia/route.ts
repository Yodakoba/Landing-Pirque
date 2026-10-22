import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { guardarExtrasDelDia, leerExtras, anotar } from '@/lib/datos';
import { esFecha } from '@/lib/fechas';
import { aEntero } from '@/lib/equipo';

export const dynamic = 'force-dynamic';

/**
 * Reemplaza las actividades extras de UN día.
 *
 * Igual que el equipo de un día: la ventana muestra el día entero y lo
 * guarda completo, así que quitar una actividad tiene que ser tan posible
 * como agregarla. Una lista vacía deja el día sin extras, que es una
 * operación válida —se cayó el show— y no un error.
 */
export async function PUT(req: Request) {
  const no = await exigir(req, 'extras');
  if (no) return no;
  try {
    const { fecha, extras } = await req.json();
    if (!esFecha(fecha)) {
      return NextResponse.json(
        { error: 'Falta la fecha, o no tiene el formato AAAA-MM-DD.' }, { status: 400 }
      );
    }
    if (!Array.isArray(extras)) {
      return NextResponse.json(
        { error: 'Falta la lista. Para dejar el día sin actividades, manda [].' },
        { status: 400 }
      );
    }

    await guardarExtrasDelDia(fecha, extras.map((e) => ({
      fecha,
      colaborador: String(e?.colaborador ?? '').trim(),
      actividad: String(e?.actividad ?? '').trim(),
      estado: String(e?.estado ?? '').trim(),
      monto: aEntero(e?.monto),
      // Con signo: un descuento es justamente un número negativo.
      ajuste: aEntero(e?.ajuste, true),
      motivo: String(e?.motivo ?? '').trim()
    })));

    // Se devuelve lo que quedó guardado y no lo que se mandó: si algo se
    // descartó por repetido, la vista tiene que mostrar la verdad.
    const todas = await leerExtras();
    const delDia = todas.filter((e) => e.fecha === fecha);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió las actividades de un día',
      detalle: `${fecha} · ${delDia.length} actividades · ` +
               delDia.map((e) => `${e.colaborador} (${e.actividad || 'sin actividad'})`)
                 .join(', ') });
    return NextResponse.json({ extras: delDia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
