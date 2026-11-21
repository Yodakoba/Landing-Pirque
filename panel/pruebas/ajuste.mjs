/**
 * **El ajuste desde el informe, de punta a punta** (2026-11-21): llama la
 * ruta `/api/equipo/ajuste` contra el Google falso de `pruebas/lecturas/`.
 *
 * Lo que fija:
 * - solo quien paga (pagos, gerencia, administrador): el encargado, 403;
 * - escribe **una sola fila** —el turno de esa persona ese día— y solo sus
 *   dos celdas de ajuste; lo demás de la fila y las otras filas, intactas;
 * - se suma a los ajustes que ya tenía, como en Turnos;
 * - un día cerrado entra como corrección y la bitácora lo dice;
 * - sin turno ese día, 404; un día que no vino, 409;
 * - **hoy sin turno** va a `Ajustes sueltos` y no toca `Turnos`; se quita
 *   con `DELETE`, que también pide `pagar`;
 * - cuántas lecturas de Google gasta: cuatro, contando la lista de pestañas.
 *
 *   npm run ajuste
 */
const API = new URL('../src/app/api/', import.meta.url);
const lecturas = (globalThis.__glecturas ??= []);
const escrituras = (globalThis.__gescrituras ??= []);
const store = (globalThis.__gstore ??= new Map());
let fallos = 0;
const ok = (c, txt) => { console.log(`  ${c ? 'ok   ' : 'FALLA'}  ${txt}`); if (!c) fallos++; };

process.env.PANEL_USUARIO = 'jefe';
process.env.SESION_SECRETO = 'secreto-de-prueba-del-ajuste';
const { firmarSesion } = await import(new URL('../src/lib/sesion.ts', import.meta.url).href);
const { ENCABEZADO_TURNOS } = await import(new URL('../src/lib/equipo.ts', import.meta.url).href);
const { ENCABEZADO_CIERRES } = await import(new URL('../src/lib/cierres.ts', import.meta.url).href);
const { POST } = await import(new URL('equipo/ajuste/route.ts', API).href);

const cookie = async (rol) => 'sesion=' + await firmarSesion({ usuario: rol, rol }, process.env.SESION_SECRETO);
async function pedir(rol, cuerpo) {
  return POST(new Request('http://localhost/api/equipo/ajuste', { method: 'POST',
    headers: { 'content-type': 'application/json', cookie: await cookie(rol) }, body: JSON.stringify(cuerpo) }));
}

// Turnos: la columna de más al final es de alguien que la agregó a mano.
const enc = [...ENCABEZADO_TURNOS, 'Comentario a mano'];
const col = (n) => enc.indexOf(n);
const fila = (fecha, nombre, vino, ajuste = '', motivo = '') => {
  const f = new Array(enc.length).fill('');
  f[col('Fecha')] = fecha; f[col('Trabajador')] = nombre; f[col('Puesto')] = 'Parrilla';
  f[col('Asistencia')] = vino; f[col('Pago jornada')] = '45000';
  f[col('Ajuste')] = ajuste; f[col('Motivo del ajuste')] = motivo; f[col('Comentario a mano')] = 'no tocar';
  return f;
};
store.set('Turnos', [enc,
  fila('2026-11-07', 'Luis Contreras', 'Sí', '5000', 'Hora extra'),
  fila('2026-11-07', 'Rosa Espinoza', 'Sí'),
  fila('2026-11-08', 'Luis Contreras', 'No')]);
store.set('Cierres', [ENCABEZADO_CIERRES]);
store.set('Bitácora', []);
const antes = JSON.stringify(store.get('Turnos'));

const descuento = { fecha: '2026-11-07', trabajador: 'luis contreras', tipo: 'resta', monto: 4000,
  razon: 'Adelanto', medio: 'Transferencia', nota: '' };

let r = await pedir('encargado', descuento);
ok(r.status === 403 && JSON.stringify(store.get('Turnos')) === antes, 'el encargado de turno no puede: 403, sin tocar nada');

lecturas.length = 0; escrituras.length = 0;
r = await pedir('pagos', descuento);
const j = await r.json();
const t = store.get('Turnos');
ok(r.status === 200 && j.turno?.ajustes?.length === 2, `pagos sí: 200 y el turno vuelve con sus dos ajustes (${r.status})`);
ok(t[1][col('Ajuste')] === '5000|-4000' && t[1][col('Motivo del ajuste')] === 'Hora extra|Adelanto · Transferencia',
   `se suma a lo que ya tenía, como en Turnos: "${t[1][col('Ajuste')]}" · "${t[1][col('Motivo del ajuste')]}"`);
ok(t[1][col('Comentario a mano')] === 'no tocar' && t[1][col('Pago jornada')] === '45000' && t[1][col('Puesto')] === 'Parrilla',
   'lo demás de la fila queda como estaba, también una columna que el panel no conoce');
ok(JSON.stringify(t.slice(2)) === JSON.stringify(JSON.parse(antes).slice(2)) && t.length === 4, 'las otras filas, intactas');
ok(escrituras.filter((e) => e === 'update:Turnos').length === 1 && !escrituras.some((e) => e === 'batchUpdate'),
   'escribe una sola fila de Turnos y no borra ninguna');
