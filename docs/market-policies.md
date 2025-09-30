# Market Policies Blueprint

This document describes the document requirements, OCR thresholds, gating rules, and QA instrumentation por mercado for the Conductores PWA wizard (Onboarding/Postventa Paso 3 – Documentos). Es la referencia canónica para `MarketPolicyService`, `AviCompletedGuard` y `DocsCompletedGuard`.

## 1. Summary Table

| Mercado | Documentos obligatorios | Documentos condicionales | OCR campos clave | Gates / Validación | Expiración / QA |
| --- | --- | --- | --- | --- | --- |
| **AGS (Individual)** | INE anverso/reverso (`doc-ine`), Comprobante domicilio (`doc-proof`) | RFC (`doc-rfc`) si financia; Comprobante ingresos (`doc-income`) si PMT > umbral | INE: nombre, CURP, vigencia. Domicilio: calle, CP. RFC: patrón SAT. Ingreso: monto y periodicidad | INE válido + domicilio coincide; si falta → `DocsCompletedGuard = KO` | INE vigencia ≥ 90 días; domicilio ≤ 3 meses; OCR ≥ 0.85 (retake/manual permitido) |
| **EdoMex (Individual)** | INE, Domicilio, RFC | Comprobante ingresos | Igual que AGS + RFC obligatorio | RFC obligatorio; ingreso insuficiente → estado *Review* con documento adicional | Mismas ventanas que AGS; OCR < 0.85 exige retake o captura manual |
| **EdoMex (Colectivo/Tanda)** | INE y RFC de cada miembro (`doc-ine-*i`, `doc-rfc-*i`), Carta consentimiento (`doc-consent`) | Comprobante domicilio líder (`doc-proof-leader`), Lista miembros firmada (`doc-roster`) | INE/RFC múltiples; Consentimiento: nombre grupo, cuotas, firma | Consentimiento firmado + N INE/RFC válidos; falta crítica → `DocsCompletedGuard = KO` | INE miembro vigente; consentimiento firmado; OCR ≥ 0.80 |
| **Otros mercados** | Definidos por `MarketPolicyService` | — | Campos configurables | Gates según política | Ventanas / QA según política |

## 2. Detalle por mercado

### Aguascalientes (AGS – Individual)
- **Obligatorios**: `doc-ine` (frente y reverso), `doc-proof` (comprobante domicilio).
- **Condicionales**: `doc-rfc` cuando financia; `doc-income` si PMT excede el umbral configurado.
- **OCR**: INE (nombre, CURP, vigencia). Domicilio (calle, CP). RFC (patrón SAT). Ingreso (monto, periodicidad).
- **Gates**: domicilio debe coincidir con el cliente; INE debe estar vigente; si falta documento obligatorio → guard bloquea.
- **Expiración / QA**: INE vigencia mínima 90 días; domicilio máximo 3 meses; score OCR mínimo 0.85.

### EdoMex (Individual)
- **Obligatorios**: `doc-ine`, `doc-proof`, `doc-rfc`.
- **Condicionales**: `doc-income` (mismo criterio que AGS).
- **OCR**: igual que AGS con RFC obligatorio.
- **Gates**: sin RFC válido → bloquea; ingresos insuficientes generan estado *Review* con documento adicional.
- **Expiración / QA**: mismas ventanas que AGS; OCR < 0.85 obliga retake o captura manual.

### EdoMex (Colectivo / Tanda)
- **Obligatorios**: `doc-ine-*i` y `doc-rfc-*i` para cada miembro del colectivo, `doc-consent` (carta consentimiento).
- **Condicionales**: `doc-proof-leader`, `doc-roster`.
- **OCR**: INE/RFC por índice de miembro; consentimiento debe incluir nombre del grupo, cuotas y firma.
- **Gates**: consentimiento firmado + N INE/RFC válidos (según tamaño del colectivo). Ausencia de un miembro crítico deja el guard en KO.
- **Expiración / QA**: INE de cada miembro vigente; consentimiento con hash o firma válida; OCR mínimo 0.80.

### Otros mercados
- Se parametrizan vía `MarketPolicyService`. Cada política define `requiredDocs`, `conditionalDocs`, `ocrThreshold`, expiraciones y reglas extra (campos que validar, scores mínimos, evidencia adicional).

