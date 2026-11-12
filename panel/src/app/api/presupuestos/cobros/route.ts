import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerCobros, anotarCobro, borrarCobro, actualizarPagoDeReserva, anotar, congelarComision,
  editarCobro
} from '@/lib/datos';
import { cobrosDe, limpiarCobro, nuevoIdCobro, CONCEPTO_COBRO } from '@/lib/cobros';
import { folioDe, HOJA_PRESUPUESTOS, HOJA_LINEAS } from '@/lib/presupuestos';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { HOJA_VENDEDORES } from '@/lib/vendedores';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_RESERVAS } from '@/lib/columnas';
import { alternativasDe } from '@/lib/cotizar';
import { puedeTocarPresupuesto, puede, type Rol } from '@/lib/auth';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { enPesos } from '@/lib/ocupacion';

export const dynamic = 'force-dynamic';
// Varias lecturas y escrituras a la planilla por petición: los 10 s de
// Vercel por defecto quedan justos.
export const maxDuration = 30;

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

export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigirVer(req, 'presupuestos');
  if (no) return no;
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') ?? '';
    const cobros = await leerCobros();
    // **`grupo=1`: los de todas las alternativas** (2026-11-12). Lo pagado es
    // del evento, y la ventana lo necesita para ofrecer ganar cualquiera.
    if (url.searchParams.get('grupo')) {
      const lista = await leerPresupuestos();
      const p = lista.find((x) => x.id === id);
      const ids = new Set(p ? alternativasDe(p, lista).map((a) => a.id) : [id]);
      return NextResponse.json({ cobros: cobros.filter((c) => ids.has(c.presupuesto)) });
    }
    return NextResponse.json({ cobros: cobrosDe(cobros, id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

// Lo que piden la reserva y la comisión del vendedor va en la misma tanda
// que la cotización: anotar un cobro no gasta una lectura más (2026-11-12).
export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_RESERVAS, HOJA_USUARIOS, HOJA_VENDEDORES, HOJA_MENUS],
  async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const r = await cotizacionTocable(req, String(cuerpo.presupuesto ?? ''));
    if ('error' in r) return r.error;
    const limpio = limpiarCobro(cuerpo, hoy());
    if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
    // **Una devolución la anota quien paga** (2026-11-11), que es quien
    // transfiere, y va siempre en negativo: es plata que sale.
    if (limpio.cobro.concepto === CONCEPTO_COBRO.devolucion) {
      if (!puede(r.quien.rol as Rol, 'pagar')) {
        return NextResponse.json({ error: 'Una devolución la anota quien hace los pagos.', permiso: true },
          { status: 403 });
      }
      limpio.cobro.monto = -Math.abs(limpio.cobro.monto);
    }
    await anotarCobro({
      ...limpio.cobro, id: nuevoIdCobro(), presupuesto: r.p.id,
      registradoPor: r.quien.usuario, cuando: ahoraEnChile(),
      comprobante: '', revisadoPor: '', revisado: ''
    });
    await actualizarPagoDeReserva(r.p.id);
    // Si con este cobro el cliente terminó de pagar, la comisión del vendedor queda fija.
    await congelarComision(r.p.id);
    await anotar({ ...r.quien, accion: 'Anotó un cobro',
      detalle: `${folioDe(r.p)} · ${limpio.cobro.concepto} · ${enPesos(limpio.cobro.monto)}`
        + (limpio.cobro.medio ? ` · ${limpio.cobro.medio}` : '') });
    return NextResponse.json({ cobros: cobrosDe(await leerCobros(), r.p.id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/** Deshace un cobro anotado por error: borra su fila. Queda en la bitácora. */
export const DELETE = conLecturas([], async function DELETE(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const cobro = (await leerCobros()).find((c) => c.id === String(cuerpo.id ?? ''));
    if (!cobro) return NextResponse.json({ error: 'Ese cobro ya no está.' }, { status: 404 });
    const r = await cotizacionTocable(req, cobro.presupuesto);
    if ('error' in r) return r.error;
    // **Uno ya revisado solo lo deshace quien revisa**: lo comprobó alguien
    // de arriba, y que el vendedor lo pueda borrar después dejaría la
    // revisión sin valor.
    if (cobro.revisadoPor && !puede(r.quien.rol as Rol, 'pagar')) {
      return NextResponse.json({
        error: `Ese cobro ya lo revisó ${cobro.revisadoPor}. Para deshacerlo, pídeselo a quien hace los pagos.`,
        permiso: true
      }, { status: 403 });
    }
    await borrarCobro(cobro.id);
    await actualizarPagoDeReserva(r.p.id);
    await anotar({ ...r.quien, accion: 'Borró un cobro',
      detalle: `${folioDe(r.p)} · ${cobro.concepto} · ${enPesos(cobro.monto)}` });
    return NextResponse.json({ cobros: cobrosDe(await leerCobros(), r.p.id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * **Marca un cobro como revisado**, o lo desmarca (2026-11-10): quien hace
 * los pagos comprobó que esa plata llegó. Queda su nombre y la hora.
 *
 * Es del permiso `pagar` —administrador y quien paga—, no del vendedor:
 * la gracia es que lo revise alguien distinto de quien lo anotó.
 */
export const PATCH = conLecturas([], async function PATCH(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json()) ?? {};
    const revisado = cuerpo.revisado === true;
    const c = await editarCobro(String(cuerpo.id ?? ''), revisado
      ? { revisadoPor: quien.usuario, revisado: ahoraEnChile() }
      : { revisadoPor: '', revisado: '' });
    if (!c) return NextResponse.json({ error: 'Ese cobro ya no está.' }, { status: 404 });
    const p = (await leerPresupuestos()).find((x) => x.id === c.presupuesto);
    await anotar({ ...quien, accion: revisado ? 'Revisó un cobro' : 'Quitó la revisión de un cobro',
      detalle: `${p ? folioDe(p) : c.presupuesto} · ${c.concepto} · ${enPesos(c.monto)}` });
    // Lo que se acaba de escribir manda sobre lo que se relee: la pantalla
    // tiene que ver la revisión aunque la lectura llegue un instante tarde.
    const { fila: _f, ...escrito } = c;
    const lista = cobrosDe(await leerCobros(), c.presupuesto)
      .map((x) => (x.id === c.id ? { ...x, revisadoPor: escrito.revisadoPor, revisado: escrito.revisado } : x));
    return NextResponse.json({ cobros: lista });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
