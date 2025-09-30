# Backend Coordination Brief

## Estado actual
- Frontend listo para persistencia: panel QA ya muestra diff/confirmación y emite auditoría, cola offline automatizada en Playwright.
- Bloqueante: Backend debe publicar PUT `/config/market-policies` con auditoría y habilitar BFF Postventa/Claims/Admin antes de ejecutar pruebas contractuales/E2E.


Objetivo: habilitar la persistencia real de políticas de mercado y activar los módulos Postventa / Claims / Admin detrás de sus BFF respectivos. Este documento resume los contratos esperados por el frontend, los payloads y las consideraciones de autenticación/logging necesarias para destrabar pruebas contractuales y E2E.

## 1. PUT `/config/market-policies`

- **Contexto FE**: `MarketPolicyService.savePoliciesToRemote` envía el JSON completo de políticas (mapa `{ claveMercado: { documents, metadata } }`). Actualmente el PUT apunta a `config/market-policies` usando `HttpClientService` (baseUrl = `${environment.apiUrl}` → `http://localhost:3000/api` en dev).
- **Payload esperado** (`RemoteMarketPolicyConfig`):
  ```json
  {
    "ags": {
      "documents": [
        { "id": "doc-ine", "label": "INE", "optional": false, "tooltip": "Identificación oficial" }
      ],
      "metadata": {
        "ocrThreshold": 0.85,
        "expiryRules": { "doc-ine": ">=90d" },
        "protection": { "required": false, "coverageOptions": ["standard", "premium"] },
        "income": { "threshold": 0.4, "documentId": "doc-income" },
        "tanda": null
      }
    }
  }
  ```
- **Respuesta**: `{ success: true }` o un JSON vacío; el FE no requiere payload adicional pero valida que la petición no falle.
- **Autenticación**: Bearer token (mismo mecanismo que el resto del BFF). Sugerido rol `admin` o `qa-tools` para limitar quién puede editar políticas.
- **Auditoría**: Registrar `userId`, `changeset` (diff contra snapshot previo), timestamp y justificación opcional.
- **Validaciones servidor**:
  - Esquema (documentos con `id`, `label`; metadata con `ocrThreshold`, etc.).
  - Normalizar claves (`AGS`, `aguascalientes-individual`, etc.) y rechazar entradas vacías.
  - Control de versiones (guardar `updatedAt`, `updatedBy`).
- **Test a preparar** (cuando exista endpoint):
  - Contract tests (Pact) para PUT.
  - Smoke E2E: admin abre panel, aplica cambios, guarda → wizard Documentos consume snapshot actualizado.

## 2. BFF Postventa (`enablePostSaleBff`)

- **Servicio FE**: `PostSaleService` (ruta base relativa `postventa/...`). Las operaciones actuales son:
  - `POST postventa/cases` → crea expediente y devuelve `PostSaleCase` (`{ id, status, createdAt, ... }`).
  - `POST postventa/photos/analyze` → envía `caseId`, `stepId`, `confidenceThreshold` y espera `OCRResult` (`{ confidence, missing[], retryCount?, fallbackUsed? }`).
  - `POST postventa/cases/{caseId}/metrics/first-recommendation` → recibir `{ millis }`.
  - `POST postventa/cases/{caseId}/metrics/need-info` → `{ fields: string[] }`.
  - `POST postventa/cases/{caseId}/manual-ocr` → `{ stepId, fields, confidence, isManual }`.
- **Requisitos backend**:
  - Persistencia de expediente + adjuntos (referencia a Storage/S3, OCR pipeline real).
  - Cálculo de métricas (latencia de recomendación, campos faltantes) y exposición vía analytics.
  - Manejo de cola offline: permitir reenvíos idempotentes (el FE reenviará pendientes al reconectar).
- **Auth**: Bearer + permisos por rol (`postventa:write`).
- **Observabilidad**: logs por `caseId`, métricas de OCR (confianza promedio, fallbacks), errores clasificados.
- **Contratos sugeridos**: retornar `202 Accepted` cuando la foto se encola para OCR asíncrono; incluir `traceId`.

## 3. BFF Claims (`enableClaimsBff`)

- **Servicio FE**: `ClaimsService` (base `${environment.apiUrl}/claims`). Endpoints esperados:
  - `GET /claims?status=&market=&search=` → listado filtrado.
  - `POST /claims` → crea reclamo (payload `ClaimFormPayload`).
  - `PATCH /claims/{id}` → actualizaciones parciales (`status`, `assignedTo`, `resolutionNotes`, etc.).
  - `POST /claims/{id}/close` → cierra reclamo (payload `{ notes?: string }`).
- **Datos mínimos**: `id`, `folio`, `clientName`, `vehicleVin`, `market`, `type`, `status`, `amount`, `createdAt`, `updatedAt`, `assignedTo`.
- **Autenticación**: Bearer; roles `operaciones`/`postventa`.
- **Persistencia**: Base de datos con histórico; permitir soft-delete o archivado.
- **Integraciones**: posibilidad de enlazar con Odoo/NEON para obtener folios reales.
- **Pruebas una vez activo**: contrato para cada método + E2E que valida flujo completo (crear, actualizar, cerrar).

## 4. BFF Admin Usuarios (`enableAdminBff`)

- **Servicio FE**: `UsuariosService` (base `environment.api?.users` → `/bff/users`). Endpoints:
  - `GET /bff/users` → listado completo.
  - `POST /bff/users` → crea usuario (`{ nombre, email, rol }`).
  - `PUT /bff/users/{id}` → actualiza datos.
  - `PATCH /bff/users/{id}/status` → `{ activo: boolean }`.
  - `DELETE /bff/users/{id}` → elimina usuario.
- **Requisitos**:
  - Validar unicidad de email.
  - Historial de cambios (quién modificó, cuándo).
  - Notificación opcional (email de bienvenida al crear usuario).
- **Auth**: Solo roles `admin`; cada operación debe registrarse en auditoría.
- **Respuesta FE**: retorna `Usuario` completo para refrescar caché local.

## 5. Plan de acción sugerido

1. **Backend**
   - Implementar endpoint PUT `/config/market-policies` + storage (S3/DB) con versionado y auditoría.
   - Exponer rutas BFF para Postventa, Claims y Admin siguiendo contratos anteriores.
   - Definir esquema de auth (scopes/roles) y adjuntar a documentación central.
   - Entregar OpenAPI/contract mocks al FE para validar de forma temprana.
   - Compartir ETA y responsable por cada endpoint (QA bloqueará pruebas hasta entonces).

2. **Frontend** (cuando backend esté listo)
   - Activar flags `enablePostSaleBff`, `enableClaimsBff`, `enableAdminBff` en entorno de QA.
   - Añadir contract tests (Pact/MSW) y smokes E2E.
   - Conectar auditoría/telemetría (Datadog/Slack) según IDs de evento acordados.

3. **QA**
   - Preparar escenarios: edición de políticas, carga de fotos con OCR real, lifecycle completo de reclamos, CRUD de usuarios.
   - Validar replays offline para postventa (cola local + flush al reconectar).

> Nota: hasta que los endpoints estén publicados, los módulos seguirán operando en modo stub; las nuevas pruebas automatizadas quedan bloqueadas y permanecen listadas en `docs/pending-tests.md`.
