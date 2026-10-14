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

// Una hoja de calculo de mentira, con lo justo que usa Codigo.gs. Los
// rangos van en base 1 como los de verdad, porque un off-by-one aca
// haria pasar una prueba que en Google falla.
function hojaFalsa(nombre) {
  const filas = HOJAS[nombre];
  return {
    getDataRange: () => ({ getValues: () => filas }),
    getLastRow: () => filas.length,
    getLastColumn: () => filas.reduce((m, f) => Math.max(m, f.length), 0),
    appendRow: (f) => { filas.push(f.slice()); },
    setFrozenRows: () => {},
    getRange: (f0, c0, nf, nc) => ({
      getValues: () => {
        const out = [];
        for (let i = 0; i < (nf || 1); i++) {
          const fila = filas[f0 - 1 + i] || [];
          const r = [];
          for (let j = 0; j < (nc || 1); j++) {
            r.push(fila[c0 - 1 + j] === undefined ? '' : fila[c0 - 1 + j]);
          }
          out.push(r);
        }
        return out;
      },
      setValues: (v) => {
        for (let i = 0; i < v.length; i++) {
          while (filas.length < f0 + i) filas.push([]);
          for (let j = 0; j < v[i].length; j++) {
            filas[f0 - 1 + i][c0 - 1 + j] = v[i][j];
          }
        }
      },
      setValue: (val) => {
        while (filas.length < f0) filas.push([]);
        filas[f0 - 1][c0 - 1] = val;
      }
    })
  };
}

