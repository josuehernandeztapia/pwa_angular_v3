# Checklist QA – Flujo `<NOMBRE>`

## Preparación
- [ ] Cerrar sesión previa / limpiar `localStorage` y `sessionStorage`
- [ ] Confirmar `localStorage.useMockData === null`
- [ ] Servidor levantado con `npm run serve:testing` o entorno real especificado
- [ ] Captura de red activa (HAR/JSON)

## Paso a paso
1. `[]` Login / bypass verificado (`AuthService` auto seed)
2. `[]` Onboarding: …
3. `[]` Cotizador: …
4. `[]` Documentos: …
5. `[]` Contratos: …
6. `[]` Evidencia agregada a `reports/evidence/<flujo>/`

## Validaciones numéricas
- [ ] `window.__FLOW_CONTEXT__.documentos.mathValidation` guardado (si aplica)
- [ ] `node scripts/qa/log-scenario-from-json.js` ejecutado con parámetros reales
- [ ] Δ% dentro de tolerancia (≤ 0.5%)
- [ ] Guardias de negocio (ej: `TandaValidGuard`) verificados con evidencia

## Post condiciones
- [ ] Logout ejecutado / sesión limpiada
- [ ] Reporte actualizado (`reports/onboarding-validation.md`)
- [ ] Incidencias anotadas (`reports/issues/<flujo>.md` si corresponde)

Observaciones:
- 
