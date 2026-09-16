# Brasas de Lo Pirque — sitio web

Dos entregables para **Brasas de Lo Pirque** (brasasdelopirque.cl), un
restaurante campestre y centro de eventos en Chile:

1. **Sitio público** (`index.html` y compañía) — para clientes finales que
   quieren pasar el día o celebrar algo. Cinco páginas.
2. **Landing de socios comerciales** (`landing-afiliados.html`) — B2B, para
   agencias de turismo, municipalidades y empresas que revenden el lugar.
   Enlazado desde el menú del sitio público; los niveles de comisión viven
   solo acá.

Los dos comparten la carpeta `assets/`. El landing sigue siendo **un solo
archivo HTML con su CSS inline**, pero **ya no es autocontenido**: desde el
2026-09-16 sus imágenes son archivos referenciados, no base64.

Desde el 2026-09-16 los dos entregables se publican además **en inglés y en
portugués**, generados desde el español. Ver "Sitio en tres idiomas".

## Sitio en tres idiomas (es · en · pt)

**El español de la raíz es la fuente de verdad. `en/` y `pt/` son generadas
y no se editan a mano.** Lo que se les haga se pierde en la próxima corrida.

```
python3 tools/traducir.py            # escribe en/ y pt/
python3 tools/traducir.py --revisar  # no escribe: avisa si algo quedó viejo
```

Solo necesita `python3`: sin npm, sin dependencias. **Esto no contradice la
regla de "no hay toolchain"**: el sitio que se publica sigue siendo HTML
plano y el script no corre en el navegador ni en el servidor, solo acá. Se
eligió sobre las dos alternativas porque duplicar los archivos a mano habría
convertido cada cambio de copy en tres ediciones, y un selector en
JavaScript habría roto la regla de cero JS y dejado a Google indexando solo
el español.

### El flujo de trabajo, que es lo único que hay que recordar

1. Editas el español en la raíz, como siempre.
2. Corres `python3 tools/traducir.py`.
3. Commiteas las tres versiones juntas.

Si el paso 2 se olvida, `--revisar` lo delata: compara lo generado contra lo
que hay en disco y nombra los archivos desfasados. Si agregaste texto nuevo,
el script **se niega a generar** y lista lo que falta traducir, en vez de
publicar una página a medio traducir sin que nadie se entere.

### Las traducciones

Viven en `traducciones/en.json` y `traducciones/pt.json`. La llave es el
texto en español tal cual aparece en el HTML:

```json
"Reserva tu visita": "Book your visit"
```

Cuando el mismo español necesita traducciones distintas según la página, se
usa una llave calificada `"archivo.html|texto"`, que le gana a la suelta solo
en ese archivo. Las llaves que parten con `_` son comentarios, no textos.

Lo que **no** pasa por el diccionario, porque se reconoce por su forma:
números, teléfonos, correos, dominios y URLs. Los nombres propios
(`Tradiciones`, `Sommelier`, `Pirque`, `WhatsApp`) están en la lista
`PROPIOS` del script.

**Los precios sí están en el diccionario, a propósito.** En formato chileno
`$44.000` son cuarenta y cuatro mil pesos, pero en inglés se lee como
cuarenta y cuatro dólares con cero centavos. Por eso en `en/` sale
`$44,000 CLP` y en `pt/` `$44.000 CLP`. `assets/js/reserva.js` formatea el
total calculado con el mismo criterio.

### El selector de idiomas

Es el desplegable de la barra superior. **El markup lo arma el script**
(`selector_idiomas()`), y el bloque `<!--i18n-->…<!--/i18n-->` que está
escrito en los archivos españoles tiene que coincidir exactamente con lo que
el script genera; si no, la corrida avisa. Para cambiarlo se toca el script,
no el HTML.

**Es un `<details>`/`<summary>`, así que no usa una línea de JavaScript.**
Se abre y se cierra solo, y viene con el teclado y los lectores de pantalla
resueltos de fábrica. El resumen muestra el idioma actual (bandera + código);
la lista muestra los tres con su nombre completo, y el actual va marcado con
un tilde y sin enlace. Lo único que no hace gratis un `<details>` es cerrarse
al hacer clic afuera: eso necesitaría JS y no vale la pena.

