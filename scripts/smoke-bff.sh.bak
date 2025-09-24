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

# Extended smoke (stubs): KYC, Payments, Contracts, Events
if command -v curl >/dev/null 2>&1; then
  echo "🔎 Extended BFF smoke (stubs)"
  curl -s -f -X POST "$BFF_URL/api/bff/kyc/start" -H 'Content-Type: application/json' -d '{"clientId":"smoke"}' >/dev/null && echo "KYC start OK"
  curl -s -f -X POST "$BFF_URL/api/bff/payments/orders" -H 'Content-Type: application/json' -d '{"amount":12345,"currency":"MXN"}' >/dev/null && echo "Payments order OK"
  curl -s -f -X POST "$BFF_URL/api/bff/payments/checkouts" -H 'Content-Type: application/json' -d '{"orderId":"ord_test"}' >/dev/null && echo "Payments checkout OK"
  curl -s -f -X POST "$BFF_URL/api/bff/contracts/create" -H 'Content-Type: application/json' -d '{"clientId":"smoke","type":"adenda_proteccion"}' >/dev/null && echo "Contracts create OK"
  curl -s -f -X POST "$BFF_URL/api/bff/events/vehicle.delivered" -H 'Content-Type: application/json' -d '{"clientId":"smoke","vehicleId":"v1"}' >/dev/null && echo "Events forward OK"
fi
