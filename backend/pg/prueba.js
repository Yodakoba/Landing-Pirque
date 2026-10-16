'use strict';
/**
 * Las MISMAS reglas que fija backend/prueba.js, corriendo contra
 * Postgres de verdad en vez de contra una planilla falsa.
 *
 * Ese es el punto: si los casos pasan sin cambiarles el enunciado, la
 * logica de negocio era portable y lo que dolia era la plataforma.
 *
 *   node backend/pg/prueba.js
 *
 * Necesita @electric-sql/pglite, que es Postgres compilado a WASM: corre
 * en node, sin servidor ni Docker. Si no esta instalado, la prueba lo
 * dice y se salta en vez de fallar — el repo sigue sin dependencias.
 *
 *   npm install @electric-sql/pglite
 */

let PGlite;
try {
  ({ PGlite } = require('@electric-sql/pglite'));
} catch (e) {
  const dir = process.env.PGLITE_DIR;
  if (dir) { ({ PGlite } = require(dir + '/node_modules/@electric-sql/pglite')); }
}
if (!PGlite) {
  console.log('SALTADA: falta @electric-sql/pglite (npm install @electric-sql/pglite)');
  process.exit(0);
}

const fs = require('fs');
const path = require('path');
const d = require('./dominio');

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('  FALLA: ' + msg); } };

// Las mismas fechas del original, para poder comparar enunciado a enunciado.
const sabado  = '2026-11-14';
const domingo = '2026-11-15';
const lunes   = '2026-11-16';
const jueves  = '2026-11-19';
const HOY     = '2026-11-14';

const BASE = [
  ['dias_abiertos', 'sáb,dom'],
  ['cupo_normal', '60'],
  ['dias_a_futuro', '10'],
  ['aviso_pocos_lugares', '10']
];

async function montar(db, config, excepciones, reservas) {
  await db.query('TRUNCATE config, excepciones, reservas');
  for (const [k, v] of (config || BASE)) {
    await db.query('INSERT INTO config VALUES ($1,$2)', [k, String(v)]);
  }
  for (const e of (excepciones || [])) {
    await db.query('INSERT INTO excepciones (fecha,abierta,cupo,nota) VALUES ($1,$2,$3,$4)',
      [e[0], e[1], e[2] || null, e[3] || '']);
  }
  for (const r of (reservas || [])) {
    await db.query(
      `INSERT INTO reservas (pedido,fecha_reserva,estado,adultos,ninos) VALUES ($1,$2,$3,$4,$5)`,
      r);
  }
}

