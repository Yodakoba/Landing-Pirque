/**
 * Pruebas de la lógica pura del panel. Sin dependencias y sin red:
 *
 *   node --experimental-strip-types src/lib/prueba.ts
 *
 * Cubre lo que puede romperse en silencio: el semáforo, qué reserva ocupa
 * lugar, el escape del CSV y el calce de los encabezados de la planilla.
 */
import { semaforo, ocupacionDe, ocupacionDeTodos, ocupaLugar, faltaCobrar,
         enPesos, CORTES } from './ocupacion.ts';
import { aCSV } from './csv.ts';
import { proximosFinesDeSemana, diaSemana, sumarDias, enPalabras, fechaEnZona,
         diasAbiertosEntre, mesDe, mesEnPalabras, semanaDe,
         rangoEnPalabras } from './fechas.ts';
import { paraElSitio } from './publico.ts';
import { aReserva, estadoDe, telefonoDe, nombreDe, personasDe, menuDe,
         desglosarMenu, menusDe, menusConocidos, componerMenu, personasDeCuenta,
         camposDeShopify,
         type PedidoShopify } from './shopify.ts';
import { ESTADO_PAGO, esPrivada } from './columnas.ts';
import { leerConfigDe, aFilasConfig, aDiasSemana, deDiasSemana,
         POR_DEFECTO, CLAVES } from './config.ts';
import { diaParaReservaManual } from './dias.ts';
import { indices, faltantes, normalizar, COL_RESERVAS, TIPO_PAGO } from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';
import { credencialValida, iguales, rolDe, puede, credencialesDelEntorno,
         ROL, PERMISOS, ROLES_DE_CUENTA, esRolDeCuenta, LARGO_MINIMO_CLAVE,
         type Rol, type Accion } from './auth.ts';
import { firmarSesion, leerSesion, secretoDeSesion, DURACION_SESION } from './sesion.ts';
import { hashDeClave, claveCalza, leerUsuariosDe, aFilasUsuarios,
         buscarUsuario, type Usuario } from './usuarios.ts';
import { ahoraEnChile, filaBitacora, leerBitacoraDe, recortar,
         ENCABEZADO_BITACORA } from './bitacora.ts';
import { cookieDe } from './sesion.ts';
import { filaReserva, buscarFilaPorId } from './filas.ts';
import { firmaValida } from './firma.ts';
import { eventoDe, idDeEvento } from './calendario.ts';
import { canonizar, desconocidos, leerMenusDe, aFilasMenus, aMonto, precioDe,
         POR_DEFECTO_MENUS, type Menu } from './menus.ts';
import { leerPuestosDe, aFilasPuestos, leerTrabajadoresDe, aFilasTrabajadores,
         leerTurnosDe, filaTurno, normalizarPlan, planDelDia, resumenEquipo,
         sugeridos, sinFicha, esSi, aEntero, COL_TURNOS,
         nuevoToken, trabajadorPorToken, turnosDe,
         POR_DEFECTO_PUESTOS, type Puesto, type Trabajador, type Turno } from './equipo.ts';
import { createHmac } from 'node:crypto';
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
ok(paraElSitio(ocu)[0].pocos === true,
   'sin umbral explicito se usa el de config.ts, que son los 10 del backend viejo');

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

/* ---------- traducir un pedido de Shopify a una fila ---------- */
const linea = (t: string, cant: number, variante = 'Pago directo', fecha = '2026-11-14') => ({
  title: t, variant_title: variante, quantity: cant,
  properties: [{ name: '_booking_date', value: fecha },
               { name: '_cowlendar_date', value: fecha }]
});
const pedido = (p: Partial<PedidoShopify> = {}): PedidoShopify => ({
  id: 1007, name: '#1007', email: 'ana@x.cl', total_price: '107000',
  created_at: '2026-10-20T15:04:00-03:00', financial_status: 'paid',
  line_items: [linea('Tradiciones', 2), linea('Niños', 1)], ...p
});

let res = aReserva(pedido())!;
ok(res !== null, 'un pedido con _booking_date es una reserva');
ok(res.fecha === '2026-11-14', 'la fecha sale de _booking_date, no de cuando se compro');
ok(res.personas === 3, 'personas son adultos MAS ninos: el cupo son personas totales');
ok(res.menu === '2 × Tradiciones + 1 × Niños',
   'el menu lista TODO lo pedido con su cantidad, ninos incluidos y canonizado');
ok(res.monto === 107000 && res.estadoPago === ESTADO_PAGO.pagado, 'monto y estado');
ok(res.asistencia === '', 'la asistencia nace en blanco: la marca una persona, no Shopify');

// Lo que NO es una reserva.
ok(aReserva(pedido({ line_items: [{ title: 'Polera', quantity: 1 }] })) === null,
   'un pedido SIN _booking_date no es una reserva y se ignora');
ok(aReserva(pedido({ line_items: [] })) === null, 'ni un pedido sin lineas');
ok(aReserva(pedido({ line_items: [linea('Tradiciones', 2, 'Pago directo', 'no-es-fecha')] })) === null,
   'ni una fecha con basura: mejor ignorarlo que descontar cupo de un dia inventado');

/* ---------- el estado, donde una cancelacion gana ---------- */
ok(estadoDe(pedido({ financial_status: 'paid' })) === ESTADO_PAGO.pagado, 'paid es pagado');
ok(estadoDe(pedido({ financial_status: 'pending' })) === ESTADO_PAGO.pendiente, 'pending, pendiente');
ok(estadoDe(pedido({ financial_status: 'authorized' })) === ESTADO_PAGO.pendiente,
   'authorized cuenta como PENDIENTE: la tarjeta esta retenida pero la plata no se cobro');
ok(estadoDe(pedido({ financial_status: 'partially_paid' })) === ESTADO_PAGO.pendiente,
   'un pago a medias tampoco esta pagado');
ok(estadoDe(pedido({ financial_status: 'refunded' })) === ESTADO_PAGO.reembolsado, 'refunded');

// Esta es la que importa: un pedido anulado CONSERVA su financial_status.
const anulado = pedido({ financial_status: 'paid', cancelled_at: '2026-10-20T18:00:00-03:00' });
ok(estadoDe(anulado) === ESTADO_PAGO.cancelado,
   'una cancelacion gana sobre el estado de pago, aunque siga diciendo "paid"');
ok(!ocupaLugar(r({ estadoPago: estadoDe(anulado) })),
   'y por eso libera el cupo de inmediato, sin esperar a que alguien procese la devolucion');

/* ---------- el telefono, que no esta donde uno creeria ---------- */
ok(telefonoDe(pedido({ phone: '', billing_address: { phone: '+56 9 1111 1111' } }))
   === '+56 9 1111 1111',
   'el telefono sale de billing_address: el checkout lo pide DENTRO de la direccion');
ok(telefonoDe(pedido({ phone: '', billing_address: null, shipping_address: { phone: '+56 9 2222 2222' } }))
   === '+56 9 2222 2222', 'y si no, de shipping_address');
ok(telefonoDe(pedido({ phone: '' })) === '', 'y si no hay en ninguna parte, queda vacio sin reventar');

/* ---------- el pedido censurado por falta de permiso ---------- */
// Confirmado contra la tienda el 2026-10-14 con el pedido #1007: la censura
// OMITE las llaves, no las pone en null. shipping_address si vino en null,
// que es correcto porque una reserva no tiene envio.
const censurado = pedido({
  email: undefined, phone: undefined,
  customer: {}, billing_address: {}, shipping_address: null
});
res = aReserva(censurado)!;
ok(res !== null, 'un pedido censurado SIGUE siendo una reserva: la fecha y las lineas estan');
ok(res.nombre === '' && res.email === '' && res.telefono === '',
   'solo quedan vacios nombre, correo y telefono, que es lo que Shopify censura');
ok(res.personas === 3 && res.monto === 107000,
   'y lo que de verdad hace falta para el cupo llega igual');

/* ---------- la modalidad comprada, que delata una regla caida ---------- */
res = aReserva(pedido({ financial_status: 'pending',
  line_items: [linea('Tradiciones', 2, 'Pago directo')] }))!;
ok(res.tipoPago === 'Pago directo' && res.estadoPago === ESTADO_PAGO.pendiente,
   '"Pago directo" + "pending" queda anotado tal cual: es como se ve que la regla de Shopify no aplico');

/* ---------- lo que el sincronizador NO toca ---------- */
const campos = camposDeShopify(aReserva(pedido())!);
ok(!('asistencia' in campos),
   'Shopify NO escribe la asistencia: pisarla borraria el no-show marcado a mano');
ok(!('creada' in campos), 'ni "creada": cuando entro el pedido no cambia');
ok('estadoPago' in campos && 'personas' in campos,
   'pero si actualiza lo suyo, como el estado de pago y las personas');

/* ---------- la configuracion, que la escribe una persona a mano ---------- */
const cfg = (filas: string[][]) => leerConfigDe([['Clave', 'Valor'], ...filas]);

