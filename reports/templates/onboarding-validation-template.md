# Onboarding / Financier Validation Template

Completa la tabla con datos reales capturados de cada recorrido.

| Plaza/Producto | Usuario QA | Datos UI (monto / plazo / TIR) | JSON BFF (ruta) | logScenario Δ% | Guard chequeado | Evidencia |
| -------------- | ---------- | ------------------------------ | --------------- | -------------- | --------------- | --------- |
| AGS - Contado | | | `/clients/{id}/contracts` | n/a | `FlowContext.documentos.mathValidation === null` | `reports/evidence/ags-contado/` |
| AGS - Plazo Individual | | | `/cotizador/...` | | `documentos.mathValidation` capturado antes de contratos | `reports/evidence/ags-plazo/` |
| EDOMEX - Financiamiento Individual | | | `/documents/...` | | Documentos extra (RFC, concesión, carta aval) listados | `reports/evidence/edomex-individual/` |
| EDOMEX - Crédito Colectivo | | | `/tanda/schedule` | | `TandaValidGuard` bloquea sin cronograma | `reports/evidence/edomex-tanda/` |
| Simulador / Ahorro | | | `/simulator/...` | | Helper de ahorro validado | `reports/evidence/simulador/` |
| AVI + MetaMap | | | `/kyc/...` | | `FlowContext['avi']` con score y decisión | `reports/evidence/avi-kyc/` |

## Comandos Ejecutados

```
npm run serve:testing
# Reemplaza el siguiente ejemplo por cada ejecución real
node scripts/qa/log-scenario-from-json.js --input reports/evidence/ags-plazo/documentos-math.json --scenario AGS_FIN_UI --uiMonthlyKey flowContext.documentos.mathValidation.uiMonthlyPayment --uiAnnualKey flowContext.documentos.mathValidation.uiAnnualTir --principalKey flowContext.documentos.mathValidation.principal --termKey flowContext.documentos.mathValidation.term --rateKey flowContext.documentos.mathValidation.annualRate --output reports/evidence/ags-plazo/log-scenario.json
```

## Notas e Incidencias

- [ ] Sin errores críticos
- [ ] Tolerancias > 0.5% documentadas
- [ ] Incidencias registradas en `reports/issues/`

## Checklist Final

- [ ] Matemática OK
- [ ] Business rules OK
- [ ] UI OK

_Firma QA:_ `____________________`  
_Fecha:_ `____________________`  
_Commit:_ `git rev-parse HEAD`
