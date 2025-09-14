#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BFF_URL:-}" ]]; then
  echo "Usage: BFF_URL=https://bff-staging.example.com npm run smoke:bff" >&2
  exit 1
fi

echo "🔎 BFF smoke at $BFF_URL"

# Odoo create draft
resp=$(curl -s -f -X POST "$BFF_URL/api/bff/odoo/quotes" -H 'Content-Type: application/json' -d '{"clientId":"smoke"}')
echo "Odoo draft: $resp"
qid=$(echo "$resp" | sed -n 's/.*"quoteId"\s*:\s*"\([^"]*\)".*/\1/p')
if [[ -z "$qid" ]]; then echo "❌ No quoteId"; exit 1; fi

# Odoo add line
resp2=$(curl -s -f -X POST "$BFF_URL/api/bff/odoo/quotes/$qid/lines" -H 'Content-Type: application/json' -d '{"name":"Filtro aceite","unitPrice":189}')
echo "Odoo add line: $resp2"

# GNV health
date=$(date -v-1d +%F 2>/dev/null || date -d "yesterday" +%F)
curl -s -f "$BFF_URL/api/bff/gnv/stations/health?date=$date" >/dev/null && echo "GNV health OK"
curl -s -f "$BFF_URL/api/bff/gnv/template.csv" >/dev/null && echo "GNV template OK"
curl -s -f "$BFF_URL/api/bff/gnv/guide.pdf" >/dev/null && echo "GNV guide OK"

echo "✅ BFF smoke passed"

