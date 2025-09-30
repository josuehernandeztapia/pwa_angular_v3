# 🤖 CLAUDE.md - Configuración para Claude Code

Este archivo contiene comandos y configuraciones específicas para optimizar el desarrollo con Claude Code en la **Conductores PWA**.

---

## 🚀 Comandos de Testing

### Suite Completa de Testing
```bash
npm run test:all
```
**Descripción**: Ejecuta el ecosistema completo de testing (Unit, E2E, Visual, A11y, Performance) - ~15-20 minutos

### Testing por Categorías
```bash
# Unit Testing
npm run test:unit                    # Tests unitarios con Jasmine/Karma
npm run test:services               # Tests específicos de servicios
npm run test:components             # Tests específicos de componentes
npm run test:utilities              # Tests de utilidades y helpers
npm run test:integration            # Integration tests cross-service

# E2E Testing
npm run test:e2e                    # E2E completo con Cypress
npx cypress open                    # E2E en modo interactivo

# Visual & Accessibility
npm run test:visual                 # Visual regression con Playwright
npm run test:visual:ui              # Visual tests en modo UI interactivo
npm run test:visual:update          # Actualizar snapshots de referencia
npm run test:a11y                   # Accessibility tests con axe-core

# Advanced Testing
npm run test:pact:consumer          # Contract testing con Pact.js
npm run test:chaos                  # Chaos engineering tests
npm run test:mutation               # Mutation testing con Stryker (~45 min)
npm run test:performance            # Performance tests con k6
```

### QA Visual y Reportes Automatizados
```bash
# QA Visual Final (PR#13) - Screenshots y Accessibility
npm run test:qa-visual              # QA Visual suite completa (local)
npm run test:qa-visual:all          # QA Visual en todos los browsers
npm run test:qa-visual:report       # Ver reportes y abrir QA-REPORT.md

# Coverage y Quality Gates
npm run coverage:generate           # Generar dashboard de coverage
npm run coverage:serve             # Servir reportes en http://localhost:8080
npm run quality:gates              # Ejecutar quality gates
npm run quality:report             # Generar reporte de calidad completo
npm run quality:badge              # Generar badges de calidad
```

---

## 🏗️ Comandos de Build y Deploy

### Desarrollo
```bash
npm start                          # Servidor de desarrollo (http://localhost:4200)
npm run serve:prod                 # Servidor de producción local
npm run serve:test                 # Servidor para testing
npm run mock:api                   # Mock API server (puerto 3000)
```

### Build
```bash
npm run build                      # Build de desarrollo
npm run build:prod                 # Build optimizado de producción
npm run build:prod:performance     # Build con optimizaciones de performance
npm run build:check                # Verificar build sin generar archivos
npm run build:analyze              # Análisis de bundle size con webpack-bundle-analyzer
```

---

## 🔍 Comandos de Linting y Quality

### Code Quality
```bash
npm run lint                       # ESLint completo
npm run lint:report                # ESLint con reporte JSON
npm run security:check             # Security audit con npm audit
npm run bundle:size-check          # Verificar límites de bundle size
```

---

## 🧪 Testing en Modo Desarrollo

### Testing Watch Mode
```bash
npm test                          # Unit tests en modo watch (desarrollo)
npm run test:coverage             # Unit tests con coverage
```

### Debug de Tests
```bash
# Visual Tests Debug
npm run test:visual:ui            # UI interactiva de Playwright

# E2E Tests Debug  
npx cypress open                  # Cypress en modo interactivo

# Unit Tests Debug
ng test --source-map              # Unit tests con source maps para debug
```

---

## 📊 Scripts de Automatización

### Quality Automation
```bash
node scripts/quality-gates.js     # Evaluación manual de quality gates
node scripts/quality-report.js    # Generación manual de reportes
node scripts/performance-report.js # Reporte de métricas de performance
node scripts/chaos-report.js      # Reporte de chaos engineering
node scripts/mutation-report.js   # Reporte de mutation testing
node scripts/quality-badge.js     # Generación de badges SVG
```

---

## 🚀 Comandos Rápidos para Desarrollo

