# Traspaso: Brasas de Lo Pirque (estado al 21-11-2026)

Para quien retoma el proyecto en una sesión nueva, sin haber visto las
anteriores. **Este archivo es el mapa**; el detalle de cada decisión vive en
dos documentos, ordenado por tema y con fecha:

| Archivo | Qué tiene | Cuándo se carga |
|---|---|---|
| `CLAUDE.md` (raíz) | Las reglas fijas, el sitio público, los landings, la reserva con Shopify, Vercel, el dominio, Git | Siempre (y este archivo, que importa) |
| `panel/CLAUDE.md` | Todo el panel: reservas, cotizaciones, equipo, informe, roles, la regla PlayStation, el límite de Google | Al trabajar en `panel/` |
| `migracion-team/` | Las 17 variables de Vercel (sin valores), `verificar.sh`, el entorno de Claude Code | A mano |
| `panel/DESPLIEGUE.md` | Cómo se despliega el panel, los webhooks, la planilla | A mano |

**Antes de tocar algo, busca su sección** en esos archivos (`grep -n` por la
palabra o el nombre de la función): casi todo lo que parece raro tiene una
razón escrita, con la frase del cliente que la pidió.

Lo marcado **(por confirmar)** es algo que no quedó comprobado en la
conversación: hay que preguntarlo o mirarlo antes de darlo por hecho.

---

## 0. Estado en una mirada

- **El lanzamiento es el domingo 22-11-2026**: el dominio
  `brasasdelopirque.cl` pasa del sitio viejo de Shopify al sitio nuevo en
  Vercel. **Desde ahí rigen los dos caminos para mergear** (sección 9). Si no
  se sabe si ya pasó, se trata como que sí.
- **La tienda real de Shopify ya está conectada** (PR #283, mergeado el
  20-11-2026 a las 23:16): `brasas-sitio.vercel.app` y, desde el
  lanzamiento, `brasasdelopirque.cl` **cobran de verdad**. Las versiones de
  prueba de un PR, GitHub Pages y `localhost` siguen contra la tienda de
  desarrollo, que no cobra.
- **El PR #285** (todo lo de las últimas horas, sección 4) **se mergeó el
  21-11-2026** con el OK del cliente, y el panel en producción quedó
  comprobado: `/login` 200, `/api/publico/fechas` 200 y el webhook sin firma
  401.
- **PR #287 está abierto**, en la rama `claude/traspaso-md-resumen-1dc8d5`:
  el cliente pidió ***"déjalo en preview"***, así que **se mergea solo cuando
  diga *"mergea"***. Trae *el computador, más compacto* —las dos capas—, los
  formularios alineados en todo el panel, **las ventanas que caben en la
  pantalla del computador** (de 21 que no cabían quedan 2) y **corregir un
  día cerrado con una casilla y la lista de cambios**, sin motivo escrito.
  https://github.com/ayc-y-blp/aycyblp/pull/287
- **El cliente lo está mirando en la versión de prueba, en su notebook, y
  va mandando fotos** de lo que quiere más junto o más alineado. Preguntó
  por qué tenía que pedir él cada revisión: desde ese día **`npm run
  ventanas` mide cada ficha y cada ventana y es parte de `npm run
  revisar`** (sección 8). Lo que queda está en el pendiente 2 (sección 7).
- Lo que falta antes y después del lanzamiento está en la sección 7, en
  orden.

---

## 1. El sistema

**Brasas de Lo Pirque** es un restaurante campestre y centro de eventos en
Pirque (Región Metropolitana, Chile). Abre al público **sábados y domingos
desde las 13:00** (una sola jornada, sin bloques de hora) y hace eventos
privados: empresas, agencias de turismo, matrimonios.

### Para quién

| Público | Por dónde entra | Cómo cierra |
|---|---|---|
| Visitas particulares (familias, grupos chicos) | Sitio público, `reservas.html` | **Reserva y paga en Shopify**, no por WhatsApp. Es el objetivo comercial del sitio |
| Empresas, agencias, municipalidades | Landings: socios comerciales, promociones, dossier | WhatsApp de Eventos → un vendedor cotiza en el panel |
| El equipo interno (anfitriona, encargados, pagos, gerencia, vendedores) | El panel, con cuenta y rol | — |
| Trabajadores y colaboradores externos | Su **link personal** (`/mi/<token>`) y la planilla semanal (`/semana/<token>`) | Sin cuenta |

Hay **dos WhatsApp, distintos a propósito**: Reservas `+56 9 4009 6228`
(público) y Eventos `+56 9 3385 8575` (empresas). No se unifican.

### Dos entregables en un repo

1. **El sitio** (raíz del repo): HTML y CSS planos, sin build, en tres
   idiomas (español en la raíz; `en/` y `pt/` generados). Diez páginas:
   `index`, `experiencias`, `actividades`, `eventos`, `reservas`, `404`,
   `contacto` (redirige a reservas), y tres landings de empresa:
   `landing-afiliados` (socios, con comisiones), `promociones` (con 11% de
   descuento) y `dossier` (para una empresa que cotiza), cada uno con su PDF.
2. **El panel** (`panel/`): Next.js en Vercel, sobre una planilla de Google
   del cliente. Es el sistema de reservas propio: **Shopify cobra, el panel
   agenda.**

### Los módulos del panel

| Módulo | Pantallas | Qué hace | Detalle en `panel/CLAUDE.md` |
|---|---|---|---|
| **Reservas y calendario** | `/` (calendario), `/dia/<fecha>`, `/recepcion` | Días abiertos con su cupo, reservas de Shopify y a mano, estado del pago, sobrecupo, la caja *Cómo ingresarla en Fudo*, la mesa (agregados y valor final), rectificación, recepción de la anfitriona (*Llegó / No vino*) | "Las reservas en el panel", "Quien paga tiene preferencia", "La mesa", "El rol de anfitrión" |
| **Cotizaciones** | `/presupuestos` (menú *Cotizaciones*), `/clientes`, `/presupuesto/<token>`, `/contrato/<token>` | Fichas de clientes, cotización en 5 pasos, alternativas A/B/C, cobros con comprobante en Drive, contrato, ganar → reserva | "Los presupuestos", "Las cotizaciones" y siguientes |
| **Vendedores y socios comerciales** | `/vendedores` | Ficha por vendedor o socio, comisión por etapas + bono + monto por evento, la parte del vendedor cuando viene con socio, documento (boleta o factura), resumen | "El equipo de ventas", "Los socios comerciales" |
| **Equipo y turnos** | `/equipo`, `/turnos` | Trabajadores, puestos con regla *uno cada N personas*, planificar el día, *Vino / No vino*, cerrar y corregir el día, planilla semanal | "El equipo de trabajadores (panel)" |
| **Actividades extras** | `/extras` | Colaboradores externos (show ecuestre, castillo inflable, pintacaritas…), agendar, confirmar, ajustes | "Las actividades extras" (dentro de equipo) |
| **Propinas** | Ventana del día | El encargado escribe el total del día y el panel lo reparte | "La propina" |
| **Informe y pagos** | `/informe` | Sueldos, propinas, comisiones; pagos registrados; boletas; transferencia masiva; planillas descargables; ajuste desde la tarjeta | "El informe, ordenado y más compacto", "Pagar: sueldo y propina por separado" |
| **Boletas** | Informe y link personal | Cuánto boletear en bruto y en neto, con la retención del año | "La boleta: cuánto boletear" |
| **Estadísticas** | `/estadisticas` | De reservas y del equipo (sueldos por puesto, propinas, ventas) | "Las estadísticas de reservas", "Las estadísticas del equipo" |
| **Administración** | `/config`, `/usuarios` (*Cuentas*), `/bitacora`, `/menus` (*Productos*) | Configuración por secciones, cuentas y roles, bitácora, catálogo, *Ver como*, bandeja de aprobaciones, *Dejar la base en cero* | "La página de Configuración", "Cuentas con nombre y sesión", "La bitácora" |
| **Ayuda** | `?` de cada pantalla, `?` chicos, misiones con capturas, botón 💬 Comentar | Se explica sola; las fotos se rehacen con un script | "El panel se explica solo", "Las misiones de la ayuda" |

---

## 2. Arquitectura y stack

### El repo

**`ayc-y-blp/aycyblp`**, rama por defecto `main`. **Es público a propósito**
(decidido el 19-11-2026): todo lo que se escribe acá lo puede leer
cualquiera. **Nunca una clave, un dato de un cliente ni algo que el negocio
no quiera mostrar.** `main` está protegida (no se borra ni se reescribe),
**sin aprobaciones ni chequeos obligatorios**, a propósito.

```
/                       el sitio público (HTML plano, sin build)
├── index.html … dossier.html   las páginas en español: la fuente de verdad
├── en/  pt/            GENERADAS por tools/traducir.py: no se editan
├── assets/
│   ├── css/site.css, tema.css   estilos del sitio y la vista diurna
│   ├── js/reserva.js   calendario y carrito de Shopify (CONFIG al inicio)
│   ├── js/idioma.js    sugerencia de idioma
│   ├── js/tema.js      recuerda Diurno / Nocturno
│   └── imgs/ imgs2/ gallery/    fotos reales del negocio
├── precios.json        TODOS los precios del sitio, en un solo lugar
├── traducciones/       en.json y pt.json (llave = el texto en español)
├── tools/
│   ├── traducir.py     genera en/ y pt/, los ?v=, los precios y sitemap.xml
│   ├── publicar_sitio.sh   Build Command del sitio en Vercel (lista PUBLICO)
│   └── dossier_pdf.mjs genera dossier.pdf y socios.pdf en los tres idiomas
├── robots.txt, sitemap.xml
├── migracion-team/     variables de Vercel, verificar.sh, entorno
├── backend/README.md   por qué se jubiló el Apps Script
└── panel/              la aplicación Next.js
    ├── vercel.json     las tres tareas diarias (crons)
    ├── src/app/        páginas (una carpeta por pantalla) y api/
    ├── src/components/ componentes React ('use client')
    ├── src/lib/        lógica pura y acceso a la planilla (con pruebas)
    ├── src/middleware.ts   autentica; cada ruta autoriza
    ├── pruebas/        letra-chica, lecturas, webhook, ajuste, playstation,
    │                   capturas-ayuda.mjs y el panel de ejemplo (ejemplo/)
    └── public/ayuda/   las capturas de las misiones y puntos.json
```

