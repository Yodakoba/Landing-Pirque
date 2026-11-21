import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { agregarAjusteAlTurno, agregarAjusteSuelto, quitarAjusteSuelto, leerTurnos,
         leerTrabajadores, anotar } from '@/lib/datos';
import { esFecha, hoy } from '@/lib/fechas';
import { normalizar } from '@/lib/columnas';
import { ajusteDelCuerpo, comoTurno, VINO, HOJA_TURNOS, HOJA_TRABAJADORES } from '@/lib/equipo';
import { guardaDelDia } from '@/lib/guardaCierre';
import { HOJA_CIERRES } from '@/lib/cierres';
import { enPesos } from '@/lib/ocupacion';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * **Un ajuste anotado desde el informe** (2026-11-21, lo pidió el cliente):
 * quien paga —pagos, la gerencia y el administrador— le descuenta o le suma
 * algo a una persona desde su tarjeta.
 *
 * - **En un día que vino**: va al turno de ese día, igual que un ajuste de
 *   Turnos, así que suma en el periodo de esa fecha y lo leen igual el
 *   informe, el link del trabajador y la boleta.
 * - **Hoy, sin turno que diga que vino** (el mismo día, después lo pidió el
 *   cliente: un adelanto se pide cualquier día): va a `Ajustes sueltos`, que
 *   las cuentas de plata leen igual y que no es un día trabajado. Ver
 *   `HOJA_AJUSTES_SUELTOS`. Solo *hoy*: otro día sin turno, 404.
 * - **Permiso `pagar`**: mueve plata, y la plata la cierra pagos.
 * - **Un día cerrado se corrige**: casi todo lo que se paga ya está cerrado,
 *   así que esto entra como corrección (`guardaDelDia()`), con el ajuste como
 *   motivo, y queda así en la bitácora. Los tres roles con `pagar` tienen
 *   también `corregir`.
 *
 * Lecturas de Google: una tanda (Cierres, Turnos y Trabajadores), la pestaña
 * donde se escribe leída fresca y el encabezado de la bitácora; la primera vez
 * de cada instancia, además la lista de pestañas. Cuatro a lo más, y lo fija
 * `npm run ajuste`.
 */
export const POST = conLecturas([HOJA_CIERRES, HOJA_TURNOS, HOJA_TRABAJADORES], async function POST(req: Request) {
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
    const vino = turno?.asistencia === VINO.si;
    const esHoy = fecha === hoy();
    if (!vino && !esHoy) {
      return NextResponse.json({ error: turno
        ? `Ese día ${trabajador} no aparece como que vino: un ajuste ahí no sumaría.`
        : `${trabajador} no tiene turno ese día.` }, { status: turno ? 409 : 404 });
    }
    // Sin turno, la persona tiene que existir: no se le anota plata a un
    // nombre escrito a mano.
    const ficha = vino ? null
      : (await leerTrabajadores()).find((t) => normalizar(t.nombre) === normalizar(trabajador));
    if (!vino && !ficha) {
      return NextResponse.json({ error: `${trabajador} no está en el equipo.` }, { status: 404 });
    }

    const signo = r.ajuste.monto < 0 ? '−' : '+';
    const que = `${signo}${enPesos(Math.abs(r.ajuste.monto))}${r.ajuste.motivo ? ' · ' + r.ajuste.motivo : ''}`;
    const guarda = await guardaDelDia(req, [fecha], { motivo: `Ajuste desde el informe: ${que}` });
    if ('error' in guarda) return guarda.error;

    const yo = await quienEs(req);
    const nuevo = vino
      ? await agregarAjusteAlTurno(fecha, trabajador, r.ajuste)
      : comoTurno(await agregarAjusteSuelto({ fecha, trabajador: ficha!.nombre, monto: r.ajuste.monto,
          motivo: r.ajuste.motivo, quien: yo.usuario, cuando: ahoraEnChile() }));
    if (!nuevo) {
      return NextResponse.json({ error: `${trabajador} no tiene turno ese día.` }, { status: 404 });
    }
    await anotar({ ...yo,
      accion: r.ajuste.monto < 0 ? 'Descontó desde el informe' : 'Sumó desde el informe',
      detalle: `${fecha} · ${nuevo.trabajador} · ${que}` + (nuevo.suelto ? ' · fuera de turno' : '') +
               (guarda.motivo ? ' · día cerrado: queda como corrección' : '') });
    return NextResponse.json({ turno: nuevo });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * **Quitar un ajuste fuera de turno** (`?id=AJ-…`), por si se anotó mal. Uno
 * en un turno se quita en la ventana del día, en Turnos, como siempre. Pide
 * `pagar` y queda en la bitácora.
 */
export const DELETE = conLecturas([HOJA_CIERRES], async function DELETE(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const id = new URL(req.url).searchParams.get('id')?.trim() ?? '';
    if (!id) return NextResponse.json({ error: 'Falta cuál ajuste.' }, { status: 400 });
    const a = await quitarAjusteSuelto(id);
    if (!a) return NextResponse.json({ error: 'Ese ajuste ya no está.' }, { status: 404 });
    const que = `${a.monto < 0 ? '−' : '+'}${enPesos(Math.abs(a.monto))}${a.motivo ? ' · ' + a.motivo : ''}`;
    await anotar({ ...(await quienEs(req)), accion: 'Quitó un ajuste fuera de turno',
      detalle: `${a.fecha} · ${a.trabajador} · ${que}` });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
