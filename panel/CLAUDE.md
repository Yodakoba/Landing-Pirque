# El panel de Brasas de Lo Pirque (`panel/`)

La aplicación Next.js en Vercel, sobre la planilla del cliente: reservas,
cotizaciones, equipo, informe y cuentas. **Este archivo se separó del
CLAUDE.md de la raíz el 2026-11-12** para que lo del panel esté junto y a
mano al trabajar acá. Lo del sitio público, la reserva en línea con Shopify
y las reglas de Git siguen en el de la raíz.

## Reglas fijas del panel

Las mismas del bloque de la raíz, repetidas acá a propósito: son las que se
revisan antes de cada cambio en esta carpeta.

**Panel (`panel/`): lúdico, estilo PlayStation**
- **Lo que se aprieta se ve que se aprieta**: botones de 36px o más (44px
  lo que se usa seguido), letra de 13px o más donde hay un dato, se
  distingue por forma y no solo por color, un solo botón relleno por vista,
  y tres tamaños: hito, acción y secundario.
- **Flujos simples**: pocos pasos, botones a la vista en vez de
  desplegables, una frase que dice qué pasa al seguir.
- **Elegir de una lista que crece se hace con buscador** (regla del
  cliente, 2026-11-12). Los botones a la vista son para opciones fijas y
  pocas; para personas o empresas —vendedores, socios, clientes— van **dos
  botones**: el directo (*No, directo*) y otro que **abre la lista con
  buscador** (*Por un socio comercial…*), con `BuscarEnLista`. Nunca un
  botón por persona.
- **Autoguardado por defecto** (regla del cliente, 2026-11-12). Todo lo
  que se escribe se guarda solo, con el estado a la vista (*Guardando… /
  ✓ Guardado*, y *Reintentar* en rojo si falla). **Se confirma a mano
  solo** lo que: (1) mueve plata —pagos, cobros, devoluciones—; (2) toma o
  libera cupo —ganar, cancelar, soltar, ampliar, abrir o cerrar un día—;
  (3) cierra o corrige un día; (4) aprueba o rechaza algo; (5) le llega al
  cliente —mandar la cotización o el contrato—; (6) borra, desactiva o saca
  a alguien; (7) toca cuentas, roles o links; (8) cambia el nombre de algo
  que otros usan —un producto, una persona, un puesto— o la Configuración,
  que afecta al sitio público. Lo manual pregunta con una ventana que dice
  qué va a pasar; si pide motivo, queda en la bitácora.
- **Las lecturas de Google son un presupuesto**: 60 por minuto para todo el
  panel. Nada nuevo lee la planilla por su cuenta: se suma a la tanda que la
  ruta ya precarga (`conLecturas()`), y el PR dice cuántas lecturas cuesta.
- **Los permisos los comprueba el servidor**; la pantalla solo deja de
  dibujar lo que la cuenta no puede.
- **Antes del PR**: `npm run revisar` (tipos, lógica, presupuesto de
  lecturas y letra chica) y una pasada con Playwright a 393 y 1280px con
  `revisarPlayStation()` de `panel/pruebas/playstation.mjs`.

## Las pruebas que cuidan las reglas (2026-11-12)

Lo pidió el cliente: que la regla PlayStation y el límite de Google no
dependan de que alguien se acuerde. **Una regla que se puede medir es una
prueba**, y falla antes del PR:

| Comando | Qué cuida |
|---|---|
| `npm run lecturas` | **Cuántas lecturas de Google gasta cada ruta** que abre una pantalla (`pruebas/lecturas/`). Cada ruta se llama en Node contra un Google falso que cuenta las consultas, y tiene su tope en `TOPE`: hoy todas caben en **una** tanda (Productos, dos). Si un cambio se pasa, se junta la lectura nueva en la tanda de la ruta, o se sube el tope a propósito y el PR lo dice. Comprobado rompiéndolo: con tope 0 la ruta falla y nombra lo que leyó |
| `npm run letra-chica` | **Que nadie sume letra bajo 13px** (`text-xs`, `text-[9px]` a `text-[12px]`). Lo que ya había —80 en 22 archivos— quedó anotado en `HABIA` como punto de partida: solo puede bajar, y cuando baja la prueba pide anotarlo |
| `npm run revisar` | Las dos de arriba más los tipos y las pruebas de lógica: **lo que se corre antes de cada PR** |

Y para la pasada con Playwright, **`revisarPlayStation(page)`** de
`pruebas/playstation.mjs`: devuelve la letra bajo 13px, los botones bajo
34px y si la página se corre de lado, en lo que se ve en ese momento. La
primera vez que se probó encontró lo que ya se sabía de la entrada (letra de
12px en los rótulos y el botón del tema de 26px).

- **La prueba de lecturas no necesita red ni credenciales**: los ganchos de
  `pruebas/lecturas/` cambian `googleapis` por el falso y resuelven `@/…`.
  Mide **GET**; una escritura nueva se mide igual, llamando la ruta en un
  script con los mismos ganchos.
- **El color y el contraste siguen siendo del ojo**: eso no lo mide nada.

## Autoguardado por defecto, y las fichas (2026-11-12)

La regla del bloque de arriba, aplicada de una vez a las tres listas de
fichas que todavía tenían botón *Guardar*: **Equipo, Extras y Clientes**.

- **Cada ficha se guarda sola y de a una**, por su propia ruta y con solo
  el campo que se tocó: `PATCH /api/equipo/trabajador`,
  `PATCH /api/extras/colaborador` y `PATCH /api/clientes`. Antes Equipo y
  Extras reescribían la lista entera con un botón al pie. El mecanismo es
  `usarGuardadoPorFicha()` (espera un segundo a que dejen de escribir, junta
  los campos, nunca manda dos guardados de la misma ficha a la vez y se
  lleva lo pendiente al cambiar de página), y cada ficha muestra su
  *Guardando… / ✓ Guardado* donde estaba el botón.
- **El nombre se confirma**: se escribe, aparece *Cambiaste el nombre ·
  Guardar el nombre · Deshacer*, y pregunta antes —en Equipo y Extras
  avisa que los turnos o días guardados siguen con el nombre anterior; en
  Clientes, que se corrige en sus cotizaciones y reservas—. Va por
  `nuevoNombre` en el `PATCH`, que rechaza un nombre vacío o repetido.
- **Agregar pide el nombre y crea la ficha en el acto** (`POST`), y la abre
  para completarla; lo demás se guarda solo.
- **Desactivar, activar y quitar preguntan y se guardan en el acto**, como
  antes en Equipo; en Extras desactivar dejó de ser un cambio pendiente.
- **Los puestos siguen con botón**: es la lista misma, en su ventana, y el
  `PUT` de `/api/equipo` ahora manda solo los puestos.
- **De paso**: el `PATCH` y el `POST` de trabajadores y colaboradores
  aceptaban sueldos y cuenta solo del **administrador** (`rol === admin`),
  aunque `sueldos` también lo tienen quien paga y la gerencia general: con
  el autoguardado sus cambios se habrían perdido callados. Ahora mira
  `puede(rol, 'sueldos')`. Y el de colaboradores pasó a ser **parcial de
  verdad**: lo que no viene se conserva.
- **Clientes reescribe las reservas de sus ganadas solo si cambió lo que la
  reserva copia** (nombre, teléfono, correo): una nota escrita no puede
  reescribir reservas en cada pausa.
- `AvisoGuardado` pasó de 12 a 13px, ahora que reemplaza al botón.

## Las reservas en el panel

Lo que sigue venía bajo "Reserva en línea" en la raíz: es cómo el panel
trata el pago, el cupo y la página de un día.

### Quien paga tiene preferencia: el sobrecupo (2026-11-12)

La regla es del cliente: **una reserva sin pagar queda sujeta a espacio**.
Si un día se llena, quien paga —en línea, o con el anticipo de una
cotización— tiene preferencia, y eso no puede chocar con un "no hay cupo"
por culpa de reservas que no pusieron un peso. Cuando el pago entra encima,
el día queda **por encima de su cupo** y alguien decide entre dos salidas:
**ampliar el cupo** (y traer más equipo) o **soltar** la reserva sin pagar y
avisarle al cliente.

- **Quién tiene prioridad** (`tienePrioridad()` en `ocupacion.ts`): las
  **pagadas y las abonadas** —una abonada ya puso plata—. Sin prioridad,
  todas las demás que ocupan lugar, **vengan de donde vengan**: Shopify
  *Solo reserva*, anotadas a mano por pagar y cotizaciones ganadas sin
  anticipo. Lo decidió el cliente: la regla es sobre la plata.
- **El sitio ofrece dos cupos**: `quedan` (todo lo tomado) para *Solo
  reservar* y `quedanPagando` (capacidad menos pagadas y abonadas) para
  *Pagar ahora*. Un día lleno de reservas sin pagar **se sigue ofreciendo**
  para pagar, y *Solo reservar* se apaga con *"ya solo hay lugar pagando
  ahora"*. Bajo los botones, el sitio dice que reservar sin pagar queda
  sujeto a disponibilidad, en los tres idiomas.
- **Una cotización con anticipo pagado se gana igual** aunque el día esté
  lleno de reservas sin pagar: `/convertir` y la ventana cuentan solo las
  que tienen prioridad cuando la cotización ya tiene cobros
  (`cobrado.pagado > 0`). Sin cobros se sigue rechazando como antes.
- **`sobrecupo`** en la ocupación: personas sobre el cupo. Solo en un día
  con cupo y abierto —uno fuera del calendario tiene cupo 0, no "lleno"—.
- **Dónde se avisa**: arriba de la portada y de Cotizaciones
  (`AvisoSobrecupo`, rojo, con quién está en riesgo y *Decidir →*), en la
  línea de la semana (*Sobrecupo el sáb: 12 personas de más*, que reemplaza
  al "lleno") y en la tarjeta del día (*⚠ 12 sobre el cupo · Decidir*).
  **El vendedor lo ve solo cuando la reserva en riesgo es suya**
  (`diasConSobrecupo()`).
- **Dónde se decide**: la página del día, bloque **Sobrecupo**
  (`BloqueSobrecupo.tsx`). Lista las reservas sin pagar, las más nuevas
  primero, y **sugiere** cuáles soltar hasta cubrir el exceso
  (`sugerirSoltar()`); decide la persona.
  - **Ampliar el cupo a N** (`/api/fechas/ampliar`, permiso `cupo` desde
    el 2026-11-12: gerente, quien paga y administrador; el encargado lo
    **pide**, ver "Subir el cupo es del gerente"): el
    servidor calcula el cupo con lo tomado de ese momento, **nunca por
    encima de la capacidad máxima del recinto** —`capacidad_maxima` en
    Configuración, **900** según el cliente—. Si ni así caben, sube al
    máximo y lo dice.
  - **Soltar esta reserva** (`/api/reservas/soltar`, con motivo): la marca
    *Se cayó por cupo* y abre el WhatsApp para el cliente con el mensaje ya
    escrito (`mensajeCaida()`, un solo lugar para cambiarlo). El vendedor
    suelta solo las suyas. **Una de una cotización no se suelta**: se
    cancela desde la cotización, que calcula la devolución.
- **El vendedor no decide: avisa** (2026-11-12, lo pidió el cliente). Sin
  el permiso `dias` no ve *Ampliar el cupo*; en su lugar, un recuadro
  *🙋 Esto lo decide la administración* con tres pasos —avísale, espera su
  respuesta, si te piden soltar una tuya suéltala— y **📋 Copiar el aviso**,
  un texto listo para WhatsApp con el día, el exceso y sus reservas en
  riesgo (`avisoParaAdministracion()`). **Antes de soltar, la ventana le
  pregunta** *✋ ¿La administración te dijo que la sueltes?*: el botón
  *Sí, soltar* queda apagado hasta que conteste que sí, y *Todavía no*
  copia el aviso. **Mías / Todas** filtra la lista; aparece solo cuando hay
  reservas que la cuenta no puede tocar, y el vendedor parte en *Mías*.
- **La columna `Se cayó por cupo`, y por qué no es un estado del pago.** El
  estado lo reescribe la sincronización con Shopify en cada pasada: una
  reserva de Shopify marcada cancelada en el panel volvería a *por pagar* y
  recuperaría su lugar sin que nadie se entere. Esta columna Shopify no la
  toca (`camposDeShopify()`) y `ocupaLugar()` la respeta. **El pedido en
  Shopify queda vivo**: hay que cancelarlo allá a mano —el panel lo
  recuerda—, porque hacerlo desde el panel pide un permiso de escritura que
  la app no tiene.
- **Lo que queda abierto**: avisar fuera del panel (correo o WhatsApp
  automático) cuando aparece un sobrecupo. Hoy se entera quien abre el
  panel.

### El estado del pago, en español y en dos grupos (2026-10-30)

Lo reclamó el cliente: al abrir una reserva, la pregunta del pago *"sale en
inglés y español, y eso confunde mucho"*. Era literal — el desplegable decía
`pending — paga al llegar` y la tabla del día mostraba el código pelado,
`pending`. Quien abre una reserva un sábado es la jefa de turno, en Pirque.

**Lo que se guarda no cambió**: la columna se llama `Estado Pago Shopify` y
lleva el código de Shopify, porque la escribe el webhook y tiene que calzar
con lo que manda la tienda. Lo que cambió es lo que se lee. El mapa vive en
`panel/src/lib/pagos.ts`, en un solo lugar para las dos pantallas:

| Guardado | En pantalla | Qué significa |
|---|---|---|
| `paid` | Pagada | ya pagó |
| `pending` | Por pagar | paga cuando llegue |
| `cancelled` | Cancelada | avisó que no viene |
| `refunded` | Reembolsada | se le devolvió la plata |
| `voided` | Anulada | se anuló antes de cobrarle |

**Y se simplificó sin perder nada**, que es lo que el cliente pidió: los
cinco estados van en **dos grupos** dentro del mismo desplegable —*Viene* y
*Ya no viene — libera el cupo*—, porque la pregunta de verdad es si esa
persona llega o no, y recién después cómo quedó la plata. Cinco opciones
parejas obligan a leerlas todas para elegir la primera.

- **La lista de los tres que liberan el cupo es una sola**
  (`ESTADOS_QUE_LIBERAN`): la usa `ocupaLugar()` y con ella el formulario
  arma su grupo. Con dos listas, el día que se agregue un estado el
  calendario y el formulario dirían cosas distintas de la misma reserva.
- **Un código que el panel no conozca se muestra tal cual.** Mejor que una
  celda vacía: por lo menos se entiende que hay algo nuevo.
- **La modalidad también se explica sola**: *Pago directo — paga en línea* /
  *Solo reserva — paga en el local*. Los nombres son los de la tienda y los
  del sitio, así que se quedan; lo que faltaba era decir qué son.
- **La asistencia del cliente pasó a los mismos botones Vino / No vino** del
  equipo y de las actividades extras. Era el último `<select>` de los tres
  lugares donde se pregunta exactamente lo mismo.

### Un solo vocabulario del pago, y cómo se ingresa en Fudo (2026-11-11)

Lo pidió el cliente: el estado del pago tenía que ser *"estilo PlayStation y
coherente… entre cotizaciones, Shopify y reservas manuales"*, y quien abre
la mesa tiene que ver **a primera vista con qué precio la ingresa en Fudo**.

- **Un estado nuevo, *Abonada*** (`partially_paid`, el mismo código que usa
  Shopify): pagó una parte. Viene y ocupa su lugar, y cuenta como **por
  cobrar**. La columna nueva `Abonado` (al final, se agrega sola) guarda
  cuánto. Shopify `partially_paid` → Abonada sin monto; una cotización ganada
  lo saca de sus cobros (`pagoPorCobros()`: todo → Pagada, algo → Abonada con
  lo cobrado, nada → Por pagar).
- **El mismo vocabulario en todas partes** (`PastillaPago`): de dónde viene
  —*Shopify · Pago directo*, *Shopify · Solo reserva*, *Cotización*,
  *Anotada a mano*— y cómo va, **✓ Pagada · ½ Abonada · ○ Por pagar**, con
  el ícono para distinguirlo sin leer. Rojo si ya no viene.
- **En el formulario son botones, no un desplegable**: tres grandes
  (Pagada · Abonada · Por pagar). Con Abonada pide **cuánto abonó** y dice
  cuánto falta; con Pagada o Abonada, **cómo pagó** con botones rápidos
  —*Transferencia · Efectivo · Tarjeta*, confirmados por el cliente— que
  escriben el medio, y el texto sigue libre. **La reserva se cayó…** es un
  botón aparte que abre los tres rojos. **De Shopify, el pago lo pone la
  tienda**: el formulario lo muestra y solo deja marcar que se cayó.
- **Cómo ingresarla en Fudo** (`comoIngresar()` en `lib/fudo.ts`, pura y con
  pruebas; la arma el servidor en `/api/reservas` y `/api/recepcion`). Una
  caja con su ícono, en la recepción, en la página del día y en la cara
  *Reservas* de /turnos:
  - **✓ Ya pagó · ingrésalo como pago directo**, menú por menú.
  - **$ Solo reserva · cobra el precio sin descuento**: *2 × Tradiciones a
    $49.000*, el precio de pagar en el local de Productos, y el total.
  - **½ Abonó $X · cobra el resto**, con lo que falta.
  - **De una cotización**, el precio acordado y no el de la carta.
  - **! Compró pago directo pero no aparece pagado**: que lo vea el jefe de
    turno antes de abrir la mesa. Reemplaza al viejo "⚠ pago directo sin
    pagar".
- **Esto le muestra montos a la anfitriona**, que antes no veía ninguno: es
  lo que el cliente pidió —saber qué cobrar al abrir la mesa—, y llega como
  instrucción armada, no como los datos del pago.

### La modalidad la escribe Shopify; el estado del pago, cualquiera (2026-10-30)

Lo encontró el cliente, y era un error lógico de fondo: *"cuando se agrega una
reserva manualmente, en verdad no puede ser pago directo, porque pago directo
es solo Shopify… nosotros igual necesitamos poder abrir manualmente una
reserva que ya se pagó, por transferencia, adelantada, o como sea"*.

Tenía razón y se puede leer en una sola línea del código: `tipoPagoDe()` saca
`Tipo Pago` del **`variant_title`** del pedido, o sea de qué variante se
compró. **Es un hecho del pedido, no una opinión de nadie.** Una reserva
anotada a mano no compró ninguna variante, así que el formulario estaba
pidiendo elegir un dato que no existe — y traía `Solo reserva` puesto por
defecto, que es igual de inventado.

Los dos conceptos, separados de verdad:

| Columna | Qué es | Quién la escribe |
|---|---|---|
| `Tipo Pago` | **cómo se vendió** — qué variante se compró | **solo Shopify** |
| `Estado Pago Shopify` | **cómo va el pago** — pagada, por pagar, cancelada… | Shopify **y** el panel |
| `Nota de pago` | **cómo se pagó** una reserva a mano, en texto libre | el panel |

- **El formulario manual pregunta una sola cosa**: cómo va el pago, el
  desplegable que ya estaba en dos grupos. Una reserva pagada por
  transferencia se anota **Pagada** y ya no hay que mentir sobre la
  modalidad. Al editar una reserva de Shopify, la modalidad se **muestra
  como texto, no como campo**.
- **Y no se acepta del navegador**, ni al crear ni al editar: el `POST` la
  escribe vacía y el `PATCH` la descarta, así que una llamada directa a la
  API obedece la misma regla que un clic. Como la edición es parcial,
  descartarla conserva la que ya tenga la fila.
- **Con eso el aviso de "pago directo sin pagar" se vuelve confiable**, que
  es lo que más se gana. Es la única señal de que la regla de medios de pago
  de Shopify dejó de aplicar, y hasta ahora se podía disparar a mano sin que
  hubiera pasado nada en la tienda. Lleva además una guarda por el id, para
  las filas viejas de cuando el formulario sí dejaba elegir.

**El monto sugerido pasó a salir del estado del pago** y no de la modalidad:
pagada por adelantado es el precio con descuento, por pagar es el del local.
Es exactamente la regla de la tienda —el recargo son los $5.000 por no pagar
antes— y el monto sigue siendo editable encima.

#### La nota de pago es texto libre a propósito

Cuáles son los medios de pago del negocio es dato del cliente. Una lista
cerrada inventada acá terminaría en la planilla pareciendo que lo es, así que
se escribe "Transferencia 28/10" o "efectivo en el mesón" y listo. El campo
aparece **solo cuando la reserva está pagada**, que es cuando la pregunta
existe. Mismo criterio y mismo nombre que la `Nota de pago` de
`Trabajadores` y `Colaboradores`.

- **La columna se agrega sola la primera vez que hace falta**
  (`asegurarColumna()`), como `asegurarHoja()` hace con una pestaña. Sin eso
  el campo se habría podido escribir en el formulario sin quedar en ninguna
  parte: una columna que el panel conoce y la planilla no se lee vacía y
  `filaReserva()` saltea su índice en silencio. Se agrega al final y sin
  tocar ninguna celda de datos.
- **El sincronizador no la pisa**, igual que la asistencia: la escribe una
  persona, y un pedido que se actualiza —un pago que se confirma— la
  borraría. Está en la lista de omisiones de `camposDeShopify()`.

#### Lo que se arregló de paso: el cálculo decía otra cosa que el rótulo

`ocupacionDe()` separaba el día **por modalidad comprada** mientras la
tarjeta del calendario rotulaba el resultado como *"X pagadas / X en el
local"* y el comentario de `tipos.ts` decía *"personas que ya pagaron"*. No
era lo mismo: una reserva que compró la variante de pagar en línea y seguía
en `pending` se contaba como pagada, y esa plata no aparecía en ninguna
parte. **El rótulo tenía razón; el cálculo se había quedado atrás** — y
`faltaCobrar()` ya resolvía esto bien, con el porqué escrito, desde antes.

Ahora los dos campos se llaman `pagadas` y `porPagar` —los nombres viejos,
`online` y `local`, son justamente los que dejaron pasar la desalineación— y
el filtro de la página del día dice **Todas / Pagadas / Por cobrar**, que es
la pregunta del mesón.

### Lo que se mira primero en la página de un día (2026-10-30)

Lo pidió el cliente: agrandar lo principal y distinguirlo del resto. Son dos
filas de azulejos, **con la misma forma a propósito** —número grande arriba,
qué es debajo— porque son los dos datos por los que se abre esta página un
sábado en la mañana, y repetir la forma es lo que los deja leerse sin
aprender dos diseños:

| Fila | Qué dice |
|---|---|
| **Qué preparar** | cuántos de cada menú, en dorado |
| **Cómo viene el pago** | cuánta gente ya pagó (verde), a cuánta hay que cobrarle (ámbar) y, si las hay, cuántas liberaron su lugar (rojo) |

- **Los números grandes son personas**, para que las dos filas sumen lo
  mismo; cuántas reservas son va en la línea chica. Un "4" que fuera gente
  arriba y reservas abajo sería la clase de número que alguien suma mal.
- **El azulejo de los que ya no vienen aparece solo si los hay.** Un "0 ya no
  vienen" es ruido en la fila que se mira para saber cuánto falta cobrar.
- **En la tabla, la modalidad va en una pastilla de color**: verde *Pago
  directo*, ámbar *Solo reserva*, y debajo el estado en su propio color. Lo
  pidió el cliente para distinguirlas sin leerlas. El criterio del color es
  uno solo —**¿está la plata o no?**—, así que la combinación imposible
  (pastilla verde con estado ámbar) salta a la vista, que es justo lo que ese
  aviso quiere.
- Una reserva sin modalidad dice **"anotada a mano"** y no un guion mudo:
  decir qué es vale más que decir que falta algo.

## Los presupuestos (2026-11-01)

La capa comercial que faltaba: **cotizar antes de que exista una reserva.**
Lo pidió el cliente para poder armar un presupuesto para una agencia o un
matrimonio, mandárselo, y **verlo en el día** — con una condición que fija
todo el diseño:

> *"No puede que solo por enviar un presupuesto se ocupen cupos confirmados
> dentro del día. Solo muestra: mira, este día tienes dos presupuestos
> enviados con 43 posibles reservas, pero si no está confirmado, no toca
> nada de lo concreto."*

### La tercera categoría, que es lo que no existía

Hasta acá una reserva era una de dos cosas: **ocupa** su lugar, o **lo
liberó**. Un presupuesto no es ninguna de las dos — es *"todavía no se
sabe"*. Meterlo como un estado de pago más lo habría mostrado en rojo junto
a las canceladas, bajo el rótulo "ya no viene", que es exactamente lo
contrario de lo que es.

| | Cuenta cupo | Dónde se ve |
|---|---|---|
| Confirmada (`paid`, `pending`) | **sí** | la barra, el semáforo, el sitio |
| **Presupuesto vigente** | **no** | su propia línea, aparte |
| Ya no viene (`cancelled`, `refunded`, `voided`) | no | el azulejo rojo |

### Dos pestañas propias, no columnas en `Reservas`

| Pestaña | Qué guarda |
|---|---|
| `Presupuestos` | Una fila por cotización: id, fecha, cliente, contacto, estado, válido hasta, token del link, notas y **`ID Reserva`** |
| `Presupuesto Líneas` | Una fila por línea: concepto, cantidad, precio unitario y **cuántas personas representa** |

Es el mismo criterio que `Actividades`: vigencia, estado y líneas con precio
no significan nada en una reserva de Shopify, y una tabla con media fila
vacía es la forma más segura de que alguien sume lo que no debe. Además un
presupuesto cotiza cosas que una reserva no modela —el arriendo del recinto,
el show ecuestre— y eso no cabe en un `Menú` y un `Personas`.

**Las dos van por nombre de columna**, como `Reservas` y `Turnos`: se les
agregan y se les borran filas de a una y les van a crecer columnas.

### Las personas tienen su propia columna, y eso es la decisión

`20 × Tradiciones` son 20 personas. `1 × Arriendo del recinto` son **cero**,
y cuesta dos millones y medio. Si el conteo se dedujera de la cantidad, ese
`1` habría sumado una silla; y no hay forma de saber qué conceptos son gente
sin adivinar, porque los conceptos los escribe quien cotiza. Adivinar acá
sería publicar un número de personas que nadie dio.

Al agregar un menú se propone igual a la cantidad; en una línea libre nace
en cero, y se corrige.

### El precio se propone, no se impone

Lo pidió el cliente con el porqué: la línea nace con el precio de la pestaña
`Menús` **y se puede editar**, *"porque eso es parte de las negociaciones,
entonces se necesita esta libertad"*.

Una vez escrito, el precio de la línea **es** el precio: al convertirse en
reserva se transcribe el negociado, no se recalcula desde `Menús`. Mismo
criterio que los sueldos de un turno y los montos habituales de un
colaborador, y por el mismo motivo — lo acordado no puede cambiar solo
porque mañana cambie una tarifa.

### Qué apaga un presupuesto: la reserva, no la palabra

`cuentaComoPosible()` es **una sola condición** a propósito, porque cubre
los dos errores opuestos:

- **Contar dos veces.** Al aceptarse, el presupuesto se convierte en reserva
  y esa reserva ya ocupa cupo. Si además siguiera contando como posible, el
  día mostraría la misma gente dos veces. Por eso lo que lo apaga es
  **tener `ID Reserva`**, no estar marcado "Aceptado".
- **Desaparecer de las dos listas.** Si lo apagara la palabra, un
  presupuesto marcado "Aceptado" cuya conversión falló no estaría ni entre
  las reservas ni entre los posibles: gente que viene y que nadie ve.

Un **borrador sí cuenta**: una cotización a medio escribir es igual de
posible que una mandada, y el día muestra su estado al lado para que se vea
cuál es cuál.

**"Vencido" no se guarda, se deduce** de `Válido hasta`. Un estado guardado
habría necesitado que algo lo marcara cada día, y mientras eso no corriera
un presupuesto se vería vigente por olvido — justo el error que importa,
porque un presupuesto vencido que parece vigente sigue reservando gente que
ya no viene. El **último día todavía vale**: "válido hasta el 15" incluye el
15.

**La vigencia son 15 días**, los fijó el cliente, y vive en `Config`
(`vigencia_presupuesto`): cambiar un plazo comercial no puede obligar a
redesplegar. **En cero significa sin vencimiento**, no "vence hoy" — un
plazo de cero días mataría cada presupuesto al nacer.

### Dos líneas del mismo concepto NO se juntan

> **Cambió el 2026-11-12** (lo pidió el cliente: *"no quiero que se puedan
> poner dos veces el mismo ítem"*): **un producto del catálogo va una sola
> vez por cotización**. Ya agregado, su botón queda apagado y dice *ya está*;
> la cantidad se cambia en su línea (`yaEstaEnLaCotizacion()` en
> `cotizar.ts`). Una cortesía va como descuento de la línea. Lo que ya tenga
> dos líneas de antes no se junta solo, por lo que dice abajo. *Otra línea*
> sigue libre.

Al revés que `normalizarPlan()` y `normalizarExtras()`, y la diferencia es
real: dos turnos de la misma persona el mismo día son un error —no puede
estar en dos puestos—, pero *20 × Tradiciones* a precio de lista y
*5 × Tradiciones* de cortesía a cero son **un acuerdo**. Juntarlas borraría
lo negociado.

### La garantía, y que la prueba de verdad falla

Lo cotizado viaja **aparte** (`posibles`, un mapa por fecha) y sale en dos
campos propios de `Ocupacion` —`presupuestos` y `presupuestadas`— que nadie
más mira: no entran en `tomadas`, no descuentan de `quedan` y no mueven el
semáforo. Que entre como parámetro y no se calcule dentro de `ocupacionDe()`
es lo que mantiene esa función pura, y además deja ver de un vistazo que lo
posible entra y sale sin tocar nada del medio.

**Se comprobó rompiéndolo.** Sumando lo cotizado a `tomadas` a propósito,
fallan cuatro pruebas de una vez: las tomadas, los lugares que quedan, el
semáforo **y la que dice que el sitio sigue ofreciendo 50 lugares y no 20**.
Una prueba que no falla cuando debe no es una prueba.

Y contra los endpoints de verdad, con un día sembrado:

```
panel   2026-11-14  tomadas=7  quedan=53  semáforo=verde | presupuestos=2  posibles=43
sitio   { fecha: "2026-11-14", quedan: 53, pocos: false }
```

Los 43 son los dos vigentes. Un tercero ya convertido en reserva (50
personas) y un cuarto vencido (99) quedan fuera solos, sin que nadie los
marque.

### Lo que se lee aunque la pestaña no exista

`leerPresupuestos()` devuelve lista vacía si la pestaña no está, igual que
los turnos y las actividades: **el panel tiene que funcionar antes de que
nadie cotice nada.** Y `posiblesDeLosDias()` devuelve el mapa vacío ante
cualquier falla, que es la asimetría correcta: sin eso, un problema leyendo
una capa comercial dejaría sin calendario a quien vino a mirar las reservas.
Lo peor que puede pasar es que no se vea la línea de lo cotizado.

**Un día cerrado con algo cotizado sí se muestra**, igual que uno cerrado
con reservas: si alguien cotizó un día que después se cerró, esconderlo
escondería una conversación abierta con un cliente.

### La pantalla: `/presupuestos`

Una ficha por cotización, que se abre con un `+` — igual que `/equipo` y
`/extras`, y por lo mismo: adentro hay líneas con cantidad y precio, y eso
no cabe en una fila de tabla sin que las de una se peguen a las de la
siguiente. Cerrada es una línea: cliente, fecha, estado, personas y total.

**Se guarda con un botón, no solo.** Es la regla del panel: acá se edita la
lista misma —el cliente, las líneas, los precios— y guardar a mitad de
palabra mandaría una cotización a medio escribir. La ventana de un día, que
edita valores sobre algo que ya existe, se guarda sola; esto no.

- **Agregar menú** propone el precio desde `Menús` y lo deja editable;
  **Otra línea** nace vacía y con cero personas, para el arriendo, el show
  ecuestre o lo que sea.
- **Los cerrados se esconden** —rechazados, vencidos, ya confirmados— con
  una casilla que dice cuántos son. Esta lista solo crece, igual que la de
  trabajadores.
- **El token se crea al crear el presupuesto**, no al mandarlo, y ahí está
  la diferencia con la planilla semanal: esa abre datos del equipo, así que
  que exista tiene que ser una decisión. Un presupuesto **es** un documento
  para mandar — nace para eso.
- **La vigencia no se corre sola al editar.** Hay un botón *Renovar
  vigencia* aparte: corregir una línea no puede alargarle el plazo al
  cliente sin que nadie lo decida.

Dos campos **no se aceptan nunca del navegador**, y se descartan en el
servidor igual que la modalidad de una reserva: el **token**, porque
cambiarlo invalida el link que el cliente ya tiene, y el **`ID Reserva`**,
porque es lo que decide si este presupuesto todavía cuenta como gente
posible — dejarlo escribir desde afuera permitiría apagar o encender el
conteo de un día sin que exista ninguna reserva.

**Un presupuesto ya convertido en reserva no se borra**, y se comprueba en
el servidor: su `ID Reserva` es el rastro de dónde salió esa reserva.

### El documento: `/presupuesto/<token>`

Es lo que se le manda al cliente, y **se imprime a PDF desde el navegador**.
Se eligió sobre generar el archivo en el servidor por razones concretas: una
librería de PDF pesa megas en la función de Vercel, obliga a incrustar
fuentes para las tildes y la ñ, y cada cambio de diseño cuesta el triple.
Con `window.print()` el navegador ofrece "Guardar como PDF" —en el teléfono
también— y sale un PDF de verdad con el mismo diseño de la pantalla.

Y queda algo que un archivo no da: **el link sigue vivo.** Si se corrige un
precio, el cliente abre el mismo link y ve lo corregido, en vez de quedarse
con un adjunto viejo que nadie sabe que lo es.

- **Lee la planilla directo, sin pasar por una ruta de API**, igual que
  `/mi/`: así no hay ningún endpoint nuevo que se pueda llamar con un token
  prestado para sacar datos en bruto.
- **Un link inválido y uno borrado dicen lo mismo**, por lo mismo que en
  `/mi/`.
- **Un token vacío no encuentra nada**, aunque haya presupuestos sin token.
  Si calzara, entrar a `/presupuesto/` sin nada detrás abriría la primera
  cotización de la lista — con el precio que se le ofreció a otro cliente.
  Hay una prueba que lo fija.
- **No dibuja la barra del panel ni la tira de bienvenida.** La barra, por
  lo mismo que `/mi/`. La tira es peor: como el documento se imprime, se iba
  impresa arriba de la cotización —un cartel del panel interno en la hoja
  que recibe el cliente—. Se vio en la primera captura y por eso queda
  anotado.
- **El WhatsApp del pie es el de Eventos**, no el de Reservas: un
  presupuesto se cotiza conversando —agencias, empresas, matrimonios— y ese
  es el canal de ese público.
- **Las fechas van con `first-letter:uppercase` y no `capitalize`**, al
  revés que en el panel: `capitalize` pone mayúscula en cada palabra y
  "Sábado 5 De Diciembre" se lee descuidado en un documento que sale del
  negocio hacia un cliente.

#### El papel es blanco siempre

El bloque `@media print` de `globals.css` fuerza los colores claros sin
importar el tema del panel. Imprimir el tema oscuro gastaría un cartucho en
un fondo negro y en PDF se vería como un documento de otro planeta. Se
fuerza ahí y **no** cambiando el tema antes de imprimir, porque eso le haría
parpadear la pantalla a quien solo quería guardar el archivo. El oro también
se cambia por el de día: el del sitio da menos de 2,5:1 sobre blanco y el
total saldría casi invisible.

Comprobado emulando `print` con el panel en oscuro: fondo blanco, texto
negro, el botón y la barra en `display:none`.

### El rosado tiene nombre propio

`--rosa` en las dos paletas, como `verde`, `rojo`, `ámbar` y `cielo`, y por
lo mismo: es un **significado** —"cotizado, todavía no confirmado"— y no un
color. De día se oscurece igual que el dorado, porque el de noche sobre
papel da menos de 3:1 y "2 presupuestos" no se leería con sol encima.

### Dónde se ve, en rosado

| Pantalla | Qué muestra |
|---|---|
| Tarjeta del calendario | una pastilla —*1 presupuesto · 18 posibles*— **debajo** de la barra y de las pastillas de pago |
| Página del día | un bloque propio, debajo de Actividades extras, con quién, cuánta gente, cuánto y en qué va |
| `/turnos` | una línea *18 posibles* junto a lo demás de la celda |
| Planilla semanal y link personal | **nunca**, igual que las actividades extras |
| Sitio público | **nunca** |

Tres decisiones que vale la pena tener escritas:

- **En la tarjeta va debajo, no dentro.** Arriba está lo que ya es —el
  número grande, la barra, las pagadas y las por cobrar—; esto es lo que
  podría ser. Mezclarlo sería exactamente lo que el cliente pidió que no
  pasara.
- **En `/turnos` va al lado del estado, no en vez de.** Un presupuesto no es
  un estado del día —eso lo dice `PuntoDia`: público, cerrado, preparación—
  es una capa encima. Un sábado cerrado puede tener una cotización dando
  vueltas, y las dos cosas son ciertas.
- **En la página del día es una línea chica que se abre** (2026-11-12, lo
  pidió el cliente: tomaba mucho protagonismo para algo que no está
  decidido, y sumaba mal). Cerrada dice *2 cotizaciones en curso · 2
  clientes · hasta 32 personas, sin confirmar*; abierta, una fila por
  cotización —cliente, número, gente, *3 alternativas, de $714.000 a
  $1.285.200*, en qué va y *Abrir*—. **Las alternativas cuentan una sola
  vez**, la de más gente, igual que `posiblesPorDia()`: tres alternativas de
  12 personas eran 36 posibles.
- **El bloque del día dice por qué no suma.** *"18 personas posibles si se
  confirma este presupuesto. No ocupan cupo todavía: los números de arriba
  no los cuentan."* Va siempre, porque es justo lo que alguien daría por
  hecho mirando una tarjeta con gente.

### Convertirlo en reserva

Es **un botón propio**, que aparece solo con el presupuesto aceptado y
todavía sin reserva, y **pregunta antes**: que el cliente diga que sí y que
le tomemos el lugar son dos decisiones, y la segunda es la que le quita la
silla a otro.

**El orden de las dos escrituras es deliberado: primero la reserva, después
el vínculo.** Las dos van a la planilla y no hay transacción que las junte,
así que hay que elegir cuál falla mejor:

- **Reserva primero**: si el vínculo falla, queda la reserva ocupando su
  lugar **y** el presupuesto contando como posible. Se ve doble, es feo y
  **se nota en el acto**.
- **Vínculo primero**: si la reserva falla, el presupuesto deja de contar y
  no existe ninguna reserva. Esa gente desaparece de las dos listas y
  **nadie se entera** hasta que llegan.

El error visible gana siempre sobre el invisible. Convertir dos veces se
rechaza en el servidor, no solo en la pantalla: dos clics seguidos llegan
como dos peticiones.

Lo que queda anotado en `Reservas`, en `reservaDesdePresupuesto()`:

- **El monto es el total negociado del presupuesto**, no el recalculado
  desde `Menús`. Lo pidió el cliente con el porqué: *"se transcribe el
  precio de este presupuesto enviado, porque eso es parte de las
  negociaciones"*. Si se recalculara, el descuento acordado por teléfono
  desaparecería justo cuando pasa a ser plata que hay que cobrar.
- **Al `Menú` solo van las líneas con personas**, así que el arriendo del
  recinto no llega a la cocina. **Se probó primero filtrando con
  `canonizar()` contra la pestaña `Menús` y estaba mal**, aunque parezca el
  camino obvio: esa función devuelve *tal cual* lo que no reconoce —a
  propósito, para que un plato nuevo de la tienda aparezca igual— así que no
  sirve de filtro, y usarla como tal habría hecho desaparecer en silencio un
  menú nuevo de la lista de lo que hay que preparar. **Lo cazó una prueba**,
  y por eso quedó escrito.
- **Nace por pagar**, no pagada: aceptar un presupuesto es comprometerse a
  venir, no haber transferido.
- Lleva `Del presupuesto N° …` en la nota de pago, que es el rastro de dónde
  salió, y el `ID Reserva` queda escrito en el presupuesto.

Comprobado de punta a punta con un día de 60 lugares y dos cotizaciones:

```
antes       tomadas=0   quedan=60  | 2 presupuestos · 43 posibles   sitio: quedan 60
convierto A tomadas=25  quedan=35  | 1 presupuesto  · 18 posibles   sitio: quedan 35
convierto B tomadas=43  quedan=17  | 0 presupuestos ·  0 posibles   sitio: quedan 17
```

Las 43 personas pasaron de posibles a tomadas **sin contarse dos veces en
ningún paso**, y el segundo intento sobre el mismo presupuesto se rechaza.

**El link del documento no lleva botón de "acepto" para el cliente**, y es
deliberado: sería una puerta de escritura sin contraseña sobre un dato que
mueve el cupo de un día. El cliente responde por WhatsApp y el encargado lo
marca.

### Los que están por vencer, y los que ya se pasaron (2026-11-01)

Lo pidió el cliente, y era justo el pendiente que este archivo tenía
anotado. **Son dos avisos distintos arriba de `/presupuestos`, y no se
juntaron a propósito**, porque piden cosas opuestas:

| Aviso | Qué dice | Qué hay que hacer |
|---|---|---|
| **Por vencer** (ámbar) | *"2 presupuestos vencen pronto"* — con *vence hoy / vence mañana / vence en 3 días* | apurar al cliente, o renovar la vigencia: **todavía cuentan como gente posible** |
| **Vencidos sin respuesta** (neutro) | *"1 presupuesto venció y nadie lo cerró"* | marcarlo rechazado o renovarlo: **ya dejó de contar** |

Juntarlos en una sola lista habría mezclado *"apúrate, todavía se puede"*
con *"se te pasó"*, que es la diferencia que uno viene a mirar. Y el
segundo no es alarma: va en gris, porque un presupuesto que venció no
rompió nada —el día ya no lo cuenta— solo quedó sin cerrar.

- **El plazo del aviso son 3 días y es una constante del código**
  (`DIAS_AVISO_VENCIMIENTO`), no una fila de `Config`. La vigencia sí está
  en la planilla porque es un **plazo comercial** que el cliente le ofrece a
  alguien; *cuándo avisarle al encargado* no es dato del negocio, es una
  decisión de esta pantalla. Una fila más en `Config` sería una pregunta más
  que contestar para estrenar el panel.
- **"Vence hoy" y "vence mañana" no se escriben "en 0 días" y "en 1 día".**
  Un cero en un plazo se lee dos veces para entender que es hoy.
- **`diasParaVencer()` cuenta sumando fechas de texto**, no restando dos
  `Date`. Es la regla de todo el proyecto, y acá se nota: con husos, un
  presupuesto que vence hoy en Chile se vería vencido —o al revés— según la
  hora en que alguien abra la página desde Vercel.
- **El último día todavía vale**, igual que en `estaVencido()`: "válido
  hasta el 15" avisa el 15 y recién el 16 pasa al otro aviso.
- **Los dos avisos usan `cuentaComoPosible()` por debajo**, así que un
  presupuesto ya convertido en reserva o marcado rechazado no aparece en
  ninguno. No hay una segunda definición de "sigue abierto" esperando a
  desalinearse.
- **Apretar un vencido abre su ficha aunque esté escondida.** Los cerrados
  van ocultos tras la casilla, así que el botón del aviso destapa la lista
  antes de abrirlo; sin eso el clic no hacía nada visible, que es el peor
  resultado para un botón.

### El IVA, desglosado porque esto va a empresas (2026-11-01)

Lo pidió el cliente con el dato que fija todo el cálculo: *"en un presupuesto
que mayormente va dirigido hacia empresas hay que indicar el IVA… los precios
que nosotros ofrecemos hoy son con IVA"*.

**Los precios ya traen el IVA, así que el total no cambia.** Lo que se
calcula es el neto, hacia atrás. Al revés —sumándole 19% a lo escrito— cada
cotización habría salido un 19% más cara que el precio que anuncia el resto
del sitio, que es el error que más caro se paga: se descubre cuando el
cliente compara.

El pie del documento pasó de una línea a tres:

```
Neto       $3.000.000
IVA 19%      $570.000
Total      $3.570.000
```

- **El IVA sale de restar, no de multiplicar.** Con `neto × 0,19` los tres
  números no siempre suman —44.000 da neto 36.975 e IVA 7.025,25— y una hoja
  que va a la contabilidad de una empresa no puede tener un peso que no
  cuadra. Restando, `neto + iva === total` **siempre**. Mismo criterio que
  `repartirPropina()`, que reparte hasta el último peso.
  **Se comprobó rompiéndolo**: cambiando la resta por la multiplicación, la
  prueba falla con 70.000. Con un solo monto no se habría visto —44.000
  cuadra por casualidad— y por eso la prueba recorre once totales.
- **Va sobre el total y no línea por línea.** La suma de los netos
  redondeados de cada línea no da el neto del total, así que un documento con
  las dos cosas tendría dos netos distintos. Y a quien recibe la cotización
  le sirve el del total, que es el que pasa a su contabilidad.
- **Está dicho con palabras además del desglose**: *"Los precios de este
  presupuesto incluyen IVA."* Sin esa línea, quien lee un presupuesto en una
  empresa le suma 19% por costumbre y nos deja fuera por un impuesto que ya
  estaba cobrado.
- **La tasa es una constante del código** (`IVA` en `presupuestos.ts`), no
  una fila de `Config`, al revés que la vigencia. La diferencia es quién lo
  decide: el plazo lo fija el cliente, la tasa la fija la ley. Un campo
  editable sería un lugar donde un cero mal tecleado sale impreso.
- **Lo que se guarda no cambió.** La reserva que nace de un presupuesto
  sigue llevando el **total con IVA**, que es la plata que hay que cobrar;
  hay una prueba que lo fija. El desglose es para leerlo, no para calcular
  con él.
- **Quien cotiza ve los mismos tres números** en `/presupuestos`, porque una
  agencia pide el neto por teléfono y no puede haber que sacarlo aparte.

**De paso se arregló algo que venía de antes**: a 393px la tabla del
documento corría la página entera 11px hacia el lado. Ahora va en una caja
que se desplaza, con `relative`, como las tablas del panel — y esa caja
**deja de recortar al imprimir** (`.caja-tabla` en el `@media print`), porque
en la hoja hay ancho de sobra y lo que sobresaliera se perdería sin que nada
lo dijera.

### Lo que no tiene, y conviene que sea una decisión

- **No aparece en `/extras`.** Esa pantalla contesta quién hace el show; un
  presupuesto es otra pregunta, igual que las actividades no aparecen en el
  calendario de la portada.
- **No manda el link solo.** Se copia y se pega en WhatsApp.
  `enlaceWhatsApp()` ya está escrito en `contacto.ts` esperando la pantalla
  que lo use, y el teléfono del cliente ya se guarda normalizado.

## Las cotizaciones (desde el 2026-11-10)

**El CRM del socio se dejó de usar para cotizar**: el cliente decidió que
las cotizaciones se gestionan en este panel, dentro de *Presupuestos*. El
CRM tenía errores de lógica y de flujo, y trabaja sobre otra base de datos.
Su código se revisó para aprender de él; las lecciones están abajo. **La
conexión del panel con el CRM (leer sus eventos y publicarle nuestros días)
sigue activa** hasta que se decida apagarla.

### Lo que reportó la vendedora, y de dónde salía

| Error en el CRM | La causa | Cómo se evita acá |
|---|---|---|
| El cliente se escribe varias veces | Copiado en el contacto, en cada cotización y en el contrato; cada cotización sin contacto creaba uno nuevo | **Una ficha por cliente** (`Clientes`); se busca antes de crear |
| Se saca el show ecuestre y sigue apareciendo | El show estaba también en un texto libre de "incluidos" | Lo incluido sale **de las líneas** (Fase 2) |
| No se pueden editar los ganados | Calendario de solo lectura, y guardar un ganado lo devolvía a "Cotizado" | Una cotización ganada sigue siendo editable y no retrocede sola |
| Precios de once y desayuno malos | Escritos en el código | Viven en el **catálogo**, los escribe el cliente |

También: la cotización decía 30% de reserva y saldo 3 días antes, y el
contrato 20% y 10 días; y el contrato perdía el descuento. **Las condiciones
de pago van en un solo lugar** (Fase 3).

### Decisiones tomadas con el cliente

- **Dos pestañas, cotización y reserva, sincronizadas.** Al ganar, la
  cotización crea su reserva; si se edita después, el sistema actualiza esa
  reserva. La reserva que nace de una cotización **no se edita a mano**
  (salvo lo del día: asistencia y estado del pago). Se descartó una sola
  pestaña porque `Reservas` alimenta medio panel y el sitio.
- **El vendedor elige 5, 10 o 15% de descuento y también puede escribir el
  precio a mano** (por ahora). El descuento va **por línea y sobre el
  total**. Los porcentajes viven en `Config` (`descuentos`).
- **IVA estándar de cotización**: líneas en neto, y abajo neto, descuento,
  IVA 19% y total. El catálogo dice si cada precio trae IVA o va + IVA.
  Que los precios del sitio y de las cotizaciones no cuadren **se arregla
  después**, a propósito.
- **Show ecuestre**: en un día público va siempre, incluido y sin costo; en
  un día privado, exclusivo o cerrado es opcional y suma su precio. Un día
  que no está en el calendario cuenta como privado.

### El catálogo: la pestaña `Menús`, en pantalla *Productos* (Fase 1)

**Un solo catálogo para lo que se vende y lo que se cotiza**, para que una
cotización convertida en reserva use los mismos nombres. Las columnas nuevas
van **al final** de la pestaña, así que una planilla vieja se lee igual:

| Columna | Valores | En blanco vale |
|---|---|---|
| Tipo | Menú · Extra · Arriendo · Show | Menú |
| Sitio público | sí / no | sí |
| Cotización | sí / no | **no** |
| Cobro | Por persona · Monto fijo | Por persona |
| Precio cotización | número (en UF con decimales) | sin poner |
| IVA | Incluido · + IVA | Incluido |
| Moneda | Pesos · UF | Pesos |

- **El tipo decide qué es gente**: solo las líneas de tipo Menú suman
  invitados. Reemplaza la columna "Personas" que había que llenar a mano en
  cada línea de presupuesto.
- **"Sitio público" no toca Shopify**: decide qué ofrece el formulario de
  reserva a mano (`paraReservar()`: tipo Menú y sitio público).
- **"Cotización" en no para lo que ya existía**: Tradiciones, por ejemplo,
  queda solo para el sitio hasta que alguien lo marque.
- El precio que propone una cotización es el suyo, y si no tiene, el de
  pagar en el local (`precioParaCotizar()`).
- **Un producto que ya se vendió o se cotizó no se quita: se desactiva**
  (2026-11-10, lo pidió el cliente). Columna `Activo` al final; en blanco es
  sí. Desactivado deja de ofrecerse (`paraReservar()`, `paraCotizar()`, y un
  show desactivado no se agrega solo a un día público), pero sigue en el
  catálogo: las reservas y cotizaciones viejas lo encuentran con su tipo y
  su IVA. Quitarlo dejaba a esas cotizaciones sin tipo, y sus personas en
  cero al editarlas. *Quitar* queda solo para lo que nunca se usó; el
  servidor rechaza con 409 quitar —o renombrar— uno usado
  (`quitadosUsados()`), así que en pantalla su nombre no se edita.
- **Los desactivados se esconden tras un botón grande, *Mostrar
  desactivados (N)*** (`MostrarDesactivados.tsx`), el mismo en Productos,
  `/equipo` —donde era una casilla chica— y `/extras`. Apretado dice
  *Ocultar desactivados* y los muestra apagados en la misma lista.
- **Los precios del sitio público siguen en `precios.json`**, aparte de esta
  pestaña. Son dos lugares hoy; unificarlos es parte del arreglo de precios
  que quedó para después.

### Los clientes: pestaña `Clientes`, pantalla `/clientes` (Fase 1)

Una ficha por cliente: ID (`C-0001`…), nombre, empresa del cliente, RUT,
domicilio, teléfono, correo y notas. Código en `lib/clientes.ts`.

- **Para crear basta un nombre y un teléfono o correo.** El RUT y el
  domicilio los pide el contrato: pedirlos al cotizar es lo que hace que
  alguien invente un RUT para poder seguir.
- **Antes de crear, el servidor busca parecidos** por RUT, teléfono o
  correo (`parecidos()`), y la pantalla pregunta *"¿es alguno de estos?"*.
  Solo con *"No, es otro"* se crea igual. **El nombre solo no cuenta**: dos
  Ana Soto son dos personas.
- **Una ficha con cotizaciones no se borra**, y lo comprueba la ruta.
- **Permiso `clientes`**: administrador, encargado, quien paga **y el
  vendedor**, que es quien atiende al cliente.
- **Los presupuestos de antes pasan a fichas con un botón** (*Crear las
  fichas*, en `/clientes`). `Presupuestos` ganó la columna `ID Cliente`, que
  se agrega sola. Dos presupuestos del mismo cliente quedan en una ficha, y
  correrlo de nuevo no duplica. Las columnas viejas de cliente se quedan
  hasta la Fase 2, para no perder nada.

### La empresa es la planilla

Cada panel lee **una sola planilla** (`GOOGLE_SHEET_ID`), así que no hay
columna "empresa" en productos, clientes ni cotizaciones: todo lo que hay en
una planilla es de esa empresa. **Calicanto tendrá su propia planilla**, con
el mismo código. Se eligió sobre una sola planilla con una columna empresa
en todo porque el error que importa es mezclar el cupo, el equipo o las
reservas de dos recintos, y con planillas separadas eso no puede pasar. La
contra a asumir: un cliente que cotiza con las dos tiene dos fichas, y la
vista del gerente general (Fase 5) las juntará por RUT.

Lo que cada panel sabe de sí mismo vive en `Config`: nombre comercial,
razón social, RUT, representante legal, domicilio, WhatsApp de ventas y los
datos para transferir el anticipo. Se editan en *Configuración* y **nacen en
blanco**: el CRM del socio los tenía escritos, pero no son dato confirmado
por el cliente.

### Fase 2: el calendario, el asistente y la reserva sincronizada (2026-11-10)

Decidido con el cliente: **candidato es el primer estado** de una
cotización (no algo aparte); **al ganar una alternativa, las otras del grupo
pasan solas a *No elegida***; **el vendedor ve todas y edita solo las
suyas**; y **se puede cotizar sin fecha exacta**, con una vista para
filtrarlas.

**Estados**: Candidato → Borrador → Enviada → Negociación → Ganada /
Perdida (con motivo) / No elegida. *Vencida* se deduce de la fecha, como
siempre. Los nombres viejos (`Enviado`, `Aceptado`, `Rechazado`) se leen
como los nuevos (`estadoNormal()`), sin reescribir la planilla.
- **Ganada no se pone a mano**: se llega por *Marcar ganada*
  (`/api/presupuestos/convertir`), que crea la reserva. **No elegida** la pone
  el sistema. Una ganada **no cambia de estado**: si el cliente cancela, se
  cancela la reserva en el día, que libera el cupo.

**Columnas nuevas** (al final, por nombre, se agregan solas):
`Presupuestos` gana *Invitados, Periodo, Tipo de evento, Grupo, Descuento
total, Motivo*; `Presupuesto Líneas` gana *Descuento, IVA, Sigue invitados*.
**Del cliente, una cotización nueva guarda solo el `ID Cliente`**: las
columnas *Cliente, Email, Teléfono* quedan en blanco y el nombre se resuelve
al leer (`conCliente()`). Las de antes de las fichas siguen mostrando lo que
tenían.

**Las reglas al guardar viven en `lib/cotizar.ts`** (`prepararLineas()`), y la
pantalla usa la misma función para mostrar, así que lo que se ve es lo que se
guarda:
- **La gente sale del tipo del producto**: Menú = su cantidad; lo demás, cero.
- **Ninguna línea sigue sola a los invitados** (desde el 2026-11-11, lo
  decidió el cliente: *"10 menús, pero solo 8 desayunan y 6 toman once"*).
  La once y el desayuno nacen con todos los invitados y se ajustan con − y
  +. El botón *Seguir a los invitados* se sacó; la columna `Sigue invitados`
  queda en la planilla por las filas viejas, que conservan su cantidad.
- **Un monto fijo —arriendo, show— no tiene cantidad**: va o no va. La
  pantalla no la muestra y `prepararLineas()` la deja siempre en 1.
- **El show ecuestre en un día público va siempre, incluido y a cero**, y no
  se puede quitar ni cobrar. En un día privado, exclusivo, cerrado o fuera
  del calendario es una línea opcional con su precio.

**Las cuentas son las de una cotización** (`cuentasDe()`): líneas en neto,
descuento por línea y sobre el total (5, 10 y 15 con un botón), IVA encima.
**Se suma en bruto y se baja a neto una sola vez**: llevar cada línea a neto,
redondear y volver a subir el IVA descuadraba por un peso (44 menús a $64.000
daban $2.816.001). Una línea sin marca de IVA —las de antes— cuenta como
"Incluido", así que su total no cambia.

**Precios en UF**: el catálogo ya los guarda, pero la conversión al valor
del día llega en la Fase 3. Hoy, al agregar un producto en UF, la línea nace
en $0 y la pantalla avisa que se escriba en pesos.

**La reserva derivada**:
- Se crea al marcar ganada, con el total de la cotización (descuentos e
  IVA) y la gente de sus menús o, si no tiene, sus invitados.
- **Editar una cotización ganada reescribe su reserva** (`sincronizarReserva()`):
  fecha, cliente, menús, personas y monto. Lo del día —asistencia, estado y
  nota del pago— no se toca. Si el día está cerrado, es una corrección con
  motivo (`guardaDelDia()`).
- **Editar la ficha del cliente reescribe las reservas** de sus ganadas.
- **Marcar ganada abre el día** (2026-11-11, lo reclamó el cliente: una
  ganada del miércoles 11 dejaba el día *sin cupo* con la gente adentro).
  Es la misma regla de una reserva a mano, `diaParaReservaManual()`, a
  través de `abrirElDiaSiHaceFalta()` en `datos.ts`: un día que no está en
  el calendario se crea **privado** con el cupo de siempre, uno cerrado se
  abre para nosotros, y uno sin cupo recibe el de siempre. Lo hace también
  `sincronizarReserva()`, así que **guardar una ganada de antes la arregla**
  y una ganada que cambia de fecha abre el día nuevo.
- **La reserva no se edita a mano** salvo lo del día, ni se borra: la ruta
  responde 409 y la página del día muestra *Cotización N° …* en vez de
  *Editar / Borrar*. **No hizo falta una columna nueva en `Reservas`**: el
  vínculo es el `ID Reserva` que la cotización ya guardaba.

**Las pantallas**:
- **`/presupuestos`** (en el menú, *Cotizaciones*): un calendario por semanas
  con una tarjeta por día —estado del día, candidatos, cotizaciones, ganadas
  y personas posibles, y *+ Cotizar este día*—, la vista **Sin fecha** y la
  vista **Todas** con filtro por estado y buscador. Los avisos de por vencer y
  vencidas siguen arriba.
- **Mías / De todos** (2026-11-12, lo pidió el cliente): dos botones arriba
  de Cotizaciones, con cuántas hay en cada uno. Filtran la pantalla entera
  —calendario, *Sin fecha*, *Todas* y los avisos— por quién la creó
  (`esSuya()` en `auth.ts`); **un grupo de alternativas va entero** si una
  es suya. No cambia quién puede tocar qué. El vendedor parte en *Mías* y
  los demás en *De todos*; la elección se recuerda en el navegador
  (`localStorage`, `blp-cotizaciones-de`).
- **La ventana de cotizar** (`CotizacionDialogo`) son cuatro pasos con
  botones: Cliente (buscar o crear, con la misma pregunta de parecidos),
  Evento (fecha o *todavía no hay día exacto*, invitados con − y +, tipo y
  notas; *Guardar como candidato*), Productos (botones por producto, precio y
  descuento por línea, descuento total y las cuentas) y Condiciones —antes *Enviar*— (estado, motivo
  de pérdida, Guardar, *Marcar ganada*, copiar link, WhatsApp, documento,
  *Hacer una alternativa*, borrar). Lo de otro vendedor se ve en solo
  lectura.
- **El día de cada tarjeta lleva el punto de color y su palabra debajo**
  (2026-11-11, lo pidió el cliente): *público*, *privado*, *exclusivo*,
  *cerrado*, con `PuntoDia`, igual que la portada, `/turnos` y `/extras`.
  Para el semáforo la pantalla pide además `/api/ocupacion` de las semanas
  que muestra; un día sin ocupación —cerrado sin reservas, o fuera del
  calendario, que dice *sin abrir*— se dibuja igual con `PuntoYPalabra`. Si
  la ocupación no llega, el calendario sale igual.
- **Abrir un día no lo agranda** (2026-11-11): la tarjeta queda del mismo
  tamaño, marcada en dorado, y sus cotizaciones van en una franja a todo el
  ancho bajo su semana. Antes se estiraba a dos columnas y arrastraba el
  alto de toda la fila.
- **`/clientes`**: cada ficha muestra su historial de cotizaciones, la ganada
  en verde y las alternativas marcadas, y *+ Cotizarle*.
- **El documento** (`/presupuesto/<token>`) dice *Cotización*, toma el cliente
  de la ficha y los datos de la empresa de Configuración, muestra el periodo
  si no hay día, y las líneas en neto con el IVA al final.

### El documento de la venta (2026-11-10)

Cada cotización dice con qué se vende: **Sin documento, Boleta o Factura**,
tres botones en el paso *Enviar*. Columna `Documento` de `Presupuestos`, al
final y por nombre (`documentoDe()`).

- **En blanco es "por definir"**, y así nacen todas por ahora (lo dejó así
  el cliente). Las de antes quedan por definir: no se inventa un valor.
- **Por ahora no cambia el precio.** Todas se calculan igual, neto + IVA;
  cómo se cobra según el documento —en especial sin documento, que es parte
  de la negociación— queda para después.
- **Con factura, la misma ventana pide los datos de facturación**: razón
  social, RUT, giro y dirección. **Se guardan en la ficha del cliente**, no
  en la cotización, para no pedirlos dos veces; la ficha ganó la columna
  `Giro`. Si falta alguno, **avisa en ámbar y no bloquea**
  (`faltaParaFactura()`): el dato puede llegar después.
- **La hoja del cliente lo dice** —*Con factura*— y con factura muestra el
  RUT, el giro y la dirección de la ficha.
- **No pasa a la reserva todavía.** La reserva que nace de una cotización
  apunta a ella por el `ID Reserva`, así que el dato está a un paso; copiarlo
  a `Reservas` se hace cuando haga falta exportarlo (Chipax).

### Los menús se reparten los invitados (2026-11-10)

Lo reclamó el cliente: con 40 invitados, agregar Lo Pirque y después Niños
ponía 40 en cada uno —80 personas—. Ahora:

- **Los invitados son la gente completa, niños incluidos**, y el paso 2 lo
  dice así.
- **Un menú nuevo toma solo los invitados que faltan** (`lineaDeProducto()`):
  el primero nace con 40, el segundo con 0.
- **Subir un menú se lo descuenta al primero** (`cambiarCantidad()`), con −
  y + grandes: Niños a 10 deja Lo Pirque en 30. El primero nunca baja de
  cero. Cambiar el primero no mueve los demás.
- **Nada sigue solo a los invitados** (desde el 2026-11-11): ni un menú ni
  la once. Se fuerza en `prepararLineas()`.
- Si igual no calzan, una línea ámbar dice cuántos sobran o faltan; si
  calzan, una verde lo confirma. No bloquea.

### La UF del día (2026-11-10)

Los productos con precio en UF (columna `Moneda` del catálogo) ya se
cotizan en pesos al valor del día. `lib/uf.ts` lee las respuestas y
`lib/ufRed.ts` las pide; la ruta es `/api/uf`.

- **Fuentes: api.boostr.cl primero, mindicador.cl de respaldo**, las dos
  abiertas en Network access. **Las dos fallan a ratos** (comprobado ese
  día): boostr alterna entre el valor y un `{"status":"error"}` **con HTTP
  200**, y mindicador a veces no contesta. Por eso cada una se intenta dos
  veces, un valor fuera de $10.000–$200.000 se descarta, y **se guarda solo
  un valor bueno** seis horas con `unstable_cache`: la caché de `fetch`
  guardaría también el error, que es un 200.
- **La UF de la cotización queda fija** (columnas `UF` y `Fecha UF`). Se
  pide la primera vez que se agrega un producto en UF, y se cambia solo con
  *Usar la UF de hoy*: el cliente ya recibió una cifra en pesos.
- **La línea guarda su precio en UF** (`Precio UF` en `Presupuesto
  Líneas`) y el precio en pesos lo calcula `prepararLineas()` con la UF de
  la cotización, en la pantalla y en el servidor por igual.
- **La hoja del cliente** muestra *(UF 60,5 c/u)* en la línea y con qué UF
  se convirtió.
- **En local `/api/uf` falla con `ENOTFOUND`**, como el pronóstico: `next
  dev` no pasa por el proxy. Para probar, se baja la respuesta con `curl` y
  se le pasa a `ufDeBoostr()`.

### Avisos de plata en `/presupuestos` (2026-11-10)

`avisosDeCobro()` en `lib/cobros.ts`, con sus pruebas. Dos avisos:

- **Ya pagó el anticipo y falta marcarla ganada** (verde): el cliente
  cumplió y nadie le tomó la fecha; mientras tanto otro puede reservarla.
- **Saldos por cobrar** (ámbar) de las ganadas, desde 7 días antes de que
  venza (`DIAS_AVISO_SALDO`); vencido, el botón va en rojo.

No hay aviso de "anticipo vencido": el anticipo no tiene plazo propio,
porque es lo que permite ganar.

### Alternativas, guardado y paso a borrador (2026-11-10)

Lo pidió el cliente probando la ventana de cotizar.

- **Las alternativas viven dentro de la cotización.** Por dentro siguen
  siendo filas de `Presupuestos` con el mismo `Grupo`; lo que cambió es cómo
  se ven: **un número por cotización —el del grupo— y una letra por
  alternativa** (*Cotización N° 1002 · Alternativa B*, `letraDe()`). En la
  ventana hay una pestaña por alternativa, con su total, y *+ Otra
  alternativa*, que guarda lo escrito, crea la copia y la abre ahí mismo.
  En el calendario y las listas un grupo es **una** tarjeta, con la pastilla
  *N alternativas* (`alternativasDe()`, `principalDe()`). La hoja del
  cliente dice la letra.
- **Las alternativas no suman gente dos veces**: `posiblesPorDia()` cuenta
  de cada grupo una sola, la de más personas. Antes 40 invitados con dos
  alternativas eran 80 posibles.
- **Pasar de Evento a Productos guarda solo** (`irA()`): un candidato pasa
  a *Borrador*, y una cotización nueva se crea. La ventana se reabre sobre
  la cotización ya guardada, así que desde ahí se pueden anotar pagos y
  subir comprobantes. **La ventana de antes se queda a la vista mientras
  carga la otra** (2026-11-12, lo reclamó el cliente: *"desaparece todo el
  pop-up"*), tapada por un *Abriendo…* que impide apretar dos veces; vale
  también para crear una alternativa y cambiar entre A y B
  (`abrirOtra()` en `CotizacionesVista`). Antes se cerraba y quedaba la
  pantalla vacía hasta que contestaba la planilla. Antes, una cotización recién creada seguía tratándose
  como nueva en la misma ventana y no ofrecía pagos.
- ~~"Seguir a los invitados"~~ — **se sacó el 2026-11-11**: ver "Las reglas al
  guardar". Lo por persona se ajusta con − y +; un monto fijo no tiene
  cantidad.
- **El pie de cada paso es el mismo** (2026-11-11, lo pidió el cliente:
  *"estás con el botón abajo, ¿qué estoy haciendo?"*). A la derecha, el
  dorado dice a dónde va —*Ir al paso 3: Productos →*—; debajo, una línea
  solo si seguir hace algo más, como *"Al seguir, se crea la cotización"*;
  a la izquierda, *← 2 · Evento*. **El paso 4 dejó de llamarse *Enviar***
  —sonaba a que se le mandaba algo al cliente— y es **Condiciones**:
  documento, pago, contrato y cierre, con *Mandarla al cliente* como un
  bloque más.

### El botón de guardar es uno para todo el panel (2026-11-10)

Regla del cliente: *"cuando un botón ya se guardó, que me indique… y cuando
no hay nada para guardar, que esté en gris"*. `BotonGuardar.tsx`: dorado
*Guardar* con cambios, *Guardando…* mientras guarda, **gris *✓ Guardado***
sin nada pendiente. Lo usan la ventana de cotizar (que compara una firma
de lo escrito contra lo último guardado), Productos, Equipo, Extras,
Cuentas y Clientes. **Todo botón de guardar nuevo va con este
componente.** Lo que se guarda solo sigue con `AvisoGuardado`.

**Una cotización ya creada se guarda sola** (2026-11-10, lo pidió el
cliente: ahorrar el *Guardar* donde se pueda). **Desde el 2026-11-12 no
tiene botón Guardar**: donde estaba dice *✓ Guardado* / *Guardando…*
(`AvisoGuardado`), y abajo queda solo *Ir al paso N*. El botón vuelve solo
en una ganada. Cambiar de paso deja la ventana arriba. Es la regla de siempre —se
guarda solo lo que es un valor sobre algo que ya existe— y una cotización
creada lo es: cantidades, precios, descuentos, documento, condiciones.
`usarAutoguardado` con 1,2 s de espera; al cerrar la ventana o cambiar de
alternativa manda lo pendiente. El botón queda igual, en gris *✓ Guardado*
casi siempre. **Siguen con botón, a propósito**: una cotización **ganada**
(guardarla reescribe su reserva, y en un día cerrado es una corrección con
motivo), y las fichas de Productos, Equipo, Extras, Clientes y Cuentas (el
nombre es la identidad de la fila, y en las fichas el cliente pidió ver
*"Cambiaste teléfono"* antes de guardar). Comprobado: apretar **+** en una
cantidad manda un solo guardado y el botón vuelve a *✓ Guardado*.

### Condiciones de pago y cobros al cliente (2026-11-10)

**Un solo lugar dice cuánto es el anticipo y cuándo vence el saldo**:
`condicionesDe()` en `lib/cobros.ts`. La usan la ventana de cotizar, la
hoja del cliente y, en la Fase 4, el contrato. En el CRM del socio la
cotización decía 30% y 3 días y el contrato 20% y 10.

- **Configuración trae el valor por defecto**: anticipo 30% y saldo 3 días
  antes del evento (`anticipo_porcentaje`, `saldo_dias_antes`; se partió
  con los de la cotización del CRM). **Cada cotización los puede cambiar**
  —columnas `Anticipo %` y `Saldo días antes`—, porque se negocian. **En
  blanco rige Configuración; un 0 en el anticipo es *sin anticipo***, que
  es distinto (`numeroONulo()`). Se probó rompiéndolo: tratar el 0 como
  blanco hace fallar una prueba.
- **El anticipo se redondea al peso y el saldo es la resta**: los dos suman
  el total siempre.
- **El anticipo también se puede acordar en pesos** (2026-11-12, lo pidió el
  cliente: *"págame 500 más"*). Al lado del % hay *o un monto acordado*; si
  se escribe, **manda sobre el %** (columna `Anticipo monto` de
  `Presupuestos`, al final; `montoONulo()`), nunca pasa del total, y la
  pantalla y la hoja dicen *Anticipo acordado* en vez del %. *Volver al %*
  lo borra.
- **Lo pagado es del evento**: mientras ninguna alternativa esté ganada, la
  ventana de cada una cuenta lo anotado en todas (*"Anotado en otra
  alternativa, cuenta para esta"*), así que a la C solo le falta la
  diferencia de su anticipo. Lo mismo comprueba `/convertir`, y al ganar
  los cobros pasan a la ganadora.
- **Se guardan los cobros, no una casilla**: pestaña `Cobros` (ID · ID
  Presupuesto · Fecha de pago · Concepto · Monto · Medio · Nota ·
  Registrado por · Cuándo). Concepto *Anticipo*, *Saldo* u *Otro*; el
  medio es texto libre. **Todo lo cobrado cuenta primero para el
  anticipo**, se haya anotado con el concepto que sea. Un error se
  **deshace** (borra la fila, queda en la bitácora); una devolución de
  verdad es un cobro en negativo.
- **Los anota también el vendedor**, de sus cotizaciones
  (`puedeTocarPresupuesto()`), por `/api/presupuestos/cobros`. Lo comprueba
  la ruta.
- **Si hay anticipo, una cotización no pasa a ganada hasta que esté
  pagado** (lo decidió el cliente). Lo comprueba `/convertir` con 409; en
  pantalla el botón se apaga y una línea ámbar dice cuánto falta. Con
  *Sin anticipo* se gana sin cobros.
- **La reserva de una ganada toma su estado de pago de los cobros**
  (`actualizarPagoDeReserva()`): *Pagada* cuando cubren el total, *Por
  pagar* mientras falte. Una que liberó su lugar no se toca.
- **La hoja del cliente muestra las condiciones** y, si están en
  Configuración, los datos para transferir.
- **El comprobante y la revisión**: ver la sección que sigue.

### Comprobantes de pago en Google Drive, y la revisión (2026-11-10)

Cada cobro puede llevar **una foto o un PDF del comprobante**, y quien hace
los pagos **marca que lo revisó**. Decidido con el cliente: **Google Drive y
no Vercel Blob**, porque el dominio `lopirque.cl` es Google Workspace.

- **Dónde**: una **unidad compartida** del Workspace ("Comprobantes
  panel"), con la cuenta del panel —`brasas-panel@brasas-panel.iam.
  gserviceaccount.com`— como miembro con rol **Gestor de contenido** (sube
  y ordena, no administra miembros). Tiene que ser unidad compartida: una
  cuenta de servicio no tiene espacio propio en Drive. Su ID va en
  **Configuración → Carpeta de comprobantes** (`drive_comprobantes`; se
  puede pegar el link entero, `idDeDrive()` saca el ID). En blanco no se
  puede subir y la pantalla lo dice. La **Google Drive API** tiene que estar
  activada en el proyecto `brasas-panel` de Google Cloud.
- **Privado**: el archivo **nunca se sirve por un link público**. *Ver
  comprobante* pasa por `/api/presupuestos/cobros/comprobante`, que
  comprueba el permiso. El alcance es `drive.file`: el panel solo ve lo que
  él mismo creó, no el resto de la unidad.
- **Ordenado**: una carpeta por cotización, *Cotización 1002 – Eventos del
  Maipo*, y el archivo con fecha, concepto, monto e id del cobro.
- **Tope de 4 MB**, porque **Vercel no recibe más de 4,5 MB** en una
  petición. Las fotos las achica el navegador antes de subirlas
  (`achicarFoto()`: 1600 px, JPEG al 82%), así que una foto de celular de
  5 MB llega en unos cientos de KB. Un PDF va tal cual.
- **Lo sube quien anota el cobro** (el vendedor, en sus cotizaciones).
  **Cambiar el comprobante deja el cobro sin revisar**: lo revisado era el
  archivo anterior. Deshacer un cobro no borra su archivo de Drive.
- **La revisión** (columnas `Revisado por` y `Revisado` de `Cobros`) es del
  permiso **`pagar`** —administrador y quien paga—, no del vendedor: la
  gracia es que lo compruebe alguien distinto de quien lo anotó. Se ve por
  forma: *✓ Revisado por Felipe* relleno en verde, *sin revisar* con borde
  ámbar. **Un cobro revisado solo lo deshace quien revisa.**
- **Aviso en `/presupuestos`**, solo para quien paga: *N cotizaciones con
  cobros por revisar*, con cuántos y cuánto.
- Los errores de configuración se dicen con palabras (`errorDeDrive()`):
  la API sin activar, o la cuenta sin acceso a la unidad.

**La conexión con el CRM del socio está apagada** desde el 2026-11-10: ver
"El CRM del socio" más abajo. Con eso se cerró también que el vendedor
viera sus eventos.

### La página de Configuración, por secciones (2026-11-10)

Lo pidió el cliente porque *"ya estamos ampliando mucho esa parte"*. Son
seis tarjetas, cada una con su título en dorado y una línea que dice para
qué sirve, y arriba **un botón por sección** para saltar a ella:
**Reservas del sitio** (días, horario, cupo, días hacia adelante, últimos
lugares) · **Calendario del panel** (semáforo, grupo grande) ·
**Cotizaciones** (vigencia, descuentos, anticipo, saldo, carpeta de Drive) ·
**Contrato** (ciudad de firma y las medidas de tranquilidad) · **La
empresa** · **Mantención**. Van ordenadas por a quién afectan: primero lo
que ve el cliente del sitio, después el equipo, después la venta de
eventos. De paso pasaron a la regla PlayStation —títulos a 15px, ayudas a
13, cajas de 44px con su unidad al lado— y aparecieron dos campos que
existían en `Config` sin pantalla: la hora de cierre y la vigencia de una
cotización.

### El contrato (Fase 4, 2026-11-10)

**Sale de la cotización y no se escribe nada dos veces.** Es una página,
`/contrato/<token>` —el mismo token del link de la cotización—, que se
imprime a PDF desde el navegador como la hoja de la cotización. Código en
`lib/contrato.ts` (puro, con pruebas) y `components/HojaContrato.tsx`.

| Del contrato | De dónde sale |
|---|---|
| Prestador: razón social, RUT, representante y su cédula, ciudad de firma | Configuración (`empresa_ci_representante` y `contrato_ciudad` son nuevas) |
| Cliente: nombre, RUT, domicilio, teléfono | Su ficha. Una empresa firma por su razón social, representada por la persona de la ficha |
| Lugar, fecha, invitados | La cotización; el lugar es el del negocio |
| Horario | La columna `Horario` de la cotización; en blanco, el de Configuración |
| Precio | **La misma tabla de la cotización** (`TablaCotizacion`), con sus descuentos y el IVA |
| Anticipo y saldo | `condicionesDe()`, la misma de la cotización |

- **El texto es el del contrato del CRM del socio**, que es el que los
  clientes ya firmaban: no se redactó ninguna cláusula. Se arreglaron tres
  cosas, decididas con el cliente: el precio va línea por línea (el CRM lo
  partía en adulto/niño/"después de la comida" y perdía el descuento); la
  cláusula sexta dice el prestador, no *"Asados y Corderos"* escrito fijo; y
  **el anticipo se paga al firmar**, no "en N días": el panel ya exige el
  anticipo pagado para ganar, y otro plazo sería una cosa más que
  configurar.
- **La Ley 20.393 es una casilla** y **los acuerdos adicionales son texto
  libre**, por cotización (columnas `Ley 20.393` y `Acuerdos adicionales`).
  La numeración se corre sola: con las dos, la última es la DÉCIMA.
- **Lo que falta sale con una raya** para completarlo a mano, y la ventana
  lo avisa en ámbar sin bloquear: el RUT y el domicilio del cliente, los
  datos de la empresa en Configuración, el día. **La fecha de firma va
  siempre en raya**: se escribe a mano al firmar.
- **El RUT y el domicilio se escriben en el bloque Contrato y van a la
  ficha** del cliente, igual que los datos de la factura. Con factura no se
  repiten: son los mismos campos. El RUT se controla (`CampoRut`).
- **El horario se elige con − y + de media hora** (2026-11-12, lo pidió el
  cliente: *"siempre el mismo formato"*), y se guarda como `13:00 a 18:00`
  (`normalizarHorario()` en `contrato.ts`, también en el servidor). En
  blanco rige el de Configuración; lo escrito a mano antes se lee si se
  entiende y si no se deja tal cual, con un aviso.
- **Ganada, el paso 5 no vuelve a ofrecer ganarla**: dice lo que falta para
  completar la reserva —*✓ Ganada y firmada · falta el saldo*, con *Pagó el
  saldo*— o *Cerrada* si no falta nada.

**Se firma en papel, en dos ejemplares, y se sube el firmado** (lo decidió
el cliente; era lo que se hacía con el CRM). La foto o el PDF va a Drive, a
la carpeta de la cotización junto a sus comprobantes, por
`/api/presupuestos/contrato` —que nunca lo sirve por un link público—.

- **Que esté subido es lo que dice "Contrato firmado"**: columnas
  `Contrato firmado` (el id en Drive), `Contrato subido por` y `Contrato
  subido`. No hay una casilla que pueda decir "firmado" sin el papel.
- Lo sube quien puede tocar la cotización (el vendedor, las suyas).
  Cambiarlo reemplaza al anterior; *Quitar* lo desvincula y el archivo
  queda en Drive. No se acepta del navegador por la ruta de las
  cotizaciones, y **una alternativa nace sin contrato**.
- **El link sigue vivo después de firmar.** Si se cambia la cotización, el
  contrato del link deja de coincidir con el papel, y la ventana lo dice:
  el que vale es el firmado.
- **No es requisito para marcar ganada**: eso sigue siendo el anticipo.
- **Las medidas de tranquilidad son configurables** (lo pidió el cliente
  el mismo día): cuántos cambios de fecha, hasta cuántos días antes se
  cancela y qué % de la reserva se devuelve, en Configuración → Contrato
  (`contrato_cambios_fecha`, `contrato_cancelacion_dias`,
  `contrato_reembolso`). Parten en 2, 60 y 20, los del CRM. **Un 0 saca la
  frase** del contrato —no se promete lo que no se ofrece— y sin ninguna de
  las dos no hay cláusula; la numeración se corre sola. Valen para los
  contratos que se impriman desde ahí: el papel ya firmado no cambia.
- **Sin la versión de matrimonio** (Novia y Novio, dos firmas) que tenía el
  CRM: queda para la Fase 5, con Calicanto.

### Mandarla, el seguimiento y los hitos (2026-11-11)

Lo pidió el cliente: que el panel acompañe al vendedor por las etapas,
*"estilo PlayStation… ayudar al usuario de la forma más fácil posible"*.

- **Mandarla abre y después pregunta.** WhatsApp y Correo (abre el programa
  de correo con el link, el asunto y el correo de la ficha) son **enlaces de
  verdad**: abren el mensaje listo para mandar, y **al volver al panel**
  —la página vuelve a estar a la vista o recupera el foco— preguntan *¿Le
  mandaste la cotización a …?*. Si la página nunca se fue, pregunta a los 3
  s. Copiar link pregunta enseguida. *Sí, la mandé* la pasa a **Enviada**.
  No hay WhatsApp ni correo conectados al panel; cuando los haya, la
  pregunta se reemplaza.
  **WhatsApp se abre con `window.open` y, si el navegador lo bloquea, en la
  misma pestaña** (`abrirFuera()`, 2026-11-12). Dos veces pasó que el botón
  solo preguntaba sin abrir nada —primero con un `window.open` sin
  respaldo, después con el enlace pelado—: un bloqueo de pestaña nueva no
  avisa, `window.open` sí (devuelve `null`). Y la pregunta trae *¿No se
  abrió WhatsApp?* con *Abrir de nuevo* y *Copiar el mensaje*.
- **El orden del paso 4** (2026-11-12, lo pidió el cliente): arriba
  *Documento* y *El pago*; al final, mandarla y *Seguimiento y envío*.
  Mientras no se haya mandado, el cuadro de mandarla va **antes** del
  seguimiento. Ya mandada, el próximo paso —el anticipo, *Marcar ganada*,
  el saldo— vuelve a ir al final, debajo del seguimiento.
- **La vigencia corre desde el envío**, no desde la creación: una nueva nace
  sin `Válido hasta`, y la primera vez que queda Enviada o en Negociación
  —con el botón o eligiendo la etapa a mano— el servidor anota `Enviada` y
  calcula la vigencia. **Un candidato o un borrador no vence** (`estaVencido()`).
- **Solo lo mandado cuenta en el calendario principal**
  (`cuentaEnElCalendario()`; `posiblesPorDia()` con `soloMandadas`). El
  borrador se conversa y cambia; recién mandado es gente que puede venir.
  En Cotizaciones siguen viéndose todas (`cuentaComoPosible()`).
- **El seguimiento** (`seguimientoDe()`): arriba de Cotizaciones,
  *Esperando respuesta*, con una tarjeta por cotización mandada que lleva
  N días sin moverse, o cuyo evento está a N días o menos sin ganarse. Se
  contesta ahí: *Está negociando*, *Se perdió* (con el motivo), *Sigue
  esperando* (posterga N días) y, si el evento está cerca, *Se ganó*. Los
  dos plazos son **por cotización** (`Recordar a los días`, `Preguntar días
  antes`) y en blanco rige Configuración (`seguimiento_dias` = 5,
  `seguimiento_antes_evento` = 14). En 0 no pregunta. El servidor pone
  `Último seguimiento`; el navegador nunca escribe esas fechas.
- **El estado no se elige con botones** (2026-11-12, lo pidió el cliente:
  *"se dobla información"*). Los botones *Candidato · Borrador · Enviada ·
  Negociación · Perdida* de la sección Seguimiento repetían el camino de
  arriba, y apretar el marcado lo devolvía a Borrador sin avisar: con eso
  desaparecía *Marcar ganada*. Ahora avanza solo con acciones: *Sí, la
  mandé* (Enviada), *Están negociando*, *Se perdió…* (con su motivo y
  *No se perdió: volver a abrirla*, que reabre también las alternativas del
  grupo) y *Marcar ganada*. **Y *Todavía no se mandó*** deshace un *Sí, la
  mandé* apretado por error: vuelve a Borrador con las alternativas del
  grupo, y el servidor borra la fecha de envío y la vigencia.
- **Cambiar precios de una Enviada** muestra una franja: *¿Están
  negociando?* con *Pasar a Negociación*. **Compara contra los precios del
  momento en que quedó Enviada**, no contra cómo se abrió la ventana: con la
  base al abrir, armar las líneas y después apretar *Sí, la mandé* sacaba la
  franja en el acto (lo reclamó el cliente el mismo día).
- **El contrato se manda igual que la cotización** (2026-11-11, lo pidió el
  cliente): WhatsApp, Correo, Copiar link y Ver el contrato, en la sección
  El contrato y en el próximo paso de una ganada. Al volver pregunta *¿Le
  mandaste el contrato?*; el sí anota `Contrato enviado` (la fecha la pone
  el servidor, con `seguimiento: 'contratoEnviado'`). Si a los N días del
  seguimiento no se subió el firmado, *Esperando respuesta* pregunta
  *¿te lo devolvió firmado?* con *Sí: subir el firmado* y *Todavía no*
  (`seguimientoDe()`, motivo `contratoSinFirmar`, que vale también para una
  ganada). Subir el firmado lo apaga.
- **El paso 4 es un camino de hitos**: arriba, *Enviada → Anticipo → Ganada
  → Contrato firmado → Pagada* como trofeos; **al final**, después de todas
  las secciones, **un solo bloque grande con el próximo paso** (mandarla, el
  anticipo, **Marcar ganada** en verde a todo el ancho, el contrato, el
  saldo). Va al final a pedido del cliente: primero se revisa el
  seguimiento, los datos y el contrato, y recién ahí se gana. Ganar se
  festeja con 🎉.
- **Las secciones tienen color**: Seguimiento y envío en rosado, Documento neutro,
  El pago en verde, El contrato en cielo con *Cambios de fecha y
  cancelación* en ámbar adentro. **Guardar, Borrar y Cancelar evento van
  abajo, chicos y separados**: nunca al lado del hito.
- **Tres tamaños de botón**: hito (ancho completo, 56–64px, con color y la
  frase de lo que pasa), acción (44px) y secundario (delineado y chico).
  Un solo hito a la vista. Es la regla para todo el panel.

### Cinco pasos: el envío y el contrato van separados (2026-11-11)

Lo pidió el cliente: el paso 4 mezclaba dos conversaciones con el cliente
—la cotización y el contrato— en una pantalla larga con hitos al medio.
Ahora la ventana de cotizar son **Cliente · Evento · Productos · Envío ·
Contrato**, y cada uno de los dos últimos termina en su propio próximo paso.

| Paso | Qué tiene | Su próximo paso |
|---|---|---|
| **4 · Envío** | En qué va, documento, condiciones de pago y los pagos del cliente, y al final mandarla y los recordatorios | Mándasela → esperando el anticipo → **Marcar ganada** |
| **5 · Contrato** | Datos, horario, Ley 20.393, acuerdos, cambios de fecha y cancelación, mandar el contrato, el firmado | Mándale el contrato → esperando el firmado → **Marcar ganada** → el saldo |

- **Marcar ganada aparece en los dos** (`puedeGanar()` en `cobros.ts`, la
  misma regla en la ruta `/convertir` y en la pantalla): con el anticipo
  pagado, **o con el contrato firmado subido aunque falte el anticipo** —lo
  decidió el cliente: *"en contratos obviamente solo puede marcar ganado si
  está el contrato"*—. Con *Sin anticipo* también se ofrece en Envío.
- **Ganar pregunta en una ventana**, no un `confirm()`: qué reserva se crea y
  para qué día, y si no hay anticipo pagado ni contrato firmado lo dice en
  ámbar —*"¿Tienes un contrato firmado? Si es así, súbelo"*— con *Ir a subir
  el contrato* y *Sí, marcarla ganada igual*.
- **Ganar sin un peso y sin contrato pregunta en serio** (2026-11-12, lo
  reclamó el cliente: con anticipo 0 se ganaba sin preguntar nada). La
  advertencia de arriba solo aparecía si la cotización pedía anticipo
  (`cond.pct > 0`), así que *Sin anticipo* se la saltaba. Ahora, sin ningún
  pago del evento y sin contrato firmado (`ganaSinRespaldo()` en
  `cobros.ts`), la ventana dice **✋ ¿Por qué la marcas ganada sin
  anticipo?** —*¿Tienes un contrato firmado? Súbelo antes*— con **📎 Sí, ir
  a subir el contrato** y **No, marcarla ganada igual**, y avisa que la
  reserva queda **sujeta a espacio**: nace *Por pagar* (`pagoPorCobros()`),
  así que `tienePrioridad()` la trata igual que una de Shopify sin pago. Ya
  ganada, el aviso de arriba de la ventana pasa de verde a ámbar cortado:
  *⚠ Ganada sin pago ni contrato: sujeta a espacio*, hasta el primer pago.
  En la bitácora, *Marcó ganada* lleva *sin pago ni contrato: sujeta a
  espacio*. **El contrato firmado sin pago respalda el ganar pero no da
  preferencia**: la preferencia sigue siendo de la plata.
  **Decisión abierta** (2026-11-12): si un contrato firmado sin pago
  debería darle preferencia a la reserva. Es una decisión comercial que la
  gerencia todavía tiene que conversar; hasta que la tome, queda como está
  —sujeta a espacio hasta el primer pago— y no se cambia sin que lo diga.
- **Los botones de mandar no se repiten**: antes de mandarla —la cotización
  o el contrato— están grandes en el próximo paso; después quedan en la
  sección como *Mandar de nuevo*. Lo mismo el subir firmado.
- **Borrar** va en Envío; **Cancelar evento** en Contrato, porque la
  devolución sale de sus condiciones. *Esperando respuesta* abre el paso 5
  cuando lo que falta es el contrato firmado.

### Las alternativas: se mandan juntas y se elige una antes de ganar (2026-11-11)

Lo pidió el cliente: crear una alternativa tenía que estar más a mano, y
*"en la sección envío tengo que ver que existen tres variantes, le mando las
tres… y sobre todo, antes de marcar como ganado, tiene que decidir cuál de
las alternativas usa"*.

- **Crear una está a la vista**: la franja *Alternativas* (A · B · C con su
  total) sale desde el paso 2 aunque haya una sola, con *+ Crear alternativa
  B*; y el paso 3 termina en un bloque *¿Le ofreces otra versión?*. Copia
  todo y se abre ahí mismo.
- **Un solo link para todo el grupo** (`paraElLink()`): mientras se decide,
  `/presupuesto/<token>` muestra las alternativas en carrera una debajo de
  la otra, cada una con su letra, su total, su tabla y sus condiciones.
  Cualquier token del grupo abre lo mismo. Un candidato no sale.
- **Lo de la conversación vale para todo el grupo**: *Sí, la mandé* —también
  *Mandar de nuevo*— pasa a Enviada a todas las que siguen en carrera; y
  pasar a Negociación, perderla o *Sigue esperando* también se copia. Solo
  hacia adelante (en el `PATCH`): pasar una de candidato a borrador no
  devuelve a las otras.
- **Elegir es un paso propio** (`/api/presupuestos/elegir`): *¿Con cuál
  alternativa se quedó?*, un botón grande por alternativa, en el próximo
  paso del 4 (ya mandada) y arriba del 5. Las otras pasan a **No elegida** y
  **el mismo link pasa a mostrar solo la elegida**. *Volver a ofrecer todas*
  lo deshace mientras ninguna esté ganada. Elegir no toca el cupo.
- ~~**Ganar exige una sola en carrera**~~ — **cambió el 2026-11-12**: **ganar
  una alternativa es elegirla** (lo decidió el cliente: *"ganar elige
  sola"*). *Marcar ganada* aparece en cada alternativa con su anticipo
  pagado, la confirmación dice *"El cliente se queda con la A: la B pasa a
  No elegida"*, y `/convertir` ya no exige elegir antes. El paso aparte se
  perdía: el cliente había elegido la B y no quedó tomado (justo ese
  minuto la planilla cortaba por el límite de lecturas). **Tampoco hay que
  elegir para el contrato** (2026-11-12, *"la que se eligió pasa a
  contrato"*): el paso 5 dice *"Este contrato es de la alternativa B"* y
  manda el de la que está abierta; ganarla con ese contrato firmado la
  elige. Una alternativa que no quedó dice *"el cliente se quedó con la
  A"* y no tiene próximo paso.
- **Una ganada a medias se vuelve a vincular, no se duplica** (2026-11-12).
  Ganar escribe la reserva y después el vínculo; si lo segundo falla (el
  límite de Google), la cotización aparece en el aviso verde *"ya pagó el
  anticipo y falta marcarla ganada"*, y apretar otra vez creaba una
  segunda reserva. `/convertir` busca primero una reserva viva de ese día
  con la nota *"De la cotización N° …"* que ninguna cotización reclame, y
  la usa. Un error al ganar sale además en el aviso flotante.
- **El aviso verde abre el paso 4**, que es donde está *Marcar ganada*.
- **Con varias alternativas, un botón por cada una** (2026-11-12, lo pidió
  el cliente: estaba en la A, la marcó ganada y el cliente había elegido la
  B). En vez de un solo *Marcar ganada*, el próximo paso pregunta *¿Con cuál
  alternativa se quedó el cliente?* con **✓ Ganó la A · $980.000** y **✓ Ganó
  la B · $900.000**, cada uno apagado si a esa le falta el anticipo. La
  confirmación muestra **la letra en grande** con su total y su gente, y qué
  pasa con las otras. Se puede ganar la B desde la ventana de la A.
- **Lo pagado es del evento, no de una alternativa**: para ofrecer ganar una
  cuenta el anticipo anotado en cualquiera del grupo (`/api/presupuestos/
  cobros?grupo=1`), y `/convertir` hace lo mismo y, al ganar, **pasa los
  cobros de las otras a la ganadora** (`moverCobros()`).
- **Corregir la ganada** (`CorregirGanada.tsx`, `/api/presupuestos/corregir`),
  un botón chico abajo de los pasos 4 y 5 en una ganada, con tres salidas:
  **El cliente eligió la B** (deshace y pasa los pagos a la B; después se
  marca ganada la B), **Volver a antes de ganar** (queda con su anticipo) y
  **El cliente ya no viene** (abre *Cancelar evento*). Deshacer **borra** la
  reserva —no la cancela: nunca debió existir—, devuelve el día como al
  cancelar (`devolverElDia()`) y deja en carrera la ganada y sus *No
  elegida* (`grupoSinGanar()`: *Enviada* si se mandó, si no *Borrador*; una
  que iba en *Negociación* vuelve a *Enviada*, porque eso no se guarda). En
  un día cerrado pide motivo, como toda corrección. Reserva primero: si algo
  falla después, se ve y se reintenta.

### Si el día se llenó mientras se cotizaba (2026-11-11)

Lo pidió el cliente: el vendedor arma el borrador con cupo de sobra, después
Shopify u otro vendedor llena el día, y al ganarla ya no cabe.
`cupoParaGanar()` (`lib/dias.ts`, con pruebas) mira el día **como va a quedar
al ganarla** —el mismo cupo que le pondría `diaParaReservaManual()` a uno que
no existe o está cerrado— menos lo ya tomado. Un día exclusivo con alguien
adentro no cabe.

- **`/convertir` lo rechaza** con 409 y el mensaje: *"Se está excediendo el
  cupo del día: quedan N lugares y la cotización es de M personas. No
  podemos tomar la reserva. Comunícate con la administración para ver si se
  pueden abrir más cupos, o si habrá que cancelar la cotización."*
- **La ventana lo avisa antes**: pide lo tomado de ese día a
  `/api/ocupacion` cuando cambia la fecha, y muestra el aviso rojo bajo la
  fecha (paso 2) y en vez de *Marcar ganada* (pasos 4 y 5).
- **La contra a asumir**: un evento más grande que el cupo de siempre, en un
  día que todavía no está en el calendario, tampoco cabe. Es lo que pide el
  mensaje: que la administración abra ese día con más cupo antes de ganar.

### El evento exclusivo, y pedir liberar un día (2026-11-12)

Lo pidió el cliente: una cotización con **arriendo** tiene que preguntar si
el día es exclusivo —*"no obligarlo"*: con buena negociación puede venir
otro grupo— y, si ese día ya tiene reservas de otros, **no se automatiza
nada**: se avisa y decide alguien de arriba. Código en `lib/exclusivo.ts`
(puro, con pruebas) y `/api/presupuestos/exclusivo`.

- **La pregunta**: en el paso 3, si alguna línea es de tipo Arriendo
  (`tieneArriendo()`), un bloque morado *🟣 ¿El día es exclusivo?* con
  **Sí, exclusivo** y **No, puede venir otro grupo**. Se guarda solo, en la
  columna `Exclusivo` de `Presupuestos` (`sí`, `no` o en blanco). Sin
  contestar cuenta como no exclusivo.
- **Ganada exclusiva deja el día exclusivo**: `/convertir` pone el día en
  `Privada exclusiva` (`dejarExclusivo()` en `datos.ts`) y guarda cómo
  estaba en `Día pausado`. Cancelarla o deshacerla lo devuelve
  (`devolverExclusivo()`), solo si sigue privado y sin otra reserva.
- **Si ese día ya tiene reservas de otros, no se gana**: `/convertir`
  responde 409 y la ventana muestra la alarma morada *Es exclusivo, y ese
  día ya hay N personas reservadas*, en el paso 3 y en lugar de *Marcar
  ganada* (el hito dice *Falta liberar el día*). La regla de cupo no cambió:
  si el grupo no cabe, se pide abrir cupo como siempre.
- **El vendedor pide, no decide**: *🙋 Pedir liberar el día*
  escribe `Exclusividad` = *Pedida · quién · cuándo · nota*. Le llega a la
  **bandeja de aprobaciones** de quien tiene el permiso nuevo
  **`exclusividad`**: el encargado de operaciones, el de pagos, la gerencia
  general y el administrador. **El de operaciones entró el mismo día** (lo
  corrigió el cliente: *"lo aclaraste con la gerencia en algún momento
  puede ser, pero él al final lo tiene que gestionar"*): recibe el pedido
  en su bandeja, lo resuelve y ejecuta el plan de liberar el día.
- **El plazo vive en Configuración** (`exclusivo_dias_minimos`, 7, en
  *Cotizaciones*). Con menos días se puede pedir igual, como **caso
  especial**, y aprobarlo pide motivo.
- **En la bandeja**: quién pide, la cotización, cuántas reservas y personas
  habría que mover, y el plazo. Tres botones: **⏸ Dejar de vender el día**
  (pregunta; un día público pasa a privado mientras se decide, y se guarda
  cómo estaba), **✓ Aprobar** (pregunta qué pasa; también deja de venderlo)
  y **✕ Rechazar** (con motivo, que el vendedor ve en la cotización; si el
  día estaba pausado por este pedido, vuelve a venderse). Todo queda en la
  bitácora.
- **Los pedidos los arma `/api/ocupacion`** (`pendientesDeExclusivo()`),
  solo para quien tiene `exclusividad`, de la misma tanda de lecturas:
  `Clientes` se sumó a la precarga para el nombre. **Ninguna lectura más.**
- **Aprobado, la ventana lo dice** y manda al plan de la página del día
  (`/dia/<fecha>#liberar`).

#### Liberar el día, reserva por reserva (segunda entrega, 2026-11-12)

En la página del día, con el pedido aprobado y la cotización sin ganar, un
bloque morado **🟣 Liberando el día para un evento exclusivo**
(`BloqueLiberar.tsx`, `/api/reservas/exclusivo`): cuántas reservas siguen
en el día y cuántas están avisadas, y una tarjeta por reserva. Con el pedido
todavía esperando, solo una línea que lo dice.

- **Avisarle**: *💬 Avisarle por WhatsApp* abre el mensaje con disculpas y
  las dos salidas (`mensajeLiberacion()`: devolución completa, u otra fecha
  con un pisco sour de regalo), y *✓ Ya le avisé* lo deja escrito con quién
  y cuándo. Lo hace quien maneja los días (`dias`: los encargados también).
- **Lo que eligió**, solo con `exclusividad` y preguntando antes en la misma
  tarjeta:
  - **↺ Cambiar de fecha** **crea una reserva nueva** en el día elegido
    —mismo nombre, gente, menú, monto y pago, del mismo dueño— con la nota
    *"Reagendada desde el … por un evento exclusivo · 🎁 pisco sour de
    regalo"* (y el pedido de Shopify, si venía de ahí), y después libera la
    de este día. **No se le cambia la fecha a la misma fila** porque la de
    una reserva de Shopify la reescribe la tienda en cada sincronización.
    Reserva primero, como al ganar: si lo segundo falla, se ve doble. El
    día nuevo tiene que estar abierto y no ser exclusivo.
  - **✕ Cancelar y devolver $X**: deja su lugar y queda en **💸
    Devoluciones por hacer** —todo lo pagado, o lo abonado
    (`montoADevolver()`)— hasta que alguien marque *✓ Devolución hecha*.
    Las de Shopify dicen el número del pedido y que el reembolso se hace
    allá: **el panel no puede**, no tiene ese permiso.
- **Qué libera el lugar es la misma columna de soltar por cupo**
  (`Se cayó por cupo`), con el motivo *"Evento exclusivo: …"*; la pastilla
  dice *Liberada: evento exclusivo*. El paso de cada reserva va en una
  columna nueva de `Reservas`, **`Evento exclusivo`** (*Avisada · Cancelada
  · Devuelta · Reagendada*, con quién y cuándo), que se agrega sola y que
  Shopify no pisa (`camposDeShopify()`).
- **Una reserva de otra cotización no se toca acá**: dice *Viene de una
  cotización: se mueve desde ahí*, igual que al soltar por cupo.
- **Con la última movida**, el bloque dice *✓ El día quedó libre* con
  *Abrir la cotización N° …*: la alarma de la ventana desaparece sola y se
  puede ganar, y el día queda exclusivo.
- **Lecturas de Google**: avisar y cancelar, dos (la tanda de la ruta y la
  relectura de `Reservas` al escribir); cambiar de fecha, tres (escribe dos
  filas). Medido con el Google falso de `pruebas/lecturas/`.

### Cancelar una cotización ganada, y la devolución (2026-11-11)

Lo pidió el cliente: *"puede pasar igual que la reserva se cae… cambiar el
estado a cancelado y cómo gestionar si hay devolución de dinero"*. Código en
`lib/cancelacion.ts` (puro, con pruebas) y `/api/presupuestos/cancelar`.

- **Las condiciones de cancelación son por cotización**: cuántos cambios de
  fecha, hasta cuántos días antes se cancela y **qué % de lo pagado** se
  devuelve. Columnas `Cambios de fecha`, `Cancelación días` y `Reembolso %`;
  **en blanco rige Configuración** (2, 60 y 20), un 0 es 0. Se escriben en
  el bloque Contrato de la ventana de cotizar. **El contrato imprime esas
  mismas** (`tranquilidadDeCotizacion()`), y dice *"de lo pagado"*: lo que
  se negocia es lo que se firma y lo que se aplica.
- **Cancela quien puede tocar la cotización, el vendedor incluido** (lo
  decidió el cliente). Botón *Cancelar evento* en el paso Enviar, solo en
  una ganada. Pregunta en serio: muestra cuántos días faltan, si está en
  plazo, cuánto pagó el cliente y **propone** la devolución
  (`devolucionSugerida()`): en plazo, el % sobre lo pagado; fuera de plazo
  o sin días de cancelación, nada. **El monto se puede cambiar** —se
  negocia—, nunca por encima de lo pagado. El motivo es obligatorio.
- **Qué hace**: la reserva pasa a `cancelled` (libera el cupo; la fila
  queda), la cotización a **Cancelada** con `Cancelada por`, `Cancelada` y
  `Devolución acordada`. Primero la reserva, después la cotización, por lo
  mismo que al ganar. En un día cerrado es una corrección (`guardaDelDia()`).
- **Una cancelada no se edita ni vuelve atrás**: el `PATCH` responde 409, y
  `sincronizarReserva()` no la toca (editar la ficha del cliente pasa por
  ahí). Se ve en solo lectura salvo sus pagos. Si el cliente vuelve, es una
  cotización nueva.
- **La devolución es un cobro *Devolución* en negativo**, y la anota
  **quien paga** (la ruta lo comprueba y le pone el signo). Lleva su
  comprobante y su revisión como cualquier cobro. Lo que falta devolver se
  deduce: acordado menos devuelto (`faltaDevolver()`), y arriba de
  `/presupuestos` sale *N devoluciones por hacer*, solo para quien paga.
  Una cancelada no recibe avisos de saldo por cobrar.
- **El día vuelve a como estaba si existía solo por ella** (2026-11-11, lo
  pidió el cliente: *"si solo había un evento cotizado, este se cancela,
  hazlo desaparecer"*). Marcar ganada guarda en la columna `Día abierto`
  qué le hizo al día (`queLeHizo()`): `creado` si no estaba, `reabierto` si
  estaba cerrado. Al cancelar, `deshacerDia()` borra el creado y vuelve a
  cerrar el reabierto — **solo si no le queda otra reserva que ocupe
  lugar**. Un día que ya existía abierto no se toca. Las ganadas de antes de
  esta columna no la tienen: su día se borra a mano.
- **Lo mismo cuando una ganada cambia de fecha** (2026-11-11): el día que
  deja se devuelve con la misma regla (`devolverElDia()` dentro de
  `sincronizarReserva()`), y `Día abierto` pasa a decir qué se le hizo al
  día nuevo. Sin esto, mover una ganada del 11 al 18 dejaba el 11 privado y
  vacío. **No hay botón de "quitar el día"**, a propósito: el día se
  devuelve solo; uno abierto a mano se cierra desde la portada.
- **Un día cerrado sin cotizaciones vivas no aparece en Cotizaciones**: no
  hay nada que cotizar ahí. Con alguna viva o una ganada sí, porque es una
  conversación abierta con un cliente.
- **Una cancelada no aparece en el calendario de Cotizaciones**: sigue en
  *Todas* (filtro *Perdidas y vencidas*), con su devolución.

### Las fases

1. **Hecha**: catálogo de productos, fichas de clientes, descuentos y datos
   de la empresa.
2. **Hecha**: ver la sección de arriba.
3. **Hecha**: documento de la venta, condiciones de pago, cobros con
   comprobante y revisión, UF del día, avisos y CRM apagado.
4. **Hecha**: el contrato desde la cotización, firmado en papel y subido.
5. **En espera, pero viene sí o sí** (decidido el 2026-11-10): Calicanto,
   el rol de gerente general y la versión de matrimonio del contrato (Novia
   y Novio, dos firmas). **Antes se prueba lo hecho hasta la Fase 4** y se
   hacen las últimas adaptaciones hasta que el sistema funcione con uso
   real; recién ahí se amplía. No arrancar la Fase 5 sin que el cliente lo
   pida.

   **Las empresas van por cuenta, no por rol** (2026-11-11, idea del
   cliente). Un vendedor que trabaja para Lo Pirque, para Calicanto o para
   los dos es **el mismo rol vendedor** con una configuración en su cuenta
   —*Lo Pirque ✓ · Calicanto ✓*—, no tres roles. Mientras sean dos paneles
   con dos planillas, eso ya existe sin programar nada: es tener cuenta
   activa en uno, en el otro o en los dos. La casilla por empresa hace falta
   recién cuando haya una sola entrada para las dos (la del gerente
   general). Ver "Rol para lo que se hace, alcance para dónde".

## El equipo de ventas: el resumen del vendedor (2026-11-12)

Lo pidió el cliente: *"el vendedor necesita tener un resumen al estilo del
trabajador, mismo con filtros… y en el informe… lo mismo que para los
trabajadores y los extras, para gestionar los pagos"*. **No va por link
personal**: es una pestaña del panel. Código en `lib/vendedores.ts` (puro,
con pruebas), `/api/vendedores` y `ResumenVendedor.tsx`. El informe —pagos,
boletas y planillas de vendedores— vino en la segunda entrega, más abajo.

**Cómo se le paga lo decidió el cliente, y es flexible y por vendedor**:

- **Tres componentes, cualquiera o todos**: un **% de comisión**, un
  **monto por evento ganado** y un **sueldo fijo al mes**. Se escriben en su
  ficha, pestaña nueva **`Vendedores`** de la planilla (por nombre de
  columna; nace con la primera ficha que alguien guarda), junto a su cuenta
  bancaria. **No hay botón de agregar**: los vendedores son las cuentas con
  rol Vendedor de *Cuentas*, y su ficha nace la primera vez que se escribe.
- **La comisión se gana cuando el cliente pagó todo**: cuenta en el periodo
  del cobro que completó el total (`pagadaEl()`). Una devolución que lo baja
  la deja pendiente de nuevo. **Una cancelada no deja comisión.**
- **El % va sobre el neto** (cambió el 2026-11-12, lo fijó el cliente:
  *"tanto en socios comerciales como en los vendedores, la comisión tenemos
  que calcularla sobre el neto"*; antes era el total con IVA). Sigue
  editable por vendedor (`Base comisión`); **una celda en blanco es neto**,
  así que solo una ficha guardada con *Total con IVA* lo usa.
- **El sueldo fijo cuenta el último día de cada mes**
  (`finesDeMesEntre()`): un periodo que incluye ese día lo suma. Así una
  semana no lo parte y un rango de dos meses suma los dos, sin prorratear.
- **Las ventas son las cotizaciones ganadas que creó esa cuenta**
  (`Creado por`). Desde el 2026-11-12 el vendedor no anota reservas directo,
  así que todo lo suyo pasa por ahí.

**La pantalla** (`/vendedores`; para el vendedor la pestaña se llama **Mi
resumen**):

- **Mes o semana con flechas sin tope**, como el link del trabajador; parte
  en el mes en curso, porque el sueldo fijo es mensual.
- Azulejos: **Te toca** (comisiones + fijo del periodo), **Pagado**,
  **Falta**, **Comisiones** y **Sueldo fijo**.
- Cuatro listas: **ventas que suman** (pagadas en el periodo, con su
  comisión), **ganadas que el cliente todavía no termina de pagar** (con la
  comisión que viene), **en curso** (mandadas o en negociación, una por
  cotización, con la comisión posible) y **lo que se le pagó** (los pagos de
  la pestaña `Pagos` con el concepto nuevo **Comisión**, a su nombre).
- **Cómo se le paga**: el vendedor lo lee en una frase; quien paga lo
  escribe ahí mismo y **se guarda solo** (`usarGuardadoPorFicha`), con cada
  cambio en la bitácora.

**Quién ve qué** (permiso nuevo **`vendedores`**): el vendedor, **solo lo
suyo** —la ruta lo fuerza aunque pida otro usuario—; quien paga, la
gerencia y el administrador eligen a cualquiera con un botón por vendedor.
**Editar la ficha pide además `pagar`.** La cuenta bancaria la ven quien
paga y el propio vendedor.

### La comisión por etapas y el bono premium (modelo A, 2026-11-12)

Lo pidió el cliente: *"orientarse a la base del socio comercial… con un
extra bonus en escala a lo más valioso de los productos… una fórmula
simple"*. De tres modelos propuestos eligió este:

> **comisión = % de la etapa × total del evento + puntos de bono × líneas
> de productos con *Bono vendedor* + monto por evento**

- **Tres etapas por personas del evento**, como los socios comerciales: la
  1 desde la primera persona (es el viejo *Comisión %*), la 2 y la 3 desde
  donde diga la ficha —55 y 77 de partida, los cortes de los socios
  (`CORTES_SOCIOS`)—. Rige la más alta que alcance y tenga % puesto
  (`etapaDe()`). Columnas nuevas en `Vendedores`: `Etapa 2 desde`, `Etapa 2 %`,
  `Etapa 3 desde`, `Etapa 3 %`, `Bono premium (puntos)`.
- **El bono premium**: los puntos de la ficha suman **solo sobre las líneas
  de los productos marcados *★ Bono vendedor*** —un interruptor nuevo en
  *Productos*, columna `Bono vendedor` de `Menús`; el cliente dijo que solo
  los dos de arriba, A Brasas y Sommelier—. Es el empuje: vender el menú
  caro paga más total y además el bono.
- **Va en %, así que un descuento le baja la comisión**: lo cuida de
  regalar precio. Las personas son las de las líneas de menú; sin líneas,
  los invitados (`baseDeVenta()`).
- **Se congela cuando el cliente termina de pagar** (`congelarComision()`):
  queda en la columna `Comisión vendedor` de la cotización, con cómo se
  calculó, y desde ahí no cambia aunque se edite la ficha o un producto.
  Se llama al anotar un cobro y al ganar; **nunca lanza**, para no hacer
  repetir un cobro que ya quedó. Una alternativa nace sin ella.
- **Cada venta dice cómo se calculó**: *"60 personas → etapa 2, 3% =
  $171.000 + bono Sommelier 2% = $114.000"*, en *Mi resumen* (con *fija*
  si ya se congeló), en lo que viene y en las planillas del informe.
- **Lecturas**: anotar un cobro precarga ahora cuentas, fichas y productos
  con la cotización, así que congelar no cuesta una lectura más.

### Los vendedores en el informe (segunda entrega, 2026-11-12)

Quien paga, la gerencia y el administrador ven en `/informe` un bloque
**Vendedores**, debajo del equipo y los extras, **con lo mismo que ellos**:
lo que le toca a cada uno en el periodo (comisiones de lo pagado + sueldo
fijo de los meses que cierran adentro, `resumenDelPeriodo()`), su pastilla
de pago, *Registrar pago* con el concepto **Comisión**, la boleta
(`pideBoleta('vendedor')`: sí, como un extra), copiar los datos para
transferir y *ver cada venta →* a `/vendedores`.

- **Entran en todo lo que ya sumaba**: *Por pagar* y el buscador, el costo
  del periodo (*Vendedores $X*), *A transferir*, la transferencia masiva y
  *Todos pagados* de **sueldos** (su comisión va con los sueldos, nunca con
  las propinas), y las planillas *Solo sueldos* y *Completa*: **una fila por
  venta que suma** (*Venta: cliente (Cotización N° …)*, la comisión) y una por
  el sueldo fijo, con el pago solo en la primera fila.
- **`desglosePago()` cuenta la Comisión como la parte que no es propina**,
  igual que el sueldo y el servicio.
- **Tres botones grandes arriba de las listas** (2026-11-12, lo pidió el
  cliente: *"tres botones grandes para filtrar qué estoy viendo:
  trabajadores, extras o vendedores"*): cada uno con cuántas personas, cuánto
  hay que transferirles y lo que falta. Apretar uno deja solo esa sección;
  apretarlo de nuevo —o *Ver las tres*— vuelve a todas. Se suma a *Todos /
  Por pagar* y al buscador, cuyos contadores cuentan la sección que se ve;
  los totales de abajo siguen siendo los del periodo entero. *Vendedores*
  aparece solo para quien los ve.
- **El encargado de operaciones no los ve en el informe**: el permiso es
  `vendedores` (quien paga y más arriba, lo dijo el cliente). `/api/informe`
  ni siquiera le manda las ventas.
- **Lecturas**: la misma tanda del informe, con seis pestañas más.

**Lecturas de Google**: una tanda (cuentas, fichas, cotizaciones, líneas,
cobros, pagos y clientes). **Mientras la pestaña `Vendedores` no exista**,
cada visita gasta una más —el panel vuelve a mirar la lista de pestañas
antes de darla por inexistente—; deja de pasar con la primera ficha
guardada.

## Los socios comerciales (primera entrega, 2026-11-12)

Lo pidió el cliente: *"hay que incluir el socio comercial en todo esto…
puede venir como contacto de un vendedor o ser simplemente un contacto
comercial que pasó por la gerencia… su trato editable y pasa a ser
vendedor"*, y fijó la parte del vendedor: **50%**. Código en
`lib/vendedores.ts`, `/api/vendedores` y `ResumenVendedor.tsx`.

- **Una sola lista, dos tipos de ficha.** La pestaña `Vendedores` ganó
  `Tipo` (*Vendedor* / *Socio comercial*; en blanco, vendedor), `Etapa 1
  desde`, `Con socio cobra %` y `Activo`, al final y por nombre. **El socio
  no tiene cuenta**: su ficha se crea en `/vendedores` con *+ Agregar socio
  comercial* (pide el nombre, permiso `pagar`) y se identifica por un id,
  `S-0001`…, en la columna `Usuario` (`nuevoIdSocio()`).
- **En `/vendedores` se elige con dos botones**, *👤 Vendedores (N)* y
  *🤝 Socios comerciales (N)*, que abren su lista con buscador; arriba dice
  a quién se está mirando. *+ Agregar socio comercial* va al pie de la
  lista de socios. El primer corte traía un botón por persona y el cliente
  lo cambió: esas listas crecen.
- **Nace con el trato del landing**: 5% desde 22 personas, 10% desde 55 y
  15% desde 77, sobre el neto (`fichaSocio()`, `TRATO_SOCIO`). Todo se edita
  en su ficha y se guarda solo, como la del vendedor; no lleva sueldo fijo.
- **La etapa 1 tiene su *desde***, para los dos tipos: bajo ese número no
  hay comisión (`etapaDe()` devuelve la etapa 0, y la venta dice *"18
  personas: bajo el mínimo de 22"*). En blanco, desde la primera persona,
  que es lo que tenían los vendedores.
- **El nombre y desactivar se confirman** (reglas 6 y 8): *Guardar el
  nombre* / *Deshacer*, y *Desactivar* con su pregunta. Un desactivado deja
  de ofrecerse al cotizar; sus ventas siguen.
- **La pregunta en la cotización**: paso 2, *¿Viene por un socio
  comercial?*, con dos botones: *No, directo* y *🤝 Por un socio
  comercial…*, que abre la lista de los activos con buscador. Elegido, el
  botón dice su nombre, con *Cambiar* al lado. Se guarda solo
  en la columna nueva `Socio comercial` de `Presupuestos` (solo un id
  `S-…` o vacío: `socioDelCuerpo()`), y una alternativa la copia.
  `/api/presupuestos` manda la lista de socios —id, nombre y si está
  activo, nada de su trato ni su cuenta—, así que el vendedor los ve al
  cotizar aunque no vea sus fichas.
- **El reparto ya rige**: con socio, **el socio cobra su comisión entera**
  y **el vendedor cobra la parte de la suya que diga su ficha** —50% de
  partida, editable; 100 es toda, 0 es nada— (`comisionDe(f, venta,
  conSocio)`). La venta lo dice: *"… · con socio, 50% = $45.000"*. Vale en
  *Mi resumen*, en lo que viene, en el informe y al congelar la comisión del
  vendedor.
- **Las ventas del socio son las cotizaciones que lo nombran**, de
  cualquier vendedor (`esVentaDe()`), y su resumen es el mismo de un
  vendedor: lo que suma en el periodo, lo que viene, lo que se le pagó (los
  pagos *Comisión* a su nombre).

### Segunda entrega: congelar, informe y link personal (2026-11-12)

- **La comisión del socio se congela**, como la del vendedor: cuando el
  cliente termina de pagar, `congelarComision()` la escribe en la columna
  nueva **`Comisión socio`** de `Presupuestos` —*"300000 · 60 personas →
  etapa 2, 10% = …"*—, en la misma escritura que la del vendedor. Desde ahí
  no cambia aunque se le renegocie el trato: un trato nuevo vale para lo
  que se pague después. Lo explicó el ejemplo con que el cliente lo aprobó:
  sin congelar, bajarle la etapa 2 de 10% a 8% en enero cambiaba la venta
  de noviembre de $300.000 a $240.000. **Si se cambia el socio de una
  cotización, su comisión congelada se borra** (era del otro) y se vuelve a
  calcular para el nuevo. Una alternativa nace sin ella.
- **Los socios en el informe**, en el bloque de vendedores, que pasa a
  llamarse *Vendedores y socios* cuando hay alguno: lo que le toca en el
  periodo, su pastilla de pago, *Registrar pago* con concepto Comisión, la
  boleta, copiar la cuenta y la transferencia masiva. En la línea dice
  *socio comercial*; en la planilla, la primera columna dice *Socio
  comercial*. Sin sueldo fijo. *Sin pagar* lleva a su ficha
  (`/vendedores?usuario=S-0001`, que ahora abre directo a quien se pide).
- **El link personal del socio** (`/mi/<token>`, columna `Token de acceso`
  de `Vendedores`, solo en socios): *🔗 Copiar link personal* lo crea la
  primera vez; *Renovar* y *Quitar link* preguntan antes (regla 7). Permiso
  `links`, ruta `/api/vendedores/link`; el token no baja a quien no lo
  tiene. **Desactivar al socio apaga su link** (`socioPorToken()`).
  La página (`mi/[token]/Socio.tsx`) es la del colaborador con lo de un
  socio: su trato en una frase, *💰 Lo que gané* por mes con flechas
  —lo ganado, lo pagado, lo que falta, evento por evento con cómo se
  calculó y los pagos— y *📅 Lo que viene*, las ganadas que el cliente
  todavía no termina de pagar con la comisión que traen. **No ve al
  vendedor, ni los cobros, ni ventas ajenas.**
- **Lecturas de Google**: la ficha del socio viaja en la tanda de siempre
  de `/mi/` (se sumó `Vendedores`); **sus ventas, en una segunda tanda solo
  cuando el token es de un socio**, para no cargar las cotizaciones en cada
  visita de un trabajador. El informe, la misma tanda de antes.

### `/vendedores` con la regla PlayStation (2026-11-12)

Lo pidió el cliente: *"funcionalmente parece bien… pero bajo perspectiva de
diseño, y flujo y simplificación, de vista, no estamos cumpliendo con
nuestra regla de PlayStation"*. La prueba automática no marcaba nada
—tamaños y letra cumplían—; lo que fallaba era el flujo, y se midió: en
celular eran **4,4 pantallas**, la ficha con sus 17 campos siempre abierta
desde la pantalla 2,6, ningún botón relleno, cinco azulejos con dos
repetidos, cuatro listas apiladas y el mes partido en dos líneas. Quedó en
**2,2 pantallas** (1,6 para el vendedor; 1,3 en computador), con un solo
relleno y ningún campo a la vista:

1. **Quién**: el nombre grande y una pastilla *👤 Vendedor* (borde lleno) o
   *🤝 Socio comercial* (borde cortado); al lado, los dos botones con
   buscador.
2. **Cuándo**: *Mes / Semana* y una sola barra ◀ periodo ▶.
3. **Cuánto**: tres azulejos —*Le toca* con su desglose en una línea
   (*comisiones $X + fijo $Y*), *Pagado* y *Falta*—.
4. **El hito**, el único relleno: **💸 Pagarle $X →**, que abre
   `/informe?pagar=<nombre>&desde=…&hasta=…`: el informe parte en ese
   rango, en la sección de vendedores y **con la ventana de pago de siempre
   ya abierta en esa persona**. Así el pago se registra con la lógica del
   informe y no con una copia. Sin nada por pagar dice *✓ Al día*, sin
   botón. El vendedor no lo ve.
5. **El detalle en tres pestañas grandes**: *💰 Suma*, *📅 Viene* (ganadas
   que falta que el cliente pague, y en curso) y *💸 Pagos*, con cuántas hay
   en cada una. Una lista a la vista.
6. **Cómo se le paga**: el trato en una frase y *Cambiar el trato*, que
   abre una ventana con las tres etapas en filas de **− y +** (`Paso`: el
   campo se sigue pudiendo escribir, con coma), el bono, la parte con socio,
   el monto por evento, el sueldo fijo y la base; en un socio, también su
   nombre y *Desactivar*, que se confirman. **La transferencia** es una
   línea con su pastilla (*✓ BancoEstado · Cuenta RUT · ···5678* o *⚠ falta
   …*) y su propia ventana. **El link del socio**, otra línea. Todo se
   guarda solo, como antes.

- **Segunda vuelta, el mismo día** (lo reclamó el cliente: *"no queda bien
  indicado si se filtró por vendedores o socios… y en vista computador quedó
  muy largo, muy protagonista el mes"*). Arriba, una fila **Ver** con los dos
  grupos como un par: **el del grupo de la persona que se mira va con ✓ y
  relleno suave**, y cualquiera abre su lista con buscador; en el celular
  dicen *Vendedores 2* / *Socios 1* y en el computador *Socios comerciales*.
  Debajo, **el nombre a la izquierda y el periodo compacto a la derecha**
  (la barra mide 18rem y no todo el ancho). La página entera va con
  **`max-w-4xl`**, y en el computador *Pagarle* es del ancho de su texto,
  con su frase al lado: antes todo se estiraba a 1280px.
- **La etapa 1 parte en 22 personas también para el vendedor** (2026-11-12,
  lo fijó el cliente: *"la etapa 1 estándar debería ser 22, como es en el
  socio comercial"*). `ETAPA1_DESDE` en `vendedores.ts`: una celda en blanco
  es 22 —**también en las fichas de vendedor que ya existían**— y 1 es desde
  la primera persona; ya no se guarda en blanco. Las comisiones congeladas
  no cambian.
- **Un `?` al lado de cada número y de cada campo del trato** (lo pidió el
  cliente: *"no te olvides de los signos de interrogación y explicar bien
  cómo se calcula qué número"*): *Le toca*, *Pagado*, *Falta*, las etapas,
  el bono, la parte con socio, el monto por evento, el sueldo fijo y la base
  (`AYUDAS_CORTAS` en `ayudas.ts`, temas `vend…`). **La parte con socio va
  con un ejemplo en pesos**, porque es la que decide la gerencia: hoy son
  **dos comisiones separadas** —el socio cobra la suya completa según su
  trato y, aparte, el vendedor cobra el % de la suya (60 personas, neto
  $3.000.000: socio $300.000 + vendedor $45.000 = $345.000)—; no es el 50%
  de lo que gana el socio ni sale de su comisión. **Decidido el
  2026-11-12: es la opción A** (lo confirmó el cliente: *"vamos con la
  opción A del socio"*). Se descartaron la B —el vendedor cobra además el
  50% de lo que gana el socio: $450.000 en el ejemplo— y la C —una sola
  comisión, la del socio, repartida entre los dos: $300.000—.
- **Ojo con `.boton`**: está definida en `globals.css` después de las
  utilidades de Tailwind, así que **le gana a `min-h-[44px]` y a
  `text-[15px]`** —el *Pagarle* salía de 36px aunque pedía 56—. En un
  botón con `.boton`, el alto y la letra van con `!` (`!min-h-[44px]`).

### Los buscadores se cierran con un clic afuera (2026-11-12)

Lo pidió el cliente: *"que con un clic afuera de la búsqueda desaparezca el
formulario abierto"*. `BuscarEnLista` ya no tiene botón *Cerrar*, y
`BuscarPersona` (el *+ Agregar…* del equipo) también se cierra así —conserva
*Listo* para quien agregó a varios—. Escuchan `pointerdown` en el
documento, que cubre el mouse y el dedo; Escape sigue cerrando.

**Lecturas de Google**: ninguna más. `Vendedores` se sumó a la tanda de
`/api/presupuestos`; agregar un socio es la tanda de la ruta más la relectura
al escribir, como guardar una ficha.

## El CRM del socio (2026-11-02)

> **Apagada desde el 2026-11-10** (lo decidió el cliente: las cotizaciones
> viven en este panel). `CRM_APAGADO` en `lib/crm.ts`: el panel no lee sus
> eventos, no publica nuestros días, y la tarea diaria de `/api/crm/publicar`
> **retira lo que habíamos publicado** allá (`retirarTodo()`, solo ids
> nuestros, idempotente). El código queda: encenderla es cambiar esa
> constante. Lo de abajo describe cómo funcionaba.

El socio —Asados y Corderos— vende eventos para varios negocios, **Brasas de
Lo Pirque entre ellos**, desde su propio CRM. Hasta el 2026-11-02 eso no
llegaba al panel de ninguna forma, y lo que costaba se pudo medir contra los
dos sistemas de verdad:

```
sábado  7 de noviembre   el sitio ofrecía 112 lugares  |  el CRM: ganado de  58 personas en Lo Pirque
domingo 22 de noviembre  el sitio ofrecía 120 lugares  |  el CRM: ganado de 150 personas en Lo Pirque
```

Nadie en el panel tenía cómo saberlo. Ése es el problema que esto resuelve.

### Lo que hace, y lo que NO

**No toca el cupo**, y ésa es la decisión que fija todo lo demás. Lo que
entrega es una capa aparte, como `posibles` en los presupuestos: no entra en
`tomadas`, no descuenta de `quedan` y no mueve el semáforo. El motivo lo dio
el cliente y vale repetirlo: **un sistema que no controlamos no puede
cerrarle un sábado al sitio público sin que nadie lo mire.** Si en unas
semanas los datos calzan, que cuente es cambiar una condición — y esa
condición **todavía no existe a propósito**.

### El filtro es `lugar`, no `empresa`

La guía del socio recomienda `?empresa=brasas` como *"más fiable que el
lugar"*. **Para contar ocupación del recinto no lo es**, y se comprobó
contra los 221 eventos: los dos conjuntos difieren en las **dos**
direcciones.

```
empresa=brasas   →  32 eventos   (28 en Lo Pirque + 4 en "Otro")
lugar=Lo Pirque  →  29 eventos   (28 de brasas   + 1 de ayc)
```

- **4 eventos que vendió Brasas pero NO ocurren acá** —uno un ganado de 60
  personas el 24 de noviembre—. Por empresa, marcaríamos un día nuestro por
  un evento de otra parte.
- **1 evento en Lo Pirque que vendió el socio**, que **sí** ocupa nuestro
  recinto. Por empresa, se nos escapaba.

Leyendo su código queda claro por qué: `empresa` sale de `datos->>marca` de
la cotización más reciente del contacto, o sea contesta **quién lo vendió**.
`lugar` contesta **dónde ocurre**, que es lo que ocupa sillas.

**Se filtra en la query y otra vez de nuestro lado.** No es paranoia: ese
mismo día, antes de que el socio lo implementara, `?lugar=` se ignoraba y
devolvía los 221 eventos de todos los negocios. Sin el segundo filtro
habríamos pintado Calicanto en nuestro calendario — y **hay una prueba que lo
fija**: quitando `esNuestro()` fallan siete, entre ellas que las 200 personas
de un matrimonio en Calicanto se sumaban al sábado 7.

### Lo que el panel no muestra

- **Los períodos, como día.** Más de la mitad de los eventos del CRM son
  `periodo`: meses aproximados —"entre julio y agosto"— sin día decidido.
  **No ocupan ninguna fecha**, porque ponerlos en una sería publicar un día
  que ni el propio CRM sabe. Se devuelven **aparte** en vez de descartarse:
  un matrimonio de 120 personas que dice "marzo o abril" es una conversación
  abierta aunque no tenga fecha.

### La costura: una ruta propia, no un campo de la ocupación

`/api/crm/eventos`, con permiso `ver`. **Aparte de `/api/ocupacion` a
propósito**: si el CRM no responde, el calendario se tiene que dibujar igual.
Mezclarlo habría puesto un servicio de un tercero en el camino de la pantalla
que contesta cuánta gente viene — la misma asimetría de
`posiblesDeLosDias()`.

- **La clave vive en `CRM_API_KEY`**, una variable de Vercel, del lado del
  servidor. Nunca baja al navegador, y por eso la llamada se hace en la ruta:
  con esa clave se pueden **escribir y borrar** las fechas que este panel
  publique en el calendario del socio. **Ojo con el nombre**: cualquier cosa
  que empiece con `NEXT_PUBLIC_` la publica Next en el bundle del navegador.
- **Sin la variable no falla**: devuelve vacío con `configurado: false`. El
  panel tiene que funcionar antes de que nadie configure nada, igual que
  funciona antes de que exista la pestaña de presupuestos.
- **La respuesta se guarda una hora** en la caché de Vercel, que es lo que el
  socio pidió ("leer una vez por hora está perfecto"; no hay cuota).
- **`desde` y `hasta` son opcionales** y una fecha con basura se ignora en
  vez de romper, igual que en `/api/ocupacion`.
- **`confirmado` se deriva de la etapa, no se lee del campo.** El CRM manda
  los dos; si alguna vez dijeran cosas distintas, el panel obedece a `etapa`
  —que es lo que el propio CRM usa para pintar su calendario—. Hay una prueba
  con un `confirmado: true` sobre una etapa `Cotizado` que no cuenta como
  confirmado.
- **`etapa` se trata como texto libre.** La guía nombra cinco y los datos de
  hoy traen cuatro: una lista cerrada convertiría una etapa nueva en un
  evento que no se dibuja.

### Tolera basura, porque la hay

La data real trae un evento fechado en **2007** por un tipeo, once con los
invitados en `null` y uno sin tipo. Nada de eso puede tumbar un calendario,
así que cada campo cae a un valor vacío y el evento se queda. Lo único que se
descarta es un evento **sin id**: no hay nada que mostrar.

### Probado contra los dos servicios de verdad

```
/api/crm/eventos   19 días con eventos nuestros · 3 períodos
                   solo lugar "Lo Pirque" — ningún recinto ajeno se coló
                   sin campo "nombre" — el nombre del cliente no llega
  7 nov  1 ganado (58p)      22 nov  1 ganado (150p)      18 dic  2 ganados (190p)
?desde=2026-11-01&hasta=2026-11-30  →  solo los 4 días de noviembre
?desde=chao                         →  se ignora, 200 y los 19 días
sin CRM_API_KEY                     →  200, vacío, configurado: false
con clave mala                      →  502, vacío, "No se pudo leer el CRM."
```

### En pantalla se dice "del CRM", no "del socio" (2026-11-05)

Lo pidió el cliente: *"tú estás hablando siempre del socio cuando hablamos de
lo que viene desde el CRM… el equipo tiene que entenderlo"*. Para quien usa
el panel, "el socio" no dice nada; "el CRM" es el sistema donde se vende.
Los textos visibles dicen **del CRM** —la pastilla *150 del CRM*, el bloque
*En el CRM*, *Anotar el evento del CRM*—. En los comentarios del código y en
este archivo "el socio" sigue nombrando a quien es dueño del CRM.

### Se veía en la ruta y en ninguna pantalla (2026-11-03)

**La mitad que lee el CRM se escribió el 2026-11-02 y nunca se dibujó.** La
ruta funcionaba, tenía pruebas y estaba probada contra el servicio real — y
**ninguna pantalla la llamaba**. O sea que el panel ya le contaba al socio lo
que pasa acá y todavía no mostraba lo que pasa allá.

Lo notó el cliente mirando el domingo 22 de noviembre: *"no debería mostrarse
la reserva ganada ya?"*, con la tarjeta diciendo `0/150 personas` sobre un día
que el socio tiene vendido a 150. En la ventana había **12 eventos sin ver**,
incluidos los 190 ya ganados del 18 de diciembre.

Vale tenerlo escrito porque el modo de falla es el peor que hay: **todo verde
y nada a la vista.** Las pruebas pasaban, la ruta respondía, el build estaba
limpio. Lo único que faltaba era que alguien la llamara, y eso no lo dice
ningún error. La regla que deja: **una ruta sin pantalla no está hecha.**

### No es una vista paralela: es una bandeja de entrada

Y esa es la decisión de fondo, y la puso el cliente al ver el primer corte
—que solo mostraba—: *"cuando viene un presupuesto ganado desde el CRM, que
nosotros lo vemos, pero nosotros lo convertimos en una reserva y le damos las
informaciones que solo nosotros sabemos poner en sistema. Ya son tantos menús
de esto, etcétera."*

Es mejor que mostrarlo y listo, porque **mostrar no resuelve nada**: un ganado
del socio seguiría siendo gente que viene y que el cupo no cuenta, para
siempre. Anotarlo lo pasa a reserva de verdad.

| Lo que sabe el socio | Lo que solo sabemos acá |
|---|---|
| quién, qué día, cuánta gente | **cuántos de cada menú**, el monto, el teléfono, el correo |

Por eso lo del socio **se propone y lo nuestro se escribe**: el nombre viene
puesto y la gente se dice en una línea, pero **no se reparte sola en los
menús**. Cuántos van de cada uno es justamente el dato que el socio no tiene,
y rellenarlo con un menú cualquiera sería inventar lo que hay que cocinar.

- **Solo los ganados se ofrecen para anotar.** Un cotizado todavía no es
  gente que viene, y anotarlo le quitaría el lugar a alguien por un evento
  que el propio socio no ha cerrado.
- **Al anotarlo desaparece de esta capa**, porque ya ocupa cupo. Seguir
  mostrándolo sería contar la misma gente dos veces — el día mostraría las
  mismas 150 personas en los dos lados.

#### La columna `ID Evento CRM`, que es lo que impide contarlo dos veces

Vive en `Reservas` y **se agrega sola** la primera vez (`asegurarColumna()`),
como la `Nota de pago`. Guarda de qué evento del socio salió esa reserva.

Es el mismo papel que el `ID Reserva` de un presupuesto, y cubre el mismo par
de errores opuestos: **contar dos veces** si el ganado siguiera apareciendo, y
**perderlo de vista** si lo apagara una marca a mano en vez de un hecho. Por
eso lo que lo apaga es **que exista una reserva que lo nombre**.

- **Se asegura siempre al crear una reserva, no solo cuando viene con
  valor.** Si se creara recién al anotar el primer ganado, la fila que lo
  estrena sería justamente la que no encuentra la columna.
- **El sincronizador de Shopify no la pisa**, igual que la asistencia y la
  nota de pago: un pedido que se actualiza la borraría, y con eso el ganado
  volvería a aparecer como pendiente.
- **Sí se acepta del navegador**, al revés que el `ID Reserva` de un
  presupuesto. La diferencia es real: acá la misma llamada **crea** la
  reserva que dice estar anotando, así que no hay forma de apagar el conteo
  de un día sin agregar también a esa gente.
- **Lo ya anotado se filtra en cada llamada, no en la caché.** La respuesta
  del CRM se guarda una hora; las reservas cambian en cualquier momento. Si
  la planilla no responde se muestra todo: de más, nunca de menos.

**Se comprobó rompiéndolo**: dejando pasar el ganado ya anotado falla la
prueba que dice que deja de contarse, y tomando los `eventoCRM` vacíos como
ids falla la que dice que una reserva sin evento no apaga nada.

#### Dos colores, porque son dos cosas

El cliente propuso el rosado de los presupuestos —*"en verdad es como de
presupuestos"*— y tiene razón **para la mitad**: un evento en `Cotizado`,
`Nuevo` o `Contactado` **es** un presupuesto, el de otro, y rosado ya
significa exactamente eso acá. Mismo significado, mismo color.

**Para un `Ganado` diría lo contrario de lo que es.** Rosado quiere decir
"todavía no se sabe", y de un ganado sí se sabe: es gente que viene. Y es
justo la mitad peligrosa, así que pintarla del color de lo que no se sabe
sería tranquilizar sobre lo único que no hay que estar tranquilo. Los ganados
van en **cielo**, el color de un día privado y por el mismo motivo: gente que
viene por un camino que no es el formulario del sitio.

| Dónde | Qué muestra |
|---|---|
| Tarjeta del calendario | una pastilla **debajo** de la barra: *1 ganado · 150 del CRM*, y los cotizados aparte en rosado |
| Página del día | un bloque propio con quién, cuánta gente, en qué va y **el botón de anotarlo** |
| Planilla semanal y link personal | **nunca**, igual que los presupuestos |
| Sitio público | **nunca** |

**Y el aviso de choque, por fin usado.** `haySobreventa()` estaba escrito
desde el 2026-11-02 sin que nadie lo llamara: cuando lo que el socio ya cerró
no cabe en lo que el panel todavía ofrece, la pastilla pasa a **ámbar** y el
bloque del día lo dice con todas sus letras. **Solo donde se sabe el cupo** —
la tarjeta lo tiene, la página del día no, y ahí un `quedan` inventado haría
aparecer la alarma por un dato que nadie miró.

#### Al anotar una reserva no se inventan menús (2026-11-05)

El formulario de reserva del panel tenía un campo **"Otro menú…"** con su
*Agregar*, y se sacó a pedido del cliente: *"si se agrega un nuevo menú,
alguna variante… eso es una decisión estratégica y no alguien que pueda
hacer una reserva"*. La lista son los menús conocidos —los que vendió
Shopify y los de `/menus`— más los que ya traiga la reserva que se edita,
para no perder el desglose de una vieja. Un menú nuevo se crea en la tienda
y se le pone precio en `/menus`; recién ahí aparece para anotar.

#### El contador de menús se podía apretar y no escribir

Salió de esto y es de los que no se notan hasta que aparece el caso: en el
formulario de reserva del panel la cantidad de cada menú era un `<span>`
entre dos botones. Para una familia de seis da lo mismo; **para anotar un
evento de 150 personas el único camino era apretar `+` ciento cincuenta
veces.**

El formulario del sitio público ya tenía la regla escrita —*"los botones son
una comodidad encima, no el único camino"*— y el del panel la había perdido.
Ahora la cantidad es un campo que se escribe, con los botones al lado.

### Probado de punta a punta (2026-11-03)

Con el 22 de noviembre exclusivo y vacío, y el ganado de 150 del socio:

```
tarjeta del 22   0/150 personas  ·  ● 1 ganado · 150 del CRM   (cielo)
página del día   FELIPE IZQUIERDO · Otro · 150 personas · Ganado
                 lo lleva Cristóbal       [Anotar como reserva]
```

Apretando el botón, el formulario abre como **"Anotar el evento del CRM"**,
con el nombre puesto y la línea *"Viene del CRM, con 150 personas"*.
Repartidas en un menú y guardado, la planilla quedó con:

```
Nombre: FELIPE IZQUIERDO · Personas: 150 · Menú: 150 × Tradiciones
ID Evento CRM: bc4a7262-72dd-40b2-886c-640cd9627dd2
```

y **el ganado desapareció de la capa del socio** —ya ocupa cupo— mientras el
del 7 de noviembre, sin anotar, sigue mostrando sus 58.

Y el aviso: bajándole el cupo al 7 de noviembre a 40 lugares con 58 ya
ganadas por el socio, la pastilla pasó a ámbar.

### Privado, y privado exclusivo (2026-11-02)

Salió al diseñar la escritura hacia el CRM, y resultó ser **un estado que al
panel le faltaba**, no un detalle del socio. Lo dijo el cliente así:

> *"Existen exactamente los días privados, pero no exclusivos, donde se
> permiten distintas reservas, dos eventos paralelos. Y existe el privado
> exclusivo, y esos son cuando se arrendó el recinto completamente y de
> forma exclusiva a una empresa."*

Hasta acá `Privada` era una sola cosa, y con eso la pregunta **"¿cabe otro
evento este día?"** no tenía dónde contestarse: un cumpleaños de 40 personas
en el salón y un recinto arrendado entero se escribían igual.

| Estado | No se ofrece en el sitio | ¿Cabe otro evento? |
|---|---|---|
| `Privada` | sí | **sí** — pueden correr dos a la vez, y pasa |
| `Privada exclusiva` | sí | **no** — el recinto completo, un solo cliente |

- **Un día exclusivo ES un día privado**, y eso no es una sutileza de
  redacción: `esPrivada()` lo reconoce, así que **todo lo que ya trataba
  bien a un privado lo sigue tratando bien sin tocarse** — el recorte para
  el sitio, el azul de la tarjeta, el conteo de la semana, el que no esté
  cerrado. Lo único que agrega `esExclusiva()` es que no cabe nadie más.
- **`esExclusiva()` falla hacia lo menos restrictivo**, al revés que
  `estaCerrado()`, y también a propósito. Los dos errores no cuestan lo
  mismo: un exclusivo leído como privado deja que alguien cotice un segundo
  evento, y eso se descubre conversando; un privado leído como exclusivo le
  marca al socio la fecha como tomada y **le hace perder una venta que sí se
  podía hacer, sin que nadie se entere nunca**.
- **En el panel es una casilla dentro de "Privado", no un cuarto radio.** Lo
  que cambia entre los dos no es el tipo de día —los dos reciben reservas,
  ninguno se ofrece— sino si el recinto se arrendó completo. Dos radios lo
  contarían como dos cosas distintas y obligarían a leer las dos ayudas para
  notar que casi todo es igual.
- **Y como la casilla solo existe mientras "Privado" está elegido, un día
  abierto o cerrado no tiene cómo quedar marcado exclusivo.** Es la misma
  garantía por forma que el upgrade de menús del sitio: no hay dónde
  escribirlo.
- **Anotar una reserva a mano nunca deja un día exclusivo** —sigue creando
  `Privada`— y tampoco le quita lo exclusivo a uno que ya lo era: arrendar
  el recinto completo es una decisión comercial, no el efecto secundario de
  anotar una reserva de teléfono. Hay pruebas que fijan las dos cosas.
- ~~**En la tarjeta se distinguen por la palabra, no por el color**~~ —
  **desde el 2026-11-12 el exclusivo va en morado** (lo pidió el cliente):
  punto 🟣, borde y fondo de la tarjeta, la palabra *exclusivo* y la casilla
  de *Editar*, en los calendarios y en Cotizaciones. El privado sigue en
  azul. `morado` es un color con nombre propio en las dos paletas
  (`--morado`, `-fuerte`, `-texto`, más oscuro de día), como `cielo` y
  `rosa`: es un significado —"no cabe nadie más"—, no un adorno.
- **El sitio público no cambia en nada**: un exclusivo es privado, así que
  `paraElSitio()` ya lo omitía. Hay una prueba que lo fija.

**Se comprobó rompiéndolo**: haciendo que `esExclusiva()` devuelva lo mismo
que `esPrivada()` —o sea, que todo privado cuente como exclusivo— fallan
seis pruebas de una vez, entre ellas la que dice que un privado a secas no
lo es y las tres de la reserva a mano.

Y de punta a punta contra la planilla, con el 14 privado y el 21 exclusivo:
el día abierto no ofrece la casilla, el privado la ofrece sin marcar, el
exclusivo la ofrece marcada, y marcarla escribe `Privada exclusiva` y deja
la tarjeta diciendo *exclusivo*. Desmarcarla vuelve a `Privada`.

### La escritura hacia el CRM (2026-11-03)

El otro sentido: publicar **nuestros** días en su calendario. Vive en
`panel/src/lib/crm.ts` —la lógica pura y con pruebas— y en
`crm-escribir.ts`, que es lo que toca la red y la planilla.

**Qué día va en qué color es una sola pregunta**: *¿puede pasar otro evento
acá ese día?*

| Nuestro día | ¿Se manda? | `bloquea` | Título que ve el vendedor |
|---|---|---|---|
| Cerrado | sí | `true` | rojo · *Cerrado* |
| **Privado exclusivo** | sí | `true` | rojo · *Recinto arrendado completo* |
| **Privado** (no exclusivo) | sí | `false` | naranjo · *Evento privado* |
| Abierto con reservas | sí | `false` | naranjo · *Abierto con reservas* |
| Abierto y vacío | **no** | — | nada |
| Preparación | **no** | — | nada |

**El primer corte mandaba todo privado en rojo, y el cliente lo corrigió**:
*"privado también debería ser naranjo, porque hay eventos que se hacen sin
que sea exclusivo… pero sí debería saber de este evento privado y cuántas
reservas hay"*. De ahí salió el estado nuevo del panel — ver "Privado, y
privado exclusivo". Lo que vale guardar es que **rojo dejó de significar
"cerrado" y pasó a significar "no cabe nadie más"**, que es lo que el
vendedor necesita saber y lo que la propia guía del socio ya decía.

- **Un día abierto y vacío no se manda**, porque no tiene nada que informar
  y llenaría su calendario de naranjo sin dato. Medido contra el endpoint
  público el 2026-11-02: de 18 días abiertos hasta el 3 de enero, **3
  tienen alguna reserva**.
- **Un día de preparación tampoco, y no por un `if`.** Un día de preparación
  es uno con equipo asignado que no recibe público: si no está en `Fechas
  Hábiles` ni tiene reservas, no existe para la ocupación, así que no hay
  desde dónde publicarlo; y si está cerrado, se manda por la fila "Cerrado",
  que es lo correcto. Es la misma garantía por forma que el upgrade de menús
  del sitio: no hay dónde escribirlo.
- **El orden de las preguntas importa.** Cerrado, después exclusivo, después
  privado. Al revés —privado antes que exclusivo— todo exclusivo saldría
  naranjo y el vendedor podría vender un recinto arrendado completo; se
  comprobó dando vuelta las dos ramas y **fallan cuatro pruebas**. Cerrado va
  primero por consistencia con `estaCerrado()`, que falla cerrando: si no
  sabemos leer el estado de un día propio, nosotros tampoco deberíamos
  estarlo vendiendo.

### La ocupación va en sus campos, no escrita en el título

Lo confirmó el socio: *"El texto va en `titulo`. La ocupación mándala en
`ocupacion` y `capacidad` (enteros), no en el texto: el CRM arma el chip
solo."* Así `titulo: "Abierto con reservas", ocupacion: 8, capacidad: 120` se
ve como **"Abierto con reservas · 8/120"** del otro lado. Escribirlo a mano
habría dejado dos formatos el día que él cambie el suyo, y **hay una prueba
que falla si el título trae un `/`**.

El título se queda **bajo 30 caracteres** porque el chip lo trunca en
escritorio; el detalle va en `descripcion`, que se ve en celular y al pasar
el mouse.

**Los números van solo cuando hay gente.** Un día que bloquea se entiende con
su título —"Cerrado", "Recinto arrendado completo"— y un "0/120" al lado
leería como un dato lo que es la ausencia de uno. Cuando sí hay reservas, se
dicen: el socio pidió explícitamente *"manden todos los días con
ocupación"*. Y un campo ausente no es lo mismo que uno en `null`, así que
cuando no hay nada que contar **se omiten** en vez de mandarse vacíos.

**Lo que NUNCA sale de acá**: las `Notas` internas de un día y el nombre de
un cliente. Lo que viaja son un título, una descripción que arma el propio
archivo y dos enteros — y lo que no se manda no se puede filtrar. Hay una
prueba que busca esas palabras en el cuerpo del POST.

### El cuerpo es un array pelado, y eso costó cuatro intentos

Comprobado contra la API de verdad el 2026-11-03: `{"eventos":[…]}` y
`{"items":[…]}` devuelven **`Ítem 0: falta external_id`** —el endpoint ve el
objeto envolvente como un solo ítem— mientras `[{…}]` y un objeto solo
guardan bien. Queda anotado porque el mensaje de error manda a buscar el
problema donde no está: dice que falta un campo que sí venía.

Se manda siempre el array, también para un día solo, para tener un camino y
no dos.

### Es reconciliación, no un evento por cambio

Esa es la decisión de fondo, y la razón es **la mitad que falta de cualquier
diseño de empujón**: un sistema que solo manda novedades no tiene cómo
enterarse de una ausencia. Si un día deja de calificar —se cancela la única
reserva, se reabre un día cerrado, se le quita lo exclusivo— hay que ir a
sacarlo con `DELETE`, o le queda un día naranjo fantasma.

El `external_id` es `brasas-<fecha>`, y **sale de la fecha y de nada más**:
publicar el mismo día dos veces es un `upsert`, no dos filas. Es lo que hace
que la reconciliación sea idempotente y que un empujón perdido se recupere
solo al día siguiente. `DELETE /externos/<id>` también es idempotente del
lado del socio: un id que no existe responde 200 con `{"eliminados": 0}`.

**Primero mandar, después borrar.** Si algo falla en el medio, lo peor que
puede pasar es que quede un día de más en su calendario —que es visible y se
arregla mañana— y no un día que desaparece de los dos lados sin que nadie se
entere. Mismo criterio que convertir un presupuesto en reserva.

**Y un borrado que falla no detiene a los que vienen detrás**, al revés que el
`POST`. La diferencia es real: el `POST` es una llamada para toda la tanda,
así que si falla no hay nada que salvar; los borrados son una llamada por id,
y abortar en el primero dejaría que **un solo id permanentemente malo
bloqueara la limpieza para siempre** — cada corrida volvería a estrellarse en
el mismo. Los que fallan salen nombrados en la respuesta (`fallaron`) y se
reintentan mañana; uno que aparezca todos los días es algo que hay que ir a
mirar.

#### Qué se borra, y qué se deja quieto a propósito

| | Qué pasa |
|---|---|
| Un id que **no es nuestro** | no se toca nunca, aunque caiga en uno de nuestros días: la tabla es compartida |
| Nuestro, **dentro de la ventana**, ya no califica | se borra. Es el caso corriente |
| Nuestro, **antes de la ventana** (ya pasó) | se borra: nadie vende el pasado, y sin esto la tabla crece para siempre |
| Nuestro, **después de la ventana** | **se deja quieto** |

La última fila es la decisión con filo, y se eligió mirando cuál de los dos
errores cuesta más: un día rojo que quedó viejo le hace perder al socio una
venta que sí se podía hacer; un día rojo borrado de más le deja vender un
recinto que está arrendado en exclusiva, o sea un doble arriendo. Así que más
allá de `dias_a_futuro` esta función **no opina**, y la limpieza llega cuando
el día entra en la ventana — 90 días antes del evento, tiempo de sobra.

**"No toques lo ajeno" y "no toques un id nuestro que no sabés leer" son una
sola condición**, no dos: `fechaDelId()` devuelve vacío para cualquier otro
origen. Estuvieron partidas en dos guardas y se juntaron al revisarlas con
una mutación — sacándole una, **ninguna prueba fallaba**, porque la otra
tapaba el hueco. Una prueba que no falla cuando se le saca la guarda no está
protegiendo nada.

### Las dos puertas: el empujón y la tarea diaria

- **El empujón**, al guardar un día (`/api/fechas`), al borrarlo, y al
  anotar, editar o borrar una reserva a mano. Da inmediatez.
- **La reconciliación completa**, en `/api/crm/publicar`, una vez al día por
  `vercel.json`. Recupera lo que se haya perdido y es lo que hace que el
  calendario del socio se repare solo.

**El empujón nunca bloquea el guardado.** `empujarDias()` no lanza: si el CRM
no responde, el panel guarda igual y la tarea diaria lo pone al día. Es la
misma asimetría de `posiblesDeLosDias()`. Comprobado con el CRM caído: el día
se guardó en 22 ms y la reconciliación devolvió 502 con el motivo.

- **Se espera la respuesta en vez de dejarla corriendo sola**, con un tope de
  6 segundos. En Vercel la función se apaga cuando la petición termina, así
  que un `fetch` sin `await` se queda a medio camino.
- **Recibe varios días y lee la planilla una sola vez.** Editar una reserva
  puede moverla de fecha, y entonces hay dos días que cambiaron: el que la
  perdió y el que la ganó. Llamar dos veces costaría seis lecturas para
  contestar lo mismo.
- **Es una ruta aparte de `/api/shopify/sincronizar`** y una tarea aparte: son
  dos servicios de terceros distintos y una falla en uno no puede dejar al
  otro sin correr. **El orden entre las dos no está garantizado** —en el plan
  gratuito de Vercel la hora es aproximada y el minuto no se respeta— y no
  hace falta que lo esté: esto publica la ocupación que haya en ese momento.
- **El plan gratuito permite 100 tareas por proyecto, una vez al día cada
  una** (dato de noviembre de 2026; el límite viejo, que eran 2, es el que
  este archivo tenía en la cabeza). Hay dos usadas.
- **Lo que queda con retraso de hasta un día es una reserva comprada por
  Shopify**: llega por webhook y ahí no hay empujón, a propósito — los
  webhooks vienen de a dos por pedido y con reintentos, y meterle tres
  lecturas de planilla y una llamada al CRM a cada uno es caro y arriesga el
  ACK que Shopify espera. La diferencia que el socio vería es "8/120" en vez
  de "9/120", que no le cierra ninguna fecha.
- **Disparar la reconciliación a mano es del permiso `mantencion`**, igual
  que la de Shopify: es para arreglar el sistema, no para operarlo.
  Comprobado: un encargado recibe **403 llamando la API directo**.
- **Sin `CRM_API_KEY` no falla**: responde 200 con `configurado: false` y no
  hace nada. El panel tiene que funcionar antes de que nadie configure nada.

### Probado de punta a punta (2026-11-03)

El contrato, contra su API de verdad: `POST` con array pelado guarda y
devuelve `{"guardados":1}`; el mismo `external_id` otra vez **actualiza en
vez de duplicar**; las tildes van y vuelven intactas (`Día público, ñandú`);
`DELETE` existente da `{"eliminados":1}` e inexistente `{"eliminados":0}`. La
tabla del socio quedó vacía, como la dejó él.

Y **la cadena completa contra su tabla de verdad**, con un fin de semana
sembrado en la planilla —los cinco casos—. Esto es lo que su API devolvió
después de que el panel escribiera, o sea el chip tal como lo va a ver el
vendedor:

```
2026-11-14  naranjo  Abierto con reservas · 12/120
2026-11-15  —        abierto y vacío: NO se mandó
2026-11-21  naranjo  Evento privado · 40/120
2026-11-22  ROJO     Recinto arrendado completo · 90/120
2026-11-28  ROJO     Cerrado                      (sin números)
2027-06-12  —        más allá de la ventana: NO se mandó
```

- **Las tildes llegaron bien**: *"El restaurante abre al público ese día"*,
  *"El recinto está arrendado completo y en exclusiva"*.
- La `NOTA INTERNA` del día 14 y los nombres de los cinco clientes **no
  aparecen en ninguna fila**. Su API nos estampa `origen: restaurante_koba`
  y deja `datos` en `null`: no viaja nada más que los seis campos.
- El día 28 está cerrado y su única reserva está cancelada, así que llegó
  **sin `ocupacion` ni `capacidad`** — una cancelada no ocupa lugar.
- **Correr de nuevo sin cambiar nada mandó 0 y borró 0.**
- Pasar el 22 a privado a secas lo republicó en naranjo; reabrir el 28 y
  cancelar la reserva del 14 **los sacó a los dos**.
- Sembrando a mano un `brasas-2027-06-12` —fuera de la ventana— y un
  `brasas-2026-09-05` —ya pasado—, la reconciliación **borró solo el
  pasado** y dejó el de 2027 quieto, que es la regla con filo de más arriba.
- El empujón de un día solo: marcar el 15 exclusivo lo publicó en rojo, y
  volverlo a abierto y vacío **lo borró**.

**Lo único que no se probó contra su tabla es que un id ajeno se deje
quieto**, y es a propósito: para eso habría que escribirle una fila con el
prefijo de otro origen, o sea inventarle un dato a su sistema — y además su
API nos estampa `origen: restaurante_koba`, así que no sería una imitación
fiel de nada. Esa mitad quedó comprobada contra un servidor local que imita
su API, más la prueba de `reconciliar()`.

**La tabla del socio quedó vacía al terminar**, como la dejó él.

## El equipo de trabajadores (panel)

Desde el 2026-10-21 el panel también planifica **quién trabaja cada día**.
Nació de una idea más grande del cliente —gestionar al equipo completo desde
acá, incluidas las cuentas del día— que se partió en tres lotes para que cada
uno sirviera por sí solo:

1. **Planificar** (hecho): qué puestos existen, quién es el equipo, y quién
   trabaja qué día.
2. **Los accesos** (hecho): admin / encargado / trabajador.
3. **Las cuentas del día** (hecho): asistencia del equipo, horas extra,
   ajustes, propina, y el link de la planilla semanal.

### Tres pestañas nuevas en la misma planilla

| Pestaña | Qué guarda |
|---|---|
| `Puestos` | Jefe de turno, parrillero, asistente parrillero, jefe de cocina, asistente de cocina, garzón, runner, barman, asistente de bar — **editables**, más la regla "uno cada N personas" |
| `Trabajadores` | Nombre, teléfono, puesto habitual, activo, token, modalidad, sus dos montos, si participa en la propina y su cuenta bancaria |
| `Turnos` | Una fila por (fecha, trabajador, puesto), con asistencia, lo que se le pagó y su parte de la propina |

A esas tres se sumaron después `Colaboradores` y `Actividades`, que son las
de los jinetes y las pintacaritas —ver "Las actividades extras"—, y
**`Cierres`**, una fila por día cerrado — ver "Cerrar el día".

Las tres se editan en **`/equipo`**, salvo los turnos, que se asignan desde
el calendario de la portada o desde **`/turnos`**, el calendario del equipo
—que es el único que incluye los días cerrados, para los de preparación. **Ninguna llega al sitio público**: `/api/publico/fechas`
sigue devolviendo `fecha`, `quedan` y `pocos`, y hay una prueba que lo fija.
Quién trabaja mañana no es dato de un visitante.

### "Uno cada N personas", que es lo que hace útil al planificador

Es lo único que le permite al panel contestar **"¿alcanza este equipo?"** en
vez de mostrar una lista. Con 10 en garzón, un día de 44 personas sugiere 5.

**Nace en blanco a propósito y el panel no opina mientras lo esté.** Cuántos
garzones por comensal se atiende bien es dato del negocio y no está escrito
en ninguna parte del proyecto; sembrarlo con un número plausible haría que el
panel diera consejos que nadie dio. Mismo criterio que los precios de los
menús.

### La lista de arranque la corrigió el cliente (2026-10-22, y otra vez el 2026-11-02)

Los puestos que trae el código al partir son hoy **once**: jefe de turno,
parrillero, asistente parrillero, jefe de cocina, asistente de cocina,
garzón, **comandero**, **copero**, runner, barman y asistente de bar.

**Los dos últimos salieron de pasar su lista de gente real al panel**: en la
planilla del cliente los departamentos son `COMANDAS` y `COPERIA`, y ninguno
de los dos cabía en los otros nueve sin decir otra cosa — un comandero no es
un garzón, y un copero no es un asistente de cocina. Se los había mapeado al
más cercano y el cliente corrigió las dos: *"el puesto es comandero"*,
*"existe el puesto copero"*.

Antes eran siete y el cambio no es cosmético: `Cocina`, `Barra` y `Asistente` juntaban en una palabra cosas
que en el local son puestos distintos. Quien manda la parrilla no hace lo
mismo que quien lo asiste, y `Asistente` a secas no dice de qué. Un puesto
que no distingue no sirve para contestar si el equipo alcanza, que es para
lo único que esta lista existe.

**Eso es el arranque, no la verdad.** En cuanto alguien guarda los puestos
en `/equipo`, manda la planilla y esta lista deja de mirarse. Renombrar un
puesto tampoco toca lo ya asignado: cada turno guarda **el puesto con que se
asignó ese día**, así que un turno viejo sigue mostrándose con su nombre
aunque el puesto se llame distinto hoy (`planDelDia()` los agrega al final
de la lista, con el nombre tal como se escribió).

### Lo que falta se dice con los puestos (2026-11-12)

Lo pidió el cliente: *"Faltan 2 según las reglas de cada puesto"* no decía
dónde. Ahora dice **qué puestos**: *Faltan 3: 2 × Garzón, Runner* —misma
forma que la lista de puestos de la tarjeta, uno sin número y sin
pluralizar el nombre, que lo escribe el cliente— en el dorso de la tarjeta,
la ventana de planificar y la pastilla de la página del día
(`faltantesDe()` y `textoFaltantes()` en `equipo.ts`, con pruebas). La
celda de `/turnos` sigue con *faltan N*: no hay espacio.

- **En la ventana de planificar cada puesto que falta es un botón**: baja
  hasta su caja y le abre el buscador (`abrir` en `BuscarPersona`).
- **La caja de un puesto incompleto se ve desde lejos**: borde ámbar grueso,
  fondo ámbar suave, una pastilla *Faltan N* junto al *2 / 5* y el
  *+ Agregar…* con borde ámbar (`destacar`). Los completos quedan como
  estaban, y el orden sigue siendo el de *Administrar puestos*.

### Una persona ocupa un puesto, no dos

Asignar a alguien a un segundo puesto el mismo día lo **mueve**, no lo
duplica. No es una limitación técnica: una persona contada como garzón y como
barman a la vez haría decir al panel que hay dos donde hay una, y este es
justo el lugar donde se mira para saber si el equipo alcanza. Lo garantiza
`normalizarPlan()` **en el servidor**, no la interfaz, porque una llamada
directa a la API tiene que obedecer la misma regla.

### La lista para elegir va alfabética (2026-11-01)

Lo pidió el cliente mirando el desplegable con que se agrega a alguien a un
puesto: venía **en el orden en que se grabó cada ficha**, que no es un orden
para nadie. Con quince personas hay que leer la lista entera para encontrar
a una, y la recién creada queda al final — que es justo la que se va a
buscar.

- Va en `porNombre`, en `equipo.ts`, y lo usan el planificador del día y el
  de las actividades extras: **dos pantallas que preguntan lo mismo tienen
  que preguntarlo igual.**
- Es `localeCompare` con el idioma puesto y `sensitivity: 'base'`, no una
  comparación de cadenas: así un `hugo vergara` escrito en minúsculas va
  entre Gloria y Álvaro donde corresponde, y no al final de todo. Hay una
  prueba que lo fija con ese caso exacto.
- **Las listas de fichas de `/equipo` y `/extras` también van alfabéticas**
  (el cliente lo pidió al día siguiente, y tenía razón: es la misma gente y
  el mismo problema). Pero ahí hay una trampa que conviene tener escrita,
  porque la versión anterior de esta nota decía que no se podían ordenar:
  **se ordena lo que se dibuja, no lo que se guarda.** La posición de cada
  ficha en el array **es su fila en la planilla**, y todo lo que la edita
  —cambiar un campo, quitarla, desactivarla— usa ese índice; ordenar el
  array de verdad haría que editar a alguien escribiera sobre otro. Por eso
  cada ficha se lleva su índice al ordenarse
  (`.map((t, i) => ({ t, i })).sort(…)`). Comprobado abriendo la última de
  la pantalla, que es la novena de la planilla: se abrió la ficha correcta y
  el cambio quedó en ella sola.
- **Las fichas sin nombre van al final**, que es donde está el botón de
  agregar: una recién creada que saltara al principio se perdería de vista
  justo después de apretarlo.

### Los días de preparación, y el calendario del equipo (2026-10-22)

**Hay días en que no entra nadie y se trabaja igual**: preparar un
matrimonio, dejar la carne lista, montar el salón. Lo trajo el cliente, y el
panel no tenía dónde anotarlos: el calendario de la portada muestra **solo
los días que reciben público** —los que abre la regla, los que están en
`Fechas Hábiles` y los que tienen reservas— así que un martes cualquiera
sencillamente no existía y no se le podía asignar equipo.

Por eso existe **`/turnos`, el calendario del equipo**: el mes completo, día
por día, y cualquiera se puede planificar. Se llega desde el menú y desde un
enlace arriba en `/equipo`.

**No reemplaza al calendario de la portada, y eso se decidió así.** Ese es el
comercial, el que contesta cómo va la ocupación de un fin de semana; llenarlo
de martes vacíos le quitaría justamente eso. Son dos preguntas distintas
—"¿cómo venimos de reservas?" y "¿quién trabaja?"— y cada una tiene su
pantalla.

**Un día de preparación no es un dato nuevo: se deduce.** Si un día tiene
equipo asignado y no recibe público, es preparación. Se decidió así con el
cliente sobre la alternativa de agregar una columna y una casilla que marcar:
una marca a mano sería una segunda verdad capaz de contradecir a la primera
—un día marcado "preparación" que después se abre, o al revés—. La regla vive
en una sola función, `esPreparacion()`, porque la preguntan tres pantallas y
tres copias de la misma condición es lo que se desalinea cuando cambie.

**Planificar un día cerrado no lo abre.** Los turnos viven en su propia
pestaña y no tocan `Fechas Hábiles`, así que `/api/publico/fechas` sigue sin
ofrecer ese día. Estructuralmente no puede pasar —ese endpoint se arma desde
la ocupación y no mira los turnos— y además se comprobó a mano: con un
martes planificado, el sitio sigue ofreciendo solo el sábado y el domingo.
La pantalla lo dice igual, porque es la duda razonable al usarla.

**Preparación va en café desde el 2026-11-12** (lo pidió el cliente): el
punto 🟤, la palabra, la celda de `/turnos` y la planilla semanal. Antes iba
en amarillo, **el mismo del semáforo "casi lleno"**, y un día de montaje no
puede leerse como un día con poco cupo. Se probó rosado y el cliente lo
descartó en el acto: el rosado ya significa *"cotizado, sin confirmar"*.
`cafe` es un color con nombre propio en las dos paletas, como `morado`.

Dónde aparece un día de preparación, y cómo:

| | Qué muestra |
|---|---|
| `/turnos` | La celda en **café** (antes dorado), con **preparación** y cuánta gente hay asignada |
| Planilla semanal | La columna dice **preparación** en vez de "0 personas · 0 reservas", que se leería como un día flojo |
| Link personal | "día de preparación, no abre al público", para que quien lo lee sepa si va a atender o a montar |
| Calendario de la portada | **No aparece**, a propósito: ese día no recibe gente |

**Un día de preparación se paga como cualquier otro, y entra al informe**
(decidido el 2026-10-22). El informe no sabe —ni tiene por qué saber— si ese
día abría: suma los turnos del periodo y ya. Hay una prueba que lo fija, para
que a nadie se le ocurra filtrarlos después.

Y como el monto de un día de montaje suele ser **un acuerdo aparte**, se
resuelve con lo que ya existía: el **ajuste con su motivo** al pasar lista,
que suma o resta sobre la jornada. No hizo falta nada nuevo; lo que faltaba
era poder llegar.

**La convención la fijó el cliente el 2026-10-22: se deja la jornada como
está y la diferencia va en el ajuste**, no se edita la jornada. Los dos
caminos dan el mismo total, pero solo uno deja escrito el porqué: una
jornada editada no se distingue de un error de tipeo, y un ajuste con motivo
se explica solo cuando alguien revise ese pago un mes después. Va dicho en la
propia ventana del día, que es donde se aplica.

**Llegar era el problema**, y por un tiempo se resolvió con un enlace *"abre
el día"* dentro de la ventana de planificación. El 2026-10-23 dejó de hacer
falta: los montos y la propina se escriben en esa misma ventana, así que a
un día de preparación ya no hay que llegar por ningún lado — se planifica y
se cierra ahí. Ver "Una sola ventana para el día".

Dos detalles de implementación que vale la pena tener escritos:

- **El número del día va pegado arriba, y eso hay que pedirlo** (2026-10-23,
  lo reclamó el cliente mirando `/extras`). Las celdas de una fila se
  estiran todas a la más alta, y **el contenido de un `<button>` se centra
  en vertical por defecto** —es comportamiento propio del botón, no del CSS
  de la página—, así que el número quedaba a media altura y a distinta
  altura en cada celda según cuántas líneas trajera: el mes se veía
  desordenado sin que ninguna regla del CSS dijera nada raro. Con
  `flex-col` + `justify-start` el número queda siempre en la primera línea y
  lo demás se acumula debajo. Vale para los dos calendarios de celdas
  (`/turnos` y `/extras`).
- **`diasDelMes()` cuenta los días con una tabla y la regla de los
  bisiestos**, no pidiéndole el último día a un `Date`. Es la misma razón por
  la que todo este proyecto trata las fechas como texto: una fecha que pasa
  por `Date` se corre de día según el huso del servidor, y Vercel no está en
  Chile.
- **Siete columnas no caben en un teléfono**, así que el mes se desplaza de
  lado dentro de su caja, como las tablas del panel. Es preferible a achicar
  el texto hasta que "preparación" no se lea. De paso, **la barra de arriba
  ahora envuelve** (`flex-wrap`): con ocho páginas ya no cabía, y una barra
  que no cabe se lleva la página entera hacia el costado.

### Marcar quién llegó, desde el propio planificador (2026-10-22)

Lo pidió el cliente pensando en **la jefa de turno**: quien abre el día a las
once de la mañana no va a pasar lista con montos, va a mirar quién llegó. Por
eso cada persona asignada tiene ahí mismo un **— / Vino / No vino**, en la
misma ventana donde se elige y se agrega gente. Quien no llegó queda tachado,
y el pie dice cuántos vinieron.

**Desde el 2026-10-23 los montos están en esa misma ventana**, debajo. La
idea de separarlos —marcar presencia es de la mañana, cerrar las cuentas es
de la noche— era razonable y no sobrevivió al uso: obligaba a entrar dos
veces y a pasar por una pantalla que para un día de preparación ni siquiera
existe. Quien marca en la mañana deja los montos como están y listo; quien
cierra en la noche los llena. Ver "Una sola ventana para el día".

**La línea de cada persona son tres líneas fijas, ninguna que envuelve**
(2026-10-30, terminado el 2026-11-02). Cada cosa en su línea: **quién es**,
**si vino**, y **qué se hace con él** —*+ Ajuste*, *Ficha*, *Sacar*—. Antes
era una sola fila con `flex-wrap`, así que con un nombre corto —"Alexis"—
cabía todo junto y con uno largo se iba bajando lo que no alcanzaba: dos
personas seguidas se veían distintas sin que hubiera cambiado nada salvo el
largo del nombre, y lo que se aprieta sin querer es justamente lo que se
movió de lugar. **Ficha y Sacar además van agrupados**, para que bajen los
dos o no baje ninguno.

**El primer arreglo partió la línea de abajo y dejó la de arriba igual**, y
por eso el cliente volvió a reclamarlo el 2026-11-02 con una captura: *"no
puede ser que por la longitud del nombre y apellido depende si aparece al
lado derecho del nombre o abajo del nombre"*. Tenía razón, y es la misma
causa: mientras *Vino / No vino* compartiera fila con el nombre, el nombre
decidía dónde quedaban los dos botones que más se aprietan de esa ventana.
Ahora la asistencia **es su propia línea** y no un hueco al final de la del
nombre, así que no depende de nada.

Comprobado a 393 y a 1280, en los dos temas: las cuatro personas —"Alexis"
y "Cristopher Acevedo" incluidas— tienen los botones a la misma distancia
del nombre y en la misma posición, y ninguna pantalla se corre de lado.

**La lección, que vale para cualquier fila de estas:** `flex-wrap` no
ordena, solo deja caer lo que no cupo. Si dos cosas tienen que verse
siempre igual, van en filas distintas; si pueden acomodarse, van juntas.

**Desde el 2026-10-30 son dos botones grandes, no un desplegable.** Lo pidió
el cliente con el porqué: *"son personas rurales, que no han manejado muchos
de estos sistemas; necesitamos que para ellos sea muy fácil de entender"*. Un
`<select>` esconde las opciones hasta que alguien adivina que hay que
abrirlo, y lo que muestra mientras tanto es un guion, que no pide nada.

Lo que hay ahora, en `Asistencia.tsx` y usado también en las actividades
extras —dos pantallas que preguntan lo mismo tienen que preguntarlo igual—:

- **Los dos botones a la vista**, con la frase completa: *✓ Vino* / *✕ No
  vino*. Se lee qué hay que hacer antes de tocar nada.
- **El que se aprieta queda pintado**, verde o rojo, y la fila entera se
  tiñe: el estado se ve de lejos, sin leer.
- **Mientras nadie marque, la fila lo dice en ámbar** —*sin marcar*— porque
  es justo el estado que no suma nada y el que impide cerrar el día.
- **Unos 40px de alto**: un control de 30 se falla con el dedo, y fallar acá
  es marcar a la persona equivocada.
- **Apretar el que ya está marcado lo desmarca**, que es la única forma de
  volver a "no sé todavía" sin inventar un tercer botón.

En la misma pasada, y por el mismo criterio:

- **El botón de cerrar dice en pantalla por qué está apagado** —"falta
  marcar si una persona vino o no"—. El motivo vivía en el `title`, o sea en
  un globito que aparece al pasar el mouse: en un teléfono eso no existe, y
  lo que queda es un botón muerto sin explicación.
- **Sacar a alguien del día es un botón que dice "Sacar" y pregunta antes.**
  Era una ✕ de diez píxeles que borraba sin avisar: el único control de esa
  ventana que deshace algo, y el más fácil de apretar sin querer con el
  dedo. Lo mismo en las actividades extras.
- **Lo que se aprieta con el dedo mide para el dedo**: *Ficha*, *Sacar* y
  las flechas de los puestos pasaron de unos 20px a 36.

**Ojo con una trampa que esto abrió, y que costó cambiar una regla del
servidor.** `guardarEquipoDelDia()` heredaba los montos de la ficha **solo
mientras la asistencia estuviera sin marcar**; pasada la lista, lo que viniera
del navegador mandaba. Con la asistencia marcándose en el planificador, un
turno puede nacer ya en "vino" **y con los montos en cero**, porque la
pantalla de un encargado nunca recibe los sueldos de nadie. Esa persona habría
quedado congelada en **$0**, y el error habría aparecido el día de pagar.

La regla ahora es: **lo que venga manda, salvo que el turno no traiga ningún
monto.** Un turno con asistencia y sin montos no es un cero corregido a mano,
es uno al que todavía nadie le puso precio. Con la convención de que las
diferencias van en el ajuste, un cero deliberado en la jornada ya no existe.

**El botón "Agregar fecha" se puso acá y se sacó el mismo día** (2026-10-22),
y conviene que quede escrito para que a nadie le dé por reponerlo: **un día de
preparación no se agrega, se planifica.** Se aprieta el día —el que sea— y se
le asigna equipo; eso es todo, y no lo abre al público. *Agregar fecha* es
otra cosa: pone el día en el calendario **para recibir reservas**, así que
tenerlo en esta pantalla solo invitaba a usarlo para un montaje y abrirlo sin
querer. Abrir un día sigue siendo del calendario de la portada.

**Y desde el otro lado, el 2026-10-30, se abrió la puerta que faltaba**: el
*Agregar fecha* del calendario de la portada ofrece ahora un cuarto estado,
**Día de preparación**. Lo pidió el cliente con el caso exacto: *"se agrega
una fecha pública y al final dice en esa misma vista el encargado: ah, y
tengo que preparar una fecha"*.

**No contradice nada de lo anterior, porque no escribe una fila.** Elegirlo
cambia el botón a *Planificar el equipo* y abre la ventana del equipo de esa
fecha; `Fechas Hábiles` no se toca, así que el sitio sigue sin ofrecer ese
día. Comprobado de punta a punta: con el 11 de noviembre planificado desde
ahí, la planilla no tiene esa fila, `/turnos` lo muestra en dorado como
preparación y el calendario de la portada no lo muestra.

Lo que sí cambió es la pregunta del grupo de opciones, que decía **"quién
puede reservar"**: a eso la preparación contestaría "nadie", que no es lo que
dice. Ahora pregunta **qué día es**, y las cuatro respuestas caben.

**Solo se ofrece al agregar, no al editar un día que ya está en la hoja.**
Ese se vuelve de preparación cerrándolo y asignándole equipo, y poner acá un
atajo a eso sería explicar dos caminos para lo mismo.

**La jefa de turno es un puesto, no un rol.** Para marcar asistencia necesita
una cuenta de **encargado** en `/usuarios`; con su nombre, además, la bitácora
dice quién marcó qué.

### Las columnas de `Turnos` se leen por nombre, no por posición

Al revés de `Puestos` y `Trabajadores`. La diferencia no es gusto: esas dos
se reescriben enteras al guardar, así que la posición la fija el panel. A
`Turnos` se le agregan y se le borran filas de a una, **y le van a crecer
columnas en el lote 3** —asistencia, horas, ajustes—: con posiciones fijas,
agregar una obligaría a reescribir todas las filas ya guardadas. Es el mismo
criterio que usa `Reservas`.

Guardar el equipo de un día **borra las filas de esa fecha y escribe las
nuevas**, sin tocar los otros días: la pestaña entera son todos los fines de
semana del año, y un error guardando un sábado no puede llevarse por delante
el historial.

### El calendario se agrupa por semana (2026-10-30)

Lo pidió el cliente: *"me gustaría poner un poco más el enfoque a que juntes
los paneles semanalmente. No digo que dejas de marcar el mes, pero se piensa
mucho semanalmente en el local"*.

Las semanas ya estaban, pero marcadas **más suave que el mes** —una línea
gris sobre una grilla corrida— justamente al revés de cómo se usa. Ahora
**cada semana es una caja con su cabecera** y el mes es la línea que la
precede: sigue marcado, que es la referencia para ubicarse entre 90 días,
pero dejó de ser lo que agrupa.

En la cabecera de cada semana: el rango en palabras, **hasta tres avisos**
y el botón de mandar la planilla.

#### La línea de la semana avisa lo que se sale de lo normal (2026-11-05)

Decía *"13 personas · 2 públicos"*, y ese "2 públicos" contaba **días**
abiertos al público: el cliente lo leyó como reservas, y además ya se ve en
cada tarjeta. Pidió aprovechar la línea para *"subrayar ciertos casos
especiales"*. Ahora van **pastillas solo cuando aplican**, en orden de urgencia y **tres como máximo** (`lineaDeSemana()` en
`semana.ts`, con sus pruebas):

| Aviso | Ejemplo | Color |
|---|---|---|
| Día cerrado con gente reservada | *Sáb cerrado con 4 personas* | rojo |
| Lleno / casi lleno (semáforo rojo) | *Sáb lleno* · *Dom casi lleno* | rojo / ámbar |
| Grupo grande | *Dom: grupo de 30* · *3 grupos grandes · sáb y dom* | dorado |
| Falta equipo según las reglas de cada puesto | *Falta equipo el sáb* | ámbar |
| Ganados del CRM sin anotar | *150 del CRM el dom* | cielo |
| Presupuestos vigentes | *2 presupuestos · 43 posibles* | rosado |

- **Uno por tipo, nombrando los días**: *"Sáb y dom casi llenos"*, no dos
  pastillas que dicen lo mismo.
- **Sin conteo de personas ni reservas** (lo sacó el cliente el mismo día:
  *"se ve en los dos paneles… mejor usémoslo solo para los avisos
  importantes"*). Sin avisos, la línea es solo el rango de fechas, y eso ya
  dice que es una semana normal.
- **"Grupo grande" es desde 30 personas** y vive en `Config`
  (`grupo_grande`, editable en `/configuracion`), porque es dato del
  negocio. En cero no se avisa nunca.
- Cuántas personas hay que cobrar **no** va acá: ya está en cada tarjeta y
  no es algo que haya que hacer en la semana.

**La semana en curso va delineada en dorado y dice "esta semana".** Es la
que se mira al entrar.

**Y una semana que cruza de mes ya no se parte en dos.** Antes sí, a
propósito —mandaba el encabezado de mes—, y dejó de tener sentido cuando la
semana pasó a ser una caja: un sábado 31 y su domingo 1 son el mismo fin de
semana, el mismo turno y la misma planilla, así que verlos en dos cajas
distintas es justo lo contrario de lo que se pidió. El mes se anuncia antes
de la primera semana que lo estrena.

### La tarjeta se da vuelta

Cada día del calendario tiene **Equipo** al pie: la tarjeta gira en 3D y
muestra el resumen —cuánta gente, cuántos por puesto, cuántos faltan— con el
botón **Planificar equipo**. Dos detalles de implementación que arreglan
trampas conocidas:

- **Las dos caras van en la misma celda de una grilla**, no con
  `position:absolute`. Así el alto de la tarjeta es el de la cara más alta,
  sin fijarlo a mano — y una medida fija es justo lo que queda viejo cuando
  el contenido cambia. El pie va con `mt-auto` para que el aire sobrante
  quede en el medio y no colgando bajo los botones.
- **La cara de espaldas se apaga para todo el mundo**: `aria-hidden`,
  `pointer-events-none` y `tabIndex -1` en sus botones.
  `backface-visibility` esconde el dibujo pero **deja los enlaces
  alcanzables con el tabulador**, así que sin esto se podría tabular hacia
  botones invisibles.

**El número del pie pesa más que su propia palabra** (2026-11-01, lo pidió
el cliente). El botón *Equipo* traía al lado cuánta gente hay asignada, en
`text-hueso/60`, o sea **más apagado que el rótulo que lo acompaña** —que va
al 80—. Era al revés de lo que alguien mira: la palabra se lee una vez y el
número se mira cada vez. Ahora va en su propia cajita, en negrita y al color
completo, así que se distingue **por forma** y no solo por peso, que es lo
que pide la regla del panel. El botón sigue midiendo 36px.

**Un día salía más largo que los otros, y la causa era la cara que no se
veía** (2026-10-30, lo notó el cliente con una captura: *"el domingo está más
largo que los otros días, de hecho es el único día que pasa"*).

Medido antes de tocar nada: el frente del viernes y el del sábado medían
**178px** y el **dorso del domingo, 295** — nueve personas repartidas en
nueve puestos, **un renglón cada uno**. Como las dos caras comparten celda,
ese dorso estiraba la tarjeta entera, y el frente —que es lo que uno mira—
quedaba con un hueco bajo el borde.

**La lista vertical era el problema de fondo, y no tenía techo.** Lo dijo el
cliente al ver el primer arreglo —un recorte a cinco puestos con un "y 4
más"—: *"siempre va a haber más que seis puestos, siempre"*. Un recorte deja
el dato afuera justo cuando más puestos hay, que es cuando uno quiere mirar.
Entonces:

- **Todos los puestos, en una lista corrida separada por comas**, como lo
  escribiría una persona: *"4 × Garzón, Jefe de turno, 2 × Parrillero,
  Barman"*. **Uno no lleva número** —nueve "1 ×" seguidos son ruido, y sin
  número se lee "uno"— y el `×` es la misma convención que los menús del día.
  Con esto un sábado de 18 personas en los nueve puestos ocupa **cuatro
  renglones en vez de nueve**: el dorso pasó de 295px a 201.
- **"2 × Garzón" y no "dos garzones"**, porque los nombres de puesto los
  escribe el cliente y no hay forma de pluralizarlos bien sin inventar reglas
  del español: "asistente de bar" no se pluraliza como "garzón".
- **Un alto estándar** (`ALTO_ESTANDAR`, hoy `13rem`), que es lo otro que
  pidió: *"encontrar el tamaño estándar con el cual llegar a la tarjeta y
  poder rellenar siempre todos los puestos que se llenan"*. Con él **todas
  las tarjetas de la página miden lo mismo**, no solo las de una fila, y el
  sábado más cargado entra sin estirar nada.
- **Es `min-height` y no `height`, y esa es toda la diferencia** con la
  medida fija que este archivo venía evitando: un piso no recorta nada. Si
  algún día no alcanza —una pantalla angosta hace envolver más la lista— la
  tarjeta crece, y `h-full` deja pareja su fila igual.

**Se probó la salida obvia —que mande el frente, con el dorso `absolute`
encima— y se descartó**: la tarjeta quedaba a 178 y el dorso salía **cortado
a media línea**, sin nada que dijera que seguía. Arreglar una cara rompiendo
la otra no es arreglarlo.

El pie del frente dice ahora **"Ver reservas"** y no "Ver quiénes vienen":
con tres acciones, el texto largo se partía en dos líneas en una tarjeta de
cuatro columnas. La fecha del título lleva al mismo lugar.

**La línea de "$X por cobrar" se sacó** (2026-10-23, a pedido del cliente),
de la tarjeta del calendario **y del bloque de la página del día**. Era la
suma de las reservas que pagan en el local, y **en el local se paga otra
cosa**: una bebida más, un postre, lo que se consuma ese día. O sea que ese
número nunca iba a ser lo que hay que cobrar, y un total que no es el total
no sirve para cuadrar nada — solo para que alguien lo crea.

Lo que sí sirve, el monto de cada reserva, sigue en su fila de la tabla. Y
el cálculo tampoco se borró: `faltaCobrar()` y los campos `porCobrar` /
`sinMonto` de la ocupación siguen ahí con sus pruebas, por si algún día se
muestra de otra forma. Lo que se liberó es el espacio, para cuando aparezca
algo que de verdad ayude mirando el mes.

### El check de pago, que son pagos y no una casilla (2026-11-01)

Lo pidió el cliente pensando en quien hace la transferencia: *"un check de
pago… pero que también tendrá la posibilidad de decir yo pagué solo 100 de
esto"*.

**Lo que se guarda son los pagos, no un check.** Una casilla "pagado sí/no"
más un campo "monto pagado" son dos datos que pueden contradecirse —alguien
marca la casilla y deja el monto en cero, o al revés— y el panel tendría dos
verdades sobre la misma plata. El hecho que se guarda es **el pago**: cuánto,
cuándo y quién lo anotó. Que esté pagado del todo **se deduce de sumarlos**,
igual que "Vencido" se deduce de la fecha en los presupuestos.

Lo que eso gana, y que un check no da:

- **Un pago parcial no es un caso especial**, es un pago más chico. Pagar el
  resto después es otra fila y la suma cierra sola, sin un estado intermedio
  que alguien tenga que mantener.
- **Queda el rastro**, que es justo lo que alguien va a querer saber un mes
  después.
- **Una corrección se anota en negativo** en vez de borrar la fila, así que
  tampoco se pierde que hubo dos movimientos.

Vive en una pestaña propia, **`Pagos`** (ID · Fecha de pago · Trabajador ·
Periodo desde · Periodo hasta · Monto · Nota · Registrado por), por nombre de
columna como `Turnos` y `Cierres`. El código está en
`panel/src/lib/remuneraciones.ts` — **se llama así y no `pagos.ts` porque ese
nombre ya lo tiene el estado del pago de una reserva**, que es plata que
entra; ésta es plata que sale.

- **El pago se ancla al periodo por el que se pagó, no al día en que se
  transfirió.** Se paga el lunes la semana que terminó el domingo, así que la
  fecha de la transferencia cae fuera del periodo que está saldando.
- **Cuenta cuando cabe entero dentro del periodo que se mira**
  (`cuentaEnPeriodo()`). Pagar la semana del 9 aparece al mirar esa semana y
  al mirar noviembre entero, que es como se usa. **La contra a asumir:**
  mirar un rango de tres días metido dentro de esa semana **no** muestra ese
  pago, porque no es de esos tres días. Repartirlo a prorrata sería inventar
  —nadie pagó "un tercio del martes"—. **Se comprobó rompiéndolo**: contando
  por solape en vez de por contención, esa prueba falla.
- **Registrarlo es del permiso `pagar`: administrador y la cuenta de
  pagos.** El encargado ve el informe —se lo liberó el cliente como
  intertanto— pero leer cuánto se le debe a alguien y declarar que esa plata
  salió son dos cosas distintas. Hay una prueba que lo fija, y el encargado
  recibe **403 llamando la API directo**, no es que se le esconda el botón.
- **`pagar` es justamente lo único que distingue a `pagos` de
  `encargado`** — ver "El rol de pagos".

#### Deshacer un pago anotado por error (2026-11-04)

Lo pidió el cliente con el caso exacto: *"apreté el botón pago completo en un
trabajador, queda como pagado, pero necesito igual la posibilidad de rehacer
esta acción, porque si lo aprieto por no querer, tengo que tener la
posibilidad de volver y decir: no, esto no se pagó aún"*.

**`DELETE /api/informe` existía desde el 2026-11-01** —con su permiso `pagar`
y su línea de bitácora ya escritas— **y ninguna pantalla lo llamaba.** Es el
mismo caso que la mitad que lee el CRM, y la misma regla: **una ruta sin
pantalla no está hecha.** Lo que faltaba era el botón, no la lógica.

Y había algo que lo agravaba: con la parte pagada del todo, su tarjeta
**se quedaba sin un solo botón** — justo en el caso que lo dispara. Ahora,
mientras la persona tenga algún pago en el periodo, su tarjeta abierta
termina en **Ver el pago anotado** (o *Ver los N pagos anotados*), que abre
la lista con fecha, concepto, nota, quién lo anotó y su **Deshacer**.

**Va por persona y no por parte**, y eso importa: los pagos viejos vienen
**sin concepto** y `desglosePago()` los reparte entre sueldo y propina con
una regla suya. Filtrar acá por concepto sería reescribir esa regla en un
segundo lugar, y el día que cambie una de las dos diría otra cosa.

**Borra la fila; no anota un negativo**, y la diferencia es real:

| | Qué corresponde |
|---|---|
| **Se apretó sin querer** — ese pago nunca ocurrió | **Deshacer**, que borra la fila. No hubo movimiento que registrar, y dejar una fila y su contraria sería inventar dos. Que alguien lo deshizo queda en la bitácora |
| **Se pagó de más, o devolvieron plata** | Un **pago en negativo**, que el formulario ya acepta: ahí sí hubo dos movimientos y borrar uno escondería la mitad |

La ventana lo dice con palabras, porque es justo la distinción que alguien
tiene que hacer **antes** de apretar.

- **Deshacer solo con permiso `pagar`**, y lo comprueba la ruta: el encargado
  ve el informe pero no deshace pagos, igual que no los registra.
- Se saca de lo que hay en pantalla en vez de recargar el informe entero,
  igual que al registrarlo: lo único que cambió es esa fila.

Comprobado el circuito completo contra la planilla, que es el que el cliente
describió:

```
al llegar              SUELDO: sin pagar
✓ Pagado completo      SUELDO: ✓ pagado        · bitácora: "Registró un pago"
Deshacer               SUELDO: sin pagar       · bitácora: "Borró un pago"
```

y la pestaña `Pagos` quedó sin la fila.

**De paso, los ajustes de esa pantalla pasaron a llevar el signo adelante** —
`−$18.000` y no `$-18.000`—, que es la convención escrita del panel y la
única de sus tablas que no la cumplía.

#### La columna que faltaba: a transferir

**La propina se queda aparte del total de remuneración**, como siempre: esa
plata no sale del negocio, pasa por él, y juntarlas haría imposible
contestar "¿cuánto me costó el equipo?". Lo que se agregó es la suma que de
verdad se usa al transferir:

| | Qué es |
|---|---|
| **Total** | lo que cuesta esa persona al negocio — sin propina |
| **Propina** | lo que le tocó del reparto |
| **A transferir** | **Total + Propina** — la plata que sale en una transferencia |
| **Pagado** · **Falta** | lo registrado, y la resta |

Y el bloque del final pasó de un número a dos, porque son dos preguntas:
**Costo del periodo** (la del negocio, sin propina) y **A transferir** (la de
quien paga, con propina). Juntarlas obligaba a contestar mal una de las dos.

- **En el CSV las tres columnas van solo en la primera fila de cada
  persona.** El archivo es detalle día por día y el pago es por persona y
  periodo: repetido en cada fila, quien sume la columna cobraría cinco veces
  lo mismo. En blanco en las demás, la columna suma exactamente lo que hay
  que transferir.
- **Las actividades extras llevan las mismas columnas**, porque el punto era
  un solo pago semanal que las incluya. Su "a transferir" es su total y nada
  más: un colaborador no entra en el reparto de la propina.
- **El monto nace con lo que falta.** Lo normal es pagar todo, y entonces es
  apretar dos botones; bajarlo es lo que lo vuelve parcial, sin un modo
  aparte que haya que elegir. Si queda parcial, **la ventana lo dice antes de
  guardar**, que es cuando sirve saberlo.
- De paso esta pantalla tuvo su pasada de la regla PlayStation: **de 34
  textos bajo 13px a 2** —los dos que quedan son un `sr-only` y uno de un
  componente compartido— y **la columna del nombre queda fija** al correr la
  tabla, como en la planilla semanal y en la página del día.

### Pagar: sueldo y propina por separado, copiar datos y la boleta (2026-11-04)

Lo pidió el cliente pensando en quien hace las transferencias, con tres
ideas que van juntas:

1. *"Dos botones en cada línea de trabajador: copiar los datos de
   transferencia con el monto de propina, y con el monto de sueldo"*.
2. *"Legalmente tiene que ser un pago por propina y un pago por sueldos"*,
   así que registrar un pago tiene que poder decir **cuál** —el sueldo, la
   propina o una parte— de forma simple, estilo PlayStation.
3. *"Una casilla de mandó boleta"* para los que cobran por turno y las
   actividades extras, porque este mismo informe se exporta para alimentar
   **Chipax**, el sistema del resultado operacional.

#### Los pagos llevan concepto

La pestaña `Pagos` ganó una columna **`Concepto`** —*Sueldo*, *Propina* o
*Servicio*, este último para las actividades extras—. **Se agrega sola** la
primera vez que se registra un pago (`asegurarColumna()`), al final y sin
tocar ninguna fila.

- **Un pago viejo, sin concepto, sigue contando** (`desglosePago()`):
  primero cubre el sueldo y lo que sobra va a la propina. El total no
  cambia, y no hay que migrar nada.
- **Un concepto inventado se descarta en el servidor**, igual que un tipo de
  cuenta: llegaría hasta la planilla de Chipax.
- *"Los dos"* registra **dos filas**, una por concepto, no una por el total:
  son dos pagos.

#### La línea de cada persona: cerrada se copia, abierta se paga

**El primer corte puso los pagos en una sección aparte, debajo de las
tablas, y el cliente lo pidió al revés el mismo día**: *"en esta línea
acotada ya están los dos botones… y al apretar la línea del trabajador se
abre y ahí das las opciones"*. Y que funcione perfecto en el celular, que es
donde se va a usar: *"más PlayStation que en cualquier otro lado"*.

Por eso **el informe dejó de ser una tabla**. Once columnas no caben en un
teléfono, y botones de 44px dentro de una celda tampoco. Cada persona es una
línea-tarjeta (`LineaPersona`), como las fichas de `/equipo`, y **se abre una
a la vez**:

| | Qué muestra |
|---|---|
| **Cerrada** | nombre, modalidad y días, lo que hay que transferirle con su estado, y **un botón por parte**: *📋 Sueldo $X* y *📋 Propina $Y* (o *Servicio*). Una parte ya pagada se queda como pastilla verde *✓ Propina*, para que siempre se vean las dos |
| **Abierta** | el detalle (jornadas, horas extra, ajustes, total, propina), el botón de **boleta** cuando aplica, y cada parte con su estado y **Registrar pago de sueldo / propina** |

- **Celular y escritorio son distintos a propósito.** En el celular la línea
  cerrada son dos filas —quién y cuánto arriba, los botones de copiar abajo a
  todo el ancho, para el dedo—. En una pantalla ancha es **una sola fila**,
  con los botones entre el nombre y el monto con su ancho natural: estirados
  a lo largo de 1.200px serían barras, no botones. Abierta, en escritorio el
  sueldo y la propina van lado a lado.
- **Los botones de copiar no van dentro del botón que abre la línea**: un
  botón dentro de otro no es HTML válido y el toque se iría a los dos.
- **Quien no tiene la cuenta completa** muestra *Falta su cuenta para
  transferir* en vez de los botones de copiar.
- **El encargado ve las líneas sin botones**: ve el informe, pero copiar
  cuentas y registrar pagos es del permiso `pagar`.
- **Registrar pago** abre una ventana de dos preguntas con botones grandes:
  **¿Qué le pagaste?** (sueldo, propina, o *Los dos*) y **¿Cuánto?** (*Todo*
  o *Una parte*, que abre el campo del monto).
- **Abre en la semana pasada**, que es la que se paga y la misma con que
  abre el link personal.

#### Copiar desde adentro del bloque

**El cliente no vio los botones de copiar de la línea cerrada como lo que
eran**, y pidió el botón **dentro** de cada bloque abierto: *"dentro de la
sección sueldo, tanto como en la sección propina, copiar datos de
transferencia"*. Ahora cada bloque, abierto, tiene los dos pasos de pagar en
el orden en que se hacen: **📋 Copiar datos de transferencia** (delineado) y
**Registrar pago de sueldo / propina** (relleno, porque es lo que cierra).
Los botones de la línea cerrada se quedaron: son el atajo del lunes.

**Y registrar son dos botones, completo o parcial** (lo pidió el cliente
para acortar el trabajo): **✓ Pagado completo · $X** anota lo que falta de
esa parte **de un toque, sin ventana**, y **Pago parcial** abre la ventana
con el campo del monto ya listo. Lo normal es pagar todo, así que lo normal
es un toque.

- Mientras guarda, el botón dice *Guardando…* y se apaga: dos toques
  seguidos no pueden anotar dos pagos.
- Si falta la boleta no lo frena —puede llegar después—, pero el aviso lo
  dice en ámbar: *"Sueldo de Ana pagado · falta marcar su boleta"*.
- Con todo pagado, la línea cerrada sigue mostrando **✓ Sueldo ✓ Propina**
  en verde: que la fila desapareciera se leía como que algo se perdió.

#### La transferencia masiva

Una tarjeta arriba de las líneas, **solo para quien paga**, con una fila por
concepto —**Sueldos** y **Propinas**, porque son dos pagos—: cuántas personas
y cuánto falta, quién queda fuera por no tener cuenta, y dos botones:

1. **⬇ Planilla** — la planilla para subir al banco.
2. **✓ Todos pagados** — lo pidió el cliente: *"todos los sueldos de esta
   semana pagados, porque se hizo a través de una transferencia masiva… y
   guardar"*. Abre una confirmación con **la lista de personas y montos y el
   total**, y la nota "Transferencia masiva" ya puesta. Guardar anota **un
   pago por persona**, cada uno con su concepto, en **una sola escritura**
   (`anotarPagosEquipo()`; `POST /api/informe` acepta `{ pagos: [...] }`).

- **Los dos botones de una fila salen de la misma lista** (`pendientesDe()`):
  lo que se marca pagado es exactamente lo que salió en la planilla. Si
  cada uno armara su lista, el día que una cambie se marcaría pagado a
  alguien que nunca estuvo en la transferencia.
- **Quien no tiene cuenta no se marca**: tampoco estaba en la planilla, y la
  confirmación lo dice.
- **Si algún pago del lote viene mal, no se anota ninguno**: un lote a medias
  dejaría a la mitad del equipo pagado sin que se note cuál.
- **Cada pago lleva su propio id** aunque se anoten en el mismo milisegundo:
  con ids repetidos, borrar uno por error se llevaría a los demás.

#### Las planillas para la transferencia masiva

También lo pidió el cliente, para cuando tengan un banco con transferencia
masiva: una planilla de **sueldos** y una de **propinas** —el *⬇ Planilla*
de cada fila de la tarjeta—, una por concepto porque son dos pagos. Solo
para quien paga.

- **Una fila por persona con algo pendiente**, con **lo que falta**: lo ya
  pagado no se vuelve a transferir.
- **Los sueldos llevan también las actividades extras** (su servicio).
- **Quien no tiene la cuenta completa queda fuera y el aviso lo nombra**,
  en ámbar: una fila a medias suele hacer rechazar el archivo entero.
- **Las columnas salen del mismo `ORDEN_TRANSFERENCIA` que el botón de
  copiar** (`filaTransferencia()`): cuando se confirme lo que pide el banco
  se cambia una vez y vale para los dos.

El aviso flotante ganó un segundo tono para esto: **ámbar con "!"** cuando
no pasó lo esperado —no se descargó nada, quedó alguien fuera—. Un ✓ verde
sobre "nadie con cuenta completa" se leía como que había salido bien.

#### Sueldo en celeste, propina en dorado (2026-11-05)

Lo pidió el cliente: *"distinguir siguiendo la regla PlayStation un poco más
sueldos y propinas… con un fondo decente, de distintos colores… sin ser muy
gritón"*. Son dos pagos y se veían iguales salvo por la palabra.

- **Sueldo —y el servicio de una actividad extra— en cielo; propina en
  dorado**, como tinte suave (fondo al 7% y borde), con un punto de su
  color junto al nombre. Vive en `TINTE` / `tinteDe()` de
  `InformeEquipo.tsx`, en un solo lugar para las tres partes donde
  aparece: las filas de la transferencia masiva, los botones de copiar de
  la línea cerrada y los dos bloques de la línea abierta.
- **El verde y el ámbar del estado no cambiaron**: siguen diciendo si está
  pagado o no, en su pastilla. El tinte dice *qué* es; la pastilla, *cómo
  va*. Por eso el bloque ya no se pinta verde al quedar pagado.
- Dentro de un bloque, *Copiar datos de transferencia* va con fondo blanco
  (`bg-panel`) para despegarse del tinte.

#### Lo que suma y lo que no, dicho en la línea (2026-11-12)

Lo pidió el cliente mirando a alguien con *"3 días · 2 sin marcar"*: se leía
como 3 días de los cuales 2 sin marcar, y en realidad eran **3 que vino y 2
aparte que no suman**. El cálculo ya estaba bien —`informeDelPeriodo()`
cuenta solo la asistencia marcada—; lo que fallaba era decirlo.

- **Cerrada**, la línea dice *Por turno · 3 días que vino · 1 no vino*, y
  si hay días sin marcar, un botón aparte: **⚠ 2 sin marcar: no suman ·
  Marcar →**, que lleva a `/turnos?dia=<el primero>` (en una actividad
  extra, *sin confirmar* y `/extras`). Va fuera del botón que abre la línea:
  un enlace dentro de un botón no es HTML válido.
- **`/turnos` y `/extras` aceptan `?dia=AAAA-MM-DD`**: abren ese mes y la
  ventana de ese día, recién cuando llegan sus datos.
- **Abierta, es un recibo**: **✓ Suma: N días que vino** con jornadas, horas
  extra, ajustes, el **Sueldo** y la **Propina (aparte)**, y una línea que
  dice qué es lo que se paga (la propina en otra transferencia; un
  contratado, solo horas extra y ajustes). Al lado, **○ Todavía no suma**
  con un *Marcar el sáb 7 nov →* por día, y **✕ No se paga** con los días
  que no vino. Antes era una grilla de tres columnas con los valores lejos
  de su nombre.
- **Cada parte avisa bajo su monto** si hay días sin marcar: *"Sin los 2
  días sin marcar: si vino, después se le debe más"*.
- Los días salen de `diasQueNoSuman()` en `equipo.ts` (con pruebas), la
  misma para turnos y actividades extras; la fecha corta, de `enCorto()`.
- **El anillo azul del foco ya no se monta sobre los botones de copiar**:
  va adentro del botón de la línea y solo con teclado (`focus-visible`).

#### Filtrar: *Por pagar* y buscar por nombre (2026-11-05)

Lo pidió el cliente: *"un botón por pagar, justo arriba de la lista… y el
mismo campo de búsqueda de nombre"*. Arriba de las líneas hay dos botones
—**Todos** y **Por pagar**, cada uno con cuántas personas cuenta— y un
buscador.

- **Por pagar es quien tiene `falta` mayor que cero** en el periodo
  elegido, o sea lo mismo que dice su pastilla: el filtro y la línea no
  pueden contradecirse. A quien se le pagó todo, desaparece.
- **El buscador es el mismo criterio que `BuscarPersona`**: sin tildes ni
  mayúsculas, "perez" encuentra a José Pérez.
- **Filtra las dos listas a la vez**, equipo y actividades extras. Los
  totales de debajo de cada lista **siguen siendo los del periodo entero**:
  el filtro es para encontrar a alguien, no cambia cuánto se debe.
- Si no queda nadie, lo dice: *"✓ A nadie le falta pago en este periodo"*
  o *"Nadie calza con…"*, en vez de una pantalla en blanco.

#### Tres descargas: solo sueldos, solo propinas, completa (2026-11-12)

Lo pidió el cliente, sobre todo para quien paga: el botón *Descargar
planilla* pasó a ser tres —**Solo sueldos** (celeste), **Solo propinas**
(dorado) y **Completa**—, con el mismo tinte que el resto del informe. Son
el detalle día por día; las planillas del banco de la transferencia masiva
siguen aparte.

- **Solo sueldos**: el equipo y las actividades extras, sin la columna de
  propina, con *Sueldo del periodo · Pagado · Falta · Boleta* y los datos de
  la transferencia.
- **Solo propinas**: solo los turnos con propina —un jinete no entra en el
  reparto—, sin jornada ni ajustes, con *Propina del día · Propina del
  periodo · Pagado · Falta* y los datos de la transferencia.
- **Completa**: la de siempre, las dos cosas juntas.
- En las tres, **el pago va solo en la primera fila de cada persona**, por
  lo mismo de siempre: la columna suma exactamente lo que hay que pagar.
  Lo pagado de cada parte sale de `desglosePago()`, la misma cuenta de la
  pantalla. Sin filas, avisa en vez de bajar un archivo vacío.

#### El orden de los datos copiados todavía no está confirmado

Hoy es **titular, RUT, banco, tipo, número, monto, correo, glosa**, y vive
en una sola lista, `ORDEN_TRANSFERENCIA` en `remuneraciones.ts`: **cambiarlo
es mover una línea ahí**. Falta probarlo con el panel del banco del cliente,
que es lo que dirá el orden en que pega bien campo por campo.

- **El monto va pelado** —`60000`, sin puntos ni signo peso—, que es lo que
  un formulario de banco acepta pegar.
- **La glosa es corta y sin símbolos**: *"Sueldo 26/10 al 01/11"*. La
  primera versión decía *"26 de octubre – 1 de noviembre"*, y los bancos
  cortan la glosa a unos 30 caracteres y varios rechazan el guion largo y
  las tildes.

#### La boleta

Una pestaña nueva, **`Boletas`** (Trabajador · Periodo desde · Periodo hasta
· Registrado por · Cuándo · Nota): **una fila por persona y periodo con la
boleta recibida**. Desmarcar borra la fila; si no está, no llegó. Es el
mismo criterio que los cierres: se guarda el hecho, la ausencia se deduce.

| | ¿Pide boleta? |
|---|---|
| Por turno | **sí** — por su sueldo de la semana |
| Actividad extra | **sí** — por su servicio |
| Contratado | **no** — va por la liquidación. Sus horas extra y ajustes quedaron para después: el cliente lo pidió así (*"no te quiero complicar la vida completa"*) |
| Propina | **nunca** |

- **Es una boleta por la semana**, no una por día: *"cuando mandó las
  boletas por los 4 días de la semana, se puede dar un check"*. La regla
  vive en `pideBoleta()`.
- **Avisa, no bloquea.** Registrar el sueldo sin boleta marcada muestra un
  aviso ámbar y se puede guardar igual: la boleta puede llegar después de la
  transferencia, y trabar el registro obligaría a anotar el pago en otro
  lado mientras tanto.
- **Marcarla es del permiso `pagar`**, por `/api/informe/boleta`, y queda en
  la bitácora.
- **En el CSV**, columna **Boleta**: *Sí*, en blanco si no llegó (lo pidió
  así el cliente) y *No aplica* para un contratado. Van además **Pagado
  sueldo o servicio** y **Pagado propina**, en la primera fila de cada
  persona como las demás columnas del pago.

### Lo que va a costar el equipo de un día, en la tarjeta (2026-11-01)

Lo pidió el cliente: en el espacio libre de arriba a la derecha del dorso,
al lado de cuánta gente trabaja, **cuánto suman las remuneraciones del
equipo planificado hasta ahí**. Ocupa el aire que ya estaba ahí, así que no
alarga la tarjeta.

**No abre ningún dato nuevo**: son los montos que viajan congelados dentro
de cada turno, los mismos que el encargado ya escribe y ya ve en la página
del día. Los sueldos de la **ficha** siguen sin bajar a su navegador.

**La trampa que hubo que resolver, y que vale como regla:** `pagoDe()`
devuelve **cero mientras nadie marque si la persona vino**, así que un
sábado recién planificado habría mostrado **$0** justo cuando uno decide
cuánta gente poner — y un cero no se lee como "falta marcar", se lee como
"no cuesta nada".

Por eso existe `costoPlanificado()`, que **cuenta a todos salvo los que ya
dijeron que no vinieron**:

- **Antes de pasar lista** es el costo del plan, que es la pregunta.
- **Después**, los que no llegaron se caen solos y **converge exactamente a
  `costoDelDia()`**. Hay una prueba que lo fija.

Un solo número que no hay que aprender a interpretar según el día que sea.
Un contratado sigue sin sumar jornada, y sus horas extra sí: son del día.

### La palabra bajo el punto: público, privado, cerrado, preparación (2026-10-23)

**En los tres calendarios, el estado de un día se lee bajo su punto de
color**, en letra chica: *público*, *privado*, *exclusivo*, *cerrado*,
*preparación* o *sin cupo*. Antes era una línea más, debajo del contenido —"PRIVADO · no
está en el sitio"—, y ahí está el problema que lo cambió: **una línea de más
cambia el alto de la tarjeta**, así que los días de una misma semana dejaban
de medir lo mismo según su estado. Bajo el punto, en cambio, el aire ya
estaba: la palabra no mueve nada.

Lo pidió el cliente **como regla general** —"en el calendario, en donde sea:
calendario, turnos, o actividades extras"—, y por eso vive en un solo
componente, `PuntoDia`, que dibuja el punto y su palabra. Un día se lee
igual en cualquier pantalla, y agregar un estado es tocar un archivo.

Dos cosas que no cambiaron, y conviene que se note:

- **Un día de preparación sigue sin aparecer en el calendario de la
  portada.** Esa pantalla es la comercial; la palabra solo se lee donde el
  día ya aparecía.
- **El aviso de un día cerrado CON gente ya reservada sigue siendo una
  línea.** No es un estado, es algo que hay que hacer —avisarle a esa
  gente—, así que no se puede esconder en una palabra de nueve píxeles.

### Baja a alguien desmarcando "activo", no quitándolo

Quitarlo de la lista no borra sus turnos pasados —esos son el registro de
quién trabajó qué día— pero los deja con un nombre que ya no está, y
`sinFicha()` lo reclama en amarillo. Es el mismo mecanismo que `desconocidos()`
usa para los menús, y por el mismo motivo: sin alias ni equivalencias, lo
único que mantiene alineadas dos listas es que alguien se entere cuando dejan
de estarlo.

**Desde el 2026-10-22 eso lo decide el panel, no un consejo al pie.** Lo
notó el cliente y tenía razón: la tabla ofrecía **Quitar** en cada fila, con
el mismo peso visual que todo lo demás, y la advertencia de no usarlo vivía
en letra chica debajo de la tabla. Un botón que no hay que apretar casi nunca
no puede estar igual de a mano que el que sí, y menos confiando en que
alguien lea el párrafo de abajo un sábado a las once de la noche.

Ahora el botón de la derecha depende de si esa persona tiene turnos
guardados (desde el 2026-10-30 vive en la línea, abierta o cerrada — ver
"La línea del trabajador"):

| | Qué ofrece |
|---|---|
| Sin ningún turno | **Quitar** — la fila escrita por error, que no tiene historia que proteger |
| Con turnos, activa | **Desactivar** — la saca del planificador y le cierra su link, conservando sus turnos |
| Con turnos, inactiva | **Activar** — vuelve al planificador y su link abre de nuevo |

El costo a asumir: **ya no se puede borrar de un clic la ficha de alguien que
sí trabajó.** Es justamente lo que no queremos que se pueda hacer sin
pensarlo; si de verdad hay que sacarla, se edita la planilla a mano, que es
un acto deliberado.

De paso, el otro botón de esa misma fila pasó a decir **"Quitar link"**: dos
"Quitar" con significados distintos a dos columnas de distancia eran una
confusión esperando a pasar.

### Una tarjeta por persona, no una tabla (2026-10-23)

Lo reclamó el cliente con una captura y tenía razón: con los datos
repartidos en tres líneas —quién es, cuánto gana, dónde se le paga—, las
líneas de uno y las del siguiente se tocaban y no se veía dónde terminaba
cada ficha.

**Fue tabla mientras cada trabajador era una fila**, y dejó de serlo cuando
dejó de serlo. Además esto no es una tabla de datos para comparar entre
filas: es **un formulario por ficha**, y una tarjeta con su borde es lo que
corresponde. Cada campo lleva su rótulo encima, pegado al campo, porque con
tarjetas una fila de encabezados allá arriba obligaría a contar columnas
para saber qué es cada caja.

Dentro de cada tarjeta, tres bloques separados por una línea: **quién es**
(con sus acciones de link a la derecha), **Pago** y **Transferencia**. Una
ficha desactivada se ve apagada, sin tener que leer la casilla.

**Lo mismo en `/extras`** para los colaboradores, por lo mismo y para que
las dos pantallas se parezcan: quien aprende una sabe usar la otra.

**Y el guardado va dentro de la ficha** (2026-10-23). Lo pidió el cliente:
se corrige el teléfono de alguien arriba y el botón quedaba al final de la
página, con todas las demás fichas en medio. Un guardado al que hay que irlo
a buscar es un guardado que se olvida — y se olvida con algo escrito a
medias. Apenas hay un cambio, cada tarjeta muestra **Guardar cambios** en su
esquina, y de paso ese botón reemplazó al aviso en gris que decía *"Guarda
para administrar el link"*: dice lo mismo y además lo hace.

Aparece **en todas las fichas, no solo en la que se editó**, porque guardar
manda las dos listas completas en una sola petición: no es el guardado de
esa persona, es el de la pantalla, y tenerlo a mano donde sea que estés
editando es justamente el punto. Los botones de abajo y de arriba siguen
donde estaban.

### La ficha se abre con un `+`, y los puestos viven en una ventana (2026-10-29)

Lo pidió el cliente mirando `/equipo`: *"que los trabajadores no se vean al
tiro todos los datos, sino que yo los pueda abrir con un más"*, y *"los
puestos, ponlos separados… para que la página no sea una lista gigante
larga"*.

Tenía razón, y la causa es acumulativa: cada ficha había ido creciendo
—quién es, cuánto gana, dónde se le transfiere— y debajo venía la tabla de
puestos. Con diez personas, `/equipo` eran varias pantallas y **había que
recorrerla entera para llegar a cualquier cosa**.

- **Cerrada, una ficha es una línea**: nombre, puesto, teléfono, y en ámbar
  un **falta su cuenta** si no se le puede transferir todavía. Ese aviso va
  justamente con la ficha cerrada, que es donde se mira la lista antes de
  pagar; adentro ya lo dice `DatosBancarios`.
- **Se abre una a la vez.** Se edita una ficha, no se comparan dos, y dejar
  varias abiertas devolvería la página larga de la que estábamos saliendo.
- **La que se acaba de agregar se abre sola**: agregar a alguien y que
  aparezca una línea vacía que además hay que apretar sería pedir dos pasos
  para uno.
- **El resumen es un `<button>` y no un `<summary>`.** En el sitio público
  la regla es `<details>` sin JavaScript, pero acá ya estamos en React y la
  ficha nueva tiene que poder abrirse sola; con `<details>` eso se controla
  igual desde el estado, así que el elemento no aportaba nada que no
  costara explicar.
- **Los puestos se abren con un botón** —*Administrar puestos*— y viven en
  una ventana. Al lado queda su resumen (cuántos son y los primeros
  nombres), que es lo único que se mira de pasada.

**Y ahí se pueden ordenar, con flechas** (lo pidió el cliente en la misma
pasada). No es cosmético: **el orden de esa lista es el orden en que el
planificador dibuja los puestos**, así que acomodarlos al orden en que se
arma un turno ahorra buscar en cada tarjeta. Antes el único modo era
reescribir los nombres de arriba abajo o editar la planilla a mano.

**Son flechas y no arrastrar**, también a propósito: arrastrar necesita o la
API de *drag and drop* del navegador —que en un teléfono no funciona— o una
librería, y este proyecto no agrega una dependencia por una comodidad. Una
flecha se aprieta con el dedo y además se puede usar con el teclado.

### Dos frases, un link, y el link personal con el peso que tiene (2026-11-01)

Lo pidió el cliente mirando `/equipo`: *"los textos de ayuda al inicio son
muy largos… en vez de empaquetar todo en frases, solo decir equipo, aquí
puedes agregar, editar, trabajadores, punto"*, y *"volviendo al crear el
link personal, este tiene que ser bien a la vista, bien PlayStation… tal
como desactivar, con la misma importancia"*.

Las dos cosas son la misma causa: **lo que explica ocupaba el lugar de lo
que se hace.**

Arriba había tres párrafos —qué se hace acá, qué es el link personal, y a
qué pantalla ir para los días cerrados— o sea media pantalla de teléfono
antes de ver a la primera persona. Y el link personal, que es lo que de
verdad se viene a hacer al abrir una ficha, eran **tres textos en gris** al
costado de los campos, del tamaño de un rótulo y sin nada que dijera que se
aprietan: exactamente lo que la regla del panel prohíbe.

- **Arriba quedan dos frases y un botón**: *"Acá puedes agregar y editar
  trabajadores"*, *"Dentro de cada trabajador puedes copiar su link
  personal"*, y **Ver el mes completo** como botón, sin el párrafo que
  explicaba los días de preparación — eso vive en la ayuda de `/turnos`.
- **El link personal es un bloque propio dentro de la ficha**, como Pago y
  Transferencia, con su **botón relleno**: *Crear link personal* la primera
  vez, *Copiar link personal* después, y al lado *Renovar* y *Quitar link*.
- **Al lado del rótulo hay un `?`** que dice **qué ve la persona al
  abrirlo** — que es la pregunta que uno se hace justo antes de mandarlo por
  WhatsApp. Ahí se fue el párrafo que estaba arriba de la lista. Es la única
  ayuda del panel que no es de una pantalla sino de un botón.
- **Con cambios sin guardar el bloque lo dice**, en vez de desaparecer: esos
  botones reescriben la pestaña entera desde la planilla, así que con
  ediciones en pantalla se perderían.

Vale notar que el relleno dorado sigue siendo **uno por vista**: solo hay
una ficha abierta a la vez, y mientras hay cambios sin guardar el botón del
link no está — el relleno es el de *Guardar cambios*.

### La línea del trabajador: se aprieta y se abre; al lado, desactivar (2026-10-30)

Lo pidió el cliente mirando `/equipo`: *"en vez de ofrecer al costado
derecho nuevamente la opción abrir, debería dar la opción activar y
desactivar… si aprietas la línea completa menos en el botón desactivar, abre
todas las opciones"*.

Tenía razón en lo redundante: la línea entera ya era el botón que abría la
ficha, y a la derecha decía *abrir* — una segunda forma de hacer lo mismo
ocupando el único lugar donde cabe una acción de verdad.

- **La línea abre; el botón de la derecha da de baja**, abierta o cerrada.
  Qué ofrece depende de la historia de esa persona: **Quitar** si no tiene
  ningún turno guardado, **Desactivar** si tiene, **Activar** si está dada de
  baja. Los tres **preguntan antes**, porque los tres cambian algo que la
  pantalla no deshace sola.
- **Esas tres acciones se aplican en el acto**, sin pasar por *Guardar*. No
  es solo coherencia con la regla de "lo que declara algo se aprieta": al
  desactivar, la línea **desaparece de la lista** —los inactivos van
  escondidos— y con ella el botón que la habría guardado.
- Van por `PATCH` y `DELETE` de `/api/equipo/trabajador`, que tocan **una
  fila**: quien aprieta ahí no tiene por qué mandar, ni pisar, lo que alguien
  escribió en otra ficha. El `PATCH` pasó a ser **parcial de verdad** —lo que
  no viene en el cuerpo se conserva—, porque antes escribía siempre el
  teléfono y el puesto, y una llamada que solo quisiera desactivar se los
  habría borrado.
- **La regla de "no se quita a quien ya trabajó" se comprueba en el
  servidor**, no solo en la pantalla: el `DELETE` cuenta sus turnos y
  responde 409 con el motivo. Una llamada directa a la API tiene que obedecer
  la misma regla que un clic.
- **Una casilla arriba, "Ver desactivados (N)"**, escondidos por defecto. Dar
  de baja no borra la ficha, así que esta lista solo crece y el equipo de hoy
  termina mezclado con el de hace dos años. El número está para que nadie los
  dé por perdidos.
- **La casilla "Activo" de adentro se sacó**: con el botón en la línea eran
  dos controles para lo mismo, a dos centímetros y con distinto peso.
- **El filtro se aplica dentro del `map`, no antes**, y eso importa: `i` es
  la posición real en la lista que se guarda, y todo lo que edita una ficha
  la usa. Con un `filter` previo, esconder a un inactivo le cambiaría el
  índice a los de abajo y editar a alguien escribiría sobre otro.

**Y el guardado de la ficha dice qué cambió.** El cliente lo pidió con el
caso exacto: *"si se cambia algo en estos campos y es el número de teléfono
sin querer, por lo menos tener el control sobre: hey, cambiaste algo"*. Un
botón que solo dice "Guardar" no distingue entre corregir un puesto a
propósito y haber tecleado encima de un teléfono sin darse cuenta. Ahora la
tarjeta dice **"Cambiaste teléfono, puesto."** al lado del botón, comparando
contra la lista tal como vino de la planilla — no contra el dibujado
anterior: lo que importa es qué quedará distinto de lo guardado.

### Una pestaña que se reescribe entera tiene que borrar lo que sobra (2026-10-30)

**Quitar a alguien de una lista dejaba al último duplicado en la planilla**, y
nadie lo había visto porque en pantalla se veía perfecto.

`values.update` de la API de Sheets escribe las filas que uno le pasa y
**deja intactas las de más abajo**. `escribirBloque()` escribía cuatro filas
sobre cinco y la quinta se quedaba donde estaba. El propio comentario de esa
función ya advertía *"no sirve para una lista que se acorta"* — y la usaban
`Trabajadores`, `Puestos`, `Menús`, `Colaboradores` y `Config`, que son
justamente listas que se acortan.

Ahora escribe y **después limpia** desde la fila siguiente hasta el final.
**En ese orden, a propósito**: al revés, un fallo entre las dos llamadas
dejaría la pestaña vacía; así, lo peor que puede pasar es quedarse con la
fila de más —que es exactamente lo que pasaba antes— y se corrige al
siguiente guardado.

### El límite de lecturas de Google (2026-11-12)

Lo vio el cliente rellenando una alternativa: *"Quota exceeded for quota
metric 'Read requests'…"*, y siguió pasando en varias pantallas. **La API de
Sheets deja 60 lecturas por minuto para la cuenta del panel, que es una sola
para todos los usuarios.** Medido antes del arreglo, cada pestaña se leía
con su propia consulta:

| | Antes | Ahora |
|---|---|---|
| Abrir el calendario de la portada | 20 | 5 (una por ruta) |
| La página de un día | 18 | 4 |
| Abrir Cotizaciones | 12 | 2 |
| Un autoguardado de una cotización | 4 a 7 | 2 a 3 |
| Recepción abierta | 6 por minuto | 1 por minuto |

Lo que se hizo, en `lib/sheets.ts`:

- **Las lecturas se juntan en un `batchGet`**, que cuesta una lectura sin
  importar cuántas pestañas pida. La primera lectura abre una tanda que
  espera 8 ms; las que llegan mientras tanto —un `Promise.all`, u otra
  petición que entró al mismo tiempo en esa instancia— van en la misma.
- **Dentro de una petición, lo leído se recuerda** (`conLecturas()`, con
  `AsyncLocalStorage`). Envuelve a todas las rutas que leen la planilla, y
  las más usadas **precargan** sus pestañas juntas al entrar. Lo que la
  propia petición escribe se olvida en el acto.
- **Entre peticiones no se recuerda nada.** Se probó guardar lo leído tres
  segundos y se sacó el mismo día: en Vercel cada ruta corre aparte, así que
  *Marcar ganada* escribía por `/convertir` y la lista que se recargaba salía
  de `/api/presupuestos` con la cotización todavía sin ganar.
- **Lo que busca en qué fila escribir lee fresco** (`leerHoja(hoja, true)`,
  y `asegurarEncabezado()` siempre): un número de fila de hace un segundo es
  otra fila si alguien borró una entremedio. Las líneas de una cotización se
  borran y se escriben en cada guardado, así que esto no es teórico.
- **La bitácora ya no se lee para escribir en ella**: cada acción traía la
  pestaña entera —la más larga— para mirar su primera fila. Ahora se mira
  solo el encabezado, una vez por instancia (`leerEncabezado()`).
- **Las líneas que no cambiaron no se reescriben** (`guardarLineas()`): el
  autoguardado las manda siempre, y borrarlas y escribirlas iguales gastaba
  dos escrituras, que tienen su propio límite de 60.
- **Ante un 429, el servidor espera y reintenta solo** (1,5 s y 4 s, en
  lecturas y escrituras: un 429 no aplicó nada, así que repetir es seguro).
  Recién si eso falla sale el mensaje en español (`MENSAJE_LIMITE`), y el
  autoguardado de una cotización se reintenta a los 30 segundos.
- **La portada ya no pide `/api/recepcion`** para contar los avisos de la
  entrada: salen de las reservas que ya cargó.
- **El id de cada pestaña se recuerda** (`idDeHoja()`), y los títulos se
  piden una vez por instancia, compartidos si llegan varias lecturas juntas.

**Cómo se midió**, para repetirlo (desde el 2026-11-12 es `npm run lecturas`, ver "Las pruebas que cuidan las reglas"): un Google falso en memoria que cuenta las
consultas, cargado con un hook de `node --import` que cambia `googleapis`
por él, y cada ruta llamada directo (`NODE_ENV=development` entra como
administrador). Si vuelve a aparecer con uso normal, lo siguiente es pedir
más cupo para el proyecto `brasas-panel` en Google Cloud (Sheets API →
Cuotas), que es gratis.

### La pantalla se mantiene al día sola (2026-11-12)

Lo pidió el cliente: la encargada abre el calendario a las 10, entra una
compra por Shopify y su pantalla sigue con el número viejo hasta que alguien
recarga. Va en el **calendario de la portada** y en la **página del día**
(`components/AlDia.tsx`, lógica pura en `lib/cambios.ts`, con pruebas).

- **Una revisión liviana cada dos minutos, solo con la pantalla a la
  vista**: `/api/cambios` lee `Reservas` y `Fechas Hábiles` en una sola
  tanda —**una lectura**— y devuelve una **firma** (`firmaDe()`, sin el
  número de fila). `/api/ocupacion` y `/api/reservas` traen la misma firma
  de lo que ya leyeron, sin costo extra. Si no calza, se recarga todo; si
  calza, no se gasta nada más. Un teléfono en el bolsillo o una pestaña de
  fondo no revisan. Al volver a la pestaña se revisa al tiro (si pasaron
  30 s). Diez pantallas abiertas todo el día gastan unas 5 de las 60
  lecturas por minuto.
- **No recarga con una ventana abierta** (`[role="dialog"]`): la línea dice
  *Hay cambios: se actualiza al cerrar la ventana* y recarga apenas se
  cierra. Así nada se mueve bajo los dedos de quien anota una reserva.
- **Los días que cambiaron de gente se marcan un minuto** en dorado, con
  *+12 personas desde las 10:04* (`diferencias()`, `MarcaCambio`). Va en
  posición absoluta: no cambia el alto de la tarjeta.
  **Solo marca lo que viene de afuera**: la revisión automática o
  ↻ Actualizar. La recarga que sigue a guardar algo en la misma pantalla
  —anotar una reserva, editar un día— no marca nada (`cargar(marcar)`),
  porque quien lo anotó ya lo sabe.
- **Si Google pide calma (429), la próxima revisión espera el doble**, hasta
  diez minutos (`siguienteIntervalo()`).
- **↻ Actualizar** al lado de *Al día · actualizado a las 10:32*, para
  cuando se quiera estar seguro.
- **Lo que no detecta**: cambios en el equipo, los turnos o las
  cotizaciones. Ahí queda el botón; si hace falta, se suma su pestaña a la
  firma.

**De paso, en Cotizaciones** (lo reclamó el cliente el mismo día): al marcar
una ganada y cerrar la ventana, la tarjeta del día ya decía *2 ganadas* pero
el cupo seguía viejo hasta recargar. La lista se recargaba y la ocupación
—que es otra ruta— no. Ahora **se vuelve a pedir al cerrar una ventana que
cambió algo**; abrir y cerrar solo para mirar no gasta una lectura.

### La planilla se comía los datos que parecen fórmula (2026-11-01)

Lo pilló el cliente con una compra de prueba: la columna de contacto de la
reserva decía **`#ERROR! (Formula parse error.)`** en vez del teléfono.

**Es nuestro, y es de los que no avisan.** Las cuatro escrituras usan
`valueInputOption: 'USER_ENTERED'`, que hace que la API interprete cada
celda **igual que si alguien la tecleara**: un `=`, un `+`, un `-` o un `@`
adelante abren una fórmula. Y este proyecto escribe dos datos que empiezan
justo así:

| Dónde | Qué se escribe | Qué guardaba |
|---|---|---|
| `Teléfono` de `Reservas`, `Trabajadores`, `Colaboradores` | `+56 9 1234 5678` | `#ERROR!` |
| `Ajuste` de `Turnos` y `Actividades`, con dos o más | `-5000\|12000` | `#ERROR!` |

El segundo es el peor: **son los ajustes del pago**, o sea plata que alguien
tiene que cobrar, y se perdía sin que nada lo dijera. Un ajuste solo
(`-5000`) nunca falló, así que el caso corriente tapaba al otro.

Lo arregla `valorSeguro()`, en **`panel/src/lib/celdas.ts`**: antepone un
`'` a lo que empiece como fórmula. Ese apóstrofo es la forma que tiene
Sheets de decir "esto es texto" — **no se guarda ni se lee**, así que lo que
vuelve por la API es el valor tal cual.

- **Solo se escapa lo que no es un número**, y eso importa: `-5000` solo
  tiene que seguir siendo el número -5000, porque esta planilla la abre una
  persona y suma columnas con sus propias fórmulas.
- **Vive aparte de `sheets.ts`**, por el mismo motivo que `filas.ts`: ahí no
  se importa `googleapis`, así que se prueba sin red y sin credenciales.
- **Ojo, y esto es lo que hay que recordar: la planilla falsa del entorno de
  desarrollo NO puede reproducir este error.** Es un archivo JSON que guarda
  las cadenas tal cual, así que `-5000|12000` "funciona" ahí y revienta en la
  planilla de verdad. Todo lo que se pruebe solo contra el arnés tiene este
  punto ciego; lo que fija el arreglo es una prueba sobre `valorSeguro()`.

**Las filas ya escritas siguen con su `#ERROR!`.** Para las reservas se
arreglan solas al correr la reconciliación de Shopify —`camposDeShopify()`
reescribe el teléfono— dentro de la ventana de diez días. Las de más atrás,
y los ajustes de un turno, hay que escribirlos de nuevo a mano.

### Un `ID Orden` repetido es el mismo pedido dos veces (2026-11-01)

En el mismo pantallazo venían **dos filas idénticas** del mismo pedido. Son
dos cosas distintas y conviene no confundirlas:

- **Si los dos `ID Orden` son distintos**, son dos pedidos de verdad y el
  panel hace bien en mostrar dos. Eso es de la tienda, no del panel.
- **Si son el mismo**, es nuestro. `guardarPedido()` es idempotente
  *buscando primero por esa columna*, pero eso es leer-y-después-escribir
  **sin bloqueo**: Shopify manda `orders/create` y `orders/paid` casi juntos,
  además reintenta, y la reconciliación diaria es un tercer escritor. Dos que
  lean la planilla antes de que el otro escriba agregan los dos.

**El caso quedó confirmado el 2026-11-01** —las dos filas del pedido
`7345141809369`, idénticas— así que el panel dejó de solo avisar: **ahora las
cuenta una sola vez al leer** y además las nombra.

**No es el ambiente de desarrollo ni el re-login del cliente en Shopify.** Los
webhooks van de servidor a servidor, de Shopify a Vercel, y no pasan por el
navegador de nadie: la sesión de la tienda no los toca. Si acaso, **en
producción es más probable**, porque hay más pedidos y más entregas de
`orders/create` y `orders/paid` casi juntas.

**La ventana no se puede cerrar sin un candado que la API de Sheets no da.**
Lo que sí se puede es dejar de contar dos veces lo mismo, y eso es correcto
por definición: **el mismo `ID Orden` es el mismo pedido**. Vive en
`leerReservasDe()`, que es puro y está en `filas.ts` —sin `googleapis`— para
poder probarlo sin red.

- **Se queda la primera fila**, que es por la que se edita la reserva, y
  lleva `duplicadas` con cuántas hay. Las anotadas a mano no entran: su id es
  `MANUAL-<timestamp>`, único por construcción, y dos iguales solo podrían
  venir de que alguien copió la fila queriendo.
- **Se nombra, no se esconde**, que es la regla de este proyecto para los
  fallos callados: **`/api/diagnostico` lista `idsRepetidos`** —con cuántas
  filas tiene cada uno— y `celdasConError`, las filas donde quedó un
  `#ERROR!`; y **la página del día marca la fila** con un *⚠ 2 filas con este
  pedido*, porque quien mira el día es quien lo va a notar.
- **Borrar la fila de más sigue siendo a mano**, y eso es a propósito: el
  panel no sabe si alguien la duplicó queriendo y la editó. Lo que ya no pasa
  es que el día cuente esa gente dos veces mientras nadie lo note.

### Un mes pasado salía entero como "preparación" (2026-11-01)

Lo pilló el cliente mirando octubre en `/turnos`: *"si ahora yo reviso el
mes octubre, solo veo fechas en preparación… me debería en el pasado igual
mostrar exactamente qué fecha fue pública, privada o preparación"*. Tenía
razón, y la causa encadena dos cosas que por separado se ven bien.

**`/api/ocupacion` devolvía siempre `hoy()` en adelante**, que es lo que
necesita el calendario de la portada. Y `/turnos` y `/extras` la pedían
**una sola vez y sin parámetros**, aunque dibujan **cualquier mes**: para un
mes de atrás no venía ni un día.

Y acá entra la segunda mitad: **la regla de preparación es "tiene equipo y
no recibe público"**. Sin ocupación, ningún día recibe público — así que
cada día con equipo pasaba el filtro y el mes entero se leía *preparación*.
De paso la tarjeta decía **0 personas** en días que sí tuvieron gente,
porque el conteo sale de esa misma ocupación.

**No era un bug de `esPreparacion()`**, que hace exactamente lo que dice;
era que se le estaba contestando "no recibe público" a una pregunta que en
realidad nadie había ido a buscar. Un dato que falta y uno que es `false` se
ven igual en un `if`, y esa es la lección que vale guardar.

El arreglo es pedir la ocupación **del mes que se está mirando**:
`/api/ocupacion` acepta ahora `desde` y `hasta`, y los dos calendarios la
vuelven a pedir al cambiar de mes. Sin esos parámetros —o con basura— se
comporta igual que antes, así que la portada no cambió.

Comprobado con un octubre sembrado: los sábados y domingos vuelven a decir
*público* con su gente real, un día marcado privado dice *privado*, y en
*preparación* quedan solo los dos que corresponden — un martes con equipo y
un sábado cerrado con equipo. La portada sigue partiendo en el día de hoy.

**Ojo con el mismo error en el otro extremo**: la ventana de siempre llega
hasta `dias_a_futuro` (hoy, 90 días), así que un mes más adelante que eso
tenía exactamente el mismo problema. Con el rango por mes, deja de
depender de esa ventana.

### Los calendarios de celdas necesitan `relative` (2026-10-30)

En `/turnos` y `/extras`, a 393px, **la página entera se corría de lado** —
títulos y botones incluidos—, que es justo lo que el desplazamiento interno
del mes viene a evitar. La caja sí recortaba el mes, pero el documento
quedaba 95px más ancho que la pantalla igual.

Lo arregla `position: relative` en la caja que hace `overflow-x-auto`.
Comprobado a 393px en las cinco pantallas del panel: ninguna se corre.

### La tabla de Equipo: los anchos van declarados (2026-10-22)

Lo reclamó el cliente con una captura: el nombre se leía a seis letras
—"Darinl"— mientras un teléfono de nueve dígitos sobraba media caja. La causa
es simple y vale tenerla escrita: **el nombre era la única columna sin ancho**,
así que en una tabla de diez columnas era la que cedía todo el espacio.

Se arregló declarando el ancho de cada columna, con `table-fixed`. **Esa
tabla ya no existe** —al día siguiente pasó a ser una tarjeta por persona,
ver arriba— pero la lección se mantiene y vale para cualquier otra: los
anchos salen de lo que cada campo muestra de verdad —un nombre y apellido,
un teléfono, "Contratado", "no aplica"— y no de repartir parejo. Un campo
sin ancho declarado es el que termina cediéndoselo todo a los demás.

**La cuenta bancaria, que llegó después, NO es una columna más** (2026-10-22):
va en **una segunda línea bajo cada persona**, de ancho completo. Con diez
columnas, la once dejaba *Crear link* y *Desactivar* fuera del borde, que es
exactamente lo que esta tabla acababa de arreglar. Y un número de cuenta con
banco, tipo y RUT necesita ancho de verdad: en una celda angosta se leería de
a seis caracteres, el mismo problema del nombre pero en el campo donde un
error se paga caro.

**De paso, el marco del panel pasó de `max-w-6xl` a `max-w-7xl`.** Esta tabla
es lo más denso que tiene y con 1152px terminaba cortando la última columna,
que es justamente donde están *Crear link* y *Desactivar*. El costo a asumir:
en el calendario, una semana de dos días deja más aire a la derecha, porque la
grilla sigue siendo de cuatro columnas. Los textos no se estiran: siguen
acotados a `max-w-2xl`.

### Una sola ventana para el día, y el cierre (2026-10-23)

**"Pasar lista" se jubiló como paso aparte.** Hasta el 2026-10-22 había tres
pantallas para un mismo día: se planificaba en el calendario, se marcaba
quién llegó en el planificador, y los montos y la propina vivían en otra
ventana —*Pasar lista*— que solo se abría desde la página del día. A un día
de preparación no se llega por ahí, así que el circuito quedaba cortado
justo antes de lo que importa: un turno sin montos no suma nada ni entra en
el informe.

El cliente lo pidió al revés, y así quedó:

| Dónde | Qué se hace |
|---|---|
| **Calendario de la portada** | Se **planifica**, con las reservas a la vista: cuánta gente viene, cuántos menús, entonces cuánto equipo |
| **`/turnos`** | Se **confirma todo**: quién vino, los montos, los ajustes, la propina — cualquier día, abierto, privado o de preparación — y **es el único lugar donde se cierra** |
| **La página del día** | Se mira ese día completo —reservas, equipo, extras— y se escriben los montos y la propina; para cerrarlo manda a `/turnos` |

Son la **misma ventana**; lo único que cambia es desde dónde se abre y si
trae el botón de cerrar.

**El botón de cerrar quedó en un solo lugar** (2026-10-30, conversado con el
cliente: *"en calendario se hace otra cosa, el fin no es cerrar la fecha
aquí"*). Estaba en las tres pantallas, y tres caminos al mismo paso final no
son una comodidad: son una duda —*¿lo cierro acá o allá? ¿es lo mismo?*—
para quien no maneja sistemas así. Se eligió `/turnos` porque es la pantalla
que **ya pide** el cierre: al entrar lista arriba los días pasados a los que
les falta algo, así que entrar es que te digan qué hacer.

**Se descartó mostrarlo según el rol**, que era la otra salida sobre la
mesa: el rol contesta *quién puede*, no *dónde se hace*, y acá cierran los
dos roles que entran al panel. Esconderlo por rol habría dejado la misma
pregunta en pie para quien sí lo ve.

El costo a asumir: desde la página del día hay que dar un salto a `/turnos`.
Las dos pantallas lo dicen con un enlace, en vez de dejar al botón ausente
pareciendo un error.

**Lo que la ventana hace ahora**, de arriba abajo: asignar por puesto, crear
a alguien que falte, marcar **— / Vino / No vino**, escribir la jornada, las
horas extra y los **ajustes con su motivo**, poner la **propina del día** —
que el panel reparte— y **cerrar el día**.

**Abajo, las tres acciones van en una sola línea** (2026-10-23). Antes
compartían fila con el resumen y la fila envolvía, así que *Guardar* quedaba
en un renglón y *Guardar y cerrar el día* en el siguiente: se leían como dos
cosas de distinta categoría, cuando justamente lo que hay que entender de un
vistazo es la diferencia entre **anotar un cambio** y **declarar cerrado el
día**. Ahora el resumen va arriba en su propia línea y los botones abajo sin
envolver —delineado el que solo guarda, relleno el que cierra—, y en un
teléfono el tercero se recorta a "Guardar y cerrar", que dice lo mismo en
menos espacio.

### La ventana del día en `/turnos` tiene dos caras: trabajadores y reservas (2026-11-03)

Lo pidió el cliente: *"un lado de las tarjetas son trabajadores y el otro
switch es de resumen reservas"*, con la posibilidad de volver. Son las dos
listas que la jefa de turno marca el mismo día —quién vino a trabajar y
quién vino a comer— y antes una vivía en esta ventana y la otra en la página
del día.

- **Dos botones a la vista, `Trabajadores` y `Reservas`**, no uno que diga
  "Ver reservas": así se lee en qué cara se está y a cuál se vuelve. El
  elegido va con tinte y borde dorado, no relleno — el relleno de la ventana
  es *Cerrar el día*. Cada uno lleva su cuenta (personas del equipo,
  reservas del día).
- **La cara que entra gira desde el canto** (`.girar` en `globals.css`), y
  no se usa el volteo de dos caras en la misma celda de la tarjeta del
  calendario: allá las caras miden lo mismo, acá una es una lista larga de
  puestos y la otra de reservas, y forzarlas al mismo alto dejaría un hueco
  enorme en la corta. Respeta `prefers-reduced-motion`.
- **Girar no pierde nada.** Lo escrito en la cara de trabajadores vive en el
  estado de `EquipoDialogo`, no en lo que se dibuja, y el autoguardado sigue
  corriendo. El pie —*Listo* y *Cerrar el día*— es de la ventana y se ve en
  las dos caras.
- **La cara de reservas (`ReservasDelDia.tsx`) es un resumen para marcar,
  no la página del día**: quién vino / no llegó / sin marcar, qué preparar,
  cómo viene el pago y una tarjeta por reserva con *Vino / No vino*, que
  guarda al instante igual que en la página del día. **Editar, borrar o
  anotar una reserva sigue allá**, con un enlace: repetir el formulario acá
  serían dos lugares donde se edita lo mismo.
- Una reserva que liberó su lugar se ve apagada y **sin los botones**: no
  viene, no hay nada que marcar.
- **Solo en `/turnos`** (`conReservas`). La página del día ya muestra las
  reservas debajo, y el calendario de la portada en el frente de su tarjeta.
- Pide las reservas cada vez que se gira a esa cara: un viaje más, y a
  cambio lo que se ve está al día aunque otra persona esté marcando en el
  mesón.

### Lo que es un valor se guarda solo; lo que declara algo se aprieta (2026-10-30)

Lo pidió el cliente con la distinción ya hecha: *"una cosa es guardar un
cambio que hiciste en un detalle, se paga ahora 30 en vez de 28. Y otra cosa
es cerrar la fecha"*. Y tenía razón en que el panel las trataba igual: abajo
de la ventana del día había dos botones hermanos —**Guardar** y **Guardar y
cerrar el día**—, del mismo tamaño y a dos centímetros, y uno de los dos no
se deshace solo.

Entonces se revisó pantalla por pantalla y salió una regla, que es lo que
hay que recordar:

- **Se guarda solo lo que es un valor sobre algo que ya existe.** La ventana
  del día y la de las actividades extras editan montos, asistencias, ajustes
  y propina de gente que ya está en la lista. Ahí el botón no decidía nada:
  solo se podía olvidar. Ya no existe — lo que se escribe se guarda, y una
  línea abajo a la izquierda lo dice (*Guardando… / ✓ Guardado*, y en rojo
  con **Reintentar** si el servidor se quejó).
- **Se aprieta Guardar cuando lo que se edita es la lista misma**: `/equipo`,
  las fichas de `/extras`, `/menus`, `/configuración`, `/usuarios`. Ahí el
  nombre **es** la identidad de la fila y la pantalla reescribe la pestaña
  entera, así que guardar a mitad de palabra —mientras alguien borra un
  nombre para reescribirlo— mandaría una fila sin nombre, el servidor la
  descartaría (hace bien) y la ficha desaparecería bajo los dedos. Esas
  pantallas ya tienen su botón **dentro de cada ficha**, que era el problema
  de verdad.
- **Cerrar el día nunca se guarda solo.** Es una declaración con nombre y
  hora: se aprieta, y **pregunta antes** — *"¿Cerrar el martes 20 de octubre?
  Queda anotado que lo cerraste tú, con la hora. Después, solo el
  administrador o quien hace los pagos podrá corregirlo, con un motivo."*
  Desde el 2026-11-03 ya no hay *Reabrir*: ver "Un día cerrado no se edita:
  se corrige".

Detalles que vale la pena tener escritos, todos en `usarAutoguardado.ts`:

- **Espera a que dejen de escribir** (600ms). Sin eso, un monto de cinco
  dígitos serían cinco guardados y el cuarto llegaría con un número a medio
  escribir.
- **Nunca hay dos peticiones a la vez**: lo que llegue mientras una está en
  vuelo queda anotado y se manda apenas vuelva. Se guarda el día entero, así
  que el último gana y eso es justo lo correcto.
- **Al cerrar la ventana se manda lo que quede en el reloj**, y además hay un
  seguro al desmontar para el escape rápido. Comprobado: escribir la propina
  y apretar Escape en el mismo segundo deja el monto guardado.
- **Cerrar el día fuerza el guardado primero**, en ese orden: al revés, el
  servidor miraría si falta alguien por marcar sobre los datos de antes del
  último cambio y rechazaría cerrar un día que se acaba de completar.
- **Editar un día cerrado ya no lo reabre.** Antes *Guardar* en un día
  cerrado mandaba `cerrar: false`, o sea que corregir un ajuste olvidado lo
  reabría sin que nadie lo pidiera. **Y desde el 2026-11-03 un día cerrado
  no guarda nada solo**: el autoguardado se apaga (`activo` en
  `usarAutoguardado`), y lo que se cambie va en una corrección con motivo.

### Un día cerrado no se edita: se corrige (2026-11-03)

Lo conversó el cliente mirando el botón *Reabrir el día*: *"una vez que
cerramos un día, queremos que el día en cierto modo no se cambie más… pero
a veces habrá que hacer un cambio"*. Y al revisarlo salió que **cerrar no
protegía nada**: era una marca con nombre y hora, el día se seguía editando
igual —montos, propina, *Vino / No vino*— y *Reabrir* borraba una marca que
no bloqueaba nada.

Ahora **cerrado quiere decir bloqueado**, y la única forma de cambiarlo es
una **corrección**:

| | Qué pasa |
|---|---|
| Día abierto | Como siempre: se escribe y se guarda solo |
| Día cerrado, encargado | **Solo lectura.** La ventana dice quién lo cerró y que, si hay que cambiar algo, se lo pida al administrador o a quien paga |
| Día cerrado, administrador o pagos | Solo lectura, con un botón **Corregir este día** |
| Corrigiendo | Se edita, **nada se guarda solo**, y abajo hay un motivo obligatorio y *Guardar corrección* |

- **El día nunca deja de estar cerrado.** Reabrir, corregir y volver a
  cerrar son tres pasos, y el que se olvida es el último: queda un día
  abierto que nadie nota. Por eso la corrección entra con el día cerrado y
  el día sigue cerrado después — *Reabrir* se sacó de la pantalla. La API
  lo conserva, pero solo para quien tiene `corregir`; si no, el bloqueo se
  saltaría reabriendo.
- **Corrigen el administrador y quien paga** (permiso `corregir`). El
  encargado cierra el día, que es quien lo vive; corregirlo después, cuando
  ya es lo que se paga, le toca a alguien de arriba. Lo decidió el cliente.
- **El motivo es obligatorio** y queda en la bitácora con el nombre —
  *"Corrigió el equipo de un día cerrado · motivo: faltó la propina"*—. Es lo
  que se va a preguntar un mes después, sobre todo si ese día ya se pagó.
- **Cubre el día completo**: el equipo, la asistencia de las reservas y las
  actividades extras, en las tres ventanas que lo muestran —`/turnos`, el
  calendario de la portada, la página del día y `/extras`—. En la ventana
  del día de `/turnos`, la corrección incluye las dos caras: el equipo y el
  *Vino / No vino* de las reservas van juntos, con un solo motivo.
- **En la página del día**, editar, borrar o anotar una reserva de un día
  cerrado pide el motivo (en el formulario, o en una pregunta al borrar), y
  *Vino / No vino* de la tabla queda apagado: se corrige en `/turnos`.
- **Una corrección deja el día como un día cerrado tiene que estar**: con
  equipo y sin nadie sin marcar. Si no, el servidor la rechaza, igual que
  rechazaría cerrar.
- **La regla vive en una función pura**, `corregirDiaCerrado()` en
  `cierres.ts`, con sus pruebas, y la usan todas las rutas que escriben un
  día a través de `guardaDelDia()` (`lib/guardaCierre.ts`): el equipo, las
  extras y las reservas (crear, editar —mirando el día de origen y el de
  destino— y borrar). **La comprueba el servidor**: una llamada directa a la
  API con un encargado recibe 409; la pantalla apagada es solo la cara
  visible.
- **En la pantalla, el bloqueo es un `<fieldset disabled>`**, que apaga de
  una vez todo lo que se escribe o se aprieta adentro sin tener que
  acordarse de cada control. `globals.css` les baja la opacidad para que se
  **vean** apagados: un botón que no responde y se ve igual se lee como roto.
- **Lo que no pasa por esto**: lo que escribe Shopify. Un pedido que llega o
  se actualiza para un día cerrado entra igual, porque es un hecho de la
  tienda y no una edición de nadie.

### Cerrar el día pregunta en serio (2026-11-05)

El cliente lo pensó dos veces el mismo día. Primero: *"los encargados no
deberían poder cerrar el día"*, y se le sacó el botón. Después lo corrigió:
*"el encargado tiene que poder cerrar el día, pero tiene que advertir muy
bien: ¿está seguro? Ahora está cerrando el día… ¿controlaste que todos los
detalles están ingresados?"*, y **a partir de ahí, cualquier problema pasa
por quien hace los pagos**.

- **Cerrar tiene su propio permiso, `cerrar`**, que hoy tienen los tres
  roles del panel. Está separado de `equipo` para que el día que cambie de
  manos sea tocar una línea. **Corregir y reabrir siguen siendo solo de
  quien paga y del administrador** (`corregir`).
- **La pregunta es una ventana, no un `confirm()`** (`ConfirmarCierre.tsx`):
  un `confirm()` de una línea se acepta sin leer. La ventana lista lo que
  se está declarando, cada cosa con ✓ o con **!** en ámbar:
  - **Equipo**: cuántos vinieron y cuántos no llegaron.
  - **Propina del día**: el monto, o *"Sin propina anotada"* con !.
  - **Lo que se paga**: el total, o cuántos vinieron sin jornada anotada.
    **Lo ve también el encargado** (2026-11-05, lo pidió el cliente: que
    todos tengan claro cuánto costó el equipo, *"todos están en el mismo
    barco"*). Para que ese total sea cierto, la ventana del día **rellena
    con lo que guardó el servidor** las jornadas que tenía en cero: un
    turno sin monto hereda el de la ficha al guardarse, y el encargado, que
    no recibe las fichas, antes seguía viendo el campo vacío. Lo escrito a
    mano nunca se pisa. Los sueldos habituales de la ficha siguen siendo
    solo de quien paga.
  - **Actividades extras**, si hay: *"Todas confirmadas"* o cuántas faltan.
- **El ! no impide cerrar**, pide mirarlo: un día sin propina existe. Lo que
  sí impide —alguien sin marcar— ni deja llegar a esta ventana. Con algún !
  el botón dice *"Sí, está bien así: cerrar el día"*, y el otro botón es
  *Volver a revisar*.
- Debajo, en rojo: *"Después de cerrar ya no se puede cambiar nada. Si algo
  quedó mal, solo quien hace los pagos lo puede corregir."*
- **Cómo se arregla un error de una semana ya pagada lo decide quien
  paga** (2026-11-05, lo cerró el cliente): *"está bien que se pueden hacer
  las dos cosas. Solo el encargado de pago tiene la decisión de cómo se
  gestiona. Y en muchos casos es más fácil ajustarla en la semana
  siguiente que ir para atrás"*. Las dos salidas quedan:
  - **Corregir ese día** (*Corregir este día*, con motivo): solo quien paga
    y el administrador, por el permiso `corregir`.
  - **Compensar en la semana siguiente**: un ajuste con su motivo en un día
    abierto —*"+$5.000 propina que faltó el 1/11"*—, y la semana ya pagada
    queda tal como se pagó. Es lo más común.
  - **El encargado fija cuánto se paga cada día, y anota los ajustes**,
    en los días abiertos (lo confirmó el cliente el 2026-11-05: *"muchas
    veces el encargado es el que hace el negocio con el runner que viene, ya
    te pago 25, luego te pago 35"*). La **jornada del día** es suya: es un
    campo del turno y no de la ficha, así que la escribe sin ver los
    sueldos habituales de nadie. Lo mismo un atraso o un adelanto de caja,
    como ajuste. Lo que no puede es tocar un día cerrado; decidir cómo se
    arregla lo ya pagado no es suyo.

### Cerrar el día

**Cerrar es una declaración, no un cálculo.** Se podría decir que un día
está cerrado cuando nadie quedó sin marcar, pero eso confunde dos cosas: que
no falte nada por marcar es una condición, y que alguien **haya revisado y
dado por cerrado** es un hecho. Un día sin equipo cumpliría la condición sin
que nadie lo mirara, y un día al que falta agregarle a quien llegó de más se
vería completo justamente porque falta. Por eso el cierre se guarda con el
**nombre de quien cerró y la hora**: es lo que después permite preguntarle.

- Vive en una pestaña propia, **`Cierres`** (Fecha · Cerrado por · Cuándo),
  una fila por día cerrado. Cerrar dos veces no agrega dos filas.
- **No se reabre: se corrige** (desde el 2026-11-03). Aparece un ajuste
  olvidado, alguien reclama su propina: el administrador o quien paga
  aprieta *Corregir este día*, arregla y guarda con el motivo, y el día
  sigue cerrado. Ver la sección que sigue.
- **Un día que todavía no llega no se cierra** (2026-11-05, lo pidió el
  cliente): se cierra desde el mismo día en adelante. Cerrar es declarar
  quién vino, y eso no se sabe de un día que no ha ocurrido. La regla es
  `yaLlego()` en `cierres.ts`, comparando fechas en texto contra `hoy()` de
  Chile; la comprueba el servidor (400 con el motivo) y la ventana del día
  apaga el botón y lo dice en una línea azul.
- **Y quién vino tampoco se marca antes del día** (2026-11-05, el cliente lo
  pidió a continuación). En un día futuro, en vez de *Vino / No vino* va una
  pastilla punteada que dice *se marca el día*, del mismo alto, en las tres
  listas: el equipo, las reservas y las actividades extras. El servidor lo
  comprueba con la misma `yaLlego()`:
  - **El equipo y las extras descartan la marca** al guardar un día futuro,
    en vez de rechazar el guardado: así un día que arrastre una marca vieja
    se sigue pudiendo editar, y la marca se limpia sola.
  - **Una reserva la rechaza** (400 con el motivo), porque marcar es lo
    único que pide esa llamada y descartarlo callado se vería como que se
    guardó.
- **Lo único que bloquea el cierre es la asistencia sin marcar**, y se
  comprueba en el servidor además de en la pantalla. Un turno sin marcar no
  suma, así que cerrar con turnos a medias sería cerrar con el total mal.
- **La propina y las actividades extras avisan pero no bloquean.** Un día
  sin propina existe —no todos los días dejan— y una actividad sin confirmar
  es plata de otro bolsillo que se arregla en su propia página. Bloquear por
  ellas obligaría a inventar un cero para poder cerrar, y un cero inventado
  es peor que un aviso.

**`/turnos` muestra arriba lo que falta por cerrar**, que es lo que el
cliente pidió: *"una vez que el día pasó, el panel puede mostrar: oiga,
falta confirmar tantos trabajadores y actividades extras para cerrar el
día"*. Cada día pendiente es un botón que abre su ventana, y dice qué le
falta: cuánta gente sin marcar, cuántas extras sin confirmar, si nadie anotó
propina. **Un día que todavía no llega no aparece**: nadie puede decir quién
vino a un sábado que no ha ocurrido.

**Y cada celda del mes lo dice con una pastilla** (2026-11-05, lo pidió el
cliente: el *"✓ cerrado"* era una palabra en gris que no se veía):

| | Qué muestra la celda |
|---|---|
| Cerrado | **✓ Cerrado**, pastilla verde llena con un brillo |
| Ya pasó y no está cerrado | **! Sin cerrar**, pastilla ámbar con borde, y debajo qué le falta: *N por marcar*, *N extras por confirmar*, o *listo para cerrar* |
| Sin equipo, o todavía no llega | nada |

Se distinguen por **forma además de color**: relleno contra borde. *Listo
para cerrar* es el caso que más se olvida —ya está todo marcado y solo
falta apretar el botón— y por eso tiene su propia frase.

**La celda de `/turnos`, con cada dato a su peso** (2026-11-06, lo pidió el
cliente: *"ciertos datos como cerrado aparecen súper bien visibles… otros
como la fecha misma están muy desproporcional chico… que ningún dato se
desaparece completo o un dato sobresalta completo"*). Medido antes: la
fecha a **11px**, el pronóstico a 10, y la pastilla *✓ Cerrado* en letra
extra gruesa con brillo, o sea lo más fuerte de la celda.

- **La fecha va a 18px**, en negrita si el día tiene algo y más clara —no
  borrada— si está vacío. Los días de la semana a 12px.
- **Los datos a 13px, con el número en negrita** (*__34__ personas*,
  *__9__ en el equipo*): el número es lo que se mira, la palabra lo que se
  lee una vez. El pronóstico a 12.
- **Las pastillas de cierre perdieron el brillo y la letra extra gruesa**,
  y siguen distinguiéndose por forma: la de cerrado es lo único relleno de la
  celda, la de sin cerrar lleva borde.
- **Tres líneas fijas arriba**: la fecha con el punto de color, el
  pronóstico, y la palabra del estado en su propia línea. Antes la palabra
  iba al lado de la fecha y en un teléfono *PREPARACIÓN* se cortaba. Las
  piezas salen de `partesDelDia()`, en `PuntoDia.tsx`: los mismos textos y
  colores, no una segunda lista. El mes desplazable pasó de 640 a 840px de
  ancho mínimo, para que la palabra entre entera.
- **La pastilla de cierre va siempre abajo a la izquierda** (lo pidió el
  cliente el mismo día: *"siempre en el mismo lugar… y todo el resto de la
  información arriba"*). Antes iba pegada a lo último que hubiera —en un día
  cargado quedaba abajo, en uno con poco a media altura— y el *3 por marcar*
  iba debajo de ella. Ahora la empuja `mt-auto` al fondo de la celda, que se
  estira al alto de su fila, y lo que le falta va arriba con el resto.
- **El día de la semana va en cada celda, al lado del número** —*Jue 6*,
  *Lun 7*— (lo pidió el cliente el mismo día: *"hay suficiente espacio…
  chao, Excel"*). Con el día solo en la fila de arriba había que subir la
  vista a buscar la columna, que es leer una planilla. La fila de arriba se
  queda como guía al recorrer el mes; el nombre corto sale de la misma
  lista `DIAS`.

### Lo que cuesta un día

**Un turno sin marcar no suma nada.** Antes de que alguien diga si vino o
no, el panel no da por venida a una persona ni por pagada una jornada. Esa
regla no cambió con el rediseño; lo que cambió es dónde se marca.

**Lo que se guarda queda congelado, y esa es la decisión importante.** El
monto de la jornada y la modalidad viajan **dentro del turno**, no se
recalculan desde la ficha del trabajador. Si en marzo se le sube el sueldo a
alguien, los turnos de noviembre no pueden cambiar solos: las cuentas de
meses cerrados dejarían de cuadrar.

**Los sueldos los propone el servidor, no el navegador.** Un turno sin
montos los hereda de la ficha al guardarse (`guardarEquipoDelDia`). Así el
encargado puede confirmar y corregir sin que su pantalla reciba nunca la
tabla de sueldos del equipo entero — que no necesita, y que no es dato suyo.
Con montos ya escritos manda lo que venga: ahí el monto es un hecho del día
y no una propuesta.

Un descuento mayor que la jornada deja el día en **cero, nunca en negativo**.
Si de verdad hay que cobrarle algo a alguien, eso no es un turno con monto
negativo, es otra conversación.

### Los ajustes son varios, y cada uno con su motivo (2026-10-23)

Lo pidió el cliente con el ejemplo exacto: *"extra positivo por hora extra y
extra negativo por adelanto"*. Con un solo ajuste había que sumarlos a mano
y escribir un motivo que explicara los dos, o sea perder justo lo que el
ajuste sirve para dejar: **el porqué de cada peso**, para quien revise ese
pago un mes después.

Se guardan en las **dos columnas que ya existían** —`Ajuste` y `Motivo del
ajuste`— como dos listas en paralelo separadas por `|`. Se decidió así sobre
abrir una pestaña nueva por una razón concreta: el caso corriente es **uno**,
y entonces la celda se ve exactamente como antes (`-5000` · `llegó tarde`),
así que **lo ya escrito se sigue leyendo sin migrar nada** y la planilla
sigue siendo editable a mano por alguien que no sepa de esto. Con dos dice
`5000|-20000` · `hora extra|adelanto`, que también se entiende.

**Manda la lista de montos**: si alguien edita una celda y no la otra, los
motivos que falten se leen vacíos en vez de desalinear los pares. Y el
separador se saca de los motivos al guardar, porque un motivo con `|`
partiría su propio ajuste en dos al volver a leerlo.

#### El ajuste se agrega desde la línea de la persona (2026-10-30)

**Estaban, y el cliente no los encontraba**, que a efectos prácticos es lo
mismo que no tenerlos. Lo dijo así: *"hay que ponerle un ojo al tema de
horas extras, que era pensado con comentario para definir por qué se suma o
resta un monto y que puedo agregar distintos montos. Eso en esta vista no lo
veo, y no sé si se nos perdió en el camino"*. Y el caso que dio es el de
todos los días: llegó dos horas tarde y hay que descontarle, se le adelantó
plata de la caja, le toca más por feriado, por hora extra o por haberlo hecho
muy bien.

Dos causas, las dos arregladas:

- **Estaban en la tabla de abajo de la ventana del día**, y quien planifica
  mira la parte de arriba. Ahora cada persona tiene un **`+ Ajuste`** en su
  línea; **es el mismo ajuste, no una segunda forma de anotar lo mismo**, y
  el cursor se va hasta el campo —que está más abajo— porque si no el botón
  parecería no hacer nada. La línea muestra además lo que suman, con el signo
  adelante: **−$18.000**, no `$-18.000`, que se lee como un error de tipeo
  justo donde importa saber si se suma o se resta.
- **La ficha decía "Hora extra" y parecía el lugar.** Ahí no hay ningún
  motivo que escribir porque ese campo es **cuánto vale una hora extra de esa
  persona**, de costumbre, no cuánto se le pagó un sábado. El bloque Pago de
  la ficha ahora lo dice con todas sus letras y manda al día.

#### Los días pasados se editan, y eso es a propósito

Lo pidió confirmado el cliente: *"siempre puede ser que necesito agregar o
cambiar algo en una fecha que ya está en el pasado… por lo menos poder
revisarla"*. En `/turnos` se llega a cualquier mes con *Mes anterior*, se
abre cualquier día y se revisa. **Un día abierto se edita; uno cerrado se
corrige** (desde el 2026-11-03): el administrador o quien paga aprieta
*Corregir este día* y guarda con un motivo, y el día sigue cerrado. Ver "Un
día cerrado no se edita: se corrige".

Lo que el panel no hace, y conviene tenerlo claro: **si ese día ya se pagó,
el arreglo es con la persona**. Acá queda anotado el porqué, con su monto y
su motivo, para que la próxima planilla lo recoja.

### Por turno o contratado (2026-10-21)

Lo pidió el cliente porque **los contratados se comportan distinto**:

- **Por turno** — se le paga por jornada trabajada, y cada turno suma al
  costo del día.
- **Contratado** — tiene sueldo, y ese sueldo no sale de acá. Sus turnos
  **no suman jornada**: contarlos sería pagar dos veces lo mismo, una en la
  liquidación y otra en la caja del sábado. Sí se le anotan **horas extra y
  ajustes**, que son del día y se pagan aparte.

La celda en blanco es **Por turno**, para que las fichas escritas antes de
esta distinción sigan significando lo mismo. La modalidad se congela en el
turno junto con el monto, y además explica por qué una fila vale cero:
"contratado" se entiende, un cero pelado parece un error.

El total del día se muestra como **"por turnos de este día"** y los
contratados se cuentan aparte, con su propia glosa.

### La ficha, desde el día: crear y completar sin salir (2026-10-23)

El desplegable de cada puesto tiene debajo **+ Nuevo trabajador**, y cada
persona ya asignada tiene al lado un **ficha**. Las dos abren **la misma
ventana**, porque es el mismo formulario: lo único que cambia es si la
persona ya existe. En `/extras` es igual, con los colaboradores.

Existe porque sin él la lista vacía era un callejón: no se podía planificar
sin irse a `/equipo`, agregar a alguien, volver y empezar de nuevo. **Lo que
crea no es un caso especial**: queda en la lista como cualquier otro.

**Y desde el 2026-10-23 pide también los datos de pago** —teléfono, montos,
correo del comprobante y cuenta bancaria—, al crear y al editar. Antes no:
el argumento escrito era que crear a alguien en mitad de la planificación es
apurado y un número de cuenta mal tecleado no conviene apurarlo. Suena
razonable y no resistió el uso. El cliente lo dijo sin rodeos —*"aún no
puedo agregar los datos personales de las actividades extras"*—: los campos
existían, pero **solo en `/equipo` y en `/extras`**, y quien arma un sábado
no pasa por ahí. Resultado: fichas a medias y la planilla del pago semanal
sin cuentas. Ahora se piden donde se está trabajando, *"y así todos los
colaboradores están completos directo"*.

**El nombre no se edita desde el día, a propósito.** Los turnos y las
actividades ya guardadas apuntan a la persona por su nombre; renombrarla
desde la ventana de un día dejaría los otros días apuntando a nadie. Eso se
hace en `/equipo` o en `/extras`, que es donde el panel avisa del daño
(`sinFicha()`).

Va por `POST /api/equipo/trabajador` para crear y `PATCH` para editar —y sus
gemelos en `/api/extras/colaborador`—, que tocan **una fila** en vez de
guardar la lista entera. No es un detalle: la pantalla del planificador no
tiene la lista completa en la mano —puede estar desactualizada— y mandarla
entera sería arriesgarse a pisar el cambio de otra persona. Si el nombre ya
existe no falla: devuelve el que hay y lo dice.

**Lo que un encargado no recibe, tampoco lo puede pisar.** Su ventana no
trae montos ni cuenta bancaria, y el `PATCH` conserva los que ya estaban en
vez de escribir lo que venga: si no fuera así, que un encargado corrigiera
un teléfono borraría el sueldo y la cuenta de esa persona.

**Dos ventanas abiertas a la vez obligaron a arreglar `Dialogo`**: las dos
escuchaban Escape en el documento, así que una tecla cerraba las dos de
golpe y se perdía lo escrito en la de atrás. Ahora hay una pila y solo
responde la de encima.

### La planilla semanal, el link que se manda al grupo

En el calendario, junto al rango de cada semana, **Enviar planilla semanal**
copia un link a `/semana/<llave>?semana=<lunes>`.

**Muestra lo mínimo para organizarse**: quién trabaja cada día en qué
puesto, a qué hora abre, cuánta gente se espera y cuántas reservas son.

**Y nada más: ni un peso, ni un menú, ni un nombre de cliente.** Está hecho
con la idea de que va a circular más de lo que uno quisiera. Lo que un
trabajador necesita de su propio día —los menús que hay que preparar, lo que
gana— vive en **su link personal**, que es de una sola persona. Separarlos es
justamente lo que permite mandar este sin pensarlo dos veces.

- La llave vive en `Config` (`token_planilla`) y **no se genera sola**: que
  exista un link que abre sin contraseña tiene que ser decisión de alguien.
  Se crea al apretar el botón la primera vez.
- **La manda el encargado, no solo el administrador** (2026-10-29, lo pidió
  el cliente). Mandar la planilla es parte de organizar la semana, que es su
  trabajo, y el link **no le abre nada**: esa página muestra menos de lo que
  ya ve en el panel. Antes el botón estaba a la vista para los dos pero
  crear la llave era de `links`, o sea del administrador, así que a un
  encargado le fallaba justo la primera vez — el peor momento. Ahora crear
  es del permiso `planilla`.
- **Renovarla invalida todas las copias** que anden dando vueltas, que es lo
  que hay que hacer cuando alguien deja el equipo. El costo a asumir: también
  deja de servir el link de quien sí trabaja, así que hay que volver a
  mandarlo.
- **Renovar también es del encargado**, por decisión del cliente ese mismo
  día. El primer corte dejaba renovar con el administrador —invalidar las
  copias de todo el equipo suena a administrar una credencial—, pero quien
  se entera de que alguien se fue, y quien va a tener que volver a mandar el
  link, es el mismo encargado: partir ese trabajo en dos personas era
  dejarlo a medias. **Quitarlo sí se queda en `links`**: renovar deja la
  planilla andando con un link nuevo, quitarlo la apaga.
- **El botón de renovar estaba sin hacer hasta el 2026-10-29.** La API
  aceptaba `renovar` y `quitar` desde el primer día, pero no había dónde
  apretarlo: ni el administrador podía. Hoy es una línea chica bajo los
  botones del calendario, visible **solo cuando ya hay una llave creada**, y
  **pide confirmación**, porque es el único botón de esa pantalla que rompe
  algo que ya estaba andando.
- Muestra solo los días **con alguien asignado**: siete columnas para un
  negocio que abre dos es una tabla llena de huecos, y esto se lee en un
  teléfono.
- **La columna del puesto queda fija al desplazar de lado** (2026-11-01, lo
  pidió el cliente): *"con un equipo tan grande, si no, no se va a
  entender"*. Con nueve puestos y tres días la tabla no cabe en un teléfono,
  y al correrla uno queda mirando una columna de nombres sin saber de qué
  puesto son — que es lo único que esta tabla viene a decir. Dos detalles de
  implementación: la celda fija **lleva su propio fondo** (`bg-tinta`), sin
  el cual los nombres se verían por debajo, y **su línea de corte es un
  `shadow` y no un `border`**, porque con `border-collapse: collapse` el
  borde de una celda fija se va con el desplazamiento. La caja que desplaza
  lleva `relative`, por lo mismo que los calendarios de celdas.
- **Se evaluó además agrupar los puestos por área —cocina, barra, servicio—
  y pintarlos**, y el cliente lo descartó el mismo día: *"chao con esa
  tarea, fijada columna 1 se soluciona igual"*. Queda anotado para que a
  nadie le dé por reponerlo sin que lo pidan. Si alguna vez se hace, el área
  es **dato del negocio**: va como columna de `Puestos`, editable en
  `/equipo`, no mapeada en el código — renombrar un puesto no puede dejarlo
  sin área.
- **El cuerpo va a 16px y no a los 14 del resto del panel** (2026-11-01, lo
  pidió el cliente: *"está muy, muy chica las letras"*, mirándola en el
  celular). Esta página no es el panel: **es un link que se abre en un
  teléfono, de pie y a un brazo de distancia**, para contestar "¿a quién me
  toca hoy?". Los rótulos —el encabezado *Puesto* y la bajada con la hora y
  la gente— subieron de 12 a 14. Lo que sobra de ancho se resuelve
  desplazando, que ya funciona con la columna fija.
- Un nombre **tachado** es alguien que no llegó ese día.
- Como `/mi/`, no dibuja la barra del panel — **pero sí hereda el tema**, y
  desde el 2026-11-01 eso significa que abre en claro sin que nadie elija
  nada. Ver "El interruptor".

### Lo que ve cada quien, de un vistazo

| | Planilla semanal | Link personal |
|---|---|---|
| Quién trabaja, en qué puesto | toda la semana | solo sus días |
| Personas y reservas del día | sí | sí |
| Menús a preparar | **no** | sí |
| Plata | **no** | solo la suya |
| Actividades extras (jinetes, pintacaritas) | **no** | **no** |
| A quién se manda | al grupo | a una persona |

### Los hooks van todos arriba, antes de los `return` (2026-10-22)

**La página del día estuvo caída y se vio como un "Application error" pelado.**
`DayView` tiene dos `return` tempranos —el aviso de error y el "Cargando…"— y
dos `useMemo` quedaron debajo de ellos. En la primera pasada, con las reservas
todavía sin llegar, esos dos hooks no corrían; en la segunda sí, y React tumba
el árbol completo con el error #310 (*rendered more hooks than during the
previous render*).

Vale la pena tenerlo escrito por **cómo se ve el fallo**, que es lo que lo hace
caro: una pantalla negra con una línea de texto y un número de error minificado,
sin nada que apunte al archivo. No se parece en nada a su causa.

La regla, entonces: **en un componente, todos los hooks van antes del primer
`return`.** Lo que va debajo son constantes derivadas, no hooks.

### Un componente declarado dentro de otro se lleva el foco (2026-10-23)

La hermana de la regla anterior, y se vio en la misma semana: **en `/equipo`
no se podía escribir un nombre.** Se tecleaba la primera letra y el foco se
iba a `body`; el resto se perdía en el vacío.

La causa es una línea que parece inofensiva: `Campo` —el rótulo encima del
input— estaba declarado **dentro** del componente. Una función nueva en cada
dibujado es, para React, **otro tipo de elemento**: desmonta lo que había y
monta uno nuevo. Con un `input` adentro, eso es perder el foco a cada letra.

Vale tenerlo escrito porque el síntoma no se parece a la causa —se lee como
un problema del teclado o del navegador— y porque llegó con el cambio a
tarjetas, o sea con un cambio puramente visual. La regla: **un componente se
declara al nivel del módulo, nunca dentro de otro componente.** `Campo` vive
hoy en su propio archivo, `Campo.tsx`, y lo importan las cuatro pantallas
que lo usan.

**El mismo día apareció el hermano en el guardado**: para un encargado, la
respuesta de `PUT /api/equipo` no trae `puestos` —no los puede cambiar—, y
la pantalla los tomaba igual. Con eso `puestos` quedaba en `undefined` y
toda la página caía al "Cargando…" del primer `return`: un guardado que
salía bien se veía peor que uno que falla. Ahora solo se reemplaza lo que el
servidor dice haber guardado.

### La propina (2026-10-22)

**Se reparte en partes iguales entre quienes vinieron ese día y participan.**
Esa es la regla que dio el cliente, y la excepción que pidió es una casilla
por persona en `/equipo`: quien la tiene desmarcada sigue en la planilla de
trabajo pero fuera del reparto.

**La casilla viene marcada por defecto** —en la planilla, la celda en blanco
es "sí"— porque la regla es que participa todo el equipo; no entrar es la
excepción, y una excepción se marca.

El monto lo pone un encargado **en la ventana del día**, junto con la
asistencia: escribe el **total** y el panel lo reparte. No hay que calcular
nada a mano.

**Se llega por dos puertas y las dos dan al mismo campo** (2026-10-22). En la
página del día, el bloque Equipo muestra siempre una línea "Propina del día",
con el monto repartido o un **sin anotar**, y su botón abre la ventana del
día con el cursor puesto en ese campo. No es un segundo formulario: es el
mismo, y se guarda en el mismo lugar.

El motivo es que se llega a ese día por los dos lados —a cerrar el turno, o a
acordarse de la propina— y la propina vivía al final de una tabla dentro de
una ventana que hay que abrir, o sea invisible hasta que alguien supiera que
estaba ahí. Por lo mismo la línea aparece **desde que hay alguien asignado**,
no solo cuando ya se pasó lista: un "sin anotar" es lo que hace que se note
que falta.

**La regla vive en una sola función, `repartirPropina()`.** El cliente avisó
que puede cambiar, así que cambiarla es tocar ahí y nada más — no hay un
segundo lugar donde la división esté escrita.

Decisiones que vale la pena tener escritas:

- **La propina NO es sueldo y no entra en `pagoDe()`.** Esa plata no sale del
  negocio, pasa por él: meterla en el total haría que el costo de un sábado
  subiera porque los clientes dejaron más propina, y volvería imposible
  contestar "¿cuánto me costó el equipo?". Va en su propia columna en el
  informe, en la planilla descargable y en la vista del día.
- **Se guarda lo repartido, no el pozo.** Cada turno lleva la parte de esa
  persona. Así cambiar después quién participa no reescribe lo que ya se
  entregó — el mismo criterio que los montos de la jornada. El total del día
  se recupera sumando las partes.
- **Se reparte hasta el último peso.** Dividir 100.000 entre tres da 33.333 y
  sobran 2: en vez de perderlos o dejar decimales que nadie entrega en
  efectivo, se le da un peso de más a los primeros. La suma de las partes es
  siempre exactamente el total.
- **Venir y participar son dos condiciones distintas**, y las dos se piden.
  No venir es un hecho del día; no participar es una decisión sobre la
  persona.
- **Quien todavía no tiene ficha participa.** Lo más probable es que sea
  alguien recién agregado, y dejarlo fuera en silencio sería peor que
  incluirlo de más y que alguien lo corrija.
- **En el link personal sí va sumada**, porque para quien la recibe es todo
  lo mismo, pero mostrada aparte: "$30.000 + $12.000 propina".

### El informe del equipo, por semana o por mes (2026-10-21)

`/informe`, solo administrador. Por cada persona del periodo: días que vino,
jornadas, horas extra, ajustes y total. Abajo, el total del periodo.

**La descarga es el punto, no un extra.** Quien paga tiene que juntar la
información de todos y pasarla a quien corresponda, y que esa pega sea
copiar una tabla a mano es justo lo que esto viene a evitar. Por eso el CSV
trae el **detalle día por día con el motivo de cada ajuste**, no los totales:
los totales se miran en pantalla, el detalle es lo que se entrega.

**Desde el 2026-10-22 trae además las actividades extras y las cuentas
bancarias**, en su propia tabla en pantalla y en el mismo archivo al
descargar: un solo pago a la semana, con cada fila diciendo si es equipo o
actividad extra. Ver "Las actividades extras".

**Semana, mes y rango libre son el mismo cálculo.** Por dentro todo es un
rango de fechas (`informeDelPeriodo`), así que no hay tres versiones de la
misma suma esperando a desalinearse. `rangoDelPeriodo()` distingue semana de
mes por el largo del texto: `AAAA-MM` es un mes, `AAAA-MM-DD` es la semana de
ese lunes. El **rango libre** (2026-10-22) lleva sus dos fechas aparte,
porque es justamente lo que no tiene nombre: una quincena, un fin de semana
largo, lo que quedó pendiente de pagar. Si las fechas vienen al revés **se
ordenan**, en vez de devolver un informe vacío que parece que no hubo turnos.

**Y por día** (2026-11-12, lo pidió el cliente): *Por día · Por semana · Por
mes · Otro rango*, cuatro botones de 44px con el elegido teñido de dorado.
Por día es **una fecha y nada más** —el campo de fecha con ◀ ▶ para pasar al
día anterior o al siguiente, y el día en palabras al lado— y por dentro es
el mismo rango, con desde y hasta iguales. Parte en hoy; la descarga se
llama `…-dia-AAAA-MM-DD.csv`. **Ojo con los pagos**: un pago anotado para la
semana no aparece al mirar uno de sus días (`cuentaEnPeriodo()` pide que
quepa entero), igual que pasa con un rango de tres días.

**Muestra a quien no vino y a quien quedó sin marcar, con total cero.** Una
persona que desaparece del informe se lee como que no trabajó, y lo que pudo
pasar es que nadie cerró ese día. Por eso además hay un aviso arriba cuando
quedan turnos sin pasar lista: el total está incompleto mientras tanto, y
conviene que eso se vea antes de pagar.

**Un contratado suma cero en jornadas** y lo dice en su fila, porque su
sueldo no sale de acá; lo que aparece son sus horas extra y ajustes.

### Dónde está la línea entre el encargado y el administrador, en la plata

Vale tenerla escrita porque no es obvia:

- **Los montos de un día son del encargado.** Los escribe él al pasar lista
  y los ve en la página de ese día. Es su trabajo.
- **El informe del periodo era del administrador**, con el argumento de que
  lo que el encargado necesita para cerrar un turno es el día que tiene
  delante y no el historial de sueldos de todo el equipo. **Desde el
  2026-11-01 el encargado también lo ve, y es provisorio** — ver abajo.

Esa pregunta se contestó el **2026-10-22**: sí es otra persona, así que
existe el rol **pagos** — que desde el 2026-11-01 **no es una cuenta más
chica que la del encargado, sino la misma más la plata**. Ver abajo.

#### El informe se afinó: el gerente mira, quien paga paga (2026-11-12)

Lo decidió el cliente, y cierra lo que la sección de abajo dejó abierta:
**el encargado ya no ve el informe**; **el gerente de operaciones sí, pero
no registra pagos ni copia datos de transferencia: solo marca la boleta
recibida**; quien paga y el administrador hacen todo.

- **`informe`**: administrador, gerente y quien paga. **`boleta`** (nuevo):
  los mismos tres, y es lo que pide `/api/informe/boleta`. **`pagar`** sigue
  siendo de administrador y quien paga.
- **Las cuentas bancarias solo viajan a quien paga**: `/api/informe` las
  recorta en el servidor, así que al gerente no le llegan ni a la pantalla
  ni a la planilla que descarga, que sale **sin las columnas del banco**.
  Es lo que la sección de abajo proponía hacer cuando se afinara la lista.
- En pantalla el gerente ve las líneas, el detalle y el estado de cada
  pago, y el botón **Falta la boleta / Boleta recibida**; no ve *Copiar*,
  *Pagado completo*, *Pago parcial* ni la transferencia masiva.
- Comprobado con Playwright como gerente y como encargado: el encargado ve
  *"Esta parte no es tuya"* y el menú ya no le ofrece Informe.

#### El encargado ve el informe, por ahora (2026-11-01) — reemplazado el 2026-11-12

Lo liberó el cliente en medio de una reunión, y dejó dicho que es un
intertanto: *"por ahora libéralo para encargado también… luego se define más
especificado cuál rol tiene qué derechos de ver"*. Queda anotado **como
decisión provisoria y no como la línea definitiva**, porque lo que había
antes tenía un argumento y ese argumento no se cayó, solo se postergó.

**Lo que hay que saber antes de dejarlo así**, y que no se ve en la tabla de
permisos: `/api/informe` devuelve de cada ficha **los datos de la
transferencia** —titular, RUT, banco, tipo de cuenta, número y el correo del
comprobante—, porque quien paga los necesita para hacer la transferencia sin
cruzar dos listas a mano. En pantalla no se muestran: lo que se ve es el
aviso de a quién le falta la cuenta. **Pero van en el CSV que se descarga**,
así que abrir el informe abrió también eso — y en todo el resto del panel las
cuentas bancarias son solo del administrador y de quien paga.

Comprobado con el arnés: la cuenta de encargado recibe `/api/informe` con
200 y los mismos turnos y cuentas que el administrador, le aparece
**Informe** en el menú, y la pantalla ya no le dice "esta parte no es tuya".

Si al afinar la lista se decide que el encargado vea sus cuentas pero no las
bancarias, el lugar natural es recortarlas en esa ruta según el rol, como
`/api/extras` ya hace con los montos habituales — no esconderlas en la
pantalla, que es dejar el dato viajando igual.

### El rol de pagos: el encargado, más la plata (2026-10-22, corregido el 2026-11-01)

**Nació como una cuenta mínima y el cliente lo corrigió.** El primer corte
le daba **una sola acción**, leer el informe, con el argumento de que juntar
las cuentas no necesita ver el calendario. Duró diez días. Lo dijo así:

> *"El encargado de pagos en verdad tiene que ver y tiene los mismos
> derechos que el encargado, pero él sí tiene adicionalmente los derechos de
> configurar o reescribir montos en estas filas y columnas de pago."*

Y tiene razón, porque el supuesto de atrás estaba equivocado: quien paga en
un negocio de este tamaño no es un contador externo que solo recibe una
planilla, es alguien de confianza que además opera. Entonces:

Y el 2026-11-01, en la misma conversación, lo terminó de ubicar: **es el
segundo rol más poderoso del panel**, el que *"puede hacer casi todo"*. Así
que la regla se escribe al revés, por lo que **no** puede, que es lo corto:

> **`pagos` puede todo menos dos cosas: las cuentas del panel y la
> mantención técnica.**

| | |
|---|---|
| **No puede** | `usuarios` — crear cuentas y cambiar roles · `mantencion` — Shopify a mano y el diagnóstico de la planilla |
| **Sí puede**, y el encargado no | registrar pagos · ver y editar los sueldos y cuentas bancarias de las fichas · los links personales · los puestos · la bitácora · los precios y la configuración |
| **Sí puede**, igual que el encargado | el calendario, las reservas, los turnos, las extras, los presupuestos, la planilla semanal |

Las dos que quedan fuera lo están por motivos distintos y conviene no
confundirlos:

- **Las cuentas del panel** porque ahí se decide **quién entra y con qué
  rol**. Una cuenta que pudiera editarlas podría ascenderse sola, y entonces
  no habría roles, habría un trámite.
- **La mantención** —consultar Shopify a mano, el diagnóstico de la
  planilla— porque es para arreglar el sistema, no para operarlo. No es
  cuestión de confianza: es que no es su trabajo, y el día que algo falle
  conviene saber quién estuvo tocando.

**La prueba se escribe como la lista de lo que NO puede**, y esa es la
parte que vale copiar: así, **cualquier permiso que se agregue mañana a la
tabla y no esté en esa lista, lo tiene**. Al revés —enumerando lo que sí—
cada permiso nuevo habría nacido fuera del rol sin que nadie lo decidiera,
que es justo cómo este rol terminó siendo más chico de lo que el cliente
quería y hubo que corregirlo dos veces.

**La prueba dejó de contar acciones y pasó a fijar la relación entre los dos
roles**: que `pagos` pueda todo lo del encargado, y que lo único que tenga
de más sea `pagar`. El conteo había que venir a corregirlo cada vez que la
tabla crecía, y una prueba que se corrige a mano cada vez deja de proteger.

**Se comprobó con las tres cuentas**, y lo que importa es la última línea:

```
                POST /api/informe   /menus  /config  /bitacora  /usuarios
pagos      → 200                      ✓        ✓         ✓      ✗ bloqueada
encargado  → 403                      ✗        ✗         ✗      ✗
admin      → 200                      ✓        ✓         ✓         ✓
```

Y abriendo la ficha de una persona en `/equipo`:

```
pagos      Pago ✓  Transferencia ✓  botón de link ✓  Administrar puestos ✓
encargado       ✗                ✗                ✗                     ✗
admin           ✓                ✓                ✓                     ✓
```

El encargado **recibe 403 llamando la API directo**, no es que se le esconda
el botón: el permiso se comprueba en la ruta, que es la regla de este panel.

#### Dos cosas que no cambiaron, y conviene que se note

- **El redirect de `/` a `/informe` del middleware quedó sin usarse.** Era
  para la cuenta de pagos cuando no podía ver el calendario; ahora entra por
  la puerta de siempre. Se deja porque la guarda sigue siendo correcta para
  cualquier rol que mañana tenga el informe y no el calendario, y porque es
  un `if` que no se cumple.
- **`/api/informe` sigue devolviendo de las fichas solo los datos de la
  transferencia**, sin sueldos habituales ni tokens. Eso no cambió y no es
  un olvido: lo que se paga es lo que quedó congelado en cada turno. Los
  sueldos de la ficha los ve ahora en `/equipo`, que es donde se editan.


#### `sueldos` y `links` son dos permisos, y antes eran uno solo

El cliente remató la conversación con una frase: **"que vea también los
sueldos de las fichas"**. Suena a abrir una condición, y abrirla habría
estado mal — ahí está lo que vale guardar.

**`esAdmin` estaba haciendo de dos cosas a la vez.** La misma condición
escondía:

- **los montos habituales y la cuenta bancaria** de una ficha, que son
  plata, y
- **el token del link personal**, que es una credencial.

No tienen nada que ver. Abrirle `esAdmin` a la cuenta de pagos para que
viera los sueldos le habría entregado de paso **los links personales de
todo el equipo** — y esos son del administrador justamente porque con uno
se entra a ver lo de una persona sin contraseña.

Por eso se partió en dos:

| Permiso | Qué gobierna | Quién |
|---|---|---|
| **`sueldos`** | modalidad, jornada, valor hora, propina y cuenta bancaria de la ficha | administrador y quien paga |
| **`links`** | crear, copiar, renovar y quitar el link personal | administrador y quien paga |

**Hoy los tiene el mismo par de roles, así que no discriminan entre ellos
—el cliente terminó dando los dos— y se dejan separados igual.** Son cosas
distintas: uno es plata y el otro una credencial. La costura queda para el
día que un rol necesite lo uno sin lo otro, que es exactamente lo que no se
podía hacer mientras eran `esAdmin`. Lo que sí separan hoy es al
**encargado**, que no tiene ninguno de los dos.

**Y de paso se fue `esAdmin` de la interfaz de `/equipo`.** Gobernaba tres
cosas sin relación —la plata, el link y la lista de puestos— así que la
pantalla manda ahora tres banderas, una por permiso. Cambiar quién ve qué
es tocar la tabla de permisos y nada más.

- **Vale para las dos pantallas y para las dos puntas.** `/api/equipo` y
  `/api/extras` recortan por `sueldos` al devolver, y **descartan por lo
  mismo al guardar**: quien no recibe un monto tampoco lo puede pisar, que
  es la regla de siempre acá. El token se recorta por `links` (`verLinks`).
- **El texto de arriba de `/equipo` —"dentro de cada trabajador puedes
  copiar su link personal"— se muestra solo a quien tiene `links`.**
  Prometerle algo a quien no lo va a encontrar es peor que no decir nada.
- ~~Una prueba fijaba que `pagos` tuviera `sueldos` y **no** `links`~~ —
  **ya no**: ese mismo 2026-11-01 el cliente le dio también los links a
  quien paga (*"él gestiona al equipo, a él le van a pedir el link"*). Hoy
  la prueba fija lo contrario, que `pagos` solo no puede `usuarios` ni
  `mantencion`. La tabla de abajo es del primer corte, cuando pagos todavía
  no veía el link.

Comprobado con las tres cuentas contra la planilla falsa:

```
pagos      verSueldos ✓  jornada 30.000  cuenta ✓  token ✗   ve Pago y Transferencia, no el link
encargado  verSueldos ✗  jornada 0       cuenta ✗  token ✗   no ve ninguno de los dos
admin      verSueldos ✓  jornada 30.000  cuenta ✓  token ✗*  ve los tres
```

*El token sale vacío también para el admin cuando la persona todavía no
tiene link creado, que es el caso de la prueba.

### Rol para lo que se hace, alcance para dónde (2026-11-11)

Regla de diseño, acordada con el cliente: **pocos roles fijos para *qué*
puede hacer alguien, y configuraciones de alcance para *dónde* o *sobre
qué*.** Antes de crear un rol nuevo hay que preguntarse si es un rol de
verdad o un rol que ya existe con otro alcance.

- **Por qué**: mezclar las dos cosas multiplica los roles. "Vendedor Lo
  Pirque", "vendedor Calicanto" y "vendedor de los dos", y después lo mismo
  para encargado y pagos: con dos empresas y cuatro roles serían doce, y
  cada permiso nuevo habría que repartirlo doce veces.
- **El panel ya lo hacía sin nombrarlo**: el vendedor es un rol más una
  regla de alcance —solo toca lo que anotó o cotizó él
  (`puedeTocarReserva()`, `puedeTocarPresupuesto()`)—, y esa regla vive al
  lado de la tabla de permisos, no dentro de ella. La empresa de una cuenta
  es el mismo tipo de cosa.
- **El límite**: el alcance no son permisos sueltos por persona. Casillas
  de "éste sí ve el informe, éste no cierra el día" en cada cuenta serían
  una jungla: nadie sabría qué puede alguien sin abrir su ficha, y la
  explicación de los roles (`roles.ts`) dejaría de decir la verdad. Lo que
  se hace lo dice el rol; el alcance solo acota dónde.

### La vista gerencia: ve todo, edita lo de su rol (2026-11-11)

Idea del cliente, y es la regla de arriba aplicada: **no es un rol, es un
agregado de la cuenta**. Se marca en *Cuentas* con el botón **+ Vista
gerencia** (columna `Vista gerencia` de `Usuarios`, al final; en blanco es
**no**, al revés que `Activo`).

- **Ve todo el panel** —calendario, reservas, recepción, equipo con sus
  sueldos, extras, cotizaciones, clientes, productos, configuración, informe
  y bitácora— y **edita solo lo de su rol**.
- **No ve** las cuentas y contraseñas, la mantención ni los links personales
  (`NO_SE_LEE_CON_GERENCIA`): no es información, es acceso.
- **Cómo funciona**: `puedeVer(rol, accion, gerencia)` en `auth.ts`. Los
  `GET` de las rutas piden `exigirVer()`; todo lo que escribe sigue con
  `exigir()`, o sea con el rol, y su 403 dice *"Con vista gerencia ves esto,
  pero tu rol (X) no lo puede cambiar"*. El `PUT` del equipo y de las extras
  ya descartaba los sueldos que el rol no puede pisar, así que verlos no
  abre escribirlos.
- **Viaja firmada en la sesión**, como el rol: vale desde la próxima vez que
  esa persona entre. La barra lo dice con la pastilla *👁 Vista gerencia*, y
  una pantalla que solo se mira por ella lleva arriba *"acá solo miras"*.
- **Las pantallas que se miran por la gerencia se apagan** (2026-11-11, lo
  pidió el cliente). El rol y la vista gerencia bajan del layout en un
  contexto (`SesionCliente.tsx`), y cada pantalla pregunta
  `usarSoloMira(accion)`: con vista gerencia y el rol sin ese permiso,
  **los campos van en un `<fieldset disabled>`** —el mismo de un día
  cerrado— y **los botones que escriben no se dibujan** (agregar, guardar,
  desactivar, cotizar, cerrar el día, Llegó / No vino). Lo que sirve para
  mirar sigue vivo: abrir fichas, cambiar de mes, filtrar, buscar, girar a
  *Reservas*. Cubre `/equipo`, `/turnos` y la ventana del día, `/extras`,
  Productos, Configuración, Cotizaciones (la ventana queda en solo lectura
  como la de otro vendedor), Clientes, Recepción y el calendario.
- **El aviso va una vez**: en las páginas lo dice la barra de arriba; dentro
  de una ventana, una franja propia (`AvisoSoloMira`); y en `/equipo` el caso
  parcial del encargado —edita las fichas, no el pago ni la cuenta—.
- **El pago y la cuenta de una ficha se ven y no se cambian** sin `sueldos`
  (`usarSoloMira('sueldos')`), en `/equipo`, `/extras` y las fichas que se
  abren desde un día. Antes se podían escribir y el servidor las descartaba
  callado.
- El servidor sigue siendo la protección: esto solo decide qué se dibuja.
- Al administrador no le suma nada: ya ve todo, y no se guarda.

### Ver como otro rol (2026-11-12)

Lo pidió el cliente: el administrador puede mirar el panel **como lo ve otra
cuenta** —encargado, pagos, vendedor o anfitrión— y volver cuando quiere.
**👁 Ver como…** está en la barra, junto al nombre, solo para el
administrador; abre una ventana con un botón grande por rol y su frase de
`RESUMEN_ROL`.

- **Va en la sesión firmada**, no en el navegador: `/api/sesion/ver-como`
  firma de nuevo el token con `como`, y `leerSesion()` devuelve `rol` = el
  rol que se mira y `rolReal` = `admin`. Así **todo obedece al rol mirado
  sin tocar nada más**: el menú, el middleware (como anfitrión entra directo
  a `/recepcion`), las pantallas y el permiso de cada ruta (como vendedor,
  `/api/equipo` responde 403).
- **Solo vale sobre una sesión de administrador y hacia un rol de la lista**
  (`ROLES_VER_COMO`); cualquier otra cosa se ignora al leer. La ruta mira el
  rol **real**, así que la vuelta siempre está abierta.
- **Quita, no agrega**: se puede lo que ese rol puede. Lo que se haga queda
  en la bitácora con el nombre del administrador y *"admin (viendo como
  vendedor)"*; pasar a otro rol y volver también se anotan.
- **Mientras mira, una franja dorada va arriba en todas las pantallas**
  —*👁 Estás mirando el panel como Vendedor* con **↩ Volver a
  administrador**—: es la única puerta de vuelta, y tiene que estar aunque
  el menú de ese rol sea una sola pastilla.
- **No alarga la sesión** (el token nuevo vence cuando vencía el anterior)
  y no lleva vista gerencia: se ve el rol tal cual.
- **El riesgo es prestar el aparato** (lo revisó el cliente el mismo día).
  Nadie puede subirse de rol con esto —el `como` va firmado y solo vale
  sobre una sesión de administrador—, pero quien tome un teléfono que
  quedó *viendo como anfitrión* vuelve a administrador con un toque y sin
  contraseña, y lo que haga queda a nombre del administrador. Por eso:
  - **Una vista dura como máximo una hora** (`DURACION_VER_COMO`, lo corta
    `firmarSesion()`, así que no se puede pedir una más larga). Pasada la
    hora la cookie vence y hay que **entrar de nuevo**: no vuelve sola a
    administrador. La franja dice a qué hora se cierra. Volver antes
    recupera el vencimiento que tenía la sesión de administrador (`vuelta`
    en el token, `expiraReal` al leerlo).
  - **La ventana lo dice antes de elegir**: *"Es para revisar, no para
    pasarle el aparato a alguien"*; quien vaya a usar el teléfono entra con
    su propia cuenta.
  - **Pedir la contraseña para volver se evaluó y no se hizo**, por decisión
    del cliente: dentro de esa hora el riesgo sigue abierto, a sabiendas.
- Con "ver como vendedor", "lo suyo" son las reservas y cotizaciones que
  anotó el propio administrador.

### Rectificar una reserva el día del servicio (2026-11-12)

Lo pidió el cliente: *"puede pasar que una reserva viene con 2 personas
menos… o 2 personas más… el encargado debería tener la posibilidad de
rectificar esta reserva para que después cuadre con lo que se ingresa a
Fudo… que tenga que documentar estos cambios obligatoriamente"*. Lógica en
`lib/rectificacion.ts` (pura, con pruebas), rutas `/api/reservas/rectificar`
(POST rectifica, DELETE deshace) y `/api/reservas/aprobar`, ventana
`RectificarReserva.tsx`.

- **Editar y rectificar son dos cosas.** Editar es cambiar lo pactado, y lo
  hace quien la anotó. Rectificar es anotar lo que pasó en la mesa —cuántos
  llegaron, qué menús, un descuento— **desde la apertura del día**
  (`yaAbrio()`, la misma hora de la recepción) y sobre **cualquier reserva**
  del día, con el permiso `rectificar` (administrador, gerente, encargado y
  quien paga). Un día cerrado se rectifica como corrección.
- **El encargado ya no edita la reserva que anotó otra persona**
  (`puedeTocarReserva()`): la suya y las sin dueño —Shopify, las de antes—
  sí. La de otro vendedor la rectifica desde la apertura, y antes la
  pantalla dice *"Se rectifica desde las 13:00 del día"*.
- **Se guarda aparte** —`Personas reales`, `Menú real`, `Descuento`,
  `Rectificación`, `Aprobación`, al final de `Reservas`, se agregan solas—.
  Shopify (`camposDeShopify()`) y la cotización no las tocan; si pisaran
  las columnas de la reserva, la rectificación se borraría sola.
- **Cambia los números del día** (lo decidió el cliente): la ocupación usa
  `personasEfectivas()` y lo que hay que preparar `menuEfectivo()`, a través
  de `ocupacionDe()` y `menusDe()`. La reserva original se sigue viendo
  (*reservó ~~6~~*, *Reservó: 6 × Tradiciones*).
- **La caja de Fudo usa lo rectificado** (`comoIngresar()`): los menús
  servidos a precio del local, lo acordado por persona si es de una
  cotización, el descuento con su monto, y si ya pagó, cuántos cobrar aparte
  o que lo pagado de más no se devuelve desde acá.
- **La ventana son cuatro preguntas con botones**: ¿cuántos llegaron? (con
  *Usar lo de la recepción*), ¿qué se sirvió? (− y + por menú, y una línea
  verde o ámbar si calzan con las personas), ¿hubo descuento? (los estándar
  de Configuración u *Otro*), y **¿por qué?** —motivo y un comentario de al
  menos 10 letras, obligatorios—. Abajo, *Así queda en Fudo*, con la misma
  función que el servidor. Los avisos: pagó y llegaron menos (no se devuelve
  desde acá), pagó y llegaron más (cobrarlos aparte), viene de una
  cotización (el contrato no cambia), se pasa del cupo, descuento por
  aprobar. **Un cambio grande** —más de 5 personas o un descuento sobre el
  tope estándar— pide una segunda confirmación.
- **Los descuentos: el encargado da los estándar** (5, 10, 15 de
  Configuración); cualquier otro queda **por aprobar** (`aprobar`: gerente,
  quien paga y administrador). Mientras tanto no cuenta y Fudo dice que no
  se ingrese. Quien puede aprobar, al rectificar, lo deja aprobado.
- **Dónde se ve**: en la línea cerrada ✎ (o ⏳ si hay descuento por
  aprobar); abierta, una tarjeta con qué cambió, quién, cuándo y por qué,
  *Aprobar N% / Rechazar* para quien aprueba, y *Deshacer la
  rectificación* (quien la hizo o quien aprueba, con motivo). Arriba de la
  lista del día y de la portada, *⏳ Descuentos por aprobar* para quien
  aprueba. Todo queda en la bitácora.
- **Lo que falta**: listar las rectificadas en la confirmación de cerrar el
  día, para revisarlas contra Fudo antes de cerrar.

**Y el filtro 👤 Mías** (2026-11-12, lo pidió el cliente) junto a *Todas ·
Pagadas · Abonadas · Sin pagar*: de un toque, solo las que anotó o vendió
esta cuenta (`esSuya()` con `Anotada por` y el vendedor de la cotización).

### La bandeja de aprobaciones (2026-11-12)

Lo pidió el cliente: que al gerente de operaciones, apenas entra, le salga
*"hey, tienes que aprobar el descuento extra que pidió la Fran"*, y que
aprobarlo sea simple. **Arriba de la portada** (y de la página del día, con
lo de ese día) va **🔔 Tienes N cosas que aprobar**, para quien tiene
`aprobar`: gerente, quien paga y administrador.

- **Una tarjeta por cosa**: *Fran pide un **25%** de descuento*, para quién,
  cuánta gente, qué día y a qué hora lo pidió, y el motivo con el
  comentario. Debajo, **✓ Aprobar 25%** (verde, un toque) y **✕ Rechazar**,
  que pregunta antes —*"Se cobra sin descuento, y avísale a Fran"*—, y
  *Ver el día →*. Lo aprobado sale de la bandeja en el acto.
- **No cuesta una lectura**: sale de las reservas que la portada ya cargó
  (`pendientesDeAprobar()` en `lib/aprobaciones.ts`, con pruebas), el día
  más antiguo primero. Quién pidió sale de la marca de la rectificación
  (`partesRectificacion()`).
- **Está armada para crecer**: cada cosa es un `Pendiente` con su `tipo`, y
  la tarjeta (`BandejaAprobaciones.tsx`) dibuja cualquiera igual. Un tipo
  nuevo —lo que se vaya sumando por aprobar— es agregar sus pendientes a esa
  lista y su respuesta en la tarjeta.
- **Es dentro del panel**: no manda WhatsApp ni correo. Se entera quien
  abre la portada.
- **Trae tres tipos** desde el 2026-11-12: el descuento, **el pedido de más
  cupo** del encargado (*Carla pide subir el cupo a **140***, con *✓ Subir a
  140* y *✕ Rechazar*) y **el día sobre su cupo** (*Hay **12** personas sobre
  el cupo*, con *✓ Ampliar a 132* y *Soltar una reserva →*, que lleva al
  bloque del día). Ver la sección que sigue.

### Subir el cupo es del gerente (2026-11-12)

Lo pidió el cliente: *"el derecho de aumentar el cupo se saca del encargado
y es el gerente de operaciones o más arriba quien puede aumentar el cupo. Y
esto también se debería transformar en una notificación"*. Y aclaró: **para
los demás roles los avisos de sobrecupo quedan como estaban**.

- **Permiso `cupo`**: gerente, quien paga y administrador. El encargado
  sigue con `dias` —abre, cierra, cambia la hora y **baja** el cupo—, pero
  no lo sube. Lo comprueba el servidor: `/api/fechas` responde 403 si la
  cuenta sin `cupo` deja el día sobre su cupo de hoy (o sobre el de siempre
  si el día no tiene), y `/api/fechas/ampliar` pide `cupo`.
  `limiteSinAprobar()` y `subeElCupo()` en `lib/cupo.ts`, con pruebas.
- **El encargado lo pide**, por dos caminos:
  - En *Editar* un día, si escribe más que el cupo de hoy, aparece
    *🙋 Subir el cupo sobre 120 lo aprueba el gerente de operaciones* con un
    *¿Por qué?*, y el botón dice **Guardar con 120 y pedir 140**: guarda el
    día con el de hoy y deja el pedido.
  - En el bloque de sobrecupo del día, *Ampliar el cupo* pasa a ser
    **🙋 Pedir ampliar el cupo a 132**; ya pedido, dice *⏳ Se pidió ampliar
    el cupo a 132: esperando al gerente*. Soltar una reserva sigue siendo
    suyo.
- **El pedido vive en el día**: columna `Cupo pedido` de `Fechas Hábiles`,
  al final y se agrega sola (*"140 · Carla · 2026-11-12 10:05 · motivo"*).
  `/api/fechas/cupo` lo pide (`dias`), lo aprueba o lo rechaza (`cupo`).
  **Aprobar** sube a lo pedido sin pasar de la capacidad máxima del recinto
  ni bajar lo que hay (`cupoAlAprobar()`), y vacía la columna; **rechazar**
  solo la vacía. Todo queda en la bitácora.
- **Al gerente le llega a la bandeja**, igual que un descuento, y también
  **cada día sobre su cupo** con *Ampliar* de un toque. Un día que ya tiene
  un pedido no se repite como sobrecupo: es la misma decisión. Para quien
  tiene `cupo` el aviso rojo de sobrecupo de la portada se reemplaza por la
  bandeja; **los demás roles lo siguen viendo igual**, y Cotizaciones, la
  línea de la semana y la tarjeta del día no cambiaron.
- **No cuesta lecturas**: los pedidos salen de `/api/fechas`, que la
  portada ya pedía, y la firma de cambios ya cubre todas las columnas de
  `Fechas Hábiles`, así que un pedido nuevo aparece en la próxima revisión.

### Los nombres de los roles, y la gerencia general (2026-11-12)

Lo pidió el cliente: que los nombres digan qué hace cada uno, y un rol más
arriba, **Gerencia general**.

| En pantalla | Guardado en `Usuarios` | Qué es |
|---|---|---|
| Administrador | `admin` | la cuenta técnica: puede todo |
| **Gerencia general** | `gerencia` | **nuevo**: por ahora, lo mismo que el encargado de pagos |
| **Encargado de operaciones** | `gerente` | antes "Gerente de operaciones" |
| **Encargado de turno** | `encargado` | antes "Encargado" (el cliente dudó entre *de turno* y *de caja*) |
| **Encargado de pagos** | `pagos` | antes "Pagos" |
| Vendedor · Anfitrión | `vendedor` · `anfitrion` | sin cambios |

- **Solo cambió el nombre que se ve** (`NOMBRE_ROL` en `roles.ts`). El valor
  guardado de *Encargado de operaciones* **sigue siendo `gerente`**, porque
  es lo que ya está escrito en la columna `Rol`; en el código la llave es
  `ROL.operaciones`. Cambiar el valor dejaría sin rol a quien ya lo tiene.
- **La cabecera y los mensajes de permiso dicen el nombre**, no el valor
  guardado: *"jefe · Encargado de operaciones"*, *"Tu cuenta (Encargado de
  turno) no puede hacer esto"*.
- **Gerencia general nace igual a quien paga**: en `PERMISOS` va en cada
  lista donde está `pagos`, y una prueba fija que hoy pueden exactamente lo
  mismo. **El cliente va a definir un par de derechos y vistas distintas**;
  cuando lo haga, se cambia esa prueba a propósito. Está en *Cuentas* para
  asignarlo y en *Ver como…* (🏛).
- **Y debería reemplazar a la *vista gerencia***, el agregado de cuenta de
  más abajo: el cliente lo dijo así, *"en verdad tiene que ser un rol
  gerencia general y ella tiene distintas vistas, distintos derechos"*.
  **Todavía no se sacó**: las cuentas que la tienen marcada siguen igual
  hasta que se definan los derechos de la gerencia y se decida a qué rol
  pasan.

### El gerente de operaciones (2026-11-12) — hoy *Encargado de operaciones*

El administrador del restaurante, sobre el encargado (lo pidió el cliente).
**Puede todo lo del encargado, más aprobar descuentos (`aprobar`) y
corregir un día cerrado (`corregir`)**, y edita cualquier reserva. No ve
configuración ni cuentas del panel: eso sigue siendo de quien paga y del
administrador, que en el panel es la cuenta técnica que puede todo. Se
elige en *Cuentas* y está en *Ver como…*.

**Llena la ficha completa del equipo y de los extras** (2026-11-12, lo
pidió el cliente: *"el encargado de operaciones debería poder ingresar el
perfil completo… la encargada de turno de caja no"*). Tiene el permiso
`sueldos`: modalidad, jornada, valor hora, propina y cuenta bancaria, en
`/equipo` y en `/extras`, con el mismo autoguardado. **Registrar pagos sigue
siendo de `pagar`**, y por eso en el informe sigue sin ver las cuentas para
transferir. **Los links personales tampoco van con esto** (`links`): son
una credencial, no un dato de la ficha.

**Y el encargado de turno también, el mismo día** (lo corrigió el cliente:
*"la encargada de turno también debería poder ingresar la ficha completa
del trabajador. Tiene todo el sentido. Solo ella no puede ver el
informe"*). `sueldos` va con los dos encargados; el de turno sigue **sin el
informe**, sin registrar pagos y sin links. Con eso ve también los montos
del día en la ventana del equipo, que salen de la misma ficha.

### Quién puede hacer qué (2026-10-21; el cuarto rol el 2026-10-22, el quinto el 2026-11-05)

Seis roles —el sexto, **anfitrión**, el 2026-11-11: ver "El rol de
anfitrión y la pantalla de Recepción"—, y la tabla vive en `PERMISOS`, en
`panel/src/lib/auth.ts`:

| | Administrador | Encargado | Pagos | Vendedor | Trabajador |
|---|---|---|---|---|---|
| Ver el calendario y las reservas | sí | sí | **sí** | **sí** | — |
| Anotar reservas nuevas (`anotar`) | sí | sí | **sí** | **— (por Cotizaciones, desde el 2026-11-12)** | — |
| Editar y borrar reservas | sí | sí | **sí** | **solo las suyas** | — |
| Abrir, agregar y editar días | sí | **— (desde el 2026-11-12)** | **sí** | — | — |
| **Subir el cupo de un día** (el encargado lo pide) | sí | **lo pide** | **sí** | — | — |
| Asignar turnos y editar la lista de trabajadores | sí | sí | **sí** | — | — |
| Confirmar el día: asistencia, montos, propina | sí | sí | **sí** | — | — |
| **Cerrar el día** (con la ventana de confirmación) | sí | sí | **sí** | — | — |
| Agendar actividades extras y confirmarlas | sí | sí | **sí** | — | — |
| Crear y mandar presupuestos, y ver el CRM del socio | sí | sí | **sí** | — | — |
| Montos habituales y cuentas bancarias de la ficha (los dos encargados desde el 2026-11-12) | sí | **sí** | **sí** | — | — |
| Puestos y su regla "uno cada N" | sí | — | **sí** | — | — |
| Precios, menús y configuración | sí | — | **sí** | — | — |
| **Links personales** | sí | — | **sí** | — | — |
| **Corregir un día cerrado** (con motivo) | sí | — | **sí** | — | — |
| Diagnóstico y Shopify a mano | sí | — | — | — | — |
| **Mandar la planilla semanal**, crear y renovar su link | sí | **sí** | **sí** | — | — |
| **La bitácora** | sí | — | **sí** | — | — |
| Cuentas del panel y sus contraseñas | sí | — | — | — | — |
| **El informe del equipo** (el gerente también: mira y marca boletas) | sí | **— (desde el 2026-11-12)** | **sí** | — | — |
| **Marcar la boleta** (también el gerente) | sí | — | **sí** | — | — |
| **Registrar que a alguien ya se le pagó** | sí | **—** | **sí** | — | — |
| Ver **sus propios** turnos | — | — | — | — | sí |

**El encargado de turno no agrega ni edita fechas** (2026-11-12, lo pidió
el cliente: *"puede agregar reserva, pero no puede agregar fecha ni
editar"*). Se le sacó el permiso `dias`: en el calendario no ve *Agregar
fecha* ni el *Editar/Abrir* de cada tarjeta —el pie queda con *Reservas* a
todo el ancho y *Equipo* debajo—, y las rutas de las fechas le responden
403. **Anotar una reserva sí**, aunque el día no esté en el calendario: eso
lo abre como privado, que es efecto de la reserva y no editar el
calendario. Lo que sí hace en el día quedó en un permiso propio,
**`operarDia`**: pedir más cupo desde el bloque de sobrecupo, soltar una
reserva por cupo y avisarle a una reserva cuando el día se libera para un
evento exclusivo.

**El encargado sí agrega trabajadores**: lo pidió el cliente explícitamente,
y desde el 2026-11-12 llena la ficha completa, con sueldo y cuenta. Lo que
no toca es el informe, los pagos, la configuración y las credenciales.

**El trabajador no figura en ninguna fila de la tabla de permisos, y ese es
el punto**: no hay una sola acción del panel que pueda ejecutar. Su acceso no
pasa por ahí.

**El menú se dibuja consultando esa misma tabla**, no una lista aparte de
"esto es de administrador". Con cinco roles, una segunda lista era una
segunda verdad: el día que alguien agregara un rol, el menú le ofrecería
puertas cerradas o le escondería las suyas. Al vendedor le aparece **una
sola pastilla**, Calendario, sin que nadie lo haya escrito en ninguna parte.

### El rol de vendedor: ve todo, toca lo suyo (2026-11-05)

> **Cambió el 2026-11-12: el vendedor ya no anota reservas directo** (lo
> pidió el cliente: *"él tiene que tomar el camino por cotizaciones… puede
> ver calendario, reservas, y sus reservas los puede editar, pero no puede
> simplemente agregar reservas"*). Una reserva suya pasa por la cotización
> —cómo se paga, el anticipo, con o sin contrato— y nace al ganarla. Es el
> permiso nuevo **`anotar`**, que tienen todos menos él: el `POST` de
> `/api/reservas` le responde 403 con *"se hacen por Cotizaciones"*, y donde
> estaba *Agregar reserva* ve **+ Cotizar una reserva** en la portada y
> **+ Cotizar este día** en la página del día, que abre la ventana de
> cotizar con ese día puesto (`/presupuestos?cotizar=<fecha>`). Sus reservas
> las sigue editando y borrando con `reservas`.

Lo pidió el cliente, y la frase trae ya la regla entera:

> *"Necesitamos otro rol de cuenta que es vendedor. Y el vendedor solo tiene
> que ver el calendario para poder agregar reservas, quitar reservas.
> Reservas que el vendedor mismo ha hecho. No puede quitar otras reservas que
> no él mismo está gestionando. Pero ver todo. Y en verdad no necesita ver
> nada más que esto."*

Es **la cuenta más acotada que entra al panel**: dos permisos, `ver` y
`reservas`, y ninguno más. Ni días, ni equipo, ni extras, ni presupuestos, ni
plata. En la barra le aparece una sola pastilla.

#### Lo que lo distingue no es un permiso: es un límite dentro de uno

Con `reservas`, cualquiera de los otros tres roles edita y borra cualquier
fila. Un vendedor solo las suyas — y eso **no cabe en la tabla de permisos**,
que contesta *qué acciones* y no *sobre qué filas*. Son dos preguntas
distintas, así que la segunda vive aparte, en `puedeTocarReserva()`, al lado
de `puede()`.

- **Ve todas**, que es lo que el cliente pidió: el límite es sobre lo que
  toca, no sobre lo que mira. En la tabla del día aparecen las tres, y las
  que no son suyas dicen **quién las anotó** en vez de dos botones apagados —
  un botón que no responde se lee como un panel roto, y saber a quién
  pedírselo es justamente lo que hace falta.
- **Vale para editar y para borrar.** El cliente nombró agregar y quitar;
  dejarlo editar la de otro sin poder borrarla sería media regla, porque
  podría cambiarle el nombre y las personas a cualquiera. **Marcar si alguien
  vino también es editar**, así que la ruta lo trata igual — y como marcar
  vive hoy solo en `/turnos`, un vendedor no marca a nadie: esa pantalla no
  es suya.
- **Lo comprueba la ruta**, no la pantalla: un encargado o un vendedor
  llamando la API directo recibe el mismo 403 que recibiría apretando el
  botón que no tiene.

#### La columna `Anotada por`, que es lo que hace posible la regla

Vive en `Reservas` y **se agrega sola** la primera vez (`asegurarColumna()`),
como la `Nota de pago` y el `ID Evento CRM`. Guarda **el nombre de la cuenta**
—el mismo con que firma la bitácora— de quien anotó esa reserva.

- **La escribe el servidor desde la sesión, nunca se acepta del navegador.**
  Ni al crear ni al editar: el `POST` la pone él y el `PATCH` la descarta. Si
  se aceptara, un vendedor podría adjudicarse la reserva de otro y después
  borrarla, que es exactamente lo que esto impide.
- **Una reserva sin dueño no es de nadie, y por lo tanto tampoco suya.** Lo
  están todas las de Shopify —las anota el webhook, no una persona— y todas
  las que ya estaban en la planilla antes de que existiera la columna. Es el
  valor por defecto correcto: un vendedor no tomó ninguna de ésas. El error
  contrario —que un vendedor nuevo pudiera borrar el historial completo— es
  mucho más caro.
- **El sincronizador de Shopify no la pisa**, igual que la asistencia y la
  nota de pago: un pedido que se actualiza le borraría el dueño a la fila.
- **Se asegura siempre al crear una reserva**, no solo cuando viene con
  valor, por lo mismo que el `ID Evento CRM`: si se creara recién al anotar
  la primera de un vendedor, la fila que la estrena sería justamente la que
  no encuentra la columna.
- **El emparejamiento ignora mayúsculas, tildes y espacios al borde**, como
  el resto del panel. La contra a asumir: **dos cuentas con el mismo nombre
  comparten reservas.** Es el mismo supuesto que ya tenía la bitácora —*"una
  cuenta por persona y no una compartida"*— y la pantalla de cuentas lo dice.

#### De paso: `ver` estaba abriendo cuatro puertas que no eran suyas

Y esto es lo que vale guardar del cambio, porque no se veía. Cuatro rutas que
**no devuelven reservas** se contentaban con `ver`: el equipo, las
actividades extras, los presupuestos y los eventos del socio. Para los tres
roles que había daba exactamente lo mismo —los tres tenían todo— así que
nadie lo notó en un año de archivo.

Al entrar el vendedor se volvió la diferencia entre *"ve el calendario"* y
*"ve los teléfonos del equipo y lo que cobra cada jinete"*. Cada una pide
ahora **el permiso de su propia pantalla**, y para los otros tres roles no
cambió nada. Hay una prueba que lo fija.

La regla que deja: **un permiso que se llama como una pantalla tiene que
gobernar esa pantalla y nada más.** Un `ver` que además abría el equipo era
un permiso que no decía la verdad, y eso solo se descubre el día que aparece
un rol que no puede todo.

#### Las pantallas no dibujan lo que la cuenta no puede leer

Las dos a las que llega —el calendario y la página de un día— **no piden** lo
que va a devolver 403, y **no dibujan** el bloque correspondiente: ni el
equipo, ni las extras, ni lo cotizado, ni lo del socio. No es la protección
—cada ruta vuelve a preguntar— es que un bloque vacío con un botón apagado se
lee como un panel roto y no como una puerta cerrada. La tarjeta del
calendario, por lo mismo, **no tiene dorso** para quien no ve el equipo: un
botón que da vuelta la tarjeta para mostrar una cara en blanco es peor que no
tenerlo.

El rol y el nombre de la cuenta bajan **desde el servidor**, en `page.tsx` y
en `dia/[fecha]/page.tsx`, y las pantallas preguntan con `puede()` — la misma
tabla que usan el menú y las rutas, para que no haya una segunda verdad.

#### Se comprobó rompiéndolo, y de punta a punta

Tres mutaciones, y cada una tumba pruebas distintas: dejar que el vendedor
toque cualquier reserva **falla 3**; hacer que un usuario vacío calce con una
fila vacía **falla 1** —la que dice que eso abriría todas—; y meter al
vendedor en el permiso del equipo **falla 3**, incluida la que lista sus
permisos completos.

Y contra el panel corriendo, con dos cuentas de vendedor y una de encargada:

```
vendedor  /api/ocupacion /api/reservas /api/fechas  → 200
          /api/equipo /api/extras /api/presupuestos /api/crm/eventos → 403
          /api/informe /api/config /api/menus /api/usuarios → 403
          POST /api/fechas (abrir un día)                   → 403

Verónica edita la suya              → 200
Verónica edita la de Hugo           → 403 "Esa reserva la anotó Hugo el vendedor"
Verónica borra la de Shopify        → 403 "Esa reserva no la anotaste tú"
Carla (encargada) edita la de Hugo  → 200
Verónica anota una nueva            → queda con "Anotada por: Verónica la vendedora"
                                       y la borra ella misma → 200
```

En pantalla, a 1280 y a 393 en los dos temas: el menú del vendedor es una
pastilla, la tarjeta no trae *Equipo* ni *Editar*, la página del día no trae
los bloques de equipo ni de extras, y de las tres reservas solo la suya
muestra *Editar* y *Borrar* — las otras dicen *La anotó Hugo el vendedor* y
*No la anotaste tú*. Ninguna pantalla se corre de lado.

### El rol de anfitrión y la pantalla de Recepción (2026-11-11)

Lo pidió el cliente: la persona que recibe a la gente en la entrada, *"con
un tablet en la mano"*, que *"solo tiene que poder ver las reservas y decir
vino o no vino. Por ahora"*. El rol se usa **solo el día de apertura**.

- **Un solo permiso, `asistencia`**, y una sola pantalla, **`/recepcion`**.
  No tiene `ver`: no ve el calendario, otros días, montos ni contactos. Al
  entrar, el middleware la manda a `/recepcion`. *Recepción* aparece también
  en el menú de quien tiene `asistencia` (administrador, encargado, pagos).
- **`/api/recepcion`** devuelve solo las reservas de **hoy** que ocupan
  lugar, con nombre, personas, menús, si vino, cuántos llegaron y el aviso.
- **La pantalla**: tres números grandes (*llegaron N/M personas · reservas
  por llegar · no vinieron*), un buscador, y una tarjeta grande por reserva
  —las que faltan arriba— con **✓ Llegó** y **✕ No vino**. *Llegó*
  pregunta **¿Llegaron las N?**: *Sí* de un toque, o − / + si llegaron más
  o menos. **Avisar al jefe de turno** deja un texto corto.
- **"Llegaron 4 de 6" no cambia la reserva**: queda en la columna nueva
  `Llegaron` y deja solo un `Aviso recepción` (*"13:40 · Llegaron 4 de
  6"*). El jefe de turno decide si la ajusta, editándola como siempre; así
  el panel cuadra con **Fudo**, donde se cobra la mesa.
- **Lo que la anfitriona no toca** —personas, menús, pago, anotar o borrar—
  no tiene botón. En la ruta (`/api/reservas/[fila]`), con `asistencia`
  solo pasa un cambio que sea únicamente `asistencia`, `llegaron` y
  `avisoRecepcion`; cualquier otro responde *"Eso no lo puedes cambiar tú:
  avísale al jefe de turno"*. Y solo de hoy.
- **Todo lo de la entrada se anota desde la hora de apertura de ese día**
  (`yaAbrio()` en `cierres.ts`, con pruebas), para la anfitriona **y para
  el jefe de turno**: *"no puede ser ningún riesgo que influyan en algo que
  está aún en el futuro"*. La hora es la del día en `Fechas Hábiles` o la de
  Configuración. Antes, la pantalla lo dice y no muestra los botones; un día
  cerrado, igual.
- **Dónde lo ve el jefe de turno**: en la página del día, una franja ámbar
  *📣 Recepción: …* sobre la reserva, con **Editar la reserva** y
  **✓ Resuelto** (que vacía el aviso), y *llegaron N* bajo las personas; lo
  mismo en la cara *Reservas* de la ventana del día en `/turnos`; y arriba
  del calendario de la portada, *📣 La recepción dejó N avisos hoy*.
- **El celular es la pantalla número uno**, y la tablet la segunda (lo
  pidió el cliente). Los tres números y el buscador **quedan fijos arriba**
  al bajar; una reserva ya marcada se achica a **una línea** con *Cambiar*,
  para no recorrer las que ya entraron; la frase de "para cambiar personas,
  menús o el pago" va una vez arriba y no en cada tarjeta; y en el contador
  *Llegaron N* va en su propia línea, para que entre a 360px. Desde 768px
  las tarjetas van en dos columnas. Comprobado a 360, 393, 820 y 1180 sin
  corrimiento lateral.
- **Pendiente, a propósito**: *"Llegó alguien sin reserva"*. El cliente lo
  dejó para después.

### El middleware autentica, cada ruta autoriza

Son dos preguntas distintas —"¿quién eres?" y "¿puedes hacer esto?"— y las
contesta código distinto a propósito. Si el permiso se comprobara solo en el
middleware, **cualquier forma de saltárselo abriría de una vez todas las
rutas**: es la forma exacta del CVE-2025-29927, el que obligó a subir Next
hace unos días.

Por lo mismo, **el rol se vuelve a derivar de la cookie firmada en cada
ruta**, en vez de leerlo de una cabecera que ponga el middleware: una
cabecera la puede mandar cualquiera.

De ahí salió un arreglo concreto: `/api/shopify/sincronizar` se contentaba
con un `x-panel: si`, confiando en que el middleware ya había pedido la
contraseña. **Eso dejó de alcanzar cuando el panel pasó a tener más de un
rol**, porque un encargado podía agregar esa cabecera a mano. Ahora comprueba
el permiso de verdad.

`GET /api/config` y `GET /api/menus` también son de administrador: un
encargado que entrara a esas pantallas las vería cargar y fallar en cada
guardado. Ahora le dicen "esta parte no es tuya", que es lo que pasa.

### Cuentas con nombre y sesión (2026-10-21)

**La autenticación básica se jubiló.** Hasta ese día el panel usaba la
ventanita del navegador con una clave por rol. La reemplazó una **cookie de
sesión firmada**, y el motivo no es estético: **la bitácora la necesitaba.**
Con una clave compartida, cada línea del registro decía "lo hizo un
encargado" y no servía para preguntarle a nadie.

Lo que se gana de paso, y que la autenticación básica nunca tuvo:

- **Un botón de cerrar sesión.** Antes había que cerrar el navegador entero,
  o sea que en un equipo que comparte dispositivos el turno siguiente
  entraba como el anterior — justo lo que la bitácora necesita que no pase.
- **Saber con qué cuenta estás adentro**: el nombre va en la barra.

Las piezas y por qué están separadas así:

| Archivo | Qué hace | Dónde corre |
|---|---|---|
| `sesion.ts` | Firma y lee el token (WebCrypto) | Middleware **y** rutas |
| `usuarios.ts` | Verifica contraseñas (`scrypt`, `node:crypto`) | Solo rutas |
| `permisos.ts` | Resuelve quién llama y si puede | Rutas |

**`sesion.ts` usa WebCrypto y no `node:crypto` porque el middleware corre en
Edge**, donde `node:crypto` no existe. Verificar una contraseña pasa una sola
vez, al entrar, en una ruta normal; leer la sesión pasa en cada petición,
también en el middleware. De ahí la división, y por eso todo en `sesion.ts`
es asíncrono.

**La misma trampa, del otro lado:** `ROLES_DE_CUENTA`, `LARGO_MINIMO_CLAVE` y
`ENCARGADO_COMPARTIDO` viven en `auth.ts` y no en `usuarios.ts` porque los
importa un componente de navegador, y un `import` desde el cliente arrastra
`node:crypto` al bundle y tumba el build. **Lo que toque el navegador no
puede importar `node:crypto`**, ni directo ni a través de otro archivo.

Detalles que vale la pena tener escritos:

- **La sesión dura 7 días** (decidido con el cliente el 2026-10-21).
- **El rol viaja firmado dentro del token**, para no consultar la planilla en
  cada petición. El costo a asumir: **desactivar a alguien no corta su sesión
  en curso.** Para echar a alguien ya mismo hay que cambiar `PANEL_CLAVE` o
  `SESION_SECRETO`, lo que cierra **todas** las sesiones.
- **El token está firmado, no cifrado.** Cualquiera que lo tenga puede leer
  qué usuario y qué rol dice; da lo mismo, porque esa persona ya tiene la
  sesión entera. Lo que importa es que no pueda **cambiarlos**, y eso lo
  impide la firma — hay una prueba que intenta ascenderse a admin editando el
  payload y rebota.
- **Si no hay `SESION_SECRETO`, se deriva de `PANEL_CLAVE`.** No es comodidad:
  sin eso, el primer despliegue después del cambio habría dejado a todos
  afuera hasta que alguien creara una variable nueva. La consecuencia:
  **cambiar `PANEL_CLAVE` cierra todas las sesiones abiertas.**
- **Las contraseñas se guardan como huella `scrypt`, nunca en claro**, ni
  siquiera para el administrador. La huella vive en la planilla, así que un
  SHA pelado se rompería con un diccionario; `scrypt` hace que cada intento
  cueste.
- **El panel no tiene límite de intentos.** Vercel no trae uno y montarlo con
  funciones sin estado compartido daría una falsa sensación de protección.
  El freno real es el **largo mínimo de 12 caracteres** al poner una
  contraseña.
- **Un usuario que no existe y una clave equivocada dan el mismo mensaje.**
  Distinguirlos diría cuál de las dos mitades se acertó.
- **`PANEL_USUARIO` / `PANEL_CLAVE` siguen siendo una cuenta de
  administrador**, y no se quitan nunca: es la puerta de emergencia para el
  día en que la planilla no responda o alguien borre la última cuenta.
- **`PANEL_ENCARGADO_*` sigue funcionando**, para no romper lo que ya estaba
  configurado, pero en la bitácora aparece como **"encargado (clave
  compartida)"**. Es a propósito: una línea así no identifica a nadie y
  conviene que se note.
- **Desactivar a alguien es mejor que borrarlo**: sus líneas de la bitácora
  siguen diciendo quién fue.

### La bitácora

Una pestaña `Bitácora` con cuándo, quién, rol, acción y detalle. Se lee en
`/bitacora` (las últimas 200; el resto se busca en la planilla).

- **Se escribe desde el servidor, nunca desde la interfaz.** Una llamada
  directa a la API tiene que quedar registrada igual que un clic; si
  dependiera del navegador, bastaría con no usarlo.
- **Queda el rastro, no el valor anterior.** Guardar el antes y el después
  sería un historial completo, otra cosa y mucho más pesada. Esto sirve para
  saber a quién preguntarle, no para deshacer.
- **Si la anotación falla, la acción NO se revierte.** Es una decisión con
  filo: puede quedar un cambio hecho y sin registrar. La alternativa
  —cancelar la reserva que alguien acaba de anotar porque la planilla no
  aceptó una línea de registro— es peor para el negocio, y el fallo queda en
  los logs de Vercel.
- **Las horas son de Chile**, no UTC. Una línea que diga 03:40 cuando en el
  local eran las 00:40 manda a buscar al turno equivocado, y el servidor de
  Vercel no está en Chile.
- **Los tokens de los links personales no se anotan**: la bitácora la lee
  gente, y una credencial copiada ahí sería una credencial más dando vueltas.
- El costo a asumir: **una escritura más a la planilla por cada acción.** Con
  este volumen no se nota.

### El link personal del trabajador

`/mi/<token>`. Se manda por WhatsApp y no pide contraseña ni correo. Se
administra desde `/equipo`, columna **Link personal**: crear, copiar, renovar
y quitar — **el administrador y quien paga** (permiso `links`), aunque el
encargado sí edite la lista. Un encargado ni siquiera recibe los tokens: la
ruta se los borra de la respuesta.

**Si alguien de pagos no ve el botón *Crear link personal*, casi seguro su
sesión dice encargado** (pasó con la cuenta de Felipe el 2026-11-03). El rol
viaja firmado dentro de la sesión, que dura 7 días: cambiarle el rol en
`/usuarios` no toca la sesión que ya tiene abierta. Se arregla con *Salir* y
volver a entrar. El rol con que se entró se lee arriba a la derecha, junto
al nombre.

#### Un solo botón, y siempre el mismo (2026-11-04)

Lo pidió el cliente: *"se debería copiar lo más fácil posible… si se puede
hacerlo sin crear el link y luego tener que copiarlo, sino directamente
copiar el link"*.

Eran dos botones según el estado —**Crear link personal** la primera vez,
**Copiar link personal** después— y esa diferencia **era nuestra, no suya**:
por dentro `crear` ya copiaba. Quien abre una ficha para mandarle el link a
alguien viene a una sola cosa, y tenía que aprender que la primera vez el
botón se llamaba distinto. Hoy dice siempre **Copiar link personal**, y si no
hay token lo crea y lo copia en el mismo clic. *Renovar* y *Quitar link*
aparecen solo cuando ya hay uno, que es cuando significan algo.

**No contradice que un link sin contraseña tenga que ser una decisión**: eso
vale para la **planilla semanal**, que abre datos de todo el equipo. Éste es
de una persona y **nace para mandarse**, igual que el documento de un
presupuesto, que también crea su token al crearse.

**Y el nombre se queda en "link personal"**, que es lo otro que el cliente
cerró ese día: la página ya no es solo lo que ganó, también son los turnos
que vienen, así que llamarlo "sus datos de sueldo" la nombraría a medias.

**En la misma pasada, la ficha entera pasó la regla PlayStation**: de **16
textos bajo 13px a cero**. Los peores eran los siete rótulos de la cuenta
bancaria, a **10px** — el campo donde un dígito mal leído manda la plata a
otra cuenta. Y *Quitar*, *Desactivar*, *Activar* y *Descargar planilla*
dejaron de escribirse su propio botón a mano y usan `.boton`, que es para lo
que existe.

**El `?` de la ayuda salió de adentro del rótulo**: le comía 30px a la caja
de 144 y "LINK PERSONAL" se partía en dos líneas mientras "PAGO" y
"TRANSFERENCIA" iban en una — la misma etiqueta viéndose distinta según qué
tuviera al lado.

Se eligió sobre una clave compartida de solo lectura por una razón concreta:
**cuando el panel tenga sueldos y ajustes, una clave compartida dejaría que
cualquier trabajador viera lo que gana y lo que le descontaron a todos los
demás.**

- **El token se guarda tal cual en la planilla, no como hash, y es a
  propósito.** No es una contraseña: es un link que el administrador tiene
  que poder volver a copiar cuando alguien lo pierda. Con un hash habría que
  renovarlo cada vez, o sea cambiarle el link a la persona por haberlo
  extraviado. Quien ve la planilla ya es el administrador.
- **Renovar invalida el anterior en el acto**, que es lo que hay que hacer
  cuando alguien pierde el teléfono.
- **Desmarcar "activo" también cierra la puerta.** Si no, alguien que se fue
  seguiría viendo la planificación.
- **Un token vacío no encuentra a nadie**, aunque haya trabajadores sin
  token. Si calzara, entrar a `/mi/` sin nada detrás abriría la ficha del
  primero de la lista.
- **Un link inválido y uno revocado dicen lo mismo.** Decir "ese link ya no
  sirve" confirmaría que existió, y a quien sí es trabajador no le sirve de
  nada: la salida es la misma, pedir otro.
- La página **lee la planilla directo, sin pasar por una ruta de API**, así
  que no hay ningún endpoint nuevo que se pueda llamar con un token prestado
  para sacar datos en bruto. Lo único que sale es el HTML de una persona.
- **Degrada en vez de reventar**: si no se pueden leer las reservas o las
  fechas, igual muestra los turnos. Y una lista de trabajadores vacía se
  reporta como "no se pudo cargar", no como "tu link no sirve", porque no
  existe el caso de un token válido con la lista en cero.
- En `/mi/` **no se dibuja la barra del panel**: todos sus enlaces le
  pedirían una contraseña que no tiene.

**Lo que ve el trabajador**: qué día, a qué hora, en qué puesto, cuánta
gente se espera y **qué menús hay que preparar** — "30 × Tradiciones · 8 ×
Niños".

El desglose por menú lo pidió el cliente el 2026-10-21 pensando en la
cocina, y **va para todos los puestos por igual**, también por decisión
suya: saber qué viene sirve lo mismo para montar las mesas que para calcular
la parrilla, y hacer dos versiones de esta página sería mantener dos.

**No ve reservas, ni nombres de clientes, ni lo que pagó nadie, ni a los
demás trabajadores.** Los totales por menú son cuánto hay que cocinar; quién
lo pidió y cuánto pagó no es dato de un turno. **Su propia plata sí la ve
entera** —y es a lo que viene; ver abajo.

#### Es un estado de cuenta, no una agenda con montos al final (2026-11-03)

Lo pidió el cliente mirando el link y diciendo que **no mostraba los
sueldos**: *"la idea de crear link personal tiene que ser que cada
trabajador ve de forma fácil, recuerdo a la regla PlayStation, el resumen de
lo que ganó, que pueda filtrar por cada semana, mensual… eso es su
herramienta para controlar: oye, se ingresó todo el dato correcto de cuándo
trabajé, cuánta propina gané y qué me han pagado a la cuenta"*.

**Los sueldos sí estaban, y aun así tenía razón**, por cuatro razones que se
sumaban:

1. **El dinero iba abajo de todo**, después de los turnos que vienen. Con
   tres turnos asignados había que pasarlos todos para llegar.
2. **Si nadie había pasado lista, no aparecía nada.** El bloque se dibujaba
   solo con días de asistencia marcada, así que a quien no le hubieran
   cerrado sus días la página le salía **sin una sola cifra y sin nada que
   dijera por qué** — el modo de falla más caro que hay, porque se lee como
   que la página está mala.
3. **No se podía filtrar**: eran 30 días fijos hacia atrás.
4. **Lo que le pagaron no estaba.** La pestaña `Pagos` existía desde el
   2026-11-01 y esta página **nunca la leía**, o sea que no podía contestar
   justo la pregunta por la que se abre.

Ahora el orden es el otro: **primero su plata, después los turnos que
vienen.** Las tres preguntas y dónde se contestan:

| Pregunta | Dónde |
|---|---|
| ¿Cuándo trabajé, y quedó bien anotado? | el día por día, **con los días sin cerrar a la vista** |
| ¿Cuánta propina gané? | su azulejo, y su línea en cada día |
| ¿Qué me pagaron a la cuenta? | el bloque de pagos, con lo que falta |

##### Abre en la semana pasada

Lo fijó el cliente: *"es la semana pasada, no la actual… porque lo primero
que quiere ver es la semana pasada"*. Y el motivo es el calendario del pago:
se paga el lunes la semana que terminó el domingo, así que la semana que le
están pagando es la pasada, no la que va corriendo.

**Se evaluó abrir en la semana más reciente con días trabajados** —que era
la forma de no mostrar nunca una pantalla vacía— y se descartó: a quien no
trabajó hace un mes le abriría un periodo de hace un mes sin que lo haya
pedido, y entonces los números que ve no son de cuando cree. Es mejor abrir
siempre en el mismo lugar y que una semana sin nada **lo diga con
palabras**, que es lo que ahora hace.

##### El filtro no usa una línea de JavaScript

El periodo viaja en la URL —`?p=2026-11-10` una semana, `?p=2026-11` un
mes— y las pastillas son enlaces. Es un componente de servidor, así que no
hacía falta nada más; misma idea que el selector de idiomas del sitio
público, que es un `<details>`.

- **La semana pasada y la actual van siempre**, tengan algo o no: son las
  dos que alguien quiere mirar, y "todavía no hay nada" es un dato. Las
  demás aparecen solo si tienen turnos, porque una pastilla que lleva a una
  pantalla en blanco enseña a desconfiar de las otras.
- **Se recortan a cuatro semanas y tres meses**, por lo mismo que el menú
  del panel dejó de ser una lista: veinte pastillas no son un filtro.
- **El periodo llega de afuera, así que se comprueba** (`esPeriodo()`).
  `?p=chao` se ignora y abre en el de siempre, en vez de armar un rango con
  `NaN` y verse vacío sin decir por qué. Un periodo más atrás que las
  pastillas **se agrega a la lista**: sin eso estaría mirando un periodo y
  ninguna pastilla se vería elegida, que se lee como que el filtro se rompió.
- **Las cuentas salen de `informeDelPeriodo()`**, la misma función con la
  que quien paga arma su planilla. Es a propósito: si la persona y quien le
  paga vieran números calculados por caminos distintos, el día que no
  coincidan nadie sabría cuál creer.

##### Los días sin cerrar se muestran

Antes se filtraban y desaparecían. **Es media razón de ser de la página**:
sirve para controlar que el dato esté bien, y un sábado que nadie cerró es
justamente lo que hay que poder ver para ir a reclamarlo. Va con su pastilla
ámbar en el día, y arriba un aviso que dice cuántos son y que no están
contados.

##### El pago que no cabe en el periodo

`cuentaEnPeriodo()` tiene escrita una contra desde que nació: un pago cuenta
solo si **cabe entero** en lo que se está mirando, así que uno registrado
por una quincena no aparece al mirar una de sus semanas. Para quien paga eso
es una nota al pie; para el trabajador que abre su link es **"no me
pagaron"**, que es lo contrario de lo que pasó.

Se resolvió **nombrando el caso**, no cambiando la regla —repartir un pago a
prorrata sería inventar: nadie pagó "un tercio del martes"—. Y dos detalles
que costaron una pasada:

- **El aviso va pegado a los azulejos, no al final de la lista de pagos.**
  Al mirar un mes con una quincena pagada, los azulejos dicen *"Te pagaron
  $0 · Te falta $68.000"*, que es cierto para ese periodo y se lee como un
  error. La explicación tiene que estar donde está la duda.
- **No dice a dónde ir a buscarlo.** La primera versión decía "míralo en el
  mes", y una quincena que cruza de mes no cabe en **ningún** periodo que
  las pastillas ofrezcan: era un consejo que no funciona justo en el caso
  que lo dispara. Dice qué es y que no está sumado, que sí es siempre
  verdad.

##### Lo que no cambió

**Sigue sin mostrar a los demás trabajadores, ni clientes, ni reservas, ni
las actividades extras**, y hay pruebas que lo fijan — incluida una de que
el aviso del pago que no cabe tampoco delata el de otra persona. El sueldo
de un contratado sigue sin salir de acá.

#### El desglose de cada día (2026-11-01)

Lo pidió el cliente: que al abrir su link la persona *"ve todos sus datos de
forma ordenada, cuánto por turno, cuánto propina, cuánto se le restó por
alguna razón, los extras"*.

Cada día del periodo es una tarjeta. Hasta ese día era
**una línea con una sola cifra** — que es justo la que no se puede revisar:
quien ve $35.000 y esperaba $40.000 no tiene cómo saber si le descontaron
algo, si le pagaron horas extra o si está mal. Ahora cada día es una tarjeta
con la jornada, las horas extra con su cálculo (`2 × $4.000`), **cada ajuste
con su motivo**, la propina y el total.

- **El motivo es la parte que importa.** Es lo único que explica un
  descuento un mes después, y es exactamente para esto que se escribe al
  cerrar el día. Cada ajuste va en su línea: sumarlos en una sería volver a
  esconder el porqué. Sin motivo escrito dice *Descuento* o *Extra* según el
  signo, no un guion mudo.
- **Acá la propina SÍ va sumada en el total**, al revés que en las cuentas
  del negocio: para quien la recibe es todo lo mismo. Mostrada aparte, eso
  sí, y **arriba del total y no debajo** — un total seguido de otra cifra se
  lee como si esa otra no estuviera contada, que es la duda que esto viene a
  sacar.
- **Los montos negativos llevan el signo adelante** —`−$20.000`— y en rojo,
  la misma convención del resto del panel.
- **Si los pedazos no suman el total, la página lo dice.** `pagoDe()` nunca
  baja de cero, así que un descuento mayor que la jornada deja ese día en
  cero y deja de cuadrar. Es raro; callarlo haría que la persona sumara con
  la calculadora y le diera otra cosa.
- **Sigue sin mostrar lo de nadie más**, y las actividades extras siguen sin
  aparecer acá: el desglose es de sus propios turnos.

#### Lo que gané y lo que viene: dos pestañas, semanas con nombre (2026-11-04)

Lo pidió el cliente: que se distinga bien qué semana se está mirando, con
flechas para ir *"próxima semana, próxima semana"*, y **un botón presente
para las semanas futuras** con lo básico de cada turno.

- **Arriba, dos botones grandes**: **💰 Lo que gané** y **📅 Lo que viene**
  (`?v=viene`), con cuántos turnos vienen en una cuenta dorada. Antes lo que
  viene estaba al pie, debajo de todas las cuentas.
- **La semana elegida va en grande, con su nombre** —*Semana pasada*, *En
  curso*, *Próxima semana*, *Hace 3 semanas*— y **flechas ◀ ▶ de 48px sin
  tope**. Sigue abriendo en la semana pasada, que es la que se paga.
- **Debajo, la escalera de semanas** (`escaleraDeSemanas()`): la próxima, la
  en curso y la pasada siempre, y las demás solo si tienen turnos. Cada fila
  dice si tuvo actividad —*2 días · $71.000*, *1 turno por venir*, *sin
  turnos*—. La en curso va rellena de dorado con un punto que late; la
  pasada en verde, porque es la que te pagan; las que vienen en celeste.
- **Un turno que viene es una tarjeta grande**: el día, el puesto, **el
  pronóstico** (ícono, máxima y en palabras), desde qué hora, **cuánta gente y
  cuántas reservas**, y qué se prepara. Ni nombres ni montos de clientes: es
  cuánto trabajo viene, no de quién. Un día de preparación lo dice.
- **El pronóstico lo pide el servidor** a MET Norway, con la misma caché de
  una hora que `/api/clima`; si no responde, la página sale igual sin el
  ícono. Llega a unos 9 días.
- **En la semana en curso, los turnos que todavía no llegan van arriba**, en
  *Por trabajar*, y ahí no se dice "no hay nada anotado": debajo de turnos
  que vienen se leía como que algo falló.
- **Se probó con una copia de la página sobre datos falsos**, porque `/mi`
  lee la planilla directo y no hay ruta que simular. A 393px no se corre de
  lado, y tres ▶ desde la semana pasada llegan a *En 2 semanas*.

### Lo que falta decidir

- **De dónde sale el monto de la propina.** Hoy lo escribe a mano un
  encargado al pasar lista, que es lo que pidió el cliente. Si alguna vez
  llega por Shopify, habría que decidir si se lee de ahí o se sigue
  escribiendo.
- **Ojo con los descuentos por atraso**: el panel los registra sin problema,
  pero si ese monto se descuenta de una liquidación formal, los descuentos al
  sueldo tienen reglas en Chile. Conviene confirmarlo con quien les lleve la
  contabilidad antes de usarlo así.
- ~~Si "el encargado de pagos" no es el administrador~~ — **resuelto el
  2026-10-22**: existe el rol `pagos`, que desde el 2026-11-01 es el
  encargado más la plata — ver "El rol de pagos".

## El panel se explica solo (2026-10-30)

Lo pidió el cliente: *"tenemos que pensar también sobre un sistema de
enseñanza interactiva dentro del sitio para los que lo acceden la primera
vez… signo de interrogación, clic, quiero aprender más y se abre y aprendo
más sobre esto"*.

Son dos cosas separadas y conviene no confundirlas: **una tira que se ofrece
al llegar** y **un `?` que se pide cuando hace falta**.

### Todos los textos viven en `ayudas.ts`

Si cada pantalla escribiera su explicación dentro de su JSX, corregir el tono
o una palabra sería recorrer doce archivos, y nadie podría leer de una
sentada lo que el panel le está enseñando a la gente. Juntos se leen enteros
y se corrigen en un lugar.

Cómo están escritos, que es la parte que importa:

- **Dicen qué se hace, no qué es.** *"Acá se mira cómo viene la ocupación"*
  sirve; *"esta pantalla muestra una grilla de fechas"* no le sirve a nadie.
- **Sin palabras del oficio.** Ni endpoint, ni registro, ni sincronizar.
- **Cortos**: dos o tres párrafos, unos pasos numerados y un *Ojo* con la
  única advertencia que conviene leer antes de tocar algo. Una ayuda larga no
  se lee, y una que no se lee es peor que ninguna porque ocupa el lugar de la
  buena.
- **No inventan datos del negocio.** Ningún precio, ningún horario, ninguna
  capacidad: eso sale de la planilla y cambia. Acá se explica el panel.

Hay una por pantalla —calendario, día, turnos, equipo, extras, informe,
menús, configuración, cuentas, bitácora— más una para **marcar quién vino**,
que es lo único que de verdad se aprende dentro de la ventana del día.

### El `?` se pide, no aparece

No hay globitos que salgan solos ni carteles que haya que cerrar: quien ya
sabe usar el panel no ve nada distinto, y quien no sabe tiene el mismo signo
en el mismo lugar en todas las pantallas. **Una ayuda que interrumpe se
aprende a cerrar sin leerla.**

### El recorrido: cuatro pantallas, ofrecido dos veces

**Son pantallas de texto, no globitos flotando sobre la página**, que era la
otra forma de hacerlo. Un globito hay que anclarlo a algo que esté a la
vista: en un teléfono la mitad quedan fuera de pantalla, y si alguien hace
scroll el globito apunta al aire. Cinco pasos leídos de corrido no se rompen
nunca. Cada uno con un enlace para ir a ver la pantalla de la que habla, y
unos puntos que dicen cuánto falta — sin eso, *Siguiente* podría ser el
segundo de cuatro o el segundo de veinte, y la diferencia es si alguien sigue
o se sale.

**Se ofrece dos veces y no más.** Una sola oferta se la pierde quien entró
apurado; una oferta eterna se vuelve parte del fondo y deja de verse. Quien
lo termina o lo cierra no lo ve nunca más, y de todas formas se puede volver
a abrir desde el `?` del calendario, que es donde vuelve quien se perdió.

**Se recuerda en `localStorage`, o sea por navegador y no por persona.** Si
el equipo comparte un teléfono, la tira aparece una vez para ese teléfono.
Hacerlo por persona obligaría a escribir en la planilla cada vez que alguien
mira un cartel, y eso no vale lo que cuesta.

**No aparece en `/mi/`, en `/semana/` ni en la entrada**: las tres las abre
gente que no administra nada, y un recorrido por el panel sería ofrecerle una
visita a una casa en la que no vive.

### La página quedaba trabada al cerrar dos ventanas (2026-10-30)

Lo reportó el cliente, y el síntoma es tan raro que vale tenerlo escrito
entero: **se abría el día en `/turnos`, dentro la ficha de alguien, se
cerraba la ficha con *Cancelar* y el día clicando afuera — y la página
quedaba trabada, sin poder subir a ver el menú.** Había que recargar.

El `body` se quedaba en `overflow: hidden`, que es lo que `Dialogo` le pone
mientras hay una ventana abierta. Reproducido con Playwright antes de tocar
nada: con las dos ventanas ya cerradas, `document.body.style.overflow`
seguía diciendo `hidden`.

**La causa son dos, y las dos valen como regla.**

**Un valor compartido no se puede guardar por copias.** Cada ventana
guardaba por su cuenta "cómo estaba el scroll antes de abrirme", y con dos
abiertas la segunda guardaba `hidden` —puesto por la primera— como si fuera
el estado original. Bastaba con que los efectos corrieran en cierto orden
para que la de abajo terminara restaurando `hidden` al cerrarse. Ahora el
valor lo guarda **la primera que abre** y lo restaura **la última que
cierra** (`trabarElFondo` / `soltarElFondo`), que es lo que de verdad
significa "mientras haya una ventana".

**Y una función escrita en el JSX es una función distinta en cada
dibujado.** `onCerrar` estaba en las dependencias del efecto, y todas las
pantallas lo pasan como `onCerrar={() => salir()}`: el efecto se desmontaba
y se volvía a montar constantemente. Eso rompía las dos cosas que ese efecto
cuida — el scroll, y **la pila de Escape**, porque al re-montarse la ventana
de abajo se sacaba y se volvía a poner *encima* de la de arriba, así que
Escape cerraba la equivocada. Hoy `onCerrar` vive en una `ref` y el efecto
corre **una vez por ventana**.

Comprobado después del arreglo, en los cuatro caminos de cierre —Cancelar,
clic afuera, Escape y *Listo*— y en la ventana de ayuda: el `body` queda
libre, la rueda vuelve a subir, y dos Escape cierran una ventana cada vez,
empezando por la de encima.

### Una ventana hereda el estilo de donde está escrita (2026-10-30)

Vale tenerlo anotado porque el síntoma es llamativo y la causa no se parece:
**la primera versión mostraba toda la ayuda EN MAYÚSCULAS Y EN NEGRITA**.

El `?` vive al lado del título de la pantalla, o sea **dentro de un `<h1>`
con `uppercase`**, y una ventana modal se dibuja donde está escrita, no en la
raíz del documento: hereda `text-transform` como cualquier otro elemento.
Tres párrafos gritados son ilegibles.

Se arregla en `Dialogo` —`normal-case font-normal tracking-normal`— y no
sacando el `?` del título, porque cualquier ventana que mañana se abra desde
otro lugar tendría exactamente el mismo problema.

### Los `?` chicos, uno por cosa (2026-11-11)

Lo pidió el cliente: *"mejor un signo de interrogación más y que explica esta
sección específica en corto que solo un gran signo de interrogación arriba y
tengo que leer todo el chorizo"*. Además del `?` de cada pantalla, ahora hay
**`AyudaCorta`**: un `?` de 30px al lado de un rótulo o un botón, que abre
dos o tres frases sobre **esa sola cosa**.

- **Los textos viven en `AYUDAS_CORTAS`**, en `ayudas.ts`, junto a los de
  pantalla. Regla extra: si una frase bajo el campo ya lo dice, no va `?`.
  Configuración, por eso, casi no tiene: cada campo ya trae su línea.
- **`Campo` acepta `ayuda="llave"`** y pone el `?` junto al rótulo.
- **La cajita va en un portal** (`document.body`): el `?` suele vivir dentro
  de un `<label>`, y sin portal tocar la explicación activaría el campo o
  marcaría una casilla. `react-dom` no trae tipos en este proyecto, así que
  `src/react-dom.d.ts` declara solo `createPortal`.
- **Escape cierra la cajita y no la ventana de atrás**: se escucha en
  captura y se marca usado, y `Dialogo` ignora un Escape ya usado.
- **Los roles se explican desde `PERMISOS`** (`lib/roles.ts`): bajo el rol
  elegido en Cuentas va una línea corta, y su `?` lista **solo qué puede** (lo pidió
  el cliente: lo que no está no es de ese rol; el administrador no lleva lista),
  deducido de la tabla. Un permiso nuevo sin su frase en `PALABRAS` no
  compila, y hay una prueba de que cada permiso aparece una vez por rol.

## El panel tiene tema claro (2026-10-30)

Lo pidió el cliente: *"créame una versión diurna… pero no simplemente blanco
y negro, sino una elegancia"*, con *"un buen contraste de toda la
información"* y *"un juguetón bien de PlayStation, dónde y cómo usar los
botones"*. **Solo el panel** — el sitio público se queda como está, por
decisión suya en la misma frase.

### Los colores son variables, no valores

`tailwind.config.ts` ya no tiene hex: cada color es `rgb(var(--x) /
<alpha-value>)`. **Las clases de los componentes no cambiaron** —`bg-tinta`,
`text-hueso/60`, `border-oro/40` se siguen escribiendo igual— y lo único que
cambia entre un tema y otro es qué vale la variable. La alternativa, prefijar
`dark:` en cada clase de cada pantalla, habría sido reescribir el panel
entero y dejar cada color nuevo con dos lugares donde equivocarse.

Van en canales sueltos (`11 11 10`) porque es lo que `<alpha-value>`
necesita para que `/60` siga funcionando.

**Los tres colores de estado pasaron a tener nombre propio** —`verde`,
`rojo`, `ambar`, `cielo`— en vez de los `emerald-400` de Tailwind, y no es
gusto: de noche el texto de un aviso es claro y de día tiene que ser oscuro,
así que el número de la paleta dejaría de significar lo mismo. Cada uno trae
los tres tonos que de verdad se usan: el base (fondos y bordes con
transparencia), `-fuerte` (bordes y rellenos sólidos) y `-texto`, que es el
único pensado para leerse.

### Qué es el tema claro

**No es blanco pelado.** Papel tibio de fondo (`#FAF7F0`), **tarjetas
blancas encima** y texto casi-negro cálido. Que las tarjetas sean más claras
que la página es lo que las despega; por eso las superficies pasaron de
`bg-hueso/[0.02]` —un tinte que de día se ve *hundido*— a **`bg-panel`**, que
es el token de "superficie levantada" y vale `#14120F` de noche y `#FFFFFF`
de día. Los tintes que **sí** son tintes —un `hover`, un chip, la barra de
ocupación— se quedaron como estaban.

**El dorado se oscurece de día**, de `#C9A227` a `#8A6B12`. El dorado del
sitio sobre crema da menos de 2,5:1: todos los enlaces del panel serían
ilegibles. El oro viejo, más profundo, se lee sobre papel y sigue siendo oro.

**La escala de transparencias no significa lo mismo sobre papel**, y eso hubo
que arreglarlo aparte. `text-hueso/45` de noche da 4,1:1 y de día cae a 2,6:1,
o sea que todo lo secundario —el puesto bajo un nombre, el id de una reserva,
los guiones de "no hay dato"— se desvanecía justo en la pantalla que se mira
con sol encima. Los tramos bajos se suben en un **solo bloque** de
`globals.css`, en vez de escribir `text-hueso/45 dark:text-hueso/60` en los
trescientos y tantos lugares donde aparece.

Ese bloque trajo su propia trampa, anotada porque es fácil de repetir:
**lleva `:root` y un atributo, así que es más específico que las clases
`hover:` de Tailwind** y los enlaces dejaban de ponerse dorados al pasarles
el mouse. Los cuatro colores de hover que usa el panel se vuelven a afirmar
después, con la misma especificidad.

Y **un botón relleno apagado no puede verse roto**: `bg-oro` con
`disabled:opacity-40` de día quedaba crema sobre oro pálido, que no se lee
como nada. Apagado es gris.

### El interruptor

Está en la barra de arriba, y también en la pantalla de entrada —que es la
primera que se abre, y donde alguien se encuentra con el tema que no quería—.
En `/mi/` y en `/semana/` no: ahí la barra es una palabra y el botón sería el
único control de una página de lectura.

- **Arranca en claro desde el 2026-11-01**, por decisión del cliente:
  *"cambia la configuración predeterminada a diurno, es mucho más lindo"*.
  Hasta entonces arrancaba en oscuro, con el argumento de que el equipo había
  aprendido el panel así; ganó el otro, que es que esto se abre de día y en un
  teléfono, muchas veces al sol. **Vale para todo lo que cuelga del layout**,
  así que `/semana/` y `/mi/` —que no tienen interruptor— también abren en
  claro, que era lo que el cliente quería de la planilla semanal.
- **Lo que NO cambió es que no sigue a `prefers-color-scheme`**, y ese
  argumento sí se sostiene: el panel lo usa gente a la que recién se le enseñó
  dónde queda cada cosa, y que la pantalla dependa de una configuración del
  sistema operativo que nadie recuerda haber tocado deja a media docena de
  personas viendo cosas distintas. Hay un valor por defecto, y encima la
  decisión de cada uno.
- **Se recuerda en `localStorage`**, o sea por navegador: el teléfono de la
  jefa de turno puede estar en oscuro y el computador de la oficina en claro.
  Si está bloqueado, abre en claro y el botón sirve para esa sesión.
- **Cambiar el valor por defecto es dar vuelta las dos puntas**: el
  `data-tema` del `<html>` en `layout.tsx` **y** la condición del guion del
  `<head>`, que ahora busca el `oscuro` guardado en vez del `claro`. Si se
  toca una sola, quien no haya elegido nada ve un tema y el guion le pinta el
  otro — el parpadeo que ese guion existe para evitar.
- **Lo pinta un guion de tres líneas en el `<head>`, antes de dibujar.** Si
  esperara a React, a quien eligió el oscuro le aparecería la pantalla clara
  y pegaría un salto a negro en cada carga — el parpadeo clásico, que además
  desconcierta justo a quien menos maneja estos sistemas. No se puede resolver en el servidor: el tema es de cada
  navegador y el HTML de Next se sirve igual para todos.

### Los botones se hunden, y la asistencia es un semáforo

Eso es el *"juguetón bien de PlayStation"*, y resuelve algo real: en un
teléfono no hay cursor que cambie ni `hover` que anticipe nada, así que un
botón y un texto se ven igual hasta que uno de los dos responde.

- **Todo botón del panel se hunde 1px al tocarlo**, con `transition` corta.
  Va sobre `button` y no sobre una clase que haya que acordarse de poner: un
  botón al que se le olvidó es justamente el que se va a sentir muerto. Un
  botón apagado **no** se hunde, porque fingir que respondió sería mentir
  sobre lo único que está diciendo. Respeta `prefers-reduced-motion`.
- **Vino / No vino llevan el punto del semáforo**: lleno cuando ese estado
  está elegido, hueco cuando no. Así la fila se entiende sin leer ninguna de
  las dos palabras —y sin depender solo del color, que para quien no lo
  distingue no diría nada—. El elegido suma un halo suave de su color.

## La regla PlayStation, que vale para todo el panel (2026-11-01)

La dio el cliente como **regla general, no como un pedido suelto**: *"todo
diseño tiene que seguir a la regla PlayStation, botones bien legible, bien
grande… y no detalle chico, letra chica"*. Venía del tema claro —*"un
juguetón bien de PlayStation, dónde y cómo usar los botones"*— y ahora
aplica a cualquier pantalla que se toque.

Qué significa en concreto, que es lo que hay que poder revisar:

- **Lo que se aprieta se ve que se aprieta.** Un botón tiene borde o
  relleno, no es un texto en gris que resulta ser un enlace. Y mide para el
  dedo: **34px de alto o más**, no 16.
- **No hay letra chica donde hay un dato.** 9, 10 y 11px son para una
  marca de agua, no para decir si un día es público o cuántos grados va a
  hacer. El piso del panel es **13px**, y lo que importa va más grande.
- **Contraste de verdad.** Las opacidades bajas —`/35`, `/40`, `/45`— se
  reservan para lo que de verdad es secundario. Un rótulo que alguien va a
  leer con sol encima va a `/60` o más, y cuando tiene color propio usa su
  token `-texto`, que es el pensado para leerse.
- **Se distingue por forma, no solo por color.** Una pastilla con borde se
  reconoce sin leerla y sin distinguir el verde del ámbar; un cuadradito de
  8px al lado de una palabra, no.
- **Los números que se miran de lejos van grandes.** El dato principal de
  una tarjeta es el que se lee cruzando la cocina.

**Esto no cambia el tema claro ni la paleta**, que el cliente pidió
explícitamente dejar como está: *"no cambiar el estilo del diurno, está
súper bonito"*. Lo que cambia es el tamaño, el peso y el contraste de lo que
ya hay.

### Copiar un link avisa abajo de la pantalla (2026-11-04)

Lo reclamó el cliente: al apretar *Copiar link personal* no pasaba nada a la
vista. El aviso existía, pero se dibujaba **arriba de la página** y el botón
vive más abajo, en una ficha o en una semana. Copiar no cambia nada visible,
así que sin un aviso que se vea el botón parecía muerto.

Ahora hay **un solo aviso flotante para todo el panel** (`AvisoFlotante.tsx`,
montado en el layout): sale abajo al centro, por encima de las ventanas, y se
va solo a los 3 segundos. Las pantallas no lo dibujan, llaman `avisar('…')`, y
`copiarConAviso()` junta copiar, avisar y el `prompt` de respaldo sin
portapapeles. Lo usan los tres links que se copian: el personal, el de la
planilla semanal y el de un presupuesto.

### Las listas largas se achican en líneas que se abren (2026-11-05)

Lo pidió el cliente como regla para todo el panel: *"siempre donde
alineamos muchos datos hacia abajo, que los compactamos de forma
inteligente… acortar cuánto tengo que hacer scroll hasta que pierdo la
orientación"*. Es el mismo patrón de las fichas de `/equipo` y de las líneas
del informe: **cerrada, una línea con lo que se hace siempre; apretándola, lo
demás. Una abierta a la vez.**

| Dónde | Cerrada | Abierta |
|---|---|---|
| **Ventana del día** (`/turnos` y *Equipo* del calendario) | nombre, cuánto lleva, y **Vino / No vino** | jornada, horas extra, ajustes con su motivo, propina, total, *Ficha* y *Sacar del día* |
| **Ventana de actividades** (`/extras`) | quién, qué hace, y **Vino / No vino** | actividad, monto, ajuste y motivo, total, *Ficha* y *Sacar del día* |
| **Calendario de la portada** | desde la **tercera semana**, cada día es un campo chico: fecha, estado, barra y gente | apretar un día —o *+ Ampliar*— abre la semana entera con sus tarjetas de siempre |

- **En la ventana del día desapareció la segunda lista**, la de *"Lo que se
  paga este día"*, que repetía a la misma gente con sus montos y doblaba el
  largo de la ventana. Los montos viven ahora en la línea de cada persona;
  abajo quedó solo la propina del día, que es del día y no de alguien.
- **La línea cerrada no envuelve**: el nombre se recorta (`truncate`) y
  *Vino / No vino* queda siempre en el mismo lugar, se llame como se llame
  —la lección de `flex-wrap` de más arriba—. En un teléfono los dos botones
  van con menos aire a los lados (`compacto` en `Asistencia`), sin perder
  alto.
- **Las dos primeras semanas del calendario van siempre abiertas**: la que
  corre y la que viene, que son las que se trabajan. Las abiertas a mano se
  recuerdan solo mientras dura la página.
- **Las grillas de la ventana llevan `grid-cols-1`** y no la columna
  implícita: sin eso, la línea con los dos botones agrandaba la caja del
  puesto por fuera de la ventana en un teléfono (la misma trampa de la
  tarjeta del calendario).

### Los avisos hablan con las palabras de la pantalla (2026-11-05)

Lo notó el cliente en el aviso del informe: decía *"turnos sin pasar
lista"* cuando en el panel el paso se llama **cerrar el día**, y además
mandaba a "la página de cada día", donde ya no se marca nada. *"Pasar
lista"* fue el nombre de una ventana que se jubiló el 2026-10-23 y quedó
viviendo en los textos.

La regla: **un aviso usa el nombre del botón que lo resuelve**, y va en ese
orden —primero qué pasa (*"Hay 4 turnos sin cerrar"*), después por qué y
dónde se arregla (*"falta que el jefe de turno marque si cada persona vino
y cierre el día en Turnos"*)—. Se corrigieron los cuatro textos visibles
que decían "pasar lista"; en los comentarios del código sigue apareciendo
como nombre histórico, y ahí no confunde a nadie.

### Agregar a alguien se busca escribiendo (2026-11-05)

Lo pidió el cliente: *"con tantos trabajadores ya sería útil que cuando
aprietas agregar… se puede buscar por nombre"*. El `<select>` de cada puesto
—y el de las actividades extras— pasó a ser `BuscarPersona`: un botón
*+ Agregar…* que abre un campo con el cursor puesto y la lista que calza
debajo, un botón de 44px por nombre.

- **Busca sin tildes ni mayúsculas, en el nombre y en el detalle** (el
  puesto habitual o la actividad): "jose" encuentra a José, "garz" a los
  garzones.
- **Elegir deja el buscador abierto y vacío**, como el desplegable volvía a
  "" después de elegir: se agregan varios seguidos. **Enter agrega al
  primero** de la lista, y *Listo* o Escape lo cierran.
- **Escape cierra el buscador y no la ventana**, y eso costó un arreglo en
  `Dialogo`: en Next la raíz de React es el propio `document`, el mismo nodo
  donde la ventana escucha el teclado, así que `stopPropagation` no la
  frena. El buscador marca el Escape con `preventDefault` y `Dialogo` ignora
  un evento ya usado (`defaultPrevented`).

### Buscador arriba de la lista de `/equipo` (2026-11-12)

Lo pidió el cliente: *"debería haber un formulario de búsqueda arriba de
toda la lista"*. Un campo **Buscar por nombre, puesto o teléfono** entre el
título *Trabajadores* y *Mostrar desactivados*.

- **Mismo criterio que `BuscarPersona` y el buscador del informe**: sin
  tildes ni mayúsculas (`normalizar()`), "perez" encuentra a José Pérez y
  "cocina" a todo el puesto. **El teléfono también se busca por dígitos
  solos** (desde 3), para que "12345678" encuentre `+56 9 1234 5678`.
- **Filtra lo que se dibuja, no lo que se guarda.** Igual que los
  desactivados, se salta dentro del `map` y no con un `filter` previo: el
  índice `i` de cada ficha tiene que seguir siendo su posición real.
- **La ficha abierta no se esconde aunque deje de calzar**: cambiarle el
  nombre o el puesto a medio escribir la haría desaparecer.
- **Respeta *Mostrar desactivados***. Si no calza nadie visible pero sí un
  desactivado, lo dice: *"Nadie calza con… Hay 1 desactivado que calza:
  muéstralos con el botón de arriba"*, en vez de una lista vacía.
- **Cero lecturas nuevas**: filtra lo que `/api/equipo` ya trajo.

### Los tres botones chicos que quedaban (2026-11-12)

`revisarPlayStation()` marcaba tres botones bajo el piso de 34px en todas
las pantallas, y el cliente pidió agrandarlos:

- **☾ / ☀ del tema** (`BotonTema`): de 26px a un círculo de **36px**, con el
  signo a 16px.
- **Ahora no** del recorrido de bienvenida (`Recorrido`): era texto suelto
  de 20px. Pasa a **botón delineado de 40px**, del mismo alto que *Ver cómo
  funciona*, que sigue siendo el único relleno.
- **El `?` de ayuda** (`Ayuda`): de 30px a **36px**, con el signo a 16px.

Con eso la pasada de Playwright a 393 y 1280px en `/equipo` queda limpia.

### Vino / No vino se marca solo en `/turnos` (2026-11-05)

Lo pidió el cliente: *"saca la opción vino o no vino de la parte del
calendario donde se planifica y donde se ven las reservas… probablemente van
a ser dos distintos roles"*. Quien planifica o mira las reservas no es
necesariamente quien pasa lista.

- **La ventana del equipo** marca asistencia solo con `conAsistencia`, que
  pasa únicamente `/turnos`. Desde el calendario de la portada y la página
  del día la línea de cada persona dice el estado con palabras —*sin
  marcar*, *no llegó*, el monto— sin botones.
- **La tabla de reservas de la página del día** muestra la asistencia como
  una pastilla de solo lectura (*✓ vino* / *✕ no vino* / *sin marcar*). Se
  marca en la cara *Reservas* de la ventana del día en `/turnos`.
- **Bajo el nombre no se repite el estado** (2026-11-05, lo notó el
  cliente: *"vino"* debajo de un botón verde que ya dice Vino). Con los
  botones a la vista, la segunda línea dice solo lo que ellos no dicen —el
  total del día, *contratado*, cuántos ajustes y su propina— y si no hay
  nada, no hay línea. Sin los botones, el estado sí va en palabras.
- **Es una decisión de pantalla, no de permiso todavía**: la API sigue
  aceptando la asistencia de quien tenga `turnos`. Si se separa el rol de
  verdad, el lugar es la tabla de `PERMISOS`, no esconder más botones.

### Tres tamaños de botón en todo el panel (2026-11-11)

La regla de la cotización, aplicada al resto (lo pidió el cliente): **hito,
acción y secundario**. El hito es lo que cierra una etapa y lleva
**`.boton-hito`** sobre `.boton` —52px, letra 16 en negrita, borde doble y
esquinas más redondas—; cambia el tamaño, no el color, así que un hito rojo
sigue rojo. **Uno por vista.**

| Hito | Dónde |
|---|---|
| Cerrar el día | ventana del día en `/turnos` (y *Sí, cerrar el día* en su confirmación) |
| Guardar corrección | un día cerrado |
| Marcar N pagados | la transferencia masiva del informe |
| Sí, cancelar el evento | la ventana de cancelar |
| Marcar ganada | la cotización (con su propio verde) |

**De paso, los botones escritos a mano** —`rounded bg-oro px-4 py-1.5
text-sm` y `rounded border … px-3 py-1.5 text-sm`, una veintena en doce
pantallas— **pasaron a `.boton` y `.boton-relleno`**, así que miden y se
ven igual en todas partes. *Listo*, *Volver* y *Cancelar* quedan como
secundarios delineados.

### El botón del panel vive en `globals.css`, no en cada pantalla

`.boton` —borde, **36px de alto y 13px**— y `.boton-relleno`, el dorado.
Nació el mismo día que la regla y por su causa: cada pantalla se escribía su
propio botón a mano, unos con borde y otros como un texto en gris que
resultaba ser un enlace, y cada uno con su tamaño. Con una sola definición,
subir el piso es tocar un archivo.

- **Un `<a>` también lo lleva.** Se le suma `.tecla`, que es lo que le da el
  hundido al tocarlo que un `<button>` ya trae de fábrica.
- **El relleno es uno por pantalla**, el que dice a qué se vino. Dos
  rellenos en la misma vista es no tener ninguno.

### El rótulo de un campo también tiene piso (2026-11-01)

`Campo` —el rótulo que va encima de cada caja de texto— estaba a **10px al
35%**, que era lo más chico del panel y en el lugar donde menos corresponde:
es lo único que dice qué se está escribiendo ahí. Pasó a **13px al 60%**, y
vale de una vez para las cuatro pantallas que lo usan, que es la gracia de
que viva en un archivo.

Comprobado que ningún rótulo se parte en dos líneas y que ninguna pantalla
se corre de lado, a 393 y 1280.

### El menú de arriba: pastillas, no una lista (2026-11-01)

Lo pidió el cliente mirándolo en el teléfono: *"no se siente cero
PlayStation, se parece a una lista de máquina de escribir"*, y *"repensar el
menú sin cambiar el menú, solo en la presentación"*.

Era eso: **nueve textos de 14px al 70%**, envueltos en dos renglones, sin
nada que dijera que se aprietan. **El menú no cambió** —las mismas páginas,
el mismo orden, la misma tabla de permisos—; cambió cómo se ve.

- **Cada página es una pastilla** con su borde y sus 36px, y **la actual va
  rellena de dorado**. Se distingue por *forma* y no solo por color, que es
  lo que la regla pide: quien no distinga el dorado igual ve cuál es, y
  `aria-current` sigue estando para los lectores de pantalla.
- **La cabecera son dos filas y no una sola que envuelve.** Antes la marca,
  las nueve páginas, el tema, el nombre y *Salir* iban todos en el mismo
  `flex-wrap`, así que en un teléfono se mezclaban — el nombre de la cuenta
  podía terminar entre dos páginas del menú. Arriba va **quién eres y dónde
  estás**; abajo, **a dónde puedes ir**.
- **El nombre de la cuenta subió de 12px al 45% a 13 al 70**, y *Salir* pasó
  a ser un botón. Ese dato contesta "¿con cuál estoy adentro?", y la
  bitácora entera depende de que alguien se dé cuenta.
- **Se descartó la fila que se desplaza de lado**, que es lo que haría una
  app de teléfono: esconde la mitad de las páginas detrás de un gesto que
  hay que adivinar, y este panel lo usa gente a la que recién se le enseñó
  dónde queda cada cosa. **El costo a asumir**: en un teléfono las nueve
  pastillas ocupan tres filas y la cabecera pasó de unos 100px a **197**.
  Se eligió a sabiendas — ocupa más alto y no esconde nada.

Comprobado a 393 y 1280, en los dos temas: nueve pastillas de 36px, **una
sola fila en escritorio** y tres en el teléfono, sin corrimiento lateral.
Cada página se marca sola, y `/dia/…` no marca ninguna —correcto, no es una
página del menú—. `/login`, `/mi/` y `/semana/` siguen sin menú.

### La tarjeta del calendario, rehecha con esa regla (2026-11-01)

Lo pidió mirando la portada: *"el icono del tiempo es demasiado chico, nadie
lo va a detectar bien"* y *"hay mucho espacio libre donde se puede
distribuir mejor la información que tenemos hoy, que no hay que cambiar"*.

Medido antes de tocar nada: la tarjeta medía **295×208**, su contenido
ocupaba **83 a 98px** y el pie 29 — o sea **unos 50 a 65px de aire muerto**
en el medio. Y el pronóstico medía **10px de alto**.

**No se agregó ni se sacó un solo dato**, que era la condición. Lo que
cambió es dónde está cada uno y cuánto pesa:

| Qué | Antes | Ahora |
|---|---|---|
| El pronóstico | 10px bajo la fecha | **pastilla con borde**, ícono a 22px, al lado del número |
| El número del día | 24px | **30px** |
| La barra de ocupación | 6px | **12px, redondeada** |
| Pagadas / por cobrar | texto gris con un cuadradito | **dos pastillas** con su borde y su color de texto |
| El pie | tres textos de 12px al 60% | **tres botones con borde**, 13px, 34px de alto |
| La palabra bajo el punto | 9px al 35% | **11px semibold**, con su color de texto |

- **El pronóstico salió de la cabecera a propósito.** Ahí era un apéndice de
  la fecha; al lado del número ocupa el aire que ya estaba muerto a la
  derecha y **no alarga la tarjeta**. Y es un dato que se mira *antes* de
  decidir si el show ecuestre se hace afuera o se arma adentro.
- **`Clima` tiene ahora tres tamaños y no dos** —`chico`, `tarjeta`,
  `grande`—, porque son tres lugares distintos: la celda de `/turnos` mide
  92px y ahí el ícono sí va de refilón; la tarjeta tiene espacio; la página
  del día además dice cuánta agua y cita la fuente.
- **`ALTO_ESTANDAR` subió de 13rem a 14.25.** Es la medida que hay que
  volver a tomar cada vez que la tarjeta cambie de contenido: quitándole el
  piso a las 52 caras de la página, la más alta pasó de 201 a **225px**, así
  que 228 las deja otra vez a todas del mismo alto. Sigue siendo
  `min-height` y no `height`, por lo de siempre: un piso no recorta nada.
- **El dorso sigue el mismo criterio**, y ahí *Planificar* pasó a ser el
  único botón **relleno** de la tarjeta: es a lo que se vino al darla vuelta.

Comprobado en los dos temas, a 1280 y a 393px: las 52 caras miden 228, el
pie entra en una sola línea con botones de 34px de alto, y a 393 la página
no se corre de lado.

#### El pie no cabía y la tarjeta se salía de su columna (2026-11-02)

Lo notó el cliente con una captura y la pregunta exacta: *"¿por qué los
paneles de sábado y domingo chocan?"*. No chocaban: **la tarjeta del sábado
era 10px más ancha que su columna y se metía en el espacio que la separa de
la del domingo.** Los 12px de separación de la grilla quedaban en 2, y dos
píxeles se leen como un choque.

Medido antes de tocar nada, a 1280 —cuatro columnas de 294,5px con 12px de
separación, o sea 261px de contenido por tarjeta—:

| El pie | Ancho mínimo | |
|---|---|---|
| `Reservas · Equipo · Editar` | 239px | cabe |
| `Reservas · Equipo [4] · Editar` | **271px** | se pasa por 10 |

O sea que **lo causó la cajita con el número**, la que el cliente había
pedido el día anterior. Los tres botones son `white-space: nowrap`, así que
no había nada que pudiera achicarse.

**La causa de fondo no es el pie, y por eso el arreglo son dos cosas.** Un
ítem de grilla nace con `min-width: auto`: cuando algo adentro no cabe,
**crece por fuera de su pista** en vez de quedarse en su sitio. Entonces:

- **`.boton-angosto`** en `globals.css`, que baja el padding lateral de
  12px a 8. Recupera 24px y **no toca la regla PlayStation**: los botones
  siguen midiendo 36px de alto y 13px de letra, que es lo que la regla pide
  — lo que cambia es el aire a los lados. Vive en `globals.css` y no en la
  tarjeta por lo mismo que `.boton`: que ninguna pantalla se invente su
  propia medida.
- **`grid-cols-1` en la cara**, que es la guarda. **`min-w-0` solo no
  alcanza, y se midió**: con la grilla implícita la *pista* se agranda con
  el contenido aunque el contenedor pueda encogerse, así que la tarjeta
  seguía saliéndose 7px. Una columna explícita `minmax(0, 1fr)` no puede
  pasarse del contenedor, y con eso lo que no quepa queda como problema
  **dentro** de su propio borde, donde se ve, en vez de ensuciar la grilla
  entera.

**La lección, que es la misma de `flex-wrap`:** estas propiedades no
ordenan, solo deciden qué pasa cuando algo no cupo. Si una medida tiene que
respetarse, hay que declararla.

**Y volvió a pasar el 2026-11-12, con más gente** (lo reclamó el cliente
con una captura: *Editar* chocando con el borde). Con *Equipo 18/23* los
tres botones piden 277px y la tarjeta tiene 261 a 1280px de ancho —197
a 1024—, así que `.boton-angosto` ya no alcanzaba. **Ahora el pie mira su
propio ancho** (container query, `.pie-tarjeta` en `globals.css`): si no
caben los tres en una línea, pasan a dos —*Reservas* y *Editar* arriba,
*Equipo* a todo el ancho abajo—. Como todas las tarjetas de la grilla miden
lo mismo, cambian todas juntas y siguen parejas. Medido a 1024, 1180, 1280,
1440 y 393: ningún pie se sale y todos quedan a 17px del borde.

**Y cada botón con su ícono** (2026-11-12, lo pidió el cliente: los tres
se veían iguales, y la cajita gris del número no aportaba): **📋 Reservas ·
✎ Editar** arriba y **🧑‍🍳 Equipo 18/23** abajo. El número va sin fondo,
en negrita; si falta gente, *"/23"* va en ámbar y el botón entero con borde
ámbar, así que se nota sin leerlo. Con los íconos el pie pide unos 325px, y
el corte a dos líneas pasó a `21rem`: en un teléfono (293px) también va en
dos. Medido a 1024, 1180, 1280, 1440 y 393: ningún pie se sale.

#### El punto ámbar solo hablaba en un globito (2026-11-02)

En la misma captura, el lunes 2 mostraba `Equipo •` — un punto ámbar que
significaba "faltan N personas según las reglas de cada puesto" y que
**solo lo decía el `title`**, o sea un globito que aparece al pasar el
mouse. En un teléfono eso no existe, y lo que queda es un punto que no dice
nada. Es exactamente el error que ya se había arreglado en el botón de
cerrar el día.

Ahora la cajita dice **`4/6`**: los asignados y, en ámbar, los que sugieren
las reglas. Se lee solo y no necesita ningún globito.

- **Va sin espacios alrededor de la barra**, y no es gusto: con `0 / 6` la
  tarjeta se pasaba otra vez, 7px. De paso queda igual que el número grande
  de la propia tarjeta —"8/120 personas"—, que es la convención que este
  panel ya usa.
- **Aparece también cuando no hay nadie asignado** (`0/6`), que es justo el
  caso del lunes de la captura: antes, con cero, la cajita no se dibujaba y
  quedaba el punto solo.
- El dorso lo sigue diciendo con todas sus letras.

#### Las pastillas de pago en cero eran ruido (2026-11-02)

El miércoles 4 y el domingo 8 no tenían a nadie y mostraban igual
`0 pagadas · 0 por cobrar`. Que no hay nadie ya lo dice el número grande, y
dos pastillas en cero son ruido justo en la fila que se mira para saber
cuánto falta cobrar. Es el mismo criterio del azulejo de "ya no vienen" en
la página del día, que tampoco se dibuja en cero.

**La barra sí se queda**, aunque vaya vacía: es lo que dibuja el cupo del
día, así que en cero dice "no hay nada tomado de los 120" — eso es un dato,
no un relleno.

#### Las abonadas, aparte: pagadas · abonadas · sin pagar (2026-11-12)

Lo pidió el cliente mirando un jueves con una reserva de 80 personas que ya
había abonado más de la mitad: la barra mostraba poco verde y mucho ámbar,
y a quien planifica el equipo eso le decía que esa gente quizás no viene.
Las abonadas se contaban con las que no han pagado nada.

- **La barra tiene tres tramos**: verde lleno (pagadas), **verde rayado
  (abonadas: casi seguro vienen, falta el resto)** y ámbar (sin pagar nada).
- **Debajo, una celda por tramo con gente**, en dos líneas —*✓ 36 /
  pagadas*, *½ 80 / abonadas*, *○ 12 / sin pagar*—, con los íconos del pago
  de las cotizaciones. Tres pastillas en una línea pedían 333px de 261 y al
  envolver estiraban la tarjeta; por eso `ALTO_ESTANDAR` subió a 15.125rem
  (242px) y todas vuelven a medir lo mismo.
- **En el cálculo, `abonadas` es parte de `porPagar`** (`estaAbonada()` en
  `ocupacion.ts`): a una abonada todavía hay que cobrarle el resto, así que
  `faltaCobrar()` y todo lo que lo usa no cambió. Sin pagar = `porPagar −
  abonadas`.
- **La página del día y la cara *Reservas* de `/turnos` dicen lo mismo**:
  tres azulejos (Pagadas · Abonadas, con borde punteado y *falta el resto*
  · Sin pagar), y el filtro de la tabla es *Todas · Pagadas · Abonadas · Sin
  pagar*.

#### "Lunes 2 De Noviembre": el `capitalize` del panel (2026-11-02)

En la misma captura, con mayúscula en **cada** palabra. Este archivo ya
tenía escrito que eso "se lee descuidado", pero solo se había arreglado en
el documento del presupuesto; en el panel quedó en nueve lugares. Ahora las
fechas van con `first-letter:uppercase`, igual que el documento.

Dos trampas que vale la pena tener escritas, porque las dos hacen que el
arreglo *parezca* hecho sin estarlo:

- **`::first-letter` no aplica a un elemento en línea**, solo a un
  contenedor de bloque. Un `<span className="first-letter:uppercase">`
  suelto no hace nada. **Un hijo directo de un `flex` sí sirve**, porque se
  blockifica solo; el único que necesitó `inline-block` fue el de
  `CalendarioEquipo`, que cuelga de un `<button>` que no es flex.
- **Una fecha en medio de una frase no lleva mayúscula.** En
  `PresupuestosEditor` el "Válido hasta el sábado 5 de diciembre" tenía
  `capitalize`, y ahí lo correcto era **sacarlo**, no reemplazarlo.

Quedan tres `capitalize` a propósito: los dos encabezados de mes
—"Noviembre 2026", una sola palabra— y un `<select>` del informe, que no es
una fecha. **El título de la página del día perdió el suyo** y quedó en
versalitas como el de las demás pantallas, que es lo que ya hacía el
`uppercase` que tenía al lado.

### La página del día, rehecha con esa regla (2026-11-01)

Medido antes de tocar nada, a 1280: **28 textos bajo 13px** y **siete
controles sin forma** —ni borde ni relleno, texto en gris o en oro que
resulta ser un botón— de 16 a 20px de alto. Después: **cero y cero**.

No se agregó ni se sacó un dato; cambió el tamaño, el peso y la forma:

| Qué | Antes | Ahora |
|---|---|---|
| *Equipo y cuentas del día*, *Agregar propina*, *Editar actividades* | texto en oro de 20px flotando en el borde | **botones** de 36px |
| *Editar* y *Borrar* de cada fila | dos textos en gris de 20px | **dos botones** de 36px, el de borrar se pone rojo |
| *← Calendario* | enlace de 17px | botón |
| Rótulos (*Qué preparar*, *Equipo*…) | 12px al 45% | **13px semibold al 60%** |
| Los totales en pesos | 12px | 13px, con el monto a 16 en negrita |
| El número de un azulejo | 24px | **30px**, como el de la tarjeta del calendario |
| La pastilla de modalidad | fondo de color, sin borde | **con borde**, para reconocerla sin distinguir el verde del ámbar |
| *Faltan N*, *sin anotar*, *N sin confirmar* | texto suelto de 12px | **pastilla ámbar con borde** |
| El `?` de la ayuda | círculo de 24px con un signo de 12 | **30px y 15px** — vale para las diez pantallas |

Dos decisiones que vale la pena tener escritas:

- **El relleno dorado sigue siendo uno solo**: *Agregar reserva*. El filtro
  elegido se pinta con un tinte (`bg-oro/15` y borde dorado) en vez de
  rellenarse entero, porque dos rellenos en una vista es no tener ninguno.
  Igual se distingue por forma, que es lo que la regla pide.
- **La columna del nombre queda fija al correr la tabla de lado**, igual que
  la del puesto en la planilla semanal y por lo mismo: con siete columnas en
  un teléfono, al correrla uno quedaba mirando pastillas de pago sin saber de
  quién eran. Mismos dos detalles de siempre — fondo propio en la celda fija,
  y `shadow` en vez de `border`, porque con `border-collapse: collapse` el
  borde se va con el desplazamiento.

Comprobado en los dos temas, a 393 y 1280: ninguna pantalla se corre de lado,
y con la tabla corrida 900px la celda del nombre sigue en su lugar con su
sombra.

### Las reservas del día se abren de a una, y dicen quién las vendió (2026-11-12)

Lo pidió el cliente: la lista de reservas de la página del día tomaba mucho
espacio, y el encargado necesitaba saber **de qué cotización viene una
reserva y quién la vendió**, para saber con quién hablar al planificar.

- **La tabla de siete columnas pasó a ser una lista de líneas que se abren**,
  una a la vez, como las fichas de `/equipo`. Cerrada: el nombre, el número
  de reserva —*Cotización N° 1002* si viene de una, si no su id— y cuántas
  personas. Lo que no puede quedar escondido lleva su marca también cerrada:
  📣 si la recepción dejó un aviso y ⚠ si el pedido está repetido. Abierta:
  contacto, menú, pago con su caja de Fudo, asistencia, el aviso y las
  acciones. Con esto la columna fija del nombre ya no hace falta en esta
  pantalla.
- **Debajo del botón *Cotización N° …* dice *vendió Verónica*** (lo pidió el
  cliente: *"ahí hay espacio"*), y debajo de *Editar / Borrar* de una
  anotada a mano, *anotó Carla*. El vendedor es el `creadoPor` de la
  cotización: `/api/reservas` lo manda en `vendedorDe` junto con
  `folioDeReserva`, de la misma tanda de lecturas, así que lo ve también
  quien no puede leer las cotizaciones.
- **Abierta, la reserva sigue la regla PlayStation** (rehecha el mismo día:
  el cliente mandó una captura de la versión en columnas, *"eso no quedó
  bonito"*). Cuatro azulejos con la forma de los de arriba de la página
  —personas en grande, menú una línea por plato, pago y asistencia—, la
  caja de **Fudo a todo el ancho**, el **contacto como botones** (📞 llamar,
  💬 WhatsApp, ✉ correo) y un pie con **quién la vendió o la anotó** a la
  izquierda y **la acción en dorado** a la derecha (*Abrir la cotización N°
  … →* o *✎ Editar*). En el teléfono van personas y pago arriba y menú y
  asistencia a todo el ancho. La línea cerrada suma **un ícono del pago**
  (✓ · ½ · ○ · ✕) junto a las personas, y al abrirla se tiñe de dorado; el
  anillo azul del navegador se cambió por `focus-visible`.
- **El número de la cotización ya no se repite cuatro veces**: lo dice la
  línea y el botón. `PastillaPago` acepta `sinOrigen`, y la nota *"De la
  cotización N° …"* no se muestra en una reserva de cotización.
- **De qué cotización viene una reserva lo dice el servidor**
  (`deCotizacion`), no solo la lista de cotizaciones de la pantalla: si esa
  lista no llegaba, la reserva de una cotización se veía *Anotada a mano* y
  con *Editar / Borrar*.

## El pronóstico del tiempo (2026-10-29)

Cada día del panel muestra en chico el pronóstico —"☀️ 28°"— en el
calendario de la portada, en `/turnos`, en `/extras` y en la página del día,
que además dice cuánta agua se espera cuando pasa de 1 mm. Al pasar el mouse
se ve el detalle: mínima, máxima y milímetros.

- **Sale de MET Norway** (`api.met.no`), el instituto meteorológico noruego.
  Es gratis **también para uso comercial**, con dos condiciones: **citar la
  fuente** —va en el `title` de cada ícono y como enlace en la página del
  día— y **decir quién pregunta** en el User-Agent (`IDENTIFICACION` en
  `clima.ts`); sin eso MET responde 403.
- **Se montó primero con Open-Meteo y se cambió el mismo día.** Su versión
  gratuita es para uso no comercial, y un panel de un restaurante no lo es.
  Además limita por IP, y en la primera prueba desde este entorno rebotó con
  *"Daily API request limit exceeded"*: la IP de salida es compartida, y en
  Vercel también puede serlo. Que no se vuelva a él sin pagar la versión
  comercial.
- **Solo en el panel, no en el sitio público** (decidido con el cliente).
  Es dato operativo —armar adentro, avisarle a los jinetes— y en
  `reservas.html` un ícono de lluvia sobre un sábado espantaría reservas.
- **Lo pide el servidor** en `/api/clima`, y la respuesta se guarda **una
  hora** en la caché de Vercel, que es más o menos cada cuánto actualiza MET.
  Next solo guarda las respuestas buenas y sigue sirviendo la última
  mientras pide la nueva, así que un rechazo de MET no borra lo que había.
- **Llega a unos 9 o 10 días**: hora a hora los primeros dos o tres, de a
  seis horas después. Más allá no hay ícono, y está bien: inventarlo sería
  peor.
- **Para Chile MET no da probabilidad de lluvia**, solo milímetros
  (comprobado contra la respuesta real el 2026-10-29: ni un
  `probability_of_precipitation`). El código la sigue leyendo por si
  aparece, pero lo que se muestra son los milímetros, con coma decimal.
- **MET entrega instantes en UTC y hay que juntarlos por día de Chile**: a
  las 02:00 UTC acá todavía es el día anterior. Lo hace `climaDe()`, y lo
  que sale son fechas en texto, como en todo el proyecto.
- **El ícono es el peor tiempo entre las 10 y las 19** (`HORARIO`), no el de
  las 24 horas. Se abre de 13 a 18: un chubasco de madrugada no cambia nada,
  y si contara, la mitad de los días saldría con lluvia. Las temperaturas y
  los milímetros sí son del día completo.
- **Las coordenadas son las de Pirque, aproximadas** (`PIRQUE` en
  `clima.ts`): a esta escala el modelo no distingue unas cuadras, y MET pide
  no mandar más de cuatro decimales.
- **Si MET no responde, los calendarios se dibujan igual**, sin íconos.
  Nada del panel depende de esto.
- **Va bajo la fecha, en el aire que ya había**, igual que la palabra bajo
  `PuntoDia`: no cambia el alto de ninguna tarjeta ni de ninguna celda.
- **`api.met.no` está abierto en Network access** (2026-10-29) y se probó
  contra la respuesta real: el sábado 31 de octubre salió con lluvia, que
  es lo que dicen los datos hora a hora desde las 14:00 de Chile. Ojo:
  `next dev` no pasa por el proxy del entorno —ni con
  `NODE_USE_ENV_PROXY`—, así que `/api/clima` en local falla con
  `ENOTFOUND` aunque `curl` sí llegue. Para revisar la lectura con datos
  reales se baja la respuesta con `curl`, con el mismo User-Agent, y se le
  pasa a `climaDe()`.

## Las actividades extras (2026-10-22)

> **El link personal de los extras** (2026-11-12, lo pidió el cliente:
> *"link personal para los extras, absolutamente corresponde"*). Igual que
> el de un trabajador: en la ficha, **Copiar link personal** (lo crea la
> primera vez), *Renovar* y *Quitar link*, con el permiso `links`
> (`/api/extras/link`). El token va en una columna nueva al final de
> `Colaboradores`, `Token de acceso`; **no se acepta del navegador** —el
> `PUT` y el `PATCH` arrastran el guardado— y solo lo recibe quien
> administra los links. **`/mi/<token>` abre la vista del colaborador**
> (`Colaborador.tsx`) cuando el token no es de un trabajador
> (`colaboradorPorToken()`, con las mismas reglas: vacío o desactivado no
> abre nada): *💰 Lo que gané* —semana con flechas o mes, *Lo que ganaste*
> (lo confirmado), *Te pagaron*, *Falta*, el aviso de días sin confirmar, día
> por día con su monto y ajuste, y los pagos— y *📅 Lo que viene*, sus días
> agendados. Las cuentas son las de `informeDeExtras()`, las mismas del
> informe. **De paso, la página del link lee todo en una tanda**
> (`conLecturas`): eran siete consultas a Google por visita; ahora es una,
> con los extras incluidos.
>
> **A la altura de Equipo** (2026-11-12, lo pidió el cliente: Extras tiene
> que cumplir *"los mismos requisitos como equipo… tanto de la user
> interface como los datos"*). Las fichas de colaboradores son ahora **una
> línea que se abre de a una** —*+ nombre · actividad · teléfono · monto
> habitual*—, con **la pastilla *falta su cuenta*** cuando no se le puede
> transferir, **Quitar / Desactivar / Activar a la derecha** de la línea y
> **el buscador arriba** (nombre, actividad o teléfono, también por los
> dígitos), igual que `/equipo`; una ficha recién agregada se abre sola. Y
> la letra pasó el piso de 13px: el calendario del mes, los rótulos y la
> nota de abajo (`CalendarioExtras.tsx` quedó en 0 en `HABIA`). El link
> personal, que era lo único que faltaba, llegó el mismo día (arriba).

Lo que se contrata aparte del equipo y por día: **jinetes** —cada uno con su
monto—, **pintacaritas**, el **castillo inflable**. Lo pidió el cliente con
una frase que fija todo el diseño: hay que tratarlas *"como los del personal,
pero separado de él"*.

Viven en **`/extras`**, su propia página con su propio calendario del mes, su
propia ventana por día y su propia lista de fichas. El código está en
`panel/src/lib/extras.ts`, espejo de `equipo.ts`.

### Por qué separadas, y dónde se juntan

Separadas porque **no son lo mismo**: un jinete no cobra una jornada, no se
le pasa lista con horas extra, y —lo más importante— **no entra en el reparto
de la propina**. Juntarlos en una sola lista haría ilegibles justamente las
dos columnas donde eso se ve.

Se juntan en **un solo lugar, que es el que lo necesita**: la planilla que
descarga quien paga. El cliente lo dijo así: *"él quiere hacer solo un pago
semanal, pero claramente distinguido"*. Entonces:

| | Equipo | Actividades extras |
|---|---|---|
| Planilla semanal del grupo (`/semana/…`) | sí | **nunca** |
| Link personal del trabajador (`/mi/…`) | sí | **nunca** |
| Calendario de la portada | sí | no |
| Página del día (`/dia/…`) | su bloque | **su propio bloque**, debajo |
| `/informe` en pantalla | su tabla | **su propia tabla**, con su total |
| El CSV que se descarga | sí | **sí, en el mismo archivo** |
| `/api/publico/fechas` (el sitio) | no | **no** |

**En la página del día van en un bloque aparte, no mezcladas con el equipo**
(2026-10-22). Están ahí porque es donde se cierra un día, y "¿cuánto costó
este sábado?" no se contesta sin el jinete: el bloque muestra quiénes vienen
—tachado quien no llegó—, lo que costaron y, cuando hay las dos cosas, el
total con el equipo. Aparte y no en la misma lista por lo mismo que son una
página aparte: mezclarlas obligaría a explicar en cada línea cuál de las dos
cosas es.

La primera fila es textual del cliente: *"el resumen semanal que yo mando al
equipo del restaurante nunca quiere ver el resumen de los jinetes y de los
pintacaritas"*.

**En el CSV cada fila dice qué es** —`Equipo` o `Actividad extra`— y las
columnas que no aplican van **en blanco, no en cero**: un cero en la columna
de propina se leería como "le tocó cero", y lo que pasa es que esa persona no
entra en el reparto. Lo mismo con la modalidad, las horas extra y el valor
hora de un jinete.

### Dos pestañas nuevas en la misma planilla

| Pestaña | Qué guarda |
|---|---|
| `Colaboradores` | Nombre, actividad, teléfono, activo, monto habitual y **cuenta bancaria** |
| `Actividades` | Una fila por (fecha, colaborador), con si vino, el monto, el ajuste y su motivo |

Se decidió abrir pestañas propias y no agregar una columna "tipo" a
`Trabajadores` y `Turnos`: las columnas de un turno —modalidad, horas extra,
propina— no significan nada para un castillo inflable, y una tabla con media
fila vacía es la forma más segura de que alguien sume lo que no debe.

**`Colaboradores` es posicional y `Actividades` va por nombre de columna**,
por lo mismo que `Trabajadores` y `Turnos`: la primera se reescribe entera al
guardar, y a la segunda se le agregan y se le borran filas de a una.

### Se guardan como fichas porque se repiten

Lo dijo el cliente: *"los jinetes se van a repetir, las personas se van a
repetir"*. Una ficha trae su **monto habitual**, que es lo que se propone al
agregarla a un día y **se congela ahí**: subirle la tarifa a alguien en marzo
no reescribe lo que se le pagó en noviembre. Mismo criterio que los sueldos
del equipo, y por el mismo motivo.

**Una actividad sin confirmar no suma.** Agendar no es pagar: hasta que
alguien diga que el jinete llegó, el panel no da por gastada esa plata. Es la
misma regla que un turno sin pasar lista, y el informe avisa arriba cuando
quedan actividades sin confirmar en el periodo.

**Una línea por colaborador y por día** (`normalizarExtras()`, en el
servidor). Si de verdad hay que pagarle dos cosas distintas al mismo
proveedor, va en una línea con el monto sumado y el detalle en el motivo.

### Los datos de la transferencia, que son lo que cierra el circuito

El cliente la pidió para el equipo **y** para los extras: *"cuando el
encargado de pago descarga la planilla del pago semanal, ya tiene hasta las
cuentas bancarias dentro de este resumen"*. Entonces:

- `Trabajadores` y `Colaboradores` llevan los campos que pide un banco en
  Chile: **titular, RUT, banco, tipo de cuenta, número y un correo para el
  comprobante**, más una **nota de pago** para lo que no cabe en ninguno.
  Viven en `panel/src/lib/banco.ts`.
- **Vive en la ficha y no en la línea del día.** Si alguien cambia de banco
  se le transfiere a la cuenta nueva, también lo que quedó pendiente: no es
  un hecho de ese día, es un dato de la persona.
- **La ve el administrador y quien paga, nadie más.** `/api/extras` se los
  recorta al encargado junto con los montos habituales, igual que los sueldos
  del equipo. Y `/api/informe` —que lee la cuenta de pagos— **devuelve de las
  fichas solo eso**: ni teléfonos, ni sueldos de hoy, ni tokens.
- El informe **avisa en pantalla a quién le falta**, antes de descargar. Es
  el momento en que importa: descubrirlo con la planilla ya bajada significa
  volver a entrar, completarla y bajarla de nuevo.

#### Por qué campos y no una sola columna de texto (2026-10-22)

Nació como **una columna de texto libre** donde cada quien escribía "Banco
Estado, cta rut 11.111.111-1" a su manera. Eso sirve para que una persona lo
lea y **no sirve para generar una transferencia**: quien paga tiene que
volver a separarlo a mano, banco por banco, y un dígito mal copiado manda la
plata a otra cuenta. Con un campo por dato, la planilla del informe **se
pega en la carga masiva del banco** sin tocar nada.

Decisiones que vale la pena tener escritas:

- **El titular en blanco es la propia persona.** Lo normal es que la cuenta
  sea suya; el campo existe para cuando no lo es —la cuenta de la señora, la
  del hermano— y obligar a repetir el nombre en cada ficha sería pedir
  trabajo para decir lo que ya se sabe. En el CSV sale resuelto: si está en
  blanco, va el nombre de la persona.
- **El tipo de cuenta es una lista cerrada y el banco no.** Los tipos son
  cuatro y se acabó; los bancos cambian de nombre, se fusionan y aparecen
  cooperativas, así que ahí hay texto libre con sugerencias. Un tipo que no
  está en la lista **se descarta en el servidor**, porque un valor inventado
  llegaría hasta la planilla del banco.
- **El RUT se empareja** (`rutLimpio()`): sin puntos y con guion, para que
  la carga masiva lo acepte. Lo que no parece un RUT se devuelve tal cual.
  **Desde el 2026-11-12 el del cliente además se controla** (`CampoRut`,
  `avisoRut()`): en la ficha, la factura y el contrato avisa en ámbar si no
  tiene forma de RUT o si el dígito verificador no calza. Avisa, no
  bloquea.
- **Falta algo = banco, tipo, número o RUT.** El titular y el correo no
  entran en esa cuenta: uno tiene valor por defecto y el otro es para el
  comprobante, no para la transferencia.
- **La columna vieja de texto libre no se borró: pasó a llamarse `Nota de
  pago`** y se quedó en su lugar. Lo que alguien hubiera escrito ahí sigue
  estando y se lee como lo que siempre fue, una nota; y de paso queda un
  campo útil para "transferir los lunes" o "avisar por WhatsApp".
- **En la tabla van en una segunda línea**, no en seis columnas más — ver
  "La tabla de Equipo: los anchos van declarados".

### Teléfonos y correos con forma, no texto libre (2026-10-23)

Lo pidió el cliente con el porqué incluido: *"donde guardamos números de
teléfono o correos electrónicos deberíamos aplicar un control de formato…
luego podremos automatizar más tareas (enviar link por WhatsApp o correo)"*.

Es el mismo argumento que los campos del banco. Un teléfono guardado como
`+56 9 1234 5678`, como `912345678` y como `9 1234-5678` es el mismo número
y tres cadenas distintas; mientras sean texto libre **nada se puede
automatizar encima**. La regla vive en `panel/src/lib/contacto.ts`:

- **Se escribe el celular con el 9 y sin el +56** — `9 1234 5678`, que es lo
  que la gente tiene en la cabeza y en su agenda. El código de país lo pone
  el panel. Pedir el `+56` es pedir que lo escriba mal dos de cada tres
  veces.
- **Se guarda siempre como `+56 9 1234 5678`**, venga escrito con puntos,
  guiones, paréntesis, con `+56`, con `56` o pelado. Y para un enlace sale
  `56912345678`, que es lo que quiere WhatsApp: `enlaceWhatsApp()` ya está
  escrito, esperando la pantalla que lo use.
- **No se inventa el 9.** Ocho dígitos no son un celular al que le falte el
  nueve: son un número que no sabemos leer, y completarlo mandaría un
  mensaje a un desconocido. La pantalla lo dice —"parece que le falta el 9"—
  y guarda lo que se escribió.
- **Avisa, no corrige ni bloquea.** Un fijo o un número extranjero se
  guardan tal cual con una marca en ámbar que dice que con ese no se va a
  poder automatizar. El panel no está para discutirle a nadie el teléfono de
  su primo; está para que lo que **sí** tiene forma de celular quede parejo.
- **Se ordena al salir del campo, no mientras se escribe.** Un `+56` que
  aparece solo bajo los dedos desconcierta; al terminar, ver el número
  ordenado confirma que quedó bien. Mismo criterio que el RUT.
- **El correo se guarda en minúsculas y sin espacios**, y la validación es
  a propósito simple: algo, una arroba, algo con un punto. La expresión
  "completa" del estándar es ilegible, acepta cosas que ningún proveedor
  entrega y aun así no dice si la casilla existe. Lo único que se puede
  atrapar es un error de tipeo evidente.
- **Lo normaliza el servidor, no solo la pantalla**, en las cinco puertas:
  trabajadores, colaboradores, los dos diálogos de creación y las reservas
  a mano. Una llamada directa a la API tiene que dejar el dato igual de
  parejo que un formulario.
- **También lo que llega de Shopify.** `telefonoDe()` y `emailDe()`
  normalizan antes de escribir en `Reservas`: una reserva comprada y una
  anotada a mano tienen que ser indistinguibles, o el día que se automatice
  algo habría que adivinar el formato fila por fila.

### Quién puede qué

**Igual que los turnos** (lo eligió el cliente): administrador y encargado
planifican y confirman; **los montos habituales y las cuentas son solo del
administrador**, y el encargado nunca los recibe. Como en el equipo, **el
monto del día lo propone el servidor** desde la ficha al guardar, así que un
encargado puede agendar y confirmar sin haber visto nunca la tarifa de nadie.

La cuenta de **pagos** no entra a `/extras` —no es suya— pero sí ve las
actividades en su informe y en su planilla, porque es quien las paga.

### Lo que no hace, a propósito

- **No reparte propina**, y no hay dónde anotarla. Hay una prueba que lo fija
  contando que ninguna de las dos pestañas tiene esa columna.
- **No cobra jornada ni horas extra.** Un extra cobra lo acordado para ese
  día; una diferencia por un acuerdo aparte va en el **ajuste con su motivo**,
  la misma convención que el equipo.
- **No aparece en el calendario de la portada.** Esa pantalla contesta cómo
  viene la ocupación; quién hace el show es otra pregunta y tiene su página.

