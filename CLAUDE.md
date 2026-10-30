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

### La versión de los assets (`?v=`), que no es decorativa

Cada `<link>` y `<script>` de `assets/` va con `?v=<hash del archivo>`, y
**ese hash lo pone el script**, sacado del contenido del archivo. Es lo
único que `traducir.py` le escribe a los archivos españoles de la raíz.

Arregla un error real y feo del 2026-10-14. Se publicó un `reserva.js`
nuevo junto a un `reservas.html` nuevo, pero los navegadores que ya habían
entrado antes siguieron usando **el JS viejo**, que buscaba elementos que
ese HTML ya no tenía. Se devolvía antes de dibujar el calendario y antes de
conectar un solo botón: **el calendario desaparecía y los `+`/`−` no hacían
nada, sin un error en consola**, porque el JS viejo no fallaba, simplemente
se iba. A quien no había entrado nunca le funcionaba perfecto, que es lo
que hace difícil de ver este tipo de error.

Con la versión en la URL no puede volver a pasar: si el archivo cambia, su
URL cambia, y ningún navegador puede servir el de antes. Si no cambia, la
URL es la misma y la caché se sigue aprovechando.

**El hash sale del contenido, no de un número a mano.** Un número a mano es
justo lo que alguien olvida subir, y el olvido se ve recién en producción.
Por lo mismo, **tocar el CSS o el JS ahora obliga a correr
`python3 tools/traducir.py`**, igual que tocar el HTML: `--revisar` lo
delata nombrando las páginas con la versión vieja.

### El flujo de trabajo, que es lo único que hay que recordar

1. Editas el español en la raíz, como siempre. **O el CSS, o el JS**: la
   versión de los assets también sale de ahí.
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
números, teléfonos, correos, dominios, URLs y la puntuación suelta —ahí
entran el `+` y el `−` de los contadores del formulario de reserva—. Los nombres propios
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

### Lo que no sigue al idioma de la página

- **El checkout de Shopify, que sale en español y no sigue a la página.**
  El formulario de reserva se traduce, pero el checkout tiene su propio
  idioma, fijado en la tienda. **Hoy sale en español para todos**: redirige
  a `/checkouts/cn/<token>/es-us`, probado con `Accept-Language` en es-CL,
  en-US, pt-BR y sin cabecera — los cuatro dan `es-us`. Un visitante que leyó
  el sitio en inglés paga en español, y eso es lo que hay.

  **Vale la pena saber que esto cambió dos veces en un día**, porque es el
  motivo para volver a mirarlo cada vez que se toque la tienda: el
  2026-10-13 venía con `/es/`; el 2026-10-22 en la mañana salía en **`en-us`**
  —o sea, un cliente chileno pagando en inglés—, y esa misma tarde el cliente
  lo dejó en español. **Nadie tocó el sitio en el intertanto**: es
  configuración de Shopify, se cambia sola y no avisa. Si alguna vez hay que
  servirlo en tres idiomas de verdad, eso es Shopify Markets.
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
- El menú son 4 ítems: **Reserva** (botón dorado relleno, la acción
  principal) · Experiencias · Actividades · Eventos. No hay ítem "Inicio":
  eso lo hace el logo.
- **Socios comerciales y Promociones viven en el pie, no en el menú**
  (2026-10-15), apilados como dos botones delineados y en ese orden. Son
  otros públicos, no pasos del recorrido normal: el menú de arriba quedó
  para quien vino a pasar el día. Las reglas `.nav-socios` se borraron.
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
  **A Brasas abiertas $70.000**, que lleva la descripción de la experiencia
  "Brasas" del landing. "Lo Pirque" y "Sommelier" se sacaron del sitio
  público.
- Esa segunda estuvo un tiempo a $60.000 por una decisión de presentación,
  lo que dejaba la misma experiencia con dos precios según el entregable.
  **Eso se acabó el 2026-10-13**: manda Shopify, y ahí vale $70.000, igual
  que en el landing. Los precios coinciden hoy en los dos entregables.

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

- **Ese entregable son hoy dos archivos**, no uno: `landing-afiliados.html`
  y `promociones.html` (ver abajo). Cada uno con su CSS inline en un solo
  `<style>`, y ese es el archivo que hay que editar. Desde el 2026-09-16 carga un único
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

**Las tipografías ya salen de verdad** (desde el 2026-10-22, cuando el
cliente abrió `fonts.googleapis.com` y `fonts.gstatic.com` en Network
access): una captura carga Fraunces y Work Sans en vez del fallback, así que
ahora sirve para juzgar la tipografía y no solo el layout. Si alguna vez
vuelven a salir en fallback, es el acceso del entorno y no la página.

## Landing de promociones (`promociones.html`)

Nació el 2026-10-15 como copia del landing B2B, **sin el bloque de comisiones
y con todo lo demás igual**. Existe para que las campañas tengan dónde
aterrizar sin mezclarse con el programa de socios.

- **La cabecera es lo único que cambia de campaña en campaña**: el titular,
  la bajada y el mensaje prellenado del WhatsApp. Está marcada con un
  comentario grande en el archivo para que no haya que buscarla.
- **Es una sola página, no una por campaña** (decidido el 2026-10-15). Las
  campañas se distinguen con **parámetros UTM en el anuncio**, que es lo
  estándar para medir y no obliga a duplicar 980 líneas por cada una. La
  contra a asumir: **no sirve para dos promociones distintas vivas al mismo
  tiempo**. Si eso llega a hacer falta, lo que corresponde es generarlas con
  un script desde un archivo de datos, como `traducir.py` genera `en/` y
  `pt/` — nunca copiando el HTML a mano.
- **El texto que trae hoy es el neutro**, el que sirve sin campaña corriendo:
  "Promociones / Escríbenos y te contamos qué promociones hay vigentes." No
  inventa ninguna oferta a propósito, porque las ofertas son dato del cliente.
- Usa el **WhatsApp de Eventos** (`+56 9 3385 8575`), igual que el landing
  B2B, con su propio mensaje prellenado.
- El CSS de los paneles de comisión **se borró de este archivo**, no se dejó
  muerto: el `<style>` es inline y propio de cada página.
- Está enlazada desde el pie del sitio público y registrada en `PAGINAS` de
  `tools/traducir.py`, así que son **9 páginas × 3 idiomas = 27**.

## Reserva en línea (Shopify + sistema propio)

`reservas.html` crea el carrito con la **Storefront API** y manda al checkout
de Shopify.

**Cowlendar quedó descartado el 2026-10-13.** En su lugar se construye un
sistema propio: **Shopify cobra, nosotros agendamos.** El código vive en
`panel/`, una aplicación Next.js desplegada en Vercel, sobre una planilla
del cliente. Ver `panel/DESPLIEGUE.md`.

**La razón del descarte, anotada el 2026-10-15 porque no estaba escrita en
ninguna parte:** Cowlendar no tiene un widget integrable al 100% con el
diseño del sitio, ni una API integrable al 100% —según el agente de Shopify
del cliente—, y el cliente no encontró ninguna otra app de reservas que
cumpliera el requisito de integrarse por API.

Vale la pena tenerlo presente porque **ese criterio no es sobre Cowlendar, es
sobre todas las apps de reservas**: el sitio es estático, con identidad
visual propia y la regla de cero JS para interfaz. Un widget de terceros en
medio de `reservas.html` rompe las tres cosas. Así que la pregunta "¿y si
mejor instalamos una app?" ya está contestada, y seguirá contestada mientras
el requisito sea integración por API — salvo que aparezca una app que la dé
de verdad, cosa que conviene volver a mirar antes de pagar por cualquiera.

### La costura con el backend, que es lo que mantiene abiertas las puertas

El sitio habla con el backend por **un solo punto**: `CONFIG.backend`, una URL
que devuelve JSON. Y de esa respuesta consume **tres campos y nada más**:

```
{ fecha, quedan, pocos }     más un campo `error` si algo falló
```

Eso significa que **cambiar de backend es cambiar esa URL** —más permitir
CORS en el nuevo endpoint—, sin tocar una línea del sitio. Conviene no
engordar ese contrato sin pensarlo: cada campo que se agregue es un campo que
cualquier reemplazo futuro tendrá que imitar.

Por lo mismo, cada línea del carrito sigue mandando `_cowlendar_date` además
de `_booking_date`, aunque hoy no la lea nadie. No es código muerto: es la
puerta cableada por si alguna vez se vuelve a una app de reservas.

**El momento más barato para cambiar de backend es antes de difundir el
sitio**, que es cuando no hay reservas reales que migrar ni plata en juego.
Después sigue siendo posible; deja de ser gratis.

El reparto queda así:

| | Quién |
|---|---|
| Cobro y checkout | Shopify |
| Calendario, cupo y registro | El panel (`panel/`), sobre la planilla |
| Panel de administración | `panel/`, una app Next.js en Vercel |
| Agenda visible | Google Calendar, escrito por el panel |

### El Apps Script se jubiló (2026-10-21)

Ya no existe. Lo reemplazó `panel/` por completo, incluida la escritura a
Google Calendar, que fue lo último en portarse. El porqué largo está en
`backend/README.md`; lo que hay que saber acá es esto:

**Hubo un tiempo con DOS planillas que no se hablaban**, y conviene saberlo
porque explica medio archivo: el Apps Script usaba una, con pestañas
`Reservas` y `Excepciones`, y el panel otra, con `Reservas` y `Fechas
Hábiles`. El sitio obedecía al Apps Script. O sea que cerrar un día en el
panel no llegaba al cliente final, y las reservas de Shopify no aparecían en
el panel. Se decidió que sobreviviera el panel y se partió limpio: no se
migraron datos porque las reservas que había eran de prueba.

**Por qué el Apps Script consultaba a Shopify en vez de recibir un webhook:**
los Web Apps **no dan acceso a las cabeceras** de la petición, así que era
imposible verificar la firma HMAC con la que Shopify firma sus webhooks. Sin
eso, cualquiera que descubriera la URL podría inventar reservas.

**Ese impedimento era de la plataforma, no de la idea.** En Vercel sí hay
cabeceras, así que el panel **sí usa webhooks** y verifica la firma
(`panel/src/lib/firma.ts`). Pero no solo webhooks: copiar la consulta cada 5
minutos tampoco era opción, porque **el plan gratuito de Vercel solo permite
tareas una vez al día**. Quedaron las dos cosas —webhook para inmediatez,
reconciliación diaria para rellenar lo perdido— que es más robusto que
cualquiera de las dos sola. Ver `panel/DESPLIEGUE.md`.

**El token de Admin API del panel no contradice la regla de este proyecto.**
"Un token de Admin API jamás" es sobre el **sitio**, donde quedaría en un
archivo público. En el panel es una variable de entorno de Vercel, del lado
del servidor, que nunca sale al navegador.

- **Toda la configuración vive en el objeto `CONFIG`** al inicio de
  `assets/js/reserva.js`: token, dominio, versión de API y la URL del
  backend. Los precios ya no están ahí, se fueron al HTML.
- **`CONFIG.backend` apunta al panel** desde el 2026-10-21:
  `https://landing-pirque-alpha.vercel.app/api/publico/fechas`. Antes era el
  Web App de Apps Script. Si el panel cambia de URL en Vercel, hay que
  cambiar esa línea **y volver a correr `tools/traducir.py`**, porque toca
  el JS y con eso cambia el `?v=` de las tres páginas de reserva.
- **La versión de la API es `2026-10`** (antes `2024-10`, vencida), tanto en
  el sitio como en el panel. Confirmada con el agente de Shopify del
  cliente, que primero recomendó `2025-01` — esa lleva como un año fuera de
  soporte. Shopify soporta cada versión unos 12 meses; la `2026-10` hasta
  octubre de 2027.
- **`cargarFechas()` revisa el campo `error` además de `response.ok`.** Hoy
  el panel sí devuelve un 500 de verdad, pero el campo se mantiene: venía de
  que un Web App de Apps Script responde 200 aunque falle, y conservarlo no
  cuesta nada y cubre al próximo backend que tenga esa limitación. Sin
  revisarlo, una falla se vería en pantalla como "no hay fechas", que es
  otra cosa y manda a buscar el problema donde no está.
- **`CONFIG.token` es el interruptor de toda la integración, y está
  encendido desde el 2026-10-14.** Lo decidió el cliente para poder probar
  la cadena completa mientras el sitio todavía no se difunde: el token del
  Storefront es público por diseño, así que vivir en el archivo no es el
  problema; el problema es a qué tienda apunta. **Apunta a la de
  desarrollo**, o sea que quien apriete "Terminar reserva" hoy cae en un
  checkout que no puede cobrarle. Con el token en blanco, en cambio, el
  botón no llama a la API: avisa y manda a WhatsApp.
- **Antes de difundir el sitio hay que cambiar las tres cosas juntas**:
  el token, `CONFIG.dominio` y los IDs de variante del HTML. Cambiar una
  sola deja el formulario apuntando a medias y falla en el checkout, que es
  el peor lugar para fallar. **Y antes que eso hay que crear allá el modelo
  de seis variantes**, que hoy no existe: ver "La tienda de producción,
  mirada por su catálogo público".
- **`CONFIG.dominio` apunta hoy a la tienda de desarrollo**
  (`brasas-de-lo-pirque-development.myshopify.com`). Al salir a producción
  hay que cambiar esa línea, el token, **y los IDs de variante del HTML**,
  porque en producción son otros.
- **Las variantes ya no son una por fecha** (cambió el 2026-10-13, con la
  tienda de desarrollo en pie). Antes eran 20: diez fechas × adulto/niño.
  Ahora son **seis: tres menús × dos modalidades**, y la fecha no elige
  variante: **viaja como propiedad de línea** para que Cowlendar la
  registre. El modelo se simplificó solo.
- **Las tres opciones van visibles a la vez, cada una con su contador**
  (2026-10-14). Antes era un desplegable y un solo menú por pedido, lo que
  dejaba fuera algo tan corriente como tres personas con Tradiciones y dos
  con A Brasas abiertas. Ahora cada fila `[data-opcion]` es una línea del
  carrito y las que quedan en cero no se agregan.
- **Los contadores son botones de 44px, no las flechitas del
  `<input type=number>`**, que son de unos 10px y en celular no se aciertan.
  El input sigue debajo y se puede escribir: los botones son una comodidad
  encima, no el único camino, y `recalcular()` normaliza lo que se escriba.
- **El menú de niños se puede pedir solo** (decidido por el cliente el
  2026-10-14). No hay mínimo de adultos: un pedido de tres menús de niños y
  nada más es válido. Lo único que el formulario no deja es el pedido
  vacío.
- **Los IDs de variante y los precios viven en el HTML**, no en el JS: cada
  fila `[data-opcion]` lleva **dos pares** —`data-variante`/`data-precio`
  para pagar en línea y `data-variante-local`/`data-precio-local` para pagar
  en el local—. Se hizo así para tener un solo lugar que editar al pasar a
  producción, donde los IDs son otros.
- **Las dos modalidades son dos botones, cada uno con su propio total**
  —"Pagar ahora $177.000" / "Solo reservar $197.000"— y no un selector
  (2026-10-14). Así la diferencia de precio se ve sin tener que cambiar
  nada primero, que es justo lo que obliga un selector. Cuál se apretó
  decide qué variante va al carrito: la modalidad es un argumento
  (`lineas(modo)`), no un estado guardado que haya que mantener
  sincronizado con lo que la persona ve.
- **Las filas muestran el precio de pagar en línea**, que es el que anuncia
  el resto del sitio (`experiencias.html` dice $44.000). El recargo de
  pagar en el local **no está escrito como número en ninguna parte**: sale
  de restar los dos totales de los botones, así que no se puede quedar
  viejo si mañana cambia un precio en la tienda.
- **Apretar uno apaga los dos** mientras se crea el carrito. Dejar vivo el
  otro dejaría crear dos carritos seguidos y la persona terminaría en el
  checkout del segundo sin entender por qué cambió el precio.
- **Las reservas sin pagar se anotan igual y toman cupo** (2026-10-14). El
  panel no filtra por `financial_status=paid`.
  Una cancelada libera su cupo, una por pagar no.
- **Los webhooks de Shopify apuntan al panel**, a
  `/api/shopify/webhook`. Si aparece alguno apuntando al Web App viejo de
  Apps Script, se borra: esa URL ya no existe, y Shopify igual lo daría por
  entregado porque Apps Script respondía 200 aunque la función no existiera.
- **`order.phone` viene vacío casi siempre.** El checkout pide el teléfono
  dentro de la dirección, así que el número está en
  `billing_address.phone`. `telefonoDe()` mira los cuatro lugares.
- **`read_orders` no alcanza para el nombre y el correo del cliente.**
  **Confirmado contra la tienda el 2026-10-14** con
  `probarDatosDelCliente()`: el pedido #1007 llegó con sus tres líneas y su
  total, y sin nombre, correo ni teléfono. Shopify los trata como datos
  protegidos y hay que pedirlos aparte en la configuración de la app.
- **En la tienda de desarrollo eso no se puede arreglar**, según el agente
  de Shopify del cliente: el permiso necesita plan pagado. **No bloquea
  nada** — todo lo demás funciona y las tres columnas se llenan solas en
  producción, sin tocar código. Y **no es salida** consultar el Admin API
  "en vez del webhook": el backend ya consulta el Admin API, no hay
  webhook, y fue esa llamada la que devolvió el pedido censurado. El
  permiso gobierna el dato, no la puerta.
- **La censura se ve OMITIENDO la llave, no poniéndola en `null`** — al
  revés de lo que uno supondría, y vale la pena saberlo porque es lo que
  distingue "falta un permiso" de "ese pedido no tenía el dato". En #1007,
  `shipping_address` vino en `null` (correcto: una reserva no tiene envío)
  mientras que `customer` y `billing_address` traían datos **sin las
  llaves** de nombre, correo y teléfono.
- **El panel de administración es una página aparte** (`panel/`, en
  Vercel), y antes vivía dentro de la planilla. Se cambió el 2026-10-21: una
  pestaña de Sheets no puede tener botones, los diálogos HTML de Apps Script
  daban problemas, y hubo funciones que nunca aparecieron en el menú sin que
  se supiera por qué. Ver `backend/README.md`.
- **El panel no usa una pestaña `Excepciones`.** El Apps Script armaba las
  fechas con una regla más excepciones, para no escribir 104 filas al año;
  el panel usa `Fechas Hábiles`, una fila por día. Es más simple de leer
  para una persona y el volumen no molesta, pero vale saber que el modelo
  cambió: la planilla vieja no sirve tal cual.
- **Una reserva a mano lleva `ID Orden` = `MANUAL-…`.** No es cosmético: el
  sincronizador usa esa columna para saber qué pedidos ya anotó, y los ids
  de Shopify son números, así que no pueden chocar.
- **Una reserva a mano SÍ lleva monto** (cambió el 2026-10-21). Antes no,
  con el argumento de que los precios viven en Shopify. Eso vale para un
  pedido de Shopify, que trae su total y ese manda; pero en una reserva a
  mano no hay pedido de dónde sacarlo, así que no son dos verdades, es la
  única que hay. Sale de los precios de la pestaña `Menús` según la
  modalidad, y se puede corregir.
- **El panel y el sitio salen de la misma ocupación**, y el sitio recibe
  deliberadamente menos: solo fecha, lugares que quedan y si son pocos.
  Cuánta gente reservó, cuánto pagó, cuánto hay que cobrar y el tamaño del
  local no son datos de un visitante. El recorte vive en
  `panel/src/lib/publico.ts` y hay una prueba que lo fija.