### Vercel (equipo *Ayc y Blp*, plan pagado)

| Proyecto | Sale de | URL | Notas |
|---|---|---|---|
| **`landing-pirque`** (el panel) | Root Directory `panel`, Next.js | `landing-pirque-alpha.vercel.app` y `panel.brasasdelopirque.cl` | Las 17 variables. Las dos direcciones sirven; los links que el panel copia salen de `window.location.origin` |
| **`brasas-sitio`** (el sitio) | La raíz, preset *Other*, Build Command `bash tools/publicar_sitio.sh` | `brasas-sitio.vercel.app`; `brasasdelopirque.cl` desde el lanzamiento | Ninguna variable. El script escribe `.vercel/output` con **la lista de lo público** (`PUBLICO`) y las redirecciones 301 del sitio viejo |

- **Cada PR dispara dos chequeos**, `Vercel – landing-pirque` y
  `Vercel – brasas-sitio`, y cada uno trae su versión de prueba (preview).
  **Se espera a que los dos digan `success`** antes de mergear.
- **Tres tareas diarias** (`panel/vercel.json`, protegidas por
  `CRON_SECRET`, solo en Production): `/api/fechas/regla` 08:23 UTC (abre los
  días de la regla), `/api/shopify/sincronizar` 09:17 UTC (reconciliación de
  pedidos) y `/api/crm/publicar` 11:41 UTC (con el CRM apagado, retira lo que
  se había publicado allá).
- **GitHub Pages** también publica el repo entero en
  `ayc-y-blp.github.io/aycyblp/`: es para revisar, no para clientes.

### El dominio (Cloudflare)

El DNS de `brasasdelopirque.cl` se edita en **Cloudflare** (NIC Chile solo
registra). Todo lo que apunta a Vercel o Shopify va con **nube gris (DNS
only)**. Los 5 MX y 2 TXT de Google (el correo) **no se tocan nunca**.

| Registro | Hoy | Desde el lanzamiento |
|---|---|---|
| `@` | A a Shopify | CNAME a Vercel (el valor está en `CLAUDE.md`, "El dominio en Cloudflare") |
| `www` | CNAME `shops.myshopify.com` | CNAME a Vercel; Vercel lo redirige a la raíz (el sitio va **sin www**) |
| `panel` | CNAME a Vercel | igual |
| `tienda` | CNAME `shops.myshopify.com` | igual; pasa a ser el **dominio principal** de la tienda |

### Google Sheets como base de datos

**Una planilla por empresa** (`GOOGLE_SHEET_ID`), leída y escrita por una
cuenta de servicio. **Production usa la planilla real; Preview, una copia
llamada "Pruebas"**, para que una versión de prueba nunca escriba en lo
real. Los parámetros del negocio viven en la pestaña `Config`, no en Vercel.

**Reglas de la planilla que no se rompen**:

- **Las columnas se leen por nombre**, sin distinguir mayúsculas ni tildes;
  los nombres de pestaña se resuelven una vez (`nombreReal()`). Las columnas
  nuevas **van al final** y se agregan solas (`asegurarColumna()`,
  `asegurarHoja()`).
- **Las fechas son texto `AAAA-MM-DD` de punta a punta**, nunca `Date`.
- **60 lecturas por minuto para todo el panel** (sección 9).
- `/api/diagnostico` dice columna por columna qué falta.

| Pestaña | Una fila es | Columnas clave | Se relaciona con |
|---|---|---|---|
| `Reservas` | una reserva | `ID Orden` (id de Shopify, `MANUAL-…` a mano), `Fecha Reserva`, `Nombre`, `Email`, `Teléfono`, `Menú`, `Personas`, `Monto`, `Tipo Pago` (solo Shopify: *Pago directo / Solo reserva*), `Estado Pago Shopify` (`paid`, `pending`, `partially_paid`, `cancelled`, `refunded`, `voided`), `Asistencia`, `Nota de pago`, `Abonado`, `Se cayó por cupo`, `Anotada por`, `Pago anotado`, `Pago revisado`, `Agregados`, `Valor final`, `Mesa cerrada`… | `Fechas Hábiles` por fecha; `Presupuestos.ID Reserva` |
| `Fechas Hábiles` | un día del calendario | `Fecha`, `Capacidad Máx`, `Hora Apertura`, `Estado` (*Abierta / Privada / Privada exclusiva / Cerrada*), `Notas`, `Cupo pedido` | `Reservas`, `Turnos`, `Actividades` por fecha |
| `Config` | un parámetro | `Clave` · `Valor` (días que se abre, cupo, vigencia, descuentos, anticipo, mínimo del show, datos de la empresa, carpeta de Drive…) | todo |
| `Menús` (pantalla *Productos*) | un producto del catálogo | `Menú` (nombre, **igual que en Shopify**), `Precio en línea`, `Precio en el local`, `Tipo` (*Menú / Extra / Arriendo / Show*), `Sitio público`, `Cotización`, `Cobro`, `Precio cotización`, `IVA`, `Moneda`, `Activo`, `Bono vendedor` | Reservas (por nombre), líneas de cotización |
| `Clientes` | una ficha | `ID` (`C-0001`), `Nombre`, `Empresa del cliente`, `RUT`, `Domicilio`, `Teléfono`, `Correo`, `Giro`, `Creado por` | `Presupuestos.ID Cliente` |
| `Presupuestos` | una cotización (o una alternativa) | `ID`, `Fecha`, `Estado`, `Válido hasta`, `Token`, `ID Reserva`, `ID Cliente`, `Invitados`, `Grupo` (las alternativas comparten grupo), `Descuento total`, `Documento`, `Anticipo %`, `Anticipo monto`, `Saldo días antes`, `UF`, `Exclusivo`, `Exclusividad`, `Contrato firmado`, `Enviada`, `Comisión vendedor`, `Socio comercial`, `Comisión socio`, `Show bajo el mínimo`, `Creado por`… | `Presupuesto Líneas`, `Cobros`, `Clientes`, `Reservas` |
| `Presupuesto Líneas` | una línea de una cotización | `ID Presupuesto`, `Concepto`, `Cantidad`, `Precio unitario`, `Personas`, `Descuento`, `IVA`, `Precio UF` | `Presupuestos` |
| `Cobros` | un pago del cliente de una cotización | `ID`, `ID Presupuesto`, `Fecha de pago`, `Concepto` (*Anticipo / Saldo / Otro*), `Monto`, `Medio`, `Comprobante` (id en Drive), `Revisado por`, `Revisado` | `Presupuestos` |
| `Puestos` | un puesto | `Puesto`, `Uno cada N personas` | `Turnos`, `Trabajadores` |
| `Trabajadores` | una ficha | `Nombre` (es la identidad), `Puesto habitual`, `Activo`, `Token de acceso`, `Modalidad` (*por turno / contratado*), `Pago por jornada`, `Valor hora extra`, `Participa en propina` (en blanco = sí), `Nota de pago` (datos bancarios), `Por confirmar` | `Turnos.Trabajador` por nombre |
| `Turnos` | una persona un día | `Fecha`, `Trabajador`, `Puesto`, `Asistencia` (*Sí / No* / en blanco = sin marcar), `Modalidad`, `Propina` (su parte), `Pago jornada`, `Horas extra`, `Valor hora`, `Ajuste` (varios con `\|`: `-20000\|5000`), `Motivo del ajuste` (`Adelanto · Transferencia\|Feriado`) | `Trabajadores`, `Cierres` |
| `Ajustes sueltos` | un ajuste fuera de turno | `ID`, `Fecha`, `Trabajador`, `Monto`, `Motivo`, `Anotado por`, `Cuándo` | se suma al informe como un turno sin día |
| `Cierres` | un día cerrado | `Fecha`, `Cerrado por`, `Cuándo` | un día cerrado no se edita: se corrige, y la lista de lo que cambió queda en la bitácora |
| `Colaboradores` | un colaborador externo | `Nombre`, `Actividad`, `Activo`, `Monto habitual`, `Nota de pago`, `Token de acceso`, `Por confirmar` | `Actividades` |
| `Actividades` | un colaborador un día | `Fecha`, `Colaborador`, `Actividad`, `Vino`, `Monto`, `Ajuste`, `Motivo del ajuste` (mismo formato que `Turnos`) | `Colaboradores` |
| `Pagos` | un pago registrado al equipo | `ID`, `Fecha de pago`, `Trabajador`, `Periodo desde`, `Periodo hasta`, `Monto`, `Concepto` (sueldo o propina), `Registrado por` | informe |
| `Boletas` | una boleta recibida | `Trabajador`, `Periodo desde`, `Periodo hasta`, `Registrado por`, `Cuándo`, `Monto neto` | informe y link personal |
| `Vendedores` | un vendedor o un socio comercial | `Usuario` (la cuenta; `S-0001` un socio, que no tiene cuenta), `Nombre`, `Tipo`, `Sueldo fijo mensual`, `Comisión %`, `Etapa 1 desde`, `Etapa 2 desde/%`, `Etapa 3 desde/%`, `Bono premium (puntos)`, `Monto por evento`, `Base comisión`, `Con socio cobra %`, `Documento`, `Impuesto`, datos de factura, `Token de acceso` | `Presupuestos.Creado por` y `Socio comercial` |
| `Usuarios` | una cuenta del panel | `Nombre`, `Usuario`, `Rol`, `Activo`, `Clave (huella)`, `Vista gerencia`, `Avisos leídos` | `Bitácora`, permisos |
| `Bitácora` | una acción | `Cuándo`, `Quién`, `Rol`, `Acción`, `Detalle` | — |
| `Comentarios` | (en **otra** planilla, `COMENTARIOS_SHEET_ID`) lo que manda el botón 💬 | — | — |

