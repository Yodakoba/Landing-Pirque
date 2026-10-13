/**
 * Pruebas de la lógica del backend.
 *
 *     node backend/prueba.js
 *
 * Sin dependencias: solo node. No es un toolchain —no hay que instalar
 * nada— y existe por una razón concreta: Codigo.gs corre en los
 * servidores de Google, así que sin esto no habría ninguna forma de
 * comprobar que la cuenta del cupo o el reparto adultos/niños estén
 * bien antes de desplegarlo.
 *
 * Reemplaza las APIs de Google por dobles mínimos y ejercita las dos
 * funciones donde un error sería caro: leerReserva(), que decide cuánta
 * gente viene, y fechasAbiertas(), que decide qué se puede vender.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

/* ---------- dobles de las APIs de Google, solo lo que se usa ---------- */

let HOJAS = {};

const ctx = {
  Session: { getScriptTimeZone: () => 'America/Santiago' },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (n) => HOJAS[n]
        ? { getDataRange: () => ({ getValues: () => HOJAS[n] }) }
        : null
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} })
  },
  Logger: { log: () => {} },
  console
};

vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, 'Codigo.gs'), 'utf8'), ctx);

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('  FALLA: ' + msg); } };

/* ---------- leerReserva: cuánta gente viene y qué día ---------- */

const attrs = (f) => [
  { name: '_booking_date', value: f },
  { name: '_cowlendar_date', value: f }
];

const r = ctx.leerReserva({
  id: 123, name: '#1001', email: 'a@b.cl', currency: 'CLP', total_price: '248000',
  created_at: '2026-10-13T12:00:00Z',
  customer: { first_name: 'Ana', last_name: 'Soto' },
  line_items: [
    { title: 'Menú A Brasas Abiertas', quantity: 3, properties: attrs('2026-11-15') },
    { title: 'Menú Niños',             quantity: 2, properties: attrs('2026-11-15') }
  ]
});
console.log('leerReserva ->', JSON.stringify(r));

ok(r.fecha === '2026-11-15', 'la fecha sale de _booking_date');
ok(r.adultos === 3, '3 adultos, no 5');
ok(r.ninos === 2, '2 niños: la línea de niños no se cuenta como adulto');
ok(r.nombre === 'Ana Soto', 'el nombre se arma del customer');
ok(r.menu === 'Menú A Brasas Abiertas', 'el menú queda registrado');

// Un pedido sin fecha no es una reserva: puede ser cualquier otra cosa
// vendida en la tienda, y meterla al calendario sería un error.
ok(ctx.leerReserva({ id: 9, line_items: [{ title: 'Polera', quantity: 1, properties: [] }] }) === null,
   'un pedido sin _booking_date se ignora');

/* ---------- fechasAbiertas: qué se puede vender ---------- */

const dia = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const [ayer, hoy, manana, pasado] = [dia(-1), dia(0), dia(1), dia(2)];

HOJAS = {
  Fechas: [
    ['fecha', 'cupo', 'abierta', 'notas'],
    [ayer,   60, 'sí', ''],   // vencida
    [manana, 60, 'sí', ''],   // abierta con espacio
    [pasado, 10, 'sí', ''],   // se llena con las reservas de abajo
    [hoy,    40, 'no', '']    // cerrada a mano
  ],
  Reservas: [
    ['pedido', 'numero', 'fecha_reserva', 'nombre', 'email', 'telefono',
     'menu', 'adultos', 'ninos', 'total', 'moneda', 'creado', 'evento'],
    ['1', '#1', manana, 'Ana',  '', '', 'Trad', 4, 2, '', '', '', ''],
    ['2', '#2', pasado, 'Luis', '', '', 'Trad', 8, 2, '', '', '', '']
  ]
};

const fechas = ctx.fechasAbiertas();
console.log('fechasAbiertas ->', JSON.stringify(fechas));

ok(!fechas.some((f) => f.fecha === ayer),   'la fecha vencida no se ofrece');
ok(!fechas.some((f) => f.fecha === hoy),    'la fecha cerrada a mano no se ofrece');
ok(!fechas.some((f) => f.fecha === pasado), 'la fecha sin cupo no se ofrece');

const m = fechas.find((f) => f.fecha === manana);
ok(m && m.quedan === 54, 'quedan 54: 60 menos 4 adultos y 2 niños');

console.log(fallos ? '\n' + fallos + ' fallas' : '\nlas 10 comprobaciones pasan');
process.exit(fallos ? 1 : 0);
