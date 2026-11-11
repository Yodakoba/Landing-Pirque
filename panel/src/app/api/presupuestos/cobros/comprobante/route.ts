import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { leerCobros, leerPresupuestos, leerConfig, leerClientes, editarCobro, anotar } from '@/lib/datos';
import { problemaConArchivo } from '@/lib/cobros';
import { folioDe } from '@/lib/presupuestos';
import { clienteDe } from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { subirComprobante, leerComprobante, errorDeDrive } from '@/lib/drive';
import { enPesos } from '@/lib/ocupacion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * El comprobante de un cobro (2026-11-10). Vive en Google Drive (ver
 * `lib/drive.ts`) y **nunca se sirve por un link público**: se ve a través
 * de esta ruta, que comprueba el permiso de quien lo pide.
 */
export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigirVer(req, 'presupuestos');
  if (no) return no;
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const cobro = (await leerCobros()).find((c) => c.id === id);
  if (!cobro?.comprobante) {
    return NextResponse.json({ error: 'Ese cobro no tiene comprobante.' }, { status: 404 });
  }
  try {
    const a = await leerComprobante(cobro.comprobante);
    return new NextResponse(new Uint8Array(a.datos), {
      headers: {
        'content-type': a.tipo,
        // Se abre en el navegador; con el nombre si alguien lo guarda.
        'content-disposition': `inline; filename="${a.nombre.replace(/"/g, '')}"`,
        'cache-control': 'private, no-store'
      }
    });
  } catch (e) {
    console.error('[comprobante:ver]', e);
    return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
  }
});

/**
 * Sube el comprobante de un cobro: una foto o un PDF, hasta 10 MB.
 *
 * Lo sube **quien puede anotar ese cobro** —el vendedor, solo en sus
 * cotizaciones—, que es quien recibe el comprobante del cliente. **Cambiar
 * el comprobante deja el cobro sin revisar**: lo que se revisó era el
 * archivo anterior.
 */
export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const form = await req.formData();
    const id = String(form.get('id') ?? '');
    const archivo = form.get('archivo');
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
    }
    const problema = problemaConArchivo(archivo.type, archivo.size);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });

    const [cobros, presupuestos, cfg, clientes] = await Promise.all([
      leerCobros(), leerPresupuestos(), leerConfig(), leerClientes()
    ]);
    const cobro = cobros.find((c) => c.id === id);
    if (!cobro) return NextResponse.json({ error: 'Ese cobro ya no está.' }, { status: 404 });
    const p = presupuestos.find((x) => x.id === cobro.presupuesto);
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que sus comprobantes no los subes tú.`,
        permiso: true
      }, { status: 403 });
    }
    if (!cfg.driveComprobantes) {
      return NextResponse.json({
        error: 'Falta la carpeta de comprobantes en Configuración.'
      }, { status: 400 });
    }

    const cliente = clienteDe(p, clientes).nombre;
    const extension = archivo.type === 'application/pdf' ? 'pdf'
      : (archivo.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    let idArchivo: string;
    try {
      idArchivo = await subirComprobante({
        unidad: cfg.driveComprobantes,
        carpeta: `Cotización ${folioDe(p)}${cliente ? ` – ${cliente}` : ''}`,
        nombre: `${cobro.fecha} ${cobro.concepto} ${cobro.monto} (${cobro.id}).${extension}`,
        tipo: archivo.type,
        datos: Buffer.from(await archivo.arrayBuffer())
      });
    } catch (e) {
      console.error('[comprobante:subir]', e);
      return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
    }
    await editarCobro(cobro.id, { comprobante: idArchivo, revisadoPor: '', revisado: '' });
    await anotar({ ...quien, accion: 'Subió un comprobante',
      detalle: `${folioDe(p)} · ${cobro.concepto} · ${enPesos(cobro.monto)}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
