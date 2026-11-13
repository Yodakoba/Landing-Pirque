/**
 * Genera la planilla de ejemplo para las capturas de la ayuda.
 * Todo inventado: nombres, teléfonos, correos, montos.
 *
 * La corre `capturas.sh`; a mano, desde `panel/`:
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./pruebas/lecturas/registrar.mjs pruebas/ejemplo/generar-planilla.mjs <salida.json>
 */
import fs from 'node:fs';
const L = new URL('../../src/lib/', import.meta.url).href;
const col = await import(L + 'columnas.ts');
const cfg = await import(L + 'config.ts');
const men = await import(L + 'menus.ts');
const pre = await import(L + 'presupuestos.ts');
const cli = await import(L + 'clientes.ts');
const cob = await import(L + 'cobros.ts');
const eq = await import(L + 'equipo.ts');
const cie = await import(L + 'cierres.ts');
const ext = await import(L + 'extras.ts');
const rem = await import(L + 'remuneraciones.ts');
const bit = await import(L + 'bitacora.ts');
const ven = await import(L + 'vendedores.ts');
const usu = await import(L + 'usuarios.ts');
const fil = await import(L + 'filas.ts');

const SALIDA = process.argv[2];
if (!SALIDA) throw new Error('Falta dónde escribir la planilla: generar-planilla.mjs <salida.json>');

const H = {};
const banco = (titular, rut, b = 'BancoEstado', tipo = 'Cuenta RUT', numero = '', correo = '') =>
  ({ titular, rut, banco: b, tipo, numero: numero || rut.replace(/\D/g, '').slice(0, -1), correo, nota: '' });
let semilla = 7;
const azar = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
const token = () => Array.from({ length: 32 }, () => 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(azar() * 57)]).join('');

