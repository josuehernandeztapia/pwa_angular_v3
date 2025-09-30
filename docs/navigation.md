# Conductores PWA Navigation Blueprint

This document captures the end-to-end navigation plan for the Conductores PWA in Minimal Dark + UX Premium styling. Incluye click-by-click flows, `data-cy` hooks, cross-flow context guidance, offline/error behaviors, and mobile considerations.

## 0. Global Patterns
- **Layout:** Sidebar (left) + Topbar (top) + Main content (right).
- **Topbar desktop (≥768px):**
  - Global search input `[data-cy="global-search"]` (Enter executes). Requiere feature flag `enableGlobalSearch`.
  - Dark mode toggle `[data-cy="dark-toggle"]`.
  - Service worker update banner `<app-update-banner>`.
  - Quick actions contextuales `[data-cy="quick-action-*"]` proyectadas desde `NavigationService`.
  - Breadcrumbs + organización en la franja izquierda.
- **Topbar mobile (<768px):** oculta breadcrumbs y quick actions; mantiene búsqueda global y botones compactos.
- **Sidebar items** (actuales, cada uno con `data-cy`): Dashboard `nav-dashboard`, Clientes `nav-clientes`, Cotizador `nav-cotizador`, Simulador `nav-simulador`, Documentos `nav-documentos`, Entregas `nav-entregas`, GNV `nav-gnv`, Protección `nav-proteccion`, Configuración `nav-configuracion`.
  - Onboarding/Postventa, Integraciones, Usuarios/Admin y Usage no aparecen en la barra lateral; se acceden solo vía rutas directas cuando los feature flags lo permiten.
  - AVI y Documentos viven dentro del wizard de onboarding y no se exponen como rutas independientes en la navegación.
  - Integraciones/Usage siguen catalogados como módulos BFF/backoffice (feature flags) y no cuentan con UI activa hoy.
- **Mobile header (<768px):** oculta breadcrumbs y quick actions; topbar mantiene búsqueda global y botones compactos.
- **UI helpers:** `card`, `input`, `btn` (`btn-primary`, `btn-secondary`).
- **Design tokens:** `--bg-dark`, `--surface-dark`, `--border-dark`, `--text-light`, `--text-2`, `--brand`, `--green`, `--yellow`, `--red`.
- **Breadcrumb pattern:** `Dashboard / Módulo / Submódulo / Detalle` shown en topbar (`aria-label="Breadcrumb"`, `aria-live="polite"`).
- **Keyboard shortcuts (desktop):** `Ctrl+K` global search, `Ctrl+N` nueva cotización, `Ctrl+C` nuevo cliente, `Ctrl+D` subir documento, `?` muestra ayuda/atajos.

### 0.1 End-to-End Layout & Flow (Login → Postventa)
- **Sidebar (desktop):** Dashboard, Clientes, Cotizador, Simulador, Documentos, Entregas, GNV, Protección, Configuración. Módulos wizard (Onboarding/Postventa), Integraciones, Usuarios/Admin y Usage se exponen sólo vía rutas directas/feature flags.
- **Topbar:** logo/nombre app, breadcrumbs dinámicos, `global-search`, toggle dark, quick actions contextuales; mantiene acceso en mobile (hamburguesa + búsqueda).
- **Flujo secuencial:** `Login → Dashboard → Clientes → Cotizador (plazo/tanda según mercado) → Wizard Onboarding (Datos, AVI, Documentos, Protección, Contrato) → Entregas → Postventa`.
- **Guard rails:** `AviCompletedGuard`, `DocsCompletedGuard`, `ProtectionRequiredGuard`, `ContractValidGuard`, `DeliveryGuard`, `TandaValidGuard` aseguran gating por mercado y estado de contrato.
- **Offline & Context:** `FlowContext` persiste cliente/contrato/wizard; `OfflineService` cubre Documentos, Cotizador, Protección, Postventa y Claims con banner amarillo “X acciones en cola”.

### Feature flags & integrations (DEV)
- Flags BFF activos por defecto: `enableOdooQuoteBff`, `enableGnvBff`, `enableKycBff`, `enablePaymentsBff`, `enableContractsBff`, `enableAutomationBff` (`src/environments/environment.ts`). Siguen apuntando a servicios stub hasta que los endpoints reales estén disponibles.
- Flags BFF pendientes: `enablePostSaleBff`, `enableClaimsBff`, `enableAdminBff` permanecen en `false` porque todavía no existen los contratos PUT/POST en el BFF. Documentar y coordinar con backend antes de habilitarlos.
- QA panel (`/configuracion/politicas`) usa `MarketPolicyService.savePoliciesToRemote` para persistir; falta el endpoint PUT `/config/market-policies`, por lo que actualmente solo aplica políticas en sesión.
- QA/README: señalar los toggles anteriores cuando se planifiquen pruebas E2E contra servicios reales.

## 1. Flow Overview (Click-by-click)
Each module follows the pattern `preconditions → actions → expected result` with explicit error/offline states.

- Ruta principal `/onboarding` (o `/postventa/wizard` si el feature flag está activo). Se presenta como flujo guiado; **AVI y Documentos NO se exponen como rutas públicas**, son pasos internos previos a contratos.
- Paso 1 – Selección y datos iniciales: menús (`data-cy="onboarding-market-select"`, `onboarding-sale-type`, `onboarding-client-type`, `onboarding-ecosystem-select`) y campos (`onboarding-main__input`, `data-cy="onboarding-new-route-input"`). CTA principal `data-cy="onboarding-selection-continue"` se habilita con `canProceedFromSelection()`.
- Paso 2 – Verificación AVI: componente inline (`avi-start`, `avi-loading`, `avi-decision`, `avi-flag`). El resultado GO/Review/NO-GO determina si se habilita el siguiente paso. Guard `AviCompletedGuard` bloquea Documentos cuando el estado es NO-GO/PENDIENTE.
- Paso 3 – Documentos: render dinámico según mercado (tabla debajo). Usa `doc-upload-*`, `doc-status-*`, `doc-retake-*`, `doc-manual-*`, `doc-manual-confirm-*`, progreso `documents-progress` y bloquea Contratos vía `DocsCompletedGuard` si falta algún obligatorio.
- Paso 4 – Protección (cuando aplica): módulo contextual que calcula health score y cobertura según mercado. Requiere aplicar cobertura antes de continuar en mercados obligatorios (detalle debajo).
- Paso 5 – Generación de contrato: consolida datos, AVI, documentos y protección aplicada, adjunta anexos por mercado (ej. EdoMex Colectivo → consentimiento + roster) y aplica firma digital si procede.
- `FlowContext` persiste formulario, paso actual, documentos y breadcrumbs para retomar el wizard sin pérdida de progreso.

