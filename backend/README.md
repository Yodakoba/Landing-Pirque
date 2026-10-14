# Backend de reservas

Esta carpeta **no se publica**. Es el código de un proyecto de Google Apps
Script que vive pegado a una planilla de Google. Acá se guarda para tener
historial y revisión; la copia que corre está en la cuenta de Google del
cliente.

## Qué hace

```
Sitio (GitHub Pages)
   │
   ├─ pide las fechas abiertas ────────► Apps Script ──► Config + Excepciones
   │                                                          │
   └─ crea el carrito ──► checkout de Shopify ──► pago        │
                                                   │          │
                        cada 5 min, Apps Script ◄──┘          │
                        le pregunta a Shopify                 │
                                   │                          │
                        ┌──────────┴──────────┐               │
                        ▼                     ▼               ▼
              Planilla (Reservas)     Google Calendar    cupo al día
```

**Shopify cobra. Nosotros agendamos.** El checkout no cambia; lo que
agregamos es quién lleva el calendario, el cupo y el registro.

## Por qué consultamos a Shopify en vez de recibir un webhook

Shopify firma sus webhooks con HMAC y manda la firma en una cabecera. **Los
Web Apps de Apps Script no dan acceso a las cabeceras**: `doPost(e)` entrega
el cuerpo y los parámetros, nada más. Sin poder verificar la firma,
cualquiera que descubriera la URL podría inventar reservas.

Preguntando nosotros, eso no existe: nadie nos escribe. Además el sistema se
recupera solo de caídas, porque la próxima corrida se pone al día. El costo
es que la reserva aparece con unos minutos de atraso, que para esto no es
nada.

## Instalación

### 1. La planilla

Crea una planilla nueva en Google Drive. Llámala, por ejemplo, **Reservas
Brasas**.

**No hay una lista de fechas escrita a mano.** Si el lugar abre sábados y
domingos, eso serían 104 filas al año que alguien tendría que mantener, y se
desactualizarían — es exactamente el problema que tenía el sitio. En vez de
eso hay una **regla** y una lista de **excepciones**.

Pestaña **`Config`**, con esta fila 1 exacta:

| clave | valor |
|---|---|
| `dias_abiertos` | `sáb,dom` |
| `cupo_normal` | `60` |
| `dias_a_futuro` | `90` |
| `aviso_pocos_lugares` | `10` |

- **`dias_abiertos`** — qué días de la semana se abre normalmente. Acepta
  `sáb`, `sab`, `SAB`, separados por coma, espacio o barra.
- **`cupo_normal`** — cuántas **personas** entran en un día normal.
  **Adultos y niños juntos**: es lo que limita sillas, mesas y comida.
- **`dias_a_futuro`** — hasta cuántos días adelante se puede reservar.
- **`aviso_pocos_lugares`** — bajo cuántos lugares el sitio avisa "últimos
  lugares". Con `0` no avisa nunca.

Pestaña **`Excepciones`**, solo para lo que se sale de la regla:

| fecha | abierta | cupo | nota |
|---|---|---|---|
| 2026-09-18 | sí | 80 | 18 de septiembre, cae jueves |
| 2026-12-25 | no | | Navidad |
| 2026-11-15 | | 40 | Medio aforo por evento privado |

Los tres casos en una sola tabla:

- **Abrir un día que la regla cierra** → `abierta` = `sí`.
- **Cerrar un día que la regla abre** → `abierta` = `no`.
- **Cambiarle solo el cupo** → deja `abierta` **en blanco** y pon el `cupo`.
  En blanco significa "no opino sobre si abre, solo le cambio el cupo".

En operación normal esta pestaña queda quieta. Solo se toca cuando hay algo
fuera de lo común.

Las pestañas **`Reservas`** y **`Registro`** las crea el script solo la
primera vez. No hay que armarlas a mano, y **se les pueden mover o insertar
columnas**: el script escribe buscando cada valor por el nombre de su
columna, no por su posición.

### Las dos columnas que importan para mirar el día

`Reservas` tiene dos columnas que vienen de que existan dos formas de pagar:

- **`modalidad`** — qué compró: `Pago directo` (en línea, con descuento) o
  `Solo reserva` (paga en el local). Sale del nombre de la variante en
  Shopify.
- **`estado`** — `pagada`, `por pagar` o `cancelada`.

**Una fila que diga `Pago directo` y `por pagar` no debería existir.** La
tienda tiene reglas que ocultan los medios de pago según el SKU, así que
quien compra la variante con descuento no debería poder elegir pagar en el
local. Si esa combinación aparece, **la regla dejó de aplicar**: en el
checkout no avisa nada, simplemente vuelven a salir los dos medios. Esta
columna es la única forma de enterarse.

El estado **se mantiene al día**: si un pedido se paga después, o se cancela,
la corrida siguiente le corrige la celda. Por eso no sirve editarla a mano.

Una celda de `estado` en blanco es una reserva anotada antes de que la
columna existiera. Cuenta como ocupada.

### 2. El código

En la planilla: **Extensiones → Apps Script**. Borra lo que venga y pega
entero el contenido de `Codigo.gs`. Guarda.

### 3. El token de Shopify

En el admin de Shopify: **Settings → Apps and sales channels → Develop apps
→ Create an app**. En **Configuration → Admin API integration** marca el
permiso **`read_orders`** — solo ese. Instala la app y copia el **Admin API
access token**, que empieza en `shpat_`.

> Este token sí es de Admin API, y acá está bien. La regla del proyecto
> —"un token de Admin API jamás"— es sobre el **sitio**, donde quedaría en
> un archivo público. Este código corre en los servidores de Google y el
> token se guarda en las propiedades del script, que nunca salen al
> navegador. Es el lugar correcto para uno.