// Sin pestana Config el panel tiene que funcionar igual.
let c = leerConfigDe([]);
ok(c.avisoPocosLugares === 10 && c.cupoNormal === 60 && c.horaApertura === '13:00',
   'sin la pestana Config se usan los valores del backend viejo');
ok(c.diasAbiertos.join(',') === '6,0', 'y los dias son sabado y domingo');

c = cfg([[CLAVES.avisoPocosLugares, '8'], [CLAVES.cupoNormal, '80'],
         [CLAVES.horaApertura, '12:30'], [CLAVES.diasAFuturo, '120']]);
ok(c.avisoPocosLugares === 8 && c.cupoNormal === 80, 'lo escrito manda sobre el defecto');
ok(c.horaApertura === '12:30' && c.diasAFuturo === 120, 'la hora y los dias a futuro tambien');

// Las claves se buscan normalizadas: una tilde o una mayuscula no rompen nada.
ok(cfg([['AVISO POCOS LUGARES', '5']]).avisoPocosLugares === 5,
   'la clave se reconoce con espacios y en mayusculas');

/* ---------- un valor malo NO puede dejar el panel sin dibujar ---------- */
ok(cfg([[CLAVES.cupoNormal, '0']]).cupoNormal === 60,
   'un cupo en CERO se ignora: dejaria todos los dias en rojo');
ok(cfg([[CLAVES.cupoNormal, '-20']]).cupoNormal === 60, 'y uno negativo tambien');
ok(cfg([[CLAVES.cupoNormal, 'sesenta']]).cupoNormal === 60, 'y una palabra');
ok(cfg([[CLAVES.avisoPocosLugares, '']]).avisoPocosLugares === 10, 'y una celda vacia');
ok(cfg([[CLAVES.horaApertura, '  ']]).horaApertura === '13:00',
   'una hora en blanco vuelve al defecto en vez de quedar vacia');

/* ---------- los cortes del semaforo ---------- */
ok(cfg([[CLAVES.corteAmarillo, '50'], [CLAVES.corteRojo, '90']]).cortes.amarillo === 0.5,
   'se acepta 50 como porcentaje, que es lo que alguien escribe en una planilla');
ok(cfg([[CLAVES.corteAmarillo, '0.5'], [CLAVES.corteRojo, '0.9']]).cortes.rojo === 0.9,
   'y tambien 0.9 como fraccion');
ok(cfg([[CLAVES.corteAmarillo, '70%'], [CLAVES.corteRojo, '90%']]).cortes.amarillo === 0.7,
   'y con el signo de porcentaje');

// Esta es la que importa: al revés, el amarillo nunca se veria.
c = cfg([[CLAVES.corteAmarillo, '90'], [CLAVES.corteRojo, '50']]);
ok(c.cortes.amarillo === 0.6 && c.cortes.rojo === 0.85,
   'amarillo por encima de rojo se IGNORA: el amarillo nunca se dibujaria');

// Y que de verdad lleguen al semaforo.
ok(semaforo(30, 60, { amarillo: 0.9, rojo: 0.95 }) === 'verde',
   'con el corte en 90%, 30 de 60 todavia es verde');
ok(semaforo(36, 60, { amarillo: 0.9, rojo: 0.95 }) === 'verde' &&
   semaforo(36, 60) === 'amarillo',
   'los mismos 36 de 60 son amarillos con los cortes de siempre y verdes con los otros');

/* ---------- los dias de la semana como los escribe una persona ---------- */
ok(aDiasSemana('sáb,dom')!.join(',') === '6,0', '"sáb,dom" con tilde');
ok(aDiasSemana('sab, dom')!.join(',') === '6,0', 'y sin tilde, con espacio');
ok(aDiasSemana('SÁBADO DOMINGO')!.join(',') === '6,0', 'y en mayusculas, completos');
ok(aDiasSemana('viernes/sabado/domingo')!.join(',') === '5,6,0', 'y con barras');
ok(aDiasSemana('sab,sab,dom')!.join(',') === '6,0', 'sin repetir');
ok(aDiasSemana('cualquier cosa') === null, 'y si no se entiende ni uno, null');
ok(cfg([[CLAVES.diasAbiertos, 'martes']]).diasAbiertos.join(',') === '2',
   'abrir solo los martes es configurable, no esta cableado al fin de semana');
ok(cfg([[CLAVES.diasAbiertos, 'xyz']]).diasAbiertos.join(',') === '6,0',
   'y una basura vuelve a sabado y domingo en vez de dejar cero dias');

ok(proximosFinesDeSemana('2026-11-16', 3, [1, 3]).join(',') ===
   '2026-11-16,2026-11-18,2026-11-23',
   'los dias que se ofrecen salen de la configuracion');

/* ---------- ida y vuelta ---------- */
const filas = aFilasConfig(POR_DEFECTO);
ok(filas[0][0] === 'Clave' && filas[0][1] === 'Valor', 'se escribe con su encabezado');
const vuelta = leerConfigDe(filas);
ok(JSON.stringify(vuelta) === JSON.stringify(POR_DEFECTO),
   'escribir y volver a leer devuelve exactamente lo mismo');
ok(deDiasSemana([6, 0]) === 'sáb,dom', 'y los dias se guardan legibles');

/* ---------- la firma del webhook, que es lo unico que lo protege ---------- */
// La URL del webhook es publica: sin esto, cualquiera que la descubra puede
// mandar un POST y meter una reserva que descuente cupo de un dia real.
const SECRETO = 'el-client-secret-de-la-app';
const firmar = (cuerpo: string, secreto = SECRETO) =>
  createHmac('sha256', secreto).update(cuerpo, 'utf8').digest('base64');

const cuerpo = '{"id":1007,"financial_status":"paid"}';
ok(firmaValida(cuerpo, firmar(cuerpo), SECRETO), 'una firma correcta pasa');
ok(!firmaValida(cuerpo, firmar(cuerpo, 'otro-secreto'), SECRETO),
   'firmada con OTRO secreto no pasa');
ok(!firmaValida(cuerpo + ' ', firmar(cuerpo), SECRETO),
   'un cuerpo con UN ESPACIO de mas no pasa: por eso se firma el texto crudo y no el JSON reserializado');
ok(!firmaValida(cuerpo, 'no-es-base64-valido', SECRETO), 'una firma basura no pasa');
ok(!firmaValida(cuerpo, '', SECRETO), 'sin firma no pasa');
ok(!firmaValida(cuerpo, null, SECRETO), 'ni con la cabecera ausente');

// La que de verdad importa: un despliegue al que se le olvido la variable.
ok(!firmaValida(cuerpo, firmar(cuerpo), undefined),
   'SIN SECRETO configurado NO pasa nada: se cierra, no se abre');
ok(!firmaValida(cuerpo, firmar(cuerpo, ''), ''),
   'y un secreto vacio tampoco abre la puerta');

/* ---------- la idempotencia, porque Shopify REINTENTA ---------- */
// Si esta busqueda falla, un reintento anota la misma reserva dos veces y
// descuenta cupo dos veces de un dia real.
const encR = ['ID Orden', 'Fecha Reserva', 'Nombre', 'Personas'];
const hoja = [encR,
  ['1007', '2026-11-14', 'Ana', '3'],
  ['1008', '2026-11-15', 'Beto', '2'],
  ['MANUAL-123', '2026-11-15', 'A mano', '4']];

ok(buscarFilaPorId(hoja, encR, '1007') === 2, 'encuentra el pedido en su fila');
ok(buscarFilaPorId(hoja, encR, 1008) === 3,
   'y lo encuentra aunque el id venga como NUMERO: Shopify lo manda numerico');
ok(buscarFilaPorId([encR, ['1007 ', 'x', 'y', 'z']], encR, '1007') === 2,
   'y con espacios de sobra en la celda');
ok(buscarFilaPorId(hoja, encR, '9999') === -1, 'un pedido nuevo no esta: se agrega');
ok(buscarFilaPorId(hoja, encR, 'MANUAL-123') === 4,
   'una reserva hecha a mano tambien se encuentra, por si llega a tener id de Shopify');

// Un id vacio NO puede calzar con las filas que tampoco tienen id.
ok(buscarFilaPorId([encR, ['', 'x', 'y', 'z']], encR, '') === -1,
   'un id VACIO no calza con una fila sin id: esas son justo las que hay que ignorar');
ok(buscarFilaPorId([encR], encR, '1007') === -1, 'una hoja con solo encabezado no revienta');
ok(buscarFilaPorId([], [], '1007') === -1, 'ni una hoja vacia');
ok(buscarFilaPorId(hoja, ['Otra', 'Cosa'], '1007') === -1,
   'y si la planilla no tiene la columna ID Orden, no se inventa una fila');

/* ---------- que la cocina sepa que preparar ---------- */
// Antes la columna Menu decia solo "Menu Tradiciones", sin cantidades y sin
// el menu de ninos. Un pedido de 2 Tradiciones + 1 Ninos se veia IGUAL que
// uno de 3 Tradiciones, asi que el sabado en la manana no habia como saber
// que cocinar. Encontrado con las dos primeras compras de prueba reales.
const mixto = pedido({ line_items: [
  linea('Tradiciones', 2),
  linea('Niños', 1)
]});
ok(menuDe(mixto) === '2 × Tradiciones + 1 × Niños',
   'el menu lleva CANTIDADES, ya no esconde el de ninos, y queda con el nombre canonico');
