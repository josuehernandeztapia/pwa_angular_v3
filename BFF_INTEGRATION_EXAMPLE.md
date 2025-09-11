# 🚀 PWA + BFF Integration Guide

## Arquitectura Actualizada

```
┌─────────────────┐    HTTP API calls    ┌─────────────────┐
│   Angular PWA   │ ──────────────────► │   NestJS BFF    │
│                 │                     │                 │
│ • UI Components │                     │ • Voice Service │
│ • AVI Service   │                     │ • AVI Utils     │
│ • Voice Service │                     │ • Health Module │
└─────────────────┘                     └─────────────────┘
```

## ✅ Cambios Implementados

### 1. **BFF Creado** (`/bff/`)
- **NestJS backend** con algoritmos AVI migrados
- **3 endpoints principales:**
  - `POST /v1/voice/analyze` - Análisis de features pre-extraídas
  - `POST /v1/voice/analyze/audio` - Upload audio + análisis
  - `POST /v1/voice/evaluate` - Pipeline completo (Whisper + análisis)

### 2. **PWA Actualizada**
- **`avi.service.ts`** ahora llama al BFF en lugar de ejecutar algoritmos localmente
- **`voice-validation.service.ts`** integrado con endpoints del BFF
- **Fallback automático** si BFF no está disponible

### 3. **Environment Configuration**
- **`apiUrl: 'http://localhost:3000/api'`** apunta al BFF
- **Endpoints configurados** para desarrollo local

---

## 🎯 Ejemplo de Uso

### Iniciar los servicios:

```bash
# Terminal 1: Iniciar BFF
npm run bff:install
npm run bff:dev

# Terminal 2: Iniciar PWA  
npm start

# Terminal 3: Iniciar ambos (concurrente)
npm run dev:all
```

### Ejemplo de código en tu componente:

```typescript
// En tu componente Angular
import { AVIService } from '../services/avi.service';
import { VoiceValidationService } from '../services/voice-validation.service';

export class AVIComponent {
  constructor(
    private aviService: AVIService,
    private voiceService: VoiceValidationService
  ) {}

  // Método 1: Análisis de features pre-extraídas (usando BFF)
  async analyzeFeatures() {
    const response = {
      questionId: 'ingresos_promedio_diarios',
      value: 'Gano como mil pesos diarios',
      responseTime: 3500,
      transcription: 'Gano como mil pesos diarios',
      voiceAnalysis: {
        pitch_variance: 0.3,
        confidence_level: 0.85,
        pause_frequency: 0.2
      },
      stressIndicators: ['slight_hesitation'],
      coherenceScore: 0.8
    };

    this.aviService.submitResponse(response).subscribe();
    
    // Esto ahora llama al BFF automáticamente
    this.aviService.calculateScore().subscribe(score => {
      console.log('AVI Score from BFF:', score);
    });
  }

  // Método 2: Análisis directo de audio (usando BFF)
  async analyzeAudioFile(audioBlob: Blob) {
    try {
      const result = await this.voiceService.evaluateAudio(
        audioBlob,
        'ingresos_promedio_diarios',
        'context_123',
        'aguascalientes'
      );
      
      console.log('Voice Analysis Result:', {
        decision: result.decision,
        score: result.voiceScore,
        flags: result.flags,
        fromBFF: !result.fallback
      });
      
    } catch (error) {
      console.error('Voice analysis failed:', error);
    }
  }
}
```

---

## 📡 API Endpoints Disponibles

### 1. **Análisis de Features** 
```bash
curl -X POST http://localhost:3000/v1/voice/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "latencySec": 0.6,
    "answerDurationSec": 4.2,
    "pitchSeriesHz": [110, 115, 112, 108, 113],
    "energySeries": [0.6, 0.7, 0.65, 0.62, 0.68],
    "words": ["mi", "hijo", "me", "cubre"],
    "questionId": "Q1"
  }'
```

### 2. **Análisis de Audio**
```bash
curl -X POST http://localhost:3000/v1/voice/analyze/audio \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@response.wav" \
  -F "questionId=Q1" \
  -F "contextId=L-123"
```

### 3. **Evaluación Completa** 
```bash
curl -X POST http://localhost:3000/v1/voice/evaluate \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@response.wav" \
  -F "questionId=Q1" \
  -F "contextId=L-123"
```

### 4. **Health Check**
```bash
curl http://localhost:3000/health/voice
```

---

## 🔄 Flujo de Ejecución

### Análisis AVI (PWA → BFF):

1. **Usuario responde pregunta** en PWA
2. **PWA llama `avi.service.calculateScore()`**
3. **`calculateScoreWithBFF()`** envía datos al BFF
4. **BFF procesa** con algoritmos migrados
5. **BFF responde** con score calculado
6. **PWA muestra resultado** al usuario

### Fallback Automático:

```typescript
// Si BFF falla, automáticamente usa algoritmos locales
calculateScore(): Observable<AVIScore> {
  return this.calculateScoreWithBFF(responses).pipe(
    catchError(error => {
      console.warn('BFF failed, using local fallback');
      return this.calculateScoreLocal(responses);
    })
  );
}
```

---

## 🧪 Testing

### Test BFF individualmente:
```bash
cd bff
npm test
```

### Test PWA individualmente:
```bash
npm run test:unit
```

### Test integración completa:
```bash
npm run test:all:monorepo
```

---

## 📊 Beneficios de la Migración

### ✅ **Antes (Todo en PWA)**
- Algoritmos ejecutándose en navegador
- Procesamiento bloqueante de UI
- Difícil de escalar
- Lógica crítica expuesta

### 🚀 **Después (PWA + BFF)**
- Algoritmos en backend seguro
- UI no se bloquea
- Escalable horizontalmente
- Lógica protegida
- Fallback automático

---

## 🚨 Troubleshooting

### BFF no responde:
```bash
# Verificar que BFF esté corriendo
curl http://localhost:3000/health

# Verificar logs del BFF
npm run bff:dev
```

### PWA no puede conectar:
```typescript
// Verificar configuración en environment.ts
export const environment = {
  apiUrl: 'http://localhost:3000/api' // ← Debe apuntar al BFF
};
```

### Problemas CORS:
El BFF ya tiene CORS habilitado en `main.ts`:
```typescript
app.enableCors({
  origin: ['http://localhost:4200', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
});
```

---

## 📈 Próximos Pasos

1. **Integrar Whisper real** en BFF (actualmente mock)
2. **Configurar base de datos** para persistencia
3. **Implementar autenticación** JWT
4. **Deploy en producción** con Docker
5. **Monitoring y logs** con Winston/DataDog

---

**¡Tu PWA ahora está conectada al BFF y usando los algoritmos AVI en el backend! 🎉**