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
 *      Shopify por pedidos nuevos, los anota en la planilla
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
      'desplegable de arriba elige una de estas: prepararPlanilla ' +
      '(la primera vez), revisarConfiguracion, probarShopify, ' +
      'probarDatosDelCliente, probarCalendario o probarFechas.');
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
/**
 * Los días abiertos con TODO lo que se sabe de cada uno.
 *
 * Es la base de dos cosas distintas: lo que recibe el sitio y lo que ve
 * el panel. Viven de esta función para que no puedan decir cosas
 * diferentes del mismo día.
 *
 * OJO: acá los días llenos SÍ van. El sitio los saca después, porque no
 * puede ofrecer lo que no tiene; el panel los necesita, porque un día
 * lleno es justamente el que hay que mirar.
 *
 * `tope` limita cuántos devolver, para que el panel no tenga que pedir
 * tres meses de fines de semana cuando le bastan las próximas semanas.
 */
function diasAbiertos(tope) {
  var cfg = configuracion();
  var exc = excepciones();
  var ocup = ocupacionPorFecha();
  var hoy = hoyAca();

  var salida = [];
  for (var i = 0; i < cfg.dias_a_futuro; i++) {
    if (tope && salida.length >= tope) break;

    var fecha = sumarDias(hoy, i);
    var e = exc[fecha];

    // La excepción manda sobre la regla, en los dos sentidos.
    var abierta = e && e.abierta !== null
      ? e.abierta
      : cfg.dias_abiertos.indexOf(diaDeLaSemana(fecha)) !== -1;
    if (!abierta) continue;

    var cupo = (e && e.cupo) ? e.cupo : cfg.cupo_normal;
    var o = ocup[fecha] || { pagadas: 0, porPagar: 0, total: 0 };
    var quedan = Math.max(0, cupo - o.total);

    salida.push({
      fecha: fecha,
      cupo: cupo,
      pagadas: o.pagadas,
      porPagar: o.porPagar,
      tomadas: o.total,
      quedan: quedan,
      // El sitio solo muestra el número cuando quedan pocos. Se calcula
      // acá para que el criterio viva en un solo lugar, la planilla.
      pocos: quedan <= cfg.aviso_pocos_lugares,
      // Si el día es una excepción, por qué lo es.
      nota: (e && e.nota) || '',
      excepcion: !!e
    });
  }
  return salida;
}

/**
 * Lo que recibe el SITIO. Deliberadamente menos que diasAbiertos():
 * cuánta gente ya reservó, cuánto pagó y de qué tamaño es el local no
 * son cosas que tenga que saber un visitante. Solo van la fecha, cuántos
 * lugares quedan y si son pocos.
 */
