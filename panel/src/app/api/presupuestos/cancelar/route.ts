import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerConfig, leerCobros, guardarPresupuesto, cancelarReservaDe, anotar,
  devolverElDia
} from '@/lib/datos';
import { cobrosDe } from '@/lib/cobros';
import { devolucionSugerida, tranquilidadDeCotizacion } from '@/lib/cancelacion';
import { folioDe, ESTADO_PRESUPUESTO, type Presupuesto } from '@/lib/presupuestos';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { guardaDelDia } from '@/lib/guardaCierre';
import { enPesos } from '@/lib/ocupacion';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * **Cancelar el evento de una cotización ganada** (2026-11-11).
 *
 * Lo cancela quien puede tocar la cotización —el vendedor, las suyas—, que
 * es quien habla con el cliente. Hace tres cosas:
 *
 * 1. **Cancela su reserva** (`cancelled`): libera el cupo del día.
 * 2. **Deja la cotización en *Cancelada***, con el motivo, quién y cuándo.
 * 3. **Anota lo acordado devolver** (`Devolución acordada`). Lo propone el
 *    contrato —las condiciones de esta cotización, `devolucionSugerida()`—
 *    y se puede cambiar, porque se negocia. La devolución misma la anota
 *    quien paga, como un cobro en negativo, cuando transfiere.
 *
 * **Primero la reserva, después la cotización**, por lo mismo que al ganar:
 * si lo segundo falla, la reserva ya liberó el cupo y la cotización sigue
 * diciendo *Ganada* — se ve y se reintenta. Al revés, una cotización
 * *Cancelada* con la reserva ocupando cupo no se notaría.
 *
 * GET devuelve lo que corresponde devolver, para la ventana de confirmar.
 */
async function cancelable(req: Request, id: string) {
  const quien = await quienEs(req);
  const p = (await leerPresupuestos()).find((x) => x.id === id);
  if (!p) return { error: NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 }) };
  if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
    return { error: NextResponse.json({
      error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que no la cancelas tú.`,
      permiso: true
    }, { status: 403 }) };
  }
  if (p.estado === ESTADO_PRESUPUESTO.cancelada) {
    return { error: NextResponse.json({ error: 'Esta cotización ya está cancelada.' }, { status: 409 }) };
  }
  if (!p.idReserva) {
    return { error: NextResponse.json({
      error: 'Solo se cancela una cotización ganada. Si no se ganó, márcala Perdida.'
    }, { status: 409 }) };
  }
  return { p, quien };
}

async function sugerencia(p: Presupuesto) {
  const [cfg, cobros] = await Promise.all([leerConfig(), leerCobros()]);
  const t = tranquilidadDeCotizacion(p, cfg);
  return { t, ...devolucionSugerida(cobrosDe(cobros, p.id), p.fecha, hoy(), t) };
}

export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigirVer(req, 'presupuestos');
  if (no) return no;
  try {
    const r = await cancelable(req, new URL(req.url).searchParams.get('id') ?? '');
    if ('error' in r) return r.error;
    const s = await sugerencia(r.p);
    return NextResponse.json({
      dias: s.dias, enPlazo: s.enPlazo, pagado: s.pagado, pct: s.pct, devolver: s.devolver,
      cancelacionDias: s.t.cancelacionDias
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const r = await cancelable(req, String(cuerpo.id ?? ''));
    if ('error' in r) return r.error;
    const { p, quien } = r;
    const motivo = String(cuerpo.motivo ?? '').trim();
    if (!motivo) return NextResponse.json({ error: 'Escribe por qué se cancela.' }, { status: 400 });

    // Un día ya cerrado es una corrección: solo quien corrige, con motivo.
    const guarda = await guardaDelDia(req, [p.fecha], { motivo });
    if ('error' in guarda) return guarda.error;

    // Lo acordado devolver: lo que venga, o lo que dice el contrato. Nunca
    // más de lo pagado: devolver plata que no entró no es una devolución.
    const s = await sugerencia(p);
    const pedido = typeof cuerpo.devolucion === 'number' ? cuerpo.devolucion
      : Number(String(cuerpo.devolucion ?? '').replace(/[^\d]/g, ''));
    const devolucion = Math.min(s.pagado, Math.max(0,
      Number.isFinite(pedido) && String(cuerpo.devolucion ?? '') !== '' ? Math.round(pedido) : s.devolver));

    await cancelarReservaDe(p.idReserva);
    const { fila: _f, ...sinFila } = p;
    await guardarPresupuesto({
      ...sinFila, estado: ESTADO_PRESUPUESTO.cancelada, motivo, devolucion,
      canceladaPor: quien.usuario, cancelada: ahoraEnChile()
    });
    // Si el día existía solo por esta cotización, vuelve a como estaba.
    const dia = await devolverElDia(p.fecha, p.diaAbierto, p.idReserva);
    await anotar({ ...quien, accion: 'Canceló un evento',
      detalle: `${folioDe(p)} · ${p.fecha} · motivo: ${motivo}`
        + (devolucion ? ` · devolver ${enPesos(devolucion)}` : ' · sin devolución')
        + (dia === 'borrado' ? ' · el día salió del calendario' : dia === 'cerrado' ? ' · el día volvió a cerrado' : '') });
    return NextResponse.json({ ok: true, devolucion, dia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
