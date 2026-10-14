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
  // El editor de Apps Script trae preseleccionada la primera función del
  // archivo, y esta es una ayudante interna: correrla sola daba un
  // "Falta la propiedad del script: undefined" que no le dice nada a
  // nadie. Mejor que explique qué pasó.
  if (!clave) {
    throw new Error(
      'config() es una función auxiliar y no se corre sola. En el ' +
      'desplegable de arriba elige una de estas cuatro: ' +
      'revisarConfiguracion, probarShopify, probarCalendario o ' +
      'probarFechas.');
  }
  var v = PropertiesService.getScriptProperties().getProperty(clave);
  if (!v) {
    throw new Error(
      'Falta la propiedad del script: ' + clave + '. Se ponen en ' +
      'Configuración del proyecto → Propiedades del script.');
  }
  return v;
}

var HOJA_CONFIG = 'Config';
var HOJA_EXCEPCIONES = 'Excepciones';
var HOJA_RESERVAS = 'Reservas';
var HOJA_REGISTRO = 'Registro';

// Valores por si la pestaña Config está incompleta. Que falte una fila no
// puede dejar el formulario sin fechas.
var POR_DEFECTO = {
  dias_abiertos: 'sáb,dom',
  cupo_normal: 60,
  dias_a_futuro: 90,
  aviso_pocos_lugares: 10
};

// Lunes es 1 y domingo 0, igual que getDay(). Se aceptan las formas con y
// sin tilde, porque la planilla la escribe una persona.
var DIAS = {
  dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6
};

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
    return json({ error: 'Acción desconocida: ' + accion });
  } catch (err) {
    registrar('ERROR doGet', err.message);
    return json({ error: 'Error interno' });
  }
}

/**
 * Arma la lista de fechas vendibles.
 *
 * NO hay una lista de fechas escrita a mano. Si el lugar abre sábados y
 * domingos, eso serían 104 filas al año que alguien tendría que mantener,
 * y se desactualizarían: es exactamente el problema que tenía el sitio.
 *
 * En vez de eso: una REGLA (qué días de la semana se abre, con qué cupo y
 * hasta cuándo a futuro) y una lista de EXCEPCIONES para lo que se sale de
 * la regla. Tres casos cubre la misma tabla: abrir un día que normalmente
 * no, cerrar uno que sí, y cambiarle el cupo a un día puntual.
 *
 * Al final se descuenta lo ya reservado. Una fecha sin lugares no se
 * ofrece, y una vencida no puede aparecer ni por error, porque la lista
 * empieza en hoy.
 */
function fechasAbiertas() {
  var cfg = configuracion();
  var exc = excepciones();
  var tomadas = lugaresTomadosPorFecha();
  var hoy = hoyAca();

  var salida = [];
  for (var i = 0; i < cfg.dias_a_futuro; i++) {
    var fecha = sumarDias(hoy, i);
    var e = exc[fecha];

    // La excepción manda sobre la regla, en los dos sentidos.
    var abierta = e && e.abierta !== null
      ? e.abierta
      : cfg.dias_abiertos.indexOf(diaDeLaSemana(fecha)) !== -1;
    if (!abierta) continue;

    var cupo = (e && e.cupo) ? e.cupo : cfg.cupo_normal;
    var quedan = Math.max(0, cupo - (tomadas[fecha] || 0));
    if (quedan <= 0) continue;

    salida.push({
      fecha: fecha,
      quedan: quedan,
      // El sitio solo muestra el número cuando quedan pocos. Se calcula
      // acá para que el criterio viva en un solo lugar, la planilla.
      pocos: quedan <= cfg.aviso_pocos_lugares
    });
  }
  return salida;
}

