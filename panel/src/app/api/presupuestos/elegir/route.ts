import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, guardarPresupuesto, anotar } from '@/lib/datos';
import { alternativasDe, grupoDe, letraDe, otrasAlternativas, sigueViva } from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { ESTADO_PRESUPUESTO, estadoNormal, estaMandada, folioDe } from '@/lib/presupuestos';

export const dynamic = 'force-dynamic';

/**
 * **"Se quedó con la B"** (2026-11-11, lo pidió el cliente). Las alternativas
 * se mandan juntas, en un solo link; cuando el cliente decide, se elige una
 * y las otras pasan a *No elegida*. El mismo link pasa a mostrar solo la
 * elegida (`paraElLink()`), y desde ahí se gana como cualquier cotización.
 *
 * Con `deshacer: true` las vuelve a ofrecer: las *No elegida* del grupo
 * vuelven a la etapa de la elegida. Solo mientras ninguna esté ganada —una
 * ganada tiene su reserva tomando cupo, y eso se deshace cancelando—.
 *
 * Elegir no es ganar: no toca el cupo ni crea la reserva. Por eso es una
 * acción aparte de `/convertir`, que exige que ya se haya elegido.
 */
export async function POST(req: Request) {
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
        error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que no es tuya para cambiarla.`,
        permiso: true
      }, { status: 403 });
    }
    const grupo = alternativasDe(p, lista);
    if (grupo.some((x) => !!x.idReserva)) {
      return NextResponse.json({
        error: 'Esta cotización ya está ganada: la alternativa ya se eligió.'
      }, { status: 409 });
    }

    if (cuerpo.deshacer) {
      const volver = grupo.filter((x) => x.id !== p.id
        && estadoNormal(x.estado) === ESTADO_PRESUPUESTO.noElegida);
      // Vuelven a la etapa de la elegida: si ya se mandó, a Enviada o
      // Negociación como ella; si no, a borrador.
      const etapa = estaMandada(p.estado) ? estadoNormal(p.estado) : ESTADO_PRESUPUESTO.borrador;
      for (const x of volver) {
        const { fila: _f, ...resto } = x;
        await guardarPresupuesto({ ...resto, estado: etapa });
      }
      await anotar({ ...quien, accion: 'Volvió a ofrecer las alternativas',
        detalle: `${folioDe({ id: grupoDe(p) })} · ${volver.length} vuelven a ${etapa}` });
      return NextResponse.json({ ok: true });
    }

    if (!sigueViva(p)) {
      return NextResponse.json({
        error: 'Esa alternativa ya no está en carrera. Vuelve a ofrecer las alternativas primero.'
      }, { status: 409 });
    }
    const otras = otrasAlternativas(p, lista);
    for (const x of otras) {
      const { fila: _f, ...resto } = x;
      await guardarPresupuesto({ ...resto, estado: ESTADO_PRESUPUESTO.noElegida });
    }
    await anotar({ ...quien, accion: 'Eligió una alternativa',
      detalle: `${folioDe({ id: grupoDe(p) })} · se quedó con la ${letraDe(p, lista) || 'única'}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
