/* ===========================================================
   Vista diurna — el botón Diurno/Nocturno de la barra
   -----------------------------------------------------------
   Los colores viven en assets/css/tema.css; esto solo pone o
   saca data-tema="dia" en <html> y lo recuerda.

   Va en el <head> SIN defer, a propósito: tiene que pintar el tema
   elegido antes de que el navegador dibuje la página. Con defer, a
   quien eligió el día le aparecería el sitio negro y pegaría un
   salto a claro en cada carga.

   El botón nace con `hidden` en el HTML y este archivo lo muestra:
   si el JavaScript no carga, no queda un botón muerto en la barra.

   Es la tercera excepción a la regla de cero JS, y la pidió el
   cliente (2026-11-05). Recordar una elección entre páginas no se
   puede hacer sin JS en un sitio estático.
   =========================================================== */

(function () {
  'use strict';

  var MEMORIA = 'blp-tema';
  var raiz = document.documentElement;

  function leer() {
    try { return window.localStorage.getItem(MEMORIA); } catch (e) { return null; }
  }
  function guardar(valor) {
    try { window.localStorage.setItem(MEMORIA, valor); } catch (e) { /* sigue sirviendo en esta página */ }
  }

  if (leer() === 'dia') raiz.setAttribute('data-tema', 'dia');

  function conectar() {
    var botones = document.querySelectorAll('.tema-btn');
    for (var i = 0; i < botones.length; i++) {
      botones[i].hidden = false;
      botones[i].addEventListener('click', function () {
        var dia = raiz.getAttribute('data-tema') !== 'dia';
        raiz.classList.add('tema-cambiando');
        if (dia) raiz.setAttribute('data-tema', 'dia');
        else raiz.removeAttribute('data-tema');
        guardar(dia ? 'dia' : 'noche');
        window.setTimeout(function () { raiz.classList.remove('tema-cambiando'); }, 300);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conectar);
  else conectar();
})();
