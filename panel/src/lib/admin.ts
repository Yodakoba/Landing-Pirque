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

/**
 * **Las credenciales de una app del Dev Dashboard** (2026-11-21).
 *
 * Desde el 1 de enero de 2026 Shopify ya no deja crear apps propias desde
 * el admin, que es como nació la del panel en la tienda de desarrollo (y
 * esa sigue andando con su token fijo `shpat_`). La de la tienda real se
 * creó en el Dev Dashboard, y esas apps no entregan un token fijo: entregan
 * un Client ID y un Client secret, y con ellos se pide un token que dura 24
 * horas (`tokenDeAcceso()`).
 *
 * **Si están las dos, mandan sobre `SHOPIFY_ADMIN_TOKEN`**: así Production
 * pasa a la tienda real agregando estas dos y cambiando el dominio, aunque
 * el token viejo siga escrito. Preview no las tiene y sigue con el token fijo
 * de la tienda de desarrollo.
 */
export function credenciales(): { id: string; secreto: string } | null {
  const id = String(process.env.SHOPIFY_CLIENT_ID ?? '').trim();
  const secreto = String(process.env.SHOPIFY_CLIENT_SECRET ?? '').trim();
  return id && secreto ? { id, secreto } : null;
}

export function configurado(): boolean {
  return !!(dominio() && (credenciales() || token()));
}

/**
 * El token pedido con las credenciales, mientras sirve. Vive lo que vive la
 * instancia del servidor: cada instancia pide el suyo la primera vez, y una
 * pedida cuesta una llamada a Shopify, no a Google.
 */
let pedido: { tienda: string; id: string; token: string; vence: number } | null = null;

/** Se pide uno nuevo cinco minutos antes de que venza, no al vencer. */
const MARGEN_MS = 5 * 60 * 1000;

/**
 * El token con que se le habla al Admin API: el pedido con las credenciales
 * del Dev Dashboard si están, y si no, `SHOPIFY_ADMIN_TOKEN`.
 *
 * El pedido es el *client credentials grant* de Shopify: un POST con
 * formulario a `/admin/oauth/access_token` con `grant_type`, `client_id` y
 * `client_secret`, que responde `access_token` y `expires_in` (86399
 * segundos). **Solo funciona si la app y la tienda son de la misma
 * organización de Shopify**: si no, responde `shop_not_permitted`, y el
 * error lo dice.
 *
 * `ahora` y `pedir` existen para las pruebas.
 */
export async function tokenDeAcceso(ahora = Date.now(), pedir: typeof fetch = fetch): Promise<string> {
  const c = credenciales();
  if (!c) return token();
  const tienda = dominio();
  if (pedido && pedido.tienda === tienda && pedido.id === c.id && pedido.vence > ahora) return pedido.token;

  const r = await pedir(`https://${tienda}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: c.id, client_secret: c.secreto
    }).toString(),
    cache: 'no-store'
  });
  if (!r.ok) {
    // El cuerpo se recorta, y nunca lleva el secreto: es la respuesta de
    // Shopify, no lo que se le mandó.
    const cuerpo = (await r.text()).slice(0, 200);
    const pista = /shop_not_permitted/.test(cuerpo)
      ? ' La app y la tienda tienen que ser de la misma organización de Shopify.'
      : ' Revisa SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET, que la app esté instalada en ESA tienda y que SHOPIFY_DOMINIO sea su dominio .myshopify.com.';
    throw new Error(`Shopify no entregó el token de acceso (${r.status}) para ${tienda}.${pista} ${cuerpo}`);
  }
  const d = await r.json() as { access_token?: unknown; expires_in?: unknown };
  const nuevo = String(d.access_token ?? '').trim();
  if (!nuevo) throw new Error(`Shopify respondió sin token de acceso para ${tienda}.`);
  const dura = Number(d.expires_in) > 0 ? Number(d.expires_in) * 1000 : 24 * 60 * 60 * 1000;
  pedido = { tienda, id: c.id, token: nuevo, vence: ahora + Math.max(dura - MARGEN_MS, 60 * 1000) };
  return nuevo;
}

/** Para las pruebas: olvida el token pedido. */
export function olvidarToken(): void {
  pedido = null;
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
  if (!configurado()) {
    throw new Error('Faltan SHOPIFY_DOMINIO y SHOPIFY_ADMIN_TOKEN (o SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET) en el entorno.');
  }
  const clave = await tokenDeAcceso();
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
      // Un token pedido que Shopify rechaza no se vuelve a usar: la próxima
      // llamada pide otro.
      if (credenciales()) olvidarToken();
      throw new Error(
        `Shopify rechazó el token de Admin API (401) para ${tienda}, API ${version}. ` +
        (credenciales()
          ? 'Revisa que la app del Dev Dashboard siga instalada en ESA tienda y tenga read_orders. '
          : 'Revisa que SHOPIFY_ADMIN_TOKEN empiece en "shpat_", que corresponda a ESA tienda, y que la app siga instalada. ') +
        cuerpo
      );
    }
    throw new Error(`Shopify respondió ${r.status}: ${cuerpo}`);
  }
  const d = await r.json();
  return (d.orders ?? []) as PedidoShopify[];
}
