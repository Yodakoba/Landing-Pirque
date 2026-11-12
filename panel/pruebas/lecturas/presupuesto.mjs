/**
 * **El presupuesto de lecturas de la planilla** (2026-11-12, lo pidió el
 * cliente: que el límite de Google no dependa de que alguien se acuerde).
 *
 * Google deja 60 lecturas por minuto para todo el panel. Esta prueba llama
 * cada ruta que abre una pantalla, contra un Google falso que cuenta las
 * consultas, y **falla si alguna gasta más que su tope**. Si un cambio la
 * hace fallar, hay dos salidas: juntar la lectura nueva en la tanda que la
 * ruta ya precarga (`conLecturas()`), o —si de verdad hace falta— subir el
 * tope acá, a propósito y diciéndolo en el PR.
 *
 *   npm run lecturas
 */
const API = new URL('../../src/app/api/', import.meta.url);
const lecturas = (globalThis.__glecturas ??= []);

/** Lecturas que puede gastar cada ruta. Hoy todas caben en una tanda. */
const TOPE = {
  'cambios': 1,                    // la revisión de cada 2 minutos: la más repetida
  'ocupacion': 1,                  // el calendario de la portada
  'reservas': 1,                   // la portada y la página del día
  'reservas?dia=2026-11-14': 1,
  'fechas': 1,
  'equipo': 1,
  'extras': 1,
  'presupuestos': 1,               // Cotizaciones
  'clientes': 1,
  'config': 1,
  'menus': 2,                      // Productos: la lista y lo que ya se usó
  'informe': 1,
  'recepcion': 1,                  // la anfitriona, cada minuto
  'publico/fechas': 1,             // el sitio público: lo llama cada visitante
  'usuarios': 1,
  'vendedores': 1                  // el resumen del equipo de ventas (2026-11-12)
};

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function llamar(ruta) {
  const m = await import(new URL(ruta.split('?')[0] + '/route.ts', API).href);
  const res = await m.GET(new Request('http://localhost/api/' + ruta), { params: {} });
  await espera(50); // las tandas se juntan con un temporizador: que terminen acá
  return res.status;
}

// La primera lectura de una instancia pide además los títulos del libro
// (una vez por instancia). Se gasta antes, para medir solo lo de cada ruta.
await llamar('cambios');

let fallos = 0;
for (const [ruta, tope] of Object.entries(TOPE)) {
  lecturas.length = 0;
  let estado;
  try { estado = await llamar(ruta); } catch (e) { estado = 'error: ' + e.message; }
  const n = lecturas.length;
  const mal = estado !== 200 || n > tope;
  if (mal) fallos++;
  console.log(`${mal ? '  FALLA' : '  ok   '} ${String(n).padStart(2)} de ${tope}  /api/${ruta}`
    + (estado !== 200 ? `  (respondió ${estado})` : '')
    + (n > tope ? `  → ${lecturas.join(', ')}` : ''));
}
if (fallos) {
  console.log(`\n${fallos} ruta(s) se pasan de su presupuesto de lecturas de Google.`);
  process.exit(1);
}
console.log('\nTodo bien: ninguna pantalla se pasa de sus lecturas de Google.');
