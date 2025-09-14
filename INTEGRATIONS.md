# Integrations – BFF + PWA Orchestration

This document enumerates environment variables, BFF endpoints, QA steps and dependencies for each external integration. All endpoints are stubbed in dev; flip feature flags per environment to activate real calls.

## Odoo (Quotes)

- Endpoints:
  - POST `/api/bff/odoo/quotes`
  - POST `/api/bff/odoo/quotes/:id/lines`
- Flags (PWA): `features.enableOdooQuoteBff`
- QA: Chips “Agregar a cotización” → `addLine` < 500 ms

---

## MetaMap (KYC)

Env (BFF):

```
METAMAP_CLIENT_ID=
METAMAP_FLOW_ID=
```

Endpoints:

- POST `/api/bff/kyc/start`
- POST `/webhooks/metamap`

QA:

1. Crear cliente en PWA
2. Iniciar flujo KYC (INE/selfie)
3. Confirmar webhook → documento KYC “Aprobado”; `healthScore` +15

Dependencias: Odoo (expedientes), Airtable (registro docs)

---

## Conekta (Payments)

Env (BFF):

```
CONEKTA_PUBLIC_KEY=
CONEKTA_PRIVATE_KEY=
CONEKTA_WEBHOOK_SECRET=
```

Endpoints:

- POST `/api/bff/payments/orders`
- POST `/api/bff/payments/checkouts`
- POST `/webhooks/conekta`

QA:

1. Tarjeta 4242 éxito / 4000 declinada
2. Generar link OXXO/SPEI y validar URL
3. Webhook `payment.paid` → factura “Pagada” (Odoo/NEON)

Dependencias: Odoo (facturas), NEON (transactions)

---

## Mifiel (Contracts)

Env (BFF):

```
MIFIEL_APP_ID=
MIFIEL_SECRET=
MIFIEL_WEBHOOK_URL=
```

Endpoints:

- POST `/api/bff/contracts/create`
- POST `/webhooks/mifiel`

QA:

1. Generar contrato en PWA
2. Abrir sesión de firma en Mifiel
3. Guardar URL firmada en cliente
4. Webhook actualiza contrato (Odoo/NEON)

Dependencias: NEON (contracts), Odoo (documentos)

---

## Make / n8n (Automation)

Env (BFF):

```
MAKE_WEBHOOK_URL=
```

Endpoints:

- POST `/api/bff/events/*` (recibir evento y reenviar a Make/n8n)

QA:

1. Disparar `vehicle.delivered` desde PWA
2. Confirmar recepción en Make
3. Airtable crea fila y Odoo actualiza expediente

Dependencias: Airtable (CRM), Odoo (expedientes)

---

## Flags & Config (PWA)

- Features:
  - `enableOdooQuoteBff`, `enableGnvBff`
  - `enableKycBff`, `enablePaymentsBff`, `enableContractsBff`, `enableAutomationBff`
- Optional base URLs: `environment.integrations.{odoo,gnv,kyc,payments,contracts,automation}.baseUrl`

