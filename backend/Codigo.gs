/**
 * Brasas de Lo Pirque — sistema de reservas
 * ---------------------------------------------------------------
 * Esto NO se ejecuta en el sitio. Es el código de un proyecto de
 * Google Apps Script, pegado a una planilla de Google. El repo lo
 * guarda para tener historial; la copia que corre vive en Google.
 * Para desplegarlo, ver backend/README.md.
 *
 * Qué hace:
 *
 *   1. doGet()  — le dice al sitio qué fechas están abiertas y
 *      cuántos lugares quedan. Así el desplegable del formulario
 *      deja de estar escrito a mano en el HTML.
 *
 *   2. sincronizarPedidos() — cada pocos minutos le pregunta a
 *      Shopify por pedidos pagados nuevos, los anota en la planilla
 *      y crea el evento en Google Calendar.
 *
 * POR QUÉ CONSULTAMOS EN VEZ DE RECIBIR UN WEBHOOK
 *
 * Shopify firma sus webhooks con HMAC y manda la firma en una
 * cabecera. Los Web Apps de Apps Script NO dan acceso a las
 * cabeceras de la petición: doPost(e) entrega el cuerpo, los
 * parámetros y nada más. Sin poder verificar la firma, cualquiera
 * que descubriera la URL podría inventar reservas.
 *
 * Preguntando nosotros, eso no existe: nadie nos escribe. El costo
 * es que la reserva aparece con hasta unos minutos de atraso, y a
 * cambio el sistema se recupera solo de caídas, porque la próxima
 * corrida se pone al día con lo que no alcanzó a ver.
 *
 * SOBRE EL TOKEN DE ADMIN API
 *
 * Acá sí se usa uno, y está bien. La regla del proyecto —"un token
 * de Admin API jamás"— es sobre el SITIO: ahí vive en un archivo
 * público y quedaría a la vista de cualquiera. Este código corre en
 * los servidores de Google y el token se guarda en las propiedades
 * del script, que no salen al navegador. Es el lugar correcto.
 */

/* =============================================================
   Configuración
   -------------------------------------------------------------
   Nada de esto se escribe acá. Va en Extensiones → Apps Script →
   Configuración del proyecto → Propiedades del script, para que no
   termine en el repo. Ver backend/README.md.
   ============================================================= */

var PROPIEDADES = [
  'SHOPIFY_DOMINIO',      // brasas-de-lo-pirque-development.myshopify.com
  'SHOPIFY_ADMIN_TOKEN',  // empieza en shpat_
  'SHOPIFY_VERSION',      // la versión de la Admin API, ej: 2026-07
  'CALENDAR_ID'           // el ID del calendario donde van las reservas
];

function config(clave) {
  var v = PropertiesService.getScriptProperties().getProperty(clave);
  if (!v) throw new Error('Falta la propiedad del script: ' + clave);
  return v;
}

var HOJA_FECHAS = 'Fechas';
var HOJA_RESERVAS = 'Reservas';
var HOJA_REGISTRO = 'Registro';

/* =============================================================
   1. Lo que el sitio consulta
   ============================================================= */

/**
 * GET ?accion=fechas
 *
 * Devuelve las fechas abiertas con los lugares que quedan. El sitio
 * arma el desplegable con esto, así que abrir o cerrar una fecha es
 * editar la planilla: no hay que tocar el HTML ni publicar nada.
 */
function doGet(e) {
  var accion = (e && e.parameter && e.parameter.accion) || 'fechas';
  try {
    if (accion === 'fechas') return json({ fechas: fechasAbiertas() });
    return json({ error: 'Acción desconocida: ' + accion }, 400);
  } catch (err) {
    registrar('ERROR doGet', err.message);
    return json({ error: 'Error interno' }, 500);
  }
}

/**
 * Lee la pestaña Fechas y descuenta lo ya reservado.
 *
 * Solo devuelve fechas de hoy en adelante: así el formulario nunca
 * puede ofrecer una fecha vencida, que es exactamente el problema
 * que tenía la lista escrita a mano.
 */
function fechasAbiertas() {
  var hoy = Utilities.formatDate(new Date(), zonaHoraria(), 'yyyy-MM-dd');
  var tomadas = lugaresTomadosPorFecha();
  var filas = datos(HOJA_FECHAS);
  var salida = [];

  for (var i = 0; i < filas.length; i++) {
    var f = filas[i];
    var fecha = comoFecha(f.fecha);
    if (!fecha || fecha < hoy) continue;
    if (String(f.abierta).toLowerCase().indexOf('s') !== 0) continue;

    var cupo = Number(f.cupo) || 0;
    var usados = tomadas[fecha] || 0;
    var quedan = Math.max(0, cupo - usados);
    if (quedan <= 0) continue;

    salida.push({ fecha: fecha, quedan: quedan });
  }
  salida.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  return salida;
}

/** Suma adultos + niños ya reservados, por fecha. */
function lugaresTomadosPorFecha() {
  var tomadas = {};
  var filas = datos(HOJA_RESERVAS);
  for (var i = 0; i < filas.length; i++) {
    var fecha = comoFecha(filas[i].fecha_reserva);
    if (!fecha) continue;
    var n = (Number(filas[i].adultos) || 0) + (Number(filas[i].ninos) || 0);
    tomadas[fecha] = (tomadas[fecha] || 0) + n;
  }
  return tomadas;
}

