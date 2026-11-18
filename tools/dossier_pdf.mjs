// El PDF del dossier para empresas (2026-11-18).
//
//   node tools/dossier_pdf.mjs            escribe dossier.pdf y socios.pdf en las tres carpetas
//
// Socios comerciales (2026-11-18) usa las mismas láminas más dos propias:
// comisiones con los segmentos, y por qué sumarte con cómo funciona.
//
// **El contenido sale de la página, no de este archivo.** El script abre
// dossier.html ya generado en cada idioma, lee lo que dice —textos, precios
// de precios.json ya escritos por traducir.py, fotos— y lo acomoda en
// láminas horizontales de 1280×720. Así el PDF no puede decir un precio que la
// página no dice, y sale en el idioma de la página sin un diccionario aparte.
// Lo único escrito acá es el rótulo de la lámina del menú (ver ROTULOS).
//
// Al terminar anota en tools/dossier_pdf.json la huella de las tres páginas.
// `python3 tools/traducir.py --revisar` la compara: si el dossier cambió y el
// PDF no se volvió a generar, lo avisa.
//
// Necesita Node y el Playwright del entorno (no se agrega a ningún package).

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = normalize(join(fileURLToPath(import.meta.url), '..', '..'));
const IDIOMAS = [['es', ''], ['en', 'en/'], ['pt', 'pt/']];
// Qué página da qué PDF. Cada PDF vive al lado de su página, en cada idioma.
const PDFS = [['dossier.html', 'dossier.pdf'], ['landing-afiliados.html', 'socios.pdf']];
const ROTULOS = { es: 'El menú', en: 'The menu', pt: 'O cardápio' };

async function cargarPlaywright() {
  for (const ruta of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try { return await import(ruta); } catch { /* sigue con la siguiente */ }
  }
  throw new Error('No encuentro Playwright. En este entorno viene instalado; en otro, npm i -g playwright.');
}