- **Los encabezados de la planilla se buscan por nombre, sin distinguir
  mayúsculas ni tildes.** Un `Menu` escrito a mano encuentra a `Menú`. Y
  los nombres de pestaña en la API de Sheets **sí** distinguen mayúsculas,
  así que `nombreReal()` resuelve el título verdadero una vez. Si algo no
  calza, el modo de falla natural es quedarse callado —la columna se lee
  vacía y el panel se ve bien con datos que no están— y por eso existe
  `/api/diagnostico`, que dice columna por columna qué faltó.
- **Esa lista de pestañas se recuerda, y una que no esté en lo recordado se
  vuelve a buscar antes de darla por inexistente** (2026-10-22). No es una
  precaución teórica: así se rompió el planificador de equipo. El panel corre
  en varias instancias en Vercel y cada una recuerda lo suyo mientras vive;
  la que creó la pestaña `Turnos` la primera vez no es la misma que atiende
  la petición siguiente. Para una instancia con la lista vieja, esa pestaña
  **no existe**: leer turnos devolvía vacío en silencio —el día se veía sin
  equipo aunque estuviera guardado— y guardar reventaba con `addSheet: A
  sheet with the name "Turnos" already exists`, la pestaña que la planilla ya
  tenía. Volver a mirar cuesta una llamada y solo cuando no se encontró.
- **Un lector con valor por defecto distingue "no existe la pestaña" de "no
  pude leerla"** (`esPestanaQueNoExiste()`). Puestos, trabajadores y turnos
  devuelven su defecto solo en el primer caso; cualquier otra falla se
  propaga. Devolver "no hay trabajadores" cuando en realidad no se pudo leer
  manda a buscar el problema donde no está, y además deja guardar la lista
  encima de una que nadie alcanzó a leer.
- **La fecha se elige en un calendario mensual**, no en un desplegable
  (2026-10-13). Lo dibuja `reserva.js` con lo que entrega el backend, y la
  fecha elegida queda en el input oculto `#r-fecha`. **El sitio no decide
  qué días se abren**: si lo hiciera habría dos lugares con la verdad.
- **El calendario es interfaz hecha con JavaScript, y eso cruza la regla del
  proyecto.** Vive dentro de `reserva.js`, que ya era la excepción de esa
  página, y no sienta precedente. La consecuencia a asumir: **la página de
  reserva dejó de funcionar sin JavaScript.** El `<noscript>` manda a
  WhatsApp. En un sitio estático no hay forma de tener fechas al día sin JS,
  y fechas vencidas son peores que ninguna.
- **Las fechas se tratan como texto `AAAA-MM-DD` de punta a punta**, nunca
  como objetos `Date`. No es purismo: convertirlas en algún paso hace que
  una reserva hecha de noche en Chile, o desde Brasil, caiga en el día
  equivocado. Ese error aparece en una de cada tantas reservas, que es la
  peor forma de aparecer.
- Los nombres de mes y de día **no están en los diccionarios**: salen de
  `toLocaleDateString` con el idioma de la página. La semana parte en lunes
  en los tres idiomas, que es la convención chilena.
- **El botón solo se habilita con una fecha elegida, al menos una persona
  y lugares suficientes.** Pedir más lugares de los que quedan lo apaga y lo
  dice. Es preferible a dejar apretar y fallar en el checkout.
- Cada línea del carrito lleva dos propiedades con la fecha:
  `_booking_date` y `_cowlendar_date`. El guion bajo las oculta del
  checkout. **Se mantienen las dos aunque Cowlendar ya no esté**: el backend
  lee `_booking_date`, y la segunda queda por si alguna vez se vuelve a una
  app de reservas. Es la única forma en que la fecha llega al pedido, porque
  las variantes no la tienen.
- Si `niños = 0` la línea de niños no se agrega: `quantity: 0` hace fallar la
  mutation.
- **El token de Storefront es público por diseño** (solo lee catálogo y crea
  carritos), así que puede vivir en el archivo. **Un token de Admin API
  jamás**: esos empiezan en `shpat_` y dan acceso a pedidos y clientes.
- El botón nace `disabled` en el HTML y el JS lo habilita, para que nadie
  apriete un botón muerto si el archivo no carga. Hay un `<noscript>` que
  manda a WhatsApp.

### Las variantes de la tienda de desarrollo (2026-10-13)

Las entregó el agente de Shopify del cliente. **Son de la tienda de
desarrollo, no de producción**: en producción los IDs son otros.

| Menú | Pago directo | Solo reserva |
|---|---|---|
| Tradiciones | `50684108013785` — $44.000 | `50684108046553` — $49.000 |
| A Brasas abiertas | `50684143173849` — $70.000 | `50684143206617` — $75.000 |
| Niños | `50684218081497` — $19.000 | `50684218114265` — $24.000 |

**El sitio ofrece las dos columnas desde el 2026-10-14.** Lo que significan
lo aclaró el cliente ese día:

- **Pago directo** — paga en línea en el checkout de Shopify, con el precio
  con descuento.
- **Solo reserva** — reserva ahora y paga en el local. Cuesta **$5.000 más**
  en los tres menús, que es el recargo por no pagar por adelantado.

El cliente agregó el método de pago "pago en el local" en Shopify, que es lo
que hace posible la segunda.

**Quién puede pagar cómo lo decide el checkout, no el sitio.** El medio de
pago se elige en el checkout de Shopify, así que el sitio no puede impedir
que alguien compre la variante con descuento y después elija pagar en el
local. Eso lo cierra la tienda: **el cliente configuró reglas que ocultan
los medios de pago según el SKU del carrito** (2026-10-14).

**Esa regla es del lado de Shopify y si deja de aplicar no avisa**: en el
checkout simplemente aparecen otra vez los dos medios. Por eso la planilla
sigue anotando la modalidad comprada junto al estado del pago: una fila que
diga **"Pago directo / por pagar"** significa que la regla no aplicó, y es
la única forma de enterarse. Conviene comprobarla con una compra de prueba
de cada tipo cuando se toque algo de la tienda.

**El $45.000 de Tradiciones de la tabla de más arriba era un dato equivocado
del agente**, y por eso esta nota decía antes "$4.000 a $5.000 más". Con el
precio real, $44.000, la diferencia son $5.000 parejos en los tres.

El cliente decidió el 2026-10-13 que en los precios **manda Shopify**, y por
eso **A Brasas abiertas subió de $60.000 a $70.000** en el sitio público,
que es lo que dice la tienda y lo que ya decía el landing B2B. Con eso
desaparece la diferencia de precio entre los dos entregables.

**Los tres montos coinciden hoy**: tienda, sitio público y landing.

### La tienda de producción, mirada por su catálogo público (2026-10-22)

Con `brasasdelopirque.cl` alcanzable se pudo mirar **la tienda de verdad**,
sin credenciales: Shopify publica el catálogo en `/products.json` y
`/products/<handle>.js`. Esto era dato que faltaba para el cambio a
producción, y cambia lo que hay que preparar.

- **El dominio de producción es `lo-pirque.myshopify.com`** (shopId
  63433277497, moneda CLP). Es el que hay que poner en `CONFIG.dominio` al
  salir. Los otros `*.myshopify.com` que aparecen en el HTML del sitio viejo
  son de apps de terceros incrustadas en el tema, no de la tienda.
- **Hay un solo producto publicado: "Menú Tradiciones", con 39 variantes**
  —13 fechas × 3 tipos—, que es el modelo viejo de una variante por fecha.
  O sea: **"A Brasas abiertas" no existe como producto publicado en
  producción**, y el modelo de seis variantes (3 menús × 2 modalidades) que
  usa el sitio nuevo hay que crearlo allá. Hasta que eso exista, el cambio a
  producción no se puede hacer aunque se cambien el token y el dominio.
- **Los precios de producción hoy**: adultos $44.000, niños (4 a 12)
  $19.000. Coinciden con los del sitio.
- **Hay un tercer tramo que el sitio nuevo no tiene: "Pequeños (0 a 3 años)"
  a $6.000.** No es un olvido de nadie: nunca se mencionó. Hay que
  preguntarle al cliente si se mantiene, porque hoy `reservas.html` solo
  ofrece adultos y niños de 4 a 12, y una familia con una guagua no tendría
  cómo anotarla.
- **Las tres variantes del viernes 23 de octubre están todas a $44.000**,
  niños y pequeños incluidos. No alcanza a cobrarle de más a nadie —son
  justo las 3 que están no disponibles de las 39— pero si se reabre ese día
  sin corregir el precio, se cobra $44.000 por un niño.
- **El sitio nuevo todavía no está publicado en el dominio**: `/reservas.html`,
  `/landing-afiliados.html` y `/en/` dan 404. `brasasdelopirque.cl` sirve hoy
  el sitio viejo de Shopify.
- **El video del hero sigue vivo**: 63 MB, 1080p, servido por el CDN de
  Shopify y con soporte de rango. El pendiente de "En pausa" sigue siendo
  viable.

### Lo que devolvió la tienda de desarrollo (2026-10-13)

Primera consulta real a la Storefront API, corrida desde el navegador del
cliente porque desde acá el dominio está bloqueado. Respondió **HTTP 200**,
así que el token, el dominio y la versión `2024-10` funcionan, y los tres
IDs que usa el sitio existen y son los correctos.

**El precio de Tradiciones resultó ser $44.000, no $45.000.** El dato que
había pasado el agente estaba mal, o se corrigió en el intertanto. Los tres
montos de la tienda coinciden hoy con los del sitio.

Pero salieron dos problemas de configuración, los dos del lado de la tienda:

- **La tienda está en USD.** `"amount": "44000.0", "currencyCode": "USD"`.
  Así cobraría cuarenta y cuatro mil dólares por persona: un error de un
  factor de ~900. Hay que cambiarla a CLP en Settings → Store details.
  **Ojo: Shopify no deja cambiar la moneda si la tienda ya tiene pedidos**,
  así que si hubo compras de prueba puede que haya que crear otra tienda.
  El sitio no tiene cómo detectar esto: los precios que muestra salen del
  HTML, no de Shopify.
- **Las tres variantes vienen con `availableForSale: false`.** Con eso el
  carrito no se crea, o se crea y el checkout lo rechaza. Como la consulta
  sí las devolvió, están publicadas en el canal de venta, así que lo más
  probable es el inventario: cantidad en cero con política de dejar de
  vender. Para un producto de reservas suele resolverse con "seguir
  vendiendo cuando no haya existencias", porque quien controla la
  disponibilidad es Cowlendar. Hay que confirmarlo, porque se cruza con la
  pregunta del cupo por fecha.

Mientras esos dos no estén resueltos no tiene sentido probar `cartCreate`:
va a fallar por la disponibilidad y no enseña nada.

### Probado contra la tienda de verdad (2026-10-13)

Corrido desde el navegador del cliente, porque desde este entorno el dominio
está bloqueado. **La cadena completa funciona.**

**Los dos problemas de configuración quedaron resueltos**: la tienda está en
CLP y las tres variantes en `availableForSale: true`.

`cartCreate` con el payload exacto que arma el sitio devolvió
`userErrors: []` y un `checkoutUrl` real. Leyendo después ese carrito:

- **Total `107000.0 CLP`** — dos adultos a 44.000 más un niño a 19.000. La
  suma y la moneda, correctas.
- **Las dos líneas conservan `_booking_date` y `_cowlendar_date`** con la
  fecha elegida. Esto es lo que el backend necesita: es la única forma en
  que la fecha llega al pedido, porque las variantes no la tienen.
- Las variantes son las correctas.

De paso, el `checkoutUrl` viene con `/es/`: el checkout sirve en español,
que confirma lo anotado más arriba sobre los visitantes en inglés y
portugués.

**Lo único que falta comprobar** es que las propiedades sobrevivan del
carrito al **pedido**. Shopify convierte los atributos de línea del carrito
en propiedades de línea del pedido, pero hay que verlo en un pedido real
antes de darlo por hecho: de ahí las lee `leerReserva()` en el backend.
Requiere completar una compra de prueba.

### Las fechas: reglas más excepciones (2026-10-13)

Se resolvió de dónde salen las fechas, que era la pregunta abierta grande.
**No hay una lista escrita a mano.** El backend las arma con una regla —qué
días de la semana se abre, con qué cupo, hasta cuántos días adelante— y una
lista de excepciones para lo que se sale de ella.

La pestaña `Excepciones` cubre tres casos con una sola tabla: **abrir** un
día que la regla cierra (`abierta` = sí), **cerrar** uno que abre
(`abierta` = no), y **cambiarle solo el cupo** dejando `abierta` en blanco.
Esa celda en blanco significa "no opino sobre si abre, solo le cambio el
cupo", y por eso en el código es `null` y no `false`.

**El cupo son personas totales, niños incluidos** (decidido el 2026-10-13):
es lo que limita sillas, mesas y comida.

**El sitio solo muestra cuántos lugares quedan cuando quedan pocos.** El
umbral vive en la planilla (`aviso_pocos_lugares`), no en el código. En el
calendario los días por llenarse llevan un punto; al elegir uno, aparece
"últimos lugares". Se eligió así para apurar al que duda sin publicar qué
tan vacíos están los demás días.

**El horario es sábados y domingos de 13:00 a 18:00**, una sola jornada por
día, sin bloques de hora.

**Eso quedó dicho en el pie del sitio público** (2026-10-13), en las seis
páginas: "Horario general: sábados y domingos desde las 13:00 hasta el
cierre. Para otras fechas, consulta la página de reserva o escríbenos por
WhatsApp." El enlace apunta a `reservas.html#reserva-en-linea`, para que
caiga directo en el calendario y no arriba de la página.

**No va en el landing de socios**, que tiene pie propio y apunta al WhatsApp
de Eventos: mandar a una agencia a la página de reserva sería mandarla al
flujo del consumidor final.

### Desde este entorno SÍ se alcanza Shopify (desde el 2026-10-22)

Antes no: el proxy negaba los tres dominios con 403 y había que correr las
consultas en el navegador del cliente y traer la salida pegada. **El cliente
los agregó en Network access del entorno**, y con eso se puede probar la
integración de verdad desde acá.

Lo que quedó abierto, y para qué sirve cada uno:

| Host | Para qué |
|---|---|
| `brasas-de-lo-pirque-development.myshopify.com`, `shopify.com` | La Storefront API: consultar variantes y crear carritos |
| `landing-pirque-alpha.vercel.app` | El panel en producción |
| `brasasdelopirque.cl` | El sitio viejo, y el **catálogo público** de la tienda de producción |
| `fonts.googleapis.com`, `fonts.gstatic.com` | Las capturas salen con Fraunces y Work Sans, ya no en fallback |

Lo que **sigue cerrado** y conviene saberlo antes de intentarlo:
`drive.google.com` y `googleusercontent.com` —o sea, las fotos del cliente
siguen sin poder bajarse desde acá—, `script.google.com` (ya no importa: el
Apps Script se jubiló) y `vercel.com` (el panel de Vercel, que tampoco hace
falta).

`sheets.googleapis.com` quedó abierto pero **no sirve de nada sin la llave
de la service account**, que vive en las variables de Vercel y ahí se queda.
No la pidas.

### Probado desde acá contra la tienda de desarrollo (2026-10-22)

Con el acceso abierto se corrió lo que antes no se podía, y **la cadena
completa funciona con la versión `2026-10`**:

- **Las seis variantes existen, están en CLP y disponibles**, y los seis
  montos calzan exactamente con los que el HTML trae escritos (44.000 /
  49.000 · 70.000 / 75.000 · 19.000 / 24.000).
- **`cartCreate` con el payload del propio sitio** devolvió `userErrors: []`,
  total `107000.0 CLP` —dos Tradiciones más un niño— y las dos líneas
  conservando `_booking_date` y `_cowlendar_date`.
- **Y `reservas.html` servido en local contra los servicios reales**: el
  calendario se pintó con las fechas que entrega el panel en Vercel, elegir
  un día escribió `#r-fecha`, y los botones quedaron en "Pagar ahora
  $107.000" y "Solo reservar $122.000". Apretar creó el carrito y redirigió
  al checkout.

**Dos cosas salieron de esa corrida y las dos son de la tienda, no del
sitio:**

- **El checkout de la tienda de desarrollo está detrás de contraseña**, y
  **sigue estándolo** (vuelto a comprobar el 2026-10-22 por la tarde). El
  carrito se crea bien y redirige a `/checkouts/cn/<token>/es-us`, pero eso
  termina en `/password` — *"Esta tienda está protegida con contraseña"*. Al
  cliente no le pasa porque su navegador ya tiene la clave guardada; **quien
  pruebe desde otro computador se estrella ahí y parece que falla el sitio**.
  Se quita en Shopify → Online Store → Preferences, y **es el mismo paso que
  falta para poder completar una compra de prueba** y cerrar el pendiente de
  `_booking_date` en el pedido.
- ~~El checkout sale en `en-us`, no en español~~ — **lo arregló el cliente
  ese mismo día.** En la mañana los cuatro `Accept-Language` probados
  redirigían a `/checkouts/cn/<token>/en-us`; en la tarde, a **`es-us`**, y
  la propia pantalla de contraseña pasó a estar en español. Queda anotado
  porque enseña algo: **el idioma del checkout cambia del lado de la tienda,
  sin tocar el sitio y sin avisar**, así que conviene comprobarlo cada vez
  que se toque algo allá.

### Lo que falta por verificar

- **Que las propiedades `_booking_date` pasen del carrito al pedido.** Ya se
  comprobó que sobreviven en el carrito —de nuevo el 2026-10-22, contra la
  API `2026-10`—; falta verlas en un **pedido** real, porque de ahí las lee
  `leerReserva()`. Requiere completar una compra, y para eso primero hay que
  pasar la contraseña de la tienda.
- ~~Que el Web App de Apps Script se pueda leer desde el sitio~~ — ya no
  aplica: el sitio le pide las fechas al panel, y **eso quedó probado contra
  el panel de verdad** el 2026-10-22: `reservas.html` corriendo en local
  llamó a `landing-pirque-alpha.vercel.app/api/publico/fechas`, recibió 200
  y pintó el mes con los días que el panel abre.
- ~~Qué versión de la Storefront API usar~~ — **resuelto el 2026-10-22**: la
  `2026-10` responde, devuelve las seis variantes y crea carritos. Ya no es
  una pregunta abierta.

### Lo que este diseño no resuelve

- **Se puede sobrevender por un margen chico.** El cupo se descuenta cuando
  el pedido ya está pagado. Entre que alguien llega al checkout y paga, otro
  podría tomar los últimos lugares. Si molesta, se arregla reservando el
  lugar unos minutos al crear el carrito.
- **No manda correos.** La confirmación de compra la manda Shopify.
- **No cancela ni reagenda.** Una cancelación en Shopify no borra la fila ni
  el evento: hoy eso se hace a mano en la planilla.

### El estado del pago, en español y en dos grupos (2026-10-30)

Lo reclamó el cliente: al abrir una reserva, la pregunta del pago *"sale en
inglés y español, y eso confunde mucho"*. Era literal — el desplegable decía
`pending — paga al llegar` y la tabla del día mostraba el código pelado,
`pending`. Quien abre una reserva un sábado es la jefa de turno, en Pirque.

**Lo que se guarda no cambió**: la columna se llama `Estado Pago Shopify` y
lleva el código de Shopify, porque la escribe el webhook y tiene que calzar
con lo que manda la tienda. Lo que cambió es lo que se lee. El mapa vive en
`panel/src/lib/pagos.ts`, en un solo lugar para las dos pantallas:

| Guardado | En pantalla | Qué significa |
|---|---|---|
| `paid` | Pagada | ya pagó |
| `pending` | Por pagar | paga cuando llegue |
| `cancelled` | Cancelada | avisó que no viene |
| `refunded` | Reembolsada | se le devolvió la plata |
| `voided` | Anulada | se anuló antes de cobrarle |

