/**
 * Hablarle al Admin API de Shopify. Solo lectura de pedidos.
 *
 * El token vive en SHOPIFY_ADMIN_TOKEN, una variable de entorno del
 * servidor. **Nunca en el repositorio ni en el navegador**: un token de
 * Admin API da acceso a pedidos y clientes, al revés del token de Storefront
 * que el sitio lleva en un archivo público porque solo lee catálogo.
 */
import type { PedidoShopify } from './shopify.ts';

/** La versión estable al 2026-10-20, soportada hasta octubre de 2027. */
export const VERSION_ADMIN = '2026-10';

/**
 * El dominio de la tienda, limpio.
 *
 * Se le saca el `https://`, una barra final y los espacios: son tres formas
 * de copiarlo mal que dan errores distintos y ninguno dice qué pasó. Pegar
 * `https://tienda.myshopify.com/` desde la barra del navegador es lo más
 * natural del mundo.
 */
export function dominio(): string {
  return String(process.env.SHOPIFY_DOMINIO ?? '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

/**
 * El token, sin espacios.
 *
 * Un salto de línea al final al copiar y pegar es invisible y hace que
 * Shopify responda **401, como si el token estuviera mal**. Es de los
 * errores más caros de diagnosticar porque el mensaje acusa a la
 * credencial, que es justo lo que uno ya revisó tres veces.
 */
export function token(): string {
  return String(process.env.SHOPIFY_ADMIN_TOKEN ?? '').trim();
}

export function configurado(): boolean {
  return !!(dominio() && token());
}

/**
 * Los pedidos actualizados desde un momento dado.
 *
 * Se piden por `updated_at_min` y no por `created_at_min`: hace falta
 * enterarse de un pedido viejo que acaba de pagarse o cancelarse, no solo
 * de los nuevos.
 *
 * **Sin filtro de `financial_status`**, a propósito: hacen falta los
 * pendientes, que son los que pagan en el local. El estado se decide
 * después, en estadoDe(), que es un solo lugar y no una condición escondida
 * en una URL.
 */
export async function pedidosDesde(desde: Date): Promise<PedidoShopify[]> {
  const tienda = dominio();
  const clave = token();
  if (!tienda || !clave) {
    throw new Error('Faltan SHOPIFY_DOMINIO o SHOPIFY_ADMIN_TOKEN en el entorno.');
  }
  const version = (process.env.SHOPIFY_VERSION || VERSION_ADMIN).trim();

  const url = `https://${tienda}/admin/api/${version}/orders.json` +
    `?status=any&limit=250&updated_at_min=${encodeURIComponent(desde.toISOString())}`;

  const r = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': clave },
    cache: 'no-store'
  });
  if (!r.ok) {
    // El cuerpo se recorta: puede traer detalles de la tienda, y este
    // mensaje puede terminar en una respuesta.
    const cuerpo = (await r.text()).slice(0, 200);
    // Un 401 acusa a la credencial, que es justo lo que uno ya revisó. Se
    // nombra la tienda y la versión: si el token es de OTRA tienda el
    // error es exactamente este, y sin ese dato no hay cómo saberlo.
    if (r.status === 401) {
      throw new Error(
        `Shopify rechazó el token de Admin API (401) para ${tienda}, API ${version}. ` +
        'Revisa que SHOPIFY_ADMIN_TOKEN empiece en "shpat_", que corresponda a ESA ' +
        'tienda, y que la app siga instalada. ' + cuerpo
      );
    }
    throw new Error(`Shopify respondió ${r.status}: ${cuerpo}`);
  }
  const d = await r.json();
  return (d.orders ?? []) as PedidoShopify[];
}