/** La huella de una página, sin el ?v= de los assets: cambiar un CSS no cambia el PDF. */
export async function huella(ruta) {
  const html = (await readFile(join(RAIZ, ruta), 'utf8')).replace(/\?v=[0-9a-f]+/g, '');
  return createHash('sha256').update(html).digest('hex').slice(0, 16);
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

function servir() {
  return new Promise((ok) => {
    const s = createServer(async (req, res) => {
      const ruta = normalize(join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!ruta.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
      try {
        const cuerpo = await readFile(ruta);
        res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] ?? 'application/octet-stream' }).end(cuerpo);
      } catch { res.writeHead(404).end(); }
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}

/** Lo que dice la página, leído del DOM tal como lo ve un visitante. */
function leerPagina() {
  const $ = (s, d = document) => d.querySelector(s);
  const $$ = (s, d = document) => [...d.querySelectorAll(s)];
  const txt = (e) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const src = (e) => e?.src ?? '';
  const primeraFrase = (t) => (t.match(/^[^.]*\./) ?? [t])[0];
  const exp = $('#experiencias');
  const fullEcuestre = $('.fullbleed-ecuestre');
  const ext = $('#externas');
  const arriendo = $('#arriendo');
  const medida = [...document.querySelectorAll('section.fullbleed')].find((s) => !s.classList.contains('fullbleed-ecuestre'));
  const extrasSec = $('.service-card')?.closest('section');
  const wa = $('.contact-card a.btn-whatsapp');
  const cajas = (sel) => $$(sel).map((c) => ({ num: txt($('.num', c)), titulo: txt($('h3', c)), texto: txt($('p', c)) }));
  const comm = $('.comm-grid');
  const socios = comm ? {
    comision: { titulo: txt(comm.closest('.wrap').querySelector('h2')), pie: txt($('.comm-pie')),
      niveles: $$('.comm-card').map((c) => ({ pct: txt($('.comm-pct', c)), rotulo: txt($('.comm-label', c)), nota: txt($('.comm-note', c)) })) },
    segmentos: { titulo: txt($('.segments')?.closest('.wrap')?.querySelector('h2')), lista: cajas('.segment') },
    beneficios: { titulo: txt($('.benefits')?.closest('.wrap')?.querySelector('h2')),
      bajada: txt($('.benefits')?.closest('.wrap')?.querySelector('.lede')), lista: cajas('.benefit') },
    pasos: { titulo: txt($('.steps')?.closest('.wrap')?.querySelector('h2')), lista: cajas('.step') },
  } : null;
  return {
    lang: document.documentElement.lang,
    socios,
    portada: { titulo: txt($('.hero-full-title')), bajada: txt($('.hero-full-content .kicker')),
      foto: src($('.hero-full-bg img')), logo: src($('.topbar .brand img, .brand img')) },
    intro: { ceja: txt($('.intro-text .kicker')), titulo: txt($('.intro-text h2')), texto: txt($('.intro-text .lede')),
      foto: src($('img', fullEcuestre)) },
    experiencias: {
      titulo: txt($('.section-head h2', exp)),
      bajada: primeraFrase(txt($('.section-head .lede', exp))),
      lista: $$('.flip-card', exp).map((c) => ({
        foto: src($('.flip-front img', c)), nombre: txt($('.fb-name', c)),
        precio: txt($('.fb-price [data-lista]', c)), iva: txt($('.fb-price .mas-iva', c)),
        meta: txt($('.fb-meta', c)), nota: txt($('.fb-note', c)), detalle: $('.fb-desc', c)?.innerHTML ?? '',
      })),
    },
    menu: { bajada: txt($('.menu-sub', exp)),
      platos: $$('.menu-grid > div', exp).map((d) => ({ titulo: txt($('h4', d)), texto: txt($('p', d)) })),
      foto: src($$('.food-strip img').find((i) => /g11\./.test(i.src))) },
    actividades: { ceja: txt($('.kicker', fullEcuestre)), titulo: txt($('h2', fullEcuestre)),
      subtitulo: txt($('.fam-grid')?.closest('.wrap')?.querySelector('h2')),
      bajada: txt($('.fam-grid')?.closest('.wrap')?.querySelector('.lede')),
      lista: $$('.fam-card').map((c) => ({ titulo: txt($('h3', c)), texto: txt($('p', c)),
        foto: src($('.fam-media img', c)), icono: $('.fam-icono', c)?.innerHTML ?? '' })) },
    externas: { titulo: txt($('h2', ext)), bajada: txt($('.lede', ext)),
      lista: $$('.ext-card', ext).map((c) => ({ titulo: txt($('h3', c)), texto: txt($('p', c)), foto: src($('img', c)) })) },
    extras: { titulo: txt($('h2', extrasSec)),
      lista: $$('.service-card').map((c) => ({ precio: txt($('.tag', c)), titulo: txt($('h3', c)), texto: txt($('p', c)) })) },
    arriendo: { titulo: txt($('h2', arriendo)), bajada: txt($('.lede', arriendo)), foto: src($('img', arriendo)),
      precios: $$('.venue-price > div', arriendo).map((d) => ({ monto: txt($('.amount [data-lista]', d)),
        iva: txt($('.amount .mas-iva', d)), cuando: txt($('.label', d)) })) },
    medida: { titulo: txt($('h2', medida)), texto: txt($('.lede', medida)), foto: src($('img', medida)) },
    contacto: { titulo: txt($('.contact-card h3')), texto: txt($('.contact-card p')),
      boton: txt(wa), wa: wa?.href ?? '', telefono: txt($('.contact-card .fine')),
      direccion: txt($('footer a[href*="maps"]')), mapa: $('footer a[href*="maps"]')?.href ?? '' },
  };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function laminas(d, rotuloMenu) {
  // El número de cada lámina se pone al final, cuando ya se sabe cuántas son.
  let n = 1; const total = 8 + (d.socios ? 2 : 0);
  const pie = () => `<footer class="pie"><span>Brasas de Lo Pirque</span><span>@@N@@</span></footer>`;
  const iva = (t) => t ? ` <span class="iva">${esc(t)}</span>` : '';
  return `<!doctype html><html lang="${esc(d.lang)}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400;0,9..144,600&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page{ size:1280px 720px; margin:0; }
  :root{ --bg:#0B0B0A; --panel:#141311; --ink:#F4F0E6; --dim:#B9B1A0; --gold:#C9A227; --line:#2E2920;
    --serif:'Fraunces',Georgia,serif; --sans:'Work Sans','Helvetica Neue',Arial,sans-serif; }
  *{ box-sizing:border-box; } html,body{ margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); }
  .lam{ width:1280px; height:720px; position:relative; overflow:hidden; page-break-after:always; break-after:page; background:var(--bg); }
  .lam:last-child{ page-break-after:auto; break-after:auto; }
  h1,h2,h3{ font-family:var(--sans); font-weight:700; text-transform:uppercase; letter-spacing:.01em; line-height:1.1; margin:0; }
  h2{ font-size:34px; } h3{ font-size:17px; }
  p{ margin:0; line-height:1.5; }
  .ceja{ font-family:var(--serif); font-style:italic; color:var(--gold); font-size:21px; margin-bottom:12px; }
  .regla{ width:56px; height:2px; background:var(--gold); margin:18px 0 22px; }
  .lede{ color:var(--dim); font-size:18px; max-width:60ch; }
  .foto{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .velo{ position:absolute; inset:0; background:linear-gradient(90deg, rgba(11,11,10,.94) 0%, rgba(11,11,10,.78) 42%, rgba(11,11,10,.15) 100%); }
  .cont{ position:absolute; inset:64px 72px 72px; display:flex; flex-direction:column; }
  .pie{ position:absolute; left:72px; right:72px; bottom:26px; display:flex; justify-content:space-between;
    font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); }
  /* Sobre una foto el número se leía mal: va en una pastilla oscura. */
  .pie span:last-child{ background:rgba(11,11,10,.8); color:var(--ink); padding:4px 10px; border-radius:999px; }
  .iva{ font-family:var(--sans); font-style:normal; font-size:14px; font-weight:600; letter-spacing:.02em; color:var(--ink); opacity:.85; }
  .monto{ font-family:var(--serif); font-style:italic; color:var(--gold); }

  /* 1. portada */
  .portada .foto{ left:auto; width:46%; }
  .portada .lado{ position:absolute; left:0; top:0; bottom:0; width:54%; padding:72px; display:flex; flex-direction:column; justify-content:center; }
  .portada img.logo{ width:230px; height:auto; margin-bottom:auto; }
  .portada h1{ font-size:64px; line-height:1.02; }
  .portada .bajada{ color:var(--gold); text-transform:uppercase; letter-spacing:.12em; font-size:16px; font-weight:600; margin-top:22px; }
  .portada .web{ margin-top:auto; color:var(--dim); font-size:15px; letter-spacing:.06em; }

  /* 2. intro */
  .intro .cont{ justify-content:center; max-width:680px; }
  .intro h2{ font-size:44px; }

  /* 3. experiencias */
  .exps{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; margin-top:26px; }
  .exp{ border:1px solid var(--line); background:var(--panel); border-radius:3px; overflow:hidden; display:flex; flex-direction:column; }
  .exp img{ width:100%; height:150px; object-fit:cover; display:block; }
  .exp .cuerpo{ padding:18px 20px; display:flex; flex-direction:column; gap:8px; }
  .exp .precio{ font-size:34px; line-height:1; }
  .exp .meta{ font-size:13px; color:var(--dim); }
  .exp .nota{ font-size:13px; color:var(--gold); font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
  .exp .det{ font-size:13.5px; color:var(--dim); line-height:1.45; }
  .exp .det b{ color:var(--ink) !important; }

  /* 4. menú */
  .menu .foto{ left:auto; width:34%; }
  .menu .cont{ right:calc(34% + 56px); }
  .platos{ display:grid; grid-template-columns:1fr 1fr; gap:22px 34px; margin-top:28px; }
  .platos h3{ color:var(--gold); font-size:15px; letter-spacing:.1em; margin-bottom:8px; }
  .platos p{ font-size:14.5px; color:var(--dim); }

  /* 5 y 6. actividades */
  .acts{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:24px; }
  .act{ border:1px solid var(--line); background:var(--panel); border-radius:3px; overflow:hidden; display:flex; flex-direction:column; }
  .act .mini{ width:100%; height:118px; object-fit:cover; display:block; }
  .act .icono{ width:100%; height:118px; display:grid; place-items:center; color:var(--gold); border-bottom:1px solid var(--line); }
  .act .icono svg{ width:48px; height:48px; }
  .act > div:last-child{ padding:12px 16px; }
  .act h3{ font-size:14.5px; margin-bottom:5px; } .act p{ font-size:13.5px; color:var(--dim); line-height:1.4; }
  .exts{ display:grid; grid-template-columns:repeat(4,1fr); gap:18px; margin-top:26px; }
  .ext{ border:1px solid var(--line); background:var(--panel); border-radius:3px; overflow:hidden; }
  .ext img{ width:100%; height:300px; object-fit:cover; display:block; }
  .ext div{ padding:14px 16px; } .ext h3{ font-size:14.5px; margin-bottom:6px; } .ext p{ font-size:13.5px; color:var(--dim); line-height:1.45; }

  /* 7. recinto y extras */
  .recinto .foto{ left:auto; width:36%; }
  .recinto .cont{ right:calc(36% + 56px); }
  .montos{ display:flex; gap:40px; margin:16px 0 30px; }
  .montos > div{ border-left:2px solid var(--gold); padding-left:16px; }
  .montos .monto{ font-size:36px; }
  .montos .cuando{ font-size:13px; letter-spacing:.12em; text-transform:uppercase; color:var(--dim); margin-top:6px; }
  .servs{ display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:14px; }
  .serv{ border:1px solid var(--line); background:var(--panel); padding:14px 16px; border-radius:3px; }
  .serv .tag{ font-size:13px; color:var(--gold); font-weight:600; } .serv h3{ font-size:14.5px; margin:6px 0; } .serv p{ font-size:13.5px; color:var(--dim); line-height:1.45; }
  .medida{ margin-top:26px; } .medida h3{ font-size:15px; color:var(--gold); letter-spacing:.08em; margin-bottom:6px; } .medida p{ font-size:14.5px; color:var(--dim); }

  /* socios: comisiones, segmentos, beneficios y pasos */
  .comis{ display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:22px; }
  .comi{ border:1px solid var(--line); background:var(--panel); border-radius:3px; padding:22px; text-align:center; }
  .comi .pct{ font-family:var(--serif); font-style:italic; color:var(--gold); font-size:52px; line-height:1; }
  .comi .rot{ font-size:14px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--dim); margin-top:8px; }
  .comi .nota{ font-size:15px; margin-top:6px; }
  .pie-comi{ font-family:var(--serif); font-style:italic; color:var(--dim); font-size:16px; margin-top:14px; }
  .tres{ display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:18px; }
  .caja{ border:1px solid var(--line); background:var(--panel); border-radius:3px; padding:16px 18px; }
  .caja .num{ font-family:var(--serif); font-style:italic; color:var(--gold); font-size:22px; display:block; margin-bottom:4px; }
  .caja h3{ font-size:14.5px; margin-bottom:6px; } .caja p{ font-size:13.5px; color:var(--dim); line-height:1.45; }
  .cuatro{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:18px; }
  .sub{ font-size:17px; color:var(--gold); letter-spacing:.08em; margin-top:30px; }

  /* 8. contacto */
  .contacto .cont{ justify-content:center; max-width:640px; }
  .contacto h2{ font-size:46px; }
  .contacto .wa{ display:inline-block; margin-top:28px; background:#25D366; color:#0B0B0A; font-weight:700; text-transform:uppercase;
    letter-spacing:.06em; padding:16px 26px; border-radius:3px; text-decoration:none; font-size:16px; align-self:flex-start; }
  .contacto .datos{ margin-top:30px; font-size:17px; color:var(--ink); line-height:1.8; }
  .contacto .datos a{ color:var(--ink); text-decoration:none; }
</style></head><body>

<section class="lam portada">
  <img class="foto" src="${esc(d.portada.foto)}" alt="">
  <div class="lado">
    <img class="logo" src="${esc(d.portada.logo)}" alt="Brasas de Lo Pirque">
    <h1>${esc(d.portada.titulo)}</h1>
    <p class="bajada">${esc(d.portada.bajada)}</p>
    <p class="web">brasasdelopirque.cl</p>
  </div>
</section>

<section class="lam intro">
  <img class="foto" src="${esc(d.intro.foto)}" alt=""><div class="velo"></div>
  <div class="cont">
    <p class="ceja">${esc(d.intro.ceja)}</p>
    <h2>${esc(d.intro.titulo)}</h2>
    <div class="regla"></div>
    <p class="lede">${esc(d.intro.texto)}</p>
  </div>${pie()}
</section>

${d.socios ? laminasSocios(d.socios, pie) : ''}
<section class="lam">
  <div class="cont">
    <h2>${esc(d.experiencias.titulo)}</h2>
    <p class="lede" style="margin-top:10px;">${esc(d.experiencias.bajada)}</p>
    <div class="exps">${d.experiencias.lista.map((e) => `
      <article class="exp"><img src="${esc(e.foto)}" alt="">
        <div class="cuerpo">
          <h3>${esc(e.nombre)}</h3>
          <div><span class="monto precio">${esc(e.precio)}</span>${iva(e.iva)}</div>
          <p class="meta">${esc(e.meta)}</p>
          <p class="nota">${esc(e.nota)}</p>
          <p class="det">${e.detalle}</p>
        </div></article>`).join('')}
    </div>
  </div>${pie()}
</section>

<section class="lam menu">
  <img class="foto" src="${esc(d.menu.foto)}" alt="">
  <div class="cont">
    <h2>${esc(rotuloMenu)}</h2>
    <p class="lede" style="margin-top:10px;">${esc(d.menu.bajada)}</p>
    <div class="platos">${d.menu.platos.map((p) => `<div><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div>
  </div>${pie()}
</section>

<section class="lam">
  <div class="cont">
    <p class="ceja">${esc(d.actividades.ceja)}</p>
    <h2>${esc(d.actividades.titulo)}</h2>
    <p class="lede" style="margin-top:12px;"><b style="color:var(--ink)">${esc(d.actividades.subtitulo)}.</b> ${esc(d.actividades.bajada)}</p>
    <div class="acts">${d.actividades.lista.map((a) => `
      <div class="act">${a.foto ? `<img class="mini" src="${esc(a.foto)}" alt="">` : `<div class="icono">${a.icono}</div>`}
        <div><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p></div></div>`).join('')}
    </div>
  </div>${pie()}
</section>

<section class="lam">
  <div class="cont">
    <h2>${esc(d.externas.titulo)}</h2>
    <p class="lede" style="margin-top:10px;">${esc(d.externas.bajada)}</p>
    <div class="exts">${d.externas.lista.map((x) => `
      <article class="ext"><img src="${esc(x.foto)}" alt=""><div><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div></article>`).join('')}
    </div>
  </div>${pie()}
</section>

<section class="lam recinto">
  <img class="foto" src="${esc(d.arriendo.foto)}" alt="">
  <div class="cont">
    <h2>${esc(d.arriendo.titulo)}</h2>
    <p class="lede" style="margin-top:10px;">${esc(d.arriendo.bajada)}</p>
    <div class="montos">${d.arriendo.precios.map((p) => `
      <div><span class="monto">${esc(p.monto)}</span>${iva(p.iva)}<div class="cuando">${esc(p.cuando)}</div></div>`).join('')}
    </div>
    <h3 style="color:var(--gold);letter-spacing:.08em;font-size:15px;">${esc(d.extras.titulo)}</h3>
    <div class="servs">${d.extras.lista.map((s) => `
      <div class="serv"><span class="tag">${esc(s.precio)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>`).join('')}
    </div>
    <div class="medida"><h3>${esc(d.medida.titulo)}</h3><p>${esc(d.medida.texto)}</p></div>
  </div>${pie()}
</section>

<section class="lam contacto">
  <img class="foto" src="${esc(d.medida.foto)}" alt=""><div class="velo"></div>
  <div class="cont">
    <h2>${esc(d.contacto.titulo)}</h2>
    <div class="regla"></div>
    <p class="lede">${esc(d.contacto.texto)}</p>
    <a class="wa" href="${esc(d.contacto.wa)}">${esc(d.contacto.boton)} · ${esc(d.contacto.telefono)}</a>
    <p class="datos"><a href="${esc(d.contacto.mapa)}">${esc(d.contacto.direccion)}</a><br>brasasdelopirque.cl</p>
  </div>${pie()}
</section>
</body></html>`.replace(/@@N@@/g, () => `${++n} / ${total}`);
}

/** Las dos láminas que solo tiene socios comerciales: comisiones y por qué sumarte. */
function laminasSocios(s, pie) {
  const caja = (x) => `<div class="caja">${x.num ? `<span class="num">${esc(x.num)}</span>` : ''}<h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`;
  return `
<section class="lam">
  <div class="cont">
    <h2>${esc(s.comision.titulo)}</h2>
    <div class="comis">${s.comision.niveles.map((c) => `
      <div class="comi"><div class="pct">${esc(c.pct)}</div><div class="rot">${esc(c.rotulo)}</div><div class="nota">${esc(c.nota)}</div></div>`).join('')}
    </div>
    <p class="pie-comi">${esc(s.comision.pie)}</p>
    <h3 class="sub">${esc(s.segmentos.titulo)}</h3>
    <div class="tres">${s.segmentos.lista.map(caja).join('')}</div>
  </div>${pie()}
</section>

<section class="lam">
  <div class="cont">
    <h2>${esc(s.beneficios.titulo)}</h2>
    <p class="lede" style="margin-top:10px;">${esc(s.beneficios.bajada)}</p>
    <div class="cuatro">${s.beneficios.lista.map(caja).join('')}</div>
    <h3 class="sub">${esc(s.pasos.titulo)}</h3>
    <div class="tres">${s.pasos.lista.map(caja).join('')}</div>
  </div>${pie()}
</section>`;
}

async function principal() {
  const { chromium } = await cargarPlaywright();
  const servidor = await servir();
  const base = `http://127.0.0.1:${servidor.address().port}/`;
  const navegador = await chromium.launch();
  const huellas = {};
  try {
    for (const [pagina, pdf] of PDFS) for (const [lang, carpeta] of IDIOMAS) {
      const pag = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
      await pag.goto(`${base}${carpeta}${pagina}`, { waitUntil: 'networkidle' });
      const datos = await pag.evaluate(leerPagina);
      const faltan = ['portada.titulo', 'experiencias.titulo', 'arriendo.titulo', 'contacto.wa']
        .filter((k) => !k.split('.').reduce((o, p) => o?.[p], datos));
      if (faltan.length || datos.experiencias.lista.length === 0) {
        throw new Error(`${carpeta}${pagina}: no encontré ${faltan.join(', ') || 'las experiencias'}. ¿Cambió el HTML?`);
      }
      await pag.setContent(laminas(datos, ROTULOS[lang]), { waitUntil: 'networkidle' });
      await pag.evaluate(() => document.fonts.ready);
      const destino = `${carpeta}${pdf}`;
      await pag.pdf({ path: join(RAIZ, destino), width: '1280px', height: '720px', printBackground: true });
      if (process.env.DOSSIER_CAPTURAS) {
        const n = await pag.$$eval('.lam', (l) => l.length);
        for (let i = 0; i < n; i++) {
          await pag.locator('.lam').nth(i).screenshot({ path: join(process.env.DOSSIER_CAPTURAS, `${pdf.replace('.pdf', '')}-${lang}-${i + 1}.png`) });
        }
      }
      huellas[`${carpeta}${pagina}`] = await huella(`${carpeta}${pagina}`);
      console.log(`  ${destino}`);
      await pag.close();
    }
  } finally {
    await navegador.close();
    servidor.close();
  }
  huellas.script = await huella('tools/dossier_pdf.mjs');
  await writeFile(join(RAIZ, 'tools/dossier_pdf.json'),
    JSON.stringify({ _que_es: 'Huella de las páginas con que se generaron los PDF (dossier y socios comerciales). La escribe tools/dossier_pdf.mjs y la revisa traducir.py --revisar.', ...huellas }, null, 2) + '\n');
  console.log('Listo: los PDF del dossier y de socios comerciales, en tres idiomas.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  principal().catch((e) => { console.error(e.message); process.exit(1); });
}