**Y se simplificó sin perder nada**, que es lo que el cliente pidió: los
cinco estados van en **dos grupos** dentro del mismo desplegable —*Viene* y
*Ya no viene — libera el cupo*—, porque la pregunta de verdad es si esa
persona llega o no, y recién después cómo quedó la plata. Cinco opciones
parejas obligan a leerlas todas para elegir la primera.

- **La lista de los tres que liberan el cupo es una sola**
  (`ESTADOS_QUE_LIBERAN`): la usa `ocupaLugar()` y con ella el formulario
  arma su grupo. Con dos listas, el día que se agregue un estado el
  calendario y el formulario dirían cosas distintas de la misma reserva.
- **Un código que el panel no conozca se muestra tal cual.** Mejor que una
  celda vacía: por lo menos se entiende que hay algo nuevo.
- **La modalidad también se explica sola**: *Pago directo — paga en línea* /
  *Solo reserva — paga en el local*. Los nombres son los de la tienda y los
  del sitio, así que se quedan; lo que faltaba era decir qué son.
- **La asistencia del cliente pasó a los mismos botones Vino / No vino** del
  equipo y de las actividades extras. Era el último `<select>` de los tres
  lugares donde se pregunta exactamente lo mismo.

### La modalidad la escribe Shopify; el estado del pago, cualquiera (2026-10-30)

Lo encontró el cliente, y era un error lógico de fondo: *"cuando se agrega una
reserva manualmente, en verdad no puede ser pago directo, porque pago directo
es solo Shopify… nosotros igual necesitamos poder abrir manualmente una
reserva que ya se pagó, por transferencia, adelantada, o como sea"*.

Tenía razón y se puede leer en una sola línea del código: `tipoPagoDe()` saca
`Tipo Pago` del **`variant_title`** del pedido, o sea de qué variante se
compró. **Es un hecho del pedido, no una opinión de nadie.** Una reserva
anotada a mano no compró ninguna variante, así que el formulario estaba
pidiendo elegir un dato que no existe — y traía `Solo reserva` puesto por
defecto, que es igual de inventado.

Los dos conceptos, separados de verdad:

| Columna | Qué es | Quién la escribe |
|---|---|---|
| `Tipo Pago` | **cómo se vendió** — qué variante se compró | **solo Shopify** |
| `Estado Pago Shopify` | **cómo va el pago** — pagada, por pagar, cancelada… | Shopify **y** el panel |
| `Nota de pago` | **cómo se pagó** una reserva a mano, en texto libre | el panel |

- **El formulario manual pregunta una sola cosa**: cómo va el pago, el
  desplegable que ya estaba en dos grupos. Una reserva pagada por
  transferencia se anota **Pagada** y ya no hay que mentir sobre la
  modalidad. Al editar una reserva de Shopify, la modalidad se **muestra
  como texto, no como campo**.
- **Y no se acepta del navegador**, ni al crear ni al editar: el `POST` la
  escribe vacía y el `PATCH` la descarta, así que una llamada directa a la
  API obedece la misma regla que un clic. Como la edición es parcial,
  descartarla conserva la que ya tenga la fila.
- **Con eso el aviso de "pago directo sin pagar" se vuelve confiable**, que
  es lo que más se gana. Es la única señal de que la regla de medios de pago
  de Shopify dejó de aplicar, y hasta ahora se podía disparar a mano sin que
  hubiera pasado nada en la tienda. Lleva además una guarda por el id, para
  las filas viejas de cuando el formulario sí dejaba elegir.

**El monto sugerido pasó a salir del estado del pago** y no de la modalidad:
pagada por adelantado es el precio con descuento, por pagar es el del local.
Es exactamente la regla de la tienda —el recargo son los $5.000 por no pagar
antes— y el monto sigue siendo editable encima.

#### La nota de pago es texto libre a propósito

Cuáles son los medios de pago del negocio es dato del cliente. Una lista
cerrada inventada acá terminaría en la planilla pareciendo que lo es, así que
se escribe "Transferencia 28/10" o "efectivo en el mesón" y listo. El campo
aparece **solo cuando la reserva está pagada**, que es cuando la pregunta
existe. Mismo criterio y mismo nombre que la `Nota de pago` de
`Trabajadores` y `Colaboradores`.

- **La columna se agrega sola la primera vez que hace falta**
  (`asegurarColumna()`), como `asegurarHoja()` hace con una pestaña. Sin eso
  el campo se habría podido escribir en el formulario sin quedar en ninguna
  parte: una columna que el panel conoce y la planilla no se lee vacía y
  `filaReserva()` saltea su índice en silencio. Se agrega al final y sin
  tocar ninguna celda de datos.
- **El sincronizador no la pisa**, igual que la asistencia: la escribe una
  persona, y un pedido que se actualiza —un pago que se confirma— la
  borraría. Está en la lista de omisiones de `camposDeShopify()`.

#### Lo que se arregló de paso: el cálculo decía otra cosa que el rótulo

`ocupacionDe()` separaba el día **por modalidad comprada** mientras la
tarjeta del calendario rotulaba el resultado como *"X pagadas / X en el
local"* y el comentario de `tipos.ts` decía *"personas que ya pagaron"*. No
era lo mismo: una reserva que compró la variante de pagar en línea y seguía
en `pending` se contaba como pagada, y esa plata no aparecía en ninguna
parte. **El rótulo tenía razón; el cálculo se había quedado atrás** — y
`faltaCobrar()` ya resolvía esto bien, con el porqué escrito, desde antes.

Ahora los dos campos se llaman `pagadas` y `porPagar` —los nombres viejos,
`online` y `local`, son justamente los que dejaron pasar la desalineación— y
el filtro de la página del día dice **Todas / Pagadas / Por cobrar**, que es
la pregunta del mesón.

### Lo que se mira primero en la página de un día (2026-10-30)

Lo pidió el cliente: agrandar lo principal y distinguirlo del resto. Son dos
filas de azulejos, **con la misma forma a propósito** —número grande arriba,
qué es debajo— porque son los dos datos por los que se abre esta página un
sábado en la mañana, y repetir la forma es lo que los deja leerse sin
aprender dos diseños:

| Fila | Qué dice |
|---|---|
| **Qué preparar** | cuántos de cada menú, en dorado |
| **Cómo viene el pago** | cuánta gente ya pagó (verde), a cuánta hay que cobrarle (ámbar) y, si las hay, cuántas liberaron su lugar (rojo) |

- **Los números grandes son personas**, para que las dos filas sumen lo
  mismo; cuántas reservas son va en la línea chica. Un "4" que fuera gente
  arriba y reservas abajo sería la clase de número que alguien suma mal.
- **El azulejo de los que ya no vienen aparece solo si los hay.** Un "0 ya no
  vienen" es ruido en la fila que se mira para saber cuánto falta cobrar.
- **En la tabla, la modalidad va en una pastilla de color**: verde *Pago
  directo*, ámbar *Solo reserva*, y debajo el estado en su propio color. Lo
  pidió el cliente para distinguirlas sin leerlas. El criterio del color es
  uno solo —**¿está la plata o no?**—, así que la combinación imposible
  (pastilla verde con estado ámbar) salta a la vista, que es justo lo que ese
  aviso quiere.
- Una reserva sin modalidad dice **"anotada a mano"** y no un guion mudo:
  decir qué es vale más que decir que falta algo.

## El equipo de trabajadores (panel)

Desde el 2026-10-21 el panel también planifica **quién trabaja cada día**.
Nació de una idea más grande del cliente —gestionar al equipo completo desde
acá, incluidas las cuentas del día— que se partió en tres lotes para que cada
uno sirviera por sí solo:

1. **Planificar** (hecho): qué puestos existen, quién es el equipo, y quién
   trabaja qué día.
2. **Los accesos** (hecho): admin / encargado / trabajador.
3. **Las cuentas del día** (hecho): asistencia del equipo, horas extra,
   ajustes, propina, y el link de la planilla semanal.

### Tres pestañas nuevas en la misma planilla

| Pestaña | Qué guarda |
|---|---|
| `Puestos` | Jefe de turno, parrillero, asistente parrillero, jefe de cocina, asistente de cocina, garzón, runner, barman, asistente de bar — **editables**, más la regla "uno cada N personas" |
| `Trabajadores` | Nombre, teléfono, puesto habitual, activo, token, modalidad, sus dos montos, si participa en la propina y su cuenta bancaria |
| `Turnos` | Una fila por (fecha, trabajador, puesto), con asistencia, lo que se le pagó y su parte de la propina |

A esas tres se sumaron después `Colaboradores` y `Actividades`, que son las
de los jinetes y las pintacaritas —ver "Las actividades extras"—, y
**`Cierres`**, una fila por día cerrado — ver "Cerrar el día".

Las tres se editan en **`/equipo`**, salvo los turnos, que se asignan desde
el calendario de la portada o desde **`/turnos`**, el calendario del equipo
—que es el único que incluye los días cerrados, para los de preparación. **Ninguna llega al sitio público**: `/api/publico/fechas`
sigue devolviendo `fecha`, `quedan` y `pocos`, y hay una prueba que lo fija.
Quién trabaja mañana no es dato de un visitante.

### "Uno cada N personas", que es lo que hace útil al planificador

Es lo único que le permite al panel contestar **"¿alcanza este equipo?"** en
vez de mostrar una lista. Con 10 en garzón, un día de 44 personas sugiere 5.

**Nace en blanco a propósito y el panel no opina mientras lo esté.** Cuántos
garzones por comensal se atiende bien es dato del negocio y no está escrito
en ninguna parte del proyecto; sembrarlo con un número plausible haría que el
panel diera consejos que nadie dio. Mismo criterio que los precios de los
menús.

### La lista de arranque la corrigió el cliente (2026-10-22)

Los puestos que trae el código al partir son hoy **nueve**: jefe de turno,
parrillero, asistente parrillero, jefe de cocina, asistente de cocina,
garzón, runner, barman y asistente de bar. Antes eran siete y el cambio no
es cosmético: `Cocina`, `Barra` y `Asistente` juntaban en una palabra cosas
que en el local son puestos distintos. Quien manda la parrilla no hace lo
mismo que quien lo asiste, y `Asistente` a secas no dice de qué. Un puesto
que no distingue no sirve para contestar si el equipo alcanza, que es para
lo único que esta lista existe.

**Eso es el arranque, no la verdad.** En cuanto alguien guarda los puestos
en `/equipo`, manda la planilla y esta lista deja de mirarse. Renombrar un
puesto tampoco toca lo ya asignado: cada turno guarda **el puesto con que se
asignó ese día**, así que un turno viejo sigue mostrándose con su nombre
aunque el puesto se llame distinto hoy (`planDelDia()` los agrega al final
de la lista, con el nombre tal como se escribió).

### Una persona ocupa un puesto, no dos

Asignar a alguien a un segundo puesto el mismo día lo **mueve**, no lo
duplica. No es una limitación técnica: una persona contada como garzón y como
barman a la vez haría decir al panel que hay dos donde hay una, y este es
justo el lugar donde se mira para saber si el equipo alcanza. Lo garantiza
`normalizarPlan()` **en el servidor**, no la interfaz, porque una llamada
directa a la API tiene que obedecer la misma regla.

### Los días de preparación, y el calendario del equipo (2026-10-22)

**Hay días en que no entra nadie y se trabaja igual**: preparar un
matrimonio, dejar la carne lista, montar el salón. Lo trajo el cliente, y el
panel no tenía dónde anotarlos: el calendario de la portada muestra **solo
los días que reciben público** —los que abre la regla, los que están en
`Fechas Hábiles` y los que tienen reservas— así que un martes cualquiera
sencillamente no existía y no se le podía asignar equipo.

Por eso existe **`/turnos`, el calendario del equipo**: el mes completo, día
por día, y cualquiera se puede planificar. Se llega desde el menú y desde un
enlace arriba en `/equipo`.

**No reemplaza al calendario de la portada, y eso se decidió así.** Ese es el
comercial, el que contesta cómo va la ocupación de un fin de semana; llenarlo
de martes vacíos le quitaría justamente eso. Son dos preguntas distintas
—"¿cómo venimos de reservas?" y "¿quién trabaja?"— y cada una tiene su
pantalla.

**Un día de preparación no es un dato nuevo: se deduce.** Si un día tiene
equipo asignado y no recibe público, es preparación. Se decidió así con el
cliente sobre la alternativa de agregar una columna y una casilla que marcar:
una marca a mano sería una segunda verdad capaz de contradecir a la primera
—un día marcado "preparación" que después se abre, o al revés—. La regla vive
en una sola función, `esPreparacion()`, porque la preguntan tres pantallas y
tres copias de la misma condición es lo que se desalinea cuando cambie.

**Planificar un día cerrado no lo abre.** Los turnos viven en su propia
pestaña y no tocan `Fechas Hábiles`, así que `/api/publico/fechas` sigue sin
ofrecer ese día. Estructuralmente no puede pasar —ese endpoint se arma desde
la ocupación y no mira los turnos— y además se comprobó a mano: con un
martes planificado, el sitio sigue ofreciendo solo el sábado y el domingo.
La pantalla lo dice igual, porque es la duda razonable al usarla.

Dónde aparece un día de preparación, y cómo:

| | Qué muestra |
|---|---|
| `/turnos` | La celda en dorado, con **preparación** y cuánta gente hay asignada |
| Planilla semanal | La columna dice **preparación** en vez de "0 personas · 0 reservas", que se leería como un día flojo |
| Link personal | "día de preparación, no abre al público", para que quien lo lee sepa si va a atender o a montar |
| Calendario de la portada | **No aparece**, a propósito: ese día no recibe gente |

**Un día de preparación se paga como cualquier otro, y entra al informe**
(decidido el 2026-10-22). El informe no sabe —ni tiene por qué saber— si ese
día abría: suma los turnos del periodo y ya. Hay una prueba que lo fija, para
que a nadie se le ocurra filtrarlos después.

Y como el monto de un día de montaje suele ser **un acuerdo aparte**, se
resuelve con lo que ya existía: el **ajuste con su motivo** al pasar lista,
que suma o resta sobre la jornada. No hizo falta nada nuevo; lo que faltaba
era poder llegar.

**La convención la fijó el cliente el 2026-10-22: se deja la jornada como
está y la diferencia va en el ajuste**, no se edita la jornada. Los dos
caminos dan el mismo total, pero solo uno deja escrito el porqué: una
jornada editada no se distingue de un error de tipeo, y un ajuste con motivo
se explica solo cuando alguien revise ese pago un mes después. Va dicho en la
propia ventana del día, que es donde se aplica.

**Llegar era el problema**, y por un tiempo se resolvió con un enlace *"abre
el día"* dentro de la ventana de planificación. El 2026-10-23 dejó de hacer
falta: los montos y la propina se escriben en esa misma ventana, así que a
un día de preparación ya no hay que llegar por ningún lado — se planifica y
se cierra ahí. Ver "Una sola ventana para el día".

Dos detalles de implementación que vale la pena tener escritos:

- **El número del día va pegado arriba, y eso hay que pedirlo** (2026-10-23,
  lo reclamó el cliente mirando `/extras`). Las celdas de una fila se
  estiran todas a la más alta, y **el contenido de un `<button>` se centra
  en vertical por defecto** —es comportamiento propio del botón, no del CSS
  de la página—, así que el número quedaba a media altura y a distinta
  altura en cada celda según cuántas líneas trajera: el mes se veía
  desordenado sin que ninguna regla del CSS dijera nada raro. Con
  `flex-col` + `justify-start` el número queda siempre en la primera línea y
  lo demás se acumula debajo. Vale para los dos calendarios de celdas
  (`/turnos` y `/extras`).
- **`diasDelMes()` cuenta los días con una tabla y la regla de los
  bisiestos**, no pidiéndole el último día a un `Date`. Es la misma razón por
  la que todo este proyecto trata las fechas como texto: una fecha que pasa
  por `Date` se corre de día según el huso del servidor, y Vercel no está en
  Chile.
- **Siete columnas no caben en un teléfono**, así que el mes se desplaza de
  lado dentro de su caja, como las tablas del panel. Es preferible a achicar
  el texto hasta que "preparación" no se lea. De paso, **la barra de arriba
  ahora envuelve** (`flex-wrap`): con ocho páginas ya no cabía, y una barra
  que no cabe se lleva la página entera hacia el costado.

### Marcar quién llegó, desde el propio planificador (2026-10-22)

Lo pidió el cliente pensando en **la jefa de turno**: quien abre el día a las
once de la mañana no va a pasar lista con montos, va a mirar quién llegó. Por
eso cada persona asignada tiene ahí mismo un **— / Vino / No vino**, en la
misma ventana donde se elige y se agrega gente. Quien no llegó queda tachado,
y el pie dice cuántos vinieron.

**Desde el 2026-10-23 los montos están en esa misma ventana**, debajo. La
idea de separarlos —marcar presencia es de la mañana, cerrar las cuentas es
de la noche— era razonable y no sobrevivió al uso: obligaba a entrar dos
veces y a pasar por una pantalla que para un día de preparación ni siquiera
existe. Quien marca en la mañana deja los montos como están y listo; quien
cierra en la noche los llena. Ver "Una sola ventana para el día".

**La línea de cada persona son dos líneas fijas, no una que envuelve**
(2026-10-30, lo notó el cliente con una captura). Arriba va lo que se
contesta —quién es y si vino—; abajo lo que se hace: *+ Ajuste*, *Ficha* y
*Sacar*. Antes era una sola fila con `flex-wrap`, así que con un nombre corto
—"Alexis"— cabía todo junto y con uno largo *Ficha* y *Sacar* se iban solos
abajo: dos personas seguidas se veían distintas sin que hubiera cambiado nada
salvo el largo del nombre, y lo que se aprieta sin querer es justamente lo
que se movió de lugar. **Ficha y Sacar además van agrupados**, para que bajen
los dos o no baje ninguno.

**Desde el 2026-10-30 son dos botones grandes, no un desplegable.** Lo pidió
el cliente con el porqué: *"son personas rurales, que no han manejado muchos
de estos sistemas; necesitamos que para ellos sea muy fácil de entender"*. Un
`<select>` esconde las opciones hasta que alguien adivina que hay que
abrirlo, y lo que muestra mientras tanto es un guion, que no pide nada.

Lo que hay ahora, en `Asistencia.tsx` y usado también en las actividades
extras —dos pantallas que preguntan lo mismo tienen que preguntarlo igual—:

- **Los dos botones a la vista**, con la frase completa: *✓ Vino* / *✕ No
  vino*. Se lee qué hay que hacer antes de tocar nada.
- **El que se aprieta queda pintado**, verde o rojo, y la fila entera se
  tiñe: el estado se ve de lejos, sin leer.
- **Mientras nadie marque, la fila lo dice en ámbar** —*sin marcar*— porque
  es justo el estado que no suma nada y el que impide cerrar el día.
- **Unos 40px de alto**: un control de 30 se falla con el dedo, y fallar acá
  es marcar a la persona equivocada.
- **Apretar el que ya está marcado lo desmarca**, que es la única forma de
  volver a "no sé todavía" sin inventar un tercer botón.

En la misma pasada, y por el mismo criterio:

- **El botón de cerrar dice en pantalla por qué está apagado** —"falta
  marcar si una persona vino o no"—. El motivo vivía en el `title`, o sea en
  un globito que aparece al pasar el mouse: en un teléfono eso no existe, y
  lo que queda es un botón muerto sin explicación.
