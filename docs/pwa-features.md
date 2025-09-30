# 📱 PWA Features – Estado actual vs. objetivo

## 🚀 Objetivo (to-be)
- Prompt de instalación con temporizador y analytics (`pwa_install_prompt`/`accepted`).
- Indicadores de conexión extendidos (banner + pill + métricas de queue).
- Telemetría para cada flush de la cola offline y panel QA.

## 🔍 Estado actual (as-is)
- `PwaInstallService` captura `beforeinstallprompt`, expone señales `canInstall/isInstalled` y usa localStorage. No hay temporizador ni eventos a `AnalyticsService`.
- El único indicador visible es `<app-offline-queue-banner>`; no existen los “floating pill” ni dashboard de red.
- `OfflineService` almacena peticiones en IndexedDB y hace flush al reconectar, pero solo registra `analytics.track('offline_queue_flush')` desde el banner de Documentos/Postventa.

## ✅ Lo que sí está disponible
- Banner reutilizable `app-offline-queue-banner` para Documentos, Cotizador, Postventa y Claims.
- `OfflineService` + `ErrorBoundaryService` como patrón base de cola y reintentos.
- Service worker configurado en `ngsw-config.json` + estrategias de caché.

## 📌 Próximos pasos
1. Añadir temporizador/analytics al prompt de instalación.
2. Crear componente indicador (pill) reusable con estado de red y cola.
3. Mostrar métricas de flush/error en un panel QA o sección de configuración.
4. Incluir estos cambios en los docs y pruebas E2E correspondientes.
