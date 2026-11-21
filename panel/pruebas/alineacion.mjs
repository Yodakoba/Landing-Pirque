/**
 * **La regla de los formularios alineados, mirada en pantalla** (2026-11-21).
 * Se usa dentro de cualquier revisión con Playwright, igual que
 * `revisarPlayStation()`:
 *
 *   import { revisarAlineacion } from './pruebas/alineacion.mjs';
 *   const problemas = await revisarAlineacion(page);  // [] si está todo bien
 *
 * Nació de tres fotos del cliente del mismo día: un campo pegado a su nombre
 * porque la palabra era más corta, un `?` que empujaba su campo hacia abajo
 * respecto de los de al lado, y *Correo del comprobante* partido en dos
 * renglones, que hacía lo mismo. *"Revisa el panel por estas falencias de
 * diseño… sobre todo todos los popups."*
 *
 * Mira lo que se ve en ese momento —si hay una ventana abierta, solo la
 * ventana— y avisa de tres cosas:
 *
 * - **Un salto**: dos campos de una misma fila que no parten a la misma
 *   altura. Es lo que hace un `?` o un nombre de dos renglones sobre uno solo
 *   de ellos.
 * - **Un nombre partido**: el nombre de un campo en dos renglones.
 * - **Un borde que casi calza**: dos campos de filas distintas cuyos bordes
 *   izquierdos difieren entre 2 y 12px. Más que eso es otra columna; menos,
 *   es la misma. Entre medio es un descuido.
 *
 * No reemplaza al ojo: no sabe si una columna está bien elegida, solo si las
 * cosas que deberían calzar, calzan.
 */
export async function revisarAlineacion(page) {
  return page.evaluate(() => {
    const problemas = [];
    const raiz = [...document.querySelectorAll('[role="dialog"]')].at(-1) ?? document.querySelector('main') ?? document.body;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const nombreDe = (el) => (el.getAttribute('aria-label') || el.getAttribute('placeholder')
      || el.closest('label')?.innerText || el.innerText || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);

    // Los campos: lo que se escribe o se elige. Las casillas y los botones de
    // opción son otra cosa (van al lado de su texto, no bajo un nombre).
    const campos = [...raiz.querySelectorAll('input, select, textarea')]
      .filter((el) => !['checkbox', 'radio', 'hidden', 'file', 'range'].includes(el.type) && visible(el));
    const caja = new Map(campos.map((el) => [el, el.getBoundingClientRect()]));

    // 1. Saltos: dentro del contenedor más cercano que tiene otro campo, los
    //    que comparten fila (se solapan en vertical) tienen que partir juntos.
    const vistos = new Set();
    for (const a of campos) {
      let grupo = a.parentElement;
      while (grupo && grupo !== raiz && campos.filter((c) => grupo.contains(c)).length < 2) grupo = grupo.parentElement;
      if (!grupo) continue;
      const ra = caja.get(a);
      for (const b of campos) {
        if (b === a || !grupo.contains(b)) continue;
        const rb = caja.get(b);
        const solape = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (solape < Math.min(ra.height, rb.height) * 0.4) continue;      // otra fila
        const arriba = Math.abs(ra.top - rb.top), abajo = Math.abs(ra.bottom - rb.bottom);
        const centro = Math.abs((ra.top + ra.bottom) - (rb.top + rb.bottom)) / 2;
        // Distinto alto y bien centrados entre sí no es un salto.
        if (arriba < 2 || centro < 1.5 || (abajo < 1.5)) continue;
        const llave = [nombreDe(a), nombreDe(b)].sort().join(' ↔ ');
        if (vistos.has(llave)) continue;
        vistos.add(llave);
        problemas.push(`salto de ${Math.round(arriba)}px: "${nombreDe(a)}" y "${nombreDe(b)}" comparten fila y no parten a la misma altura`);
      }
    }

    // 2. Nombres de campo partidos en dos renglones: el primer texto de un
    //    <label> que envuelve un campo, o un <dt>.
    for (const el of raiz.querySelectorAll('label > span:first-child, label > div:first-child > span:first-child, dt')) {
      if (!visible(el)) continue;
      const etiqueta = el.closest('label');
      if (etiqueta && !etiqueta.querySelector('input:not([type=checkbox]):not([type=radio]), select, textarea')) continue;
      const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
      if (!texto || texto.length > 45) continue;
      const s = getComputedStyle(el);
      const renglon = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5;
      // El alto del texto solo, sin el `?` que pueda ir al lado.
      const r = document.createRange();
      const nodos = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
      r.setStartBefore(nodos[0]); r.setEndAfter(nodos.at(-1));
      const renglones = new Set([...r.getClientRects()].map((c) => Math.round(c.top))).size;
      if (renglones > 1 || r.getBoundingClientRect().height > renglon * 1.7) {
        problemas.push(`nombre partido en ${Math.max(2, renglones)} renglones: "${texto}"`);
      }
    }

    // 3. Bordes izquierdos que casi calzan, entre campos de filas distintas.
    const casi = new Set();
    for (const a of campos) {
      for (const b of campos) {
        if (a === b) continue;
        const ra = caja.get(a), rb = caja.get(b);
        if (rb.top < ra.bottom) continue;                    // b tiene que ir más abajo
        if (rb.top - ra.bottom > 220) continue;              // y cerca
        const d = Math.abs(ra.left - rb.left);
        if (d < 2 || d > 12) continue;
        const llave = `${Math.round(Math.min(ra.left, rb.left))}-${Math.round(Math.max(ra.left, rb.left))}`;
        if (casi.has(llave)) continue;
        casi.add(llave);
        problemas.push(`bordes que casi calzan (${Math.round(d)}px): "${nombreDe(a)}" parte en ${Math.round(ra.left)} y "${nombreDe(b)}" en ${Math.round(rb.left)}`);
      }
    }
    return problemas;
  });
}
