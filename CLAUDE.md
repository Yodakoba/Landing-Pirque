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

### Lo que queda en español pase lo que pase

- **El checkout de Shopify.** El formulario de reserva se traduce, pero al
  apretar "Complete booking" la persona cae en un checkout en español —
  confirmado el 2026-10-13: el `checkoutUrl` que devuelve la tienda viene
  con `/es/`. Se arregla con Shopify Markets, del lado de la tienda, no
  desde acá.
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

Las tipografías saldrán en fallback porque el sandbox bloquea
`fonts.googleapis.com` — es del entorno, no de la página.

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
  el peor lugar para fallar.
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

### Desde este entorno no se alcanza Shopify

La política de red del entorno niega `brasasdelopirque.cl`, `shopify.com`
y `brasas-de-lo-pirque-development.myshopify.com` con 403 en el CONNECT. No es cosa del token: la conexión no llega a
establecerse. Para probar la integración de verdad hay que agregar el
dominio en **Network access** del entorno, o correr las consultas en el
navegador del cliente y traer la salida.

### Lo que falta por verificar

- **Que las propiedades `_booking_date` pasen del carrito al pedido.** Ya se
  comprobó que sobreviven en el carrito; falta verlas en un pedido real,
  porque de ahí las lee `leerReserva()`. Requiere completar una compra de
  prueba en la tienda de desarrollo.
- ~~Que el Web App de Apps Script se pueda leer desde el sitio~~ — ya no
  aplica: el sitio le pide las fechas al panel. El
  endpoint ya está desplegado y conectado en `CONFIG.backend`, y el sitio
  está probado de punta a punta contra un backend simulado en local: pinta
  el mes, marca los días por llenarse, escribe la fecha en `#r-fecha`,
  apaga el botón si piden más lugares de los que quedan, y muestra el aviso
  de falla cuando el backend devuelve `error`. Lo que **no** se puede
  probar desde este entorno es el endpoint de verdad: el proxy niega
  `script.google.com` con 403. Los Web Apps responden con un redirect a
  `googleusercontent.com` y eso tiene manías conocidas con CORS, así que
  **hay que abrir `reservas.html` publicado y confirmar que el calendario
  trae fechas**; si no, es CORS y no el código del sitio.
- **Qué versión de la Storefront API usar.** La configurada es `2024-10` y
  lleva como un año fuera del plazo de soporte de Shopify. Responde, pero hay
  que confirmar cuál corresponde antes de salir a producción.

### Lo que este diseño no resuelve

- **Se puede sobrevender por un margen chico.** El cupo se descuenta cuando
  el pedido ya está pagado. Entre que alguien llega al checkout y paga, otro
  podría tomar los últimos lugares. Si molesta, se arregla reservando el
  lugar unos minutos al crear el carrito.
- **No manda correos.** La confirmación de compra la manda Shopify.
- **No cancela ni reagenda.** Una cancelación en Shopify no borra la fila ni
  el evento: hoy eso se hace a mano en la planilla.

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
| `Trabajadores` | Nombre, teléfono, puesto habitual, activo, token, modalidad, sus dos montos y si participa en la propina |
| `Turnos` | Una fila por (fecha, trabajador, puesto), con asistencia, lo que se le pagó y su parte de la propina |

Las tres se editan en **`/equipo`**, salvo los turnos, que se asignan desde
el calendario. **Ninguna llega al sitio público**: `/api/publico/fechas`
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

El pie del frente dice ahora **"Ver reservas"** y no "Ver quiénes vienen":
con tres acciones, el texto largo se partía en dos líneas en una tarjeta de
cuatro columnas. La fecha del título lleva al mismo lugar.

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

Ahora la última columna depende de si esa persona tiene turnos guardados:

| | Qué ofrece |
|---|---|
| Sin ningún turno | **Quitar** — la fila escrita por error, que no tiene historia que proteger |
| Con turnos, activa | **Desactivar** — la saca del planificador y le cierra su link, conservando sus turnos |
| Con turnos, inactiva | **Desactivado**, sin acción: su ficha se queda |

