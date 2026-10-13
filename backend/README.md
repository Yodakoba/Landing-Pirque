# Backend de reservas

Esta carpeta **no se publica**. Es el código de un proyecto de Google Apps
Script que vive pegado a una planilla de Google. Acá se guarda para tener
historial y revisión; la copia que corre está en la cuenta de Google del
cliente.

## Qué hace

```
Sitio (GitHub Pages)
   │
   ├─ pide las fechas abiertas ────────► Apps Script ──► Planilla (Fechas)
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
Brasas**. Agrega una pestaña **`Fechas`** con esta fila 1 exacta:

| fecha | cupo | abierta | notas |
|---|---|---|---|
| 2026-11-15 | 60 | sí | |
| 2026-11-16 | 60 | sí | |

- **fecha** en formato `AAAA-MM-DD`.
- **cupo** es el total de personas de ese día, adultos y niños juntos.
- **abierta** es `sí` o `no`. Cerrar un día es cambiar esa celda.

Las pestañas **`Reservas`** y **`Registro`** las crea el script solo la
primera vez. No hay que armarlas a mano.

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

En el editor hay cuatro funciones para correr a mano, en este orden:

1. `revisarConfiguracion()` — que las cuatro propiedades estén.
2. `probarShopify()` — que el token sirva. Muestra cuántos pedidos pagados
   hay en los últimos 30 días.
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

Copia la URL que queda. Esa es la que necesita el sitio.

### 7. El activador

**Activadores → Añadir activador**:

- Función: `sincronizarPedidos`
- Origen: según tiempo
- Intervalo: cada 5 minutos

Es lo que trae los pedidos pagados y los convierte en reservas.

## Lo primero que hay que validar

**Que el sitio pueda leer el endpoint desde otro dominio.** Los Web Apps de
Apps Script responden con un redirect a `googleusercontent.com`, y eso tiene
manías conocidas con CORS. Puede funcionar directo o puede necesitar un
ajuste. **Es lo primero que hay que probar, no algo que se dé por hecho**:
abre la URL en el navegador y después pruébala desde el sitio.

## Lo que este diseño no resuelve

- **Se puede sobrevender por un margen chico.** El cupo se descuenta cuando
  el pedido ya está pagado. Entre que alguien llega al checkout y paga, otro
  podría tomar los últimos lugares. Con el volumen de un restaurante no
  debería pasar seguido, pero puede pasar, y conviene saberlo antes que
  descubrirlo. Si molesta, se arregla reservando el lugar unos minutos al
  crear el carrito.
- **No manda correos.** La confirmación de compra la manda Shopify.
- **No cancela ni reagenda.** Una cancelación en Shopify no borra la fila ni
  el evento. Hoy eso se hace a mano en la planilla.
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