### 4. Las propiedades

En el editor de Apps Script: **Configuración del proyecto → Propiedades del
script**. Agrega las cuatro:

| Propiedad | Valor |
|---|---|
| `SHOPIFY_DOMINIO` | `brasas-de-lo-pirque-development.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | el `shpat_…` del paso anterior |
| `SHOPIFY_VERSION` | la versión de Admin API vigente, ej. `2026-07` |
| `CALENDAR_ID` | el ID del calendario donde van las reservas |

El ID del calendario sale de Google Calendar: **Configuración del calendario
→ Integrar calendario → ID del calendario**. Para el principal es la
dirección de correo.

**No pongas nada de esto en `Codigo.gs`.** Si va ahí, termina en el repo.

### 5. Probar antes de desplegar

**Ojo con el desplegable de funciones.** El editor trae preseleccionada la
primera función del archivo, que es una ayudante interna. Si aprietas
Ejecutar sin cambiarla, sale un error que no tiene que ver con tu
configuración. **Elige la función en el desplegable antes de ejecutar.**

En el editor hay cuatro funciones para correr a mano, en este orden:

1. `revisarConfiguracion()` — que las cuatro propiedades estén.
2. `probarShopify()` — que el token sirva. Muestra cuántos pedidos hay en
   los últimos 30 días.
3. `probarCalendario()` — que el calendario exista y se pueda escribir.
4. `probarFechas()` — muestra lo que el sitio recibiría hoy.

La primera vez Google va a pedir autorización. Como el script no está
verificado, aparece una pantalla de advertencia: **Configuración avanzada →
Ir a (nombre del proyecto)**. Es el proyecto propio del cliente, en su
cuenta.

### 6. Publicar el endpoint

**Implementar → Nueva implementación → Aplicación web**:

- **Ejecutar como:** yo (el dueño de la planilla).
- **Quién tiene acceso:** cualquier usuario.

"Cualquier usuario" suena fuerte, pero lo único que ese endpoint hace en
`GET` es **devolver las fechas abiertas y los lugares que quedan**. No
escribe nada, no expone datos de clientes, no recibe reservas. Es lo mismo
que el sitio muestra en pantalla.

Copia la URL que queda. Esa es la que necesita el sitio: va en
`CONFIG.backend`, al inicio de `assets/js/reserva.js`.

**Si alguna vez hay que cambiar el código**, en Apps Script usa
**Implementar → Gestionar implementaciones → editar → Versión nueva**. Eso
conserva la URL. Crear una **implementación nueva** entrega otra URL, y
entonces hay que actualizar `CONFIG.backend` o el calendario del sitio queda
apuntando a la vieja.

### 7. El activador

**Activadores → Añadir activador**:

- Función: `sincronizarPedidos`
- Origen: según tiempo
- Intervalo: cada 5 minutos

Es lo que trae los pedidos y los convierte en reservas. **Trae los pagados y
los que están por pagar**, porque una reserva con pago en el local es una
reserva igual: ocupa la silla.

## Lo primero que hay que validar

**Que el sitio pueda leer el endpoint desde otro dominio.** Los Web Apps de
Apps Script responden con un redirect a `googleusercontent.com`, y eso tiene
manías conocidas con CORS. Puede funcionar directo o puede necesitar un
ajuste. **Es lo primero que hay que probar, no algo que se dé por hecho**:
abre la URL en el navegador y después abre `reservas.html` publicado. Si el
calendario trae fechas, está resuelto; si dice que no pudo cargarlas, es
CORS y no el código del sitio.

El lado del sitio ya está probado contra un backend simulado, así que si
falla, el problema está acá o en el camino, no allá.

## El endpoint responde 200 incluso cuando falla

`ContentService` **no permite elegir el código HTTP**. Un error no viaja como
400 ni como 500: viaja como **200 con `{"error": "..."}` en el cuerpo**. El
sitio lo sabe y revisa ese campo. Si algún día se lee este endpoint desde
otra parte, hay que hacer lo mismo, o los errores van a pasar por respuestas
válidas y vacías.

## Lo que este diseño no resuelve

- **Se puede sobrevender por un margen chico.** El cupo se descuenta cuando
  el pedido ya está pagado. Entre que alguien llega al checkout y paga, otro
  podría tomar los últimos lugares. Con el volumen de un restaurante no
  debería pasar seguido, pero puede pasar, y conviene saberlo antes que
  descubrirlo. Si molesta, se arregla reservando el lugar unos minutos al
  crear el carrito.
- **No manda correos.** La confirmación de compra la manda Shopify.
- **Una cancelación en Shopify libera el cupo, pero no borra nada.** La fila
  queda con `estado` en `cancelada` y deja de contar para el aforo; la fila y
  el evento del calendario siguen ahí y se borran a mano. Reagendar sigue
  siendo a mano.
- **Una reserva sin pagar ocupa lugar igual, y alguien puede no llegar.** Ese
  lugar se pierde. Es el costo de ofrecer pago en el local, y se administra
  desde la planilla: si pasa seguido, se cierra la modalidad o se le pone un
  abono, las dos cosas del lado de Shopify.
- **La planilla es la fuente de verdad, el calendario es una comodidad.** Si
  falla crear el evento, la reserva igual queda anotada y el problema queda
  en la pestaña `Registro`.

## Seguridad

- El endpoint público **solo lee fechas y cupos**. No entrega reservas ni
  datos de clientes.
- El token de Shopify y el ID del calendario viven en las propiedades del
  script, **nunca en este repo ni en el navegador**.
- El token pide **solo `read_orders`**. No puede modificar la tienda.
- `sincronizarPedidos()` toma un candado, para que dos corridas solapadas no
  puedan duplicar una reserva, y además ignora los pedidos ya anotados.
