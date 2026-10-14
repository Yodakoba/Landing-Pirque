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
    deleteRow: (n) => { filas.splice(n - 1, 1); },
    clear: () => { filas.length = 0; },
    getMaxRows: () => Math.max(filas.length, 1),
    getMaxColumns: () => Math.max(hojaFalsa(nombre).getLastColumn(), 1),
    setFrozenRows: () => {},
    setColumnWidth: () => {},
    setActiveRange: () => {},
    getName: () => nombre,
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
      setValues: function (v) {
        for (var i = 0; i < v.length; i++) {
          while (filas.length < f0 + i) filas.push([]);
          for (var j = 0; j < v[i].length; j++) {
            filas[f0 - 1 + i][c0 - 1 + j] = v[i][j];
          }
        }
        return this;
      },
      setValue: function (val) {
        while (filas.length < f0) filas.push([]);
        filas[f0 - 1][c0 - 1] = val;
        return this;
      },
      // El formato no se simula: lo que importa probar son los VALORES.
      // Pero tienen que encadenar, porque el codigo escribe
      // .setValue(x).setFontWeight('bold') y si devolvieran undefined
      // reventaria en la segunda llamada.
      clear: function () {
        for (var i = 0; i < (nf || 1); i++) {
          var fl = filas[f0 - 1 + i];
          if (!fl) continue;
          for (var j = 0; j < (nc || 1); j++) fl[c0 - 1 + j] = '';
        }
        return this;
      },
      setFontWeight: function () { return this; },
      setFontSize: function () { return this; },
      setFontColor: function () { return this; },
      setFontLine: function () { return this; },
      setBackground: function () { return this; },
      setNumberFormat: function () { return this; }
    })
  };
}

const ctx = {
  Session: { getScriptTimeZone: () => 'America/Santiago' },
  Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (n) => (HOJAS[n] ? hojaFalsa(n) : null),
      insertSheet: (n) => { HOJAS[n] = []; return hojaFalsa(n); },
      setActiveSheet: () => {},
      toast: () => {}
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

/* ---------- el panel: ocupacion repartida por estado ---------- */

// Lo que el panel dibuja. Dos reservas el mismo dia, una pagada y una por
// pagar, mas una cancelada que no tiene que contar en ninguna de las dos.
montar(base, [], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'pagada',    4, 2],
  ['2', sabado, 'por pagar', 3, 0],
  ['3', sabado, 'cancelada', 9, 9]
]);
let pDias = ctx.diasAbiertos();
let pSab = pDias.find((x) => x.fecha === sabado);
ok(pSab.pagadas === 6, 'suma 6 personas pagadas (4 adultos + 2 ninos)');
ok(pSab.porPagar === 3, 'y 3 por pagar, aparte');
ok(pSab.tomadas === 9, 'el total es la suma de las dos, sin la cancelada');
ok(pSab.quedan === 51, 'y lo que queda descuenta las dos, no solo la pagada');
ok(pSab.cupo === 60, 'el panel ve el cupo del dia, que el sitio no recibe');

// Una fila vieja sin estado es anterior a la columna, y en esa epoca solo
// se anotaban pedidos pagados: contarla como deuda inventaria una.
montar(base, [], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, '', 4, 0]
]);
pSab = ctx.diasAbiertos().find((x) => x.fecha === sabado);
ok(pSab.pagadas === 4 && pSab.porPagar === 0,
   'una fila sin estado cuenta como pagada, no como deuda');

// Un dia LLENO lo ve el panel y no lo ve el sitio. Es la diferencia que
// justifica que sean dos funciones.
montar(base, [[sabado, '', 6, 'Medio aforo']], [
  ['pedido', 'fecha_reserva', 'estado', 'adultos', 'ninos'],
  ['1', sabado, 'pagada', 6, 0]
]);
ok(ctx.diasAbiertos().some((x) => x.fecha === sabado),
   'el panel ve un dia lleno: es justo el que hay que mirar');
ok(!ctx.fechasAbiertas().some((x) => x.fecha === sabado),
   'y el sitio no lo ofrece, porque no puede venderlo');
pSab = ctx.diasAbiertos().find((x) => x.fecha === sabado);
ok(pSab.nota === 'Medio aforo', 'la nota de la excepcion llega al panel');
ok(pSab.excepcion === true, 'y queda marcado que ese dia es una excepcion');

