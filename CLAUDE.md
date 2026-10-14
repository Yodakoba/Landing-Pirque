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

## Reserva en línea (Shopify + sistema propio)

`reservas.html` crea el carrito con la **Storefront API** y manda al checkout
de Shopify.

**Cowlendar quedó descartado el 2026-10-13.** En su lugar se construye un
sistema propio: **Shopify cobra, nosotros agendamos.** El código vive en
`backend/` y corre en Google Apps Script, pegado a una planilla del cliente.
Ver `backend/README.md`.

El reparto queda así:

| | Quién |
|---|---|
| Cobro y checkout | Shopify |
| Calendario, cupo y registro | Nuestro backend |
| Panel de administración | Una planilla de Google (por ahora) |
| Agenda visible | Google Calendar |

**Por qué consultamos a Shopify en vez de recibir un webhook:** los Web Apps
de Apps Script **no dan acceso a las cabeceras** de la petición, así que es
imposible verificar la firma HMAC con la que Shopify firma sus webhooks. Sin
eso, cualquiera que descubriera la URL podría inventar reservas. Preguntando
nosotros cada 5 minutos, nadie nos escribe. El costo es unos minutos de
atraso; la ganancia es que además se recupera solo de caídas.

**El token de Admin API del backend no contradice la regla de este
proyecto.** "Un token de Admin API jamás" es sobre el **sitio**, donde
quedaría en un archivo público. En Apps Script corre del lado del servidor y
se guarda en las propiedades del script, que nunca salen al navegador.

- **Toda la configuración vive en el objeto `CONFIG`** al inicio de
  `assets/js/reserva.js`: token, dominio, versión de API y la URL del
  backend. Los precios ya no están ahí, se fueron al HTML.
- **`CONFIG.backend` ya está conectado** (2026-10-13): apunta al Web App de
  Apps Script desplegado en la cuenta del cliente, así que el calendario
  muestra las fechas reales de la planilla. Ojo al redesplegar: una
  **implementación nueva** en Apps Script cambia la URL y hay que
  actualizar esa línea; publicar una **versión nueva de la misma**
  implementación la conserva.
- **Un Web App de Apps Script no puede elegir el código HTTP**: responde 200
  incluso cuando falla, con `{error: ...}` en el cuerpo. Por eso
  `cargarFechas()` revisa el campo `error` y no solo `response.ok` — sin
  eso, una falla del backend se vería en pantalla como "no hay fechas", que
  es otra cosa y manda a buscar el problema donde no está.
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
  backend dejó de filtrar por `financial_status=paid`; ver `backend/README.md`.
  Una cancelada libera su cupo, una por pagar no.
- **No hay `doPost`: un webhook apuntado al Web App no hace nada**, y
  Shopify igual lo da por entregado porque Apps Script responde 200 aunque
  la función no exista. Si aparece uno configurado en la tienda, se borra.
  El backend pregunta, no recibe; ver `backend/README.md`.
- **`order.phone` viene vacío casi siempre.** El checkout pide el teléfono
  dentro de la dirección, así que el número está en
  `billing_address.phone`. `telefonoDe()` mira los cuatro lugares.
- **`read_orders` no alcanza para el nombre y el correo del cliente.**
  Shopify los trata como datos protegidos y hay que pedirlos aparte en la
  configuración de la app. **Y no falla avisando**: el pedido llega
  completo y esos campos vienen en blanco, igual que un pedido sin datos.
  `probarDatosDelCliente()` distingue los dos casos. Ver
  `backend/README.md`.
- **Los títulos de las cuatro pestañas de la planilla no se escriben a
  mano**: los deja `prepararPlanilla()`, que se corre una vez desde el
  editor de Apps Script y es segura de repetir. No es comodidad: el script
  busca cada valor por el **nombre** de su columna, y la normalización
  arregla mayúsculas y espacios pero **no tildes**, así que un `Menú` o un
  `Niños` escritos a mano no calzan con `menu` y `ninos`. Y no da error:
  deja la columna vacía, o la duplica al lado.
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
- **Que el Web App de Apps Script se pueda leer desde el sitio.** El
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
  **dos** (Tradiciones $44.000 / A Brasas abiertas $70.000). Ver arriba.

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