ok(aReserva(mixto)!.personas === 3, 'y las personas siguen siendo el total');

// Dos lineas del mismo menu en modalidades distintas son el mismo plato.
ok(menuDe(pedido({ line_items: [
     linea('Tradiciones', 2, 'Pago directo'),
     linea('Tradiciones', 1, 'Solo reserva')
   ]})) === '3 × Tradiciones',
   'dos modalidades del mismo menu se suman: para la cocina es el mismo plato');

ok(menuDe(pedido({ line_items: [] })) === '', 'un pedido sin lineas no revienta');

/* ---------- leerlo de vuelta ---------- */
let d = desglosarMenu('2 × Tradiciones + 1 × Niños');
ok(d.length === 2 && d[0].cantidad === 2 && d[0].menu === 'Tradiciones',
   'se vuelve a leer, y de paso se canoniza el nombre de Shopify');
ok(desglosarMenu('2 x Tradiciones')[0].cantidad === 2,
   'se acepta la equis del teclado, no solo el signo de multiplicar');

// Las filas que ya estaban escritas con el formato viejo.
d = desglosarMenu('Tradiciones');
ok(d.length === 1 && d[0].cantidad === 1,
   'una entrada SIN cantidad cuenta como 1: las filas viejas siguen sumando en vez de desaparecer');
ok(desglosarMenu('')[0] === undefined, 'una celda vacia no aporta nada');
ok(desglosarMenu(null).length === 0, 'ni una celda ausente');

/* ---------- el total del dia, que es el dato ---------- */
const delDia = menusDe([
  { menu: '2 × Tradiciones + 1 × Niños' },
  { menu: '4 × A Brasas abiertas' },
  { menu: '3 × Tradiciones' },
  { menu: 'Niños' }          // fila vieja, sin cantidad
]);
ok(delDia[0].menu === 'Tradiciones' && delDia[0].cantidad === 5,
   'suma el mismo menu entre reservas distintas');
ok(delDia.find((m) => m.menu === 'A Brasas abiertas')!.cantidad === 4, 'y los demas');
ok(delDia.find((m) => m.menu === 'Niños')!.cantidad === 2,
   'y mezcla el formato nuevo con el viejo sin perder nada');
ok(delDia[0].cantidad >= delDia[delDia.length - 1].cantidad,
   'ordenado de mayor a menor, que es como se lee una lista de preparacion');
ok(menusDe([]).length === 0, 'un dia sin reservas no muestra menus');

/* ---------- la ventana de fechas que muestra el panel ---------- */
// Antes eran "los proximos 8 dias abiertos", fijos en el codigo, asi que los
// 90 dias configurados no se veian por ninguna parte. Ahora manda el RANGO.
let ventana = diasAbiertosEntre('2026-10-21', '2026-11-21', [6, 0]);
ok(ventana.length === 9,
   'nueve dias: el 22 queda FUERA porque el rango termina el 21, y eso es lo correcto');
ok(ventana[0] === '2026-10-24' && ventana[ventana.length - 1] === '2026-11-21',
   'empieza en el primer dia abierto y termina dentro del rango');
ok(ventana.every((f) => [6, 0].includes(diaSemana(f))), 'y todos caen en los dias que se abre');

// Los bordes, que son donde esto se equivoca.
ok(diasAbiertosEntre('2026-11-14', '2026-11-14', [6, 0]).length === 1,
   'desde y hasta el mismo dia abierto cuenta ese dia: el rango es inclusivo');
ok(diasAbiertosEntre('2026-11-16', '2026-11-16', [6, 0]).length === 0,
   'y si ese unico dia no se abre, no hay ninguno');
ok(diasAbiertosEntre('2026-11-21', '2026-11-14', [6, 0]).length === 0,
   'las fechas al reves dan vacio, no una vuelta infinita');
ok(diasAbiertosEntre('2026-11-01', '2026-11-30', [2]).every((f) => diaSemana(f) === 2),
   'abrir solo los martes tambien funciona: no esta cableado al fin de semana');
ok(diasAbiertosEntre('2026-11-01', '2026-11-07', []).length === 2,
   'sin dias configurados se vuelve a sabado y domingo en vez de dejar la pantalla vacia');

// 90 dias, que es el valor por defecto, tienen que caber.
ok(diasAbiertosEntre('2026-10-21', sumarDias('2026-10-21', 90), [6, 0]).length === 26,
   'los 90 dias por defecto son 26 fechas: eso es lo que antes se cortaba en 8');

/* ---------- agrupar por mes ---------- */
ok(mesDe('2026-11-14') === '2026-11', 'el mes sale de la fecha, como texto');
ok(mesEnPalabras('2026-11') === 'noviembre 2026', 'y se muestra legible');
ok(mesEnPalabras('2027-01') === 'enero 2027', 'con el ano correcto al cruzar diciembre');

// El agrupado de la vista conserva el orden y corta donde cambia el mes.
const porMes = new Map<string, number>();
for (const f of ventana) porMes.set(mesDe(f), (porMes.get(mesDe(f)) ?? 0) + 1);
ok([...porMes.keys()].join(',') === '2026-10,2026-11',
   'una ventana a caballo entre dos meses da dos grupos, en orden');

/* ---------- la reserva hecha a mano escribe IGUAL que Shopify ---------- */
// Si el formulario manual escribiera "Tradiciones" donde Shopify escribe
// "Menu Tradiciones", el total del dia contaria dos platos distintos y la
// cocina prepararia mal. Por eso los nombres salen de lo ya vendido.
const yaVendidos = menusConocidos([
  { menu: '2 × Tradiciones + 1 × Niños' },
  { menu: '4 × A Brasas abiertas' },
  { menu: '1 × Tradiciones' }
]);
ok(yaVendidos.length === 3, 'los menus conocidos salen de las reservas que ya hay');
ok(yaVendidos.includes('Tradiciones') && yaVendidos.includes('Niños'),
   'con el nombre canonico, no con el que vino de la tienda');
ok(yaVendidos.join(',') === yaVendidos.slice().sort((a, b) => a.localeCompare(b)).join(','),
   'ordenados, para que la lista no baile entre aperturas');
ok(menusConocidos([]).length === 0,
   'el dia uno no hay ninguno, y el formulario deja escribirlo a mano');

// Lo que arma el formulario tiene que volver a leerse igual.
const cuenta = { 'Tradiciones': 2, 'Niños': 1, 'A Brasas abiertas': 0 };
ok(componerMenu(cuenta) === '2 × Tradiciones + 1 × Niños',
   'un menu en CERO no se escribe, igual que el sitio no agrega una linea vacia');
ok(personasDeCuenta(cuenta) === 3,
   'las personas se CALCULAN del conteo: ya no son un campo aparte que pueda no calzar');

// Y el viaje completo: lo que escribe el formulario lo entiende la cocina.
const comoShopify = aReserva(pedido({ line_items: [
  linea('Tradiciones', 2), linea('Niños', 1)
]}))!;
ok(componerMenu(cuenta) === comoShopify.menu,
   'una reserva a mano y una de Shopify con lo mismo adentro quedan IDENTICAS');
ok(menusDe([{ menu: componerMenu(cuenta) }, comoShopify])[0].cantidad === 4,
   'y por eso se suman juntas en el total del dia, en vez de contarse aparte');

// Editar una reserva de Shopify no puede perder su desglose.
const alEditar: Record<string, number> = {};
for (const x of desglosarMenu(comoShopify.menu)) alEditar[x.menu] = x.cantidad;
ok(componerMenu(alEditar) === comoShopify.menu,
   'abrir una reserva de Shopify en el formulario y guardarla la deja igual');

ok(componerMenu({}) === '', 'sin nada elegido no se escribe un menu');
ok(personasDeCuenta({}) === 0, 'y son cero personas, que el formulario no deja guardar');

/* ---------- un solo nombre por menu, sin equivalencias ---------- */
// Se decidio no usar alias: el nombre tiene que ser el mismo en Shopify, en
// el sitio y en el panel. Lo unico que se perdona es como se escribe.
ok(canonizar('Tradiciones') === 'Tradiciones', 'el nombre de la lista se queda igual');
ok(canonizar('TRADICIONES') === 'Tradiciones', 'las mayusculas se perdonan');
ok(canonizar('  tradiciones  ') === 'Tradiciones', 'y los espacios de sobra');
ok(canonizar('Niños') === 'Niños' && canonizar('ninos') === 'Niños',
   'y las tildes: es el mismo nombre escrito con descuido, no otro menu');
ok(canonizar('') === '' && canonizar(null) === '', 'y lo vacio sigue vacio');

// YA NO hay equivalencias entre nombres distintos.
ok(canonizar('Menú Tradiciones') === 'Menú Tradiciones',
   'el nombre viejo de Shopify YA NO se traduce: sin alias es otro menu, y el aviso lo reporta');