const bit = (store.get('Bitácora') ?? []).flat().join(' ');
ok(/Descontó desde el informe/.test(bit) && /2026-11-07/.test(bit) && /−\$4\.000/.test(bit), 'queda en la bitácora');
// La lista de pestañas (solo la primera vez de cada instancia), la tanda de
// la ruta (Cierres y Turnos), Turnos fresca antes de escribir —para no
// escribir sobre una fila que se movió— y el encabezado de la bitácora.
ok(lecturas.length <= 4, `lecturas de Google: ${lecturas.length} de 4 (${lecturas.join(', ')})`);

store.set('Cierres', [ENCABEZADO_CIERRES, ['2026-11-07', 'Ana Soto', '2026-11-07 19:00']]);
store.set('Bitácora', []);
r = await pedir('gerencia', { ...descuento, trabajador: 'Rosa Espinoza', tipo: 'suma', razon: 'Feriado', medio: '', monto: 10000 });
ok(r.status === 200 && store.get('Turnos')[2][col('Ajuste')] === '10000', 'en un día cerrado, la gerencia también puede');
ok(/corrección/.test((store.get('Bitácora') ?? []).flat().join(' ')), 'y la bitácora dice que fue una corrección');

r = await pedir('admin', { ...descuento, fecha: '2026-11-09' });
ok(r.status === 404, 'sin turno ese día: 404');
r = await pedir('admin', { ...descuento, fecha: '2026-11-08' });
ok(r.status === 409, 'un día que no vino: 409, un ajuste ahí no sumaría');
r = await pedir('admin', { ...descuento, razon: '' });
ok(r.status === 400, 'sin motivo: 400');

// --- Hoy, fuera de turno (2026-11-21): un adelanto de un día que no trabajó.
const { hoy } = await import(new URL('../src/lib/fechas.ts', import.meta.url).href);
store.set('Trabajadores', [['Nombre', 'Teléfono', 'Puesto habitual', 'Activo'], ['Luis Contreras', '', 'Parrilla', 'Sí']]);
store.set('Cierres', [ENCABEZADO_CIERRES]);
store.set('Bitácora', []);
store.delete('Ajustes sueltos');
const turnosAntes = JSON.stringify(store.get('Turnos'));
lecturas.length = 0; escrituras.length = 0;
r = await pedir('pagos', { ...descuento, fecha: hoy(), monto: 20000, nota: 'lo pidió por WhatsApp' });
const jh = await r.json();
const sueltos = store.get('Ajustes sueltos') ?? [];
ok(r.status === 200 && !!jh.turno?.suelto && jh.turno.ajustes[0].monto === -20000,
   `hoy sin turno: 200 y vuelve marcado como fuera de turno (${r.status})`);
ok(JSON.stringify(store.get('Turnos')) === turnosAntes, 'no toca Turnos: no es un día trabajado ni entra a la propina');
ok(sueltos.length === 2 && sueltos[0][0] === 'ID' && sueltos[1][1] === hoy() && sueltos[1][2] === 'Luis Contreras'
   && sueltos[1][3] === '-20000' && sueltos[1][4] === 'Adelanto · Transferencia · lo pidió por WhatsApp',
   `la pestaña Ajustes sueltos nace con el primero: ${JSON.stringify(sueltos[1])}`);
ok(/fuera de turno/.test((store.get('Bitácora') ?? []).flat().join(' ')), 'la bitácora dice que fue fuera de turno');
ok(lecturas.length <= 4, `lecturas de Google: ${lecturas.length} de 4 (${lecturas.join(', ')})`);
r = await pedir('pagos', { ...descuento, fecha: hoy(), trabajador: 'Nadie Inventado' });
ok(r.status === 404 && (store.get('Ajustes sueltos') ?? []).length === 2, 'a alguien que no está en el equipo: 404');

// Quitarlo, por si se anotó mal.
const { DELETE } = await import(new URL('equipo/ajuste/route.ts', API).href);
const quitar = async (rol, id) => DELETE(new Request(`http://localhost/api/equipo/ajuste?id=${encodeURIComponent(id)}`,
  { method: 'DELETE', headers: { cookie: await cookie(rol) } }));
r = await quitar('encargado', jh.turno.suelto);
ok(r.status === 403 && (store.get('Ajustes sueltos') ?? []).length === 2, 'quitarlo: el encargado no puede, 403');
r = await quitar('pagos', jh.turno.suelto);
ok(r.status === 200 && (store.get('Ajustes sueltos') ?? []).length === 1, 'pagos lo quita: la fila se borra');
ok(/Quitó un ajuste fuera de turno/.test((store.get('Bitácora') ?? []).flat().join(' ')), 'y queda en la bitácora');
r = await quitar('pagos', jh.turno.suelto);
ok(r.status === 404, 'quitarlo dos veces: 404');

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: el ajuste desde el informe toca solo lo suyo.');
process.exit(fallos ? 1 : 0);