(async () => {
  const db = new PGlite();
  await db.exec(fs.readFileSync(path.join(__dirname, 'esquema.sql'), 'utf8'));
  console.log('Esquema creado contra Postgres de verdad.\n');

  /* ---------- 1. La regla sola ---------- */
  await montar(db);
  let f = await d.fechasAbiertas(db, HOY);
  let dias = f.map((x) => x.fecha);
  console.log('solo la regla ->', JSON.stringify(dias));
  ok(dias.includes(sabado) && dias.includes(domingo), 'abre sábado y domingo');
  ok(!dias.includes(lunes), 'el lunes no abre');
  ok(f.every((x) => x.quedan === 60), 'sin reservas, el cupo es el normal');
  ok(f.every((x) => x.pocos === false), 'con 60 lugares no avisa "quedan pocos"');

  /* ---------- 2. Excepción que ABRE ---------- */
  await montar(db, null, [[jueves, true, null, '18 de septiembre']]);
  dias = (await d.fechasAbiertas(db, HOY)).map((x) => x.fecha);
  ok(dias.includes(jueves), 'una excepción puede abrir un jueves');

  /* ---------- 3. Excepción que CIERRA ---------- */
  await montar(db, null, [[domingo, false, null, 'Evento privado']]);
  dias = (await d.fechasAbiertas(db, HOY)).map((x) => x.fecha);
  ok(!dias.includes(domingo), 'una excepción puede cerrar un domingo');
  ok(dias.includes(sabado), 'cerrar el domingo no afecta al sábado');

  /* ---------- 4. Excepción que SOLO cambia el cupo ---------- */
  // `abierta` en NULL: el tercer estado, que en la planilla era una celda
  // en blanco y acá es el tipo de la columna.
  await montar(db, null, [[sabado, null, 40, 'Medio aforo']]);
  f = await d.fechasAbiertas(db, HOY);
  const s14 = f.find((x) => x.fecha === sabado);
  ok(s14 && s14.quedan === 40, 'la excepción cambia el cupo sin cerrar el día');
  ok(f.some((x) => x.fecha === domingo && x.quedan === 60), 'el resto conserva el cupo normal');

  /* ---------- 5. El cupo cuenta adultos Y niños ---------- */
  await montar(db, null, null, [
    ['1001', sabado, 'pagada', 20, 5],
    ['1002', sabado, 'por pagar', 10, 0],
    ['1003', sabado, 'cancelada', 50, 0]   // una cancelada libera su cupo
  ]);
  let panel = await d.diasAbiertos(db, HOY);
  let pSab = panel.find((x) => x.fecha === sabado);
  ok(pSab.tomadas === 35, 'suma adultos y niños, y la cancelada no cuenta');
  ok(pSab.pagadas === 25 && pSab.porPagar === 10, 'separa pagadas de por pagar');
  ok(pSab.quedan === 25, 'quedan = cupo - tomadas');

  /* ---------- 6. Un día lleno no se ofrece ---------- */
  await montar(db, null, [[sabado, null, 40, 'Medio aforo']], [['2001', sabado, 'pagada', 40, 0]]);
  panel = await d.diasAbiertos(db, HOY);
  pSab = panel.find((x) => x.fecha === sabado);
  ok(pSab && pSab.quedan === 0, 'el panel ve un día lleno: es justo el que hay que mirar');
  ok(!(await d.fechasAbiertas(db, HOY)).some((x) => x.fecha === sabado),
     'y el sitio no lo ofrece, porque no puede venderlo');
  ok(pSab.nota === 'Medio aforo', 'la nota de la excepción llega al panel');
  ok(pSab.excepcion === true, 'y queda marcado que ese día es una excepción');

  /* ---------- 7. El sitio recibe deliberadamente MENOS ---------- */
  await montar(db);
  const delSitio = (await d.fechasAbiertas(db, HOY))[0];
  ok(Object.keys(delSitio).sort().join(',') === 'fecha,pocos,quedan',
     'el sitio solo recibe fecha, quedan y pocos: nada de cupo ni de pagadas');

  /* ---------- 8. El tope ---------- */
  ok((await d.diasAbiertos(db, HOY, 3)).length === 3, 'el tope limita cuántos días devuelve');
  ok((await d.diasAbiertos(db, HOY)).length > 3, 'y sin tope devuelve todos los de la ventana');

  /* ---------- 9. fijarDia escribe EXCEPCIONES, no días ---------- */
  const filas = async () => (await db.query('SELECT * FROM excepciones ORDER BY fecha')).rows;

  await montar(db);
  await d.fijarDia(db, HOY, sabado, true, 60, '');
  ok((await filas()).length === 0,
     'abrir un sábado que la regla YA abre, con el cupo normal, no escribe nada');

  await d.fijarDia(db, HOY, jueves, true, 60, '');
  ok((await filas()).length === 1, 'abrir un jueves sí escribe, porque la regla lo cierra');

  await d.fijarDia(db, HOY, jueves, false, 60, '');
  ok((await filas()).length === 0, 'volver el jueves a su estado normal BORRA su fila');

  await montar(db);
  await d.fijarDia(db, HOY, sabado, true, 40, '');
  let e = (await filas())[0];
  ok(e && e.cupo === 40 && e.abierta === null,
     'cambiar solo el cupo deja abierta en NULL: no opina sobre si abre');

  await d.fijarDia(db, HOY, sabado, true, 60, '');
  ok((await filas()).length === 0, 'devolver el cupo al general borra la fila otra vez');

  await montar(db);
  await d.fijarDia(db, HOY, sabado, true, 60, 'Solo socios');
  ok((await filas()).length === 1, 'una nota sola basta para que la fila exista');

  /* ---------- 10. Lo que el motor sostiene y la planilla no ---------- */
  await montar(db);
  await d.anotarReserva(db, { pedido: '3001', fecha: sabado, estado: 'pagada', adultos: 2, ninos: 1 });
  const otra = await d.anotarReserva(db, { pedido: '3001', fecha: sabado, estado: 'cancelada', adultos: 2, ninos: 1 });
  const n = (await db.query('SELECT count(*)::int AS n FROM reservas')).rows[0].n;
  ok(n === 1, 'el mismo pedido dos veces NO duplica la fila: lo impide el UNIQUE');
  ok(otra.nueva === false, 'y la segunda vez se reconoce como actualización');
  ok((await db.query("SELECT estado FROM reservas WHERE pedido='3001'")).rows[0].estado === 'cancelada',
     'pero sí pone al día el estado, como hace sincronizarPedidos()');

  let rechazo = null;
  try {
    await db.query("INSERT INTO reservas (pedido,fecha_reserva,estado) VALUES ('9','2026-11-14','Pagada')");
  } catch (err) { rechazo = err; }
  ok(rechazo !== null,
     'un estado con mayúscula lo RECHAZA el motor; en la planilla se contaba como por pagar');

  rechazo = null;
  try { await db.query("INSERT INTO excepciones (fecha) VALUES ('2026-02-31')"); }
  catch (err) { rechazo = err; }
  ok(rechazo !== null, 'una fecha imposible la rechaza el motor; como texto pasaba');

  console.log('\n' + (fallos ? fallos + ' FALLAS' : 'Todo bien.'));
  process.exit(fallos ? 1 : 0);
})();