- **Sacar a alguien del día es un botón que dice "Sacar" y pregunta antes.**
  Era una ✕ de diez píxeles que borraba sin avisar: el único control de esa
  ventana que deshace algo, y el más fácil de apretar sin querer con el
  dedo. Lo mismo en las actividades extras.
- **Lo que se aprieta con el dedo mide para el dedo**: *Ficha*, *Sacar* y
  las flechas de los puestos pasaron de unos 20px a 36.

**Ojo con una trampa que esto abrió, y que costó cambiar una regla del
servidor.** `guardarEquipoDelDia()` heredaba los montos de la ficha **solo
mientras la asistencia estuviera sin marcar**; pasada la lista, lo que viniera
del navegador mandaba. Con la asistencia marcándose en el planificador, un
turno puede nacer ya en "vino" **y con los montos en cero**, porque la
pantalla de un encargado nunca recibe los sueldos de nadie. Esa persona habría
quedado congelada en **$0**, y el error habría aparecido el día de pagar.

La regla ahora es: **lo que venga manda, salvo que el turno no traiga ningún
monto.** Un turno con asistencia y sin montos no es un cero corregido a mano,
es uno al que todavía nadie le puso precio. Con la convención de que las
diferencias van en el ajuste, un cero deliberado en la jornada ya no existe.

**El botón "Agregar fecha" se puso acá y se sacó el mismo día** (2026-10-22),
y conviene que quede escrito para que a nadie le dé por reponerlo: **un día de
preparación no se agrega, se planifica.** Se aprieta el día —el que sea— y se
le asigna equipo; eso es todo, y no lo abre al público. *Agregar fecha* es
otra cosa: pone el día en el calendario **para recibir reservas**, así que
tenerlo en esta pantalla solo invitaba a usarlo para un montaje y abrirlo sin
querer. Abrir un día sigue siendo del calendario de la portada.

**Y desde el otro lado, el 2026-10-30, se abrió la puerta que faltaba**: el
*Agregar fecha* del calendario de la portada ofrece ahora un cuarto estado,
**Día de preparación**. Lo pidió el cliente con el caso exacto: *"se agrega
una fecha pública y al final dice en esa misma vista el encargado: ah, y
tengo que preparar una fecha"*.

**No contradice nada de lo anterior, porque no escribe una fila.** Elegirlo
cambia el botón a *Planificar el equipo* y abre la ventana del equipo de esa
fecha; `Fechas Hábiles` no se toca, así que el sitio sigue sin ofrecer ese
día. Comprobado de punta a punta: con el 11 de noviembre planificado desde
ahí, la planilla no tiene esa fila, `/turnos` lo muestra en dorado como
preparación y el calendario de la portada no lo muestra.

Lo que sí cambió es la pregunta del grupo de opciones, que decía **"quién
puede reservar"**: a eso la preparación contestaría "nadie", que no es lo que
dice. Ahora pregunta **qué día es**, y las cuatro respuestas caben.

**Solo se ofrece al agregar, no al editar un día que ya está en la hoja.**
Ese se vuelve de preparación cerrándolo y asignándole equipo, y poner acá un
atajo a eso sería explicar dos caminos para lo mismo.

**La jefa de turno es un puesto, no un rol.** Para marcar asistencia necesita
una cuenta de **encargado** en `/usuarios`; con su nombre, además, la bitácora
dice quién marcó qué.

### Las columnas de `Turnos` se leen por nombre, no por posición

Al revés de `Puestos` y `Trabajadores`. La diferencia no es gusto: esas dos
se reescriben enteras al guardar, así que la posición la fija el panel. A
`Turnos` se le agregan y se le borran filas de a una, **y le van a crecer
columnas en el lote 3** —asistencia, horas, ajustes—: con posiciones fijas,
agregar una obligaría a reescribir todas las filas ya guardadas. Es el mismo
criterio que usa `Reservas`.

Guardar el equipo de un día **borra las filas de esa fecha y escribe las
nuevas**, sin tocar los otros días: la pestaña entera son todos los fines de
semana del año, y un error guardando un sábado no puede llevarse por delante
el historial.

### El calendario se agrupa por semana (2026-10-30)

Lo pidió el cliente: *"me gustaría poner un poco más el enfoque a que juntes
los paneles semanalmente. No digo que dejas de marcar el mes, pero se piensa
mucho semanalmente en el local"*.

Las semanas ya estaban, pero marcadas **más suave que el mes** —una línea
gris sobre una grilla corrida— justamente al revés de cómo se usa. Ahora
**cada semana es una caja con su cabecera** y el mes es la línea que la
precede: sigue marcado, que es la referencia para ubicarse entre 90 días,
pero dejó de ser lo que agrupa.

En la cabecera de cada semana: el rango en palabras, **cuánta gente viene en
toda la semana** y de qué días son —*"13 personas · 2 públicos"*—, y el botón
de mandar la planilla, que ya estaba. Los estados de cada día siguen en su
tarjeta, con `PuntoDia`; acá va el conteo, que es lo único que no se puede
ver sin sumarlo.

**La semana en curso va delineada en dorado y dice "esta semana".** Es la
que se mira al entrar.

**Y una semana que cruza de mes ya no se parte en dos.** Antes sí, a
propósito —mandaba el encabezado de mes—, y dejó de tener sentido cuando la
semana pasó a ser una caja: un sábado 31 y su domingo 1 son el mismo fin de
semana, el mismo turno y la misma planilla, así que verlos en dos cajas
distintas es justo lo contrario de lo que se pidió. El mes se anuncia antes
de la primera semana que lo estrena.

### La tarjeta se da vuelta

Cada día del calendario tiene **Equipo** al pie: la tarjeta gira en 3D y
muestra el resumen —cuánta gente, cuántos por puesto, cuántos faltan— con el
botón **Planificar equipo**. Dos detalles de implementación que arreglan
trampas conocidas:

- **Las dos caras van en la misma celda de una grilla**, no con
  `position:absolute`. Así el alto de la tarjeta es el de la cara más alta,
  sin fijarlo a mano — y una medida fija es justo lo que queda viejo cuando
  el contenido cambia. El pie va con `mt-auto` para que el aire sobrante
  quede en el medio y no colgando bajo los botones.
- **La cara de espaldas se apaga para todo el mundo**: `aria-hidden`,
  `pointer-events-none` y `tabIndex -1` en sus botones.
  `backface-visibility` esconde el dibujo pero **deja los enlaces
  alcanzables con el tabulador**, así que sin esto se podría tabular hacia
  botones invisibles.

