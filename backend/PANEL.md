# Encargo: panel de administración de reservas

Este archivo es **el prompt corregido** para construir el panel. Está pensado
para pasárselo a alguien —o a un Claude— que no conoce el proyecto, así que se
explica solo.

Reemplaza a una versión anterior que circuló y que daba por ciertas **tres
cosas que no lo son en esta tienda**. Están marcadas abajo con ⚠, porque son
el tipo de error que produce un panel que se ve bien y no funciona.

---

## El encargo

Un panel de administración de reservas para **Brasas de Lo Pirque**, un
restaurante campestre en Pirque, Chile, que abre **sábados y domingos de 13:00
a 18:00**, una sola jornada por día, sin bloques de hora.

**Es solo para uso interno.** No se publica, no lo ve un cliente final.

### Las cuatro funciones

1. **Gestión de días hábiles** — abrir y cerrar días, y cambiarles el cupo.
   Ojo con el modelo, que no es una lista de fechas; ver más abajo.
2. **Reservas a mano** — crear y editar reservas que no vienen de la tienda
   (teléfono, WhatsApp, mesón).
3. **Vista de calendario** — los próximos fines de semana con la ocupación de
   cada día (*12/30 personas*) y un semáforo verde/amarillo/rojo. **No
   existe hoy.**
4. **Vista de día** — al elegir una fecha, el listado de quiénes vienen, con
   filtros por estado de pago y **exportación a CSV**. La lista existe; los
   filtros y el CSV **no**.

---

## Lo que ya existe, y cómo funciona de verdad

Hay un backend en Google Apps Script pegado a una planilla del cliente. El
panel tiene que convivir con él o reemplazarlo, no ignorarlo.

### ⚠ 1. Los pedidos NO llegan por webhook

Es lo primero que suele asumirse mal. **No hay `doPost` en el backend.** Los
pedidos llegan porque un activador de tiempo corre cada 5 minutos y
`sincronizarPedidos()` **le pregunta** al Admin API de Shopify
(`/admin/api/<version>/orders.json`) por los pedidos nuevos.

La razón es estructural: **los Web Apps de Apps Script no dan acceso a las
cabeceras HTTP**, así que es imposible verificar la firma HMAC con la que
Shopify firma sus webhooks. Sin eso, cualquiera que descubriera la URL podría
inventar reservas.

Y hay una trampa: **un webhook apuntado al Web App no hace nada, pero Shopify
lo da por entregado igual**, porque Apps Script responde 200 aunque la función
no exista. Si aparece uno configurado en la tienda, hay que borrarlo.

Si el panel se construye sobre una plataforma que **sí** lee cabeceras
(cualquier servidor normal, o una Edge Function), el webhook pasa a ser
posible y se acaban los 5 minutos de atraso. Es una de las ganancias de migrar.

### ⚠ 2. El nombre, el correo y el teléfono NO llegan

Comprobado contra la tienda el 2026-10-14: el pedido #1007 llegó con sus tres
líneas y su total, **y sin nombre, correo ni teléfono**. Shopify los trata como
*protected customer data* y hay que pedirlos aparte en la configuración de la
app; el permiso **necesita plan pagado**, y la tienda actual es de desarrollo.

Dos cosas prácticas:

- **El panel debe funcionar con esas tres columnas vacías.** No las uses como
  identificador ni las pongas como obligatorias: se van a llenar solas en
  producción, sin tocar código.
- **La censura se ve OMITIENDO la llave, no poniéndola en `null`** — al revés
  de lo que uno supondría. En #1007, `shipping_address` vino en `null`
  (correcto: una reserva no tiene envío) mientras que `customer` y
  `billing_address` traían datos **sin las llaves** de nombre, correo y
  teléfono. Sirve para distinguir "falta un permiso" de "ese pedido no tenía
  el dato".

### ⚠ 3. Las fechas son REGLA + EXCEPCIONES, no una lista

No hay una lista de fechas disponibles que se administre una por una. Hay:

- Una **regla**: qué días de la semana se abre (`dias_abiertos`), con qué cupo
  (`cupo_normal`) y hasta cuántos días hacia adelante (`dias_a_futuro`).
- Una tabla de **excepciones**, solo para lo que se sale de la regla.

La tabla de excepciones cubre tres casos con una sola fila por día:

| `abierta` | Significa |
|---|---|
| sí | abre un día que la regla cierra (un 18 de septiembre) |
| no | cierra un día que la regla abre (un evento privado) |
| **en blanco** | **"no opino sobre si abre, solo le cambio el cupo"** |

Ese tercer caso es el que se suele perder al reimplementar. En el código es
`null` y no `false`, y tiene que seguir siéndolo.

**Administrar fechas una por una es exactamente el diseño que se descartó**:
serían unas 104 filas al año. Con regla + excepciones son un puñado. Si la
tabla de excepciones crece hasta tener un día por fila, el diseño se rompió.
Hay nueve pruebas que fijan estas reglas.

Al escribir una excepción: **volver un día a su estado normal BORRA su fila**,
y un cupo igual al general no se escribe.

### ⚠ 4. El estado de pago son DOS campos, no uno

Suele proponerse un solo campo con *Pagado online / Paga en el local /
Pendiente*. En la planilla son dos columnas separadas, **a propósito**:

