# Las variables del panel en Vercel

Son **15**. Viven en Vercel → proyecto del panel → **Settings → Environment
Variables**, y en ningún otro lado. Esta lista **no lleva valores, a
propósito**: dice qué es cada una y cómo volver a conseguirla.

Úsala dos veces: **antes** de transferir el proyecto (para respaldar) y
**después** (para comprobar que llegaron todas).

| ✓ | Variable | ¿Obligatoria? | Qué es | Si se pierde |
|---|---|---|---|---|
| ☐ | `GOOGLE_SHEET_ID` | **Sí** | El id de la planilla | Está en la URL de la planilla, entre `/d/` y `/edit` |
| ☐ | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | **Sí** | El correo del robot que entra a la planilla | Google Cloud (proyecto del cliente) → IAM → Cuentas de servicio |
| ☐ | `GOOGLE_PRIVATE_KEY` | **Sí** | La clave del robot | Del JSON guardado. Si no está: Cuentas de servicio → Claves → **Crear clave nueva → JSON**, y borrar la vieja |
| ☐ | `GOOGLE_CALENDAR_ID` | No | Calendario donde se anotan las reservas | Google Calendar → configuración del calendario → *Integrar calendario* |
| ☐ | `PANEL_USUARIO` | **Sí** | Usuario de emergencia del administrador | Lo eliges tú (hoy, el que ya usas) |
| ☐ | `PANEL_CLAVE` | **Sí** | Su contraseña | Se pone una nueva. **Cambiarla cierra todas las sesiones** |
| ☐ | `SESION_SECRETO` | No | Con qué se firman las sesiones | Una cadena larga al azar. Sin ella se deriva de `PANEL_CLAVE` |
| ☐ | `PANEL_ENCARGADO_USUARIO` | No | Clave compartida de encargado (de antes de las cuentas) | Se puede dejar sin poner: hoy hay cuentas con nombre en `/usuarios` |
| ☐ | `PANEL_ENCARGADO_CLAVE` | No | Su contraseña | Igual que la anterior |
| ☐ | `SHOPIFY_DOMINIO` | **Sí** | La tienda | Hoy `brasas-de-lo-pirque-development.myshopify.com` |
| ☐ | `SHOPIFY_ADMIN_TOKEN` | **Sí** | Token de la app del panel (empieza en `shpat_`) | Shopify admin → Apps → la app del panel → *API credentials*. **No reinstalar la app** si se puede evitar: cambia el token |
| ☐ | `SHOPIFY_VERSION` | **Sí** | Versión de la API | `2026-10` |
| ☐ | `SHOPIFY_WEBHOOK_SECRET` | **Sí** | Firma de los webhooks (*Client secret* de la app) | En la misma app, *API credentials* |
| ☐ | `CRON_SECRET` | **Sí** | Protege las dos tareas diarias | Una cadena larga al azar; se puede inventar una nueva |
| ☐ | `CRM_API_KEY` | No | Clave del CRM del socio (Asados y Corderos) | Pedírsela al socio. **Nunca con prefijo `NEXT_PUBLIC_`** |

## Lo que no está acá, a propósito

- **El token de Storefront del sitio** está en `assets/js/reserva.js`: es
  público por diseño y viaja con el repo.
- **Los parámetros del negocio** (cupos, horarios, precios de menús) viven en
  la pestaña `Config` de la planilla, no en Vercel.
- **Las cuentas del panel** (nombre, rol, contraseña) viven en la pestaña
  `Usuarios`. No hay que migrarlas: la planilla no cambia.

## Al terminar

- Variables con datos sensibles (`GOOGLE_PRIVATE_KEY`, `PANEL_CLAVE`,
  `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_WEBHOOK_SECRET`, `CRON_SECRET`,
  `CRM_API_KEY`) → márcalas **Sensitive** en Vercel.
- Después de cambiar cualquier variable, haz **Redeploy**: Vercel no aplica
  variables nuevas a un despliegue que ya está corriendo.
