# Brasas de Lo Pirque — sitio web

Dos entregables para **Brasas de Lo Pirque** (brasasdelopirque.cl), un
restaurante campestre y centro de eventos en Chile:

1. **Sitio público** (`index.html` y compañía) — para clientes finales que
   quieren pasar el día o celebrar algo. Cinco páginas.
2. **Landing de socios comerciales** (`landing-afiliados.html`) — B2B, para
   agencias de turismo, municipalidades y empresas que revenden el lugar.
   Enlazado desde el menú del sitio público; los niveles de comisión viven
   solo acá.

**Ojo: los dos están armados de forma distinta a propósito.** El landing es un
archivo suelto y autocontenido; el sitio público es un sitio estático normal
con carpeta de assets. No unifiques los dos criterios sin hablarlo.

## Sitio público

Archivos: `index.html`, `experiencias.html`, `actividades.html`,
`eventos.html`, `contacto.html`, todos apuntando a la hoja compartida
`assets/css/site.css` y a las fotos reales de `assets/`. Cada página pesa
unos pocos KB; las imágenes se cachean entre páginas.

- **No hay build step.** Cabecera y pie están duplicados en cada página, que es
  lo normal en un sitio estático sin toolchain. Si tocas el menú, tócalo en
  las seis (las cinco más `404.html`).
- El menú son 5 ítems: **Reserva** (botón dorado relleno, la acción principal)
  · Experiencias · Actividades · Eventos · **Socios comerciales** (delineado,
  porque es otro público). No hay ítem "Inicio": eso lo hace el logo.
- **Sin JavaScript**, igual que el landing: el menú de celular es checkbox +
  label, y las tarjetas que giran y los carruseles son CSS.
- El menú de celular **sí existe acá** (hamburguesa bajo 920px). El landing de
  socios no tiene: ahí el menú simplemente desaparece bajo 900px.
- Los precios de las experiencias y del arriendo son los mismos que el
  landing. Si cambian, hay que cambiarlos en ambos lados.

### Trampas de layout ya resueltas (no las reintroduzcas)

- `aspect-ratio` en un contenedor flex **no** fija la altura si adentro hay una
  `<img>` con `height:100%`: la referencia es circular y gana el alto natural
  de la foto. Por eso la razón va en la propia `<img>` (`.card-photo img`).
- En un `.split`, una foto vertical arrastra el alto de toda la fila (llegó a
  1138px). Por eso la `<img>` va `position:absolute` y no aporta altura.
- `calc(18px + env(safe-area-inset-bottom))` no parsea en todos los motores y
  tumba la declaración entera. Va detrás de un `@supports`.

## Landing de socios (`landing-afiliados.html`)

- Es **el único archivo** de ese entregable y el que hay que editar. Es HTML autocontenido: CSS inline en un solo `<style>`, 40 imágenes
  embebidas en base64, cero JavaScript de terceros. Se abre directo en el
  navegador, sin servidor ni build step.
- **No hay toolchain**: no hay npm, bundler, linter ni tests. No agregues uno
  salvo que el cliente lo pida.
- **`assets/`** guarda los originales ya procesados de esas fotos, por si hay
  que re-embeber o recortar alguna:
  - `assets/imgs/` — extraídas del PDF de presentación original
    (`EMPRESAbrasas26.pdf`, ya no disponible; solo quedan estas imágenes).
  - `assets/imgs2/` — sacadas del Google Drive del cliente (comida, show
    ecuestre alternativo).
  - `assets/gallery/` — las 27 fotos del carrusel "Date una vuelta por el lugar".
- Si hacen falta **más fotos del lugar**, están en el Google Drive del cliente.
  Hay que pedírselas o usar la integración de Drive si está disponible.

### Editar el HTML sin romperlo

El archivo pesa ~4.7 MB porque los payloads base64 ocupan casi todo. Para
trabajarlo:

- **Nunca lo leas entero.** Filtra los payloads primero:
  `sed 's/data:image\/[a-z]*;base64,[A-Za-z0-9+\/=]*/[B64]/g' landing-afiliados.html`
- Para reemplazos de texto masivos, opera **solo fuera de los payloads**
  (parte el archivo con `re.split` sobre el patrón `data:image/...;base64,...`),
  porque una cadena corta puede aparecer por casualidad dentro del base64.
- Después de cualquier edición, verifica integridad:
  `wc -l landing-afiliados.html` debe seguir dando 734 líneas y
  `grep -c 'data:image/jpeg;base64' landing-afiliados.html` debe dar 40.

### Previsualizar

Chromium headless está preinstalado en este entorno:

```
/opt/pw-browsers/chromium-1194/chrome-linux/chrome --headless --no-sandbox \
  --disable-gpu --hide-scrollbars --window-size=1280,1600 \
  --screenshot=out.png --virtual-time-budget=6000 \
  "file://$PWD/landing-afiliados.html"
```