// El sitio recibe deliberadamente MENOS: cuanta gente reservo, cuanto
// pago y de que tamano es el local no son cosas de un visitante.
montar(base);
const delSitio = ctx.fechasAbiertas()[0];
ok(Object.keys(delSitio).sort().join(',') === 'fecha,pocos,quedan',
   'el sitio solo recibe fecha, quedan y pocos: nada de cupo ni de pagadas');

// El tope existe para que el panel no pida tres meses de fines de semana.
ok(ctx.diasAbiertos(3).length === 3, 'el tope limita cuantos dias devuelve');
ok(ctx.diasAbiertos().length > 3, 'y sin tope devuelve todos los de la ventana');

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

/* ---------- fijarDia: escribe EXCEPCIONES, no dias ---------- */

// La regla que no se puede romper: un calendario que escriba una fila por
// cada dia abierto llena la pestana con 104 filas al ano, que es justo el
// problema que este diseno evito.

function montarExcepciones(filas) {
  HOJAS = {
    Config: [['clave', 'valor']].concat(base),
    Excepciones: [['fecha', 'abierta', 'cupo', 'nota']].concat(filas || []),
    Reservas: sinReservas
  };
}
const filasExc = () => HOJAS.Excepciones.slice(1);

// Abrir un sabado —que la regla YA abre— no escribe nada.
montarExcepciones([]);
ctx.fijarDia(sabado, true, 60, '');
ok(filasExc().length === 0, 'abrir un dia que la regla ya abre no escribe fila');

// Cerrarlo si escribe, porque se sale de la regla.
montarExcepciones([]);
ctx.fijarDia(sabado, false, 60, '');
ok(filasExc().length === 1 && filasExc()[0][1] === 'no',
   'cerrar un dia que la regla abre escribe una excepcion');

// Y volverlo a abrir BORRA la fila, no escribe una segunda.
ctx.fijarDia(sabado, true, 60, '');
ok(filasExc().length === 0, 'devolverlo a su estado normal borra la fila');

// Abrir un jueves —que la regla cierra— si escribe.
montarExcepciones([]);
ctx.fijarDia(jueves, true, 60, '18 de septiembre');
ok(filasExc().length === 1 && filasExc()[0][1] === 'sí',
   'abrir un dia que la regla cierra escribe una excepcion');

// El cupo igual al general no se escribe: seria una fila que no dice nada.
montarExcepciones([]);
ctx.fijarDia(sabado, true, 60, '');
ok(filasExc().length === 0, 'un cupo igual al general no genera fila');

// Un cupo distinto si, y deja "abierta" en blanco: no opina sobre el dia.
montarExcepciones([]);
ctx.fijarDia(sabado, true, 40, '');
ok(filasExc().length === 1 && filasExc()[0][1] === '' && filasExc()[0][2] === 40,
   'un cupo propio se guarda con abierta en blanco');

// Una nota sola tambien justifica la fila: es informacion que no esta en
// ninguna otra parte.
montarExcepciones([]);
ctx.fijarDia(sabado, true, 60, 'Viene un grupo grande');
ok(filasExc().length === 1 && filasExc()[0][3] === 'Viene un grupo grande',
   'una nota sola mantiene la fila viva');

// Tocar dos veces el mismo dia ACTUALIZA su fila, no agrega otra.
montarExcepciones([]);
ctx.fijarDia(sabado, false, 60, '');
ctx.fijarDia(sabado, false, 30, 'Medio aforo');
ok(filasExc().length === 1 && filasExc()[0][2] === 30 && filasExc()[0][3] === 'Medio aforo',
   'tocar dos veces el mismo dia no duplica la fila');

// Y no toca las de los demas dias.
montarExcepciones([[domingo, 'no', '', 'Cerrado']]);
ctx.fijarDia(sabado, false, 20, '');
ok(filasExc().length === 2, 'no pisa las excepciones de otros dias');

/* ---------- mesDelCalendario: lo que ve el panel ---------- */

montarExcepciones([[jueves, 'sí', 80, 'Feriado']]);
const mes = ctx.mesDelCalendario('2026-11-01');
ok(mes.dias.length === 30, 'noviembre trae 30 dias, no 31');
const jue = mes.dias.find((x) => x.fecha === jueves);
ok(jue.abierta === true && jue.porRegla === false,
   'el jueves abre por excepcion, no por la regla');
