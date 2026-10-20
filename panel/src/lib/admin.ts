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

export function configurado(): boolean {
  return !!(process.env.SHOPIFY_DOMINIO && process.env.SHOPIFY_ADMIN_TOKEN);
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
  const dominio = process.env.SHOPIFY_DOMINIO;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!dominio || !token) {
    throw new Error('Faltan SHOPIFY_DOMINIO o SHOPIFY_ADMIN_TOKEN en el entorno.');
  }
  const version = process.env.SHOPIFY_VERSION || VERSION_ADMIN;

  const url = `https://${dominio}/admin/api/${version}/orders.json` +
    `?status=any&limit=250&updated_at_min=${encodeURIComponent(desde.toISOString())}`;

  const r = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': token },
    cache: 'no-store'
  });
  if (!r.ok) {
    // El cuerpo se recorta: puede traer el dominio y detalles de la tienda,
    // y este mensaje puede terminar en una respuesta.
    throw new Error(`Shopify respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  const d = await r.json();
  return (d.orders ?? []) as PedidoShopify[];
}
