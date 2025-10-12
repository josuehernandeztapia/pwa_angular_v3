# [CAR] Conductores PWA – Angular 17+

![Coverage](reports/quality/coverage-badge.svg)
![Tests](reports/quality/tests-badge.svg)
![Build](reports/quality/build-badge.svg)
![Docs](https://img.shields.io/badge/docs-centralized-blue)
![Docs Status](https://img.shields.io/badge/docs-optimized-brightgreen)

Conductores es una **Progressive Web Application (PWA)** para la gestión integral de conductores y post-ventas automotriz.
Construida con **Angular 17+** y un stack de calidad enterprise.

---

## [TOOLS] Instalación rápida

⚠️ **IMPORTANTE**: Si tienes problemas de clonado, ver [CLONE-INSTRUCTIONS.md](./CLONE-INSTRUCTIONS.md)

```bash
# Instalar dependencias (usar legacy-peer-deps si hay warnings)
npm ci --legacy-peer-deps

# Servir en local con datos reales (requiere BFF activo en http://localhost:3000)
npm run start:real
# La PWA queda disponible en http://localhost:4301 y los servicios consumen endpoints `/api`

# Servir en local con mocks heredados (solo para demostraciones rápidas)
npm start
# Equivalente a `ng serve --configuration=development --port=4300`
# Puedes reactivar los mocks sin recompilar inyectando `globalThis.__USE_MOCK_DATA__ = true`
# antes de cargar la app (por ejemplo desde la consola del navegador)

# Acceso demo (http://localhost:4200)
# Usuario: demo@conductores.com
# Password: demo123
```

---

## [FACTORY] Build & Deploy

```bash
# Build optimizado de producción
npm run build:prod

# Servir build localmente
npm run serve:prod
```

### 🐳 Docker Deployment

```bash
# Opción 1: Docker simple
docker build -t conductores-pwa .
docker run -p 4200:80 conductores-pwa

# Opción 2: Docker Compose (recomendado)
docker-compose up -d

# Ver logs
docker-compose logs -f pwa

# Detener
docker-compose down

# Rebuild después de cambios
docker-compose up -d --build
```

La aplicación estará disponible en `http://localhost:4200`

---

## 📚 Documentación Centralizada

* [📖 Technical Guide](docs/TECHNICAL_GUIDE.md)
  Arquitectura, engines, integraciones, despliegue y troubleshooting.

* [🧪 QA Guide](docs/QA_GUIDE.md)
  Estrategia de pruebas, métricas de cobertura, accesibilidad y quality gates.

* [📱 PWA Features](docs/pwa-features.md)
  Estado actual vs objetivo para prompts, offline e indicadores visuales.

---

## 🔒 Feature Flags y Navegación

- La sidebar productiva muestra únicamente Dashboard, Clientes, Cotizador, Simulador, Documentos, Entregas, GNV, Protección y Configuración.
- Onboarding/Postventa (`/onboarding`, `/postventa/wizard`), Integraciones (`/integraciones`), Administración (`/administracion`) y Usage continúan detrás de feature flags o como placeholders sin UI activa.
- Detalles y flujos completos viven en `docs/navigation.md`, actualizado con los estados actuales de cada módulo.

### Notas rápidas para DEV

- Analytics en desarrollo apunta a endpoints mock (`analytics/mock-track`, `analytics/mock-metrics`). `AnalyticsService` detecta estos sufijos y sólo deja el rastro en consola; activa `enableAnalytics` o modifica el endpoint en `src/environments/environment.ts` cuando quieras validar el backend real.
- Si quieres ver el payload exacto, apunta temporalmente `environment.analytics.eventsEndpoint` a tu propio mock (`http://localhost:3333/analytics/events`) y activa `enableAnalytics`; el servicio seguirá usando la misma cola pero sin tocar el backend productivo.
- `DocumentValidationService.composeComplianceReport` es el fallback canónico usado por los guards. Si mockeas `/documents/compliance-report`, basta con devolver los campos que quieras sobrescribir; el servicio mezclará el resto con el snapshot local.
- Las unitarios usan Karma puerto dinámico; si necesitas forzarlo, exporta `KARMA_PORT=9878` antes de `npm test`. Esto evita choques con entornos restringidos como contenedores o CI locales sin puerto 9876.
- Para un smoke rápido sin watchers, ejecuta `npm run test:single`; fija `KARMA_PORT=9878` y Chrome headless automáticamente.
- Si sólo necesitas servicios/guards, `npm run test:single:services` levanta Karma en el puerto 9879 usando `tsconfig.spec.services.json`.

---

## 🤝 Contribución

1. Crear branch (`git checkout -b feat/nueva-funcionalidad`).
2. Escribir tests primero (TDD recomendado).
3. Ejecutar suite → `npm run test:all`.
4. Commit con [Conventional Commits](https://conventionalcommits.org/).
5. Abrir PR → CI/CD validará quality gates.

---

## 📝 Licencia

Propietario © Conductores – Uso interno.

---

**📎 Nota**: Documentación previa consolidada en `docs/TECHNICAL_GUIDE.md` y `docs/QA_GUIDE.md`.
