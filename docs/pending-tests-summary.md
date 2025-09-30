# Test Coverage Progress

## Recent Additions
- `MonitoringService.auditEvent` instrumenta MarketPolicyAdmin y OfflineService para auditoría (ver `src/app/services/monitoring.service.ts`).
- DocumentValidationService now exercises remote merge paths and fallback logic (`src/app/services/document-validation.service.spec.ts`).
- ContextPanel queue actions covered with OfflineService/Toast stubs (`src/app/components/shared/context-panel/context-panel.component.spec.ts`).
- AnalyticsService tests validate dispatch, auxiliary sinks, and error handling (`src/app/services/analytics.service.spec.ts`).
- ProtectionWorkflow end-to-end orchestration and fallbacks captured in unit specs (`src/app/services/protection-workflow.service.spec.ts`).
- MarketPolicyService persistence + snapshot flow verified (`src/app/services/market-policy.service.spec.ts`).
- MarketPolicyAdmin component interactions mocked via service/toast spies (`src/app/components/pages/configuracion/market-policy-admin.component.spec.ts`).

## Remaining Work (blocked or pending)
- BFF endpoints (PostSale/Claims/Admin, PUT `/config/market-policies`) required for contract/E2E validation (coordinar según `docs/backend-coordination.md`).
- Market policy diff/confirmación UI lista; falta persistencia/auditoría backend.
- Contract generation component/service integration tests waiting for real backend.
- Offline/E2E smokes for banner/queue and telemetry/audit trails once persistence is defined.
