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
import { pagoEnEspanol, pagoConGlosa, ESTADOS_QUE_LIBERAN, pagoPorCobros,
         ESTADOS_QUE_VIENEN } from './pagos.ts';
import { aCSV } from './csv.ts';
import { proximosFinesDeSemana, diaSemana, sumarDias, enPalabras, fechaEnZona,
         diasAbiertosEntre, mesDe, mesEnPalabras, semanaDe, diasDelMes, sumarMeses,
         rangoEnPalabras, esFecha } from './fechas.ts';
import { paraElSitio } from './publico.ts';
import { aReserva, estadoDe, telefonoDe, emailDe, nombreDe, personasDe, menuDe,
         desglosarMenu, menusDe, menusConocidos, componerMenu, personasDeCuenta,
         camposDeShopify,
         type PedidoShopify } from './shopify.ts';
import { ESTADO_PAGO, esPrivada } from './columnas.ts';
import { leerConfigDe, aFilasConfig, aDiasSemana, deDiasSemana, aDescuentos,
         POR_DEFECTO, CLAVES } from './config.ts';
import { prepararLineas, esDiaPublico, clienteDe, otrasAlternativas, grupoSinGanar, lineaDeProducto, yaEstaEnLaCotizacion, cambiarCantidad,
         alternativasDe, letraDe, principalDe, sigueViva, vivasDelGrupo, faltaElegir, paraElLink,
         ESTADOS_A_MANO, productoDe, showDe } from './cotizar.ts';
import { estadoNormal, cuentasDe, documentoDe, DOCUMENTO, numeroONulo } from './presupuestos.ts';
import { condicionesDe, estadoCobros, leerCobrosDe, filaCobro, ENCABEZADO_COBROS, limpiarCobro,
         montoCobro, cobrosDe, CONCEPTO_COBRO, avisosDeCobro, diasEntre, porRevisar,
         problemaConArchivo, puedeGanar } from './cobros.ts';
import { idDeDrive } from './config.ts';
import { ufDeBoostr, ufDeMindicador, aPesos, enUF } from './uf.ts';
import { puedeTocarPresupuesto, puedeVer, NO_SE_LEE_CON_GERENCIA } from './auth.ts';
import { comoIngresar } from './fudo.ts';
import { leerClientesDe, filaCliente, limpiarCliente, faltaEnCliente, parecidos,
         nuevoIdCliente, buscarClientes, migrarAClientes, ENCABEZADO_CLIENTES,
         faltaParaFactura, type Cliente } from './clientes.ts';
import { diaParaReservaManual, queLeHizo, deshacerDia, cupoParaGanar } from './dias.ts';
import { valorSeguro } from './celdas.ts';
import { tranquilidadDeCotizacion, devolucionSugerida, faltaDevolver, frasesCancelacion,
         CONCEPTO_DEVOLUCION } from './cancelacion.ts';
import { tranquilidadDe, partirHorario, normalizarHorario, moverHora } from './contrato.ts';
import { clausulasDe, comparecencia, faltaDelCliente, faltaDeEmpresa, horarioDe, fechaLarga,
         RAYA, LEY_20393, type DatosContrato } from './contrato.ts';
import {
  leerEventos, esNuestro, tieneDia, eventosPorFecha, periodosNuestros,
  haySobreventa, NUESTRO_LUGAR, yaEstaAnotado, anotadosDe,
  PREFIJO, TITULOS, idExterno, esNuestroId, fechaDelId, diaParaElCRM,
  leerPublicados, reconciliar, cuerpoDe, tandas, type DiaDelPanel
} from './crm.ts';
import {
  ENCABEZADO_PAGOS, leerPagosDe, filaPago, cuentaEnPeriodo, pagadoDe,
  estadoDePago, aTransferirDe, faltaDe, pagoDelCuerpo, nuevoIdPago,
  desglosePago, conceptoDe, CONCEPTO, pideBoleta, leerBoletasDe, filaBoleta,
  ENCABEZADO_BOLETAS, boletaDe, boletaEnPlanilla, textoTransferencia, glosaDe,
  ORDEN_TRANSFERENCIA, filaTransferencia, NOMBRE_COLUMNA_TRANSFERENCIA,
  pagosEnPeriodo, pagosQueNoCaben,
  type PagoEquipo
} from './remuneraciones.ts';
import { indices, faltantes, normalizar, COL_RESERVAS, TIPO_PAGO, esManual }
  from './columnas.ts';
import type { Reserva, FechaHabil, Ocupacion } from './tipos.ts';
import {
  ESTADO_PRESUPUESTO, ENCABEZADO_PRESUPUESTOS, ENCABEZADO_LINEAS,
  leerPresupuestosDe, filaPresupuesto, leerLineasDe, filaLinea,
  normalizarLineas, posiblesPorDia, cuentaComoPosible, estadoVisible, porToken,
  reservaDesdePresupuesto, diasParaVencer, seguimientoDe, estaVencido, porVencer, vencidoSinCerrar,
  totalDe, validoHastaDe, personasDe as personasDeLineas, desglosarIVA, IVA,
  type Presupuesto, type LineaPresupuesto
} from './presupuestos.ts';
import { credencialValida, iguales, rolDe, puede, credencialesDelEntorno,
         ROL, PERMISOS, ROLES_DE_CUENTA, esRolDeCuenta, LARGO_MINIMO_CLAVE,
         puedeTocarReserva,
         type Rol, type Accion } from './auth.ts';
import { resumenRol, NOMBRE_ROL, RESUMEN_ROL } from './roles.ts';
import { firmarSesion, leerSesion, secretoDeSesion, DURACION_SESION } from './sesion.ts';
import { hashDeClave, claveCalza, leerUsuariosDe, aFilasUsuarios,
         buscarUsuario, type Usuario } from './usuarios.ts';
import { ahoraEnChile, filaBitacora, leerBitacoraDe, recortar,
         ENCABEZADO_BITACORA } from './bitacora.ts';
import { cookieDe } from './sesion.ts';
import { filaReserva, buscarFilaPorId, leerReservasDe, idsRepetidos }
  from './filas.ts';
import { firmaValida } from './firma.ts';
import { eventoDe, idDeEvento } from './calendario.ts';
import { canonizar, desconocidos, leerMenusDe, aFilasMenus, aMonto, precioDe,
         nuevoProducto, aPrecio, paraReservar, paraCotizar, precioParaCotizar, usados, quitadosUsados,
         limpiarProducto, TIPO_PRODUCTO, COBRO, MONEDA, COL_MENUS,
         POR_DEFECTO_MENUS, type Menu } from './menus.ts';
import { leerPuestosDe, aFilasPuestos, leerTrabajadoresDe, aFilasTrabajadores,
         leerTurnosDe, filaTurno, normalizarPlan, planDelDia, resumenEquipo,
         sugeridos, sinFicha, esSi, aEntero, COL_TURNOS,
         nuevoToken, trabajadorPorToken, turnosDe, pagoDe, costoDelDia, costoPlanificado,
         contratadosDelDia, esContratado, MODALIDAD, VINO,
         informeDelPeriodo, rangoDelPeriodo, mesesConTurnos, semanasConTurnos,
         semanaPorDefecto, periodosDelLink, esPeriodo,
         semanasEntre, etiquetaSemana, escaleraDeSemanas,
         repartirPropina, propinaDelDia, porNombre,
         totalAjustes, motivosDe, leerAjustes, escribirAjustes,
         POR_DEFECTO_PUESTOS, esPreparacion,
         type Puesto, type Trabajador, type Turno } from './equipo.ts';
import { leerColaboradoresDe, aFilasColaboradores, actividadesConocidas,
         leerExtrasDe, filaExtra, normalizarExtras, extrasDelDia,
         costoExtrasDelDia, costoDeExtra, informeDeExtras,
         COL_COLABORADORES, COL_ACTIVIDADES, ENCABEZADO_ACTIVIDADES,
         type Colaborador, type Extra } from './extras.ts';
import { telefonoNormal, telefonoParaEnlace, celularChileno, enlaceWhatsApp,
         avisoTelefono, correoNormal, correoValido, avisoCorreo,
         FORMATO_TELEFONO } from './contacto.ts';
import { estaCerrado as diaCerrado, cierreDe, faltaParaCerrar, sePuedeCerrar, yaLlego, yaAbrio,
         diasPorCerrar, leerCierresDe, corregirDiaCerrado, type Cierre } from './cierres.ts';
import { climaDe, iconoDe, climaEnPalabras, urlPronostico, horaEnChile } from './clima.ts';
import { createHmac } from 'node:crypto';
import { estaCerrado, esExclusiva, ESTADO_DIA } from './columnas.ts';
import { ASISTENCIA } from './columnas.ts';
import { lineaDeSemana, listaDeDias, MAX_AVISOS } from './semana.ts';
import { bancoVacio, limpiarBanco, leerBanco, filaBanco, faltaParaTransferir,
         sePuedeTransferir, titularDe, rutLimpio, TIPOS_CUENTA, COL_BANCO,
         type Banco, rutValido, avisoRut } from './banco.ts';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { fallos++; console.log('  FALLA: ' + m); } };

