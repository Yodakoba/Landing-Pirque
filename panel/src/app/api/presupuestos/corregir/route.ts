import { NextResponse } from 'next/server';
import { exclusividadDe } from '@/lib/exclusivo';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, guardarPresupuesto, borrarReservaDe, moverCobros, devolverElDia, devolverExclusivo, anotar
} from '@/lib/datos';
import { alternativasDe, grupoSinGanar, letraDe } from '@/lib/cotizar';
import { folioDe, estadoNormal, ESTADO_PRESUPUESTO, HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { guardaDelDia } from '@/lib/guardaCierre';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * **Corregir una ganada** (2026-11-12, lo pidió el cliente: estaba en la A,
 * le anotó el anticipo y la marcó ganada, y el cliente había elegido la B).
 *
 * Deshace la ganada entera, en este orden:
 *
 * 1. **Borra su reserva**: sale del calendario de reservas y libera el cupo.
 *    Se borra y no se cancela, porque nunca debió existir; una cancelada se
 *    seguiría viendo en el día como gente que "ya no viene".
 * 2. **Devuelve el día** a como estaba si existía solo por ella
 *    (`devolverElDia()`, lo mismo que al cancelar).
 * 3. **El grupo vuelve a estar en carrera** (`grupoSinGanar()`): la ganada
 *    y las que pasaron a *No elegida* vuelven a *Enviada*.
 * 4. Si se dice cuál era la correcta (`hacia`), **sus cobros pasan a esa
 *    alternativa**: el cliente pagó el anticipo del evento, no el de la A.
 *
 * Después se marca ganada la correcta como siempre. No se gana sola acá, a
 * propósito: ganar le toma el cupo a un día y tiene su propia pregunta.
 *
 * **Reserva primero**, igual que al ganar: si algo falla después, la
 * cotización sigue diciendo *Ganada* sin reserva —se ve y se reintenta—, y
 * volver a corregir no falla porque la reserva ya no está.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const lista = await leerPresupuestos();
    const p = lista.find((x) => x.id === String(cuerpo.id ?? '').trim());
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que no la corriges tú.`,
        permiso: true
      }, { status: 403 });
    }
    if (estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.aceptado || !p.idReserva) {
      return NextResponse.json({ error: 'Esta cotización no está ganada: no hay nada que corregir.' }, { status: 409 });
    }
    const alts = alternativasDe(p, lista);
    const hacia = String(cuerpo.hacia ?? '').trim();
    const destino = hacia ? alts.find((a) => a.id === hacia && a.id !== p.id) : undefined;
    if (hacia && !destino) {
      return NextResponse.json({ error: 'Esa alternativa no es de esta cotización.' }, { status: 400 });
    }
    if (destino && estadoNormal(destino.estado) === ESTADO_PRESUPUESTO.cancelada) {
      return NextResponse.json({ error: 'Esa alternativa está cancelada.' }, { status: 409 });
    }
    const motivo = String(cuerpo.motivo ?? '').trim();

    // Un día ya cerrado es una corrección: solo quien corrige, con motivo.
    const guarda = await guardaDelDia(req, [p.fecha], { motivo });
    if ('error' in guarda) return guarda.error;

    const borrada = await borrarReservaDe(p.idReserva);
    const dia = await devolverElDia(p.fecha, p.diaAbierto, p.idReserva);
    // Exclusiva: si la gerencia ya aprobó liberar el día, sigue sin venderse;
    // si no, vuelve a su estado de antes (2026-11-12).
    if (exclusividadDe(p.exclusividad).estado !== 'aprobada') await devolverExclusivo(p.fecha, p.diaPausado ?? '', p.idReserva);
    const nuevos = new Map(grupoSinGanar(p, lista).map((x) => [x.id, x.estado]));
    for (const a of alts) {
      const estado = nuevos.get(a.id);
      if (!estado) continue;
      const { fila: _f, ...sinFila } = a;
      await guardarPresupuesto(a.id === p.id
        ? { ...sinFila, estado, idReserva: '', diaAbierto: '', motivo: '' }
        : { ...sinFila, estado });
    }
    const movidos = destino ? await moverCobros(p.id, destino.id) : 0;

    const letra = (x: typeof p) => letraDe(x, lista);
    await anotar({ ...quien, accion: 'Corrigió una cotización ganada',
      detalle: `${folioDe(p)}${letra(p) ? ` · era la ${letra(p)}` : ''}`
        + (destino ? ` · el cliente eligió la ${letra(destino)}` : '')
        + (borrada ? ` · se borró la reserva del ${p.fecha}` : ' · la reserva ya no estaba')
        + (movidos ? ` · ${movidos} cobro${movidos === 1 ? '' : 's'} pasaron a la ${letra(destino!)}` : '')
        + (dia === 'borrado' ? ' · el día salió del calendario' : dia === 'cerrado' ? ' · el día volvió a cerrado' : '')
        + (motivo ? ` · motivo: ${motivo}` : '') });
    return NextResponse.json({ ok: true, hacia: destino?.id ?? '', movidos, dia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
