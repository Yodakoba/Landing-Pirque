/**
 * Pruebas de la lógica pura del panel. Sin dependencias y sin red:
 *
 *   node --experimental-strip-types src/lib/prueba.ts
 *
 * Cubre lo que puede romperse en silencio: el semáforo, qué reserva ocupa
 * lugar, el escape del CSV y el calce de los encabezados de la planilla.
 */
import { semaforo, ocupacionDe, ocupacionDeTodos, ocupaLugar, CORTES } from './ocupacion.ts';
import { aCSV } from './csv.ts';
import { proximosFinesDeSemana, diaSemana, sumarDias, enPalabras, fechaEnZona } from './fechas.ts';
import { paraElSitio, umbralPocos } from './publico.ts';
import { indices, faltantes, normalizar, COL_RESERVAS, TIPO_PAGO } from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';
import { credencialValida, iguales } from './auth.ts';
import { filaReserva } from './filas.ts';
import { estaCerrado, ESTADO_DIA } from './columnas.ts';
import { ASISTENCIA } from './columnas.ts';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { fallos++; console.log('  FALLA: ' + m); } };

const r = (p: Partial<Reserva>): Reserva => ({
  id: 'x', fecha: '2026-11-14', nombre: '', email: '', telefono: '',
  menu: 'Tradiciones', personas: 1, monto: null, tipoPago: TIPO_PAGO.directo, asistencia: '',
  estadoPago: 'paid', creada: '', fila: 2, ...p
});
const dia = (p: Partial<FechaHabil>): FechaHabil => ({
  fecha: '2026-11-14', capacidad: 60, apertura: '13:00',
  estado: ESTADO_DIA.abierta, notas: '', fila: 2, ...p
});

/* ---------- semáforo ---------- */
ok(semaforo(0, 60) === 'verde', 'un día vacío es verde');
ok(semaforo(35, 60) === 'verde', '35 de 60 todavía es verde');
ok(semaforo(36, 60) === 'amarillo', `${CORTES.amarillo * 100}% entra en amarillo`);
ok(semaforo(51, 60) === 'rojo', `${CORTES.rojo * 100}% entra en rojo`);
ok(semaforo(60, 60) === 'rojo', 'lleno es rojo');
ok(semaforo(70, 60) === 'rojo', 'sobrevendido también');
ok(semaforo(5, 0) === 'rojo', 'capacidad cero es rojo, no una división por cero');

/* ---------- qué reserva ocupa lugar ---------- */
ok(ocupaLugar(r({ estadoPago: 'paid' })), 'una pagada ocupa lugar');
ok(ocupaLugar(r({ estadoPago: 'pending' })),
   'una PENDIENTE también: el cliente viene igual y paga al llegar');
ok(!ocupaLugar(r({ estadoPago: 'refunded' })), 'una reembolsada libera su lugar');
ok(!ocupaLugar(r({ estadoPago: 'voided' })), 'una anulada también');
ok(!ocupaLugar(r({ estadoPago: 'REFUNDED' })), 'y no importan las mayúsculas');

/* ---------- el desglose online vs local ---------- */
let o = ocupacionDe([
  r({ personas: 4, tipoPago: TIPO_PAGO.directo, estadoPago: 'paid' }),
  r({ personas: 2, tipoPago: TIPO_PAGO.local, estadoPago: 'pending' }),
  r({ personas: 9, tipoPago: TIPO_PAGO.directo, estadoPago: 'refunded' }),
  r({ personas: 3, fecha: '2026-11-15' })
], dia({}));
ok(o.tomadas === 6, 'suma solo las del día y solo las que ocupan lugar');
ok(o.online === 4 && o.local === 2, 'separa lo pagado online de lo que se paga en el local');
ok(o.quedan === 54, 'quedan = capacidad - tomadas');
ok(o.semaforo === 'verde', 'y el semáforo sale de ese total');