#### Estado de implementación (DEV)
- **UI dinámica Documentos:** `DocumentUploadFlowComponent` (`src/app/components/shared/document-upload-flow.component.html`) ya genera tarjetas por documento basadas en `requiredDocuments`, badges OCR/QA, controles `doc-retake-*`/`doc-manual-*` y secciones multi-miembro con vencimientos/OCR visibles; mantener QA sobre variaciones de política.
- **Persistencia + guards:** `DocumentUploadFlow` persiste documentos/política y el header ya muestra `documents-progress`; `DocsCompletedGuard`, `PlazoGuard`, `TandaValidGuard` y `ProtectionRequiredGuard` protegen el salto a Contratos y rutas directas.
- **Datos reales:** las políticas ya se cargan desde `ConfigurationService` y exponen `income.threshold`/`collectiveSize`; falta reemplazar los servicios mock (`DocumentValidationService`, `simulateApiCall`) por integraciones reales de carga/consulta y publicar telemetría de latencia.
- **Offline & cola:** `OfflineService` mantiene la cola y sincroniza al reconectar, pero `simulateApiCall` sigue siendo un stub; resta cablear endpoints reales y métricas de flush/errores.
- **QA hooks + pruebas:** DocumentUploadFlow expone `data-cy`/analytics y `DocsCompletedGuard` tiene unit tests; quedan pendientes E2E multi-mercado y cobertura de `PlazoGuard`/`TandaValidGuard`.
- **Módulos dependientes:** Onboarding ya persiste `requiresIncomeProof`/`collectiveMembers`; validar que Cotizador/Simuladores propaguen `monthlyPayment`/`incomeThreshold` y que contratos reutilicen la política/anexos derivados.
- **Configuración despliegue:** exponer la tabla de políticas para QA/ops y revisar toggles (`enableAVISystem`, `enablePostventa`, etc.) por entorno.

#### Matriz de documentos por mercado (Paso 3)

> Referencia ampliada: ver `docs/market-policies.md` para la matriz completa, reglas de OCR, guardias y plantilla JSON de `MarketPolicyService`.

| Mercado | Documentos obligatorios | Documentos condicionales | OCR campos clave | Gates/validación | Expiración/QA |
| --- | --- | --- | --- | --- | --- |
| **AGS (Individual)** | INE anverso/reverso (`doc-ine`), Comprobante domicilio (`doc-proof`) | RFC (`doc-rfc`) si financia, Comprobante ingresos (`doc-income`) si PMT supera umbral | INE: nombre, CURP, vigencia. Domicilio: calle/CP. RFC: patrón. Ingreso: monto/periodicidad | INE válido + domicilio coincide con cliente; faltante → `DocsCompletedGuard = KO` | INE vigencia ≥90d, domicilio ≤3m, OCR ≥0.85 (retake/manual permitido) |
| **EdoMex (Individual)** | INE, Domicilio, RFC | Comprobante ingresos | Igual que AGS + RFC obligatorio | RFC obligatorio; ingreso insuficiente → estado *Review* con documento adicional | Mismas ventanas que AGS; OCR <0.85 exige retake o captura manual |
| **EdoMex (Colectivo/Tanda)** | INE y RFC de cada miembro (`doc-ine-*i`, `doc-rfc-*i`), Carta consentimiento (`doc-consent`) | Domicilio líder, Lista miembros firmada (`doc-roster`) | INE/RFC múltiples; Consentimiento: grupo, cuotas, firma | Consentimiento firmado + N INE/RFC válidos; falta crítica → `DocsCompletedGuard = KO` | INE cada miembro vigente; consentimiento firmado; OCR ≥0.80 |
| **Otros mercados** | Definidos por `MarketPolicyService` | — | Campos configurables | Gates según política | Ventanas/QA según política |

> Referencia rápida (configurable):
> ```json
> {
>   "AGS": {
>     "requiredDocs": ["ine", "proof"],
>     "conditionalDocs": ["rfc", "income"],
>     "ocrThreshold": 0.85,
>     "expiry": { "ine": ">=90d", "proof": "<=3m" }
>   },
>   "EdoMex-Individual": {
>     "requiredDocs": ["ine", "proof", "rfc"],
>     "conditionalDocs": ["income"],
>     "ocrThreshold": 0.85,
>     "expiry": { "ine": ">=90d", "proof": "<=3m" }
>   },
>   "EdoMex-Colectivo": {
>     "requiredDocs": ["ine[]", "rfc[]", "consent"],
>     "conditionalDocs": ["proofLeader", "roster"],
>     "ocrThreshold": 0.80,
>     "expiry": { "ine": ">=90d" }
>   }
> }
> ```

#### Paso 3 – Documentos (click-by-click)

1. Cada documento se presenta en una `card` con upload `doc-upload-<tipo>`, validación `doc-submit-<tipo>` y estado `doc-status-<tipo>`.
2. Cuando OCR ≥ umbral se muestran los campos para verificación; si es inferior se habilitan `doc-retake-<tipo>` o `doc-manual-<tipo>`.
3. Para EdoMex Colectivo se generan sub-secciones repetibles por miembro (`doc-upload-ine-0`, `doc-upload-rfc-0`, etc.).
4. `documents-progress` resume “X/Y validados”; el CTA Siguiente sólo se habilita si `DocsCompletedGuard` devuelve OK.
5. Uploads quedan en cola offline (IndexedDB) y se sincronizan al recuperar conexión.
6. Instrumentación QA clave adicional: `doc-error-banner` (errores globales), `doc-qa-warning` (review), `doc-manual-confirm` (cierres manuales) y banners success `doc-status-badge-<tipo>`.

#### Guards y servicios relacionados

