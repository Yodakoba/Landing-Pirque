/* ===========================================================
   Sugerencia de idioma
   -----------------------------------------------------------
   Si el navegador del visitante está en un idioma que el sitio
   tiene, y no es el de la página que abrió, le aparece una
   tarjetita ofreciéndole cambiarse.

   SUGIERE, NO REDIRIGE. Nadie termina en un idioma que no pidió.
   La redirección automática por idioma es de las cosas que
   Google desaconseja explícitamente, y además atrapa: un chileno
   con el notebook configurado en inglés vería el sitio en inglés
   sin haberlo pedido, y sin entender por qué.

   Qué mira: el idioma del navegador, no el país. Detectar el país
   de verdad necesita geolocalización por IP, o sea un servicio
   externo en cada carga. Y el idioma del navegador suele ser
   mejor señal igual: un brasileño navegando desde Santiago quiere
   portugués, y el país diría Chile.

   De dónde saca los enlaces: del propio selector de idiomas de la
   barra, que ya trae las rutas correctas a esta misma página en
   los otros idiomas. Así no hay una segunda lista que mantener, y
   si la página no tiene selector, simplemente no pasa nada.

   Se muestra una sola vez. Apenas la persona la cierra o elige un
   idioma —acá o en el desplegable de la barra— queda anotado y no
   vuelve a aparecer.
   =========================================================== */

(function () {
  'use strict';

  var IDIOMAS = ['es', 'en', 'pt'];
  var MEMORIA = 'blp-idioma';

  // Los textos van en el idioma que se ofrece, no en el de la página:
  // a alguien que lee inglés hay que ofrecerle el cambio en inglés.
  var TEXTOS = {
    es: {
      frase: 'Esta página también está disponible en español.',
      ir: 'Ver en español',
      cerrar: 'Cerrar'
    },
    en: {
      frase: 'This page is also available in English.',
      ir: 'View in English',
      cerrar: 'Dismiss'
    },
    pt: {
      frase: 'Esta página também está disponível em português.',
      ir: 'Ver em português',
      cerrar: 'Fechar'
    }
  };

  /* ---------- memoria ---------- */

  // localStorage puede tirar excepción en navegación privada o con las
  // cookies bloqueadas. Si no se puede guardar, la tarjeta se muestra de
  // nuevo en la próxima visita: molesto, pero no roto.
  function yaDecidio() {
    try {
      return !!window.localStorage.getItem(MEMORIA);
    } catch (e) {
      return false;
    }
  }

  function anotar(valor) {
    try {
      window.localStorage.setItem(MEMORIA, valor);
    } catch (e) {
      /* sin memoria disponible: seguimos igual */
    }
  }

  /* ---------- qué idioma prefiere ---------- */

  function preferido() {
    var lista = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < lista.length; i++) {
      var codigo = String(lista[i]).slice(0, 2).toLowerCase();
      if (IDIOMAS.indexOf(codigo) !== -1) return codigo;
    }
    return null;
  }

  /* ---------- arranque ---------- */

  var actual = (document.documentElement.lang || 'es').slice(0, 2);
  var menu = document.querySelector('.idiomas-menu');
  if (!menu) return;

  // Elegir un idioma en el desplegable de la barra también cuenta como
  // decisión tomada: después de eso la tarjeta no tiene nada que aportar.
  var enlaces = menu.querySelectorAll('a[hreflang]');
  for (var i = 0; i < enlaces.length; i++) {
    enlaces[i].addEventListener('click', function () {
      anotar(this.getAttribute('hreflang'));
    });
  }

  if (yaDecidio()) return;

  var quiere = preferido();
  if (!quiere || quiere === actual) return;

  var destino = menu.querySelector('a[hreflang="' + quiere + '"]');
  if (!destino) return;

  /* ---------- la tarjeta ---------- */

  var t = TEXTOS[quiere];

  var caja = document.createElement('div');
  caja.className = 'sugerencia-idioma';
  caja.setAttribute('lang', quiere);
  // role="status" lo anuncia sin robarle el foco a nadie.
  caja.setAttribute('role', 'status');

  var frase = document.createElement('p');
  frase.textContent = t.frase;

  var ir = document.createElement('a');
  ir.className = 'sugerencia-ir';
  ir.href = destino.getAttribute('href');
  ir.setAttribute('hreflang', quiere);
  ir.textContent = t.ir;
  ir.addEventListener('click', function () {
    anotar(quiere);
  });

  var cerrar = document.createElement('button');
  cerrar.className = 'sugerencia-cerrar';
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', t.cerrar);
  cerrar.textContent = '×';
  cerrar.addEventListener('click', function () {
    anotar('quedarse');
    caja.parentNode.removeChild(caja);
  });

  caja.appendChild(frase);
  caja.appendChild(ir);
  caja.appendChild(cerrar);
  document.body.appendChild(caja);
})();
