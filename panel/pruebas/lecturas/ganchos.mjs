/**
 * Ganchos de módulos para correr las rutas del panel en Node, sin Next:
 * cambian `googleapis` por el Google falso que cuenta las consultas,
 * resuelven `@/…` a `src/` y completan las extensiones `.ts`.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const FALSO = new URL('./google-falso.mjs', import.meta.url).href;

export async function resolve(spec, ctx, next) {
  if (spec === 'googleapis') return { url: FALSO, shortCircuit: true };
  if (spec === 'next/server') spec = 'next/server.js';
  if (spec === 'next/headers') spec = 'next/headers.js';
  if (spec.startsWith('@/')) spec = pathToFileURL(SRC + spec.slice(2)).href;
  if (spec.startsWith('file://') || spec.startsWith('.')) {
    const url = spec.startsWith('.') ? new URL(spec, ctx.parentURL).href : spec;
    const p = fileURLToPath(url);
    if (!/\.(ts|tsx|mjs|js|json)$/.test(p)) {
      for (const e of ['.ts', '.tsx', '/index.ts']) {
        if (existsSync(p + e)) return { url: pathToFileURL(p + e).href, shortCircuit: true };
      }
    }
    return next(url, ctx);
  }
  return next(spec, ctx);
}
