# Brasas de Lo Pirque — sitio web

Sitio de **Brasas de Lo Pirque** (brasasdelopirque.cl), restaurante campestre
y centro de eventos en Chile.

El repositorio contiene **dos entregables distintos**, dirigidos a públicos
distintos y armados de forma distinta a propósito.

## 1. Sitio público

Para clientes finales: gente que quiere pasar el día en familia o celebrar
algo. Cinco páginas, sin los niveles de comisión.

| Archivo | Contenido |
|---|---|
| `index.html` | Bienvenida, tres accesos, show ecuestre y galería de 27 fotos |
| `experiencias.html` | Los cuatro niveles culinarios con precios, menú completo, desayuno y once |
| `actividades.html` | Las seis actividades incluidas en el recinto y las cuatro con costo adicional |
| `eventos.html` | Eventos a medida, arriendo exclusivo del recinto y sus valores |
| `contacto.html` | WhatsApp, lista de novedades y accesos al resto del sitio |
| `404.html` | Página de error con la identidad del sitio |

Todas comparten `assets/css/site.css` y apuntan a las fotos reales de
`assets/`. Las cinco páginas más el CSS suman unos 66 KB; las imágenes se
cachean entre páginas.

**Para verlo:** abre `index.html` directo en el navegador — las rutas son
relativas y funciona sin servidor. Para probar los enlaces como en producción
conviene servirlo: `python3 -m http.server` y entrar a `localhost:8000`.

## 2. Landing de socios comerciales

`landing-afiliados.html` — landing B2B para agencias de turismo,
municipalidades y empresas que revenden el lugar. Está enlazado desde el menú
y el pie de las cinco páginas del sitio público, y **los niveles de comisión
viven solo acá**.

Es un archivo único y autocontenido: CSS inline, 40 imágenes embebidas en
base64, cero dependencias. Pesa 4,5 MB y se abre con doble clic, sin servidor.

**Ojo:** que esté armado distinto al sitio público es deliberado, no una
inconsistencia pendiente de arreglar. Repetir el criterio autocontenido en
cinco páginas habría duplicado el hero y las fotos comunes en cada archivo
(del orden de 15-25 MB).

## Carpeta `assets/`

Fotos originales ya procesadas, organizadas por origen:

- `assets/imgs/` — extraídas del PDF de presentación original.
- `assets/imgs2/` — sacadas del Google Drive del cliente.
- `assets/gallery/` — las 27 fotos del carrusel del lugar.
- `assets/css/` — la hoja compartida del sitio público.

Si hacen falta más fotos, están en el Google Drive del cliente.

## Sin build step

No hay npm, bundler, linter ni tests, y no hace falta ninguno: son archivos
estáticos que el navegador abre tal cual. Tampoco hay JavaScript propio — el
menú de celular, las tarjetas que giran y los carruseles son CSS puro
(checkbox + label y `scroll-snap`).

Como no hay build, **la cabecera y el pie están duplicados en cada página**.
Si tocas el menú, hay que tocarlo en las cinco.

## Estilo

Fondo negro, acentos dorados y fotografía real como protagonista. Fuentes
Fraunces (serif itálica, para cifras y precios) y Work Sans, vía Google Fonts
con fallback a system fonts. Las variables del sistema de diseño están en el
`:root{}` de `assets/css/site.css` y en el `<style>` del landing.

## Restricciones de contenido

- **No usar fotos con niños de clientes identificables sin autorización
  confirmada.** Las que existen en el Drive para castillo inflable,
  ping-pong/tacataca y beach tenis muestran caras de niños de clientes reales
  sin autorización de imagen. Por eso esas tres actividades van sin foto.
- Todas las fotos son del propio negocio. No hay stock ni imágenes de
  terceros, y no se deben agregar.

## Pendientes

- **Número real de WhatsApp** — hoy todos los enlaces apuntan a
  `wa.me/56900000000`, un número falso. Hay que reemplazarlo antes de
  publicar el sitio de cara al público.
- **Condiciones de cada nivel de comisión** — tres `[Placeholder: condición]`
  en el landing de socios.
- **Ubicación y teléfono** — aparecen como `[Ubicación] · [teléfono]` en el
  pie de todas las páginas.
- **Plataforma de newsletter** — el formulario de email no tiene handler, así
  que hoy no captura nada. Falta conectarlo (Formspree, Google Forms o un
  endpoint propio).
- **Fotos de castillo inflable, ping-pong/tacataca y beach tenis** —
  bloqueadas por la restricción de arriba.

## Publicación

El sitio está listo para GitHub Pages: incluye `.nojekyll`, todas las rutas
son relativas (funcionan bajo el subdirectorio del repo) y no hay desajustes
de mayúsculas. Para activarlo: *Settings* → *Pages* → *Deploy from a branch*,
rama `main`, carpeta `/ (root)`.
