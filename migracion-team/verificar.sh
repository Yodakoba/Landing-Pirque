#!/usr/bin/env bash
# Comprueba que el proyecto quedó conectado después de migrar a la cuenta Team.
# Solo lee: no escribe archivos, no crea carritos, no toca la planilla.
#
#   bash migracion-team/verificar.sh            # lo rápido
#   bash migracion-team/verificar.sh --pruebas  # además, las pruebas del panel
#
# Se corre desde la raíz del repo.

cd "$(dirname "$0")/.." || exit 1

ok=0; mal=0
bien()  { echo "  ✓ $1"; ok=$((ok+1)); }
falla() { echo "  ✗ $1"; mal=$((mal+1)); }
codigo() { curl -sS -o /dev/null -w '%{http_code}' -m 20 "$@" 2>/dev/null; }

# Lo que el propio sitio tiene escrito: así el script sigue sirviendo si la
# URL del panel o la tienda cambian.
JS=assets/js/reserva.js
BACKEND=$(grep -oE "backend: *'[^']+'" "$JS" | sed -E "s/.*'(.*)'/\1/")
PANEL=$(echo "$BACKEND" | sed -E 's#(https://[^/]+).*#\1#')
DOMINIO=$(grep -oE "dominio: *'[^']+'" "$JS" | sed -E "s/.*'(.*)'/\1/")
TOKEN=$(grep -oE "token: *'[^']+'" "$JS" | sed -E "s/.*'(.*)'/\1/")
VERSION=$(grep -oE "version: *'[^']+'" "$JS" | head -1 | sed -E "s/.*'(.*)'/\1/")

echo "1. El repositorio"
for f in CLAUDE.md precios.json tools/traducir.py panel/vercel.json panel/package.json; do
  [ -f "$f" ] && bien "$f" || falla "falta $f"
done
if python3 tools/traducir.py --revisar >/dev/null 2>&1; then
  bien "en/ y pt/ al día (traducir.py --revisar)"
else
  falla "traducir.py --revisar avisa algo: córrelo a mano para verlo"
fi

echo "2. El panel en Vercel ($PANEL)"
r=$(curl -sS -m 20 "$BACKEND" 2>/dev/null)
if echo "$r" | grep -q '"fechas"'; then
  bien "fechas públicas responden ($(echo "$r" | grep -o '"fecha"' | wc -l | tr -d ' ') días)"
else
  falla "fechas públicas no responden: $BACKEND"
fi
c=$(codigo "$PANEL/login");  [ "$c" = 200 ] && bien "pantalla de entrada (200)" || falla "pantalla de entrada respondió $c"
# Sin firma, el webhook tiene que rechazar. Un 401 dice que la ruta está viva
# y que SHOPIFY_WEBHOOK_SECRET está puesta; un 500 o 503, que falta.
c=$(codigo -X POST "$PANEL/api/shopify/webhook")
[ "$c" = 401 ] && bien "webhook de Shopify rechaza sin firma (401)" || falla "webhook respondió $c (se esperaba 401)"

echo "3. Shopify ($DOMINIO, API $VERSION)"
r=$(curl -sS -m 20 -X POST "https://$DOMINIO/api/$VERSION/graphql.json" \
      -H 'Content-Type: application/json' \
      -H "X-Shopify-Storefront-Access-Token: $TOKEN" \
      -d '{"query":"{ shop { name } }"}' 2>/dev/null)
echo "$r" | grep -q '"shop"' && bien "Storefront API responde" || falla "Storefront API no responde: ${r:0:120}"

echo "4. Servicios externos (red del entorno de Claude)"
for u in https://api.met.no https://crm-asadosycorderos.netlify.app https://brasasdelopirque.cl https://fonts.googleapis.com; do
  c=$(codigo "$u")
  case "$c" in 000|403) falla "$u ($c: ¿falta en Allowed domains?)";; *) bien "$u ($c)";; esac
done

if [ "$1" = "--pruebas" ]; then
  echo "5. Pruebas del panel"
  if (cd panel && { [ -d node_modules ] || npm ci --silent; } && npm run --silent revisar) >/dev/null 2>&1; then
    bien "npm run revisar"
  else
    falla "npm run revisar falló: córrelo en panel/ para ver el detalle"
  fi
fi

echo
echo "Resultado: $ok bien, $mal con problemas."
[ "$mal" -eq 0 ]
