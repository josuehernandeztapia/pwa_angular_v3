# 🎯 PLAN DE INTEGRACIÓN DE NAVEGACIÓN COMPLETA

## 📊 ANÁLISIS ACTUAL vs DOCUMENTACIÓN

### ✅ LO QUE YA EXISTE (RUTAS CONFIGURADAS)

**Cotizadores específicos:**
- `/cotizador/ags-individual` ✅
- `/cotizador/edomex-colectivo` ✅

**Simuladores específicos:**
- `/simulador/ags-ahorro` ✅ (Plan de Ahorro)
- `/simulador/edomex-individual` ✅ (Venta a Plazo)
- `/simulador/tanda-colectiva` ✅ (Crédito Colectivo)

**Tracking y Operaciones:**
- `/ops/deliveries` ✅ (Entregas operativas)
- `/ops/import-tracker` ✅ (Tracking de importación)
- `/ops/gnv-health` ✅ (Salud GNV)
- `/ops/triggers` ✅ (Monitor de triggers)

**Onboarding y Documentos:**
- `/onboarding` ✅ (Con AVI integrado)
- `/documentos` ✅ (Con OCR integrado)

**Otros componentes:**
- `/nueva-oportunidad` ✅
- `/contratos/generacion` ✅
- Flow Builder (en configuración) ✅

### ❌ LO QUE FALTA EN NAVEGACIÓN

**1. Navegación no refleja la estructura completa:**
```typescript
// ACTUAL (navigation.component.ts):
navigationItems: NavigationItem[] = [
  { label: 'Dashboard', route: '/dashboard' },
  { label: 'Onboarding', route: '/onboarding' }, // ✅ Ya agregado
  { label: 'Clientes', route: '/clientes' },
  { label: 'Cotizador', route: '/cotizador' },    // ❌ Sin submenús
  { label: 'Simulador', route: '/simulador' },    // ❌ Sin submenús
  { label: 'Documentos', route: '/documentos' },
  { label: 'Entregas', route: '/entregas' },      // ❌ Sin acceso a ops/
  { label: 'GNV', route: '/gnv' },
  { label: 'Protección', route: '/proteccion' },
  { label: 'Configuración', route: '/configuracion' }
];
```

**2. Faltan submenús para mostrar tipos de productos:**
- Cotizador no muestra AGS Individual / EdoMex Colectivo
- Simulador no muestra Ahorro / Venta a Plazo / Tanda
- Entregas no muestra acceso a tracking avanzado

**3. Faltan accesos directos a funcionalidades documentadas:**
- Flow Builder (configuración)
- Import Tracker
- Triggers Monitor

## 🛠️ PLAN DE IMPLEMENTACIÓN

### Fase 1: Actualizar Navigation Component

Reemplazar la navegación actual con estructura completa:

