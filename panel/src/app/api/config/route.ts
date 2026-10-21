import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { leerConfig, guardarConfig , anotar } from '@/lib/datos';
import { leerConfigDe, aFilasConfig, aDiasSemana } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    return NextResponse.json({ config: await leerConfig() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Guarda la configuración.
 *
 * Lo que llega se pasa por aFilasConfig + leerConfigDe antes de escribir:
 * así lo que se guarda es exactamente lo que el panel va a volver a leer, y
 * un valor imposible —un cupo en cero, un corte amarillo por encima del
 * rojo— se corrige acá en vez de quedar escrito en la planilla.
 */
export async function PATCH(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    const actual = await leerConfig();
    const pedido = await req.json();

    // Los días pueden llegar como texto desde el formulario ("sáb,dom") o
    // ya como lista. Interpretarlos acá, y no en el navegador, deja la
    // tolerancia a tildes y abreviaturas en un solo lugar. Si no se
    // entiende ni un día, se conservan los que había en vez de dejar la
    // semana sin ninguno.
    if (typeof pedido.diasAbiertos === 'string') {
      pedido.diasAbiertos = aDiasSemana(pedido.diasAbiertos) ?? actual.diasAbiertos;
    }

    const limpia = leerConfigDe(aFilasConfig({ ...actual, ...pedido }));
    await guardarConfig(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió la configuración',
      detalle: Object.keys(pedido ?? {}).join(', ') });
    return NextResponse.json({ config: limpia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
