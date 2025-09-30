# 🚨 Conductores PWA - Troubleshooting Guide

Este documento contiene soluciones a los errores más comunes durante el desarrollo y build de la Conductores PWA.

---

## 🔥 Errores Críticos de Build

### ❌ **ERROR 1: IconName Type Issues**
```bash
Type 'string' is not assignable to type 'IconName'
Type '"trending-down"' is not assignable to type 'IconName'
```

**Archivos afectados:**
- `ops-deliveries.component.ts:360`
- `dashboard.component.ts:321`

**Solución:**
```typescript
// ❌ MAL
getStatusIcon(status: DeliveryStatus): string {
  return 'trending-down';
}

// ✅ BIEN
import { IconName } from '../shared/icon/icon-definitions';

getStatusIcon(status: DeliveryStatus): IconName {
  return 'trending-down' as IconName;
}

// O mejor aún, verificar que el icon existe:
getStatusIcon(status: DeliveryStatus): IconName {
  const iconMap: Record<DeliveryStatus, IconName> = {
    'DELIVERED': 'check',
    'IN_TRANSIT': 'truck',
    'PENDING': 'clock'
  };
  return iconMap[status] || 'help-circle';
}
```

### ❌ **ERROR 2: Missing IconComponent Imports**
```bash
'app-icon' is not a known element
Can't bind to 'size' since it isn't a known property
```

**Archivos afectados:**
- `cliente-form.component.ts`

**Solución:**
```typescript
// ❌ MAL
@Component({
  imports: [CommonModule, FormsModule]
})

// ✅ BIEN
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  imports: [CommonModule, FormsModule, IconComponent]
})
```

### ❌ **ERROR 3: Duplicate Object Properties**
```bash
An object literal cannot have multiple properties with the same name
Duplicate key "legend" in object literal
```

**Archivos afectados:**
- `ags-ahorro.component.ts:434, 854, 865`

**Solución:**
```typescript
// ❌ MAL
const config = {
  plugins: {
    legend: { display: true },
    legend: { position: 'top' }  // ❌ Duplicado
  }
};

// ✅ BIEN
const config = {
  plugins: {
    legend: {
      display: true,
      position: 'top'
    }
  }
};
```

### ❌ **ERROR 4: Missing Template Methods**
```bash
Property 'getTrendSymbol' does not exist on type 'DashboardComponent'
```

**Archivos afectados:**
- `dashboard.component.html:75`

**Solución:**
```typescript
// En dashboard.component.ts agregar:
getTrendSymbol(trend: 'up' | 'down' | 'stable'): string {
  switch(trend) {
    case 'up': return '↗';
    case 'down': return '↘';
    case 'stable': return '→';
    default: return '→';
  }
}
```

### ❌ **ERROR 5: Missing Global Search Component**
```bash
'app-global-search' is not a known element
```

**Archivos afectados:**
- `app.component.html:93`

**Solución temporal:**
```html
<!-- ❌ Actual -->
<app-global-search class="app-shell__global-search"></app-global-search>

<!-- ✅ Fix temporal -->
<div class="app-shell__global-search">
  <input type="search" placeholder="Buscar..." data-cy="global-search">
</div>
```

**Solución permanente:** Crear `GlobalSearchComponent`

### ❌ **ERROR 6: SVG Polygon Syntax**
```bash
Opening tag ":svg:polygon" not terminated
```

**Archivos afectados:**
- `flow-builder.component.html:129`

**Solución:**
```html
<!-- ❌ MAL -->
<polygon points="0 0 10 3.5 0 7" fill="transparent"></polygon>

<!-- ✅ BIEN -->
<polygon points="0,0 10,3.5 0,7" fill="transparent"></polygon>
```

---

## ⚡ Quick Fixes

### 🔧 **Build Fallando? Checklist 2-minutos:**
```bash
# 1. Limpiar cache
rm -rf .angular/cache dist/ node_modules/.cache

# 2. Verificar imports faltantes
grep -r "app-icon" src/ --include="*.html" | head -5
grep -r "IconComponent" src/ --include="*.ts" | head -5

# 3. Buscar duplicate keys
grep -r "legend.*legend" src/ --include="*.ts"

# 4. Verificar IconName types
grep -r ": string" src/ | grep -i "icon"
```

### 🔧 **TypeScript Errors en Batch:**
```bash
# Ver todos los errores TS de una vez
ng build --configuration=development 2>&1 | grep "ERROR"

# Buscar métodos faltantes en templates
grep -r "{{ get" src/ --include="*.html"
grep -r "(click)=" src/ --include="*.html" | grep -v "this\."
```

---

## 🚀 Comandos de Emergencia