**Los nombres van cada uno en su propio idioma** —Español, English,
Português— y no traducidos al idioma de la página. Es lo estándar y es lo
útil: alguien que solo lee portugués tiene que poder reconocer "Português"
estando en la versión en español. Por eso tampoco están en los diccionarios.

**Las banderas son SVG inline, no emoji.** Chrome en Windows no dibuja los
emoji de bandera (🇨🇱): muestra las dos letras del país. Buena parte del
público chileno está en Windows, así que el emoji no era opción. Los SVG
están simplificados a propósito —las 50 estrellas de la bandera de Estados
Unidos y el globo de la brasileña no se leen a 18px— y viven en el
diccionario `BANDERAS` del script, en un solo lugar para las 24 páginas.

**Las tres comparten `viewBox="0 0 300 200"` y llevan `width`/`height` como
atributos, no solo en el CSS. Las dos cosas son a propósito** y arreglan un
bug real (2026-09-16: se veían gigantes en escritorio):

- Un `<svg>` inline al que no se le resuelve la razón **se dibuja a su
  tamaño por defecto, que son 300×150**. Con `height:auto` + `aspect-ratio`
  eso depende del motor, y donde falla aparecen banderas enormes. Por eso
  el CSS les da **alto y ancho explícitos**, nunca `auto`, y los atributos
  sostienen el tamaño incluso si la hoja de estilos todavía no aplicó.
- Si cada bandera trajera su razón real —Estados Unidos es 19:10, Brasil
  10:7— con medidas fijas quedarían con franjas transparentes arriba o a
  los lados. Redibujadas las tres en 3:2 llenan la caja exacta. La
  diferencia con la razón oficial no se nota a 18px; un borde descuadrado
  sí.

**Qué bandera para qué idioma lo decidió el cliente** (2026-09-16): Chile
para el español, Estados Unidos para el inglés, Brasil para el portugués.
Vale la pena tener presente que una bandera representa un país y no un
idioma, así que la elección siempre es una convención. Cambiarlas es editar
`BANDERAS` y regenerar.

Bajo 380px el código del idioma se oculta a la vista pero no se borra, así
que el botón conserva su nombre accesible.

Va **fuera del menú desplegable** a propósito: en celular el menú se
esconde tras la hamburguesa, y el idioma tiene que poder cambiarse sin
abrirlo. En el landing es todavía más importante, porque ahí el menú
directamente desaparece bajo 900px — por eso sus reglas CSS quedaron
acotadas a `.topbar nav:not(.idiomas)`.

El `<head>` lleva además un bloque `<!--i18n:alternate-->` con los
`hreflang`, que le dicen a Google que las tres son la misma página. Van con
URL absoluta, así que **si el sitio cambia de dominio hay que cambiar la
constante `SITIO`** al inicio del script. Hoy dice `brasasdelopirque.cl`.

`404.html` y `contacto.html` van con `noindex`, así que no llevan `hreflang`;
`contacto.html` tampoco lleva selector, porque redirige al instante.

### Sugerencia de idioma (`assets/js/idioma.js`)

Si el navegador del visitante está en un idioma que el sitio tiene, y no es
el de la página que abrió, le aparece una tarjetita abajo a la derecha
ofreciéndole cambiarse.

**Sugiere, no redirige.** Nadie termina en un idioma que no pidió. Se
decidió así con el cliente el 2026-09-16 sobre la alternativa de redirigir
automático, por dos razones: Google desaconseja explícitamente la
redirección automática por idioma, y además atrapa —un chileno con el
notebook configurado en inglés vería el sitio en inglés sin haberlo pedido
y sin entender por qué.

**Mira el idioma del navegador, no el país.** Detectar el país de verdad
necesita geolocalización por IP, o sea un servicio externo en cada carga.
El idioma del navegador además suele ser mejor señal: un brasileño
navegando desde Santiago quiere portugués, y el país diría Chile.

**Los enlaces los saca del propio selector de la barra**, que ya trae las
rutas correctas a esta misma página en los otros idiomas. Así no hay una
segunda lista que mantener, y si la página no tiene selector no pasa nada.

