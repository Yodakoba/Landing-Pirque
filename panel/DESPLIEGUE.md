# Desplegar el panel

El panel es una aplicación Next.js. **No se copia ni se pega en ninguna
parte**: se ejecuta en un servidor y le habla a la planilla por la API de
Google Sheets.

Esta guía usa **Vercel**, que es de los creadores de Next.js y despliega
desde GitHub con cada push.

> **Ojo con el plan.** El plan gratuito de Vercel (Hobby) es **solo para uso
> personal no comercial**, y un panel de administración de un restaurante es
> uso comercial. El plan Pro ronda los US$20 al mes por asiento. Conviene
> confirmarlo en los términos de vercel.com antes de que el panel entre en
> uso diario: es una cuenta que alguien paga todos los meses, y esa decisión
> es del cliente, no técnica. La guía decía antes que el plan gratuito
> alcanzaba; era un dato equivocado.

---

## Dónde vive cada cuenta

Anotado porque es lo primero que no se encuentra cuando hay que arreglar algo
meses después, y porque decide qué hay que rehacer si el proyecto cambia de
manos.

| Pieza | En qué cuenta | Al traspasar |
|---|---|---|
| La planilla y el Apps Script | la del cliente | nada que mover |
| El proyecto de Google Cloud y la cuenta de servicio | **la del cliente** (decidido el 2026-10-16) | nada que mover |
| Shopify y el dominio | la del cliente | nada que mover |
| El repositorio de GitHub | la de quien desarrolla | **Transfer ownership**, que se lleva historia, PRs y discusiones, y deja redirecciones. Crear un repo nuevo y empujarle el código **no** es lo mismo: pierde los PRs, que en este proyecto son el registro de por qué las cosas están como están. |
| El proyecto de Vercel | por definir | los proyectos se transfieren entre cuentas; ver la nota del plan más arriba |

Que el proyecto de Google Cloud esté en la cuenta del cliente es a propósito:
deja al robot donde ya viven la planilla y el Apps Script, así que el panel no
depende de que exista la cuenta personal de quien lo construyó. La contra a
asumir: **rotar la clave del robot necesita entrar a esa cuenta**, así que
quien mantenga el panel tiene que tener acceso al proyecto de Cloud, o pedirlo
cuando haga falta.

---

## Antes de empezar

Dos cosas, en este orden. La primera es la que más tiempo toma.

### 1. La cuenta de servicio de Google

Es la identidad con la que el panel entra a la planilla. No es tu cuenta: es
un "robot" al que le das permiso.