ok(jue.excepcion === true && jue.cupo === 80, 'y trae su cupo propio');
const sab = mes.dias.find((x) => x.fecha === sabado);
ok(sab.abierta === true && sab.excepcion === false,
   'el sabado abre por la regla y no tiene fila propia');

/* ---------- guardarReservaManual: las que no pasan por Shopify ---------- */

ctx.Utilities.formatDate = (d) => d.toISOString().slice(0, 10);
ctx.CalendarApp = { getCalendarById: () => null };   // sin calendario, no revienta

function montarVacio() {
  HOJAS = {
    Config: [['clave', 'valor']].concat(base),
    Excepciones: [['fecha', 'abierta', 'cupo', 'nota']],
    Reservas: [ctx.COLUMNAS_RESERVAS.slice()]
  };
}

montarVacio();
ctx.guardarReservaManual({
  fecha: sabado, nombre: 'Ana', apellido: 'Soto',
  tradiciones: 2, brasas: 1, ninos: 3, estado: 'pagada', telefono: '+56 9 1111'
});
const manual = HOJAS.Reservas[1];
const col = (n) => manual[HOJAS.Reservas[0].indexOf(n)];
ok(HOJAS.Reservas.length === 2, 'la reserva a mano queda anotada');
ok(col('nombre') === 'Ana Soto', 'nombre y apellido se juntan');
ok(col('adultos') === 3, 'los dos menus de adulto se suman: 2 + 1');
ok(col('ninos') === 3, 'los ninos van aparte');
ok(col('estado') === 'pagada', 'el estado del pago se guarda');
ok(col('modalidad') === 'A mano', 'queda marcada como escrita a mano');
ok(String(col('pedido')).indexOf('MANUAL-') === 0,
   'el pedido empieza en MANUAL-, que no puede chocar con un id de Shopify');
ok(col('total') === '', 'el total queda en blanco: el backend no conoce los precios');

// Y toma cupo como cualquier otra.
const tras = ctx.diasAbiertos().find((x) => x.fecha === sabado);
ok(tras.tomadas === 6 && tras.pagadas === 6,
   'una reserva a mano ocupa lugar igual que una de Shopify');

// Lo que falta se dice entero, no de a uno.
montarVacio();
let error = '';
try { ctx.guardarReservaManual({ fecha: sabado }); } catch (e) { error = e.message; }
ok(error.indexOf('el nombre') !== -1 && error.indexOf('el apellido') !== -1 &&
   error.indexOf('al menos una persona') !== -1 && error.indexOf('el estado') !== -1,
   'nombra de una vez todo lo que falta');
ok(HOJAS.Reservas.length === 1, 'y no anota nada a medias');

// Sin gente no hay reserva, aunque el resto este completo.
montarVacio();
error = '';
try {
  ctx.guardarReservaManual({ fecha: sabado, nombre: 'Ana', apellido: 'Soto',
    tradiciones: 0, brasas: 0, ninos: 0, estado: 'pagada' });
} catch (e) { error = e.message; }
ok(error.indexOf('al menos una persona') !== -1, 'cero personas no es una reserva');

// Un estado inventado no entra: la planilla solo entiende tres.
montarVacio();
error = '';
try {
  ctx.guardarReservaManual({ fecha: sabado, nombre: 'Ana', apellido: 'Soto',
    tradiciones: 1, estado: 'quizas' });
} catch (e) { error = e.message; }
ok(error.indexOf('el estado del pago') !== -1, 'un estado inventado se rechaza');

// Y sincronizarPedidos no puede confundirla con un pedido suyo.
montarVacio();
ctx.guardarReservaManual({ fecha: sabado, nombre: 'Ana', apellido: 'Soto',
  tradiciones: 1, estado: 'pagada' });
const anotados = ctx.pedidosYaAnotados();
ok(Object.keys(anotados).length === 1, 'la reserva a mano aparece entre las anotadas');
ok(!anotados['123'] && !anotados[''], 'y no colisiona con un id de Shopify');

console.log(fallos ? '\n' + fallos + ' fallas' : '\ntodas las comprobaciones pasan');
process.exit(fallos ? 1 : 0);