// Lo que no esta en la lista se deja tal cual, no se fuerza al mas parecido.
ok(canonizar('Menú Degustacion') === 'Menú Degustacion',
   'un menu que la tienda empezo a vender aparece TAL CUAL, no se inventa a cual se parece');

// Escrito con descuido, se suma igual.
const mezcla = menusDe([{ menu: '2 × TRADICIONES' }, { menu: '3 × tradiciones' }]);
ok(mezcla.length === 1 && mezcla[0].cantidad === 5 && mezcla[0].menu === 'Tradiciones',
   'el mismo nombre escrito de dos formas descuidadas se cuenta junto: 5');

// Pero dos nombres DISTINTOS se cuentan aparte, a proposito.
const partido = menusDe([{ menu: '2 × Menú Tradiciones' }, { menu: '3 × Tradiciones' }]);
ok(partido.length === 2,
   'un rename en Shopify SI parte el total, y eso es visible: es el costo asumido de no tener alias');

ok(aReserva(pedido({ line_items: [linea('Tradiciones', 2)] }))!.menu === '2 × Tradiciones',
   'un pedido de Shopify se guarda con el nombre de la lista');

/* ---------- el aviso, que es lo que reemplaza a los alias ---------- */
ok(desconocidos(['Tradiciones', 'TRADICIONES'], POR_DEFECTO_MENUS).length === 0,
   'un nombre de la lista no se reporta, ni escrito en mayusculas');
ok(desconocidos(['Menú Tradiciones'], POR_DEFECTO_MENUS).join('') === 'Menú Tradiciones',
   'un rename SI se reporta: es asi como alguien se entera de que dejaron de calzar');
ok(desconocidos(['', '  '], POR_DEFECTO_MENUS).length === 0, 'lo vacio no se reporta');
ok(desconocidos(['Nuevo', 'nuevo', 'NUEVO'], POR_DEFECTO_MENUS).length === 1,
   'y no se repite el mismo escrito de tres formas');

/* ---------- ida y vuelta a la planilla ---------- */
const filasMenus = aFilasMenus(POR_DEFECTO_MENUS);
ok(filasMenus[0].join('|') === 'Menú|Precio en línea|Precio en el local',
   'tres columnas: el nombre y los dos precios');
ok(filasMenus.length === POR_DEFECTO_MENUS.length + 1, 'una fila por menu, mas el encabezado');
ok(JSON.stringify(leerMenusDe(filasMenus)) === JSON.stringify(POR_DEFECTO_MENUS),
   'escribir y volver a leer devuelve exactamente la misma lista');
ok(leerMenusDe([['Menú'], ['']]).length === 0,
   'una fila sin nombre se ignora en vez de crear un menu vacio');
ok(leerMenusDe([['Menú'], ['Tradiciones'], ['TRADICIONES']]).length === 1,
   'y el mismo nombre dos veces no crea dos menus');
ok(POR_DEFECTO_MENUS.length === 5, 'los cuatro niveles del landing mas el de ninos');

/* ---------- los precios, que solo rigen para las reservas a mano ---------- */
ok(POR_DEFECTO_MENUS.every((m) => m.precioEnLinea === 0 && m.precioEnLocal === 0),
   'nacen SIN PRECIO: sembrar una tabla a medias es peor que dejarla vacia');

ok(aMonto('$44.000') === 44000, 'un monto en formato chileno se entiende');
ok(aMonto('44000') === 44000, 'y uno pelado');
ok(aMonto('44 000') === 44000, 'y con espacio');
ok(aMonto('') === 0 && aMonto(null) === 0, 'lo vacio es cero, o sea sin poner');
ok(aMonto('-5000') === 0, 'un negativo no es un precio');
ok(aMonto('abc') === 0, 'ni una palabra');

const conPrecio: Menu[] = [
  { nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000 },
  { nombre: 'Ni\u00f1os', precioEnLinea: 19000, precioEnLocal: 24000 }
];
ok(precioDe(conPrecio[0], false) === 44000, 'pagando por adelantado rige el precio en linea');
ok(precioDe(conPrecio[0], true) === 49000, 'y pagando en el local, el otro');
ok(precioDe(undefined, false) === 0, 'un menu que no esta en la lista no tiene precio');
ok(precioDe({ nombre: 'X', precioEnLinea: 0, precioEnLocal: 0 }, false) === 0,
   'y uno sin precio puesto devuelve cero, no un numero inventado');

// Un cero no se escribe como "0" en la planilla: un cero se lee como
// "vale cero" y lo que queremos decir es "sin poner".
ok(aFilasMenus([{ nombre: 'X', precioEnLinea: 0, precioEnLocal: 5000 }])[1].join('|') ===
   'X||5000',
   'un precio en cero se guarda en blanco, no como cero');
ok(leerMenusDe(aFilasMenus(conPrecio))[0].precioEnLinea === 44000,
   'escribir y volver a leer conserva los precios');


/* ---------- agrupar el calendario por semana ---------- */
// La semana parte en LUNES, que es la convencion chilena y la que ya usa el
// calendario del sitio.
ok(semanaDe('2026-10-24') === '2026-10-19', 'un sabado cae en la semana que empezo el lunes 19');
ok(semanaDe('2026-10-25') === '2026-10-19',
   'y su domingo en la MISMA: un fin de semana no se parte en dos');
ok(semanaDe('2026-10-19') === '2026-10-19', 'el lunes es su propio inicio de semana');
ok(semanaDe('2026-10-26') === '2026-10-26', 'y el lunes siguiente ya es otra');

ok(rangoEnPalabras(['2026-10-24', '2026-10-25']) === '24 – 25 de octubre',
   'un fin de semana se nombra como rango');
ok(rangoEnPalabras(['2026-10-31']) === '31 de octubre', 'un dia solo, sin rango');
ok(rangoEnPalabras(['2026-10-31', '2026-11-01']) === '31 de octubre – 1 de noviembre',
   'y si cruza de mes se nombran los dos, que es cuando no nombrarlos confunde');
ok(rangoEnPalabras([]) === '', 'sin dias no se nombra nada');

/* ---------- la plata que hay que cobrar en la puerta ---------- */
// Se decide por el ESTADO DEL PAGO, no por la modalidad comprada.
ok(!faltaCobrar(r({ estadoPago: 'paid' })), 'una pagada no se cobra de nuevo');
ok(faltaCobrar(r({ estadoPago: 'pending' })), 'una pendiente si');
ok(!faltaCobrar(r({ estadoPago: 'refunded' })), 'una reembolsada no: ni viene ni paga');
ok(!faltaCobrar(r({ estadoPago: 'cancelled' })), 'ni una cancelada');

// ESTA es la que importa, y es el caso que el proyecto tiene documentado:
// "Pago directo" + "pending" significa que la regla de medios de pago de
// Shopify no aplico y la persona eligio pagar en el local igual.
ok(faltaCobrar(r({ tipoPago: TIPO_PAGO.directo, estadoPago: 'pending' })),
   'un "Pago directo" que quedo PENDIENTE si hay que cobrarlo: mirando la modalidad esa plata no aparecia');

const conPlata = ocupacionDe([
  r({ personas: 2, monto: 88000, estadoPago: 'paid' }),
  r({ personas: 3, monto: 147000, estadoPago: 'pending' }),
  r({ personas: 2, monto: 98000, estadoPago: 'pending', tipoPago: TIPO_PAGO.directo }),
  r({ personas: 4, monto: 200000, estadoPago: 'refunded' }),
  r({ personas: 1, monto: null, estadoPago: 'pending' })
], dia({}));

ok(conPlata.porCobrar === 245000,
   'se suma solo lo pendiente: 147.000 + 98.000, sin lo pagado ni lo reembolsado');
ok(conPlata.sinMonto === 1,
   'y la reserva SIN monto se cuenta aparte: un total que omite filas en silencio es peor');
ok(ocupacionDe([], dia({})).porCobrar === 0, 'un dia sin reservas no tiene nada que cobrar');

ok(enPesos(218000) === '$218.000', 'el monto va en formato chileno');
ok(enPesos(0) === '$0', 'y el cero tambien se escribe');

// El sitio NO puede enterarse de la plata.
const conDinero = paraElSitio([conPlata]);
ok(Object.keys(conDinero[0]).sort().join(',') === 'fecha,pocos,quedan',
   'agregar plata a la ocupacion NO la filtra al sitio: siguen siendo tres campos');

/* ---------- el evento del calendario, portado del Apps Script ---------- */
// El id sale del pedido, asi NO hace falta guardarlo en la planilla. Shopify
// manda orders/updated cada vez que el pedido cambia: sin un id estable,
// cada aviso crearia un evento nuevo y el calendario se llenaria de copias.
ok(idDeEvento('1009') === idDeEvento('1009'),
   'es SIEMPRE el mismo para el mismo pedido: eso es lo que evita los duplicados');
ok(idDeEvento('1009') !== idDeEvento('1010'), 'pedidos distintos, eventos distintos');

