# Migrar el proyecto a la cuenta Team

Plan para pasar **Brasas de Lo Pirque** de la cuenta personal de Claude a la
cuenta **Team** a la que te agregaron, sin que el sitio ni el panel dejen de
funcionar en ningún momento.

> **La idea de fondo:** casi nada "se mueve". El código vive en GitHub, el
> panel en Vercel, los datos en la planilla del cliente y el cobro en Shopify.
> Lo que cambia de cuenta es **desde dónde trabaja Claude**. Por eso el orden
> importa: primero se conecta la cuenta Team a lo que ya existe, se comprueba
> que funciona, y recién después se ordenan (si se quiere) las cuentas de
> Vercel y GitHub.

Archivos de esta carpeta:

| Archivo | Para qué |
|---|---|
| `README.md` | Este plan, paso a paso |
| `variables-vercel.md` | Las 15 variables del panel, de dónde sale cada una y cómo recuperarla si se pierde |
| `entorno-claude.md` | Cómo recrear el entorno de Claude Code en la cuenta Team (hosts permitidos y demás) |
| `primer-mensaje.md` | El mensaje para pegar en la primera sesión de la cuenta Team |
| `verificar.sh` | Comprueba de una vez que todo quedó conectado |
| `independencia.md` | **Cómo dejar todo a nombre de la empresa** (cuentas de GitHub y Vercel con el correo de la empresa), para que el proyecto no dependa de nadie |

---

## Dónde va (2026-11-19)

El repo ya se transfirió: hoy es **`ayc-y-blp/aycyblp`** (antes
`Yodakoba/Landing-Pirque`). Todo lo que en este plan dice `Landing-Pirque`
habla de ese mismo repo con su nombre viejo.