Se muestra **una sola vez**. Apenas la persona la cierra o elige un idioma
—en la tarjeta o en el desplegable de la barra— queda anotado en
`localStorage` y no vuelve a aparecer. Si `localStorage` está bloqueado
(navegación privada, cookies deshabilitadas) la tarjeta reaparece en la
próxima visita: molesto, pero no roto, y sin lanzar errores.

**Ojo: esto agrega JavaScript al sitio completo**, incluido el landing, que
hasta el 2026-09-16 tenía cero. Es la segunda excepción a la regla, después
de `reserva.js`, y también se decidió explícitamente. Sigue sin haber JS
para nada de interfaz: el menú, las tarjetas que giran, los carruseles y el
propio selector de idiomas siguen siendo CSS puro.

El texto de la tarjeta va **en el idioma que se ofrece**, no en el de la
página: a alguien que lee inglés hay que ofrecerle el cambio en inglés. Los
tres textos viven en el objeto `TEXTOS` del archivo.

### Lo que queda en español pase lo que pase

- **El checkout de Shopify y el calendario de Cowlendar.** El formulario de
  reserva se traduce, pero al apretar "Complete booking" la persona cae en un
  checkout en español. Se arregla con Shopify Markets, del lado de la tienda,
  no desde acá. Es tema para cuando esté la tienda de desarrollo.
- **Las conversaciones de WhatsApp.** El mensaje prellenado sí se traduce
  (el script lo decodifica del `?text=`), pero quien responde al otro lado
  escribe en el idioma que maneje. Vale la pena avisarle al cliente antes de
  promocionar el sitio en inglés o portugués.

### Traducciones sin revisar por hablante nativo

Las escribió Claude, igual que el copy nuevo en español. El inglés y el
portugués (variante de Brasil) están cuidados y consistentes, pero nadie
nativo los ha leído todavía. Los términos chilenos que no tienen equivalente
—`sopaipillas`, `pebre`, `pan amasado`, `mote con huesillo`, `huaso`,
`cueca`, `cochayuyo`— se dejaron en español a propósito, porque son parte de
lo que se vende.

## Sitio público

Archivos: `index.html`, `experiencias.html`, `actividades.html`,
`eventos.html`, `reservas.html`, todos apuntando a la hoja compartida
`assets/css/site.css` y a las fotos reales de `assets/`. Cada página pesa
unos pocos KB; las imágenes se cachean entre páginas.

- **No hay build step.** Cabecera y pie están duplicados en cada página, que es
  lo normal en un sitio estático sin toolchain. Si tocas el menú, tócalo en
  las seis (las cinco más `404.html`) **y después corre
  `python3 tools/traducir.py`**, que es lo que propaga el cambio a `en/` y
  `pt/`. Esas carpetas son generadas: no se editan.
- El menú son 5 ítems: **Reserva** (botón dorado relleno, la acción principal)
  · Experiencias · Actividades · Eventos · **Socios comerciales** (delineado,
  porque es otro público). No hay ítem "Inicio": eso lo hace el logo.
- **Casi sin JavaScript.** El menú de celular es checkbox + label, y las
  tarjetas que giran y los carruseles son CSS. **El selector de idiomas
  tampoco usa JS**: es un `<details>` con enlaces a la misma página en otra
  carpeta. Hay exactamente **dos** excepciones, las dos decididas
  explícitamente con el cliente, y ninguna sirve de precedente:
  `assets/js/reserva.js` (solo en `reservas.html`; la integración con
  Shopify no se puede hacer sin JS) y `assets/js/idioma.js` (en todas; la
  sugerencia de idioma no se puede hacer sin JS en un sitio estático).
  **Para interfaz no se usa JavaScript.**
- El menú de celular **sí existe acá** (hamburguesa bajo 920px). El landing de
  socios no tiene: ahí el menú simplemente desaparece bajo 900px.
- **El sitio público vende DOS experiencias, el landing sigue con CUATRO**
  (decidido el 2026-09-16). En el sitio público son **Tradiciones $44.000** y
  **A Brasas abiertas $60.000**; esta última lleva la descripción de la
  experiencia "Brasas" del landing, pero a $60.000 en vez de $70.000. "Lo
  Pirque" y "Sommelier" se sacaron del sitio público.