```typescript
navigationItems: NavigationItem[] = [
  { label: 'Dashboard', route: '/dashboard', iconType: 'home', dataCy: 'nav-dashboard' },
  { label: 'Onboarding', route: '/onboarding', iconType: 'user-plus', dataCy: 'nav-onboarding' },
  {
    label: 'Cotizador',
    route: '/cotizador',
    iconType: 'calculator',
    dataCy: 'nav-cotizador',
    children: [
      { label: 'AGS Individual', route: '/cotizador/ags-individual', iconType: 'user', dataCy: 'nav-cotizador-ags' },
      { label: 'EdoMex Colectivo', route: '/cotizador/edomex-colectivo', iconType: 'users', dataCy: 'nav-cotizador-edomex' }
    ]
  },
  {
    label: 'Simulador',
    route: '/simulador',
    iconType: 'target',
    dataCy: 'nav-simulador',
    children: [
      { label: 'Plan de Ahorro', route: '/simulador/ags-ahorro', iconType: 'piggy-bank', dataCy: 'nav-simulador-ahorro' },
      { label: 'Venta a Plazo', route: '/simulador/edomex-individual', iconType: 'credit-card', dataCy: 'nav-simulador-plazo' },
      { label: 'Tanda Colectiva', route: '/simulador/tanda-colectiva', iconType: 'users', dataCy: 'nav-simulador-tanda' }
    ]
  },
  { label: 'Clientes', route: '/clientes', iconType: 'users', dataCy: 'nav-clientes' },
  { label: 'Documentos', route: '/documentos', iconType: 'document', dataCy: 'nav-documentos' },
  {
    label: 'Operaciones',
    route: '/ops',
    iconType: 'truck',
    dataCy: 'nav-ops',
    children: [
      { label: 'Entregas', route: '/ops/deliveries', iconType: 'truck', dataCy: 'nav-ops-entregas' },
      { label: 'Import Tracker', route: '/ops/import-tracker', iconType: 'package', dataCy: 'nav-ops-tracker' },
      { label: 'Monitor GNV', route: '/ops/gnv-health', iconType: 'fuel', dataCy: 'nav-ops-gnv' },
      { label: 'Triggers', route: '/ops/triggers', iconType: 'zap', dataCy: 'nav-ops-triggers' }
    ]
  },
  { label: 'GNV', route: '/gnv', iconType: 'fuel', dataCy: 'nav-gnv' },
  { label: 'Protección', route: '/proteccion', iconType: 'shield', dataCy: 'nav-proteccion' },
  {
    label: 'Configuración',
    route: '/configuracion',
    iconType: 'settings',
    dataCy: 'nav-configuracion',
    children: [
      { label: 'Flow Builder', route: '/configuracion/flow-builder', iconType: 'git-branch', dataCy: 'nav-config-flow' },
      { label: 'Políticas', route: '/configuracion/politicas', iconType: 'file-text', dataCy: 'nav-config-politicas' }
    ]
  }
];
```

### Fase 2: Verificar Rutas Faltantes

Revisar si estas rutas están configuradas:
- `/configuracion/flow-builder` - Confirmado que existe el componente
- `/configuracion/politicas` - Necesita verificación
- `/proteccion` - Necesita verificación de ruta principal

### Fase 3: Actualizar CSS para Submenús

El navigation.component.html ya tiene soporte para submenús:
```html
<div class="app-nav__submenu" *ngIf="item.children && !isCollapsed && isActive(item.route)">
```

Solo necesita estilos actualizados para mostrar correctamente los niveles.

### Fase 4: Testing de Accesibilidad

Cada nueva ruta debe tener:
- `data-cy` para testing automatizado
- `aria-label` para screen readers
- Iconos apropiados
- Navegación por teclado funcional

## 🎯 FUNCIONALIDADES POR MÓDULO SEGÚN NAVIGATION.MD

### **Cotizador**
- ✅ AGS Individual (Venta Directa)
- ✅ EdoMex Colectivo (Tanda)
- 🔧 Necesita: Mostrar en submenú de navegación

### **Simulador**
- ✅ Plan de Ahorro (`ags-ahorro`)
- ✅ Venta a Plazo (`edomex-individual`)
- ✅ Crédito Colectivo (`tanda-colectiva`)
- 🔧 Necesita: Mostrar en submenú de navegación

### **Onboarding (Wizard de 6 pasos)**
- ✅ Paso 1: Configuración (mercado, tipo cliente)
- ✅ Paso 2: AVI (verificación de voz)
- ✅ Paso 3: Documentos (con OCR)
- ✅ Paso 4: Protección
- ✅ Paso 5: Contratos
- ✅ Paso 6: Completado
- 🔧 Necesita: Ya visible en navegación

### **Documentos**
- ✅ Upload con OCR automático
- ✅ Fallback manual para OCR fallido
- ✅ Validación por mercado
- ✅ Guards integrados
- 🔧 Necesita: Ya visible en navegación

### **Operaciones**
- ✅ Import Tracker (`ops/import-tracker`)
- ✅ Entregas (`ops/deliveries`)
- ✅ GNV Health (`ops/gnv-health`)
- ✅ Triggers Monitor (`ops/triggers`)
- 🔧 Necesita: Crear submenú "Operaciones"

### **Flow Builder**
- ✅ Componente completo con drag-and-drop
- ✅ Sistema de nodos y conexiones
- ✅ Configuración de flujos de negocio
- 🔧 Necesita: Agregar a submenú Configuración

## 📋 SIGUIENTE ACCIÓN ESPECÍFICA

**Prioridad 1:** Actualizar `navigation.component.ts` con la estructura completa de submenús.

¿Quieres que implemente esta actualización de navegación ahora?