// Google solo acepta minusculas de la a a la v, y digitos. Esta prueba
// encontro un error de verdad: el primer intento reemplazaba los caracteres
// invalidos por una "w", que TAMPOCO esta permitida.
for (const id of ['1009', 'MANUAL-123', '', 'Ñandú #7', '0']) {
  ok(/^[a-v0-9]{5,1024}$/.test(idDeEvento(id)),
     `el id de "${id}" cae dentro del alfabeto que Google acepta`);
}

// Y limpiar no puede hacer chocar dos ids distintos: dos reservas
// compartiendo evento es peor que un id ilegible.
ok(idDeEvento('MANUAL-1') !== idDeEvento('MANUAL-2'), 'dos ids manuales parecidos no chocan');
ok(idDeEvento('MANUAL-123') !== idDeEvento('MANUALx123'),
   'ni un caracter invalido se confunde con otro valido');
ok(idDeEvento('1') !== idDeEvento('10'),
   'ni un id corto con uno mas largo, que es donde fallaria un relleno');

/* ---------- lo que se lee en el celular ---------- */
// En el celular se ve el titulo del evento y nada mas, asi que ahi va lo
// que hay que tener en la mano cuando llega la gente.
let ev = eventoDe(r({ personas: 4, nombre: 'Ana Perez', estadoPago: 'pending' }));
ok(ev.summary === '4 personas · Ana Perez · POR COBRAR',
   'el titulo dice cuantos, quien, y que falta cobrarles');

ev = eventoDe(r({ personas: 4, nombre: 'Ana Perez', estadoPago: 'paid' }));
ok(ev.summary === '4 personas · Ana Perez',
   'una pagada NO dice POR COBRAR: el titulo deja de avisar cuando deja de hacer falta');

ev = eventoDe(r({ personas: 1, nombre: '', estadoPago: 'paid' }));
ok(ev.summary === '1 persona · Sin nombre',
   'sin nombre se dice "Sin nombre", y el singular esta bien escrito');

/* ---------- la hora, con la zona por NOMBRE ---------- */
ev = eventoDe(r({ fecha: '2026-11-14' }), '13:00', '18:00');
ok(ev.start.dateTime === '2026-11-14T13:00:00' && ev.end.dateTime === '2026-11-14T18:00:00',
   'empieza y termina en el horario configurado');
ok(ev.start.timeZone === 'America/Santiago',
   'la zona va por NOMBRE y no como desfase: el horario de verano lo resuelve Google y no nosotros');

ev = eventoDe(r({}), '9', '20:30');
ok(ev.start.dateTime.endsWith('T09:00:00') && ev.end.dateTime.endsWith('T20:30:00'),
   'se entiende una hora sin minutos y una con ellos');
ev = eventoDe(r({}), 'a las tres', '');
ok(ev.start.dateTime.endsWith('T13:00:00') && ev.end.dateTime.endsWith('T18:00:00'),
   'y una hora que no se entiende cae en el horario de siempre, no en medianoche');

/* ---------- la descripcion ---------- */
ev = eventoDe(r({ menu: '2 × Tradiciones', monto: 88000, telefono: '+56 9 1111 1111' }));
ok(ev.description.includes('2 × Tradiciones'), 'la descripcion lleva el menu');
ok(ev.description.includes('$88.000'), 'y el monto en formato chileno');
ok(ev.description.includes('+56 9 1111 1111'), 'y el telefono, para llamar desde el evento');
ok(eventoDe(r({ monto: null })).description.includes('sin anotar'),
   'una reserva sin monto lo dice, en vez de mostrar un cero que parece gratis');

/* ---------- el dia privado: abierto para nosotros, no para el sitio ------ */
// Es el dia del evento privado: se vendio entero, hay que verlo en el panel
// con su reserva y su cupo, y NO puede aparecer en el calendario del sitio,
// porque ahi significaria que cualquiera puede comprar un lugar en el
// cumpleanos de otro.
ok(esPrivada('Privada') && esPrivada('privado') && esPrivada('PRIVADA'),
   'se reconoce escrito de varias formas');
ok(esPrivada('Evento privado'), 'y como lo escribiria alguien a mano');
ok(!esPrivada('Abierta') && !esPrivada('Cerrada') && !esPrivada(''),
   'y no se confunde con los otros dos estados');

// LA distincion que importa: privada NO es cerrada.
ok(!estaCerrado(ESTADO_DIA.privada),
   'un dia privado NO esta cerrado: recibe reservas, tiene cupo, hay que cocinar');
ok(estaCerrado(ESTADO_DIA.cerrada), 'cerrada si lo esta');

const privado = ocupacionDe(
  [r({ fecha: '2026-11-18', personas: 40 })],
  dia({ fecha: '2026-11-18', estado: ESTADO_DIA.privada })
);
ok(privado.privada === true, 'la ocupacion lo marca');
ok(privado.bloqueada === false, 'y NO lo marca como bloqueado');
ok(privado.tomadas === 40 && privado.quedan === 20,
   'cuenta sus reservas y su cupo como cualquier otro dia');
ok(privado.semaforo !== 'rojo', 'y su semaforo sale de la ocupacion, no de estar privado');

// Y lo que de verdad hay que garantizar: que el sitio NO lo ofrezca.
ok(paraElSitio([privado]).length === 0,
   'un dia privado NO se le manda al sitio, aunque le queden 20 lugares');

const abierto = ocupacionDe(
  [r({ fecha: '2026-11-21', personas: 40 })],
  dia({ fecha: '2026-11-21', estado: ESTADO_DIA.abierta })
);
ok(paraElSitio([abierto]).length === 1, 'y uno abierto si, para que la prueba signifique algo');
ok(paraElSitio([privado, abierto])[0].fecha === '2026-11-21',
   'mezclados, solo pasa el abierto');

/* ---------- sin configurar NO es cerrado ---------- */
// Un dia que aparece solo porque tiene reservas no tiene fila en la hoja, y
// le cae un estado vacio. estaCerrado() cierra todo lo que no reconoce --a
// proposito-- asi que con el texto "Sin definir" que se usaba antes, un dia
// que nadie habia tocado salia pintado de rojo como si alguien lo hubiera
// cerrado. Son dos cosas distintas.
const sinTocar = ocupacionDe(
  [r({ fecha: '2026-10-21', personas: 2 })],
  dia({ fecha: '2026-10-21', capacidad: 0, estado: '' })
);
ok(sinTocar.bloqueada === false,
   'un dia sin fila en la hoja NO esta cerrado: esta sin configurar');
ok(sinTocar.privada === false, 'ni privado');
ok(sinTocar.tomadas === 2,
   'y sus reservas se cuentan igual: si no, volverian a quedar invisibles');

// Pero el sitio tampoco lo ofrece, que es la garantia que importa.
ok(paraElSitio([sinTocar]).length === 0,
   'sin cupo definido el sitio no lo ofrece: anotar una reserva a mano no publica nada');

/* ---------- anotar una reserva a mano abre el dia, en PRIVADO ---------- */
// Anotar una reserva para un dia que no esta abierto lo dejaba gris y con
// cupo 0: visible pero inservible. Ahora se abre solo.
//
// SIEMPRE COMO PRIVADO, nunca como publico: abrir un dia al publico es una
// decision comercial --lo ve cualquiera, cualquiera compra-- y no puede ser
// el efecto secundario de anotar una reserva de telefono.
const cfgBase = { ...POR_DEFECTO, cupoNormal: 60, horaApertura: '13:00' };

let nuevo = diaParaReservaManual(undefined, '2026-10-21', cfgBase);
ok(nuevo !== null && nuevo.estado === ESTADO_DIA.privada,
   'un dia que no existe se crea PRIVADO, no publico');
ok(nuevo!.capacidad === 60, 'con el cupo de siempre');
ok(nuevo!.fecha === '2026-10-21', 'y en la fecha que se pidio');

// Un dia cerrado se abre, pero solo para nosotros.
nuevo = diaParaReservaManual(
  dia({ fecha: '2026-10-21', capacidad: 30, estado: ESTADO_DIA.cerrada }),
  '2026-10-21', cfgBase);
ok(nuevo !== null && nuevo.estado === ESTADO_DIA.privada, 'un dia cerrado pasa a privado');
ok(nuevo!.capacidad === 30,
   'y se le RESPETA el cupo que tenia: si alguien puso 30 a proposito, no se pisa con 60');

// Lo que NO puede pasar: que un dia publico deje de serlo, ni al reves.
ok(diaParaReservaManual(
     dia({ fecha: '2026-11-14', capacidad: 60, estado: ESTADO_DIA.abierta }),
     '2026-11-14', cfgBase) === null,
   'un dia abierto y con cupo no se toca: anotar una reserva no lo despublica');
ok(diaParaReservaManual(
     dia({ fecha: '2026-11-14', capacidad: 60, estado: ESTADO_DIA.privada }),
     '2026-11-14', cfgBase) === null,
   'ni uno privado que ya estaba listo');

// Un dia con fila pero sin cupo: se le pone cupo y se le respeta el estado.
nuevo = diaParaReservaManual(
  dia({ fecha: '2026-11-14', capacidad: 0, estado: ESTADO_DIA.abierta }),
  '2026-11-14', cfgBase);
