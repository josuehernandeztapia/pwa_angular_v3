# 📊 AVI MAIN ↔ LAB Post-Deployment Validation

**Monitoreo de Sincronización Post-GO-LIVE**
**PR Base**: #211 - Voice Pattern Alignment
**Deployment Date**: _[COMPLETAR]_
**Validator**: _[COMPLETAR]_

## 🎯 Objetivo

Verificar que la sincronización del algoritmo de voice pattern entre **AVI MAIN** y **AVI_LAB** se mantiene estable en producción con **100% consistency** en perfiles de control.

---

## 🧪 Casos de Control Estándar

### Test Case 1: Perfil Honesto (GO Esperado)
**Input Profile**:
- Latencia: 1.5-2.5 segundos (estable)
- Pitch Variance: 0.10-0.25 (bajo)
- Hesitaciones: 0-2 palabras ('eh', 'um')
- Palabras de Honestidad: 2-3 ('exactamente', 'seguro', 'claro')
- Confianza Whisper: >0.90

**Expected Output**:
- Score: ≥750 → **GO**
- Flags: 0-1 flags menores
- Hard Stop: No activado

### Test Case 2: Perfil Nervioso (REVIEW Esperado)
**Input Profile**:
- Latencia: 3.0-5.0 segundos (lenta)
- Pitch Variance: 0.40-0.60 (inestable)
- Hesitaciones: 3-5 palabras ('este', 'pues', 'eh')
- Mix de palabras: honestidad + hesitación
- Confianza Whisper: 0.70-0.85

**Expected Output**:
- Score: 500-749 → **REVIEW**
- Flags: 1-2 flags (disfluency, energy_instability)
- Hard Stop: No activado

### Test Case 3: Perfil Engañoso (NO-GO Esperado)
**Input Profile**:
- Latencia: 0.5-1.0 segundos (muy rápida) o >6.0 segundos (muy lenta)
- Pitch Variance: 0.70-0.90 (muy alta)
- Hesitaciones: 5+ palabras
- Palabras de Engaño: 3+ ('tal_vez', 'no_recuerdo', 'creo_que')
- Confianza Whisper: <0.60

**Expected Output**:
- Score: ≤499 → **NO-GO**
- Flags: ≥3 flags críticos (latency, deception_indicators, high_pitch)
- Hard Stop: Activado por voice flags

---

## 📋 Validation Results

### Semana 1 - Validation Inicial

| Fecha | Caso | MAIN Score | LAB Score | MAIN Decisión | LAB Decisión | MAIN Flags | LAB Flags | Score Δ | Status |
|-------|------|------------|-----------|---------------|--------------|------------|-----------|---------|---------|
| _[DATE]_ | Honesto-1 | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ |
| _[DATE]_ | Honesto-2 | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ |
| _[DATE]_ | Nervioso-1 | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ |
| _[DATE]_ | Nervioso-2 | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ |
| _[DATE]_ | Engañoso-1 | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ |
| _[DATE]_ | Engañoso-2 | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ |

### Semana 2-4 - Perfiles Reales

| Fecha | Profile ID | MAIN Score | LAB Score | MAIN Decisión | LAB Decisión | Score Δ | Status | Notes |
|-------|------------|------------|-----------|---------------|--------------|---------|---------|-------|
| _[DATE]_ | _[ID]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ | _[NOTES]_ |
| _[DATE]_ | _[ID]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ | _[NOTES]_ |
| _[DATE]_ | _[ID]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[FILL]_ | _[CALC]_ | _[✅/⚠️/❌]_ | _[NOTES]_ |

---

## 📊 Criterios de Validación

### ✅ SUCCESS Criteria
- **Score Difference**: ≤±2 puntos entre MAIN y LAB
- **Decision Match**: 100% identical (GO/REVIEW/NO-GO)
- **Flag Consistency**: Same flag types and severity
- **Confidence Delta**: ≤0.05 difference
- **Performance**: Processing time <100ms, overhead <25ms

### ⚠️ WARNING Criteria
- **Score Difference**: 3-5 puntos de diferencia
- **Minor Flag Mismatch**: Same severity, different specific flags
- **Performance Degradation**: 25-50ms additional overhead

