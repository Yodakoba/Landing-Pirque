/**
 * **Las capturas de las misiones de la ayuda** (2026-11-12). Ver
 * `src/lib/misiones.ts`.
 *
 * Abre el panel con cada rol, hace los clics de cada escena, saca la foto a
 * `public/ayuda/<escena>.jpg` y **mide dónde quedó cada punto** —el borde
 * izquierdo del botón o texto real, a media altura— en `public/ayuda/puntos.json`, en % de la foto. Los
 * localizadores van en el mismo orden que los textos de `misiones.ts`, y la
 * prueba de lógica fija que calcen.
 *
 * **Lo corriente es no llamarlo directo**: `pruebas/ejemplo/capturas.sh`
 * arma el panel con la planilla de ejemplo, el reloj fijo y las sesiones, y
 * lo corre. A mano, se corre contra un panel levantado **con datos de
 * ejemplo** (nunca con clientes de verdad: las fotos quedan en el repo) y
 * con una sesión por rol:
 *
 *   AYUDA_URL=http://localhost:3000 AYUDA_SESIONES=sesiones.json \
 *     node pruebas/capturas-ayuda.mjs [escena…]
 *
 * `sesiones.json` es `{ "vendedor": "<cookie de sesión>", … }`, firmadas con
 * `firmarSesion()` y el mismo `SESION_SECRETO` del panel levantado.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL_PANEL = process.env.AYUDA_URL ?? 'http://localhost:3000';
const SESIONES = JSON.parse(fs.readFileSync(process.env.AYUDA_SESIONES ?? 'sesiones.json', 'utf8'));
const SALIDA = new URL('../public/ayuda/', import.meta.url);
const ANCHO = 400, ALTO = 760;

// Localizadores cortos.
const boton = (nombre, n = 0) => (p) => p.getByRole('button', { name: nombre }).nth(n);
/** Un botón o un enlace que se ve como botón (`.tecla`). */
const toque = (t, n = 0) => (p) => p.locator('button, a').filter({ hasText: t }).nth(n);
const texto = (t, n = 0) => (p) => p.getByText(t).nth(n);
/** Dentro de la ventana abierta. */
const enVentana = (t) => (p) => p.locator('[role=dialog] button').filter({ hasText: t }).first();
const campo = (t) => (p) => p.getByPlaceholder(t).first();
const clic = (loc) => async (p) => { await loc(p).click(); await p.waitForTimeout(900); };

/** Una reserva de la recepción: su fila, que se abre con (+). */
const filaRecepcion = (n) => (p) => p.locator('li > button[aria-expanded]').nth(n);
/** El círculo de Fudo de una fila de la recepción. */
const circuloFudo = (n) => (p) => p.locator('li > button[aria-expanded] [role=img]').nth(n);

/** La página del día: el bloque del equipo queda al medio de la foto. */
const focoDia = (p) => p.getByRole('button', { name: /Equipo y cuentas del día|Planificar equipo/ }).first();

const abrirEnvio = (nombre) => [
  // *Todas* pasó a llamarse *🔎 Buscar* el 2026-11-13.
  clic(boton(/Buscar/, 0)),
  clic(texto(nombre)),
  async (p) => { await p.waitForTimeout(1500); await boton(/Envío/)(p).click(); await p.waitForTimeout(900); }
];