ok(nuevo !== null && nuevo.capacidad === 60, 'se le pone el cupo de siempre');
ok(nuevo!.estado === ESTADO_DIA.abierta,
   'y SIGUE SIENDO PUBLICO: no se le quita al sitio un dia que ya ofrecia');

// Ningun camino puede devolver un dia abierto al publico que no lo fuera.
for (const antes of [undefined,
                     dia({ estado: ESTADO_DIA.cerrada }),
                     dia({ capacidad: 0, estado: '' })]) {
  const despues = diaParaReservaManual(antes, '2026-10-21', cfgBase);
  ok(despues === null || despues.estado !== ESTADO_DIA.abierta,
     'anotar una reserva NUNCA deja un dia abierto al publico');
}

/* ---------- un dia cerrado desaparece, salvo que tenga gente ---------- */
// Cerrar un dia es decir "este dia no existe para nosotros", asi que
// dejarlo en el calendario ensucia la vista con algo que no hay que hacer.
// Se reabre desde "Agregar fecha", que avisa que esa fecha ya estaba.
//
// El filtro vive en la ruta; esto fija la REGLA que aplica.
const visible = (o: { bloqueada: boolean; tomadas: number }) =>
  !o.bloqueada || o.tomadas > 0;

ok(!visible(ocupacionDe([], dia({ estado: 'Cerrada' }))),
   'un dia cerrado y vacio NO se muestra');
ok(visible(ocupacionDe([], dia({ estado: 'Abierta' }))), 'uno abierto si');
ok(visible(ocupacionDe([], dia({ estado: ESTADO_DIA.privada }))),
   'y uno privado tambien: privado no es cerrado');

// LA excepcion, que es la que importa: hay gente a la que hay que llamar.
const cerradoConGente = ocupacionDe(
  [r({ fecha: '2026-11-14', personas: 8 })],
  dia({ fecha: '2026-11-14', estado: 'Cerrada' })
);
ok(visible(cerradoConGente),
   'un dia cerrado CON reservas si se muestra: esconderlo esconderia a esas personas');
ok(cerradoConGente.tomadas === 8, 'y con sus personas a la vista, para saber a cuantos avisarle');

// Y lo de siempre: cerrado nunca llega al sitio, se vea o no en el panel.
ok(paraElSitio([cerradoConGente]).length === 0,
   'que se vea en el panel no lo devuelve al sitio');

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

/* ---------- el equipo: puestos ---------- */
ok(POR_DEFECTO_PUESTOS.length === 7, 'los siete puestos que nombró el cliente');
ok(POR_DEFECTO_PUESTOS.every((p) => p.cadaCuantas === 0),
   'y ninguno trae razón puesta: cuántos por comensal es dato del negocio');

const puestos = leerPuestosDe([
  ['Puesto', 'Uno cada N personas'],
  ['Garzón', '10'],
  ['Cocina', ''],
  ['', '5'],                    // sin nombre: no es un puesto
  ['garzon', '4'],              // el mismo de arriba escrito distinto
  ['Barman', 'uno cada 20']     // basura con un número adentro
]);
ok(puestos.length === 3, 'ignora las filas sin nombre y los repetidos');
ok(puestos[0].cadaCuantas === 10, 'lee la razón');
ok(puestos[1].cadaCuantas === 0, 'una razón en blanco es cero, o sea sin poner');
ok(puestos[2].cadaCuantas === 20, 'y rescata el número de un texto escrito a mano');
ok(aEntero('0') === 0 && aEntero('-3') === 0 && aEntero('2,7') === 27,
   'un entero escrito a mano nunca queda negativo');

const idaYVuelta = leerPuestosDe(aFilasPuestos(puestos));
ok(JSON.stringify(idaYVuelta) === JSON.stringify(puestos),
   'los puestos sobreviven la ida y vuelta a filas');
ok(aFilasPuestos([{ nombre: 'Barra', cadaCuantas: 0 }])[1][1] === '',
   'una razón sin poner se escribe en blanco, no como "0"');

/* ---------- el equipo: trabajadores ---------- */
const gente = leerTrabajadoresDe([
  ['Nombre', 'Teléfono', 'Puesto habitual', 'Activo'],
  ['Ana Pérez', '+56 9 1111 1111', 'Garzón', 'Sí'],
  ['Luis Soto', '', 'Cocina', ''],
  ['Pedro Díaz', '', 'Runner', 'No'],
  ['', '+56 9 2222 2222', 'Barra', 'Sí']
]);
ok(gente.length === 3, 'una fila sin nombre no es un trabajador');
ok(gente[1].activo === true,
   'la celda Activo en blanco cuenta como SÍ: existe la fila porque alguien lo agregó');
ok(gente[2].activo === false, 'y un "No" explícito lo da de baja');
ok(esSi('') && esSi('sí') && !esSi('NO') && !esSi('inactivo'),
   'el sí/no aguanta lo que una persona escriba');
ok(JSON.stringify(leerTrabajadoresDe(aFilasTrabajadores(gente))) === JSON.stringify(gente),
   'los trabajadores sobreviven la ida y vuelta a filas');

/* ---------- el equipo: turnos ---------- */
const ENC_T = [COL_TURNOS.fecha, COL_TURNOS.trabajador, COL_TURNOS.puesto];
const turnos = leerTurnosDe([
  ENC_T,
  ['2026-11-14', 'Ana Pérez', 'Garzón'],
  ['2026-11-14', 'Luis Soto', 'Cocina'],
  ['2026-11-14', 'Pedro Díaz', ''],
  ['2026-11-15', 'Ana Pérez', 'Barra'],
  ['no es fecha', 'Juan', 'Garzón'],
  ['2026-11-14', '', 'Garzón']
]);
ok(turnos.length === 4, 'descarta las filas sin fecha válida y sin nombre');
ok(turnos[2].puesto === '', 'un puesto en blanco sí se lee: viene, sin puesto definido');
ok(turnos[0].fila === 2, 'y cada turno sabe en qué fila está, para poder borrarlo');
ok(JSON.stringify(filaTurno(ENC_T,
     { fecha: '2026-11-14', trabajador: 'Ana', puesto: 'Barra' }))
   === JSON.stringify(['2026-11-14', 'Ana', 'Barra']), 'un turno se escribe en sus celdas');

// Las columnas se buscan por ENCABEZADO, no por posición. Importa porque a
// esta pestaña le van a crecer columnas —asistencia, horas, ajustes— y con
// posiciones fijas agregar una obligaría a migrar las filas ya escritas.
const ENC_REVUELTO = ['Puesto', 'Notas', 'Trabajador', 'Fecha'];
const revueltos = leerTurnosDe([
  ENC_REVUELTO,
  ['Garzón', 'lo que sea', 'Ana Pérez', '2026-11-14']
]);
ok(revueltos.length === 1 && revueltos[0].trabajador === 'Ana Pérez'
   && revueltos[0].puesto === 'Garzón' && revueltos[0].fecha === '2026-11-14',
   'las columnas se encuentran en cualquier orden y con otras de por medio');
const escrita = filaTurno(ENC_REVUELTO,
  { fecha: '2026-11-14', trabajador: 'Ana', puesto: 'Barra' });
ok(escrita[0] === 'Barra' && escrita[2] === 'Ana' && escrita[3] === '2026-11-14',
   'y al escribir, cada valor cae en SU columna');
ok(escrita[1] === '', 'una columna que no manejamos se escribe vacía, no se desplaza nada');
ok(leerTurnosDe([['Trabajador'], ['Ana']]).length === 0,
   'sin columna de fecha no se inventan turnos');

/* ---------- una persona, un puesto por día ---------- */
const plan = normalizarPlan([
  { fecha: '2026-11-14', trabajador: 'Ana Pérez', puesto: 'Garzón' },
  { fecha: '2026-11-14', trabajador: 'Luis Soto', puesto: 'Cocina' },
  { fecha: '2026-11-14', trabajador: 'ANA PÉREZ', puesto: 'Barman' },
  { fecha: '2026-11-14', trabajador: '  ', puesto: 'Barra' },
  { fecha: 'cualquier cosa', trabajador: 'Juan', puesto: 'Barra' }
]);
ok(plan.length === 2, 'una persona no puede ocupar dos puestos el mismo día');
ok(plan.find((t) => t.trabajador === 'ANA PÉREZ')?.puesto === 'Barman',
   'y gana la última asignación, que es la que la persona acaba de hacer');
ok(!plan.some((t) => t.trabajador.trim() === ''), 'un nombre en blanco no es un turno');

/* ---------- ¿alcanza el equipo? ---------- */
const conRazon: Puesto[] = [
  { nombre: 'Garzón', cadaCuantas: 10 },
  { nombre: 'Cocina', cadaCuantas: 0 },
  { nombre: 'Barman', cadaCuantas: 40 }
];
ok(sugeridos(conRazon[0], 44) === 5, '44 personas con uno cada 10 son cinco');
ok(sugeridos(conRazon[1], 44) === 0, 'sin razón puesta el panel no opina');
ok(sugeridos(conRazon[0], 0) === 0, 'y con nadie reservado tampoco');