- **`modalidad`** — qué compró: *pago directo* (pagó en línea, con descuento)
  o *solo reserva* (paga en el local, $5.000 más por menú).
- **`estado`** — en qué está: `pagada`, `por pagar` o `cancelada`.

Por qué importa: la tienda tiene reglas que **ocultan los medios de pago según
el SKU del carrito**, para que quien compró la variante con descuento no pueda
después elegir pagar en el local. Esa regla es del lado de Shopify y **si deja
de aplicar no avisa**.

La única forma de enterarse es ver una fila que diga **«pago directo / por
pagar»** — una combinación imposible si la regla funciona. **Con un solo campo
esa señal desaparece.** El panel debería, de hecho, marcar esas filas.

Y `cancelada` no puede faltar: **una reserva cancelada libera su cupo, una por
pagar no.**

### El cupo

Son **personas totales, niños incluidos**: es lo que limita sillas, mesas y
comida. Una reserva de 2 adultos y 1 niño ocupa 3 lugares.

### Las fechas, como dato

Se tratan como **texto `AAAA-MM-DD` de punta a punta**, nunca como objetos
`Date`. No es purismo: convertirlas en algún paso hace que una reserva hecha
de noche en Chile, o desde Brasil, caiga en el día equivocado — y eso aparece
en una de cada tantas reservas, que es la peor forma de aparecer.

Si se usa Postgres, el tipo `date` **sí** sirve (es una fecha de calendario,
sin hora ni zona) siempre que las consultas devuelvan
`to_char(fecha,'YYYY-MM-DD')` en el borde. Lo que no sirve es `timestamp`.

---

## La decisión de base de datos

Las dos opciones, con su costo real.

### Opción A — seguir en Google Sheets, vía Sheets API

**A favor:** no hay que migrar nada. El cliente conserva la planilla, que
entiende, y sirve de respaldo. Cero costo de infraestructura.

**En contra, y esto es lo que hay que pesar:**

- **Quedan DOS escritores sobre la misma planilla** —el Apps Script que
  sincroniza y el panel nuevo— **sin ningún bloqueo entre ellos.** Dos
  escrituras simultáneas se pisan y nadie se entera.
- La Sheets API tiene **cuotas por minuto**, y cada filtro es leer el rango
  completo: filtrar y ordenar se hacen en memoria, no en la base.
- **Nada valida los datos.** Un `'Pagada'` con mayúscula se cuenta como *por
  pagar* en silencio, y el panel muestra una deuda que no existe.

### Opción B — Postgres

**Ya hay una prueba de concepto hecha y verificada**, en `backend/pg/`:
esquema, la lógica portada y **30 aserciones corriendo contra PostgreSQL
18.6**. Son las mismas reglas que fija `backend/prueba.js`, con el enunciado
sin tocar. Las 18 funciones portadas pasaron de **279 líneas de Apps Script a
119 de JS + 31 de SQL**.

Lo que se gana no es código más corto, son tres cosas que **el motor sostiene
solo**:

- El tercer estado de `abierta` deja de ser una interpretación de texto y pasa
  a ser el tipo de la columna. La regla entera cabe en un `COALESCE`.
- La idempotencia la da `pedido text UNIQUE`, en vez de leer la tabla entera
  para saber qué pedidos ya se anotaron.
- Un `'Pagada'` con mayúscula y un `2026-02-31` **los rechaza el motor**. Hay
  una aserción por cada uno.

**En contra:** hay que migrar; el cliente pierde la planilla como respaldo
familiar (se mitiga con una exportación); y **la sincronía con Google Calendar
pasa de `CalendarApp` (3 líneas) a una llamada API con OAuth** — es el pedazo
que se vuelve más caro.

### Qué recomiendo

**Opción B**, y hacerlo **antes de difundir el sitio**: hoy no hay reservas
reales que migrar ni plata en juego, y ese es el momento más barato. Después
sigue siendo posible, solo deja de ser gratis.

El punto que inclina la balanza no es Postgres contra Sheets: es que el panel
va a ser un **segundo escritor**, y Sheets no tiene cómo coordinarlo.

---

## Restricciones

- **Panel interno.** No se publica. Si se despliega en internet, va detrás de
  autenticación de verdad — no de una URL difícil de adivinar.
- **El token de Admin API de Shopify (`shpat_…`) jamás llega al navegador.**
  Solo del lado del servidor. Da acceso a pedidos y clientes.
- **No inventes datos del negocio.** Precios, horarios, capacidades y
  direcciones salen del cliente. Si falta un dato, pídelo: es preferible un
  placeholder visible a algo plausible pero falso.
- El sitio público consume del backend **una URL y tres campos**
  (`fecha`, `quedan`, `pocos`), más un campo `error`. Ese contrato no se toca
  sin pensarlo: cada campo que se le agregue es un campo que cualquier
  reemplazo futuro tendrá que imitar.

## Para empezar

Léete `backend/README.md` y `backend/pg/README.md`, y corre las dos pruebas:

```
node backend/prueba.js          # 112 aserciones, el backend actual
node backend/pg/prueba.js       # 30 aserciones, la prueba de concepto
```

Entre las dos está escrito el comportamiento que el panel no puede romper.
