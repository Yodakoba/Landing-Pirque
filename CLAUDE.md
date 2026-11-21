# Brasas de Lo Pirque — sitio web

> **Empieza por `TRASPASO.md`**: el mapa del proyecto entero —qué es, cómo
> está armado, los flujos, el estado, los pendientes en orden y las reglas—
> para retomarlo en una sesión nueva. Se carga junto con este archivo, y se
> actualiza al terminar cada etapa.

@TRASPASO.md

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

## Reglas fijas: se revisan antes de cada cambio

Valen siempre, sin que el cliente tenga que recordarlas. **Cuando el
cliente diga "regla: …", se anota acá en la misma pasada**, no en la sección
del cambio que se estaba haciendo. El detalle y el porqué de cada una están
más abajo; esto es la lista para revisar.

**Siempre**
- Proponer antes de aplicar. No inventar datos del negocio. Español de
  Chile, tuteo, sobrio.
- Cada cambio deja escrito en este archivo —o en `panel/CLAUDE.md`— qué
  cambió y por qué.
- **Mostrar sin preguntar** (regla del cliente, 2026-11-12): todo cambio
  que se ve se manda con capturas —computador y celular, y el estado que
  importa, como una pregunta antes de confirmar— en la misma pasada en que
  se termina, sin esperar a que lo pida y sin preguntar si quiere verlo.
  Pocas preguntas: se pregunta solo lo que de verdad decide el cliente.
- **Desde el lanzamiento, dos caminos para mergear** (regla del cliente,
  2026-11-20; el lanzamiento es el domingo 22-11-2026, y si no se sabe si
  ya pasó, se trata como que sí). Todo cambio pasa primero por la versión
  de prueba (preview) del PR; lo que se decide es cuándo se mergea a
  producción. **Chico** —textos, ayudas, colores, lo que se ve y no mueve
  nada—: se mergea solo con Vercel en verde, como hasta ahora, y se mandan
  las capturas. **Con prueba** —plata, la reserva o el pago en Shopify, el
  cupo, columnas nuevas en la planilla, permisos—: el PR queda **abierto
  sin mergear**, se le manda al cliente el link de la preview y se mergea
  recién cuando diga *"mergea"*. **Cada PR dice en qué camino va.** Si el
  cliente dice *"déjalo en preview"*, ese PR espera su OK aunque sea chico.
  Un arreglo urgente de algo roto en producción va directo, avisando en el
  mismo momento. Detalle en "Git".
