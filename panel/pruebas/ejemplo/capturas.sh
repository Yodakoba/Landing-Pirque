#!/bin/bash
# **Rehace las capturas de las misiones de la ayuda**, de una (2026-11-13).
#
#   panel/pruebas/ejemplo/capturas.sh            # las 28
#   panel/pruebas/ejemplo/capturas.sh enc-dia    # solo esas escenas
#
# Arma una copia del panel en una carpeta temporal que lee la planilla de un
# JSON (`sheets-falso.ts`) en vez de Google, la llena con datos inventados
# (`generar-planilla.mjs`), la levanta con el reloj fijo en el viernes 13 de
# noviembre de 2026 a las 14:25 de Chile y corre `capturas-ayuda.mjs`. Las
# fotos y `puntos.json` quedan en `panel/public/ayuda/` del repo. **El panel
# del repo no se toca**, y nunca se ven datos de clientes de verdad.
#
# Después: `python3 pruebas/ejemplo/marcar.py <carpeta>` dibuja los puntos
# sobre cada foto para revisarlas a ojo.
set -euo pipefail
PANEL=$(cd "$(dirname "$0")/../.." && pwd)
E=$PANEL/pruebas/ejemplo
W=${AYUDA_TRABAJO:-$(mktemp -d)}
PUERTO=${AYUDA_PUERTO:-3125}
RELOJ=${AYUDA_RELOJ:-2026-11-13T17:25:00Z}
echo "Copia de trabajo: $W"

# 1. La copia, sin node_modules ni lo generado.
mkdir -p "$W/panel"
tar -C "$PANEL" --exclude=./node_modules --exclude=./.next --exclude=./public/ayuda \
  --exclude=./.env.local --exclude=./tsconfig.tsbuildinfo -cf - . | tar -C "$W/panel" -xf -
ln -sfn "$PANEL/node_modules" "$W/panel/node_modules"
ln -sfn "$PANEL/public/ayuda" "$W/panel/public/ayuda"
cp "$E/sheets-falso.ts" "$W/panel/src/lib/sheets-falso.ts"
# sheets() y autenticacion() de la copia apuntan a la planilla falsa. Si el
# archivo cambió y no encuentra dónde, falla acá y lo dice.
python3 - "$W/panel/src/lib/sheets.ts" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
def cambiar(a, b):
    global s
    assert s.count(a) == 1, 'capturas.sh: no encontré en sheets.ts: ' + a.strip()[:60]
    s = s.replace(a, b)
cambiar("import { celdas } from './celdas.ts';\n",
        "import { celdas } from './celdas.ts';\nimport { sheetsFalso } from './sheets-falso.ts';\n")
cambiar("  if (credencial) return credencial;\n",
        "  if (credencial) return credencial;\n"
        "  credencial = new google.auth.JWT({ email: 'ejemplo@ejemplo.invalid', key: 'x', scopes: ALCANCE });\n"
        "  return credencial;\n")
cambiar("export function sheets(): sheets_v4.Sheets {\n",
        "export function sheets(): sheets_v4.Sheets {\n  return sheetsFalso as unknown as sheets_v4.Sheets;\n")
open(p, 'w').write(s)
PY
# Sin StrictMode: el doble montaje de desarrollo dispara autoguardados al
# abrir una ventana y mueve los datos (en producción no pasa).
echo "export default { reactStrictMode: false };" > "$W/panel/next.config.mjs"
printf 'GOOGLE_SHEET_ID=ejemplo\nPANEL_USUARIO=jefe\nPANEL_CLAVE=clave-de-prueba-1234\n' > "$W/panel/.env.local"

# 2. La planilla y una sesión por rol.
cd "$PANEL"
node --no-warnings --experimental-strip-types --import ./pruebas/lecturas/registrar.mjs \
  "$E/generar-planilla.mjs" "$W/planilla.json"
node --no-warnings --experimental-strip-types "$E/sesiones.mjs" "$W/sesiones.json"

# 3. Levantarla con el reloj fijo, y bajarla al terminar pase lo que pase.
(cd "$W/panel" && PLANILLA_EJEMPLO="$W/planilla.json" RELOJ_EJEMPLO="$RELOJ" \
  NODE_OPTIONS="--require $E/reloj.cjs" PANEL_USUARIO=jefe PANEL_CLAVE=clave-de-prueba-1234 \
  exec npx next dev -p "$PUERTO" > "$W/servidor.log" 2>&1) &
trap 'pkill -f "next dev -p $PUERTO" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:$PUERTO/entrar" && break
  sleep 2
done

# 4. Las fotos.
AYUDA_URL="http://localhost:$PUERTO" AYUDA_SESIONES="$W/sesiones.json" AYUDA_RELOJ="$RELOJ" \
  node pruebas/capturas-ayuda.mjs "$@"
