# El entorno de Claude Code en la cuenta Team

Copia del entorno de la cuenta personal ("Landing Page Pirque", leído el
2026-11-10), más los dos hosts de las tipografías que `CLAUDE.md` dice que se
abrieron y que no estaban en la lista.

## Configuración

| Campo | Valor |
|---|---|
| Nombre | `Landing Pirque` |
| Alcance | Personal (o de la organización, si el resto del Team también va a trabajar en el proyecto) |
| Repositorio | `Yodakoba/Landing-Pirque` (o su nombre nuevo, si se transfirió) |
| Network access | **Limited** |
| Allow package managers | ✅ marcado (npm, PyPI) |
| Allow MCP servers | ✅ marcado |
| Variables de entorno | **ninguna** |
| Secretos | **ninguno** — las claves del panel se quedan en Vercel |
| Setup script | opcional, ver abajo |

## Allowed domains

Pega uno por línea:

```
landing-pirque-alpha.vercel.app
brasasdelopirque.cl
brasas-de-lo-pirque-development.myshopify.com
shopify.com
api.met.no
crm-asadosycorderos.netlify.app
lgggwnkcoyqivulxcvrf.supabase.co
fonts.googleapis.com
fonts.gstatic.com
```

Para qué sirve cada uno:

| Host | Para qué |
|---|---|
| `landing-pirque-alpha.vercel.app` | El panel en producción. **Si la URL del panel cambia al transferir Vercel, cambia esta línea** |
| `brasasdelopirque.cl` | El sitio viejo y el catálogo público de la tienda de producción |
| `brasas-de-lo-pirque-development.myshopify.com`, `shopify.com` | Storefront API: probar variantes y carritos |
| `api.met.no` | El pronóstico del tiempo del panel |
| `crm-asadosycorderos.netlify.app`, `lgggwnkcoyqivulxcvrf.supabase.co` | El CRM del socio |
| `fonts.googleapis.com`, `fonts.gstatic.com` | Que las capturas salgan con Fraunces y Work Sans |

Se sacó `api.open-meteo.com`, que estaba en la lista vieja: el panel dejó de
usarlo el 2026-10-29 (ver "El pronóstico del tiempo" en `CLAUDE.md`).

**Lo que sigue cerrado a propósito**: `drive.google.com`,
`googleusercontent.com`, `vercel.com`, `script.google.com`. No hacen falta.

## Setup script (opcional)

Solo si quieres que cada sesión arranque con las dependencias del panel
instaladas (para correr sus pruebas sin esperar). Sin él, Claude las instala
cuando hagan falta.

```bash
if [ -d Landing-Pirque/panel ]; then (cd Landing-Pirque/panel && npm ci); fi
```
