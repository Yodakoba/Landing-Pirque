# Panel de reservas

Panel de administración interno para **Brasas de Lo Pirque**. Next.js 14 con
App Router, Google Sheets como base de datos vía la API v4 con service
account, y Tailwind.

Construido a la especificación entregada el 2026-10-15: las cuatro vistas, la
estructura de hojas y el stack son los pedidos.

## Levantarlo

```bash
cd panel
npm install
cp .env.example .env.local     # y llenarlo, ver abajo
npm run dev                    # http://localhost:3000
```

### La service account, paso a paso

1. En **Google Cloud Console** → *APIs y servicios* → habilitar **Google
   Sheets API**.
2. *Credenciales* → *Crear credenciales* → **Cuenta de servicio**.
3. En la cuenta creada: *Claves* → *Agregar clave* → **JSON**. Se descarga un
   archivo.
4. De ese JSON salen `client_email` y `private_key`, que van a `.env.local`
   como `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_PRIVATE_KEY`.
5. **Compartir la planilla con ese correo, como editor.** Es el paso que más
   se olvida: sin él la API responde 403 aunque las credenciales estén bien.

Dos detalles que hacen perder una tarde:

- La clave privada lleva saltos de línea. En un `.env` van como `\n`
  literales y entre comillas; `sheets.ts` los deshace al cargarla.
- `GOOGLE_SHEET_ID` es el tramo de la URL entre `/d/` y `/edit`.

## Si el panel se ve vacío

**Abre `/api/diagnostico` antes que nada.** Dice si las dos hojas existen,
qué encabezado tienen y **qué columnas no calzaron**.

Existe porque el modo de falla natural de leer una planilla por nombre de
columna es quedarse callado: si un encabezado no coincide, la columna se lee
vacía y el panel se ve perfecto con datos que no están.

### Los nombres de columna

Están todos en **`src/lib/columnas.ts`**, en un solo lugar. Si los
encabezados reales de la planilla no dicen exactamente lo que ahí aparece,
**ese es el único archivo que hay que tocar.**

La comparación normaliza mayúsculas, espacios **y tildes**, así que `Menu`
encuentra a `Menú`. Eso es a propósito: el Apps Script que escribe la planilla
normaliza mayúsculas y espacios pero **no** tildes, así que para él son
columnas distintas. El panel acepta las dos.

Hojas y columnas esperadas:

| Hoja | Columnas |
|---|---|
| `Reservas` | ID Orden · Fecha Reserva · Nombre · Email · Teléfono · Menú · Personas · Monto · Tipo Pago · Estado Pago Shopify · Creada |
| `Fechas Hábiles` | Fecha · Capacidad Máx · Hora Apertura · Estado · Notas |

## Las vistas

| Ruta | Qué hace |
|---|---|
| `/` | **CalendarView** — próximos fines de semana con ocupación, semáforo y el desglose online / paga en el local |
| `/dia/AAAA-MM-DD` | **DayView** — las reservas del día, filtro por tipo de pago y exportar CSV |
| `/fechas` | **FechasHabilesManager** — abrir, bloquear y cambiar capacidad |
| `/api/diagnostico` | si algo no calza, lo dice |

## Decisiones que conviene conocer

- **El semáforo**: verde bajo 60%, amarillo desde 60%, rojo desde 85% o si el
  día está bloqueado. Los cortes están en `CORTES`, en `src/lib/ocupacion.ts`.
  Rojo empieza antes de lleno a propósito: a 51 de 60 ya no caben dos
  familias, y eso es lo que hay que ver de un vistazo.
- **Qué reserva ocupa lugar**: `refunded` y `voided` liberan el cupo.
  **`pending` NO**: el cliente viene igual y paga al llegar. Hay pruebas que
  lo fijan.
- **Una reserva creada acá lleva `ID Orden` = `MANUAL-<timestamp>`.** Los ids
  de Shopify son numéricos, así que no pueden chocar.
- **El formulario no pide el monto.** Los precios viven en Shopify y en el
  sitio; que el panel los fije sería una segunda verdad que mañana no
  coincide.
- **Las fechas se tratan como texto `AAAA-MM-DD`**, nunca como objetos
  `Date`: convertirlas hace que una reserva hecha de noche caiga en el día
  equivocado.
- **La vista marca «⚠ pago directo sin pagar»**, que es la combinación
  imposible: significa que la regla de Shopify que oculta medios de pago
  según el SKU no aplicó. Es la única forma de enterarse.
- **Los fines de semana que aún no están en la hoja se muestran igual**, como
  «sin definir», en vez de no aparecer. Así se ve qué falta por abrir.

## Las pruebas

```bash
npm run prueba
```

Corre con node a secas —sin instalar nada, sin red— porque la lógica que
puede romperse en silencio vive separada de las rutas: el semáforo, qué
reserva ocupa lugar, el escape del CSV, las fechas y el calce de encabezados.

## Lo que NO está probado

Para no sacar más conclusiones de las que aguanta:

- **Nada que toque Google Sheets se ejecutó nunca.** `sheets.ts` y `datos.ts`
  se escribieron contra la documentación de la API; desde el entorno donde se
  construyó esto no hay acceso a Google. La primera corrida real es la
  primera prueba de verdad, y `/api/diagnostico` es por dónde empezar.
- **Los componentes no se renderizaron.** No se instalaron las dependencias
  ni se levantó el servidor.
- **No hay autenticación.** Fue lo pedido («uso interno sin autenticación
  pública»). Mientras corra en `localhost` está bien. **Si se despliega en
  internet, va detrás de autenticación de verdad** — una URL difícil de
  adivinar no es una.

## Un riesgo conocido

El Apps Script que sincroniza los pedidos de Shopify **también escribe esta
planilla**. Son dos escritores sin bloqueo entre ellos: dos escrituras
simultáneas pueden pisarse y nadie se entera.

Con este volumen —reservas de fin de semana, no un flujo continuo— el riesgo
es bajo, pero es real y no se arregla desde acá. Si llega a molestar, la
salida está esbozada en `../backend/pg/`.