## 3. Plantilla JSON (MarketPolicyService)

```json
{
  "AGS": {
    "requiredDocs": ["ine", "proof"],
    "conditionalDocs": ["rfc", "income"],
    "ocrThreshold": 0.85,
    "expiry": {
      "ine": ">=90d",
      "proof": "<=3m"
    }
  },
  "EdoMex-Individual": {
    "requiredDocs": ["ine", "proof", "rfc"],
    "conditionalDocs": ["income"],
    "ocrThreshold": 0.85,
    "expiry": {
      "ine": ">=90d",
      "proof": "<=3m"
    }
  },
  "EdoMex-Colectivo": {
    "requiredDocs": ["ine[]", "rfc[]", "consent"],
    "conditionalDocs": ["proofLeader", "roster"],
    "ocrThreshold": 0.80,
    "expiry": {
      "ine": ">=90d"
    }
  }
}
```

> La estructura admite mercados adicionales (`Otros`) cargados vía configuración remota.

### 3.1 Metadata extendida (2024)

- `metadata.protection` → `{ required, coverageOptions[], defaultCoverage, simulateEndpoint, applyEndpoint, scoreEndpoint, fallbackScoreEndpoint }`. Permite que guards/UI sepan si la cobertura es obligatoria y qué endpoints usar para simulación/aplicación. Ejemplo: AGS/EdoMex individual = cobertura opcional (Standard/Premium); EdoMex colectivo = cobertura obligatoria (Group).
- `metadata.income` → `{ threshold, documentId }`. Define el porcentaje máximo del pago mensual sobre ingreso neto y el documento condicional (`doc-income`) que se vuelve obligatorio cuando se supera el umbral.
- `metadata.tanda` → `{ minMembers, maxMembers, minContribution, maxContribution, minRounds, maxRounds, validationEndpoint, scheduleEndpoint }`. Reglas matemáticas para flujos colectivos, junto con endpoints oficiales para validar configuraciones y generar cronogramas.

## 4. Herramienta QA / Administración

Para QA y operaciones existe un panel dedicado que permite editar y recargar las políticas sin recompilar la PWA.

- **Ruta:** `/configuracion/politicas` (acceso rápido en Configuración → enlace “Políticas de mercado”).
- **Acciones principales:**
  1. **Recargar del BFF** (`Recargar del BFF`): ejecuta `MarketPolicyService.reloadRemotePolicies()` y vuelve a hidratar el JSON cargado vía `ConfigurationService.loadNamespace('markets/market-policies')`.
  2. **Aplicar cambios:** parsea el JSON del textarea y llama `registerPoliciesFromRemoteConfig()` únicamente en la sesión actual (útil para validaciones locales sin persistir aún).
  3. **Guardar en BFF:** envía `PUT /config/market-policies` mediante `MarketPolicyService.savePoliciesToRemote()`; al completar, refresca la caché local y muestra confirmación.
- **Previsualización:** el panel muestra los documentos y metadatos generados para un contexto (mercado, tipo de cliente, tipo de venta) usando `getPolicyDocuments`, `toDocuments` y `getPolicyMetadata`, los mismos helpers que consume el flujo de Documentos.
- **Requisitos backend:**
  - Endpoint REST que sirva y persista el JSON (`GET/PUT /config/market-policies`).
  - Feature flag `environment.features.enableRemoteConfig` activo cuando se quiera leer desde el servidor remoto.

> Si el backend no está disponible (o en entornos sin `HttpClientService`), el botón “Guardar en BFF” reportará error, pero “Aplicar cambios” seguirá funcionando para pruebas locales en memoria.
- `MarketPolicyService` expone helpers (`requiresProtection`, `getProtectionMetadata`, `getIncomeThreshold`, `getTandaRules`) para que guards, wizards y dashboards consulten estas reglas sin duplicarlas en UI.

## 5. Instrumentación QA (data-cy)

- Upload: `doc-upload-<tipo>`
- QA submit: `doc-submit-<tipo>`
- Estado: `doc-status-<tipo>` (Pending/Validated/Error)
- Retake / manual: `doc-retake-<tipo>`, `doc-manual-<tipo>`
- Advertencias / errores globales: `doc-qa-warning`, `doc-error-banner`
- Confirmaciones manuales: `doc-manual-confirm`
- Progreso general: `documents-progress`
- Multimiembro (Colectivo): `doc-upload-ine-<index>`, `doc-upload-rfc-<index>`