### Setup Inicial
```bash
npm install --legacy-peer-deps    # Instalación con legacy peer deps (requerido)
npm run test:unit                 # Verificar setup con unit tests
npm run build                     # Verificar build funciona
```

### Flujo de Desarrollo Típico
```bash
npm start                         # 1. Iniciar servidor de desarrollo
npm test                          # 2. Tests en modo watch (nueva terminal)
npm run lint                      # 3. Linting antes de commit
npm run test:visual:update        # 4. Actualizar snapshots si cambió UI
```

### Pre-Commit Workflow
```bash
npm run lint                      # Verificar linting
npm run test:unit                 # Ejecutar unit tests
npm run test:a11y                 # Verificar accessibility
npm run build:check               # Verificar que build funciona
```

---

## ⚡ Comandos de Performance

### Análisis de Performance
```bash
npm run build:analyze             # Analizar bundle size
npm run performance:report        # Generar reporte de performance con k6
npx lighthouse http://localhost:4200 --output=html --output-path=./lighthouse-report.html
```

### Load Testing
```bash
# Instalar k6 localmente (solo una vez)
# macOS: brew install k6
# Ubuntu: sudo apt-get install k6
# Windows: choco install k6

# Ejecutar load tests
k6 run src/tests/load/dashboard-load.test.js
k6 run src/tests/load/api-performance.test.js
```

---

## 🛠️ Comandos de Utilidad

### Generación de Código Angular
```bash
ng generate component components/feature/my-component
ng generate service services/my-service  
ng generate guard guards/my-guard
ng generate interceptor interceptors/my-interceptor
ng generate pipe pipes/my-pipe
ng generate directive directives/my-directive
```

### Limpieza y Mantenimiento
```bash
npm run clean                     # Limpiar node_modules y reinstalar
npm audit                         # Verificar vulnerabilidades
npm outdated                      # Verificar dependencias desactualizadas
```

---

## 📱 Testing Mobile y Cross-Browser

### Cypress Multi-Browser
```bash
npx cypress run --browser chrome
npx cypress run --browser firefox  
npx cypress run --browser edge
npx cypress run --headed           # Con interfaz gráfica
```

### Playwright Multi-Browser
```bash
npm run test:visual:chromium       # Solo Chromium
npm run test:visual:firefox        # Solo Firefox
npm run test:visual:webkit         # Solo WebKit/Safari
```

---

## 🔧 Environment y Configuración

### Variables de Entorno
```bash
# Desarrollo
export NODE_ENV=development
export API_URL=http://localhost:3000/api

# Testing  
export NODE_ENV=test
export CYPRESS_BASE_URL=http://localhost:4200

# Producción
export NODE_ENV=production
export API_URL=https://api.conductores.com
```

### Configuración de Testing
```bash
# Configurar timeouts para tests lentos
export KARMA_TIMEOUT=60000
export CYPRESS_DEFAULT_COMMAND_TIMEOUT=30000
export PLAYWRIGHT_TIMEOUT=30000
```

---

## 🚨 Troubleshooting Commands

### Problemas Críticos de Build TypeScript
```bash
# Verificar errores específicos de TypeScript
ng build --configuration=development 2>&1 | grep -E "(ERROR|WARNING)"

# Limpiar cache Angular completo
rm -rf .angular/cache dist/ node_modules/.cache

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Limpiar builds
rm -rf dist/
npm run build
```

### Errores Críticos y Soluciones Detalladas
Ver [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) para soluciones completas a:
- **ERROR TS2339**: `IconName` type issues - conversión de strings a IconName types
- **Missing IconComponent imports**: Componentes que usan `<app-icon>` sin importar IconComponent
- **Duplicate object properties**: Objetos con propiedades duplicadas como `legend`
- **Missing template methods**: Métodos usados en templates pero no definidos en .ts (`restoreFromFlowContext`, `updateBreadcrumbs`)
- **SVG syntax errors**: Errores en polígonos y elementos SVG

