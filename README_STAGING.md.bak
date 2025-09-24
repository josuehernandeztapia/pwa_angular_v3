# Staging Guide (PWA + BFF)

This guide explains how to build the PWA against the staging BFF, what environment variables the BFF needs, and how to run quick smoke checks after deploy.

---

## 1) PWA (Angular) – Staging Build

- Build
  - `npm run build:staging`
  - Output: `dist/conductores-pwa`
- Serve locally (staging config)
  - `npm run serve:staging`
- Config used: `src/environments/environment.staging.ts`
  - `apiUrl`: set to your BFF staging URL (e.g., `https://bff-staging.conductores.com/api`)
  - Flags ON for integrations: `enableOdooQuoteBff = true`, `enableGnvBff = true`

---

## 2) BFF (NestJS) – Staging Environment Variables

Load these as environment variables in your staging service (Render/Fly/Railway/K8s). Do NOT commit them.

- App/CORS
  - `PORT=3000`
  - `PWA_URL=https://staging-pwa.example.com`
  - `LOG_LEVEL=info`
- Database (NEON)
  - `NEON_DATABASE_URL=postgres://USER:PASS@HOST:5432/DBNAME`
- S3 (Wizard uploads)
  - `AWS_ACCESS_KEY_ID=…`
  - `AWS_SECRET_ACCESS_KEY=…`
  - `AWS_REGION=us-east-1`
  - `AWS_S3_BUCKET=conductores-staging`
  - (optional) `S3_UPLOAD_URL=https://s3.us-east-1.amazonaws.com/conductores-staging`
- OpenAI
  - `OPENAI_API_KEY=…`
- Odoo (Quotes)
  - `ODOO_BASE_URL=https://odoo.staging.example.com`
  - `ODOO_DB=…`
  - `ODOO_USERNAME=…` and `ODOO_PASSWORD=…` (or `ODOO_API_KEY=…`)

Deploy BFF, then check Swagger at `https://bff-staging…/docs`.

---

## 3) Flags in PWA (Staging)

- In `environment.staging.ts`
  - `features.enableOdooQuoteBff = true`
  - `features.enableGnvBff = true`
- Rebuild PWA and deploy.

---

## 4) Smoke Checks

### BFF Smoke (curl)

- Odoo
  - `curl -s -X POST "$BFF_URL/api/bff/odoo/quotes" -H 'Content-Type: application/json' -d '{"clientId":"smoke"}'`
  - `curl -s -X POST "$BFF_URL/api/bff/odoo/quotes/Q-xxxx/lines" -H 'Content-Type: application/json' -d '{"name":"Filtro aceite","unitPrice":189}'`
- GNV
  - `curl -s "$BFF_URL/api/bff/gnv/stations/health?date=2025-09-12"`
  - `curl -s "$BFF_URL/api/bff/gnv/template.csv"`
  - `curl -s "$BFF_URL/api/bff/gnv/guide.pdf"`

Or run provided scripts:

- `BFF_URL=https://bff-staging… npm run smoke:bff`
- `PWA_URL=https://staging-pwa… npm run smoke:pwa`

### PWA Smoke

- Open `/` (home), `/cotizador`, `/postventa/wizard`, `/ops/gnv-health` and ensure:
  - Cotizador summary visible; toggle “Incluir seguros” actualiza “A financiar”.
  - Wizard sube y muestra QA (stubs ok) y chips agregan a cotización (Odoo si flag). 
  - GNV lista estaciones con semáforos.

---

## 5) Lighthouse (optional)

- Run locally while serving staging build:
  - `npm run lh:ci`
- Budgets in `lighthouse-budgets.json`: Perf/A11y ≥ 90.

---

## 6) Rollout Checklist

- [ ] BFF deployed with staging env vars and Swagger ok
- [ ] PWA built with staging config and deployed
- [ ] Flags ON in staging: Odoo/GNV BFF
- [ ] Smoke: chips → addLine (< 500 ms), GNV → health (OK)
- [ ] Lighthouse ≥ 90 (Perf/A11y)
- [ ] NEON persistence validated (optional in first pass)