## 6. Guards y servicios relacionados

- `AviCompletedGuard`: restringe acceso a Documentos cuando la decisión AVI no es GO/REVIEW.
- `DocsCompletedGuard`: consulta `MarketPolicyService` para asegurar que los documentos obligatorios están OK antes de Contratos.
- `MarketPolicyService`: expone API (`getRequiredDocs`, `getConditionalDocs`, `getOcrThreshold`, expiraciones, reglas adicionales).
- `OCRService`: normaliza payload de OCR y valida campos según mercado.
- `FlowContextService`: persiste documentos, estados, breadcrumbs y permite reanudar el wizard.
- `ErrorBoundaryService`: maneja timeout / offline / OCR fail con acciones `retry`, `manual`, `skip`, `draft`, `offline`.

## 7. Offline & sincronización

- Uploads se guardan en cola local (IndexedDB) con metadata de documento y mercado.
- Al reconectar, la cola se procesa y actualiza `doc-status-*` acorde al response del backend.
- Las banderas `doc-error-banner` y `doc-qa-warning` informan al usuario cuando la sincronización está pendiente o requiere acción manual.

## 8. Integración con simuladores / cotizadores

- Los cotizadores (AGS, EdoMex Individual, Colectivo) activan los documentos obligatorios acordes a la política antes de enviar casos a contrato.
- `MarketPolicyService` se usa también en Simuladores, Protección y Entregas para mantener coherencia de reglas por mercado.

`docs/navigation.md` resume la navegación del wizard y hace referencia a este archivo para la matriz completa de Documentos.

## 9. Implementación en Angular

- `MarketPolicyService` expone:
  - `getPolicyDocuments(context)` → retorna documentos + metadata calculada.
  - `getRequiredDocs(context)` / `getConditionalDocs(context)` → separan obligatorios vs condicionales según contexto.
  - `getOcrThreshold(context)` y `getExpiryRules(context)` → umbrales y caducidades para alimentar OCR/QA.
  - `registerPoliciesFromConfig(entries)` → permite cargar políticas desde JSON/infraestructura.
  - Document helpers (`toDocuments`, `isRequiredDocument`, `getDocumentById`) facilitan integración con `DocumentRequirementsService`, guards y UI.
  - `registerPoliciesFromRemoteConfig(config)` → llamado automáticamente en el constructor cuando `ConfigurationService` expone el namespace `markets/market-policies`. Si el JSON remoto está vacío o falla la carga, el servicio mantiene las políticas embebidas.
- Políticas por defecto: AGS Individual, EdoMex Individual y EdoMex Colectivo (con tamaño colectivo configurable y tooltips por integrante). Otros mercados usan `buildFallbackPolicy` hasta definir reglas.

## 10. Estado de implementación (DEV)

1. **UI dinámica Documentos** – faltan tarjetas, badges OCR/QA, controles `doc-retake-*` / `doc-manual-*` y soporte multi-miembro en la vista Angular.
2. **Persistencia & guards** – `DocumentUploadFlow` ya persiste documentos/política en `FlowContext` y el guard valida requeridos; falta cablear el guard al paso de contratos y exponer `documents-progress` real en la UI.
3. **Integración datos reales** – alimentar el servicio con JSON de políticas y consumir backend real para carga/descarga de documentos (hoy se simula OCR/upload).
4. **Offline & cola** – `OfflineService` maneja cola local y sincronización básica; falta conectar con APIs reales y exponer telemetría completa (`doc-error-banner`, `doc-qa-warning`).
5. **QA hooks & pruebas** – añadir `data-cy` dinámicos y cubrir reglas con unit/E2E (AVI y guards incluidos).
6. **Módulos dependientes** – propagar flags (ingresos requeridos, tamaño colectivo) desde Cotizador/Simuladores al `FlowContext` y reutilizar política en Contratos.
7. **Deployment/config** – exponer la tabla de políticas a QA/Ops y revisar feature flags (`enableAVISystem`, `enablePostventa`, etc.) por entorno.

