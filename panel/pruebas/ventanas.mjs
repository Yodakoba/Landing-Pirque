/**
 * **Las ventanas y las fichas del panel, medidas una por una** (2026-11-21).
 *
 *   npm run ventanas              # todas
 *   npm run ventanas -- v-cotizar # solo las que parten así
 *
 * Abre cada pantalla, cada ficha y cada ventana del panel de ejemplo en un
 * notebook —**1280×650**, lo que queda con la barra del navegador— y mira
 * dos reglas:
 *
 * - ***una tarjeta abierta cabe en una pantalla***: la ventana, o la ficha
 *   abierta, entra entera sin tener que bajar;
 * - ***los formularios van alineados***: `revisarAlineacion()` no encuentra
 *   saltos, nombres partidos ni bordes que casi calzan.
 *
 * **Por qué existe.** El cliente fue encontrando una por una las ventanas
 * que no cabían o que tenían los campos corridos, y preguntó con razón:
 * *"¿por qué tengo que agregar yo todas las revisiones en los pop-ups… si ya
 * debería ser regla? ¿Qué habrá que hacer para reforzar esto, para que
 * realmente siempre tengas presente esta regla?"*. Las dos reglas estaban
 * escritas, pero se aplicaban a lo que se iba tocando y **dependían de que
 * alguien se acordara**. En este panel las reglas que se cumplen siempre son
 * las que se miden (`letra-chica`, `lecturas`): ésta es la medida de esas
 * dos.
 *
 * **Lo que todavía no cabe está anotado en `NO_CABEN`**, con su alto: es el
 * punto de partida, igual que `HABIA` en `letra-chica`. **Solo puede bajar.**
 * Si una ventana anotada crece, o una que cabía deja de caber, o aparece un
 * campo corrido, falla. Si una anotada ya cabe, pide sacarla de la lista.
 *
 * **Una ventana nueva se agrega a `ESCENAS`** en el mismo PR que la crea. Si
 * no está en la lista no se mide, y es justo lo que esto viene a evitar.
 *
 * Necesita el panel de ejemplo andando: `npm run ventanas` lo levanta
 * (`pruebas/ejemplo/capturas.sh --ventanas`).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { revisarAlineacion } from './alineacion.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL_PANEL = process.env.AYUDA_URL ?? 'http://localhost:3125';
const SESIONES = JSON.parse(fs.readFileSync(process.env.AYUDA_SESIONES ?? 'sesiones.json', 'utf8'));
const ANCHO = 1280, ALTO = 650;

/**
 * Lo que hoy no cabe en 1280×650, con cuánto mide. **Solo puede bajar.**
 * (La ventana de cotizar y las fichas largas son las que quedan.)
 */
export const NO_CABEN = {
  'ficha-cliente': 692,
  'ficha-producto': 788,
  'ficha-vendedor': 740,
  'v-reserva-nueva': 918,
  'v-fecha-nueva': 625,
  'v-equipo-del-dia': 1280,
  'v-equipo-del-dia-con-ajuste': 1506,
  'v-equipo-del-dia-reservas': 1178,
  'v-dia-cerrado': 1100,
  'v-ficha-trabajador': 619,
  'v-trabajador-nuevo': 613,
  'v-propina': 1014,
  'v-cotizar-2-evento': 815,
  'v-cotizar-3-productos': 1425,
  'v-cotizar-4-envio': 1978,
  'v-cotizar-5-contrato': 1573,
  'v-pago': 629,
  'v-vendedor-nuevo': 878,
  'v-trato': 987,
  'v-ver-como': 911,
  'v-comentar': 670,
};

/** Hallazgos de alineación que se aceptan, con el porqué. Hoy, ninguno. */
export const ALINEACION_ACEPTADA = {
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: ANCHO, height: ALTO } });
await ctx.addCookies([{ name: 'sesion', value: SESIONES.admin, url: URL_PANEL }]);
const p = await ctx.newPage();
p.setDefaultTimeout(8000);

