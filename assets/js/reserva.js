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
    // Pega acá el Storefront API access token. Es público por
    // diseño (solo lee catálogo y crea carritos), así que puede
    // vivir en este archivo sin problema.
    // NUNCA pongas acá un token de Admin API: esos empiezan en
    // "shpat_" y dan acceso a pedidos, clientes y toda la tienda.
    token: '',

    // Dominio que sirve la Storefront API. El prompt de Shopify
    // indica el dominio público; si diera 404 o CORS, hay que
    // cambiarlo por el *.myshopify.com de la tienda.
    dominio: 'brasasdelopirque.cl',

    version: '2024-10',

    // Precios por persona. Hoy son iguales en todas las fechas.
    // Si algún día cambian por fecha, hay que moverlos a los
    // data-* de cada <option>, junto a los IDs de variante.
    precioAdulto: 44000,
    precioNino: 19000
  };

  /* ---------- utilidades ---------- */

  function pesos(n) {
    return '$' + n.toLocaleString('es-CL');
  }

  function gid(id) {
    return 'gid://shopify/ProductVariant/' + id;
  }

  /* ---------- el formulario ---------- */

  var caja = document.querySelector('.reserva-widget');
  if (!caja) return;

  var selFecha = caja.querySelector('#r-fecha');
  var inpAdultos = caja.querySelector('#r-adultos');
  var inpNinos = caja.querySelector('#r-ninos');
  var salPersonas = caja.querySelector('[data-total-personas]');
  var salTotal = caja.querySelector('[data-total-precio]');
  var btnReservar = caja.querySelector('[data-reservar]');
  var zonaAviso = caja.querySelector('[data-mensaje]');

  if (!selFecha || !inpAdultos || !inpNinos || !btnReservar) return;

  function cantidad(input, minimo) {
    var n = parseInt(input.value, 10);
    if (isNaN(n) || n < minimo) n = minimo;
    return n;
  }

  function recalcular() {
    var adultos = cantidad(inpAdultos, 1);
    var ninos = cantidad(inpNinos, 0);
    var total = adultos * CONFIG.precioAdulto + ninos * CONFIG.precioNino;
    if (salPersonas) salPersonas.textContent = adultos + ninos;
    if (salTotal) salTotal.textContent = pesos(total);
  }

  function mensaje(texto, tipo) {
    if (!zonaAviso) return;
    zonaAviso.textContent = texto || '';
    zonaAviso.className = texto ? 'reserva-mensaje ' + (tipo || '') : 'reserva-mensaje';
  }

  /* ---------- crear el carrito ---------- */

  function lineas() {
    var opcion = selFecha.options[selFecha.selectedIndex];
    var fecha = opcion.value;                       // YYYY-MM-DD
    var adultos = cantidad(inpAdultos, 1);
    var ninos = cantidad(inpNinos, 0);

    // Cowlendar lee estas dos propiedades para registrar la reserva
    // en su calendario. Van con guion bajo adelante para que no se
    // le muestren al cliente en el checkout.
    var atributos = [
      { key: '_booking_date', value: fecha },
      { key: '_cowlendar_date', value: fecha }
    ];

    var out = [{
      merchandiseId: gid(opcion.dataset.adulto),
      quantity: adultos,
      attributes: atributos
    }];

    // Si no vienen niños, la línea no se agrega: un quantity 0
    // hace fallar la mutation.
    if (ninos > 0) {
      out.push({
        merchandiseId: gid(opcion.dataset.nino),
        quantity: ninos,
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
    if (!CONFIG.token) {
      mensaje('El sistema de pago todavía no está conectado. Escríbenos por WhatsApp y tomamos tu reserva.', 'error');
      return;
    }

    btnReservar.disabled = true;
    var textoOriginal = btnReservar.textContent;
    btnReservar.textContent = 'Creando tu reserva…';
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
        mensaje('No pudimos crear tu reserva. Vuelve a intentarlo o escríbenos por WhatsApp y la tomamos nosotros.', 'error');
        if (window.console) console.error('[reserva]', e);
      });
  }

  /* ---------- arranque ---------- */

  selFecha.addEventListener('change', recalcular);
  inpAdultos.addEventListener('input', recalcular);
  inpNinos.addEventListener('input', recalcular);
  btnReservar.addEventListener('click', reservar);

  // El botón nace deshabilitado en el HTML para que nadie apriete
  // un botón muerto si este archivo no carga. Se habilita acá.
  btnReservar.disabled = false;
  caja.classList.add('reserva-viva');

  if (!CONFIG.token) {
    mensaje('Vista previa: el pago se conecta cuando la tienda entregue el token.', 'aviso');
  }

  recalcular();
})();
