# Pending Test Coverage

This checklist consolidates the flows that still lack automated coverage. Use it as a guide for QA planning once the real BFF services are connected.

## 1. Feature Flag / BFF Integrations
- `enablePostSaleBff`, `enableClaimsBff`, `enableAdminBff` remain disabled until real endpoints exist (`src/environments/environment.ts:69`).
  - **Pending tests:** end-to-end happy paths and error handling once `/bff/postventa`, `/bff/claims`, `/bff/users` expose production payloads.
  - **Blocker:** backend contracts not yet published.

## 2. Market Policy QA Panel
- Admin panel loads/edits políticas; diff/confirmación ya disponible en UI, pero `savePoliciesToRemote` requiere `PUT /config/market-policies` real (`src/app/services/market-policy.service.ts:232`).
  - **Pending tests:** integration spec for remote save, y E2E flow que ejerza diff/confirm cuando backend exista (ver `docs/backend-coordination.md`).
  - **Blocker:** backend endpoint + auth requirements.

## 3. Document Validation Service
- Service merges local validation with remote results when mocks are disabled (`src/app/services/document-validation.service.ts:102-147`).
  - **Status:** unit specs now cover merge logic and fallback behaviour (`src/app/services/document-validation.service.spec.ts`).
  - **Pending tests:** integration/e2e coverage once real endpoints replace the current stubs.

## 4. Offline Queue & Context Panel
- Offline queue buttons in `context-panel` currently clear only local memory and analytics events (`src/app/components/shared/context-panel/context-panel.component.ts`).
  - **Status:** unit specs now cover flush/clear actions and market policy reload (`context-panel.component.spec.ts`).
  - **Pending tests:** E2E banner visibility + replay flow across Cotizador, Protección y Claims once server-side persistence is defined (plan en `docs/offline-e2e-plan.md`).
  - **Blocker:** server-side persistence contract still under definition.

## 5. Analytics Service & Protection Workflow
- Analytics events are wired but point to stub endpoints until `environment.analytics.eventsEndpoint` is updated (`src/app/services/analytics.service.ts:36`).
  - **Status:** unit specs now cover event dispatch/aux sinks (`analytics.service.spec.ts`) y la orquestación del workflow (`protection-workflow.service.spec.ts`).
  - **Pending tests:** validaciones contractuales contra BFF real (`analytics`, `protection`, `tanda`) y smoke E2E una vez habiliten endpoints productivos (ver `docs/backend-coordination.md`).

## 6. Market Policy Consumption
- MarketPolicyAdmin aplica cambios en sesión (`src/app/components/pages/configuracion/market-policy-admin.component.ts:59`).
  - **Status:** unit specs cubren registro remoto (`market-policy.service.spec.ts`) y flujo del panel (`market-policy-admin.component.spec.ts`).
  - **Pending tests:** integración con PUT `/config/market-policies`, diff/confirmación y auditoría (ver `docs/backend-coordination.md` y `docs/market-policy-admin-diff.md`).

## 7. Contract Generation Flow
- `contract-generation.component.ts` remains a visual stub; real service integration pending.
  - **Status:** unit spec covers rendering based on stored context (`contract-generation.component.spec.ts`).
  - **Pending tests:** `ContractGenerationService` integration, guard coverage, and E2E signatures once backend contracts ready.

## 8. Offline/E2E Coverage
- No automated E2E validating the offline banner + queue flush across key flows (`src/app/components/shared/offline-queue-banner/`).
  - **Pending tests:** Cypress/Playwright smoke covering: trigger offline, enqueue items, reconnect, verify replay and analytics events.

## 9. Telemetry & Audit
- No automated checks that capture author/version metadata when saving configuration or executing QA actions.
  - **Pending tests:** integration tests once telemetry persistence is defined (plan en `docs/telemetry-audit-plan.md`).

---
**Next steps:** Revisit this document once the BFF endpoints go live; prioritize adding unit coverage ahead of E2E to reduce regression risk.