- `AviCompletedGuard`: `FlowContext.avi.decision` ∈ {GO, REVIEW} para permitir Documentos.
- `DocsCompletedGuard`: valida que `MarketPolicyService.requiredDocs(market)` estén en estado OK antes de avanzar a Contratos.
- `ProtectionRequiredGuard`: asegura que la cobertura esté aplicada cuando el mercado lo requiera antes de Contratos.
- `TandaValidGuard`: verifica que los parámetros colectivos (miembros, aportes, consentimiento, documentos) sean válidos antes de continuar a AVI.
- `MarketPolicyService`: matriz de documentos, OCR thresholds, expiraciones y reglas de gating por mercado.
- `OCRService`: normaliza campos y devuelve umbrales para cada documento.
- `FlowContextService`: preserva formularios, documentos, breadcrumbs y permite cruzar datos Cotizador ↔ Clientes ↔ Wizard.
- `ErrorBoundaryService`: maneja timeout/offline/OCR fail con acciones `retry`, `manual`, `skip`, `draft`, `offline`.

#### Paso 4 – Protección (detalle quirúrgico)

1. **Activación**: `MarketPolicyService` determina si el mercado exige protección; el wizard inserta el paso después de Documentos cuando es obligatorio (ej. EdoMex colectivo).
2. **UI**: `card` con `protection-score` (0–100), cobertura mostrada en `protection-coverage` (Standard/Premium/Group) y CTA `protection-apply`.
3. **Evaluación**:
   - AGS Individual: score individual → elegir Standard/Premium.
   - EdoMex Individual: combina score + RFC/ingresos para ajustar prima.
   - EdoMex Colectivo: calcula media/percentil de grupo; si miembros incompletos, bloquea aplicación.
4. **Persistencia**: el resultado se guarda en `FlowContext.protection = { score, coverageType, applied }` para consumo en contratos.
5. **Guard**: `ProtectionRequiredGuard` bloquea Contratos cuando la cobertura obligatoria aún no se aplica.
6. **Edge cases**:
   - Score no disponible: banner rojo, opciones `retry` / `escalar`.
   - Offline: paso bloqueado; instrucción reintentar al reconectar.
   - Colectivo con miembros faltantes: lista integrantes pendientes, deshabilita `protection-apply`.
7. **Backends involucrados**:
   - `ProtectionService` consume `/v1/protection/simulate` y `/v1/protection/apply`; si cualquiera regresa `422`, mostrar modal “Datos incompletos” y mantener paso en estado `pending`.
   - `HealthScoreService` (BFF) entrega score vía `/v1/health/score/{clientId}` y fallback `/v1/health/cache/{clientId}`; ambos resultados se cachean en `FlowContext.protection.scoreSource`.
   - Eventos health (`/v1/health/events`) se encolan cuando `navigator.onLine === false` y se sincronizan con `ErrorBoundaryService` → `offline-queue`.
8. **Estados posteriores**:
   - `FlowContext.protection.audit` conserva `{ appliedAt, advisorId, scenarioId }` para auditoría en Dashboard/Postventa.
   - Upgrades/downgrades se tramitan desde Dashboard (`/clientes/:id/proteccion`) con mismas reglas; wizard solo permite la primera aplicación.
   - Si el cliente rechaza protección obligatoria, se genera incidencia `protection-rejected` visible en `context-panel` y `ProtectionRequiredGuard` sigue bloqueando contrato.
9. **States UI adicionales**:
   - `protection-loading` (skeleton mientras responde `/simulate`).
   - `protection-disabled` (cuando falta score/inputs).
   - Banners accesibles (aria-live) para `error`, `warning`, `success`; textos bilingües se cargan desde `i18n/es.json` y `i18n/en.json`.
10. **Instrumentación & métricas**:
    - `analytics.track('protection_simulated', { market, coverageType, score })`.
    - `analytics.track('protection_applied', { market, coverageType, advisorId })`.
    - Alertas operativas (Datadog) en `/simulate` > 3s (`protection.simulate.latency`) y tasa de error >5% (`protection.simulate.error_rate`).
11. **QA / validación**:
    - Casos numéricos: score 780 (GO), 620 (Review), <500 (KO).
    - Verificar reintento offline → reconexión envía payload en orden.
    - Prueba de accesibilidad: `Tab` debe recorrer cards y CTA, banner con `role="alert"`.

#### Venta a Plazo – detalle quirúrgico

1. **Activación**: en Cotizador/Onboarding, seleccionar `market-select = 'AGS'` o `market-select = 'EdoMex-Individual'` habilita el formulario de venta a plazo.
2. **UI**: inputs `input` para precio (`price`), enganche (`downPayment`), plazo meses (`term`) y tasa (cargada según política). CTA `calculate-quote` calcula cuota. Resumen en `card` muestra `sum-pmt`, `rate-display`, `sum-financiar`.
3. **Cálculos**: monto financiar = precio – enganche; PMT según fórmula estándar; TIR calculada para validar rentabilidad.
4. **Reglas**: AGS usa tasa fija; EdoMex Individual ajusta tasa opcionalmente según ingresos/score; mercados colectivos (Tanda) omiten venta a plazo.
5. **Persistencia**: `FlowContext.cotizacion` guarda `{ price, downPayment, term, tasa, pmt, tir, totalFinanciar, status }` para que Documentos exija comprobantes si `status = 'review'`.
6. **Guard**: `PlazoGuard` bloquea si `pmt` supera el umbral permitido por ingresos (CTA subir comprobante o ajustar parámetros).
7. **Edge cases**: enganche mínimo/tasa fuera de rango con validaciones UI; fallback de tasa si la API falla; cálculos offline permiten guardar draft para flush posterior.
8. **Integraciones**:
   - `QuoteService.calculate` llama `/v1/financing/quote` devolviendo `{ pmt, tir, totalFinanciar }`; si el servicio responde `429`, se muestra `rate-limit-warning` y se deshabilita CTA por 30s.
   - `IncomeService.threshold` determina `%` máximo sobre ingreso neto (`/v1/risk/income-threshold/{market}`) que alimenta `FlowContext.cotizacion.incomeThreshold`.
   - `MarketPolicyService` marca cuándo `doc-income` pasa a obligatorio, exponiendo `metadata.income.threshold` (detalle abajo).
9. **Estados UI**:
   - `quote-loading` (spinner en CTA mientras calcula).
   - `quote-error` con detalles (timeout/server validation) y enlaces “Ajustar parámetros” / “Intentar de nuevo”.
   - Resumen incluye breakdown `ui-table` con amortización simplificada (primer/último mes) cuando el usuario abre `details-drawer`.
10. **Instrumentación**:
    - Eventos: `financing_quote_calculated`, `financing_quote_adjusted`, `financing_quote_blocked` (payload con mercado, tasa, incomeRatio).
    - Métricas: monitorear diferencia entre PMT calculado en frontend vs backend (`pmt_delta`), alertar cuando > $5 MXN.