/* ---------- Usuarios ---------- */
const CLAVE = usu.hashDeClave('clave-de-ejemplo-123', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');
const usuarios = [
  // La primera fila es la que muestra adm-cuentas: un rol con *+ Vista gerencia*.
  ['Fernanda Muñoz', 'fernanda', 'anfitrion', true, false],
  ['Tomás Herrera', 'tomas', 'encargado', true, false],
  ['Marcela Díaz', 'marcela', 'gerente', true, false],
  ['Verónica Lagos', 'veronica', 'pagos', true, false],
  ['Jorge', 'jorge', 'vendedor', true, false],
  ['Daniela', 'daniela', 'vendedor', true, false],
  ['Rodrigo Vera', 'rodrigo', 'gerencia', true, false],
  ['Paula Fuentes', 'paula', 'admin', true, false],
  ['Ignacio Reyes', 'ignacio', 'encargado', false, false]
].map(([nombre, usuario, rol, activo, gerencia]) =>
  ({ nombre, usuario, rol, activo, huella: CLAVE, gerencia, avisosLeidos: [] }));
H['Usuarios'] = usu.aFilasUsuarios(usuarios);

/* ---------- Config ---------- */
H['Config'] = cfg.aFilasConfig({
  ...cfg.POR_DEFECTO,
  cupoNormal: 120,
  diasAbiertos: [6, 0],
  diasAFuturo: 60,
  tokenPlanilla: '',
  empresa: { ...cfg.EMPRESA_VACIA, nombre: 'Brasas de Lo Pirque' }
});

/* ---------- Menús y productos ---------- */
const P = men.nuevoProducto;
H['Menús'] = men.aFilasMenus([
  P({ nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000, cotizacion: true, precioCotizacion: 49000 }),
  P({ nombre: 'Lo Pirque', precioEnLinea: 50000, precioEnLocal: 55000, sitioPublico: false, cotizacion: true, precioCotizacion: 55000 }),
  P({ nombre: 'A Brasas abiertas', precioEnLinea: 70000, precioEnLocal: 75000, cotizacion: true, precioCotizacion: 75000, bonoVendedor: true }),
  P({ nombre: 'Sommelier', precioEnLinea: 90000, precioEnLocal: 95000, sitioPublico: false, cotizacion: true, precioCotizacion: 95000, bonoVendedor: true }),
  P({ nombre: 'Niños', precioEnLinea: 19000, precioEnLocal: 24000, cotizacion: true, precioCotizacion: 24000 }),
  P({ nombre: 'Pequeños', precioEnLinea: 6000, precioEnLocal: 9000, cotizacion: true, precioCotizacion: 9000 }),
  P({ nombre: 'Show ecuestre', tipo: 'Show', sitioPublico: false, cotizacion: true, cobro: 'Monto fijo', precioCotizacion: 450000 }),
  P({ nombre: 'Arriendo del recinto', tipo: 'Arriendo', sitioPublico: false, cotizacion: true, cobro: 'Monto fijo', precioCotizacion: 2500000 }),
  P({ nombre: 'Desayuno de campo', tipo: 'Extra', sitioPublico: false, cotizacion: true, precioCotizacion: 8000, iva: '+ IVA' })
]);

/* ---------- Fechas Hábiles ---------- */
const FECHAS = [];
const dia = (fecha, capacidad, estado = 'Abierta', notas = '', apertura = '13:00') =>
  FECHAS.push({ fecha, capacidad, apertura, estado, notas });
dia('2026-10-31', 120); dia('2026-11-01', 120);
dia('2026-11-07', 120); dia('2026-11-08', 120);
dia('2026-11-11', 50, 'Privada', 'Cumpleaños Familia Contreras');
dia('2026-11-12', 60);
dia('2026-11-13', 80);
for (const f of ['2026-11-14', '2026-11-15', '2026-11-21', '2026-11-22', '2026-11-28', '2026-11-29',
  '2026-12-05', '2026-12-06', '2026-12-12', '2026-12-13', '2026-12-19', '2026-12-20']) dia(f, 120);
const encF = Object.values(col.COL_FECHAS);
H['Fechas Hábiles'] = [encF, ...FECHAS.map((f) => fil.filaFecha(encF, f).map(String))];

/* ---------- Clientes ---------- */
const CLIENTES = [
  { id: 'C-0001', nombre: 'Andrés Pino', empresa: 'Empresa Andes SpA', rut: '76.543.210-K', domicilio: 'Av. Los Leones 1200, Providencia',
    giro: 'Servicios de ingeniería', telefono: '+56 9 8123 4567', correo: 'andres.pino@ejemplo.cl', notas: 'Fin de año del equipo.', creadoPor: 'Jorge', creado: '2026-11-09 12:10' },
  { id: 'C-0002', nombre: 'Patricia Vidal', empresa: 'Colegio Santa Inés', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 7234 5678', correo: 'patricia.vidal@ejemplo.cl', notas: 'Paseo de apoderados.', creadoPor: 'Jorge', creado: '2026-10-20 10:31' },
  { id: 'C-0003', nombre: 'Rocío Fuenzalida', empresa: 'Agrícola El Peumo', rut: '77.111.222-3', domicilio: 'Camino El Principal 455, Pirque',
    giro: 'Agrícola', telefono: '+56 9 6345 6789', correo: 'rocio@ejemplo.cl', notas: '', creadoPor: 'Jorge', creado: '2026-10-28 16:02' },
  { id: 'C-0004', nombre: 'Gonzalo Contreras', empresa: '', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 5456 7890', correo: 'gonzalo.contreras@ejemplo.cl', notas: 'Cumpleaños 60 de su mamá.', creadoPor: 'Daniela', creado: '2026-10-05 11:45' },
  { id: 'C-0005', nombre: 'Marisol Cáceres', empresa: 'Inmobiliaria Cordillera', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 4567 8901', correo: 'marisol@ejemplo.cl', notas: '', creadoPor: 'Daniela', creado: '2026-11-10 09:20' },
  { id: 'C-0006', nombre: 'Felipe Ortúzar', empresa: '', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 3678 9012', correo: 'felipe.ortuzar@ejemplo.cl', notas: 'Matrimonio civil, almuerzo.', creadoPor: 'Jorge', creado: '2026-11-11 17:40' }
];
const encC = cli.ENCABEZADO_CLIENTES;
H['Clientes'] = [encC, ...CLIENTES.map((c) => cli.filaCliente(encC, c))];
const cliente = (id) => CLIENTES.find((c) => c.id === id);

/* ---------- Cotizaciones ---------- */
const PRES = []; const LINEAS = []; const COBROS = [];
const vacio = {
  email: '', telefono: '', validoHasta: '', token: '', notas: '', idReserva: '', creadoPor: '', creado: '', idCliente: '',
  invitados: 0, periodo: '', tipoEvento: '', grupo: '', descuento: 0, motivo: '', documento: '', anticipo: 30,
  anticipoMonto: null, exclusivo: '', exclusividad: '', diaPausado: '', comisionVendedor: '', socio: '', comisionSocio: '',
  saldoDias: 3, uf: 0, fechaUF: '', horario: '13:00 a 18:00', ley20393: false, acuerdos: '', contrato: '', contratoSubidoPor: '',
  contratoSubido: '', cambiosFecha: 2, cancelacionDias: 60, reembolso: 20, devolucion: 0, canceladaPor: '', cancelada: '',
  diaAbierto: '', enviada: '', ultimoSeguimiento: '', contratoEnviado: '', seguimientoDias: 5, avisoEvento: 14
};
const linea = (presupuesto, concepto, cantidad, precio, personas, extra = {}) =>
  LINEAS.push({ presupuesto, concepto, cantidad, precio, personas, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0, ...extra });
const cotizacion = (ms, p) => {
  const id = pre.nuevoId(ms);
  const c = p.idCliente ? cliente(p.idCliente) : null;
  PRES.push({ ...vacio, id, grupo: id, token: token(), cliente: c?.nombre ?? '', email: c?.correo ?? '', telefono: c?.telefono ?? '', ...p });
  return id;
};

// Andrés Pino: enviada, esperando el anticipo del 30%. Es la que abren ven-envio y pag-cobros.
const andres = cotizacion(Date.parse('2026-11-09T15:20:47.318Z'), {
  fecha: '2026-11-28', idCliente: 'C-0001', estado: 'Enviada', validoHasta: '2026-11-24', creadoPor: 'Jorge',
  creado: '2026-11-09 12:20', invitados: 80, tipoEvento: 'Empresa', documento: 'Factura', anticipo: 30,
  enviada: '2026-11-09', ultimoSeguimiento: '2026-11-09'
});
linea(andres, 'Tradiciones', 70, 49000, 70);
linea(andres, 'Niños', 10, 24000, 10);
// En un día público el show va incluido: sin precio.
linea(andres, 'Show ecuestre', 1, 0, 0);

// Colegio Santa Inés: ganada y pagada entera el 6 de noviembre (comisión de Jorge en noviembre).
const santaInes = cotizacion(Date.parse('2026-10-20T13:31:12.462Z'), {
  fecha: '2026-11-21', idCliente: 'C-0002', estado: 'Ganada', validoHasta: '2026-11-04', creadoPor: 'Jorge',
  creado: '2026-10-20 10:31', invitados: 60, tipoEvento: 'Colegio', documento: 'Boleta', anticipo: 30,
  enviada: '2026-10-20', contratoEnviado: '2026-10-24', contrato: 'firmado', contratoSubidoPor: 'Jorge', contratoSubido: '2026-10-26 18:02',
  idReserva: 'MANUAL-1761670000001', diaAbierto: ''
});
linea(santaInes, 'Tradiciones', 48, 49000, 48);
linea(santaInes, 'Niños', 12, 24000, 12);
COBROS.push({ id: 'COB-mh2a1-a1b2', presupuesto: santaInes, fecha: '2026-10-23', concepto: 'Anticipo', monto: 792000, medio: 'Transferencia',
  nota: '', registradoPor: 'Jorge', cuando: '2026-10-23 16:40', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-10-24 09:12' });
COBROS.push({ id: 'COB-mhkq2-c3d4', presupuesto: santaInes, fecha: '2026-11-06', concepto: 'Saldo', monto: 1848000, medio: 'Transferencia',
  nota: '', registradoPor: 'Jorge', cuando: '2026-11-06 12:05', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-11-06 15:30' });

// Agrícola El Peumo: ganada con el anticipo; el saldo viene (lo que "viene" de Jorge).
const peumo = cotizacion(Date.parse('2026-10-28T19:02:33.851Z'), {
  fecha: '2026-12-05', idCliente: 'C-0003', estado: 'Ganada', validoHasta: '2026-11-12', creadoPor: 'Jorge',
  creado: '2026-10-28 16:02', invitados: 45, tipoEvento: 'Empresa', documento: 'Factura', anticipo: 30,
  enviada: '2026-10-28', contratoEnviado: '2026-11-03', idReserva: 'MANUAL-1762200000002'
});
linea(peumo, 'A Brasas abiertas', 45, 75000, 45);
COBROS.push({ id: 'COB-mhjx3-e5f6', presupuesto: peumo, fecha: '2026-11-02', concepto: 'Anticipo', monto: 1012500, medio: 'Transferencia',
  nota: '', registradoPor: 'Jorge', cuando: '2026-11-02 11:20', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-11-02 17:45' });

// Familia Contreras (Daniela): el día privado del miércoles 11, ganada y pagada.
const contreras = cotizacion(Date.parse('2026-10-05T14:45:09.127Z'), {
  fecha: '2026-11-11', idCliente: 'C-0004', estado: 'Ganada', validoHasta: '2026-10-20', creadoPor: 'Daniela',
  creado: '2026-10-05 11:45', invitados: 42, tipoEvento: 'Cumpleaños', documento: 'Boleta', anticipo: 30,
  enviada: '2026-10-05', contratoEnviado: '2026-10-08', contrato: 'firmado', contratoSubidoPor: 'Daniela', contratoSubido: '2026-10-09 10:00',
  idReserva: 'MANUAL-1760100000003', diaAbierto: 'creado'
});
linea(contreras, 'Tradiciones', 36, 49000, 36);
linea(contreras, 'Niños', 6, 24000, 6);
COBROS.push({ id: 'COB-mgf1a-g7h8', presupuesto: contreras, fecha: '2026-10-07', concepto: 'Anticipo', monto: 573000, medio: 'Transferencia',
  nota: '', registradoPor: 'Daniela', cuando: '2026-10-07 13:10', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-10-07 18:00' });
COBROS.push({ id: 'COB-mhbb4-i9j0', presupuesto: contreras, fecha: '2026-11-04', concepto: 'Saldo', monto: 1335000, medio: 'Transferencia',
  nota: '', registradoPor: 'Daniela', cuando: '2026-11-04 10:15', comprobante: '', revisadoPor: '', revisado: '' });

// Inmobiliaria Cordillera (Daniela): borrador para el 12 de diciembre.
const cordillera = cotizacion(Date.parse('2026-11-10T12:20:51.704Z'), {
  fecha: '2026-12-12', idCliente: 'C-0005', estado: 'Borrador', validoHasta: '2026-11-25', creadoPor: 'Daniela',
  creado: '2026-11-10 09:20', invitados: 30, tipoEvento: 'Empresa', anticipo: 30
});
linea(cordillera, 'Lo Pirque', 30, 55000, 30);

// Felipe Ortúzar (Jorge): candidato, todavía sin cotizar.
cotizacion(Date.parse('2026-11-11T20:40:18.593Z'), {
  fecha: '2026-12-19', idCliente: 'C-0006', estado: 'Candidato', validoHasta: '', creadoPor: 'Jorge',
  creado: '2026-11-11 17:40', invitados: 35, tipoEvento: 'Matrimonio', anticipo: null
});

const encP = pre.ENCABEZADO_PRESUPUESTOS;
H['Presupuestos'] = [encP, ...PRES.map((p) => pre.filaPresupuesto(encP, p))];
const encL = pre.ENCABEZADO_LINEAS;
H['Presupuesto Líneas'] = [encL, ...LINEAS.map((l) => pre.filaLinea(encL, l))];
const encCob = cob.ENCABEZADO_COBROS;
H['Cobros'] = [encCob, ...COBROS.map((c) => cob.filaCobro(encCob, c))];

/* ---------- Reservas ---------- */
const RES = [];
let shop = 6512345678901;
const reserva = (r) => RES.push({
  id: '', fecha: '', nombre: '', email: '', telefono: '', menu: '', personas: 0, monto: '', tipoPago: '', estadoPago: 'pending',
  creada: '', asistencia: '', notaPago: '', llegaron: '', avisoRecepcion: '', abonado: '', eventoCRM: '', anotadaPor: '',
  liberada: '', personasReales: '', menuReal: '', descuento: '', rectificacion: '', aprobacion: '', liberacion: '', ...r
});
const deShopify = (r) => reserva({ id: String(shop++), ...r });
let manual = 1762000000100;
const aMano = (r) => reserva({ id: 'MANUAL-' + (manual += 137), ...r });

// Sábado 31 de octubre y domingo 1 de noviembre (pasados, con asistencia).
deShopify({ fecha: '2026-10-31', nombre: 'Claudia Bustos', email: 'claudia.bustos@ejemplo.cl', telefono: '+56 9 9111 2201', menu: '4 × Tradiciones',
  personas: 4, monto: 176000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-10-25 20:14', asistencia: 'Sí', llegaron: 4 });
deShopify({ fecha: '2026-10-31', nombre: 'Héctor Salazar', email: 'hsalazar@ejemplo.cl', telefono: '+56 9 9111 2202', menu: '2 × A Brasas abiertas',
  personas: 2, monto: 140000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-10-27 09:40', asistencia: 'Sí', llegaron: 2 });
deShopify({ fecha: '2026-11-01', nombre: 'Familia Ibáñez', email: 'ibanez@ejemplo.cl', telefono: '+56 9 9111 2203', menu: '3 × Tradiciones + 2 × Niños',
  personas: 5, monto: 170000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-10-28 18:22', asistencia: 'Sí', llegaron: 5 });

// Sábado 7 y domingo 8.
deShopify({ fecha: '2026-11-07', nombre: 'Mónica Lillo', email: 'mlillo@ejemplo.cl', telefono: '+56 9 9111 2204', menu: '6 × Tradiciones',
  personas: 6, monto: 264000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-02 12:05', asistencia: 'Sí', llegaron: 6 });
deShopify({ fecha: '2026-11-07', nombre: 'Ricardo Godoy', email: 'rgodoy@ejemplo.cl', telefono: '+56 9 9111 2205', menu: '2 × Tradiciones + 1 × Niños',
  personas: 3, monto: 122000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-03 21:30', asistencia: 'Sí', llegaron: 3 });
aMano({ fecha: '2026-11-07', nombre: 'Familia Toro', telefono: '+56 9 9111 2206', menu: '8 × Tradiciones + 3 × Niños',
  personas: 11, monto: 464000, estadoPago: 'paid', creada: '2026-11-04 10:12', asistencia: 'Sí', llegaron: 11, anotadaPor: 'Tomás Herrera',
  notaPago: 'Pagó por transferencia' });
deShopify({ fecha: '2026-11-07', nombre: 'Andrea Poblete', email: 'apoblete@ejemplo.cl', telefono: '+56 9 9111 2207', menu: '2 × A Brasas abiertas',
  personas: 2, monto: 150000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-05 08:44', asistencia: 'No' });
deShopify({ fecha: '2026-11-08', nombre: 'Sebastián Vial', email: 'svial@ejemplo.cl', telefono: '+56 9 9111 2208', menu: '4 × Tradiciones + 2 × Niños',
  personas: 6, monto: 214000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-04 19:02', asistencia: 'Sí', llegaron: 6 });
deShopify({ fecha: '2026-11-08', nombre: 'Lorena Gálvez', email: 'lgalvez@ejemplo.cl', telefono: '+56 9 9111 2209', menu: '5 × Tradiciones',
  personas: 5, monto: 220000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-06 14:50', asistencia: 'Sí', llegaron: 5 });

// Miércoles 11: el cumpleaños privado (de la cotización de Daniela).
reserva({ id: 'MANUAL-1760100000003', fecha: '2026-11-11', nombre: 'Gonzalo Contreras', email: 'gonzalo.contreras@ejemplo.cl',
  telefono: '+56 9 5456 7890', menu: '36 × Tradiciones + 6 × Niños', personas: 42, monto: 1908000, estadoPago: 'paid',
  creada: '2026-10-08 12:00', notaPago: `De la cotización N° ${pre.folioDe({ id: contreras })}`, anotadaPor: 'Daniela', asistencia: 'Sí', llegaron: 42 });

// Jueves 12: la página del día (enc-dia / ope-dia).
deShopify({ fecha: '2026-11-12', nombre: 'Familia Soto', email: 'familia.soto@ejemplo.cl', telefono: '+56 9 6123 4501', menu: '4 × Tradiciones + 2 × Niños',
  personas: 6, monto: 214000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-08 21:10', asistencia: 'Sí', llegaron: 6 });
deShopify({ fecha: '2026-11-12', nombre: 'Pedro Navarro', email: 'pnavarro@ejemplo.cl', telefono: '+56 9 6123 4502', menu: '2 × Tradiciones',
  personas: 2, monto: 88000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-09 10:33', asistencia: 'Sí', llegaron: 2 });
aMano({ fecha: '2026-11-12', nombre: 'Laura Méndez', telefono: '+56 9 6123 4503', menu: '4 × Lo Pirque',
  personas: 4, monto: 220000, estadoPago: 'pending', creada: '2026-11-10 16:20', anotadaPor: 'Tomás Herrera', asistencia: 'Sí', llegaron: 4,
  notaPago: 'Llamó por teléfono' });
deShopify({ fecha: '2026-11-12', nombre: 'Rodrigo Silva', email: 'rsilva@ejemplo.cl', telefono: '+56 9 6123 4504', menu: '3 × Tradiciones',
  personas: 3, monto: 147000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-11 08:15' });

// Viernes 13 (hoy): la recepción.
aMano({ fecha: '2026-11-13', nombre: 'Camila Rojas', telefono: '+56 9 7345 1101', menu: '4 × Tradiciones',
  personas: 4, monto: 196000, estadoPago: 'pending', creada: '2026-11-11 19:05', anotadaPor: 'Tomás Herrera', notaPago: 'Escribió por WhatsApp' });
deShopify({ fecha: '2026-11-13', nombre: 'Familia Muñoz', email: 'fmunoz@ejemplo.cl', telefono: '+56 9 7345 1102', menu: '3 × Tradiciones + 2 × Niños',
  personas: 5, monto: 170000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-09 22:41' });
aMano({ fecha: '2026-11-13', nombre: 'Grupo Sofía Paredes', telefono: '+56 9 7345 1103', menu: '8 × Tradiciones',
  personas: 8, monto: 392000, estadoPago: 'partially_paid', abonado: 150000, creada: '2026-11-06 11:30', anotadaPor: 'Marcela Díaz',
  notaPago: 'Abonó por transferencia' });
deShopify({ fecha: '2026-11-13', nombre: 'Ignacio Fernández', email: 'ifernandez@ejemplo.cl', telefono: '+56 9 7345 1104', menu: '2 × A Brasas abiertas',
  personas: 2, monto: 150000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-12 13:12' });
deShopify({ fecha: '2026-11-13', nombre: 'Valentina Castro', email: 'vcastro@ejemplo.cl', telefono: '+56 9 7345 1105', menu: '6 × Tradiciones',
  personas: 6, monto: 264000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-07 17:25', asistencia: 'Sí', llegaron: 6 });
deShopify({ fecha: '2026-11-13', nombre: 'Martín Araya', email: 'maraya@ejemplo.cl', telefono: '+56 9 7345 1106', menu: '2 × Tradiciones + 1 × Pequeños',
  personas: 3, monto: 94000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-10 09:58', asistencia: 'Sí', llegaron: 3 });

// Sábado 14 y domingo 15 (lo que viene).
const futuro = [
  ['2026-11-14', 'Carolina Espinoza', '6 × Tradiciones', 6, 264000, 'paid'],
  ['2026-11-14', 'Familia Riquelme', '5 × Tradiciones + 3 × Niños', 8, 277000, 'paid'],
  ['2026-11-14', 'Joaquín Valdés', '2 × A Brasas abiertas', 2, 140000, 'paid'],
  ['2026-11-14', 'Daniela Olivares', '4 × Tradiciones', 4, 196000, 'pending'],
  ['2026-11-14', 'Familia Sepúlveda', '6 × Tradiciones + 4 × Niños + 1 × Pequeños', 11, 366000, 'paid'],
  ['2026-11-14', 'Esteban Carrasco', '3 × Tradiciones', 3, 147000, 'pending'],
  ['2026-11-15', 'Francisca Leiva', '10 × Tradiciones', 10, 440000, 'paid'],
  ['2026-11-15', 'Familia Gutiérrez', '4 × Tradiciones + 2 × Niños', 6, 214000, 'paid'],
  ['2026-11-15', 'Raúl Pizarro', '2 × Tradiciones', 2, 98000, 'pending'],
  ['2026-11-15', 'Grupo Amigas del Coro', '12 × Tradiciones', 12, 528000, 'paid'],
  ['2026-11-21', 'Teresa Molina', '4 × Tradiciones', 4, 176000, 'paid'],
  ['2026-11-22', 'Familia Aravena', '5 × Tradiciones + 2 × Niños', 7, 258000, 'paid'],
  ['2026-11-22', 'Pablo Quiroz', '2 × A Brasas abiertas', 2, 150000, 'pending']
];
for (const [fecha, nombre, menu, personas, monto, estadoPago] of futuro) {
  deShopify({ fecha, nombre, email: nombre.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 14) + '@ejemplo.cl',
    telefono: '+56 9 8' + String(100 + RES.length).padStart(3, '0') + ' ' + String(4400 + RES.length * 7).slice(-4),
    menu, personas, monto, tipoPago: estadoPago === 'paid' ? 'Pago directo' : 'Solo reserva', estadoPago, creada: '2026-11-1' + (RES.length % 3) + ' 1' + (RES.length % 9) + ':2' + (RES.length % 6) });
}
// Las reservas de las cotizaciones ganadas.
reserva({ id: 'MANUAL-1761670000001', fecha: '2026-11-21', nombre: 'Patricia Vidal', email: 'patricia.vidal@ejemplo.cl',
  telefono: '+56 9 7234 5678', menu: '48 × Tradiciones + 12 × Niños', personas: 60, monto: 2640000, estadoPago: 'paid',
  creada: '2026-10-26 18:05', notaPago: `De la cotización N° ${pre.folioDe({ id: santaInes })}`, anotadaPor: 'Jorge' });
reserva({ id: 'MANUAL-1762200000002', fecha: '2026-12-05', nombre: 'Rocío Fuenzalida', email: 'rocio@ejemplo.cl',
  telefono: '+56 9 6345 6789', menu: '45 × A Brasas abiertas', personas: 45, monto: 3375000, estadoPago: 'partially_paid', abonado: 1012500,
  creada: '2026-11-03 12:00', notaPago: `De la cotización N° ${pre.folioDe({ id: peumo })}`, anotadaPor: 'Jorge' });

const encR = Object.values(col.COL_RESERVAS);
H['Reservas'] = [encR, ...RES.map((r) => fil.filaReserva(encR, r).map((c) => (c == null ? '' : String(c))))];

/* ---------- Equipo ---------- */
H['Puestos'] = eq.aFilasPuestos([
  { nombre: 'Garzón', cadaCuantas: 15 }, { nombre: 'Cocina', cadaCuantas: 25 },
  { nombre: 'Parrilla', cadaCuantas: 40 }, { nombre: 'Barra', cadaCuantas: 50 }
]);
const GENTE = [
  ['Luis Contreras', '+56 9 4011 2201', 'Parrilla', 45000, 6000, true, banco('Luis Contreras', '15.234.567-8', 'BancoEstado', 'Cuenta RUT')],
  ['Rosa Espinoza', '+56 9 4011 2202', 'Cocina', 40000, 5000, true, banco('Rosa Espinoza', '16.345.678-9', 'BancoEstado', 'Cuenta RUT')],
  ['Matías Pérez', '+56 9 4011 2203', 'Garzón', 35000, 5000, true, banco('Matías Pérez', '19.456.789-0', 'Banco de Chile', 'Cuenta vista', '00123456789')],
  ['Javiera Tapia', '+56 9 4011 2204', 'Garzón', 35000, 5000, true, banco('Javiera Tapia', '20.567.890-1', 'BancoEstado', 'Cuenta RUT')],
  ['Diego Morales', '+56 9 4011 2205', 'Garzón', 35000, 5000, true, banco('Diego Morales', '18.678.901-2', 'Banco Santander', 'Cuenta corriente', '0071234567')],
  ['Catalina Vergara', '+56 9 4011 2206', 'Barra', 38000, 5000, true, banco('Catalina Vergara', '17.789.012-3', 'BancoEstado', 'Cuenta RUT')],
  ['Felipe Cortés', '+56 9 4011 2207', 'Cocina', 40000, 5000, true, banco('Felipe Cortés', '16.890.123-4', 'BancoEstado', 'Cuenta RUT')],
  ['Antonia Reyes', '+56 9 4011 2208', 'Garzón', 35000, 5000, true, banco('Antonia Reyes', '21.901.234-5', 'BancoEstado', 'Cuenta RUT')]
];
const TRAB = GENTE.map(([nombre, telefono, puesto, pagoJornada, valorHora, propina, b]) =>
  ({ nombre, telefono, puesto, activo: true, pagoJornada, valorHora, modalidad: 'Por turno', propina, banco: b, token: token() }));
TRAB.push({ nombre: 'Hernán Bravo', telefono: '+56 9 4011 2209', puesto: 'Parrilla', activo: true, pagoJornada: 0, valorHora: 0,
  modalidad: 'Contratado', propina: true, banco: banco('Hernán Bravo', '12.345.678-5', 'Banco BCI', 'Cuenta corriente', '11223344'), token: token() });
H['Trabajadores'] = eq.aFilasTrabajadores(TRAB);
const t = (nombre) => TRAB.find((x) => x.nombre === nombre);

const TURNOS = [];
const turno = (fecha, nombre, asistencia = '', propina = 0, extra = {}) => {
  const w = t(nombre);
  TURNOS.push({ fecha, trabajador: nombre, puesto: w.puesto, asistencia, modalidad: w.modalidad,
    pagoJornada: w.pagoJornada, horasExtra: 0, valorHora: w.valorHora, ajustes: [], propina, ...extra });
};
for (const f of ['2026-10-31', '2026-11-01']) {
  for (const n of ['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Javiera Tapia', 'Catalina Vergara']) turno(f, n, 'Sí', 14000);
}
// Sábado 7: cerrado por el encargado de turno.
for (const n of ['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Javiera Tapia', 'Diego Morales', 'Catalina Vergara']) turno('2026-11-07', n, 'Sí', 16500);
turno('2026-11-07', 'Felipe Cortés', 'No', 0);
turno('2026-11-07', 'Hernán Bravo', 'Sí', 16500);
TURNOS.find((x) => x.fecha === '2026-11-07' && x.trabajador === 'Luis Contreras').horasExtra = 2;
// Domingo 8: falta marcar a dos.
for (const n of ['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Antonia Reyes']) turno('2026-11-08', n, 'Sí', 12000);
turno('2026-11-08', 'Diego Morales');
turno('2026-11-08', 'Catalina Vergara');
// Miércoles 11 (el cumpleaños) y jueves 12: sin cerrar todavía.
// (42 personas: 3 garzones, 2 en cocina, 2 en parrilla y 1 en la barra.)
for (const n of ['Matías Pérez', 'Javiera Tapia', 'Antonia Reyes', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Hernán Bravo', 'Catalina Vergara']) turno('2026-11-11', n);
for (const n of ['Antonia Reyes', 'Felipe Cortés', 'Luis Contreras', 'Catalina Vergara']) turno('2026-11-12', n);
// Hoy y el fin de semana: planificados.
for (const n of ['Matías Pérez', 'Diego Morales', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Catalina Vergara']) turno('2026-11-13', n);
for (const n of ['Matías Pérez', 'Javiera Tapia', 'Diego Morales', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Hernán Bravo', 'Catalina Vergara']) turno('2026-11-14', n);
for (const n of ['Matías Pérez', 'Javiera Tapia', 'Antonia Reyes', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Catalina Vergara']) turno('2026-11-15', n);
const encT = eq.ENCABEZADO_TURNOS;
H['Turnos'] = [encT, ...TURNOS.map((x) => eq.filaTurno(encT, x))];

H['Cierres'] = [cie.ENCABEZADO_CIERRES,
  ['2026-10-31', 'Tomás Herrera', '2026-10-31 19:15'],
  ['2026-11-01', 'Tomás Herrera', '2026-11-01 19:02'],
  ['2026-11-07', 'Tomás Herrera', '2026-11-07 19:42']];

/* ---------- Extras ---------- */
H['Colaboradores'] = ext.aFilasColaboradores([
  { nombre: 'Carlos Paredes', actividad: 'Show ecuestre', telefono: '+56 9 3022 1101', activo: true, monto: 250000,
    banco: banco('Carlos Paredes', '11.222.333-4', 'BancoEstado', 'Cuenta corriente', '22334455'), token: token() },
  { nombre: 'Paz Ortiz', actividad: 'Pintacaritas', telefono: '+56 9 3022 1102', activo: true, monto: 60000,
    banco: banco('Paz Ortiz', '18.333.444-5', 'BancoEstado', 'Cuenta RUT'), token: token() }
]);
const encA = ext.ENCABEZADO_ACTIVIDADES;
H['Actividades'] = [encA,
  ext.filaExtra(encA, { fecha: '2026-11-07', colaborador: 'Carlos Paredes', actividad: 'Show ecuestre', estado: 'Sí', monto: 250000, ajuste: 0, motivo: '' }),
  ext.filaExtra(encA, { fecha: '2026-11-07', colaborador: 'Paz Ortiz', actividad: 'Pintacaritas', estado: 'Sí', monto: 60000, ajuste: 0, motivo: '' }),
  ext.filaExtra(encA, { fecha: '2026-11-14', colaborador: 'Carlos Paredes', actividad: 'Show ecuestre', estado: '', monto: 250000, ajuste: 0, motivo: '' })
];

/* ---------- Pagos al equipo ---------- */
const encPag = rem.ENCABEZADO_PAGOS;
const PAGOS = [
  // La semana del 26 de octubre, pagada entera.
  ...['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Javiera Tapia', 'Catalina Vergara'].flatMap((n, k) => [
    { id: 'PAGO-MH9A' + k + 'S', fecha: '2026-11-02', quien: n, desde: '2026-10-26', hasta: '2026-11-01', monto: t(n).pagoJornada, nota: 'Transferencia masiva', registradoPor: 'Verónica Lagos', concepto: 'Sueldo' },
    { id: 'PAGO-MH9A' + k + 'P', fecha: '2026-11-02', quien: n, desde: '2026-10-26', hasta: '2026-11-01', monto: 14000, nota: 'Transferencia masiva', registradoPor: 'Verónica Lagos', concepto: 'Propina' }
  ]),
  // La semana pasada: a dos ya se les pagó el sueldo.
  { id: 'PAGO-MHT1C1', fecha: '2026-11-10', quien: 'Javiera Tapia', desde: '2026-11-02', hasta: '2026-11-08', monto: 35000, nota: '', registradoPor: 'Verónica Lagos', concepto: 'Sueldo' },
  { id: 'PAGO-MHT1C2', fecha: '2026-11-10', quien: 'Javiera Tapia', desde: '2026-11-02', hasta: '2026-11-08', monto: 16500, nota: '', registradoPor: 'Verónica Lagos', concepto: 'Propina' },
  // La comisión: un anticipo a Jorge.
  { id: 'PAGO-MHU2V1', fecha: '2026-11-10', quien: 'Jorge', desde: '2026-11-01', hasta: '2026-11-30', monto: 200000, nota: 'Anticipo de comisión', registradoPor: 'Verónica Lagos', concepto: 'Comisión' },
  { id: 'PAGO-MHU2V2', fecha: '2026-11-10', quien: 'Daniela', desde: '2026-11-01', hasta: '2026-11-30', monto: 150000, nota: 'Anticipo de comisión', registradoPor: 'Verónica Lagos', concepto: 'Comisión' }
];
H['Pagos'] = [encPag, ...PAGOS.map((p) => rem.filaPago(p, encPag))];
H['Boletas'] = [rem.ENCABEZADO_BOLETAS];

/* ---------- Vendedores ---------- */
const encV = ven.ENCABEZADO_VENDEDORES;
H['Vendedores'] = [encV,
  ven.filaVendedor({ ...ven.fichaVacia('jorge', 'Jorge'), sueldoFijo: 450000, comisionPct: 3, etapa2Pct: 4, etapa3Pct: 5, bonoPuntos: 1,
    banco: banco('Jorge Salinas', '17.654.321-0', 'Banco de Chile', 'Cuenta corriente', '00987654321', 'jorge@ejemplo.cl') }, encV),
  ven.filaVendedor({ ...ven.fichaVacia('daniela', 'Daniela'), sueldoFijo: 450000, comisionPct: 3, etapa2Pct: 4, etapa3Pct: 5,
    banco: banco('Daniela Ruiz', '18.765.432-1', 'BancoEstado', 'Cuenta RUT') }, encV),
  ven.filaVendedor({ ...ven.fichaSocio('S-0001', 'Turismo Valle del Maipo'), token: token() }, encV)
];

/* ---------- Bitácora ---------- */
const F = (id) => pre.folioDe({ id });
H['Bitácora'] = [bit.ENCABEZADO_BITACORA,
  ['2026-11-02 11:20', 'Jorge', 'vendedor', 'Anotó un cobro', `${F(peumo)} · Anticipo · $1.012.500`],
  ['2026-11-02 18:05', 'Verónica Lagos', 'pagos', 'Registró pagos en bloque', 'Sueldo · 5 personas · 2026-10-26 a 2026-11-01'],
  ['2026-11-04 10:12', 'Tomás Herrera', 'encargado', 'Anotó una reserva', 'Familia Toro · 2026-11-07 · 11 personas · 8 × Tradiciones + 3 × Niños'],
  ['2026-11-06 12:05', 'Jorge', 'vendedor', 'Anotó un cobro', `${F(santaInes)} · Saldo · $1.848.000`],
  ['2026-11-07 19:42', 'Tomás Herrera', 'encargado', 'Cerró un día', '2026-11-07'],
  ['2026-11-09 12:20', 'Jorge', 'vendedor', 'Creó una cotización', `${F(andres)} · Andrés Pino · 2026-11-28`],
  ['2026-11-09 12:31', 'Jorge', 'vendedor', 'Editó una cotización', `${F(andres)} · Enviada`],
  ['2026-11-10 09:20', 'Daniela', 'vendedor', 'Creó una cotización', `${F(cordillera)} · Marisol Cáceres · 2026-12-12`],
  ['2026-11-10 10:05', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Javiera Tapia · Sueldo · $35.000 · 2026-11-02 a 2026-11-08'],
  ['2026-11-10 10:06', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Javiera Tapia · Propina · $16.500 · 2026-11-02 a 2026-11-08'],
  ['2026-11-10 10:09', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Jorge · Comisión · $200.000 · 2026-11-01 a 2026-11-30'],
  ['2026-11-10 10:11', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Daniela · Comisión · $150.000 · 2026-11-01 a 2026-11-30'],
  ['2026-11-10 16:20', 'Tomás Herrera', 'encargado', 'Anotó una reserva', 'Laura Méndez · 2026-11-12 · 4 personas · 4 × Lo Pirque'],
  ['2026-11-11 17:40', 'Jorge', 'vendedor', 'Anotó un candidato', `${F(PRES[PRES.length - 1].id)} · Felipe Ortúzar · 2026-12-19`],
  ['2026-11-11 19:05', 'Tomás Herrera', 'encargado', 'Anotó una reserva', 'Camila Rojas · 2026-11-13 · 4 personas · 4 × Tradiciones'],
  ['2026-11-12 09:30', 'Paula Fuentes', 'admin', 'Cambió la configuración', 'cupoNormal'],
  ['2026-11-12 18:10', 'Marcela Díaz', 'gerente', 'Planificó el equipo', '2026-11-14 · 8 personas · Matías Pérez (Garzón), Javiera Tapia (Garzón), Diego Morales (Garzón), Rosa Espinoza (Cocina), Felipe Cortés (Cocina), Luis Contreras (Parrilla), Hernán Bravo (Parrilla), Catalina Vergara (Barra)'],
  ['2026-11-13 13:20', 'Fernanda Muñoz', 'anfitrion', 'Editó una reserva', `fila ${RES.findIndex((r) => r.nombre === 'Valentina Castro') + 2} · asistencia, llegaron`],
  ['2026-11-13 13:41', 'Fernanda Muñoz', 'anfitrion', 'Editó una reserva', `fila ${RES.findIndex((r) => r.nombre === 'Martín Araya') + 2} · asistencia, llegaron`]
];

H['Comentarios'] = [['Cuándo', 'Quién', 'Rol', 'Pantalla', 'Comentario']];

const orden = ['Reservas', 'Fechas Hábiles', 'Config', 'Menús', 'Presupuestos', 'Presupuesto Líneas', 'Clientes', 'Cobros',
  'Puestos', 'Trabajadores', 'Turnos', 'Cierres', 'Actividades', 'Colaboradores', 'Pagos', 'Boletas', 'Usuarios',
  'Bitácora', 'Vendedores', 'Comentarios'];
const hojas = Object.fromEntries(orden.map((k) => [k, (H[k] ?? []).map((f) => f.map((c) => (c == null ? '' : String(c))))]));
fs.writeFileSync(SALIDA, JSON.stringify({ orden, hojas }, null, 1));
console.log('Planilla de ejemplo:', SALIDA, Object.entries(hojas).map(([k, v]) => `${k}:${v.length - 1}`).join(' '));
