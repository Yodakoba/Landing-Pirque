import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import { guardarEquipoDelDia, leerTurnos } from '@/lib/datos';
import { esFecha } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * Reemplaza el equipo de UN día.
 *
 * Es un reemplazo y no un "agregar uno": la ventana de planificación muestra
 * el día entero y lo guarda completo, así que quitar a alguien tiene que ser
 * tan posible como agregarlo. Mandar una lista vacía deja el día sin equipo,
 * y eso es una operación válida —se canceló el turno de todos— no un error.
 *
 * Lo que NO hace es tocar otros días: ver `guardarEquipoDelDia()`.
 */
export async function PUT(req: Request) {
  const no = exigir(req, 'equipo');
  if (no) return no;
  try {
    const { fecha, turnos } = await req.json();
    if (!esFecha(fecha)) {
      return NextResponse.json(
        { error: 'Falta la fecha, o no tiene el formato AAAA-MM-DD.' }, { status: 400 }
      );
    }
    if (!Array.isArray(turnos)) {
      return NextResponse.json(
        { error: 'Falta la lista de turnos. Para dejar el día sin equipo, manda [].' },
        { status: 400 }
      );
    }

    await guardarEquipoDelDia(fecha, turnos.map((t) => ({
      fecha,
      trabajador: String(t?.trabajador ?? '').trim(),
      puesto: String(t?.puesto ?? '').trim()
    })));

    // Se devuelven los turnos de ese día ya leídos de vuelta de la planilla,
    // no lo que se mandó: si algo se descartó por repetido, la vista tiene
    // que mostrar lo que quedó guardado y no lo que se intentó guardar.
    const todos = await leerTurnos();
    return NextResponse.json({ turnos: todos.filter((t) => t.fecha === fecha) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
