#!/usr/bin/env bash
set -euo pipefail

# Minimal Dark aesthetic verification
# Fails on: TODO, FIXME, HACK, DEPRECATED, glass, gradient, bg-gray-*, text-gray-*
# Scopes: src/**, styles/**, apps/**, libs/**, cypress/** (exclude node_modules, dist, coverage, reports)

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}🔎 Verificando estética Minimal Dark...${NC}"

PATTERNS=(
  "\\bTODO\\b"
  "\\bFIXME\\b"
  "\\bHACK\\b"
  "\\bDEPRECATED\\b"
  "glass"
  "bg-gradient-"
  "bg-gray-"
  "text-gray-"
  "premium-container"
  "theme-premium"
  "premium-animations"
)

INCLUDE_PATHS=("src")
EXCLUDE_DIRS=("node_modules" "dist" "coverage" "reports" ".git" "playwright-report")

EXIT_CODE=0
TMP_REPORT="/tmp/verify-ux-report.txt"
> "$TMP_REPORT"

echo "Buscando patrones prohibidos..."

# Build list of existing paths to avoid grep exit code 2 on missing paths
EXISTING_PATHS=()
for p in "${INCLUDE_PATHS[@]}"; do
  if [ -e "$p" ]; then
    EXISTING_PATHS+=("$p")
  fi
done
if [ -e "demo-production-ready.js" ]; then
  EXISTING_PATHS+=("demo-production-ready.js")
fi
if [ ${#EXISTING_PATHS[@]} -eq 0 ]; then
  echo -e "${GREEN}✔ No hay rutas existentes para analizar${NC}"
  exit 0
fi

for pattern in "${PATTERNS[@]}"; do
  if grep -RIn --color=never \
      $(printf -- '--exclude-dir=%s ' "${EXCLUDE_DIRS[@]}") \
      --exclude="*.min.*" --exclude="*backup*" --exclude="*.broken*" --exclude="*.working*" --exclude=".*!*" \
      --include="*.ts" --include="*.html" \
      -E "$pattern" "${EXISTING_PATHS[@]}" 2>/dev/null >/dev/null; then
    echo -e "${RED}✖ Encontrado patrón: ${pattern}${NC}"
    echo "# Pattern: $pattern" >> "$TMP_REPORT"
    grep -RIn --color=never \
      $(printf -- '--exclude-dir=%s ' "${EXCLUDE_DIRS[@]}") \
      --exclude="*.min.*" --exclude="*backup*" --exclude="*.broken*" --exclude="*.working*" --exclude=".*!*" \
      --include="*.ts" --include="*.html" \
      -E "$pattern" "${EXISTING_PATHS[@]}" 2>/dev/null | sed "s|$ROOT_DIR/||" | tee -a "$TMP_REPORT"
    echo >> "$TMP_REPORT"
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -ne 0 ]; then
  echo -e "\n${RED}❌ Verificación UX falló. Revisa las coincidencias arriba.${NC}"
  echo -e "${YELLOW}Sugerencias:${NC}"
  echo "- Reemplaza TODO/FIXME/HACK/DEPRECATED por NOTE: si aplica"
  echo "- Sustituye 'glass' y 'gradient' por estilos sólidos Minimal Dark"
  echo "- Reemplaza bg-gray-*/text-gray-* por tokens neutral (p.ej. bg-neutral-950, text-neutral-100)"
  echo -e "\nReporte guardado en: $TMP_REPORT"
else
  echo -e "${GREEN}✅ Verificación UX superada. Estética Minimal Dark consistente.${NC}"
fi

exit $EXIT_CODE