Las tipografías saldrán en fallback porque el sandbox bloquea
`fonts.googleapis.com` — es del entorno, no de la página.

## Estilo y marca

- Estética: fondo negro/casi negro, sans-serif en mayúsculas con tracking
  (bold), acentos en dorado, fotografía real como protagonista.
- Fuentes: **Fraunces** (serif, itálica, para números y precios) + **Work Sans**
  (sans, todo lo demás), vía `<link>` a Google Fonts con fallback a system fonts.
- Todo el sistema de diseño vive en el `:root{}` al inicio del `<style>`
  (`--gold: #C9A227`, `--bg: #0B0B0A`, etc.). Usa esas variables, no valores
  hardcodeados.

## Voz y redacción

- **Español de Chile, tuteo.** Nada de voseo argentino: se escribe
  "Escríbenos", "Cuéntanos", "Súmate", "Deja", "¿Buscas...?", "si eres agencia"
  — nunca "Escribinos", "Contanos", "Sumate", "Dejá", "¿Buscás...?", "si sos".
  (La página venía con voseo y ya se corrigió; no lo reintroduzcas al escribir
  copy nuevo.)
- Tono: comercial pero sobrio, sin signos de exclamación ni superlativos.

## Estructura de la página (orden actual)

1. Foto full-screen "Trabaja con nosotros / Únete a nuestro programa de
   afiliados" + botón WhatsApp
2. Tres paneles de comisión (5% / 10% / 15%)
3. "Una experiencia chilena auténtica, ideal para tus clientes" + 2º botón
   WhatsApp
4. Cuatro niveles de experiencias culinarias (Tradiciones $44.000 / Lo Pirque
   $50.000 / Brasas $70.000 / Sommelier $90.000) — tarjetas con flip 3D en CSS
   puro (checkbox + label, sin JS). Menú compartido en un `<details>` debajo.
5. Galería "Date una vuelta por el lugar" — 27 fotos, carrusel swipe con
   `scroll-snap`, sin JS
6. Foto + texto del show ecuestre ("Una experiencia para todas las edades")
7. Seis tarjetas de actividades familiares dentro del recinto
8. Experiencias externas para empresas (coaching con caballos, taller de queso,
   karting, taller de asado)
9. Servicios adicionales (desayuno de campo / once campesina)
10. Precio del recinto ($2.500.000 + IVA fin de semana / $1.500.000 + IVA días
    de semana, solo arriendo, sin catering)
11. "Eventos a medida" (full-bleed con overlay)
12. Segmentos (agencias / municipalidades / empresas)
13. Por qué sumarte como socio
14. Cómo funciona (3 pasos)
15. Contacto: botón WhatsApp + formulario de email
16. Footer

Las interacciones (flip de tarjetas, carrusel) son **CSS puro a propósito**.
Mantenlo así salvo que el cliente pida lo contrario.

## Restricciones de contenido — importante

- **No usar fotos con niños de clientes identificables sin autorización
  confirmada.** Las fotos que existen en el Drive del cliente para castillo
  inflable, ping-pong/tacataca y cancha de beach tenis muestran caras de niños
  de clientes reales, identificables, sin autorización de imagen. Por eso esas
  tres actividades hoy van **sin foto**. No las ilustres con esas imágenes hasta
  que el cliente confirme que tiene permiso de esas familias o consiga fotos
  alternativas sin caras identificables.
- Todas las fotos usadas son del propio negocio (staff o fotógrafo contratado
  por el cliente). No hay stock ni imágenes de terceros, y no se deben agregar.

## Datos del negocio (confirmados)

- **WhatsApp Reservas** `+56 9 4009 6228` — el del sitio público, para el
  cliente final.
- **WhatsApp Eventos** `+56 9 3385 8575` — el del landing de socios, para
  agencias y empresas. Son distintos a propósito: no los unifiques.
- **Dirección**: Casas de San Vicente, lote 4, Pirque, Región Metropolitana.
  Mapa: `https://maps.app.goo.gl/NPkmd1foma1Uc8nB8`
- **Email**: `contacto@lopirque.cl` (ojo: dominio distinto al del sitio).
- **Menú de niños**: $19.000, de 4 a 12 años. Es **uno solo**, no una
  variante por experiencia: se suma a cualquiera de las cuatro. Por eso va
  en un bloque propio en `experiencias.html` y no repetido en cada tarjeta.
- **Precios de experiencias**: los mismos en ambos entregables. La diferencia
  es la condición, no el monto (ver abajo).

## Diferencia entre los dos entregables

El sitio público vende a familias y grupos chicos; el landing de socios, a
agencias que compran por grupo. Por eso:

- El landing dice **"sobre 25 personas"** en las cuatro tarjetas. Correcto ahí.
- El sitio público **no** lo dice, y dice "por adulto". Tenerlo era un error:
  le decía a una familia de seis que no podía reservar.