/* ---------- un día bloqueado ---------- */
o = ocupacionDe([], dia({ estado: 'Bloqueada', notas: 'Evento privado' }));
ok(o.bloqueada === true && o.semaforo === 'rojo',
   'un día bloqueado va en rojo aunque esté vacío');
ok(o.notas === 'Evento privado', 'y su nota llega a la vista');

/* ---------- fechas ---------- */
ok(diaSemana('2026-11-14') === 6, 'el 14 de noviembre de 2026 es sábado');
ok(sumarDias('2026-11-30', 1) === '2026-12-01', 'sumar días cruza el mes');
ok(sumarDias('2026-12-31', 1) === '2027-01-01', 'y el año');
const fds = proximosFinesDeSemana('2026-11-12', 4);  // jueves
ok(JSON.stringify(fds) === JSON.stringify(
   ['2026-11-14','2026-11-15','2026-11-21','2026-11-22']),
   'los próximos fines de semana salen en orden y sin días hábiles');
ok(proximosFinesDeSemana('2026-11-14', 1)[0] === '2026-11-14',
   'si hoy ya es sábado, hoy cuenta');
ok(enPalabras('2026-11-14') === 'sábado 14 de noviembre', 'el título del día se lee');

/* ---------- CSV ---------- */
const csv = aCSV(['Nombre', 'Notas'], [['Pérez; Juan', 'Dijo "sí"'], ['Ana', 'a\nb']]);
ok(csv.startsWith('﻿'), 'lleva BOM, si no Excel se come las tildes');
ok(csv.includes('"Pérez; Juan"'), 'entrecomilla lo que trae el separador');
ok(csv.includes('"Dijo ""sí"""'), 'y duplica las comillas de adentro');
ok(csv.includes('"a\nb"'), 'un salto de línea dentro de una celda no parte la fila');
ok(csv.split('\r\n').length === 4, 'tres líneas más el cierre');

/* ---------- el calce de encabezados ---------- */
ok(normalizar('Capacidad Máx') === 'capacidad max', 'la normalización saca tildes');
ok(normalizar('  ID   Orden ') === 'id orden', 'y espacios de sobra');

const bueno = ['ID Orden','Fecha Reserva','Nombre','Email','Teléfono','Menú',
               'Personas','Monto','Tipo Pago','Estado Pago Shopify','Creada',
               'Asistencia'];
ok(faltantes(bueno, COL_RESERVAS).length === 0, 'el encabezado del encargo calza entero');
ok(indices(bueno, COL_RESERVAS).tipoPago === 8, 'y cada campo sabe su columna');

// Lo que de verdad pasa si alguien escribe la planilla a mano.
const sinTildes = bueno.map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, ''));
ok(faltantes(sinTildes, COL_RESERVAS).length === 0,
   'un encabezado SIN TILDES calza igual: "Menu" encuentra a "Menú"');

const malo = ['ID Orden','Fecha Reserva','Nombre','Personas'];
ok(faltantes(malo, COL_RESERVAS).join(', ').includes('Tipo Pago'),
   'y si falta una columna de verdad, se dice cuál en vez de fallar callado');

/* ---------- abierto o cerrado, que falla cerrando ---------- */
ok(!estaCerrado('Activa'), '"Activa" abre: es lo que dicen las 24 filas de la planilla');
ok(!estaCerrado('activa '), 'y no importan may\u00fasculas ni espacios de sobra');
ok(!estaCerrado('Abierta'), '"Abierta" tambi\u00e9n: es lo que el panel escrib\u00eda antes');
ok(!estaCerrado('H\u00e1bil'), 'ni las tildes');
ok(!estaCerrado(''), 'la celda en BLANCO abre: la fila existe porque alguien puso ese dia');

ok(estaCerrado('Cerrada'), '"Cerrada" cierra');
ok(estaCerrado('Bloqueada'), '"Bloqueada" tambi\u00e9n, que es lo que se escrib\u00eda antes');
ok(estaCerrado('Inactiva'), 'y "Inactiva"');

