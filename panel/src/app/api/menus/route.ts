import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { leerMenus, guardarMenus , anotar } from '@/lib/datos';
import { aMonto, type Menu } from '@/lib/menus';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    return NextResponse.json({ menus: await leerMenus() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Guarda la lista entera.
 *
 * Se limpia antes de escribir: nombres vacíos fuera y sin repetidos, donde
 * "repetido" se decide normalizado, para que no convivan `Tradiciones` y
 * `TRADICIONES` como si fueran dos menús. Es la misma idea que en la
 * configuración: lo que se guarda es exactamente lo que se va a volver a
 * leer.
 */
export async function PUT(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    const { menus } = await req.json();
    if (!Array.isArray(menus)) {
      return NextResponse.json({ error: 'Falta la lista de menús.' }, { status: 400 });
    }
    const limpia: Menu[] = [];
    const vistos = new Set<string>();
    for (const m of menus) {
      const nombre = String(m?.nombre ?? '').trim();
      if (!nombre || vistos.has(normalizar(nombre))) continue;
      vistos.add(normalizar(nombre));
      limpia.push({
        nombre,
        precioEnLinea: aMonto(m?.precioEnLinea),
        precioEnLocal: aMonto(m?.precioEnLocal)
      });
    }
    await guardarMenus(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió los menús',
      detalle: limpia.map((m) => `${m.nombre} ${m.precioEnLinea || '—'}/${m.precioEnLocal || '—'}`)
                     .join(' · ') });
    return NextResponse.json({ menus: limpia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
