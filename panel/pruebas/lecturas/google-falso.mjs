/**
 * Google falso: guarda las pestañas en memoria y **cuenta cada consulta de
 * lectura**, que es lo que gasta el límite de 60 por minuto de la planilla.
 */
const store = globalThis.__gstore ??= new Map();
export const lecturas = globalThis.__glecturas ??= [];
export const escrituras = globalThis.__gescrituras ??= [];
const TODAS = ['Reservas', 'Fechas Hábiles', 'Config', 'Menús', 'Presupuestos', 'Presupuesto Líneas',
  'Clientes', 'Cobros', 'Puestos', 'Trabajadores', 'Turnos', 'Cierres', 'Actividades',
  'Colaboradores', 'Pagos', 'Boletas', 'Usuarios', 'Bitácora', 'Vendedores'];
const nombre = (r) => r.replace(/^'/, '').replace(/'(!.*)?$/, '').split("'!")[0].split('!')[0];
const hoja = (r) => { const n = nombre(r); if (!store.has(n)) store.set(n, []); return store.get(n); };
const filaDe = (r) => { const m = r.match(/!A?(\d+)/); return m ? +m[1] : 1; };
const sheetsApi = {
  spreadsheets: {
    get: async () => {
      lecturas.push('libro');
      const ts = [...new Set([...store.keys(), ...TODAS])];
      globalThis.__gids = ts;
      return { data: { sheets: ts.map((t, i) => ({ properties: { title: t, sheetId: i } })) } };
    },
    batchUpdate: async ({ requestBody }) => {
      escrituras.push('batchUpdate');
      for (const q of requestBody.requests) {
        if (q.addSheet) store.set(q.addSheet.properties.title, []);
        if (q.deleteDimension) {
          const r = q.deleteDimension.range;
          store.get(globalThis.__gids[r.sheetId])?.splice(r.startIndex, r.endIndex - r.startIndex);
        }
      }
      return { data: {} };
    },
    values: {
      get: async ({ range }) => {
        lecturas.push('get:' + nombre(range));
        const t = hoja(range);
        return { data: { values: /!1:1$/.test(range) ? t.slice(0, 1) : t } };
      },
      batchGet: async ({ ranges }) => {
        lecturas.push('batch:' + ranges.map(nombre).join('+'));
        return { data: { valueRanges: ranges.map((r) => ({ values: hoja(r) })) } };
      },
      append: async ({ range, requestBody }) => {
        escrituras.push('append:' + nombre(range));
        hoja(range).push(...requestBody.values.map((f) => f.map(String)));
        return { data: {} };
      },
      update: async ({ range, requestBody }) => {
        escrituras.push('update:' + nombre(range));
        const t = hoja(range); let n = filaDe(range);
        for (const f of requestBody.values) { while (t.length < n) t.push([]); t[n - 1] = f.map(String); n++; }
        return { data: {} };
      },
      clear: async () => ({ data: {} })
    }
  }
};
class JWT { constructor() {} }
export const google = { auth: { JWT }, sheets: () => sheetsApi, calendar: () => ({}), drive: () => ({}) };
export default { google };