- **Coherencia: el mismo tipo de información, con el mismo formato y el
  mismo peso en todo el sitio** (regla del cliente, 2026-11-13: *"ya estoy
  en el mismo mundo… me lo muestras un poco distinto, de tamaño, por la
  información que muestra, pero el formato queda lo mismo"*). Un mismo dato
  —lo cotizado, el estado del día, hoy, *Mías*, un aviso fijo, una fecha,
  un precio— se muestra con **la misma pieza** (forma, color, palabra) en
  cada pantalla, y con la misma importancia: lo que en una es pastilla no es
  texto suelto en otra. Una pantalla puede variar el **tamaño** o cuánto
  muestra según su espacio —una celda de Turnos no es una tarjeta de
  Reservas—, **no el formato**. Antes de dibujar algo se busca la pieza que
  ya lo muestra y se reutiliza; si aparecen dos formas del mismo dato, se
  unifican en una. En el panel, la lista de piezas está en `panel/CLAUDE.md`.
- **Un cambio de diseño se lleva a sus parecidos** (regla del cliente,
  2026-11-21: *"que siempre revisas si se hacen cambios de diseño en
  secciones que… muestran similar información en similar formato, que se
  adaptan estos cambios también, o que por lo menos me acuerdas"*). Antes
  de cerrar un cambio de cómo se ve algo, se buscan las otras pantallas que
  muestran lo mismo —con la lista de piezas de `panel/CLAUDE.md`, o
  buscando la clase o el componente en el código— y:
  - si es claramente la misma pieza, **se cambia ahí también, en el mismo
    PR**, y el PR lo dice;
  - si hay duda —otra pantalla, otro público, otro uso—, **se le pregunta
    al cliente con nombre y apellido**: *"cambiamos esto en Informe, ¿lo
    llevo también a Equipo y Extras, que muestran lo mismo?"*.

  Lo que mejor cumple esta regla es una pieza compartida: el cambio llega
  solo a todas partes. Si dos pantallas tienen el mismo dibujo copiado, se
  pasa a una pieza la primera vez que hay que cambiarlo.
- **La ayuda siempre al día** (regla del cliente, 2026-11-13: *"siempre
  mantener las ayudas al día de cualquier cambio, cueste lo que cueste…
  gráficas hay que adaptar, lógicas"*). Un cambio que altera algo que una
  ayuda describe **actualiza esa ayuda en el mismo PR**: el texto, la
  captura y sus puntos, el orden de los pasos. Una ayuda desactualizada es
  peor que ninguna, porque enseña algo que ya no existe. Vale para el sitio
  y para el panel; en el panel, la lista de qué cuenta como ayuda y cómo se
  rehacen las capturas está en `panel/CLAUDE.md`. **Única excepción**: un
  arreglo urgente de algo roto en producción puede salir antes; la ayuda va
  en el PR siguiente, el mismo día, y el PR del arreglo lo dice.

**Panel (`panel/`): lúdico, estilo PlayStation**
- **Lo que se aprieta se ve que se aprieta**: botones de 36px o más (44px
  lo que se usa seguido; 40px en el celular, 2026-11-21), letra de 13px o más donde hay un dato, se
  distingue por forma y no solo por color, un solo botón relleno por vista,
  y tres tamaños: hito, acción y secundario.
- **Flujos simples**: pocos pasos, botones a la vista en vez de
  desplegables, una frase que dice qué pasa al seguir.
- **Una tarjeta abierta cabe en una pantalla** (regla del cliente,
  2026-11-21: *"ojalá que una tarjeta siempre cae en una página… en muchos
  casos sí se puede seguir con la misma regla y a la vez que siempre se ve
  todo en una pantalla"*). Al diseñar una tarjeta, una ventana o una línea
  que se abre, se mide con Playwright que entre entera en un notebook
  —1280×650, lo que queda con la barra del navegador— y, donde se pueda, en
  un teléfono de 393×740: menos aire, el nombre al lado del campo, lo
  secundario plegado (como un ajuste guardado) o en su `?`. **Si no cabe sin
  romper la regla de arriba** —botones bajo 36px, letra bajo 13px—, gana la
  regla de arriba, y el PR dice que no cupo y cuánto mide.
  **Lo mide una prueba, no la memoria** (2026-11-21, lo pidió el cliente:
  *"¿por qué tengo que agregar yo todas las revisiones en los pop-ups… qué
  habrá que hacer para reforzar esto?"*): `npm run ventanas` abre cada
  ficha y cada ventana del panel de ejemplo a 1280×650 y **falla** si una
  que cabía deja de caber, si una anotada crece o si aparece un campo
  corrido. Va dentro de `npm run revisar`. Lo que todavía no cabe está
  anotado con su alto en `NO_CABEN` y solo puede bajar. **Una ventana o una
  ficha nueva se agrega a `ESCENAS` de `pruebas/ventanas.mjs` en el mismo PR
  que la crea**: lo que no está en la lista no se mide.
- **Lo que explica va en su `?`, no fijo en la pantalla** (regla del
  cliente, 2026-11-21: *"vamos a capacitar a la gente y entonces después
  molesta mucho texto constante"*). A la vista quedan el dato y la acción;
  el porqué y el cómo funciona, en `AyudaCorta` o en el `?` de la pantalla.
  Un texto que se lee una vez puede ser `AvisoFijo`, que tiene su ✕. Una
  frase que dice qué pasa al apretar un botón sí se queda.
- **Los formularios van alineados** (regla del cliente, 2026-11-21: *"se
  podría alinear los campos para que los títulos estén en un orden vertical
  y los valores también, o los botones… esto también debería ser una regla
  que se revise siempre, para que se vean de forma profesional todos estos
  formularios"*). En una tarjeta, una ventana o una ficha con varios campos,
  **los nombres van en una columna y los valores en otra**: todos los
  nombres miden lo mismo, así que cada campo, cada valor y cada fila de
  botones parte en la misma vertical. Nunca un campo pegado a su nombre solo
  porque la palabra es más corta. Un segundo dato en la misma fila va a la
  derecha. Las piezas: `CampoAlLado` y `COLUMNA_ROTULO` de `LineaDelDia`;
  `rejilla-campos` y `fila-ficha` (`globals.css`) para una ficha con varios
  campos. **Antes de cerrar un cambio que toque un formulario**, se mira en
  una captura que los bordes izquierdos calcen, y `revisarAlineacion()`
  —dentro de `npm run ventanas`— avisa de un campo que salta respecto de su
  vecino, de un nombre partido en dos renglones y de dos bordes que casi
  calzan.
- **Elegir de una lista que crece se hace con buscador** (regla del
  cliente, 2026-11-12). Los botones a la vista son para opciones fijas y
  pocas; para personas o empresas —vendedores, socios, clientes— van **dos
  botones**: el directo (*No, directo*) y otro que **abre la lista con
  buscador** (*Por un socio comercial…*), con `BuscarEnLista`. Nunca un
  botón por persona.
- **Autoguardado por defecto** (regla del cliente, 2026-11-12). Todo lo
  que se escribe se guarda solo, con el estado a la vista (*Guardando… /
  ✓ Guardado*, y *Reintentar* en rojo si falla). **Se confirma a mano
  solo** lo que: (1) mueve plata —pagos, cobros, devoluciones—; (2) toma o
  libera cupo —ganar, cancelar, soltar, ampliar, abrir o cerrar un día—;
  (3) cierra o corrige un día; (4) aprueba o rechaza algo; (5) le llega al
  cliente —mandar la cotización o el contrato—; (6) borra, desactiva o saca
  a alguien; (7) toca cuentas, roles o links; (8) cambia el nombre de algo
  que otros usan —un producto, una persona, un puesto— o la Configuración,
  que afecta al sitio público. Lo manual pregunta con una ventana que dice
  qué va a pasar; si pide motivo, queda en la bitácora. **Corregir un día
  cerrado no pide un motivo escrito** (2026-11-21): el panel arma la lista
  de lo que cambió, se confirma con una casilla y esa lista es lo que queda
  en la bitácora.
- **Las lecturas de Google son un presupuesto**: 60 por minuto para todo el
  panel. Nada nuevo lee la planilla por su cuenta: se suma a la tanda que la
  ruta ya precarga (`conLecturas()`), y el PR dice cuántas lecturas cuesta.
- **Los permisos los comprueba el servidor**; la pantalla solo deja de
  dibujar lo que la cuenta no puede.
- **La plata la cierra el encargado de pagos** (regla del cliente,
  2026-11-13: *"en movimientos muy claves el encargado de pagos tiene la
  última palabra si se trata de plata… la regla lo deja responsable a
  él"*). Anotar un movimiento de plata y subir su comprobante lo hace quien
  corresponda; **confirmarlo —revisado, pagado, devuelto— es del encargado
  de pagos**, y queda a su nombre. Al diseñar algo con números se pregunta
  primero *¿quién lo confirma?*. **Sin complicar lo que ya funciona**: la
  confirmación no frena el trabajo de los demás —ganar una cotización sigue
  dependiendo del cobro anotado, no del revisado—. El detalle, en
  `panel/CLAUDE.md`.
- **Antes del PR**: `npm run revisar` (tipos, lógica, presupuesto de
  lecturas, letra chica **y las ventanas**: que cada ficha y cada ventana
  quepa en 1280×650 y tenga sus campos alineados, `npm run ventanas`), una
  pasada con Playwright a 393 y 1280px con `revisarPlayStation()` de
  `panel/pruebas/playstation.mjs`, y **¿cambió algo que una ayuda
  describe?** Si sí, se actualiza en el mismo PR. Y si se creó una ventana
  o una ficha, **¿está en `ESCENAS`?**

**Sitio público y landings: elegante y sobrio**
- Fotografía real como protagonista, Fraunces y Work Sans, dorado sobre
  papel tibio de día —la vista que abre— y sobre negro de noche, sin signos
  de exclamación ni superlativos.
- Cero JavaScript para interfaz: las tres excepciones están decididas y no
  sientan precedente.
- **Lo que edita el cliente vive en un solo lugar**: los precios en
  `precios.json`, los textos en el español de la raíz. `en/` y `pt/` se
  generan con `python3 tools/traducir.py` y no se editan a mano.

## Dónde está cada cosa

- **Este archivo**: el sitio público, los landings, la reserva en línea con
  Shopify y las reglas de trabajo (Git, cómo proponer).
- **`panel/CLAUDE.md`**: todo el panel de administración —reservas en el
  panel, cotizaciones, equipo, informe, roles, la regla PlayStation entera,
  el límite de Google—. Se carga al trabajar con archivos de `panel/`.

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

**Los precios NO están en el diccionario: salen de `precios.json`** (desde
el 2026-11-04, ver "La lista de precios"). El script los escribe ya
formateados para cada idioma, porque en formato chileno `$44.000` son
cuarenta y cuatro mil pesos y en inglés se lee como cuarenta y cuatro
dólares con cero centavos: en `en/` sale `$44,000 CLP` y en `pt/`
`$44.000 CLP`. `assets/js/reserva.js` formatea el total calculado con el
mismo criterio.

### La lista de precios (`precios.json`, 2026-11-04)

Lo pidió el cliente: *"así queda coherente siempre en todo el sitio los
precios, para no mostrar uno que aquí cuesta 49 y el otro 44"*. **Cada
precio del sitio se escribe en un solo lugar**, `precios.json`, y
`traducir.py` lo copia a todas las páginas, en los tres idiomas.

Cambiar un precio es:

1. Cambiarlo en `precios.json`.
2. `python3 tools/traducir.py`.
3. Commitear la lista y las páginas juntas.

**Y cambiarlo igual en Shopify**: los menús se cobran con el precio de la
tienda, no con éste. La lista hace que el sitio no se contradiga consigo
mismo; que no contradiga al checkout sigue siendo a mano.

**Cómo se marca un precio en el HTML**: el elemento lleva
`data-lista="destino:clave[:cálculo]"`, varios separados por espacio.

| Destino | Qué escribe |
|---|---|
| `texto` | el texto del elemento, formateado según el idioma |
| cualquier atributo (`data-precio`, `data-precio-local`…) | el número pelado, que es lo que lee `reserva.js` |

| Cálculo | Qué da |
|---|---|
| *(nada)* | el valor tal cual |
| `descuento` | ese precio menos `promociones.descuento`, redondeado al peso |
| `ahorro` | cuánto se ahorra con ese descuento |
| `porcentaje` / `porcentaje-negativo` | `11%` / `−11%` |

La clave es un camino con puntos: `tradiciones.local`,
`recinto.fin_de_semana`. **El elemento marcado lleva solo el monto**: lo que
lo rodea —"+ IVA por persona", "4 a 12 años ·"— va fuera de la marca y sí
pasa por el diccionario.

**Los precios con descuento de `promociones.html` se calculan solos**:
subir Tradiciones en el local cambia el precio tachado, el que queda con el
11% y los dos idiomas de una vez. Y si el descuento pasa a ser 15, se
cambia un número.

**La guarda es la otra mitad, y es la que hace que esto dure.** La corrida
**se niega a generar** si encuentra en una página un `$N.NNN` escrito a mano
fuera de una marca, o un `data-precio` sin `data-lista`, y lo nombra. Sin
eso, el primer precio nuevo que alguien escribiera directo en el HTML
volvería a abrir la puerta a los dos precios. Lo mismo con una clave que no
existe en la lista o una marca mal escrita.

- **El script escribe además `sitemap.xml`** (2026-11-21), con las páginas
  indexables —`PAGINAS` menos `SIN_ALTERNATE`— en los tres idiomas y sus
  hreflang, las mismas URL de cada página. Una página nueva entra sola, y
  `--revisar` avisa si el sitemap quedó viejo. Sin `lastmod`, a propósito:
  una fecha que nadie mantiene enseña a Google a no creerla. `robots.txt`
  es fijo y apunta a él.
- **Es lo segundo que el script escribe en los archivos españoles**,
  después del `?v=` de los assets. `--revisar` nombra las páginas con
  precios viejos como *(precios de la lista)*.
- **Qué precio usa cada página es una decisión que vive en la marca**, no
  en la lista: el sitio público anuncia `linea` (pagar por adelantado) al
  frente y `local` atrás; el landing y promociones muestran `local`. La
  lista solo dice cuánto vale cada uno.
- **El texto de campaña de la cabecera de promociones (`¿11?`) no está
  marcado**, a propósito: es copy, y cambia de campaña en campaña.
- **El `$8.000 + IVA` del desayuno y la once va sin el IVA en la lista**,
  porque así se anuncia: el "+ IVA" es texto de la página.

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

### La vista diurna (2026-11-05)

Lo pidió el cliente para presentarla en una reunión: *"una vista diurna del
sitio y de los landing pages… un diseño más limpio, que transmite la
experiencia limpia de un restaurante con familia, salir del mundo negro"*.
Nació como segunda opción y **desde el 2026-11-19 es la que abre** (lo
decidió el cliente, con el sitio todavía sin publicar en el dominio, que era
el momento barato: nadie lo visitaba). La barra trae un botón **☀ Diurno /
☾ Nocturno** en las ocho páginas del español y en las generadas, y la noche
queda a un toque.

- **Los colores viven en `assets/css/tema.css`**, una sola hoja para el sitio
  público y los dos landings. Funciona porque los tres ya usan las mismas
  variables (`--bg`, `--ink`, `--gold`, `--line`…): de día solo cambia su
  valor —papel tibio `#FAF7F0`, tarjetas blancas, tinta casi negra cálida—.
  Lo poco que estaba en hex a mano se corrige ahí, regla por regla.
- **El dorado se oscurece a `#8A6B12`**, igual que en el tema claro del
  panel: el del sitio sobre crema da menos de 2,5:1. Los rellenos dorados
  pasan a texto blanco.
- **Sobre una foto el texto sigue claro**: el héroe, las franjas a sangre y
  las tarjetas de experiencias vuelven a las variables de noche (con un
  degradado más corto y fotos más luminosas). Blanco sobre foto es lo que se
  lee.
- **`:is()` toma la especificidad de su argumento más fuerte.** Por eso los
  botones delineados y los de WhatsApp se excluyen con `:not()` dentro de la
  regla de los rellenos, y no con una regla posterior: la posterior perdía y
  "Ver las experiencias" salía relleno.
- **Es la tercera excepción a la regla de cero JS** (`assets/js/tema.js`),
  pedida por el cliente: recordar la elección entre páginas no se puede sin
  JS. Va en el `<head>` **sin `defer`**, para pintar el tema antes del primer
  dibujo y no hacer parpadear de negro a claro. Se recuerda en
  `localStorage` (`blp-tema`).
- **El botón nace con `hidden`** y lo muestra el script: si el JS no carga no
  queda un botón muerto. Bajo 440px queda solo el ícono; el texto se oculta
  a la vista pero no se borra.
- **Cómo abre de día** (2026-11-19): `tema.js` pone `data-tema="dia"` salvo
  que la persona haya elegido la noche, que se guarda como `noche`. Fue
  invertir una condición: el CSS no se tocó, sigue escrito como "la noche de
  base y el día encima".
  - **Sin JavaScript se ve la noche**, porque es lo que el CSS trae de base.
    Es un caso raro y se ve bien igual; dar vuelta el CSS entero para
    cubrirlo no valía la pena.
  - **Los PDF del dossier y de socios siguen en negro y dorado.** Los arma
    `tools/dossier_pdf.mjs` con su propio diseño; pasarlos al día es otra
    decisión.
  - Quien había elegido el día lo sigue teniendo, y quien eligió la noche,
    también: las dos elecciones quedan guardadas.

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
- **Socios comerciales, Promociones y el Dossier viven en el pie, no en el
  menú** (2026-10-15; el dossier, el 2026-11-18), apilados como botones
  delineados. Son
  otros públicos, no pasos del recorrido normal: el menú de arriba quedó
  para quien vino a pasar el día. Las reglas `.nav-socios` se borraron.
- **Casi sin JavaScript.** El menú de celular es checkbox + label, y las
  tarjetas que giran y los carruseles son CSS. **El selector de idiomas
  tampoco usa JS**: es un `<details>` con enlaces a la misma página en otra
  carpeta. Hay exactamente **tres** excepciones, todas decididas
  explícitamente con el cliente, y ninguna sirve de precedente:
  `assets/js/reserva.js` (solo en `reservas.html`; la integración con
  Shopify no se puede hacer sin JS) y `assets/js/idioma.js` (en todas; la
  sugerencia de idioma no se puede hacer sin JS en un sitio estático), y
  `assets/js/tema.js` (en todas; recuerda la vista diurna, ver "La vista
  diurna"). **Para interfaz no se usa JavaScript.**
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

### Lo que Vercel publica del sitio (2026-11-19)

El sitio público es **su propio proyecto en Vercel, `brasas-sitio`**, en
`https://brasas-sitio.vercel.app`, en el equipo *Ayc y Blp* (Fase 3B de la
guía *Traspaso a producción*). Sale de la raíz del repo, y servir la raíz
tal cual publicaría todo: cualquiera podría abrir `/CLAUDE.md`, con los
detalles internos del negocio, o el código del panel.

**Por eso el sitio publica una lista de lo público, no de lo privado.** La
arma `tools/publicar_sitio.sh`, que es el Build Command del proyecto
(Vercel → `brasas-sitio` → Settings → Build and Deployment, preset
*Other*):

```
Build Command      bash tools/publicar_sitio.sh
Output Directory   sin override (no se usa)
```

Es una copia, no una construcción: el HTML se publica tal cual y la regla
de "no hay build step" sigue valiendo para el sitio. Comprobado ese día por
el cliente: `/CLAUDE.md` da 404, y `/`, `/en/` y el calendario de
`reservas.html` funcionan.

- **`robots.txt` y `sitemap.xml` están en `PUBLICO` desde el 2026-11-21**,
  para enviar el sitemap a Google Search Console el día del lanzamiento.
- **Una carpeta o archivo público nuevo en la raíz se agrega a `PUBLICO`**,
  al inicio del script; si no, el sitio publicado no lo tiene. Lo privado
  no hay que anotarlo en ninguna parte: lo que no está en la lista no sale.
- **El script escribe `.vercel/output`, no un `vercel.json`, a
  propósito.** Esa carpeta se crea durante la construcción del sitio y no
  está en el repo (va en `.gitignore`), así que el panel no la ve. Vercel la
  usa cuando existe (*Build Output API v3*), por encima del Output
  Directory: lo comprobamos en el código de su constructor
  (`packages/static-build`), que la busca antes de mirar esa opción. Ver la
  trampa de abajo.
- Hasta el 2026-11-19 la lista era una línea en la configuración de Vercel
  (`mkdir -p dist && cp -r *.html *.pdf assets en pt dist/`). Pasó al script
  para poder sumar las redirecciones del sitio viejo sin un archivo de
  Vercel en la raíz.

#### Las direcciones del sitio viejo (2026-11-19)

Al mover `brasasdelopirque.cl` a Vercel, las direcciones del sitio de
Shopify dejan de existir. Google las tiene indexadas y hay links
compartidos, así que **cada una redirige con un 301** a su página nueva:
se conservan la visita y la posición en Google. Salen del sitemap del sitio
viejo, y el reparto lo acordó el cliente:

| Dirección vieja | Va a |
|---|---|
| `/products/almuerzo-y-show-ecuestre-1`, `/pages/ticket`, `/pages/contact` | `reservas.html` |
| `/pages/menu-nuevo`, `/collections/frontpage`, `/collections/restaurante` | `experiencias.html` |
| `/pages/eventoskthae` | `eventos.html` |
| `/pages/eventos-corporativos` | `dossier.html` |
| `/pages/turismo` | `landing-afiliados.html` |
| `/pages/fotos`, `/pages/galeria-de-fotoskns8x`, `/blogs/news` | `/` |

- **Cualquier otra `/products/…`, `/collections/…`, `/pages/…` o
  `/blogs/…`** cae en la misma página que su grupo, por si había links que
  el sitemap no listaba.
- **Lo que era de la tienda sigue yendo a la tienda, pero solo lo que
  Shopify muestra sin su tema** (cambió el 2026-11-21): el estado de un
  pedido (`/<id>/orders/…`), `/checkouts/…` y los links de carrito con código
  (`/cart/c/…`, por donde el sitio manda a pagar, y `/cart/<variante>:<n>`).
  Van a `TIENDA`, al inicio del script, con el resto de la ruta. **El carrito
  vacío (`/cart`) va a `reservas.html`, y `/account` y `/policies` a la
  portada**: esas las dibuja el tema, y en `tienda.` va a haber un tema de
  redirección que las devuelve acá con la misma ruta (ver abajo, "El tema
  de redirección en `tienda.`"). Mandarlas allá sería un rebote sin fin. **Hoy dice `tienda.brasasdelopirque.cl`**, el nombre propuesto para
  el dominio de Shopify después del lanzamiento: si se elige otro, se
  cambia esa línea.
- **Un 404 sale en su idioma**: `/en/…` con `en/404.html`, `/pt/…` con el
  portugués, y todo lo demás con el español. `/en` y `/pt` sin la barra
  final redirigen a `/en/` y `/pt/`, porque los enlaces de esas páginas son
  relativos y sin la barra apuntarían al español.
- **Antes del lanzamiento no tienen efecto**: el dominio sigue en Shopify.
  En `brasas-sitio.vercel.app` ya se pueden probar —por ejemplo
  `/pages/ticket` tiene que terminar en `reservas.html`—.
- **Al crear el proyecto, Vercel propone `panel` y Next.js**, porque ahí
  encuentra un proyecto Next. Hay que elegir a mano la raíz y *Other*, y el
  nombre: con lo propuesto quedó `aycyblp-panel`, que es justo lo que no
  es. Se renombró a `brasas-sitio` y se borró la dirección vieja.
- **GitHub Pages sigue publicando el repo entero** en `ayc-y-blp.github.io`.
  Con el repo público da lo mismo, porque el repo ya se ve.
- **Desde este entorno no se abre** `brasas-sitio.vercel.app`: el proxy
  solo deja pasar la dirección del panel. Para revisarlo desde acá hay que
  agregarlo a *Allowed domains* del entorno.

#### El dominio en Cloudflare (2026-11-20)

**El DNS de `brasasdelopirque.cl` se edita en Cloudflare**, no en NIC Chile
(los servidores de nombre son `etienne` y `michelle.ns.cloudflare.com`).
NIC Chile solo registra el dominio. El cliente tiene su propio acceso a la
cuenta de Cloudflare desde ese día. Los pasos, con capturas y la vuelta
atrás, viven en el documento *Cloudflare: pasos para la videollamada*.

**Todo lo que apunta a Vercel o a Shopify va con la nube gris (*DNS
only*)**: con la naranja, Vercel no puede sacar el certificado.

| Registro | Hoy (2026-11-20) | Desde el lanzamiento |
|---|---|---|
| Raíz `@` | A `23.227.38.65` (Shopify) | CNAME `10c7284c4c88203f.vercel-dns-016.com` (Cloudflare lo resuelve en la raíz) |
| `www` | CNAME `shops.myshopify.com` | CNAME `10c7284c4c88203f.vercel-dns-016.com`; Vercel lo redirige con 308 a la raíz |
| `panel` | CNAME `ff42ec43123a7939.vercel-dns-017.com` | igual |
| `tienda` | CNAME `shops.myshopify.com` | igual |
| 5 MX y 2 TXT de Google | el correo del dominio | **no se tocan nunca** |

- **Ya funciona, sin tocar el sitio viejo**: `panel.brasasdelopirque.cl`
  (Vercel lo da por válido y abre la entrada) y `tienda.brasasdelopirque.cl`,
  conectado en Shopify **sin ser el principal** —por eso hoy redirige al
  sitio viejo—. En Vercel ya están `brasasdelopirque.cl` (en `brasas-sitio`,
  Production) y `www` (redirige a la raíz), esperando el DNS.
- **Del lado del dominio, el lanzamiento son tres pasos**: en Shopify,
  `tienda.` pasa a ser el dominio principal; en Cloudflare, se borra el A de
  la raíz y se crea el CNAME `@`, y se cambia el de `www`. **La tienda real
  va aparte y antes**: los productos con sus dos modalidades ya están allá y
  `CONFIG.tiendas.real` está lleno desde el 2026-11-20 y **se mergeó esa
  misma noche** (PR #283, ver "La tienda real, conectada"): desde ahí
  `brasas-sitio.vercel.app` cobra de verdad. **La vuelta atrás** es devolver los
  dos registros a los valores de la columna *Hoy* y volver a dejar
  `brasasdelopirque.cl` como principal en Shopify; el TTL está en Auto (5
  minutos).
- **El tema de redirección en `tienda.`** (2026-11-21, lo recomendó
  Shopify): con `tienda.` como dominio principal, la tienda online seguiría
  mostrando el tema viejo a quien entre directo. Se publica el *Hydrogen
  Redirect Theme* de Shopify (sirve para cualquier sitio externo, no solo
  Hydrogen) con **Hostname `brasasdelopirque.cl`**, sin *custom redirects*
  y sin *customer accounts*. Lo que hace, leído en su código: toda página
  que dibuja el tema redirige al hostname **con la misma ruta**
  (`tienda.…/products/almuerzo-y-show-ecuestre-1` → `brasasdelopirque.cl/…`
  → `reservas.html`), con `noindex`; el checkout y el estado de un pedido no
  los dibuja el tema, así que no se tocan.
  - **Se publica recién después de mover el DNS**, cuando
    `brasasdelopirque.cl` ya muestra el sitio nuevo. Antes sería un rebote:
    `brasasdelopirque.cl` todavía en Shopify → `tienda.` (el principal) →
    el tema → `brasasdelopirque.cl` → …
  - **El tema viejo no se borra**: volver atrás es publicarlo de nuevo.
  - **El registro de `tienda.` en Cloudflare no se toca**: sigue a Shopify.
  - **Comprobar al lanzar**: `tienda.brasasdelopirque.cl` lleva al sitio
    nuevo; el link viejo del producto, a reservas; una compra del sitio
    nuevo abre el checkout en `tienda.`; el *ver pedido* del correo de
    confirmación abre; y un link de estado de pedido de un correo viejo
    (`brasasdelopirque.cl/<id>/orders/…?key=…`) llega a `tienda.` **con su
    `?key=`**, que es lo que lo abre sin pedir clave.
- **El sitio quedó sin www** a propósito, al revés de lo que propone Vercel:
  así están escritos los `hreflang` (`SITIO` en `tools/traducir.py`) y las
  redirecciones del sitio viejo.
- **`landing-pirque-alpha.vercel.app` sigue igual** y no se toca: va en
  `reserva.js`, en los webhooks de Shopify y en los links ya mandados. Los
  links que el panel copia salen de la dirección desde donde se usa
  (`window.location.origin`), así que quien entra por `panel.` manda links
  con `panel.`, y los viejos siguen abriendo.
- **Desde este entorno no se abren** `panel.` ni `tienda.` hasta que se
  agreguen a *Allowed domains* del entorno de Claude Code.

**La trampa, que costó 40 minutos del panel caído.** El primer intento fue
un `.vercelignore` en la raíz (PR #264), con `/panel` entre lo excluido.
**Vercel lo aplica a todos los proyectos que salen del repo, también al
panel**, aunque el panel tenga Root Directory = `panel`: le quitó su propio
código. De 16:59 a 17:41 UTC el panel respondió 404 en todas sus rutas —la
entrada, el webhook de Shopify y las fechas del sitio— y se retiró de
urgencia (PR #267). Dos lecciones:

- **Nada en la raíz del repo que configure Vercel** (`.vercelignore`,
  `vercel.json`): lo leen los dos proyectos. Lo de un solo proyecto va en
  su configuración, o en su propia carpeta (el panel tiene
  `panel/vercel.json`).
- **Un chequeo verde de Vercel no dice que la app funcione**, solo que
  construyó: esa vez construyó un Next.js sin ninguna ruta. **Después de
  mergear algo que toque cómo se despliega**, se comprueba en producción
  que `/login` y `/api/publico/fechas` del panel den 200 y el webhook 401
  —`migracion-team/verificar.sh` lo hace—, y si el panel no responde se
  revierte primero y se investiga después.

### La regla PlayStation, también en el sitio y los landings (2026-11-06)

Lo pidió el cliente: la misma regla del panel —botones que se ven
apretables, nada de letra chica donde hay un dato, contraste de verdad—
aplicada al sitio público y a los dos landings, *"decidir: aquí puedo hacer
este cambio o no"*.

**El calendario de reservas era lo peor**, y es lo que más se usa:

- **Los tres estados se distinguen por forma, no solo por color.** El día
  que se puede reservar es una tecla con borde dorado, relleno y número en
  negrita; el que no, un número suelto sin caja. Antes el cerrado iba al
  30% de opacidad y el abierto apenas teñido: los dos se leían como el mismo
  gris.
- Números a 16-17px (antes 12,8), días de la semana a 13px, el mes en
  negrita y las flechas de 44px.
- **El día elegido se rellena de dorado con un anillo**, y gana al `:hover`
  del abierto (`.cal-dia.abierto.elegido:hover`): sin eso, el día recién
  apretado se veía sin relleno mientras el puntero seguía encima.
- **Hoy va subrayado** (clase `hoy`, la pone `reserva.js`), para ubicarse
  en el mes sin leer nada.
- **Los días por llenarse van en dos etapas** (2026-11-06, lo pidió el
  cliente: el punto chico *"nadie lo entiende"*, tenía que ser más
  comercial). **Naranjo, *Pocos cupos***, desde el umbral de la planilla
  (`aviso_pocos_lugares`, que el panel manda resuelto en `pocos`); **rojo,
  *Últimos cupos***, con menos de 10 lugares (`ULTIMOS_CUPOS` en
  `reserva.js`). Se distinguen por forma además de color: la tecla cambia de
  borde y lleva una barra gruesa al pie. Bajo el mes, dos pastillas con la
  misma barra; al elegir el día, el aviso es una pastilla de su color con
  *quedan N*. **El rojo se calcula en el sitio con `quedan`**, que ya viaja
  en el contrato: no se agregó ningún campo al backend. El primer corte
  traía una leyenda de tres cajas y el cliente la sacó (*"se entiende
  solo"*); después del punto suelto pidió estas dos etapas.
- **En un teléfono las siete columnas mandan**: las casillas miden lo que
  deje el ancho (unos 39px a 393). Por eso se le quitó aire al marco del
  formulario bajo 480px, y **no lleva `min-height`**: con 42px fijos la
  última columna se salía de la caja.

**Las tarjetas que giran**: el reverso iba de 10 a 12px. Ahora el texto va
a 13-15px, y como **el reverso tiene alto fijo**, lo que no cabe se corta
sin aviso. Por eso cambió la grilla, no solo la letra:

- Sitio público: una tarjeta por fila bajo 700px (4:3), cuadrada bajo 460 y
  4:5 bajo 380.
- Landings: cuatro columnas solo sobre 1180px, dos hasta 560, una debajo
  (cuadrada; 3:4 bajo 380). **Las reglas del teléfono van después de la
  regla base de `.flip-card`**: antes de ella, la base las pisaba y nunca
  aplicaban.
- **Se comprobó tarjeta por tarjeta** que ningún reverso se corte, en
  español, inglés y portugués, de 320 a 1280px.

**Lo demás**, todo lo que estaba bajo 13px: el aviso *Toca para ver
detalles*, las insignias *Incluido / Con costo*, los pies de foto, el
*Pagar en el local* de cada tarjeta (ahora es un enlace de 35px de alto y
no de 20), los rótulos del menú (en dorado), el pie y sus dos botones
(44px), la tarjeta de sugerencia de idioma y su ✕ (40px), y los botones de
idioma y Diurno/Nocturno.

**Lo que no se tocó, a propósito**: los títulos, los precios grandes y el
cuerpo de texto, que ya estaban a tamaño de leer; y el aspecto general, que
sigue siendo el mismo.

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
  `tools/traducir.py`. Con el dossier son **10 páginas × 3 idiomas = 30**.

## Landing dossier (`dossier.html`) y los precios de empresa (2026-11-18)

Lo pidió el cliente: *"un tercer landing page, que lo llamamos dossier…
básicamente lo mismo como promociones o socios comerciales, pero sin
descuentos ni con comisiones… para enviarlo directamente a una empresa que
está cotizando"*. Ese mismo día se tomaron tres decisiones que tocan a los
tres landings de empresa (socios, promociones y dossier).

**El dossier**

- **Nació como copia de `landing-afiliados.html`** sin el bloque de
  comisiones, sin el panel *Por qué sumarte* (era sobre ser socio) y sin el
  CSS de ambos: no se dejó muerto. El resto —experiencias, menú, galería,
  actividades, recinto y extras— es igual.
- **WhatsApp de Eventos**, con su propio mensaje prellenado: *"estoy
  revisando el dossier… y quiero cotizar un evento para mi empresa"*.
- **Enlazado en el pie del sitio público**, debajo de Socios comerciales
  (lo pidió el cliente), como *Dossier para empresas*. Va con `hreflang` y
  en los tres idiomas, igual que los otros dos.
- El copy de la cabecera y de la bajada lo escribió Claude: *Dossier para
  empresas · Experiencias, actividades y recinto para tu evento*.

**Tradiciones se vende solo en el sitio público.** Salió de los tres
landings: quedan **tres experiencias**, Lo Pirque, Brasas y Sommelier. La
grilla pasó a tres columnas sobre 900px y una por fila debajo (con ancho
máximo de 520px). **Con dos columnas la tercera quedaba sola**, y a 861px las
tres columnas cortaban el reverso de Brasas en promociones: por eso el corte
está en 900 y no en 860. El pie de la foto de la galería dejó de decir
*Experiencia Tradiciones*.

**Los precios de empresa van más IVA**, y son otros números:

| | Por persona |
|---|---|
| Lo Pirque | $50.000 + IVA |
| Brasas | $70.000 + IVA |
| Sommelier | $90.000 + IVA |

- Viven en `precios.json` bajo **`empresas`**, aparte de los del sitio
  público, que siguen IVA incluido. Así una lista no puede pisar a la otra.
  `lo_pirque.local` y `sommelier.local` se borraron: no los usaba nadie más.
- **El "+ IVA" va al lado de cada precio** (`.mas-iva`, a 13px), fuera de la
  marca `data-lista`, porque `traducir.py` reescribe el texto de la marca
  entera. En el reverso de promociones no va: con el precio tachado el
  renglón no cabía y el texto de abajo ya dice *pp. + IVA*.
- **Promociones mantiene su 11%**, ahora calculado sobre el neto: Lo Pirque
  $44.500, Brasas $62.300, Sommelier $80.100, todos + IVA.
- **El arriendo del recinto pasa a + IVA en todo el sitio**
  ($2.500.000 / $1.500.000 + IVA): primero en los tres landings y, el mismo
  día, en `eventos.html`, que lo pidió el cliente para que el mismo número no
  tuviera dos sentidos. **Es la misma pieza en las cuatro páginas**: la bajada
  dice *"Valores sin catering, más IVA"* y cada monto lleva su `.mas-iva` al
  lado (en el sitio público vive en `site.css`).

### El dossier en PDF (2026-11-18)

Lo pidió el cliente: *"debe haber un botón descargar PDF… con la mini
presentación con el mismo contenido que está en la página dossier"*. Eligió
**diapositivas horizontales** sobre un documento vertical.

- **Ocho láminas de 1280×720**: portada, la experiencia, las tres
  experiencias con su precio + IVA, el menú, las actividades del recinto,
  las adicionales, recinto y extras, y contacto con el WhatsApp de Eventos
  (clicable dentro del PDF). Negro y dorado, Fraunces y Work Sans, fotos
  reales del sitio.
- **Lo genera `node tools/dossier_pdf.mjs`**, que abre `dossier.html` ya
  traducido en cada idioma y **lee el contenido de la página** —textos,
  precios, fotos— para armar las láminas. No hay un segundo texto que
  mantener: el PDF no puede decir un precio que la página no dice. Lo único
  escrito en el script es el rótulo *El menú / The menu / O cardápio*, porque
  la página no lo tiene. Si cambia el HTML del dossier y algo no se
  encuentra, el script se detiene y dice qué faltó.
- **Cada idioma tiene su PDF al lado de su página**: `dossier.pdf`,
  `en/dossier.pdf` y `pt/dossier.pdf`. Por eso el enlace es
  `href="dossier.pdf"` relativo y sirve igual en las tres carpetas. Se
  descarga como `Brasas-de-Lo-Pirque-dossier.pdf`.
- **El botón *Descargar PDF* va dos veces**: en el héroe, junto al de
  WhatsApp (en una fila que se dobla en el celular, `.hero-acciones`), y en
  la tarjeta de contacto. Es un enlace con `download`: **cero JavaScript**.
- **La guarda**: el script anota en `tools/dossier_pdf.json` la huella de
  las tres páginas (sin los `?v=`, para que cambiar un CSS no lo marque) y
  de sí mismo. **`traducir.py` avisa si el dossier cambió y el PDF no**, y
  `--revisar` falla. O sea, el flujo cuando cambia el dossier o un precio de
  empresa es: `python3 tools/traducir.py`, después
  `node tools/dossier_pdf.mjs`, y commitear todo junto.
- Necesita Node y el Playwright que ya trae el entorno; no agrega un
  `package.json` al sitio.
- **Socios comerciales también tiene el suyo** (2026-11-18, lo pidió el
  cliente): `socios.pdf` en las tres carpetas, con el mismo botón en el héroe
  y en contacto, y se descarga como
  `Brasas-de-Lo-Pirque-socios-comerciales.pdf`. **Son las mismas ocho
  láminas más dos propias**, porque el PDF dice lo que dice su página:
  *Niveles de comisión* con los segmentos, y *Por qué sumarte* con cómo
  funciona —diez en total—. La portada y el contacto salen de la página de
  socios (*Trabaja con nosotros*, su mensaje de WhatsApp). El mismo script
  arma los dos (`PDFS` en `tools/dossier_pdf.mjs`) y la guarda de
  `traducir.py` mira las seis páginas.
- **La sección del arriendo se llama `#arriendo` en los tres landings.** En
  socios y promociones se llamaba `#socios`, un nombre heredado que ya no
  describía nada y que hacía que el script no la encontrara. Ningún enlace
  apuntaba ahí.

**En socios comerciales las experiencias van siempre abiertas** (lo pidió
el cliente), igual que en promociones: el panel es un `<div class="panel
panel-fijo">` y no un `<details>`. En el dossier, lo mismo.

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
                             y, desde el 2026-11-12, `quedanPagando` (opcional)
```

**El cuarto campo, `quedanPagando`, es lo único que se le agregó**: lo que
queda para quien **paga ahora**, que puede ser más que `quedan` porque una
reserva sin pagar no le quita el lugar a quien paga (ver "Quien paga tiene
preferencia"). Es opcional a propósito: si un backend no lo manda,
`reserva.js` usa `quedan` y el sitio se comporta como antes.

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
cualquiera de las dos sola. Ver `panel/DESPLIEGUE.md`. **Ojo: la
reconciliación diaria no corrió hasta el 2026-11-18**: el middleware del
panel le respondía 401 a la llamada de Vercel, que llega sin sesión. Ver
`panel/DESPLIEGUE.md`.

**El token de Admin API del panel no contradice la regla de este proyecto.**
"Un token de Admin API jamás" es sobre el **sitio**, donde quedaría en un
archivo público. En el panel es una variable de entorno de Vercel, del lado
del servidor, que nunca sale al navegador.

- **Toda la configuración vive en el objeto `CONFIG`** al inicio de
  `assets/js/reserva.js`: **las dos tiendas** (cada una con su dominio, su
  token y sus IDs de variante), las direcciones que cobran de verdad, la
  versión de API y la URL del backend. Los precios no están ahí: viven en
  `precios.json`. Ver "Dos tiendas: la real solo en la dirección real".
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
- **El token de cada tienda es el interruptor de la integración, y el de
  la tienda de prueba está encendido desde el 2026-10-14.** Lo decidió el
  cliente para poder probar la cadena completa: el token del Storefront es
  público por diseño, así que vivir en el archivo no es el problema; el
  problema es a qué tienda apunta. Con el token en blanco el botón no
  llama a la API: avisa y manda a WhatsApp.
- **Salir a producción es llenar `CONFIG.tiendas.real`**: dominio, token y
  los ocho IDs, juntos. Mientras sea `null`, todas las direcciones usan la
  tienda de prueba —también la real— y la página lo dice. **Se llenó el
  2026-11-20**, con el modelo de variantes ya creado allá: ver "La tienda
  real, conectada".
- **Las variantes ya no son una por fecha** (cambió el 2026-10-13, con la
  tienda de desarrollo en pie). Antes eran 20: diez fechas × adulto/niño.
  Ahora son **seis: tres menús × dos modalidades**, y la fecha no elige
  variante: **viaja como propiedad de línea** para que Cowlendar la
  registre. El modelo se simplificó solo.
- **Los adultos no se pueden mezclar: hay UN contador y una casilla**
  (2026-11-02). Ver "Los adultos van todos al mismo menú" más abajo. Hasta
  ese día había una fila por menú y un pedido podía llevar tres personas en
  Tradiciones y dos en A Brasas abiertas; eso se acabó. Cada fila
  `[data-opcion]` sigue siendo una línea del carrito y la que queda en cero
  no se agrega.
- **Los contadores son botones de 44px, no las flechitas del
  `<input type=number>`**, que son de unos 10px y en celular no se aciertan.
  El input sigue debajo y se puede escribir: los botones son una comodidad
  encima, no el único camino, y `recalcular()` normaliza lo que se escriba.
- **El menú de niños se puede pedir solo** (decidido por el cliente el
  2026-10-14). No hay mínimo de adultos: un pedido de tres menús de niños y
  nada más es válido. Lo único que el formulario no deja es el pedido
  vacío.
- **Los precios viven en el HTML y los IDs de variante en `CONFIG`**: cada
  fila `[data-opcion]` lleva `data-precio`/`data-precio-local` (los escribe
  `traducir.py` desde `precios.json`, 2026-11-04) y **dice qué menú es**
  con `data-menu` —la de adultos también `data-menu-alta`—, con las mismas
  claves de `precios.json`. Los IDs salen de la tienda de esa página. Hasta
  el 2026-11-20 los IDs también vivían en el HTML, para tener un solo lugar
  que editar; con dos tiendas, ese lugar pasó a ser la ficha de cada una.
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

### Dos tiendas: la real solo en la dirección real (2026-11-20)

Lo pidió el cliente pensando en después del lanzamiento: *"si yo quiero
hacer un cambio en la versión preview, debería quedar conectado la tienda
de desarrollo… hay que evitar que se hace una prueba y se hace una
transacción real"*. Hasta ese día la tienda, el token y los IDs estaban
escritos en los archivos, que son los mismos en una versión de prueba y en
producción: después de conectar la tienda real, cualquier versión de prueba
de un PR habría cobrado de verdad.

**La regla: la tienda real solo en la dirección real; todo lo demás, contra
la tienda de desarrollo**, que no puede cobrar plata de verdad (Shopify solo
le deja procesar pagos de prueba).

| Dónde | Tienda | Planilla | ¿Plata real? |
|---|---|---|---|
| `brasasdelopirque.cl`, `www` y `brasas-sitio.vercel.app` | real | real | sí |
| Versión de prueba de un PR (sitio y panel) | desarrollo | Pruebas | no |
| GitHub Pages y un computador | desarrollo | — | no |

**El sitio** (`assets/js/reserva.js`):

- **`CONFIG.tiendas` trae las dos**, `real` y `prueba`, cada una con su
  dominio, su token y sus IDs por menú (`tradiciones`, `a_brasas_abiertas`,
  `ninos`, `pequenos`, cada uno con `linea` y `local`).
- **`tiendaDeEstaPagina()` elige por `location.hostname`**: la real solo si
  la dirección está en `CONFIG.direccionesReales` **y** la tienda real ya
  tiene sus datos. Cualquier otra dirección cae en la de prueba: olvidarse
  de algo nunca termina en un cobro. `brasas-sitio.vercel.app` está en la
  lista porque sirve la misma versión que el dominio y ahí se hace la
  compra de prueba antes de mover el DNS; las versiones de prueba de un PR
  tienen otra dirección (`brasas-sitio-git-…`) y no calzan.
- **En la tienda de prueba lo dice arriba del formulario**: *"Tienda de
  prueba: aquí no se cobra nada."*, en los tres idiomas. Es la misma pieza
  de los avisos del formulario (`reserva-mensaje aviso`, en dorado), pero
  fija: la zona de mensajes se borra al apretar un botón.
- **Una fila cuyo menú no esté en la tienda no crea el carrito**
  (`faltaVariante()`): avisa y manda a WhatsApp, en vez de mandar un ID
  vacío.
- **Comprobado con Playwright** sirviendo la página en seis direcciones,
  con una tienda real de mentira inyectada: con la real llena, el dominio,
  `www` y `brasas-sitio.vercel.app` piden a la real, sin aviso; una versión
  de prueba de un PR, GitHub Pages y `localhost`, a la de desarrollo, con
  aviso. Con la real en `null`, las seis a la de desarrollo. Subir a A
  Brasas abiertas y pagar en el local manda las variantes correctas, y un
  `cartCreate` de verdad contra la tienda de desarrollo devuelve
  `userErrors: []` con los totales de siempre ($176.000 / $204.000).

**El panel** elige la tienda por sus variables de Shopify, que llevan
**un valor por entorno**: la tienda real en Production y la de desarrollo
en Preview. Desde el 2026-11-21 la real usa `SHOPIFY_CLIENT_ID` y
`SHOPIFY_CLIENT_SECRET` en vez de `SHOPIFY_ADMIN_TOKEN` (ver "La tienda
real, conectada"). Ver `migracion-team/variables-vercel.md`. El Preview ya escribía
en la planilla "Pruebas", así que un pedido de prueba nunca llega a la real.

**Los webhooks de la tienda de desarrollo se borran al lanzar.** Una versión
de prueba no los puede recibir —su dirección cambia y está protegida— y
producción los rechaza, porque la firma no calza con el secreto de la tienda
real: esa es la segunda barrera. En una versión de prueba del panel, los
pedidos de prueba se traen con *Revisar Shopify ahora*.

### La tienda real, conectada (2026-11-20)

`CONFIG.tiendas.real` dejó de ser `null`: dominio `lo-pirque.myshopify.com`
(shopId 63433277497, la misma tienda que sirve `brasasdelopirque.cl`), el
token público del canal **Brasas De Lo Pirque Headless** y los ocho IDs.

| Menú | Pago directo | Solo reserva |
|---|---|---|
| Tradiciones | `51261066182713` — $44.000 | `51261066215481` — $49.000 |
| A Brasas Abiertas | `51261066051641` — $70.000 | `51261066084409` — $75.000 |
| Niños | `51261065691193` — $19.000 | `51261065723961` — $24.000 |
| Pequeños | `51261065887801` — $6.000 | `51261065920569` — $9.000 |

- **Los productos los creó el agente de Shopify del cliente**, con nombres
  y variantes que calzan con lo que el panel lee —el producto sin "Menú"
  delante (`canonizar()`), la variante `Pago directo` / `Solo reserva`
  (`tipoPagoDe()`)—. **Inventó SKU nuevos y se cambiaron a los de la tienda
  de desarrollo** (`pago-directo-<menú>` / `solo-reserva-<menú>`): el sitio
  y el panel no leen el SKU, pero la regla de medios de pago del checkout
  va por SKU, y así se copia igual en las dos tiendas.
- **Publicados solo en el canal Headless, no en Tienda online**: el sitio
  viejo no los muestra antes del lanzamiento. El token es el **público** de
  ese canal (API Storefront → Gestionar); el privado no se usa.
- **Comprobado ese día**: la Storefront API devuelve los cuatro con sus
  títulos, SKU y precios, en CLP y disponibles; dos `cartCreate` con el
  payload del sitio dan `userErrors: []`, $176.000 (3 Tradiciones, 2 niños
  y 1 pequeño, pagando ahora) y $282.000 (los mismos, subidos a A Brasas y
  solo reservando), con `_booking_date` en cada línea. Y con Playwright, el
  `reserva.js` de verdad —sin nada inyectado— servido en seis direcciones:
  el dominio, `www` y `brasas-sitio.vercel.app` piden a la real, sin aviso;
  una versión de prueba de un PR, GitHub Pages y `localhost`, a la de
  desarrollo, con aviso.
- **Desde este entorno, la Storefront API de la real responde en
  `brasasdelopirque.cl`**, el dominio principal de esa tienda;
  `lo-pirque.myshopify.com` está bloqueado. Desde el lanzamiento ese
  dominio es Vercel: para volver a probar la real desde acá hay que agregar
  `lo-pirque.myshopify.com` a *Allowed domains*.
- **El checkout sale en el dominio principal de la tienda**: hoy
  `brasasdelopirque.cl/cart/c/…`, desde el lanzamiento `tienda.`. Si el DNS
  se moviera antes que el principal, `tools/publicar_sitio.sh` igual manda
  `/cart/` y `/checkouts/` a la tienda.
- **La app del panel en la tienda real se creó en el Dev Dashboard**
  (*Reservas Pirque*, con `read_orders`): desde el 1 de enero de 2026
  Shopify ya no deja crear apps propias desde el admin. **Esas apps no
  entregan un token fijo `shpat_`**: entregan un Client ID y un Client
  secret, y con ellos se pide un token que dura 24 horas (*client
  credentials grant*, que solo funciona si la app y la tienda son de la
  misma organización de Shopify). Por eso el panel ganó `tokenDeAcceso()`
  en `panel/src/lib/admin.ts`, en el mismo PR: con `SHOPIFY_CLIENT_ID` y
  `SHOPIFY_CLIENT_SECRET` pide el token solo, lo guarda hasta cinco minutos
  antes de que venza, y esas dos mandan sobre `SHOPIFY_ADMIN_TOKEN`. Van
  **solo en Production**: Preview sigue con el token fijo de la tienda de
  desarrollo. **Comprobado el 2026-11-21** con las credenciales de verdad,
  desde el computador del cliente: el token sale y un pedido real responde
  con nombre, apellido, correo y teléfono.
- **Los webhooks de la tienda real ya llegan al panel** (2026-11-20, de
  noche): el cliente creó los tres en Notificaciones → Webhooks, cambió
  `SHOPIFY_WEBHOOK_SECRET` de Production por el secreto de firma de la
  tienda real e hizo Redeploy. La notificación de prueba de Shopify llegó
  con **200** y User Agent `Shopify-Captain-Hook`. **Adelantarlo no ensucia
  nada**: el panel acepta la firma y descarta los pedidos del sitio viejo
  porque no traen `_booking_date`, sin escribir en la planilla. Desde ahí
  los webhooks de la tienda de desarrollo reciben 401 en producción, que es
  lo correcto. **Hasta el merge, un aviso descartado no escribe nada en los
  registros de Vercel**: el 200 se ve en Observability → Functions →
  `/api/shopify/webhook`, o abriendo la fila de Logs. **Desde el merge**
  deja la línea `descartado, sin fecha de reserva` con el número del pedido,
  y ya no lee la planilla para descartarlo (ver `panel/CLAUDE.md`).
- **Mergear ese PR era del camino *con prueba*, y se mergeó el 2026-11-20
  a las 23:16** (PR #283), con el OK del cliente. Desde el merge,
  `brasas-sitio.vercel.app` cobra de verdad y el panel lee la tienda real.
  El orden: primero las variables de Production del panel —`SHOPIFY_CLIENT_ID`
  y `SHOPIFY_CLIENT_SECRET`, cargadas el 2026-11-20, y **`SHOPIFY_DOMINIO`
  con `lo-pirque.myshopify.com`, que es lo único que queda y va justo antes
  del merge** (con el código de antes, ese dominio se leería con el token
  de la tienda de desarrollo; una variable nueva rige desde el próximo
  despliegue, y el merge es el que lo dispara)—, después el merge, y después una compra de prueba en
  `brasas-sitio.vercel.app` de cada modalidad, que comprueba lo que falta:
  que `_booking_date` llegue al pedido, que la regla de medios de pago
  aplique y que el pedido aparezca en el panel. Poner el panel primero no
  ensucia nada: los pedidos del sitio viejo no traen `_booking_date` y el
  panel los ignora.
- **Los pedidos del sitio viejo no entran al panel, y eso tiene una
  consecuencia.** El producto viejo, *Menú Tradiciones*, vende la fecha en
  la variante (*"Sábado 28 de Noviembre / Adultos"*), sin `_booking_date`,
  y `aReserva()` lo descarta a propósito. Al 2026-11-20 vendía hasta el
  domingo 27 de diciembre: **quien compró ahí para una fecha posterior al
  lanzamiento no le descuenta cupo al panel** hasta que alguien lo anote.
  **Se anotan a mano en el panel** (lo decidió el cliente el 2026-11-21): no
  se le enseña al panel a leer el modelo viejo. Y al lanzar, ese producto
  hay que sacarlo de Tienda online: en `tienda.` el tema viejo lo seguiría
  vendiendo.
- **El medio de pago "Pago en el local" ya existe en la tienda real**
  (confirmado por el cliente el 2026-11-21). Que la regla por SKU oculte el
  medio que no corresponde se ve en la compra de prueba de cada modalidad.

### Las variantes de la tienda de desarrollo (2026-10-13)

Las entregó el agente de Shopify del cliente. **Son de la tienda de
desarrollo, no de producción**: en producción los IDs son otros. Desde el
2026-11-20 viven en `CONFIG.tiendas.prueba` de `reserva.js`.

| Menú | Pago directo | Solo reserva |
|---|---|---|
| Tradiciones | `50684108013785` — $44.000 | `50684108046553` — $49.000 |
| A Brasas abiertas | `50684143173849` — $70.000 | `50684143206617` — $75.000 |
| Niños | `50684218081497` — $19.000 | `50684218114265` — $24.000 |
| Pequeños | `51269453971673` — $6.000 | `51269454004441` — $9.000 |

**El sitio ofrece las dos columnas desde el 2026-10-14.** Lo que significan
lo aclaró el cliente ese día:

- **Pago directo** — paga en línea en el checkout de Shopify, con el precio
  con descuento.
- **Solo reserva** — reserva ahora y paga en el local. Cuesta **$5.000 más**
  en los tres primeros menús, que es el recargo por no pagar por adelantado.
  **El de pequeños, que llegó después, cobra $3.000 más** ($6.000 / $9.000):
  el recargo dejó de ser parejo el 2026-11-02 y no es un error del sitio —los
  precios los pone la tienda y el sitio los copia—, pero conviene tenerlo
  presente al mirar la tabla.

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
precio real, $44.000, la diferencia son $5.000 parejos en esos tres. El de
pequeños, agregado después, cobra $3.000.

El cliente decidió el 2026-10-13 que en los precios **manda Shopify**, y por
eso **A Brasas abiertas subió de $60.000 a $70.000** en el sitio público,
que es lo que dice la tienda y lo que ya decía el landing B2B. Con eso
desaparece la diferencia de precio entre los dos entregables.

**Los tres montos coinciden hoy**: tienda, sitio público y landing.

### Los adultos van todos al mismo menú (2026-11-02)

Lo pidió el cliente: *"no vamos a dar la opción de que el cliente pueda
elegir de forma mezclada menú Tradiciones y menú A Brasas abiertas… por
defecto está el menú Tradiciones, pero le damos una casilla donde puede
subir todos los menús"*. Y con una condición: **"tiene que ser
garantizado"** que no se mezclen.

**La razón es del negocio y es buena**: A Brasas abiertas trae **bar
abierto**, y un bar abierto no se le puede servir a 2 de 5 personas. Por eso
esto **da vuelta la decisión del 2026-10-14** —que era justamente poder
mezclar— sin contradecirla: aquella resolvía un problema de interfaz, un
desplegable que dejaba fuera un pedido corriente; ésta dice que ese pedido
no existe. La mezcla no era un caso de uso, era un problema.

### Garantizado quiere decir que no hay dónde escribirlo

**Hay un solo contador de adultos.** No hay una validación que impida la
mezcla: **no hay un segundo contador** donde poner un número, así que
`lineas()` no tiene cómo emitir dos líneas de adulto. Una regla se puede
romper —un bug, una llamada directa, alguien tocando el DOM—; esto no, es la
forma del formulario.

| | Qué es |
|---|---|
| Fila 1 | **Los adultos**, con dos menús: `data-menu="tradiciones"` y `data-menu-alta="a_brasas_abiertas"`, cada uno con su variante en línea y en el local (los IDs, en `CONFIG.tiendas`) |
| La casilla | **Cambia cuál par usa esa fila**, no agrega un pedido |
| Fila 2 | **El menú de niños**, intacto |
| Fila 3 | **El menú de pequeños** (desde el 2026-11-02), igual de intacto |

- **Los menús de niños y de pequeños no suben, y tampoco por un `if`**: esas
  filas sencillamente no traen las variantes de upgrade, así que `parDe()`
  les devuelve su par de siempre esté la casilla como esté. Son uno solo
  cada uno y se suman a cualquiera de las dos experiencias — y un bar
  abierto no aplica a un niño de ocho años, menos a uno de dos.
- **El nombre y el precio de la fila los escribe el JS en cada pasada de
  `recalcular()`**, no solo al marcar la casilla: así no hay forma de que lo
  que se ve y lo que se va a cobrar se separen. Sin JavaScript el HTML ya
  trae escrito el caso por defecto, que es Tradiciones a $44.000.
- **`parDe()` elige primero el menú y después la modalidad, en ese orden.**
  Al revés —preguntando por "local" y después por el upgrade— quedan cuatro
  ramas y una combinación sin cubrir; así son dos preguntas independientes.

#### Los textos del JS tienen que decir lo mismo que el diccionario

El nombre de la fila lo escribe `reserva.js`, así que vive en su objeto
`TEXTOS` y no en `traducciones/`. **Eso es una trampa**: el diccionario ya
traducía `Menú A Brasas abiertas` como `A Brasas abiertas menu` en inglés, y
la primera versión del JS decía `Menu A Brasas abiertas` — la misma fila se
habría leído distinto según si el JS alcanzó a reescribirla. Hay que
copiarlos del diccionario, no redactarlos de nuevo.

Y como esa fila del HTML desapareció, la llave quedó sin usar y
`traducir.py` lo avisa en cada corrida. **Se sacó del diccionario** —es
verdad que ninguna página la usa— y en su lugar quedó un comentario
`_reserva_js` con la traducción exacta a la que el JS tiene que calzar. Un
aviso permanente enseña a ignorar los avisos.

#### Comprobado de punta a punta

Con tres adultos y dos niños, en español y en inglés, a 393px:

```
                fila                      precio        los dos botones
sin marcar      Menú Tradiciones          $44.000       $170.000 / $195.000
marcada         Menú A Brasas abiertas    $70.000       $248.000 / $273.000
```

Y lo que de verdad importa, las líneas que salen al carrito:

```
casilla sin marcar  → 50684108013785 ×3 (Tradiciones)  + 50684218081497 ×2 (niños)
casilla marcada     → 50684143173849 ×3 (Brasas)       + 50684218081497 ×2 (niños)
pagar en el local   → 50684108046553   /  50684143206617
```

**Una sola línea de adulto en los cuatro casos**, la variante correcta en
cada uno, y el menú de niños sin moverse. En inglés la fila dice
`Tradiciones menu` / `A Brasas abiertas menu` y los precios salen
`$44,000 CLP`, que es lo que el diccionario ya decía.

### El menú de pequeños (2026-11-02)

El cliente lo publicó en la tienda y pidió mostrarlo: **de 0 a 3 años,
$6.000 pagando en línea y $9.000 pagando en el local.** Con eso se cierra el
pendiente que este archivo arrastraba desde el 2026-10-22 — una familia con
una guagua no tenía cómo anotarla.

**Los datos salieron de la tienda, no de nadie**: la Storefront API devolvió
el producto, sus dos variantes y la descripción (*"Menú para niños de 0 a 3
años"*), y de ahí salieron el precio y el tramo de edad que dice el sitio.

- **No hizo falta tocar el JavaScript.** `reservas.html` ganó una tercera
  fila `[data-opcion]` con su par de variantes y nada más: el JS recorre las
  filas que encuentre. Y **no sube con la casilla**, por lo mismo que el de
  niños: esa fila no trae variantes de upgrade, así que `parDe()` le
  devuelve su par de siempre.
- **El recargo de pagar en el local son $3.000, no $5.000.** Los otros tres
  menús cobran $5.000 parejos. No rompe nada —el sitio no escribe ese número
  en ninguna parte, lo saca de restar los dos totales— pero conviene que el
  cliente sepa que lo dejó distinto, por si no fue a propósito.
- **En `experiencias.html` tiene su propio desplegable**, como los otros
  dos. **Nació como una línea suelta** —la tienda dice solo la edad, y
  escribirle un contenido habría sido publicar algo plausible y falso— y el
  cliente mandó el detalle el mismo día: *"150g de Pollo o Punta picana,
  arroz o papas fritas y ensalada"*. **Van dos bloques y no cuatro**: no
  lleva postre ni bebestible, porque no los nombró y el del menú de niños no
  sirve de molde.
- **En `index.html` se corrigió la frase del WhatsApp**, que decía "los niños
  de 4 a 12 años tienen su propio menú" y con el tramo nuevo se leía como
  que un menor de 4 paga como adulto.
- **El nombre quedó desalineado por unas horas y el cliente lo alineó.** El
  producto nació como *"Menú de pequeños"* mientras los otros tres son
  `Tradiciones`, `A Brasas Abiertas` y `Niños`, sin el prefijo; el panel
  empareja por nombre exacto (`canonizar()`), así que `desconocidos()` lo
  habría reportado en amarillo — que es justamente el aviso que ese mecanismo
  existe para dar. **Hoy se llama `Pequeños`** y calza con la lista de
  arranque del panel. Lo que falta es su fila en `/menus` con los dos
  precios, que es dato del cliente. **El sitio nunca se enteró**: manda IDs
  de variante, no nombres.

**Probado contra la tienda de verdad**, con tres adultos, dos niños y un
pequeño:

```
sin subir   $176.000 / $204.000     subido   $254.000 / $282.000
cartCreate  userErrors: []  ·  total 204000.0 CLP  ·  las tres líneas con _booking_date
            3 × Tradiciones/Solo reserva + 2 × Niños/Solo reserva + 1 × Pequeños/Solo reserva
```

Y en inglés la fila dice `Little ones' menu · Ages 0 to 3` con `$6,000 CLP`,
que es el formato que el diccionario ya usaba para los otros precios.

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
  usa el sitio nuevo hay que crearlo allá. **Creado el 2026-11-20**, solo en
  el canal Headless: ver "La tienda real, conectada". Hasta que eso exista, el cambio a
  producción no se puede hacer aunque se cambien el token y el dominio.
- **Los precios de producción hoy**: adultos $44.000, niños (4 a 12)
  $19.000. Coinciden con los del sitio.
- ~~**Hay un tercer tramo que el sitio nuevo no tiene: "Pequeños (0 a 3
  años)" a $6.000**~~ — **resuelto el 2026-11-02**: el cliente lo publicó
  también en la tienda de desarrollo, con el modelo de dos modalidades, y el
  sitio ya lo ofrece. Ver "El menú de pequeños". Era el caso de la familia
  con una guagua, que hasta ese día no tenía cómo anotarla.
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
  pasar la contraseña de la tienda. **Con la tienda real conectada**
  (2026-11-20) se comprueba en la compra de prueba de
  `brasas-sitio.vercel.app`, después del merge.
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

## Estilo y marca

- Estética: **de día** (la que abre desde el 2026-11-19) papel tibio y
  tarjetas blancas; **de noche**, fondo negro/casi negro. Las dos con
  sans-serif en mayúsculas con tracking (bold), acentos en dorado y
  fotografía real como protagonista. Ver "La vista diurna".
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
   **Solo en promociones**: el bloque de oferta (11% / 22 personas / sin
   costo de arriendo, **solo de lunes a viernes**) con los botones. El
   mínimo bajó de 44 a 22 y la condición de los días se agregó el
   2026-11-03, por pedido del cliente; la condición va bajo el rótulo del
   arriendo, en dorado (`.oferta-cond`).
   **El descuento se ve en las propias tarjetas de experiencias**
   (2026-11-04): cada una muestra el precio normal tachado, debajo el que
   queda con el 11% y una pastilla *−11%* en la foto. Tradiciones $43.610 ·
   Lo Pirque $48.950 · Brasas $66.750 · Sommelier $84.550. **Se calculan
   solas** desde `precios.json` (el precio del local menos
   `promociones.descuento`): ver "La lista de precios". Hubo un primer corte
   con cuatro etiquetas aparte, bajo la oferta, y **al cliente no le
   gustaron**: el precio con descuento va donde ya está el menú.
3. Contacto: botón WhatsApp (el formulario de email se sacó el 2026-11-21: no guardaba nada).
4. Footer.

Dentro de los paneles, en este orden. **En promociones el primero no se
pliega** (2026-11-04): las experiencias con su precio con descuento son lo
que la oferta vende, así que van siempre abiertas, sin el `+`.


| Panel | Qué trae |
|---|---|
| Las experiencias y el menú | Los cuatro niveles con flip 3D en CSS puro (checkbox + label), y el menú compartido en un `<details>` debajo |
| Date una vuelta por el lugar | La galería de 27 fotos, carrusel swipe con `scroll-snap`, sin JS |
| Las actividades | Show ecuestre · seis tarjetas de actividades del recinto · actividades adicionales (coaching con caballos, taller de queso, karting, taller de asado) |
| El recinto y los extras | Desayuno de campo y once campesina · precio del recinto ($2.500.000 fin de semana / $1.500.000 días de semana, **IVA incluido**, solo arriendo, sin catering) · "Eventos a medida" |
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
- **Menú de pequeños**: $6.000, de 0 a 3 años. Se suma igual que el de
  niños. **150 g de pollo o punta picana, arroz o papas fritas, y
  ensalada** — lo dio el cliente el 2026-11-02, porque la descripción del
  producto en Shopify dice solo la edad. **No lleva postre ni bebestible**,
  al revés que el de niños: no se inventan, el cliente no los mencionó.
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
- ~~El landing ofrece **cuatro** experiencias (Tradiciones $49.000 / Lo Pirque
  $55.000 / Brasas $75.000 / Sommelier $95.000).~~ **Desde el 2026-11-18 son
  tres y + IVA**: Lo Pirque $50.000, Brasas $70.000 y Sommelier $90.000, en
  los tres landings de empresa. Ver "Landing dossier y los precios de
  empresa". El sitio público ofrece
  **dos** (Tradiciones $44.000 / A Brasas abiertas $70.000). Ver arriba.
- **Los montos dejaron de coincidir entre los dos entregables** (2026-10-15).
  El landing subió $5.000 en los cuatro niveles y ahora muestra el precio de
  **pagar en el local**, que es el mismo que el sitio público pone en la cara
  de atrás de sus tarjetas. El sitio público muestra al frente el de **pagar
  por adelantado**. No es una inconsistencia: son las dos modalidades.

### El precio del recinto pasó a ser con IVA incluido (2026-11-01)

> **Revertido el 2026-11-18**: el arriendo volvió a ser **+ IVA**, en todo el
> sitio. Ver "Landing dossier y los precios de empresa". Lo de abajo queda
> como historia de por qué estuvo IVA incluido.

Salió al desglosar el IVA en los presupuestos: **el recinto era el único
precio del sitio anunciado "+ IVA"**, mientras las experiencias dicen "IVA
incluido". Con el presupuesto tratando todo como IVA incluido, cotizar el
arriendo escribiendo 2.500.000 habría significado una cosa en el documento y
otra en la página — $475.000 de diferencia.

Lo cerró el cliente: *"cámbialo en la página que 2,5 millones incluyendo
IVA… y ahí veamos cuando se negocia, si hay que subir"*. **El precio
publicado es el total**, y lo que haya que ajustar se conversa en la
negociación, que es donde ya se decide todo lo demás de un evento.

- **Cambiaron los dos montos, no solo el de 2,5.** El de días de semana está
  en el mismo bloque y es el mismo producto: dejar uno "+ IVA" al lado del
  otro habría repuesto justo la inconsistencia que esto viene a sacar.
- **Va en tres páginas**: `eventos.html`, `landing-afiliados.html` y
  `promociones.html`.
- **El "IVA incluido" se dice una vez para el bloque**, en la bajada que ya
  decía "Valores sin catering", y no dos veces en letra grande al lado de
  cada monto. Mismo criterio que el pie del presupuesto: el desglose es del
  total, no de cada línea.
- **Queda un "+ IVA" en el sitio, y es a propósito**: el desayuno de campo y
  la once campesina, a **$8.000 + IVA por persona**. Ese precio no se tocó
  porque el cliente habló del recinto, y cambiarlo sería bajarlo un 19% por
  cuenta propia. Conviene preguntarle, porque hoy es lo único del sitio que
  se anuncia así.
- **Ojo con los diccionarios**: al sacarle el "+ IVA" al monto, la llave
  `"$2.500.000 + IVA"` dejó de usarse y hubo que agregar `"$2.500.000"` a
  secas. Un precio a secas **sí** pasa por el diccionario —ahí sale el `CLP`
  que necesita el inglés—; lo que hace `INTACTO` es decidir si **faltar** es
  un error, no saltarse la traducción. Sin esa llave, `en/` habría mostrado
  `$2.500.000`, que en inglés se lee como dos dólares y medio.

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
  como rasgo distintivo. El sitio tiene fondo claro de día y negro de noche,
  así que hace falta un SVG recoloreable que sirva en los dos. Hoy la marca se compone con tipografía.
- ~~**Una dirección propia para el panel** (`panel.brasasdelopirque.cl`)~~
  — **hecho el 2026-11-20**, antes del lanzamiento y sin tocar el sitio
  viejo: ver "El dominio en Cloudflare". Lo de abajo queda como el porqué.
  **Se dejaba para la mudanza del dominio** (lo decidió el cliente el
  2026-11-19): `brasasdelopirque.cl` y el sitio viejo están alojados hoy en
  Shopify, y se van a mudar a otro alojamiento. Ese es el momento de hacer
  las dos cosas juntas —publicar ahí el sitio nuevo y agregar el
  subdominio del panel—, porque el DNS va a cambiar de lugar y hacerlo antes
  sería configurarlo dos veces. Tres cosas para ese día:
  - **Lo que se muda es el alojamiento, no la tienda.** El cobro de las
    reservas sigue pasando por el checkout de Shopify, así que la tienda
    sigue activa aunque el sitio se publique en otra parte.
  - **`landing-pirque-alpha.vercel.app` se queda**, aunque se agregue la
    dirección nueva: viaja en los links de cotizaciones y contratos ya
    mandados, en `reserva.js` y en los webhooks de Shopify. Ver
    `migracion-team/README.md`, paso 4.
  - El dominio nuevo del panel se agrega también a la red del entorno de
    Claude Code, y si el sitio cambia de dominio, la constante `SITIO` de
    `tools/traducir.py`.

## Decisiones abiertas

- ~~¿Se mantiene el menú de "Pequeños (0 a 3 años)" a $6.000?~~ —
  **resuelto el 2026-11-02**: sí. El cliente lo publicó en la tienda de
  desarrollo con sus dos modalidades y pidió mostrarlo en el sitio. Ver "El
  menú de pequeños".
- ~~¿El arriendo del recinto también es con IVA incluido?~~ — **resuelto el
  2026-11-01**: sí. El landing lo anunciaba como "$2.500.000 + IVA" al revés
  que todo lo demás, y el cliente lo cerró en una frase: *"cámbialo en la
  página que 2,5 millones incluyendo IVA… y ahí veamos cuando se negocia, si
  hay que subir"*. O sea que el precio publicado es el total. Ver "El precio
  del recinto pasó a ser con IVA incluido".
- **El nombre del negocio no calza.** Google Maps lo lista como "Lo Pirque
  Restaurant" y el email es `@lopirque.cl`, pero el sitio se llama "Brasas de
  Lo Pirque" y el dominio es `brasasdelopirque.cl`. Si alguien busca la marca
  del sitio en Maps, puede no encontrarla. El cliente lo está aclarando.
- ~~`contacto.html` podría renombrarse~~ — **hecho el 2026-09-16**: la página
  es `reservas.html`. Queda un `contacto.html` de una pantalla que redirige
  con `<meta http-equiv="refresh">`, para no romper enlaces ya compartidos.
  Se puede borrar cuando deje de llegar tráfico por ahí.

## Pendientes de contenido

- ~~**Plataforma de newsletter**~~ — **se sacaron los formularios el
  2026-11-21** (lo decidió el cliente antes del lanzamiento): estaban en
  `reservas.html`, el dossier, socios y promociones, y descartaban el correo
  al enviar —quien lo dejaba creía que quedó anotado—. Se borraron con su
  CSS (`.newsletter-row`, y en el sitio también `.contact-*`, que solo usaba
  esa sección) y sus siete llaves de los diccionarios. En los landings la
  tarjeta de WhatsApp quedó sola, centrada (`.contact-solo`, 684px). Cuando
  haya dónde guardar los correos (Formspree, Google Forms o un endpoint
  propio), se vuelven a poner.
- **Política de privacidad y condiciones de reserva** — no existen en el
  sitio. Son decisiones del negocio (y conviene que las vea un abogado): no
  se redactan acá. Anotado como recordatorio en la guía *Traspaso a
  producción* el 2026-11-21.
- **Fotos de cabalgatas y de la cancha de beach tenis** — son las dos
  únicas actividades que siguen con icono en vez de foto. Castillo
  inflable, pintacaritas y ping-pong/tacataca **ya tienen la suya**: este
  pendiente las seguía listando por inercia desde que se levantó la
  restricción de imagen.
- **Copy nuevo sin revisar por el cliente** — los titulares y bajadas del
  sitio público los redactó Claude, no vienen del cliente. El contenido
  factual (precios, menú, actividades) sí es textual del landing.

## Previsualizar el sitio público

**Publicado en Vercel**, proyecto `brasas-sitio`, en
`https://brasas-sitio.vercel.app` (desde el 2026-11-19): cada merge a
`main` lo publica y cada PR trae su versión de prueba. Ver "Lo que Vercel
publica del sitio". **También** con GitHub Pages desde `main`, en
`https://ayc-y-blp.github.io/aycyblp/` (desde el 2026-11-19; antes
`yodakoba.github.io/Landing-Pirque/`, que **no redirige**: GitHub no lleva
la dirección de Pages cuando un repo cambia de dueño). Cada merge a `main`
lo vuelve a publicar en un par de minutos. Es para revisar, no el sitio de
los clientes: `brasasdelopirque.cl` sigue sirviendo el sitio viejo.

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

## Migración a la cuenta Team (2026-11-10)

El proyecto pasa de la cuenta personal de Claude a una cuenta **Team**. El
plan paso a paso, la lista de variables de Vercel, el entorno de Claude Code
a recrear y un script que comprueba que todo quedó conectado viven en
**`migracion-team/`**. Lo corto: el código, la planilla, la cuenta de
servicio y Shopify **no se mueven**; lo que cambia es desde dónde trabaja
Claude, y opcionalmente de quién son el proyecto de Vercel y el repo.

**Estado al 2026-11-19**: el repo ya es de la organización, como
**`ayc-y-blp/aycyblp`** (antes `Yodakoba/Landing-Pirque`; los enlaces viejos
redirigen). La primera sesión en la cuenta Team corrió
`migracion-team/verificar.sh` con 14 de 14 bien, y el conector de Drive
encuentra `BRASAS fotos`. **El panel pasó al equipo de Vercel "Ayc y Blp"**,
con plan pagado, el mismo día y con la misma URL; `main` despliega a
producción desde ahí y quedó protegida en GitHub. **Las variables del panel
quedaron ordenadas ese día** (Fase 4 de la guía): las versiones de prueba
usan una copia de la planilla, las secretas son *Sensitive* y están en la
bóveda, y el webhook de Shopify se verifica con el secreto de firma de
Notificaciones, no con el Client secret de la app. El detalle, en
`migracion-team/variables-vercel.md`. Lo que queda está al inicio de
`migracion-team/README.md`, y ahí mismo, en el paso 4, la trampa que dejó
a Vercel sin construir después de transferir el repo.

## Git

Repo: **`ayc-y-blp/aycyblp`**. Rama por defecto: `main`. **La rama de
trabajo la asigna cada sesión de Claude Code** (`claude/…`), así que no se
anota acá: la de este archivo dejó de servir al cambiar de cuenta.

**`main` está protegida** (2026-11-19): no se puede borrar ni reescribir su
historia (*Restrict deletions* y *Block force pushes*). **A propósito no
pide aprobaciones ni chequeos obligatorios.** Con aprobaciones, cada PR
quedaría esperando al cliente y se rompe el merge automático de más abajo;
con el chequeo de Vercel obligatorio, un Vercel desconectado —como pasó ese
mismo día, ver `migracion-team/README.md`— bloquearía todos los merges.
Esperar a Vercel antes de mergear sigue siendo regla de trabajo, no candado.

**El repo es público, a propósito** (lo decidió el cliente el 2026-11-19,
entre tres opciones). Las razones:

- **No guarda claves**: viven en Vercel y en la bóveda.
- **El sitio publica solo lo público**, con su lista en Vercel (ver "Lo que
  Vercel publica del sitio").
- **Pasarlo a privado tiene costos.** En el plan gratis de GitHub, la
  protección de `main` solo se aplica a repos públicos: o se pierde, o se
  paga GitHub Team (unos US$4 por persona al mes). Además, con el repo
  privado Vercel solo despliega commits de miembros de su equipo, así que
  habría que cambiar el autor de los commits de Claude. Y GitHub Pages se
  apagaría.

**La consecuencia que hay que tener presente: todo lo que se escribe en el
repo lo puede leer cualquiera**, `CLAUDE.md` incluido. Nunca una clave, un
dato de un cliente ni algo que el negocio no quiera mostrar. Si un día se
decide pasar a privado, el orden es: primero el autor de los commits de
Claude, probado con el repo todavía público; después decidir lo de GitHub
Team; recién ahí cambiar la visibilidad.

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

**Se mergea solo, en cuanto Vercel da `success`** (decidido el 2026-11-11;
antes era caso a caso). Se abre el PR, se espera a que la construcción de
Vercel diga `success` y se mergea, salvo que el cliente diga lo contrario
para ese PR. "Propone antes de aplicar" no cambia: la revisión ocurre al
proponer el cambio. Si el merge se bloquea, se avisa y el PR queda abierto.

**Desde el lanzamiento eso vale solo para los cambios chicos** (regla del
cliente, 2026-11-20, pensando en después de salir a producción: *"necesito
hacer un cambio, pero tiene que ser en preview"*). Producción pasa a ser
gente de verdad pagando, así que hay dos caminos:

| Camino | Qué cambios | Cómo se mergea |
|---|---|---|
| **Chico** | Textos, ayudas, colores, lo que se ve y no mueve nada | Solo, con los dos chequeos de Vercel en `success`, como hasta ahora, con las capturas |
| **Con prueba** | Plata (pagos, cobros, boletas, comisiones), la reserva o el pago en Shopify, el cupo, columnas nuevas en la planilla, permisos | El PR queda **abierto sin mergear**; se le manda al cliente el link de la versión de prueba y se mergea cuando diga *"mergea"* |

- **Cada PR dice en su descripción en qué camino va**, y el mensaje al
  cliente también. En la duda, *con prueba*.
- **"Déjalo en preview"** de parte del cliente pone ese PR en *con prueba*,
  aunque sea chico.
- **La versión de prueba no cobra ni toca lo real**: el sitio de un PR va
  contra la tienda de desarrollo (ver "Dos tiendas") y el panel contra la
  planilla "Pruebas" y, desde la separación de las variables de Shopify, la
  tienda de desarrollo. El panel de prueba está protegido por Vercel: se
  abre con la sesión de Vercel del equipo.
- **Un arreglo urgente de algo roto en producción** va directo, avisando en
  el mismo momento; si la ayuda queda atrás, va en el PR siguiente (la
  excepción de "La ayuda siempre al día").
- **Antes del lanzamiento** —con el sitio todavía sin el dominio y la tienda
  real sin conectar— sigue el merge automático para todo. Si no se sabe si
  el lanzamiento ya pasó, se trata como que sí.

**Antes de mergear se espera a Vercel** (2026-11-11). Cada rama que se
empuja dispara una construcción de prueba en Vercel, que GitHub muestra como
un chequeo; mientras corre, el PR sale **"unstable"**. Mergear en ese
momento no rompe nada si después termina bien —así pasó con los PRs 141,
143 y 144—, pero es mergear sin saberlo. Se espera a que el estado del commit
diga `success` (`gh api repos/<repo>/commits/<sha>/status`) y, si la
construcción falla, no se mergea: se avisa. **Desde el 2026-11-19 son dos
chequeos**, uno por proyecto: `Vercel – landing-pirque` (el panel) y
`Vercel – brasas-sitio` (el sitio). Se espera a que estén **los dos** en
`success`; uno solo en verde no basta, aunque el PR toque solo una mitad.

Esto **no cambia** la regla de proponer antes de aplicar: los cambios al
contenido se siguen conversando antes de hacerlos. Lo que se abre solo es el
PR de lo que ya se acordó.

Ojo con el orden: el cliente suele mergear el PR abierto antes de que llegue
el commit siguiente. Si el PR de esta rama ya está mergeado, lo que quede
pendiente va rebasado sobre el `main` nuevo y en un PR propio —
`git fetch origin main && git rebase origin/main`, y empujar con
`--force-with-lease`. Nunca apiles commits nuevos sobre historia ya
mergeada.
