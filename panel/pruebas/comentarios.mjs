/**
 * **El botón 💬 Comentar, de punta a punta** (2026-11-12): llama la ruta
 * `/api/comentarios` contra el Google falso de `pruebas/lecturas/` y mira que
 * deje una fila en la pestaña `Comentarios` con las once columnas, **sin gastar
 * una sola lectura**, y que sin planilla configurada o sin texto no escriba.
 *
 *   npm run comentarios
 */
const API = new URL('../src/app/api/', import.meta.url);
const lecturas = (globalThis.__glecturas ??= []);
const escrituras = (globalThis.__gescrituras ??= []);
const store = (globalThis.__gstore ??= new Map());
let fallos = 0;
const ok = (c, txt) => { console.log(`  ${c ? 'ok   ' : 'FALLA'}  ${txt}`); if (!c) fallos++; };

const { POST } = await import(new URL('comentarios/route.ts', API).href);
const pedir = (cuerpo) => POST(new Request('http://localhost/api/comentarios', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }));

delete process.env.COMENTARIOS_SHEET_ID;
let r = await pedir({ tipo: '💡 Idea', texto: 'algo' });
ok(r.status === 503 && escrituras.length === 0, 'sin COMENTARIOS_SHEET_ID no escribe y lo dice');

process.env.COMENTARIOS_SHEET_ID = 'planilla-del-testeo';
r = await pedir({ tipo: '💡 Idea', texto: '   ' });
ok(r.status === 400 && escrituras.length === 0, 'sin texto no escribe');

lecturas.length = 0;
r = await pedir({ tipo: '🧩 Me falta', texto: '=no veo si pagó', para: 'cobrar en la entrada', pantalla: 'Recepción', rol: 'admin-falso' });
const fila = (store.get('Comentarios') ?? [])[0] ?? [];
ok(r.status === 200, 'con todo, responde ok');
ok(lecturas.length === 0, `no gasta lecturas de Google (gastó ${lecturas.length})`);
ok(escrituras.filter((e) => e === 'append:Comentarios').length === 1, 'escribe una fila en la pestaña Comentarios');
ok(fila.length === 11 && fila[1] === 'Administrador' && fila[2] === 'desarrollo' && fila[3] === '🧩 Me falta'
   && fila[4] === 'Recepción' && fila[7] === 'Nuevo',
   'nombre y rol salen de la sesión, no del navegador; nace en Nuevo');
ok(!String(fila[5]).startsWith('='), 'un texto que parece fórmula no entra como fórmula');

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: los comentarios llegan a su planilla.');
process.exit(fallos ? 1 : 0);