| # | Paso | Estado |
|---|---|---|
| 1 | Claude Team + GitHub | ✅ La sesión de la Team abre el repo con su nombre nuevo |
| 2 | Entorno de Claude Code | ✅ `verificar.sh` sin errores de red (14 de 14) |
| 3 | Google Drive | ✅ El conector encuentra `BRASAS fotos` |
| 4 | Vercel | ✅ Proyecto transferido al equipo **Ayc y Blp**, con plan pagado, y conectado a la organización `ayc-y-blp`. La URL no cambió, y `main` ya despliega a producción desde ahí (PR #262) |
| 5 | GitHub a una organización | ✅ `ayc-y-blp/aycyblp`, con `main` protegida. GitHub Pages publica ahora en `ayc-y-blp.github.io/aycyblp/` |
| 6 | Shopify | ✅ No hace falta: la URL del panel no cambió |
| 7 | Prueba de punta a punta | ☐ Lo de `verificar.sh` pasó; faltan las pruebas a mano y ver en **Logs** que las tres tareas diarias corrieron en el equipo nuevo |
| — | Dirección propia del panel | ⏸ Para después, junto con la mudanza del dominio fuera de Shopify (ver `CLAUDE.md`, "En pausa") |
| 0 · 8 | Respaldo de claves · apagar lo viejo | ☐ A mano |

---

## Resumen en una mirada

| # | Sistema | Qué hay que hacer | ¿Obligatorio? | Tiempo |
|---|---|---|---|---|
| 0 | Todos | Respaldar las claves | **Sí** | 15 min |
| 1 | Claude Team | Entrar a la cuenta Team y conectar GitHub | **Sí** | 10 min |
| 2 | Claude Code | Recrear el entorno (hosts permitidos) | **Sí** | 10 min |
| 3 | Google Drive | Conectar el conector de Drive en la cuenta Team | Sí, si se usa Drive desde Claude | 5 min |
| 4 | Vercel | Pasar el proyecto del panel a un equipo Pro | Recomendado (uso comercial) | 20 min |
| 5 | GitHub | Pasar el repo a una organización | Opcional | 15 min |
| 6 | Shopify | Solo revisar webhooks si cambió la URL del panel | Solo si cambió la URL | 5 min |
| 7 | Todos | Correr `verificar.sh` y una prueba de punta a punta | **Sí** | 10 min |
| 8 | Claude personal | Apagar lo viejo | Al final | 5 min |

**Los pasos 0 a 3 y el 7 bastan para trabajar desde la cuenta Team.** Los
pasos 4 y 5 ordenan la propiedad de las cuentas: **para hacerlos a nombre de
la empresa, sigue `independencia.md`**, que los reemplaza con más detalle.

---

## Paso 0 — Respaldar las claves (antes de tocar nada)

Las claves del panel viven solo en Vercel. Si algo sale mal al transferir, hay
que poder volver a ponerlas.

1. Abre `variables-vercel.md` y recorre la tabla.
2. Para cada variable, confirma que **sabes de dónde volver a sacarla**
   (columna "Si se pierde"). Las que estén marcadas como *Sensitive* en Vercel
   no se pueden volver a leer: para esas, lo que se respalda es el camino para
   regenerarlas.
3. Guarda lo que tengas (el JSON de la cuenta de servicio, contraseñas) en un
   **gestor de contraseñas**, nunca en el repo, en un chat ni en un correo.

✅ Listo cuando: tienes a mano o sabes regenerar las 15 variables.

---

## Paso 1 — Claude Team: entrar y conectar GitHub

1. En **claude.ai**, abajo a la izquierda (tu nombre) → cambia a la
   organización **Team**. Todo lo que sigue se hace con esa organización
   elegida.
2. Abre **claude.ai/code**. Si no aparece Claude Code, pídele al
   administrador del Team que lo habilite para la organización.
3. Conecta GitHub cuando te lo pida (o en **Settings → Connectors → GitHub**).
   Inicia sesión con la cuenta de GitHub dueña del repo (`Yodakoba`).
4. Cuando GitHub pregunte a qué repositorios darle acceso a la app **Claude**,
   elige **`Landing-Pirque`** (o "todos"). Si ya estaba instalada por la
   cuenta personal, basta con que la nueva cuenta se vincule; si no ves el
   repo, revisa en github.com → Settings → Applications → Claude → Configure.

> **Lo que no viaja:** las conversaciones y sesiones de la cuenta personal no
> pasan a la Team. No hace falta: **todo lo que importa del proyecto está en
> `CLAUDE.md` y en los PRs**, que sí viajan porque viven en GitHub. Por eso el
> archivo es tan largo.

✅ Listo cuando: en claude.ai/code, con la organización Team, puedes elegir el
repo `ayc-y-blp/aycyblp` (antes `Yodakoba/Landing-Pirque`) al crear una sesión.

---

## Paso 2 — Claude Code: recrear el entorno

El entorno de la cuenta personal ("Landing Page Pirque") **no se copia**: es de
esa cuenta. Hay que crear uno igual en la Team. Los valores exactos están en
`entorno-claude.md`.

1. En claude.ai/code → menú del entorno (arriba, en la sesión) → **Add
   environment** / **Edit**.
2. Nombre: `Landing Pirque`.
3. Network access: **Limited**, con *Allow package managers* marcado.
4. En **Allowed domains**, pega la lista de `entorno-claude.md`.
5. Sin variables de entorno y sin secretos: **las claves del panel se quedan
   en Vercel**, Claude no las necesita.
6. Elige el repo `ayc-y-blp/aycyblp` para ese entorno.

✅ Listo cuando: abres una sesión nueva en la Team con ese entorno y le pegas
`primer-mensaje.md`; la sesión corre `verificar.sh` sin errores de red.

---

## Paso 3 — Google Drive

**El panel no usa tu Google: usa una cuenta de servicio** del proyecto de
Google Cloud del cliente, y la planilla ya está compartida con ella. Eso no
cambia con la migración.

Lo único que cambia es el **conector de Drive de Claude**, que se usaba para
listar las fotos del cliente (`BRASAS fotos`):

1. claude.ai (organización Team) → **Settings → Connectors → Google Drive →
   Connect**, con la cuenta de Google que ve la carpeta `BRASAS fotos`.
2. Si el conector no aparece, lo tiene que habilitar el administrador del
   Team (Admin settings → Connectors).

Recordatorio que no cambia: desde Claude Code las fotos se pueden **listar
pero no descargar** (el proxy bloquea `drive.google.com`). Para usarlas hay
que subirlas al repo.

✅ Listo cuando: en una conversación de la Team, Claude puede buscar
"BRASAS fotos" en tu Drive.

**No tocar:** la planilla, sus permisos, la cuenta de servicio y su clave, y
el calendario de Google. Nada de eso está atado a Claude.

---

## Paso 4 — Vercel: pasar el panel a un equipo Pro

Hoy el panel (`landing-pirque-alpha.vercel.app`) está en una cuenta personal
Hobby. **Hobby es solo para uso no comercial** y un panel de un restaurante es
comercial; este es el buen momento para ordenarlo. Es una decisión de pago
(Pro ≈ US$20 al mes por asiento): confírmala antes.

1. En vercel.com → arriba a la izquierda → **Create Team** (o elige el equipo
   que ya exista), plan **Pro**.
2. Abre el proyecto del panel (en tu cuenta personal) → **Settings →
   General** → abajo, **Transfer Project** → elige el equipo.
3. **La app de Vercel tiene que estar instalada en la organización de
   GitHub y conectada al equipo** — fue lo que faltó el 2026-11-19. Después
   de transferir el repo, la app seguía instalada solo en la cuenta personal
   (`Yodakoba`): el proyecto decía *conectado* (Vercel reconoce el repo
   aunque cambie de dueño), pero los avisos de GitHub no le llegaban y los
   pushes no se construían, sin ningún error a la vista. El arreglo: Settings
   del equipo → **Git** → *Install on another GitHub account* → la
   organización, con *Only select repositories* → el repo; y después
   **Connect** en la organización, **en el mismo equipo donde vive el
   proyecto**: cada cuenta de GitHub se conecta a un solo equipo de Vercel.
   **Con eso todavía no bastó**: hubo que ir al proyecto → **Settings → Git
   → Disconnect** y volver a conectar el repo, para que el proyecto quedara
   enganchado a la instalación nueva. La señal de que falta es que la lista
   de **Deployments** no muestre nada de los pushes nuevos: un despliegue
   bloqueado o cancelado sí aparecería ahí.
4. Al terminar, en el proyecto ya transferido:
   - **Settings → Environment Variables**: confirma que están las 15 de
     `variables-vercel.md`. Si falta alguna, ponla de nuevo desde el
     respaldo del paso 0.
   - **Root Directory** sigue siendo **`panel`** (en el diseño nuevo de
     Vercel está en Settings → Build and Deployment).
   - **Las tres tareas diarias** de `panel/vercel.json` (días de la regla
     08:23 UTC, Shopify 09:17 UTC, CRM 11:41 UTC). La pantalla de *Cron
     Jobs* cambia de lugar según la versión de Vercel: búscala con *Find*.
     Si no aparece no es grave: las tareas salen del archivo y se registran
     con cada despliegue a producción. Lo que vale es ver al día siguiente,
     en **Logs**, que corrieron.
   - **Settings → Domains**: anota la URL. **Debería seguir siendo
     `landing-pirque-alpha.vercel.app`.**
5. Haz un **Redeploy** del último despliegue para confirmar que construye.

### No cambies la URL del panel

**Renombrar el proyecto en Vercel no la cambia**: el dominio
`landing-pirque-alpha.vercel.app` es una entrada aparte, en Settings →
Domains. Lo que no hay que hacer es **quitar o reemplazar ese dominio**.
Además de los cuatro lugares de abajo, viaja en **los links que ya se
mandaron** por WhatsApp —cotizaciones (`/presupuesto/…`), contratos
(`/contrato/…`), la planilla semanal del equipo— y esos no se pueden
corregir: dejarían de abrir. Para una dirección más linda se **agrega** un
dominio (por ejemplo `panel.brasasdelopirque.cl`) sin quitar el de ahora.

### Si la URL del panel cambió (solo en ese caso)

La URL está escrita en cuatro lugares. Hay que cambiarla en los cuatro:

1. `assets/js/reserva.js` → `CONFIG.backend` (y después
   `python3 tools/traducir.py`, porque cambia el `?v=` del JS).
2. Shopify → webhooks (paso 6).
3. El entorno de Claude Code → Allowed domains (paso 2).
4. `CLAUDE.md`, donde dice `landing-pirque-alpha.vercel.app`.

✅ Listo cuando: el panel abre, se puede entrar, y
`https://<url>/api/publico/fechas` responde con fechas.

---

## Paso 5 — GitHub: pasar el repo a una organización (opcional)

> **Hecho**: el repo es `ayc-y-blp/aycyblp`. Lo que sigue queda como
> referencia; de la reconexión de abajo falta confirmar Vercel.

Solo si el Team quiere que el repo sea de una organización y no de la cuenta
personal `Yodakoba`. **Si se hace, se usa Transfer ownership, nunca "crear
uno nuevo y copiar"**: la transferencia se lleva los 127 PRs, que son el
registro de por qué las cosas están como están, y deja redirecciones.

1. github.com → crea la organización (o usa la existente).
2. Repo `Landing-Pirque` → **Settings → General → Danger Zone → Transfer
   ownership** → la organización.
3. Después de transferir, reconecta tres cosas:
   - **Claude**: instala la app de Claude en la organización con acceso al
     repo (github.com/apps/claude → Configure).
   - **Vercel**: proyecto → Settings → Git → si dice desconectado, vuelve a
     conectar el repo con su nombre nuevo (`organizacion/Landing-Pirque`).
     Haz un push de prueba y confirma que despliega.
   - **Tu copia local, si tienes una**: `git remote set-url origin
     https://github.com/<organizacion>/Landing-Pirque.git`.

✅ Listo cuando: un push a `main` despliega el panel en Vercel, y Claude Code
en la Team puede abrir una sesión sobre el repo con su nombre nuevo.

---

## Paso 6 — Shopify

**Shopify no está atado a Claude ni a Vercel por cuenta**, así que en
principio no se toca. Solo dos revisiones:

1. **Si la URL del panel cambió** (paso 4): Shopify admin → **Settings →
   Notifications → Webhooks** (o en la app privada del panel) → los tres
   webhooks `orders/create`, `orders/updated` y `orders/cancelled` tienen que
   apuntar a `https://<url-nueva>/api/shopify/webhook`. Borra los que apunten
   a una URL vieja.
2. **Reinstalar la app "Google Sheets Reservas" cambia solo su token**
   (`SHOPIFY_ADMIN_TOKEN`). Los webhooks son de la tienda —están en
   Notificaciones— y se firman con el secreto de esa página, así que no se
   tocan. Se reinstaló el 2026-11-19, cuando el token se perdió al pasar las
   variables a *Sensitive*.

El token de Storefront del sitio (`reserva.js`) no cambia: es de la tienda,
no de ninguna cuenta.

✅ Listo cuando: una reserva de prueba en la tienda de desarrollo aparece en
el panel en menos de un minuto.

---

## Paso 7 — Comprobar todo

1. En una sesión de Claude Code de la Team, pega `primer-mensaje.md`. La
   sesión corre `bash migracion-team/verificar.sh` y te dice qué pasó.
2. Prueba de punta a punta, a mano:
   - Entra al panel con tu cuenta y abre `/api/diagnostico`: todas las
     pestañas encontradas.
   - Abre `reservas.html` (servido con `python3 -m http.server`): el
     calendario se dibuja con fechas.
   - Crea un carrito de prueba y llega al checkout (recuerda que la tienda
     de desarrollo pide contraseña).
   - En el panel, `/configuracion` o `/menus`: guarda algo sin cambiarlo y
     revisa que aparezca en `/bitacora`.
3. Al día siguiente: revisa en Vercel → **Logs** que corrieron las tres
   tareas diarias.

✅ Listo cuando: todo lo anterior pasa.

---

## Paso 8 — Apagar lo viejo

Solo cuando el paso 7 pasó completo:

1. En la cuenta **personal** de Claude: borra el entorno "Landing Page
   Pirque" (tiene la lista de hosts; no tiene claves) y archiva las sesiones
   del proyecto.
2. En Vercel personal: el proyecto ya no está (se transfirió). Si quedó un
   duplicado, bórralo para que no haya dos paneles escribiendo en la misma
   planilla.
3. Desconecta la cuenta personal de Claude de GitHub si ya no la vas a usar
   (github.com → Settings → Applications → Authorized apps).

---

## Qué NO hay que hacer

- **No crear un repo nuevo copiando el código.** Se pierden los PRs.
- **No crear un proyecto nuevo de Vercel "desde cero"** si se puede
  transferir: se pierden las variables y habría que reapuntar los webhooks.
- **No pegar claves en un chat de Claude** ni ponerlas como variables del
  entorno de Claude Code. Viven en Vercel y ahí se quedan.
- **No dejar dos paneles vivos a la vez** sobre la misma planilla: dos
  tareas diarias escribirían las mismas reservas.
- **No mezclar esto con el paso a producción de Shopify** (token, dominio e
  IDs de variante). Es otro cambio, con su propio riesgo; mejor uno a la vez.
