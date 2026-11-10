import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, leerConfig, leerClientes, guardarPresupuesto, anotar } from '@/lib/datos';
import { problemaConArchivo } from '@/lib/cobros';
import { folioDe, type Presupuesto } from '@/lib/presupuestos';
import { clienteDe } from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { subirComprobante, leerComprobante, errorDeDrive } from '@/lib/drive';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * **El contrato firmado de una cotización** (Fase 4, 2026-11-10).
 *
 * Se firma en papel y se sube la foto o el PDF. Vive en Drive, en la misma
 * carpeta de la cotización que sus comprobantes, y **nunca se sirve por un
 * link público**: se ve a través de esta ruta, que comprueba el permiso.
 *
 * Que esté subido es lo que dice "Contrato firmado": no hay una casilla
 * aparte que pueda decir "firmado" sin el papel.
 */
async function cotizacionDe(req: Request, id: string) {
  const quien = await quienEs(req);
  const p = (await leerPresupuestos()).find((x) => x.id === id);
  if (!p) return { error: NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 }) };
  return { p, quien };
}

const noEsTuya = (p: Presupuesto) => NextResponse.json({
  error: `Esa cotización la creó ${p.creadoPor || 'otra persona'}, así que su contrato no lo cambias tú.`,
  permiso: true
}, { status: 403 });

const sinFila = ({ fila: _f, ...resto }: Presupuesto) => resto;

/** Muestra el contrato firmado. Lo ve quien ve las cotizaciones. */
export async function GET(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  const r = await cotizacionDe(req, new URL(req.url).searchParams.get('id') ?? '');
  if ('error' in r) return r.error;
  if (!r.p.contrato) {
    return NextResponse.json({ error: 'Esa cotización no tiene contrato firmado.' }, { status: 404 });
  }
  try {
    const a = await leerComprobante(r.p.contrato);
    return new NextResponse(new Uint8Array(a.datos), {
      headers: {
        'content-type': a.tipo,
        'content-disposition': `inline; filename="${a.nombre.replace(/"/g, '')}"`,
        'cache-control': 'private, no-store'
      }
    });
  } catch (e) {
    console.error('[contrato:ver]', e);
    return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
  }
}

/**
 * Sube el contrato firmado: una foto o un PDF, hasta 4 MB. Lo sube quien
 * puede tocar la cotización —el vendedor, solo las suyas—. Subir otro
 * reemplaza al anterior en la cotización; el archivo viejo queda en Drive.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const form = await req.formData();
    const r = await cotizacionDe(req, String(form.get('id') ?? ''));
    if ('error' in r) return r.error;
    const { p, quien } = r;
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) return noEsTuya(p);
    const archivo = form.get('archivo');
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
    }
    const problema = problemaConArchivo(archivo.type, archivo.size);
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });

    const [cfg, clientes] = await Promise.all([leerConfig(), leerClientes()]);
    if (!cfg.driveComprobantes) {
      return NextResponse.json({
        error: 'Falta la carpeta de comprobantes en Configuración: el contrato se guarda ahí.'
      }, { status: 400 });
    }
    const cliente = clienteDe(p, clientes).nombre;
    const extension = archivo.type === 'application/pdf' ? 'pdf'
      : (archivo.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const cuando = ahoraEnChile();
    let idArchivo: string;
    try {
      idArchivo = await subirComprobante({
        unidad: cfg.driveComprobantes,
        // La misma carpeta que sus comprobantes: todo lo de una cotización junto.
        carpeta: `Cotización ${folioDe(p)}${cliente ? ` – ${cliente}` : ''}`,
        nombre: `Contrato firmado ${cuando.slice(0, 10)}.${extension}`,
        tipo: archivo.type,
        datos: Buffer.from(await archivo.arrayBuffer())
      });
    } catch (e) {
      console.error('[contrato:subir]', e);
      return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
    }
    const p2 = { ...sinFila(p), contrato: idArchivo,
      contratoSubidoPor: quien.usuario, contratoSubido: cuando };
    await guardarPresupuesto(p2);
    await anotar({ ...quien, accion: 'Subió el contrato firmado', detalle: folioDe(p) });
    return NextResponse.json({ ok: true, contratoSubidoPor: p2.contratoSubidoPor,
      contratoSubido: p2.contratoSubido });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Quita el contrato firmado de la cotización, para cuando se subió el de
 * otra. El archivo no se borra de Drive: queda en su carpeta.
 */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { id } = await req.json();
    const r = await cotizacionDe(req, String(id ?? ''));
    if ('error' in r) return r.error;
    const { p, quien } = r;
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) return noEsTuya(p);
    if (!p.contrato) return NextResponse.json({ ok: true });
    await guardarPresupuesto({ ...sinFila(p), contrato: '', contratoSubidoPor: '', contratoSubido: '' });
    await anotar({ ...quien, accion: 'Quitó el contrato firmado', detalle: folioDe(p) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
