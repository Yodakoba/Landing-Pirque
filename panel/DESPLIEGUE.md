# Desplegar el panel

El panel es una aplicación Next.js. **No se copia ni se pega en ninguna
parte**: se ejecuta en un servidor y le habla a la planilla por la API de
Google Sheets.

Esta guía usa **Vercel**, que es de los creadores de Next.js, tiene plan
gratuito suficiente para esto y despliega desde GitHub con cada push.

---

## Antes de empezar

Dos cosas, en este orden. La primera es la que más tiempo toma.

### 1. La cuenta de servicio de Google

Es la identidad con la que el panel entra a la planilla. No es tu cuenta: es
un "robot" al que le das permiso.

1. Entra a [Google Cloud Console](https://console.cloud.google.com) y crea un
   proyecto (o usa uno que tengas).
2. **APIs y servicios → Biblioteca** → busca **Google Sheets API** →
   **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de
   servicio**. Ponle un nombre, por ejemplo `panel-reservas`. Los pasos de
   permisos opcionales se pueden saltar.
4. Entra a la cuenta recién creada → pestaña **Claves** → **Agregar clave →
   Crear clave nueva → JSON**. Se descarga un archivo.
5. **Abre ese JSON.** Necesitas dos valores de adentro:
   - `client_email` — algo como `panel-reservas@tu-proyecto.iam.gserviceaccount.com`
   - `private_key` — un bloque largo que empieza en `-----BEGIN PRIVATE KEY-----`

**Guarda ese JSON en un lugar seguro y no lo subas al repositorio.** Quien lo
tenga puede entrar a tu planilla.

### 2. Compartir la planilla

En la planilla: **Compartir** → pega el `client_email` del paso anterior →
dale permiso de **Editor** → Enviar.

**Este es el paso que más se olvida.** Sin él, la API responde 403 aunque
todas las credenciales estén bien puestas.

---

## El despliegue

### 1. Crear el proyecto en Vercel

1. Entra a [vercel.com](https://vercel.com) y conéctate con GitHub.
2. **Add New → Project** → elige el repositorio `Landing-Pirque`.
3. **Acá viene lo importante:** en *Configure Project*, abre **Root
   Directory** y elige **`panel`**.

   Si lo dejas en la raíz, Vercel va a intentar construir el sitio estático y
   va a fallar sin decir por qué. El panel vive en `panel/`, no en la raíz.

4. *Framework Preset* se detecta solo como **Next.js**. Déjalo.

### 2. Las variables de entorno

En la misma pantalla, **Environment Variables**. Son cinco:

| Variable | De dónde sale |
|---|---|
| `GOOGLE_SHEET_ID` | De la URL de la planilla, el tramo entre `/d/` y `/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | El `client_email` del JSON |
| `GOOGLE_PRIVATE_KEY` | El `private_key` del JSON, **completo** |
| `PANEL_USUARIO` | El que tú elijas, por ejemplo `brasas` |
| `PANEL_CLAVE` | **Una clave larga y que no uses en otra parte** |

Sobre `GOOGLE_PRIVATE_KEY`: pégala entera, **incluidas** las líneas
`-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`. El campo de
Vercel acepta varias líneas. Si tu copia trae los saltos como `\n` literales,
también funciona: el código deshace las dos formas.

### 3. Deploy

Dale a **Deploy** y espera un par de minutos. Vercel te da una URL del tipo
`brasas-panel.vercel.app`.

---

## La primera vez que entres

1. El navegador te va a pedir **usuario y clave**: los de `PANEL_USUARIO` y
   `PANEL_CLAVE`.
2. **Antes que nada, abre `/api/diagnostico`.** Te dice si las dos hojas
   existen, qué encabezado tienen y **qué columnas no calzaron**.

Si algo no calza, lo arreglas en **un solo archivo**: `src/lib/columnas.ts`.

### Qué significa cada error

| Lo que ves | Qué pasó |
|---|---|
| 503 «El panel no tiene PANEL_USUARIO y PANEL_CLAVE» | Faltan esas variables. El panel se cierra en vez de quedar abierto. |
| Error con `403` o `permission` | No compartiste la planilla con el `client_email`. |
| Error con `Unable to parse range` | El nombre de una hoja no coincide. Son `Reservas` y `Fechas Hábiles`, con tilde. |
| Error con `invalid_grant` o `DECODER` | La clave privada quedó mal pegada. Tiene que ir completa, con sus líneas BEGIN y END. |
| El panel abre pero todo en cero | Abre `/api/diagnostico`: casi seguro es un encabezado que no calza. |

---

## Después

**Cada push a la rama vuelve a desplegar.** No hay que hacer nada más.

Para cambiar una variable: en Vercel, *Settings → Environment Variables*, y
después **Redeploy** — las variables no se recargan solas.

---

## Lo que este despliegue NO resuelve

Dicho para que no sorprenda:

- **No hay cuentas por persona.** Una sola credencial compartida. No queda
  registro de quién hizo cada cambio.
- **No hay botón de salir.** El navegador recuerda la credencial hasta que se
  cierra. Para salir, ventana privada o cerrar el navegador.
- **La clave es lo único que protege las reservas.** Si se filtra, cualquiera
  entra. Cámbiala en Vercel y redespliega.
- **Siguen siendo dos escritores sobre la misma planilla**, el panel y el
  Apps Script, sin bloqueo entre ellos. Ver el apartado del `README.md`.