**Un día salía más largo que los otros, y la causa era la cara que no se
veía** (2026-10-30, lo notó el cliente con una captura: *"el domingo está más
largo que los otros días, de hecho es el único día que pasa"*).

Medido antes de tocar nada: el frente del viernes y el del sábado medían
**178px** y el **dorso del domingo, 295** — nueve personas repartidas en
nueve puestos, un renglón cada uno. Como las dos caras comparten celda, ese
dorso estiraba la tarjeta entera, y el frente —que es lo que uno mira—
quedaba con un hueco bajo el borde. Dos arreglos, y los dos hacen falta:

- **El dorso lista cinco puestos y resume el resto** (`PUESTOS_A_LA_VISTA`):
  *"y 4 puestos más"*. Es un resumen, no la planificación — esa está a un
  clic, en *Planificar equipo*. Son cinco y no tres porque el corte tiene que
  doler poco: **con seis se muestran los seis**, ya que resumir uno solo
  gastaría el mismo renglón que mostrarlo.
- **Las tarjetas de una misma fila miden lo mismo** (`h-full` en los tres
  niveles). Sin eso, una tarjeta más baja que su fila dejaba el hueco bajo su
  propio borde, que se lee como un error de dibujo; con el pie en `mt-auto`,
  el sobrante queda en el medio, donde se lee como aire.

**Se probó la salida obvia —que mande el frente, con el dorso `absolute`
encima— y se descartó**: la tarjeta quedaba a 178 y el dorso salía **cortado
a media línea**, sin nada que dijera que seguía. Arreglar una cara rompiendo
la otra no es arreglarlo.

En un teléfono las tarjetas van **apiladas**, una por fila, así que ahí una
más alta sigue siéndolo — y está bien: no hay fila con la que desalinearse.

El pie del frente dice ahora **"Ver reservas"** y no "Ver quiénes vienen":
con tres acciones, el texto largo se partía en dos líneas en una tarjeta de
cuatro columnas. La fecha del título lleva al mismo lugar.

**La línea de "$X por cobrar" se sacó** (2026-10-23, a pedido del cliente),
de la tarjeta del calendario **y del bloque de la página del día**. Era la
suma de las reservas que pagan en el local, y **en el local se paga otra
cosa**: una bebida más, un postre, lo que se consuma ese día. O sea que ese
número nunca iba a ser lo que hay que cobrar, y un total que no es el total
no sirve para cuadrar nada — solo para que alguien lo crea.

Lo que sí sirve, el monto de cada reserva, sigue en su fila de la tabla. Y
el cálculo tampoco se borró: `faltaCobrar()` y los campos `porCobrar` /
`sinMonto` de la ocupación siguen ahí con sus pruebas, por si algún día se
muestra de otra forma. Lo que se liberó es el espacio, para cuando aparezca
algo que de verdad ayude mirando el mes.

### La palabra bajo el punto: público, privado, cerrado, preparación (2026-10-23)

**En los tres calendarios, el estado de un día se lee bajo su punto de
color**, en letra chica: *público*, *privado*, *cerrado*, *preparación* o
*sin cupo*. Antes era una línea más, debajo del contenido —"PRIVADO · no
está en el sitio"—, y ahí está el problema que lo cambió: **una línea de más
cambia el alto de la tarjeta**, así que los días de una misma semana dejaban
de medir lo mismo según su estado. Bajo el punto, en cambio, el aire ya
estaba: la palabra no mueve nada.

Lo pidió el cliente **como regla general** —"en el calendario, en donde sea:
calendario, turnos, o actividades extras"—, y por eso vive en un solo
componente, `PuntoDia`, que dibuja el punto y su palabra. Un día se lee
igual en cualquier pantalla, y agregar un estado es tocar un archivo.

Dos cosas que no cambiaron, y conviene que se note:

- **Un día de preparación sigue sin aparecer en el calendario de la
  portada.** Esa pantalla es la comercial; la palabra solo se lee donde el
  día ya aparecía.
- **El aviso de un día cerrado CON gente ya reservada sigue siendo una
  línea.** No es un estado, es algo que hay que hacer —avisarle a esa
  gente—, así que no se puede esconder en una palabra de nueve píxeles.

### Baja a alguien desmarcando "activo", no quitándolo

Quitarlo de la lista no borra sus turnos pasados —esos son el registro de
quién trabajó qué día— pero los deja con un nombre que ya no está, y
`sinFicha()` lo reclama en amarillo. Es el mismo mecanismo que `desconocidos()`
usa para los menús, y por el mismo motivo: sin alias ni equivalencias, lo
único que mantiene alineadas dos listas es que alguien se entere cuando dejan
de estarlo.

**Desde el 2026-10-22 eso lo decide el panel, no un consejo al pie.** Lo
notó el cliente y tenía razón: la tabla ofrecía **Quitar** en cada fila, con
el mismo peso visual que todo lo demás, y la advertencia de no usarlo vivía
en letra chica debajo de la tabla. Un botón que no hay que apretar casi nunca
no puede estar igual de a mano que el que sí, y menos confiando en que
alguien lea el párrafo de abajo un sábado a las once de la noche.

Ahora el botón de la derecha depende de si esa persona tiene turnos
guardados (desde el 2026-10-30 vive en la línea, abierta o cerrada — ver
"La línea del trabajador"):

| | Qué ofrece |
|---|---|
| Sin ningún turno | **Quitar** — la fila escrita por error, que no tiene historia que proteger |
| Con turnos, activa | **Desactivar** — la saca del planificador y le cierra su link, conservando sus turnos |
| Con turnos, inactiva | **Activar** — vuelve al planificador y su link abre de nuevo |

El costo a asumir: **ya no se puede borrar de un clic la ficha de alguien que
sí trabajó.** Es justamente lo que no queremos que se pueda hacer sin
pensarlo; si de verdad hay que sacarla, se edita la planilla a mano, que es
un acto deliberado.

De paso, el otro botón de esa misma fila pasó a decir **"Quitar link"**: dos
"Quitar" con significados distintos a dos columnas de distancia eran una
confusión esperando a pasar.

### Una tarjeta por persona, no una tabla (2026-10-23)

Lo reclamó el cliente con una captura y tenía razón: con los datos
repartidos en tres líneas —quién es, cuánto gana, dónde se le paga—, las
líneas de uno y las del siguiente se tocaban y no se veía dónde terminaba
cada ficha.

**Fue tabla mientras cada trabajador era una fila**, y dejó de serlo cuando
dejó de serlo. Además esto no es una tabla de datos para comparar entre
filas: es **un formulario por ficha**, y una tarjeta con su borde es lo que
corresponde. Cada campo lleva su rótulo encima, pegado al campo, porque con
tarjetas una fila de encabezados allá arriba obligaría a contar columnas
para saber qué es cada caja.

Dentro de cada tarjeta, tres bloques separados por una línea: **quién es**
(con sus acciones de link a la derecha), **Pago** y **Transferencia**. Una
ficha desactivada se ve apagada, sin tener que leer la casilla.

**Lo mismo en `/extras`** para los colaboradores, por lo mismo y para que
las dos pantallas se parezcan: quien aprende una sabe usar la otra.

**Y el guardado va dentro de la ficha** (2026-10-23). Lo pidió el cliente:
se corrige el teléfono de alguien arriba y el botón quedaba al final de la
página, con todas las demás fichas en medio. Un guardado al que hay que irlo
a buscar es un guardado que se olvida — y se olvida con algo escrito a
medias. Apenas hay un cambio, cada tarjeta muestra **Guardar cambios** en su
esquina, y de paso ese botón reemplazó al aviso en gris que decía *"Guarda
para administrar el link"*: dice lo mismo y además lo hace.

Aparece **en todas las fichas, no solo en la que se editó**, porque guardar
manda las dos listas completas en una sola petición: no es el guardado de
esa persona, es el de la pantalla, y tenerlo a mano donde sea que estés
editando es justamente el punto. Los botones de abajo y de arriba siguen
donde estaban.

### La ficha se abre con un `+`, y los puestos viven en una ventana (2026-10-29)

Lo pidió el cliente mirando `/equipo`: *"que los trabajadores no se vean al
tiro todos los datos, sino que yo los pueda abrir con un más"*, y *"los
puestos, ponlos separados… para que la página no sea una lista gigante
larga"*.

Tenía razón, y la causa es acumulativa: cada ficha había ido creciendo
—quién es, cuánto gana, dónde se le transfiere— y debajo venía la tabla de
puestos. Con diez personas, `/equipo` eran varias pantallas y **había que
recorrerla entera para llegar a cualquier cosa**.

- **Cerrada, una ficha es una línea**: nombre, puesto, teléfono, y en ámbar
  un **falta su cuenta** si no se le puede transferir todavía. Ese aviso va
  justamente con la ficha cerrada, que es donde se mira la lista antes de
  pagar; adentro ya lo dice `DatosBancarios`.
- **Se abre una a la vez.** Se edita una ficha, no se comparan dos, y dejar
  varias abiertas devolvería la página larga de la que estábamos saliendo.
- **La que se acaba de agregar se abre sola**: agregar a alguien y que
  aparezca una línea vacía que además hay que apretar sería pedir dos pasos
  para uno.
- **El resumen es un `<button>` y no un `<summary>`.** En el sitio público
  la regla es `<details>` sin JavaScript, pero acá ya estamos en React y la
  ficha nueva tiene que poder abrirse sola; con `<details>` eso se controla
  igual desde el estado, así que el elemento no aportaba nada que no
  costara explicar.
- **Los puestos se abren con un botón** —*Administrar puestos*— y viven en
  una ventana. Al lado queda su resumen (cuántos son y los primeros
  nombres), que es lo único que se mira de pasada.

**Y ahí se pueden ordenar, con flechas** (lo pidió el cliente en la misma
pasada). No es cosmético: **el orden de esa lista es el orden en que el
planificador dibuja los puestos**, así que acomodarlos al orden en que se
arma un turno ahorra buscar en cada tarjeta. Antes el único modo era
reescribir los nombres de arriba abajo o editar la planilla a mano.

**Son flechas y no arrastrar**, también a propósito: arrastrar necesita o la
API de *drag and drop* del navegador —que en un teléfono no funciona— o una
librería, y este proyecto no agrega una dependencia por una comodidad. Una
flecha se aprieta con el dedo y además se puede usar con el teclado.

### La línea del trabajador: se aprieta y se abre; al lado, desactivar (2026-10-30)

Lo pidió el cliente mirando `/equipo`: *"en vez de ofrecer al costado
derecho nuevamente la opción abrir, debería dar la opción activar y
desactivar… si aprietas la línea completa menos en el botón desactivar, abre
todas las opciones"*.

Tenía razón en lo redundante: la línea entera ya era el botón que abría la
ficha, y a la derecha decía *abrir* — una segunda forma de hacer lo mismo
ocupando el único lugar donde cabe una acción de verdad.

- **La línea abre; el botón de la derecha da de baja**, abierta o cerrada.
  Qué ofrece depende de la historia de esa persona: **Quitar** si no tiene
  ningún turno guardado, **Desactivar** si tiene, **Activar** si está dada de
  baja. Los tres **preguntan antes**, porque los tres cambian algo que la
  pantalla no deshace sola.
- **Esas tres acciones se aplican en el acto**, sin pasar por *Guardar*. No
  es solo coherencia con la regla de "lo que declara algo se aprieta": al
  desactivar, la línea **desaparece de la lista** —los inactivos van
  escondidos— y con ella el botón que la habría guardado.
- Van por `PATCH` y `DELETE` de `/api/equipo/trabajador`, que tocan **una
  fila**: quien aprieta ahí no tiene por qué mandar, ni pisar, lo que alguien
  escribió en otra ficha. El `PATCH` pasó a ser **parcial de verdad** —lo que
  no viene en el cuerpo se conserva—, porque antes escribía siempre el
  teléfono y el puesto, y una llamada que solo quisiera desactivar se los
  habría borrado.
- **La regla de "no se quita a quien ya trabajó" se comprueba en el
  servidor**, no solo en la pantalla: el `DELETE` cuenta sus turnos y
  responde 409 con el motivo. Una llamada directa a la API tiene que obedecer
  la misma regla que un clic.
- **Una casilla arriba, "Ver desactivados (N)"**, escondidos por defecto. Dar
  de baja no borra la ficha, así que esta lista solo crece y el equipo de hoy
  termina mezclado con el de hace dos años. El número está para que nadie los
  dé por perdidos.
- **La casilla "Activo" de adentro se sacó**: con el botón en la línea eran
  dos controles para lo mismo, a dos centímetros y con distinto peso.
- **El filtro se aplica dentro del `map`, no antes**, y eso importa: `i` es
  la posición real en la lista que se guarda, y todo lo que edita una ficha
  la usa. Con un `filter` previo, esconder a un inactivo le cambiaría el
  índice a los de abajo y editar a alguien escribiría sobre otro.

**Y el guardado de la ficha dice qué cambió.** El cliente lo pidió con el
caso exacto: *"si se cambia algo en estos campos y es el número de teléfono
sin querer, por lo menos tener el control sobre: hey, cambiaste algo"*. Un
botón que solo dice "Guardar" no distingue entre corregir un puesto a
propósito y haber tecleado encima de un teléfono sin darse cuenta. Ahora la
tarjeta dice **"Cambiaste teléfono, puesto."** al lado del botón, comparando
contra la lista tal como vino de la planilla — no contra el dibujado
anterior: lo que importa es qué quedará distinto de lo guardado.

### Una pestaña que se reescribe entera tiene que borrar lo que sobra (2026-10-30)

**Quitar a alguien de una lista dejaba al último duplicado en la planilla**, y
nadie lo había visto porque en pantalla se veía perfecto.

`values.update` de la API de Sheets escribe las filas que uno le pasa y
**deja intactas las de más abajo**. `escribirBloque()` escribía cuatro filas
sobre cinco y la quinta se quedaba donde estaba. El propio comentario de esa
función ya advertía *"no sirve para una lista que se acorta"* — y la usaban
`Trabajadores`, `Puestos`, `Menús`, `Colaboradores` y `Config`, que son
justamente listas que se acortan.

Ahora escribe y **después limpia** desde la fila siguiente hasta el final.
**En ese orden, a propósito**: al revés, un fallo entre las dos llamadas
dejaría la pestaña vacía; así, lo peor que puede pasar es quedarse con la
fila de más —que es exactamente lo que pasaba antes— y se corrige al
siguiente guardado.

### Los calendarios de celdas necesitan `relative` (2026-10-30)

En `/turnos` y `/extras`, a 393px, **la página entera se corría de lado** —
títulos y botones incluidos—, que es justo lo que el desplazamiento interno
del mes viene a evitar. La caja sí recortaba el mes, pero el documento
quedaba 95px más ancho que la pantalla igual.

Lo arregla `position: relative` en la caja que hace `overflow-x-auto`.
Comprobado a 393px en las cinco pantallas del panel: ninguna se corre.

### La tabla de Equipo: los anchos van declarados (2026-10-22)

Lo reclamó el cliente con una captura: el nombre se leía a seis letras
—"Darinl"— mientras un teléfono de nueve dígitos sobraba media caja. La causa
es simple y vale tenerla escrita: **el nombre era la única columna sin ancho**,
así que en una tabla de diez columnas era la que cedía todo el espacio.

Se arregló declarando el ancho de cada columna, con `table-fixed`. **Esa
tabla ya no existe** —al día siguiente pasó a ser una tarjeta por persona,
ver arriba— pero la lección se mantiene y vale para cualquier otra: los
anchos salen de lo que cada campo muestra de verdad —un nombre y apellido,
un teléfono, "Contratado", "no aplica"— y no de repartir parejo. Un campo
sin ancho declarado es el que termina cediéndoselo todo a los demás.

**La cuenta bancaria, que llegó después, NO es una columna más** (2026-10-22):
va en **una segunda línea bajo cada persona**, de ancho completo. Con diez
columnas, la once dejaba *Crear link* y *Desactivar* fuera del borde, que es
exactamente lo que esta tabla acababa de arreglar. Y un número de cuenta con
banco, tipo y RUT necesita ancho de verdad: en una celda angosta se leería de
a seis caracteres, el mismo problema del nombre pero en el campo donde un
error se paga caro.

**De paso, el marco del panel pasó de `max-w-6xl` a `max-w-7xl`.** Esta tabla
es lo más denso que tiene y con 1152px terminaba cortando la última columna,
que es justamente donde están *Crear link* y *Desactivar*. El costo a asumir:
en el calendario, una semana de dos días deja más aire a la derecha, porque la
grilla sigue siendo de cuatro columnas. Los textos no se estiran: siguen
acotados a `max-w-2xl`.

### Una sola ventana para el día, y el cierre (2026-10-23)

**"Pasar lista" se jubiló como paso aparte.** Hasta el 2026-10-22 había tres
pantallas para un mismo día: se planificaba en el calendario, se marcaba
quién llegó en el planificador, y los montos y la propina vivían en otra
ventana —*Pasar lista*— que solo se abría desde la página del día. A un día
de preparación no se llega por ahí, así que el circuito quedaba cortado
justo antes de lo que importa: un turno sin montos no suma nada ni entra en
el informe.

El cliente lo pidió al revés, y así quedó:

| Dónde | Qué se hace |
|---|---|
| **Calendario de la portada** | Se **planifica**, con las reservas a la vista: cuánta gente viene, cuántos menús, entonces cuánto equipo |
| **`/turnos`** | Se **confirma todo**: quién vino, los montos, los ajustes, la propina — cualquier día, abierto, privado o de preparación — y **es el único lugar donde se cierra** |
| **La página del día** | Se mira ese día completo —reservas, equipo, extras— y se escriben los montos y la propina; para cerrarlo manda a `/turnos` |

Son la **misma ventana**; lo único que cambia es desde dónde se abre y si
trae el botón de cerrar.

**El botón de cerrar quedó en un solo lugar** (2026-10-30, conversado con el
cliente: *"en calendario se hace otra cosa, el fin no es cerrar la fecha
aquí"*). Estaba en las tres pantallas, y tres caminos al mismo paso final no
son una comodidad: son una duda —*¿lo cierro acá o allá? ¿es lo mismo?*—
para quien no maneja sistemas así. Se eligió `/turnos` porque es la pantalla
que **ya pide** el cierre: al entrar lista arriba los días pasados a los que
les falta algo, así que entrar es que te digan qué hacer.

**Se descartó mostrarlo según el rol**, que era la otra salida sobre la
mesa: el rol contesta *quién puede*, no *dónde se hace*, y acá cierran los
dos roles que entran al panel. Esconderlo por rol habría dejado la misma
pregunta en pie para quien sí lo ve.

El costo a asumir: desde la página del día hay que dar un salto a `/turnos`.
Las dos pantallas lo dicen con un enlace, en vez de dejar al botón ausente
pareciendo un error.

**Lo que la ventana hace ahora**, de arriba abajo: asignar por puesto, crear
a alguien que falte, marcar **— / Vino / No vino**, escribir la jornada, las
horas extra y los **ajustes con su motivo**, poner la **propina del día** —
que el panel reparte— y **cerrar el día**.

**Abajo, las tres acciones van en una sola línea** (2026-10-23). Antes
compartían fila con el resumen y la fila envolvía, así que *Guardar* quedaba
en un renglón y *Guardar y cerrar el día* en el siguiente: se leían como dos
cosas de distinta categoría, cuando justamente lo que hay que entender de un
vistazo es la diferencia entre **anotar un cambio** y **declarar cerrado el
día**. Ahora el resumen va arriba en su propia línea y los botones abajo sin
envolver —delineado el que solo guarda, relleno el que cierra—, y en un
teléfono el tercero se recorta a "Guardar y cerrar", que dice lo mismo en
menos espacio.

### Lo que es un valor se guarda solo; lo que declara algo se aprieta (2026-10-30)

Lo pidió el cliente con la distinción ya hecha: *"una cosa es guardar un
cambio que hiciste en un detalle, se paga ahora 30 en vez de 28. Y otra cosa
es cerrar la fecha"*. Y tenía razón en que el panel las trataba igual: abajo
de la ventana del día había dos botones hermanos —**Guardar** y **Guardar y
cerrar el día**—, del mismo tamaño y a dos centímetros, y uno de los dos no
se deshace solo.

Entonces se revisó pantalla por pantalla y salió una regla, que es lo que
hay que recordar:

- **Se guarda solo lo que es un valor sobre algo que ya existe.** La ventana
  del día y la de las actividades extras editan montos, asistencias, ajustes
  y propina de gente que ya está en la lista. Ahí el botón no decidía nada:
  solo se podía olvidar. Ya no existe — lo que se escribe se guarda, y una
  línea abajo a la izquierda lo dice (*Guardando… / ✓ Guardado*, y en rojo
  con **Reintentar** si el servidor se quejó).
- **Se aprieta Guardar cuando lo que se edita es la lista misma**: `/equipo`,
  las fichas de `/extras`, `/menus`, `/configuración`, `/usuarios`. Ahí el
  nombre **es** la identidad de la fila y la pantalla reescribe la pestaña
  entera, así que guardar a mitad de palabra —mientras alguien borra un
  nombre para reescribirlo— mandaría una fila sin nombre, el servidor la
  descartaría (hace bien) y la ficha desaparecería bajo los dedos. Esas
  pantallas ya tienen su botón **dentro de cada ficha**, que era el problema
  de verdad.
- **Cerrar el día nunca se guarda solo.** Es una declaración con nombre y
  hora: se aprieta, y **pregunta antes** — *"¿Cerrar el martes 20 de octubre?
  Queda anotado que lo cerraste tú, con la hora. Se puede reabrir después."*
  Reabrir también pregunta.

Detalles que vale la pena tener escritos, todos en `usarAutoguardado.ts`:

- **Espera a que dejen de escribir** (600ms). Sin eso, un monto de cinco
  dígitos serían cinco guardados y el cuarto llegaría con un número a medio
  escribir.
- **Nunca hay dos peticiones a la vez**: lo que llegue mientras una está en
  vuelo queda anotado y se manda apenas vuelva. Se guarda el día entero, así
  que el último gana y eso es justo lo correcto.
- **Al cerrar la ventana se manda lo que quede en el reloj**, y además hay un
  seguro al desmontar para el escape rápido. Comprobado: escribir la propina
  y apretar Escape en el mismo segundo deja el monto guardado.
- **Cerrar el día fuerza el guardado primero**, en ese orden: al revés, el
  servidor miraría si falta alguien por marcar sobre los datos de antes del
  último cambio y rechazaría cerrar un día que se acaba de completar.
- **Editar un día cerrado ya no lo reabre.** Antes *Guardar* en un día
  cerrado mandaba `cerrar: false`, o sea que corregir un ajuste olvidado lo
  reabría sin que nadie lo pidiera. Hoy reabrir es un botón propio.

### Cerrar el día

**Cerrar es una declaración, no un cálculo.** Se podría decir que un día
está cerrado cuando nadie quedó sin marcar, pero eso confunde dos cosas: que
no falte nada por marcar es una condición, y que alguien **haya revisado y
dado por cerrado** es un hecho. Un día sin equipo cumpliría la condición sin
que nadie lo mirara, y un día al que falta agregarle a quien llegó de más se
vería completo justamente porque falta. Por eso el cierre se guarda con el
**nombre de quien cerró y la hora**: es lo que después permite preguntarle.

- Vive en una pestaña propia, **`Cierres`** (Fecha · Cerrado por · Cuándo),
  una fila por día cerrado. Cerrar dos veces no agrega dos filas.
- **Se puede reabrir**: aparece un ajuste olvidado, alguien reclama su
  propina. Queda en la bitácora como cualquier otra acción.
- **Lo único que bloquea el cierre es la asistencia sin marcar**, y se
  comprueba en el servidor además de en la pantalla. Un turno sin marcar no
  suma, así que cerrar con turnos a medias sería cerrar con el total mal.
- **La propina y las actividades extras avisan pero no bloquean.** Un día
  sin propina existe —no todos los días dejan— y una actividad sin confirmar
  es plata de otro bolsillo que se arregla en su propia página. Bloquear por
  ellas obligaría a inventar un cero para poder cerrar, y un cero inventado
  es peor que un aviso.

**`/turnos` muestra arriba lo que falta por cerrar**, que es lo que el
cliente pidió: *"una vez que el día pasó, el panel puede mostrar: oiga,
falta confirmar tantos trabajadores y actividades extras para cerrar el
día"*. Cada día pendiente es un botón que abre su ventana, y dice qué le
falta: cuánta gente sin marcar, cuántas extras sin confirmar, si nadie anotó
propina. **Un día que todavía no llega no aparece**: nadie puede decir quién
vino a un sábado que no ha ocurrido.

### Lo que cuesta un día

**Un turno sin marcar no suma nada.** Antes de que alguien diga si vino o
no, el panel no da por venida a una persona ni por pagada una jornada. Esa
regla no cambió con el rediseño; lo que cambió es dónde se marca.

**Lo que se guarda queda congelado, y esa es la decisión importante.** El
monto de la jornada y la modalidad viajan **dentro del turno**, no se
recalculan desde la ficha del trabajador. Si en marzo se le sube el sueldo a
alguien, los turnos de noviembre no pueden cambiar solos: las cuentas de
meses cerrados dejarían de cuadrar.

**Los sueldos los propone el servidor, no el navegador.** Un turno sin
montos los hereda de la ficha al guardarse (`guardarEquipoDelDia`). Así el
encargado puede confirmar y corregir sin que su pantalla reciba nunca la
tabla de sueldos del equipo entero — que no necesita, y que no es dato suyo.
Con montos ya escritos manda lo que venga: ahí el monto es un hecho del día
y no una propuesta.

Un descuento mayor que la jornada deja el día en **cero, nunca en negativo**.
Si de verdad hay que cobrarle algo a alguien, eso no es un turno con monto
negativo, es otra conversación.

### Los ajustes son varios, y cada uno con su motivo (2026-10-23)

Lo pidió el cliente con el ejemplo exacto: *"extra positivo por hora extra y
extra negativo por adelanto"*. Con un solo ajuste había que sumarlos a mano
y escribir un motivo que explicara los dos, o sea perder justo lo que el
ajuste sirve para dejar: **el porqué de cada peso**, para quien revise ese
pago un mes después.

Se guardan en las **dos columnas que ya existían** —`Ajuste` y `Motivo del
ajuste`— como dos listas en paralelo separadas por `|`. Se decidió así sobre
abrir una pestaña nueva por una razón concreta: el caso corriente es **uno**,
y entonces la celda se ve exactamente como antes (`-5000` · `llegó tarde`),
así que **lo ya escrito se sigue leyendo sin migrar nada** y la planilla
sigue siendo editable a mano por alguien que no sepa de esto. Con dos dice
`5000|-20000` · `hora extra|adelanto`, que también se entiende.

**Manda la lista de montos**: si alguien edita una celda y no la otra, los
motivos que falten se leen vacíos en vez de desalinear los pares. Y el
separador se saca de los motivos al guardar, porque un motivo con `|`
partiría su propio ajuste en dos al volver a leerlo.

#### El ajuste se agrega desde la línea de la persona (2026-10-30)

**Estaban, y el cliente no los encontraba**, que a efectos prácticos es lo
mismo que no tenerlos. Lo dijo así: *"hay que ponerle un ojo al tema de
horas extras, que era pensado con comentario para definir por qué se suma o
resta un monto y que puedo agregar distintos montos. Eso en esta vista no lo
veo, y no sé si se nos perdió en el camino"*. Y el caso que dio es el de
todos los días: llegó dos horas tarde y hay que descontarle, se le adelantó
plata de la caja, le toca más por feriado, por hora extra o por haberlo hecho
muy bien.

Dos causas, las dos arregladas:

- **Estaban en la tabla de abajo de la ventana del día**, y quien planifica
  mira la parte de arriba. Ahora cada persona tiene un **`+ Ajuste`** en su
  línea; **es el mismo ajuste, no una segunda forma de anotar lo mismo**, y
  el cursor se va hasta el campo —que está más abajo— porque si no el botón
  parecería no hacer nada. La línea muestra además lo que suman, con el signo
  adelante: **−$18.000**, no `$-18.000`, que se lee como un error de tipeo
  justo donde importa saber si se suma o se resta.
- **La ficha decía "Hora extra" y parecía el lugar.** Ahí no hay ningún
  motivo que escribir porque ese campo es **cuánto vale una hora extra de esa
  persona**, de costumbre, no cuánto se le pagó un sábado. El bloque Pago de
  la ficha ahora lo dice con todas sus letras y manda al día.

#### Los días pasados se editan, y eso es a propósito

Lo pidió confirmado el cliente: *"siempre puede ser que necesito agregar o
cambiar algo en una fecha que ya está en el pasado… por lo menos poder
revisarla"*. En `/turnos` se llega a cualquier mes con *Mes anterior*, se
abre cualquier día y **se edita, esté cerrado o no**. Comprobado contra un
sábado pasado y ya cerrado: se le agregó un ajuste, quedó guardado y **el día
siguió cerrado** — editar no reabre, que es lo que se arregló el 2026-10-30.
Reabrir es un botón propio y queda en la bitácora.

Lo que el panel no hace, y conviene tenerlo claro: **si ese día ya se pagó,
el arreglo es con la persona**. Acá queda anotado el porqué, con su monto y
su motivo, para que la próxima planilla lo recoja.

### Por turno o contratado (2026-10-21)

Lo pidió el cliente porque **los contratados se comportan distinto**:

- **Por turno** — se le paga por jornada trabajada, y cada turno suma al
  costo del día.
- **Contratado** — tiene sueldo, y ese sueldo no sale de acá. Sus turnos
  **no suman jornada**: contarlos sería pagar dos veces lo mismo, una en la
  liquidación y otra en la caja del sábado. Sí se le anotan **horas extra y
  ajustes**, que son del día y se pagan aparte.

La celda en blanco es **Por turno**, para que las fichas escritas antes de
esta distinción sigan significando lo mismo. La modalidad se congela en el
turno junto con el monto, y además explica por qué una fila vale cero:
"contratado" se entiende, un cero pelado parece un error.

El total del día se muestra como **"por turnos de este día"** y los
contratados se cuentan aparte, con su propia glosa.

### La ficha, desde el día: crear y completar sin salir (2026-10-23)

El desplegable de cada puesto tiene debajo **+ Nuevo trabajador**, y cada
persona ya asignada tiene al lado un **ficha**. Las dos abren **la misma
ventana**, porque es el mismo formulario: lo único que cambia es si la
persona ya existe. En `/extras` es igual, con los colaboradores.

Existe porque sin él la lista vacía era un callejón: no se podía planificar
sin irse a `/equipo`, agregar a alguien, volver y empezar de nuevo. **Lo que
crea no es un caso especial**: queda en la lista como cualquier otro.

**Y desde el 2026-10-23 pide también los datos de pago** —teléfono, montos,
correo del comprobante y cuenta bancaria—, al crear y al editar. Antes no:
el argumento escrito era que crear a alguien en mitad de la planificación es
apurado y un número de cuenta mal tecleado no conviene apurarlo. Suena
razonable y no resistió el uso. El cliente lo dijo sin rodeos —*"aún no
puedo agregar los datos personales de las actividades extras"*—: los campos
existían, pero **solo en `/equipo` y en `/extras`**, y quien arma un sábado
no pasa por ahí. Resultado: fichas a medias y la planilla del pago semanal
sin cuentas. Ahora se piden donde se está trabajando, *"y así todos los
colaboradores están completos directo"*.

**El nombre no se edita desde el día, a propósito.** Los turnos y las
actividades ya guardadas apuntan a la persona por su nombre; renombrarla
desde la ventana de un día dejaría los otros días apuntando a nadie. Eso se
hace en `/equipo` o en `/extras`, que es donde el panel avisa del daño
(`sinFicha()`).

Va por `POST /api/equipo/trabajador` para crear y `PATCH` para editar —y sus
gemelos en `/api/extras/colaborador`—, que tocan **una fila** en vez de
guardar la lista entera. No es un detalle: la pantalla del planificador no
tiene la lista completa en la mano —puede estar desactualizada— y mandarla
entera sería arriesgarse a pisar el cambio de otra persona. Si el nombre ya
existe no falla: devuelve el que hay y lo dice.

**Lo que un encargado no recibe, tampoco lo puede pisar.** Su ventana no
trae montos ni cuenta bancaria, y el `PATCH` conserva los que ya estaban en
vez de escribir lo que venga: si no fuera así, que un encargado corrigiera
un teléfono borraría el sueldo y la cuenta de esa persona.

**Dos ventanas abiertas a la vez obligaron a arreglar `Dialogo`**: las dos
escuchaban Escape en el documento, así que una tecla cerraba las dos de
golpe y se perdía lo escrito en la de atrás. Ahora hay una pila y solo
responde la de encima.

### La planilla semanal, el link que se manda al grupo

En el calendario, junto al rango de cada semana, **Enviar planilla semanal**
copia un link a `/semana/<llave>?semana=<lunes>`.

**Muestra lo mínimo para organizarse**: quién trabaja cada día en qué
puesto, a qué hora abre, cuánta gente se espera y cuántas reservas son.

**Y nada más: ni un peso, ni un menú, ni un nombre de cliente.** Está hecho
con la idea de que va a circular más de lo que uno quisiera. Lo que un
trabajador necesita de su propio día —los menús que hay que preparar, lo que
gana— vive en **su link personal**, que es de una sola persona. Separarlos es
justamente lo que permite mandar este sin pensarlo dos veces.

- La llave vive en `Config` (`token_planilla`) y **no se genera sola**: que
  exista un link que abre sin contraseña tiene que ser decisión de alguien.
  Se crea al apretar el botón la primera vez.
- **La manda el encargado, no solo el administrador** (2026-10-29, lo pidió
  el cliente). Mandar la planilla es parte de organizar la semana, que es su
  trabajo, y el link **no le abre nada**: esa página muestra menos de lo que
  ya ve en el panel. Antes el botón estaba a la vista para los dos pero
  crear la llave era de `links`, o sea del administrador, así que a un
  encargado le fallaba justo la primera vez — el peor momento. Ahora crear
  es del permiso `planilla`.
- **Renovarla invalida todas las copias** que anden dando vueltas, que es lo
  que hay que hacer cuando alguien deja el equipo. El costo a asumir: también
  deja de servir el link de quien sí trabaja, así que hay que volver a
  mandarlo.
- **Renovar también es del encargado**, por decisión del cliente ese mismo
  día. El primer corte dejaba renovar con el administrador —invalidar las
  copias de todo el equipo suena a administrar una credencial—, pero quien
  se entera de que alguien se fue, y quien va a tener que volver a mandar el
  link, es el mismo encargado: partir ese trabajo en dos personas era
  dejarlo a medias. **Quitarlo sí se queda en `links`**: renovar deja la
  planilla andando con un link nuevo, quitarlo la apaga.
- **El botón de renovar estaba sin hacer hasta el 2026-10-29.** La API
  aceptaba `renovar` y `quitar` desde el primer día, pero no había dónde
  apretarlo: ni el administrador podía. Hoy es una línea chica bajo los
  botones del calendario, visible **solo cuando ya hay una llave creada**, y
  **pide confirmación**, porque es el único botón de esa pantalla que rompe
  algo que ya estaba andando.
- Muestra solo los días **con alguien asignado**: siete columnas para un
  negocio que abre dos es una tabla llena de huecos, y esto se lee en un
  teléfono.
- Un nombre **tachado** es alguien que no llegó ese día.
- Como `/mi/`, no dibuja la barra del panel.

### Lo que ve cada quien, de un vistazo

| | Planilla semanal | Link personal |
|---|---|---|
| Quién trabaja, en qué puesto | toda la semana | solo sus días |
| Personas y reservas del día | sí | sí |
| Menús a preparar | **no** | sí |
| Plata | **no** | solo la suya |
| Actividades extras (jinetes, pintacaritas) | **no** | **no** |
| A quién se manda | al grupo | a una persona |

### Los hooks van todos arriba, antes de los `return` (2026-10-22)

**La página del día estuvo caída y se vio como un "Application error" pelado.**
`DayView` tiene dos `return` tempranos —el aviso de error y el "Cargando…"— y
dos `useMemo` quedaron debajo de ellos. En la primera pasada, con las reservas
todavía sin llegar, esos dos hooks no corrían; en la segunda sí, y React tumba
el árbol completo con el error #310 (*rendered more hooks than during the
previous render*).

Vale la pena tenerlo escrito por **cómo se ve el fallo**, que es lo que lo hace
caro: una pantalla negra con una línea de texto y un número de error minificado,
sin nada que apunte al archivo. No se parece en nada a su causa.

La regla, entonces: **en un componente, todos los hooks van antes del primer
`return`.** Lo que va debajo son constantes derivadas, no hooks.

### Un componente declarado dentro de otro se lleva el foco (2026-10-23)

La hermana de la regla anterior, y se vio en la misma semana: **en `/equipo`
no se podía escribir un nombre.** Se tecleaba la primera letra y el foco se
iba a `body`; el resto se perdía en el vacío.

La causa es una línea que parece inofensiva: `Campo` —el rótulo encima del
input— estaba declarado **dentro** del componente. Una función nueva en cada
dibujado es, para React, **otro tipo de elemento**: desmonta lo que había y
monta uno nuevo. Con un `input` adentro, eso es perder el foco a cada letra.

Vale tenerlo escrito porque el síntoma no se parece a la causa —se lee como
un problema del teclado o del navegador— y porque llegó con el cambio a
tarjetas, o sea con un cambio puramente visual. La regla: **un componente se
declara al nivel del módulo, nunca dentro de otro componente.** `Campo` vive
hoy en su propio archivo, `Campo.tsx`, y lo importan las cuatro pantallas
que lo usan.

**El mismo día apareció el hermano en el guardado**: para un encargado, la
respuesta de `PUT /api/equipo` no trae `puestos` —no los puede cambiar—, y
la pantalla los tomaba igual. Con eso `puestos` quedaba en `undefined` y
toda la página caía al "Cargando…" del primer `return`: un guardado que
salía bien se veía peor que uno que falla. Ahora solo se reemplaza lo que el
servidor dice haber guardado.

### La propina (2026-10-22)

**Se reparte en partes iguales entre quienes vinieron ese día y participan.**
Esa es la regla que dio el cliente, y la excepción que pidió es una casilla
por persona en `/equipo`: quien la tiene desmarcada sigue en la planilla de
trabajo pero fuera del reparto.

**La casilla viene marcada por defecto** —en la planilla, la celda en blanco
es "sí"— porque la regla es que participa todo el equipo; no entrar es la
excepción, y una excepción se marca.

El monto lo pone un encargado **en la ventana del día**, junto con la
asistencia: escribe el **total** y el panel lo reparte. No hay que calcular
nada a mano.

**Se llega por dos puertas y las dos dan al mismo campo** (2026-10-22). En la
página del día, el bloque Equipo muestra siempre una línea "Propina del día",
con el monto repartido o un **sin anotar**, y su botón abre la ventana del
día con el cursor puesto en ese campo. No es un segundo formulario: es el
mismo, y se guarda en el mismo lugar.

El motivo es que se llega a ese día por los dos lados —a cerrar el turno, o a
acordarse de la propina— y la propina vivía al final de una tabla dentro de
una ventana que hay que abrir, o sea invisible hasta que alguien supiera que
estaba ahí. Por lo mismo la línea aparece **desde que hay alguien asignado**,
no solo cuando ya se pasó lista: un "sin anotar" es lo que hace que se note
que falta.

**La regla vive en una sola función, `repartirPropina()`.** El cliente avisó
que puede cambiar, así que cambiarla es tocar ahí y nada más — no hay un
segundo lugar donde la división esté escrita.

Decisiones que vale la pena tener escritas:

- **La propina NO es sueldo y no entra en `pagoDe()`.** Esa plata no sale del
  negocio, pasa por él: meterla en el total haría que el costo de un sábado
  subiera porque los clientes dejaron más propina, y volvería imposible
  contestar "¿cuánto me costó el equipo?". Va en su propia columna en el
  informe, en la planilla descargable y en la vista del día.
- **Se guarda lo repartido, no el pozo.** Cada turno lleva la parte de esa
  persona. Así cambiar después quién participa no reescribe lo que ya se
  entregó — el mismo criterio que los montos de la jornada. El total del día
  se recupera sumando las partes.
- **Se reparte hasta el último peso.** Dividir 100.000 entre tres da 33.333 y
  sobran 2: en vez de perderlos o dejar decimales que nadie entrega en
  efectivo, se le da un peso de más a los primeros. La suma de las partes es
  siempre exactamente el total.
- **Venir y participar son dos condiciones distintas**, y las dos se piden.
  No venir es un hecho del día; no participar es una decisión sobre la
  persona.
- **Quien todavía no tiene ficha participa.** Lo más probable es que sea
  alguien recién agregado, y dejarlo fuera en silencio sería peor que
  incluirlo de más y que alguien lo corrija.
- **En el link personal sí va sumada**, porque para quien la recibe es todo
  lo mismo, pero mostrada aparte: "$30.000 + $12.000 propina".

### El informe del equipo, por semana o por mes (2026-10-21)

`/informe`, solo administrador. Por cada persona del periodo: días que vino,
jornadas, horas extra, ajustes y total. Abajo, el total del periodo.

**La descarga es el punto, no un extra.** Quien paga tiene que juntar la
información de todos y pasarla a quien corresponda, y que esa pega sea
copiar una tabla a mano es justo lo que esto viene a evitar. Por eso el CSV
trae el **detalle día por día con el motivo de cada ajuste**, no los totales:
los totales se miran en pantalla, el detalle es lo que se entrega.

**Desde el 2026-10-22 trae además las actividades extras y las cuentas
bancarias**, en su propia tabla en pantalla y en el mismo archivo al
descargar: un solo pago a la semana, con cada fila diciendo si es equipo o
actividad extra. Ver "Las actividades extras".

**Semana, mes y rango libre son el mismo cálculo.** Por dentro todo es un
rango de fechas (`informeDelPeriodo`), así que no hay tres versiones de la
misma suma esperando a desalinearse. `rangoDelPeriodo()` distingue semana de
mes por el largo del texto: `AAAA-MM` es un mes, `AAAA-MM-DD` es la semana de
ese lunes. El **rango libre** (2026-10-22) lleva sus dos fechas aparte,
porque es justamente lo que no tiene nombre: una quincena, un fin de semana
largo, lo que quedó pendiente de pagar. Si las fechas vienen al revés **se
ordenan**, en vez de devolver un informe vacío que parece que no hubo turnos.

**Muestra a quien no vino y a quien quedó sin marcar, con total cero.** Una
persona que desaparece del informe se lee como que no trabajó, y lo que pudo
pasar es que nadie cerró ese día. Por eso además hay un aviso arriba cuando
quedan turnos sin pasar lista: el total está incompleto mientras tanto, y
conviene que eso se vea antes de pagar.

**Un contratado suma cero en jornadas** y lo dice en su fila, porque su
sueldo no sale de acá; lo que aparece son sus horas extra y ajustes.

### Dónde está la línea entre el encargado y el administrador, en la plata

Vale tenerla escrita porque no es obvia:

- **Los montos de un día son del encargado.** Los escribe él al pasar lista
  y los ve en la página de ese día. Es su trabajo.
- **El informe del periodo es del administrador.** Lo que el encargado
  necesita para cerrar un turno es el día que tiene delante, no el historial
  de sueldos de todo el equipo.

Esa pregunta se contestó el **2026-10-22**: sí es otra persona, así que
existe el rol **pagos**.

### El rol de pagos (2026-10-22)

**Una sola acción: leer el informe.** Nada más. Hay una prueba que lo fija
contando cuántas acciones puede —una, no dos—, para que agregar un permiso
nuevo a la tabla no se lo regale sin que nadie se entere.

No ve el calendario, ni reservas, ni clientes, ni el equipo, ni la
configuración, ni las cuentas, ni la bitácora. Existe precisamente para que
quien junta las cuentas no tenga que entrar con la del administrador.

Dos detalles que lo hacen funcionar:

- **`/api/informe`, una ruta propia que devuelve solo turnos.** El informe
  antes leía `/api/equipo`, por donde viajan reservas, trabajadores y
  puestos. Darle "ver" a la cuenta de pagos para que pudiera sacar sus
  cuentas habría sido abrirle el panel entero.
- **El middleware la manda de `/` a `/informe`.** Sin eso aterrizaría en una
  portada que carga y falla, y parecería que el panel está roto en vez de
  que esa parte no es suya. El enlace de la marca sigue apuntando a `/`, que
  para ella redirige — no hay callejón.

### Quién puede hacer qué (2026-10-21, cuarto rol el 2026-10-22)

Cuatro roles, y la tabla vive en `PERMISOS`, en `panel/src/lib/auth.ts`:

| | Administrador | Encargado | Pagos | Trabajador |
|---|---|---|---|---|
| Ver el calendario y las reservas | sí | sí | — | — |
| Anotar reservas, abrir y cerrar días | sí | sí | — | — |
| Asignar turnos y editar la lista de trabajadores | sí | sí | — | — |
| Confirmar el día: asistencia, montos, propina, cerrarlo | sí | sí | — | — |
| Agendar actividades extras y confirmarlas | sí | sí | — | — |
| Montos habituales y cuentas bancarias | sí | — | — | — |
| Puestos y su regla "uno cada N" | sí | — | — | — |
| Precios, menús y configuración | sí | — | — | — |
| Links personales, diagnóstico y Shopify a mano | sí | — | — | — |
| **Mandar la planilla semanal**, crear y renovar su link | sí | **sí** | — | — |
| Cuentas del panel y bitácora | sí | — | — | — |
| **El informe del equipo** | sí | — | **sí** | — |
| Ver **sus propios** turnos | — | — | — | sí |

**El encargado sí agrega trabajadores**: lo pidió el cliente explícitamente.
Lo que no toca es la plata, la configuración y las credenciales.

**El trabajador no figura en ninguna fila de la tabla de permisos, y ese es
el punto**: no hay una sola acción del panel que pueda ejecutar. Su acceso no
pasa por ahí.

**El menú se dibuja consultando esa misma tabla**, no una lista aparte de
"esto es de administrador". Con cuatro roles, una segunda lista era una
segunda verdad: el día que alguien agregara un rol, el menú le ofrecería
puertas cerradas o le escondería las suyas.

### El middleware autentica, cada ruta autoriza

Son dos preguntas distintas —"¿quién eres?" y "¿puedes hacer esto?"— y las
contesta código distinto a propósito. Si el permiso se comprobara solo en el
middleware, **cualquier forma de saltárselo abriría de una vez todas las
rutas**: es la forma exacta del CVE-2025-29927, el que obligó a subir Next
hace unos días.

Por lo mismo, **el rol se vuelve a derivar de la cookie firmada en cada
ruta**, en vez de leerlo de una cabecera que ponga el middleware: una
cabecera la puede mandar cualquiera.

De ahí salió un arreglo concreto: `/api/shopify/sincronizar` se contentaba
con un `x-panel: si`, confiando en que el middleware ya había pedido la
contraseña. **Eso dejó de alcanzar cuando el panel pasó a tener más de un
rol**, porque un encargado podía agregar esa cabecera a mano. Ahora comprueba
el permiso de verdad.

`GET /api/config` y `GET /api/menus` también son de administrador: un
encargado que entrara a esas pantallas las vería cargar y fallar en cada
guardado. Ahora le dicen "esta parte no es tuya", que es lo que pasa.

### Cuentas con nombre y sesión (2026-10-21)

**La autenticación básica se jubiló.** Hasta ese día el panel usaba la
ventanita del navegador con una clave por rol. La reemplazó una **cookie de
sesión firmada**, y el motivo no es estético: **la bitácora la necesitaba.**
Con una clave compartida, cada línea del registro decía "lo hizo un
encargado" y no servía para preguntarle a nadie.

Lo que se gana de paso, y que la autenticación básica nunca tuvo:

- **Un botón de cerrar sesión.** Antes había que cerrar el navegador entero,
  o sea que en un equipo que comparte dispositivos el turno siguiente
  entraba como el anterior — justo lo que la bitácora necesita que no pase.
- **Saber con qué cuenta estás adentro**: el nombre va en la barra.

Las piezas y por qué están separadas así:

| Archivo | Qué hace | Dónde corre |
|---|---|---|
| `sesion.ts` | Firma y lee el token (WebCrypto) | Middleware **y** rutas |
| `usuarios.ts` | Verifica contraseñas (`scrypt`, `node:crypto`) | Solo rutas |
| `permisos.ts` | Resuelve quién llama y si puede | Rutas |

**`sesion.ts` usa WebCrypto y no `node:crypto` porque el middleware corre en
Edge**, donde `node:crypto` no existe. Verificar una contraseña pasa una sola
vez, al entrar, en una ruta normal; leer la sesión pasa en cada petición,
también en el middleware. De ahí la división, y por eso todo en `sesion.ts`
es asíncrono.

**La misma trampa, del otro lado:** `ROLES_DE_CUENTA`, `LARGO_MINIMO_CLAVE` y
`ENCARGADO_COMPARTIDO` viven en `auth.ts` y no en `usuarios.ts` porque los
importa un componente de navegador, y un `import` desde el cliente arrastra
`node:crypto` al bundle y tumba el build. **Lo que toque el navegador no
puede importar `node:crypto`**, ni directo ni a través de otro archivo.

Detalles que vale la pena tener escritos:

- **La sesión dura 7 días** (decidido con el cliente el 2026-10-21).
- **El rol viaja firmado dentro del token**, para no consultar la planilla en
  cada petición. El costo a asumir: **desactivar a alguien no corta su sesión
  en curso.** Para echar a alguien ya mismo hay que cambiar `PANEL_CLAVE` o
  `SESION_SECRETO`, lo que cierra **todas** las sesiones.
- **El token está firmado, no cifrado.** Cualquiera que lo tenga puede leer
  qué usuario y qué rol dice; da lo mismo, porque esa persona ya tiene la
  sesión entera. Lo que importa es que no pueda **cambiarlos**, y eso lo
  impide la firma — hay una prueba que intenta ascenderse a admin editando el
  payload y rebota.
- **Si no hay `SESION_SECRETO`, se deriva de `PANEL_CLAVE`.** No es comodidad:
  sin eso, el primer despliegue después del cambio habría dejado a todos
  afuera hasta que alguien creara una variable nueva. La consecuencia:
  **cambiar `PANEL_CLAVE` cierra todas las sesiones abiertas.**
- **Las contraseñas se guardan como huella `scrypt`, nunca en claro**, ni
  siquiera para el administrador. La huella vive en la planilla, así que un
  SHA pelado se rompería con un diccionario; `scrypt` hace que cada intento
  cueste.
- **El panel no tiene límite de intentos.** Vercel no trae uno y montarlo con
  funciones sin estado compartido daría una falsa sensación de protección.
  El freno real es el **largo mínimo de 12 caracteres** al poner una
  contraseña.
- **Un usuario que no existe y una clave equivocada dan el mismo mensaje.**
  Distinguirlos diría cuál de las dos mitades se acertó.
- **`PANEL_USUARIO` / `PANEL_CLAVE` siguen siendo una cuenta de
  administrador**, y no se quitan nunca: es la puerta de emergencia para el
  día en que la planilla no responda o alguien borre la última cuenta.
- **`PANEL_ENCARGADO_*` sigue funcionando**, para no romper lo que ya estaba
  configurado, pero en la bitácora aparece como **"encargado (clave
  compartida)"**. Es a propósito: una línea así no identifica a nadie y
  conviene que se note.