## 11. Protección por mercado

| Mercado | Protección obligatoria | Cobertura | Notas |
| --- | --- | --- | --- |
| **AGS (Individual)** | Opcional | Standard / Premium individual | Health score individual; prima ajustable. |
| **EdoMex (Individual)** | Opcional | Standard / Premium individual | RFC/ingresos influyen en prima. |
| **EdoMex (Colectivo/Tanda)** | Sí | Cobertura grupal (consolidada) | Promedio/percentil de grupo; requiere todos los miembros validados. |
| **Otros mercados** | Según política | Según configuración | Configurable vía `MarketPolicyService`. |

### Guard y persistencia

- `ProtectionRequiredGuard` (por implementar) debe bloquear el paso Contrato cuando `MarketPolicyService` marque protección obligatoria y `FlowContext.protection.applied` sea `false`.
- `FlowContext.protection` almacenará `{ score: number; coverageType: 'standard' | 'premium' | 'group' | null; applied: boolean; }`.
- La cobertura se conserva para que Dashboard/Detalle de cliente puedan mostrar upgrades y auditoría.

### Integraciones y dependencias

- `ProtectionService` opera con `/v1/protection/simulate` y `/v1/protection/apply`; cuando el backend devuelve `422` o `409`, la UI muestra modal “Datos incompletos” y mantiene el paso en estado pendiente.
- `metadata.protection.scoreEndpoint` (`/v1/health/score/{clientId}`) y `fallbackScoreEndpoint` (`/v1/health/cache/{clientId}`) alimentan `FlowContext.protection.scoreSource`. Si ambos fallan, se despliega banner rojo `protection-error` y se habilita CTA “Reintentar / Escalar”.
- Eventos de salud (`/v1/health/events`) se encolan cuando el navegador está offline; al reconectar, `ErrorBoundaryService.offlineQueue` reintenta en orden FIFO.

### Estados posteriores / auditoría

- `FlowContext.protection.audit = { appliedAt, advisorId, scenarioId }` respalda auditorías en Dashboard y en Postventa.
- El wizard permite solo la primera aplicación; upgrades/downgrades subsecuentes ocurren en `/clientes/:id/proteccion` reutilizando la misma metadata de política.
- Rechazos en mercados obligatorios generan incidencia `protection-rejected` visible en `context-panel` y mantienen `ProtectionRequiredGuard` bloqueando Contrato.

### Instrumentación y QA

- Eventos: `analytics.track('protection_simulated', { market, coverageType, score })`, `analytics.track('protection_applied', { market, coverageType, advisorId })`.
- Alertas operativas: `protection.simulate.latency > 3s`, `protection.simulate.error_rate > 5%` (Datadog) y ratio de reintentos por asesor.
- Casos QA: score 780 (GO), 620 (Review), <500 (KO); validar reintentos offline y accesibilidad (banners con `role="alert"`, navegación por teclado).

## 12. Tanda (EdoMex Colectivo)

- **Contexto**: solo cuando `market = 'edomex'` y `clientType = 'colectivo'`. El cotizador y el wizard leen `metadata.tanda` para conocer márgenes y endpoints.
- **Reglas de política** (`metadata.tanda`): `minMembers` = 5, `maxMembers` = 12, `minContribution` = 500 MXN, `maxContribution` = 3500 MXN, `minRounds` = 5, `maxRounds` = 24.
- **FlowContext**: `tanda = { numMiembros, aporte, rondas, ordenRotacion, consent, roster[], lastUploadId?, validationId? }`.
- **Guard `TandaValidGuard`** (pendiente): consulta `getTandaRules()` y bloquea cuando integrantes < mínimo, falta consentimiento o documentos (`doc-ine-i`, `doc-rfc-i`) siguen pendientes.

### Integraciones y datos compartidos

- `/v1/tanda/validate` (POST) revisa parámetros y devuelve `validationId` + estado (`ok`, `review`, `error`). Resultado `error` → banner `tanda-validation-error` + CTA “Reintentar” / “Escalar”.
- `/v1/tanda/schedule` genera cronograma oficial; la UI muestra skeleton `tanda-async-loading` hasta recibir respuesta. Si falla, se usa `TandaMathService` local para cálculo offline.
- `/v1/tanda/roster/upload` sube roster firmado tras Documentos; la respuesta incluye `uploadId` almacenado en `FlowContext.tanda.lastUploadId` para auditoría.