const lineas = planDelDia(turnos, conRazon, '2026-11-14', 44);
ok(lineas.length === 4, 'los tres puestos de la lista más el que no estaba en ella');
ok(lineas[0].asignados.length === 1 && lineas[0].faltan === 4,
   'un garzón para 44 personas: faltan cuatro');
ok(lineas[1].faltan === 0, 'el puesto sin razón nunca dice que falta gente');
ok(lineas[3].puesto === 'Sin puesto',
   'el turno sin puesto igual se muestra: hay alguien asignado a trabajar');
ok(planDelDia(turnos, conRazon, '2026-11-14', 44).every((l) => Array.isArray(l.asignados)),
   'un puesto vacío aparece igual: es justo el que hay que ver');

const resumen = resumenEquipo(turnos, conRazon, '2026-11-14', 44);
ok(resumen.total === 3, 'tres personas asignadas ese día');
ok(resumen.porPuesto.length === 3, 'y el resumen de la tarjeta omite los puestos vacíos');
ok(resumen.faltan === 4 + 2,
   'suma lo que falta en TODOS los puestos con razón: 4 garzones y 2 barman');
ok(resumenEquipo(turnos, conRazon, '2026-12-25', 44).total === 0,
   'un día sin nadie asignado no toma turnos de otro día');

/* ---------- quién quedó sin ficha ---------- */
const equipo: Trabajador[] = [
  { nombre: 'Ana Pérez', telefono: '', puesto: 'Garzón', activo: true, token: '' },
  { nombre: 'luis soto', telefono: '', puesto: 'Cocina', activo: true, token: '' }
];
const huerfanos = sinFicha(turnos, equipo);
ok(huerfanos.length === 1 && huerfanos[0] === 'Pedro Díaz',
   'avisa de quien tiene turnos y no está en la lista: pasa al renombrar a alguien');
ok(sinFicha(turnos, []).length === 3, 'sin lista de trabajadores, todos quedan sin ficha');
ok(!sinFicha([{ fecha: '2026-11-14', trabajador: 'LUIS SOTO', puesto: 'Cocina', fila: 2 }],
   equipo).length, 'y no se queja por mayúsculas ni tildes');


/* ---------- los tres roles ---------- */
const CREDENCIALES = {
  adminUsuario: 'jefe', adminClave: 'clave-del-jefe',
  encargadoUsuario: 'turno', encargadoClave: 'clave-del-turno'
};
ok(rolDe(basic('jefe', 'clave-del-jefe'), CREDENCIALES) === ROL.admin,
   'la credencial del administrador da admin');
ok(rolDe(basic('turno', 'clave-del-turno'), CREDENCIALES) === ROL.encargado,
   'la del encargado da encargado');
ok(rolDe(basic('jefe', 'clave-del-turno'), CREDENCIALES) === ROL.ninguno,
   'cruzar usuario y clave no da ningún rol');
ok(rolDe('', CREDENCIALES) === ROL.ninguno, 'sin cabecera, ningún rol');

// **Falla cerrando.** Un rol al que le falta el usuario o la clave NO existe:
// si el blanco pasara, dejar una variable sin configurar abriría la puerta en
// vez de cerrarla, que es exactamente al revés de lo que hay que hacer.
ok(rolDe(basic('', ''), { adminUsuario: '', adminClave: '' }) === ROL.ninguno,
   'credenciales en blanco no abren nada');
ok(rolDe(basic('turno', 'clave-del-turno'),
   { adminUsuario: 'jefe', adminClave: 'clave-del-jefe' }) === ROL.ninguno,
   'sin encargado configurado, su credencial no sirve');
ok(rolDe(basic('jefe', ''), { adminUsuario: 'jefe', adminClave: '' }) === ROL.ninguno,
   'un rol con la clave vacía tampoco existe');

const delEntorno = credencialesDelEntorno({
  PANEL_USUARIO: 'a', PANEL_CLAVE: 'b',
  PANEL_ENCARGADO_USUARIO: 'c', PANEL_ENCARGADO_CLAVE: 'd'
});
ok(delEntorno.adminUsuario === 'a' && delEntorno.encargadoClave === 'd',
   'las variables de entorno se leen con los nombres de siempre');
ok(credencialesDelEntorno({}).adminUsuario === undefined,
   'un entorno vacío no inventa credenciales');

/* ---------- quién puede qué ---------- */
ok(puede(ROL.admin, 'configurar') && puede(ROL.admin, 'puestos') &&
   puede(ROL.admin, 'links') && puede(ROL.admin, 'mantencion'),
   'el administrador puede todo lo reservado');
ok(puede(ROL.encargado, 'reservas') && puede(ROL.encargado, 'dias') &&
   puede(ROL.encargado, 'equipo') && puede(ROL.encargado, 'ver'),
   'el encargado hace el día a día, incluida la lista de trabajadores');
ok(!puede(ROL.encargado, 'configurar') && !puede(ROL.encargado, 'puestos') &&
   !puede(ROL.encargado, 'links') && !puede(ROL.encargado, 'mantencion'),
   'pero no toca precios, puestos, links ni mantención');

// El trabajador no figura en NINGUNA fila de la tabla, y eso es el punto:
// no hay una sola acción del panel que pueda ejecutar. Entra por su link.
const acciones = Object.keys(PERMISOS) as Accion[];
ok(acciones.every((a) => !puede(ROL.trabajador, a)),
   'el trabajador no puede ninguna acción del panel');
ok(acciones.every((a) => !puede(ROL.ninguno, a)),
   'y quien no se identificó, tampoco');
ok(acciones.every((a) => puede(ROL.admin, a)),
   'el administrador sí puede todas: si alguna se le escapara, quedaría una parte sin dueño');

/* ---------- el link personal ---------- */
const t1 = nuevoToken(), t2 = nuevoToken();
ok(t1 !== t2, 'dos tokens seguidos no son iguales');
ok(t1.length >= 32, 'y son largos: 24 bytes en base64');
ok(/^[A-Za-z0-9_-]+$/.test(t1), 'solo caracteres que sobreviven a una URL');

const conAcceso: Trabajador[] = [
  { nombre: 'Ana Pérez', telefono: '', puesto: 'Garzón', activo: true, token: 'token-de-ana' },
  { nombre: 'Luis Soto', telefono: '', puesto: 'Cocina', activo: true, token: '' },
  { nombre: 'Pedro Díaz', telefono: '', puesto: 'Runner', activo: false, token: 'token-de-pedro' }
];
ok(trabajadorPorToken(conAcceso, 'token-de-ana')?.nombre === 'Ana Pérez',
   'el token encuentra a su dueño');
ok(trabajadorPorToken(conAcceso, 'otra-cosa') === undefined, 'uno inventado no encuentra a nadie');

// Si el vacío calzara, entrar a /mi/ sin nada detrás abriría la ficha de
// alguien. Es el agujero que se descubre tarde.
ok(trabajadorPorToken(conAcceso, '') === undefined, 'un token vacío no encuentra a nadie');
ok(trabajadorPorToken(conAcceso, '   ') === undefined, 'ni uno de puros espacios');
ok(trabajadorPorToken(conAcceso, undefined) === undefined, 'ni uno que no vino');

// Dar de baja a alguien tiene que cerrarle la puerta: si no, seguiría viendo
// la planificación después de irse.
ok(trabajadorPorToken(conAcceso, 'token-de-pedro') === undefined,
   'un trabajador dado de baja no entra aunque conserve su token');
ok(trabajadorPorToken(conAcceso, 'TOKEN-DE-ANA') === undefined,
   'el token distingue mayúsculas: es una credencial, no un nombre');

const conToken = leerTrabajadoresDe(aFilasTrabajadores(conAcceso));
ok(JSON.stringify(conToken) === JSON.stringify(conAcceso),
   'el token sobrevive la ida y vuelta a filas');
ok(leerTrabajadoresDe([['Nombre', 'Teléfono', 'Puesto habitual', 'Activo'],
                       ['Ana', '', 'Garzón', 'Sí']])[0].token === '',
   'una planilla vieja, sin la columna, se lee con todos sin acceso');

/* ---------- los turnos de una persona ---------- */
const agenda: Turno[] = [
  { fecha: '2026-11-15', trabajador: 'Ana Pérez', puesto: 'Barra', fila: 3 },
  { fecha: '2026-11-14', trabajador: 'ana perez', puesto: 'Garzón', fila: 2 },
  { fecha: '2026-11-01', trabajador: 'Ana Pérez', puesto: 'Garzón', fila: 4 },
  { fecha: '2026-11-14', trabajador: 'Luis Soto', puesto: 'Cocina', fila: 5 }
];
const deAna = turnosDe(agenda, 'Ana Pérez', '2026-11-10');
ok(deAna.length === 2, 'solo los suyos, y solo de la fecha en adelante');
ok(deAna[0].fecha === '2026-11-14' && deAna[1].fecha === '2026-11-15', 'ordenados por fecha');
ok(turnosDe(agenda, 'ANA PEREZ', '2026-11-10').length === 2,
   'el nombre se compara sin mayúsculas ni tildes, como el resto del panel');