### Comandos de Diagnóstico Rápida
```bash
# Health check completo de iconos
grep -r "app-icon" src/ --include="*.html" | wc -l    # Contar usos de app-icon
grep -r "IconComponent" src/ --include="*.ts" | wc -l # Contar imports de IconComponent

# Verificar type mismatches de iconos
grep -r ": string" src/ | grep -i icon | head -5

# Buscar métodos faltantes en templates
grep -r "{{ get.*}}" src/ --include="*.html"
grep -r "\.restore\|\.updateBreadcrumbs" src/ --include="*.html"

# Debug de testing frameworks
npx playwright install --force
npx cypress cache clear
npx cypress install --force
```

### Problemas Comunes Pre-2024
```bash
# Limpiar cache de npm
npm cache clean --force

# Reset de playwright browsers (si persisten errores)
npx playwright install --force

# Reset de cypress (si persisten errores)
npx cypress cache clear
npx cypress install --force
```

### Debug de Tests Fallidos
```bash
# Unit tests con logs detallados
npm test -- --verbose

# E2E tests con video y screenshots
npx cypress run --record --video

# Visual tests con modo debug
npm run test:visual -- --debug

# Performance tests con logs
k6 run --verbose src/tests/load/dashboard-load.test.js
```

---

## 📋 Checklists para Claude

### ✅ Checklist Pre-Commit
- [ ] `npm run lint` - Sin errores de linting
- [ ] `npm run test:unit` - Unit tests pasan
- [ ] `npm run test:a11y` - Sin violaciones de accessibility
- [ ] `npm run build:check` - Build funciona correctamente
- [ ] Tests específicos para nueva funcionalidad agregados

### ✅ Checklist Pre-Deploy
- [ ] `npm run test:all` - Suite completa pasa
- [ ] `npm run quality:gates` - Quality gates aprueban  
- [ ] `npm run build:prod` - Build de producción exitoso
- [ ] `npm run security:check` - Sin vulnerabilidades críticas
- [ ] Performance tests ejecutados

### ✅ Checklist Nueva Feature
- [ ] Unit tests para servicios nuevos/modificados
- [ ] Component tests para componentes nuevos
- [ ] E2E tests para nuevos flujos de usuario
- [ ] Accessibility tests para nuevos componentes UI
- [ ] Visual tests si hay cambios de diseño
- [ ] Documentation actualizada

---

## 🎯 Objetivos de Calidad

### Métricas Target
- **Unit Coverage**: >90%
- **Mutation Score**: >90%  
- **Lighthouse Performance**: >90%
- **Accessibility**: 0 violaciones WCAG AA
- **Bundle Size**: <3MB compressed
- **E2E Success Rate**: >95%

### Quality Gates Automáticos
Los siguientes comandos se ejecutan automáticamente en CI/CD:
1. `npm run lint`
2. `npm run test:services`
3. `npm run test:components`
4. `npm run test:integration`
5. `npm run test:pact:consumer`
6. `npm run test:a11y`
7. `npm run test:visual`
8. `npm run test:e2e`
9. `npm run test:performance`
10. `npm run quality:gates`

---

## 📞 Soporte y Recursos

### Links Rápidos
- **Coverage Dashboard**: `reports/coverage-dashboard.html`
- **Quality Reports**: `reports/quality/`
- **CI/CD Pipeline**: `.github/workflows/comprehensive-testing.yml`
- **Testing Docs**: `TESTING-DOCUMENTATION.md`
- **Architecture Docs**: `TECHNICAL_ARCHITECTURE_DOCUMENTATION.md`

### Documentación de Testing
- **TESTING-DOCUMENTATION.md** - Documentación completa de testing
- **TESTING-ADVANCED-IMPLEMENTATION.md** - Testing avanzado (Contract, Chaos, Load)
- **TESTING-FINAL-SUMMARY.md** - Resumen ejecutivo del ecosistema

---

**💡 Tip para Claude**: Este proyecto implementa el ecosistema de testing más avanzado posible. Siempre ejecuta `npm run test:all` antes de hacer commits importantes, y usa `npm run quality:gates` para validar que todo cumple con los estándares de calidad establecidos.