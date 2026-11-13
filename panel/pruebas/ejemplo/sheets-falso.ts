/**
 * **La planilla de ejemplo de las capturas de la ayuda.** No la importa el
 * panel: `capturas.sh` la copia a una copia del panel, nunca al de verdad.
 *
 * Una planilla falsa en un JSON en disco: imita lo que el panel usa de la API
 * de Sheets (get, values.get/batchGet/append/update/clear, batchUpdate con
 * addSheet y deleteDimension). Se lee y se escribe el archivo en cada
 * llamada, así que lo escrito persiste entre peticiones e instancias.
 */
import fs from 'node:fs';

const ARCHIVO = process.env.PLANILLA_EJEMPLO ?? '';
if (!ARCHIVO) throw new Error('Falta PLANILLA_EJEMPLO: la planilla de ejemplo en JSON.');

type Libro = { orden: string[]; hojas: Record<string, string[][]> };

function leer(): Libro {
  const crudo = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  const hojas: Record<string, string[][]> = crudo.hojas ?? crudo;
  const orden: string[] = crudo.orden ?? Object.keys(hojas);
  for (const k of Object.keys(hojas)) if (!orden.includes(k)) orden.push(k);
  return { orden, hojas };
}
function guardar(l: Libro) {
  const tmp = ARCHIVO + '.tmp' + process.pid + Math.random().toString(36).slice(2);
  fs.writeFileSync(tmp, JSON.stringify({ orden: l.orden, hojas: l.hojas }, null, 1));
  fs.renameSync(tmp, ARCHIVO);
}
const nombre = (r: string) => {
  const m = r.match(/^'((?:[^']|'')*)'/);
  if (m) return m[1].replace(/''/g, "'");
  return r.split('!')[0];
};
function hoja(l: Libro, r: string): string[][] {
  const n = nombre(r);
  const real = Object.keys(l.hojas).find((k) => k === n);
  if (!real) {
    const e = new Error(`Unable to parse range: ${r}`) as Error & { code?: number };
    e.code = 400;
    throw e;
  }
  return l.hojas[real];
}
const filaDe = (r: string) => { const m = r.match(/!A?(\d+)/); return m ? +m[1] : 1; };
const texto = (c: unknown) => {
  if (c == null) return '';
  const s = String(c);
  return s.startsWith("'") ? s.slice(1) : s;
};
const recortar = (t: string[][]) => t.map((f) => {
  const g = [...f]; while (g.length && g[g.length - 1] === '') g.pop(); return g;
});

export const sheetsFalso = {
  spreadsheets: {
    get: async () => {
      const l = leer();
      return { data: { sheets: l.orden.map((t, i) => ({ properties: { title: t, sheetId: i } })) } };
    },
    batchUpdate: async ({ requestBody }: any) => {
      const l = leer();
      for (const q of requestBody.requests) {
        if (q.addSheet) {
          const t = q.addSheet.properties.title;
          if (l.hojas[t]) throw new Error(`addSheet: A sheet with the name "${t}" already exists`);
          l.hojas[t] = []; l.orden.push(t);
        }
        if (q.deleteDimension) {
          const r = q.deleteDimension.range;
          const t = l.orden[r.sheetId];
          l.hojas[t]?.splice(r.startIndex, r.endIndex - r.startIndex);
        }
      }
      guardar(l);
      return { data: {} };
    },
    values: {
      get: async ({ range }: any) => {
        const t = hoja(leer(), range);
        return { data: { values: /!1:1$/.test(range) ? t.slice(0, 1) : t } };
      },
      batchGet: async ({ ranges }: any) => {
        const l = leer();
        return { data: { valueRanges: ranges.map((r: string) => ({ values: hoja(l, r) })) } };
      },
      append: async ({ range, requestBody }: any) => {
        const l = leer();
        const t = hoja(l, range);
        // Como Sheets: después de la última fila con algo.
        let fin = t.length; while (fin > 0 && !(t[fin - 1] ?? []).some((c) => c !== '')) fin--;
        t.splice(fin, t.length - fin, ...requestBody.values.map((f: unknown[]) => f.map(texto)));
        guardar(l);
        return { data: {} };
      },
      update: async ({ range, requestBody }: any) => {
        const l = leer();
        const t = hoja(l, range);
        let n = filaDe(range);
        for (const f of requestBody.values) {
          while (t.length < n) t.push([]);
          t[n - 1] = f.map(texto); n++;
        }
        l.hojas[nombre(range)] = recortar(t);
        guardar(l);
        return { data: {} };
      },
      clear: async ({ range }: any) => {
        const l = leer();
        const t = hoja(l, range);
        const n = filaDe(range);
        t.splice(n - 1);
        guardar(l);
        return { data: {} };
      }
    }
  }
};