function fechasAbiertas() {
  var salida = [];
  var dias = diasAbiertos();
  for (var i = 0; i < dias.length; i++) {
    // Un día lleno no se ofrece.
    if (dias[i].quedan <= 0) continue;
    salida.push({
      fecha: dias[i].fecha,
      quedan: dias[i].quedan,
      pocos: dias[i].pocos
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

    mapa[fecha] = {
      abierta: abierta,
      cupo: Number(filas[i].cupo) || 0,
      nota: String(filas[i].nota || '').trim()
    };
  }
  return mapa;
}

/**
 * Suma las personas ya reservadas por fecha.
 *
 * Cuenta adultos Y niños: el cupo son las personas que entran ese día,
 * que es lo que limita sillas, mesas y comida (decidido el 2026-10-13).
 */
function ocupacionPorFecha() {
  var mapa = {};
  var filas = datos(HOJA_RESERVAS);
  for (var i = 0; i < filas.length; i++) {
    var fecha = comoFecha(filas[i].fecha_reserva);
    if (!fecha) continue;

    // Una reserva cancelada libera su cupo. Una SIN PAGAR no: la silla
    // queda ocupada igual, y el día se llena con las dos.
    var estado = String(filas[i].estado || '').trim().toLowerCase();
    if (estado === 'cancelada') continue;

    var n = (Number(filas[i].adultos) || 0) + (Number(filas[i].ninos) || 0);
    if (!mapa[fecha]) mapa[fecha] = { pagadas: 0, porPagar: 0, total: 0 };

    // Una fila SIN estado es anterior a que existiera la columna, y en
    // esa época el backend solo anotaba pedidos con financial_status=paid.
    // O sea que estaba pagada: contarla como "por pagar" haría que el
    // panel mostrara una deuda que no existe.
    if (estado === 'pagada' || estado === '') mapa[fecha].pagadas += n;
    else mapa[fecha].porPagar += n;
    mapa[fecha].total += n;
  }
  return mapa;
}

/* =============================================================
   2. Traer los pedidos desde Shopify
   ============================================================= */

/**
 * Esto es lo que corre cada pocos minutos con un activador de
 * tiempo. Busca pedidos posteriores al último que ya anotamos, y por
 * cada uno escribe la reserva y crea el evento.
 *
 * ANOTA TAMBIÉN LOS QUE NO ESTÁN PAGADOS, desde el 2026-10-14, cuando
 * se agregó la modalidad "pagar en el local". Esos pedidos quedan en
 * Shopify como pendientes, y antes esta función los ignoraba: la
 * reserva nunca habría llegado a la planilla. Ahora toda reserva se
 * anota y la columna `estado` dice si está pagada o por pagar.
 *
 * Eso significa que una reserva sin pagar TOMA CUPO igual. Es lo
 * correcto: la silla queda ocupada se haya pagado o no. También
 * significa que alguien puede reservar y no llegar, y ese lugar se
 * pierde. Es el costo de ofrecer pago en el local, y se administra
 * desde la planilla, no desde el código.
 *
 * Es idempotente: si el mismo pedido llega dos veces, la segunda no
 * duplica la fila. Lo que sí hace es ponerle al día el `estado`, para
 * que un pedido que se pagó después —o que se canceló— no quede
 * congelado en lo que era la primera vez que lo vimos.
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
    var pedidos = pedidosDesde(ultimaRevision());

    var nuevos = 0, actualizados = 0;
    for (var i = 0; i < pedidos.length; i++) {
      var p = pedidos[i];

      var ya = yaAnotados[String(p.id)];
      if (ya) {
        // Ya está anotado. Lo único que puede haber cambiado y nos
        // importa es si pagó o si se canceló.
        var ahora = estadoDe(p);
        if (ya.estado !== ahora) {
          actualizarEstado(ya.fila, ahora);
          ya.estado = ahora;
          actualizados++;
        }
        continue;
      }

      var reserva = leerReserva(p);
      if (!reserva) continue;          // pedido sin fecha: no es una reserva

      var idEvento = crearEvento(reserva);
      anotarReserva(reserva, idEvento);
      yaAnotados[String(p.id)] = { fila: 0, estado: reserva.estado };
      nuevos++;
    }

    PropertiesService.getScriptProperties()
      .setProperty('ULTIMA_REVISION', new Date().toISOString());
    registrar('OK', 'Pedidos revisados: ' + pedidos.length +
                    ', nuevos: ' + nuevos +
                    ', estados corregidos: ' + actualizados);
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

function pedidosDesde(desde) {
  // Sin filtro de financial_status: hacen falta los pendientes, que son
  // los que van a pagar en el local. El estado se evalúa después, en
  // estadoDe(), que es un solo lugar y no una condición en la URL.
  var url = 'https://' + config('SHOPIFY_DOMINIO') +
            '/admin/api/' + config('SHOPIFY_VERSION') + '/orders.json' +
            '?status=any&limit=250' +
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
/**
 * En qué está el pedido. Tres estados y no el financial_status crudo de
 * Shopify, porque la planilla la lee una persona y "partially_refunded"
 * no le dice nada a nadie:
 *
 *   pagada     — la plata está.
 *   por pagar  — reservó y paga en el local. También cae acá un pago
 *                a medias: mientras quede saldo, no está pagada.
 *   cancelada  — se anuló o se devolvió. No toma cupo.
 *
 * Que `authorized` cuente como "por pagar" es a propósito: la tarjeta
 * está retenida pero la plata todavía no se cobró. Equivocarse hacia
 * "falta cobrar" hace que alguien lo revise; equivocarse hacia "pagada"
 * hace que nadie lo revise.
 */
function estadoDe(pedido) {
  if (pedido.cancelled_at) return 'cancelada';
  var f = String(pedido.financial_status || '');
  if (f === 'refunded' || f === 'voided') return 'cancelada';
  if (f === 'paid') return 'pagada';
  return 'por pagar';
}


function leerReserva(pedido) {
  var fecha = null, adultos = 0, ninos = 0, menus = [], modalidades = [];

  var lineas = pedido.line_items || [];
  for (var i = 0; i < lineas.length; i++) {
    var l = lineas[i];
    var props = l.properties || [];
    for (var j = 0; j < props.length; j++) {
      if (props[j].name === '_booking_date' && props[j].value) {
        fecha = String(props[j].value).slice(0, 10);
      }
    }

    // La modalidad sale del nombre de la variante que vendió Shopify
    // ("Pago directo" / "Solo reserva"). Se anota porque el sitio no
    // controla cómo se paga: la persona elige el medio de pago en el
    // checkout. Alguien puede comprar la variante con descuento y ahí
    // elegir pagar en el local. Una fila que diga "Pago directo" y
    // "por pagar" es exactamente ese caso, y así se ve.
    var variante = String(l.variant_title || '');
    if (variante && modalidades.indexOf(variante) === -1) modalidades.push(variante);

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
    nombre: nombreDe(pedido),
    email: emailDe(pedido),
    telefono: telefonoDe(pedido),
    menu: menus.join(' + '),
    modalidad: modalidades.join(' + '),
    estado: estadoDe(pedido),
    adultos: adultos,
    ninos: ninos,
    total: pedido.total_price || '',
    moneda: pedido.currency || '',
    creado: pedido.created_at || ''
  };
}

/**
 * El nombre de quien reserva, mirando en los tres lugares donde Shopify
 * lo puede tener.
 *
 * No es paranoia: `customer` viene vacío en dos casos distintos. Uno, que
 * el pedido no tenga cliente asociado. Dos, y más común, que la app no
 * tenga permiso de DATOS PROTEGIDOS DEL CLIENTE — `read_orders` por sí
 * solo no alcanza, y Shopify devuelve el pedido completo pero con el
 * nombre, el correo y las direcciones en blanco, sin decir que los
 * censuró. Ver backend/README.md.
 *
 * Cuando es lo segundo las direcciones también vienen censuradas y este
 * respaldo no salva nada; para eso está probarDatosDelCliente(). Pero en
 * el primer caso sí, y cuesta diez líneas.
 */
function nombreDe(pedido) {
  var c = pedido.customer || {};
  var n = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();
  if (n) return n;

  var dir = pedido.billing_address || pedido.shipping_address || {};
  n = String(dir.name || '').trim();
  if (n) return n;

  return ((dir.first_name || '') + ' ' + (dir.last_name || '')).trim();
}

/**
 * El correo. `email` es el del pedido —el que la persona escribió en el
 * checkout— y es el que corresponde; `customer.email` es el de la ficha
 * del cliente y puede ser otro si reservó con un correo distinto al de su
 * cuenta. Por eso el del pedido va primero.
 */
function emailDe(pedido) {
  var c = pedido.customer || {};
  return pedido.email || pedido.contact_email || c.email || '';
}

/**
 * El teléfono, y acá estaba el hueco: `order.phone` viene vacío casi
 * siempre. El checkout no pide un teléfono suelto, lo pide DENTRO de la
 * dirección, así que el número que la persona escribió está en
 * `billing_address.phone` o en `shipping_address.phone`.
 *
 * Mirar solo `order.phone` y `customer.phone` era quedarse con los dos
 * lugares que normalmente están vacíos.
 */
function telefonoDe(pedido) {
  var c = pedido.customer || {};
  var fact = pedido.billing_address || {};
  var envio = pedido.shipping_address || {};
  return pedido.phone || fact.phone || envio.phone || c.phone || '';
}


/* =============================================================
   3. Escribir: planilla y calendario
   ============================================================= */

// Los títulos de las cuatro pestañas viven acá y en ninguna otra parte.
// No son decorativos: el script busca cada valor POR EL NOMBRE de su
// columna, así que un título mal escrito no da error, deja la columna
// vacía o la duplica al lado.
var COLUMNAS_CONFIG = ['clave', 'valor'];
var COLUMNAS_EXCEPCIONES = ['fecha', 'abierta', 'cupo', 'nota'];
var COLUMNAS_REGISTRO = ['cuando', 'nivel', 'mensaje'];
var COLUMNAS_RESERVAS = [
  'pedido', 'numero', 'fecha_reserva', 'nombre', 'email', 'telefono',
  'menu', 'modalidad', 'estado', 'adultos', 'ninos', 'total', 'moneda',
  'creado', 'evento'
];

/** Los títulos de la hoja, normalizados igual que en datos(). */
function encabezado(hoja) {
  var ancho = hoja.getLastColumn();
  if (!ancho) return [];
  return hoja.getRange(1, 1, 1, ancho).getValues()[0].map(function (t) {
    return String(t).trim().toLowerCase().replace(/\s+/g, '_');
  });
}

/**
 * Agrega al encabezado las columnas que falten, sin tocar las que ya
 * están ni los datos de abajo.
 *
 * Hace falta porque la planilla del cliente ya existe: hojaOCrear()
 * escribe los títulos solo cuando crea la hoja, así que una columna
 * nueva no aparecería nunca y appendRow la escribiría bajo un título
 * vacío. Las filas viejas quedan con la celda en blanco, que es lo
 * honesto: de esos pedidos no teníamos el dato.
 */
function asegurarColumnas(hoja, titulos) {
  var actuales = encabezado(hoja);
  var faltan = [];
  for (var i = 0; i < titulos.length; i++) {
    if (actuales.indexOf(titulos[i]) === -1) faltan.push(titulos[i]);
  }
  if (faltan.length) {
    hoja.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  return hoja;
}

/**
 * Escribe la fila buscando cada valor por el NOMBRE de su columna, no
 * por su posición. Así alguien puede mover o insertar columnas en la
 * planilla —que es de ellos y la van a tocar— sin que las reservas
 * empiecen a caer corridas de lugar, que es el tipo de error que no se
 * nota hasta que ya hay veinte filas malas.
 */
function anotarReserva(r, idEvento) {
  var hoja = hojaOCrear(HOJA_RESERVAS, COLUMNAS_RESERVAS);
  asegurarColumnas(hoja, COLUMNAS_RESERVAS);

  var valores = {
    pedido: r.pedido, numero: r.numero, fecha_reserva: r.fecha,
    nombre: r.nombre, email: r.email, telefono: r.telefono,
    menu: r.menu, modalidad: r.modalidad, estado: r.estado,
    adultos: r.adultos, ninos: r.ninos, total: r.total,
    moneda: r.moneda, creado: r.creado, evento: idEvento || ''
  };
  hoja.appendRow(encabezado(hoja).map(function (t) {
    return valores.hasOwnProperty(t) ? valores[t] : '';
  }));
}

/**
 * Un pedido que se pagó después, o que se canceló, no puede quedar
 * congelado en lo que era la primera vez que lo vimos: el panel de
 * pagadas contra por pagar saldría mal y nadie se daría cuenta.
 */
function actualizarEstado(fila, estado) {
  var hoja = SpreadsheetApp.getActive().getSheetByName(HOJA_RESERVAS);
  if (!hoja) return;
  var col = encabezado(hoja).indexOf('estado');
  if (col === -1) return;
  hoja.getRange(fila, col + 1).setValue(estado);
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
    // "POR PAGAR" va en el título y no solo en la descripción: en el
    // celular se ve el título del evento y nada más, y es justo el dato
    // que hay que tener en la mano cuando llega la gente.
    var titulo = personas + ' personas · ' + (r.nombre || 'Sin nombre') +
                 (r.estado === 'pagada' ? '' : ' · POR PAGAR');

    var evento = cal.createEvent(titulo, inicio, fin, {
      description:
        'Pedido: ' + r.numero + '\n' +
        'Menú: ' + r.menu + '\n' +
        'Modalidad: ' + (r.modalidad || 'sin especificar') + '\n' +
        'Estado: ' + r.estado + '\n' +
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

/**
 * Los pedidos que ya están en la planilla, con en qué fila y en qué
 * estado. La fila hace falta para poder corregirle el estado a uno que
 * cambió; antes bastaba con saber que existía.
 */
function pedidosYaAnotados() {
  var vistos = {};
  var filas = datos(HOJA_RESERVAS);
  for (var i = 0; i < filas.length; i++) {
    vistos[String(filas[i].pedido)] = {
      fila: i + 2,                    // +1 por el encabezado, +1 porque empieza en 1
      estado: String(filas[i].estado || '')
    };
  }
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
    var hoja = hojaOCrear(HOJA_REGISTRO, COLUMNAS_REGISTRO);
    hoja.appendRow([new Date(), nivel, mensaje]);
  } catch (e) {
    // Si ni siquiera se puede escribir el registro, no hay nada que
    // hacer: que no tumbe la corrida.
  }
}

/* =============================================================
   Panel de administración
   -------------------------------------------------------------
   Vive DENTRO de la planilla, como un menú propio y una ventana.
   No es una página aparte, y eso es a propósito:

   - La autenticación sale gratis. Quien puede abrir la planilla puede
     abrir el panel, y nadie más. Una página suelta que cambia cupos y
     fechas necesitaría su propio login, y el Web App que usa el sitio
     está publicado como "cualquier usuario".
   - Un solo lugar con la verdad: escribe en las mismas pestañas que ya
     lee el sitio, así que no hay una segunda copia que se desfase.
   - Nada nuevo que desplegar: mismo proyecto, sin URL nueva, sin CORS.

   Y la planilla sigue siendo el respaldo: si el panel falla, las filas
   se editan a mano como siempre.
   ============================================================= */

/**
 * El menú de arriba. Es un activador simple: Google lo corre solo al
 * abrir la planilla, sin pedir permisos, porque crear un menú no toca
 * datos. Lo que el menú abre sí corre con la sesión de quien lo aprieta.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Brasas')
    .addItem('Panel de reservas', 'abrirPanel')
    .addToUi();
}

function abrirPanel() {
  var html = HtmlService.createHtmlOutputFromFile('Panel')
    .setWidth(920)
    .setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, 'Reservas');
}

/**
 * Lo que el panel pide para dibujar la ocupación.
 *
 * Devuelve los próximos días abiertos, llenos incluidos, con el reparto
 * entre pagadas y por pagar. Doce días abiertos son unos dos meses de
 * fines de semana: suficiente para planificar sin traer la agenda entera.
 */
function panelOcupacion() {
  var dias = diasAbiertos(12);
  var cfg = configuracion();
  return {
    dias: dias,
    cupoNormal: cfg.cupo_normal,
    hoy: hoyAca()
  };
}


/* =============================================================
   Para correr a mano desde el editor, al configurar
   ============================================================= */

/**
 * PASO 0. Deja las cuatro pestañas creadas con sus títulos.
 *
 * Existe para no escribirlos a mano, y no es comodidad: el script busca
 * cada valor por el NOMBRE de su columna. Escrito a mano, un "Menú" con
 * tilde o un "Niños" con eñe no calzan con `menu` y `ninos` —la
 * normalización arregla mayúsculas y espacios, no tildes— y el error no
 * se ve: la columna queda vacía, o aparece duplicada al lado cuando el
 * script agrega la que falta.
 *
 * Es segura de correr de nuevo. No borra ni pisa nada: a una pestaña que
 * ya existe solo le agrega las columnas que le falten, y si Config ya
 * tiene filas no las toca.
 */
function prepararPlanilla() {
  var hechos = [];

  var cfg = asegurarColumnas(hojaOCrear(HOJA_CONFIG, COLUMNAS_CONFIG),
                             COLUMNAS_CONFIG);
  if (cfg.getLastRow() < 2) {
    // Los valores por defecto se escriben para que se VEAN. El script ya
    // los usaba cuando la pestaña estaba vacía, solo que invisibles, y
    // nadie puede corregir un número que no sabe que existe. Son los que
    // hay que revisar: el cupo sobre todo.
    for (var k in POR_DEFECTO) cfg.appendRow([k, POR_DEFECTO[k]]);
    hechos.push('Config: creada con los valores por defecto. REVÍSALOS.');
  } else {
    hechos.push('Config: ya tenía filas, no se tocó.');
  }

  asegurarColumnas(hojaOCrear(HOJA_EXCEPCIONES, COLUMNAS_EXCEPCIONES),
                   COLUMNAS_EXCEPCIONES);
  hechos.push('Excepciones: lista, y vacía es lo normal.');

  asegurarColumnas(hojaOCrear(HOJA_RESERVAS, COLUMNAS_RESERVAS),
                   COLUMNAS_RESERVAS);
  hechos.push('Reservas: ' + COLUMNAS_RESERVAS.length + ' columnas.');

  asegurarColumnas(hojaOCrear(HOJA_REGISTRO, COLUMNAS_REGISTRO),
                   COLUMNAS_REGISTRO);
  hechos.push('Registro: listo.');

  var texto = hechos.join('\n');
  Logger.log(texto);
  registrar('OK', 'prepararPlanilla: ' + hechos.join(' | '));
  return texto;
}

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
  var pedidos = pedidosDesde(new Date(new Date().getTime() - 30 * 24 * 3600 * 1000));
  Logger.log('Pedidos en los últimos 30 días: ' + pedidos.length);
  if (pedidos.length) Logger.log('El más reciente: ' + pedidos[0].name);
}

/**
 * Dice si Shopify nos está entregando el nombre y el correo, o si nos los
 * está censurando.
 *
 * Correr esto en vez de adivinar: los dos casos se ven igual desde la
 * planilla —la celda vacía— pero se arreglan en lugares distintos. Si el
 * pedido trae las líneas y el total pero no el nombre ni el correo, no es
 * que falte el dato: es que la app no tiene permiso de datos protegidos
 * del cliente.
 *
 * El correo sale enmascarado. Para saber si llegó basta con verlo, y el
 * registro de Apps Script no es lugar para dejar el correo de un cliente
 * escrito entero.
 */
function probarDatosDelCliente() {
  var pedidos = pedidosDesde(new Date(new Date().getTime() - 90 * 24 * 3600 * 1000));
  if (!pedidos.length) {
    Logger.log('No hay pedidos en los últimos 90 días: no hay nada que mirar.');
    return;
  }

  var p = pedidos[0];
  var dir = p.billing_address || p.shipping_address || {};

  Logger.log('Pedido más reciente: ' + (p.name || p.id));
  Logger.log('  líneas: ' + ((p.line_items || []).length) +
             '   total: ' + p.total_price + ' ' + p.currency);
  Logger.log('');

  // Campo por campo, distinguiendo "la llave no aparece" de "está en null".
  // Comprobado contra la tienda: Shopify CENSURA OMITIENDO la llave, y usa
  // null para un dato que de verdad no hay. Así que un `customer` que trae
  // datos pero sin `first_name` ni `email` no es un cliente sin nombre: es
  // un cliente censurado, y no hay campo alternativo del que sacarlo.
  Logger.log('Qué trae el pedido, campo por campo:');
  Logger.log('  order.email           ' + estadoDelCampo(p, 'email'));
  Logger.log('  order.contact_email   ' + estadoDelCampo(p, 'contact_email'));
  Logger.log('  order.phone           ' + estadoDelCampo(p, 'phone'));
  Logger.log('  order.customer        ' + estadoDelCampo(p, 'customer'));
  Logger.log('  order.billing_address ' + estadoDelCampo(p, 'billing_address'));
  Logger.log('  order.shipping_address ' + estadoDelCampo(p, 'shipping_address'));
  if (p.customer) {
    Logger.log('  customer.first_name   ' + estadoDelCampo(p.customer, 'first_name'));
    Logger.log('  customer.email        ' + estadoDelCampo(p.customer, 'email'));
  }
  if (p.billing_address) {
    Logger.log('  billing_address.name  ' + estadoDelCampo(p.billing_address, 'name'));
    Logger.log('  billing_address.phone ' + estadoDelCampo(p.billing_address, 'phone'));
  }

  Logger.log('');
  Logger.log('Lo que el backend sacaría de ahí:');
  Logger.log('  nombre: ' + (nombreDe(p) || '(vacío)'));
  Logger.log('  email: ' + (enmascarar(emailDe(p)) || '(vacío)'));
  Logger.log('  teléfono: ' + (telefonoDe(p) ? 'viene' : '(vacío)'));

  // El pedido llegó entero pero sin nada de la persona: eso no es un
  // pedido sin datos, es un pedido censurado.
  Logger.log('');
  if (!(p.line_items || []).length) {
    Logger.log('DIAGNÓSTICO: este pedido no trae ni líneas. Algo más pasa.');
  } else if (nombreDe(p) && emailDe(p)) {
    Logger.log('DIAGNÓSTICO: los datos del cliente están llegando.');
    Logger.log('Si igual salen vacíos en la planilla, el problema está en otra');
    Logger.log('parte y la lista de arriba dice de qué campo hay que sacarlos.');
  } else if (!nombreDe(p) && !emailDe(p)) {
    Logger.log('DIAGNÓSTICO: el pedido llega completo —líneas y total— pero sin');
    Logger.log('nombre NI correo, en ninguno de los campos de arriba.');

    var censurado =
      pareceCensurado(p.customer, ['first_name', 'last_name', 'email', 'phone']) ||
      pareceCensurado(p.billing_address, ['name', 'first_name', 'last_name', 'phone']);
    if (censurado) {
      Logger.log('Y hay objetos que traen datos pero a los que les faltan JUSTO');
      Logger.log('esas llaves, que es la firma de la censura. Eso descarta que');
      Logger.log('sea de qué campo se lee.');
    }

    Logger.log('Es el permiso de datos protegidos del cliente, que read_orders');
    Logger.log('no incluye. Se habilita en el admin de Shopify, en la app que');
    Logger.log('generó el token.');
    Logger.log('');
    Logger.log('EN UNA TIENDA DE DESARROLLO ESTO ES LO ESPERADO y no hay nada');
    Logger.log('que arreglar acá: el permiso necesita un plan pagado. Las tres');
    Logger.log('columnas se llenan solas en producción, sin tocar una línea de');
    Logger.log('código. Ver backend/README.md.');
  } else {
    Logger.log('DIAGNÓSTICO: llega uno de los dos y el otro no. Mira la lista de');
    Logger.log('arriba: si al que falta le falta la LLAVE dentro de un objeto que');
    Logger.log('sí trae datos, es el permiso; si viene en null, ese pedido no');
    Logger.log('tenía el dato.');
  }
}

/**
 * Si una llave falta, vino nula, vino vacía o trae algo.
 *
 * COMPROBADO CONTRA LA TIENDA (pedido #1007, 2026-10-14), y resultó ser al
 * revés de lo que uno supondría:
 *
 *   - Censurado por falta de permiso  -> LA LLAVE NO APARECE.
 *   - Sin valor de verdad             -> la llave está, en null.
 *
 * En ese pedido `shipping_address` vino en null —correcto, una reserva no
 * tiene envío— mientras que `customer` y `billing_address` traían datos
 * pero SIN las llaves de nombre, correo y teléfono. Un objeto que existe y
 * tiene contenido al que le faltan justo esos campos es la firma de la
 * censura; un null es un dato que de verdad no hay.
 */
function estadoDelCampo(obj, llave) {
  if (!obj || !obj.hasOwnProperty(llave)) return '-> la llave NO APARECE';
  var v = obj[llave];
  if (v === null) return '-> está, en null  (no hay dato)';
  if (v === '') return '-> está, VACÍA';
  if (typeof v === 'object') return '-> trae datos';
  return '-> trae algo';
}

/**
 * ¿El objeto existe y tiene contenido, pero sin ninguna de estas llaves?
 * Eso no pasa por casualidad: es la censura sacando los campos protegidos
 * de un objeto que por lo demás viene entero.
 */
function pareceCensurado(obj, llaves) {
  if (!obj || typeof obj !== 'object') return false;
  var tieneAlgo = false;
  for (var k in obj) { if (obj.hasOwnProperty(k)) { tieneAlgo = true; break; } }
  if (!tieneAlgo) return false;
  for (var i = 0; i < llaves.length; i++) {
    if (obj.hasOwnProperty(llaves[i])) return false;
  }
  return true;
}

/** Deja ver si un correo llegó, sin escribirlo entero en el registro. */
function enmascarar(correo) {
  var t = String(correo || '');
  var i = t.indexOf('@');
  if (i < 1) return t ? '(ilegible)' : '';
  return t.slice(0, Math.min(2, i)) + '***' + t.slice(i);
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
