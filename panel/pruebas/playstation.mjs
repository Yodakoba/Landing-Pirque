/**
 * **La regla PlayStation, mirada en pantalla** (2026-11-12). Se usa dentro
 * de cualquier revisión con Playwright, en cada ancho:
 *
 *   import { revisarPlayStation } from './pruebas/playstation.mjs';
 *   const problemas = await revisarPlayStation(page);  // [] si está todo bien
 *
 * Revisa lo que se ve en ese momento:
 * - **letra bajo 13px** en un texto visible (salvo lo oculto a la vista);
 * - **botones bajo 34px de alto** —lo que se aprieta mide para el dedo—;
 * - **la página corrida de lado** (más ancha que la pantalla).
 *
 * No mira el color ni el contraste: eso sigue siendo del ojo.
 */
export async function revisarPlayStation(page) {
  return page.evaluate(() => {
    const problemas = [];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
        && !el.closest('[aria-hidden="true"], .sr-only');
    };
    const nombre = (el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);

    const vistos = new Set();
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      const texto = nombre(el);
      if (px < 13 && !vistos.has(texto)) { vistos.add(texto); problemas.push(`letra de ${px}px: "${texto}"`); }
    }
    for (const el of document.querySelectorAll('button, a.boton, [role="button"]')) {
      if (!visible(el)) continue;
      const alto = el.getBoundingClientRect().height;
      if (alto < 34) problemas.push(`botón de ${Math.round(alto)}px de alto: "${nombre(el)}"`);
    }
    const { scrollWidth, clientWidth } = document.documentElement;
    if (scrollWidth > clientWidth) problemas.push(`la página se corre de lado: ${scrollWidth}px en ${clientWidth}px`);
    return problemas;
  });
}
