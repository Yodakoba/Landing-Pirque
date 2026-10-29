import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import { climaDe, urlPronostico } from '@/lib/clima';

export const dynamic = 'force-dynamic';

/**
 * El pronóstico de los próximos 16 días en Pirque. Ver src/lib/clima.ts.
 *
 * **La llamada a Open-Meteo se guarda tres horas** en la caché de datos de
 * Vercel (`revalidate`): el pronóstico no cambia minuto a minuto, y así son
 * unas ocho llamadas al día y no una por cada vez que alguien abre el
 * calendario. La ruta sigue siendo dinámica —el permiso se revisa en cada
 * petición—; lo que se reutiliza es solo la respuesta de afuera.
 *
 * **Si Open-Meteo no responde, el calendario se dibuja igual**, sin íconos.
 * El pronóstico es un adorno útil, no algo de lo que dependa planificar.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'ver');
  if (no) return no;
  try {
    const r = await fetch(urlPronostico(), { next: { revalidate: 3 * 60 * 60 } });
    if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
    return NextResponse.json({ clima: climaDe(await r.json()) });
  } catch (e) {
    console.error('[clima]', e);
    return NextResponse.json(
      { clima: [], error: 'No se pudo leer el pronóstico.' }, { status: 502 }
    );
  }
}
