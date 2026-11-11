import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { leerMenus, guardarMenus, anotar, leerReservas, leerLineasPresupuesto } from '@/lib/datos';
import { limpiarProducto, usados, quitadosUsados, type Menu } from '@/lib/menus';
import { menusConocidos } from '@/lib/shopify';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * Los nombres que aparecen en reservas y en líneas de cotización. Sin
 * `catch`: si no se pueden leer, no se sabe qué se usó, y quien llama decide.
 */
async function nombresVistos(): Promise<string[]> {
  const [reservas, lineas] = await Promise.all([leerReservas(), leerLineasPresupuesto()]);
  return [...menusConocidos(reservas, []), ...lineas.map((l) => l.concepto)];
}

/**
 * El catálogo, y cuáles productos ya se usaron: a esos la pantalla no les
 * ofrece *Quitar* sino *Desactivar*.
 */
export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigirVer(req, 'configurar');
  if (no) return no;
  try {
    const menus = await leerMenus();
    // Si las reservas no se pueden leer, se dan todos por usados: de más
    // nunca borra nada, de menos sí.
    const vistos = await nombresVistos().catch(() => null);
    return NextResponse.json({
      menus,
      usados: vistos ? usados(menus, vistos) : menus.map((m) => m.nombre)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Guarda la lista entera.
 *
 * Se limpia antes de escribir: nombres vacíos fuera y sin repetidos, donde
 * "repetido" se decide normalizado, para que no convivan `Tradiciones` y
 * `TRADICIONES` como si fueran dos menús. Es la misma idea que en la
 * configuración: lo que se guarda es exactamente lo que se va a volver a
 * leer.
 *
 * **No deja quitar un producto que ya se usó** (2026-11-10): responde 409
 * con su nombre. Ese se desactiva. Se comprueba acá y no solo en la pantalla.
 */
export const PUT = conLecturas([], async function PUT(req: Request) {
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
      const p = limpiarProducto(m ?? {});
      if (!p.nombre || vistos.has(normalizar(p.nombre))) continue;
      vistos.add(normalizar(p.nombre));
      limpia.push(p);
    }
    const antes = await leerMenus();
    const enUso = usados(antes, await nombresVistos());
    const bloqueados = quitadosUsados(antes, limpia, enUso);
    if (bloqueados.length) {
      return NextResponse.json({
        error: `No se puede quitar ${bloqueados.join(', ')}: ya se vendió o se cotizó. `
          + 'Desactívalo en vez de quitarlo.'
      }, { status: 409 });
    }
    await guardarMenus(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió los productos',
      detalle: limpia.map((m) => `${m.nombre} ${m.precioEnLinea || '—'}/${m.precioEnLocal || '—'}`
        + (m.activo ? '' : ' (desactivado)'))
                     .join(' · ') });
    return NextResponse.json({ menus: limpia, usados: usados(limpia, enUso) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
