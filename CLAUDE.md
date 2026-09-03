# Brasas de Lo Pirque — landing del programa de afiliados

Landing page B2B (agencias de turismo, municipalidades y empresas) para el
programa de socios comerciales de **Brasas de Lo Pirque**
(brasasdelopirque.cl), un restaurante campestre y centro de eventos en Chile.

## Cómo está armado el proyecto

- **`landing-afiliados.html`** es el único entregable y el archivo que hay que
  editar. Es HTML autocontenido: CSS inline en un solo `<style>`, 40 imágenes
  embebidas en base64, cero JavaScript de terceros. Se abre directo en el
  navegador, sin servidor ni build step.
- **No hay toolchain**: no hay npm, bundler, linter ni tests. No agregues uno
  salvo que el cliente lo pida.
- **`assets/`** guarda los originales ya procesados de esas fotos, por si hay
  que re-embeber o recortar alguna:
  - `assets/imgs/` — extraídas del PDF de presentación original
    (`EMPRESAbrasas26.pdf`, ya no disponible; solo quedan estas imágenes).
  - `assets/imgs2/` — sacadas del Google Drive del cliente (comida, show
    ecuestre alternativo).
  - `assets/gallery/` — las 27 fotos del carrusel "Date una vuelta por el lugar".
- Si hacen falta **más fotos del lugar**, están en el Google Drive del cliente.
  Hay que pedírselas o usar la integración de Drive si está disponible.

### Editar el HTML sin romperlo

El archivo pesa ~4.7 MB porque los payloads base64 ocupan casi todo. Para
trabajarlo:

- **Nunca lo leas entero.** Filtra los payloads primero:
  `sed 's/data:image\/[a-z]*;base64,[A-Za-z0-9+\/=]*/[B64]/g' landing-afiliados.html`
- Para reemplazos de texto masivos, opera **solo fuera de los payloads**
  (parte el archivo con `re.split` sobre el patrón `data:image/...;base64,...`),
  porque una cadena corta puede aparecer por casualidad dentro del base64.
- Después de cualquier edición, verifica integridad:
  `wc -l landing-afiliados.html` debe seguir dando 734 líneas y
  `grep -c 'data:image/jpeg;base64' landing-afiliados.html` debe dar 40.

### Previsualizar

Chromium headless está preinstalado en este entorno:

```
/opt/pw-browsers/chromium-1194/chrome-linux/chrome --headless --no-sandbox \
  --disable-gpu --hide-scrollbars --window-size=1280,1600 \
  --screenshot=out.png --virtual-time-budget=6000 \
  "file://$PWD/landing-afiliados.html"
```

Las tipografías saldrán en fallback porque el sandbox bloquea
`fonts.googleapis.com` — es del entorno, no de la página.

## Estilo y marca

- Estética: fondo negro/casi negro, sans-serif en mayúsculas con tracking
  (bold), acentos en dorado, fotografía real como protagonista.
- Fuentes: **Fraunces** (serif, itálica, para números y precios) + **Work Sans**
  (sans, todo lo demás), vía `<link>` a Google Fonts con fallback a system fonts.
- Todo el sistema de diseño vive en el `:root{}` al inicio del `<style>`
  (`--gold: #C9A227`, `--bg: #0B0B0A`, etc.). Usa esas variables, no valores
  hardcodeados.

## Voz y redacción

- **Español de Chile, tuteo.** Nada de voseo argentino: se escribe
  "Escríbenos", "Cuéntanos", "Súmate", "Deja", "¿Buscas...?", "si eres agencia"
  — nunca "Escribinos", "Contanos", "Sumate", "Dejá", "¿Buscás...?", "si sos".
  (La página venía con voseo y ya se corrigió; no lo reintroduzcas al escribir
  copy nuevo.)
- Tono: comercial pero sobrio, sin signos de exclamación ni superlativos.

## Estructura de la página (orden actual)

1. Foto full-screen "Trabaja con nosotros / Únete a nuestro programa de
   afiliados" + botón WhatsApp
2. Tres paneles de comisión (5% / 10% / 15%)
3. "Una experiencia chilena auténtica, ideal para tus clientes" + 2º botón
   WhatsApp
4. Cuatro niveles de experiencias culinarias (Tradiciones $44.000 / Lo Pirque
   $50.000 / Brasas $70.000 / Sommelier $90.000) — tarjetas con flip 3D en CSS
   puro (checkbox + label, sin JS). Menú compartido en un `<details>` debajo.
5. Galería "Date una vuelta por el lugar" — 27 fotos, carrusel swipe con
   `scroll-snap`, sin JS
6. Foto + texto del show ecuestre ("Una experiencia para todas las edades")
7. Seis tarjetas de actividades familiares dentro del recinto
8. Experiencias externas para empresas (coaching con caballos, taller de queso,
   karting, taller de asado)
9. Servicios adicionales (desayuno de campo / once campesina)
10. Precio del recinto ($2.500.000 + IVA fin de semana / $1.500.000 + IVA días
    de semana, solo arriendo, sin catering)
11. "Eventos a medida" (full-bleed con overlay)
12. Segmentos (agencias / municipalidades / empresas)
13. Por qué sumarte como socio
14. Cómo funciona (3 pasos)
15. Contacto: botón WhatsApp + formulario de email
16. Footer

Las interacciones (flip de tarjetas, carrusel) son **CSS puro a propósito**.
Mantenlo así salvo que el cliente pida lo contrario.

## Restricciones de contenido — importante

- **No usar fotos con niños de clientes identificables sin autorización
  confirmada.** Las fotos que existen en el Drive del cliente para castillo
  inflable, ping-pong/tacataca y cancha de beach tenis muestran caras de niños
  de clientes reales, identificables, sin autorización de imagen. Por eso esas
  tres actividades hoy van **sin foto**. No las ilustres con esas imágenes hasta
  que el cliente confirme que tiene permiso de esas familias o consiga fotos
  alternativas sin caras identificables.
- Todas las fotos usadas son del propio negocio (staff o fotógrafo contratado
  por el cliente). No hay stock ni imágenes de terceros, y no se deben agregar.

## Pendientes (el cliente todavía tiene que confirmar)

Búscalos por texto, no por número de línea:

- **Número real de WhatsApp** — hoy hay 4 enlaces a `wa.me/56900000000`
  (hero, sección de experiencias, contacto y el botón flotante `.wa-float`)
  y una nota `[reemplazar por el número real de WhatsApp]`.
- **Condición de cada nivel de comisión** — 3 apariciones de
  `[Placeholder: condición]` en los paneles de 5% / 10% / 15%.
- **Ubicación y teléfono del footer** — `[Ubicación] · [teléfono]`.
- **Plataforma de newsletter** — el formulario de email tiene
  `onsubmit="return false;"` y ningún handler, así que **el email se descarta
  al enviar: hoy no captura nada**. El cliente dijo que por ahora solo quiere
  juntar correos y conectar la plataforma de envío después; hay que resolver al
  menos la captura (Formspree, Google Forms o un endpoint propio).
- **Fotos de castillo inflable, ping-pong/tacataca y beach tenis** — bloqueadas
  por la restricción de arriba.

## Git

Trabajar en la rama `claude/migrate-project-claude-code-hfqsyc`. Rama por
defecto: `main`.