### Shopify

- **Dos tiendas**: la **real** (`lo-pirque.myshopify.com`) y la de
  **desarrollo** (`brasas-de-lo-pirque-development.myshopify.com`), que solo
  procesa pagos de prueba. **La real solo en las direcciones reales.**
- **El sitio usa la Storefront API** (versión `2026-10`) desde
  `assets/js/reserva.js`: `CONFIG.tiendas.real` y `.prueba`, cada una con
  dominio, token **público** de Storefront e IDs de variante por menú y
  modalidad; `tiendaDeEstaPagina()` elige por `location.hostname` contra
  `CONFIG.direccionesReales`. **Un token de Admin API jamás va en el sitio.**
- **Ocho variantes por tienda**: 4 menús (Tradiciones, A Brasas abiertas,
  Niños, Pequeños) × 2 modalidades (*Pago directo* = paga en línea, más
  barato; *Solo reserva* = paga en el local). **La fecha no es una
  variante**: viaja como propiedad de línea `_booking_date` (y
  `_cowlendar_date`, que se mantiene a propósito).
- **El panel usa la Admin API** (`read_orders`) para la reconciliación y
  *Revisar Shopify ahora*: en la tienda real, con `SHOPIFY_CLIENT_ID` +
  `SHOPIFY_CLIENT_SECRET` pide un token de 24 h (`tokenDeAcceso()` en
  `lib/admin.ts`); en Preview, el token fijo `SHOPIFY_ADMIN_TOKEN`.
- **Webhooks** `orders/create`, `orders/updated` y `orders/cancelled` a
  `/api/shopify/webhook`, firmados con HMAC (`lib/firma.ts`) con el secreto
  de *Notificaciones → Webhooks* (no el de la app).
- **Quién paga cómo lo decide el checkout**: una regla de la tienda oculta
  los medios de pago según el SKU (`pago-directo-<menú>` /
  `solo-reserva-<menú>`). Si deja de aplicar no avisa; la señal es una fila
  *Pago directo / por pagar* en el panel.
- **El checkout sale en español para todos** (`es-us`), lo fija la tienda.

### Otras integraciones

| Qué | Para qué | Dónde |
|---|---|---|
| Google Calendar | El panel anota las reservas como eventos (opcional, `GOOGLE_CALENDAR_ID`) | `lib/google-calendar.ts` |
| Google Drive | Comprobantes de pago y contratos firmados, en una unidad compartida del Workspace, carpeta en `Config` (`drive_comprobantes`); alcance `drive.file`; nunca por link público | `lib/drive.ts` |
| UF del día | Productos en UF en las cotizaciones (api.boostr.cl, respaldo mindicador.cl, se guarda 6 h solo un valor bueno) | `lib/uf.ts`, `lib/ufRed.ts`, `/api/uf` |
| Pronóstico | MET Norway (`api.met.no`), con cita de la fuente y User-Agent | `lib/clima.ts` |
| CRM del socio | **Apagado desde el 10-11-2026** (`CRM_APAGADO` en `lib/crm.ts`); el código queda | `lib/crm.ts`, `lib/crm-escribir.ts` |
| Fudo | El sistema de caja del restaurante. **No hay integración**: el panel dice cómo ingresar cada reserva (`lib/fudo.ts`) | — |
| WhatsApp | Enlaces `wa.me` / WhatsApp Web con el mensaje firmado (`saludoAlCliente()`) | `lib/contacto.ts`, `BotonWhatsApp` |

### Variables de entorno del panel (nombres, sin valores)

Los valores están en la bóveda de la empresa y en Vercel → `landing-pirque`
→ Settings → Environment Variables. **Nunca en el chat ni en el repo.** El
detalle de cada una (qué es, en qué entorno, cómo recuperarla) está en
`migracion-team/variables-vercel.md`.

| Variable | Production / Preview |
|---|---|
| `GOOGLE_SHEET_ID` | planilla real / copia "Pruebas" |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | iguales |
| `GOOGLE_CALENDAR_ID` | solo Production (opcional) |
| `PANEL_USUARIO`, `PANEL_CLAVE` | iguales (administrador de emergencia; cambiar la clave cierra todas las sesiones) |
| `SESION_SECRETO` | igual (firma las sesiones) |
| `PANEL_ENCARGADO_USUARIO`, `PANEL_ENCARGADO_CLAVE` | opcionales, de antes de las cuentas |
| `SHOPIFY_DOMINIO` | tienda real / tienda de desarrollo. **(Por confirmar)** que en Production ya diga `lo-pirque.myshopify.com`: debía ponerse justo antes del merge del PR #283 |
| `SHOPIFY_VERSION` | `2026-10` |
| `SHOPIFY_ADMIN_TOKEN` | no se usa en la real / token de la tienda de desarrollo |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | solo Production (app *Reservas Pirque* del Dev Dashboard) |
| `SHOPIFY_WEBHOOK_SECRET` | secreto de la real / de la de desarrollo |
| `CRON_SECRET` | igual |
| `COMENTARIOS_SHEET_ID` | igual (sin ella no aparece el botón 💬) |
| `CRM_API_KEY` | solo Production (opcional; el CRM está apagado) |

El proyecto del sitio no lleva variables: es estático.

---

## 3. Flujos críticos

### A. Una compra en Shopify se vuelve reserva

1. **El calendario del sitio** (`reservas.html` + `reserva.js`) pide las
   fechas a `/api/publico/fechas` del panel. El contrato es **chico a
   propósito** y no se engorda: `{ fecha, quedan, pocos, quedanPagando }` y
   un `error` si algo falló. `quedanPagando` es lo que queda para quien paga
   ahora (puede ser más que `quedan`). El recorte vive en `lib/publico.ts`.
2. **El formulario**: **un solo contador de adultos** y una casilla que sube
   a todos a *A Brasas abiertas* (bar abierto: no se puede servir a 2 de 5),
   más niños y pequeños, que nunca suben. Dos botones con su total:
   *Pagar ahora $X* / *Solo reservar $Y*. Los precios de las filas los
   escribe `traducir.py` desde `precios.json`.
3. **`cartCreate`** contra la tienda de esa dirección, una línea por menú
   con cantidad > 0, cada una con `_booking_date` y `_cowlendar_date`.
   Redirige al `checkoutUrl`.
4. **El checkout de Shopify** cobra (o deja *pago en el local*, según el SKU).
5. **El webhook** llega a `/api/shopify/webhook`: verifica la firma (401 si
   no calza); **si el pedido no trae `_booking_date` lo descarta antes de
   leer la planilla** y deja una línea en los registros de Vercel (así se
   ignoran los pedidos del sitio viejo). Si la trae, `aReserva()` arma la
   fila: el menú por el nombre del producto (`canonizar()`), la modalidad por
   la variante (`tipoPagoDe()`), el estado por `financial_status`, el
   teléfono de los cuatro lugares posibles (`telefonoDe()`). **El `ID Orden`
   es el id del pedido y evita duplicados.**
6. **La reconciliación diaria** (`/api/shopify/sincronizar`, también el botón
   *Revisar Shopify ahora*) rellena lo que un webhook haya perdido.
7. **El cupo**: `ocupaLugar()` (todo menos cancelada, reembolsada, anulada o
   *Se cayó por cupo*) descuenta del día; `tienePrioridad()` (pagada o
   abonada) define `quedanPagando`. **Una reserva sin pagar queda sujeta a
   espacio**: si un pago entra encima, el día queda en **sobrecupo** y
   alguien decide en la página del día entre *Ampliar el cupo* o *Soltar* una
   sin pagar.
8. Si está configurado, el panel crea el evento en Google Calendar.

**Reserva a mano**: desde el panel, con `ID Orden = MANUAL-…`; sin
modalidad (eso es solo de Shopify), con estado *Pagada / Abonada / Por
pagar*, monto sugerido desde `Menús` y editable.

### B. Una cotización de un vendedor se vuelve reserva

1. **Paso 1 · Cliente**: buscar la ficha o crearla (nombre + teléfono o
   correo); el servidor avisa si hay parecidos por RUT, teléfono o correo.
2. **Paso 2 · Evento**: fecha (o *todavía no hay día exacto*), invitados con
   − y +, tipo. Al seguir se crea la cotización y desde ahí **se guarda
   sola**.