11. **QA**:
    - Casos prueba: precio 350k, enganche 20% y 30%, plazo 48/60 meses; validar PMT con fórmula.
    - Escenario `status='review'` genera requerimiento `doc-income` y banner en Documentos.
    - Validar persistencia `FlowContext.cotizacion` → se restaura tras refresh.

#### Tanda (EdoMex Colectivo) – detalle quirúrgico


1. **Activación**: seleccionar `market-select = 'EdoMex-Colectivo'` en Cotizador/Simulador/Onboarding activa el sub-flujo de tanda.
2. **UI**: cards `tanda-aporte` (aporte individual), `tanda-miembros` (número de integrantes), `tanda-rondas` (rondas/plazo) y `tanda-rotacion` (orden de turnos). Un resumen `tanda-summary` presenta cronograma/tabla tipo gantt.
3. **Reglas matemáticas**: cuota individual = aporte; monto entregado = aporte × nº miembros; cada ronda un integrante recibe el total; ETA entregas = fecha inicio + (ronda × periodo).
4. **Persistencia**: `FlowContext.tanda = { market: 'EdoMex-Colectivo', numMiembros, aporte, rondas, ordenRotacion, consent, roster[] }` para que Documentos/Protección validen multi-miembro.
5. **Guard**: `TandaValidGuard` exige número de miembros dentro de política, consentimiento firmado y documentos (INE/RFC) completos para permitir AVI.
6. **Edge cases**:
   - Miembros incompletos: lista en rojo con CTA “Subir documento”.
   - Consentimiento no firmado: banner bloqueante.
   - Aporte fuera de rango: mensaje “mínimo/máximo” según política.
   - Offline: datos se guardan en IndexedDB y se sincronizan al reconectar.
7. **Integraciones y datos compartidos**:
   - `/v1/tanda/validate` verifica parámetros (min/max miembros, aportes, rondas) y devuelve `validationId`; si falla → `tanda-validation-error`.
   - `/v1/tanda/schedule` calcula cronograma oficial; fallback local usa `TandaMathService` con los mismos parámetros para operar offline.
   - El roster completo se envía a `/v1/tanda/roster/upload` tras Documentos; `uploadId` se guarda en `FlowContext.tanda.lastUploadId`.
8. **Estados adicionales UI**:
   - `tanda-async-loading` (skeleton) mientras llega cronograma.
   - `tanda-warning` cuando `validation.status === 'review'` (ej. datos inconsistentes) con CTA “Escalar a supervisor”.
   - Cronograma accesible: filas expandibles, announce con `aria-expanded` y `aria-describedby`.
9. **Instrumentación**:
   - Seguimiento `analytics.track('tanda_configured', { miembros, aporte, rondas })`.
   - `analytics.track('tanda_validation_error', { reason, memberIndex })`.
   - Métrica operativa: tasa de reintento en `/validate` (>2 intentos) dispara alerta product.
10. **QA / escenarios**:
    - Validar min/max miembros (ej. 5 y 12) y aportes (500–3500 MXN) con casos límite.
    - Simular reconexión: configurar tanda offline, reconectar ⇒ cronograma se recalcula y banner se oculta.
    - Revisar consistencia con Documentos: `doc-ine-i` y `doc-rfc-i` deben generarse según `collectiveSize` devuelto por `MarketPolicyService`.

#### Paso 2 – AVI (detalle quirúrgico)

1. **Trigger en wizard**: al avanzar desde “Datos del Cliente”, el wizard embebe `avi-validation-runner` dentro de una `card` con CTA `avi-start`.
2. **Grabación**: el asesor captura respuestas guiadas; `AviService` envía el audio al backend de ML.
3. **Evaluación**: el motor devuelve score 0–1000, clasificado como:
   - GO ≥ 750 (verde, continúa)
   - REVIEW 500–749 (amarillo, permite avanzar pero marca seguimiento)
   - NO-GO ≤ 499 (rojo, bloquea el flujo)
4. **Persistencia**: resultado y score viven en `FlowContext.avi` para que `DocsCompletedGuard`/contratos lo consulten.
5. **Guard**: `AviCompletedGuard` sólo habilita Documentos cuando el estado es GO o REVIEW; NO-GO/PENDIENTE redirige al paso AVI con mensaje.
6. **Edge cases**:
   - Micrófono denegado → banner instructivo para habilitar permisos.
   - Timeout → `ErrorBoundaryService` ofrece `retry`, `draft`, `offline`.
   - Offline → paso bloqueante, se conserva estado y se retoma al reconectar.
7. **Backends involucrados**:
   - `AviService.start()` llama `/v1/avi/session` para obtener `sessionId` + script de preguntas.
   - Grabación se envía a `/v1/avi/analyze` (stream multipart) y espera respuesta JSON `{ score, category, transcript }`.
   - Si el backend devuelve `409` (sesión duplicada), se muestra modal “Sesión activa” y CTA *Reintentar* reinicia `start()`.
8. **Estados posteriores**:
   - `FlowContext.avi = { sessionId, score, category, transcript, recordedAt }` y bandera `requiresSupervisor` cuando el resultado es Review.
   - `DocsCompletedGuard` lee `FlowContext.avi.category`; si Review, Documentos muestra banner amarillo “Se requiere revisión adicional”.
   - Contratos adjuntan el transcript al expediente cuando `enableAviTranscript` está activo.
9. **UI & accesibilidad**:
   - Estados `avi-start`, `avi-recording`, `avi-processing`, `avi-result` con `aria-live="polite"`.
   - Botón detener (`avi-stop`) disponible para emergencias; confirma descarte antes de reiniciar.
   - Indicador visual de captura (waveform) y contador regresivo configurable (`avi-countdown`).
10. **Instrumentación & métricas**:
    - Eventos: `analytics.track('avi_started', { market, advisorId })`, `analytics.track('avi_completed', { score, category })`, `analytics.track('avi_escalated', { reason })`.
    - Métricas observabilidad: `avi.analyze.latency`, `avi.analyze.error_rate`, ratio NO-GO por mercado.
    - Alertas Slack cuando `avi.analyze.error_rate > 5%` o `latency > 6s` durante 5 minutos.