- **Ojo con eso:** la misma experiencia tiene dos precios según el entregable.
  Es intencional por ahora, pero es la clase de cosa que una agencia puede
  notar. El precio del arriendo sí sigue igual en ambos lados.

### Trampas de layout ya resueltas (no las reintroduzcas)

- `aspect-ratio` en un contenedor flex **no** fija la altura si adentro hay una
  `<img>` con `height:100%`: la referencia es circular y gana el alto natural
  de la foto. Por eso la razón va en la propia `<img>` (`.card-photo img`).
- En un `.split`, una foto vertical arrastra el alto de toda la fila (llegó a
  1138px). Por eso la `<img>` va `position:absolute` y no aporta altura.
- `calc(18px + env(safe-area-inset-bottom))` no parsea en todos los motores y
  tumba la declaración entera. Va detrás de un `@supports`.
- **`height:auto` en un `<svg>` inline es una bomba**: si el motor no
  resuelve la razón (por `aspect-ratio` o por el `viewBox`), el elemento
  cae a su tamaño por defecto, **300×150**. En el selector de idiomas eso
  se veía como banderas gigantes en escritorio. A un `<svg>` inline se le
  dan medidas explícitas en el CSS *y* como atributos.
- **La esquina inferior derecha ya está ocupada** por el botón flotante de
  WhatsApp (`.wa-float`, 52px a 18px del borde; 48px a 14px bajo 600px).
  Cualquier cosa nueva que se ancle ahí lo tapa. La tarjeta de sugerencia de
  idioma va por encima (`bottom:82px`, y 72px bajo 600px), con la misma
  guarda `@supports` del punto anterior.

## Landing de socios (`landing-afiliados.html`)

- Es **el único archivo** de ese entregable y el que hay que editar: HTML con
  el CSS inline en un solo `<style>`. Desde el 2026-09-16 carga un único
  script externo, `assets/js/idioma.js`, que es la sugerencia de idioma; no
  tiene JavaScript propio ni inline.
- **Las imágenes ya no van embebidas.** Antes eran 46 payloads base64 y el
  archivo pesaba 5,12 MB; ahora son referencias a `assets/` y pesa 48 KB. Un
  visitante descarga 376 KB al llegar en vez de 5,12 MB, porque todo lo que
  no entra en la primera pantalla va con `loading="lazy"`. Las únicas dos sin
  lazy son el logo de la cabecera y la foto del hero.
- **Por eso mismo ya no se abre con doble clic desde cualquier parte:**
  necesita la carpeta `assets/` al lado. Se decidió así el 2026-09-16 porque
  las agencias llegan por link, no por correo. Si alguna vez hay que mandarlo
  por correo, hay que volver a embeber o mandar un zip con `assets/`.
- **No hay toolchain**: no hay npm, bundler, linter ni tests. No agregues uno
  salvo que el cliente lo pida.
- **`assets/`** guarda los originales ya procesados de esas fotos, por si hay
  que re-embeber o recortar alguna:
  - `assets/imgs/` — extraídas del PDF de presentación original
    (`EMPRESAbrasas26.pdf`, ya no disponible; solo quedan estas imágenes).
  - `assets/imgs2/` — sacadas del Google Drive del cliente (comida, show
    ecuestre alternativo).
  - `assets/gallery/` — las 27 fotos del carrusel "Date una vuelta por el lugar".
- Si hacen falta **más fotos del lugar**, están en el Google Drive del cliente,
  bajo `BRASAS fotos`: `LOPIRQUE clientes`, `LOPIRQUE publico`, `LOPIRQUE
  entorno`, `LOPIRQUE show`, `LOPIRQUE parrilla`, `LOPIRQUE Folcklore`.
  **Ojo: desde este entorno se pueden listar pero no descargar.** El proxy
  bloquea `drive.google.com` y `googleusercontent.com` con 403, y la
  herramienta de descarga del conector devuelve la foto en base64 dentro de la
  conversación, que para archivos de 1 a 3 MB no es viable. Hay que pedirle al
  cliente que las suba al repo (GitHub → Add file → Upload files).

