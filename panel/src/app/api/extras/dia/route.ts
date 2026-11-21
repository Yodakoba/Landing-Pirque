import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { guardarExtrasDelDia, leerExtras, anotar } from '@/lib/datos';
import { esFecha, hoy } from '@/lib/fechas';
import { yaLlego } from '@/lib/cierres';
import { conAjustes } from '@/lib/extras';
import { aEntero } from '@/lib/equipo';
import { guardaDelDia } from '@/lib/guardaCierre';

export const dynamic = 'force-dynamic';

/**
 * Reemplaza las actividades extras de UN día.
 *
 * Igual que el equipo de un día: la ventana muestra el día entero y lo
 * guarda completo, así que quitar una actividad tiene que ser tan posible
 * como agregarla. Una lista vacía deja el día sin extras, que es una
 * operación válida —se cayó el show— y no un error.
 *
 * Un día cerrado solo acepta una corrección, igual que el equipo: ver
 * `guardaDelDia()`.
 */
export const PUT = conLecturas([], async function PUT(req: Request) {
  const no = await exigir(req, 'extras');
  if (no) return no;
  try {
    const { fecha, extras, correccion } = await req.json();
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

    const guarda = await guardaDelDia(req, [fecha], correccion);
    if ('error' in guarda) return guarda.error;

    // **Quién vino se marca desde el mismo día** (2026-11-05): de un día
    // que todavía no llega se descarta, en vez de rechazar el guardado. Así
    // un día futuro que arrastre una marca vieja se sigue pudiendo editar, y
    // la marca se limpia sola.
    const llego = yaLlego(fecha, hoy());
    await guardarExtrasDelDia(fecha, extras.map((e) => ({
      fecha,
      colaborador: String(e?.colaborador ?? '').trim(),
      actividad: String(e?.actividad ?? '').trim(),
      estado: llego ? String(e?.estado ?? '').trim() : '',
      monto: aEntero(e?.monto),
      // **Varios ajustes, cada uno con su motivo** (2026-11-21), igual que un
      // turno: con signo, y los que quedan en cero y sin motivo se descartan.
      // Uno mandado a la antigua —un número y un motivo— cuenta como uno.
      ...conAjustes((Array.isArray(e?.ajustes) ? e.ajustes
        : [{ monto: e?.ajuste, motivo: e?.motivo }])
        .map((a: unknown) => ({
          monto: aEntero((a as Record<string, unknown>)?.monto, true),
          motivo: String((a as Record<string, unknown>)?.motivo ?? '').trim()
        }))
        .filter((a: { monto: number; motivo: string }) => a.monto || a.motivo))
    })));

    // Se devuelve lo que quedó guardado y no lo que se mandó: si algo se
    // descartó por repetido, la vista tiene que mostrar la verdad.
    const todas = await leerExtras();
    const delDia = todas.filter((e) => e.fecha === fecha);
    await anotar({ ...(await quienEs(req)),
      accion: guarda.motivo ? 'Corrigió las actividades de un día cerrado'
                            : 'Cambió las actividades de un día',
      // Desde el 2026-11-21 lo que llega de la ventana del día es la lista de
      // cambios que arma el panel (`lib/correccion.ts`), no un motivo escrito.
      detalle: `${fecha} · ` + (guarda.motivo ? `cambios: ${guarda.motivo} · ` : '') +
               `${delDia.length} actividades · ` +
               delDia.map((e) => `${e.colaborador} (${e.actividad || 'sin actividad'})`)
                 .join(', ') });
    return NextResponse.json({ extras: delDia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
