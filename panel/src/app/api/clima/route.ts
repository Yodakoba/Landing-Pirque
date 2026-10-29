import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import { climaDe, urlPronostico, IDENTIFICACION } from '@/lib/clima';

export const dynamic = 'force-dynamic';

/**
 * El pronóstico de los próximos días en Pirque. Ver src/lib/clima.ts.
 *
 * **La llamada a MET Norway se guarda una hora** en la caché de datos de
 * Vercel (`revalidate`): MET actualiza más o menos cada hora y pide no
 * consultar más seguido que eso. La ruta sigue siendo dinámica —el permiso
 * se revisa en cada petición—; lo que se reutiliza es la respuesta de afuera.
 *
 * Next solo guarda las respuestas 200, y al vencer sigue sirviendo la última
 * buena mientras pide la nueva. O sea que **un rechazo de MET no borra el
 * pronóstico que ya había**; solo se nota si llega justo cuando la caché
 * está vacía, y entonces el calendario se dibuja sin íconos.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'ver');
  if (no) return no;
  try {
    const r = await fetch(urlPronostico(), {
      // Sin esto MET responde 403: exige saber quién pregunta.
      headers: { 'User-Agent': IDENTIFICACION },
      next: { revalidate: 60 * 60 }
    });
    if (!r.ok) throw new Error(`MET Norway respondió ${r.status}`);
    return NextResponse.json({ clima: climaDe(await r.json()) });
  } catch (e) {
    console.error('[clima]', e);
    return NextResponse.json(
      { clima: [], error: 'No se pudo leer el pronóstico.' }, { status: 502 }
    );
  }
}
