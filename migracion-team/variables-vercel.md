# Las variables del panel en Vercel

Son **17** desde el 2026-11-19 (se agregó `SESION_SECRETO`, y se anotó
`COMENTARIOS_SHEET_ID`, que existía desde el 2026-11-12 y faltaba en esta
lista). Viven en
Vercel → equipo *Ayc y Blp* → proyecto **`landing-pirque`** → **Settings →
Environment Variables**, y en ningún otro lado. Esta lista **no lleva
valores, a propósito**: dice qué es cada una, en qué entorno va y cómo
volver a conseguirla. **Los valores van en la bóveda de la empresa.**

**La regla de los entornos** (Fase 4, 2026-11-19): **solo se separan la
planilla, el calendario, el CRM y la tienda de Shopify**, para que las
versiones de prueba de un PR (*Preview*) no escriban ni cobren en lo real.
Todo lo demás va **igual en Production y Preview**. *Development* no se
marca nunca: nadie corre el panel en su computador con estas variables.

**La tienda se separa desde el 2026-11-20** (lo pidió el cliente: una
prueba no puede terminar en una transacción real). Production usa la tienda
real y Preview la de desarrollo, que no puede cobrar plata de verdad. El
sitio hace lo mismo por su lado: ver "Dos tiendas" en el `CLAUDE.md` de la
raíz. **Hasta el lanzamiento las dos apuntan a la de desarrollo**; ese día
se cambian solo las de Production.

**Una variable con dos valores son dos variables en Vercel**, con el mismo
nombre: una marcada solo *Production* y otra solo *Preview*. Como las de
Shopify son *Sensitive* y Vercel no deja cambiarles los entornos, para
separarlas se borra la que está en los dos y se crean las dos nuevas, con
los valores a mano antes de borrar.

| Variable | Production | Preview | Sensitive | Qué es | Si se pierde |
|---|---|---|---|---|---|
| `GOOGLE_SHEET_ID` | planilla **real** | copia **"Pruebas"** | No | El id de la planilla | Está en la URL de la planilla, entre `/d/` y `/edit`. La de Preview es otra planilla, compartida con la cuenta de servicio como *Editor*, y no es el respaldo |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✓ | ✓ mismo | No | El correo del robot que entra a la planilla | Google Cloud (proyecto del cliente) → IAM → Cuentas de servicio |
| `GOOGLE_PRIVATE_KEY` | ✓ | ✓ mismo | **Sí** | La clave del robot | El campo `private_key` del JSON guardado, con sus `\n`. Si no está: Cuentas de servicio → Claves → **Crear clave nueva → JSON**, y borrar la vieja |
| `GOOGLE_CALENDAR_ID` | ✓ | — | No | Calendario donde se anotan las reservas (opcional) | Google Calendar → configuración del calendario → *Integrar calendario* |
| `PANEL_USUARIO` | ✓ | ✓ mismo | No | Usuario de emergencia del administrador | Lo eliges tú |
| `PANEL_CLAVE` | ✓ | ✓ mismo | **Sí** | Su contraseña. Sin ella el panel se cierra entero | Se pone una nueva desde la bóveda |
| `SESION_SECRETO` | ✓ | ✓ mismo | **Sí** | Con qué se firman las sesiones. Existe desde el 2026-11-19; antes se derivaba de `PANEL_CLAVE` | Una cadena larga al azar. **Cambiarla cierra la sesión de todos** (vuelven a entrar con su clave de siempre) |
| `PANEL_ENCARGADO_USUARIO` | ✓ | ✓ mismo | No | Clave compartida de encargado, de antes de las cuentas (opcional) | Se puede dejar sin poner: hoy hay cuentas con nombre en `/usuarios` |
| `PANEL_ENCARGADO_CLAVE` | ✓ | ✓ mismo | **Sí** | Su contraseña (opcional) | Igual que la anterior |
| `SHOPIFY_DOMINIO` | tienda **real** (`lo-pirque.myshopify.com`) desde el lanzamiento | tienda de **desarrollo** (`brasas-de-lo-pirque-development.myshopify.com`) | No | La tienda | Hasta el lanzamiento, la de desarrollo en los dos |
| `SHOPIFY_VERSION` | ✓ | ✓ mismo | No | Versión de la API | `2026-10` |
| `SHOPIFY_ADMIN_TOKEN` | **no se usa** con la tienda real: ahí van las dos de abajo, que mandan sobre esta aunque quede escrita | el de **"Google Sheets Reservas"** en la de **desarrollo** | **Sí** | Token de la app del panel en esa tienda (empieza en `shpat_`); solo lee pedidos (`read_orders`) | **Shopify lo muestra una sola vez**: hay que guardarlo en la bóveda al crearlo, uno por tienda. Si se pierde, se **reinstala esa app** y sale uno nuevo (se hizo el 2026-11-19 en la de desarrollo); los webhooks no dependen de ella |
| `SHOPIFY_CLIENT_ID` | el **ID de cliente** de la app **Reservas Pirque** del Dev Dashboard (tienda real) | **no se pone** | No | Con esta y la de abajo el panel pide solo el token de la tienda real, que dura 24 horas (desde el 2026-11-21) | Dev Dashboard → Reservas Pirque → **Configuración → Credenciales**. Desde el 1 de enero de 2026 Shopify no deja crear apps en el admin, así que la de la tienda real no tiene token `shpat_` |
| `SHOPIFY_CLIENT_SECRET` | el **Secreto del cliente** de esa app | **no se pone** | **Sí** | Ver la de arriba | Mismo lugar, con el ojo. **No apretar *Rotar***: cambia el secreto y el panel deja de poder pedir el token hasta actualizar esta variable |
| `SHOPIFY_WEBHOOK_SECRET` | el de la tienda **real** | el de la de **desarrollo** | **Sí** | Con qué se verifica la firma de los webhooks | Shopify → **Configuración → Notificaciones → Webhooks → Secreto de firma → Secreto actual**, en cada tienda (se puede volver a ver). **No es el Client secret de la app**: los webhooks se crearon en esa página. No apretar *Crear secreto nuevo*. Los webhooks de la de desarrollo se borran al lanzar: una versión de prueba no los recibe, y en Preview los pedidos se traen con *Revisar Shopify ahora* |
| `CRON_SECRET` | ✓ | ✓ mismo | **Sí** | Protege las tres tareas diarias (solo corren en Production) | Una cadena larga al azar; se puede inventar una nueva y hacer Redeploy |
| `COMENTARIOS_SHEET_ID` | ✓ | ✓ mismo | No | La planilla del testeo (*Gran Testeo - Panel*), donde escribe el botón 💬 Comentar | Está en la URL de esa planilla, entre `/d/` y `/edit`. Tiene que estar compartida con la cuenta de servicio como *Editor*. **Sin la variable el botón no aparece**; si la planilla cambia de dueño con una copia, el ID cambia y hay que ponerlo acá |
| `CRM_API_KEY` | ✓ | — | **Sí** | Clave del CRM del socio (Asados y Corderos, opcional) | Pedírsela al socio. **Nunca con prefijo `NEXT_PUBLIC_`** |

