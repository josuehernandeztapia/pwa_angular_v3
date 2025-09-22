# 🚗 Conductores PWA – Angular 17+

![Coverage](reports/quality/coverage-badge.svg)
![Tests](reports/quality/tests-badge.svg)
![Build](reports/quality/build-badge.svg)
![Docs](https://img.shields.io/badge/docs-centralized-blue)

Conductores es una **Progressive Web Application (PWA)** para la gestión integral de conductores y post-ventas automotriz.
Construida con **Angular 17+** y un stack de calidad enterprise.

---

## ⚙️ Instalación rápida

```bash
# Instalar dependencias
npm ci

# Servir en local
ng serve
```

---

## 🏭 Build & Deploy

```bash
# Build optimizado de producción
npm run build:prod

# Servir build localmente
npm run serve:prod

# Docker
docker build -t conductores-pwa .
docker run -p 4200:80 conductores-pwa
```

---

## 📚 Documentación Centralizada

* [📖 Technical Guide](docs/TECHNICAL_GUIDE.md)
  Arquitectura, engines, integraciones, despliegue y troubleshooting.

* [🧪 QA Guide](docs/QA_GUIDE.md)
  Estrategia de pruebas, métricas de cobertura, accesibilidad y quality gates.

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
