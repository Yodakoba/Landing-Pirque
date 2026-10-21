import { NextResponse } from 'next/server';
import { leerMenus, guardarMenus } from '@/lib/datos';
import type { Menu } from '@/lib/menus';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ menus: await leerMenus() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Guarda la lista entera.
 *
 * Se limpia antes de escribir: nombres vacíos fuera, alias sin repetir, y un
 * alias que sea igual al nombre se descarta porque no aporta nada. Es la
 * misma idea que en la configuración — lo que se guarda es exactamente lo
 * que se va a volver a leer.
 */
export async function PUT(req: Request) {
  try {
    const { menus } = await req.json();
    if (!Array.isArray(menus)) {
      return NextResponse.json({ error: 'Falta la lista de menús.' }, { status: 400 });
    }
    const limpia: Menu[] = [];
    for (const m of menus) {
      const nombre = String(m?.nombre ?? '').trim();
      if (!nombre || limpia.some((x) => x.nombre === nombre)) continue;
      const crudos: unknown[] = Array.isArray(m?.alias)
        ? m.alias
        : String(m?.alias ?? '').split(',');
      const alias: string[] = [...new Set(
        crudos.map((a) => String(a).trim()).filter((a) => a && a !== nombre)
      )];
      limpia.push({ nombre, alias });
    }
    await guardarMenus(limpia);
    return NextResponse.json({ menus: limpia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