11. **QA / validación**:
    - Casos controlados con audios sintéticos para GO/Review/NO-GO y audio corrupto.
    - Pruebas de permisos (revocar micrófono) y reconexión offline.
    - Validar que `AviCompletedGuard` bloquea Documentos hasta que `category` sea GO/Review y que `FlowContext` se restaura tras recargar.

### Login `/login`
- Preconditions: user unauthenticated. Screen uses `card` with `[data-cy="login-email"]`, `[data-cy="login-password"]`, `[data-cy="login-submit"]`.
- Flow: enter email, enter password, click Ingresar ⇒ redirect `/dashboard`.
- Errors: wrong credentials show red banner and stay on `/login`; offline shows yellow “Sin conexión” banner with retry.
- Mobile: keyboard must not cover submit; OS back button keeps app open.

### Dashboard `/dashboard`
- Displays KPIs (PMT, TIR, Ahorro, Entregas) in `card` components. Cada KPI incluye tooltip (`?` icon) describiendo cálculo y uso.
- Quick actions: bajo cada KPI primario mostrar CTAs directas para saltar sin pasar por sidebar.
  - **PMT** → `Crear cotización` (`data-cy="dashboard-pmt-create-quote"`, navega a `/cotizador/new?source=dashboard`). Secundaria opcional: `Ver pipeline` (`data-cy="dashboard-pmt-open-pipeline"`, filtra `/cotizador?filter=pipeline`).
  - **TIR** → `Abrir simulador` (`data-cy="dashboard-tir-open-simulator"`, navega a `/simulador?preset=tir`). Secundaria: `Ver protección` (`data-cy="dashboard-tir-open-proteccion"`, lleva a `/proteccion?source=tir`).
  - **Ahorro** → `Comparar escenarios` (`data-cy="dashboard-ahorro-compare"`, abre `/simulador?view=compare`). Secundaria: `Exportar ahorro` (`data-cy="dashboard-ahorro-export"`, dispara descarga CSV con `?range=30d`).
  - **Entregas** → `Revisar entregas` (`data-cy="dashboard-entregas-open"`, navega a `/entregas`). Secundaria: `Recalcular ETA` (`data-cy="dashboard-entregas-recalculate"`, llama `deliveryService.recalculate()` con confirmación inline).
- Actions: click KPI Clientes ⇒ `/clientes`; KPI Cotizador ⇒ `/cotizador`; notificaciones (ej. “Doc. vencido”) abren el paso correspondiente dentro del wizard (sección Documentos) conservando contexto.
- Edge cases: slow load shows skeleton `card` con `animate-pulse`; API error shows “No disponible” con botón Reintentar.

### Global Search
- `[data-cy="global-search"]` with suggestions (recientes + chips por tipo). `Enter` abre top match, `Shift+Enter` abre en pestaña nueva.
- Query examples: “Juan Pérez” ⇒ `/clientes?query=Juan Pérez` ⇒ row ⇒ `/clientes/:id`; “Cotización AGS #1234” ⇒ `/cotizador?id=1234`; “INE vencido” ⇒ abre el paso Documentos dentro del wizard con filtro `expired`.
- Mobile: autofocus input; results in `card` list.

### Clientes `/clientes`
- List view: table within `card` and filter `[data-cy="clientes-search"]`.
- Actions: filter + Enter; click row ⇒ `/clientes/:id`; click Nuevo Cliente ⇒ `/clientes/new`.
- Detail `/clientes/:id`: view `card`, edit `[data-cy="edit-client"]`, save `[data-cy="save-client"]` (success banner). Cross-action `[data-cy="create-quote"]` ⇒ `/cotizador?clientId=:id`.
- Errors: validation messages inline (red text); offline enforces read-only with disabled save (tooltip).

### Cotizador `/cotizador`
- Layout: Context panel + Summary con autosave (FlowContext persiste formState/cliente/breadcrumb). Si el usuario salta a `/clientes/new`, al volver se restituyen valores.
- Flow: select mercado `[data-cy="market-select"]`, choose cliente or create new (`/clientes/new`), fill `[data-cy="price"]`, `[data-cy="dpct"]`, click Calcular `[data-cy="calculate-quote"]`, review summary (`rate-display`, `sum-pmt`, `sum-financiar`), click Guardar/Enviar.
- Colectivo flow `/cotizador/colectivo`: cards capture miembros, aporte, plazo.
- CTA secundaria `Crear cliente` (`data-cy="cotizador-create-client"`) preserva contexto y abre `/clientes/nuevo?returnTo=cotizador`.
- Errors: context change with incomplete data shows grey “Completa contexto” notice; timeout shows Reintentar preserving inputs.

### Simulador `/simulador`
- Three `card` scenarios (AGS ahorro, EdoMex individual, EdoMex colectivo) + panel “Simulaciones recientes” con badges y CTA.
- Flow: select scenario, set meta enganche/consumo/sobreprecio, click Simular ⇒ displays ahorro acumulado + PMT. Optional Guardar adds to comparative table.
- Mobile: progressive disclosure (steps).

### Protección `/proteccion`
- Cards: HealthScore (`health-score`), Cobertura (`coverage`), Acción (`apply-protection`).
- Flow: inspect score, optionally Simular, click Aplicar ⇒ status upgrades Estándar → Premium with green text and confirmation banner.
- Errors: API error red notice with Reintentar (state preserved); offline read-only with action queue for sync.

### AVI (paso de onboarding)
- El análisis de voz se ejecuta dentro del wizard antes de permitir la carga de documentos. Componentes clave: `avi-start`, `avi-loading`, `avi-decision`, `avi-flag`.
- Flow: click Iniciar análisis ⇒ loader ⇒ decision (GO ≥750, REVIEW 500–749, NO-GO ≤499) + flags.
- Errors: microphone denied message with permissions link; timeout offers Reintentar.

### Documentos (paso dentro de Onboarding/Postventa)
- Dropzone `[data-cy="document-upload"]`, loader `[data-cy="documents-loading"]`, tabla `[data-cy="documents-table"]` con badges `[data-cy="doc-status"]`.
- Flow: seleccionar archivo, ver estado Pendiente → Validado/Error dentro de la lista. El paso solo se habilita si AVI concluyó exitosamente.
- Errors: OCR failure marca Error (rojo) y expone Reintentar manteniendo el contexto.

### Entregas `/entregas`
- Timeline `card` with steps Day 1/30/77 (`data-cy="delivery-step"`) and ETA (`data-cy="delivery-eta"`).
- Flow: review milestones/ETA; click Recalcular ETA when available.
- Errors: API down renders grey timeline and Reintentar.