- **Desactivar a alguien es mejor que borrarlo**: sus líneas de la bitácora
  siguen diciendo quién fue.

### La bitácora

Una pestaña `Bitácora` con cuándo, quién, rol, acción y detalle. Se lee en
`/bitacora` (las últimas 200; el resto se busca en la planilla).

- **Se escribe desde el servidor, nunca desde la interfaz.** Una llamada
  directa a la API tiene que quedar registrada igual que un clic; si
  dependiera del navegador, bastaría con no usarlo.
- **Queda el rastro, no el valor anterior.** Guardar el antes y el después
  sería un historial completo, otra cosa y mucho más pesada. Esto sirve para
  saber a quién preguntarle, no para deshacer.
- **Si la anotación falla, la acción NO se revierte.** Es una decisión con
  filo: puede quedar un cambio hecho y sin registrar. La alternativa
  —cancelar la reserva que alguien acaba de anotar porque la planilla no
  aceptó una línea de registro— es peor para el negocio, y el fallo queda en
  los logs de Vercel.
- **Las horas son de Chile**, no UTC. Una línea que diga 03:40 cuando en el
  local eran las 00:40 manda a buscar al turno equivocado, y el servidor de
  Vercel no está en Chile.
- **Los tokens de los links personales no se anotan**: la bitácora la lee
  gente, y una credencial copiada ahí sería una credencial más dando vueltas.