/** Cada escena: con qué rol, dónde, qué clics, qué dejar a la vista y sus puntos. */
const ESCENAS = {
  // Más alta desde el 2026-11-13: con el aviso fijo en su cajita, el *Llegó*
  // de la primera reserva quedaba bajo el borde de 760.
  'anf-recepcion': { rol: 'anfitrion', ruta: '/recepcion', alto: 900,
    puntos: [texto('personas llegaron'), campo(/Buscar por nombre/), boton(/Llegó/)] },
  'anf-llego': { rol: 'anfitrion', ruta: '/recepcion', pasos: [clic(boton(/Llegó/))], foco: texto(/¿Llegaron las/),
    puntos: [boton(/Sí, las/), boton('Una más'), texto(/Si es otro número/)] },
  // Desde el 2026-11-13 cada reserva es una fila: el detalle de Fudo y
  // *Avisar* se abren con su (+).
  'anf-fudo': { rol: 'anfitrion', ruta: '/recepcion', alto: 900, pasos: [clic(filaRecepcion(0))], foco: filaRecepcion(0),
    puntos: [circuloFudo(0), texto(/Por pagar · cobra/), boton(/No vino/, 0)] },
  'anf-aviso': { rol: 'anfitrion', ruta: '/recepcion', pasos: [clic(filaRecepcion(0)), clic(boton(/Avisar al jefe/))], foco: texto(/Qué le avisas/),
    puntos: [campo(/Quieren cambiar/), boton('Avisar', 0), boton('Volver', 0)] },

  'ven-calendario': { rol: 'vendedor', ruta: '/', alto: 1000,
    puntos: [toque(/Cotizar una reserva/), texto('personas', 0), (p) => p.locator('main a, main button').filter({ hasText: /^\W*Reservas$/ }).first()] },
  'ven-cotizar': { rol: 'vendedor', ruta: '/presupuestos', pasos: [clic(boton('+ Cotizar'))],
    puntos: [texto('Nueva cotización'), campo(/Buscar cliente/), boton(/Cliente nuevo/), boton(/Ir al paso 2/)] },
  'ven-envio': { rol: 'vendedor', ruta: '/presupuestos', pasos: abrirEnvio('Andrés Pino'), alto: 900, foco: texto(/✓ Enviada/),
    puntos: [texto(/✓ Enviada/), texto(/● Anticipo/), boton(/Crear alternativa/)] },
  'ven-resumen': { rol: 'vendedor', ruta: '/vendedores', alto: 900, foco: texto(/^(Te|Le) toca/),
    puntos: [texto(/^(Te|Le) toca/), texto(/^Falta\??$/), toque(/Viene/)] },

  // El foco va en el bloque del equipo (2026-11-13): desde que muestra a la
  // gente y la propina, centrar *Cómo viene el pago* dejaba *Agregar reserva*
  // y la primera reserva bajo el borde.
  'enc-dia': { rol: 'encargado', ruta: '/dia/2026-11-12', alto: 1000, foco: focoDia,
    puntos: [texto(/Qué preparar/i), texto(/Cómo viene el pago/i), boton(/Agregar reserva/), texto('Familia Soto')] },
  'enc-turnos': { rol: 'encargado', ruta: '/turnos', alto: 900, foco: texto(/días por cerrar/),
    puntos: [texto(/días por cerrar/), boton(/11 de noviembre · /), boton(/Mes siguiente/)] },
  'enc-cerrar': { rol: 'encargado', ruta: '/turnos', pasos: [clic(boton(/11 de noviembre · /))], alto: 900,
    puntos: [enVentana(/Trabajadores/), enVentana(/^\W*Vino$/), enVentana(/Agregar/)] },
  'enc-recepcion': { rol: 'encargado', ruta: '/recepcion', pasos: [clic(filaRecepcion(0))], foco: texto(/Por pagar · cobra/),
    puntos: [texto(/Por pagar · cobra/), boton(/Llegó/), boton(/Avisar al jefe/)] },

  'ope-dia': { rol: 'gerente', ruta: '/dia/2026-11-12', alto: 1000, foco: focoDia,
    puntos: [texto(/Qué preparar/i), texto(/Cómo viene el pago/i), boton(/Agregar reserva/), texto('Familia Soto')] },
  'ope-turnos': { rol: 'gerente', ruta: '/turnos', alto: 900, foco: texto(/días por cerrar/),
    puntos: [texto(/días por cerrar/), boton(/11 de noviembre · /), boton(/Mes siguiente/)] },
  'ope-corregir': { rol: 'gerente', ruta: '/turnos', pasos: [async (p) => {
      for (const c of await p.locator('button').all()) {
        const t = (await c.innerText().catch(() => '')).replace(/\s+/g, ' ');
        if (/^S[ÁA]B ?7\D/i.test(t)) { await c.scrollIntoViewIfNeeded(); await c.click(); break; }
      }
      await p.waitForTimeout(1200);
    }],
    // *✓ Día cerrado por <quien>, <cuándo>*: desde que hay cuentas con nombre
    // ya no dice "por encargado" (2026-11-13).
    puntos: [(p) => p.locator('[role=dialog]').getByText(/Día cerrado/).first(),
      enVentana(/Corregir este día/), enVentana(/Trabajadores/)], alto: 820 },
  'ope-informe': { rol: 'gerente', ruta: '/informe', foco: texto(/Por semana/),
    alto: 900, puntos: [boton(/Por semana/), texto(/turnos? sin cerrar/), boton(/Trabajadores/)] },

  ...Object.fromEntries(['pag', 'ger'].flatMap((pre) => {
    const rol = pre === 'pag' ? 'pagos' : 'gerencia';
    return [
      [`${pre}-informe`, { rol, ruta: '/informe', alto: 960, foco: boton(/Solo sueldos/),
        puntos: [boton(/Por semana/), boton(/Solo sueldos/), texto(/Transferencia masiva/i)] }],
      [`${pre}-pagar`, { rol, ruta: '/informe', pasos: [clic(texto('sin pagar'))], foco: boton(/Sueldo/),
        puntos: [boton(/Sueldo/), boton(/Propina/), texto(/Suma: /)] }],
      [`${pre}-cobros`, { rol, ruta: '/presupuestos', pasos: abrirEnvio('Andrés Pino'), alto: 900, foco: texto('Pagos del cliente'),
        puntos: [texto(/El pago/), boton(/Anticipo recibido/), texto(/Anticipo 30%/)] }],
      [`${pre}-vendedores`, { rol, ruta: '/vendedores', alto: 900, foco: texto(/^(Te|Le) toca/),
        puntos: [boton(/Vendedores/), texto(/^(Te|Le) toca/), texto(/^Falta\??$/)] }]
    ];
  })),

  'adm-cuentas': { rol: 'admin', ruta: '/usuarios', alto: 900,
    puntos: [boton(/Ver como/), (p) => p.locator('select').first(), boton(/Vista gerencia/)] },
  'adm-config': { rol: 'admin', ruta: '/config', alto: 1000, foco: toque(/^Mantención$/),
    puntos: [toque(/^Reservas del sitio$/), texto(/Días que se abre/), toque(/^Mantención$/)] },
  'adm-bitacora': { rol: 'admin', ruta: '/bitacora',
    puntos: [texto(/^Cuándo$/i), texto(/^Quién$/i), texto(/^Acción$/i)] },
  'adm-vercomo': { rol: 'admin', ruta: '/usuarios', pasos: [clic(boton(/Ver como/))],
    puntos: [texto('Gerencia general'), texto('Encargado de operaciones'), texto(/Es para revisar/)] }
};