### Editar el HTML

Ya no tiene la trampa de los 5 MB: son unas 850 líneas de HTML legible y se puede
abrir entero. Si vuelves a embeber imágenes en base64 por algún motivo,
vuelven las precauciones de antes (no leerlo entero, filtrar los payloads con
`sed 's/data:image\/[a-z]*;base64,[A-Za-z0-9+\/=]*/[B64]/g'` antes de mirarlo,
y operar solo fuera de los payloads).

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

## Reserva en línea (Shopify + Cowlendar)

`reservas.html` crea el carrito con la **Storefront API** y manda al checkout
de Shopify. Cowlendar es la app de reservas instalada en la tienda: registra
la reserva en su calendario cuando entra la orden.

- **Toda la configuración vive en el objeto `CONFIG`** al inicio de
  `assets/js/reserva.js`: token, dominio, versión de API y los dos precios.
- **Las fechas y los IDs de variante viven en el HTML**, en los `data-adulto`
  y `data-nino` de cada `<option>` de `#r-fecha`, y el `value` es la fecha en
  formato `YYYY-MM-DD`. Se hizo así para que el desplegable siga siendo
  correcto aunque el JS no cargue, y para tener un solo lugar que editar.
  **Agregar fechas nuevas = agregar `<option>`s, no tocar el JS.**
- Cowlendar necesita dos propiedades por línea: `_booking_date` y
  `_cowlendar_date`, ambas con la fecha. El guion bajo las oculta del
  checkout.
- Si `niños = 0` la línea de niños no se agrega: `quantity: 0` hace fallar la
  mutation.
- **El token de Storefront es público por diseño** (solo lee catálogo y crea
  carritos), así que puede vivir en el archivo. **Un token de Admin API
  jamás**: esos empiezan en `shpat_` y dan acceso a pedidos y clientes.
- El botón nace `disabled` en el HTML y el JS lo habilita, para que nadie
  apriete un botón muerto si el archivo no carga. Hay un `<noscript>` que
  manda a WhatsApp.

### EN PAUSA — esperando la tienda de desarrollo (2026-09-16)

**Lo que está en el repo es una primera pasada y va a cambiar.** El plan
acordado con el cliente:

1. Esperar a que vuelva el dueño de la organización en Shopify.
2. Crear una **tienda de desarrollo** desde su cuenta.
3. Implementar la integración paso a paso ahí, y recién después producción.

No avances la integración por tu cuenta mientras tanto: los cambios vienen
desde esa tienda, no desde acá.

**Mergear el código actual es seguro.** Sin token, el botón no llama a la API:
muestra un aviso y manda a WhatsApp. Está verificado.

### El cambio de diseño ya acordado, para cuando se retome

Hoy los 20 IDs de variante están escritos en el HTML de `reservas.html`. Una
tienda de desarrollo trae **su propio dominio, su propio token y sus propios
IDs**, así que esos números no sirven allá, y los de allá tampoco sirven en
producción: habría que cambiarlos a mano dos veces.

**Acordado con el cliente: invertir eso.** Que el JS le **pida las variantes a
Shopify al cargar** en vez de tenerlas escritas. Entonces lo único que cambia
entre ambientes son dos líneas —`CONFIG.dominio` y `CONFIG.token`— y de paso
se arregla solo el problema de las fechas que vencen, porque la lista sale de
la tienda y no de un HTML que alguien tiene que acordarse de editar.

No se hizo antes porque sin token no se puede ver cómo están armadas las
opciones del producto, y habría sido adivinar la estructura.

### Lo que hay que verificar con la tienda de desarrollo en pie

- **Que Cowlendar acepte reservas creadas por fuera de su propio widget.**
  Es el supuesto más grande de toda la integración: la app normalmente valida
  disponibilidad ella misma, y acá el carrito se crea saltándose ese paso.
  Hay que hacer una compra de prueba y confirmar que la reserva aparece en el
  calendario de Cowlendar. Si la ignora, la reserva se cobra y no queda
  agendada, que es el peor error posible acá.