- El costo a asumir: **una escritura más a la planilla por cada acción.** Con
  este volumen no se nota.

### El link personal del trabajador

`/mi/<token>`. Se manda por WhatsApp y no pide contraseña ni correo. Se
administra desde `/equipo`, columna **Link personal**: crear, copiar, renovar
y quitar — **solo el administrador**, aunque el encargado sí edite la lista.
Un encargado ni siquiera recibe los tokens: la ruta se los borra de la
respuesta.

Se eligió sobre una clave compartida de solo lectura por una razón concreta:
**cuando el panel tenga sueldos y ajustes, una clave compartida dejaría que
cualquier trabajador viera lo que gana y lo que le descontaron a todos los
demás.**

- **El token se guarda tal cual en la planilla, no como hash, y es a
  propósito.** No es una contraseña: es un link que el administrador tiene
  que poder volver a copiar cuando alguien lo pierda. Con un hash habría que
  renovarlo cada vez, o sea cambiarle el link a la persona por haberlo
  extraviado. Quien ve la planilla ya es el administrador.
- **Renovar invalida el anterior en el acto**, que es lo que hay que hacer
  cuando alguien pierde el teléfono.
- **Desmarcar "activo" también cierra la puerta.** Si no, alguien que se fue
  seguiría viendo la planificación.
- **Un token vacío no encuentra a nadie**, aunque haya trabajadores sin
  token. Si calzara, entrar a `/mi/` sin nada detrás abriría la ficha del
  primero de la lista.
- **Un link inválido y uno revocado dicen lo mismo.** Decir "ese link ya no
  sirve" confirmaría que existió, y a quien sí es trabajador no le sirve de
  nada: la salida es la misma, pedir otro.
- La página **lee la planilla directo, sin pasar por una ruta de API**, así
  que no hay ningún endpoint nuevo que se pueda llamar con un token prestado
  para sacar datos en bruto. Lo único que sale es el HTML de una persona.
- **Degrada en vez de reventar**: si no se pueden leer las reservas o las
  fechas, igual muestra los turnos. Y una lista de trabajadores vacía se
  reporta como "no se pudo cargar", no como "tu link no sirve", porque no
  existe el caso de un token válido con la lista en cero.
- En `/mi/` **no se dibuja la barra del panel**: todos sus enlaces le
  pedirían una contraseña que no tiene.

**Lo que ve el trabajador**: qué día, a qué hora, en qué puesto, cuánta
gente se espera y **qué menús hay que preparar** — "30 × Tradiciones · 8 ×
Niños".

El desglose por menú lo pidió el cliente el 2026-10-21 pensando en la
cocina, y **va para todos los puestos por igual**, también por decisión
suya: saber qué viene sirve lo mismo para montar las mesas que para calcular
la parrilla, y hacer dos versiones de esta página sería mantener dos.

**No ve reservas, ni nombres de clientes, ni montos, ni a los demás
trabajadores.** Los totales por menú son cuánto hay que cocinar; quién lo
pidió y cuánto pagó no es dato de un turno.

### Lo que falta decidir

- **De dónde sale el monto de la propina.** Hoy lo escribe a mano un
  encargado al pasar lista, que es lo que pidió el cliente. Si alguna vez
  llega por Shopify, habría que decidir si se lee de ahí o se sigue
  escribiendo.
- **Ojo con los descuentos por atraso**: el panel los registra sin problema,
  pero si ese monto se descuenta de una liquidación formal, los descuentos al
  sueldo tienen reglas en Chile. Conviene confirmarlo con quien les lleve la
  contabilidad antes de usarlo así.
- ~~Si "el encargado de pagos" no es el administrador~~ — **resuelto el
  2026-10-22**: existe el rol `pagos`, que solo lee el informe.

## El panel se explica solo (2026-10-30)

Lo pidió el cliente: *"tenemos que pensar también sobre un sistema de
enseñanza interactiva dentro del sitio para los que lo acceden la primera
vez… signo de interrogación, clic, quiero aprender más y se abre y aprendo
más sobre esto"*.

Son dos cosas separadas y conviene no confundirlas: **una tira que se ofrece
al llegar** y **un `?` que se pide cuando hace falta**.

### Todos los textos viven en `ayudas.ts`

Si cada pantalla escribiera su explicación dentro de su JSX, corregir el tono
o una palabra sería recorrer doce archivos, y nadie podría leer de una
sentada lo que el panel le está enseñando a la gente. Juntos se leen enteros
y se corrigen en un lugar.

Cómo están escritos, que es la parte que importa:

- **Dicen qué se hace, no qué es.** *"Acá se mira cómo viene la ocupación"*
  sirve; *"esta pantalla muestra una grilla de fechas"* no le sirve a nadie.
- **Sin palabras del oficio.** Ni endpoint, ni registro, ni sincronizar.
- **Cortos**: dos o tres párrafos, unos pasos numerados y un *Ojo* con la
  única advertencia que conviene leer antes de tocar algo. Una ayuda larga no
  se lee, y una que no se lee es peor que ninguna porque ocupa el lugar de la
  buena.
- **No inventan datos del negocio.** Ningún precio, ningún horario, ninguna
  capacidad: eso sale de la planilla y cambia. Acá se explica el panel.

Hay una por pantalla —calendario, día, turnos, equipo, extras, informe,
menús, configuración, cuentas, bitácora— más una para **marcar quién vino**,
que es lo único que de verdad se aprende dentro de la ventana del día.

### El `?` se pide, no aparece

No hay globitos que salgan solos ni carteles que haya que cerrar: quien ya
sabe usar el panel no ve nada distinto, y quien no sabe tiene el mismo signo
en el mismo lugar en todas las pantallas. **Una ayuda que interrumpe se
aprende a cerrar sin leerla.**

### El recorrido: cuatro pantallas, ofrecido dos veces

**Son pantallas de texto, no globitos flotando sobre la página**, que era la
otra forma de hacerlo. Un globito hay que anclarlo a algo que esté a la
vista: en un teléfono la mitad quedan fuera de pantalla, y si alguien hace
scroll el globito apunta al aire. Cinco pasos leídos de corrido no se rompen
nunca. Cada uno con un enlace para ir a ver la pantalla de la que habla, y
unos puntos que dicen cuánto falta — sin eso, *Siguiente* podría ser el
segundo de cuatro o el segundo de veinte, y la diferencia es si alguien sigue
o se sale.

**Se ofrece dos veces y no más.** Una sola oferta se la pierde quien entró
apurado; una oferta eterna se vuelve parte del fondo y deja de verse. Quien
lo termina o lo cierra no lo ve nunca más, y de todas formas se puede volver
a abrir desde el `?` del calendario, que es donde vuelve quien se perdió.

**Se recuerda en `localStorage`, o sea por navegador y no por persona.** Si
el equipo comparte un teléfono, la tira aparece una vez para ese teléfono.
Hacerlo por persona obligaría a escribir en la planilla cada vez que alguien
mira un cartel, y eso no vale lo que cuesta.

**No aparece en `/mi/`, en `/semana/` ni en la entrada**: las tres las abre
gente que no administra nada, y un recorrido por el panel sería ofrecerle una
visita a una casa en la que no vive.

### La página quedaba trabada al cerrar dos ventanas (2026-10-30)

Lo reportó el cliente, y el síntoma es tan raro que vale tenerlo escrito
entero: **se abría el día en `/turnos`, dentro la ficha de alguien, se
cerraba la ficha con *Cancelar* y el día clicando afuera — y la página
quedaba trabada, sin poder subir a ver el menú.** Había que recargar.

El `body` se quedaba en `overflow: hidden`, que es lo que `Dialogo` le pone
mientras hay una ventana abierta. Reproducido con Playwright antes de tocar
nada: con las dos ventanas ya cerradas, `document.body.style.overflow`
seguía diciendo `hidden`.

**La causa son dos, y las dos valen como regla.**

**Un valor compartido no se puede guardar por copias.** Cada ventana
guardaba por su cuenta "cómo estaba el scroll antes de abrirme", y con dos
abiertas la segunda guardaba `hidden` —puesto por la primera— como si fuera
el estado original. Bastaba con que los efectos corrieran en cierto orden
para que la de abajo terminara restaurando `hidden` al cerrarse. Ahora el
valor lo guarda **la primera que abre** y lo restaura **la última que
cierra** (`trabarElFondo` / `soltarElFondo`), que es lo que de verdad
significa "mientras haya una ventana".

**Y una función escrita en el JSX es una función distinta en cada
dibujado.** `onCerrar` estaba en las dependencias del efecto, y todas las
pantallas lo pasan como `onCerrar={() => salir()}`: el efecto se desmontaba
y se volvía a montar constantemente. Eso rompía las dos cosas que ese efecto
cuida — el scroll, y **la pila de Escape**, porque al re-montarse la ventana
de abajo se sacaba y se volvía a poner *encima* de la de arriba, así que
Escape cerraba la equivocada. Hoy `onCerrar` vive en una `ref` y el efecto
corre **una vez por ventana**.

Comprobado después del arreglo, en los cuatro caminos de cierre —Cancelar,
clic afuera, Escape y *Listo*— y en la ventana de ayuda: el `body` queda
libre, la rueda vuelve a subir, y dos Escape cierran una ventana cada vez,
empezando por la de encima.

### Una ventana hereda el estilo de donde está escrita (2026-10-30)

Vale tenerlo anotado porque el síntoma es llamativo y la causa no se parece:
**la primera versión mostraba toda la ayuda EN MAYÚSCULAS Y EN NEGRITA**.

El `?` vive al lado del título de la pantalla, o sea **dentro de un `<h1>`
con `uppercase`**, y una ventana modal se dibuja donde está escrita, no en la
raíz del documento: hereda `text-transform` como cualquier otro elemento.
Tres párrafos gritados son ilegibles.

Se arregla en `Dialogo` —`normal-case font-normal tracking-normal`— y no
sacando el `?` del título, porque cualquier ventana que mañana se abra desde
otro lugar tendría exactamente el mismo problema.

## El panel tiene tema claro (2026-10-30)

Lo pidió el cliente: *"créame una versión diurna… pero no simplemente blanco
y negro, sino una elegancia"*, con *"un buen contraste de toda la
información"* y *"un juguetón bien de PlayStation, dónde y cómo usar los
botones"*. **Solo el panel** — el sitio público se queda como está, por
decisión suya en la misma frase.

### Los colores son variables, no valores

`tailwind.config.ts` ya no tiene hex: cada color es `rgb(var(--x) /
<alpha-value>)`. **Las clases de los componentes no cambiaron** —`bg-tinta`,
`text-hueso/60`, `border-oro/40` se siguen escribiendo igual— y lo único que
cambia entre un tema y otro es qué vale la variable. La alternativa, prefijar
`dark:` en cada clase de cada pantalla, habría sido reescribir el panel
entero y dejar cada color nuevo con dos lugares donde equivocarse.

Van en canales sueltos (`11 11 10`) porque es lo que `<alpha-value>`
necesita para que `/60` siga funcionando.

**Los tres colores de estado pasaron a tener nombre propio** —`verde`,
`rojo`, `ambar`, `cielo`— en vez de los `emerald-400` de Tailwind, y no es
gusto: de noche el texto de un aviso es claro y de día tiene que ser oscuro,
así que el número de la paleta dejaría de significar lo mismo. Cada uno trae
los tres tonos que de verdad se usan: el base (fondos y bordes con
transparencia), `-fuerte` (bordes y rellenos sólidos) y `-texto`, que es el
único pensado para leerse.

### Qué es el tema claro

**No es blanco pelado.** Papel tibio de fondo (`#FAF7F0`), **tarjetas
blancas encima** y texto casi-negro cálido. Que las tarjetas sean más claras
que la página es lo que las despega; por eso las superficies pasaron de
`bg-hueso/[0.02]` —un tinte que de día se ve *hundido*— a **`bg-panel`**, que
es el token de "superficie levantada" y vale `#14120F` de noche y `#FFFFFF`
de día. Los tintes que **sí** son tintes —un `hover`, un chip, la barra de
ocupación— se quedaron como estaban.

**El dorado se oscurece de día**, de `#C9A227` a `#8A6B12`. El dorado del
sitio sobre crema da menos de 2,5:1: todos los enlaces del panel serían
ilegibles. El oro viejo, más profundo, se lee sobre papel y sigue siendo oro.

**La escala de transparencias no significa lo mismo sobre papel**, y eso hubo
que arreglarlo aparte. `text-hueso/45` de noche da 4,1:1 y de día cae a 2,6:1,
o sea que todo lo secundario —el puesto bajo un nombre, el id de una reserva,
los guiones de "no hay dato"— se desvanecía justo en la pantalla que se mira
con sol encima. Los tramos bajos se suben en un **solo bloque** de
`globals.css`, en vez de escribir `text-hueso/45 dark:text-hueso/60` en los
trescientos y tantos lugares donde aparece.

Ese bloque trajo su propia trampa, anotada porque es fácil de repetir:
**lleva `:root` y un atributo, así que es más específico que las clases
`hover:` de Tailwind** y los enlaces dejaban de ponerse dorados al pasarles
el mouse. Los cuatro colores de hover que usa el panel se vuelven a afirmar
después, con la misma especificidad.

Y **un botón relleno apagado no puede verse roto**: `bg-oro` con
`disabled:opacity-40` de día quedaba crema sobre oro pálido, que no se lee
como nada. Apagado es gris.

### El interruptor

Está en la barra de arriba, y también en la pantalla de entrada —que es la
primera que se abre, y donde alguien se encuentra con el tema que no quería—.
En `/mi/` y en `/semana/` no: ahí la barra es una palabra y el botón sería el
único control de una página de lectura.

- **Arranca en oscuro, no en el del sistema.** Seguir a `prefers-color-scheme`
  suena más fino y acá habría sido un problema: el panel lo usa gente a la que
  recién se le enseñó dónde queda cada cosa, y la mitad del equipo habría
  abierto un panel blanco sin pedirlo, distinto del que le mostraron.
- **Se recuerda en `localStorage`**, o sea por navegador: el teléfono de la
  jefa de turno puede estar en claro y el computador de la oficina en oscuro.
  Si está bloqueado, abre en oscuro y el botón sirve para esa sesión.
- **Lo pinta un guion de tres líneas en el `<head>`, antes de dibujar.** Si
  esperara a React, cada carga aparecería oscura y pegaría un salto a blanco
  — el parpadeo clásico, que además desconcierta justo a quien menos maneja
  estos sistemas. No se puede resolver en el servidor: el tema es de cada
  navegador y el HTML de Next se sirve igual para todos.

### Los botones se hunden, y la asistencia es un semáforo

Eso es el *"juguetón bien de PlayStation"*, y resuelve algo real: en un
teléfono no hay cursor que cambie ni `hover` que anticipe nada, así que un
botón y un texto se ven igual hasta que uno de los dos responde.

- **Todo botón del panel se hunde 1px al tocarlo**, con `transition` corta.
  Va sobre `button` y no sobre una clase que haya que acordarse de poner: un
  botón al que se le olvidó es justamente el que se va a sentir muerto. Un
  botón apagado **no** se hunde, porque fingir que respondió sería mentir
  sobre lo único que está diciendo. Respeta `prefers-reduced-motion`.
- **Vino / No vino llevan el punto del semáforo**: lleno cuando ese estado
  está elegido, hueco cuando no. Así la fila se entiende sin leer ninguna de
  las dos palabras —y sin depender solo del color, que para quien no lo
  distingue no diría nada—. El elegido suma un halo suave de su color.

## El pronóstico del tiempo (2026-10-29)

Cada día del panel muestra en chico el pronóstico —"☀️ 28°"— en el
calendario de la portada, en `/turnos`, en `/extras` y en la página del día,
que además dice cuánta agua se espera cuando pasa de 1 mm. Al pasar el mouse
se ve el detalle: mínima, máxima y milímetros.

- **Sale de MET Norway** (`api.met.no`), el instituto meteorológico noruego.
  Es gratis **también para uso comercial**, con dos condiciones: **citar la
  fuente** —va en el `title` de cada ícono y como enlace en la página del
  día— y **decir quién pregunta** en el User-Agent (`IDENTIFICACION` en
  `clima.ts`); sin eso MET responde 403.
- **Se montó primero con Open-Meteo y se cambió el mismo día.** Su versión
  gratuita es para uso no comercial, y un panel de un restaurante no lo es.
  Además limita por IP, y en la primera prueba desde este entorno rebotó con
  *"Daily API request limit exceeded"*: la IP de salida es compartida, y en
  Vercel también puede serlo. Que no se vuelva a él sin pagar la versión
  comercial.
- **Solo en el panel, no en el sitio público** (decidido con el cliente).
  Es dato operativo —armar adentro, avisarle a los jinetes— y en
  `reservas.html` un ícono de lluvia sobre un sábado espantaría reservas.
- **Lo pide el servidor** en `/api/clima`, y la respuesta se guarda **una
  hora** en la caché de Vercel, que es más o menos cada cuánto actualiza MET.
  Next solo guarda las respuestas buenas y sigue sirviendo la última
  mientras pide la nueva, así que un rechazo de MET no borra lo que había.
- **Llega a unos 9 o 10 días**: hora a hora los primeros dos o tres, de a
  seis horas después. Más allá no hay ícono, y está bien: inventarlo sería
  peor.
- **Para Chile MET no da probabilidad de lluvia**, solo milímetros
  (comprobado contra la respuesta real el 2026-10-29: ni un
  `probability_of_precipitation`). El código la sigue leyendo por si
  aparece, pero lo que se muestra son los milímetros, con coma decimal.
- **MET entrega instantes en UTC y hay que juntarlos por día de Chile**: a
  las 02:00 UTC acá todavía es el día anterior. Lo hace `climaDe()`, y lo
  que sale son fechas en texto, como en todo el proyecto.
- **El ícono es el peor tiempo entre las 10 y las 19** (`HORARIO`), no el de
  las 24 horas. Se abre de 13 a 18: un chubasco de madrugada no cambia nada,
  y si contara, la mitad de los días saldría con lluvia. Las temperaturas y
  los milímetros sí son del día completo.
- **Las coordenadas son las de Pirque, aproximadas** (`PIRQUE` en
  `clima.ts`): a esta escala el modelo no distingue unas cuadras, y MET pide
  no mandar más de cuatro decimales.
- **Si MET no responde, los calendarios se dibujan igual**, sin íconos.
  Nada del panel depende de esto.
- **Va bajo la fecha, en el aire que ya había**, igual que la palabra bajo
  `PuntoDia`: no cambia el alto de ninguna tarjeta ni de ninguna celda.
- **`api.met.no` está abierto en Network access** (2026-10-29) y se probó
  contra la respuesta real: el sábado 31 de octubre salió con lluvia, que
  es lo que dicen los datos hora a hora desde las 14:00 de Chile. Ojo:
  `next dev` no pasa por el proxy del entorno —ni con
  `NODE_USE_ENV_PROXY`—, así que `/api/clima` en local falla con
  `ENOTFOUND` aunque `curl` sí llegue. Para revisar la lectura con datos
  reales se baja la respuesta con `curl`, con el mismo User-Agent, y se le
  pasa a `climaDe()`.

