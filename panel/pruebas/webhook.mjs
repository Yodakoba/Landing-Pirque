/**
 * **El webhook de Shopify, de punta a punta** (2026-11-21): llama la ruta
 * `/api/shopify/webhook` contra el Google falso de `pruebas/lecturas/`, con
 * pedidos firmados como los firma Shopify.
 *
 * Lo que fija:
 * - sin firma (o con otra) responde 401 y no toca la planilla;
 * - un pedido sin `_booking_date` —como los del sitio viejo, que venden la
 *   fecha en la variante— se descarta **sin gastar una sola lectura** y deja
 *   una línea `descartado` con el número del pedido, sin datos del cliente;
 * - un pedido del sitio nuevo, con su fecha, sí se anota.
 *
 *   npm run webhook
 */
import { createHmac } from 'node:crypto';

const API = new URL('../src/app/api/', import.meta.url);
const lecturas = (globalThis.__glecturas ??= []);
const escrituras = (globalThis.__gescrituras ??= []);
let fallos = 0;
const ok = (c, txt) => { console.log(`  ${c ? 'ok   ' : 'FALLA'}  ${txt}`); if (!c) fallos++; };

process.env.SHOPIFY_WEBHOOK_SECRET = 'secreto-de-prueba';
delete process.env.GOOGLE_CALENDAR_ID;
const { POST } = await import(new URL('shopify/webhook/route.ts', API).href);

const firmar = (cuerpo, secreto = process.env.SHOPIFY_WEBHOOK_SECRET) =>
  createHmac('sha256', secreto).update(cuerpo, 'utf8').digest('base64');
const lineas = [];
const log = console.log;
async function mandar(pedido, { firma, topic = 'orders/create' } = {}) {
  const cuerpo = JSON.stringify(pedido);
  const cab = { 'content-type': 'application/json', 'x-shopify-topic': topic };
  if (firma !== null) cab['x-shopify-hmac-sha256'] = firma ?? firmar(cuerpo);
  lineas.length = 0;
  console.log = (...a) => lineas.push(a.join(' '));
  console.warn = (...a) => lineas.push(a.join(' '));
  try {
    return await POST(new Request('http://localhost/api/shopify/webhook', { method: 'POST', headers: cab, body: cuerpo }));
  } finally {
    console.log = log;
  }
}

const viejo = {
  id: 5001, name: '#1201', email: 'cliente@ejemplo.cl', financial_status: 'paid',
  customer: { first_name: 'Ana', last_name: 'Pérez' },
  line_items: [{ title: 'Menú Tradiciones', variant_title: 'Sábado 28 de Noviembre / Adultos', quantity: 2, properties: [] }]
};

lecturas.length = 0; escrituras.length = 0;
let r = await mandar(viejo, { firma: null });
ok(r.status === 401 && lecturas.length === 0 && escrituras.length === 0, 'sin firma: 401, sin tocar la planilla');

r = await mandar(viejo, { firma: firmar(JSON.stringify(viejo), 'otro-secreto') });
ok(r.status === 401 && lecturas.length === 0, 'firmado con otro secreto (otra tienda): 401');

lecturas.length = 0; escrituras.length = 0;
r = await mandar(viejo);
const j = await r.json();
ok(r.status === 200 && j.ignorado === 'sin fecha de reserva', 'un pedido del sitio viejo: 200 y descartado');
ok(lecturas.length === 0 && escrituras.length === 0, `descartarlo no gasta lecturas ni escribe (gastó ${lecturas.length})`);
const linea = lineas.find((l) => l.includes('descartado')) ?? '';
ok(linea.includes('orders/create') && linea.includes('#1201'), `deja la línea en los registros: "${linea}"`);
ok(!/Ana|Pérez|cliente@/.test(linea), 'la línea no lleva datos del cliente');

const nuevo = {
  id: 5002, name: '#1202', financial_status: 'paid', total_price: '88000.00',
  line_items: [{ title: 'Tradiciones', variant_title: 'Pago directo', quantity: 2,
    properties: [{ name: '_booking_date', value: '2026-11-28' }, { name: '_cowlendar_date', value: '2026-11-28' }] }]
};
lecturas.length = 0; escrituras.length = 0;
r = await mandar(nuevo);
ok(r.status === 200 && lecturas.length > 0 && escrituras.some((e) => e.includes('Reservas')),
   `un pedido del sitio nuevo, con su fecha, se anota en Reservas (${r.status}, ${lecturas.length} lecturas)`);

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: el webhook acepta, descarta y anota como debe.');
process.exit(fallos ? 1 : 0);