### Postventa (feature flag `/postventa/wizard`)
- Wizard `card` (fotos → OCR → revisión → confirmación) disponible solo cuando el flag de postventa está activo.
- Flow: subir fotos requeridas, ejecutar OCR (Pendiente → Validado/Error), revisar, Confirmar (banner éxito).
- Errors: foto inválida muestra mensaje inline; OCR baja confianza solicita captura extra.

### GNV `/gnv`
- Panel shows station health (OK/Degradado/Offline) and table/CSV.
- Flow: review health indicator, click Descargar CSV, optionally upload CSV to render cleaned table.

### Integraciones (módulo BFF / feature flag)
- No aparece en la sidebar, pero con la bandera activa se puede acceder a `/integraciones` para revisar un panel read-only con estatus y logs simulados de Odoo/NEON/Callbacks.
- Sigue siendo un módulo backoffice; las acciones son mock y sirven como placeholder mientras se conectan las APIs reales.

### Usuarios / Administración (feature flag)
- Ruta técnica `/administracion` condicionada por bandera. No aparece en la sidebar actual; el blueprint lo cataloga como futuro `/usuarios` si se decide exponerlo.

### Configuración `/configuracion`
- Toggles `mode-cotizador`/`mode-simulador`, package cards (`select-package`), inline validations.
- Flow: pick mode, fill forms, choose package, Guardar.

### Usage / Reports (feature flag)
- Ruta `/usage` expone métricas mock (read-only) cuando `enableUsageModule` está activo.
- No se agrega a la sidebar productiva; se accede vía deep link o tarjetas internas.

## 2. Cross-flow Context Preservation
- `FlowContext` service persists `formState`, `breadcrumbs`, `clientId`, `sessionId` when navigating between modules.
- When switching modules (e.g., Cotizador → Crear cliente → regreso), `FlowContext` caches data and `.patchValue()` restores on return.
- Context panel (`context-panel`) keeps client info, current step, and status for AVI → Protección → Cotizador pipeline.
- CTA “Guardar y regresar a cotización” remains visible to provide explicit UX cue.
- `FlowContext` updates breadcrumbs so back navigation returns to originating module without losing state.
- **Estado actual:** `FlowContextService` ya está activo en Cotizador/Clientes/Onboarding y se extendió a Protección y Entregas; restan guards específicos para rutas avanzadas.

## 3. Error & Offline Strategy
- `ErrorBoundaryService` handles network timeouts, offline queueing, and manual bypass options.
- Network timeout: present choices Reintentar, Trabajar offline, Guardar borrador.
- OCR failure: offer Retomar, Procesar manual, o Saltar según flujo.
- Offline banner `card` with “Sin conexión. Intente de nuevo”; mutable actions disabled until sync.
- Offline queue stores pending mutations (Protección apply, Cotizador save, etc.) for Service Worker replay.
- **Estado actual:** la cola offline y `ErrorBoundaryService` ya están implementados en Clientes/Documentos con UI en `context-panel`; resta instrumentar telemetría y QA extendido.

## 4. Responsive
- Mobile collapses sidebar into hamburger within topbar.
- Forms convert to progressive disclosure stepper with minimal progress bar.
- Tables gain subtle horizontal scroll cue.

## 5. Keyboard Shortcuts
- `Ctrl+K` focus global search; `Ctrl+N` nueva cotización; `Ctrl+C` nuevo cliente; `Ctrl+D` subir documento; `?` lista de atajos.
- Provide tooltip or help modal triggered by `?`.

## 6. Estado de implementación `data-cy`
- Topbar: `[data-cy="global-search"]` ya vive en `src/app/components/shared/global-search/global-search.component.html:15`, junto con `dark-toggle`, `date-range`, `export` y `org-name` en `src/app/app.component.html:77`.
- Login: `login-email`, `login-password`, `login-submit`, toggle, recuerdame y enlaces están activos en `src/app/components/auth/login/login.component.html:31`/`69`/`117`.
- Clientes: `clientes-search`, `edit-client`, `save-client`, `create-client` y acciones cruzadas (`cliente-start-avi`, `cliente-start-kyc`, `cliente-view-documents`, `cliente-generate-contract`) instrumentados con `FlowContextService` en `src/app/components/pages/clientes/...`.
- Cotizador: métricas y acciones usan `price`, `market-select`, `calculate-quote`, `cotizador-formalize` y derivados en `src/app/components/pages/cotizador/cotizador-main.component.html`.
- Documentos: dropzone `document-upload`, loader `documents-loading`, tabla `documents-table` y badges `doc-status` viven en `src/app/components/shared/document-upload-flow.component.html:15`/`61`/`66`/`83`.
- Hooks existentes: sidebar `nav-*` y navegación primaria siguen en `src/app/app.component.html:13`-`64`; quick actions de dashboard y simulador conservan sus atributos.

## 7. Estado de avance (abril 2024)
- [x] FlowContext persistente para breadcrumbs y retomado de formularios en Clientes, Cotizador, Onboarding, Protección y Entregas (`src/app/services/flow-context.service.ts:20`).
- [x] Búsqueda global con chips, recientes y atajo `Ctrl+K` (`src/app/components/shared/global-search/global-search.component.html:24`, `.ts:181`).
- [x] Atajos `Ctrl+N/C/D` y `?` operativos desde el shell (`src/app/app.component.ts:80`-`112`), con modal de ayuda deferido.
- [x] Documentos dentro del wizard enlazados al guard `AviCompletedGuard` (`src/app/guards/avi-completed.guard.ts:20`) y al nuevo flujo de subida (`src/app/components/shared/document-upload-flow.component.html:15`).
- [~] Adaptaciones móviles activas en el wizard Onboarding (stepper + `isMobileView`) pero requiere QA en navegación lateral (`src/app/components/pages/onboarding/onboarding-main.component.ts:68`/`133`).