/** Lee la pestaña Config, que es de pares clave/valor. */
function configuracion() {
  var cfg = {};
  for (var k in POR_DEFECTO) cfg[k] = POR_DEFECTO[k];

  var filas = datos(HOJA_CONFIG);
  for (var i = 0; i < filas.length; i++) {
    var clave = String(filas[i].clave || '').trim().toLowerCase();
    if (clave && filas[i].valor !== '' && filas[i].valor != null) {
      cfg[clave] = filas[i].valor;
    }
  }

  cfg.cupo_normal = Number(cfg.cupo_normal) || POR_DEFECTO.cupo_normal;
  cfg.dias_a_futuro = Number(cfg.dias_a_futuro) || POR_DEFECTO.dias_a_futuro;
  cfg.aviso_pocos_lugares = Number(cfg.aviso_pocos_lugares) || 0;
  cfg.dias_abiertos = aDiasDeSemana(cfg.dias_abiertos);
  return cfg;
}

/** "sáb,dom" -> [6, 0]. Tolera tildes, espacios y mayúsculas. */
function aDiasDeSemana(texto) {
  var partes = String(texto || '').split(/[,;/ ]+/);
  var dias = [];
  for (var i = 0; i < partes.length; i++) {
    var p = sinTildes(partes[i]).trim().toLowerCase().slice(0, 3);
    if (p && DIAS.hasOwnProperty(p) && dias.indexOf(DIAS[p]) === -1) {
      dias.push(DIAS[p]);
    }
  }
  return dias;
}

/** Lee la pestaña Excepciones: fecha -> { abierta, cupo }. */
function excepciones() {
  var mapa = {};
  var filas = datos(HOJA_EXCEPCIONES);
  for (var i = 0; i < filas.length; i++) {
    var fecha = comoFecha(filas[i].fecha);
    if (!fecha) continue;

    // Dejar la celda "abierta" en blanco significa "no opino sobre si
    // abre, solo le cambio el cupo": por eso null y no false.
    var txt = sinTildes(String(filas[i].abierta || '')).trim().toLowerCase();
    var abierta = txt === '' ? null : txt.charAt(0) === 's';

    mapa[fecha] = { abierta: abierta, cupo: Number(filas[i].cupo) || 0 };
  }
  return mapa;
}

/**
 * Suma las personas ya reservadas por fecha.
 *
 * Cuenta adultos Y niños: el cupo son las personas que entran ese día,
 * que es lo que limita sillas, mesas y comida (decidido el 2026-10-13).
 */
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

/**
 * Un Web App de Apps Script NO puede elegir el código HTTP: ContentService
 * siempre responde 200. Por eso un error viaja como 200 con {error: ...} en
 * el cuerpo, y no como 400 o 500.
 *
 * El sitio lo sabe: assets/js/reserva.js revisa el campo `error` del JSON,
 * no solo `response.ok`. Si alguna vez se lee este endpoint desde otra
 * parte, hay que hacer lo mismo o los errores pasan por respuestas válidas.
 */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function zonaHoraria() {
  return Session.getScriptTimeZone() || 'America/Santiago';
}

/**
 * Las fechas se manejan SIEMPRE como texto AAAA-MM-DD, nunca como objetos
 * Date que viajen entre zonas horarias.
 *
 * No es purismo: si el sitio manda un Date y acá se interpreta en UTC, una
 * reserva hecha de noche en Chile cae al día siguiente, y una hecha desde
 * Brasil al anterior. El error aparece en una de cada tantas reservas, que
 * es la peor forma de aparecer.
 */
function hoyAca() {
  return Utilities.formatDate(new Date(), zonaHoraria(), 'yyyy-MM-dd');
}

function sumarDias(fecha, n) {
  var p = fecha.split('-');
  // new Date(año, mes, día) construye en la zona local del script, que es
  // la que queremos. El constructor con string sí interpretaría UTC.
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n);
  return Utilities.formatDate(d, zonaHoraria(), 'yyyy-MM-dd');
}

/** 0 es domingo y 6 sábado, igual que getDay(). */
function diaDeLaSemana(fecha) {
  var p = fecha.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay();
}

/** Para que "sáb" y "sab" sean lo mismo en la planilla. */
function sinTildes(s) {
  return String(s)
    .replace(/[áàä]/gi, 'a').replace(/[éèë]/gi, 'e').replace(/[íìï]/gi, 'i')
    .replace(/[óòö]/gi, 'o').replace(/[úùü]/gi, 'u');
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