### ❌ FAILURE Criteria
- **Score Difference**: >5 puntos de diferencia
- **Decision Mismatch**: Different GO/REVIEW/NO-GO decisions
- **Major Flag Mismatch**: Different severity levels
- **Performance Issues**: >50ms additional overhead

---

## 🔧 Troubleshooting Actions

### Si Score Δ > ±2 puntos
1. **Verificar Input Data**: Confirmar que ambos sistemas reciben identical voice analysis data
2. **Check Lexicon Consistency**: Validar que los lexicones están sincronizados
3. **Review L,P,D,E,H Calculation**: Ejecutar debug del algoritmo paso a paso
4. **Rollback Plan**: Considerar rollback si >20% de casos fallan

### Si Decision Mismatch
1. **Threshold Verification**: Confirmar que AVI_VOICE_THRESHOLDS están alineados
2. **Hard Stop Logic**: Verificar que voice flags triggers están sincronizados
3. **Emergency Response**: Immediate rollback si decisions críticas están incorrectas

### Si Performance Degradation
1. **Profile Code**: Identificar bottlenecks en lexicon processing
2. **Cache Optimization**: Implementar caching de lexicon analysis
3. **Load Testing**: Validar performance bajo carga real

---

## 📈 Monitoring Dashboard

### KPIs a Trackear
- **Alignment Rate**: % de casos con score Δ ≤±2
- **Decision Consistency**: % de decision matches
- **Performance Metrics**: Average processing time MAIN vs LAB
- **Error Rate**: % de calculation failures o exceptions

### Alerts Setup
```json
{
  "score_divergence_alert": {
    "threshold": "score_delta > 5",
    "action": "immediate_notification"
  },
  "decision_mismatch_alert": {
    "threshold": "decision != expected",
    "action": "critical_alert"
  },
  "performance_degradation": {
    "threshold": "processing_time > 100ms",
    "action": "warning_alert"
  }
}
```

---

## 📝 Weekly Summary Template

### Week of [DATE]
**Total Cases Tested**: _[NUMBER]_
**Success Rate**: _[PERCENTAGE]%_
**Average Score Delta**: _[NUMBER]_ points
**Decision Match Rate**: _[PERCENTAGE]%_
**Performance Average**: _[TIME]_ ms

### Issues Found
- _[DESCRIBE ANY ISSUES]_

### Recommendations
- _[RECOMMENDATIONS FOR NEXT WEEK]_

### Next Week Focus
- _[AREAS TO MONITOR CLOSELY]_

---

## 🎯 Long-term Monitoring (Month 1+)

### Lexicon Effectiveness Review
- **Monthly**: Review hesitation/honesty word effectiveness
- **Quarterly**: Update lexicons based on regional data patterns
- **Annually**: Complete algorithm performance review

### Calibration Tasks
- **Bi-weekly**: Monitor false positive rates in nervous profiles
- **Monthly**: Adjust thresholds if systematic bias detected
- **Quarterly**: Review and update voice analysis weights

### Documentation Maintenance
- Update this validation template based on lessons learned
- Document any configuration changes or threshold adjustments
- Maintain changelog of algorithm modifications

---

## ✅ Sign-off

**Week 1 Validation Completed By**: _[NAME]_ - Date: _[DATE]_
**Status**: _[✅ PASSED / ⚠️ WARNINGS / ❌ FAILED]_
**Comments**: _[COMMENTS]_

**Week 2 Validation Completed By**: _[NAME]_ - Date: _[DATE]_
**Status**: _[✅ PASSED / ⚠️ WARNINGS / ❌ FAILED]_
**Comments**: _[COMMENTS]_

**Month 1 Final Certification**: _[NAME]_ - Date: _[DATE]_
**Status**: _[✅ CERTIFIED / ⚠️ CONDITIONAL / ❌ FAILED]_
**Recommendation**: _[CONTINUE MONITORING / RECALIBRATE / ROLLBACK]_

---
**Template Version**: v1.0
**Based on PR**: #211 Voice Pattern Alignment
**Next Review**: _[DATE + 1 MONTH]_