- Que la Storefront API responda en el dominio configurado. Si da 404 o CORS,
  hay que usar el `*.myshopify.com` de la tienda.
- Que el cupo por fecha se controle en alguna parte. Hoy nada impide vender
  más lugares de los que hay: eso lo tiene que hacer el inventario de Shopify
  o Cowlendar.

### Pendiente conocido: fechas vencidas

Las diez fechas del `<select>` son de septiembre 2026 y **cuatro ya pasaron**
(5, 6, 12 y 13). El cliente decidió el 2026-09-16 **no** agregar un filtro
provisorio, porque el arreglo de fondo es el cambio de diseño de arriba. Si
alguien pregunta por qué el formulario ofrece fechas pasadas, es esto.

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

- **Las fotos con niños están autorizadas** (confirmado por el cliente el
  2026-09-04). Los niños que aparecen son los suyos, los de su hermano y otros
  familiares, así que hay permiso de imagen. La restricción anterior —que dejó
  castillo inflable, ping-pong/tacataca y beach tenis **sin foto**— ya no rige:
  esas tres se pueden ilustrar en cuanto las imágenes estén en `assets/`.
- Esto vale para las fotos del propio negocio. Si algún día aparece una con
  clientes que no son de la familia, vuelve a preguntar antes de publicarla.
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

## Objetivo comercial del sitio público — importante

**La visita particular debe reservar y pagar por Shopify, no por WhatsApp.**
Quien llega por iniciativa propia (no por una agencia) tiene que poder cerrar
la reserva pagada en el sitio. No queremos que ese público nos escriba por
WhatsApp para coordinar: eso consume tiempo del equipo y no deja la reserva
tomada.

- El plan es **contratar o instalar un sistema de reservas pronto**. Todavía
  no existe, pero se da por venir, así que el diseño ya apunta a eso.
- Por eso `reservas.html` abre con el formulario de reserva y no con
  WhatsApp. La maqueta de esa sección está en el sitio esperando conexión.
- **WhatsApp sigue siendo el canal del landing de socios** (agencias,
  municipalidades, empresas), donde sí se cotiza conversando. Los dos números
  son distintos y esa separación es justamente esta: público general al
  formulario, socios comerciales a WhatsApp.
- Mientras el pago no funcione, WhatsApp queda como salida de emergencia en
  el sitio público, pero **en letra chica y sin protagonismo**. Al conectar el
  sistema de reservas hay que revisar cuánto espacio conserva.

## Diferencia entre los dos entregables

El sitio público vende a familias y grupos chicos; el landing de socios, a
agencias que compran por grupo. Por eso:

- El landing dice **"sobre 25 personas"** en las cuatro tarjetas. Correcto ahí.
- El sitio público **no** lo dice, y dice "por adulto". Tenerlo era un error:
  le decía a una familia de seis que no podía reservar.
- El landing ofrece **cuatro** experiencias (Tradiciones $44.000 / Lo Pirque
  $50.000 / Brasas $70.000 / Sommelier $90.000). El sitio público ofrece
  **dos** (Tradiciones $44.000 / A Brasas abiertas $60.000). Ver arriba.

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
- ~~`contacto.html` podría renombrarse~~ — **hecho el 2026-09-16**: la página
  es `reservas.html`. Queda un `contacto.html` de una pantalla que redirige
  con `<meta http-equiv="refresh">`, para no romper enlaces ya compartidos.
  Se puede borrar cuando deje de llegar tráfico por ahí.

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

**Junta los cambios; el PR lo pide el cliente.** Commitea y empuja a la rama
a medida que avanzas, para que nada se pierda si se cae el contenedor, pero
**no abras un PR hasta que te lo pidan**. Cuando haya un lote que valga la
pena mergear, avisa y deja que decidan.

Ojo con el orden: el cliente suele mergear el PR abierto antes de que llegue
el commit siguiente. Si el PR de esta rama ya está mergeado, lo que quede
pendiente va rebasado sobre el `main` nuevo y en un PR propio —
`git fetch origin main && git rebase origin/main`, y empujar con
`--force-with-lease`. Nunca apiles commits nuevos sobre historia ya
mergeada.