const ctx = {
  Session: { getScriptTimeZone: () => 'America/Santiago' },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (n) => (HOJAS[n] ? hojaFalsa(n) : null),
      insertSheet: (n) => { HOJAS[n] = []; return hojaFalsa(n); }
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

/* ---------- nombreDe: los tres lugares donde Shopify lo tiene ---------- */

ok(ctx.nombreDe({ customer: { first_name: 'Ana', last_name: 'Soto' } }) === 'Ana Soto',
   'el nombre sale del customer cuando viene');
// Sin customer, la direccion de facturacion suele traerlo igual.
ok(ctx.nombreDe({ billing_address: { name: 'Ana Soto' } }) === 'Ana Soto',
   'sin customer, cae a la direccion de facturacion');
ok(ctx.nombreDe({ shipping_address: { first_name: 'Ana', last_name: 'Soto' } }) === 'Ana Soto',
   'y si no, a la de envio, armandolo de las dos partes');
ok(ctx.nombreDe({ customer: {}, billing_address: { name: 'Ana Soto' } }) === 'Ana Soto',
   'un customer vacio no tapa a la direccion');
ok(ctx.nombreDe({}) === '', 'sin nada en ninguna parte, queda vacio y no "undefined undefined"');

/* ---------- emailDe y telefonoDe: de donde salen de verdad ---------- */

// El correo del PEDIDO manda sobre el de la ficha del cliente: puede
// haber reservado con uno distinto al de su cuenta.
ok(ctx.emailDe({ email: 'pedido@x.cl', customer: { email: 'cuenta@x.cl' } }) === 'pedido@x.cl',
   'el correo del pedido le gana al de la ficha');
ok(ctx.emailDe({ contact_email: 'contacto@x.cl' }) === 'contacto@x.cl',
   'si no hay email, sirve contact_email');
ok(ctx.emailDe({ customer: { email: 'cuenta@x.cl' } }) === 'cuenta@x.cl',
   'y en ultimo lugar el de la ficha');
ok(ctx.emailDe({}) === '', 'sin ninguno, vacio');

// El telefono: order.phone viene vacio casi siempre porque el checkout
// lo pide DENTRO de la direccion. Este era el hueco.
ok(ctx.telefonoDe({ billing_address: { phone: '+56 9 1111' } }) === '+56 9 1111',
   'el telefono sale de la direccion de facturacion');
ok(ctx.telefonoDe({ shipping_address: { phone: '+56 9 2222' } }) === '+56 9 2222',
   'o de la de envio');
ok(ctx.telefonoDe({ phone: '+56 9 3333', billing_address: { phone: '+56 9 1111' } })
     === '+56 9 3333',
   'si el pedido trae uno suelto, ese manda');
ok(ctx.telefonoDe({ billing_address: {}, customer: { phone: '+56 9 4444' } }) === '+56 9 4444',
   'una direccion sin telefono no tapa al de la ficha');
ok(ctx.telefonoDe({}) === '', 'sin ninguno, vacio');

// estadoDelCampo distingue los cuatro casos.
ok(ctx.estadoDelCampo({}, 'email').indexOf('NO APARECE') !== -1,
   'una llave ausente se reporta como ausente');
ok(ctx.estadoDelCampo({ email: null }, 'email').indexOf('null') !== -1,
   'una llave en null se reporta como null');
ok(ctx.estadoDelCampo({ email: '' }, 'email').indexOf('VACÍA') !== -1,
   'una llave vacia no es lo mismo que una en null');
ok(ctx.estadoDelCampo({ email: 'a@b.cl' }, 'email').indexOf('trae') !== -1,
   'una llave con valor se reporta como que trae algo');
ok(ctx.estadoDelCampo(null, 'email').indexOf('NO APARECE') !== -1,
   'un objeto nulo no revienta');

// pareceCensurado: un objeto que trae datos pero sin JUSTO esas llaves.
// Comprobado contra el pedido #1007 de la tienda: asi se ve la censura,
// y NO como llaves en null, que era lo que se supuso al principio.
const PII = ['first_name', 'last_name', 'email', 'phone'];
ok(ctx.pareceCensurado({ id: 1, state: 'enabled' }, PII) === true,
   'un customer con datos pero sin ninguna llave de persona: censurado');
ok(ctx.pareceCensurado({ id: 1, first_name: 'Ana' }, PII) === false,
   'si trae una de las llaves, no esta censurado');
ok(ctx.pareceCensurado({ id: 1, email: null }, PII) === false,
   'una llave presente en null es un dato que no hay, no censura');
ok(ctx.pareceCensurado(null, PII) === false, 'un objeto nulo no es censura');
ok(ctx.pareceCensurado({}, PII) === false, 'un objeto vacio tampoco: no trae nada que censurar');

// El correo se enmascara para no dejarlo entero en el registro.
ok(ctx.enmascarar('ana.soto@correo.cl') === 'an***@correo.cl', 'el correo se enmascara');
ok(ctx.enmascarar('') === '', 'un correo vacio sigue vacio');
ok(ctx.enmascarar('sinarroba') === '(ilegible)', 'algo que no es correo se nota');

/* ---------- estadoDe: pagada, por pagar, cancelada ---------- */

// Desde que existe "pagar en el local" el backend anota tambien los
// pedidos sin pagar, asi que de esta funcion depende si una reserva
// cuenta como vendida, como pendiente de cobro o como muerta.
ok(ctx.estadoDe({ financial_status: 'paid' }) === 'pagada', 'paid es pagada');
ok(ctx.estadoDe({ financial_status: 'pending' }) === 'por pagar',
   'pending (pago en el local) es por pagar');
ok(ctx.estadoDe({ financial_status: 'authorized' }) === 'por pagar',
   'authorized todavia no es plata cobrada');
ok(ctx.estadoDe({ financial_status: 'partially_paid' }) === 'por pagar',
   'con saldo pendiente no esta pagada');
ok(ctx.estadoDe({ financial_status: 'refunded' }) === 'cancelada',
   'un reembolso cancela la reserva');
ok(ctx.estadoDe({ financial_status: 'voided' }) === 'cancelada', 'voided cancela');
ok(ctx.estadoDe({ financial_status: 'paid', cancelled_at: '2026-10-14T10:00:00Z' })
     === 'cancelada',
   'un pedido cancelado esta cancelado aunque se haya pagado');
ok(ctx.estadoDe({}) === 'por pagar', 'sin financial_status se asume por pagar');

// La modalidad sale del nombre de la variante, que es como se ve que
// alguien compro con descuento y despues eligio pagar en el local.
const rLocal = ctx.leerReserva({
  id: 124, name: '#1002', financial_status: 'pending',
  line_items: [
    { title: 'Menú Tradiciones', variant_title: 'Solo reserva',
      quantity: 2, properties: attrs('2026-11-15') }
  ]
});
ok(rLocal.modalidad === 'Solo reserva', 'la modalidad sale del variant_title');
ok(rLocal.estado === 'por pagar', 'un pedido pendiente queda por pagar');

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

const sinReservas = [['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos']];

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
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'pagada', 4, 2]
]);
s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 54, 'quedan 54: los niños también ocupan lugar');

