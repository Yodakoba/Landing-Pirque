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

## Los menús: un nombre canónico con alias

Viven en la pestaña **`Menús`** de la planilla y se editan en **/menus**.
Cada uno tiene un nombre y una lista de alias separados por coma.

**El problema que esto resuelve.** El nombre del menú era la llave, y Shopify
guarda el título del producto **dentro de cada pedido** en el momento de la
compra. Renombrar un producto no reescribe los pedidos viejos — y la
reconciliación diaria, al releerlos, seguiría escribiendo el nombre antiguo
para siempre. Con el nombre como llave, **un solo rename parte el total del
día en dos platos que en realidad son uno**, y la cocina prepara mal.

Con alias, un rename se arregla **agregando una línea en /menus**, sin tocar
las filas viejas y sin redesplegar.

**Los nombres canónicos van sin el prefijo "Menú"** — `Tradiciones`,
`Lo Pirque`, `A Brasas abiertas`, `Sommelier`, `Niños` — que es como se
llaman en el sitio público, en el landing y en `CLAUDE.md`. Los `Menú X` que
usa Shopify entran como alias.

**Se canoniza al escribir y al leer.** Al escribir, para que la planilla vaya
quedando con un solo nombre por plato; al leer, porque las filas ya escritas
y lo anotado a mano no pasaron por ahí.

**Un menú que no está en la lista no se descarta ni se fuerza al más
parecido**: aparece tal cual, y /menus avisa en amarillo que conviene
agregarlo. Así la lista crece sola en vez de que alguien lo descubra cuando
los totales no cuadren.

**No se guarda el id de variante**, que sería lo más sólido porque no cambia
nunca. Convertiría esa columna en algo ilegible para una persona, y esa
planilla la abre gente. Los alias dan casi toda la robustez sin ese costo.

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
