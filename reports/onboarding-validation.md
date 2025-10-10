# Validación Onboarding / Financiera E2E

> Rellena esta tabla con datos reales después de cada corrida. Usa `reports/templates/onboarding-validation-template.md` como guía completa.

| Plaza/Producto | Usuario QA | Datos UI (monto / plazo / TIR) | JSON BFF (ruta) | logScenario Δ% | Guard chequeado | Evidencia |
| -------------- | ---------- | ------------------------------ | --------------- | -------------- | --------------- | --------- |
| AGS - Contado | | | | | | |
| AGS - Plazo Individual | | | | | | |
| EDOMEX - Financiamiento Individual | | | | | | |
| EDOMEX - Crédito Colectivo | | | | | | |
| Simulador / Ahorro | | | | | | |
| AVI + MetaMap | | | | | | |

## Resumen de Comandos

```
# Ejemplo, reemplazar con ejecuciones reales
npm run serve:testing
node scripts/qa/log-scenario-from-json.js --input <ruta-json> --scenario <TAG> --uiMonthlyKey <clave> --uiAnnualKey <clave> --principalKey <clave> --termKey <clave> --rateKey <clave>
```

## Notas / Incidencias
- 

## Checklist Final
- [ ] Matemática OK
- [ ] Business rules OK
- [ ] UI OK

_Firma QA:_  
_Fecha:_  
_Commit:_ 