3. **Paso 3 · Productos**: del catálogo (`Menús` con *Cotización = sí*), en
   dos filas: Menús (son gente) y Extras y arriendo. El precio se propone y
   se negocia; descuento por línea y sobre el total; IVA estándar (líneas en
   neto, abajo neto, IVA 19% y total). Reglas en `prepararLineas()`
   (`lib/cotizar.ts`), la misma función en pantalla y servidor: un producto
   va una sola vez, solo los Menú suman personas, el show va incluido a $0 en
   un día público y con mínimo $100.000 + IVA en un privado bajo 25 personas.
   Con arriendo pregunta si el día es **exclusivo**.
4. **Paso 4 · Envío**: documento (boleta, factura o sin documento),
   condiciones (anticipo 30% y saldo 3 días antes por defecto, editables),
   cobros del cliente con comprobante a Drive (los revisa pagos), mandarla
   por WhatsApp o correo → *Enviada*, y desde ahí corre la vigencia (15
   días). **Solo lo mandado cuenta como gente posible en el calendario
   principal**, y **nunca ocupa cupo**.
5. **Paso 5 · Contrato**: datos legales, horario, Ley 20.393, acuerdos,
   cambios de fecha y cancelación; se imprime desde `/contrato/<token>`, se
   firma en papel y **se sube el firmado** a Drive.
6. **Ganar** (`/api/presupuestos/convertir`): pide anticipo pagado **o**
   contrato firmado (`puedeGanar()`); sin ninguno de los dos pregunta en
   serio y la reserva nace *sujeta a espacio*. Comprueba el cupo
   (`cupoParaGanar()`) y la exclusividad. **Escribe primero la reserva y
   después el vínculo** (`ID Reserva`): si falla lo segundo, se ve doble y se
   nota; al revés, la gente desaparecería sin que nadie se entere. La reserva
   (`reservaDesdePresupuesto()`) lleva el **total negociado**, solo las
   líneas con personas en `Menú`, y su estado sale de los cobros
   (`pagoPorCobros()`). Abre el día si hace falta (como privado). Las otras
   alternativas pasan a *No elegida* y sus cobros a la ganadora.
7. **Después**: editar la ganada reescribe su reserva
   (`sincronizarReserva()`); esa reserva **no se edita a mano** salvo lo del
   día. Cancelar calcula la devolución; *Corregir la ganada* deshace.
8. **En la recepción y la página del día**, la caja *Cómo ingresarla en Fudo*
   muestra lo acordado línea por línea con su valor en Fudo con IVA.

Estados: **Candidato → Borrador → Enviada → Negociación → Ganada / Perdida
(con motivo) / No elegida**; *Vencida* se deduce de la fecha.

### C. Cómo se calcula lo de cada trabajador

- **Un turno** (`pagoDe()` en `lib/equipo.ts`): si vino, **jornada** (cero
  si es contratado) **+ horas extra × valor hora + ajustes**, nunca bajo
  cero. Sin marcar o *No vino*, cero. Un ajuste fuera de turno
  (`Ajustes sueltos`) suma tal cual, también negativo.
- **Un extra**: su monto más sus ajustes, si vino.
- **La propina** (`repartirPropina()`, la regla vive solo ahí): el encargado
  escribe el **total del día** y se reparte **en partes iguales entre quienes
  vinieron y participan** (`Participa en propina`, en blanco = sí; quien no
  tiene ficha participa). **Hasta el último peso**: el resto va de a un peso a
  los primeros. **Se guarda la parte de cada uno en su turno**, no el pozo.
  **La propina no es sueldo**: no entra en `pagoDe()` ni en el costo del día,
  va en su columna, y nunca en la boleta.
- **Cerrar el día** lo congela; después se corrige: el panel arma la lista
  de lo que cambió, se confirma con una casilla y queda en la bitácora.
- **El informe** suma por periodo (día, semana, mes, rango); **pagos**
  registra lo transferido (`Pagos`, sueldo y propina por separado) y marca
  boletas.
- **La boleta** (`lib/boletas.ts`): el neto es el sueldo o servicio sin
  propina; **un *Adelanto* no la baja**, lo demás sí; el **bruto** es
  `neto ÷ (1 − tasa)` redondeado hacia arriba, con la tasa de la **Ley
  21.133 del año en que se emite** (15,25% en 2026, 16% en 2027, 17% desde
  2028). Una boleta cubre días, así que se puede boletear por semana o por
  mes. Un contratado no tiene caja; un socio factura con IVA.

### D. Cómo se calcula una comisión

`comisionDe()` en `lib/vendedores.ts` (modelo A, elegido por el cliente):

```
comisión = % de la etapa × base del evento
         + puntos de bono × base de las líneas de productos con "Bono vendedor"
         + monto por evento
```

- **Etapas por personas del evento**: rige la más alta que alcance. Bajo
  el *desde* de la etapa 1 no hay comisión.
- **La base** es el neto (sin IVA) o el total, según la ficha. Va en %, así
  que un descuento baja la comisión.
- **Con un socio comercial**: el socio cobra **su comisión completa**,
  aparte, según su trato (de partida **5% desde 22 personas, 10% desde 55 y
  15% desde 77, sobre el neto**); el vendedor cobra **un % de su propia
  comisión** (`Con socio cobra %`, 50% de partida).
- **Se congela** cuando el cliente terminó de pagar **y pagos revisó los
  cobros** (`congelarComision()`), en `Comisión vendedor` / `Comisión socio`
  con la frase de cómo se calculó. Desde ahí no cambia aunque cambie la
  ficha.
- El **sueldo fijo mensual** entra a fin de mes. Se paga desde el informe,
  con boleta o factura según el documento de la ficha.

---

## 4. Lo que se hizo en esta conversación (19 al 21-11-2026)

### Mergeado a `main`

| PR | Qué |
|---|---|
| #262, #263 | Migración: el repo pasó a `ayc-y-blp/aycyblp`, el panel al equipo *Ayc y Blp* de Vercel (pagado), `main` protegida |
| #264 → #267 | **Incidente**: un `.vercelignore` en la raíz dejó el panel en 404 de 16:59 a 17:41 UTC; se retiró de urgencia. Lección en sección 6 |
| #265 | El sitio abre en la **vista diurna** |
| #266, #268 | El sitio como proyecto propio `brasas-sitio`, con `tools/publicar_sitio.sh` y dos chequeos por PR |
| #269, #272 | Variables del panel separadas por entorno (Preview contra la planilla "Pruebas") y el secreto de los webhooks |
| #270 | El repo queda público, a propósito |
| #271 | Redirecciones 301 de las direcciones del sitio viejo |
| #273 | **Dos tiendas**: la real solo en la dirección real |
| #274 | Lo acordado en una cotización, en la caja de Fudo |
| #275 | La pastilla de lo pendiente se dobla en el teléfono |
| #276 | Mínimo del show en un día privado chico; menús y extras en dos filas |
| #277 | Ajustes del día: **− Descontar / + Sumar**, con motivo y medio |
| #278 | Boletas: bruto, neto, retención y filtro *Sin boleta* |
| #279 | Regla de los dos caminos para mergear desde el lanzamiento |
| #280, #281 | Vendedores y socios como lista de tarjetas con buscador; agregarlos con su boleta o factura |
| #282 | El dominio en Cloudflare y `panel.brasasdelopirque.cl` |
| #283 | **Tienda real conectada**; token por credenciales del Dev Dashboard; el webhook descarta sin leer la planilla; fuera los formularios de novedades (no guardaban nada); `robots.txt` y `sitemap.xml` |
| #284 | A la tienda solo lo que Shopify muestra sin su tema (pedidos, checkout, carrito con código) |

### PR #285, mergeado el 21-11-2026 (camino *con prueba*, con el OK del cliente)

| Commit | Qué |
|---|---|
| `81b9912`, `392288a` | Datos de transferencia en el orden y formato del formulario del banco; copiar solo los valores, uno por línea |
| `40eead5`, `daff068`, `b1796e3` | **Ajuste desde el informe** (− Descontar / + Sumar en la tarjeta del trabajador, con permiso `pagar`), *Hoy* fuera de turno en la pestaña nueva `Ajustes sueltos` |
| `2a380fa` | Informe ordenado (con plata / falta marcar / sin nada), filtro *Sin marcar*, bordes de 3px, celular un 10-15% más chico, transferencia masiva plegada |
| `bc1b425` | **Estadísticas del equipo**: sueldos por puesto, propinas y ventas |
| `2785bb7`, `3a231ba` | Informe en el computador: ajuste arriba de los pagos, boleta compacta, **una línea por persona (62px)** y la tarjeta abierta entera en 1280×650 |
| `2afeb73` | **`TarjetaLista`**: una sola tarjeta para todas las listas que se abren; regla *un cambio de diseño se lleva a sus parecidos* |
| `d4927ba` | Los puestos de la ventana del equipo con `marcoGrupo` |
| `d7df3bb`, `7657ec3` | Se saca el aviso *Hay N turnos sin cerrar*: basta con el filtro *Sin marcar* |
| `119445d` | **`LineaDelDia`**: la misma línea para el equipo y los extras, más compacta; **los extras con varios ajustes** |
| `ab9403b`, `10549ab` | Turnos: el porqué de los días por cerrar va a su `?`; **el ajuste se guarda con ✓ Guardar y se pliega**; hoy con el fondo iluminado; reglas *la tarjeta cabe en una pantalla* y *lo que explica va en su `?`* |
| `da65844`, `8901445`, `2ebee77`, `7f2bfa3`, `bc622ad` | **Lo que explica, a su `?`**, en todo el panel (cuatro tandas) |