ok(turnosDe(agenda, 'Ana Pérez', '2026-11-14')[0].fecha === '2026-11-14',
   'el día de hoy cuenta: un turno de hoy todavía no pasó');
ok(turnosDe(agenda, 'Nadie', '2026-01-01').length === 0, 'alguien sin turnos no recibe los de otro');


/* ---------- la sesión firmada ---------- */
const SECRETO_SESION = 'un-secreto-cualquiera';
const AHORA = 1_800_000_000;

const token = await firmarSesion({ usuario: 'Ana Pérez', rol: ROL.encargado }, SECRETO_SESION, AHORA);
const abierta = await leerSesion(token, SECRETO_SESION, AHORA);
ok(abierta?.usuario === 'Ana Pérez', 'la sesión conserva el nombre');
ok(abierta?.rol === ROL.encargado, 'y el rol');
ok(abierta?.expira === AHORA + DURACION_SESION, 'caduca a los siete días');

// Lo que protege la firma no es que el token sea ilegible —no lo es— sino
// que nadie pueda CAMBIARLO. Un encargado que se ascienda a admin editando
// el payload tiene que rebotar.
const [payload] = token.split('.');
const falsificado = btoa(JSON.stringify({ usuario: 'Ana Pérez', rol: 'admin',
                                          expira: AHORA + 1000 }))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
ok(await leerSesion(`${falsificado}.${token.split('.')[1]}`, SECRETO_SESION, AHORA) === null,
   'cambiarse el rol a mano invalida la firma');
ok(await leerSesion(`${payload}.firmafalsa`, SECRETO_SESION, AHORA) === null, 'una firma inventada no pasa');
ok(await leerSesion(token, 'otro-secreto', AHORA) === null, 'otro secreto no la abre');
ok(await leerSesion(token, '', AHORA) === null, 'sin secreto no se abre nada');
ok(await leerSesion('', SECRETO_SESION, AHORA) === null, 'una cookie vacía no es una sesión');
ok(await leerSesion('sin-punto', SECRETO_SESION, AHORA) === null, 'ni un texto cualquiera');
ok(await leerSesion('%%%.%%%', SECRETO_SESION, AHORA) === null, 'ni base64 roto: no revienta, no pasa');

ok(await leerSesion(token, SECRETO_SESION, AHORA + DURACION_SESION + 1) === null,
   'una sesión caducada deja de valer');
ok(await leerSesion(token, SECRETO_SESION, AHORA + DURACION_SESION - 1) !== null,
   'y un segundo antes todavía vale');

const sinRol = await firmarSesion({ usuario: 'Ana', rol: '' }, SECRETO_SESION, AHORA);
ok(await leerSesion(sinRol, SECRETO_SESION, AHORA) === null,
   'una sesión sin rol no sirve, aunque esté bien firmada');

ok(secretoDeSesion({ SESION_SECRETO: 'propio', PANEL_CLAVE: 'otra' }) === 'propio',
   'manda SESION_SECRETO cuando existe');
ok(secretoDeSesion({ PANEL_CLAVE: 'la-clave' }) === 'sesion:la-clave',
   'sin ella se deriva de PANEL_CLAVE, para no dejar a nadie afuera en el primer despliegue');
ok(secretoDeSesion({}) === '', 'y sin ninguna de las dos no hay con qué firmar: el panel se cierra');

/* ---------- la cookie ---------- */
ok(cookieDe('a=1; sesion=abc; b=2', 'sesion') === 'abc', 'encuentra la cookie entre otras');
ok(cookieDe('sesion=abc', 'otra') === '', 'y no devuelve la equivocada');
ok(cookieDe('', 'sesion') === '' && cookieDe(null, 'sesion') === '',
   'sin cabecera no hay cookie');
ok(cookieDe('sesion=a%20b', 'sesion') === 'a b', 'desescapa el valor');
ok(cookieDe('sesionista=no; sesion=si', 'sesion') === 'si',
   'un nombre que EMPIEZA igual no cuenta como la cookie');

/* ---------- las contraseñas ---------- */
const huella = hashDeClave('tres-palabras-pegadas');
ok(huella.startsWith('scrypt$'), 'la huella dice con qué se hizo');
ok(!huella.includes('tres-palabras-pegadas'), 'y no contiene la contraseña');
ok(claveCalza('tres-palabras-pegadas', huella), 'la contraseña correcta calza');
ok(!claveCalza('tres-palabras-pegada', huella), 'una letra menos no calza');
ok(hashDeClave('misma-clave') !== hashDeClave('misma-clave'),
   'dos huellas de la misma clave son distintas: cada una lleva su sal');

// El vacío nunca abre: una cuenta sin clave puesta no es una cuenta que se
// abre con nada, es una cuenta que todavía no se puede usar.
ok(!claveCalza('', huella), 'una contraseña vacía no calza');
ok(!claveCalza('lo-que-sea', ''), 'una cuenta sin huella no se abre con nada');
ok(!claveCalza('lo-que-sea', 'basura'), 'una huella con formato raro tampoco');
ok(!claveCalza('lo-que-sea', 'scrypt$sal$'), 'ni una a medio escribir');
ok(LARGO_MINIMO_CLAVE >= 12, 'el mínimo es el único freno real al ensayo y error');

/* ---------- las cuentas ---------- */
const cuentas = leerUsuariosDe([
  ['Nombre', 'Usuario', 'Rol', 'Activo', 'Clave (huella)'],
  ['Ana Pérez', 'ana', 'admin', 'Sí', huella],
  ['Luis Soto', 'luis', 'encargado', '', ''],
  ['Pedro Díaz', 'pedro', 'encargado', 'No', huella],
  ['Sin Rol', 'raro', 'jefazo', 'Sí', huella],
  ['', 'ana', 'admin', 'Sí', huella],
  ['Sin usuario', '', 'admin', 'Sí', huella]
]);
ok(cuentas.length === 4, 'descarta la repetida y la que no tiene usuario');
ok(cuentas[1].activo === true, 'la celda Activo en blanco deja entrar');
ok(cuentas[3].rol === ROL.encargado,
   'un rol que no se reconoce cae a encargado, NO a administrador');
ok(ROLES_DE_CUENTA.length === 2 && !ROLES_DE_CUENTA.includes(ROL.trabajador),
   'el trabajador no es una cuenta del panel: entra por su link');
ok(esRolDeCuenta('ADMIN') && esRolDeCuenta('encargado') && !esRolDeCuenta('trabajador'),
   'los roles de cuenta se reconocen sin importar mayúsculas');

ok(buscarUsuario(cuentas, 'ANA')?.nombre === 'Ana Pérez',
   'el usuario no distingue mayúsculas');
ok(buscarUsuario(cuentas, 'pedro') === undefined,
   'una cuenta desactivada no se encuentra: es la forma de echar a alguien sin borrar su historia');
ok(buscarUsuario(cuentas, '') === undefined, 'un usuario vacío no encuentra a nadie');

const cuentasIdaYVuelta = leerUsuariosDe(aFilasUsuarios(cuentas));
ok(JSON.stringify(cuentasIdaYVuelta) === JSON.stringify(cuentas),
   'las cuentas sobreviven la ida y cuentasIdaYVuelta a filas, huella incluida');

/* ---------- la bitácora ---------- */
// En hora de Chile y no en UTC: una línea que diga 03:40 cuando en el local
// eran las 00:40 manda a buscar al turno equivocado.
const instante = new Date('2026-10-21T23:40:00Z');       // 20:40 en Santiago
ok(ahoraEnChile(instante) === '2026-10-21 20:40', 'la hora se anota en hora de Chile');
ok(ahoraEnChile(instante, 'UTC') === '2026-10-21 23:40', 'y la zona se puede cambiar para probarla');

const anotada = filaBitacora({ cuando: '2026-10-21 20:40', quien: 'Ana', rol: 'admin',
                               accion: 'Anotó una reserva', detalle: 'x' });
ok(anotada.length === ENCABEZADO_BITACORA.length, 'una anotación llena todas sus columnas');
const leidas = leerBitacoraDe([ENCABEZADO_BITACORA, anotada, ['', '', '', '', '']]);
ok(leidas.length === 1, 'una fila sin fecha no es una anotación');
ok(leidas[0].quien === 'Ana' && leidas[0].accion === 'Anotó una reserva', 'y se lee entera');

ok(recortar('  hola   mundo  ') === 'hola mundo', 'el detalle se limpia de espacios de sobra');
ok(recortar('x'.repeat(400)).length === 300, 'y se recorta para que una línea no sea ilegible');
ok(recortar('x'.repeat(400)).endsWith('…'), 'con puntos suspensivos, para que se note que había más');
ok(recortar(null) === '', 'un detalle que no vino es texto vacío, no "null"');


console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: la lógica del panel pasa.');
process.exit(fallos ? 1 : 0);