El costo a asumir: **ya no se puede borrar de un clic la ficha de alguien que
sí trabajó.** Es justamente lo que no queremos que se pueda hacer sin
pensarlo; si de verdad hay que sacarla, se edita la planilla a mano, que es
un acto deliberado.

De paso, el otro botón de esa misma fila pasó a decir **"Quitar link"**: dos
"Quitar" con significados distintos a dos columnas de distancia eran una
confusión esperando a pasar.

### Pasar lista, y lo que cuesta un día (2026-10-21)

Planificar dice quién **debería** venir; pasar lista dice quién vino y cuánto
se le paga. Son dos cosas y el panel las trata distinto: **un turno sin pasar
lista no suma nada.** Antes de que alguien lo diga, el panel no da por venida
a una persona ni por pagada una jornada.

Se pasa lista desde la página del día, botón **Pasar lista**. Por cada
persona: vino / no vino, la jornada, horas extra, un ajuste con su motivo, y
el total de esa fila.

**Lo que se guarda queda congelado, y eso es la decisión importante.** El
monto de la jornada y la modalidad viajan **dentro del turno**, no se
recalculan desde la ficha del trabajador. Si en marzo se le sube el sueldo a
alguien, los turnos de noviembre no pueden cambiar solos: las cuentas de
meses cerrados dejarían de cuadrar.

**Los sueldos los propone el servidor, no el navegador.** Un turno sin pasar
lista hereda los valores de la ficha al guardarse (`guardarEquipoDelDia`).
Así el encargado puede pasar lista y corregir montos sin que su pantalla
reciba nunca la tabla de sueldos del equipo entero — que no necesita, y que
no es dato suyo. Pasada la lista, lo que venga manda: ahí el monto ya es un
hecho del día y no una propuesta.

Un descuento mayor que la jornada deja el día en **cero, nunca en negativo**.
Si de verdad hay que cobrarle algo a alguien, eso no es un turno con monto
negativo, es otra conversación.

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

### Crear un trabajador desde el planificador

El desplegable de cada puesto tiene debajo **+ Nuevo trabajador**. Abre una
ventana con lo mismo que pide la pantalla de Equipo, lo crea y lo deja
asignado a ese puesto en ese día.

Existe porque sin él la lista vacía era un callejón: no se podía planificar
sin irse a `/equipo`, agregar a alguien, volver y empezar de nuevo. **Lo que
crea no es un caso especial**: queda en la lista como cualquier otro.

Va por `POST /api/equipo/trabajador`, que agrega **una fila** en vez de
guardar la lista entera. No es un detalle: la pantalla del planificador no
tiene la lista completa en la mano —puede estar desactualizada— y mandarla
entera sería arriesgarse a pisar el cambio de otra persona. Si el nombre ya
existe no falla: devuelve el que hay y lo dice.

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
- **Renovarla invalida todas las copias** que anden dando vueltas, que es lo
  que hay que hacer cuando alguien deja el equipo. El costo a asumir: también
  deja de servir el link de quien sí trabaja, así que hay que volver a
  mandarlo.
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

### La propina (2026-10-22)

**Se reparte en partes iguales entre quienes vinieron ese día y participan.**
Esa es la regla que dio el cliente, y la excepción que pidió es una casilla
por persona en `/equipo`: quien la tiene desmarcada sigue en la planilla de
trabajo pero fuera del reparto.

**La casilla viene marcada por defecto** —en la planilla, la celda en blanco
es "sí"— porque la regla es que participa todo el equipo; no entrar es la
excepción, y una excepción se marca.

El monto lo pone un encargado **al pasar lista**, en la página del día:
escribe el **total** del día y el panel lo reparte. No hay que calcular nada
a mano.

**Se llega por dos puertas y las dos dan al mismo campo** (2026-10-22). En la
página del día, el bloque Equipo muestra siempre una línea "Propina del día",
con el monto repartido o un **sin anotar**, y su botón abre la misma ventana
de Pasar lista con el cursor puesto en ese campo. No es un segundo formulario:
es el mismo, y se guarda en el mismo lugar.

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
| Puestos y su regla "uno cada N" | sí | — | — | — |
| Precios, menús y configuración | sí | — | — | — |
| Links personales, diagnóstico y Shopify a mano | sí | — | — | — |
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
