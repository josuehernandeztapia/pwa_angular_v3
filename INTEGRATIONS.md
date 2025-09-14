# Integrations Guide (BFF)

This document specifies the FE↔BFF contracts that are pre‑wired in the app and gated behind feature flags. In dev they run with stubs; when the BFF is ready, enable the flags and the UI will call the backend without further code changes.

## Status overview

- Odoo Quotes (Postventa Chips) → Pre‑wired, behind `enableOdooQuoteBff`
- GNV T+1 station health → Pre‑wired, behind `enableGnvBff`

## Environment flags

- Dev (src/environments/environment.ts)
  - `features.enableOdooQuoteBff = false`
  - `features.enableGnvBff = false`
- Prod (src/environments/environment.prod.ts)
  - `features.enableOdooQuoteBff = true`
  - `features.enableGnvBff = true`

## Auth

- FE uses the app’s bearer token to call BFF endpoints.
- The BFF owns integration secrets (Odoo credentials, etc.). FE never sees them.

## HTTP

- Base: `${environment.apiUrl}` (dev: http://localhost:3000/api)
- All requests JSON (`application/json`) unless stated otherwise.

---

## 1) Postventa → Odoo Quotes (P1.8)

### FE usage (code)

- Service: `src/app/services/post-sales-quote-api.service.ts`
  - `getOrCreateDraftQuote(clientId?: string, meta?: any)` → POST /bff/odoo/quotes
  - `addLine(quoteId: string, part: PartSuggestion, qty = 1, meta?: any)` → POST /bff/odoo/quotes/{quoteId}/lines
- Entry point: `src/app/components/post-sales/photo-wizard.component.ts` (`addToQuote(p)`) switches by `enableOdooQuoteBff`.

### Endpoints (proposed)

1) Create (or return) draft quote

- POST `/bff/odoo/quotes`
- Body
```json
{
  "clientId": "c_123",
  "market": "edomex",
  "notes": "Postventa chips",
  "meta": { "caseId": "case_abc" }
}
```
- Response
```json
{
  "quoteId": "Q-10045",
  "number": "SO02031"
}
```

2) Add line to quote

- POST `/bff/odoo/quotes/{quoteId}/lines`
- Body
```json
{
  "sku": "front-brake-pads",
  "oem": "C789-BP",
  "name": "Pastillas freno (delanteras)",
  "equivalent": "BREMBO-P1234",
  "qty": 1,
  "unitPrice": 899,
  "currency": "MXN",
  "meta": { "caseId": "case_abc" }
}
```
- Response
```json
{
  "quoteId": "Q-10045",
  "lineId": "L-00032",
  "total": 1299,
  "currency": "MXN"
}
```

3) Get quote (optional)

- GET `/bff/odoo/quotes/{quoteId}` → totals, status, number

### Error handling

- 400 invalid product/price/qty → FE shows toast error, keeps local draft untouched
- 401/403 refresh/reauth → FE uses AuthInterceptor
- 5xx shows toast “No se pudo agregar a cotización”

### FE model (PartSuggestion)

```ts
interface PartSuggestion {
  id: string;        // mapped to sku
  name: string;
  oem: string;
  equivalent?: string;
  stock: number;
  priceMXN: number;  // mapped to unitPrice
}
```

---

## 2) GNV T+1 station health (P1.9)

### FE usage (code)

- Service: `src/app/services/gnv-health.service.ts`
  - `getYesterdayHealth()` switches by `enableGnvBff`:
    - CSV: `assets/gnv/ingesta_yesterday.csv`
    - JSON: `/bff/gnv/stations/health?date=YYYY-MM-DD`
- View: `src/app/components/pages/ops/gnv-health.component.ts`

### Endpoint

- GET `/bff/gnv/stations/health?date=2025-09-12`
- Response
```json
[
  {
    "stationId": "AGS-01",
    "stationName": "Estación Aguascalientes 01",
    "fileName": "ags01_2025-09-12.csv",
    "rowsTotal": 1200,
    "rowsAccepted": 1200,
    "rowsRejected": 0,
    "warnings": 0,
    "status": "green",
    "updatedAt": "2025-09-12T07:12:00Z"
  },
  {
    "stationId": "EDMX-11",
    "stationName": "Estación EdoMex 11",
    "fileName": "edmx11_2025-09-12.csv",
    "rowsTotal": 980,
    "rowsAccepted": 940,
    "rowsRejected": 40,
    "warnings": 3,
    "status": "yellow",
    "updatedAt": "2025-09-12T07:22:00Z"
  }
]
```

### Status rules (server‑side)

- red: missing fileName or rowsTotal=0
- yellow: warnings>0 or rowsRejected>0
- green: otherwise

### Downloads

- GET `/bff/gnv/template.csv` (CSV template)
- GET `/bff/gnv/guide.pdf` (how‑to / FAQ)

### Error handling

- 5xx shows table empty with “No hay datos de ingesta disponibles.”
- FE uses SW cache (if configured) for quick loads.

---

## Rollout checklist

- [ ] Deploy BFF endpoints above
- [ ] Ensure BFF uses backend secrets (e.g., Odoo credentials) and enforces auth
- [ ] Switch flags to true in the target environment (dev/stage/prod)
  - `enableOdooQuoteBff = true`
  - `enableGnvBff = true`
- [ ] Verify FE happy paths
  - Chips → add line shows toast/updates
  - GNV health loads JSON and shows semaphores
- [ ] Add backend budgets/observability (latency < 500ms for addLine)

## Local stubs (dev mode)

- Odoo: FE stores provisional quote lines in localStorage draft; no backend needed
- GNV: CSVs under `assets/gnv/` are used to render the panel

---

## Security & Compliance

- FE never embeds integration secrets; only calls BFF with bearer auth
- BFF sanitizes and validates payloads, maps fields to provider (Odoo)
- Log PII carefully (hash/omit as needed)
