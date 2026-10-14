/* ===========================================================
   Reserva en línea — Shopify Storefront API + Cowlendar
   -----------------------------------------------------------
   Este es el ÚNICO JavaScript del sitio público. El resto
   (menú de celular, tarjetas que giran, carruseles) es CSS
   puro y así debe quedarse.

   Cómo funciona:
   - Las fechas y los IDs de variante viven en el HTML, en los
     data-* de cada <option>. Así el desplegable sigue siendo
     correcto aunque este archivo no cargue, y agregar fechas
     nuevas es editar el HTML en un solo lugar.
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
    // Storefront API access token. Es público por diseño (solo lee
    // catálogo y crea carritos), así que puede vivir en este archivo.
    // NUNCA pongas acá un token de Admin API: esos empiezan en
    // "shpat_" y dan acceso a pedidos, clientes y toda la tienda.
    //
    // VA VACÍO A PROPÓSITO, y es el interruptor de toda la integración.
    // Mientras esté vacío el botón no llama a la API: avisa y manda a
    // WhatsApp. Ponerle el token es lo que lo enciende para cualquiera
    // que entre al sitio publicado, así que no se llena hasta que la
    // tienda esté lista. El de la tienda de desarrollo está en la
    // conversación con el cliente, no acá: apuntar el sitio en vivo a
    // una tienda de desarrollo mandaría a la gente a un checkout que
    // no puede cobrar.
    token: '',

    // Dominio que sirve la Storefront API.
    //
    // Hoy apunta a la TIENDA DE DESARROLLO. Al salir a producción hay
    // que cambiar esta línea y el token, y además los IDs de variante
    // del HTML, porque en producción son otros.
    dominio: 'brasas-de-lo-pirque-development.myshopify.com',

    // Shopify publica una versión por trimestre y las soporta unos 12
    // meses. Esta es de octubre de 2024, así que ya está fuera de ese
    // plazo: hay que confirmar con la tienda cuál usar antes de
    // conectar.
    version: '2024-10',

    // URL del Web App de Apps Script que entrega las fechas abiertas.
    // Ver backend/README.md. Vacío significa que el calendario no tiene
    // de dónde sacar fechas: lo dice en pantalla y deja el botón apagado,
    // en vez de inventar un calendario que no corresponde a la realidad.
    //
    // Ojo al redesplegar el backend: si en Apps Script se crea una
    // implementación NUEVA en vez de una versión nueva de la misma, la
    // URL cambia y hay que actualizar esta línea. Publicar una versión
    // nueva de la implementación existente conserva la URL.
    backend: 'https://script.google.com/macros/s/AKfycbxBBvz2b_C3VbKuXg75r-BCYNgPvgEjyT9YiYrhPeW6xsXZIKQRlAoFoXhuacVG6C7F/exec'
  };

  // Los precios y los IDs de variante NO están acá: viven en el HTML.
  // El de cada menú en su <option> de #r-menu, y el de niños en los
  // data-* del propio widget. Así el formulario sigue siendo correcto
  // aunque este archivo no cargue, y hay un solo lugar que editar.

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
      ultimos: 'Últimos lugares: quedan {n}.',
      noAlcanza: 'Para esa fecha quedan {n} lugares y estás pidiendo {p}.',
      eligeFecha: 'Elige una fecha en el calendario.',
      sinNadie: 'Elige cuántas personas van con cada menú.',
      sinAdultos: 'Agrega al menos un adulto: el menú de niños acompaña al de un adulto.',
      locale: 'es-CL',
      moneda: '',
      creando: 'Creando tu reserva\u2026',
      sinPago: 'El sistema de pago todavia no esta conectado. Escribenos por WhatsApp y tomamos tu reserva.',
      falla: 'No pudimos crear tu reserva. Vuelve a intentarlo o escribenos por WhatsApp y la tomamos nosotros.',
      vistaPrevia: 'Vista previa: el pago se conecta cuando la tienda entregue el token.'
    },
    en: {
      mesAnterior: 'Previous month',
      mesSiguiente: 'Next month',
      cargando: 'Looking for available dates\u2026',
      sinBackend: 'The calendar connects once the booking system is live.',
      sinFechas: 'No dates available right now. Message us on WhatsApp and we will sort it out.',
      fallaFechas: 'We could not load the dates. Please try again, or message us on WhatsApp.',
      ultimos: 'Last places: {n} left.',
      noAlcanza: 'That date has {n} places left and you are asking for {p}.',
      eligeFecha: 'Pick a date on the calendar.',
      sinNadie: 'Choose how many people go with each menu.',
      sinAdultos: 'Add at least one adult: the children\u2019s menu goes alongside an adult menu.',
      locale: 'en-US',
      moneda: ' CLP',
      creando: 'Creating your booking\u2026',
      sinPago: 'The payment system is not connected yet. Message us on WhatsApp and we will take your booking.',
      falla: 'We could not create your booking. Please try again, or message us on WhatsApp and we will take it.',
      vistaPrevia: 'Preview: payment connects once the store provides the token.'
    },
    pt: {
      mesAnterior: 'Mês anterior',
      mesSiguiente: 'Mês seguinte',
      cargando: 'Procurando datas disponíveis\u2026',
      sinBackend: 'O calendário se conecta quando o sistema de reservas estiver no ar.',
      sinFechas: 'Não há datas disponíveis no momento. Fale com a gente no WhatsApp.',
      fallaFechas: 'Não conseguimos carregar as datas. Tente de novo ou fale com a gente no WhatsApp.',
      ultimos: 'Últimos lugares: restam {n}.',
      noAlcanza: 'Nessa data restam {n} lugares e você está pedindo {p}.',
      eligeFecha: 'Escolha uma data no calendário.',
      sinNadie: 'Escolha quantas pessoas vão com cada menu.',
      sinAdultos: 'Adicione pelo menos um adulto: o menu infantil acompanha o de um adulto.',
      locale: 'pt-BR',
      moneda: ' CLP',
      creando: 'Criando a sua reserva\u2026',
      sinPago: 'O sistema de pagamento ainda nao esta conectado. Fale com a gente no WhatsApp e registramos a sua reserva.',
      falla: 'Nao conseguimos criar a sua reserva. Tente de novo ou fale com a gente no WhatsApp que registramos.',
      vistaPrevia: 'Previa: o pagamento se conecta quando a loja entregar o token.'
    }
  };

  var idioma = (document.documentElement.lang || 'es').slice(0, 2);
  var T = TEXTOS[idioma] || TEXTOS.es;

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

  var selFecha = caja.querySelector('#r-fecha');
  var salPersonas = caja.querySelector('[data-total-personas]');
  var salTotal = caja.querySelector('[data-total-precio]');
  var btnReservar = caja.querySelector('[data-reservar]');
  var zonaAviso = caja.querySelector('[data-mensaje]');

  // Las tres opciones conviven: cada fila es un menú con su propio
  // contador, y un pedido puede llevar varias. Antes era un desplegable y
  // un solo menú por pedido, lo que dejaba fuera algo tan corriente como
  // tres personas con Tradiciones y dos con A Brasas abiertas.
  //
  // Los IDs de variante y los precios salen del HTML, no de acá: un solo
  // lugar que editar al pasar a producción, donde los IDs son otros.
  var opciones = [];
  var nodos = caja.querySelectorAll('[data-opcion]');
  for (var i = 0; i < nodos.length; i++) {
    var nodo = nodos[i];
    opciones.push({
      nodo: nodo,
      variante: nodo.getAttribute('data-variante'),
      precio: parseInt(nodo.getAttribute('data-precio'), 10) || 0,
      // El menú de niños no cuenta como adulto. Es un agregado al de un
      // adulto, no un pedido en sí: ver "al menos un adulto" más abajo.
      adulto: nodo.getAttribute('data-tipo') !== 'nino',
      input: nodo.querySelector('input[type="number"]'),
      menos: nodo.querySelector('[data-menos]'),
      mas: nodo.querySelector('[data-mas]')
    });
  }

  if (!selFecha || !btnReservar || !opciones.length) return;

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

  function adultos() {
    var n = 0;
    for (var i = 0; i < opciones.length; i++) {
      if (opciones[i].adulto) n += cuantos(opciones[i]);
    }
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
      muerto.className = 'cal-dia cerrado';
      muerto.textContent = numero;
      return muerto;
    }

    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cal-dia abierto' + (info.pocos ? ' pocos' : '');
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

    // Las tres opciones nacen en cero, así que lo primero es decir qué
    // falta. Vacío y "solo niños" son cosas distintas: una es el estado
    // inicial y la otra es un pedido que no se puede cumplir.
    if (personas() < 1) {
      avisoFecha.textContent = T.sinNadie;
      avisoFecha.className = 'aviso';
      return;
    }

    // Sin un adulto no hay pedido: el menú de niños es un agregado al de
    // un adulto, no algo que se venda solo. Se avisa antes que el cupo
    // porque es lo que hay que arreglar primero.
    if (adultos() < 1) {
      avisoFecha.textContent = T.sinAdultos;
      avisoFecha.className = 'aviso error';
      return;
    }

    var piden = personas();
    if (piden > info.quedan) {
      avisoFecha.textContent = T.noAlcanza
        .replace('{n}', info.quedan).replace('{p}', piden);
      avisoFecha.className = 'aviso error';
      return;
    }
    if (info.pocos) {
      avisoFecha.textContent = T.ultimos.replace('{n}', info.quedan);
      avisoFecha.className = 'aviso';
      return;
    }
    avisoFecha.textContent = '';
    avisoFecha.className = 'aviso';
  }

  /** ¿Se puede apretar reservar con lo que hay elegido? */
  function pedidoUsable() {
    var info = disponibles[selFecha.value];
    if (!info) return false;              // sin fecha elegida no hay nada
    if (adultos() < 1) return false;      // el menú de niños no va solo
    return personas() <= info.quedan;
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
          disponibles[lista[i].fecha] = {
            quedan: Number(lista[i].quedan) || 0,
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
    var total = 0;
    for (var i = 0; i < opciones.length; i++) {
      var op = opciones[i];
      var n = cuantos(op);
      total += n * op.precio;
      // El input se normaliza: si alguien escribe "-3" o lo deja en blanco,
      // lo que ve tiene que ser lo que se va a cobrar.
      if (op.input.value !== String(n)) op.input.value = n;
      // Con tres filas iguales hay que poder ver de un vistazo cuáles
      // entraron al pedido.
      op.nodo.className = n > 0 ? 'reserva-fila activa' : 'reserva-fila';
      if (op.menos) op.menos.disabled = n < 1;
    }

    if (salPersonas) salPersonas.textContent = personas();
    if (salTotal) salTotal.textContent = pesos(total);

    avisarSobreFecha();
    // Sin fecha elegida, sin un adulto, o pidiendo más lugares de los que
    // quedan, el botón se apaga. Vale más que deje apretar y falle en el
    // checkout.
    btnReservar.disabled = !pedidoUsable();
  }

  function mensaje(texto, tipo) {
    if (!zonaAviso) return;
    zonaAviso.textContent = texto || '';
    zonaAviso.className = texto ? 'reserva-mensaje ' + (tipo || '') : 'reserva-mensaje';
  }

  /* ---------- crear el carrito ---------- */

  function lineas() {
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
        merchandiseId: gid(opciones[i].variante),
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

  function reservar() {
    if (!pedidoUsable()) { avisarSobreFecha(); return; }

    if (!CONFIG.token) {
      mensaje(T.sinPago, 'error');
      return;
    }

    btnReservar.disabled = true;
    var textoOriginal = btnReservar.textContent;
    btnReservar.textContent = T.creando;
    mensaje('');

    fetch('https://' + CONFIG.dominio + '/api/' + CONFIG.version + '/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': CONFIG.token
      },
      body: JSON.stringify({
        query: MUTATION,
        variables: { input: { lines: lineas() } }
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
        btnReservar.disabled = false;
        btnReservar.textContent = textoOriginal;
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
  btnReservar.addEventListener('click', reservar);

  // El botón nace deshabilitado en el HTML para que nadie apriete un botón
  // muerto si este archivo no carga. Acá NO se habilita a ciegas: lo
  // decide recalcular() según haya o no una fecha elegida con lugares.
  caja.classList.add('reserva-viva');
  cargarFechas();

  if (!CONFIG.token) {
    mensaje(T.vistaPrevia, 'aviso');
  }

  recalcular();
})();
