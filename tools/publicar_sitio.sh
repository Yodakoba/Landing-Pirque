#!/usr/bin/env bash
# Arma lo que Vercel publica del sitio público (proyecto brasas-sitio).
#
# Es el Build Command de ese proyecto: `bash tools/publicar_sitio.sh`.
# No construye nada: copia el HTML tal cual, igual que la línea de antes
# (`mkdir -p dist && cp -r *.html *.pdf assets en pt dist/`), y además
# escribe las redirecciones de las direcciones del sitio viejo de Shopify.
#
# Por qué un script y no un vercel.json: lo que se pone en la raíz del repo
# lo leen los dos proyectos de Vercel, y un .vercelignore ahí dejó el panel
# en 404 (2026-11-19). Esta carpeta, .vercel/output, se crea durante la
# construcción del sitio y nada más: el panel nunca corre este script.
# Vercel la usa cuando existe (Build Output API v3), por encima del
# Output Directory del proyecto.
#
# Lo que se publica es una lista de lo público. Una carpeta o archivo
# público nuevo en la raíz se agrega a PUBLICO; lo que no está ahí no sale.

set -euo pipefail
cd "$(dirname "$0")/.."

PUBLICO=(*.html *.pdf robots.txt sitemap.xml assets en pt)

# Dónde queda la tienda de Shopify después del lanzamiento. Recibe los
# links de clientes del sitio viejo que Shopify muestra sin su tema: el
# estado de un pedido, el checkout y los links de carrito con código.
TIENDA="https://tienda.brasasdelopirque.cl"

# Las direcciones del sitio viejo, del sitemap de brasasdelopirque.cl
# (2026-11-19), y a qué página nueva van. Google las tiene indexadas y hay
# links compartidos: con la redirección se conservan las visitas y la
# posición en Google; sin ella serían un 404.
EXACTAS='
/products/almuerzo-y-show-ecuestre-1  /reservas.html
/pages/ticket                         /reservas.html
/pages/contact                        /reservas.html
/pages/menu-nuevo                     /experiencias.html
/collections/frontpage                /experiencias.html
/collections/restaurante              /experiencias.html
/pages/eventoskthae                   /eventos.html
/pages/eventos-corporativos           /dossier.html
/pages/turismo                        /landing-afiliados.html
/pages/fotos                          /
/pages/galeria-de-fotoskns8x          /
/blogs/news                           /
'

# Cualquier otra del mismo tipo que no esté en el sitemap.
PREFIJOS='
/products     /reservas.html
/collections  /experiencias.html
/pages        /
/blogs        /
'

rm -rf .vercel/output
mkdir -p .vercel/output/static
cp -r "${PUBLICO[@]}" .vercel/output/static/

{
  printf '{\n  "version": 3,\n  "routes": [\n'

  while read -r viejo nuevo; do
    [ -n "$viejo" ] || continue
    printf '    { "src": "^%s/?$", "status": 301, "headers": { "Location": "%s" } },\n' "$viejo" "$nuevo"
  done <<<"$EXACTAS"

  # Lo que era de la tienda sigue siendo de la tienda, pero SOLO lo que
  # Shopify muestra sin su tema (2026-11-21): el estado de un pedido, el
  # checkout y los links de carrito con código (/cart/c/…, que es por donde
  # el sitio manda a pagar, y /cart/<variante>:<cantidad>). Esas páginas no
  # las dibuja el tema, así que el tema de redirección de Shopify no las
  # toca y no pueden rebotar.
  printf '    { "src": "^/((?:[0-9]+/orders|checkouts)(?:/.*)?|cart/.+)$", "status": 301, "headers": { "Location": "%s/$1" } },\n' "$TIENDA"

  # Lo que SÍ dibuja el tema —el carrito vacío, la cuenta, las políticas—
  # no va a la tienda: desde el lanzamiento, en tienda. hay un tema de
  # redirección que lo devuelve a este sitio con la misma ruta, y mandarlo
  # de vuelta allá sería un rebote sin fin. Va a su página de acá.
  printf '    { "src": "^/cart/?$", "status": 301, "headers": { "Location": "/reservas.html" } },\n'
  printf '    { "src": "^/(?:account|policies)(?:/.*)?$", "status": 301, "headers": { "Location": "/" } },\n'

  while read -r prefijo nuevo; do
    [ -n "$prefijo" ] || continue
    printf '    { "src": "^%s(?:/.*)?$", "status": 301, "headers": { "Location": "%s" } },\n' "$prefijo" "$nuevo"
  done <<<"$PREFIJOS"

  # /en y /pt sin la barra final: los enlaces de esas páginas son relativos
  # y sin la barra apuntarían a la raíz, o sea al español.
  printf '    { "src": "^/(en|pt)$", "status": 301, "headers": { "Location": "/$1/" } },\n'

  # Lo que existe se sirve tal cual; lo que no, con el 404 de su idioma.
  printf '    { "handle": "filesystem" },\n'
  printf '    { "src": "^/en/.*$", "status": 404, "dest": "/en/404.html" },\n'
  printf '    { "src": "^/pt/.*$", "status": 404, "dest": "/pt/404.html" },\n'
  printf '    { "src": "^/.*$", "status": 404, "dest": "/404.html" }\n'

  printf '  ]\n}\n'
} > .vercel/output/config.json

echo "Sitio listo en .vercel/output: $(find .vercel/output/static -type f | wc -l) archivos," \
     "$(grep -c '"status": 301' .vercel/output/config.json) redirecciones."