// Esta es la prueba que importa, y la que antes fallaba.
ok(estaCerrado('Cerado'), 'un ERROR DE TECLEO cierra el dia, no lo abre');
ok(estaCerrado('no viene nadie'), 'y cualquier cosa que no reconozcamos, igual');

// Los dos errores no cuestan lo mismo: un dia abierto leido como cerrado
// pierde reservas y se ve en el panel; uno cerrado leido como abierto deja
// entrar 60 personas a un dia que no abre, y se ve cuando llegan.
let cerrado = ocupacionDe([], dia({ estado: 'Cerrada' }));
ok(cerrado.bloqueada && cerrado.semaforo === 'rojo',
   'un dia cerrado sale rojo aunque no tenga ni una reserva');
cerrado = ocupacionDe([], dia({ estado: 'Qvzx' }));
ok(cerrado.bloqueada, 'y una palabra sin sentido NO deja el dia recibiendo reservas');

/* ---------- armar la fila que se escribe en la planilla ---------- */
// El encabezado a propósito EN OTRO ORDEN que COL_RESERVAS: la fila tiene que
// salir del encabezado real, no del orden en que están declaradas las llaves.
const encRaro = ['Creada','Personas','Nombre','Asistencia','ID Orden','Fecha Reserva',
                 'Email','Teléfono','Menú','Monto','Tipo Pago','Estado Pago Shopify'];

let f = filaReserva(encRaro, r({ id: '1007', nombre: 'Ana', personas: 4, monto: 176000 }));
ok(f[4] === '1007' && f[2] === 'Ana' && f[1] === 4,
   'cada valor cae en la columna que le toca según el encabezado');
ok(f.length === encRaro.length, 'y la fila mide lo mismo que el encabezado');

// Esto es lo que hace el botón de asistencia: manda SOLO ese campo.
const previa = ['2026-10-14','4','Ana','','1007','2026-11-14',
                'ana@x.cl','+56 9','Tradiciones','176000','Pago directo','paid'];
f = filaReserva(encRaro, { asistencia: ASISTENCIA.noVino }, previa);
ok(f[3] === 'No', 'marcar la asistencia escribe esa columna');
ok(f[2] === 'Ana' && f[6] === 'ana@x.cl' && f[9] === '176000' && f[11] === 'paid',
   'y NO borra el resto de la fila: una edición parcial solo toca lo que manda');

// Vaciar un campo a propósito tiene que seguir siendo posible.
f = filaReserva(encRaro, { asistencia: ASISTENCIA.sinMarcar }, previa);
ok(f[3] === '', 'volver a "sin marcar" sí vacía la celda');

// Una columna que la planilla no tiene no puede tumbar la escritura.
const encCorto = ['ID Orden','Fecha Reserva','Personas'];
f = filaReserva(encCorto, { asistencia: ASISTENCIA.vino, personas: 2 });
ok(f.length === 3 && f[2] === 2,
   'si la planilla no tiene la columna Asistencia, se escribe el resto igual');

/* ---------- lo que se le manda al SITIO, que es una frontera ---------- */
// Al otro lado de esto no hay contrasena: lo pide cualquiera en internet.
const ocu = ocupacionDeTodos(
  [ r({ fecha: '2026-11-14', personas: 50 }),
    r({ fecha: '2026-11-15', personas: 60 }) ],
  [ dia({ fecha: '2026-11-14' }),
    dia({ fecha: '2026-11-15' }),
    dia({ fecha: '2026-11-21' }),
    dia({ fecha: '2026-11-22', estado: 'Cerrada' }) ]
);
const pub = paraElSitio(ocu, 10);

