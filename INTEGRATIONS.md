# Integrations Guide (BFF + PWA)

This guide consolidates the FE↔BFF contracts already pre‑wired in the app, and adds the PMO‑level checklists for pending integrations. All endpoints siguen en modo stub en dev; cuando el BFF real esté listo, ajusta los flags y endpoints para enrutar tráfico real.

## Status overview

- Odoo Quotes (Postventa Chips) → Pre‑wired, behind `enableOdooQuoteBff`
- GNV T+1 station health → Pre‑wired, behind `enableGnvBff`
- MetaMap (KYC) → Stubs ready (`enableKycBff`)
- Conekta (Payments) → Stubs ready (`enablePaymentsBff`)
- Mifiel (Contracts) → Stubs ready (`enableContractsBff`)
- Make/n8n (Automation) → Stubs ready (`enableAutomationBff`)

## Environment flags

- Dev (src/environments/environment.ts)
  - `features.enableOdooQuoteBff = true`
  - `features.enableGnvBff = true`
  - `features.enableKycBff = true`
  - `features.enablePaymentsBff = true`
  - `features.enableContractsBff = true`
  - `features.enableAutomationBff = true`
  - `features.enablePostSaleBff = false`
  - `features.enableClaimsBff = false`
  - `features.enableAdminBff = false`
- Staging/Prod (src/environments/*)
  - Activar o desactivar por entorno; definir `environment.integrations.*.baseUrl` según la ruta real del BFF.

## HTTP & Auth

- Base: `${environment.apiUrl}` (dev: http://localhost:3000/api)
- JSON (`application/json`) salvo descargas CSV/PDF
- FE usa bearer del app; BFF guarda secretos de proveedores

---

## 1) Postventa → Odoo Quotes

- Service: `src/app/services/post-sales-quote-api.service.ts`
  - `getOrCreateDraftQuote(clientId?, meta?)` → POST /bff/odoo/quotes
  - `addLine(quoteId, part, qty?, meta?)` → POST /bff/odoo/quotes/{quoteId}/lines
- UI entry points: Wizard/Chips (condicional por flag)
- QA: addLine < 500 ms

---

## 2) GNV T+1 station health

- Service: `src/app/services/gnv-health.service.ts` (CSV assets o JSON BFF según flag)
- View: `src/app/components/pages/ops/gnv-health.component.ts`
- Endpoints BFF:
  - GET `/bff/gnv/stations/health?date=YYYY-MM-DD`
  - GET `/bff/gnv/template.csv`, `/bff/gnv/guide.pdf`

---

## 3) MetaMap (KYC)

Env (BFF):

```
METAMAP_CLIENT_ID=
METAMAP_FLOW_ID=
```

Endpoints BFF:

- POST `/api/bff/kyc/start`
- POST `/webhooks/metamap`

QA:

1. Crear cliente en PWA
2. Iniciar flujo KYC (INE/selfie)
3. Confirmar webhook → documento KYC “Aprobado”; `healthScore` +15

Dependencias: Odoo (expedientes), Airtable (registro docs)

---

## 4) Conekta (Pagos)

Env (BFF):

```
CONEKTA_PUBLIC_KEY=
CONEKTA_PRIVATE_KEY=
CONEKTA_WEBHOOK_SECRET=
```

Endpoints BFF:

- POST `/api/bff/payments/orders`
- POST `/api/bff/payments/checkouts`
- POST `/webhooks/conekta`

QA:

1. Tarjeta 4242 éxito / 4000 declinada
2. Generar link OXXO/SPEI y validar URL
3. Webhook `payment.paid` → factura “Pagada” (Odoo/NEON)

Dependencias: Odoo (facturas), NEON (transactions)

---

## 5) Mifiel (Contratos)

Env (BFF):

```
MIFIEL_APP_ID=
MIFIEL_SECRET=
MIFIEL_WEBHOOK_URL=
```

Endpoints BFF:

- POST `/api/bff/contracts/create`
- POST `/webhooks/mifiel`

QA:

1. Generar contrato en PWA
2. Abrir sesión de firma en Mifiel
3. Guardar URL firmada en cliente
4. Webhook actualiza contrato (Odoo/NEON)

Dependencias: NEON (contracts), Odoo (documentos)

---

## 6) Make / n8n (Automatización)

Env (BFF):

```
MAKE_WEBHOOK_URL=
```

Endpoints BFF:

- POST `/api/bff/events/*` (recibe evento y reenvía)

QA:

1. Disparar `vehicle.delivered` desde PWA
2. Confirmar recepción en Make
3. Airtable crea fila y Odoo actualiza expediente

Dependencias: Airtable (CRM), Odoo (expedientes)

---

## Seguridad y cumplimiento

- FE nunca expone secretos; sólo bearer del app
- BFF valida/sanitiza payloads; mapea a proveedores
- Log de PII con criterio (enmascarar/omitir si aplica)