## 8. Mermaid Navigation Diagram
```mermaid
flowchart TD
    %% Inicio
    A[Login<br/>login-email/password<br/>login-submit] -->|Ingresar| B[Dashboard<br/>.ui-card KPIs]

    %% Dashboard
    B -->|Sidebar nav-clientes| C[Clientes<br/>clientes-search]
    B -->|Sidebar nav-cotizador| D[Cotizador<br/>market-select]
    B -->|Sidebar nav-simulador| E[Simulador]
    B -->|Sidebar nav-entregas| F[Entregas Tracking]
    B -->|CTA wizard| G[Postventa Wizard]

    %% Clientes
    C -->|Seleccionar cliente| C1[Detalle Cliente<br/>edit-client/save-client]
    C -->|Crear nuevo| C2[Nuevo Cliente Form] -->|Guarda y vuelve (FlowContext)| D

    %% Cotizador
    D -->|Market=AGS/EdoMex-Individual| D1[Venta a Plazo<br/>price/downPayment/term]
    D -->|Market=EdoMex-Colectivo| D2[Tanda<br/>tanda-miembros/aporte/rondas]

    D1 --> H[Onboarding Wizard]
    D2 --> H

    %% Onboarding Wizard
    H --> H1[Datos Cliente]
    H1 --> H2[AVI Validation<br/>avi-start/avi-decision<br/>AviCompletedGuard]
    H2 --> H3[Documentos<br/>doc-upload-*, doc-status-*, documents-progress<br/>DocsCompletedGuard]
    H3 --> H4{Protección requerida?}
    H4 -->|No| H5[Contrato]
    H4 -->|Sí| H41[Protección<br/>protection-score/apply<br/>ProtectionRequiredGuard] --> H5
    H5 --> F

    %% Entregas
    F --> F1[Timeline 77 días<br/>delivery-status tokens<br/>DeliveryGuard]

    %% Postventa
    G --> G1[Subir fotos<br/>postventa-upload-photo-*<br/>Offline queue]
    G1 --> G2[OCR refacciones<br/>postventa-ocr-*]
    G2 --> G3[Revisión QA]
    G3 --> G4[Confirmación<br/>ContractValidGuard]

    %% Cross-flows
    B -.->|Alerta doc vencido| H3
    D -.->|Crear cliente nuevo| C2
    C1 -.->|Generar cotización| D
```

## 11. Postventa Wizard (Fotos / Refacciones)
- **Activación:** ruta `/postventa/wizard` (feature flag) sólo visible cuando `ContractValidGuard` valida contrato vigente, checklist completa, AVI GO/Review y protección aplicada.
- **UI:** wizard `.ui-card` de cuatro pasos con `data-cy="photo-steps"` y tarjetas `data-cy="step-card"` que representan:
  1. `plate`
  2. `vin`
  3. `odometer`
  4. `evidence`
  Cada paso muestra badges `En cola offline/Validado/Revisar`, CTA `Tomar foto` y `Repetir`, y opcional `Ingresar manualmente` para VIN/odómetro. Las entradas de archivo heredan `photo-wizard__input`; el plan de QA documenta alias `postventa-upload-photo-*` para traceo.
- **Conexiones:**
  - Asocia el caso al contrato activo mediante `ClientContext.contractId` y persiste el payload en `FlowContext.postventa = { caseId, photos[], pendingOfflineCount, currentStep }`.
  - `PostSaleService` sube fotos (`/postventa/cases/{id}/photos`) y dispara OCR (`/postventa/photos/analyze`). Los resultados alimentan QA (`step.confidence`, `step.missing`).
  - Dashboard y Cliente Detalle leen `FlowContext.postventa` para mostrar pendientes/postventa activa.
- **Offline/Error:**
  - `ErrorBoundaryService` captura timeouts de subida y delega a `OfflineService.storeOfflineRequest` para mantener la cola (`pendingOfflineCount`, banner “X fotos en cola”).
  - Al reconectar se ejecuta `OfflineService.flush()` → `analytics.track('postventa_step_flush')` y se actualiza el estado del step.
  - Banner offline `photo-wizard__banner--offline` informa que se conservarán las capturas.
- **Estados complementarios:** banners para reintento VIN (`retakeVinWithRetry`), mensajes `step.error` cuando OCR devuelve baja confianza y botón manual cuando procede.

## 12. Tracking de Entregas (Post-contrato)
- **Ubicación:** timeline `.ui-card` en `/entregas` accesible desde Dashboard/Cliente Detalle; rutas protegidas por `AuthGuard` + `DeliveryGuard` (verifica contrato activo, checklist sincronizada y sin pendientes offline).
- **Reglas de negocio:**
  - AGS/EdoMex Individual → calcula hitos fijos (Día 1 alta, Día 30 seguimiento, Día 77 cierre) desde `DeliveryTrackingService` usando `contract.eta`.
  - EdoMex Colectivo (Tanda) → consume `FlowContext.tanda.schedule` para pintar cronograma rotativo; sincroniza con `scheduleId` cuando se recalcule.
- **Conexiones:**
  - `FlowContext.delivery = { contractId, activeMilestone, events[] }` alimenta la tarjeta de Dashboard y breadcrumbs `context-panel`.
  - Botones `delivery-advance-*` llaman `DeliveryTrackingService.transition`, y `delivery-adjust-eta` dispara `/entregas/:id/adjust` actualizando `FlowContext` y timeline.
  - Estados token `delivery-status-{green|yellow|red}` reflejan SLA; rojo se activa cuando `isOverdue(eta)`.
- **Offline/Error:**
  - Si `/v1/delivery/timeline` falla se renderiza estado gris (`delivery-timeline--error`) con CTA `delivery-retry`.
  - Acciones mutables caen en `OfflineService` (payload `deliveryAction`) y muestran banner amarillo “Acciones en cola”.

## 13. Seguimiento Postventa (Claims / Service)
- **Módulo:** `/claims` (flag `enableClaimsModule`) monta tabla `.ui-card` con `data-cy="claims-table"`, filtros superiores `claims-filter-*` y badge `claims-status-{open|in_progress|closed}`.
- **Conexiones:**
  - Cada registro enlaza contrato + cliente (`claim.contractId`, `claim.clientId`) y vive en `FlowContext.claims` para sincronizar con Cliente Detalle.
  - `ClaimsService` ejecuta `list`/`create`/`update`/`close` contra BFF (`/v1/claims`). Mientras el API no está listo, escribe en localStorage (`claims::draft`) pero respeta la misma interfaz para drop-in.
  - Botones `Crear incidencia`, `Actualizar estado`, `Agregar nota` usan `SearchRouterService` para navegar al contrato cuando se requiere contexto adicional.