Archivos que toca: `CLAUDE.md`, `panel/CLAUDE.md`; en `panel/src/lib/`:
`ayudas.ts`, `banco.ts`, `boletas.ts`, `datos.ts`, `equipo.ts`,
`estadisticasEquipo.ts`, `extras.ts`, `misiones.ts`, `poderes.ts`,
`prueba.ts`, `remuneraciones.ts`; rutas `api/equipo/ajuste`,
`api/estadisticas`, `api/extras/dia`, `api/informe`, `mi/[token]`,
`bitacora`; `globals.css`; componentes nuevos `TarjetaLista.tsx`,
`LineaDelDia.tsx`, `AjusteInforme.tsx`, `EstadisticasEquipo.tsx`, y
cambios en `InformeEquipo`, `CajaBoleta`, `EquipoDialogo`, `ExtrasDialogo`,
`EquipoEditor`, `CalendarioExtras`, `CalendarioEquipo`, `FechaDia`,
`ClientesEditor`, `MenusEditor`, `ResumenVendedor`, `RecepcionVista`,
`DayView`, `ReservasDelDia`, `ReservaForm`, `MesaReserva`, `Correccion`,
`CotizacionDialogo`, `CotizacionesVista`, `Pendientes`, `BloqueSobrecupo`,
`AvisoSobrecupo`, `BloqueLiberar`, `BloqueCancelada`, `AgregarVendedor`,
`CamposDocumento`, `FichaTrabajador`, `FichaColaborador`, `ConfigEditor`,
`UsuariosEditor`, `VerComo`, `Cabecera`, `CalendarView`, `DiaEditor`,
`Estadisticas`, `Dialogo`; pruebas `ajuste.mjs`, `capturas-ayuda.mjs`,
`lecturas/google-falso.mjs`, `letra-chica.mjs`; y las fotos de
`public/ayuda/`. **Ninguna columna nueva salvo la pestaña `Ajustes
sueltos`; ningún permiso cambió.**

### PR #287, abierto (el cliente pidió *"déjalo en preview"*)

Lo pidió el cliente el 21-11-2026: *"se puede compactar todas las vistas en
el computador un poco más, sin perder la regla PlayStation y… el aspecto
jugable, intuitivo en el panel"*. Se midieron las 15 pantallas a 1280×650:
el título aparecía recién a los 202–209px. **Lo que sobra es aire entre
piezas, no tamaño de botones ni de letra.**

- **Capa 1, en este PR**: el marco común, **solo desde 1024px** (`lg:`). La
  barra baja de 109 a 97px, la tira *¿Primera vez acá?* de 61 a 49px y el
  margen sobre la página de 32 a 16px; el título de cada pantalla sube unos
  40px. Los botones del menú siguen en 36px y ninguna letra baja. **El
  celular y las páginas que se mandan afuera** (link personal, planilla
  semanal, cotización, contrato, entrada) **quedan igual**: la barra del
  panel lleva `data-marco="panel"` y el `<main>` sube solo cuando la ve.
- La capa 1 toca `layout.tsx`, `Cabecera`, `Recorrido` y `BandaSeccion`.
  Sin lecturas de Google, sin permisos, sin fotos de la ayuda que rehacer
  (se sacan a 400px de ancho).
