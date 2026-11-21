import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { agregarAjusteAlTurno, leerTurnos, anotar } from '@/lib/datos';
import { esFecha } from '@/lib/fechas';
import { normalizar } from '@/lib/columnas';
import { ajusteDelCuerpo, VINO, HOJA_TURNOS } from '@/lib/equipo';
import { guardaDelDia } from '@/lib/guardaCierre';
import { HOJA_CIERRES } from '@/lib/cierres';
import { enPesos } from '@/lib/ocupacion';

export const dynamic = 'force-dynamic';

/**
 * **Un ajuste anotado desde el informe** (2026-11-21, lo pidió el cliente):
 * quien paga —pagos, la gerencia y el administrador— le descuenta o le suma
 * algo a una persona desde su tarjeta, **en un día que vino**. Va al turno de
 * ese día, igual que un ajuste de Turnos, así que suma en el periodo de esa
 * fecha y lo leen igual el informe, el link del trabajador y la boleta.
 *
 * - **Permiso `pagar`**: mueve plata, y la plata la cierra pagos.
 * - **Un día cerrado se corrige**: casi todo lo que se paga ya está cerrado,
 *   así que esto entra como corrección (`guardaDelDia()`), con el ajuste como
 *   motivo, y queda así en la bitácora. Los tres roles con `pagar` tienen
 *   también `corregir`.
 * - **Solo en un día que vino**: el turno de un día que no vino no suma, y el
 *   ajuste tampoco sumaría. Sin turno ese día, 404.
 *
 * Lecturas de Google: una tanda (Cierres y Turnos), Turnos fresca antes de
 * escribir y el encabezado de la bitácora; la primera vez de cada instancia,
 * además la lista de pestañas. Cuatro a lo más, y lo fija `npm run ajuste`.
 */
export const POST = conLecturas([HOJA_CIERRES, HOJA_TURNOS], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const cuerpo = await req.json();
    const fecha = String(cuerpo?.fecha ?? '');
    const trabajador = String(cuerpo?.trabajador ?? '').trim();
    if (!esFecha(fecha) || !trabajador) {
      return NextResponse.json({ error: 'Falta el día o la persona.' }, { status: 400 });
    }
    const r = ajusteDelCuerpo(cuerpo);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });

    const turno = (await leerTurnos()).find((t) =>
      t.fecha === fecha && normalizar(t.trabajador) === normalizar(trabajador));
    if (!turno) {
      return NextResponse.json({ error: `${trabajador} no tiene turno ese día.` }, { status: 404 });
    }
    if (turno.asistencia !== VINO.si) {
      return NextResponse.json({ error:
        `Ese día ${trabajador} no aparece como que vino: un ajuste ahí no sumaría.` }, { status: 409 });
    }

    const signo = r.ajuste.monto < 0 ? '−' : '+';
    const que = `${signo}${enPesos(Math.abs(r.ajuste.monto))}${r.ajuste.motivo ? ' · ' + r.ajuste.motivo : ''}`;
    const guarda = await guardaDelDia(req, [fecha], { motivo: `Ajuste desde el informe: ${que}` });
    if ('error' in guarda) return guarda.error;

    const nuevo = await agregarAjusteAlTurno(fecha, trabajador, r.ajuste);
    if (!nuevo) {
      return NextResponse.json({ error: `${trabajador} no tiene turno ese día.` }, { status: 404 });
    }
    await anotar({ ...(await quienEs(req)),
      accion: r.ajuste.monto < 0 ? 'Descontó desde el informe' : 'Sumó desde el informe',
      detalle: `${fecha} · ${nuevo.trabajador} · ${que}` +
               (guarda.motivo ? ' · día cerrado: queda como corrección' : '') });
    return NextResponse.json({ turno: nuevo });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
