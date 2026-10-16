# El mismo dominio, en Postgres — prueba de concepto

**Esto no reemplaza nada.** `backend/Codigo.gs` sigue siendo lo que corre.
Esta carpeta existe para contestar una pregunta concreta que apareció el
2026-10-15: *¿cuánto del backend es lógica de negocio portable y cuánto era
plomería de Apps Script?*

## Cómo correrla

```
npm install @electric-sql/pglite
node backend/pg/prueba.js
```

PGlite es Postgres compilado a WASM: corre dentro de node, sin servidor ni
Docker. **El repo sigue sin dependencias**: si PGlite no está instalado, la
prueba lo dice y se salta en vez de fallar.

Se validó contra **PostgreSQL 18.6**.

## El resultado

Las **30 aserciones** son las mismas reglas que fija `backend/prueba.js`, con
el enunciado sin tocar. Pasan contra Postgres de verdad.

| | Apps Script | Postgres |
|---|---|---|
| Las 18 funciones portadas | **279 líneas** | **119** de JS + **31** de SQL |

La diferencia no es que el código nuevo esté más apretado. Es que **tres
cosas que antes había que escribir y recordar ahora las sostiene el motor**:

### 1. El tercer estado de `abierta`

En la planilla, una celda en blanco significa *"no opino sobre si abre, solo
le cambio el cupo"*, y hay que interpretarla:

```js
var txt = sinTildes(String(filas[i].abierta || '')).trim().toLowerCase();
var abierta = txt === '' ? null : txt.charAt(0) === 's';
```

En Postgres es el tipo de la columna —`boolean` que admite `NULL`— y la
regla entera cabe en un `COALESCE`:

```sql
WHERE COALESCE(e.abierta, EXTRACT(dow FROM dia.fecha)::int = ANY($4::int[]))
```

### 2. La idempotencia

`sincronizarPedidos()` lee la pestaña completa con `pedidosYaAnotados()` para
saber qué pedidos ya anotó. Con `pedido text UNIQUE` eso deja de ser una
comprobación que hay que acordarse de hacer: el motor no deja romperla.

La prueba lo fija — el mismo pedido dos veces no duplica la fila, y sí pone
al día su estado.

### 3. Los datos imposibles

Dos cosas que hoy entran sin avisar y la prueba demuestra que el motor
rechaza:

- **`'Pagada'` con mayúscula.** Hoy se cuenta como *por pagar*, en silencio,
  y el panel muestra una deuda que no existe. El `CHECK` lo rechaza.
- **`2026-02-31`.** Como texto pasa; como `date` no existe.

## Sobre las fechas

`CLAUDE.md` pide tratarlas como texto `AAAA-MM-DD` de punta a punta para que
una reserva hecha de noche no caiga en el día equivocado, y la razón es
correcta. **Pero el peligro es `TIMESTAMP`, que arrastra zona horaria, no
`DATE`**: una `date` de Postgres es una fecha de calendario sin hora ni zona,
que es exactamente la semántica que se quería — y además rechaza un 31 de
febrero.

La regla se mantiene en el borde: **todas las consultas devuelven
`to_char(fecha,'YYYY-MM-DD')`**, así que a JavaScript nunca le llega un
objeto `Date`.

## Lo que esta prueba NO demuestra

Para no sacar más conclusiones de las que aguanta:

- **No está el panel de administración.** Era el dolor original y es trabajo
  aparte: el editor de tablas de Supabase, Retool o Directus.
- **No está la integración con Shopify.** `leerReserva()`, `estadoDe()` y
  `telefonoDe()` son JavaScript plano y se portan tal cual, pero no se
  tocaron acá.
- **No está Google Calendar.** Pasa de `CalendarApp` (3 líneas) a una llamada
  API con OAuth: es el pedazo que *se vuelve más caro* al migrar, y conviene
  tenerlo presente.
- **No hay autenticación, ni Row Level Security, ni despliegue.** La política
  que hoy hace `fechasAbiertas()` —el sitio recibe menos— se puede volver RLS
  sobre una vista, y ahí deja de ser una promesa del código. No se hizo acá.
