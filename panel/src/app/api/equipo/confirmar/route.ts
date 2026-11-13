import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_TRABAJADORES } from '@/lib/equipo';
import { HOJA_COLABORADORES } from '@/lib/extras';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { leerTrabajadores, guardarTrabajadores, leerColaboradores, guardarColaboradores, anotar } from '@/lib/datos';
import { partesMarca } from '@/lib/plata';

export const dynamic = 'force-dynamic';

/**
 * **Pagos confirma una cuenta o una tarifa** (2026-11-13, `plata.ts`) que
 * cambió alguien que no es pagos: la de un trabajador (`de: 'trabajador'`)
 * o la de un extra (`de: 'colaborador'`). Borra el *por confirmar* y queda
 * en la bitácora a su nombre. Solo `pagar`.
 */
export const POST = conLecturas([HOJA_TRABAJADORES, HOJA_COLABORADORES], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const de = cuerpo.de === 'colaborador' ? 'colaborador' : cuerpo.de === 'trabajador' ? 'trabajador' : '';
    const nombre = String(cuerpo.nombre ?? '').trim();
    if (!de || !nombre) return NextResponse.json({ error: 'Falta a quién confirmar.' }, { status: 400 });
    const quien = await quienEs(req);
    const gente = de === 'trabajador' ? await leerTrabajadores() : await leerColaboradores();
    const i = gente.findIndex((x) => normalizar(x.nombre) === normalizar(nombre));
    if (i < 0) return NextResponse.json({ error: `${nombre} ya no está en la lista.` }, { status: 404 });
    const m = partesMarca(gente[i].porConfirmar);
    if (!m) return NextResponse.json({ ok: true, yaEstaba: true });
    gente[i] = { ...gente[i], porConfirmar: '' };
    if (de === 'trabajador') await guardarTrabajadores(gente as Awaited<ReturnType<typeof leerTrabajadores>>);
    else await guardarColaboradores(gente as Awaited<ReturnType<typeof leerColaboradores>>);
    await anotar({ ...quien, accion: de === 'trabajador' ? 'Confirmó los datos de pago de un trabajador' : 'Confirmó los datos de pago de un extra',
      detalle: `${gente[i].nombre} · ${m.firma || 'datos de pago'} · lo cambió ${m.quien} el ${m.cuando}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
