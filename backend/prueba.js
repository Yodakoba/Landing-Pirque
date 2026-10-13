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

/* ---------- fechasAbiertas: reglas, excepciones y cupo ---------- */

// Un sábado y un domingo concretos, lejos de hoy para que no se mezclen
// con el borde del mes ni con el "desde hoy".
const sabado  = '2026-11-14';
const domingo = '2026-11-15';
const lunes   = '2026-11-16';
const jueves  = '2026-11-19';

// fechasAbiertas() arranca en hoy, así que para probar fechas fijas hay
// que fijar hoy también.
ctx.hoyAca = () => '2026-11-14';

const sinReservas = [['pedido', 'fecha_reserva', 'adultos', 'ninos']];

function montar(config, excepciones, reservas) {
  HOJAS = {
    Config: [['clave', 'valor']].concat(config),
    Excepciones: [['fecha', 'abierta', 'cupo', 'nota']].concat(excepciones || []),
    Reservas: reservas || sinReservas
  };
  return ctx.fechasAbiertas();
}

const base = [
  ['dias_abiertos', 'sáb,dom'],
  ['cupo_normal', 60],
  ['dias_a_futuro', 10],
  ['aviso_pocos_lugares', 10]
];

// 1. La regla sola: solo sábados y domingos.
let f = montar(base);
let dias = f.map((x) => x.fecha);
console.log('solo la regla ->', JSON.stringify(dias));
ok(dias.indexOf(sabado) !== -1 && dias.indexOf(domingo) !== -1, 'abre sábado y domingo');
ok(dias.indexOf(lunes) === -1, 'el lunes no abre');
ok(f.every((x) => x.quedan === 60), 'sin reservas, el cupo es el normal');
ok(f.every((x) => x.pocos === false), 'con 60 lugares no avisa "quedan pocos"');

// 2. Excepción que ABRE un día que la regla cierra.
dias = montar(base, [[jueves, 'sí', '', '18 de septiembre']]).map((x) => x.fecha);
ok(dias.indexOf(jueves) !== -1, 'una excepción puede abrir un jueves');

// 3. Excepción que CIERRA un día que la regla abre.
dias = montar(base, [[domingo, 'no', '', 'Evento privado']]).map((x) => x.fecha);
ok(dias.indexOf(domingo) === -1, 'una excepción puede cerrar un domingo');
ok(dias.indexOf(sabado) !== -1, 'cerrar el domingo no afecta al sábado');

// 4. Excepción que SOLO cambia el cupo, dejando "abierta" en blanco.
f = montar(base, [[sabado, '', 40, 'Medio aforo']]);
let s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 40, 'la excepción cambia el cupo sin cerrar el día');
ok(f.some((x) => x.fecha === domingo && x.quedan === 60), 'el resto conserva el cupo normal');

// 5. El cupo descuenta adultos Y niños.
f = montar(base, [], [
  ['pedido', 'fecha_reserva', 'adultos', 'ninos'],
  ['1', sabado, 4, 2]
]);
s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 54, 'quedan 54: los niños también ocupan lugar');

// 6. Un día lleno no se ofrece.
f = montar(base, [[sabado, '', 6, '']], [
  ['pedido', 'fecha_reserva', 'adultos', 'ninos'],
  ['1', sabado, 4, 2]
]);
ok(!f.some((x) => x.fecha === sabado), 'un día sin lugares no se ofrece');

// 7. El aviso de "quedan pocos".
f = montar(base, [[sabado, '', 12, '']], [
  ['pedido', 'fecha_reserva', 'adultos', 'ninos'],
  ['1', sabado, 3, 0]
]);
s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 9 && s14.pocos === true, 'con 9 lugares avisa que quedan pocos');

// 8. La planilla la escribe una persona: hay que tolerar cómo escriba.
dias = montar([['dias_abiertos', 'SAB / Dom'], ['dias_a_futuro', 10]]).map((x) => x.fecha);
ok(dias.indexOf(sabado) !== -1 && dias.indexOf(domingo) !== -1,
   'acepta "SAB / Dom" sin tildes, con espacios y en mayúsculas');

// 9. Config vacía: valores por defecto en vez de quedarse sin fechas.
ok(montar([]).length > 0, 'con la Config vacía igual ofrece fechas');

// 10. Nunca ofrece una fecha anterior a hoy.
ok(montar(base).every((x) => x.fecha >= '2026-11-14'), 'ninguna fecha vencida');

console.log(fallos ? '\n' + fallos + ' fallas' : '\ntodas las comprobaciones pasan');
process.exit(fallos ? 1 : 0);