const r = (p: Partial<Reserva>): Reserva => ({
  id: 'x', fecha: '2026-11-14', nombre: '', email: '', telefono: '',
  menu: 'Tradiciones', personas: 1, monto: null, tipoPago: TIPO_PAGO.directo, asistencia: '',
  estadoPago: 'paid', creada: '', notaPago: '', eventoCRM: '', anotadaPor: '',
  fila: 2, ...p
});
const tu = (p: Partial<Turno>): Turno => ({
  fecha: '2026-11-14', trabajador: 'Ana Pérez', puesto: 'Garzón',
  asistencia: '', modalidad: MODALIDAD.porTurno,
  pagoJornada: 0, horasExtra: 0, valorHora: 0,
  ajustes: [], propina: 0, fila: 2, ...p
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

/* ---------- el desglose: pagadas vs por cobrar ---------- */
let o = ocupacionDe([
  r({ personas: 4, tipoPago: TIPO_PAGO.directo, estadoPago: 'paid' }),
  r({ personas: 2, tipoPago: TIPO_PAGO.local, estadoPago: 'pending' }),
  r({ personas: 9, tipoPago: TIPO_PAGO.directo, estadoPago: 'refunded' }),
  r({ personas: 3, fecha: '2026-11-15' })
], dia({}));
ok(o.tomadas === 6, 'suma solo las del día y solo las que ocupan lugar');
ok(o.pagadas === 4 && o.porPagar === 2, 'separa lo pagado de lo que hay que cobrar');

ok(o.quedan === 54, 'quedan = capacidad - tomadas');
ok(o.semaforo === 'verde', 'y el semáforo sale de ese total');

// Lo que se rompia antes: la variante comprada decia "paga en linea" y la
// plata todavia no estaba. Mirando la modalidad, esa persona salia contada
// como pagada y nadie le cobraba en la puerta.
const oSinPagar = ocupacionDe([
  r({ personas: 5, tipoPago: TIPO_PAGO.directo, estadoPago: 'pending' })
], dia({}));
ok(oSinPagar.pagadas === 0 && oSinPagar.porPagar === 5,
   'una comprada en linea y sin pagar cuenta como por cobrar, no como pagada');

// Y una anotada a mano, que no tiene modalidad ninguna, se reparte igual.
const oAMano = ocupacionDe([
  r({ id: 'MANUAL-1', personas: 2, tipoPago: '', estadoPago: 'paid' }),
  r({ id: 'MANUAL-2', personas: 3, tipoPago: '', estadoPago: 'pending' })
], dia({}));
ok(oAMano.pagadas === 2 && oAMano.porPagar === 3,
   'una reserva a mano, sin modalidad, igual se sabe si esta pagada');

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
               'Asistencia','Nota de pago','ID Evento CRM','Anotada por',
               'Llegaron','Aviso recepción','Abonado'];
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
ok(estadoDe(pedido({ financial_status: 'partially_paid' })) === ESTADO_PAGO.abonado,
   'partially_paid es Abonada, no "por pagar" ni "pagada"');
ok(estadoDe(pedido({ financial_status: 'authorized' })) === ESTADO_PAGO.pendiente,
   'authorized cuenta como PENDIENTE: la tarjeta esta retenida pero la plata no se cobro');
ok(estadoDe(pedido({ financial_status: 'partially_paid' })) !== ESTADO_PAGO.pagado,
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

/* ---------- lo que Sheets leeria como formula ---------- */

// **Los dos casos que de verdad pasaron, los dos en silencio.** Con
// `USER_ENTERED` la API interpreta la celda como si alguien la tecleara, y
// un `=`, `+`, `-` o `@` adelante abre una formula: la planilla guarda
// `#ERROR!` y el dato se pierde.
ok(valorSeguro('+56 9 1234 5678') === "'+56 9 1234 5678",
   'el telefono normalizado se escribe como texto, no como formula');
ok(valorSeguro('-5000|12000') === "'-5000|12000",
   'dos ajustes en una celda tambien, que es plata que alguien tiene que cobrar');
ok(valorSeguro('=1+1') === "'=1+1" && valorSeguro('@algo') === "'@algo",
   'y cualquier otra cosa que empiece como formula');

// Un numero con signo SIGUE siendo un numero: la planilla la abre una
// persona y suma columnas con sus propias formulas.
ok(valorSeguro('-5000') === '-5000', 'un ajuste negativo solo se queda numero');
ok(valorSeguro('+56') === '+56', 'y cualquier numero con signo');

// Lo demas pasa intacto, incluido lo que no es texto.
ok(valorSeguro('Tradiciones') === 'Tradiciones', 'el texto corriente no se toca');
ok(valorSeguro('2026-11-14') === '2026-11-14', 'ni una fecha');
ok(valorSeguro(7) === 7 && valorSeguro(null) === null, 'ni lo que no es texto');
ok(valorSeguro('') === '', 'ni una celda vacia');

/* ---------- la modalidad comprada, que delata una regla caida ---------- */
res = aReserva(pedido({ financial_status: 'pending',
  line_items: [linea('Tradiciones', 2, 'Pago directo')] }))!;
ok(res.tipoPago === 'Pago directo' && res.estadoPago === ESTADO_PAGO.pendiente,
   '"Pago directo" + "pending" queda anotado tal cual: es como se ve que la regla de Shopify no aplico');

// Y esa senal solo sirve si NADIE MAS puede escribir esa columna. Desde el
// 2026-10-30 la modalidad la escribe el sincronizador y nada mas: el
// formulario manual ya no la ofrece, asi que una fila que la traiga es un
// pedido de verdad.
ok(esManual('MANUAL-1792604490985') && !esManual('1007'),
   'el id dice si la reserva se anoto a mano');
ok(!esManual(''), 'y una fila sin id no cuenta como anotada a mano');

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

/* ---------- y cuando el reintento IGUAL se cuela: el mismo pedido dos veces ---------- */
// Confirmado por el cliente el 2026-11-01: dos filas con el mismo
// `ID Orden` 7345141809369. `guardarPedido()` busca por esa columna, pero es
// leer-y-despues-escribir sin candado, y la API de Sheets no da ninguno. Sin
// esto el dia cuenta esa gente dos veces: el cupo se achica solo y la cocina
// prepara de mas.
const encDup = ['ID Orden', 'Fecha Reserva', 'Nombre', 'Personas', 'Monto'];
const hojaDup = [encDup,
  ['7345141809369', '2026-11-14', 'Ana', '4', '176000'],
  ['7345141809369', '2026-11-14', 'Ana', '4', '176000'],
  ['7345141809370', '2026-11-14', 'Beto', '3', '132000']];
const dedup = leerReservasDe(hojaDup);
ok(dedup.length === 2, 'el mismo ID Orden en dos filas se lee como UN pedido');
ok(dedup[0].personas + dedup[1].personas === 7,
   'y el dia suma 7 personas, no 11: el cupo no se achica solo');
ok(dedup[0].fila === 2,
   'se queda la PRIMERA fila, que es por la que se edita la reserva');
ok(dedup[0].duplicadas === 2 && dedup[1].duplicadas === undefined,
   'la que sobrevive dice cuantas filas hay, para poder avisarlo en pantalla');
ok(leerReservasDe([encDup, ['7345141809369', '2026-11-14', 'Ana', '4', '1']])[0]
     .duplicadas === undefined,
   'una reserva normal NO trae el contador: ausente es "no pasa nada"');

// Las anotadas a mano no entran: su id es unico por construccion, y dos
// MANUAL- iguales solo podrian venir de que alguien copio la fila a proposito.
const hojaManual = [encDup,
  ['MANUAL-1', '2026-11-14', 'A mano', '2', ''],
  ['MANUAL-1', '2026-11-14', 'A mano', '2', '']];
ok(leerReservasDe(hojaManual).length === 2,
   'dos filas MANUAL con el mismo id se dejan las dos: eso lo hizo una persona');
// Lo mismo una fila sin id: no hay nada por lo que agruparla.
ok(leerReservasDe([encDup, ['', '2026-11-14', 'X', '2', ''],
                           ['', '2026-11-14', 'Y', '3', '']]).length === 2,
   'y dos filas SIN id no son el mismo pedido');

// El diagnostico las nombra igual, porque la fila de mas sigue en la planilla
// y alguien tiene que borrarla.
const repes = idsRepetidos(hojaDup);
ok(repes.length === 1 && repes[0].id === '7345141809369' && repes[0].filas === 2,
   'el diagnostico nombra el id repetido y cuantas filas tiene');
ok(idsRepetidos(hojaManual).length === 0, 'y no reclama por las hechas a mano');
ok(idsRepetidos([encDup]).length === 0 && idsRepetidos([]).length === 0,
   'una hoja vacia o con solo encabezado no revienta el diagnostico');

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

/* ---------- los dias de un mes, para la grilla del calendario ---------- */
ok(diasDelMes('2026-11').length === 30, 'noviembre trae 30 dias');
ok(diasDelMes('2026-11')[0] === '2026-11-01'
   && diasDelMes('2026-11')[29] === '2026-11-30', 'del primero al ultimo, en orden');
ok(diasDelMes('2026-02').length === 28 && diasDelMes('2028-02').length === 29,
   'febrero sabe de anos bisiestos');
ok(diasDelMes('2000-02').length === 29 && diasDelMes('1900-02').length === 28,
   'incluida la regla de los siglos');
ok(diasDelMes('2026-13').length === 0, 'un mes que no existe no trae dias');

ok(sumarMeses('2026-11', 1) === '2026-12' && sumarMeses('2026-12', 1) === '2027-01',
   'el mes siguiente cruza el ano');
ok(sumarMeses('2027-01', -1) === '2026-12' && sumarMeses('2026-03', -3) === '2025-12',
   'y el anterior tambien');

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
ok(filasMenus[0].slice(0, 3).join('|') === 'Menú|Precio en línea|Precio en el local',
   'las tres columnas de siempre van primero y en el mismo orden: una planilla vieja se sigue leyendo');
ok(filasMenus[0].slice(3).join('|')
     === 'Tipo|Sitio público|Cotización|Cobro|Precio cotización|IVA|Moneda|Activo',
   'y las del catálogo van al final');
ok(filasMenus.length === POR_DEFECTO_MENUS.length + 1, 'una fila por menu, mas el encabezado');
ok(JSON.stringify(leerMenusDe(filasMenus)) === JSON.stringify(POR_DEFECTO_MENUS),
   'escribir y volver a leer devuelve exactamente la misma lista');
ok(leerMenusDe([['Menú'], ['']]).length === 0,
   'una fila sin nombre se ignora en vez de crear un menu vacio');
ok(leerMenusDe([['Menú'], ['Tradiciones'], ['TRADICIONES']]).length === 1,
   'y el mismo nombre dos veces no crea dos menus');
ok(POR_DEFECTO_MENUS.length === 6,
   'los cuatro niveles del landing mas el de ninos y el de pequenos');

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
  nuevoProducto({ nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000 }),
  nuevoProducto({ nombre: 'Ni\u00f1os', precioEnLinea: 19000, precioEnLocal: 24000 })
];
ok(precioDe(conPrecio[0], false) === 44000, 'pagando por adelantado rige el precio en linea');
ok(precioDe(conPrecio[0], true) === 49000, 'y pagando en el local, el otro');
ok(precioDe(undefined, false) === 0, 'un menu que no esta en la lista no tiene precio');
ok(precioDe(nuevoProducto({ nombre: 'X', precioEnLinea: 0, precioEnLocal: 0 }), false) === 0,
   'y uno sin precio puesto devuelve cero, no un numero inventado');

// Un cero no se escribe como "0" en la planilla: un cero se lee como
// "vale cero" y lo que queremos decir es "sin poner".
ok(aFilasMenus([nuevoProducto({ nombre: 'X', precioEnLinea: 0, precioEnLocal: 5000 })])[1]
     .slice(0, 3).join('|') === 'X||5000',
   'un precio en cero se guarda en blanco, no como cero');
ok(leerMenusDe(aFilasMenus(conPrecio))[0].precioEnLinea === 44000,
   'escribir y volver a leer conserva los precios');


/* ---------- el catálogo de productos (2026-11-10) ---------- */
{
  // Una planilla de antes del catálogo: solo nombre y dos precios.
  const vieja = leerMenusDe([['Menú', 'Precio en línea', 'Precio en el local'],
                             ['Tradiciones', '44000', '49000']]);
  ok(vieja[0].tipo === TIPO_PRODUCTO.menu && vieja[0].sitioPublico && !vieja[0].cotizacion,
     'una fila vieja sigue siendo un menú del sitio que NO se cotiza: nada cambia hasta que alguien lo decida');
  ok(vieja[0].precioEnLinea === 44000, 'y conserva sus precios');

  const cat = leerMenusDe([
    ['Menú', 'Precio en línea', 'Precio en el local', 'Tipo', 'Sitio público', 'Cotización',
     'Cobro', 'Precio cotización', 'IVA', 'Moneda'],
    ['Tradiciones', '44000', '49000', 'Menú', 'sí', 'no', '', '', '', ''],
    ['Once campestre', '', '', 'extra', 'no', 'SI', 'por persona', '8.000', '+ iva', 'pesos'],
    ['Show ecuestre', '', '', 'Show', 'no', 'sí', 'Monto fijo', '500000', 'Incluido', 'Pesos'],
    ['Matrimonio', '', '', 'Menú', 'no', 'sí', 'Por persona', '2,61', '+ IVA', 'UF'],
    ['Raro', '', '', 'Cualquiera', 'quizás', 'x', 'otro', 'abc', '??', 'dólares']
  ]);
  ok(cat[1].tipo === TIPO_PRODUCTO.extra && cat[1].iva === '+ IVA' && cat[1].precioCotizacion === 8000,
     'los valores escritos con otras mayúsculas se entienden, y $8.000 es ocho mil');
  ok(cat[3].moneda === MONEDA.uf && cat[3].precioCotizacion === 2.61,
     'un precio en UF conserva sus decimales: 2,61 UF no es 261');
  ok(cat[4].tipo === TIPO_PRODUCTO.menu && cat[4].cobro === COBRO.porPersona
     && cat[4].moneda === MONEDA.pesos && !cat[4].sitioPublico && cat[4].cotizacion,
     'lo que no se entiende vuelve a su valor de siempre en vez de quedar inventado');
  ok(JSON.stringify(leerMenusDe(aFilasMenus(cat))) === JSON.stringify(cat),
     'escribir y volver a leer el catálogo devuelve exactamente lo mismo');

  ok(paraReservar(cat).map((m) => m.nombre).join() === 'Tradiciones',
     'al anotar una reserva solo aparecen los menús del sitio: ni la once ni el show ni lo que es solo de cotización');
  ok(paraCotizar(cat).map((m) => m.nombre).join() === 'Once campestre,Show ecuestre,Matrimonio,Raro',
     'al cotizar, solo lo marcado “se puede cotizar”: Tradiciones no');
  ok(precioParaCotizar(cat[1]) === 8000, 'la cotización propone su propio precio');
  ok(precioParaCotizar(cat[0]) === 49000,
     'y uno sin precio de cotización propone el de pagar en el local, que es el del landing');

  ok(aPrecio('2,61') === 2.61 && aPrecio('2.61') === 2.61, 'la UF se escribe con coma o con punto');
  ok(aPrecio('$1.500.000') === 1500000, 'y un monto en pesos con sus puntos de miles');
  ok(aPrecio('-3') === 0 && aPrecio('') === 0, 'un negativo o un vacío es sin precio');

  const limpio = limpiarProducto({ nombre: ' Vino ', tipo: 'inventado', sitioPublico: 'sí',
    cotizacion: true, cobro: 'Monto fijo', precioCotizacion: '12.000', moneda: 'UF' });
  ok(limpio.nombre === 'Vino' && limpio.tipo === TIPO_PRODUCTO.menu,
     'del navegador: un tipo inventado vuelve a Menú');
  ok(limpio.sitioPublico === true && limpio.cotizacion === true,
     'un interruptor que no llega como sí/no de verdad conserva su valor de siempre');
  ok(limpio.cobro === COBRO.fijo && limpio.moneda === MONEDA.uf && limpio.precioCotizacion === 12000,
     'y lo válido se guarda tal cual');
}

/* ---------- descuentos y la empresa en la configuración (2026-11-10) ---------- */
{
  ok(POR_DEFECTO.descuentos.join() === '5,10,15', 'los descuentos parten en 5, 10 y 15');
  ok(aDescuentos('15, 5,10 %')?.join() === '5,10,15', 'se escriben como sea y quedan ordenados');
  ok(aDescuentos('0, 100, abc') === null, 'ni cero, ni cien, ni una palabra son un descuento');
  const c = leerConfigDe([['Clave', 'Valor'], ['descuentos', '7'],
                          ['empresa_nombre', ' Brasas de Lo Pirque ']]);
  ok(c.descuentos.join() === '7' && c.empresa.nombre === 'Brasas de Lo Pirque',
     'se leen de la planilla');
  ok(c.empresa.razonSocial === '', 'lo que nadie escribió queda en blanco: no se inventa');
  const ida = leerConfigDe(aFilasConfig({ ...POR_DEFECTO,
    empresa: { ...POR_DEFECTO.empresa, rut: '76.123.456-7', transferencia: 'Banco X, cta cte 123' } }));
  ok(ida.empresa.rut === '76.123.456-7' && ida.empresa.transferencia === 'Banco X, cta cte 123',
     'la empresa va y vuelve de la planilla');
}

/* ---------- las fichas de clientes (2026-11-10) ---------- */
{
  const cl = (x: Partial<Cliente>): Cliente => ({
    id: 'C-0001', nombre: 'Ana Soto', empresa: '', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 1234 5678', correo: 'ana@correo.cl', notas: '',
    creadoPor: '', creado: '', fila: 2, ...x
  });
  const lista = [
    cl({}),
    cl({ id: 'C-0002', nombre: 'Juan Pérez', telefono: '+56 9 8765 4321', correo: '',
         rut: '12345678-5', empresa: 'Eventos SpA', fila: 3 })
  ];

  const limpio = limpiarCliente({ nombre: ' Ana ', telefono: '9 1234 5678',
    correo: ' ANA@Correo.CL ', rut: '12.345.678-5' });
  ok(limpio.telefono === '+56 9 1234 5678' && limpio.correo === 'ana@correo.cl'
     && limpio.rut === '12345678-5' && limpio.nombre === 'Ana',
     'la ficha se guarda con el mismo formato que el resto del panel');

  ok(faltaEnCliente(limpiarCliente({ telefono: '912345678' })) === 'Falta el nombre.',
     'sin nombre no hay ficha');
  ok(faltaEnCliente(limpiarCliente({ nombre: 'Ana' })) === 'Falta un teléfono o un correo.',
     'y sin una forma de contactarlo tampoco');
  ok(faltaEnCliente(limpiarCliente({ nombre: 'Ana', correo: 'a@b.cl' })) === '',
     'el RUT y el domicilio no se piden para cotizar: los pide el contrato');

  ok(parecidos(limpiarCliente({ nombre: 'Otra', telefono: '912345678' }), lista)[0]?.id === 'C-0001',
     'el mismo teléfono escrito distinto es el mismo cliente: se pregunta antes de crear otro');
  ok(parecidos(limpiarCliente({ nombre: 'X', correo: 'ANA@correo.cl' }), lista).length === 1,
     'el mismo correo también');
  ok(parecidos(limpiarCliente({ nombre: 'X', correo: 'x@y.cl', rut: '12.345.678-5' }), lista)[0]?.id
       === 'C-0002', 'y el mismo RUT');
  ok(parecidos(limpiarCliente({ nombre: 'Ana Soto', correo: 'otra@y.cl' }), lista).length === 0,
     'el nombre solo NO: dos Ana Soto son dos personas hasta que algo más diga lo contrario');
  ok(parecidos(limpiarCliente({ nombre: 'Z', telefono: '' , correo: 'z@z.cl' }),
       [cl({ telefono: '', correo: '' })]).length === 0,
     'dos fichas sin teléfono no se parecen por eso');
  ok(parecidos(limpiarCliente({ nombre: 'Ana', telefono: '912345678' }), lista, 'C-0001').length === 0,
     'al editar una ficha no se parece a sí misma');

  ok(nuevoIdCliente([]) === 'C-0001', 'el primer cliente es el C-0001');
  ok(nuevoIdCliente(lista) === 'C-0003', 'y el siguiente sigue la cuenta');
  ok(nuevoIdCliente([{ id: 'C-0009' }, { id: 'raro' }]) === 'C-0010',
     'un id que no tiene la forma no rompe la cuenta');

  ok(buscarClientes(lista, 'perez').map((c) => c.id).join() === 'C-0002',
     'se busca sin tildes');
  ok(buscarClientes(lista, 'eventos').length === 1, 'y por la empresa');
  ok(buscarClientes(lista, '8765').map((c) => c.id).join() === 'C-0002',
     'y por un pedazo del teléfono');
  ok(buscarClientes(lista, '').length === 2, 'sin búsqueda, todos');

  const filas = [ENCABEZADO_CLIENTES, ...lista.map((c) => filaCliente(ENCABEZADO_CLIENTES, c))];
  ok(JSON.stringify(leerClientesDe(filas)) === JSON.stringify(lista),
     'una ficha va y vuelve de la planilla igual');
  ok(leerClientesDe([ENCABEZADO_CLIENTES, ['', 'Sin id']]).length === 0,
     'una fila sin id no es una ficha');

  // La migración de los presupuestos de antes de las fichas.
  const pres = [
    { id: 'P1', cliente: 'Ana Soto', email: '', telefono: '912345678', idCliente: '' },
    { id: 'P2', cliente: 'Empresa Nueva', email: 'compras@nueva.cl', telefono: '', idCliente: '' },
    { id: 'P3', cliente: 'Empresa nueva', email: '', telefono: '', idCliente: '' },
    { id: 'P4', cliente: 'Ya vinculado', email: '', telefono: '', idCliente: 'C-0002' },
    { id: 'P5', cliente: '', email: '', telefono: '', idCliente: '' }
  ];
  const m = migrarAClientes(pres, lista, 'jefe', 'hoy');
  ok(m.vinculos.P1 === 'C-0001', 'un presupuesto de un cliente que ya tiene ficha apunta a esa ficha');
  ok(m.nuevos.length === 1 && m.nuevos[0].id === 'C-0003' && m.nuevos[0].nombre === 'Empresa Nueva',
     'uno nuevo crea UNA ficha');
  ok(m.vinculos.P2 === 'C-0003' && m.vinculos.P3 === 'C-0003',
     'y dos presupuestos del mismo cliente quedan en esa misma ficha');
  ok(!('P4' in m.vinculos) && !('P5' in m.vinculos),
     'lo ya vinculado no se toca, y sin nombre no se inventa una ficha');
  ok(migrarAClientes(pres.map((p) => ({ ...p, idCliente: p.idCliente || 'C-0001' })), lista, 'j', 'h')
       .nuevos.length === 0, 'correrla dos veces no duplica');
}

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
ok(faltaCobrar(r({ estadoPago: 'partially_paid' })) && ocupaLugar(r({ estadoPago: 'partially_paid' })),
   'una abonada viene, y todavía hay que cobrarle el resto');
ok(pagoEnEspanol('partially_paid') === 'Abonada' && ESTADOS_QUE_VIENEN.includes('partially_paid'),
   'Abonada se dice en español y está entre las que vienen');
ok(pagoPorCobros(100000, 100000).estado === 'paid' && pagoPorCobros(100000, 100000).abonado === null,
   'cobros que cubren el total: Pagada');
ok(pagoPorCobros(100000, 30000).estado === 'partially_paid' && pagoPorCobros(100000, 30000).abonado === 30000,
   'cobros que cubren una parte: Abonada, con lo que entró');
ok(pagoPorCobros(100000, 0).estado === 'pending' && pagoPorCobros(0, 0).estado === 'pending',
   'sin cobros, o sin total: Por pagar');
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

/* ---------- privado exclusivo: el recinto completo ---------------------- */
// El cliente lo separo el 2026-11-02, y la distincion es del negocio: un dia
// privado corriente NO toma el recinto en exclusiva --pueden correr dos
// eventos privados a la vez-- y uno exclusivo si. La pregunta "cabe otro
// evento este dia?" tiene respuestas opuestas, y hasta ahi el panel no tenia
// donde anotarla.
console.log('\nPrivado exclusivo');

ok(esExclusiva('Privada exclusiva') && esExclusiva('privado exclusivo')
   && esExclusiva('EXCLUSIVA') && esExclusiva('Recinto completo'),
   'se reconoce escrito de varias formas');
ok(!esExclusiva(ESTADO_DIA.privada) && !esExclusiva(ESTADO_DIA.abierta)
   && !esExclusiva(ESTADO_DIA.cerrada) && !esExclusiva(''),
   'y un dia privado a secas NO es exclusivo: es justo lo que hay que distinguir');

// LA invariante: un exclusivo ES privado. Con eso, todo lo que ya trataba
// bien a un privado --el recorte para el sitio, el color, el conteo de la
// semana-- lo sigue tratando bien sin tocarse.
ok(esPrivada(ESTADO_DIA.exclusiva),
   'un dia exclusivo tambien es privado: no se ofrece en el sitio');
ok(!estaCerrado(ESTADO_DIA.exclusiva),
   'y NO esta cerrado: recibe reservas, tiene cupo, hay que cocinar');

const exclusivo = ocupacionDe(
  [r({ fecha: '2026-12-05', personas: 40 })],
  dia({ fecha: '2026-12-05', estado: ESTADO_DIA.exclusiva })
);
ok(exclusivo.exclusiva === true && exclusivo.privada === true,
   'la ocupacion marca las dos, nunca exclusiva sola');
ok(exclusivo.bloqueada === false, 'y no lo marca como cerrado');
ok(exclusivo.tomadas === 40 && exclusivo.quedan === 20,
   'cuenta sus reservas y su cupo como cualquier otro dia');
ok(paraElSitio([exclusivo]).length === 0,
   'y el sitio no lo ofrece, igual que un privado');
ok(privado.exclusiva === false,
   'mientras un privado corriente sigue sin ser exclusivo');

// Falla hacia lo menos restrictivo, al revés que estaCerrado(). Un
// exclusivo leido como privado deja cotizar un segundo evento y se descubre
// conversando; un privado leido como exclusivo le marca al socio la fecha
// como tomada y le hace perder una venta sin que nadie se entere.
ok(!ocupacionDe([], dia({ estado: 'Privada con bar' })).exclusiva,
   'lo que no se reconoce queda como privado, no como exclusivo');

// Anotar una reserva a mano abre el dia en privado, NUNCA en exclusivo:
// arrendar el recinto completo es una decision comercial, no el efecto
// secundario de anotar una reserva de telefono.
const cfgExcl = { ...POR_DEFECTO, cupoNormal: 60, horaApertura: '13:00' };
for (const antes of [undefined, dia({ estado: ESTADO_DIA.cerrada }),
                     dia({ capacidad: 0, estado: '' })]) {
  const d = diaParaReservaManual(antes, '2026-12-05', cfgExcl);
  ok(d === null || !esExclusiva(d.estado),
     'anotar una reserva NUNCA deja un dia exclusivo');
}
// Y uno que ya era exclusivo no se degrada a privado por anotarle una
// reserva mas: el segundo nombre de la misma empresa es lo normal.
ok(diaParaReservaManual(
     dia({ fecha: '2026-12-05', capacidad: 60, estado: ESTADO_DIA.exclusiva }),
     '2026-12-05', cfgExcl) === null,
   'ni le quita lo exclusivo a uno que ya lo era');

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

/* ---------- el equipo: dias de preparacion ---------- */
ok(esPreparacion({ conEquipo: true, abierto: false, personas: 0 }),
   'un dia cerrado con equipo asignado es preparacion');
ok(!esPreparacion({ conEquipo: false, abierto: false, personas: 0 }),
   'un dia cerrado y sin nadie asignado no es nada, no es preparacion');
ok(!esPreparacion({ conEquipo: true, abierto: true, personas: 0 }),
   'un dia abierto sin reservas es un dia flojo, no preparacion');
ok(!esPreparacion({ conEquipo: true, abierto: false, personas: 12 }),
   'y uno cerrado con gente adentro es un evento privado, tampoco');

/* ---------- el equipo: puestos ---------- */
ok(POR_DEFECTO_PUESTOS.length === 11,
   'los once puestos que nombró el cliente, comandero y copero incluidos');
ok(POR_DEFECTO_PUESTOS.some((p) => p.nombre === 'Parrillero')
   && POR_DEFECTO_PUESTOS.some((p) => p.nombre === 'Jefe de turno'),
   'con la parrilla y el jefe de turno, que antes no estaban');
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
{
  const { fila, ...sinFila } = tu({ trabajador: 'Ana', puesto: 'Barra' });
  ok(JSON.stringify(filaTurno(ENC_T, sinFila).slice(0, 3))
     === JSON.stringify(['2026-11-14', 'Ana', 'Barra']), 'un turno se escribe en sus celdas');
}

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
const { fila: _sinUsar, ...paraEscribir } = tu({ trabajador: 'Ana', puesto: 'Barra' });
const escrita = filaTurno(ENC_REVUELTO, paraEscribir);
ok(escrita[0] === 'Barra' && escrita[2] === 'Ana' && escrita[3] === '2026-11-14',
   'y al escribir, cada valor cae en SU columna');
ok(escrita[1] === '', 'una columna que no manejamos se escribe vacía, no se desplaza nada');
ok(leerTurnosDe([['Trabajador'], ['Ana']]).length === 0,
   'sin columna de fecha no se inventan turnos');

/* ---------- una persona, un puesto por día ---------- */
const plan = normalizarPlan([
  tu({ trabajador: 'Ana Pérez', puesto: 'Garzón' }),
  tu({ trabajador: 'Luis Soto', puesto: 'Cocina' }),
  tu({ trabajador: 'ANA PÉREZ', puesto: 'Barman' }),
  tu({ trabajador: '  ', puesto: 'Barra' }),
  tu({ fecha: 'cualquier cosa', trabajador: 'Juan', puesto: 'Barra' })
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
  { nombre: 'Ana Pérez', telefono: '', puesto: 'Garzón', activo: true, token: '',
    modalidad: MODALIDAD.porTurno, pagoJornada: 0, valorHora: 0, propina: true, banco: bancoVacio() },
  { nombre: 'luis soto', telefono: '', puesto: 'Cocina', activo: true, token: '',
    modalidad: MODALIDAD.porTurno, pagoJornada: 0, valorHora: 0, propina: true, banco: bancoVacio() }
];
const huerfanos = sinFicha(turnos, equipo);
ok(huerfanos.length === 1 && huerfanos[0] === 'Pedro Díaz',
   'avisa de quien tiene turnos y no está en la lista: pasa al renombrar a alguien');
ok(sinFicha(turnos, []).length === 3, 'sin lista de trabajadores, todos quedan sin ficha');
ok(!sinFicha([tu({ trabajador: 'LUIS SOTO', puesto: 'Cocina' })], equipo).length,
   'y no se queja por mayúsculas ni tildes');


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

// **La planilla semanal es del encargado** (2026-10-29): mandarla, crear su
// link y renovarlo cuando alguien deja el equipo. Lo que no tiene es
// `links`, que es lo que apaga la planilla del todo y administra los links
// personales de cada trabajador. Las dos cosas juntas son la prueba.
ok(puede(ROL.encargado, 'planilla') && !puede(ROL.encargado, 'links'),
   'el encargado manda y renueva la planilla, pero no toca los links personales');
ok(puede(ROL.admin, 'planilla'), 'y el administrador también la manda');
// Quien paga TAMBIÉN la manda, desde el 2026-11-01: tiene todo lo del
// encargado. El trabajador no — su acceso no pasa por la tabla de permisos.
ok(puede(ROL.pagos, 'planilla'), 'y quien paga también, que ahora opera como el encargado');
ok(!puede(ROL.trabajador, 'planilla'), 'el trabajador no: su acceso es su link personal');

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
  { nombre: 'Ana Pérez', telefono: '', puesto: 'Garzón', activo: true, token: 'token-de-ana', modalidad: MODALIDAD.porTurno, pagoJornada: 0, valorHora: 0, propina: true, banco: bancoVacio() },
  { nombre: 'Luis Soto', telefono: '', puesto: 'Cocina', activo: true, token: '', modalidad: MODALIDAD.porTurno, pagoJornada: 0, valorHora: 0, propina: true, banco: bancoVacio() },
  { nombre: 'Pedro Díaz', telefono: '', puesto: 'Runner', activo: false, token: 'token-de-pedro', modalidad: MODALIDAD.porTurno, pagoJornada: 0, valorHora: 0, propina: true, banco: bancoVacio() }
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
  tu({ fecha: '2026-11-15', trabajador: 'Ana Pérez', puesto: 'Barra', fila: 3 }),
  tu({ fecha: '2026-11-14', trabajador: 'ana perez', puesto: 'Garzón', fila: 2 }),
  tu({ fecha: '2026-11-01', trabajador: 'Ana Pérez', puesto: 'Garzón', fila: 4 }),
  tu({ fecha: '2026-11-14', trabajador: 'Luis Soto', puesto: 'Cocina', fila: 5 })
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
ok(!ROLES_DE_CUENTA.includes(ROL.trabajador),
   'el trabajador no es una cuenta del panel: entra por su link');
ok(ROLES_DE_CUENTA.every((r) => r !== ROL.ninguno),
   'y "ninguno" tampoco es un rol que se pueda asignar');
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


/* ---------- lo que vale un turno ---------- */
const jornada = { pagoJornada: 30000, valorHora: 4000 };

// **Planificar no es pagar.** Hasta que alguien diga que la persona llegó,
// el turno no suma: un día que nadie cerró no puede dar por pagadas quince
// jornadas.
ok(pagoDe(tu({ ...jornada, asistencia: VINO.sinMarcar })) === 0,
   'un turno sin pasar lista no vale nada todavía');
ok(pagoDe(tu({ ...jornada, asistencia: VINO.no })) === 0, 'y quien no llegó, tampoco');
ok(pagoDe(tu({ ...jornada, asistencia: VINO.si })) === 30000, 'quien vino cobra su jornada');
ok(pagoDe(tu({ ...jornada, asistencia: VINO.si, horasExtra: 2 })) === 38000,
   'las horas extra se multiplican por su valor hora');
ok(pagoDe(tu({ ...jornada, asistencia: VINO.si, ajustes: [{ monto: -5000, motivo: '' }] })) === 25000,
   'un ajuste negativo descuenta');
ok(pagoDe(tu({ ...jornada, asistencia: VINO.si, ajustes: [{ monto: 7000, motivo: '' }] })) === 37000,
   'y uno positivo suma');

// Un descuento mayor que la jornada deja el día en cero, no en negativo: si
// de verdad hay que cobrarle algo a alguien, eso no es un turno.
ok(pagoDe(tu({ ...jornada, asistencia: VINO.si, ajustes: [{ monto: -90000, motivo: '' }] })) === 0,
   'nunca queda en negativo');

/* ---------- contratado vs. por turno ---------- */
ok(esContratado('Contratado') && esContratado('contratada') && esContratado('CONTRATO'),
   'la modalidad se reconoce como la escriba una persona');
ok(!esContratado('') && !esContratado('Por turno'),
   'y en blanco es por turno, que es como funcionaba antes de la distinción');

const fijo = tu({ ...jornada, asistencia: VINO.si, modalidad: MODALIDAD.contratado });
ok(pagoDe(fijo) === 0,
   'un contratado no suma jornada: su sueldo no sale de esta caja');
ok(pagoDe({ ...fijo, horasExtra: 3 }) === 12000,
   'pero sus horas extra sí, que se pagan aparte');
ok(pagoDe({ ...fijo, ajustes: [{ monto: 5000, motivo: '' }] }) === 5000, 'y sus ajustes también');

const turnosDelSabado: Turno[] = [
  tu({ ...jornada, trabajador: 'Ana', asistencia: VINO.si }),
  tu({ ...jornada, trabajador: 'Luis', asistencia: VINO.si,
       modalidad: MODALIDAD.contratado }),
  tu({ ...jornada, trabajador: 'Pedro', asistencia: VINO.no }),
  tu({ ...jornada, trabajador: 'Juan', asistencia: VINO.sinMarcar }),
  tu({ ...jornada, trabajador: 'Otra', fecha: '2026-11-15', asistencia: VINO.si })
];
ok(costoDelDia(turnosDelSabado, '2026-11-14') === 30000,
   'el costo del día cuenta solo a quien vino y se le paga por turno');
ok(contratadosDelDia(turnosDelSabado, '2026-11-14') === 1,
   'y los contratados se cuentan aparte, porque no suman');
ok(costoDelDia(turnosDelSabado, '2026-11-15') === 30000, 'cada día cuenta lo suyo');
ok(costoDelDia(turnosDelSabado, '2026-12-25') === 0, 'un día sin turnos no cuesta nada');

/* ---------- el ajuste es el único monto con signo ---------- */
ok(aEntero('-5000') === 0, 'por defecto un monto negativo se recorta a cero');
ok(aEntero('-5000', true) === -5000, 'el ajuste sí admite negativos: un descuento lo es');
ok(aEntero('$44.000') === 44000, 'y se le entiende a un monto escrito a la chilena');


/* ---------- el rango de un periodo ---------- */
ok(JSON.stringify(rangoDelPeriodo('2026-11')) ===
   JSON.stringify({ desde: '2026-11-01', hasta: '2026-11-30' }),
   'un mes de 30 días termina el 30');
ok(rangoDelPeriodo('2026-12').hasta === '2026-12-31',
   'diciembre cruza el año sin salirse del mes');
ok(rangoDelPeriodo('2024-02').hasta === '2024-02-29', 'y febrero bisiesto tiene 29');
ok(rangoDelPeriodo('2026-02').hasta === '2026-02-28', 'el que no lo es, 28');

const semana = rangoDelPeriodo('2026-11-14');   // sábado
ok(semana.desde === '2026-11-09' && semana.hasta === '2026-11-15',
   'una semana va de lunes a domingo, aunque se pida con un sábado');
ok(rangoDelPeriodo('2026-11-09').desde === '2026-11-09',
   'y pedirla con su lunes da lo mismo');

/* ---------- el informe por periodo ---------- */
const mes: Turno[] = [
  // Ana: dos días, uno con horas extra y otro con descuento.
  tu({ trabajador: 'Ana', fecha: '2026-11-14', asistencia: VINO.si,
       pagoJornada: 30000, horasExtra: 2, valorHora: 4000 }),
  tu({ trabajador: 'Ana', fecha: '2026-11-15', asistencia: VINO.si,
       pagoJornada: 30000, ajustes: [{ monto: -5000, motivo: 'llegó tarde' }] }),
  // Luis contratado: su jornada no suma, sus horas extra sí.
  tu({ trabajador: 'Luis', fecha: '2026-11-14', asistencia: VINO.si,
       modalidad: MODALIDAD.contratado, pagoJornada: 30000,
       horasExtra: 3, valorHora: 4000 }),
  // Pedro no llegó, y tiene un turno que nadie cerró.
  tu({ trabajador: 'Pedro', fecha: '2026-11-14', asistencia: VINO.no,
       pagoJornada: 30000 }),
  tu({ trabajador: 'Pedro', fecha: '2026-11-21', asistencia: VINO.sinMarcar,
       pagoJornada: 30000 }),
  // Otro mes: no entra.
  tu({ trabajador: 'Ana', fecha: '2026-12-05', asistencia: VINO.si,
       pagoJornada: 99000 })
];

const noviembre = informeDelPeriodo(mes, '2026-11-01', '2026-11-30');
ok(noviembre.length === 3, 'una línea por persona con turnos en el periodo');
ok(noviembre[0].trabajador === 'Ana', 'ordenado por lo que más se paga');
ok(noviembre[0].total === 30000 + 8000 + 30000 - 5000,
   'suma jornadas, horas extra y ajustes de los días que vino');
ok(noviembre[0].dias === 2 && noviembre[0].horasExtra === 2,
   'y cuenta los días y las horas');
ok(noviembre[0].ajustes === -5000, 'los ajustes conservan su signo');

const luis = noviembre.find((l) => l.trabajador === 'Luis')!;
ok(luis.jornadas === 0, 'un contratado suma cero en jornadas');
ok(luis.total === 12000, 'pero sus horas extra sí se le pagan');

// Quien no vino y quien quedó sin marcar NO desaparecen: si desaparecieran,
// un día que nadie cerró se leería como que esa persona no trabajó.
const pedro = noviembre.find((l) => l.trabajador === 'Pedro')!;
ok(pedro.total === 0 && pedro.dias === 0, 'quien no llegó no cobra');
ok(pedro.noVino === 1 && pedro.sinMarcar === 1,
   'pero aparece igual, con sus turnos no venidos y sin marcar a la vista');

ok(informeDelPeriodo(mes, '2026-12-01', '2026-12-31')[0].total === 99000,
   'otro mes cuenta lo suyo');
ok(informeDelPeriodo(mes, '2026-11-09', '2026-11-15')
     .find((l) => l.trabajador === 'Ana')!.dias === 2,
   'la misma función sirve para una semana: es un rango de fechas');
ok(informeDelPeriodo(mes, '2026-11-16', '2026-11-22')
     .every((l) => l.dias === 0),
   'una semana sin nadie trabajado no inventa días');
ok(informeDelPeriodo([], '2026-11-01', '2026-11-30').length === 0,
   'sin turnos no hay informe');

// Un dia de preparacion —martes, cerrado al publico— se paga igual que
// cualquier otro: el informe no sabe ni tiene por que saber si el dia abria.
// Lo fija una prueba para que a nadie se le ocurra filtrarlo despues.
const preparacion = informeDelPeriodo([
  tu({ trabajador: 'Ana', fecha: '2026-11-10', asistencia: VINO.si,  // martes
       pagoJornada: 30000, ajustes: [{ monto: 10000, motivo: 'montaje, acuerdo aparte' }] })
], '2026-11-01', '2026-11-30');
ok(preparacion[0].dias === 1 && preparacion[0].total === 40000,
   'un dia de preparacion entra al informe, con su ajuste por acuerdo especial');

/* ---------- los periodos que existen ---------- */
ok(JSON.stringify(mesesConTurnos(mes)) === JSON.stringify(['2026-12', '2026-11']),
   'los meses con turnos van del más nuevo al más viejo');
const sem = semanasConTurnos(mes);
ok(sem[0] === '2026-11-30' && sem.includes('2026-11-09'),
   'y las semanas se listan por su lunes, también de la más nueva a la más vieja');
ok(new Set(sem).size === sem.length, 'sin repetir una semana con varios turnos');


/* ---------- el rol de pagos ---------- */
ok(puede(ROL.pagos, 'informe'), 'quien hace los pagos lee el informe');
ok(ROLES_DE_CUENTA.includes(ROL.pagos), 'y se le puede crear una cuenta');

const todas = Object.keys(PERMISOS) as Accion[];

// **La regla del rol, desde el 2026-11-01: `pagos` es el encargado MÁS
// `pagar`, y nada más.** Antes era una cuenta mínima de una sola acción y
// el cliente lo corrigió: quien paga también opera. Se fija como relación
// entre los dos roles y no como un conteo, porque el conteo había que venir
// a corregirlo cada vez que la tabla crecía — y una prueba que se corrige
// sola a mano deja de proteger.
const deEncargado = todas.filter((a) => puede(ROL.encargado, a));
const dePagos = todas.filter((a) => puede(ROL.pagos, a));
ok(deEncargado.every((a) => puede(ROL.pagos, a)),
   'quien paga puede todo lo que puede el encargado: no es un rol más chico');
ok(deEncargado.length < dePagos.length,
   'y puede más cosas que él: es el segundo rol más poderoso, no uno más chico');

// **Lo que define al rol, desde el 2026-11-01: puede todo MENOS dos cosas.**
// Lo fijó el cliente — *"el encargado de pago básicamente tiene todos los
// derechos más amplios del panel, menos el administrador, que puede tomar
// ciertas configuraciones, roles, etc."*. Se escribe como la lista de lo que
// NO puede, porque es corta y es la que importa: cualquier permiso nuevo que
// se agregue a la tabla y no esté acá, lo tiene.
const soloDelAdmin = todas.filter((a) => !puede(ROL.pagos, a)).sort();
ok(soloDelAdmin.join() === 'mantencion,usuarios',
   'solo dos cosas quedan fuera: las cuentas del panel y la mantención técnica');
ok(!puede(ROL.pagos, 'usuarios'),
   'las cuentas del panel NO: quien paga no se cambia el rol a sí mismo ni crea un administrador');
ok(!puede(ROL.pagos, 'mantencion'),
   'ni Shopify a mano ni el diagnóstico: eso es mantener el sistema, no operarlo');
ok(puede(ROL.pagos, 'links') && puede(ROL.pagos, 'puestos')
   && puede(ROL.pagos, 'bitacora') && puede(ROL.pagos, 'configurar'),
   'pero sí los links personales, los puestos, la bitácora y la configuración');

// **`sueldos` y `links` siguen siendo dos permisos y no uno.** Hoy los tiene
// el mismo par de roles, así que no discriminan entre ellos — y se dejan
// separados igual, porque son cosas distintas: uno es plata y el otro una
// credencial. La costura está para el día que un rol necesite lo uno sin lo
// otro, que es exactamente lo que no se pudo hacer mientras eran `esAdmin`.
ok(!puede(ROL.encargado, 'sueldos') && !puede(ROL.encargado, 'links'),
   'el encargado no tiene ninguno de los dos: ni cuánto gana cada compañero ni su link');
ok(puede(ROL.pagos, 'pagar'), 'quien paga puede registrar que pagó');
ok(!puede(ROL.encargado, 'pagar'),
   'el encargado NO: ve el informe, pero declarar que una plata salió es otra cosa');


ok(puede(ROL.admin, 'informe'), 'el administrador lo sigue viendo');

// **El encargado lo ve desde el 2026-11-01**, por decisión del cliente y
// declaradamente provisoria. La prueba lo fija igual: si mañana se le quita,
// que sea porque alguien lo decidió y vino a cambiar esta línea.
ok(puede(ROL.encargado, 'informe'),
   'y el encargado también, por ahora: lo liberó el cliente hasta definir la lista fina');


/* ---------- el rol de vendedor (2026-11-05) ---------- */
// Lo pidió el cliente: *"el vendedor solo tiene que ver el calendario para
// poder agregar reservas, quitar reservas. Reservas que el vendedor mismo ha
// hecho. No puede quitar otras reservas que no él mismo está gestionando.
// Pero ver todo. Y en verdad no necesita ver nada más que esto."*

ok(ROLES_DE_CUENTA.includes(ROL.vendedor), 'se le puede crear una cuenta');

// **Se escribe como la lista completa de lo que puede, al revés que `pagos`.**
// Ahí la lista corta era la de lo que NO puede; acá es la de lo que sí, y por
// el mismo motivo: es la corta, y es la que importa. Un permiso nuevo que se
// agregue a la tabla **no** entra en este rol sin que alguien venga a esta
// línea a ponerlo, que es exactamente lo que se quiere de la cuenta más
// acotada del panel.
const deVendedor = todas.filter((a) => puede(ROL.vendedor, a)).sort();
ok(deVendedor.join() === 'clientes,presupuestos,reservas,ver',
   'cuatro permisos y ninguno más: el calendario, sus reservas, las fichas de clientes y cotizar');
ok(!puede(ROL.vendedor, 'dias'),
   'no abre ni cierra días: eso le cambiaría el cupo al sitio público');
ok(!puede(ROL.vendedor, 'equipo') && !puede(ROL.vendedor, 'extras'),
   'ni el equipo ni los jinetes: ahí viven teléfonos y montos que no son suyos');
ok(puede(ROL.vendedor, 'presupuestos'),
   'cotiza desde el 2026-11-10: es su trabajo (ve todas, edita solo las suyas)');
ok(!puede(ROL.vendedor, 'informe') && !puede(ROL.vendedor, 'pagar')
   && !puede(ROL.vendedor, 'sueldos') && !puede(ROL.vendedor, 'links'),
   'nada de plata, y ningún link personal de nadie');

// **Las cuatro rutas que se contentaban con `ver` y no devuelven reservas.**
// Para los tres roles de antes daba lo mismo —los tres tenían todo— y al
// entrar el vendedor se volvió la diferencia entre "ve el calendario" y "ve
// los teléfonos del equipo". Cada una pide ahora el permiso de su pantalla,
// y esto lo fija: si alguna volviera a `ver`, el vendedor la abriría.
ok(puede(ROL.vendedor, 'ver') && !puede(ROL.vendedor, 'equipo'),
   '`ver` ya no alcanza para el equipo: son dos permisos distintos');

/* --- qué reservas puede tocar --- */
// La tabla contesta *qué acciones*; esto, *sobre qué filas*. Es una pregunta
// distinta y por eso vive aparte, en `puedeTocarReserva()`.
ok(puedeTocarReserva(ROL.vendedor, 'ana', 'ana'),
   'un vendedor edita y borra la reserva que anotó él');
ok(!puedeTocarReserva(ROL.vendedor, 'ana', 'luis'),
   'y NO la que anotó otro: es lo que pidió el cliente');
ok(puedeTocarReserva(ROL.vendedor, 'Ana', 'ana ')
   && puedeTocarReserva(ROL.vendedor, 'JOSÉ', 'jose'),
   'el nombre se compara sin mayúsculas, sin tildes y sin espacios al borde');

// **Una reserva sin dueño no es de nadie, y por lo tanto tampoco suya.** Lo
// están todas las de Shopify —las anota el webhook— y todas las que ya
// estaban en la planilla antes de que existiera la columna. El error
// contrario —un vendedor nuevo pudiendo borrar el historial completo— es
// mucho más caro.
ok(!puedeTocarReserva(ROL.vendedor, 'ana', ''),
   'una reserva sin "Anotada por" —de Shopify, o vieja— no es suya');
ok(!puedeTocarReserva(ROL.vendedor, '', ''),
   'y un usuario vacío no se empareja con una fila vacía: eso las abriría todas');

// Para los tres roles de siempre no cambió nada, y eso también se fija: el
// límite es del vendedor, no una regla nueva para todos.
for (const r of [ROL.admin, ROL.encargado, ROL.pagos]) {
  ok(puedeTocarReserva(r, 'quien sea', 'otro') && puedeTocarReserva(r, 'x', ''),
     `${r} sigue pudiendo tocar cualquier reserva, con dueño o sin él`);
}
ok(!puedeTocarReserva(ROL.trabajador, 'ana', 'ana'),
   'y quien no tiene el permiso de reservas no toca ni la que lleve su nombre');


/* ---------- la propina ---------- */
const todos = () => true;
const equipoDelSabado = [
  tu({ trabajador: 'Ana', asistencia: VINO.si }),
  tu({ trabajador: 'Luis', asistencia: VINO.si }),
  tu({ trabajador: 'Pedro', asistencia: VINO.si })
];

const repartida = repartirPropina(equipoDelSabado, 90000, todos);
ok(repartida.every((t) => t.propina === 30000), 'se reparte en partes iguales');

// **Hasta el último peso.** 100.000 entre tres da 33.333 y sobran 2: en vez
// de perderlos o dejar decimales que nadie entrega en efectivo, se le da un
// peso de más a los primeros.
const conResto = repartirPropina(equipoDelSabado, 100000, todos);
ok(conResto.reduce((s, t) => s + t.propina, 0) === 100000,
   'la suma de las partes es exactamente el total');
ok(conResto[0].propina === 33334 && conResto[2].propina === 33333,
   'y el peso que sobra se le da a los primeros, no se pierde');

// Las dos condiciones son distintas: no venir es un hecho del día, no
// participar es una decisión sobre la persona.
const conAusente = repartirPropina([
  ...equipoDelSabado, tu({ trabajador: 'Juan', asistencia: VINO.no })
], 90000, todos);
ok(conAusente.find((t) => t.trabajador === 'Juan')!.propina === 0,
   'quien no vino no recibe propina');
ok(conAusente.find((t) => t.trabajador === 'Ana')!.propina === 30000,
   'y los que vinieron siguen repartiéndose el total entre ellos');

const sinPedro = repartirPropina(equipoDelSabado, 90000, (n) => n !== 'Pedro');
ok(sinPedro.find((t) => t.trabajador === 'Pedro')!.propina === 0,
   'quien no participa no recibe, aunque haya venido');
ok(sinPedro.find((t) => t.trabajador === 'Ana')!.propina === 45000,
   'y su parte se reparte entre los demás, no se guarda');

ok(repartirPropina(equipoDelSabado, 0, todos).every((t) => t.propina === 0),
   'sin propina nadie recibe nada');
ok(repartirPropina(equipoDelSabado, -5000, todos).every((t) => t.propina === 0),
   'una propina negativa no existe: queda en cero');
ok(repartirPropina(equipoDelSabado, 90000, () => false).every((t) => t.propina === 0),
   'si nadie participa, la propina no se le queda a nadie');
ok(repartirPropina([tu({ trabajador: 'Ana', asistencia: VINO.sinMarcar })], 90000, todos)[0]
   .propina === 0, 'sin pasar lista tampoco se reparte: todavía no se sabe quién vino');

// Volver a repartir el mismo pozo tiene que dar lo mismo, no acumular.
const dosVeces = repartirPropina(repartirPropina(equipoDelSabado, 90000, todos), 90000, todos);
ok(dosVeces.every((t) => t.propina === 30000), 'repartir dos veces no acumula');

ok(propinaDelDia(repartida.map((t) => ({ ...t, fila: 2 })), '2026-11-14') === 90000,
   'el total del día se recupera sumando las partes');

// **La propina NO es sueldo.** Si entrara en pagoDe(), el costo de un sábado
// subiría porque los clientes dejaron más propina.
ok(pagoDe(tu({ asistencia: VINO.si, pagoJornada: 30000, propina: 50000 })) === 30000,
   'la propina no entra en lo que se le paga por el turno');
ok(costoDelDia([tu({ asistencia: VINO.si, pagoJornada: 30000, propina: 50000 })],
   '2026-11-14') === 30000, 'ni en lo que cuesta el equipo del día');

const conPropinas = informeDelPeriodo([
  tu({ trabajador: 'Ana', fecha: '2026-11-14', asistencia: VINO.si,
       pagoJornada: 30000, propina: 12000 })
], '2026-11-01', '2026-11-30');
ok(conPropinas[0].propina === 12000 && conPropinas[0].total === 30000,
   'y en el informe va en su propia columna, aparte del total');


/* ---------- Actividades extras: jinetes, pintacaritas, castillo ---------- */

console.log('\nActividades extras');

const co = (p: Partial<Colaborador>): Colaborador => ({
  nombre: 'Jinete', actividad: 'Show ecuestre', telefono: '', activo: true,
  monto: 0, banco: bancoVacio(), ...p
});
const ex = (p: Partial<Extra>): Extra => ({
  fecha: '2026-11-14', colaborador: 'Jinete', actividad: 'Show ecuestre',
  estado: VINO.si, monto: 50000, ajuste: 0, motivo: '', fila: 2, ...p
});

// **Las actividades extras NO reciben propina**, y eso se fija acá para que
// agregar una columna a la planilla no se la regale sin que nadie se entere.
ok(!Object.values(COL_ACTIVIDADES).some((c) => normalizar(c).includes('propina')),
   'la pestaña Actividades no tiene columna de propina');
ok(!Object.values(COL_COLABORADORES).some((c) => normalizar(c).includes('propina')),
   'ni la ficha del colaborador: no participa del reparto');

// Agendar no es pagar, igual que un turno sin pasar lista.
ok(costoDeExtra(ex({ estado: '' })) === 0, 'sin confirmar no cuesta nada');
ok(costoDeExtra(ex({ estado: VINO.no })) === 0, 'y si no vino, tampoco');
ok(costoDeExtra(ex({ monto: 50000, ajuste: 10000, motivo: '' })) === 60000,
   'confirmada cuesta el monto más el ajuste');
ok(costoDeExtra(ex({ monto: 50000, ajuste: -80000, motivo: '' })) === 0,
   'un descuento mayor que el monto deja el día en cero, nunca en negativo');

// --- Las fichas (posicionales: la pestaña se reescribe entera) ---
const fichas = leerColaboradoresDe([
  Object.values(COL_COLABORADORES) as string[],
  ['Pedro Soto', 'Show ecuestre', '+56 9 1111 1111', 'Sí', '50000',
   'transferir los lunes', 'Juana Soto', '11.111.111-1', 'BancoEstado',
   'Cuenta vista', '123-456', 'juana@ejemplo.cl'],
  ['Carla Díaz', 'Pintacaritas', '', 'No', '', ''],
  ['', 'Castillo inflable', '', 'Sí', '80000', ''],
  ['pedro soto', 'Otra cosa', '', 'Sí', '999', '']
]);
ok(fichas.length === 2, 'una fila sin nombre no es una ficha, y un nombre repetido no entra dos veces');
ok(fichas[0].monto === 50000 && fichas[0].banco.numero === '123-456'
   && fichas[0].banco.titular === 'Juana Soto'
   && fichas[0].banco.nota === 'transferir los lunes',
   'el monto habitual y los datos de la transferencia se leen de la ficha');
ok(fichas[1].activo === false && fichas[1].monto === 0,
   'un monto en blanco es "sin poner", que es cero, y "No" desactiva');

// Una planilla escrita antes de que existieran las columnas del banco se
// lee igual: quedan en blanco en vez de reventar.
const viejas = leerColaboradoresDe([
  ['Nombre', 'Actividad', 'Teléfono', 'Activo', 'Monto habitual'],
  ['Pedro Soto', 'Show ecuestre', '', 'Sí', '50000']
]);
ok(viejas.length === 1 && viejas[0].banco.numero === ''
   && viejas[0].banco.nota === '',
   'sin las columnas del banco la ficha se lee con todo en blanco');

const filasFichas = aFilasColaboradores([
  co({ nombre: 'Pedro Soto', monto: 50000,
       banco: { ...bancoVacio(), numero: '123-456', banco: 'BancoEstado',
                tipo: 'Cuenta vista', rut: '11.111.111-1' } }),
  co({ nombre: 'Carla Díaz', actividad: 'Pintacaritas', activo: false, monto: 0 })
]);
ok(filasFichas[0].length === Object.keys(COL_COLABORADORES).length,
   'el encabezado que se escribe tiene todas las columnas');
ok(filasFichas[1][4] === '50000' && filasFichas[2][4] === '',
   'un monto en cero se escribe en blanco, para que no se lea como "cobra cero"');
const ida = leerColaboradoresDe(filasFichas);
ok(ida.length === 2 && ida[0].banco.numero === '123-456'
   && ida[0].banco.tipo === 'Cuenta vista' && ida[1].activo === false,
   'escribir y volver a leer da lo mismo');

ok(JSON.stringify(actividadesConocidas([
  co({ actividad: 'Pintacaritas' }), co({ actividad: 'pintacaritas' }),
  co({ actividad: 'Castillo inflable' }), co({ actividad: '' })
])) === JSON.stringify(['Castillo inflable', 'Pintacaritas']),
   'las actividades salen de las fichas, sin repetir ni vacías');

// --- Los días (por nombre de columna, como Turnos) ---
// A propósito con las columnas en otro orden y una de más: así se guarda una
// pestaña a la que le van a crecer columnas.
const filasDias = [
  ['Colaborador', 'Monto', 'Fecha', 'Vino', 'Nota del dueño', 'Ajuste',
   'Motivo del ajuste', 'Actividad'],
  ['Pedro Soto', '50000', '2026-11-14', 'Sí', 'lo que sea', '10000',
   'montaje aparte', 'Show ecuestre'],
  ['Carla Díaz', '40000', '2026-11-14', '', '', '', '', 'Pintacaritas'],
  ['Pedro Soto', '50000', '2026-11-15', 'No', '', '', '', 'Show ecuestre'],
  ['Sin fecha', '1', '', 'Sí', '', '', '', ''],
  ['', '1', '2026-11-14', 'Sí', '', '', '', '']
];
const dias = leerExtrasDe(filasDias);
ok(dias.length === 3, 'una fila sin fecha o sin nombre no es una actividad');
ok(dias[0].monto === 50000 && dias[0].ajuste === 10000
   && dias[0].motivo === 'montaje aparte',
   'las columnas se encuentran por nombre, en cualquier orden');
ok(dias[0].fila === 2 && dias[2].fila === 4,
   'y cada una recuerda su fila, que es lo que permite borrarla');
ok(leerExtrasDe([['Colaborador', 'Monto']]).length === 0,
   'sin la columna Fecha no se interpreta nada, en vez de inventar actividades');

const fila = filaExtra(filasDias[0], {
  fecha: '2026-11-21', colaborador: 'Pedro Soto', actividad: 'Show ecuestre',
  estado: VINO.si, monto: 50000, ajuste: 0, motivo: ''
});
ok(fila.length === filasDias[0].length && fila[2] === '2026-11-21'
   && fila[0] === 'Pedro Soto' && fila[1] === '50000',
   'y al escribir, cada valor va en la columna que le toca, no en la primera libre');
ok(fila[4] === '' && fila[5] === '',
   'una columna que el panel no conoce se deja en blanco, no se pisa');

ok(extrasDelDia(dias, '2026-11-14').length === 2, 'el día trae sus dos actividades');
ok(costoExtrasDelDia(dias, '2026-11-14') === 60000,
   'y cuesta solo lo confirmado: la de Carla todavía no cuenta');
ok(costoExtrasDelDia(dias, '2026-11-15') === 0, 'un día donde no vino nadie cuesta cero');

const unaLinea = normalizarExtras([
  { fecha: '2026-11-14', colaborador: 'Pedro Soto', actividad: 'Show ecuestre',
    estado: '', monto: 50000, ajuste: 0, motivo: '' },
  { fecha: '2026-11-14', colaborador: 'pedro  soto', actividad: 'Pintacaritas',
    estado: VINO.si, monto: 70000, ajuste: 0, motivo: '' },
  { fecha: '2026-11-14', colaborador: '  ', actividad: '', estado: '',
    monto: 0, ajuste: 0, motivo: '' }
]);
ok(unaLinea.length === 1 && unaLinea[0].monto === 70000,
   'una línea por colaborador y gana la última, como el plan del equipo');
ok(unaLinea[0].colaborador === 'pedro  soto',
   'y el nombre se guarda como se escribió, sin los espacios de los bordes');

// --- El informe ---
const informe = informeDeExtras([
  ex({ colaborador: 'Pedro Soto', fecha: '2026-11-14', monto: 50000, ajuste: 10000, motivo: '' }),
  ex({ colaborador: 'Pedro Soto', fecha: '2026-11-15', monto: 50000 }),
  ex({ colaborador: 'Pedro Soto', fecha: '2026-11-16', estado: VINO.no }),
  ex({ colaborador: 'Carla Díaz', actividad: 'Pintacaritas', fecha: '2026-11-14',
       estado: '', monto: 40000 }),
  ex({ colaborador: 'Pedro Soto', fecha: '2026-10-31', monto: 999999 })
], '2026-11-01', '2026-11-30', new Map([[normalizar('Pedro Soto'),
     { ...bancoVacio(), numero: '123-456' }]]));

ok(informe.length === 2, 'una línea por colaborador');
ok(informe[0].colaborador === 'Pedro Soto' && informe[0].total === 110000,
   'suma los días confirmados del periodo y deja fuera lo de otro mes');
ok(informe[0].dias === 2 && informe[0].noVino === 1 && informe[0].sinConfirmar === 0,
   'cuenta los días que vino y los que no, por separado');
ok(informe[0].montos === 100000 && informe[0].ajustes === 10000,
   'los ajustes se ven aparte de los montos, igual que en el equipo');
ok(informe[0].banco.numero === '123-456' && informe[1].banco.numero === '',
   'los datos del banco los pone quien llama, desde las fichas');
ok(informe[1].total === 0 && informe[1].sinConfirmar === 1,
   'quien quedó sin confirmar aparece con total cero, no desaparece');
ok(informe[1].actividad === 'Pintacaritas',
   'y cada línea dice qué hizo, que es lo que distingue a un jinete de una pintacaritas');
ok(informeDeExtras([ex({ colaborador: '  ' })], '2026-11-01', '2026-11-30').length === 0,
   'una actividad sin nombre no arma una línea');


/* ---------- Los datos de la transferencia ---------- */

console.log('\nDatos bancarios');

const bc = (p: Partial<Banco>): Banco => ({ ...bancoVacio(), ...p });

// **Lo que falta para transferir**, que es lo que el informe avisa antes de
// que alguien se siente a pagar con la planilla ya bajada.
ok(!sePuedeTransferir(bancoVacio()), 'una ficha vacía no permite transferir');
ok(JSON.stringify(faltaParaTransferir(bancoVacio()))
   === JSON.stringify(['banco', 'tipo de cuenta', 'número', 'RUT']),
   'y dice exactamente qué le falta, en palabras');
const bancoCompleto = bc({ banco: 'BancoEstado', tipo: 'Cuenta vista',
                      numero: '12345678', rut: '11.111.111-1' });
ok(sePuedeTransferir(bancoCompleto), 'con banco, tipo, número y RUT ya se puede');
ok(faltaParaTransferir(bancoCompleto).length === 0, 'y no falta nada');

// **El titular y el correo NO son obligatorios**, y por motivos distintos.
ok(sePuedeTransferir({ ...bancoCompleto, titular: '', correo: '' }),
   'sin titular ni correo se transfiere igual');
ok(titularDe(bancoCompleto, 'Ana Soto') === 'Ana Soto',
   'el titular en blanco es la propia persona: es el caso normal');
ok(titularDe({ ...bancoCompleto, titular: 'Juana Soto' }, 'Ana Soto') === 'Juana Soto',
   'y cuando la cuenta es de otra persona, manda el titular');

// El RUT se empareja para que la carga masiva del banco lo acepte, pero no
// se valida: el panel no está para corregirle el RUT a nadie.
ok(rutLimpio('12.345.678-9') === '12345678-9', 'se le quitan los puntos');
ok(rutLimpio('123456789') === '12345678-9', 'y se le pone el guion si no venía');
ok(rutLimpio('9.876.543-k') === '9876543-K', 'la K va en mayúscula');
ok(rutLimpio('  7.654.321-0 ') === '7654321-0', 'los espacios de los bordes no cuentan');
ok(rutLimpio('no es un rut') === 'no es un rut',
   'lo que no parece un RUT se devuelve tal cual, sin inventar');
ok(rutLimpio('') === '', 'y un RUT vacío sigue vacío');

// **El tipo de cuenta es una lista cerrada.** Un valor inventado llegaría
// hasta la planilla del banco, así que se descarta en el servidor.
ok(limpiarBanco({ tipo: 'Cuenta corriente' }).tipo === 'Cuenta corriente',
   'un tipo de la lista se guarda');
ok(limpiarBanco({ tipo: 'cuenta de la abuela' }).tipo === '',
   'y uno inventado se descarta, en vez de viajar a la planilla del banco');
ok(TIPOS_CUENTA.length === 4, 'los tipos de cuenta en Chile son cuatro');
ok(limpiarBanco({ numero: '  123  ', banco: ' BancoEstado ' }).numero === '123'
   && limpiarBanco({ banco: ' BancoEstado ' }).banco === 'BancoEstado',
   'lo que venga del navegador se recorta');
ok(limpiarBanco(undefined).numero === '' && limpiarBanco(null).rut === '',
   'y si no viene nada, la ficha queda vacía en vez de reventar');

// Ida y deLaFila por la planilla, con la nota en su columna aparte —la que
// antes era toda la cuenta bancaria en texto libre—.
const filaBco = [
  'Pedro Soto', 'Show ecuestre', 'Sí',      // lo de la ficha, antes
  'la nota',                                 // la columna vieja de texto libre
  ...filaBanco(bc({
    titular: 'Juana Soto', rut: '11111111-1', banco: 'BancoEstado',
    tipo: 'Cuenta RUT', numero: '11111111', correo: 'juana@ejemplo.cl'
  }))
];
const deLaFila = leerBanco(filaBco, 4, 3);
ok(deLaFila.titular === 'Juana Soto' && deLaFila.numero === '11111111'
   && deLaFila.tipo === 'Cuenta RUT' && deLaFila.correo === 'juana@ejemplo.cl',
   'escribir y volver a leer devuelve los mismos campos');
ok(deLaFila.nota === 'la nota',
   'y la nota se lee de su propia columna, que es la vieja de texto libre');
ok(leerBanco([], 3, 2).banco === '',
   'una fila que no existe se lee vacía, no explota');
ok(Object.keys(COL_BANCO).length === 6 && filaBanco(bancoVacio()).length === 6,
   'seis campos y seis columnas: el encabezado y la fila no se pueden desalinear');

// **Los datos del banco son del administrador.** Igual que los sueldos: no
// hay ninguna pantalla de encargado que los reciba, y hay una prueba de la
// tabla de permisos que lo fija más arriba.
ok(!puede(ROL.encargado, 'configurar') && puede(ROL.admin, 'configurar'),
   'la plata y la configuración siguen siendo solo del administrador');


/* ---------- Teléfonos y correos con forma ---------- */

console.log('\nTeléfonos y correos');

// **La regla que se le pide a quien escribe**: el celular con el 9 y sin
// el +56. Pero se acepta como la gente lo escribe de verdad.
for (const escrito of ['912345678', '9 1234 5678', '+56912345678',
                       '+56 9 1234 5678', '56 9 1234-5678', '(9) 1234 5678',
                       '0 9 1234 5678', '  912345678  ']) {
  ok(telefonoNormal(escrito) === '+56 9 1234 5678',
     `"${escrito}" se guarda como +56 9 1234 5678`);
}
ok(telefonoParaEnlace('9 1234 5678') === '56912345678',
   'y para un enlace sale sin signos, como lo quiere WhatsApp');
ok(enlaceWhatsApp('9 1234 5678') === 'https://wa.me/56912345678',
   'de ahí sale el link directo a su conversación');
ok(enlaceWhatsApp('9 1234 5678', 'Hola Ana')
   === 'https://wa.me/56912345678?text=Hola%20Ana',
   'con el mensaje ya codificado, si se le pone uno');

// **No se inventa el 9.** Ocho dígitos no son un celular al que le falte
// el nueve: son un número que no sabemos leer, y completarlo mandaría un
// mensaje a un desconocido.
ok(celularChileno('12345678') === '', 'ocho dígitos no se completan solos');
ok(/falta el 9/.test(avisoTelefono('1234 5678')),
   'y la pantalla dice justamente eso: que parece faltarle el 9');

// Lo que no es un celular chileno se guarda tal cual, con su marca.
ok(telefonoNormal('22 2345 6789') === '22 2345 6789',
   'un fijo se guarda como se escribió, sin que el panel lo corrija');
ok(telefonoNormal('+1 415 555 0132') === '+1 415 555 0132',
   'y un número extranjero también');
ok(avisoTelefono('+1 415 555 0132').includes('WhatsApp'),
   'pero se avisa que con ese no se va a poder automatizar');
ok(enlaceWhatsApp('22 2345 6789') === '',
   'un fijo no da link: vacío es la señal de que no hay nada que ofrecer');
ok(telefonoNormal('') === '' && avisoTelefono('') === '',
   'un campo vacío no es un error: todavía no lo han llenado');
ok(telefonoNormal('pregunta por Juan') === 'pregunta por Juan',
   'y lo que claramente no es un número tampoco se toca');

// Un número ya normalizado no cambia al volver a guardarse: si cambiara,
// cada guardado movería el dato y las comparaciones fallarían.
ok(telefonoNormal(telefonoNormal('912345678')) === telefonoNormal('912345678'),
   'normalizar dos veces da lo mismo que normalizar una');

// Correos: minúsculas y sin bordes, y una validación deliberadamente simple
// —lo único que se puede atrapar acá es un error de tipeo evidente—.
ok(correoNormal('  Ana@Ejemplo.CL ') === 'ana@ejemplo.cl',
   'el correo se guarda en minúsculas y sin espacios');
ok(correoValido('ana@ejemplo.cl') && correoValido('a.b+c@sub.dominio.com'),
   'un correo normal pasa');
for (const malo of ['ana@ejemplo', 'ana ejemplo.cl', '@ejemplo.cl',
                    'ana@.cl', 'ana@ejemplo.c', 'a@b.cl, c@d.cl']) {
  ok(!correoValido(malo), `"${malo}" no pasa por correo`);
}
ok(avisoCorreo('') === '', 'un correo vacío no reclama');
ok(avisoCorreo('ana@ejemplo') !== '', 'uno a medio escribir sí');

// **La misma forma venga de donde venga.** Una reserva de Shopify y una
// anotada a mano tienen que quedar indistinguibles, que es lo que permite
// automatizar algo después sin adivinar el formato fila por fila.
ok(telefonoDe({ billing_address: { phone: '+56 9 8765 4321' } } as PedidoShopify)
   === '+56 9 8765 4321', 'el teléfono de un pedido se guarda normalizado');
ok(telefonoDe({ phone: '987654321' } as PedidoShopify) === '+56 9 8765 4321',
   'aunque el cliente lo haya escrito pelado en el checkout');
ok(emailDe({ email: 'Ana@Ejemplo.CL' } as PedidoShopify) === 'ana@ejemplo.cl',
   'y el correo en minúsculas');


/* ---------- Varios ajustes por turno ---------- */

console.log('\nPresupuestos: la capa que no toca el cupo');

{
  const HOY = '2026-11-01';
  const pre = (x: Partial<Presupuesto>): Presupuesto => ({
    id: 'PRE-1', fecha: '2026-11-14', cliente: 'Agencia Sur', email: '', documento: '', anticipo: null, saldoDias: null, uf: 0, fechaUF: '', horario: '', ley20393: false, acuerdos: '', contrato: '', contratoSubidoPor: '', contratoSubido: '', cambiosFecha: null, cancelacionDias: null, reembolso: null, devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '', enviada: '', ultimoSeguimiento: '', contratoEnviado: '', seguimientoDias: null, avisoEvento: null,
    telefono: '', estado: ESTADO_PRESUPUESTO.enviado, validoHasta: '2026-11-16',
    token: '', notas: '', idReserva: '', creadoPor: 'jefe', creado: '', idCliente: '',
    invitados: 0, periodo: '', tipoEvento: '', grupo: '', descuento: 0, motivo: '',
    fila: 2, ...x
  });
  const li = (x: Partial<LineaPresupuesto>): LineaPresupuesto => ({
    presupuesto: 'PRE-1', concepto: 'Tradiciones', cantidad: 20,
    precio: 40000, personas: 20, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0,
    fila: 2, ...x
  });

  // --- Lo que se cotiza: menus que son gente, y cosas que no lo son. ---
  const lineas = [
    li({}),
    li({ concepto: 'Niños', cantidad: 10, precio: 19000, personas: 10 }),
    // El arriendo cuesta plata y no es ni una persona. Si las personas se
    // dedujeran de la cantidad, este "1" habria sumado una silla.
    li({ concepto: 'Arriendo del recinto', cantidad: 1, precio: 2500000, personas: 0 })
  ];
  ok(personasDeLineas(lineas) === 30,
     'las personas salen de su propia columna: el arriendo no suma una silla');
  ok(totalDe(lineas) === 20 * 40000 + 10 * 19000 + 2500000,
     'el total suma cantidad x precio de cada linea');

  // --- El precio es el negociado, no el de la pestana Menus. ---
  ok(totalDe([li({ cantidad: 20, precio: 35000 })]) === 700000,
     'un precio rebajado en la linea manda: la cotizacion es lo acordado');

  // --- LA prueba de esta capa: un presupuesto no mueve la ocupacion. ---
  const reservas = [r({ fecha: '2026-11-14', personas: 10 })];
  const soloDia = dia({ fecha: '2026-11-14', capacidad: 60 });
  const sinPre = ocupacionDe(reservas, soloDia);
  const posibles = posiblesPorDia([pre({})], lineas, HOY);
  const conPre = ocupacionDe(reservas, soloDia, CORTES, posibles);

  ok(conPre.tomadas === sinPre.tomadas && conPre.tomadas === 10,
     'con 30 personas cotizadas, las TOMADAS siguen siendo las 10 confirmadas');
  ok(conPre.quedan === sinPre.quedan && conPre.quedan === 50,
     'y QUEDAN los mismos 50 lugares: un presupuesto no le saca el lugar a nadie');
  ok(conPre.semaforo === sinPre.semaforo,
     'el semaforo tampoco se mueve por algo que todavia no esta confirmado');
  ok(conPre.presupuestadas === 30 && conPre.presupuestos === 1,
     'lo cotizado se ve aparte: 1 presupuesto, 30 personas posibles');

  // Y lo mismo del otro lado de la frontera: al sitio no se filtra.
  const alSitio = paraElSitio([conPre], 10);
  ok(Object.keys(alSitio[0]).sort().join(',') === 'fecha,pocos,quedan',
     'al sitio siguen yendo tres campos: lo cotizado no cruza esa frontera');
  ok(alSitio[0].quedan === 50,
     'y el sitio sigue ofreciendo 50 lugares, no 20');

  // --- Cuando un presupuesto deja de contar ---
  ok(cuentaComoPosible(pre({}), HOY), 'uno enviado y vigente cuenta');
  ok(cuentaComoPosible(pre({ estado: ESTADO_PRESUPUESTO.borrador }), HOY),
     'un borrador tambien: es igual de posible, y el dia muestra su estado');
  ok(!cuentaComoPosible(pre({ idReserva: '7345141809369' }), HOY),
     'con reserva ya creada NO cuenta: esa gente la cuenta la reserva, y contarla dos veces mostraria el doble');
  ok(!cuentaComoPosible(pre({ estado: ESTADO_PRESUPUESTO.rechazado }), HOY),
     'un rechazado no cuenta');
  ok(!cuentaComoPosible(pre({ validoHasta: '2026-10-31' }), HOY),
     'uno vencido ayer tampoco');
  ok(cuentaComoPosible(pre({ validoHasta: HOY }), HOY),
     'el ULTIMO dia todavia vale: "valido hasta el 1" incluye el 1');
  ok(cuentaComoPosible(pre({ validoHasta: '' }), HOY),
     'sin fecha de vencimiento, no vence');

  // Lo que apaga a un aceptado es la RESERVA, no la palabra.
  ok(cuentaComoPosible(pre({ estado: ESTADO_PRESUPUESTO.aceptado }), HOY),
     'marcado "Aceptado" pero SIN reserva sigue contando: si no, esa gente no estaria en ninguna de las dos listas');

  // --- Varios presupuestos en el mismo dia se suman ---
  const dos = posiblesPorDia(
    [pre({ id: 'PRE-1' }), pre({ id: 'PRE-2' })],
    [...lineas, li({ presupuesto: 'PRE-2', concepto: 'Tradiciones', cantidad: 13, personas: 13 })],
    HOY
  );
  ok(dos.get('2026-11-14')!.presupuestos === 2,
     'dos cotizaciones del mismo dia se cuentan como dos');
  ok(dos.get('2026-11-14')!.personas === 43,
     'y su gente se suma: 30 + 13 = 43 posibles');
  ok(posiblesPorDia([pre({})], lineas, '2027-01-01').size === 0,
     'pasado el plazo, el dia deja de mostrar gente posible sin que nadie lo marque');

  // --- Vigencia ---
  ok(validoHastaDe('2026-11-01', 15) === '2026-11-16', '15 dias desde el 1 de noviembre');
  ok(validoHastaDe('2026-11-01', 0) === '',
     'cero dias es SIN vencimiento, no vencido hoy: un plazo de cero no puede matarlo al nacer');

  // --- Ida y vuelta contra la planilla ---
  const encP = ENCABEZADO_PRESUPUESTOS;
  const vuelta = leerPresupuestosDe([encP, filaPresupuesto(encP, pre({ notas: 'matrimonio' }))]);
  ok(vuelta.length === 1 && vuelta[0].id === 'PRE-1' && vuelta[0].notas === 'matrimonio',
     'un presupuesto escrito y vuelto a leer es el mismo');
  const encL = ENCABEZADO_LINEAS;
  const vueltaL = leerLineasDe([encL, filaLinea(encL, li({ personas: 0, concepto: 'Arriendo' }))]);
  ok(vueltaL.length === 1 && vueltaL[0].personas === 0,
     'una linea de cero personas se lee como cero, no se pierde');

  // Una fila a medio escribir no inventa una cotizacion.
  ok(leerPresupuestosDe([encP, ['', '2026-11-14']]).length === 0,
     'sin id no hay presupuesto que leer');
  ok(leerLineasDe([encL, ['PRE-1', '']]).length === 0,
     'una linea sin concepto no se lee: es una fila a medio escribir');

  // --- Dos lineas del mismo concepto son deliberadas ---
  const cortesia = normalizarLineas([
    { presupuesto: 'PRE-1', concepto: 'Tradiciones', cantidad: 20, precio: 40000, personas: 20 },
    { presupuesto: 'PRE-1', concepto: 'Tradiciones', cantidad: 5, precio: 0, personas: 5 }
  ]);
  ok(cortesia.length === 2,
     'dos lineas del mismo menu NO se juntan: 20 a precio y 5 de cortesia es un acuerdo, no un error');
  ok(normalizarLineas([
    { presupuesto: 'PRE-1', concepto: '  ', cantidad: 3, precio: 100, personas: 3 }
  ]).length === 0, 'una linea sin concepto se descarta al guardar');

  // --- Por vencer: el aviso de "apurate", distinto del de "se te paso" ---
  ok(diasParaVencer(pre({ validoHasta: '2026-11-04' }), HOY) === 3,
     'del 1 al 4 quedan tres dias');
  ok(diasParaVencer(pre({ validoHasta: HOY }), HOY) === 0,
     'el ultimo dia quedan cero, no es negativo');
  ok(diasParaVencer(pre({ validoHasta: '2026-10-31' }), HOY) === null,
     'uno YA vencido no tiene dias que queden: eso es otra pregunta');
  ok(diasParaVencer(pre({ validoHasta: '' }), HOY) === null,
     'y uno sin vencimiento tampoco');

  ok(porVencer(pre({ validoHasta: '2026-11-03' }), HOY), 'a dos dias, avisa');
  ok(porVencer(pre({ validoHasta: HOY }), HOY), 'el ultimo dia tambien avisa');
  ok(!porVencer(pre({ validoHasta: '2026-11-20' }), HOY),
     'a diecinueve dias no avisa: seria ruido todos los dias');
  ok(!porVencer(pre({ validoHasta: '2026-10-31' }), HOY),
     'uno VENCIDO no esta "por vencer": son dos avisos distintos y juntarlos borraria el que todavia se puede atender');
  ok(!porVencer(pre({ validoHasta: '2026-11-03', idReserva: '123' }), HOY),
     'con reserva ya creada el plazo dejo de importar');
  ok(!porVencer(pre({ validoHasta: '2026-11-03', estado: ESTADO_PRESUPUESTO.rechazado }), HOY),
     'y un rechazado tampoco');

  ok(vencidoSinCerrar(pre({ validoHasta: '2026-10-31' }), HOY),
     'uno vencido y sin cerrar se nombra: es una conversacion que se enfrio sola');
  ok(!vencidoSinCerrar(pre({ validoHasta: '2026-10-31', idReserva: '123' }), HOY),
     'uno vencido pero ya convertido NO: ese termino bien');
  ok(!vencidoSinCerrar(pre({ validoHasta: '2026-10-31',
                            estado: ESTADO_PRESUPUESTO.rechazado }), HOY),
     'ni uno rechazado: ese tambien termino');
  ok(!vencidoSinCerrar(pre({ validoHasta: '2026-11-03' }), HOY),
     'y uno vigente no esta vencido');

  // --- El IVA, que un presupuesto a una empresa tiene que desglosar ---
  // Los precios ya VIENEN con IVA (lo dijo el cliente), asi que el total no
  // se toca y el neto se calcula hacia atras.
  const d44 = desglosarIVA(44000);
  ok(d44.total === 44000,
     'el total NO cambia al desglosar: los precios ya traen el IVA, es lo que se cobra');
  ok(d44.neto === 36975, 'el neto sale de dividir por 1,19');
  ok(d44.iva === 7025, 'y el IVA, de restar el neto al total');

  // Lo que esto fija de verdad: los tres numeros CUADRAN, siempre. Con
  // neto x 0,19 el IVA de 44.000 daria 7.025,25 y la hoja no sumaria.
  for (const total of [0, 1, 7, 100, 19000, 44000, 70000, 107000, 2500000, 2975000, 999999]) {
    const d = desglosarIVA(total);
    ok(d.neto + d.iva === d.total,
       `neto + IVA da exactamente el total, con ${total}`);
    ok(d.neto >= 0 && d.iva >= 0, `y ninguno sale negativo, con ${total}`);
  }

  ok(desglosarIVA(0).total === 0 && desglosarIVA(0).iva === 0,
     'un presupuesto sin lineas no inventa un impuesto');
  ok(desglosarIVA(-5000).total === 0,
     'y un total negativo no existe: es cero, no un credito fiscal');
  ok(IVA === 0.19, 'la tasa es el 19% chileno, en un solo lugar del codigo');

  // El desglose es informativo y no toca lo que se guarda: la reserva que
  // sale de un presupuesto lleva el total negociado, con IVA, que es la
  // plata que hay que cobrar.
  const conIVA = reservaDesdePresupuesto(
    pre({ id: 'PRE-IVA', fecha: '2026-11-14', cliente: 'Agencia Austral' }),
    [li({ presupuesto: 'PRE-IVA', cantidad: 1, precio: 44000, personas: 1 })],
    [nuevoProducto({ nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000 })]
  );
  ok(conIVA.monto === 44000,
     'la reserva guarda el total CON IVA: es lo que se le cobra, no el neto');

  // --- El link del cliente ---
  const conToken = [
    pre({ id: 'PRE-1', token: 'abc123' }),
    // Uno sin token: todavía no se ha mandado.
    pre({ id: 'PRE-2', token: '' })
  ];
  ok(porToken(conToken, 'abc123')?.id === 'PRE-1', 'el token encuentra su presupuesto');
  ok(porToken(conToken, '') === null,
     'un token VACIO no encuentra nada, aunque haya presupuestos sin token: si calzara, entrar a /presupuesto/ sin nada abriria la cotizacion de otro cliente');
  ok(porToken(conToken, '   ') === null, 'ni con espacios');
  ok(porToken(conToken, 'ABC123') === null, 'ni con otras mayusculas');

  // --- Convertirlo en reserva ---
  {
    const catalogo = [
      nuevoProducto({ nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000 }),
      nuevoProducto({ nombre: 'Niños', precioEnLinea: 19000, precioEnLocal: 24000 })
    ];
    const r2 = reservaDesdePresupuesto(pre({ cliente: 'Agencia Sur' }), lineas, catalogo);

    ok(r2.monto === 20 * 40000 + 10 * 19000 + 2500000,
       'el monto de la reserva es el TOTAL NEGOCIADO del presupuesto, no el de la lista de precios');
    ok(r2.personas === 30, 'las personas son las del presupuesto');
    // El arriendo cuesta y no se cocina.
    ok(!r2.menu.includes('Arriendo'),
       'el arriendo NO va al menu: la cocina no prepara un arriendo del recinto');
    ok(r2.menu === '20 × Tradiciones + 10 × Niños',
       `el menu queda en el formato que la pagina del dia sabe leer — y fue: ${r2.menu}`);
    // Y de vuelta: lo que se escribe se tiene que poder desglosar.
    const vuelta2 = desglosarMenu(r2.menu, catalogo);
    ok(vuelta2.length === 2 && vuelta2[0].cantidad === 20,
       'y se desglosa de vuelta, que es de donde sale el "que preparar" del dia');
    ok(r2.estadoPago === ESTADO_PAGO.pendiente,
       'nace POR PAGAR: aceptar un presupuesto es comprometerse a venir, no haber transferido');
    ok(r2.tipoPago === '',
       'y sin modalidad, como cualquier reserva a mano: esa la escribe solo Shopify');

    // Un precio rebajado sobrevive la conversion, que es el punto entero.
    const rebajado = reservaDesdePresupuesto(
      pre({}), [li({ cantidad: 44, precio: 64000, personas: 44 })], catalogo);
    ok(rebajado.monto === 44 * 64000,
       'si se negocio a 64.000 la reserva vale 64.000 x 44, aunque la lista diga 44.000');
  }

  // --- El estado que se muestra resuelve el vencimiento solo ---
  ok(estadoVisible(pre({ validoHasta: '2026-10-31' }), HOY) === 'Vencida',
     'vencido se deduce de la fecha, no se guarda');
  ok(estadoVisible(pre({ idReserva: '123' }), HOY) === 'Ganada',
     'con reserva, la cotización se lee como ganada');
}

console.log('\nOrden alfabético de la gente');

// Lo pidió el cliente mirando el desplegable con que se agrega a alguien a un
// puesto: venía en el orden en que se grabó cada ficha. Lo que se comprueba
// acá es lo que ese orden tiene que resolver y una lista cruda no resuelve:
// una minúscula no manda a nadie al final, y un acento tampoco.
{
  const lista = [
    { nombre: 'Gloria' }, { nombre: 'hugo vergara' }, { nombre: 'Álvaro' },
    { nombre: 'Elvira Molina' }, { nombre: 'Bruno Cerendero' }
  ];
  const orden = [...lista].sort(porNombre).map((x) => x.nombre).join(' · ');
  ok(orden === 'Álvaro · Bruno Cerendero · Elvira Molina · Gloria · hugo vergara',
     'la lista va alfabetica, sin que la minuscula ni el acento la partan');
}

console.log('\nAjustes de un turno');

// Lo pidió el cliente con este ejemplo exacto: un extra positivo por hora
// extra y uno negativo por un adelanto, **cada uno con su motivo**.
const conDos = tu({
  asistencia: VINO.si, pagoJornada: 30000,
  ajustes: [{ monto: 5000, motivo: 'hora extra del montaje' },
            { monto: -20000, motivo: 'adelanto del viernes' }]
});
ok(totalAjustes(conDos.ajustes) === -15000, 'los ajustes se suman entre ellos');
ok(pagoDe(conDos) === 15000, 'y el turno paga la jornada más esa suma');
ok(motivosDe(conDos.ajustes) === 'hora extra del montaje · adelanto del viernes',
   'los motivos se muestran juntos, sin perder ninguno');

// La regla de siempre: un descuento mayor que todo deja el día en cero.
ok(pagoDe(tu({ asistencia: VINO.si, pagoJornada: 30000,
               ajustes: [{ monto: -50000, motivo: 'adelanto' }] })) === 0,
   'un descuento mayor que la jornada deja el día en cero, nunca en negativo');

// --- La ida y vuelta por las dos celdas de la planilla ---
ok(JSON.stringify(escribirAjustes([{ monto: -5000, motivo: 'llegó tarde' }]))
   === JSON.stringify(['-5000', 'llegó tarde']),
   'con UN ajuste la celda se ve igual que siempre: legible y editable a mano');
ok(JSON.stringify(escribirAjustes(conDos.ajustes))
   === JSON.stringify(['5000|-20000', 'hora extra del montaje|adelanto del viernes']),
   'con dos, las dos celdas quedan en paralelo');

const vueltaAjustes = leerAjustes('5000|-20000', 'hora extra|adelanto');
ok(vueltaAjustes.length === 2 && vueltaAjustes[1].monto === -20000
   && vueltaAjustes[1].motivo === 'adelanto',
   'y se leen de vuelta tal cual, con su signo y su motivo');

// **Lo que ya estaba escrito se sigue leyendo.** Una planilla anterior tiene
// un solo ajuste por celda y tiene que abrirse sin que nadie migre nada.
const viejo = leerAjustes('-5000', 'llegó tarde');
ok(viejo.length === 1 && viejo[0].monto === -5000 && viejo[0].motivo === 'llegó tarde',
   'una celda escrita cuando el ajuste era uno solo se lee como un ajuste');
ok(leerAjustes('', '').length === 0, 'y una celda vacía no inventa ninguno');

// Manda la lista de montos: si alguien edita a mano una celda y no la otra,
// los motivos que falten se leen vacíos en vez de desalinear los pares.
const cojo = leerAjustes('5000|-20000', 'hora extra');
ok(cojo.length === 2 && cojo[1].motivo === '' && cojo[1].monto === -20000,
   'si faltan motivos, los montos igual se leen en su posición');

// Un ajuste en cero y sin motivo es una fila que alguien abrió y no llenó.
ok(escribirAjustes([{ monto: 0, motivo: '' }])[0] === '',
   'un ajuste vacío no se guarda');
ok(leerAjustes('0', 'se le perdonó el atraso').length === 1,
   'pero uno en cero CON motivo sí: alguien lo escribió a propósito');

// El separador no puede venir dentro de un motivo, o partiría el ajuste en
// dos al volver a leerlo.
ok(!escribirAjustes([{ monto: 1000, motivo: 'a|b' }])[1].includes('|'),
   'el separador se saca de los motivos antes de guardar');

// Y el informe suma los ajustes de todos los turnos del periodo.
const conAjustes = informeDelPeriodo([
  tu({ trabajador: 'Ana', fecha: '2026-11-14', asistencia: VINO.si,
       pagoJornada: 30000,
       ajustes: [{ monto: 5000, motivo: 'hora extra' },
                 { monto: -20000, motivo: 'adelanto' }] })
], '2026-11-01', '2026-11-30');
ok(conAjustes[0].ajustes === -15000 && conAjustes[0].total === 15000,
   'el informe los suma en su columna y en el total');


/* ---------- Cerrar un día ---------- */

console.log('\nCierre del día');

const ce = (p: Partial<Cierre>): Cierre =>
  ({ fecha: '2026-11-14', quien: 'jefe', cuando: '2026-11-14 23:40', fila: 2, ...p });

ok(diaCerrado([ce({})], '2026-11-14'), 'un día con su fila está cerrado');
ok(!diaCerrado([ce({})], '2026-11-15'), 'y el de al lado no');
ok(cierreDe([ce({ quien: 'ana' })], '2026-11-14')?.quien === 'ana',
   'queda con el nombre de quien lo cerró, que es lo que permite preguntar');

const delSabado = [
  tu({ fecha: '2026-11-14', trabajador: 'Ana', asistencia: VINO.si, pagoJornada: 30000 }),
  tu({ fecha: '2026-11-14', trabajador: 'Luis', asistencia: VINO.sinMarcar })
];
const exDelSabado = [{ fecha: '2026-11-14', colaborador: 'Pedro',
  actividad: 'Show ecuestre', estado: '', monto: 50000, ajuste: 0, motivo: '', fila: 2 }];

const pendiente = faltaParaCerrar(delSabado, exDelSabado, '2026-11-14');
ok(pendiente.sinMarcar === 1, 'dice cuánta gente quedó sin marcar');
ok(pendiente.extrasSinConfirmar === 1, 'y cuántas actividades extras sin confirmar');
ok(pendiente.sinPropina, 'y avisa si vino gente y nadie anotó propina');

// **Lo único que bloquea es la asistencia.** Un turno sin marcar no suma
// nada, así que cerrar con turnos a medias sería cerrar con el total mal.
ok(!sePuedeCerrar(delSabado, exDelSabado, '2026-11-14'),
   'con alguien sin marcar no se puede cerrar');
const marcados = delSabado.map((t) => ({ ...t, asistencia: VINO.no }));
ok(sePuedeCerrar(marcados, exDelSabado, '2026-11-14'),
   'una vez marcados todos, sí — aunque queden extras sin confirmar');
ok(!sePuedeCerrar([], [], '2026-11-14'),
   'y un día sin nadie asignado no se cierra: no hay nada que cerrar');
ok(yaLlego('2026-11-14', '2026-11-14'), 'un día se cierra desde el mismo día');
ok(yaLlego('2026-11-14', '2026-11-20'), 'y después también');
ok(!yaLlego('2026-11-15', '2026-11-14'), 'pero no antes: un día que no llega no se cierra');
ok(!yaLlego('2026-12-01', '2026-11-30'), 'y se compara bien al cruzar de mes');

// Lo que el calendario muestra arriba: días pasados, con equipo, sin cerrar.
const porCerrar = diasPorCerrar(
  [tu({ fecha: '2026-11-14' }), tu({ fecha: '2026-11-15' }), tu({ fecha: '2026-11-21' })],
  [], [ce({ fecha: '2026-11-15' })], '2026-11-20'
);
ok(JSON.stringify(porCerrar) === JSON.stringify(['2026-11-14']),
   'el 15 ya está cerrado y el 21 todavía no pasa: queda solo el 14');
ok(diasPorCerrar([tu({ fecha: '2026-11-21' })], [], [], '2026-11-20').length === 0,
   'un día que no ha llegado no está pendiente: nadie puede decir quién vino');

// La ida y vuelta por la planilla.
const filasCierre = [
  ['Fecha', 'Cerrado por', 'Cuándo'],
  ['2026-11-14', 'jefe', '2026-11-14 23:40'],
  ['', 'nadie', '']
];
const leidos = leerCierresDe(filasCierre);
ok(leidos.length === 1 && leidos[0].quien === 'jefe' && leidos[0].fila === 2,
   'se lee una fila por día cerrado, y una sin fecha no cuenta');
ok(leerCierresDe([['Cerrado por']]).length === 0,
   'sin la columna Fecha no se interpreta nada');


// ---------- el pronóstico (MET Norway) ----------
// Chile está en UTC-3 en noviembre: 13:00 UTC son las 10:00 de acá.
const paso = (time: string, temp: number, uno?: [string, number, number?], seis?: [string, number, number?]) => ({
  time,
  data: {
    instant: { details: { air_temperature: temp } },
    ...(uno ? { next_1_hours: { summary: { symbol_code: uno[0] },
      details: { precipitation_amount: uno[1], probability_of_precipitation: uno[2] } } } : {}),
    ...(seis ? { next_6_hours: { summary: { symbol_code: seis[0] },
      details: { precipitation_amount: seis[1], probability_of_precipitation: seis[2] } } } : {})
  }
});
const met = { properties: { timeseries: [
  // Sábado 14 por hora. A las 02:00 UTC todavía es viernes 13 en Chile.
  paso('2026-11-14T02:00:00Z', 9, ['heavyrain', 4, 90], ['rain', 9, 90]),
  paso('2026-11-14T08:00:00Z', 8, ['rain_night', 2, 80], ['rain', 9, 80]),   // 05:00: fuera del horario
  paso('2026-11-14T13:00:00Z', 15, ['clearsky_day', 0, 0], ['fair_day', 0, 5]),
  paso('2026-11-14T17:00:00Z', 24, ['lightrainshowers_day', 0.3, 40], ['cloudy', 1, 40]),
  paso('2026-11-14T20:00:00Z', 21, ['partlycloudy_day', 0, 10], ['cloudy', 0, 10]),
  // Desde acá, de a seis horas: 06:00 UTC = 03:00 y 12:00 UTC = 09:00.
  paso('2026-11-15T06:00:00Z', 10, undefined, ['fog', 0, 0]),
  paso('2026-11-15T12:00:00Z', 14, undefined, ['partlycloudy_day', 0, 5]),
  paso('2026-11-15T18:00:00Z', 26, undefined, ['fair_day', 0, 0]),
  // El último día llega cortado en la madrugada: no toca el horario.
  paso('2026-11-16T06:00:00Z', 11, undefined, ['clearsky_night', 0, 0]),
  { time: 'basura', data: {} }
] } };
const pron = climaDe(met);
const pronDe = (f: string) => pron.find((c) => c.fecha === f);
ok(horaEnChile(new Date('2026-11-14T13:00:00Z')) === 10, 'las 13 UTC son las 10 en Chile en noviembre');
ok(pronDe('2026-11-13') === undefined,
   'la lluvia de la madrugada cae en el viernes de Chile, y fuera del horario no da ícono');
const sab = pronDe('2026-11-14');
ok(sab?.simbolo === 'lightrainshowers',
   'el sábado toma el peor símbolo del horario, no el de las 5 de la mañana');
ok(sab?.lluvia === 40, 'y la mayor probabilidad del horario: el 80% de la madrugada no cuenta');
ok(sab?.max === 24 && sab?.min === 8, 'las temperaturas son del día completo');
ok(sab?.mm === 2.3, 'los milímetros suman el día completo, una sola vez');
const dom = pronDe('2026-11-15');
ok(dom?.simbolo === 'partlycloudy',
   'con pasos de seis horas: la niebla de las 3 no cuenta, el periodo de las 9 a 15 sí');
ok(pronDe('2026-11-16') === undefined, 'un día sin nada en el horario no trae ícono');
ok(climaDe(null).length === 0 && climaDe({ properties: {} }).length === 0,
   'una respuesta rota da una lista vacía, no una excepción');
ok(iconoDe('clearsky_day').icono === '☀️' && iconoDe('rainshowers_night').texto === 'lluvia'
   && iconoDe('lightrainandthunder').texto === 'tormenta' && iconoDe('lightssleetshowers_day').texto === 'aguanieve'
   && iconoDe('heavyrain').texto === 'lluvia' && iconoDe('lightrain').texto === 'lluvia débil',
   'los símbolos de MET caen en su ícono, con o sin sufijo de día');
ok(iconoDe('algo_nuevo').texto === 'nublado', 'un símbolo desconocido se lee nublado, nunca despejado');
ok(climaEnPalabras(sab!) === 'Pronóstico: lluvia débil · máx 24° · mín 8° · 40% de lluvia · 2,3 mm',
   'el detalle redondea, dice todo y usa coma decimal');
ok(urlPronostico().includes('lat=-33.67') && !/\.\d{5}/.test(urlPronostico()),
   'MET pide como mucho cuatro decimales en las coordenadas');

/* ---------- el estado del pago, dicho en espanol ---------- */
// Lo que se GUARDA sigue siendo el codigo de Shopify; lo que se MUESTRA es
// espanol. La prueba fija las dos mitades, porque cambiar lo guardado
// rompe el webhook y cambiar lo mostrado vuelve a mezclar los idiomas.
ok(pagoEnEspanol('pending') === 'Por pagar', 'pending se lee "Por pagar"');
ok(pagoEnEspanol('paid') === 'Pagada' && pagoEnEspanol('cancelled') === 'Cancelada',
   'y los otros cuatro tambien tienen su palabra');
ok(pagoEnEspanol('PAID') === 'Pagada', 'da lo mismo como venga escrito');
ok(pagoEnEspanol('algo_nuevo') === 'algo_nuevo',
   'un codigo que el panel no conoce se muestra tal cual: mejor eso que una celda vacia');
ok(pagoEnEspanol('') === '', 'y uno vacio se queda vacio');
ok(pagoConGlosa('pending') === 'Por pagar — paga cuando llegue',
   'en el formulario va la palabra y lo que significa, sin el codigo en ingles');
ok(ESTADOS_QUE_LIBERAN.length === 3 && ESTADOS_QUE_VIENEN.length === 3,
   'seis estados, repartidos en los dos grupos que ofrece el formulario');
ok(ESTADOS_QUE_LIBERAN.every((e) => !ocupaLugar(r({ estadoPago: e }))),
   'los tres del grupo "ya no viene" liberan el cupo DE VERDAD: es la misma lista que mira ocupaLugar()');
ok(ESTADOS_QUE_VIENEN.every((e) => ocupaLugar(r({ estadoPago: e }))),
   'y los dos del grupo "viene" lo ocupan');


/* ---------- Lo que ya se pagó, y lo que falta ---------- */

console.log('\nPagos al equipo');
{
  const pago = (x: Partial<PagoEquipo>): PagoEquipo => ({
    id: 'PAGO-1', fecha: '2026-11-16', quien: 'Ana Soto',
    desde: '2026-11-09', hasta: '2026-11-15', monto: 50000,
    nota: '', registradoPor: 'jefe', concepto: '', fila: 2, ...x
  });

  // --- A transferir: la remuneración MÁS la propina ---
  ok(aTransferirDe(120000, 18000) === 138000,
     'a transferir es la remuneración más la propina: sale una sola plata a una sola cuenta');
  ok(aTransferirDe(120000, 0) === 120000, 'sin propina es la remuneración sola');
  ok(aTransferirDe(0, 0) === 0, 'y sin nada, cero');
  // La propina sigue fuera de pagoDe(): el costo del equipo no la ve. Eso
  // lo fija su propia prueba; acá lo que importa es que esta suma exista
  // SOLO para transferir.
  ok(aTransferirDe(-5000, 0) === 0, 'un total negativo no existe: es cero');

  // --- Qué pago cuenta en qué periodo ---
  const semana = { desde: '2026-11-09', hasta: '2026-11-15' };
  ok(cuentaEnPeriodo(pago({}), semana.desde, semana.hasta),
     'un pago por esa semana cuenta al mirar esa semana');
  ok(cuentaEnPeriodo(pago({}), '2026-11-01', '2026-11-30'),
     'y también al mirar el mes entero, que es como se usa');
  ok(!cuentaEnPeriodo(pago({}), '2026-11-10', '2026-11-12'),
     'pero NO al mirar tres días metidos dentro de esa semana: ese pago es de la semana, no de esos días');
  ok(!cuentaEnPeriodo(pago({}), '2026-12-01', '2026-12-31'),
     'ni en otro mes');
  ok(!cuentaEnPeriodo(pago({ desde: '', hasta: '' }), '2026-11-01', '2026-11-30'),
     'un pago sin periodo no cuenta en ninguno, en vez de colarse en todos');

  // --- Lo pagado se suma, y los pagos parciales se acumulan ---
  const pagos = [
    pago({ id: 'A', monto: 50000 }),
    pago({ id: 'B', monto: 30000 }),
    pago({ id: 'C', quien: 'Hugo Vergara', monto: 99000 }),
    pago({ id: 'D', monto: 999999, desde: '2026-12-05', hasta: '2026-12-05' })
  ];
  ok(pagadoDe(pagos, 'Ana Soto', semana.desde, semana.hasta) === 80000,
     'dos pagos parciales suman: 50.000 más 30.000');
  ok(pagadoDe(pagos, 'ANA soto', semana.desde, semana.hasta) === 80000,
     'y el nombre se compara normalizado, como en todo el panel');
  ok(pagadoDe(pagos, 'Hugo Vergara', semana.desde, semana.hasta) === 99000,
     'cada uno con lo suyo');
  ok(pagadoDe(pagos, 'Nadie', semana.desde, semana.hasta) === 0,
     'quien no tiene pagos lleva cero');
  ok(pagadoDe(pagos, '', semana.desde, semana.hasta) === 0,
     'y un nombre vacío no junta los pagos de todos');

  // Un pago en negativo es la corrección de uno de más, y resta.
  ok(pagadoDe([...pagos, pago({ id: 'E', monto: -20000 })],
              'Ana Soto', semana.desde, semana.hasta) === 60000,
     'un pago en negativo corrige uno de más sin borrar el rastro del primero');

  // --- El check: se deduce, no se guarda ---
  ok(estadoDePago(100000, 100000) === 'pagado', 'cubierto exacto es pagado');
  ok(estadoDePago(100000, 120000) === 'pagado', 'y de más también');
  ok(estadoDePago(100000, 40000) === 'parcial', 'una parte es parcial');
  ok(estadoDePago(100000, 0) === 'pendiente', 'nada es pendiente');
  ok(estadoDePago(0, 0) === 'pagado',
     'sin nada que transferir NO queda pendiente por cero pesos: alguien que no vino en todo el periodo no se persigue');

  ok(faltaDe(100000, 40000) === 60000, 'lo que falta es la resta');
  ok(faltaDe(100000, 150000) === 0, 'y nunca es negativo: no se le cobra de vuelta acá');

  // --- Ida y vuelta por la planilla ---
  const fila = filaPago({
    id: 'PAGO-X', fecha: '2026-11-16', quien: 'Ana Soto',
    desde: '2026-11-09', hasta: '2026-11-15', monto: 80000,
    nota: 'Transferencia 16/11', registradoPor: 'tesorera', concepto: 'Propina'
  }, ENCABEZADO_PAGOS);
  const vuelta = leerPagosDe([ENCABEZADO_PAGOS, fila.map(String)]);
  ok(vuelta.length === 1, 'una fila escrita se vuelve a leer');
  ok(vuelta[0].monto === 80000 && vuelta[0].quien === 'Ana Soto',
     'con su monto y su persona');
  ok(vuelta[0].nota === 'Transferencia 16/11' && vuelta[0].registradoPor === 'tesorera',
     'y con el rastro de quién lo anotó, que es lo que un check no deja');
  ok(vuelta[0].concepto === 'Propina', 'y con su concepto');
  // Una planilla de antes, sin la columna Concepto, se sigue leyendo.
  const vieja = leerPagosDe([ENCABEZADO_PAGOS.slice(0, -1),
    filaPago(pago({ id: 'V' }), ENCABEZADO_PAGOS.slice(0, -1)).map(String)]);
  ok(vieja.length === 1 && vieja[0].concepto === '',
     'una pestaña de antes, sin la columna Concepto, se lee igual: el pago queda sin concepto');
  ok(conceptoDe('propina') === 'Propina' && conceptoDe(' SUELDO ') === 'Sueldo'
     && conceptoDe('servicio') === 'Servicio' && conceptoDe('bono') === '',
     'el concepto se lee sin distinguir mayúsculas, y uno inventado se descarta');
  ok(pagoDelCuerpo({ quien: 'Ana', desde: '2026-11-09', hasta: '2026-11-15',
                     monto: 1000, concepto: 'regalo' })?.concepto === '',
     'del navegador tampoco se acepta un concepto inventado: llegaría a la planilla de Chipax');

  /* --- Sueldo y propina, cada uno con su pago --- */
  const sem = { desde: '2026-11-09', hasta: '2026-11-15' };
  const d0 = desglosePago([], 'Ana Soto', sem.desde, sem.hasta, 120000, 18000);
  ok(d0.sueldo.falta === 120000 && d0.propina.falta === 18000 && d0.total.falta === 138000,
     'sin pagos, falta el sueldo y falta la propina, por separado');
  const soloPropina = desglosePago([pago({ monto: 18000, concepto: 'Propina' })],
    'Ana Soto', sem.desde, sem.hasta, 120000, 18000);
  ok(soloPropina.propina.estado === 'pagado' && soloPropina.sueldo.estado === 'pendiente',
     'pagar la propina deja la propina pagada y el sueldo pendiente: son dos transferencias');
  const parcial = desglosePago([pago({ monto: 50000, concepto: 'Sueldo' })],
    'Ana Soto', sem.desde, sem.hasta, 120000, 18000);
  ok(parcial.sueldo.estado === 'parcial' && parcial.sueldo.falta === 70000
     && parcial.propina.falta === 18000,
     'una parte del sueldo deja el sueldo parcial, y la propina intacta');
  const viejo = desglosePago([pago({ monto: 130000 })],
    'Ana Soto', sem.desde, sem.hasta, 120000, 18000);
  ok(viejo.sueldo.estado === 'pagado' && viejo.propina.pagado === 10000
     && viejo.total.pagado === 130000,
     'un pago viejo sin concepto cubre primero el sueldo y lo que sobra va a la propina: el total no cambia');
  const viejoChico = desglosePago([pago({ monto: 40000 })],
    'Ana Soto', sem.desde, sem.hasta, 120000, 18000);
  ok(viejoChico.sueldo.pagado === 40000 && viejoChico.propina.pagado === 0,
     'y si no alcanza para el sueldo, no toca la propina');
  const extra = desglosePago([pago({ quien: 'Jinete', monto: 60000, concepto: 'Servicio' })],
    'Jinete', sem.desde, sem.hasta, 60000, 0);
  ok(extra.sueldo.estado === 'pagado' && extra.propina.debe === 0,
     'el servicio de una actividad extra cuenta en su parte, y no tiene propina');

  /* --- La boleta --- */
  ok(pideBoleta('equipo', false) && pideBoleta('extra', false),
     'quien cobra por turno y una actividad extra mandan boleta');
  ok(!pideBoleta('equipo', true), 'un contratado no: su sueldo va por la liquidación');
  const filaB = filaBoleta({ quien: 'Ana Soto', desde: sem.desde, hasta: sem.hasta,
    registradoPor: 'tesorera', cuando: '2026-11-16 10:00', nota: '' }, ENCABEZADO_BOLETAS);
  const boletas = leerBoletasDe([ENCABEZADO_BOLETAS, filaB]);
  ok(boletas.length === 1 && boletas[0].registradoPor === 'tesorera',
     'una boleta escrita se vuelve a leer, con quién la marcó');
  ok(!!boletaDe(boletas, 'ana SOTO', sem.desde, sem.hasta),
     'la boleta de la semana aparece al mirar esa semana');
  ok(!!boletaDe(boletas, 'Ana Soto', '2026-11-01', '2026-11-30'),
     'y al mirar el mes, igual que un pago');
  ok(!boletaDe(boletas, 'Ana Soto', '2026-11-16', '2026-11-22'),
     'pero no en la semana siguiente');
  ok(!boletaDe(boletas, 'Otra Persona', sem.desde, sem.hasta),
     'ni para otra persona');
  ok(boletaEnPlanilla(true, true) === 'Sí' && boletaEnPlanilla(true, false) === ''
     && boletaEnPlanilla(false, false) === 'No aplica',
     'en la planilla: Sí, en blanco si no llegó, y No aplica para un contratado');

  /* --- Copiar los datos de la transferencia --- */
  const texto = textoTransferencia({ titular: 'Ana Soto', rut: '11111111-1',
    banco: 'BancoEstado', tipo: 'Cuenta RUT', numero: '11111111', monto: 120000,
    correo: 'ana@correo.cl', glosa: glosaDe('Sueldo', '2026-11-09', '2026-11-15') });
  ok(texto.split('\t').length === ORDEN_TRANSFERENCIA.length,
     'un campo por tabulación, en el orden de ORDEN_TRANSFERENCIA');
  ok(texto.split('\t')[ORDEN_TRANSFERENCIA.indexOf('monto')] === '120000',
     'el monto va sin puntos ni signo peso: es lo que un banco acepta pegar');
  ok(texto.endsWith('Sueldo 09/11 al 15/11'),
     'y la glosa dice qué es y de qué semana, corta y sin guiones largos ni tildes');
  ok(glosaDe('Propina', '2026-11-09', '2026-11-15').length <= 30,
     'y cabe en los 30 caracteres que dejan los bancos');
  ok(ORDEN_TRANSFERENCIA.every((k) => !!NOMBRE_COLUMNA_TRANSFERENCIA[k]),
     'cada columna de la planilla para el banco tiene su nombre');
  ok(textoTransferencia({ titular: 'A', rut: '1-9', banco: 'B', tipo: 'T', numero: '7',
       monto: 5, correo: 'c', glosa: 'G' })
     === filaTransferencia({ titular: 'A', rut: '1-9', banco: 'B', tipo: 'T', numero: '7',
       monto: 5, correo: 'c', glosa: 'G' }).join('\t'),
     'copiar y la planilla para el banco salen del mismo orden: se cambia una vez y vale para los dos');
  ok(CONCEPTO.propina === 'Propina', 'el concepto propina se llama así en la planilla');

  ok(leerPagosDe([ENCABEZADO_PAGOS]).length === 0, 'una pestaña vacía no inventa pagos');
  ok(leerPagosDe([]).length === 0, 'y una que no existe tampoco');
  // Una fila sin nombre no es un pago a nadie: se saltea.
  ok(leerPagosDe([ENCABEZADO_PAGOS, ENCABEZADO_PAGOS.map(() => '')]).length === 0,
     'una fila sin trabajador se saltea en vez de contarse como un pago de cero');

  // --- Lo que llega del navegador, limpiado ---
  const bueno = pagoDelCuerpo({
    quien: ' Ana Soto ', monto: '80.000', desde: '2026-11-09', hasta: '2026-11-15'
  });
  ok(bueno?.monto === 80000 && bueno?.quien === 'Ana Soto',
     'el monto se vuelve entero y el nombre se recorta');
  ok(pagoDelCuerpo({ quien: '', monto: 1, desde: '2026-11-09', hasta: '2026-11-15' }) === null,
     'sin trabajador no hay pago');
  ok(pagoDelCuerpo({ quien: 'Ana', monto: 0, desde: '2026-11-09', hasta: '2026-11-15' }) === null,
     'un pago de cero no es un pago');
  ok(pagoDelCuerpo({ quien: 'Ana', monto: 100, desde: 'cualquier cosa', hasta: '2026-11-15' }) === null,
     'con una fecha que no se entiende, no se guarda nada');
  ok(pagoDelCuerpo({ quien: 'Ana', monto: 100, desde: '2026-11-15', hasta: '2026-11-09' }) === null,
     'ni con el periodo al revés');
  ok(pagoDelCuerpo({ quien: 'Ana', monto: -5000, desde: '2026-11-09', hasta: '2026-11-15' })?.monto === -5000,
     'un negativo SÍ se acepta: es la corrección de un pago de más');

  // El id se arma solo y no se acepta de afuera, igual que el token de un
  // presupuesto: es parte del rastro, no un dato del navegador.
  ok(nuevoIdPago(0) !== nuevoIdPago(1), 'dos pagos no comparten id');
  ok((pagoDelCuerpo({ quien: 'Ana', monto: 1, desde: '2026-11-09', hasta: '2026-11-15',
                      id: 'MIO', registradoPor: 'otro' } as unknown) as Record<string, unknown>)
       ?.id === undefined,
     'el id y quién lo registró NO se aceptan del navegador');
}

/* ---------- El link personal: qué periodo abre y qué pagos muestra ---------- */

console.log('\nEl link personal del trabajador');
{
  const pago = (x: Partial<PagoEquipo>): PagoEquipo => ({
    id: 'PAGO-1', fecha: '2026-11-16', quien: 'Ana Soto',
    desde: '2026-11-09', hasta: '2026-11-15', monto: 50000,
    nota: '', registradoPor: 'jefe', concepto: '', fila: 2, ...x
  });

  /* --- Abre en la semana PASADA, que es la que le están pagando --- */
  // Se paga el lunes la semana que terminó el domingo, así que lo primero
  // que alguien quiere ver es ésa y no la que va corriendo.
  ok(semanaPorDefecto('2026-11-03') === '2026-10-26',
     'un martes abre en la semana pasada, no en la que va corriendo');
  ok(semanaPorDefecto('2026-11-02') === '2026-10-26',
     'y el lunes mismo también: es justo el día en que se paga');
  ok(semanaPorDefecto('2026-11-08') === '2026-10-26',
     'el domingo en la tarde sigue siendo la pasada: la actual todavía no termina');
  ok(semanaPorDefecto('2026-11-09') === '2026-11-02',
     'y al lunes siguiente se corre una semana sola');
  ok(rangoDelPeriodo(semanaPorDefecto('2026-11-03')).hasta === '2026-11-01',
     'la semana pasada termina el domingo anterior a hoy');
  // No depende de que haya turnos: abrir siempre en el mismo lugar es el
  // punto. Una semana vacía lo dice con palabras en la pantalla.
  ok(semanaPorDefecto('2026-11-03') === semanaPorDefecto('2026-11-03'),
     'no mira los turnos: el periodo que abre no cambia según lo que haya anotado');

  /* --- Las pastillas que se ofrecen --- */
  // **Ninguno cae en la semana pasada, y es a propósito**: si hubiera uno,
  // la prueba de que esa pastilla "va siempre" pasaría por casualidad —y de
  // hecho pasaba, hasta que una mutación lo delató.
  const suyos: Turno[] = [
    tu({ fecha: '2026-10-24', asistencia: VINO.si, pagoJornada: 30000 }),
    tu({ fecha: '2026-09-12', asistencia: VINO.si, pagoJornada: 30000 }),
    // Un turno de mañana: no es un periodo que alguien venga a revisar.
    tu({ fecha: '2026-11-21' })
  ];
  const p1 = periodosDelLink(suyos, '2026-11-03');
  ok(p1.semanas[0] === '2026-11-02', 'la primera pastilla es la semana en curso');
  ok(p1.semanas.includes('2026-10-26'),
     'y la pasada va siempre, aunque no tenga ni un turno: es la que abre por defecto');
  ok(p1.semanas.includes('2026-10-19') && p1.semanas.includes('2026-09-07'),
     'más las semanas que sí tienen turnos');
  ok(!p1.semanas.includes('2026-11-16'),
     'una semana que todavía no llega NO se ofrece: no hay nada que revisar ahí');
  ok(p1.semanas.join() === [...p1.semanas].sort().reverse().join(),
     'van de la más nueva a la más vieja');
  ok(p1.meses[0] === '2026-11' && p1.meses.includes('2026-10') && p1.meses.includes('2026-09'),
     'los meses igual, con el actual primero');
  ok(periodosDelLink(suyos, '2026-11-03', 2, 1).semanas.length === 2
     && periodosDelLink(suyos, '2026-11-03', 2, 1).meses.length === 1,
     'se recortan a unas pocas: veinte pastillas no son un filtro');
  // Sin un solo turno la pantalla igual tiene con qué abrir.
  const vacio = periodosDelLink([], '2026-11-03');
  ok(vacio.semanas.length === 2 && vacio.semanas.includes('2026-10-26'),
     'quien no tiene ningún turno igual ve la semana pasada y la actual');
  ok(vacio.meses.length === 1 && vacio.meses[0] === '2026-11',
     'y el mes en curso');

  /* --- La escalera de semanas del link personal --- */
  ok(semanasEntre('2026-11-02', '2026-11-02') === 0
     && semanasEntre('2026-11-02', '2026-10-26') === -1
     && semanasEntre('2026-11-02', '2026-11-16') === 2
     && semanasEntre('2026-11-02', '2026-03-02') === -35,
     'semanasEntre cuenta hacia los dos lados, también cruzando el cambio de horario');
  ok(etiquetaSemana('2026-11-02', '2026-11-04') === 'En curso'
     && etiquetaSemana('2026-10-26', '2026-11-04') === 'Semana pasada'
     && etiquetaSemana('2026-11-09', '2026-11-04') === 'Próxima semana'
     && etiquetaSemana('2026-10-12', '2026-11-04') === 'Hace 3 semanas'
     && etiquetaSemana('2026-11-16', '2026-11-04') === 'En 2 semanas',
     'cada semana dice qué es, no solo sus fechas');
  ok(etiquetaSemana('2026-11-02', '2026-11-08') === 'En curso',
     'el domingo todavía es la semana en curso: parte en lunes');
  const esc = escaleraDeSemanas(suyos, '2026-11-03');
  ok(esc.slice(0, 4).join() === '2026-11-16,2026-11-09,2026-11-02,2026-10-26',
     'arriba lo que viene: una semana futura con turno, la próxima, la en curso y la pasada');
  ok(esc.includes('2026-10-19') && esc.includes('2026-09-07'),
     'abajo las anteriores que tienen turnos');
  ok(esc.join() === [...esc].sort().reverse().join(), 'de la más nueva a la más vieja');
  ok(escaleraDeSemanas([], '2026-11-03').join() === '2026-11-09,2026-11-02,2026-10-26',
     'sin un solo turno igual están la próxima, la en curso y la pasada');

  /* --- El periodo llega de la URL, así que se comprueba --- */
  ok(esPeriodo('2026-11'), 'un mes es un periodo');
  ok(esPeriodo('2026-11-09'), 'y un día también: lleva a su semana');
  ok(!esPeriodo('chao') && !esPeriodo('') && !esPeriodo('2026-13'),
     'basura, vacío y un mes 13 NO lo son: sin esto el rango saldría con NaN y la página se vería vacía sin decir por qué');
  // `esFecha()` mira la forma y no el calendario, que es la tolerancia de
  // todo el proyecto. Un día que no existe pasa el filtro y se corre solo a
  // una semana real, o sea a un periodo vacío — la página lo dice con
  // palabras. Queda fijado para que nadie lo "arregle" creyendo que rompe.
  ok(esPeriodo('2026-11-99'),
     'un día imposible pasa el filtro: esFecha() mira la forma, igual que en el resto del proyecto');
  ok(esFecha(rangoDelPeriodo('2026-11-99').desde)
     && esFecha(rangoDelPeriodo('2026-11-99').hasta),
     'y aun así sale un rango con forma de fecha, así que la pantalla no se cae: queda un periodo vacío');

  /* --- Los pagos del periodo, uno por uno --- */
  const pagos = [
    pago({ id: 'A', monto: 50000, fecha: '2026-11-16' }),
    pago({ id: 'B', monto: 30000, fecha: '2026-11-18' }),
    pago({ id: 'C', quien: 'Hugo Vergara', monto: 99000 }),
    pago({ id: 'D', monto: 70000, desde: '2026-11-02', hasta: '2026-11-08' })
  ];
  const suya = pagosEnPeriodo(pagos, 'Ana Soto', '2026-11-09', '2026-11-15');
  ok(suya.length === 2, 'solo los pagos de esa persona por ese periodo');
  ok(suya[0].id === 'B', 'del más nuevo al más viejo: el último que llegó va arriba');
  ok(suya.reduce((s, x) => s + x.monto, 0)
     === pagadoDe(pagos, 'Ana Soto', '2026-11-09', '2026-11-15'),
     'la lista suma exactamente lo mismo que pagadoDe(): una sola condición de qué cuenta');
  ok(!pagosEnPeriodo(pagos, 'Ana Soto', '2026-11-09', '2026-11-15')
       .some((x) => x.quien === 'Hugo Vergara'),
     'y nunca aparece el pago de otra persona, que es lo único que esta página no puede mostrar');
  ok(pagosEnPeriodo(pagos, '', '2026-11-01', '2026-11-30').length === 0,
     'un nombre vacío no junta los pagos de todos');
  ok(pagosEnPeriodo(pagos, 'Ana Soto', '2026-11-01', '2026-11-30').length === 3,
     'al mirar el mes se ven los pagos de sus dos semanas');

  /* --- El aviso del pago que no cabe en el periodo --- */
  // Un pago por una quincena no cuenta al mirar una sola de sus semanas, y
  // para quien abre su link eso se lee como "no me pagaron".
  const quincena = [pago({ id: 'Q', monto: 160000, desde: '2026-11-02', hasta: '2026-11-15' })];
  ok(pagadoDe(quincena, 'Ana Soto', '2026-11-09', '2026-11-15') === 0,
     'el pago de una quincena no se cuenta al mirar una de sus semanas');
  const aviso = pagosQueNoCaben(quincena, 'Ana Soto', '2026-11-09', '2026-11-15');
  ok(aviso.length === 1 && aviso[0].id === 'Q',
     'pero se nombra, para que no se lea como que no le pagaron');
  ok(pagosQueNoCaben(quincena, 'Ana Soto', '2026-11-01', '2026-11-30').length === 0,
     'al mirar el mes ya cabe, así que no hay nada que avisar');
  ok(pagosQueNoCaben(pagos, 'Ana Soto', '2026-11-09', '2026-11-15').length === 0,
     'un pago que cabe entero no dispara el aviso');
  ok(pagosQueNoCaben(quincena, 'Ana Soto', '2026-12-01', '2026-12-31').length === 0,
     'ni uno que no toca el periodo para nada');
  ok(pagosQueNoCaben(quincena, 'Hugo Vergara', '2026-11-09', '2026-11-15').length === 0,
     'y el aviso tampoco delata el pago de otra persona');
}

/* ---------- Lo que va a costar el equipo de un día ---------- */

console.log('\nCosto planificado del día');
{
  const tu = (x: Partial<Turno>): Turno => ({
    fecha: '2026-11-14', trabajador: 'Ana', puesto: 'Garzón', asistencia: '',
    modalidad: '', pagoJornada: 30000, horasExtra: 0, valorHora: 4000,
    ajustes: [], propina: 0, fila: 2, ...x
  } as Turno);

  const plan = [tu({ trabajador: 'Ana' }), tu({ trabajador: 'Beto' }),
                tu({ trabajador: 'Caro' })];

  // **Lo que arregla esta función**: antes de pasar lista, costoDelDia da
  // cero, y un cero en la tarjeta se lee como "no cuesta nada".
  ok(costoDelDia(plan, '2026-11-14') === 0,
     'sin marcar a nadie, el costo confirmado es cero — correcto, pero no es lo que se pregunta al planificar');
  ok(costoPlanificado(plan, '2026-11-14') === 90000,
     'el planificado SÍ cuenta a los tres: es lo que va a costar ese día');

  // Quien ya dijo que no vino se cae; los demás siguen contando.
  const conFalta = [tu({ trabajador: 'Ana', asistencia: VINO.no }),
                    tu({ trabajador: 'Beto' }),
                    tu({ trabajador: 'Caro', asistencia: VINO.si })];
  ok(costoPlanificado(conFalta, '2026-11-14') === 60000,
     'quien no vino se cae solo, y el que falta por marcar sigue contando');

  // Ya marcado todo, los dos números son el mismo: no hay que aprender a
  // interpretar la tarjeta según el día que sea.
  const todoMarcado = plan.map((t) => ({ ...t, asistencia: VINO.si }));
  ok(costoPlanificado(todoMarcado, '2026-11-14') === costoDelDia(todoMarcado, '2026-11-14'),
     'con la lista pasada, el planificado converge exactamente al confirmado');

  // Un contratado no suma jornada ni acá: su sueldo no sale de esta caja.
  ok(costoPlanificado([tu({ modalidad: 'Contratado' })], '2026-11-14') === 0,
     'un contratado no suma jornada en el planificado tampoco');
  ok(costoPlanificado([tu({ modalidad: 'Contratado', horasExtra: 2 })], '2026-11-14') === 8000,
     'pero sus horas extra sí: esas son del día y se pagan aparte');

  ok(costoPlanificado(plan, '2026-11-15') === 0, 'otro día no suma nada');
}

/* ---------- Los eventos del CRM del socio ---------- */

console.log('\nEventos del CRM');
{
  // La forma real de la respuesta, con la basura que trae de verdad: un
  // evento fechado en 2007 por un tipeo, invitados en null, tipo vacío.
  const crudo = {
    origen: 'crm-asadosycorderos',
    total: 7,
    eventos: [
      { id: 'a', etapa: 'Ganado', confirmado: true, empresa: 'brasas',
        nombre: 'Matrimonio Perez ',
        tipo_evento: 'Otro', lugar: 'Lo Pirque', tipo_fecha: 'fecha',
        fecha: '2026-11-07', periodo_inicio: null, periodo_fin: null,
        invitados: 58, vendedor: 'Teresita Mujica' },
      { id: 'b', etapa: 'Contactado', confirmado: false, empresa: 'brasas',
        tipo_evento: 'Corporativo', lugar: 'Lo Pirque', tipo_fecha: 'fecha',
        fecha: '2026-11-07', periodo_inicio: null, periodo_fin: null,
        invitados: null, vendedor: 'Carmen Barros' },
      // Lo vendió Brasas pero NO es en nuestro recinto: no ocupa nada acá.
      { id: 'c', etapa: 'Ganado', confirmado: true, empresa: 'brasas',
        tipo_evento: 'Corporativo', lugar: 'Otro', tipo_fecha: 'fecha',
        fecha: '2026-11-24', invitados: 60, vendedor: 'Ismael Barros' },
      // Lo vendió el socio pero SÍ es acá: ocupa igual.
      { id: 'd', etapa: 'Ganado', confirmado: true, empresa: 'ayc',
        tipo_evento: 'Otro', lugar: 'Lo Pirque', tipo_fecha: 'fecha',
        fecha: '2026-11-22', invitados: 150, vendedor: 'Cristóbal' },
      { id: 'e', etapa: 'Ganado', confirmado: true, empresa: 'ayc',
        tipo_evento: 'Matrimonio', lugar: 'Calicanto', tipo_fecha: 'fecha',
        fecha: '2026-11-07', invitados: 200, vendedor: 'Carmen Barros' },
      // Un período nuestro: meses aproximados, sin día.
      { id: 'f', etapa: 'Nuevo', confirmado: false, empresa: 'brasas',
        tipo_evento: 'Matrimonio', lugar: 'Lo Pirque', tipo_fecha: 'periodo',
        fecha: null, periodo_inicio: '2027-07-01', periodo_fin: '2027-08-01',
        invitados: 120, vendedor: 'Carmen Barros' },
      // El tipeo de 2007: se lee igual, no tumba nada.
      { id: 'g', etapa: 'Nuevo', confirmado: false, empresa: 'brasas',
        tipo_evento: '', lugar: 'Lo Pirque', tipo_fecha: 'fecha',
        fecha: '2007-03-20', invitados: 60, vendedor: '' }
    ]
  };
  const ev = leerEventos(crudo);
  ok(ev.length === 7, 'se leen los siete, basura incluida');
  ok(ev[1].invitados === 0, 'invitados en null se lee cero, no NaN');
  ok(ev[6].tipo === '' && ev[6].fecha === '2007-03-20',
     'un tipo vacío y una fecha absurda no rompen la lectura');
  ok(ev[5].fecha === '' && ev[5].periodoInicio === '2027-07-01',
     'un período no trae fecha y sí sus dos meses');

  // **El nombre del cliente sí se lee, desde el 2026-11-03.** Hasta ese día
  // no, mientras Felipe lo decidía. Viene con espacios de sobra —en los datos
  // de verdad, `'FELIPE IZQUIERDO '`— y `texto()` los saca: un nombre con un
  // espacio al final se ve mal justo donde va a quedar al lado de un monto.
  ok(ev[0].nombre === 'Matrimonio Perez', 'el nombre del cliente entra al panel');
  ok(leerEventos({ eventos: [{ id: 'x', nombre: '  ACME  ' }] })[0].nombre === 'ACME',
     'y entra sin los espacios de sobra');

  // **Ésta es la prueba que fija la decisión del filtro.** La guía del socio
  // recomienda `empresa=brasas`; para ocupar el recinto manda `lugar`, y los
  // dos conjuntos difieren en las DOS direcciones.
  const deBrasasEnOtroLado = ev.find((x) => x.id === 'c')!;
  const delSocioAcá = ev.find((x) => x.id === 'd')!;
  ok(!esNuestro(deBrasasEnOtroLado),
     'un evento vendido por Brasas en otro recinto NO ocupa nuestro día');
  ok(esNuestro(delSocioAcá),
     'un evento vendido por el socio en Lo Pirque SÍ ocupa nuestro día');
  ok(!esNuestro(ev.find((x) => x.id === 'e')!), 'Calicanto no es nuestro');
  ok(NUESTRO_LUGAR === 'Lo Pirque', 'el lugar nuestro es el que escribe el CRM');

  // Un espacio de más no puede hacer desaparecer un evento.
  ok(esNuestro({ ...ev[0], lugar: '  lo pirque ' }),
     'el lugar se compara normalizado');

  ok(!tieneDia(ev[5]), 'un período no cae en ningún día');
  ok(tieneDia(ev[0]), 'uno con fecha sí');

  const dias = eventosPorFecha(ev);
  // Tres FECHAS, no tres eventos: el 7 tiene dos y es un solo día.
  ok(dias.size === 3,
     'tres días nuestros con fecha —el 7, el 22 y el de 2007— y nada de Calicanto');
  ok(!dias.has('2026-11-24'), 'el de "Otro" no aparece en ningún día nuestro');

  const d7 = dias.get('2026-11-07')!;
  ok(d7.confirmados.length === 1 && d7.tentativos.length === 1,
     'el 7 tiene un ganado y un tentativo, separados');
  ok(d7.personasConfirmadas === 58, 'las personas confirmadas del 7 son 58');
  ok(d7.personasTentativas === 0, 'el tentativo sin invitados suma cero');

  // El caso real que nadie vio: el sitio ofrecía 112 lugares ese sábado.
  ok(haySobreventa(d7, 112) === false,
     '58 personas caben en 112: no hay sobreventa, pero hay que saberlo');
  const d22 = dias.get('2026-11-22')!;
  ok(haySobreventa(d22, 120) === true,
     'el 22 el CRM tiene 150 confirmadas y el sitio ofrecía 120: eso sí es sobreventa');

  const periodos = periodosNuestros(ev);
  ok(periodos.length === 1 && periodos[0].id === 'f',
     'el período nuestro se devuelve aparte, no se descarta');

  // **`confirmado` se deriva de la etapa y no se lee del campo.** Si los dos
  // dijeran cosas distintas, el panel tiene que obedecer a la etapa — que es
  // lo que el propio CRM usa para pintar su calendario.
  const mentiroso = leerEventos({ eventos: [
    { id: 'z', etapa: 'Cotizado', confirmado: true, lugar: 'Lo Pirque',
      tipo_fecha: 'fecha', fecha: '2026-12-05', invitados: 40 }
  ] });
  ok(mentiroso[0].confirmado === false,
     'un "confirmado: true" con etapa Cotizado NO cuenta como confirmado');
  ok(eventosPorFecha(mentiroso).get('2026-12-05')!.personasConfirmadas === 0,
     'y por lo tanto no suma gente confirmada a ese día');

  // --- Anotar un ganado del socio como reserva nuestra (2026-11-03) -------
  //
  // Lo pidió el cliente: *"cuando viene un presupuesto ganado desde el CRM,
  // nosotros lo convertimos en una reserva y le damos las informaciones que
  // solo nosotros sabemos poner"*. Lo que esto fija es que **no se cuente
  // dos veces**: anotado acá, deja de aparecer como evento del socio.
  const delSocio = leerEventos({ eventos: [
    { id: 'g1', etapa: 'Ganado', lugar: 'Lo Pirque', nombre: 'Empresa Uno',
      tipo_fecha: 'fecha', fecha: '2026-11-22', invitados: 150 },
    { id: 'g2', etapa: 'Cotizado', lugar: 'Lo Pirque', nombre: 'Empresa Dos',
      tipo_fecha: 'fecha', fecha: '2026-11-22', invitados: 40 }
  ] });

  const sinAnotar = eventosPorFecha(delSocio).get('2026-11-22')!;
  ok(sinAnotar.personasConfirmadas === 150 && sinAnotar.personasTentativas === 40,
     'sin anotar, el día muestra el ganado y el cotizado del socio');

  // Y la columna de la planilla es la que lo apaga.
  const anotados = anotadosDe([
    { eventoCRM: 'g1' }, { eventoCRM: '' }, { eventoCRM: '  ' }, {}
  ]);
  ok(anotados.size === 1 && anotados.has('g1'),
     'solo los ids escritos de verdad cuentan: los vacíos no apagan nada');

  const yaAnotado = eventosPorFecha(delSocio, anotados).get('2026-11-22')!;
  ok(yaAnotado.personasConfirmadas === 0,
     'anotado como reserva, el ganado deja de contarse en esta capa: ya ocupa cupo');
  ok(yaAnotado.personasTentativas === 40,
     'y el cotizado de al lado sigue ahí, que no tiene nada que ver');

  ok(yaEstaAnotado(delSocio[0], anotados) && !yaEstaAnotado(delSocio[1], anotados),
     'la pregunta se contesta por el id del evento, no por su etapa');

  // Degradar: una respuesta rota no tumba nada.
  ok(leerEventos(null).length === 0, 'null se lee como lista vacía');
  ok(leerEventos({ eventos: 'no soy un arreglo' }).length === 0,
     'un campo eventos que no es arreglo se lee vacío');
  ok(leerEventos({ eventos: [{ etapa: 'Ganado' }] }).length === 0,
     'un evento sin id se descarta: no hay nada que mostrar');
  ok(eventosPorFecha([]).size === 0, 'sin eventos, ningún día');
}

// ---------------------------------------------------------------------------
{
  console.log('\nPublicar nuestros días en el calendario del socio');

  const pd = (p: Partial<DiaDelPanel>): DiaDelPanel => ({
    fecha: '2026-11-07', capacidad: 120, tomadas: 0,
    bloqueada: false, privada: false, exclusiva: false, ...p
  });

  // **La regla es una sola pregunta: ¿puede pasar otro evento acá ese día?**
  // `bloquea: true` es rojo —fecha tomada— y `false` es naranjo con la
  // ocupación. Fue lo que el cliente corrigió del primer corte, que mandaba
  // todo privado en rojo y le habría hecho perder ventas al socio.
  const cerrado = diaParaElCRM(pd({ bloqueada: true }))!;
  ok(cerrado.bloquea === true, 'un día cerrado bloquea');
  ok(cerrado.titulo === TITULOS.cerrado, 'y se anuncia como cerrado');

  const exclusivo = diaParaElCRM(pd({ privada: true, exclusiva: true, tomadas: 40 }))!;
  ok(exclusivo.bloquea === true, 'un privado EXCLUSIVO bloquea: el recinto completo');
  ok(exclusivo.titulo === TITULOS.exclusivo, 'y lo dice con todas sus letras');

  const privado = diaParaElCRM(pd({ privada: true, tomadas: 40 }))!;
  ok(privado.bloquea === false,
     'un privado NO exclusivo no bloquea: pueden correr dos eventos a la vez');
  ok(privado.titulo === TITULOS.privado, 'y sale como evento privado');
  ok(privado.ocupacion === 40 && privado.capacidad === 120,
     'con su ocupación, que es lo que el vendedor necesita saber');

  const conReservas = diaParaElCRM(pd({ tomadas: 8 }))!;
  ok(conReservas.bloquea === false && conReservas.titulo === TITULOS.abierto,
     'un día abierto con reservas va naranjo');
  ok(conReservas.ocupacion === 8 && conReservas.capacidad === 120,
     'y manda los dos enteros: el CRM arma el chip "8/120"');

  // **Un día abierto y vacío no se manda.** No tiene nada que informar y
  // llenaría el calendario del socio de naranjo sin dato.
  ok(diaParaElCRM(pd({})) === null, 'un día abierto y vacío no se publica');

  // Los números van solo cuando hay gente: "Cerrado · 0/120" leería como un
  // dato lo que es la ausencia de uno.
  ok(cerrado.ocupacion === null && cerrado.capacidad === null,
     'un día que bloquea y no tiene a nadie va sin números');
  ok(diaParaElCRM(pd({ bloqueada: true, tomadas: 5 }))!.ocupacion === 5,
     'pero si hay gente reservada en un día cerrado, se dice');

  // **El orden de las preguntas importa.** Exclusivo antes que privado: al
  // revés, todo exclusivo saldría naranjo y el socio podría vender un recinto
  // arrendado completo. Y cerrado primero, consistente con estaCerrado().
  ok(diaParaElCRM(pd({ privada: true, exclusiva: true }))!.bloquea === true,
     'un exclusivo nunca se lee como privado a secas');

  // Nada de lo interno viaja: la descripción la arma el propio archivo.
  for (const d of [cerrado, exclusivo, privado, conReservas]) {
    ok(d.titulo.length <= 30, `"${d.titulo}" cabe en el chip del CRM`);
    ok(!!d.descripcion, 'y lleva su descripción para el detalle');
  }

  // El id sale de la fecha y de nada más: publicar dos veces es un upsert.
  ok(idExterno('2026-11-07') === 'brasas-2026-11-07', 'el id sale de la fecha');
  ok(esNuestroId(idExterno('2026-11-07')), 'y se reconoce como nuestro');
  ok(!esNuestroId('ayc-2026-11-07'), 'el de otro origen no es nuestro');
  ok(fechaDelId('brasas-2026-11-07') === '2026-11-07', 'y se le saca la fecha');
  ok(fechaDelId('ayc-2026-11-07') === '', 'de uno ajeno no se saca ninguna');
  ok(fechaDelId(`${PREFIJO}chao`) === '', 'ni de uno nuestro con basura');

  // --- La reconciliación -------------------------------------------------
  const pub = (id: string, extra: Record<string, unknown> = {}) => ({
    external_id: id, fecha: id.slice(PREFIJO.length), titulo: TITULOS.abierto,
    descripcion: 'El restaurante abre al público ese día. Hay 8 personas con reserva.',
    bloquea: false, ocupacion: 8, capacidad: 120, ...extra
  });

  const deseado = diaParaElCRM(pd({ fecha: '2026-11-07', tomadas: 8 }))!;
  const yaIgual = leerPublicados({ externos: [pub('brasas-2026-11-07')] });
  ok(yaIgual.length === 1, 'se lee lo ya publicado');
  const sinCambios = reconciliar([deseado], yaIgual, '2026-11-01', '2027-01-30');
  ok(sinCambios.publicar.length === 0 && sinCambios.borrar.length === 0,
     'un día que ya dice lo mismo no se vuelve a mandar ni se borra');

  const cambiado = reconciliar(
    [diaParaElCRM(pd({ fecha: '2026-11-07', tomadas: 9 }))!],
    yaIgual, '2026-11-01', '2027-01-30');
  ok(cambiado.publicar.length === 1,
     'si cambió la ocupación se vuelve a mandar');

  // Lo que dejó de calificar dentro de la ventana se saca: sin esto le
  // quedaría un día naranjo fantasma.
  const yaNo = reconciliar([], yaIgual, '2026-11-01', '2027-01-30');
  ok(yaNo.borrar.length === 1 && yaNo.borrar[0] === 'brasas-2026-11-07',
     'un día nuestro que dejó de calificar se borra');

  // **Lo que no es nuestro no se toca nunca**, aunque caiga en nuestro día.
  const ajeno = leerPublicados({ externos: [
    { external_id: 'ayc-2026-11-07', fecha: '2026-11-07', titulo: 'Matrimonio',
      bloquea: true }
  ] });
  ok(reconciliar([], ajeno, '2026-11-01', '2027-01-30').borrar.length === 0,
     'un id de otro origen no se borra: la tabla es compartida');

  // Un día que ya pasó se saca: nadie vende el pasado, y sin esto la tabla
  // del socio crece para siempre.
  ok(reconciliar([], leerPublicados({ externos: [pub('brasas-2026-10-04')] }),
                 '2026-11-01', '2027-01-30').borrar.length === 1,
     'un día nuestro que ya pasó se borra');

  // **Y más allá de la ventana no se borra nada.** Es la decisión con filo:
  // un día rojo viejo le cuesta al socio una venta que sí se podía hacer; uno
  // borrado de más le deja vender un recinto arrendado en exclusiva, que es
  // un doble arriendo. Más allá de `hasta`, esta función no opina.
  ok(reconciliar([], leerPublicados({ externos: [pub('brasas-2027-06-12')] }),
                 '2026-11-01', '2027-01-30').borrar.length === 0,
     'un día nuestro más allá de la ventana se deja quieto');

  // --- El cuerpo del POST ------------------------------------------------
  // Es un array pelado, comprobado contra la API de verdad: con un objeto
  // envolvente responde "Ítem 0: falta external_id".
  const cuerpo = cuerpoDe([deseado, cerrado]) as Record<string, unknown>[];
  ok(Array.isArray(cuerpo), 'el cuerpo es un array');
  ok(cuerpo[0].external_id === 'brasas-2026-11-07' &&
     cuerpo[0].lugar === NUESTRO_LUGAR,
     'cada ítem lleva su external_id y nuestro lugar');
  ok(cuerpo[0].ocupacion === 8 && cuerpo[0].capacidad === 120,
     'la ocupación va en sus campos, no escrita en el título');
  ok(!(cuerpo[0].titulo as string).includes('/'),
     'el título NO trae el "8/120": el chip lo arma el CRM');
  ok(!('ocupacion' in cuerpo[1]) && !('capacidad' in cuerpo[1]),
     'un día sin números no manda los campos en null: los omite');

  // Nada interno viaja. Es lo que hace que no se pueda filtrar.
  const cuerpoEnTexto = JSON.stringify(cuerpo);
  for (const prohibido of ['nota', 'Nota', 'cliente', 'nombre']) {
    ok(!cuerpoEnTexto.includes(prohibido),
       `el cuerpo no lleva "${prohibido}": ni notas internas ni clientes`);
  }

  ok(tandas([1, 2, 3, 4, 5], 2).length === 3, 'se parte en tandas de a 2');
  ok(tandas([]).length === 0, 'una lista vacía no hace ninguna llamada');

  // Degradar, igual que al leer: una respuesta rota no tumba la
  // reconciliación de los demás días.
  ok(leerPublicados(null).length === 0, 'null se lee como lista vacía');
  ok(leerPublicados({ externos: 'no soy un arreglo' }).length === 0,
     'un campo externos que no es arreglo se lee vacío');
  ok(leerPublicados({ externos: [{ fecha: '2026-11-07' }] }).length === 0,
     'una fila sin external_id se descarta: no hay nada que reconciliar');
}

/* ---------- corregir un día cerrado (2026-11-03) ---------- */
{
  // Un día abierto recibe cualquier cambio, como siempre: sin motivo y de
  // cualquiera que tenga el permiso de la ruta.
  const abierto = corregirDiaCerrado({ cerrado: false, puedeCorregir: false });
  ok(abierto.ok && abierto.correccion === '', 'un día abierto no pide nada');

  // **Cerrado quiere decir bloqueado.** Antes era solo una marca y el día se
  // seguía editando igual; esta es la prueba de que ya no.
  const encargado = corregirDiaCerrado({ cerrado: true, puedeCorregir: false, motivo: 'me equivoqué' });
  ok(!encargado.ok && encargado.status === 409,
     'un día cerrado NO se toca sin el permiso de corregir, aunque traiga motivo');

  const sinMotivo = corregirDiaCerrado({ cerrado: true, puedeCorregir: true });
  ok(!sinMotivo.ok && sinMotivo.status === 400, 'quien puede corregir igual tiene que escribir el motivo');
  ok(!corregirDiaCerrado({ cerrado: true, puedeCorregir: true, motivo: '   ' }).ok,
     'un motivo en blanco no es un motivo');
  ok(!corregirDiaCerrado({ cerrado: true, puedeCorregir: true, motivo: 42 }).ok,
     'y un motivo que no es texto tampoco');

  const bien = corregirDiaCerrado({ cerrado: true, puedeCorregir: true, motivo: '  faltó la propina  ' });
  ok(bien.ok && bien.correccion === 'faltó la propina',
     'con permiso y motivo la corrección entra, con el motivo limpio para la bitácora');

  // Quién corrige: el administrador y quien paga. El encargado cierra el día
  // —con una advertencia—, pero corregirlo después ya no es suyo.
  ok(puede(ROL.admin, 'corregir') && puede(ROL.pagos, 'corregir'),
     'corrigen el administrador y quien paga');
  ok(!puede(ROL.encargado, 'corregir'), 'el encargado no corrige un día cerrado');
  ok(puede(ROL.admin, 'cerrar') && puede(ROL.encargado, 'cerrar') && puede(ROL.pagos, 'cerrar'),
     'cierran el día los tres roles del panel, el encargado incluido');
}

// ---------- La línea de la semana (2026-11-05) ----------
{
  const dia = (fecha: string, p: Record<string, unknown> = {}) => ({
    fecha, capacidad: 120, tomadas: 0, quedan: 120, pagadas: 0, porPagar: 0, porCobrar: 0,
    sinMonto: 0, privada: false, exclusiva: false, presupuestos: 0, presupuestadas: 0,
    semaforo: 'verde', bloqueada: false, notas: '', ...p
  }) as Ocupacion;
  const sab = '2026-11-28', dom = '2026-11-29';

  ok(listaDeDias([sab]) === 'sáb' && listaDeDias([sab, dom]) === 'sáb y dom'
     && listaDeDias(['2026-11-27', sab, dom]) === 'vie, sáb y dom',
     'los días se nombran como los diría una persona');

  const tranquila = lineaDeSemana({ dias: [dia(sab, { tomadas: 12 }), dia(dom, { tomadas: 5 })],
    reservas: [r({ fecha: sab, personas: 12 }), r({ fecha: dom, personas: 5 })], grupoGrande: 30 });
  ok(tranquila.personas === 17 && tranquila.reservas === 2 && tranquila.avisos.length === 0,
     'una semana normal es solo el conteo: personas y reservas, sin avisos');

  const cancelada = lineaDeSemana({ dias: [dia(sab)], grupoGrande: 30,
    reservas: [r({ fecha: sab, personas: 40, estadoPago: 'cancelled' })] });
  ok(cancelada.reservas === 0 && cancelada.avisos.length === 0,
     'una reserva que liberó su lugar no cuenta, ni como reserva ni como grupo grande');

  const grupo = lineaDeSemana({ dias: [dia(sab), dia(dom)], grupoGrande: 30,
    reservas: [r({ fecha: dom, personas: 30 }), r({ fecha: sab, personas: 29 })] });
  ok(grupo.avisos[0]?.texto === 'Dom: grupo de 30',
     'un grupo de 30 o más se avisa con su día y su tamaño; uno de 29 no');
  const varios = lineaDeSemana({ dias: [dia(sab), dia(dom)], grupoGrande: 30,
    reservas: [r({ fecha: dom, personas: 30 }), r({ fecha: sab, personas: 45 }),
               r({ fecha: dom, personas: 31 })] });
  ok(varios.avisos[0]?.texto === '3 grupos grandes · sáb y dom', 'varios grupos se cuentan en una pastilla');
  ok(lineaDeSemana({ dias: [dia(dom)], grupoGrande: 0,
       reservas: [r({ fecha: dom, personas: 90 })] }).avisos.length === 0,
     'con el umbral en cero no se avisa nunca');

  const urgente = lineaDeSemana({
    dias: [dia(sab, { bloqueada: true, tomadas: 4 }), dia(dom, { semaforo: 'rojo', quedan: 6, presupuestos: 2, presupuestadas: 43 })],
    reservas: [r({ fecha: dom, personas: 50 })], grupoGrande: 30,
    faltanEquipo: { [dom]: 2 }, crm: { [dom]: { confirmados: [], tentativos: [], personasConfirmadas: 150, personasTentativas: 0 } }
  });
  ok(urgente.avisos.length === MAX_AVISOS, 'nunca más de tres avisos');
  ok(urgente.avisos.map((a) => a.texto).join(' | ')
       === 'Sáb cerrado con 4 personas | Dom casi lleno | Dom: grupo de 50',
     'van en orden de urgencia: cerrado con gente, lleno, grupo grande');
  ok(urgente.avisos[0].tono === 'rojo' && urgente.avisos[1].tono === 'ambar',
     'cada aviso con su color');

  const resto = lineaDeSemana({ dias: [dia(sab, { presupuestos: 1, presupuestadas: 20 })],
    reservas: [], grupoGrande: 30, faltanEquipo: { [sab]: 1 },
    crm: { [sab]: { confirmados: [], tentativos: [], personasConfirmadas: 58, personasTentativas: 0 } } });
  ok(resto.avisos.map((a) => a.texto).join(' | ')
       === 'Falta equipo el sáb | 58 del CRM el sáb | 1 presupuesto · 20 posibles',
     'falta equipo, lo ganado en el CRM y los presupuestos, en ese orden y diciendo CRM');
  ok(lineaDeSemana({ dias: [dia(sab, { quedan: 0, semaforo: 'rojo', tomadas: 120 })],
       reservas: [], grupoGrande: 30 }).avisos[0]?.texto === 'Sáb lleno',
     'un día sin lugares dice lleno, no casi lleno');

  ok(leerConfigDe([['Clave', 'Valor']]).grupoGrande === 30, 'grupo grande parte en 30');
  ok(leerConfigDe([['Clave', 'Valor'], ['grupo_grande', '0']]).grupoGrande === 0,
     'y se puede apagar con un cero sin que vuelva solo a 30');
}

console.log('\nCotizaciones, fase 2');
{
  const HOY = '2026-11-10';
  const pre = (x: Partial<Presupuesto>): Presupuesto => ({
    id: 'PRE-1', fecha: '2026-11-21', cliente: '', email: '', telefono: '', documento: '', anticipo: null, saldoDias: null, uf: 0, fechaUF: '', horario: '', ley20393: false, acuerdos: '', contrato: '', contratoSubidoPor: '', contratoSubido: '', cambiosFecha: null, cancelacionDias: null, reembolso: null, devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '', enviada: '', ultimoSeguimiento: '', contratoEnviado: '', seguimientoDias: null, avisoEvento: null,
    estado: ESTADO_PRESUPUESTO.enviado, validoHasta: '2026-11-30', token: '', notas: '',
    idReserva: '', creadoPor: 'vero', creado: '', idCliente: 'C-0001',
    invitados: 0, periodo: '', tipoEvento: '', grupo: '', descuento: 0, motivo: '',
    fila: 2, ...x
  });
  const li = (x: Partial<LineaPresupuesto>): LineaPresupuesto => ({
    presupuesto: 'PRE-1', concepto: 'Tradiciones', cantidad: 10, precio: 44000,
    personas: 10, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0, fila: 2, ...x
  });
  const catalogo = [
    nuevoProducto({ nombre: 'Tradiciones', tipo: TIPO_PRODUCTO.menu, cotizacion: true }),
    nuevoProducto({ nombre: 'Once campestre', tipo: TIPO_PRODUCTO.extra, cotizacion: true,
                    iva: '+ IVA', precioCotizacion: 8000 }),
    nuevoProducto({ nombre: 'Show ecuestre', tipo: TIPO_PRODUCTO.show, cotizacion: true,
                    cobro: COBRO.fijo, precioCotizacion: 500000 })
  ];

  // --- Los estados de antes se leen con los nombres de hoy ---
  ok(estadoNormal('Aceptado') === 'Ganada' && estadoNormal('rechazado') === 'Perdida'
     && estadoNormal('Enviado') === 'Enviada',
     'los presupuestos viejos se leen con los estados nuevos, sin reescribir la planilla');
  ok(estadoNormal('negociacion') === 'Negociación', 'y los nuevos se entienden sin tilde');
  ok(!ESTADOS_A_MANO.includes('Ganada') && !ESTADOS_A_MANO.includes('No elegida'),
     'Ganada y No elegida no se ponen a mano: una la pone "Marcar ganada", la otra el sistema');

  // --- Las cuentas, como en una cotización ---
  const c1 = cuentasDe([li({ cantidad: 44, precio: 64000 })]);
  ok(c1.total === 2816000 && c1.neto + c1.iva === c1.total,
     'con IVA incluido el total es exactamente lo escrito, y neto + IVA cuadra');
  const c2 = cuentasDe([li({ cantidad: 10, precio: 8000, ivaIncluido: false })]);
  ok(c2.neto === 80000 && c2.iva === 15200 && c2.total === 95200,
     'una línea "+ IVA" es neta: se le suma el 19%');
  const c3 = cuentasDe([li({ cantidad: 10, precio: 10000, ivaIncluido: false, descuento: 10 })], 5);
  ok(c3.subtotal === 90000 && c3.neto === 85500 && c3.descuento === 4500 && c3.total === 101745,
     'el descuento de la línea y el del total se aplican los dos');
  for (const n of [1, 7, 33, 44, 120]) {
    const c = cuentasDe([li({ cantidad: n, precio: 44000 }), li({ cantidad: n, precio: 8000, ivaIncluido: false })], 15);
    ok(c.neto + c.iva === c.total && c.subtotal - c.descuento === c.neto,
       `las cuentas cuadran al peso con ${n} personas`);
  }

  // --- Las líneas que se guardan ---
  const listas = prepararLineas([
    li({ cantidad: 30, personas: 0 }),
    li({ concepto: 'once campestre', cantidad: 3, precio: 8000, sigue: true, personas: 9 }),
    li({ concepto: 'Arriendo especial', cantidad: 1, precio: 100000, personas: 50 })
  ], catalogo, 40, false);
  ok(listas[0].personas === 30, 'un menú son tantas personas como su cantidad');
  ok(listas[1].concepto === 'Once campestre' && listas[1].cantidad === 3 && listas[1].personas === 0
     && !listas[1].sigue,
     'una once vieja marcada "sigue" conserva su cantidad: nada sigue solo a los invitados, y no suma gente');
  ok(listas[2].personas === 0, 'una línea libre no inventa gente, aunque venga con un número');
  ok(!listas.some((l) => l.concepto === 'Show ecuestre'),
     'en un día privado el show no aparece solo: es opcional');

  const publico = prepararLineas([li({})], catalogo, 40, true);
  const show = publico.find((l) => l.concepto === 'Show ecuestre');
  ok(!!show && show.precio === 0, 'en un día público el show va siempre, incluido y a cero');
  const conPrecio = prepararLineas(
    [li({ concepto: 'Show ecuestre', precio: 500000, descuento: 10, personas: 0, cantidad: 1 })],
    catalogo, 40, true);
  ok(conPrecio.length === 1 && conPrecio[0].precio === 0 && conPrecio[0].descuento === 0,
     'y si alguien le pone precio en un día público, se le quita: no se cobra dos veces');
  const privado = prepararLineas(
    [li({ concepto: 'Show ecuestre', precio: 500000, cantidad: 1, personas: 0 })], catalogo, 40, false);
  ok(privado[0].precio === 500000, 'en un día privado el show cobra su precio');

  const once = lineaDeProducto(catalogo[1], 'PRE-1', 25, 8000);
  ok(!once.sigue && once.cantidad === 25 && !once.ivaIncluido,
     'agregar la once la deja con todos los invitados, sin seguirlos, y "+ IVA" como dice el catálogo');
  ok(prepararLineas([li({ concepto: 'Show ecuestre', cantidad: 3, precio: 500000, personas: 0 })],
       catalogo, 40, false)[0].cantidad === 1,
     'un monto fijo es siempre 1, aunque llegue con otra cantidad');
  ok(yaEstaEnLaCotizacion([li({ concepto: 'Lo Pirque' })], 'lo pirque')
     && !yaEstaEnLaCotizacion([li({ concepto: 'Lo Pirque' })], 'Niños')
     && !yaEstaEnLaCotizacion([], ''),
     'un producto ya agregado se reconoce sin tildes ni mayúsculas, y uno distinto no');
  const menu = lineaDeProducto(catalogo[0], 'PRE-1', 25, 44000);
  ok(lineaDeProducto(catalogo[0], 'PRE-1', 40, 44000, 0).cantidad === 40
     && lineaDeProducto(catalogo[0], 'PRE-1', 40, 19000, 40).cantidad === 0
     && lineaDeProducto(catalogo[0], 'PRE-1', 40, 19000, 30).cantidad === 10,
     'un menú nuevo toma solo los invitados que faltan: dos menús no suman 80 de 40');
  ok(lineaDeProducto(catalogo[0], 'PRE-1', 0, 44000, 0).cantidad === 1, 'sin invitados, el menú nace en 1');
  const dosMenus = prepararLineas([
    { ...lineaDeProducto(catalogo[0], 'PRE-1', 40, 44000), cantidad: 30, sigue: true },
    { ...lineaDeProducto(catalogo[0], 'PRE-1', 40, 44000), concepto: catalogo[0].nombre, cantidad: 10, sigue: true }
  ], catalogo, 40, false);
  ok(dosMenus.reduce((n, l) => n + l.personas, 0) === 40 && dosMenus.every((l) => !l.sigue),
     'un menú marcado "sigue a los invitados" no se infla a 40: la marca se ignora en los menús');
  {
    const cat2 = [...catalogo, nuevoProducto({ nombre: 'Niños', cotizacion: true })];
    const ls = [{ concepto: catalogo[0].nombre, cantidad: 40 }, { concepto: 'Niños', cantidad: 0 },
      { concepto: catalogo[1].nombre, cantidad: 40 }];
    const a = cambiarCantidad(ls, 1, 10, cat2, 40);
    ok(a[0].cantidad === 30 && a[1].cantidad === 10 && a[2].cantidad === 40,
       'subir los niños a 10 deja el primer menú en 30, y la once no se toca');
    ok(cambiarCantidad(a, 1, 4, cat2, 40)[0].cantidad === 36, 'bajarlos se los devuelve al primero');
    const b = cambiarCantidad(ls, 1, 55, cat2, 40);
    ok(b[0].cantidad === 0 && b[1].cantidad === 40, 'el primero nunca baja de cero');
    ok(cambiarCantidad(ls, 0, 35, cat2, 40)[1].cantidad === 0, 'cambiar el primero no mueve a los demás');
    ok(cambiarCantidad(ls, 1, 10, cat2, 0)[0].cantidad === 40, 'sin invitados no se reparte nada');
    const once = [{ concepto: catalogo[1].nombre, cantidad: 10 }];
    const ocho = cambiarCantidad(once, 0, 8, cat2, 10)[0];
    ok(ocho.cantidad === 8, '8 onces para 10 invitados');
    ok(prepararLineas([{ ...lineaDeProducto(catalogo[1], 'PRE-1', 10, 8000), ...ocho }], catalogo, 10, false)[0].cantidad === 8,
       'al guardar, las 8 onces quedan en 8 y no vuelven a 10');
  }
  ok(lineaDeProducto(catalogo[1], 'PRE-1', 40, 8000, 40).cantidad === 40,
     'la once sigue siendo de todos los invitados');
  ok(!menu.sigue && menu.personas === 25,
     'un menú NO sigue a los invitados: 40 pueden ser 30 adultos y 10 niños');

  // --- Qué día es público ---
  const fechas = [{ fecha: '2026-11-21', estado: 'Abierta' }, { fecha: '2026-11-22', estado: 'Privada' }];
  ok(esDiaPublico('2026-11-21', fechas) && !esDiaPublico('2026-11-22', fechas),
     'abierto es público; privado no');
  ok(!esDiaPublico('2026-11-25', fechas), 'un día que no está en el calendario cuenta como privado');

  // --- El cliente sale de la ficha ---
  const fichas = [{ id: 'C-0001', nombre: 'Ana Soto', correo: 'ana@x.cl',
                    telefono: '+56 9 1234 5678', empresa: '' }];
  ok(clienteDe(pre({ cliente: '' }), fichas).nombre === 'Ana Soto',
     'una cotización nueva no copia el nombre: lo lee de la ficha');
  ok(clienteDe(pre({ idCliente: '', cliente: 'Viejo SA', telefono: '+56 9 1' }), fichas).nombre === 'Viejo SA',
     'una de antes de las fichas sigue mostrando lo que tenía escrito');

  // --- Alternativas ---
  const lista = [
    pre({ id: 'A', grupo: 'A' }), pre({ id: 'B', grupo: 'A' }),
    pre({ id: 'C', grupo: 'A', estado: ESTADO_PRESUPUESTO.rechazado }),
    pre({ id: 'D', grupo: 'D' })
  ];
  ok(otrasAlternativas(lista[0], lista).map((p) => p.id).join() === 'B',
     'al ganar A, solo B pasa a No elegida: la perdida y las de otro grupo no se tocan');
  ok(otrasAlternativas(pre({ id: 'X' }), [pre({ id: 'X' }), pre({ id: 'Y', grupo: 'X' })])
       .map((p) => p.id).join() === 'Y',
     'la original sin grupo es la cabeza de su grupo');
  {
    const g = [
      pre({ id: 'A', grupo: 'A', estado: ESTADO_PRESUPUESTO.aceptado, idReserva: 'R1', enviada: '2026-11-10' }),
      pre({ id: 'B', grupo: 'A', estado: ESTADO_PRESUPUESTO.noElegida, enviada: '2026-11-10' }),
      pre({ id: 'C', grupo: 'A', estado: ESTADO_PRESUPUESTO.rechazado, enviada: '2026-11-10' }),
      pre({ id: 'D', grupo: 'D', estado: ESTADO_PRESUPUESTO.noElegida })
    ];
    const r = grupoSinGanar(g[0], g);
    ok(r.map((x) => `${x.id}:${x.estado}`).join() === 'A:Enviada,B:Enviada',
       'deshacer una ganada devuelve a carrera la ganada y su no elegida; la perdida y otro grupo no se tocan');
    ok(grupoSinGanar(pre({ id: 'X', estado: ESTADO_PRESUPUESTO.aceptado, enviada: '' }), [])[0].estado
         === ESTADO_PRESUPUESTO.borrador,
       'una ganada que nunca se mandó vuelve a borrador, no a enviada');
  }
  ok(!cuentaComoPosible(pre({ estado: ESTADO_PRESUPUESTO.noElegida }), HOY),
     'una no elegida ya no es gente posible');

  // --- Elegir antes de ganar, y el link único (2026-11-11) ---
  {
    const env = ESTADO_PRESUPUESTO.enviado;
    const tres = [
      pre({ id: 'A', grupo: 'A', estado: env }), pre({ id: 'B', grupo: 'A', estado: env }),
      pre({ id: 'C', grupo: 'A', estado: ESTADO_PRESUPUESTO.borrador })
    ];
    ok(faltaElegir(tres[0], tres) && faltaElegir(tres[2], tres),
       'con tres alternativas en carrera, ninguna se puede ganar sin elegir');
    ok(paraElLink(tres[1], tres).map((x) => x.id).join() === 'A,B,C',
       'el link de cualquiera muestra las tres juntas, en orden');
    const elegida = [tres[0], { ...tres[1], estado: ESTADO_PRESUPUESTO.noElegida },
      { ...tres[2], estado: ESTADO_PRESUPUESTO.noElegida }];
    ok(!faltaElegir(elegida[0], elegida), 'elegida la A, ya se puede ganar');
    ok(paraElLink(elegida[1], elegida).map((x) => x.id).join() === 'A',
       'elegida la A, el mismo link de la B muestra solo la A');
    ok(!sigueViva(elegida[1]) && sigueViva(pre({ estado: ESTADO_PRESUPUESTO.aceptado, idReserva: 'R' })),
       'una no elegida queda fuera; la ganada sigue');
    ok(!sigueViva(pre({ estado: ESTADO_PRESUPUESTO.cancelada, idReserva: 'R' })),
       'una cancelada ya no está en carrera, aunque tenga reserva');
    const ganada = [{ ...tres[0], idReserva: 'R1', estado: ESTADO_PRESUPUESTO.aceptado }, tres[1]];
    ok(paraElLink(tres[1], ganada).map((x) => x.id).join() === 'A',
       'con una ganada, el link muestra solo la ganada');
    ok(paraElLink(pre({ id: 'S', grupo: '' }), [pre({ id: 'S', grupo: '' })]).length === 1
       && !faltaElegir(pre({ id: 'S' }), [pre({ id: 'S' })]),
       'una cotización sola no pide elegir');
    const perdida = [{ ...tres[0], estado: ESTADO_PRESUPUESTO.rechazado }];
    ok(paraElLink(perdida[0], perdida).map((x) => x.id).join() === 'A',
       'si se perdió, el link sigue mostrando la suya');
    ok(vivasDelGrupo(tres[0], [...tres, pre({ id: 'D', grupo: 'D' })]).length === 3,
       'las vivas son solo las del grupo');
    const conCandidato = [tres[0], pre({ id: 'K', grupo: 'A', estado: ESTADO_PRESUPUESTO.candidato })];
    ok(paraElLink(tres[0], conCandidato).map((x) => x.id).join() === 'A',
       'un candidato no sale en el link del cliente');
  }

  // --- Sin fecha y candidatos ---
  const encP = ENCABEZADO_PRESUPUESTOS;
  const sinDia = leerPresupuestosDe([encP, filaPresupuesto(encP,
    pre({ fecha: '', periodo: 'marzo o abril', invitados: 120 }))]);
  ok(sinDia.length === 1 && sinDia[0].fecha === '' && sinDia[0].periodo === 'marzo o abril'
     && sinDia[0].invitados === 120, 'una cotización sin día exacto se guarda con su periodo');
  ok(leerPresupuestosDe([encP, filaPresupuesto(encP, pre({ fecha: '', periodo: '' }))]).length === 0,
     'sin día ni periodo no se lee: no se sabe de cuándo es');
  const pos = posiblesPorDia([
    pre({ id: 'P1', fecha: '', periodo: 'marzo', invitados: 100 }),
    pre({ id: 'P2', estado: ESTADO_PRESUPUESTO.candidato, invitados: 30 })
  ], [], HOY, false);
  ok(pos.size === 1 && pos.get('2026-11-21')?.personas === 30,
     'la sin fecha no ocupa ningún día; el candidato sin menús suma sus invitados como posibles');
  ok(posiblesPorDia([pre({ id: 'P2', estado: ESTADO_PRESUPUESTO.candidato, invitados: 30 }),
                     pre({ id: 'P3', estado: ESTADO_PRESUPUESTO.borrador, invitados: 30 })], [], HOY).size === 0,
     'en el calendario principal no cuentan ni el candidato ni el borrador: todavía no se mandaron');
  ok(posiblesPorDia([pre({ id: 'P4', estado: ESTADO_PRESUPUESTO.negociacion, invitados: 30 })], [], HOY)
       .get('2026-11-21')?.personas === 30,
     'una en negociación sí cuenta: ya se mandó');

  // --- El vendedor ---
  ok(puedeTocarPresupuesto(ROL.vendedor, 'Vero', 'vero') && !puedeTocarPresupuesto(ROL.vendedor, 'vero', 'hugo'),
     'el vendedor edita las suyas y no las de otro');
  ok(puedeTocarPresupuesto(ROL.encargado, 'carla', 'hugo'), 'los demás roles editan todas');
}

/* ---------- productos desactivados (2026-11-10) ---------- */
{
  const cat = [
    nuevoProducto({ nombre: 'Tradiciones' }),
    nuevoProducto({ nombre: 'Viejo', activo: false, cotizacion: true }),
    nuevoProducto({ nombre: 'Once', tipo: TIPO_PRODUCTO.extra, cotizacion: true }),
    nuevoProducto({ nombre: 'Show', tipo: TIPO_PRODUCTO.show, cotizacion: true, activo: false })
  ];
  ok(leerMenusDe([Object.values(COL_MENUS), ['Antiguo', '1', '2']])[0].activo,
     'un producto escrito antes de la columna Activo sigue activo');
  ok(JSON.stringify(leerMenusDe(aFilasMenus(cat))) === JSON.stringify(cat),
     'el desactivado se escribe y se vuelve a leer igual');
  ok(!paraReservar(cat).some((m) => m.nombre === 'Viejo')
     && paraCotizar(cat).map((m) => m.nombre).join() === 'Once',
     'un desactivado no se ofrece ni para reservar ni para cotizar');
  ok(productoDe('viejo', cat)?.nombre === 'Viejo',
     'pero lo viejo lo sigue encontrando, con su tipo y su precio');
  ok(showDe(cat) === undefined, 'un show desactivado no se agrega solo a un día público');
  ok(usados(cat, ['TRADICIONES', 'Otra cosa']).join() === 'Tradiciones',
     'usado es lo que aparece en reservas o cotizaciones, sin importar mayúsculas');
  ok(quitadosUsados(cat, cat.slice(1), ['Tradiciones']).join() === 'Tradiciones',
     'quitar uno usado se detecta');
  ok(quitadosUsados(cat, [cat[0], cat[1], cat[3]], ['Tradiciones']).length === 0,
     'quitar uno que nunca se usó se deja');
  ok(quitadosUsados(cat, [{ ...cat[0], nombre: 'Tradiciones 2' }, ...cat.slice(1)], ['Tradiciones'])
     .join() === 'Tradiciones', 'renombrar uno usado también cuenta como quitarlo');
}

/* ---------- el documento de la venta (2026-11-10) ---------- */
{
  ok(documentoDe('factura') === DOCUMENTO.factura && documentoDe(' BOLETA ') === DOCUMENTO.boleta
     && documentoDe('sin documento') === DOCUMENTO.sin, 'el documento se entiende con otras mayúsculas');
  ok(documentoDe('') === '' && documentoDe('cheque') === '',
     'en blanco o inventado queda por definir, no se inventa');
  const encP = ENCABEZADO_PRESUPUESTOS;
  const base = leerPresupuestosDe([encP, ['PRE-9', '2026-12-05']])[0];
  ok(base.documento === '', 'una cotización de antes queda por definir');
  const vuelta = leerPresupuestosDe([encP, filaPresupuesto(encP, { ...base, documento: DOCUMENTO.factura })]);
  ok(vuelta[0].documento === DOCUMENTO.factura, 'el documento va y vuelve de la planilla');
  ok(leerPresupuestosDe([encP.filter((c) => c !== 'Documento'), ['PRE-9', '2026-12-05']])[0].documento === '',
     'una planilla sin la columna se sigue leyendo');

  const c = leerClientesDe([ENCABEZADO_CLIENTES, filaCliente(ENCABEZADO_CLIENTES, {
    id: 'C-0001', nombre: 'Ana', empresa: 'Eventos SpA', rut: '76123456-7', domicilio: '',
    giro: 'Turismo', telefono: '', correo: '', notas: '', creadoPor: '', creado: '' })])[0];
  ok(c.giro === 'Turismo', 'el giro va y vuelve de la ficha');
  ok(leerClientesDe([ENCABEZADO_CLIENTES.filter((x) => x !== 'Giro'), ['C-1', 'Ana']])[0].giro === '',
     'una ficha de antes del giro se lee con el giro vacío');
  ok(faltaParaFactura(c).join() === 'dirección', 'para facturar falta solo lo que falta');
  ok(faltaParaFactura({ empresa: '', rut: '', giro: '', domicilio: '' }).length === 4,
     'y una ficha sin nada pide los cuatro');
  ok(limpiarCliente({ nombre: 'X', giro: '  Turismo ' }).giro === 'Turismo', 'el giro se limpia');
}

/* ---------- condiciones de pago y cobros (2026-11-10) ---------- */
{
  const cfg = { anticipoPct: 30, saldoDias: 3 };
  const c = condicionesDe({ anticipo: null, saldoDias: null, fecha: '2026-12-05' }, 1000001, cfg);
  ok(c.pct === 30 && c.anticipo === 300000 && c.anticipo + c.saldo === 1000001,
     'en blanco rige Configuración, y anticipo + saldo suman el total al peso');
  ok(c.saldoHasta === '2026-12-02', 'el saldo vence 3 días antes del evento');
  const neg = condicionesDe({ anticipo: 20, saldoDias: 10, fecha: '2026-12-05' }, 100000, cfg);
  ok(neg.anticipo === 20000 && neg.saldoHasta === '2026-11-25', 'lo negociado en la cotización manda');
  const sin = condicionesDe({ anticipo: 0, saldoDias: null, fecha: '' }, 100000, cfg);
  ok(sin.pct === 0 && sin.anticipo === 0 && sin.saldoHasta === '',
     'un 0 es sin anticipo —no "en blanco"—, y sin día no hay fecha de saldo');
  ok(numeroONulo('', 100) === null && numeroONulo('0', 100) === 0 && numeroONulo('150', 100) === 100
     && numeroONulo('25%', 100) === 25, 'en blanco es nulo, un cero es cero y se acota');

  const e0 = estadoCobros({ anticipo: 30000, total: 100000 }, []);
  ok(!e0.anticipoListo && e0.faltaAnticipo === 30000 && e0.falta === 100000, 'sin cobros falta todo');
  const e1 = estadoCobros({ anticipo: 30000, total: 100000 }, [{ monto: 10000 }, { monto: 20000 }]);
  ok(e1.anticipoListo && !e1.completo && e1.falta === 70000, 'dos pagos parciales cubren el anticipo');
  ok(estadoCobros({ anticipo: 30000, total: 100000 }, [{ monto: 100000 }]).completo,
     'pagar todo de una también paga el anticipo');
  ok(estadoCobros({ anticipo: 0, total: 100000 }, []).anticipoListo, 'sin anticipo se puede ganar sin cobros');
  ok(!estadoCobros({ anticipo: 0, total: 0 }, []).completo, 'sin total no se da nada por pagado');
  ok(!estadoCobros({ anticipo: 30000, total: 100000 }, [{ monto: 30000 }, { monto: -30000 }]).anticipoListo,
     'una devolución en negativo descuenta');

  ok(montoCobro('$30.000') === 30000 && montoCobro('−20.000') === -20000, 'el monto se entiende con puntos y signo');
  const l = limpiarCobro({ monto: '50.000', concepto: 'inventado', fecha: 'ayer' }, '2026-11-10');
  ok('cobro' in l && l.cobro.concepto === CONCEPTO_COBRO.otro && l.cobro.fecha === '2026-11-10'
     && l.cobro.monto === 50000, 'un concepto inventado es Otro, y sin fecha es hoy');
  ok('error' in limpiarCobro({ monto: '' }, '2026-11-10'), 'sin monto no es un cobro');
  const cob = { id: 'COB-1', presupuesto: 'PRE-1', fecha: '2026-11-10', concepto: CONCEPTO_COBRO.anticipo,
    monto: -5000, medio: 'transferencia', nota: '', registradoPor: 'vero', cuando: '',
    comprobante: 'archivo1', revisadoPor: 'Felipe', revisado: '2026-11-10 12:00' };
  const vuelta = leerCobrosDe([ENCABEZADO_COBROS, filaCobro(ENCABEZADO_COBROS, cob),
    filaCobro(ENCABEZADO_COBROS, { ...cob, id: 'COB-2', presupuesto: 'PRE-2' })]);
  ok(vuelta.length === 2 && vuelta[0].monto === -5000 && vuelta[0].medio === 'transferencia',
     'el cobro va y vuelve de la planilla, también en negativo');
  ok(cobrosDe(vuelta, 'PRE-1').length === 1, 'cada cotización ve solo sus cobros');
}

/* ---------- avisos de cobro (2026-11-10) ---------- */
{
  const cfg = { anticipoPct: 30, saldoDias: 3 };
  const base = { fecha: '2026-11-20', estado: 'Enviada', idReserva: '', anticipo: null, saldoDias: null, total: 100000 };
  const cot = [
    { ...base, id: 'A' },                                           // pagó anticipo, no ganada
    { ...base, id: 'B' },                                           // no pagó nada
    { ...base, id: 'C', estado: 'Ganada', idReserva: 'R1' },        // saldo vence el 17
    { ...base, id: 'D', estado: 'Ganada', idReserva: 'R2' },        // pagada completa
    { ...base, id: 'E', estado: 'Ganada', idReserva: 'R3', fecha: '2026-12-30' }, // saldo lejano
    { ...base, id: 'F', estado: 'Perdida' }                          // cerrada
  ];
  const cobros = [{ presupuesto: 'A', monto: 30000 }, { presupuesto: 'C', monto: 30000 },
    { presupuesto: 'D', monto: 100000 }, { presupuesto: 'F', monto: 30000 }];
  const a = avisosDeCobro(cot, cobros, cfg, '2026-11-10', ['Perdida', 'No elegida']);
  ok(a.anticipoSinGanar.map((x) => x.id).join() === 'A',
     'avisa la que pagó el anticipo y nadie marcó ganada; no la que no pagó ni la perdida');
  ok(a.saldo.length === 1 && a.saldo[0].id === 'C' && a.saldo[0].dias === 7 && a.saldo[0].monto === 70000,
     'el saldo avisa una semana antes, con lo que falta; ni la pagada ni la lejana');
  ok(avisosDeCobro(cot, cobros, cfg, '2026-11-19', ['Perdida'])
       .saldo.find((x) => x.id === 'C')?.dias === -2, 'un saldo vencido sale con días negativos');
  ok(diasEntre('2026-12-30', '2027-01-02') === 3 && diasEntre('2026-11-10', '2026-11-08') === -2,
     'los días se cuentan con fechas de texto, también cruzando el año');
}

/* ---------- la UF (2026-11-10) ---------- */
{
  ok(ufDeBoostr({ status: 'success', data: { date: '2026-11-10', value: 41302.33 } })?.valor === 41302.33,
     'la respuesta real de boostr se lee');
  ok(ufDeBoostr({ status: 'error', data: '', code: 'I-01' }) === null,
     'el error de boostr —que llega con HTTP 200— no se toma por una UF');
  ok(ufDeMindicador({ serie: [{ fecha: '2026-11-10T03:00:00.000Z', valor: 41302.33 }] })?.fecha === '2026-11-10',
     'mindicador se lee con la fecha de Chile');
  ok(ufDeBoostr({ status: 'success', data: { date: '2026-11-10', value: 413.02 } }) === null,
     'una UF fuera de rango es una respuesta rota, no se usa');
  ok(aPesos(2.61, 41302.33) === 107799 && enUF(2.61) === 'UF 2,61', 'UF 2,61 son $107.799');
  const conUF = prepararLineas([{ presupuesto: 'P', concepto: 'Matrimonio', cantidad: 10, precio: 0,
    personas: 10, precioUF: 2.61 }], [nuevoProducto({ nombre: 'Matrimonio', moneda: MONEDA.uf,
    precioCotizacion: 2.61, cotizacion: true })], 10, false, 41302.33);
  ok(conUF[0].precio === 107799 && conUF[0].precioUF === 2.61,
     'una línea en UF toma su precio en pesos de la UF de la cotización');
  ok(prepararLineas([{ presupuesto: 'P', concepto: 'X', cantidad: 1, precio: 5000, personas: 0 }],
    [], 0, false, 41302.33)[0].precio === 5000, 'una línea en pesos no se toca');
}

/* ---------- comprobantes y revisión (2026-11-10) ---------- */
{
  ok(idDeDrive('https://drive.google.com/drive/folders/0AEFMvctNNn8PUk9PVA') === '0AEFMvctNNn8PUk9PVA'
     && idDeDrive('0AEFMvctNNn8PUk9PVA') === '0AEFMvctNNn8PUk9PVA',
     'la carpeta de comprobantes se entiende pegando el link o solo el ID');
  ok(idDeDrive('mi carpeta') === '' && idDeDrive('') === '', 'lo que no parece un ID queda en blanco');
  ok(leerConfigDe(aFilasConfig({ ...POR_DEFECTO, driveComprobantes: '0AEFMvctNNn8PUk9PVA' }))
       .driveComprobantes === '0AEFMvctNNn8PUk9PVA', 'la carpeta va y vuelve de la configuración');
  ok(problemaConArchivo('image/jpeg', 300000) === '' && problemaConArchivo('application/pdf', 1000) === '',
     'una foto o un PDF se aceptan');
  ok(problemaConArchivo('application/zip', 1000) !== '' && problemaConArchivo('image/png', 5 * 1024 * 1024) !== '',
     'otro tipo, o más de 4 MB (lo que Vercel no recibe), no');
  ok(porRevisar([{ revisadoPor: '' }, { revisadoPor: 'Felipe' }]).length === 1,
     'por revisar son los que nadie revisó');
  const enc = ENCABEZADO_COBROS;
  const vieja = enc.slice(0, 9);
  const leido = leerCobrosDe([vieja, ['COB-1', 'PRE-1', '2026-11-10', 'Anticipo', '30000']])[0];
  ok(leido.comprobante === '' && leido.revisadoPor === '',
     'un cobro de antes de los comprobantes se lee sin comprobante y sin revisar');
}

/* ---------- alternativas dentro de la cotización (2026-11-10) ---------- */
{
  const encP = ENCABEZADO_PRESUPUESTOS;
  const base = leerPresupuestosDe([encP, ['PRE-100', '2026-12-05']])[0];
  const a = { ...base, id: 'PRE-100', grupo: 'PRE-100', invitados: 40 };
  const b = { ...base, id: 'PRE-200', grupo: 'PRE-100', invitados: 50 };
  const sola = { ...base, id: 'PRE-300', grupo: '', invitados: 10 };
  const lista = [b, sola, a];
  ok(alternativasDe(b, lista).map((x) => x.id).join() === 'PRE-100,PRE-200',
     'las alternativas de un grupo, en el orden en que se crearon');
  ok(letraDe(a, lista) === 'A' && letraDe(b, lista) === 'B' && letraDe(sola, lista) === '',
     'cada alternativa tiene su letra; una cotización sola no lleva');
  ok(principalDe([a, { ...b, idReserva: 'R1' }], () => true).id === 'PRE-200',
     'la ganada representa al grupo en las listas');
  const pos = posiblesPorDia(lista, [], '2026-11-10', false);
  ok(pos.get('2026-12-05')?.presupuestos === 2 && pos.get('2026-12-05')?.personas === 60,
     'dos alternativas del mismo cliente cuentan como una cotización y su gente no se suma (50 + 10, no 100)');
}

/* ---------- el contrato (Fase 4, 2026-11-10) ---------- */
{
  const lineas = [
    { concepto: 'Menú Lo Pirque', cantidad: 40, precio: 55000, descuento: 10, ivaIncluido: true },
    { concepto: 'Arriendo', cantidad: 1, precio: 1000000, descuento: 0, ivaIncluido: false }
  ];
  const cuentas = cuentasDe(lineas as never, 5);
  const datos: DatosContrato = {
    empresa: { nombre: 'Brasas de Lo Pirque', razonSocial: 'Inversiones Brasas SpA', rut: '76.000.000-0',
               representante: 'Ana Pérez', ciRepresentante: '11.111.111-1' },
    cliente: { nombre: 'Juan Soto', empresa: '', rut: '12.345.678-9', domicilio: 'Calle 1, Pirque', telefono: '' },
    folio: '1002', tipoEvento: 'Cumpleaños', lugar: 'Brasas de Lo Pirque, Pirque',
    fecha: '2026-12-05', horario: '13:00 a 18:00', invitados: 40, total: cuentas.total,
    condiciones: condicionesDe({ anticipo: null, saldoDias: null, fecha: '2026-12-05' }, cuentas.total,
      { anticipoPct: 30, saldoDias: 3 }),
    ley20393: false, acuerdos: '',
    tranquilidad: { cambiosFecha: 2, cancelacionDias: 60, reembolsoPct: 20 }
  };
  const cl = clausulasDe(datos);
  const texto = (c: typeof cl) => c.map((x) => [x.titulo, ...x.parrafos, ...(x.puntos ?? []),
    ...(x.despues ?? [])].join(' ')).join(' ');
  ok(cl.length === 8 && cl[0].titulo === 'PRIMERO: Antecedentes' && cl[7].titulo === 'OCTAVO: Medidas de tranquilidad',
     'el contrato trae las ocho cláusulas del CRM, numeradas');
  ok(texto(cl).includes(enPesos(cuentas.total)) && cl.find((c) => c.tabla)?.titulo === 'TERCERO: Precio',
     'el precio del contrato es el total de la cotización, con sus descuentos: la tabla va en la tercera');
  ok(texto(cl).includes(enPesos(datos.condiciones.anticipo)) && texto(cl).includes(enPesos(datos.condiciones.saldo))
     && datos.condiciones.anticipo + datos.condiciones.saldo === cuentas.total,
     'anticipo y saldo del contrato salen de las mismas condiciones de la cotización y suman el total');
  ok(texto(cl).includes('al firmar el presente contrato'), 'el anticipo se paga al firmar');
  ok(texto(cl).includes('miércoles 2 de diciembre de 2026'), 'el saldo dice hasta qué día, 3 días antes del evento');
  ok(!/Asados y Corderos/.test(texto(cl)) && texto(cl).includes('Brasas de Lo Pirque no responderá'),
     'la cláusula sexta dice el prestador, no "Asados y Corderos" escrito fijo');
  const sinAnt = clausulasDe({ ...datos, condiciones: { ...datos.condiciones, pct: 0, anticipo: 0, saldo: cuentas.total } });
  ok(!texto(sinAnt).includes('al firmar') && texto(sinAnt).includes('El Precio Total, equivalente'),
     'sin anticipo, el contrato no pide pagar nada al firmar');
  const todo = clausulasDe({ ...datos, ley20393: true, acuerdos: 'Torta de regalo.\nGarzón extra.' });
  ok(todo.length === 10 && todo[8].titulo === 'NOVENO: Responsabilidad Penal Ley 20.393'
     && todo[8].parrafos[0] === LEY_20393 && todo[9].titulo === 'DÉCIMO: Acuerdos adicionales'
     && todo[9].parrafos.length === 2,
     'la Ley 20.393 y los acuerdos van solo si corresponde, y la numeración se corre sola');
  ok(clausulasDe({ ...datos, acuerdos: 'Torta.' })[8].titulo === 'NOVENO: Acuerdos adicionales',
     'sin la Ley 20.393, los acuerdos son la novena');
  ok(comparecencia(datos, 'Pirque').includes('**Juan Soto**, RUT 12.345.678-9')
     && comparecencia(datos, 'Pirque').startsWith(`En Pirque, a ${RAYA}`),
     'una persona firma por sí misma; la fecha de firma queda para escribirla a mano');
  const conEmpresa = comparecencia({ ...datos, cliente: { ...datos.cliente, empresa: 'Eventos del Maipo SpA' } }, '');
  ok(conEmpresa.includes('**Eventos del Maipo SpA**, RUT 12.345.678-9, representada por Juan Soto')
     && conEmpresa.startsWith(`En ${RAYA}`),
     'una empresa firma por su razón social, representada por la persona de la ficha');
  ok(comparecencia({ ...datos, cliente: { ...datos.cliente, rut: '', domicilio: '' } }, 'Pirque').split(RAYA).length === 4,
     'lo que falta sale con una raya para completarlo a mano');
  ok(faltaDelCliente({ rut: '', domicilio: ' ' }).join() === 'RUT,domicilio'
     && faltaDelCliente({ rut: '1-9', domicilio: 'x' }).length === 0, 'al cliente le faltan el RUT y el domicilio');
  ok(faltaDeEmpresa({ razonSocial: 'x', rut: 'x', representante: 'x', ciRepresentante: '' }).join() === 'cédula del representante',
     'a la empresa le falta la cédula del representante');
  ok(horarioDe({ horario: '' }, { horaApertura: '13:00', horaCierre: '18:00' }) === '13:00 a 18:00'
     && horarioDe({ horario: '20:00 a 02:00' }, { horaApertura: '13:00', horaCierre: '18:00' }) === '20:00 a 02:00',
     'el horario es el de la cotización, o el de Configuración');
  ok(texto(cl).includes('la celebración de un cumpleaños')
     && texto(clausulasDe({ ...datos, tipoEvento: 'Empresa' })).includes('la celebración de un evento de empresa'),
     'el tipo de evento se lee como frase: "un evento de empresa", no "de empresa"');
  ok(texto(cl).includes('cambiar dos veces la fecha')
     && texto(cl).includes('hasta con 60 días de anticipación y con un reembolso del 20% de lo pagado'),
     'las medidas de tranquilidad dicen lo de Configuración (por defecto, las del CRM)');
  const otra = clausulasDe({ ...datos, tranquilidad: { cambiosFecha: 1, cancelacionDias: 30, reembolsoPct: 0 } });
  ok(texto(otra).includes('cambiar una vez la fecha') && texto(otra).includes('30 días de anticipación, sin reembolso'),
     'otros plazos cambian el texto; sin reembolso lo dice');
  const sinNada = clausulasDe({ ...datos, ley20393: true, tranquilidad: { cambiosFecha: 0, cancelacionDias: 0, reembolsoPct: 20 } });
  ok(!texto(sinNada).includes('tranquilidad') && sinNada[7].titulo === 'OCTAVO: Responsabilidad Penal Ley 20.393',
     'sin cambios de fecha ni cancelación no hay cláusula, y la numeración se corre');
  ok(texto(clausulasDe({ ...datos, tranquilidad: { cambiosFecha: 0, cancelacionDias: 60, reembolsoPct: 20 } })).includes('cancelar')
     && !texto(clausulasDe({ ...datos, tranquilidad: { cambiosFecha: 0, cancelacionDias: 60, reembolsoPct: 20 } })).includes('cambiar'),
     'un 0 en los cambios de fecha saca solo esa frase');
  const cfgLeida = leerConfigDe(aFilasConfig({ ...POR_DEFECTO, cambiosFecha: 3, cancelacionDias: 45, reembolsoPct: 50 }));
  ok(cfgLeida.cambiosFecha === 3 && cfgLeida.cancelacionDias === 45 && cfgLeida.reembolsoPct === 50
     && leerConfigDe([['Clave', 'Valor']]).cancelacionDias === 60,
     'los plazos del contrato van y vuelven de Config; sin la fila rigen los del CRM');
  ok(fechaLarga('') === RAYA && clausulasDe({ ...datos, fecha: '' })[0].puntos?.[1] === `Fecha: ${RAYA}`,
     'sin día, la fecha del contrato queda con raya');

  const encP = ENCABEZADO_PRESUPUESTOS;
  const base = leerPresupuestosDe([encP, ['PRE-9', '2026-12-05']])[0];
  ok(base.ley20393 === false && base.contrato === '' && base.horario === '',
     'una cotización de antes del contrato se lee sin contrato');
  const vuelta = leerPresupuestosDe([encP, filaPresupuesto(encP, { ...base, ley20393: true, acuerdos: 'Torta',
    horario: '20:00 a 02:00', contrato: 'abc', contratoSubidoPor: 'Ana', contratoSubido: '2026-11-10 12:00' })])[0];
  ok(vuelta.ley20393 && vuelta.acuerdos === 'Torta' && vuelta.horario === '20:00 a 02:00'
     && vuelta.contrato === 'abc' && vuelta.contratoSubidoPor === 'Ana',
     'lo del contrato va y vuelve de la planilla');
}

/* ---------- una cotización ganada llega entera a Reservas y ocupa el día (2026-11-11) ---------- */
{
  // El camino completo de "Marcar ganada", sin la planilla: la cotización se
  // vuelve fila de Reservas, la fila se vuelve a leer, y el día —abierto con
  // la regla de una reserva a mano— la cuenta.
  const catalogo = [nuevoProducto({ nombre: 'Lo Pirque', precioEnLinea: 25000, precioEnLocal: 25000 })];
  const encP = ENCABEZADO_PRESUPUESTOS;
  const base = leerPresupuestosDe([encP, ['PRE-77', '2026-11-11']])[0];
  const p = { ...base, cliente: 'Dei Mudder', email: 'dei@correo.cl', telefono: '+56 9 1234 5678',
    invitados: 40, descuento: 0 };
  const lineas = [{ presupuesto: 'PRE-77', concepto: 'Lo Pirque', cantidad: 40, precio: 25000,
    personas: 40, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0, fila: 2 }];
  const r = reservaDesdePresupuesto(p, lineas as never, catalogo, 'Verónica');
  const enc = Object.values(COL_RESERVAS) as string[];
  const fila = filaReserva(enc, { ...r, id: 'MANUAL-1', creada: '2026-11-11' }).map(String);
  const leida = leerReservasDe([enc, fila])[0];
  ok(leida.fecha === '2026-11-11' && leida.nombre === 'Dei Mudder' && leida.email === 'dei@correo.cl'
     && leida.telefono === '+56 9 1234 5678' && leida.personas === 40 && leida.monto === 1000000
     && /40 × Lo Pirque/.test(leida.menu) && leida.anotadaPor === 'Verónica'
     && leida.notaPago.includes('cotización'),
     'una cotización ganada llega a Reservas con fecha, cliente, contacto, menús, personas, monto y quién la ganó');
  const dia = diaParaReservaManual(undefined, '2026-11-11', POR_DEFECTO);
  ok(!!dia && dia.capacidad === POR_DEFECTO.cupoNormal && esPrivada(dia.estado),
     'el día de una ganada que no estaba en el calendario se abre privado, con el cupo de siempre');
  const occ = ocupacionDe([leida], { ...dia!, fila: 2 });
  ok(occ.tomadas === 40 && occ.quedan === POR_DEFECTO.cupoNormal - 40,
     'y ese día cuenta a la gente de la cotización: ocupa cupo');
}

console.log('\nCancelar una cotización ganada');
{
  const CFG = { cambiosFecha: 2, cancelacionDias: 60, reembolsoPct: 20 };
  // Las condiciones: en blanco rige Configuración, y un 0 escrito es 0.
  const enBlanco = { cambiosFecha: null, cancelacionDias: null, reembolso: null };
  ok(JSON.stringify(tranquilidadDeCotizacion(enBlanco, CFG)) === JSON.stringify(CFG),
     'una cotización sin condiciones propias usa las de Configuración');
  const negociada = tranquilidadDeCotizacion({ cambiosFecha: 0, cancelacionDias: 30, reembolso: 50 }, CFG);
  ok(negociada.cambiosFecha === 0 && negociada.cancelacionDias === 30 && negociada.reembolsoPct === 50,
     'y las negociadas mandan, también un 0 (sin cambios de fecha)');

  // El contrato imprime las de la cotización, y dice "de lo pagado".
  const parrafos = tranquilidadDe(negociada).join(' ');
  ok(/hasta con 30 días/.test(parrafos) && /50% de lo pagado/.test(parrafos) && !/cambiar/.test(parrafos),
     'el contrato imprime las condiciones de la cotización, con el % sobre lo pagado');
  ok(/30 días antes con devolución del 50% de lo pagado/.test(frasesCancelacion(negociada)),
     'y la ventana de cotizar dice lo mismo en una frase');

  // Lo que se devuelve: el % sobre lo pagado, solo en plazo.
  const cobros = [
    { monto: 300000, concepto: 'Anticipo' }, { monto: 200000, concepto: 'Saldo' }
  ];
  const enPlazo = devolucionSugerida(cobros, '2027-03-20', '2026-11-11', CFG);
  ok(enPlazo.enPlazo && enPlazo.pagado === 500000 && enPlazo.devolver === 100000,
     'cancelando con más de 60 días se devuelve el 20% de lo pagado');
  const justo = devolucionSugerida(cobros, '2027-01-10', '2026-11-11', CFG);
  ok(justo.dias === 60 && justo.enPlazo, 'el día 60 justo todavía está en plazo ("hasta con 60 días")');
  const tarde = devolucionSugerida(cobros, '2026-12-01', '2026-11-11', CFG);
  ok(!tarde.enPlazo && tarde.devolver === 0 && tarde.dias === 20,
     'fuera de plazo el contrato no obliga a devolver nada');
  ok(devolucionSugerida(cobros, '2027-03-20', '2026-11-11', { ...CFG, cancelacionDias: 0 }).devolver === 0,
     'sin días de cancelación el contrato no promete cancelar: no hay devolución');
  const conDevuelto = devolucionSugerida([...cobros, { monto: -50000, concepto: CONCEPTO_DEVOLUCION }],
    '2027-03-20', '2026-11-11', CFG);
  ok(conDevuelto.pagado === 500000, 'lo pagado no descuenta las devoluciones: el % es sobre lo que entró');

  // Lo que falta devolver.
  const f1 = faltaDevolver(100000, cobros);
  ok(f1.devuelto === 0 && f1.falta === 100000, 'sin devoluciones anotadas falta todo lo acordado');
  const f2 = faltaDevolver(100000, [...cobros, { monto: -60000, concepto: CONCEPTO_DEVOLUCION }]);
  ok(f2.devuelto === 60000 && f2.falta === 40000, 'una devolución parcial deja lo que falta');
  ok(faltaDevolver(100000, [{ monto: -120000, concepto: CONCEPTO_DEVOLUCION }]).falta === 0,
     'devolver de más no deja un "falta" negativo');
  ok(CONCEPTO_DEVOLUCION === CONCEPTO_COBRO.devolucion,
     'el concepto de la devolución es el mismo en los cobros y en la cancelación');

  // La cotización: columnas nuevas, ida y vuelta, y el estado.
  const enc = [...ENCABEZADO_PRESUPUESTOS];
  const fila = new Array(enc.length).fill('');
  const poner = (col: string, v: string) => { fila[enc.indexOf(col)] = v; };
  poner('ID', 'PRE-9'); poner('Fecha', '2027-01-16'); poner('Estado', 'Cancelada');
  poner('ID Reserva', 'MANUAL-9'); poner('Cancelación días', '0'); poner('Reembolso %', '');
  poner('Devolución acordada', '100000'); poner('Cancelada por', 'Verónica');
  const leida = leerPresupuestosDe([enc, fila])[0];
  ok(leida.cancelacionDias === 0 && leida.reembolso === null && leida.cambiosFecha === null
     && leida.devolucion === 100000 && leida.canceladaPor === 'Verónica',
     'las condiciones de cancelación se leen con 0 distinto de en blanco, y la devolución acordada');
  const vuelta = leerPresupuestosDe([enc, filaPresupuesto(enc, leida)])[0];
  ok(vuelta.cancelacionDias === 0 && vuelta.reembolso === null && vuelta.devolucion === 100000,
     'y se escriben igual: ida y vuelta sin perder el 0');
  ok(estadoVisible(leida, '2026-11-11') === ESTADO_PRESUPUESTO.cancelada,
     'una cancelada se ve Cancelada aunque conserve su ID Reserva');
  ok(!cuentaComoPosible(leida, '2026-11-11'), 'y no cuenta como gente posible');

  // Los avisos de cobro no le cobran el saldo a una cancelada.
  const av = avisosDeCobro([{ id: 'PRE-9', fecha: '2026-11-13', estado: ESTADO_PRESUPUESTO.cancelada,
    idReserva: 'MANUAL-9', anticipo: null, saldoDias: null, total: 1000000 }],
    [{ presupuesto: 'PRE-9', monto: 300000 }], { anticipoPct: 30, saldoDias: 3 }, '2026-11-11', []);
  ok(av.saldo.length === 0, 'a una cancelada no se le avisa el saldo por cobrar');
}

console.log('\nCancelar devuelve el día a como estaba');
{
  const dia = (estado: string) => ({ fecha: '2026-11-11', capacidad: 120, apertura: '13:00', estado, notas: 'ojo', fila: 7 });
  ok(queLeHizo(undefined) === 'creado', 'ganar en un día que no estaba lo crea');
  ok(queLeHizo(dia('Cerrada')) === 'reabierto', 'ganar en un día cerrado lo reabre');
  ok(queLeHizo(dia('Abierta')) === '' && queLeHizo(dia('Privada')) === '',
     'un día que ya estaba abierto no lo abrió la cotización');
  const b = deshacerDia(dia('Privada'), 'creado', 0);
  ok(!!b && 'borrar' in b, 'cancelada la única reserva, un día creado por ella se borra');
  ok(deshacerDia(dia('Privada'), 'creado', 1) === null,
     'con otra reserva que ocupa lugar, el día se queda como está');
  const c = deshacerDia(dia('Privada'), 'reabierto', 0);
  ok(!!c && 'dia' in c && c.dia.estado === 'Cerrada' && c.dia.capacidad === 120 && c.dia.notas === 'ojo',
     'un día reabierto vuelve a cerrado, con su cupo y sus notas');
  ok(deshacerDia(dia('Abierta'), '', 0) === null, 'un día que no abrió la cotización no se toca');
  ok(deshacerDia(undefined, 'creado', 0) === null, 'si el día ya no está, no hay nada que deshacer');
}

console.log('\nLos roles se explican desde la tabla de permisos');
{
  for (const r of ROLES_DE_CUENTA) {
    const { puede: si, noPuede: no } = resumenRol(r);
    ok(si.length + no.length === Object.keys(PERMISOS).length,
       `${r}: cada permiso aparece una vez, en "puede" o en "no puede"`);
    ok(!!NOMBRE_ROL[r] && !!RESUMEN_ROL[r], `${r}: tiene nombre y línea corta`);
  }
  ok(resumenRol(ROL.admin).noPuede.length === 0, 'el administrador puede todo');
  ok(resumenRol(ROL.pagos).noPuede.length === 2, 'pagos no puede dos cosas: cuentas y mantención');
  ok(resumenRol(ROL.vendedor).puede.some((f) => f.includes('solo las suyas')),
     'al vendedor se le dice que toca solo lo suyo');
}

console.log('\nEl seguimiento de lo mandado');
{
  const HOY = '2026-11-11';
  const cfg = { seguimientoDias: 5, avisoEvento: 14 };
  const pre = (x: Partial<Presupuesto>): Presupuesto => ({
    ...leerPresupuestosDe([ENCABEZADO_PRESUPUESTOS, ['PRE-1', '2026-12-20']])[0],
    estado: ESTADO_PRESUPUESTO.enviado, enviada: '2026-11-01', ...x });
  ok(seguimientoDe(pre({ estado: ESTADO_PRESUPUESTO.borrador }), HOY, cfg) === null,
     'un borrador no pregunta: todavía no se mandó');
  const sr = seguimientoDe(pre({}), HOY, cfg);
  ok(sr?.motivo === 'sinRespuesta' && sr.dias === 10, 'mandada hace 10 días sin moverse: pregunta');
  ok(seguimientoDe(pre({ enviada: '2026-11-09' }), HOY, cfg) === null, 'mandada hace 2 días: todavía no');
  ok(seguimientoDe(pre({ ultimoSeguimiento: '2026-11-09' }), HOY, cfg) === null,
     '"sigue esperando" hace 2 días la posterga');
  ok(seguimientoDe(pre({ seguimientoDias: 15 }), HOY, cfg) === null,
     'el plazo de la cotización le gana al de Configuración');
  ok(seguimientoDe(pre({ seguimientoDias: 0 }), HOY, cfg) === null, 'en 0 no pregunta');
  const ce = seguimientoDe(pre({ fecha: '2026-11-21', enviada: '2026-11-10' }), HOY, cfg);
  ok(ce?.motivo === 'eventoCerca' && ce.dias === 10, 'el evento a 10 días pregunta aunque se mandó ayer');
  ok(seguimientoDe(pre({ fecha: '2026-11-21', avisoEvento: 7, enviada: '2026-11-10' }), HOY, cfg) === null,
     'con 7 días antes del evento, a 10 todavía no');
  ok(seguimientoDe(pre({ idReserva: 'R1' }), HOY, cfg) === null, 'una ganada no pregunta');
  ok(!estaVencido(pre({ estado: ESTADO_PRESUPUESTO.borrador, validoHasta: '2026-11-01' }), HOY),
     'un borrador no vence: la vigencia corre desde que se manda');
  ok(estaVencido(pre({ validoHasta: '2026-11-01' }), HOY), 'una mandada sí vence');
  const cs = seguimientoDe(pre({ idReserva: 'R1', contratoEnviado: '2026-11-03' }), HOY, cfg);
  ok(cs?.motivo === 'contratoSinFirmar' && cs.dias === 8,
     'una ganada con el contrato mandado hace 8 días y sin firmar pregunta si volvió firmado');
  ok(seguimientoDe(pre({ idReserva: 'R1', contratoEnviado: '2026-11-03', contrato: 'drive-id' }), HOY, cfg) === null,
     'con el firmado subido ya no pregunta');
  ok(seguimientoDe(pre({ idReserva: 'R1', contratoEnviado: '2026-11-03', ultimoSeguimiento: '2026-11-09' }), HOY, cfg) === null,
     '"sigue esperando" también posterga lo del contrato');
  ok(seguimientoDe(pre({ idReserva: 'R1', contratoEnviado: '2026-11-09' }), HOY, cfg) === null,
     'mandado hace 2 días: todavía no');
}

console.log('\nEl cupo al ganar una cotización');
{
  const cfg = { cupoNormal: 120, horaApertura: '13:00' };
  const abierto = { estado: 'Abierta', capacidad: 150 };
  ok(cupoParaGanar(abierto, '2026-11-21', cfg, 100, 40).cabe, '150 de cupo, 100 tomadas: caben 40');
  const lleno = cupoParaGanar(abierto, '2026-11-21', cfg, 130, 40);
  ok(!lleno.cabe && lleno.libres === 20, 'con 130 tomadas quedan 20 y 40 no caben');
  ok(cupoParaGanar(undefined, '2026-11-21', cfg, 0, 100).cabe
     && !cupoParaGanar(undefined, '2026-11-21', cfg, 0, 150).cabe,
     'un día que no existe se abre con el cupo de siempre: 100 caben, 150 no');
  ok(cupoParaGanar({ estado: 'Cerrada', capacidad: 0 }, '2026-11-21', cfg, 0, 100).capacidad === 120,
     'un día cerrado sin cupo se reabre con el de siempre');
  const excl = cupoParaGanar({ estado: 'Privada exclusiva', capacidad: 300 }, '2026-11-21', cfg, 50, 10);
  ok(!excl.cabe && excl.exclusivo, 'un día exclusivo con alguien adentro no recibe otro evento');
}

console.log('\nEl rol de anfitrión');
ok((Object.keys(PERMISOS) as Accion[]).filter((x) => puede(ROL.anfitrion, x)).join() === 'asistencia',
   'la anfitriona tiene un solo permiso: marcar la asistencia');
ok(!puede(ROL.anfitrion, 'ver') && !puede(ROL.anfitrion, 'reservas'),
   'no ve el calendario ni edita reservas');
ok(!puede(ROL.vendedor, 'asistencia'), 'el vendedor no marca asistencia: marcar no es vender');
ok(esRolDeCuenta('anfitrion') && esRolDeCuenta('Anfitrión'), 'es un rol de cuenta, con o sin tilde');

console.log('\nLa entrada se marca desde la hora de apertura');
ok(!yaAbrio('2026-11-14', '13:00', '2026-11-13 20:00'), 'el día anterior, no');
ok(!yaAbrio('2026-11-14', '13:00', '2026-11-14 12:59'), 'el mismo día antes de abrir, no');
ok(yaAbrio('2026-11-14', '13:00', '2026-11-14 13:00'), 'desde la hora de apertura, sí');
ok(yaAbrio('2026-11-14', '9:30', '2026-11-14 10:00'), 'una hora de un dígito se entiende');
ok(yaAbrio('2026-11-14', '13:00', '2026-11-15 09:00'), 'un día pasado ya abrió');
ok(yaAbrio('2026-11-14', '', '2026-11-14 08:00'), 'sin hora de apertura, vale todo el día');

console.log('\nCuándo se puede marcar ganada');
ok(puedeGanar(true, false), 'con el anticipo pagado se gana');
ok(puedeGanar(false, true), 'con el contrato firmado se gana aunque falte el anticipo');
ok(!puedeGanar(false, false), 'sin anticipo pagado ni contrato firmado, no');

console.log('\nCómo se ingresa en Fudo');
{
  const carta = [
    nuevoProducto({ nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000 }),
    nuevoProducto({ nombre: 'Niños', precioEnLinea: 19000, precioEnLocal: 24000 })
  ];
  const base = { id: '7345', menu: '3 × Tradiciones + 1 × Niños', monto: 151000, abonado: null };
  const directo = comoIngresar({ ...base, tipoPago: 'Pago directo', estadoPago: 'paid' }, carta);
  ok(directo?.tono === 'verde' && directo.lineas[0] === '3 × Tradiciones · pago directo',
     'pago directo pagado: se ingresa como pago directo, menú por menú');
  const solo = comoIngresar({ ...base, tipoPago: 'Solo reserva', estadoPago: 'pending' }, carta);
  ok(solo?.tono === 'ambar' && solo.titulo.startsWith('Solo reserva')
     && solo.lineas[0] === '3 × Tradiciones a $49.000 · sin descuento',
     'solo reserva: Tradiciones a $49.000, no a $44.000');
  ok(solo?.lineas.includes('Total a cobrar: $171.000') ?? false,
     'y el total sale de la carta sin descuento, no del monto de Shopify');
  const raro = comoIngresar({ ...base, tipoPago: 'Pago directo', estadoPago: 'pending' }, carta);
  ok(raro?.tono === 'rojo', 'compró pago directo y no aparece pagado: se avisa, no se adivina');
  const manual = comoIngresar({ ...base, id: 'MANUAL-1', tipoPago: '', estadoPago: 'paid' }, carta);
  ok(manual?.tono === 'verde', 'una reserva a mano pagada también va como pago directo');
  const abonada = comoIngresar({ ...base, id: 'MANUAL-2', tipoPago: '', estadoPago: 'partially_paid', abonado: 71000 }, carta);
  ok(abonada?.tono === 'cielo' && abonada.lineas.includes('Falta por cobrar: $100.000'),
     'abonada: dice cuánto abonó y cobra el resto de la carta');
  const cot = comoIngresar({ ...base, id: 'MANUAL-3', tipoPago: '', estadoPago: 'pending', monto: 2000000 }, carta, true);
  ok(!!cot?.lineas.includes('Total a cobrar: $2.000.000') && !!cot && !cot.lineas.some((l) => l.includes('49.000')),
     'de una cotización: el precio acordado, no el de la carta');
  ok(comoIngresar({ ...base, menu: '2 × Menú Tradiciones', tipoPago: 'Solo reserva', estadoPago: 'pending' }, carta)
       ?.lineas[0] === '2 × Menú Tradiciones a $49.000 · sin descuento',
     'una fila vieja con "Menú Tradiciones" encuentra igual su precio');
  ok(comoIngresar({ ...base, tipoPago: 'Solo reserva', estadoPago: 'cancelled' }, carta) === null,
     'una cancelada no se ingresa');
}

console.log('\nVista gerencia');
{
  ok(puedeVer(ROL.vendedor, 'informe', true) && !puede(ROL.vendedor, 'informe'),
     'un vendedor con vista gerencia VE el informe, pero su rol no lo cambia');
  ok(puedeVer(ROL.encargado, 'sueldos', true) && !puede(ROL.encargado, 'sueldos'),
     'el encargado con vista gerencia ve los sueldos de las fichas; guardarlos sigue pidiendo el rol');
  ok(!puedeVer(ROL.vendedor, 'informe', false), 'sin la vista gerencia, el vendedor no ve el informe');
  ok(NO_SE_LEE_CON_GERENCIA.every((a) => !puedeVer(ROL.encargado, a, true)),
     'ni con vista gerencia se ven las cuentas, la mantención ni los links personales');
  ok(!puedeVer(ROL.ninguno, 'ver', true), 'sin sesión, la gerencia no abre nada');
  const conG = await firmarSesion({ usuario: 'Felipe', rol: ROL.pagos, gerencia: true }, SECRETO_SESION, AHORA);
  ok((await leerSesion(conG, SECRETO_SESION, AHORA))?.gerencia === true,
     'la vista gerencia viaja firmada en la sesión');
  const sinG = await firmarSesion({ usuario: 'Ana', rol: ROL.encargado }, SECRETO_SESION, AHORA);
  ok((await leerSesion(sinG, SECRETO_SESION, AHORA))?.gerencia === false, 'y sin ella, es falso');
  const cuentasG = leerUsuariosDe([['Nombre','Usuario','Rol','Activo','Clave (huella)','Vista gerencia'],
    ['Felipe', 'felipe', 'pagos', 'Sí', 'x', 'Sí'], ['Ana', 'ana', 'encargado', 'Sí', 'x']]);
  ok(cuentasG[0].gerencia && !cuentasG[1].gerencia,
     'la columna Vista gerencia se lee; en blanco, o en una planilla vieja, es no');
  ok(aFilasUsuarios(cuentasG)[0][5] === 'Vista gerencia' && aFilasUsuarios(cuentasG)[1][5] === 'Sí',
     'y se escribe al final, sin mover las columnas de antes');
}

{
  console.log('\nEl RUT y el horario del contrato');
  ok(rutValido('12.345.678-5') && rutValido('12345678-5') && avisoRut('12345678-5') === '',
     'un RUT con su dígito verificador bien es válido, con o sin puntos');
  ok(!rutValido('12.345.678-9') && /dígito verificador/.test(avisoRut('12.345.678-9')),
     'un dígito verificador que no calza se avisa');
  ok(rutValido('11.111.111-1') && avisoRut('') === '' && /No parece/.test(avisoRut('hola')),
     'vacío no avisa, y lo que no tiene forma de RUT dice cómo se escribe');
  ok(normalizarHorario('13.00-18.00') === '13:00 a 18:00'
     && normalizarHorario('13 hasta 18') === '13:00 a 18:00'
     && normalizarHorario('9:30 a 23:00') === '09:30 a 23:00',
     'el horario escrito a mano queda en el formato de siempre');
  ok(normalizarHorario('todo el día') === 'todo el día' && partirHorario('') === null,
     'lo que no se entiende se deja tal cual, sin inventar horas');
  ok(moverHora('23:30', 30) === '00:00' && moverHora('00:00', -30) === '23:30' && moverHora('13:00', 30) === '13:30',
     'las horas se corren de a media hora y dan la vuelta a medianoche');
}

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: la lógica del panel pasa.');
process.exit(fallos ? 1 : 0);
