# Registro de Evidencia – `<FLUJO>`

| Tipo | Ruta / Descripción | Archivo |
| ---- | ------------------ | ------- |
| Screenshot UI | | `reports/evidence/<flujo>/ui/*.png` |
| HAR/JSON BFF | | `reports/evidence/<flujo>/network/*.har` |
| FlowContext | `window.__FLOW_CONTEXT__` exportado | `reports/evidence/<flujo>/flow-context.json` |
| Math Validation | Salida CLI `logScenario` | `reports/evidence/<flujo>/log-scenario.json` |
| Notas | | `reports/evidence/<flujo>/notes.md` |

## Comandos ejecutados
- `node scripts/qa/log-scenario-from-json.js ...`
- `npx playwright test --grep "<TAG>"`

## Observaciones
- 