const ir = async (ruta) => { await p.goto(URL_PANEL + ruta, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(1100); };
const clic = async (loc, n = 0) => { await loc.nth(n).click(); await p.waitForTimeout(800); };
const boton = (name, exact = false) => p.getByRole('button', { name, exact });
const ventana = () => p.locator('[role=dialog]').last();
const abrirPrimera = () => clic(p.locator('main button[aria-expanded="false"]'));
const diaDe = async (ruta, dia) => {
  await ir(ruta);
  await clic(boton(dia), (await boton(dia).count()) - 1);
  await p.waitForSelector('[role=dialog]'); await p.waitForTimeout(500);
};
const lineaDelDia = () => clic(ventana().locator('button[aria-expanded="false"]'));
const cotizacion = async (paso) => {
  await ir('/presupuestos'); await clic(boton(/📋 Lista/)); await clic(p.getByText('Andrés Pino'));
  await p.waitForTimeout(1400);
  if (paso) await clic(ventana().getByRole('button', { name: paso }));
};
const personaDelInforme = async () => {
  await ir('/informe'); await clic(boton(/Por mes/)); await p.waitForTimeout(1300);
  await clic(p.locator('main button[aria-expanded="false"]'), 1);
};
const vendedor = async () => { await ir('/vendedores'); await clic(boton(/^Daniela/)); };

/**
 * Cada escena deja en pantalla una ficha abierta (`ficha-…`) o una ventana
 * (`v-…`). El nombre dice qué es; el orden, por dónde se llega.
 */
export const ESCENAS = {
  // Fichas que se abren dentro de su lista.
  'ficha-trabajador': async () => { await ir('/equipo'); await abrirPrimera(); },
  'ficha-colaborador': async () => { await ir('/extras'); await clic(boton(/Paz Ortiz/)); },
  'ficha-cliente': async () => { await ir('/clientes'); await abrirPrimera(); },
  'ficha-producto': async () => { await ir('/menus'); await abrirPrimera(); },
  'ficha-vendedor': vendedor,
  'ficha-recepcion': async () => { await ir('/recepcion'); await clic(p.locator('li > button[aria-expanded]')); },
  'ficha-reserva-del-dia': async () => { await ir('/dia/2026-11-14'); await abrirPrimera(); },
  'ficha-persona-del-informe': personaDelInforme,
  'ficha-cliente-nuevo': async () => { await ir('/clientes'); await clic(boton(/Nuevo cliente/)); },
  // Reservas y días.
  'v-reserva-nueva': async () => { await ir('/'); await clic(boton('Agregar reserva')); },
  'v-reserva-editar': async () => { await ir('/dia/2026-11-14'); await abrirPrimera(); await clic(boton(/^Editar/)); },
  'v-fecha-nueva': async () => { await ir('/'); await clic(boton('Agregar fecha')); },
  'v-fecha-editar': async () => { await ir('/'); await clic(boton(/Editar/)); },
  // El equipo y los extras de un día.
  'v-equipo-del-dia': async () => { await diaDe('/turnos', /11 de noviembre/); await lineaDelDia(); },
  'v-equipo-del-dia-con-ajuste': async () => {
    await diaDe('/turnos', /11 de noviembre/); await lineaDelDia();
    await clic(ventana().getByRole('button', { name: /Descontar/ }));
  },
  'v-equipo-del-dia-reservas': async () => { await diaDe('/turnos', /11 de noviembre/); await clic(ventana().locator('button', { hasText: 'Reservas' })); },
  'v-dia-cerrado': async () => { await diaDe('/turnos', /(^|\D)7 de noviembre/); },
  'v-ficha-trabajador': async () => { await diaDe('/turnos', /11 de noviembre/); await lineaDelDia(); await clic(ventana().getByRole('button', { name: 'Ficha' })); },
  'v-trabajador-nuevo': async () => { await diaDe('/turnos', /11 de noviembre/); await clic(ventana().getByRole('button', { name: /Nuevo trabajador/ })); },
  'v-propina': async () => { await ir('/dia/2026-11-14'); await clic(boton(/propina/i)); },
  'v-extras-del-dia': async () => { await diaDe('/extras', /14 de noviembre/); await lineaDelDia(); },
  'v-ficha-colaborador': async () => { await diaDe('/extras', /14 de noviembre/); await lineaDelDia(); await clic(ventana().getByRole('button', { name: 'Ficha' })); },
  'v-puestos': async () => { await ir('/equipo'); await clic(p.locator('main button', { hasText: /puestos/i })); },
  // Cotizaciones.
  'v-cotizar-1-cliente': async () => { await ir('/presupuestos'); await clic(boton('+ Cotizar', true)); },
  'v-cotizar-1-cliente-nuevo': async () => {
    await ir('/presupuestos'); await clic(boton('+ Cotizar', true));
    await clic(ventana().getByRole('button', { name: /Cliente nuevo/ }));
  },
  'v-cotizar-2-evento': () => cotizacion(/Evento/),
  'v-cotizar-3-productos': () => cotizacion(/Productos/),
  'v-cotizar-4-envio': () => cotizacion(/Envío/),
  'v-cotizar-5-contrato': () => cotizacion(/Contrato/),
  // Informe.
  'v-pago': async () => { await personaDelInforme(); await clic(boton(/Pago parcial/)); },
  'v-ajuste-del-informe': async () => { await personaDelInforme(); await clic(boton(/Descontar/)); },
  // Vendedores.
  'v-vendedor-nuevo': async () => { await ir('/vendedores'); await clic(boton(/Agregar vendedor/)); },
  'v-trato': async () => { await vendedor(); await clic(boton(/Cambiar el trato/)); },
  'v-documento-del-vendedor': async () => { await vendedor(); await clic(boton('Cambiar', true), 0); },
  'v-transferencia-del-vendedor': async () => { await vendedor(); await clic(boton('Cambiar', true), 1); },
  // Administración.
  'v-clave': async () => { await ir('/usuarios'); await clic(boton('Cambiar', true)); },
  'v-ver-como': async () => { await ir('/usuarios'); await clic(boton(/Ver como/)); },
  'v-base-en-cero': async () => { await ir('/config'); await clic(boton(/Ver qué se borra/)); },
  'v-comentar': async () => { await ir('/'); await clic(boton(/Coméntame/)); }
};

/** Cuánto mide lo que quedó abierto, y si entra en la pantalla. */
const medir = () => p.evaluate((alto) => {
  const v = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  if (v) {
    const caja = v.firstElementChild?.getBoundingClientRect();
    return { que: 'ventana', mide: Math.round(caja?.height ?? 0), cabe: v.scrollHeight <= v.clientHeight + 1 };
  }
  // Una ficha abierta: la tarjeta que contiene el botón abierto.
  const abierta = [...document.querySelectorAll('main [aria-expanded="true"]')].at(-1);
  const tarjeta = abierta?.closest('li, article') ?? abierta?.parentElement?.parentElement;
  if (!tarjeta) return { que: 'nada', mide: 0, cabe: true };
  const r = tarjeta.getBoundingClientRect();
  return { que: 'ficha', mide: Math.round(r.height), cabe: r.height <= alto };
}, ALTO);

const pedidas = process.argv.slice(2);
const fallas = [], bajaron = [], sinAbrir = [];
const medidas = {};
for (const [nombre, abrir] of Object.entries(ESCENAS)) {
  if (pedidas.length && !pedidas.some((x) => nombre.startsWith(x))) continue;
  try {
    await abrir();
  } catch (e) {
    sinAbrir.push(nombre);
    console.log(`  ?      ${nombre}: no se pudo abrir (${String(e.message).split('\n')[0].slice(0, 90)})`);
    continue;
  }
  const m = await medir();
  const corridos = (await revisarAlineacion(p)).filter((x) => !(ALINEACION_ACEPTADA[nombre] ?? []).some((a) => x.includes(a)));
  medidas[nombre] = m.mide;
  const anotada = NO_CABEN[nombre];
  const problemas = [];
  if (!m.cabe && anotada === undefined) problemas.push(`no cabe en ${ANCHO}×${ALTO}: mide ${m.mide}px`);
  if (!m.cabe && anotada !== undefined && m.mide > anotada + 4) problemas.push(`creció: mide ${m.mide}px y estaba anotada en ${anotada}`);
  if (m.cabe && anotada !== undefined) bajaron.push(`${nombre}: ya cabe (${m.mide}px). Sácala de NO_CABEN.`);
  if (!m.cabe && anotada !== undefined && m.mide < anotada - 4) bajaron.push(`${nombre}: bajó de ${anotada} a ${m.mide}px. Anótalo en NO_CABEN.`);
  for (const c of corridos) problemas.push(c);
  const marca = problemas.length ? 'FALLA ' : !m.cabe ? 'anotada' : 'ok     ';
  console.log(`  ${marca} ${nombre}: ${m.que} de ${m.mide}px${m.cabe ? '' : ' · no cabe'}${problemas.length ? '\n           · ' + problemas.join('\n           · ') : ''}`);
  if (problemas.length) fallas.push(nombre);
}
await b.close();

if (process.env.VENTANAS_MEDIDAS) fs.writeFileSync(process.env.VENTANAS_MEDIDAS, JSON.stringify(medidas, null, 1));
if (bajaron.length) console.log('\nMejoraron:\n  ' + bajaron.join('\n  '));
if (sinAbrir.length) {
  console.log(`\nNo se pudieron abrir: ${sinAbrir.join(', ')}. Si la pantalla cambió, hay que arreglar la escena.`);
  process.exitCode = 1;
}
if (fallas.length) {
  console.log(`\n${fallas.length} con fallas: ${fallas.join(', ')}.`);
  process.exitCode = 1;
} else if (!sinAbrir.length) {
  console.log('\nTodo bien: lo que cabía sigue cabiendo y los campos están alineados.');
}