**Supuesto sin confirmar:** que el mínimo de 25 no rige para venta directa.
Se dedujo de que el producto en Shopify no muestra ningún mínimo. Si resulta
que sí rige, hay que devolverlo a cinco lugares del sitio público.

## En pausa (esperando datos del cliente)

- **Video del hero.** El sitio antiguo tiene uno a pantalla completa en la
  portada, servido desde el CDN de Shopify:
  `https://brasasdelopirque.cl/cdn/shop/videos/c/vp/efd6188a5bea4563a815d15436811b3a/efd6188a5bea4563a815d15436811b3a.HD-1080p-7.2Mbps-81471494.mp4`
  Se puede montar con `<video autoplay muted loop playsinline>` y la foto
  actual como `poster`, sin JavaScript. Dos reparos: es 1080p a 7,2 Mbps
  (conviene cargarlo solo sobre 900px de ancho y dejar la foto en móvil), y
  depende de que Shopify siga ahí.
- **Shopify.** El sitio antiguo vende con un Buy Button embebido: selector de
  fecha, cantidad de adultos y niños, y carrito. No es un botón simple, es un
  sistema de reservas — mandar al cliente fuera del sitio sería un retroceso.
  Faltan el dominio `*.myshopify.com` y los IDs de producto, o el snippet que
  ya usan. **Ojo: integrarlo rompe la regla de cero JavaScript**, y eso hay
  que decidirlo explícitamente antes de hacerlo.
- **Logo.** El del sitio antiguo es negro sobre blanco y tiene una A invertida
  como rasgo distintivo. Nuestro fondo es negro, así que hace falta una
  versión clara o un SVG recoloreable. Hoy la marca se compone con tipografía.

## Decisiones abiertas

- **El nombre del negocio no calza.** Google Maps lo lista como "Lo Pirque
  Restaurant" y el email es `@lopirque.cl`, pero el sitio se llama "Brasas de
  Lo Pirque" y el dominio es `brasasdelopirque.cl`. Si alguien busca la marca
  del sitio en Maps, puede no encontrarla. El cliente lo está aclarando.
- **`contacto.html` podría renombrarse a `reserva.html`.** La página ya se
  llama "Reserva" en el menú y en su contenido; solo falta el archivo. No se
  hizo para no romper enlaces que el cliente pueda haber compartido.

## Pendientes de contenido

- **Condición de cada nivel de comisión** — 3 apariciones de
  `[Placeholder: condición]` en los paneles de 5% / 10% / 15% del landing.
- **Plataforma de newsletter** — el formulario de email tiene
  `onsubmit="return false;"` y ningún handler, así que **el email se descarta
  al enviar: hoy no captura nada**. Hay que resolver al menos la captura
  (Formspree, Google Forms o un endpoint propio).
- **Fotos de castillo inflable, ping-pong/tacataca y beach tenis** —
  bloqueadas por la restricción de imagen de arriba.
- **Copy nuevo sin revisar por el cliente** — los titulares y bajadas del
  sitio público los redactó Claude, no vienen del cliente. El contenido
  factual (precios, menú, actividades) sí es textual del landing.

## Previsualizar el sitio público

Se abre `index.html` directo en el navegador (las rutas son relativas). Para
ver los cinco enlaces funcionando conviene servirlo:
`python3 -m http.server` y entrar a `localhost:8000`.

Para verificar cambios, Playwright está instalado y es mucho más fiable que
`--screenshot` de Chromium, que **posiciona mal los `position:fixed`** y
reporta como rotas las imágenes `loading="lazy"` que aún no entran en pantalla:

```
python3 -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--no-sandbox'])
    pg=b.new_context(viewport={'width':393,'height':852},is_mobile=True).new_page()
    pg.goto('file://\$PWD/index.html'); pg.wait_for_timeout(2000)
    print(pg.evaluate('({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})'))
"
```

## Cómo trabajar con este proyecto

**Propone antes de aplicar.** El cliente pidió explícitamente revisar los
cambios antes de que se hagan. En la práctica:

- **Sin preguntar**: leer archivos, buscar, medir con Playwright, generar
  capturas en una carpeta temporal. Nada de eso altera el proyecto y es lo
  que permite proponer con fundamento en vez de opinar al aire.
- **Con confirmación previa**: editar archivos, commits, push, PRs y
  cualquier cosa que toque GitHub.

Al proponer, di qué archivos toca y qué efecto tiene, para que se pueda
decidir con la información a mano.

**No inventes datos del negocio.** Precios, horarios, direcciones,
distancias y capacidades salen del cliente o de material que él entregó. Si
falta un dato, pídelo: es preferible dejar un placeholder visible antes que
publicar algo plausible pero falso.

## Git

Trabajar en la rama `claude/migrate-project-claude-code-hfqsyc`. Rama por
defecto: `main`.
