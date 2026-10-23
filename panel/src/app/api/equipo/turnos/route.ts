import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { guardarEquipoDelDia, leerTurnos, anotar } from '@/lib/datos';
import { esFecha } from '@/lib/fechas';
import { aEntero, esContratado, MODALIDAD } from '@/lib/equipo';

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
  const no = await exigir(req, 'equipo');
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
      puesto: String(t?.puesto ?? '').trim(),
      asistencia: String(t?.asistencia ?? '').trim(),
      modalidad: esContratado(t?.modalidad) ? MODALIDAD.contratado : MODALIDAD.porTurno,
      pagoJornada: aEntero(t?.pagoJornada),
      horasExtra: aEntero(t?.horasExtra),
      valorHora: aEntero(t?.valorHora),
      // Varios ajustes por turno, cada uno con su motivo. Con signo: un
      // descuento es justamente un número negativo. Los que quedan en cero
      // y sin motivo se descartan acá —son filas que alguien abrió y no
      // llenó—, para que no viajen a la planilla.
      ajustes: (Array.isArray(t?.ajustes) ? t.ajustes : [])
        .map((a: unknown) => ({
          monto: aEntero((a as Record<string, unknown>)?.monto, true),
          motivo: String((a as Record<string, unknown>)?.motivo ?? '').trim()
        }))
        .filter((a: { monto: number; motivo: string }) => a.monto || a.motivo),
      propina: aEntero(t?.propina)
    })));

    // Se devuelven los turnos de ese día ya leídos de vuelta de la planilla,
    // no lo que se mandó: si algo se descartó por repetido, la vista tiene
    // que mostrar lo que quedó guardado y no lo que se intentó guardar.
    const todos = await leerTurnos();
    const delDia = todos.filter((t) => t.fecha === fecha);
    await anotar({ ...(await quienEs(req)), accion: 'Planificó el equipo',
      detalle: `${fecha} · ${delDia.length} personas · ` +
               delDia.map((t) => `${t.trabajador} (${t.puesto || 'sin puesto'})`).join(', ') });
    return NextResponse.json({ turnos: delDia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