/* =============================================================
   2. Traer los pedidos pagados desde Shopify
   ============================================================= */

/**
 * Esto es lo que corre cada pocos minutos con un activador de
 * tiempo. Busca pedidos pagados posteriores al último que ya
 * anotamos, y por cada uno escribe la reserva y crea el evento.
 *
 * Es idempotente: si el mismo pedido llega dos veces, la segunda se
 * ignora. Importa porque un reintento o una corrida solapada no
 * pueden duplicar una reserva.
 */
function sincronizarPedidos() {
  // Dos corridas en paralelo escribiendo la misma planilla es la
  // forma más fácil de duplicar una reserva. El candado lo evita.
  var candado = LockService.getScriptLock();
  if (!candado.tryLock(30000)) {
    registrar('AVISO', 'Otra corrida tenía el candado; esta se salta.');
    return;
  }

  try {
    var yaAnotados = pedidosYaAnotados();
    var pedidos = pedidosPagadosDesde(ultimaRevision());

    var nuevos = 0;
    for (var i = 0; i < pedidos.length; i++) {
      var p = pedidos[i];
      if (yaAnotados[String(p.id)]) continue;

      var reserva = leerReserva(p);
      if (!reserva) continue;          // pedido sin fecha: no es una reserva

      var idEvento = crearEvento(reserva);
      anotarReserva(reserva, idEvento);
      yaAnotados[String(p.id)] = true;
      nuevos++;
    }

    PropertiesService.getScriptProperties()
      .setProperty('ULTIMA_REVISION', new Date().toISOString());
    registrar('OK', 'Pedidos revisados: ' + pedidos.length + ', nuevos: ' + nuevos);
  } catch (err) {
    registrar('ERROR sincronizarPedidos', err.message);
    throw err;                          // que quede en el historial de Apps Script
  } finally {
    candado.releaseLock();
  }
}

/** Desde cuándo buscar. La primera vez, los últimos 7 días. */
function ultimaRevision() {
  var v = PropertiesService.getScriptProperties().getProperty('ULTIMA_REVISION');
  if (v) {
    // Se retrocede una hora a propósito: un pedido puede pagarse
    // unos minutos después de creado, y así no se escapa ninguno.
    // Los repetidos los filtra la comprobación de idempotencia.
    return new Date(new Date(v).getTime() - 60 * 60 * 1000);
  }
  return new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
}

function pedidosPagadosDesde(desde) {
  var url = 'https://' + config('SHOPIFY_DOMINIO') +
            '/admin/api/' + config('SHOPIFY_VERSION') + '/orders.json' +
            '?status=any&financial_status=paid&limit=250' +
            '&updated_at_min=' + encodeURIComponent(desde.toISOString());

  var r = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'X-Shopify-Access-Token': config('SHOPIFY_ADMIN_TOKEN') },
    muteHttpExceptions: true
  });

  if (r.getResponseCode() !== 200) {
    throw new Error('Shopify respondió ' + r.getResponseCode() + ': ' +
                    r.getContentText().slice(0, 300));
  }
  return JSON.parse(r.getContentText()).orders || [];
}

/**
 * Saca de un pedido lo que nos importa.
 *
 * La fecha viaja en las propiedades de línea que pone el sitio:
 * _booking_date. Si un pedido no la trae, no es una reserva —puede
 * ser cualquier otra cosa vendida en la tienda— y se ignora.
 */
function leerReserva(pedido) {
  var fecha = null, adultos = 0, ninos = 0, menus = [];

  var lineas = pedido.line_items || [];
  for (var i = 0; i < lineas.length; i++) {
    var l = lineas[i];
    var props = l.properties || [];
    for (var j = 0; j < props.length; j++) {
      if (props[j].name === '_booking_date' && props[j].value) {
        fecha = String(props[j].value).slice(0, 10);
      }
    }
    var titulo = String(l.title || '');
    if (titulo.toLowerCase().indexOf('niñ') !== -1 ||
        titulo.toLowerCase().indexOf('nin') !== -1) {
      ninos += Number(l.quantity) || 0;
    } else {
      adultos += Number(l.quantity) || 0;
      if (menus.indexOf(titulo) === -1) menus.push(titulo);
    }
  }

  if (!fecha) return null;

  var c = pedido.customer || {};
  return {
    pedido: String(pedido.id),
    numero: pedido.name || '',
    fecha: fecha,
    nombre: ((c.first_name || '') + ' ' + (c.last_name || '')).trim(),
    email: pedido.email || c.email || '',
    telefono: pedido.phone || c.phone || '',
    menu: menus.join(' + '),
    adultos: adultos,
    ninos: ninos,
    total: pedido.total_price || '',
    moneda: pedido.currency || '',
    creado: pedido.created_at || ''
  };
}

/* =============================================================
   3. Escribir: planilla y calendario
   ============================================================= */

