/**
 * Pide la UF del día (ver `uf.ts`). Primero boostr, después mindicador.
 *
 * **Los dos fallan a ratos** (comprobado el 2026-11-10): boostr alterna
 * entre el valor y un `{"status":"error"}` **con HTTP 200**, y mindicador a
 * veces no contesta. Por eso:
 *
 * - cada fuente se intenta dos veces, con un tope de 6 segundos;
 * - **se guarda solo un valor bueno**, seis horas, con `unstable_cache`. La
 *   caché de `fetch` de Next guardaría también la respuesta de error —es un
 *   200— y la UF quedaría rota seis horas. Un `throw` no se guarda.
 */
import { unstable_cache } from 'next/cache';
import { ufDeBoostr, ufDeMindicador, type ValorUF } from './uf.ts';

const FUENTES: [string, (j: unknown) => ValorUF | null][] = [
  ['https://api.boostr.cl/economy/indicator/uf.json', ufDeBoostr],
  ['https://mindicador.cl/api/uf', ufDeMindicador]
];

async function pedir(): Promise<ValorUF> {
  for (const [url, leer] of FUENTES) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
        if (!r.ok) continue;
        const v = leer(await r.json());
        if (v) return v;
      } catch (e) {
        console.error('[uf]', url, e);
      }
    }
  }
  throw new Error('Ninguna fuente dio la UF.');
}

const guardada = unstable_cache(pedir, ['uf-del-dia'], { revalidate: 21600 });

export async function ufDelDia(): Promise<ValorUF | null> {
  return guardada().catch(() => null);
}
