# Telemetry & Audit Strategy


## 0. Estado actual
- `MonitoringService.auditEvent` creado en FE; MarketPolicyAdmin y OfflineService ya lo consumen (cola offline, guardado QA).

Objetivo: cubrir el gap identificado en `docs/pending-tests.md` respecto a auditoría de acciones QA y telemetría persistente para los nuevos módulos. Este documento resume los eventos actuales, lo que falta instrumentar, y los pasos para integrarlo con backend e infraestructura (Datadog/Slack).

## 1. Eventos existentes
- `AnalyticsService.track` → envía envolturas genéricas (`event`, `payload`, `timestamp`). Hoy apunta a endpoints mock.
- `MonitoringService.capture*` → persiste eventos en memoria y, opcionalmente, envía a `monitoring/datadog` / `monitoring/events`.
- Acciones recientes instrumentadas: flujo de protección, cola offline, panel postventa, etc.

## 2. Gaps
1. **Autoría en QA panel**
   - `MarketPolicyAdminComponent.persistChanges` no envía `userId`/motivo.
   - No hay registro de versiones ni historial accesible.
2. **Acciones críticas sin correlación**
   - Botones “Procesar cola” y “Descartar” generan toasts pero no registran quién lo ejecutó.
   - Claims/Postventa stubs no guardan `advisorId` ni auditoría de fotos.
3. **Persistencia centralizada**
   - Eventos `monitoring` viven en memoria; backend debe aceptar POST `/monitoring/events` para guardar y consultar historial.

## 3. Propuesta

### 3.1 Payload estándar de auditoría
```json
{
  "event": "qa_market_policy_saved",
  "performedBy": "user-123",
  "role": "qa",
  "timestamp": "2024-07-25T18:23:00.000Z",
  "metadata": {
    "ticket": "QA-101",
    "diff": [{"market": "ags", "field": "ocrThreshold", "from": 0.85, "to": 0.9 }]
  }
}
```
- Campos obligatorios: `event`, `performedBy`, `timestamp`.
- `metadata` flexible; incluir IDs de flujo (`caseId`, `claimId`).

### 3.2 Integración FE
- Crear helper `auditEvent(event: string, metadata: Record<string, any>)` en `MonitoringService` que llame a `captureInfo` y, si `environment.monitoring.eventsEndpoint` está definido, envíe POST.
- Extender `OfflineService.setActionBusy` para disparar `auditEvent('offline_queue_flush', { performedBy, queueLength })`.
- Panel QA utiliza `auditEvent('qa_market_policy_saved', { diff, ticket, justification })`.

### 3.3 Backend
- Nuevo endpoint `POST /monitoring/events` (permite lotes opcionalmente).
- `GET /monitoring/events?service=&event=&performedBy=&limit=` para UI QA.
- Persistencia: tabla `audits` con columnas `id`, `event`, `performed_by`, `metadata(JSONB)`, `created_at`.
- Seguridad: sólo roles `admin`/`qa` pueden escribir; lectura restringida (# compliance).

### 3.4 Telemetría agregada
- Enviar métricas a Datadog mediante `analytics.metric` cuando `environment.features.enableAnalytics` esté activo, con tags `{ context, queueLength, fallback }`.
- Synchronizar con backend/DevOps: endpoint `monitoring/datadog` debe aceptar payload `{ source, channel, body }` de `AnalyticsService`.

## 4. Pruebas y checklist
- Unit tests: `monitoring.service.spec.ts` (por crear) para asegurar que `auditEvent` realiza POST y captura local.
- Contract tests: Pact/MSW para `POST /monitoring/events` (pendiente backend).
- E2E: flujo QA panel → guardar → validar que `auditEvent` se envía; cola offline idem.

## 5. Seguimiento
- Documentado en `docs/pending-tests.md` (sección Telemetry & Audit) con referencia a este plan.
- Bloqueado parcialmente por endpoint backend; mientras tanto, FE puede stubbear `auditEvent` para no romper UX.