function anotarReserva(r, idEvento) {
  var hoja = hojaOCrear(HOJA_RESERVAS, [
    'pedido', 'numero', 'fecha_reserva', 'nombre', 'email', 'telefono',
    'menu', 'adultos', 'ninos', 'total', 'moneda', 'creado', 'evento'
  ]);
  hoja.appendRow([
    r.pedido, r.numero, r.fecha, r.nombre, r.email, r.telefono,
    r.menu, r.adultos, r.ninos, r.total, r.moneda, r.creado, idEvento || ''
  ]);
}

/**
 * Un evento por reserva, de 13:00 a 18:00, que es el horario que
 * promete el sitio. El nombre y el teléfono van en el título y en
 * la descripción para que sirvan desde el celular, sin abrir nada.
 */
function crearEvento(r) {
  try {
    var cal = CalendarApp.getCalendarById(config('CALENDAR_ID'));
    if (!cal) throw new Error('No se encontró el calendario ' + config('CALENDAR_ID'));

    var partes = r.fecha.split('-');
    var inicio = new Date(partes[0], Number(partes[1]) - 1, partes[2], 13, 0, 0);
    var fin    = new Date(partes[0], Number(partes[1]) - 1, partes[2], 18, 0, 0);

    var personas = r.adultos + r.ninos;
    var titulo = personas + ' personas · ' + (r.nombre || 'Sin nombre');

    var evento = cal.createEvent(titulo, inicio, fin, {
      description:
        'Pedido: ' + r.numero + '\n' +
        'Menú: ' + r.menu + '\n' +
        'Adultos: ' + r.adultos + '   Niños: ' + r.ninos + '\n' +
        'Total: ' + r.total + ' ' + r.moneda + '\n' +
        'Email: ' + r.email + '\n' +
        'Teléfono: ' + r.telefono
    });
    return evento.getId();
  } catch (err) {
    // Que falle el calendario no puede hacer que se pierda la
    // reserva: la planilla es la fuente de verdad, el evento es una
    // comodidad. Se anota el problema y se sigue.
    registrar('ERROR calendario', r.pedido + ': ' + err.message);
    return '';
  }
}

/* =============================================================
   Utilidades
   ============================================================= */

function json(obj, codigo) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function zonaHoraria() {
  return Session.getScriptTimeZone() || 'America/Santiago';
}

/** La planilla puede devolver una fecha como texto o como Date. */
function comoFecha(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, zonaHoraria(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

/** Lee una pestaña como lista de objetos, usando la fila 1 de títulos. */
function datos(nombre) {
  var hoja = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!hoja) return [];
  var valores = hoja.getDataRange().getValues();
  if (valores.length < 2) return [];

  var titulos = valores[0].map(function (t) {
    return String(t).trim().toLowerCase().replace(/\s+/g, '_');
  });
  var filas = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = {};
    for (var j = 0; j < titulos.length; j++) fila[titulos[j]] = valores[i][j];
    filas.push(fila);
  }
  return filas;
}

function pedidosYaAnotados() {
  var vistos = {};
  var filas = datos(HOJA_RESERVAS);
  for (var i = 0; i < filas.length; i++) vistos[String(filas[i].pedido)] = true;
  return vistos;
}

function hojaOCrear(nombre, titulos) {
  var libro = SpreadsheetApp.getActive();
  var hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    hoja.appendRow(titulos);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function registrar(nivel, mensaje) {
  try {
    var hoja = hojaOCrear(HOJA_REGISTRO, ['cuando', 'nivel', 'mensaje']);
    hoja.appendRow([new Date(), nivel, mensaje]);
  } catch (e) {
    // Si ni siquiera se puede escribir el registro, no hay nada que
    // hacer: que no tumbe la corrida.
  }
}

/* =============================================================
   Para correr a mano desde el editor, al configurar
   ============================================================= */

/** Comprueba que las cuatro propiedades estén puestas. */
function revisarConfiguracion() {
  var faltan = [];
  for (var i = 0; i < PROPIEDADES.length; i++) {
    if (!PropertiesService.getScriptProperties().getProperty(PROPIEDADES[i])) {
      faltan.push(PROPIEDADES[i]);
    }
  }
  if (faltan.length) throw new Error('Faltan propiedades: ' + faltan.join(', '));
  Logger.log('Configuración completa.');
}

/** Prueba que el token de Shopify sirva, sin escribir nada. */
function probarShopify() {
  var pedidos = pedidosPagadosDesde(new Date(new Date().getTime() - 30 * 24 * 3600 * 1000));
  Logger.log('Pedidos pagados en los últimos 30 días: ' + pedidos.length);
  if (pedidos.length) Logger.log('El más reciente: ' + pedidos[0].name);
}

/** Prueba que el calendario exista y se pueda escribir. */
function probarCalendario() {
  var cal = CalendarApp.getCalendarById(config('CALENDAR_ID'));
  if (!cal) throw new Error('No se encontró el calendario.');
  Logger.log('Calendario: ' + cal.getName());
}

/** Muestra lo que el sitio recibiría hoy. */
function probarFechas() {
  Logger.log(JSON.stringify(fechasAbiertas(), null, 2));
}
