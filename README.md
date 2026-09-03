# Brasas de Lo Pirque — Landing page programa de afiliados

Landing page B2B (agencias de turismo, municipalidades, empresas) para el
programa de socios comerciales de un restaurante campestre / centro de
eventos en Chile.

## Archivo principal
`landing-afiliados.html` — HTML autocontenido (CSS inline, imágenes
embebidas en base64). Se puede abrir directo en cualquier navegador sin
servidor. Este es el archivo que hay que seguir editando.

## Carpeta `assets/`
Fotos originales ya procesadas (redimensionadas/comprimidas) que están
embebidas en el HTML, organizadas por origen:
- `assets/imgs/` — fotos extraídas del PDF de presentación original
  (`EMPRESAbrasas26.pdf`, ya no se tiene el PDF, solo estas imágenes).
- `assets/imgs2/` — fotos adicionales sacadas de Google Drive (comida,
  show ecuestre alternativo).
- `assets/gallery/` — las 27 fotos de la sección "Date una vuelta por
  el lugar" (galería swipe horizontal).

Si se necesitan MÁS fotos del lugar, están en Google Drive del cliente
(no accesible desde este entorno) — hay que pedírselas o conectar Drive
si Claude Code tiene esa integración disponible.

## Estilo / marca
- Nombre real: **Brasas de Lo Pirque** (brasasdelopirque.cl)
- Estética: fondo negro/casi negro, tipografía sans-serif en mayúsculas
  con tracking (bold), acentos en dorado (`--gold: #C9A227`), fotografía
  real como protagonista. Fuente: Fraunces (serif, para números/precios
  en itálica) + Work Sans (sans, todo lo demás). Ambas via Google Fonts
  `<link>` con fallback a system fonts.
- Todo el sistema de diseño (variables CSS) está en el `:root{}` al
  inicio del `<style>`.

## Estructura de la página (orden actual de secciones)
1. Foto principal a pantalla completa ("Trabaja con nosotros / Únete a
   nuestro programa de afiliados") + botón WhatsApp
2. 3 paneles de comisión (5% / 10% / 15%) — **con placeholders**, faltan
   las condiciones reales de cada nivel
3. "Una experiencia chilena auténtica, ideal para tus clientes" + 2do
   botón WhatsApp
4. Cuatro niveles de experiencias culinarias (Tradiciones $44.000 / Lo
   Pirque $50.000 / Brasas $70.000 / Sommelier $90.000) — tarjetas con
   efecto flip 3D (CSS puro, checkbox + label, sin JS): toca la foto y
   gira mostrando precio/bebestibles/nota. Menú compartido en un
   `<details>` colapsable debajo.
5. Galería "Date una vuelta por el lugar" — 27 fotos en carrusel swipe
   horizontal (CSS `scroll-snap`, sin JS)
6. Foto + texto del show ecuestre ("Una experiencia para todas las
   edades")
7. 6 tarjetas de actividades familiares dentro del recinto (show
   ecuestre, cabalgatas, castillo inflable, pintacaritas, ping-pong y
   tacataca, cancha de beach tenis)
8. Experiencias externas para empresas (coaching con caballos, taller
   de queso, karting, taller de asado)
9. Servicios adicionales (desayuno de campo / once campesina)
10. Precio del recinto (arriendo)
11. "Eventos a medida" (foto full-bleed con overlay)
12. Segmentos (agencias / municipalidades / empresas)
13. Por qué sumarte como socio (beneficios)
14. Cómo funciona (3 pasos)
15. Contacto: botón WhatsApp + formulario de email (solo captura, no
    envía — falta conectar a una plataforma de newsletter)
16. Footer

## Pendientes / placeholders que el cliente todavía tiene que confirmar
- Número real de WhatsApp (hoy dice `+56 9 0000 0000` en dos botones)
- Condición de cada nivel de comisión (5% / 10% / 15%) — hoy dice
  `[Placeholder: condición]`
- Ubicación, teléfono y email de contacto en el footer (placeholders
  entre corchetes)
- Plataforma de envío de newsletter (el cliente dijo que por ahora solo
  quiere juntar emails, conectar después)
- Fotos de castillo inflable, ping-pong/tacataca y cancha de beach
  tenis: **no se han encontrado fotos usables** — las que existen en el
  Drive del cliente muestran caras de niños de clientes reales,
  identificables, sin autorización de imagen confirmada. No usar esas
  fotos hasta que el cliente confirme que tiene permiso de esas
  familias, o consiga fotos alternativas sin caras identificables.

## Restricciones de contenido a mantener
- No usar fotos con niños de clientes identificables sin autorización
  confirmada (ver arriba).
- Todas las fotos usadas son del propio negocio (staff, fotógrafo
  contratado por el cliente) — no son stock ni de terceros.
