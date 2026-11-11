import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { guardarEquipoDelDia, leerTurnos, anotar } from '@/lib/datos';
import { esFecha, hoy } from '@/lib/fechas';
import { yaLlego } from '@/lib/cierres';
import { aEntero, esContratado, MODALIDAD } from '@/lib/equipo';
import { guardaDelDia } from '@/lib/guardaCierre';

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
 *
 * **Un día cerrado solo acepta una corrección** (2026-11-03): de quien
 * tenga `corregir` y con `correccion.motivo`. El día sigue cerrado después,
 * así que la corrección tiene que dejarlo como un día cerrado tiene que
 * estar: con gente y sin nadie por marcar. Ver `corregirDiaCerrado()`.
 */
export const PUT = conLecturas([], async function PUT(req: Request) {
  const no = await exigir(req, 'equipo');
  if (no) return no;
  try {
    const { fecha, turnos, correccion } = await req.json();
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

    const guarda = await guardaDelDia(req, [fecha], correccion);
    if ('error' in guarda) return guarda.error;
    if (guarda.motivo && (turnos.length === 0 ||
        turnos.some((t) => !String(t?.asistencia ?? '').trim()))) {
      return NextResponse.json({ error:
        'El día sigue cerrado después de corregirlo, así que no puede quedar sin ' +
        'equipo ni con nadie sin marcar si vino o no.' }, { status: 400 });
    }

    // **Quién vino se marca desde el mismo día** (2026-11-05): de un día
    // que todavía no llega se descarta, en vez de rechazar el guardado. Así
    // un día futuro que arrastre una marca vieja se sigue pudiendo editar, y
    // la marca se limpia sola.
    const llego = yaLlego(fecha, hoy());
    await guardarEquipoDelDia(fecha, turnos.map((t) => ({
      fecha,
      trabajador: String(t?.trabajador ?? '').trim(),
      puesto: String(t?.puesto ?? '').trim(),
      asistencia: llego ? String(t?.asistencia ?? '').trim() : '',
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
    await anotar({ ...(await quienEs(req)),
      accion: guarda.motivo ? 'Corrigió el equipo de un día cerrado' : 'Planificó el equipo',
      detalle: `${fecha} · ` + (guarda.motivo ? `motivo: ${guarda.motivo} · ` : '') +
               `${delDia.length} personas · ` +
               delDia.map((t) => `${t.trabajador} (${t.puesto || 'sin puesto'})`).join(', ') });
    return NextResponse.json({ turnos: delDia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
