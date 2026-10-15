/**
 * Pruebas de la lógica pura del panel. Sin dependencias y sin red:
 *
 *   node --experimental-strip-types src/lib/prueba.ts
 *
 * Cubre lo que puede romperse en silencio: el semáforo, qué reserva ocupa
 * lugar, el escape del CSV y el calce de los encabezados de la planilla.
 */
import { semaforo, ocupacionDe, ocupaLugar, CORTES } from './ocupacion.ts';
import { aCSV } from './csv.ts';
import { proximosFinesDeSemana, diaSemana, sumarDias, enPalabras } from './fechas.ts';
import { indices, faltantes, normalizar, COL_RESERVAS, TIPO_PAGO } from './columnas.ts';
import type { Reserva, FechaHabil } from './tipos.ts';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { fallos++; console.log('  FALLA: ' + m); } };

const r = (p: Partial<Reserva>): Reserva => ({
  id: 'x', fecha: '2026-11-14', nombre: '', email: '', telefono: '',
  menu: 'Tradiciones', personas: 1, monto: null, tipoPago: TIPO_PAGO.directo,
  estadoPago: 'paid', creada: '', fila: 2, ...p
});
const dia = (p: Partial<FechaHabil>): FechaHabil => ({
  fecha: '2026-11-14', capacidad: 60, apertura: '13:00',
  estado: 'Abierta', notas: '', fila: 2, ...p
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
               'Personas','Monto','Tipo Pago','Estado Pago Shopify','Creada'];
ok(faltantes(bueno, COL_RESERVAS).length === 0, 'el encabezado del encargo calza entero');
ok(indices(bueno, COL_RESERVAS).tipoPago === 8, 'y cada campo sabe su columna');

// Lo que de verdad pasa si alguien escribe la planilla a mano.
const sinTildes = bueno.map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, ''));
ok(faltantes(sinTildes, COL_RESERVAS).length === 0,
   'un encabezado SIN TILDES calza igual: "Menu" encuentra a "Menú"');

const malo = ['ID Orden','Fecha Reserva','Nombre','Personas'];
ok(faltantes(malo, COL_RESERVAS).join(', ').includes('Tipo Pago'),
   'y si falta una columna de verdad, se dice cuál en vez de fallar callado');

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: la lógica del panel pasa.');
process.exit(fallos ? 1 : 0);