1. Entra a [Google Cloud Console](https://console.cloud.google.com) y crea un
   proyecto (o usa uno que tengas).
2. **APIs y servicios → Biblioteca** → busca **Google Sheets API** →
   **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de
   servicio**. Ponle un nombre, por ejemplo `panel-reservas`. Los pasos de
   permisos opcionales se pueden saltar.
4. Entra a la cuenta recién creada → pestaña **Claves** → **Agregar clave →
   Crear clave nueva → JSON**. Se descarga un archivo.
5. **Abre ese JSON.** Necesitas dos valores de adentro:
   - `client_email` — algo como `panel-reservas@tu-proyecto.iam.gserviceaccount.com`
   - `private_key` — un bloque largo que empieza en `-----BEGIN PRIVATE KEY-----`

**Guarda ese JSON en un lugar seguro y no lo subas al repositorio.** Quien lo
tenga puede entrar a tu planilla.

### 2. Compartir la planilla

En la planilla: **Compartir** → pega el `client_email` del paso anterior →
dale permiso de **Editor** → Enviar.

**Este es el paso que más se olvida.** Sin él, la API responde 403 aunque
todas las credenciales estén bien puestas.

---

## El despliegue

### 1. Crear el proyecto en Vercel

1. Entra a [vercel.com](https://vercel.com) y conéctate con GitHub.
2. **Add New → Project** → elige el repositorio `Landing-Pirque`.
3. **Acá viene lo importante:** en *Configure Project*, abre **Root
   Directory** y elige **`panel`**.

   Si lo dejas en la raíz, Vercel va a intentar construir el sitio estático y
   va a fallar sin decir por qué. El panel vive en `panel/`, no en la raíz.

4. *Framework Preset* se detecta solo como **Next.js**. Déjalo.

### 2. Las variables de entorno

En la misma pantalla, **Environment Variables**. Son cinco:

| Variable | De dónde sale |
|---|---|
| `GOOGLE_SHEET_ID` | De la URL de la planilla, el tramo entre `/d/` y `/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | El `client_email` del JSON |
| `GOOGLE_PRIVATE_KEY` | El `private_key` del JSON, **completo** |
| `PANEL_USUARIO` | El que tú elijas, por ejemplo `brasas` |
| `PANEL_CLAVE` | **Una clave larga y que no uses en otra parte** |

Sobre `GOOGLE_PRIVATE_KEY`: pégala entera, **incluidas** las líneas
`-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`. El campo de
Vercel acepta varias líneas. Si tu copia trae los saltos como `\n` literales,
también funciona: el código deshace las dos formas.

### 3. Deploy

Dale a **Deploy** y espera un par de minutos. Vercel te da una URL del tipo
`brasas-panel.vercel.app`.

---

## La primera vez que entres

1. El navegador te va a pedir **usuario y clave**: los de `PANEL_USUARIO` y
   `PANEL_CLAVE`.
2. **Antes que nada, abre `/api/diagnostico`.** Te dice si las dos hojas
   existen, qué encabezado tienen y **qué columnas no calzaron**.

Si algo no calza, lo arreglas en **un solo archivo**: `src/lib/columnas.ts`.

### Qué significa cada error

| Lo que ves | Qué pasó |
|---|---|
| 503 «El panel no tiene PANEL_USUARIO y PANEL_CLAVE» | Faltan esas variables. El panel se cierra en vez de quedar abierto. |
| Error con `403` o `permission` | No compartiste la planilla con el `client_email`. |
| Error con `Unable to parse range` | El nombre de una hoja no coincide. Son `Reservas` y `Fechas Hábiles`, con tilde. |
| Error con `invalid_grant` o `DECODER` | La clave privada quedó mal pegada. Tiene que ir completa, con sus líneas BEGIN y END. |
| El panel abre pero todo en cero | Abre `/api/diagnostico`: casi seguro es un encabezado que no calza. |

---

## Shopify: webhook más una tarea diaria

Las reservas entran por dos caminos que se respaldan entre ellos.

**El webhook** (`/api/shopify/webhook`) las anota en cuanto ocurren. Es
público por fuerza —Shopify no puede autenticarse con la contraseña del
panel— y lo único que lo protege es la **firma HMAC**, que se verifica con
el *Client secret* de la app. Sin `SHOPIFY_WEBHOOK_SECRET` configurado la
ruta rechaza todo: se cierra, no se abre.

**La tarea diaria** (`/api/shopify/sincronizar`) le pregunta a Shopify por
los pedidos de los últimos diez días y anota lo que falte. No reemplaza al
webhook, lo respalda: recupera lo que se haya perdido por una caída, un
despliegue a mitad de camino o un webhook que nunca se creó. Está en
`vercel.json`.

**Por qué las dos cosas y no solo consultar**, que es lo que hacía el Apps
Script: en Vercel el plan gratuito **solo permite tareas una vez al día**,
así que consultar cada 5 minutos necesitaría el plan Pro. Y **por qué las
dos y no solo el webhook**: un webhook perdido no se recupera nunca.

**Por qué ahora sí se puede usar un webhook**, cuando el Apps Script no
podía: allá los Web Apps no dan acceso a las cabeceras de la petición, así
que verificar la firma era imposible y cualquiera que descubriera la URL
podía inventar reservas. En Vercel hay cabeceras. El impedimento era de la
plataforma, no de la idea.

### Las variables de Shopify

| Variable | De dónde sale |
|---|---|
| `SHOPIFY_DOMINIO` | el `*.myshopify.com` de la tienda |
| `SHOPIFY_ADMIN_TOKEN` | el token de la app, empieza en `shpat_` |
| `SHOPIFY_VERSION` | `2026-10` (estable al 2026-10-20, soportada hasta oct. 2027) |
| `SHOPIFY_WEBHOOK_SECRET` | el **Client secret** de la app, que es lo que firma |
| `CRON_SECRET` | una cadena larga al azar, para la tarea programada |
| `GOOGLE_CALENDAR_ID` | el calendario donde van los eventos (opcional) |

**El token de Admin API no se guarda en el repositorio ni viaja por una
conversación.** Va del admin de Shopify al campo de Vercel y a ningún otro
lugar: da acceso a pedidos y clientes. Es lo contrario del token de
Storefront que el sitio lleva en un archivo público, que solo lee catálogo.

Si el token existente se perdió, **antes de reinstalar la app** conviene
mirar las propiedades del script del Apps Script viejo (Configuración del
proyecto → Propiedades del script): `SHOPIFY_ADMIN_TOKEN` está ahí, visible.
Reinstalar la app invalida el token actual, y el Apps Script lo está usando.

### Crear los webhooks

Tres tópicos —`orders/create`, `orders/updated` y `orders/cancelled`—
apuntando a `https://<la-url>/api/shopify/webhook`. Basta `read_orders`:
suscribirse a los webhooks de un recurso necesita su permiso de LECTURA, no
de escritura. **No conviene pedir `write_orders`**: el panel solo lee, y un
token que puede editar o cancelar pedidos reales es mucho más alcance del
que hace falta.

## Los parámetros del negocio van en la planilla, no en Vercel

El umbral de "quedan pocos lugares", el cupo normal de un día, la hora de
apertura, qué días se abre, cuántos días adelante se ofrecen y los cortes del
semáforo viven en una pestaña **`Config`** de la planilla, con filas
`Clave` / `Valor`. Se editan desde **/config** en el panel.

**Por qué ahí y no en una variable de entorno:** cambiar un 10 por un 8 no
puede obligar a redesplegar. El backend de Apps Script ya lo resolvía así y
estos son los mismos parámetros, no unos nuevos.

**No hay que crear la pestaña a mano.** Si no existe, el panel usa los
valores de siempre y la crea la primera vez que se guarda algo.

Lo escrito ahí se valida antes de usarse, y eso es visible: un cupo en cero
o un corte amarillo por encima del rojo se ignoran y vuelven al valor de
siempre, porque un parámetro imposible no puede dejar el panel sin dibujar.
Si guardas un cero y ves que vuelve a 60, es eso.

Lo único que **no** se cambia desde el panel es la clave de acceso: vive en
Vercel. Guardarla en la planilla sería dejar la contraseña del panel en un
documento compartido.

## Los accesos: cuentas, roles y bitácora

Desde el 2026-10-21 el panel **pide entrar en su propia pantalla**, no en la
ventanita del navegador, y tiene botón de **Salir**. La sesión dura 7 días.

**Variables de entorno en Vercel:**

| Variable | Para qué |
|---|---|
| `PANEL_USUARIO` / `PANEL_CLAVE` | El administrador. **Son las de siempre**, no hay que cambiarlas. Es además la puerta de emergencia: funciona aunque la planilla no responda. |
| `PANEL_ENCARGADO_USUARIO` / `PANEL_ENCARGADO_CLAVE` | Opcionales. La clave compartida de encargado, de antes de que hubiera cuentas. |
| `SESION_SECRETO` | Opcional. Con qué se firman las sesiones. Si no está, se deriva de `PANEL_CLAVE`. |

**Ojo con dos cosas:**

- **Cambiar `PANEL_CLAVE` cierra todas las sesiones abiertas.** Es la forma
  de echar a todo el mundo de una vez, y sorprende si no se espera.
- **La clave compartida de encargado aparece en la bitácora como "encargado
  (clave compartida)"**, a propósito: no identifica a nadie. Si quieres saber
  quién hizo qué, crea cuentas.

### Las cuentas, en **/usuarios**

Una fila por persona: nombre, usuario, rol (`admin` o `encargado`), activo y
contraseña. **La contraseña se pone aparte de guardar la lista**, para que
guardar un cambio de nombre no pueda dejar a nadie sin poder entrar.

En la planilla queda una pestaña `Usuarios`, y la columna de la clave guarda
**una huella scrypt, no la contraseña**: ni abriéndola se puede leer. Si
alguien la pierde, se pone una nueva.

Mínimo **12 caracteres**. Largo antes que raro: tres o cuatro palabras
pegadas aguantan más que ocho caracteres con símbolos y se pueden dictar por
teléfono.

**Para sacar a alguien**: desmarca *Activo* (mejor que quitarlo — sus líneas
de la bitácora siguen diciendo quién fue). Su sesión abierta sigue viva hasta
que caduque; para cortarla ya mismo, cambia `PANEL_CLAVE` en Vercel.

### La bitácora, en **/bitacora**

Qué se hizo, quién lo hizo y cuándo, en hora de Chile. La pestaña `Bitácora`
se crea sola con la primera acción. La pantalla muestra las últimas 200; para
ir más atrás, el buscador de la planilla.

**Queda el rastro, no el valor anterior**: sirve para saber a quién
preguntarle, no para deshacer un cambio.

### Los trabajadores no usan nada de esto

Entran por `/mi/<token>`, un link personal que se crea en **/equipo**,
columna *Link personal*, y se manda por WhatsApp. Ahí ven sus turnos y nada
más.

Para sacarle el acceso a alguien hay dos formas, y sirven para cosas
distintas: **Quitar** el link (se fue del equipo) o **Renovar**lo (perdió el
teléfono y hay que invalidar el anterior). Desmarcar *Activo* también le
cierra la puerta.

## Pasar lista y las cuentas del día

En la página de un día, **Pasar lista**: quién vino, horas extra, ajustes con
su motivo, y el total. **Un turno sin pasar lista no suma nada** — planificar
no es pagar.

Los montos se **congelan en el turno** al guardarlos. Si después le subes el
sueldo a alguien, sus turnos viejos no cambian: si cambiaran, las cuentas de
meses ya cerrados dejarían de cuadrar.

En **/equipo**, cada persona tiene su **modalidad**:

- **Por turno** — cobra por jornada trabajada; cada turno suma al costo del día.
- **Contratado** — tiene sueldo, y ese sueldo no sale de acá. Sus turnos no
  suman jornada; sí se le anotan horas extra y ajustes.

La celda en blanco cuenta como *Por turno*.

### La planilla semanal

En el calendario, junto al rango de cada semana: **Enviar planilla semanal**
copia un link para mandar al grupo. Muestra quién trabaja cada día en qué
puesto, la hora de apertura y los números del día — **sin plata, sin menús y
sin datos de clientes**, porque es un link que va a circular.

La primera vez el botón crea la llave. Para invalidar todas las copias que
anden dando vueltas, hay un **Renovar** (y entonces hay que volver a mandar
el link a quien sí trabaja).

Lo que un trabajador necesita de su propio día —los menús que hay que
preparar y lo que gana— está en **su link personal**, que es de una sola
persona.

## El informe del equipo: la planilla de pagos

En **/informe**, solo administrador. Eliges **por semana** o **por mes**, y
muestra por persona: días trabajados, jornadas, horas extra, ajustes y total.

**Descargar planilla** baja un CSV con el **detalle día por día** —incluido
el motivo de cada ajuste—, que es lo que sirve para entregarle a quien lleva
los pagos. Los totales se miran en pantalla; el detalle es lo que se pasa.

Si quedan turnos **sin pasar lista**, el informe lo avisa arriba: esos no
suman, así que el total está incompleto hasta que se cierren.

## El equipo: tres pestañas más

`Puestos`, `Trabajadores` y `Turnos`. Se editan en **/equipo**, salvo los
turnos, que se asignan desde el calendario: en cada día, **Equipo → Planificar
equipo**.

**No hay que crear ninguna a mano.** Si no existen, el panel usa los siete
puestos por defecto y una lista de trabajadores vacía, y las crea al guardar.

La columna **`Uno cada N personas`** de `Puestos` es la que permite que el
panel diga si el equipo alcanza: con 10 en garzón, un día de 44 personas
sugiere 5. **En blanco el panel no opina**, que es lo correcto mientras el
número no lo haya puesto el cliente.

`Turnos` busca sus columnas **por nombre de encabezado**, así que se le
pueden agregar columnas propias sin romper nada. Si alguna no calza,
`/api/diagnostico` lo dice columna por columna, igual que con las otras
pestañas.

## Los menús: un solo nombre, el mismo en los tres lados

Viven en la pestaña **`Menús`** de la planilla y se editan en **/menus**:
el nombre y los dos precios.

**Los precios solo rigen para las reservas hechas a mano.** Lo que entra por
Shopify trae su propio total y ese manda, porque la tienda es la que cobra.
Por eso esto no contradice la regla de que los precios viven en Shopify: en
una reserva a mano **no hay pedido de Shopify de dónde sacarlo**, así que no
son dos verdades, es la única que hay.

Son **dos precios** porque el negocio tiene dos modalidades: pagar por
adelantado sale más barato que pagar en el local. El formulario manual elige
según la modalidad, propone el total y **deja corregirlo encima**, que es
justo lo que hace falta cuando un grupo tiene un acuerdo distinto.

**Nacen en blanco a propósito.** Los montos existen escritos en el proyecto
pero están incompletos —hay precio en línea para dos de los cinco menús— y
son de la tienda de desarrollo. Sembrar una tabla a medias es peor que
dejarla vacía: la mitad correcta hace confiar en la otra mitad.

**El nombre tiene que ser exactamente el mismo en Shopify, en el sitio y en
esta lista.** No hay equivalencias. Se descartó un sistema de alias el
2026-10-21: una lista de equivalencias es tolerante, pero también permite
que los nombres se desalineen sin que nadie se entere, y mantenerla es
trabajo.

**Lo que reemplaza al alias es un aviso.** `/menus` compara lo que Shopify
está vendiendo contra la lista y lo que no calza sale en amarillo. Así la
garantía de que los nombres coinciden deja de ser una promesa y pasa a ser
una comprobación: el día que alguien renombre un producto en la tienda, el
panel lo dice.

Lo único que se perdona son **mayúsculas, tildes y espacios de sobra**. Eso
no es un segundo nombre, es el mismo escrito con descuido.

### La contra a asumir, que no es chica

**Shopify guarda el título del producto DENTRO de cada pedido** en el momento
de la compra, así que renombrar no reescribe los pedidos viejos. Tras un
rename, las reservas anteriores se cuentan aparte con su nombre antiguo, y
arreglarlo es **editar esas filas en la planilla a mano**.

Por eso conviene **renombrar temprano**, y por eso el aviso importa: hace
visible el momento exacto en que pasa, en vez de que se descubra cuando los
totales del día no cuadren.

Los nombres de hoy van **sin el prefijo "Menú"** — `Tradiciones`,
`Lo Pirque`, `A Brasas abiertas`, `Sommelier`, `Niños` — que es como se
llaman en el sitio público y en el landing.

**Un menú que no está en la lista no se descarta ni se fuerza al más
parecido**: aparece tal cual y se reporta. Inventar a cuál se parece sería
peor que no saber.

## Google Calendar: un evento por reserva

Lo hacía el Apps Script y era lo último que le quedaba. Se portó al panel el
2026-10-21.

Cada reserva crea un evento del horario del día, con **cuántos son, quién y
si falta cobrarles en el título**. Eso no es capricho: en el celular se ve
el título del evento y nada más, así que ahí va lo que hay que tener en la
mano cuando llega la gente. El menú, el monto y el teléfono van en la
descripción.

### Lo que hay que hacer una vez

1. **Compartir el calendario con la cuenta de servicio**, la misma que lee
   la planilla, con permiso de **hacer cambios en los eventos**. Es el mismo
   trámite que con la planilla, y el mismo error silencioso si se olvida:
   Google responde 403 y en el panel no se ve nada, solo en el log.
2. Poner **`GOOGLE_CALENDAR_ID`** en Vercel. Está en la configuración del
   calendario, en "Integrar calendario"; en el principal suele ser el correo
   de la cuenta.

**Sin esa variable el panel simplemente no escribe eventos**, y todo lo
demás funciona igual.

### Dos decisiones que evitan problemas conocidos

**El id del evento sale del id del pedido**, así que no hay que guardarlo en
la planilla. Shopify manda `orders/updated` cada vez que un pedido cambia:
sin un id estable, cada aviso crearía un evento nuevo y el calendario se
llenaría de duplicados. Como Google deja elegir el id al crear, el primero
crea y los demás actualizan.

**Si falla el calendario, la reserva se guarda igual.** La planilla es la
fuente de verdad y el evento es una comodidad; un error de Google se
registra y se sigue. Si el webhook devolviera error por esto, Shopify lo
reintentaría para siempre.

Una reserva cancelada o reembolsada **borra su evento**: una cancelada que
sigue en el calendario es peor que ninguna, porque alguien cuenta sillas
mirándolo.

## Los tres estados de un día

Se editan en el calendario del panel, apretando **Editar** en la tarjeta del
día. Y para uno que todavía no aparece, **"Agregar fecha"** arriba: se elige
la fecha, el cupo viene con el valor general ya puesto, y se elige si es
pública o privada.

Es la **misma ventana** que editar, a propósito: los campos son los mismos y
la validación también, así que no hay dos lugares que mantener. Lo único que
cambia es si la fecha se elige o viene dada.

Antes había una página aparte, "Fechas hábiles", que se fue el 2026-10-21:
dos pantallas con los mismos días obligaban a saber cuál abrir, y la decisión
de cambiar un cupo se toma mirando la ocupación.

| Estado | En el panel | En el sitio |
|---|---|---|
| **Abierta** | se ve, recibe reservas | se ofrece |
| **Privada** | se ve, recibe reservas | **no se ofrece** |
| **Cerrada** | **no se ve**, salvo que tenga reservas | no se ofrece |

**El estado "Privada" existe por un caso concreto**: un día vendido entero
como evento privado. Hay que verlo en el panel con su cupo y sus reservas,
y **no puede aparecer en el calendario del sitio**, porque ahí significaría
que cualquiera puede comprar un lugar en el evento de otro.

Sin ese estado, la única forma de ver ese día en el panel era abrirlo, y
abrirlo lo publicaba. Eran dos cosas que no tenían por qué ir juntas.

**Un día cerrado desaparece del calendario.** Cerrarlo es decir "este día
no existe para nosotros", y dejarlo a la vista ensucia la pantalla con algo
que no hay que hacer. Se reabre desde **"Agregar fecha"**, eligiendo esa
fecha: la ventana avisa que ya estaba y deja cambiarle el estado.

**Salvo que tenga reservas.** Ahí sí se muestra, en rojo y diciendo a
cuánta gente hay que avisarle. Esconder ese día escondería a personas que
ya reservaron, que es el único resultado peor que una vista sucia.

**Privada no es cerrada**, y el código lo distingue: un día privado cuenta
su cupo, suma sus menús en el total de la cocina y aparece en la plata por
cobrar. Lo único que no hace es llegar al sitio.

### Anotar una reserva a mano abre el día, en privado

Si se anota una reserva para un día que no está abierto, **el día se abre
solo, como privado**, con el cupo de siempre. Antes quedaba gris y con cupo
0: visible pero inservible, y había que acordarse de abrirlo aparte.

**Siempre privado, nunca público.** Es la regla que hace que esto se pueda
hacer sin pensarlo cada vez: abrir un día al público es una decisión
comercial —lo ve cualquiera, cualquiera compra— y **no puede ser el efecto
secundario de anotar una reserva de teléfono**.

Lo que nunca hace:

- **Despublicar un día que ya era público.** Si el día ya estaba abierto,
  no se toca.
- **Pisar un cupo puesto a mano.** Si alguien le puso 30 a propósito, se
  queda en 30.
- **Hacer público nada.** Hay una prueba que recorre los caminos posibles y
  comprueba que ninguno termina en un día abierto al público.

Si el día tenía que ser público, se cambia a mano en el calendario, que es
donde esa decisión corresponde.

### Un día con reservas siempre se ve

El calendario del panel arma sus días de **tres** fuentes: la regla de días
de la semana, lo que haya en `Fechas Hábiles`, y **los días que tengan
alguna reserva**. Lo tercero faltaba, y el síntoma era feo: una reserva
anotada a mano para un miércoles quedaba invisible: existía en la planilla
y el día simplemente no se dibujaba.

Un día que aparece solo por tener reservas viene con **cupo 0** hasta que
alguien lo abra, y con cupo 0 el sitio nunca lo ofrece. O sea que anotar una
reserva a mano **no publica nada**, que es justo lo que hay que cuidar.

## Antes de empujar un cambio

**Corre esto, siempre:**

```
cd panel && npm run revisar
```

Son el chequeo de tipos (`tsc --noEmit`) más las pruebas de lógica. Toma unos
segundos y es lo único que separa un error de tipos de descubrirlo en el log
de Vercel tres minutos después.

No es una recomendación de manual: el primer despliegue falló exactamente
así. Se agregó la columna `Asistencia` al tipo `Reserva` y se olvidó en la
ruta que crea una reserva a mano; `npm run tipos` lo dice en dos segundos,
el build de Vercel lo dijo después de instalar 150 dependencias.

## La versión de Next, que no es decorativa

El panel está en **Next 14.2.35**, el último parche de esa línea. Importa una
cosa en particular: **la única protección del panel es autenticación básica
en `src/middleware.ts`**, y las versiones de Next anteriores a la 14.2.25
tienen un bypass de autorización en el middleware (CVE-2025-29927) — una
cabecera interna que, mandada desde afuera, hace que el framework se salte el
middleware entero. O sea, el candado.

El panel nació en 14.2.15, que es vulnerable. Quedó en 14.2.35.

> Para ser justos: según el aviso de GitHub, las aplicaciones alojadas en
> Vercel no estaban afectadas, porque Vercel bloquea esa cabecera en su
> infraestructura. Igual no corresponde dejar la versión vulnerable: eso
> amarra la seguridad del panel a una protección de la que no somos dueños, y
> se cae el día que esto corra en otra parte.

`npm audit` **va a seguir mostrando avisos de Next**, y conviene saber por qué
antes de alarmarse: la línea 14.x ya no recibe arreglos para varios, que solo
están corregidos en la 16. Casi todos son de funciones **que este panel no
usa**: Image Optimization (no hay un solo `next/image`), Server Actions,
rewrites, i18n del Pages Router, servidores propios, servidores en Windows.
Lo revisado el 2026-10-20 es eso: el que apuntaba al middleware se arregló,
el resto no aplica.

**Subir a Next 16 es trabajo aparte y no trivial**: cambia `params` a una
promesa, así que hay que tocar las rutas con `[fila]` y `[fecha]`. Vale la
pena hacerlo, pero no en medio de un despliegue.

## Después

**Cada push a la rama vuelve a desplegar.** No hay que hacer nada más.

Para cambiar una variable: en Vercel, *Settings → Environment Variables*, y
después **Redeploy** — las variables no se recargan solas.

---

## Lo que este despliegue NO resuelve

Dicho para que no sorprenda:

- **No hay cuentas por persona.** Una sola credencial compartida. No queda
  registro de quién hizo cada cambio.
- **No hay botón de salir.** El navegador recuerda la credencial hasta que se
  cierra. Para salir, ventana privada o cerrar el navegador.
- **La clave es lo único que protege las reservas.** Si se filtra, cualquiera
  entra. Cámbiala en Vercel y redespliega.
- **Siguen siendo dos escritores sobre la misma planilla**, el panel y el
  Apps Script, sin bloqueo entre ellos. Ver el apartado del `README.md`.