// 5b. Una reserva SIN PAGAR toma cupo igual: la silla queda ocupada.
f = montar(base, [], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'por pagar', 4, 2]
]);
s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 54, 'una reserva por pagar ocupa lugar igual');

// 5c. Una CANCELADA lo libera, y no arrastra a las demás del mismo día.
f = montar(base, [], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'cancelada', 4, 2],
  ['2', sabado, 'pagada', 1, 0]
]);
s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 59, 'la cancelada libera su cupo y la pagada lo conserva');

// 5d. Una fila vieja, sin estado, cuenta: es de antes de que existiera
// la columna y era una reserva pagada.
f = montar(base, [], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, '', 4, 2]
]);
s14 = f.find((x) => x.fecha === sabado);
ok(s14 && s14.quedan === 54, 'una fila sin estado sigue ocupando lugar');

// 6. Un día lleno no se ofrece.
f = montar(base, [[sabado, '', 6, '']], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'pagada', 4, 2]
]);
ok(!f.some((x) => x.fecha === sabado), 'un día sin lugares no se ofrece');

// 7. El aviso de "quedan pocos".
f = montar(base, [[sabado, '', 12, '']], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'pagada', 3, 0]
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

/* ---------- prepararPlanilla: las cuatro pestanas ---------- */

// Libro vacio: tiene que dejarlas las cuatro, con sus titulos.
HOJAS = {};
ctx.prepararPlanilla();
const titulos = (n) => HOJAS[n][0];

ok(HOJAS.Config && HOJAS.Excepciones && HOJAS.Reservas && HOJAS.Registro,
   'crea las cuatro pestanas');
ok(titulos('Reservas').join(',') ===
   'pedido,numero,fecha_reserva,nombre,email,telefono,menu,modalidad,' +
   'estado,adultos,ninos,total,moneda,creado,evento',
   'Reservas queda con sus 15 columnas en orden');
ok(titulos('Excepciones').join(',') === 'fecha,abierta,cupo,nota',
   'Excepciones queda con sus cuatro columnas');
ok(titulos('Config').join(',') === 'clave,valor', 'Config queda con clave y valor');

// Y Config con los valores por defecto escritos, para que se vean.
const claves = HOJAS.Config.slice(1).map((f) => f[0]);
ok(claves.indexOf('dias_abiertos') !== -1 && claves.indexOf('cupo_normal') !== -1 &&
   claves.indexOf('dias_a_futuro') !== -1 && claves.indexOf('aviso_pocos_lugares') !== -1,
   'Config trae las cuatro claves por defecto');

// Correrla de nuevo no puede duplicar nada: es lo que mas se va a hacer
// mal, porque no hay forma de saber si ya se corrio.
const antesConfig = HOJAS.Config.length;
const antesTitulos = titulos('Reservas').length;
ctx.prepararPlanilla();
ok(HOJAS.Config.length === antesConfig, 'correrla de nuevo no duplica las filas de Config');
ok(titulos('Reservas').length === antesTitulos, 'correrla de nuevo no duplica columnas');

// El caso real: una planilla que ya existe con las columnas de antes.
// Las dos nuevas se agregan al final y los datos no se mueven.
HOJAS = {
  Reservas: [
    ['pedido', 'numero', 'fecha_reserva', 'nombre', 'email', 'telefono',
     'menu', 'adultos', 'ninos', 'total', 'moneda', 'creado', 'evento'],
    ['123', '#1001', '2026-11-15', 'Ana Soto', 'a@b.cl', '',
     'Menú Tradiciones', 2, 1, '107000', 'CLP', '', '']
  ]
};
ctx.prepararPlanilla();
ok(titulos('Reservas').indexOf('modalidad') !== -1 &&
   titulos('Reservas').indexOf('estado') !== -1,
   'a una planilla vieja le agrega modalidad y estado');
ok(HOJAS.Reservas[1][3] === 'Ana Soto' && HOJAS.Reservas[1][7] === 2,
   'y no corre de lugar los datos que ya estaban');
ok(HOJAS.Reservas.length === 2, 'no agrega filas');

console.log(fallos ? '\n' + fallos + ' fallas' : '\ntodas las comprobaciones pasan');
process.exit(fallos ? 1 : 0);
