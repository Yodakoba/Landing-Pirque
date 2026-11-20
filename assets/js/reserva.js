/* ===========================================================
   Reserva en línea — Shopify Storefront API + Cowlendar
   -----------------------------------------------------------
   Este es el ÚNICO JavaScript del sitio público. El resto
   (menú de celular, tarjetas que giran, carruseles) es CSS
   puro y así debe quedarse.

   Cómo funciona:
   - Las fechas las entrega el panel (CONFIG.backend); los precios
     los escribe tools/traducir.py en el HTML desde precios.json.
   - La tienda, su token y los IDs de variante viven acá, en
     CONFIG.tiendas: hay DOS tiendas, la real y la de prueba, y
     se elige por la dirección de la página (ver tiendaDeEstaPagina).
   - Este módulo calcula el total, crea el carrito con la
     mutation cartCreate y manda al checkout de Shopify.
   - Sin token, el botón queda deshabilitado con un aviso. El
     formulario se sigue viendo y calculando: lo único que no
     ocurre es la llamada a la API.
   =========================================================== */

(function () {
  'use strict';

  /* ---------- lo único que hay que tocar para salir a producción ---------- */

  var CONFIG = {
    // LAS DOS TIENDAS (2026-11-20, lo pidió el cliente): la real cobra
    // plata de verdad; la de prueba es la tienda de desarrollo de
    // Shopify, que solo acepta pagos de prueba. La real se usa SOLO en
    // las direcciones de `direccionesReales`; en cualquier otra —la
    // versión de prueba de un PR, GitHub Pages, un computador— se usa la
    // de prueba. Así probar un cambio nunca cobra a nadie.
    //
    // Cada tienda trae su dominio, su token y sus IDs de variante. Los IDs
    // van por menú con las mismas claves de precios.json (`tradiciones`,
    // `a_brasas_abiertas`, `ninos`, `pequenos`) y cada fila del formulario
    // dice cuál es la suya con data-menu. Hasta el 2026-11-20 los IDs
    // vivían en el HTML; con dos tiendas, el lugar para editarlos es la
    // ficha de cada una.
    //
    // El token de Storefront es público por diseño (solo lee catálogo y
    // crea carritos), así que puede vivir en este archivo. NUNCA pongas
    // acá un token de Admin API: esos empiezan en "shpat_" y dan acceso a
    // pedidos, clientes y toda la tienda. Un token vacío es el interruptor
    // de la integración: el botón no llama a la API y manda a WhatsApp.
    tiendas: {
      // La tienda real (lo-pirque.myshopify.com). EN BLANCO hasta el
      // lanzamiento: mientras sea null, todas las direcciones usan la de
      // prueba, incluida la real, y la página lo dice. Llenarla es el PR
      // de producción: dominio, token y los ocho IDs.
      real: null,

      // La tienda de DESARROLLO. Su checkout está detrás de la contraseña
      // de la tienda, y solo cobra pagos de prueba.
      prueba: {
        dominio: 'brasas-de-lo-pirque-development.myshopify.com',
        token: 'f7a303e30966d1444ab304747a27031d',
        variantes: {
          tradiciones:       { linea: '50684108013785', local: '50684108046553' },
          a_brasas_abiertas: { linea: '50684143173849', local: '50684143206617' },
          ninos:             { linea: '50684218081497', local: '50684218114265' },
          pequenos:          { linea: '51269453971673', local: '51269454004441' }
        }
      }
    },

    // Las únicas direcciones que cobran de verdad: el dominio, con y sin
    // www, y la dirección propia del proyecto en Vercel, que sirve la
    // misma versión que el dominio (ahí se hace la compra de prueba antes
    // de mover el DNS). Las versiones de prueba de un PR tienen otra
    // dirección (brasas-sitio-git-…), así que no calzan. Cualquier cosa
    // que no esté en esta lista cae en la tienda de prueba: olvidarse de
    // algo nunca termina en un cobro.
    direccionesReales: ['brasasdelopirque.cl', 'www.brasasdelopirque.cl', 'brasas-sitio.vercel.app'],

    // Shopify publica una versión por trimestre y las soporta unos 12
    // meses. La 2026-10 es la estable al 2026-10-20 y está soportada hasta
    // octubre de 2027. Confirmada con el agente de Shopify del cliente,
    // que primero había recomendado la 2025-01: esa lleva como un año
    // fuera de soporte. Antes acá decía 2024-10, igual de vencida.
    version: '2026-10',

    // URL que entrega las fechas abiertas. Vacío significa que el
    // calendario no tiene de dónde sacar fechas: lo dice en pantalla y
    // deja el botón apagado, en vez de inventar un calendario que no
    // corresponde a la realidad.
    //
    // APUNTA AL PANEL desde el 2026-10-21. Antes apuntaba al Web App de
    // Apps Script, y durante un tiempo hubo DOS planillas que no se
    // hablaban: el sitio obedecía al Apps Script y el panel otra,
    // así que cerrar un día en el panel no llegaba al cliente final y las
    // reservas de Shopify no aparecían en el panel. Ahora hay una sola
    // verdad. Ver panel/DESPLIEGUE.md.
    //
    // Esta línea es toda la costura con el backend: de la respuesta se
    // consumen tres campos, {fecha, quedan, pocos}, más uno opcional desde
    // el 2026-11-12: `quedanPagando`, lo que queda para quien paga ahora
    // (una reserva sin pagar no le quita el lugar a quien paga). Si un
    // backend no lo manda, se usa `quedan` y todo sigue como antes.
    // Cambiar de backend es cambiar esta URL más permitir CORS en el nuevo
    // endpoint. Conviene no engordar ese contrato: cada campo que se
    // agregue es un campo que cualquier reemplazo futuro tendrá que imitar.
    backend: 'https://landing-pirque-alpha.vercel.app/api/publico/fechas'
  };

  // Los precios NO están acá: los escribe tools/traducir.py en los data-*
  // de cada fila del HTML, desde precios.json. Así el formulario muestra el
  // precio correcto aunque este archivo no cargue.

  // Qué tienda usa esta página. Real solo si la dirección está en la lista
  // Y la tienda real ya tiene sus datos; todo lo demás, la de prueba.
  function tiendaDeEstaPagina() {
    var host = String(window.location.hostname || '').toLowerCase();
    var real = CONFIG.tiendas.real;
    if (real && CONFIG.direccionesReales.indexOf(host) !== -1) return real;
    return CONFIG.tiendas.prueba;
  }
  var TIENDA = tiendaDeEstaPagina();
  var DE_PRUEBA = TIENDA === CONFIG.tiendas.prueba;

  /* ---------- idiomas ---------- */

  // El sitio se publica en tres idiomas: el espanol vive en la raiz y las
  // copias en en/ y pt/ las genera tools/traducir.py. Este archivo es uno
  // solo para los tres, asi que los textos que muestra salen de aca segun
  // el lang del <html>. Si se agrega un idioma alla, se agrega una fila.
  var TEXTOS = {
    es: {
      mesAnterior: 'Mes anterior',
      mesSiguiente: 'Mes siguiente',
      cargando: 'Buscando fechas disponibles\u2026',
      sinBackend: 'El calendario se conecta cuando el sistema de reservas esté publicado.',
      sinFechas: 'No hay fechas disponibles por ahora. Escríbenos por WhatsApp y lo vemos.',
      fallaFechas: 'No pudimos cargar las fechas. Vuelve a intentarlo o escríbenos por WhatsApp.',
      pocos: 'Pocos cupos: quedan {n}.',
      ultimos: 'Últimos cupos disponibles: quedan {n}.',
      noAlcanza: 'Para esa fecha quedan {n} lugares y estás pidiendo {p}.',
      soloPagando: 'Para esa fecha ya solo hay lugar pagando ahora: para {p} personas, «Solo reservar» no alcanza.',
      eligeFecha: 'Elige una fecha en el calendario.',
      sinNadie: 'Elige cuántas personas van con cada menú.',
      // El nombre de la fila de adultos lo escribe el JS, porque cambia con
      // la casilla. "Tradiciones" y "A Brasas abiertas" son nombres propios
      // y no se traducen; lo que se traduce es la palabra menú.
      menuBase: 'Menú Tradiciones',
      menuAlto: 'Menú A Brasas abiertas',
      locale: 'es-CL',
      moneda: '',
      creando: 'Creando tu reserva\u2026',
      sinPago: 'El sistema de pago todavia no esta conectado. Escribenos por WhatsApp y tomamos tu reserva.',
      falla: 'No pudimos crear tu reserva. Vuelve a intentarlo o escribenos por WhatsApp y la tomamos nosotros.',
      vistaPrevia: 'Vista previa: el pago se conecta cuando la tienda entregue el token.',
      tiendaPrueba: 'Tienda de prueba: aquí no se cobra nada.'
    },
    en: {
      mesAnterior: 'Previous month',
      mesSiguiente: 'Next month',
      cargando: 'Looking for available dates\u2026',
      sinBackend: 'The calendar connects once the booking system is live.',
      sinFechas: 'No dates available right now. Message us on WhatsApp and we will sort it out.',
      fallaFechas: 'We could not load the dates. Please try again, or message us on WhatsApp.',
      pocos: 'Few spots left: {n} remaining.',
      ultimos: 'Last spots available: {n} left.',
      noAlcanza: 'That date has {n} places left and you are asking for {p}.',
      soloPagando: 'For that date there is only room if you pay now: for {p} people, “Book only” is no longer available.',
      eligeFecha: 'Pick a date on the calendar.',
      sinNadie: 'Choose how many people go with each menu.',
      menuBase: 'Tradiciones menu',
      menuAlto: 'A Brasas abiertas menu',
      locale: 'en-US',
      moneda: ' CLP',
      creando: 'Creating your booking\u2026',
      sinPago: 'The payment system is not connected yet. Message us on WhatsApp and we will take your booking.',
      falla: 'We could not create your booking. Please try again, or message us on WhatsApp and we will take it.',
      vistaPrevia: 'Preview: payment connects once the store provides the token.',
      tiendaPrueba: 'Test store: nothing is charged here.'
    },
    pt: {
      mesAnterior: 'Mês anterior',
      mesSiguiente: 'Mês seguinte',
      cargando: 'Procurando datas disponíveis\u2026',
      sinBackend: 'O calendário se conecta quando o sistema de reservas estiver no ar.',
      sinFechas: 'Não há datas disponíveis no momento. Fale com a gente no WhatsApp.',
      fallaFechas: 'Não conseguimos carregar as datas. Tente de novo ou fale com a gente no WhatsApp.',
      pocos: 'Poucas vagas: restam {n}.',
      ultimos: 'Últimas vagas disponíveis: restam {n}.',
      noAlcanza: 'Nessa data restam {n} lugares e você está pedindo {p}.',
      soloPagando: 'Nessa data só há lugar pagando agora: para {p} pessoas, “Só reservar” não está mais disponível.',
      eligeFecha: 'Escolha uma data no calendário.',
      sinNadie: 'Escolha quantas pessoas vão com cada menu.',
      menuBase: 'Menu Tradiciones',
      menuAlto: 'Menu A Brasas abiertas',
      locale: 'pt-BR',
      moneda: ' CLP',
      creando: 'Criando a sua reserva\u2026',
      sinPago: 'O sistema de pagamento ainda nao esta conectado. Fale com a gente no WhatsApp e registramos a sua reserva.',
      falla: 'Nao conseguimos criar a sua reserva. Tente de novo ou fale com a gente no WhatsApp que registramos.',
      vistaPrevia: 'Previa: o pagamento se conecta quando a loja entregar o token.',
      tiendaPrueba: 'Loja de teste: aqui nada é cobrado.'
    }
  };

  var idioma = (document.documentElement.lang || 'es').slice(0, 2);
  var T = TEXTOS[idioma] || TEXTOS.es;

  // Las dos etapas del aviso de cupo (2026-11-06, lo pidió el cliente):
  //   pocos   — naranjo, desde el umbral de la planilla (aviso_pocos_lugares),
  //             que el panel ya manda resuelto en el campo `pocos`;
  //   ultimos — rojo, con menos de ULTIMOS_CUPOS lugares.
  // El rojo se calcula acá con `quedan`, que ya viaja en el contrato: no
  // hace falta un campo más que cualquier backend futuro tenga que imitar.
  var ULTIMOS_CUPOS = 10;
  //
  // Desde el 2026-11-12 miran `pagando`, lo que queda para quien paga ahora:
  // es lo mejor que el sitio puede ofrecer ese día (ver `cargarFechas()`).
  function etapaDe(info) {
    if (!info) return '';
    if (info.pagando < ULTIMOS_CUPOS) return 'ultimos';
    if (info.pocos) return 'pocos';
    return '';
  }

  /* ---------- utilidades ---------- */

  function pesos(n) {
    // El separador de miles cambia por idioma: 44.000 en espanol y
    // portugues, 44,000 en ingles. Afuera de Chile se agrega la sigla
    // CLP, porque el signo $ solo se lee como peso chileno aca.
    return '$' + n.toLocaleString(T.locale) + T.moneda;
  }

  function gid(id) {
    return 'gid://shopify/ProductVariant/' + id;
  }

  /* ---------- el formulario ---------- */

  var caja = document.querySelector('.reserva-widget');
  if (!caja) return;

  // La casilla que sube todos los adultos a A Brasas abiertas. No agrega un
  // pedido: cambia cual variante usa la unica fila de adultos.
  var upgrade = caja.querySelector('[data-upgrade]');

  var selFecha = caja.querySelector('#r-fecha');
  var salPersonas = caja.querySelector('[data-total-personas]');
  var zonaAviso = caja.querySelector('[data-mensaje]');

  // Dos botones, uno por modalidad. Cada uno muestra su propio total y
  // manda su propia variante al carrito; el checkout de Shopify oculta
  // los medios de pago que no corresponden según el SKU.
  var botones = [];
  var nodosBtn = caja.querySelectorAll('[data-pagar]');
  for (var b = 0; b < nodosBtn.length; b++) {
    botones.push({
      nodo: nodosBtn[b],
      modo: nodosBtn[b].getAttribute('data-pagar'),
      salida: nodosBtn[b].querySelector('[data-total-de]'),
      etiqueta: nodosBtn[b].querySelector('span')
    });
  }

  // Las tres opciones conviven: cada fila es un menú con su propio
  // contador, y un pedido puede llevar varias. Antes era un desplegable y
  // un solo menú por pedido, lo que dejaba fuera algo tan corriente como
  // tres personas con Tradiciones y dos con A Brasas abiertas.
  //
  // Los precios salen del HTML (los escribe traducir.py desde precios.json)
  // y los IDs de variante, de la tienda de esta página: cada fila dice con
  // data-menu cuál es su menú, con las mismas claves de precios.json.
  //
  // Una fila cuyo menú no esté en la tienda queda sin variante, y
  // `faltaVariante()` no deja crear el carrito: mejor un aviso que un
  // carrito con un ID inventado.
  function varianteDelMenu(clave, modo) {
    var m = clave && TIENDA.variantes ? TIENDA.variantes[clave] : null;
    return m && m[modo] ? m[modo] : '';
  }

  var opciones = [];
  var nodos = caja.querySelectorAll('[data-opcion]');
  for (var i = 0; i < nodos.length; i++) {
    var nodo = nodos[i];
    var menu = nodo.getAttribute('data-menu');
    var menuAlto = nodo.getAttribute('data-menu-alta');
    opciones.push({
      nodo: nodo,
      // Cada menú tiene dos variantes en Shopify: la de pagar en línea,
      // con descuento, y la de pagar en el local. No son dos precios de
      // lo mismo: son dos productos distintos de la tienda.
      variante: varianteDelMenu(menu, 'linea'),
      precio: parseInt(nodo.getAttribute('data-precio'), 10) || 0,
      varianteLocal: varianteDelMenu(menu, 'local'),
      precioLocal: parseInt(nodo.getAttribute('data-precio-local'), 10) || 0,
      // El par de A Brasas abiertas. Solo la fila de adultos lo trae: por
      // eso el menu de ninos no sube con la casilla, y no por un if.
      varianteAlta: varianteDelMenu(menuAlto, 'linea'),
      precioAlta: parseInt(nodo.getAttribute('data-precio-alta'), 10) || 0,
      varianteAltaLocal: varianteDelMenu(menuAlto, 'local'),
      precioAltaLocal: parseInt(nodo.getAttribute('data-precio-alta-local'), 10) || 0,
      nombre: nodo.querySelector('[data-nombre-menu]'),
      input: nodo.querySelector('input[type="number"]'),
      menos: nodo.querySelector('[data-menos]'),
      mas: nodo.querySelector('[data-mas]'),
      valor: nodo.querySelector('[data-valor]')
    });
  }

  // La modalidad es un argumento y no un estado guardado: la decide el
  // botón que se apretó. Un estado habría que mantenerlo sincronizado
  // con lo que la persona ve, y acá no hay nada que sincronizar.
  //
  // Si a una fila le falta la variante de pagar en el local, cae en la
  // de pagar en línea, que es la más barata: equivocarse cobrando de
  // menos es preferible a cobrar de más sin que lo hayan elegido.
  // Si la casilla esta marcada. Una fila sin variantes de upgrade —la de
  // ninos— se comporta igual este marcada o no.
  function subido() {
    return !!(upgrade && upgrade.checked);
  }

  // Primero se elige el MENU y despues la modalidad, en ese orden. Al reves
  // —preguntando por 'local' y despues por el upgrade— habria cuatro ramas
  // y una combinacion sin cubrir; asi son dos preguntas independientes.
  function parDe(op) {
    if (subido() && op.varianteAlta) {
      return {
        variante: op.varianteAlta, varianteLocal: op.varianteAltaLocal,
        precio: op.precioAlta, precioLocal: op.precioAltaLocal
      };
    }
    return {
      variante: op.variante, varianteLocal: op.varianteLocal,
      precio: op.precio, precioLocal: op.precioLocal
    };
  }

  function varianteDe(op, modo) {
    var par = parDe(op);
    return modo === 'local' && par.varianteLocal ? par.varianteLocal : par.variante;
  }

  function precioDe(op, modo) {
    var par = parDe(op);
    return modo === 'local' && par.precioLocal ? par.precioLocal : par.precio;
  }

  function totalDe(modo) {
    var t = 0;
    for (var i = 0; i < opciones.length; i++) {
      t += cuantos(opciones[i]) * precioDe(opciones[i], modo);
    }
    return t;
  }

  if (!selFecha || !botones.length || !opciones.length) return;

  function cuantos(op) {
    var n = parseInt(op.input.value, 10);
    if (isNaN(n) || n < 0) n = 0;
    return n;
  }

  function personas() {
    var n = 0;
    for (var i = 0; i < opciones.length; i++) n += cuantos(opciones[i]);
    return n;
  }

  /* ---------- el calendario ----------

     Un calendario mensual en vez de un desplegable. No es un capricho:
     ver noviembre completo con los fines de semana encendidos y el resto
     apagado comunica "abrimos sábados y domingos" de un vistazo, cosa que
     una lista de fechas no hace.

     Las fechas las entrega el backend. El sitio NO decide qué días se
     abren: si lo hiciera, habría dos lugares con la verdad y tarde o
     temprano dirían cosas distintas.

     Las fechas se manejan como texto AAAA-MM-DD de punta a punta. Si se
     convirtieran a Date en algún paso, alguien reservando de noche o desde
     otro país terminaría con el día corrido, y ese error aparece en una de
     cada tantas reservas: el peor tipo de error.
  */

  var cajaCal = caja.querySelector('[data-calendario]');
  var avisoFecha = caja.querySelector('[data-aviso-fecha]');
  var disponibles = {};      // 'AAAA-MM-DD' -> { quedan, pocos }
  var mesVisible = null;     // primer día del mes que se está mostrando

  function hoyTexto() {
    var d = new Date();
    return d.getFullYear() + '-' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
           ('0' + d.getDate()).slice(-2);
  }

  function partes(fecha) {
    var p = fecha.split('-');
    return [Number(p[0]), Number(p[1]), Number(p[2])];
  }

  /** Primer día del mes al que pertenece una fecha, como texto. */
  function mesDe(fecha) {
    var p = partes(fecha);
    return p[0] + '-' + ('0' + p[1]).slice(-2) + '-01';
  }

  function correrMes(mes, n) {
    var p = partes(mes);
    var m = p[1] - 1 + n;
    var y = p[0] + Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return y + '-' + ('0' + (m + 1)).slice(-2) + '-01';
  }

  /** Los nombres de mes y de día salen del idioma de la página. */
  function nombreMes(mes) {
    var p = partes(mes);
    var d = new Date(p[0], p[1] - 1, 1);
    try {
      return d.toLocaleDateString(idioma, { month: 'long', year: 'numeric' });
    } catch (e) {
      return p[1] + '/' + p[0];
    }
  }

  function inicialesDias() {
    var out = [];
    // Se parte en lunes: es un negocio chileno y el fin de semana queda
    // junto al final de la fila, que es donde se busca.
    for (var i = 0; i < 7; i++) {
      var d = new Date(2024, 0, 1 + i);   // 2024-01-01 fue lunes
      var txt;
      try {
        txt = d.toLocaleDateString(idioma, { weekday: 'narrow' });
      } catch (e) {
        txt = ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i];
      }
      out.push(txt);
    }
    return out;
  }

  function dibujarCalendario() {
    if (!cajaCal || !mesVisible) return;
    cajaCal.innerHTML = '';

    var p = partes(mesVisible);
    var primero = new Date(p[0], p[1] - 1, 1);
    var diasDelMes = new Date(p[0], p[1], 0).getDate();
    // getDay() da 0 para domingo; la grilla empieza en lunes.
    var desplazamiento = (primero.getDay() + 6) % 7;

    var fechas = Object.keys(disponibles).sort();
    var primeraLibre = fechas.length ? mesDe(fechas[0]) : mesVisible;
    var ultimaLibre = fechas.length ? mesDe(fechas[fechas.length - 1]) : mesVisible;

    // --- cabecera con los dos botones de mes ---
    var cab = document.createElement('div');
    cab.className = 'cal-cab';
    cab.appendChild(botonMes(-1, T.mesAnterior, mesVisible > primeraLibre));
    var titulo = document.createElement('strong');
    titulo.className = 'cal-mes';
    titulo.textContent = nombreMes(mesVisible);
    cab.appendChild(titulo);
    cab.appendChild(botonMes(1, T.mesSiguiente, mesVisible < ultimaLibre));
    cajaCal.appendChild(cab);

    // --- la grilla ---
    var grilla = document.createElement('div');
    grilla.className = 'cal-grilla';

    var iniciales = inicialesDias();
    for (var i = 0; i < 7; i++) {
      var th = document.createElement('span');
      th.className = 'cal-wd';
      th.setAttribute('aria-hidden', 'true');   // la fecha completa va en el botón
      th.textContent = iniciales[i];
      grilla.appendChild(th);
    }

    for (var h = 0; h < desplazamiento; h++) {
      var hueco = document.createElement('span');
      hueco.className = 'cal-dia vacio';
      grilla.appendChild(hueco);
    }

    for (var d = 1; d <= diasDelMes; d++) {
      var fecha = p[0] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + d).slice(-2);
      grilla.appendChild(celdaDia(fecha, d));
    }

    cajaCal.appendChild(grilla);
  }

  function botonMes(paso, etiqueta, habilitado) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cal-nav';
    b.setAttribute('aria-label', etiqueta);
    b.title = etiqueta;
    b.textContent = paso < 0 ? '‹' : '›';
    b.disabled = !habilitado;
    if (habilitado) {
      b.addEventListener('click', function () {
        mesVisible = correrMes(mesVisible, paso);
        dibujarCalendario();
      });
    }
    return b;
  }

  /**
   * Un día abierto es un <button>, así que se llega con el teclado. Uno
   * cerrado es un <span>: si fuera un botón deshabilitado, recorrer el mes
   * con Tab pasaría por treinta casillas muertas.
   */
  function celdaDia(fecha, numero) {
    var info = disponibles[fecha];
    if (!info) {
      var muerto = document.createElement('span');
      muerto.className = 'cal-dia cerrado' + (fecha === hoyTexto() ? ' hoy' : '');
      muerto.textContent = numero;
      return muerto;
    }

    var b = document.createElement('button');
    b.type = 'button';
    var etapa = etapaDe(info);
    b.className = 'cal-dia abierto' + (etapa ? ' ' + etapa : '') +
      (fecha === hoyTexto() ? ' hoy' : '');
    b.setAttribute('data-fecha', fecha);
    b.textContent = numero;

    // El nombre accesible lleva la fecha completa, no el número suelto:
    // "14" sin contexto no le sirve a nadie que no vea la grilla.
    var leible = fecha;
    try {
      leible = new Date(partes(fecha)[0], partes(fecha)[1] - 1, partes(fecha)[2])
        .toLocaleDateString(idioma, { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) { /* queda la fecha cruda */ }
    b.setAttribute('aria-label', leible);

    if (fecha === selFecha.value) {
      b.classList.add('elegido');
      b.setAttribute('aria-current', 'date');
    }

    b.addEventListener('click', function () {
      selFecha.value = fecha;
      dibujarCalendario();
      recalcular();
    });
    return b;
  }

  /** El aviso bajo el calendario: pocos lugares, o que no alcanzan. */
  function avisarSobreFecha() {
    if (!avisoFecha) return;
    var fecha = selFecha.value;
    var info = fecha ? disponibles[fecha] : null;

    if (!fecha || !info) {
      avisoFecha.textContent = T.eligeFecha;
      avisoFecha.className = 'aviso';
      return;
    }

    // Las tres opciones nacen en cero, así que con la fecha ya elegida lo
    // que falta es decir cuánta gente va.
    if (personas() < 1) {
      avisoFecha.textContent = T.sinNadie;
      avisoFecha.className = 'aviso';
      return;
    }

    var piden = personas();
    if (piden > info.pagando) {
      avisoFecha.textContent = T.noAlcanza
        .replace('{n}', info.pagando).replace('{p}', piden);
      avisoFecha.className = 'aviso error';
      return;
    }
    // Caben pagando, pero no reservando sin pagar: el día se llenó de
    // reservas sin pagar, y quien paga tiene preferencia (2026-11-12).
    if (piden > info.quedan) {
      avisoFecha.textContent = T.soloPagando.replace('{p}', piden);
      avisoFecha.className = 'aviso cupo pocos';
      return;
    }
    var etapa = etapaDe(info);
    if (etapa) {
      avisoFecha.textContent = T[etapa].replace('{n}', info.pagando);
      avisoFecha.className = 'aviso cupo ' + etapa;
      return;
    }
    avisoFecha.textContent = '';
    avisoFecha.className = 'aviso';
  }

  /**
   * ¿Se puede apretar este botón con lo que hay elegido?
   *
   * **Cada modalidad tiene su cupo** (2026-11-12, la regla del cliente): una
   * reserva sin pagar queda sujeta a espacio, así que no le quita el lugar a
   * quien paga. *Pagar ahora* mira `pagando`; *Solo reservar*, `quedan`.
   */
  function pedidoUsable(modo) {
    var info = disponibles[selFecha.value];
    if (!info) return false;              // sin fecha elegida no hay nada
    if (personas() < 1) return false;     // ni con el pedido vacío
    // El menú de niños se puede pedir solo: lo decidió el cliente el
    // 2026-10-14. No hay mínimo de adultos.
    return personas() <= (modo === 'directo' ? info.pagando : info.quedan);
  }

  function pintarEstado(texto) {
    if (!cajaCal) return;
    cajaCal.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'cal-estado';
    p.textContent = texto;
    cajaCal.appendChild(p);
  }

  function cargarFechas() {
    if (!CONFIG.backend) {
      pintarEstado(T.sinBackend);
      return;
    }
    pintarEstado(T.cargando);

    fetch(CONFIG.backend + (CONFIG.backend.indexOf('?') === -1 ? '?' : '&') +
          'accion=fechas')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        // Un Web App de Apps Script no puede elegir el código HTTP:
        // siempre responde 200, tambien cuando falla. El error viene en
        // el cuerpo, asi que hay que mirarlo. Sin esto una falla del
        // backend se veria como "no hay fechas", que es otra cosa.
        if (d && d.error) throw new Error(d.error);

        var lista = (d && d.fechas) || [];
        if (!lista.length) { pintarEstado(T.sinFechas); return; }

        disponibles = {};
        for (var i = 0; i < lista.length; i++) {
          var quedan = Number(lista[i].quedan) || 0;
          disponibles[lista[i].fecha] = {
            quedan: quedan,
            // Lo que queda para quien paga ahora. Un backend que no lo
            // mande (el contrato tenía tres campos) deja todo como antes.
            pagando: lista[i].quedanPagando == null ? quedan
              : Math.max(quedan, Number(lista[i].quedanPagando) || 0),
            pocos: !!lista[i].pocos
          };
        }
        mesVisible = mesDe(Object.keys(disponibles).sort()[0]);
        dibujarCalendario();
        recalcular();
      })
      .catch(function (e) {
        pintarEstado(T.fallaFechas);
        if (window.console) console.error('[reserva] fechas', e);
      });
  }

  function recalcular() {
    for (var i = 0; i < opciones.length; i++) {
      var op = opciones[i];
      var n = cuantos(op);
      // El input se normaliza: si alguien escribe "-3" o lo deja en blanco,
      // lo que ve tiene que ser lo que se va a cobrar.
      if (op.input.value !== String(n)) op.input.value = n;
      // Con tres filas iguales hay que poder ver de un vistazo cuáles
      // entraron al pedido.
      op.nodo.className = n > 0 ? 'reserva-fila activa' : 'reserva-fila';
      if (op.menos) op.menos.disabled = n < 1;
      // El nombre y el precio de la fila los escribe el JS en cada pasada,
      // no solo al marcar la casilla: asi no hay forma de que lo que se ve
      // y lo que se va a cobrar se separen. Sin JS el HTML ya trae el caso
      // por defecto, que es Tradiciones.
      if (op.nombre && op.varianteAlta) {
        op.nombre.textContent = subido() ? T.menuAlto : T.menuBase;
      }
      // El precio de la fila es siempre el de pagar en linea, que es el que
      // anuncia el resto del sitio. El recargo del local sale de restar los
      // dos totales de los botones.
      if (op.valor) op.valor.textContent = pesos(precioDe(op, 'directo'));
    }

    if (salPersonas) salPersonas.textContent = personas();

    // Cada botón lleva su propio total. Así la diferencia entre pagar
    // ahora y pagar en el local se ve sin tener que cambiar nada
    // primero, que era lo que obligaba un selector de modalidad.
    for (var k = 0; k < botones.length; k++) {
      if (botones[k].salida) {
        botones[k].salida.textContent = personas() ? pesos(totalDe(botones[k].modo)) : '';
      }
      // Sin fecha elegida, con el pedido vacío, o pidiendo más lugares
      // de los que quedan, los dos se apagan. Vale más que dejen apretar
      // y fallen en el checkout.
      botones[k].nodo.disabled = !pedidoUsable(botones[k].modo);
    }

    avisarSobreFecha();
  }

  function mensaje(texto, tipo) {
    if (!zonaAviso) return;
    zonaAviso.textContent = texto || '';
    zonaAviso.className = texto ? 'reserva-mensaje ' + (tipo || '') : 'reserva-mensaje';
  }

  /* ---------- crear el carrito ---------- */

  function lineas(modo) {
    // Desde 2026-10 las variantes ya no son una por fecha: son una por
    // menú y modalidad. La fecha no elige variante, viaja como propiedad
    // de línea: es la única forma en que llega al pedido, y de ahí la lee
    // el backend para anotar la reserva.
    var fecha = selFecha.value;                                   // YYYY-MM-DD

    // Van con guion bajo adelante para que no se le muestren al cliente
    // en el checkout. El backend lee _booking_date; la segunda queda por
    // si alguna vez se vuelve a una app de reservas.
    var atributos = [
      { key: '_booking_date', value: fecha },
      { key: '_cowlendar_date', value: fecha }
    ];

    // Una línea por menú con cantidad. Las que quedan en cero no se
    // agregan: un quantity 0 hace fallar la mutation.
    var out = [];
    for (var i = 0; i < opciones.length; i++) {
      var n = cuantos(opciones[i]);
      if (n < 1) continue;
      out.push({
        merchandiseId: gid(varianteDe(opciones[i], modo)),
        quantity: n,
        attributes: atributos
      });
    }
    return out;
  }

  var MUTATION = [
    'mutation cartCreate($input: CartInput!) {',
    '  cartCreate(input: $input) {',
    '    cart { id checkoutUrl }',
    '    userErrors { field message }',
    '  }',
    '}'
  ].join('\n');

  // Si alguna fila con gente no tiene variante en la tienda de esta página.
  // No debería pasar: es la guarda de que a una tienda le falte un menú.
  function faltaVariante(modo) {
    for (var i = 0; i < opciones.length; i++) {
      if (cuantos(opciones[i]) > 0 && !varianteDe(opciones[i], modo)) return true;
    }
    return false;
  }

  function reservar(boton) {
    if (!pedidoUsable(boton.modo)) { avisarSobreFecha(); return; }

    if (!TIENDA.token || faltaVariante(boton.modo)) {
      mensaje(T.sinPago, 'error');
      return;
    }

    // Se apagan LOS DOS mientras se crea el carrito. Dejar vivo el otro
    // dejaría apretar los dos seguidos y crear dos carritos, y la
    // persona terminaría en el checkout del segundo sin entender por
    // qué cambió el precio.
    for (var k = 0; k < botones.length; k++) botones[k].nodo.disabled = true;
    var etiquetaOriginal = boton.etiqueta ? boton.etiqueta.textContent : '';
    if (boton.etiqueta) boton.etiqueta.textContent = T.creando;
    if (boton.salida) boton.salida.textContent = '';
    mensaje('');

    function devolverBotones() {
      if (boton.etiqueta) boton.etiqueta.textContent = etiquetaOriginal;
      recalcular();
    }

    fetch('https://' + TIENDA.dominio + '/api/' + CONFIG.version + '/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TIENDA.token
      },
      body: JSON.stringify({
        query: MUTATION,
        variables: { input: { lines: lineas(boton.modo) } }
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        // La Storefront API responde 200 aunque haya errores, así
        // que hay que mirar las tres capas: errors de GraphQL,
        // userErrors de la mutation, y que venga el checkoutUrl.
        if (data.errors && data.errors.length) throw new Error(data.errors[0].message);
        var res = data.data && data.data.cartCreate;
        if (!res) throw new Error('Respuesta inesperada de Shopify');
        if (res.userErrors && res.userErrors.length) throw new Error(res.userErrors[0].message);
        if (!res.cart || !res.cart.checkoutUrl) throw new Error('Shopify no devolvió el checkout');
        window.location.href = res.cart.checkoutUrl;
      })
      .catch(function (e) {
        devolverBotones();
        mensaje(T.falla, 'error');
        if (window.console) console.error('[reserva]', e);
      });
  }

  /* ---------- arranque ---------- */

  // Los botones + y - son una comodidad encima del <input type=number>,
  // que sigue siendo el que guarda la cantidad y se puede escribir a mano.
  // Por eso el paso mueve el valor del input y vuelve a recalcular, en vez
  // de llevar la cuenta por su lado: un solo lugar con la verdad.
  function paso(op, delta) {
    return function () {
      var n = cuantos(op) + delta;
      op.input.value = n < 0 ? 0 : n;
      recalcular();
    };
  }

  for (var k = 0; k < opciones.length; k++) {
    var op = opciones[k];
    op.input.addEventListener('input', recalcular);
    if (op.menos) op.menos.addEventListener('click', paso(op, -1));
    if (op.mas) op.mas.addEventListener('click', paso(op, 1));
  }
  // Marcar la casilla no cambia ninguna cantidad, pero si el menu: hay que
  // repintar el nombre, el precio de la fila y los dos totales.
  if (upgrade) upgrade.addEventListener('change', recalcular);
  // Cada botón se queda con su modalidad en el closure, igual que los
  // pasos del contador: un bucle que compartiera la variable dejaría a
  // los dos mandando la última.
  function alApretar(boton) {
    return function () { reservar(boton); };
  }
  for (var j = 0; j < botones.length; j++) {
    botones[j].nodo.addEventListener('click', alApretar(botones[j]));
  }

  // Los botones nacen deshabilitados en el HTML para que nadie apriete uno
  // muerto si este archivo no carga. Acá NO se habilitan a ciegas: lo
  // decide recalcular() según haya o no una fecha elegida con lugares.
  caja.classList.add('reserva-viva');
  cargarFechas();

  if (!TIENDA.token) {
    mensaje(T.vistaPrevia, 'aviso');
  }

  // En la tienda de prueba lo dice arriba del formulario, y no en la zona de
  // mensajes: esa se borra al apretar un botón, y esto tiene que quedarse a
  // la vista. Es la misma pieza (`reserva-mensaje aviso`, en dorado), solo
  // que fija. En las direcciones reales no aparece.
  if (DE_PRUEBA) {
    var avisoPrueba = document.createElement('p');
    avisoPrueba.className = 'reserva-mensaje aviso reserva-prueba';
    avisoPrueba.setAttribute('data-tienda-prueba', '');
    avisoPrueba.textContent = T.tiendaPrueba;
    var titulo = caja.querySelector('.reserva-titulo');
    if (titulo) titulo.parentNode.insertBefore(avisoPrueba, titulo.nextSibling);
    else caja.insertBefore(avisoPrueba, caja.firstChild);
  }

  recalcular();
})();