### **Build está roto y necesito compilar YA:**
```bash
# 1. Backup rápido
cp -r src/ src_backup_$(date +%Y%m%d_%H%M%S)/

# 2. Revert cambios problemáticos
git status
git checkout -- src/app/components/pages/ops/ops-deliveries.component.ts
git checkout -- src/app/components/pages/dashboard/dashboard.component.ts

# 3. Build clean
npm run build:check
```

### **App funcionaba ayer, hoy no:**
```bash
# Ver últimos commits
git log --oneline -10

# Diff con último commit funcional
git diff HEAD~1 --name-only

# Revert específico si es necesario
git show HEAD --name-only
```

---

## 🔍 Debugging por Síntomas

### **Síntoma: "Cannot find name 'IconName'"**
- ✅ Verificar import: `import { IconName } from '../../shared/icon/icon-definitions';`
- ✅ Path correcto según estructura de carpetas
- ✅ No confundir con `IconComponent`

### **Síntoma: "is not assignable to type 'IconName'"**
- ✅ Usar type assertion: `as IconName`
- ✅ O verificar que el string está en `ICON_LIBRARY`
- ✅ Usar union type si necesario: `IconName | string`

### **Síntoma: "app-icon is not a known element"**
- ✅ Agregar `IconComponent` a imports del componente
- ✅ Verificar que sea standalone component
- ✅ No confundir import path

### **Síntoma: "Property does not exist"**
- ✅ Método existe en .ts pero no se usa en .html
- ✅ Método falta en .ts pero se usa en .html ← **MÁS COMÚN**
- ✅ Typo en nombre del método

### **Síntoma: Charts no renderizan**
- ✅ Duplicate `legend` properties en config
- ✅ Verificar `Chart.register(...registerables)`
- ✅ ViewChild timing con `AfterViewInit`

---

## 🛠️ Herramientas de Diagnosis

### **Script de Health Check:**
```bash
# Crear healthcheck.sh
#!/bin/bash
echo "🔍 Conductores PWA Health Check"
echo "================================"

echo "📦 Dependencies..."
npm list --depth=0 | grep WARN | wc -l

echo "🧩 Missing IconComponent imports..."
grep -r "<app-icon" src/ --include="*.html" | wc -l
grep -r "IconComponent" src/ --include="*.ts" | wc -l

echo "🔤 IconName type issues..."
grep -r ": string" src/ | grep -i icon | wc -l

echo "🎯 Missing data-cy hooks..."
grep -r "data-cy=" src/ --include="*.html" | wc -l

echo "✅ Health check complete!"
```

### **VSCode Tasks (Opcional):**
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🔧 Quick Fix: IconComponent Imports",
      "type": "shell",
      "command": "find src/ -name '*.ts' -exec grep -l 'app-icon' {} \\; | xargs grep -L 'IconComponent'",
      "group": "build"
    },
    {
      "label": "🔍 Find Missing Methods",
      "type": "shell",
      "command": "grep -r '{{.*get.*}}' src/ --include='*.html'",
      "group": "build"
    }
  ]
}
```

---

## 🎯 Prevención

### **Pre-commit Checklist Extendido:**
- [ ] `npm run lint` - Sin errores linting
- [ ] `npm run build:check` - Build funciona
- [ ] Todos los `<app-icon>` tienen `IconComponent` import
- [ ] Todos los métodos usados en templates existen en .ts
- [ ] No hay duplicate keys en objects literals
- [ ] IconName types consistentes

### **Patterns que SIEMPRE Causan Problemas:**
```typescript
// ❌ EVITAR siempre
export class MyComponent {
  // Método usado en template pero no definido
  // Template: {{ getIcon() }}
  // TS: ❌ Método no existe
}

// ❌ EVITAR siempre
@Component({
  imports: [CommonModule] // ❌ Falta IconComponent
})
// Template usa <app-icon>

// ❌ EVITAR siempre
const config = {
  legend: {},
  legend: {} // ❌ Duplicate
}
```

---

## 📞 Escalation

**Si nada de esto funciona:**

1. **Backup completo:** `cp -r src/ ../backup_$(date +%Y%m%d)/`
2. **Revert a último build funcional:** `git log --grep="build.*success"`
3. **Clean install:** `rm -rf node_modules package-lock.json && npm install`
4. **Reportar issue:** Con estos logs específicos

**Logs útiles para reportar:**
```bash
# Error completo con contexto
ng build 2>&1 | tee build_error_$(date +%Y%m%d_%H%M%S).log

# Estado git
git status > git_status.log
git diff --name-only HEAD~5 >> git_status.log
```

---

**Última actualización:** $(date)
**Mantenido por:** Equipo de Desarrollo PWA