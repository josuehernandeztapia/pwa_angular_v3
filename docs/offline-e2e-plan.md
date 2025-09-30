# Offline Queue & Banner – E2E Test Plan

Objetivo: automatizar los flujos críticos de la cola offline y banners en Cotizador, Documentos y Claims sin depender del backend real. Las pruebas deben validar que los requests se encolan al perder conexión, que el usuario recibe feedback visual y que, al reconectarse, la cola se vacía en el orden correcto mientras se disparan las métricas.

## 1. Alcance

1. **Banner de cola (`OfflineQueueBannerComponent`)**
   - Visibilidad cuando `navigator.onLine = false`.
   - Contador de requests pendientes (`pendingCount`).
   - Mensaje de confirmación tras flush (`lastSyncMessage`).
2. **Context panel**
   - Botones “Procesar cola” / “Descartar pendientes” ejecutan `flushQueueNow` y `clearPendingRequests`.
   - Toasts/analytics invocados correctamente.
3. **Flows consumidores**
   - Cotizador (guardar parámetros) → encolar `POST /quotes/...`.
   - Documentos (subida manual) → encolar payload del `DocumentUploadService`.
   - Claims/Postventa (cuando existan BFF reales) → validar encolado de métricas/fotos.

## 2. Herramientas

- **Playwright** (preferencia, ya configurado en repo) con fixtures para manipular `navigator.onLine` y `serviceWorker`.
- **MSW (Mock Service Worker)** o interceptores Playwright para simular respuestas HTTP y forzar fallas temporales.
- **Local storage helpers** para inspeccionar `offline_` entries en `IndexedDB` / `localStorage`.

## 3. Estrategia

1. **Setup base (fixture)**
   - Arrancar app en modo `enableOfflineMode = true`.
   - Inyectar script que exponga helpers `window.__forceOffline()` / `window.__forceOnline()` que actualicen `navigator.onLine` y disparen eventos `online/offline`.
   - Mockear endpoint objetivo (ej. `/api/quotes`) para devolver `503` mientras estamos “offline” y `200` al reconectar.

2. **Escenario 1 – Banner Documentos**
   - Navegar a Documentos, subir archivo (mock `DocumentUploadService` request).
   - Forzar offline → envío falla → verificar:
     - Toast “Sin conexión” aparece.
     - `OfflineService.pendingRequests` contiene payload.
     - Banner visible con contador `1`.
   - Forzar online → mock responde 200 → esperar flush:
     - Banner muestra mensaje de éxito.
     - Cola queda vacía.
     - Analytics `offline_queue_flush` se dispara (capturar via stub).

3. **Escenario 2 – Context panel**
   - Con cola prellenada (fixture), abrir panel QA (Documentos) y usar botón “Procesar cola”.
     - Verificar que se llama `flushQueueNow` (usar spies). En E2E, esperar XHR completadas.
   - Repetir con “Descartar pendientes” y confirmar que la cola se limpia sin llamar al endpoint.

4. **Escenario 3 – Cotizador**
   - Simular cálculo de cotización con backend caído.
   - Validar banner global (si aplica) y que, al reconectar, se recalcula y actualiza UI.

5. **Escenario 4 – Claims/Postventa (cuando BFF esté listo)**
   - Similar a Documentos: encolar payloads y validar flush.

6. **Checkpoints**
   - Utilizar assertions sobre `localStorage.getItem('offline_*')`.
   - Verificar `data-cy` hooks: `offline-banner`, `offline-count`, `context-action-flush`, etc. (agregar si faltan).

## 4. Implementación incremental

- Crear helper `tests/support/offline-utils.ts` con funciones para togglear conexión y esperar flush.
- Añadir Playwright spec `playwright/tests/offline-queue.spec.ts`:
  1. “Should display banner and queue uploads while offline”.
  2. “Should flush queue via context panel action when back online”.
- Incluir flag `--offline` o variable `TEST_OFFLINE_MODE=true` para activar mocks MSW.

## 5. Bloqueos

- Ninguno para Documentos/Cotizador (usa mocks locales).
- Claims/Postventa requieren endpoints reales; quedarán TODOs en spec para habilitar cuando backend publique servicios.

## 6. Seguimiento

- Actualizar `docs/pending-tests.md` al crear la spec.
- Integrar spec en CI (job `npm run test:e2e` o equivalente Playwright).
- Coordinar con QA para definir casos manuales complementarios.

---
> Referencias: `src/app/services/offline.service.ts`, `src/app/components/shared/offline-queue-banner/offline-queue-banner.component.ts`, `docs/navigation.md` (sección Offline) y `docs/backend-coordination.md`.