ok(pub.length === 2, 'el dia LLENO y el CERRADO no se mandan: el sitio solo dibuja lo reservable');
ok(pub.every((f) => f.fecha !== '2026-11-15'), 'el lleno no va como "quedan 0", va ausente');
ok(pub.every((f) => f.fecha !== '2026-11-22'), 'y el cerrado tampoco aparece');

// LA prueba de esta frontera: tres campos y nada mas.
const llaves = Object.keys(pub[0]).sort().join(',');
ok(llaves === 'fecha,pocos,quedan',
   `al sitio van exactamente fecha, quedan y pocos — y fueron: ${llaves}`);
ok(!('capacidad' in pub[0]) && !('tomadas' in pub[0]) && !('online' in pub[0]) &&
   !('local' in pub[0]) && !('notas' in pub[0]) && !('semaforo' in pub[0]),
   'NO se filtra el tamano del local, cuanta gente reservo, cuanto pago ni las notas internas');

const lleno = pub.find((f) => f.fecha === '2026-11-14')!;
ok(lleno.quedan === 10 && lleno.pocos === true, 'con 10 de 60 libres, "pocos" se enciende');
const vacio = pub.find((f) => f.fecha === '2026-11-21')!;
ok(vacio.quedan === 60 && vacio.pocos === false, 'y con el dia entero libre, no');
ok(paraElSitio(ocu, 0).every((f) => !f.pocos), 'el umbral manda: en cero, nunca hay "pocos"');
ok(umbralPocos() === 10,
   'por defecto son 10 lugares, que es el aviso_pocos_lugares del backend viejo');

/* ---------- "hoy" es hoy en Chile, no donde corra el codigo ---------- */
// 02:00 UTC del 21 son las 23:00 del 20 en Santiago. Con la zona del
// servidor el panel perdia el dia de hoy desde las 21:00, justo la tarde
// de un sabado.
const nocheEnChile = new Date('2026-10-21T02:00:00Z');
ok(fechaEnZona(nocheEnChile, 'America/Santiago') === '2026-10-20',
   'a las 23:00 en Pirque sigue siendo el dia 20');
ok(fechaEnZona(nocheEnChile, 'UTC') === '2026-10-21',
   'y en UTC ya es el 21: por eso no se puede usar la zona del servidor');
ok(/^\d{4}-\d{2}-\d{2}$/.test(fechaEnZona(new Date())),
   'y el formato sigue siendo AAAA-MM-DD');

/* ---------- la credencial del panel ---------- */
const basic = (u: string, c: string) => 'Basic ' + Buffer.from(u + ':' + c).toString('base64');

ok(credencialValida(basic('brasas', 'clave-larga'), 'brasas', 'clave-larga'),
   'la credencial correcta pasa');
ok(!credencialValida(basic('brasas', 'otra'), 'brasas', 'clave-larga'), 'clave mala no pasa');
ok(!credencialValida(basic('otro', 'clave-larga'), 'brasas', 'clave-larga'), 'usuario malo no pasa');
ok(!credencialValida('', 'brasas', 'clave-larga'), 'sin cabecera no pasa');
ok(!credencialValida('Bearer abc', 'brasas', 'clave-larga'), 'otro esquema no pasa');
ok(!credencialValida('Basic %%%no-es-base64%%%', 'brasas', 'clave-larga'),
   'base64 invalido no revienta, solo no pasa');
ok(!credencialValida('Basic ' + Buffer.from('sin-dos-puntos').toString('base64'),
   'brasas', 'clave-larga'), 'sin ":" no pasa');

// Una clave puede llevar ":" — por eso se corta en el PRIMERO y no se usa split.
ok(credencialValida(basic('brasas', 'a:b:c'), 'brasas', 'a:b:c'),
   'una clave con dos puntos adentro funciona');

ok(iguales('abc', 'abc') && !iguales('abc', 'abd') && !iguales('abc', 'abcd'),
   'la comparacion distingue contenido y largo');

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: la lógica del panel pasa.');
process.exit(fallos ? 1 : 0);