- **Offline/Error:**
  - Mutaciones delegan a `ErrorBoundaryService.capture('claims', payload)`; si no hay red, se llaman `OfflineService.storeOfflineRequest('/v1/claims', 'POST', payload)` y se muestra banner “Incidencias en cola”.
  - Flush automático tras reconectar (`OfflineService.flush()` → `ClaimsService.syncPending()`) con tracking `analytics.track('claims_flush', { remaining })`.
  - Errores 4xx muestran tooltip inline y mantienen fila en edición; 5xx dispara toast rojo y registro queda en cola.
- **Guard:** `RoleGuard(['admin','claims_manager'])`; usuarios sin rol ven toast “Restringido” y se redirigen a Dashboard.

## 14. Global Search (Topbar)
- **UI:** input fijo `data-cy="global-search"` con chips (`Todo`, `Clientes`, `Contratos`, `Cotizaciones`, `Documentos`) identificados por `global-search-filter-*`, shortcut `Ctrl+K` (focus) y `Ctrl+Enter`/`Shift+Enter` (abrir selección en nueva pestaña), y listado de sugerencias agrupadas por categoría.
- **Fuentes:** `GlobalSearchService.search(query, filters)` consulta índices de clientes/contratos/cotizaciones/documentos; en dev usa mocks, en prod pega al BFF `/v1/search`.
- **Enrutamiento:** `SearchRouterService` enruta directo al detalle (`/clientes/:id`, `/contratos/generacion`, `/cotizador?id=`, `/documentos?clientId=`) e hidrata `FlowContext` (ej. `client`, `contract`) antes de navegar para preservar breadcrumbs y contexto.
- **Estado UI:** spinner inline, vacíos por filtro, badges que indican tipo (`search-result__tag`) y CTA “Crear nuevo” enlazada a shortcuts (`Ctrl+N/C/D`).
- **Offline/Error:** `ErrorBoundaryService` muestra tooltip “Sin conexión” y mantiene historial; `OfflineService` registra búsquedas fallidas sólo para telemetría.
- **Telemetría:** `analytics.track` → `global_search_query`, `global_search_result_click`, `global_search_no_results`, `global_search_suggestion_shown` con tags de filtro y tipo.

## 15. Cola Offline (Mutaciones)
- **Cobertura:** Documentos, Cotizador, Protección, Postventa (fotos/OCR) y Claims reutilizan `OfflineService` + `ErrorBoundaryService`; el banner transversal `app-offline-queue-banner` muestra “X acciones en cola” con CTA `flush-now`.
- **Patrón:** cada mutación invoca `ErrorBoundaryService.captureNetworkError({ endpoint, payload, feature })`; si no hay red se guarda en IndexedDB (`offline_queue`) y se marca el módulo vía `FlowContext.offlineQueue` para que el shell muestre badge.
- **Flush:** al detectar reconexión `OfflineService.flush()` reprocesa en orden FIFO, actualiza `FlowContext.offlineQueue` y emite `analytics.track('offline_queue_flush', { processed, remaining, feature })`.
- **Fallbacks:** si un payload falla permanentemente (>=3 intentos) se marca `status:'error'` y se muestra CTA “Resolver manualmente”; Claims/Postventa ofrecen editar antes de reintentar.
- **QA:** ejecutar escenarios modo avión por módulo (doc upload, quote save, protección apply, claim create, foto postventa) para validar reintentos y banners.

## 16. Administración / Usuarios (Feature Flag)
- **Ruta:** `/administracion` habilitada por `enableAdminConfig`; no vive en la sidebar, se accede mediante deep link o cards internas.
- **UI:** tabla `.ui-card` (`admin-table__grid`) con filtros por rol/estado, badges `user-status-{active|blocked}` y modal `admin-form` para altas/ediciones.
- **Conexiones:** `UserService` sincroniza con BFF (`/v1/users`) cuando está disponible; hoy usa storage local (`users::draft`). Cambios refrescan `FlowContext.admin` para que Dashboard refleje totales/alertas.
- **Seguridad:** `RoleGuard('admin')` restringe acceso y muestra toast “Se requiere perfil administrador” si falla; se redirige a Dashboard.
- **Offline/Error:** acciones `create/update/toggle/delete` se encolan vía `OfflineService`; el banner muestra “Usuarios pendientes por sincronizar” y ofrece reintento manual.

## 17. Resumen de Integraciones Clave
| Componente | Servicios / Contexto | Guards | Offline / Telemetría |
| --- | --- | --- | --- |
| Postventa wizard | `PostSaleService`, `FlowContext.postventa`, `OfflineService` | `ContractValidGuard` | Cola fotos + `analytics.track('postventa_step_flush')` |
| Tracking entregas | `DeliveryTrackingService`, `FlowContext.delivery`, `FlowContext.tanda` | `DeliveryGuard` | Timeline tokens + cola acciones `deliveryAction` |
| Claims | `ClaimsService`, `FlowContext.claims`, `SearchRouterService` | `RoleGuard(claims_manager/admin)` | Banner “Incidencias en cola”, `analytics.track('claims_flush')` |
| Global search | `GlobalSearchService`, `SearchRouterService`, `FlowContext` hydration | — | `analytics.track('global_search_*')` |
| Cola offline | `OfflineService`, `ErrorBoundaryService`, `FlowContext.offlineQueue` | — | `analytics.track('offline_queue_flush')` |
| Admin/Usuarios | `UserService`, `FlowContext.admin`, `OfflineService` | `RoleGuard('admin')` | Banner “Usuarios pendientes por sincronizar” |

## 9. Implementation Priorities (actualizado abril 2024)
- [x] FlowContext cross-flows y breadcrumbs persistentes en Clientes, Cotizador, Onboarding, Protección y Entregas.
- [x] Global search con sugerencias, filtros y atajo `Ctrl+K` desplegada en shell.
- [~] Progressive disclosure móvil habilitada en el wizard; falta QA de navegación secundaria.
- [~] Keyboard shortcuts + modal de ayuda activos; resta instrumentar telemetría/documentación.
- [~] Error boundary + cola offline activo en Documentos y Clientes (pendiente UI de issues/telemetría).
- [ ] Swipe gestures y bottom navigation opcional continúan pendientes.

## 10. Open Questions for Stakeholders
- Should notifications be interruptive toasts or queued in sidebar except for critical alerts?
- Which modules must remain fully functional offline (recommended: Clientes, Cotizador, Documentos)?
- Confirm lazy loading strategy for charts/tables on mobile to maintain performance.

Document owner: Experience/Interaction team. Keep updated as modules evolve.