const pedidas = process.argv.slice(2);
const puntos = fs.existsSync(new URL('puntos.json', SALIDA)) ? JSON.parse(fs.readFileSync(new URL('puntos.json', SALIDA))) : {};
fs.mkdirSync(SALIDA, { recursive: true });
const b = await chromium.launch();
let fallos = 0;
for (const [nombre, e] of Object.entries(ESCENAS)) {
  if (pedidas.length && !pedidas.includes(nombre)) continue;
  const alto = e.alto ?? ALTO;
  const ctx = await b.newContext({ viewport: { width: ANCHO, height: alto }, deviceScaleFactor: 1.5,
    timezoneId: 'America/Santiago', locale: 'es-CL' });
  await ctx.addCookies([{ name: 'sesion', value: SESIONES[e.rol], url: URL_PANEL }]);
  // Sin la tira de bienvenida: no es parte de la pantalla que se explica.
  await ctx.addInitScript((r) => { try { localStorage.setItem('brasas-recorrido-' + r, 'listo'); } catch {} }, e.rol);
  // El reloj del navegador, a la misma hora que el servidor de ejemplo.
  if (process.env.AYUDA_RELOJ) await ctx.clock.install({ time: new Date(process.env.AYUDA_RELOJ) });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  try {
    await p.goto(URL_PANEL + e.ruta, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(1200);
    for (const paso of e.pasos ?? []) await paso(p);
    if (e.foco) { await e.foco(p).first().evaluate((x) => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(500); }
    const medidos = [];
    for (const [i, loc] of e.puntos.entries()) {
      const caja = await loc(p).first().boundingBox();
      if (!caja || caja.y + caja.height / 2 < 0 || caja.y + caja.height / 2 > alto) {
        throw new Error(`el punto ${i + 1} no quedó a la vista`);
      }
      // **En el borde izquierdo, no al centro**: un número al centro tapaba
      // justo lo que explica ("Sí, las 4"). Nunca pegado al borde de la foto.
      medidos.push({ x: +Math.max(5, Math.min(95, (caja.x / ANCHO) * 100)).toFixed(1),
                     y: +(((caja.y + caja.height / 2) / alto) * 100).toFixed(1) });
    }
    await p.screenshot({ path: new URL(`${nombre}.jpg`, SALIDA).pathname, type: 'jpeg', quality: 72 });
    puntos[nombre] = { ancho: ANCHO, alto, puntos: medidos };
    console.log(`  ok     ${nombre}`);
  } catch (err) {
    fallos++;
    console.log(`  FALLA  ${nombre}: ${err.message.split('\n')[0]}`);
    await p.screenshot({ path: path.join(os.tmpdir(), `falla-${nombre}.png`) }).catch(() => {});
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(new URL('puntos.json', SALIDA), JSON.stringify(Object.fromEntries(Object.entries(puntos).sort()), null, 1) + '\n');
console.log(fallos ? `\n${fallos} escenas fallaron (la foto de la pantalla quedó en ${path.join(os.tmpdir(), 'falla-<escena>.png')})` : '\nTodas las escenas listas.');
process.exit(fallos ? 1 : 0);
