import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerCobros, anotarCobro, borrarCobro, actualizarPagoDeReserva, anotar
} from '@/lib/datos';
import { cobrosDe, limpiarCobro, nuevoIdCobro } from '@/lib/cobros';
import { folioDe } from '@/lib/presupuestos';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { enPesos } from '@/lib/ocupacion';

export const dynamic = 'force-dynamic';

/**
 * Los cobros al cliente de una cotización (2026-11-10).
 *
 * **Los anota quien puede editar esa cotización**: el vendedor las suyas,
 * los demás roles con permiso de cotizaciones todas. Lo pidió el cliente:
 * el vendedor es quien recibe el comprobante. Lo comprueba la ruta, no la
 * pantalla.
 *
 * Anotar o borrar un cobro de una cotización ganada pone al día el estado
 * del pago de su reserva (`actualizarPagoDeReserva()`).
 */
async function cotizacionTocable(req: Request, id: string) {
  const quien = await quienEs(req);
  const p = (await leerPresupuestos()).find((x) => x.id === id);
  if (!p) return { error: NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 }) };
  if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
    return { error: NextResponse.json({
      error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que sus cobros no los anotas tú.`,
      permiso: true
    }, { status: 403 }) };
  }
  return { p, quien };
}

export async function GET(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    return NextResponse.json({ cobros: cobrosDe(await leerCobros(), id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const r = await cotizacionTocable(req, String(cuerpo.presupuesto ?? ''));
    if ('error' in r) return r.error;
    const limpio = limpiarCobro(cuerpo, hoy());
    if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
    await anotarCobro({
      ...limpio.cobro, id: nuevoIdCobro(), presupuesto: r.p.id,
      registradoPor: r.quien.usuario, cuando: ahoraEnChile()
    });
    await actualizarPagoDeReserva(r.p.id);
    await anotar({ ...r.quien, accion: 'Anotó un cobro',
      detalle: `${folioDe(r.p)} · ${limpio.cobro.concepto} · ${enPesos(limpio.cobro.monto)}`
        + (limpio.cobro.medio ? ` · ${limpio.cobro.medio}` : '') });
    return NextResponse.json({ cobros: cobrosDe(await leerCobros(), r.p.id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Deshace un cobro anotado por error: borra su fila. Queda en la bitácora. */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const cobro = (await leerCobros()).find((c) => c.id === String(cuerpo.id ?? ''));
    if (!cobro) return NextResponse.json({ error: 'Ese cobro ya no está.' }, { status: 404 });
    const r = await cotizacionTocable(req, cobro.presupuesto);
    if ('error' in r) return r.error;
    await borrarCobro(cobro.id);
    await actualizarPagoDeReserva(r.p.id);
    await anotar({ ...r.quien, accion: 'Borró un cobro',
      detalle: `${folioDe(r.p)} · ${cobro.concepto} · ${enPesos(cobro.monto)}` });
    return NextResponse.json({ cobros: cobrosDe(await leerCobros(), r.p.id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