**Borrar y volver a crear.** El 2026-11-19 Vercel no dejó cambiar los
entornos de una variable *Sensitive*, y lo seguro para marcar una como
*Sensitive* es crearla así desde el principio. En los dos casos se borra y
se crea de nuevo, **con el valor a mano antes de borrar**, porque una
*Sensitive* no se puede volver a leer. Así se perdió ese día el token de
Shopify, que no estaba en la bóveda. El aviso que sale al borrar
("the secret will still work until it is disabled at its source") es
genérico: borrar en Vercel no anula nada en Google ni en Shopify.

**Cómo se comprueba después de un Redeploy** (2026-11-19):

| Qué | Cómo | Bien |
|---|---|---|
| La planilla y `GOOGLE_PRIVATE_KEY` | `/api/publico/fechas` | 200 con días y sin `error` |
| El panel abierto | `/login` | 200 |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify → Notificaciones → Webhooks → ⋯ → *Enviar notificación de prueba*, y en Vercel → Logs el `POST /api/shopify/webhook` | 200 (401 con `[webhook] firma inválida` = no calza) |
| `SHOPIFY_ADMIN_TOKEN`, o `SHOPIFY_CLIENT_ID` y `SHOPIFY_CLIENT_SECRET` | Panel → Configuración → Mantención → **Revisar Shopify ahora** | "N pedidos revisados" (401 = token inválido; *no entregó el token de acceso* = credenciales, app sin instalar o de otra organización) |
| `CRON_SECRET` | Vercel → Logs, al día siguiente | Las tres tareas en 200 |

## Lo que no está acá, a propósito

- **El proyecto del sitio (`brasas-sitio`) no lleva ninguna variable**, y
  está bien que su lista esté vacía. Es HTML estático: el script que lo
  publica solo copia archivos, y no corre nada en un servidor que pudiera
  leerlas. Todas viven en `landing-pirque`, que es el panel.
- **El token de Storefront del sitio** está en `assets/js/reserva.js`: es
  público por diseño y viaja con el repo.
- **Los parámetros del negocio** (cupos, horarios, precios de menús) viven en
  la pestaña `Config` de la planilla, no en Vercel.
- **Las cuentas del panel** (nombre, rol, contraseña) viven en la pestaña
  `Usuarios`. No hay que migrarlas: la planilla no cambia.

## Al terminar

- Las variables con datos sensibles van **Sensitive** (columna de la
  tabla), y su valor, antes, en la bóveda.
- Después de cambiar cualquier variable, haz **Redeploy**: Vercel no aplica
  variables nuevas a un despliegue que ya está corriendo.