- **Capa 2, en el mismo PR** (*"dale con la capa 2"*), pantalla por
  pantalla y también solo en el computador:
  - **Los calendarios de Reservas y Cotizaciones, con zoom** (*"demasiado
    ampliado todo… como hacer un zoom… que ninguna de las informaciones
    desaparezca"*): cinco tarjetas por fila, la de Reservas de 285 a 236px
    y la de Cotizaciones de 215 a 170, sin sacar ningún dato.
  - **Lo que ocupaba varias filas, en una** (*"esto puede ser una fila en el
    computador, un campo bien organizado… revisa si hay otros casos"*): el
    encabezado de la página del día es un solo campo con el día, el tiempo,
    *Al día*, *Qué preparar* y *Cómo viene el pago*; lo mismo en el equipo
    del día, Calendario, Cotizaciones, Recepción y Equipo. Configuración va
    en dos columnas y Cuentas con el rol en una fila.
  - **Los formularios, alineados** (regla nueva): en la línea del día del
    equipo y de los extras, todos los nombres miden lo mismo
    (`COLUMNA_ROTULO`) y los valores parten en la misma vertical. Esto vale
    también en el celular.
- **El celular mide lo mismo que antes** en las 15 pantallas. Sin lecturas
  de Google ni permisos; las fotos de la ayuda no cambian.
- **Los formularios alineados, en todo el panel** (commit `84a6267`): el
  `?` chico ya no mueve a sus vecinos (se ve de 24px y se aprieta en 36),
  `rejilla-campos` y `fila-ficha` para las fichas, *Correo comprobante* y
  *Hora extra* en un renglón, ***sin propina*** y ***sin jornada*** en la
  línea del día, y **+ Cliente nuevo** arriba en el paso 1 de cotizar.
- **Las ventanas caben en la pantalla del computador** (commit `0c01035`,
  *"todas las pestañas se pueden organizar para que queden dentro de una
  pantalla"*): `Dialogo` parte arriba en el computador; cotizar es ancha,
  con el paso 3 como tabla y el 4 en tres columnas con lo secundario
  plegado; el equipo del día en tres columnas parejas; y en columnas la
  reserva nueva, agregar vendedor, el trato, *Ver como*, *Comentar*,
  *Dejar la base en cero* y las fichas de cliente, producto y vendedor. La
  tabla con las medidas está en `panel/CLAUDE.md`, "Las ventanas caben en
  la pantalla del computador". **No cupieron dos**, las dos del equipo del
  día: con el formulario de un ajuste abierto (846px) y la cara de
  reservas, que es una lista (859px).
- **Corregir un día cerrado sin motivo escrito** (*"haz una casilla,
  confirmar, y luego la lista de los cambios… y luego guardar"*):
  `lib/correccion.ts` arma la lista, `PieCorreccion` la muestra con su
  casilla, y esa lista queda en la bitácora. En el equipo y en los extras.
- **`npm run ventanas`** (`pruebas/ventanas.mjs` y `alineacion.mjs`): 43
  escenas a 1280×650. Va dentro de `npm run revisar`.
- En el celular las ventanas miden lo mismo, salvo tres que bajaron unos
  pixeles a propósito (la ficha de un producto, el paso 5 de cotizar y la
  corrección). Sin lecturas de Google ni permisos. Las fotos de la ayuda se
  rehicieron todas.

---

## 5. Decisiones tomadas y por qué

Cada una tiene su sección con fecha en `CLAUDE.md` o `panel/CLAUDE.md`.

**Del sistema**

- **Shopify cobra, el panel agenda.** Se descartaron **Cowlendar y toda app
  de reservas** (13-10-2026): ninguna se integra por API al 100% con el
  diseño del sitio, y un widget de terceros rompe la identidad visual y la
  regla de cero JS. La pregunta *"¿y si instalamos una app?"* está contestada
  mientras el requisito sea integración por API.
- **El Apps Script se jubiló** (21-10-2026) por el panel en Next.js: los Web
  Apps no dan cabeceras (imposible verificar el HMAC de Shopify), una
  pestaña de Sheets no tiene botones y sus diálogos fallaban.
- **Webhook + reconciliación diaria**, las dos: más robusto que cualquiera
  sola.
- **Google Sheets como base**, porque es la planilla del cliente, legible
  por una persona. **Una planilla por empresa** (Calicanto tendrá la suya) en
  vez de una columna *empresa* en todo: así no se pueden mezclar el cupo ni
  las reservas de dos recintos.
- **Las cotizaciones en el panel**, no en el CRM del socio (10-11-2026): el
  CRM tenía errores de lógica y otra base de datos. La conexión está
  apagada; el código queda.
- **Dos tiendas, la real solo en la dirección real** (20-11-2026): una
  versión de prueba nunca puede cobrar. Olvidarse de algo cae en la de
  prueba.
- **Repo público** (19-11-2026) entre tres opciones: privado costaba la
  protección de `main` o GitHub Team, cambiar el autor de los commits para
  Vercel y apagar GitHub Pages.
- **`main` protegida sin chequeos obligatorios**: con Vercel obligatorio, un
  Vercel desconectado bloquea todos los merges.
- **El sitio publica una lista de lo público** (`publicar_sitio.sh` →
  `.vercel/output`), no una de lo privado: lo que no está en la lista no
  sale. El `.vercelignore` se descartó porque Vercel lo aplica también al
  panel.
- **Sin www**, al revés de lo que propone Vercel, porque así están los
  `hreflang` y las redirecciones.
- **Los pedidos del sitio viejo para fechas futuras se anotan a mano**
  (21-11-2026); no se le enseña al panel a leer el modelo viejo (una
  variante por fecha).

**Del sitio**

- **Cero JavaScript para interfaz**, con tres excepciones decididas que no
  sientan precedente: `reserva.js`, `idioma.js` y `tema.js`. Menú,
  tarjetas que giran, carruseles y selector de idiomas son CSS o
  `<details>`.
- **Tres idiomas generados por `traducir.py`** en vez de duplicar a mano
  (tres ediciones por cambio) o un selector en JS (rompe la regla y Google
  indexa solo el español).
- **`?v=` con el hash del archivo** en cada asset: arregla el error del
  14-10-2026 en que un `reserva.js` viejo en caché dejaba el calendario
  vacío sin un error en consola.
- **Un solo lugar para los precios**, `precios.json`, con una guarda que se
  niega a generar si encuentra un precio escrito a mano.
- **Sugerir idioma, no redirigir** (Google lo desaconseja y atrapa).
- **La vista diurna abre** (19-11-2026, antes de publicar el dominio, que era
  el momento barato); la noche queda a un toque.
- **Los adultos van todos al mismo menú** (02-11-2026), garantizado por la
  forma del formulario: no hay un segundo contador.
- **Paneles plegables `<details>`** en los landings en vez de una ventana a
  pantalla completa (sin JS no hay Escape, foco ni botón Atrás).
- **Los formularios de novedades se sacaron** (21-11-2026): descartaban el
  correo y quien lo dejaba creía que quedó anotado.

**Del panel**

- **Quien paga tiene preferencia** (12-11-2026): una reserva sin pagar
  queda sujeta a espacio; antes, reservas sin un peso podían dejar a quien
  paga con "no hay cupo".
- **Lo cotizado nunca ocupa cupo**: es una tercera categoría (*todavía no se
  sabe*), en su propio color (rosado), y lo apaga tener reserva, no la
  palabra *Aceptado*.
- **El precio de una cotización se propone, no se impone**, y al ganar pasa
  el negociado.
- **PDF con `window.print()`** en vez de una librería en el servidor
  (megas, fuentes, triple trabajo), y el link sigue vivo.
- **Comprobantes en Google Drive**, no Vercel Blob, porque el dominio del
  correo es Google Workspace.
- **El contrato se firma en papel y se sube el firmado**: que esté subido es
  lo que dice *firmado*.
- **Comisión modelo A**, elegido entre tres: etapas + bono premium + monto
  por evento.
- **La propina en partes iguales**, guardando lo repartido.
- **La tasa de retención en el código**, como el IVA: la fija la ley, no el
  cliente.
- **El ajuste fuera de turno en su propia pestaña**, no en `Turnos`: un turno
  inventado le habría quitado propina a los que vinieron.
- **Autoguardado por defecto**, y se confirma a mano solo una lista cerrada
  de casos (sección 9).
- **Las piezas compartidas** (`TarjetaLista`, `LineaDelDia`, `Pastilla`,
  `FechaDia`, `CajaBoleta`…) en vez de copias: un cambio llega solo a todas
  partes.
- **Los extras guardan varios ajustes en las mismas dos columnas** de
  siempre, con el formato de `Turnos`: ninguna columna nueva.
- **El aviso *Hay N turnos sin cerrar* se sacó** (21-11-2026): lo dicen el
  filtro *Sin marcar* y cada tarjeta.
- **Lo que explica va en su `?`** (21-11-2026): el equipo se capacita y el
  texto constante molesta.
- **El computador se compacta quitando aire, no achicando** (21-11-2026):
  solo desde 1024px, lo que cabe en una fila no se apila y se baja la
  separación; los botones no bajan de 36px (44 lo que se usa seguido) ni la
  letra de 13, y el celular tiene que medir lo mismo. En dos capas.
- **El zoom de los calendarios es con las tarjetas, no con la letra**
  (21-11-2026): cinco por fila y los números grandes a 22px. Seis por fila
  no cupieron: los botones del pie, con su ícono, piden más ancho.
- **Los nombres de los campos, en una columna de ancho fijo**
  (21-11-2026), en vez de que cada uno mida lo que su palabra: así los
  valores y los botones quedan alineados sin calcular nada.
- **Una regla que se puede medir es una prueba** (21-11-2026): *cabe en una
  pantalla* y *los campos van alineados* estaban escritas y dependían de
  acordarse; el cliente tuvo que marcar las ventanas una por una. Ahora las
  mide `npm run ventanas`, dentro de `npm run revisar`, y lo que todavía no
  cabe está anotado con su alto (`NO_CABEN`) y solo puede bajar.
- **Las ventanas se compactan en columnas y plegando lo que se llena una
  vez**, no con una barra de desplazamiento adentro: lo que no se ve en una
  lista con scroll propio se pierde. Si una lista crece más que la pantalla
  (las líneas de una cotización, la gente de un día), crece la ventana.
- **Lo plegado en el computador es una clase, no otro flujo**: en el celular
  los mismos campos siguen a la vista, así que ahí no cambió nada.
- **Los puestos del equipo se reparten en columnas con una cuenta fija**
  (`enColumnas()`), no con columnas que se balancean solas: al abrir una
  línea nada salta de lugar.
- **La corrección de un día cerrado guarda lo que cambió, no por qué**: cada
  cambio ya trae su porqué (un ajuste lleva su motivo). El servidor sigue
  rechazando una corrección sin ese texto.
- **El `?` chico se ve de 24px y se aprieta en 36**: a 30px agrandaba su
  renglón y corría el campo de al lado.
- **El encargado de turno no ve cotizaciones; el vendedor ve todo y toca lo
  suyo; el contacto de los clientes se recorta por rol en el servidor**
  (`lib/privacidad.ts`).

---

## 6. Problemas conocidos y lo que no hay que romper

### Sin resolver o asumido

- **Se puede sobrevender por un margen chico**: entre que alguien llega al
  checkout y paga, otro puede tomar los últimos lugares.
- **El panel no manda correos** (la confirmación es de Shopify) **ni
  cancela en Shopify**: una reserva soltada deja el pedido vivo allá, a
  cancelar a mano (la app no tiene permiso de escritura).
- **El idioma del checkout lo fija la tienda** y cambió dos veces en un día
  sin aviso: un visitante en inglés paga en español. Tres idiomas de verdad
  sería Shopify Markets.
- **Los pedidos del sitio viejo** con fecha posterior al lanzamiento **no
  descuentan cupo** hasta que alguien los anote a mano.
- **Límite de 60 lecturas por minuto** de Google para todo el panel; si
  vuelve a aparecer con uso normal, lo siguiente es pedir más cupo en Google
  Cloud (gratis).
- **Los `?` chicos se ven de 24px** y se aprietan en 36 (un área invisible
  alrededor): `revisarPlayStation()` los sigue listando, porque mide lo que
  se ve. **(Por confirmar)** si el cliente los quiere más grandes a la vista.
- **Dos ventanas no caben en 1280×650** y están anotadas en `NO_CABEN`: el
  equipo del día con el formulario de un ajuste abierto, y su cara de
  reservas. Las dos crecen con lo que tenga el día; con más gente o más
  puestos que el ejemplo, la de trabajadores también pasa de una pantalla.
- **Editar o borrar una reserva de un día cerrado sigue pidiendo un motivo
  escrito**: no se cambió con la corrección del equipo. **(Por confirmar)**
  con el cliente si también pasa a casilla y lista.
- **Varias piezas se dibujan dos veces en el HTML** (una para el celular y
  otra para el computador): en una prueba se pide la que se ve
  (`button:visible`, `locator('visible=true')`).
- **Queda letra bajo 13px heredada** en algunos archivos, anotada en `HABIA`
  de `pruebas/letra-chica.mjs`: solo puede bajar.
- **Las traducciones al inglés y portugués no las revisó un hablante
  nativo.**
- **El recargo de *Solo reserva* del menú de pequeños es $3.000**, no
  $5.000 como los otros: lo fija la tienda. **(Por confirmar)** si fue a
  propósito.
- **Supuesto sin confirmar**: que el mínimo de 25 personas no rige para la
  venta directa del sitio.
- **El nombre del negocio no calza**: Maps dice *Lo Pirque Restaurant*, el
  correo es `@lopirque.cl`, el sitio *Brasas de Lo Pirque*.
- **La tarea diaria del CRM sigue programada** con la conexión apagada:
  retira lo publicado y no hace nada más (según `panel/CLAUDE.md`).
- **Desde el entorno de Claude Code no se abren** `brasas-sitio.vercel.app`,
  `panel.`, `tienda.` ni `lo-pirque.myshopify.com`, y Drive no deja bajar
  fotos. Se agregan en *Allowed domains* del entorno si hace falta.

### Lo que no hay que romper

- **Nada en la raíz del repo que configure Vercel** (`.vercelignore`,
  `vercel.json`): lo leen los dos proyectos. Así se cayó el panel 40
  minutos.
- **Después de mergear algo que toque cómo se despliega**, comprobar en
  producción: `/login` 200, `/api/publico/fechas` 200 y el webhook sin firma
  401 (`migracion-team/verificar.sh`). Si el panel no responde, se revierte
  primero y se investiga después. **Un chequeo verde de Vercel solo dice que
  construyó.**
- **El contrato del sitio con el panel**: `{fecha, quedan, pocos,
  quedanPagando, error}`. Cada campo nuevo es uno que cualquier backend
  futuro tendrá que imitar.
- **`_booking_date` (y `_cowlendar_date`) en cada línea del carrito**: es la
  única forma en que la fecha llega al pedido.
- **`tiendaDeEstaPagina()` y `CONFIG.direccionesReales`**: la tienda real
  solo en el dominio, `www` y `brasas-sitio.vercel.app`.
- **La firma del webhook**, y descartar sin fecha **antes** de leer la
  planilla.
- **Fechas como texto**, columnas por nombre y las nuevas al final.
- **`ID Orden`** es la llave de los pedidos; `MANUAL-…` las de a mano.
- **Una reserva que nace de una cotización no se edita ni se borra a mano.**
- **`en/` y `pt/` no se editan**: se corre `python3 tools/traducir.py` después
  de tocar el HTML, el CSS, el JS o `precios.json`, y se commitean las tres
  versiones juntas. Si cambia el dossier o un precio de empresa, también
  `node tools/dossier_pdf.mjs`. `--revisar` delata lo que quedó viejo.
- **Un precio cambia en `precios.json` y también en Shopify**: los menús se
  cobran con el precio de la tienda.
- **El nombre de un menú tiene que ser idéntico en `Menús` y en Shopify**
  (`canonizar()` perdona mayúsculas, tildes y espacios).
- **No cachear lecturas entre peticiones**: en Vercel cada ruta corre aparte
  y se leen datos viejos.
- **Los hooks de React van arriba, antes de cualquier `return`**, y **no se
  declara un componente dentro de otro** (se pierde el foco al escribir).
- **Una pestaña que se reescribe entera borra lo que sobra.**
- **Los permisos y el recorte de datos los hace el servidor**; la pantalla
  solo deja de dibujar.
- **Las claves**: nunca en el chat ni en el repo; van directo a la bóveda y a
  Vercel. **No apretar *Rotar*** en las credenciales de la app de Shopify ni
  ***Crear secreto nuevo*** en los webhooks. **No tocar la app *Sitio
  Brasas*.** No desinstalar ni reinstalar apps sin avisar. El token de
  Storefront es público; uno de Admin (`shpat_…`) jamás va en el sitio.
- **No se ponen datos personales** del cliente ni de sus clientes en el repo
  ni en pedidos a servicios externos. El Excel del CRM se sube al chat,
  nunca al repo.

---

## 7. Pendientes, en orden

| # | Qué | Siguiente paso concreto | Quién |
|---|---|---|---|
| 1 | **PR #287** (el computador más compacto, las ventanas y la corrección) | Esperar *"mergea"*. Entonces: los dos chequeos de Vercel en `success` para el último commit, mergear, comprobar el panel (`/login` 200, `/api/publico/fechas` 200, webhook sin firma 401) y poner la rama al día con `main`. La preview del panel se abre con la sesión de Vercel del equipo. **Va por el camino *con prueba***: toca cómo se corrige un día cerrado | Cliente decide; Claude mergea |
| 2 | **Lo que quedó de las ventanas** | (a) Preguntarle al cliente si **editar y borrar una reserva de un día cerrado** también pasan de motivo escrito a casilla y lista. (b) Las dos de `NO_CABEN` (el ajuste abierto en la línea de una persona, y la cara de reservas): solo si el cliente las marca. (c) Cuentas entre 1024 y 1279px, con la columna del rol angosta. (d) Lo que siga marcando con fotos desde la versión de prueba. Detalle en `panel/CLAUDE.md`, "Las ventanas caben en la pantalla del computador" | Claude propone; cliente decide |
| 3 | **Compras de prueba en la tienda real** | En `brasas-sitio.vercel.app`, una compra de cada modalidad (con Mercado Pago, según lo conversado): ver que llegue al panel con fecha, nombre, correo, teléfono y la modalidad; que la regla de medios de pago por SKU oculte el que no corresponde; después devolver | Cliente |
| 4 | **`SHOPIFY_DOMINIO` de Production** | **(Por confirmar)** que diga `lo-pirque.myshopify.com`; si no, ponerlo y hacer Redeploy; comprobar con *Revisar Shopify ahora* | Cliente |
| 5 | **El link de estado de un pedido viejo** | Abrir uno `brasasdelopirque.cl/<id>/orders/…?key=…` después del lanzamiento y ver que llegue a `tienda.` con su `?key=` | Cliente |
| 6 | **Base en cero** | Copiar la planilla real como respaldo; después *Configuración → Mantención → Dejar la base en cero*, cuando terminen las pruebas | Cliente |
| 7 | **Pedidos del sitio viejo** | Anotar a mano en el panel los de fechas posteriores al lanzamiento (el producto viejo vendía hasta el 27-12) | Cliente |
| 8 | **Lanzamiento** (domingo 22-11, en la noche) | En orden: (1) en Shopify, `tienda.` como dominio principal; (2) en Cloudflare, borrar el A de `@`, crear el CNAME a Vercel y cambiar `www`; (3) Vercel muestra *Valid Configuration*; (4) publicar el *Hydrogen Redirect Theme* con Hostname `brasasdelopirque.cl`, sin redirects ni cuentas (**recién después del DNS**); (5) comprobar: `tienda.` lleva al sitio nuevo, el link viejo del producto a reservas, una compra abre el checkout en `tienda.`, *ver pedido* abre; (6) sacar *Menú Tradiciones* de Tienda online; (7) borrar los webhooks de la tienda de desarrollo. **Vuelta atrás**: los registros a sus valores de antes y `brasasdelopirque.cl` de nuevo como principal | Cliente, con Claude |
| 9 | **Después del lanzamiento** | Links en Maps, Instagram y WhatsApp; enviar el sitemap en Google Search Console; productos en Fudo; mirar en Vercel → Logs que las tres tareas diarias corran en 200 | Cliente |
| 10 | **Importar el CRM** | El cliente sube el Excel **al chat** (nunca al repo); se diseña un importador en el panel, en un PR *con prueba*, que corre después de la base en cero | Cliente sube; Claude propone |
| 11 | **Política de privacidad y condiciones de reserva** | No existen; son del negocio y conviene que las vea un abogado. Anotado en la guía *Traspaso a producción* (documento fuera del repo) | Cliente |
| 12 | **Migración, pasos que quedan** | Pruebas a mano de punta a punta, respaldo de claves en la bóveda y apagar lo de la cuenta personal (`migracion-team/README.md`) | Cliente |
| 13 | **Decisiones abiertas** | Si un contrato firmado sin pago da preferencia (gerencia); el recargo de pequeños; el mínimo de 25 en venta directa; el nombre del negocio en Maps; el desayuno y la once a $8.000 + IVA | Cliente |
| 14 | **En pausa por datos** | Video del hero (sigue vivo en el CDN de Shopify, 63 MB); logo en SVG recoloreable; fotos de cabalgatas y de la cancha de beach tenis; Calicanto y el contrato de matrimonio (Fase 5) | Cliente |

---

## 8. Convenciones del código

**Idioma**: todo en **español de Chile** —nombres, comentarios, commits,
PR, documentación—, con tuteo y sin voseo.

**Nombres**

| Qué | Cómo | Ejemplos |
|---|---|---|
| Funciones | verbo o sustantivo en español, camelCase | `leerReservas()`, `guardarLineas()`, `asegurarColumna()`, `pagoDe()`, `comisionDe()`, `esContratado()`, `puedeGanar()`, `tienePrioridad()` |
| Componentes | PascalCase, por lo que son | `BloqueSobrecupo`, `AvisoFijo`, `BotonGuardar`, `CalendarioEquipo`, `EquipoDialogo`, `ConfigEditor`, `TarjetaLista` |
| Constantes | MAYÚSCULAS | `HOJA_TURNOS`, `COL_RESERVAS`, `ESTADO_DIA`, `MOTIVOS_AJUSTE`, `MARCO_HOY` |
| Pestañas y columnas | constantes `HOJA_*` y objetos `COL_*`, nunca el texto suelto | `COL_TURNOS.ajuste` |

**Dónde va cada cosa**

- `src/lib/`: **lógica pura con pruebas** en `lib/prueba.ts` (`npm run
  prueba`). Las cuentas de plata, fechas, cupo, comisiones y boletas viven
  ahí, y la pantalla y el servidor usan **la misma función** (lo que se ve
  es lo que se guarda).
- `src/app/api/<área>/route.ts`: rutas delgadas. El patrón: leer la sesión
  → `puede(rol, 'permiso')` (si no, 403) → `conLecturas()` con la tanda de
  pestañas precargada → validar y **descartar los campos que el navegador no
  puede escribir** (token, `ID Reserva`, `Tipo Pago`, las marcas de pagos) →
  escribir → **bitácora**.
- `src/components/`: `'use client'`. Primero se busca la **pieza que ya
  existe** (tabla en `panel/CLAUDE.md`, "Coherencia").
- La planilla, solo por `lib/sheets.ts` (`leerHoja(hoja, fresco)`,
  `batchGet`, `conLecturas()`); para saber en qué fila escribir se lee
  fresco.

**Estilo**

- **Los comentarios dicen por qué**, con la fecha, la frase del cliente y la
  decisión en negrita (`**…**`), no qué hace la línea.
- **Plata en pesos enteros**, `Math.round`; el IVA sale de restar
  (`neto + iva === total` siempre); formato `'$' + n.toLocaleString('es-CL')`.
- **Tailwind con colores en variables CSS** (tema claro y oscuro):
  `bg-panel`, `text-hueso`, `text-oro`, `verde`, `rojo`, `ambar`, `cielo`,
  `rosa`, `morado`… Botones con `.boton`, `.boton-relleno`, `.tecla`
  (`globals.css`, capa de componentes); campos con `ENTRADA`.
- **Ayudas**: `AyudaCorta` con `tema` (texto en `AYUDAS_CORTAS` de
  `lib/ayudas.ts`) o con `titulo` + `children`; el `?` grande de cada
  pantalla en `AYUDAS`; las misiones en `lib/misiones.ts`.

**Cómo se prueba**

- `npm run revisar` en `panel/`: tipos, lógica, lecturas de Google, letra
  chica, comentarios, webhook, ajuste **y las ventanas**. **Antes de cada
  PR.** Tarda unos minutos más desde el 21-11-2026, porque levanta el panel
  de ejemplo.
- **`npm run ventanas`**: abre las 43 fichas y ventanas del panel de ejemplo
  a 1280×650 y falla si una no cabe o tiene un campo corrido. **Una ventana
  o una ficha nueva se agrega a `ESCENAS` de `pruebas/ventanas.mjs` en el
  mismo PR.** Con el panel de ejemplo ya andando, se corre directo y más
  rápido: `AYUDA_URL=http://localhost:3125 AYUDA_SESIONES=<carpeta>/sesiones.json
  node pruebas/ventanas.mjs [escenas]`. `VENTANAS_FOTOS=<carpeta>` deja una
  foto de cada una (es lo que se mira para reorganizar una ventana);
  `VENTANAS_ANCHO=393 VENTANAS_ALTO=740 VENTANAS_MEDIDAS=<archivo>` mide en
  el celular, para comparar antes y después; `VENTANAS_PLAYSTATION=1` lista
  lo de `revisarPlayStation()`.
- **El panel de ejemplo**, con una planilla en memoria:
  `AYUDA_TRABAJO=<carpeta> bash pruebas/ejemplo/capturas.sh --servidor` lo
  levanta en el puerto 3125 con las sesiones de cada rol en
  `<carpeta>/sesiones.json`. Copia el panel al arrancar: después de un
  cambio hay que reiniciarlo.
- **Playwright** a 393 y 1280 con `revisarPlayStation()` de
  `pruebas/playstation.mjs`, y **medir que una tarjeta abierta quepa en
  1280×650**.
- **Las fotos de la ayuda**: `bash pruebas/ejemplo/capturas.sh <escenas>`
  (con el servidor apagado). Si una escena no encuentra lo que busca, la
  ayuda quedó atrás. **Se sacan a 400px de ancho**: un cambio que rige solo
  desde 1024px (`lg:`) no las cambia.
- **En una sesión nueva en la nube**, `panel/node_modules` no existe: primero
  `npm ci` en `panel/`. Playwright es el del entorno, no el del panel: en un
  script propio se trae con `createRequire('/')('playwright')` y
  `NODE_PATH=$(npm root -g)`.
- **Antes de proponer un cambio de cómo se ve**, se puede probar en la copia
  que arma el panel de ejemplo (`<carpeta>/panel`), que no es el repo: sirve
  para mandar capturas de antes y después sin haber tocado nada.
- **Un cambio "solo del computador" se comprueba en el celular**: el largo
  de cada pantalla y de cada ventana a 393px tiene que salir igual que antes
  del cambio. Es la forma rápida de saber que ningún `lg:` se escapó. Para
  las ventanas: medir con `VENTANAS_ANCHO=393`, guardar los cambios con
  `git stash`, medir de nuevo y comparar los dos archivos.
- **El reloj del panel de ejemplo está fijo** (viernes 13-11-2026, 14:25 de
  Chile). Un script propio con Playwright tiene que fijar el del navegador
  igual (`ctx.clock.install`), o *hoy* no calza y React avisa en rojo.
- **El panel de ejemplo se apaga solo** si se lanza en segundo plano sin un
  tiempo largo. Las fotos de la ayuda se pueden sacar con el servidor de
  pruebas andando si van por otro puerto (`AYUDA_PUERTO=3126`).
- **El sitio**: `python3 -m http.server` y Playwright; `python3
  tools/traducir.py --revisar`.

**Git y PR**

- La rama la asigna cada sesión (`claude/…`). Se commitea y empuja a medida
  que se avanza, y **al terminar un lote se abre el PR en la misma pasada**.
- Commits en español: título *"Área: qué cambió"*, cuerpo con el porqué.
- **El PR dice qué cambió y por qué, en qué camino va (chico o con
  prueba), cuántas lecturas de Google cuesta, si cambió algún permiso y qué
  ayuda se actualizó**, con capturas.
- Si el PR de la rama ya se mergeó, lo nuevo va rebasado sobre `main` en un
  PR propio. Nunca commits nuevos sobre historia ya mergeada.
- **Cada cambio deja escrito en `CLAUDE.md` o `panel/CLAUDE.md` qué cambió y
  por qué**, con fecha y la frase del cliente.

---

## 9. Las reglas

Están completas en el bloque *"Reglas fijas"* al inicio de `CLAUDE.md` y en
`panel/CLAUDE.md`. Cuando el cliente dice *"regla: …"*, se anota ahí en la
misma pasada.

### Siempre

- **Proponer antes de aplicar.** Sin preguntar: leer, buscar, medir con
  Playwright, capturas en una carpeta temporal. **Con confirmación**:
  editar, commits, push, PR, todo lo que toque GitHub. Al proponer, decir qué
  archivos toca y qué efecto tiene.
- **No inventar datos del negocio** (precios, horarios, capacidades,
  direcciones): si falta, se pide; mejor un hueco visible que algo plausible
  y falso.
- **Español de Chile, tuteo, sobrio.**
- **Mostrar sin preguntar**: todo cambio que se ve se manda con capturas
  —computador y celular, y el estado que importa— en la misma pasada. Pocas
  preguntas: solo lo que de verdad decide el cliente.
- **Dos caminos para mergear desde el lanzamiento**: **chico** (textos,
  ayudas, colores) se mergea solo con los dos chequeos de Vercel en verde;
  **con prueba** (plata, la reserva o el pago en Shopify, el cupo, columnas
  nuevas, permisos) queda abierto y se manda el link de la preview hasta que
  el cliente diga *"mergea"*. Cada PR dice su camino; en la duda, con prueba.
  *"Déjalo en preview"* pone cualquier PR en con prueba. Un arreglo urgente
  de algo roto en producción va directo, avisando.
- **Coherencia**: el mismo tipo de dato con la misma pieza y el mismo peso
  en todas las pantallas; puede cambiar el tamaño, no el formato.
- **Un cambio de diseño se lleva a sus parecidos**: en el mismo PR si es la
  misma pieza, o se le pregunta al cliente nombrando las pantallas.
- **La ayuda siempre al día**: lo que cambia algo que una ayuda describe la
  actualiza en el mismo PR (texto, captura, puntos).

### Panel: lúdico, estilo PlayStation

- **Lo que se aprieta se ve que se aprieta**: botones de **36px o más**
  (**44px** lo que se usa seguido; **40px en el celular**), **letra de 13px o
  más** donde hay un dato, se distingue por forma y no solo por color, **un
  solo botón relleno por vista**, y tres tamaños: hito, acción y secundario.
- **Flujos simples**: pocos pasos, botones a la vista en vez de
  desplegables, una frase que dice qué pasa al seguir.
- **Una tarjeta abierta cabe en una pantalla**: se mide en 1280×650 (y,
  donde se pueda, 393×740). Si no cabe sin romper la regla de arriba, gana
  la de arriba y el PR dice cuánto mide. **Lo mide `npm run ventanas`**, y
  una ventana nueva se agrega a sus escenas en el mismo PR.
- **Lo que explica va en su `?`**, no fijo en la pantalla. A la vista, el
  dato y la acción; un texto que se lee una vez puede ser `AvisoFijo` (con
  ✕).
- **Los formularios van alineados** (21-11-2026): los nombres de los campos
  en una columna y los valores en otra, todos partiendo en la misma
  vertical; nunca un campo pegado a su nombre porque la palabra es más
  corta. Se mira con una captura antes de cerrar el cambio, y lo mide
  `revisarAlineacion()` dentro de `npm run ventanas`.
- **Elegir de una lista que crece se hace con buscador** (`BuscarEnLista`):
  el botón directo y otro que abre la lista. Nunca un botón por persona.
- **Autoguardado por defecto**, con *Guardando… / ✓ Guardado /
  Reintentar*. **Se confirma a mano solo** lo que mueve plata, toma o libera
  cupo, cierra o corrige un día, aprueba o rechaza, le llega al cliente,
  borra o saca a alguien, toca cuentas, roles o links, o renombra algo que
  otros usan (y la Configuración).
- **Las lecturas de Google son un presupuesto**: 60 por minuto para todo el
  panel. Nada nuevo lee por su cuenta: se suma a la tanda que la ruta
  precarga (`conLecturas()`), y el PR dice cuánto cuesta (`npm run lecturas`
  lo fija).
- **Los permisos los comprueba el servidor.**
- **La plata la cierra el encargado de pagos**: anotar y respaldar es de
  quien corresponde; **confirmar** (revisado, pagado, devuelto) es del
  permiso `pagar`, a su nombre. Sin frenar el trabajo de los demás. No se
  cambia un permiso de plata sin que el cliente lo diga.
- **Antes del PR**: `npm run revisar` (con las ventanas adentro),
  Playwright a 393 y 1280 con `revisarPlayStation()`, *¿cambió algo que una
  ayuda describe?* y, si se creó una ventana o una ficha, *¿está en
  `ESCENAS`?*

### Sitio y landings: elegante y sobrio

- Fotografía real como protagonista (solo fotos del negocio, sin stock),
  **Fraunces** y **Work Sans**, dorado sobre papel tibio de día y sobre negro
  de noche, **sin signos de exclamación ni superlativos**.
- **Cero JavaScript para interfaz** (las tres excepciones no sientan
  precedente).
- **Lo que edita el cliente vive en un solo lugar**: los precios en
  `precios.json`, los textos en el español de la raíz.
- **El sitio público vende dos experiencias** (Tradiciones y A Brasas
  abiertas, IVA incluido); **los landings de empresa, tres** (Lo Pirque,
  Brasas, Sommelier, **+ IVA**).

---

## 10. Mantener este archivo

Al terminar cada etapa, se actualiza **este archivo**: el estado (sección
0), lo hecho (4), las decisiones nuevas (5), los problemas (6) y los
pendientes (7). Es el mapa: corto donde puede, y con el detalle en la
sección de `CLAUDE.md` o `panel/CLAUDE.md` a la que apunta.