## Las actividades extras (2026-10-22)

Lo que se contrata aparte del equipo y por día: **jinetes** —cada uno con su
monto—, **pintacaritas**, el **castillo inflable**. Lo pidió el cliente con
una frase que fija todo el diseño: hay que tratarlas *"como los del personal,
pero separado de él"*.

Viven en **`/extras`**, su propia página con su propio calendario del mes, su
propia ventana por día y su propia lista de fichas. El código está en
`panel/src/lib/extras.ts`, espejo de `equipo.ts`.

### Por qué separadas, y dónde se juntan

Separadas porque **no son lo mismo**: un jinete no cobra una jornada, no se
le pasa lista con horas extra, y —lo más importante— **no entra en el reparto
de la propina**. Juntarlos en una sola lista haría ilegibles justamente las
dos columnas donde eso se ve.

Se juntan en **un solo lugar, que es el que lo necesita**: la planilla que
descarga quien paga. El cliente lo dijo así: *"él quiere hacer solo un pago
semanal, pero claramente distinguido"*. Entonces:

| | Equipo | Actividades extras |
|---|---|---|
| Planilla semanal del grupo (`/semana/…`) | sí | **nunca** |
| Link personal del trabajador (`/mi/…`) | sí | **nunca** |
| Calendario de la portada | sí | no |
| Página del día (`/dia/…`) | su bloque | **su propio bloque**, debajo |
| `/informe` en pantalla | su tabla | **su propia tabla**, con su total |
| El CSV que se descarga | sí | **sí, en el mismo archivo** |
| `/api/publico/fechas` (el sitio) | no | **no** |

**En la página del día van en un bloque aparte, no mezcladas con el equipo**
(2026-10-22). Están ahí porque es donde se cierra un día, y "¿cuánto costó
este sábado?" no se contesta sin el jinete: el bloque muestra quiénes vienen
—tachado quien no llegó—, lo que costaron y, cuando hay las dos cosas, el
total con el equipo. Aparte y no en la misma lista por lo mismo que son una
página aparte: mezclarlas obligaría a explicar en cada línea cuál de las dos
cosas es.

La primera fila es textual del cliente: *"el resumen semanal que yo mando al
equipo del restaurante nunca quiere ver el resumen de los jinetes y de los
pintacaritas"*.

**En el CSV cada fila dice qué es** —`Equipo` o `Actividad extra`— y las
columnas que no aplican van **en blanco, no en cero**: un cero en la columna
de propina se leería como "le tocó cero", y lo que pasa es que esa persona no
entra en el reparto. Lo mismo con la modalidad, las horas extra y el valor
hora de un jinete.

### Dos pestañas nuevas en la misma planilla

| Pestaña | Qué guarda |
|---|---|
| `Colaboradores` | Nombre, actividad, teléfono, activo, monto habitual y **cuenta bancaria** |
| `Actividades` | Una fila por (fecha, colaborador), con si vino, el monto, el ajuste y su motivo |

Se decidió abrir pestañas propias y no agregar una columna "tipo" a
`Trabajadores` y `Turnos`: las columnas de un turno —modalidad, horas extra,
propina— no significan nada para un castillo inflable, y una tabla con media
fila vacía es la forma más segura de que alguien sume lo que no debe.

**`Colaboradores` es posicional y `Actividades` va por nombre de columna**,
por lo mismo que `Trabajadores` y `Turnos`: la primera se reescribe entera al
guardar, y a la segunda se le agregan y se le borran filas de a una.

### Se guardan como fichas porque se repiten

Lo dijo el cliente: *"los jinetes se van a repetir, las personas se van a
repetir"*. Una ficha trae su **monto habitual**, que es lo que se propone al
agregarla a un día y **se congela ahí**: subirle la tarifa a alguien en marzo
no reescribe lo que se le pagó en noviembre. Mismo criterio que los sueldos
del equipo, y por el mismo motivo.

**Una actividad sin confirmar no suma.** Agendar no es pagar: hasta que
alguien diga que el jinete llegó, el panel no da por gastada esa plata. Es la
misma regla que un turno sin pasar lista, y el informe avisa arriba cuando
quedan actividades sin confirmar en el periodo.

**Una línea por colaborador y por día** (`normalizarExtras()`, en el
servidor). Si de verdad hay que pagarle dos cosas distintas al mismo
proveedor, va en una línea con el monto sumado y el detalle en el motivo.

### Los datos de la transferencia, que son lo que cierra el circuito

El cliente la pidió para el equipo **y** para los extras: *"cuando el
encargado de pago descarga la planilla del pago semanal, ya tiene hasta las
cuentas bancarias dentro de este resumen"*. Entonces:

- `Trabajadores` y `Colaboradores` llevan los campos que pide un banco en
  Chile: **titular, RUT, banco, tipo de cuenta, número y un correo para el
  comprobante**, más una **nota de pago** para lo que no cabe en ninguno.
  Viven en `panel/src/lib/banco.ts`.
- **Vive en la ficha y no en la línea del día.** Si alguien cambia de banco
  se le transfiere a la cuenta nueva, también lo que quedó pendiente: no es
  un hecho de ese día, es un dato de la persona.
- **La ve el administrador y quien paga, nadie más.** `/api/extras` se los
  recorta al encargado junto con los montos habituales, igual que los sueldos
  del equipo. Y `/api/informe` —que lee la cuenta de pagos— **devuelve de las
  fichas solo eso**: ni teléfonos, ni sueldos de hoy, ni tokens.
- El informe **avisa en pantalla a quién le falta**, antes de descargar. Es
  el momento en que importa: descubrirlo con la planilla ya bajada significa
  volver a entrar, completarla y bajarla de nuevo.

#### Por qué campos y no una sola columna de texto (2026-10-22)

Nació como **una columna de texto libre** donde cada quien escribía "Banco
Estado, cta rut 11.111.111-1" a su manera. Eso sirve para que una persona lo
lea y **no sirve para generar una transferencia**: quien paga tiene que
volver a separarlo a mano, banco por banco, y un dígito mal copiado manda la
plata a otra cuenta. Con un campo por dato, la planilla del informe **se
pega en la carga masiva del banco** sin tocar nada.

Decisiones que vale la pena tener escritas:

- **El titular en blanco es la propia persona.** Lo normal es que la cuenta
  sea suya; el campo existe para cuando no lo es —la cuenta de la señora, la
  del hermano— y obligar a repetir el nombre en cada ficha sería pedir
  trabajo para decir lo que ya se sabe. En el CSV sale resuelto: si está en
  blanco, va el nombre de la persona.
- **El tipo de cuenta es una lista cerrada y el banco no.** Los tipos son
  cuatro y se acabó; los bancos cambian de nombre, se fusionan y aparecen
  cooperativas, así que ahí hay texto libre con sugerencias. Un tipo que no
  está en la lista **se descarta en el servidor**, porque un valor inventado
  llegaría hasta la planilla del banco.
- **El RUT se empareja pero no se valida** (`rutLimpio()`): sin puntos y con
  guion, para que la carga masiva lo acepte. Lo que no parece un RUT se
  devuelve tal cual — el panel no está para corregirle el RUT a nadie.
- **Falta algo = banco, tipo, número o RUT.** El titular y el correo no
  entran en esa cuenta: uno tiene valor por defecto y el otro es para el
  comprobante, no para la transferencia.
- **La columna vieja de texto libre no se borró: pasó a llamarse `Nota de
  pago`** y se quedó en su lugar. Lo que alguien hubiera escrito ahí sigue
  estando y se lee como lo que siempre fue, una nota; y de paso queda un
  campo útil para "transferir los lunes" o "avisar por WhatsApp".
- **En la tabla van en una segunda línea**, no en seis columnas más — ver
  "La tabla de Equipo: los anchos van declarados".

### Teléfonos y correos con forma, no texto libre (2026-10-23)

Lo pidió el cliente con el porqué incluido: *"donde guardamos números de
teléfono o correos electrónicos deberíamos aplicar un control de formato…
luego podremos automatizar más tareas (enviar link por WhatsApp o correo)"*.

Es el mismo argumento que los campos del banco. Un teléfono guardado como
`+56 9 1234 5678`, como `912345678` y como `9 1234-5678` es el mismo número
y tres cadenas distintas; mientras sean texto libre **nada se puede
automatizar encima**. La regla vive en `panel/src/lib/contacto.ts`:

- **Se escribe el celular con el 9 y sin el +56** — `9 1234 5678`, que es lo
  que la gente tiene en la cabeza y en su agenda. El código de país lo pone
  el panel. Pedir el `+56` es pedir que lo escriba mal dos de cada tres
  veces.
- **Se guarda siempre como `+56 9 1234 5678`**, venga escrito con puntos,
  guiones, paréntesis, con `+56`, con `56` o pelado. Y para un enlace sale
  `56912345678`, que es lo que quiere WhatsApp: `enlaceWhatsApp()` ya está
  escrito, esperando la pantalla que lo use.
- **No se inventa el 9.** Ocho dígitos no son un celular al que le falte el
  nueve: son un número que no sabemos leer, y completarlo mandaría un
  mensaje a un desconocido. La pantalla lo dice —"parece que le falta el 9"—
  y guarda lo que se escribió.
- **Avisa, no corrige ni bloquea.** Un fijo o un número extranjero se
  guardan tal cual con una marca en ámbar que dice que con ese no se va a
  poder automatizar. El panel no está para discutirle a nadie el teléfono de
  su primo; está para que lo que **sí** tiene forma de celular quede parejo.
- **Se ordena al salir del campo, no mientras se escribe.** Un `+56` que
  aparece solo bajo los dedos desconcierta; al terminar, ver el número
  ordenado confirma que quedó bien. Mismo criterio que el RUT.
- **El correo se guarda en minúsculas y sin espacios**, y la validación es
  a propósito simple: algo, una arroba, algo con un punto. La expresión
  "completa" del estándar es ilegible, acepta cosas que ningún proveedor
  entrega y aun así no dice si la casilla existe. Lo único que se puede
  atrapar es un error de tipeo evidente.
- **Lo normaliza el servidor, no solo la pantalla**, en las cinco puertas:
  trabajadores, colaboradores, los dos diálogos de creación y las reservas
  a mano. Una llamada directa a la API tiene que dejar el dato igual de
  parejo que un formulario.
- **También lo que llega de Shopify.** `telefonoDe()` y `emailDe()`
  normalizan antes de escribir en `Reservas`: una reserva comprada y una
  anotada a mano tienen que ser indistinguibles, o el día que se automatice
  algo habría que adivinar el formato fila por fila.

### Quién puede qué

**Igual que los turnos** (lo eligió el cliente): administrador y encargado
planifican y confirman; **los montos habituales y las cuentas son solo del
administrador**, y el encargado nunca los recibe. Como en el equipo, **el
monto del día lo propone el servidor** desde la ficha al guardar, así que un
encargado puede agendar y confirmar sin haber visto nunca la tarifa de nadie.

La cuenta de **pagos** no entra a `/extras` —no es suya— pero sí ve las
actividades en su informe y en su planilla, porque es quien las paga.

### Lo que no hace, a propósito

- **No reparte propina**, y no hay dónde anotarla. Hay una prueba que lo fija
  contando que ninguna de las dos pestañas tiene esa columna.
- **No cobra jornada ni horas extra.** Un extra cobra lo acordado para ese
  día; una diferencia por un acuerdo aparte va en el **ajuste con su motivo**,
  la misma convención que el equipo.
- **No aparece en el calendario de la portada.** Esa pantalla contesta cómo
  viene la ocupación; quién hace el show es otra pregunta y tiene su página.

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

**Desde el 2026-10-15 el grueso vive dentro de cinco paneles plegables**, en
los dos landings. La página pasó de unas 15 pantallas de celular a poco más
de 4. Ver "Los paneles" abajo.

Siempre a la vista:

1. Foto full-screen + botón WhatsApp. En el B2B es "Trabaja con nosotros";
   en promociones es la secuencia de tres tiempos.
2. **Solo en el B2B**: tres paneles de comisión (5% / 10% / 15%) y la bajada
   "Una experiencia chilena auténtica" con el 2º botón de WhatsApp.
   **Solo en promociones**: el bloque de oferta (11% / 44 personas / sin
   costo de arriendo) con los botones.
3. Contacto: botón WhatsApp + formulario de email.
4. Footer.

Dentro de los paneles, en este orden:

| Panel | Qué trae |
|---|---|
| Las experiencias y el menú | Los cuatro niveles con flip 3D en CSS puro (checkbox + label), y el menú compartido en un `<details>` debajo |
| Date una vuelta por el lugar | La galería de 27 fotos, carrusel swipe con `scroll-snap`, sin JS |
| Las actividades | Show ecuestre · seis tarjetas de actividades del recinto · actividades adicionales (coaching con caballos, taller de queso, karting, taller de asado) |
| El recinto y los extras | Desayuno de campo y once campesina · precio del recinto ($2.500.000 + IVA fin de semana / $1.500.000 + IVA días de semana, solo arriendo, sin catering) · "Eventos a medida" |
| Por qué acá *(B2B: Por qué sumarte)* | Los tres momentos o segmentos · los beneficios · cómo funciona en 3 pasos |

### Los paneles

- **Son `<details>`, no una ventana a pantalla completa.** La ventana era lo
  pedido, y se descartó con el cliente el 2026-10-15: sin JavaScript no hay
  tecla Escape, el foco del teclado se escapa por detrás, la página de atrás
  se sigue haciendo scroll y el botón Atrás del celular sale del sitio en vez
  de cerrarla. `<details>` trae todo eso resuelto de fábrica, y es lo que el
  sitio ya usa para el menú y el selector de idiomas.
- **Abierto, el `<summary>` queda pegado arriba** con la ✕ a la derecha, para
  que cerrar esté siempre a mano aunque la sección sea larga. Cerrado muestra
  un `+`.
- **Hay un beneficio que no se ve**: adentro de un panel cerrado las fotos con
  `loading="lazy"` no se descargan. Las 27 de la galería dejan de pesar en la
  primera carga.
- **Los anclas `#experiencias` y `#actividades` van en el `<details>`, no en
  la sección de adentro.** Así el enlace aterriza en el botón del panel, que
  es predecible en todo navegador. El costo a asumir: "Ver experiencias" deja
  al visitante sobre el botón y hace falta un toque más. Ponerlo en la sección
  de adentro haría que los navegadores nuevos abrieran el panel solos, pero en
  los viejos llevaría a contenido invisible, que es peor.

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
- El landing ofrece **cuatro** experiencias (Tradiciones $49.000 / Lo Pirque
  $55.000 / Brasas $75.000 / Sommelier $95.000). El sitio público ofrece
  **dos** (Tradiciones $44.000 / A Brasas abiertas $70.000). Ver arriba.
- **Los montos dejaron de coincidir entre los dos entregables** (2026-10-15).
  El landing subió $5.000 en los cuatro niveles y ahora muestra el precio de
  **pagar en el local**, que es el mismo que el sitio público pone en la cara
  de atrás de sus tarjetas. El sitio público muestra al frente el de **pagar
  por adelantado**. No es una inconsistencia: son las dos modalidades.

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
  depende de que Shopify siga ahí. **Comprobado el 2026-10-22: sigue vivo**,
  son 63 MB y el CDN acepta rangos, así que el `<video>` lo iría
  transmitiendo en vez de bajarlo entero.
- ~~**Shopify.** Faltan el dominio `*.myshopify.com` y los IDs de
  producto~~ — **ya no faltan** (2026-10-22): la tienda de producción es
  `lo-pirque.myshopify.com` y su catálogo se lee público; ver "La tienda de
  producción, mirada por su catálogo público". Y la decisión de fondo
  —integrar Shopify rompe la regla de cero JavaScript— **ya se tomó**: el
  sitio nuevo vende con `reserva.js` y la Storefront API, que es la primera
  de las dos excepciones. Lo que queda de este punto es que **en producción
  todavía está el modelo viejo** de una variante por fecha.
- **Logo.** El del sitio antiguo es negro sobre blanco y tiene una A invertida
  como rasgo distintivo. Nuestro fondo es negro, así que hace falta una
  versión clara o un SVG recoloreable. Hoy la marca se compone con tipografía.

## Decisiones abiertas

- **¿Se mantiene el menú de "Pequeños (0 a 3 años)" a $6.000?** Existe en la
  tienda de producción y el sitio nuevo no lo ofrece: hoy `reservas.html`
  tiene adultos y niños de 4 a 12, y nada más. Nunca se habló de él —
  apareció al mirar el catálogo el 2026-10-22. Si se mantiene, es una cuarta
  fila en el formulario y su par de variantes; si no, no se hace nada, pero
  conviene que sea una decisión y no un olvido.
- **El nombre del negocio no calza.** Google Maps lo lista como "Lo Pirque
  Restaurant" y el email es `@lopirque.cl`, pero el sitio se llama "Brasas de
  Lo Pirque" y el dominio es `brasasdelopirque.cl`. Si alguien busca la marca
  del sitio en Maps, puede no encontrarla. El cliente lo está aclarando.
- ~~`contacto.html` podría renombrarse~~ — **hecho el 2026-09-16**: la página
  es `reservas.html`. Queda un `contacto.html` de una pantalla que redirige
  con `<meta http-equiv="refresh">`, para no romper enlaces ya compartidos.
  Se puede borrar cuando deje de llegar tráfico por ahí.

## Pendientes de contenido

- **Plataforma de newsletter** — el formulario de email tiene
  `onsubmit="return false;"` y ningún handler, así que **el email se descarta
  al enviar: hoy no captura nada**. Hay que resolver al menos la captura
  (Formspree, Google Forms o un endpoint propio).
- **Fotos de cabalgatas y de la cancha de beach tenis** — son las dos
  únicas actividades que siguen con icono en vez de foto. Castillo
  inflable, pintacaritas y ping-pong/tacataca **ya tienen la suya**: este
  pendiente las seguía listando por inercia desde que se levantó la
  restricción de imagen.
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

**Junta los cambios y abre el PR tú** (cambiado el 2026-10-21). Commitea y
empuja a la rama a medida que avanzas, para que nada se pierda si se cae el
contenedor, y **cuando termines un lote que valga la pena mergear, abre el
PR en la misma pasada** en vez de avisar y esperar.

Antes la regla era la contraria —no abrir ninguno hasta que lo pidieran— y
en la práctica terminaba en los dos esperando: el trabajo empujado sin PR y
el cliente mirando el aviso amarillo de GitHub sin saber que tenía que
apretarlo.

**Abrir el PR no decide nada**: mergear sigue siendo del cliente, y es ahí
donde revisa. Lo que cambia es que la revisión tiene dónde ocurrir sin un
paso extra. El PR lleva **qué cambió y por qué**, no un listado de archivos:
es el lugar donde queda escrito el motivo de una decisión, y buena parte de
este CLAUDE.md salió de ahí.

Esto **no cambia** la regla de proponer antes de aplicar: los cambios al
contenido se siguen conversando antes de hacerlos. Lo que se abre solo es el
PR de lo que ya se acordó.

Ojo con el orden: el cliente suele mergear el PR abierto antes de que llegue
el commit siguiente. Si el PR de esta rama ya está mergeado, lo que quede
pendiente va rebasado sobre el `main` nuevo y en un PR propio —
`git fetch origin main && git rebase origin/main`, y empujar con
`--force-with-lease`. Nunca apiles commits nuevos sobre historia ya
mergeada.