### Estados UI y persistencia

- Cronograma accesible (`tanda-summary`) con filas expandibles, `aria-live` para cambios y badges verde/amarillo/rojo según estado.
- Banners especiales: `tanda-warning` cuando `validation.status === 'review'`, `tanda-offline` cuando no hay conexión (se deshabilita CTA Aplicar hasta reconectar).
- `FlowContextService` conserva `validationId` + roster; al retomar el wizard, `MarketPolicyService` recalcula `collectiveSize` para regenerar documentos multimiembro.

### Instrumentación y QA

- Eventos: `analytics.track('tanda_configured', { miembros, aporte, rondas })`, `analytics.track('tanda_validation_error', { reason, memberIndex })`, `analytics.track('tanda_roster_uploaded', { uploadId })`.
- KPIs operativos: tasa de reintento en `/validate` (>2 intentos) y diferencia entre cronograma backend vs local (`schedule_delta`).
- Casos QA: validar límites min/max miembros, aportes 499/500/3500/3501, reconexión offline (configurar tanda sin conexión → reconectar y confirmar que cronograma se recalcula) y consistencia con Documentos (doc multimiembro generado según `collectiveSize`).

## 13. Venta a Plazo (AGS / EdoMex Individual)

- **Contexto**: se habilita cuando `market` es AGS o EdoMex individual.
- **Parámetros clave**: `termMin/termMax`, `downPaymentMin`, `rateBase` por mercado.
- **FlowContext**: `cotizacion = { price, downPayment, term, tasa, pmt, tir, totalFinanciar, status }`.
- **Guard `PlazoGuard`** (pendiente): bloquea si `pmt` supera el umbral de ingresos; exige comprobante adicional cuando `status = 'review'`.
- **Documento condicional**: `doc-income` requerido cuando la política lo marque (status review).
- **Cálculos locales**: PMT/TIR se pueden ejecutar offline, guardando draft para flush posterior.

### Integraciones y reglas

- `QuoteService.calculate` consume `/v1/financing/quote` y devuelve `{ pmt, tir, totalFinanciar }`; si hay `429`, la UI despliega `rate-limit-warning` y deshabilita el botón por 30 segundos.
- `IncomeService.threshold` consulta `/v1/risk/income-threshold/{market}`; el resultado se guarda en `FlowContext.cotizacion.incomeThreshold` y se muestra como hint de porcentaje máximo.
- `metadata.income.threshold` define el ratio permitido; cuando se excede, `MarketPolicyService.requiresIncomeProof` obliga `doc-income` y `DocumentUploadFlow` muestra banner “Subir comprobante de ingresos”.
- `metadata.protection.required = false` en estos mercados, pero la UI usa `coverageOptions` para ofrecer upgrades desde Dashboard.

### Estados UI

- `quote-loading` (spinner en CTA mientras llega el cálculo), `quote-error` para timeouts/validaciones y `quote-details` con tabla de amortización parcial al expandir detalles.
- Banners amarillos para `status = 'review'` (ingreso insuficiente) con CTAs “Subir comprobante” y “Ajustar parámetros”.
- Modo offline: cálculos matemáticos se hacen local y se guarda draft en IndexedDB; al reconectar, se dispara `QuoteService.calculate` para validar contra backend y se actualiza `pmt_delta` si hay diferencia.

### Instrumentación y QA

- Eventos: `analytics.track('financing_quote_calculated', { market, tasa, incomeRatio })`, `analytics.track('financing_quote_adjusted', { adjustmentType })`, `analytics.track('financing_quote_blocked', { reason })`.
- Métricas: `pwa.financing.quote.latency`, `pwa.financing.quote.error_rate`, `pwa.financing.pmt_delta` (diferencia frontend vs backend).
- Casos QA recomendados: precio 350,000 MXN con enganche 20%/30% y plazo 48/60 meses; PMT calculado manual vs backend; escenario `incomeRatio > threshold` para asegurar obligatoriedad de `doc-income`; prueba offline/online para validar persistencia de `FlowContext.cotizacion`.
