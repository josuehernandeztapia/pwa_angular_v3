# QA Testing Playbook – Auth Bypass & Validación Matemática

## 1. Preparación del entorno

1. Instala dependencias: `npm install`
2. Levanta BFF real o túnel necesario.
3. Ejecuta la PWA en modo testing (bypass habilitado):
   ```bash
   npm run serve:testing
   ```
   - `environment.testing.ts` habilita `bypassAuth` y `mockAuth`.
   - Los guards (`AuthGuard`, `TandaValidGuard`, etc.) retornan `true` cuando `environment.testing === true`.
   - `AuthService` inicializa sesión QA con `qa.automation@conductores.com`.

## 2. Automatización (Cypress)

- Base URL: `http://localhost:4300`
- Bypass automático en cada `cy.navigateAndWait` (se inyecta `auth_token` y `current_user`).
- Para usar API real sin fixtures: ejecuta con `CYPRESS_mockApis=false`.
- Variables disponibles:
  ```json
  {
    "bypassAuth": true,
    "testingBypassUser": {
      "email": "qa.automation@conductores.com",
      "token": "testing-bypass-token"
    }
  }
  ```
- Comando útil en test: `cy.useTestingBypassAuth()` para resembrar tokens tras `localStorage.clear()`.

### Flujo sugerido de validación Cypress
1. `cy.navigateAndWait('/dashboard')` – dashboard listo sin login manual.
2. `cy.window().its('__FLOW_CONTEXT__')` para extraer contextos.
3. Guardar JSON / capturas usando `cy.task('log', ...)` + `cy.writeFile`.
4. Ejecutar `cy.wrap(null).then(() => {/* run node script via shell */})` si necesitas `logScenario` desde tests.

## 3. Automatización (Playwright)

- Configuración usa `npm run serve:testing` automáticamente (`playwright.config.ts`).
- Para asegurar bypass, añade en cada test:
  ```ts
  await page.addInitScript(({ user }) => {
    localStorage.setItem('auth_token', user.token);
    localStorage.setItem('refresh_token', user.refreshToken);
    localStorage.setItem('current_user', JSON.stringify(user));
  }, {
    user: {
      id: 'testing-bypass-user',
      name: 'QA Automation User',
      email: 'qa.automation@conductores.com',
      role: 'asesor',
      permissions: ['dashboard:view','clients:view','quotes:create','documents:upload','postventa:manage'],
      token: 'testing-bypass-token',
      refreshToken: 'testing-bypass-refresh'
    }
  });
  ```
  (Opcional: centraliza este script en `tests/utils/auth.ts`).

## 4. CLI Matemático (`scripts/qa/log-scenario-from-json.js`)

Permite correr `logScenario` con datos reales sin editar el script principal.

```bash
node scripts/qa/log-scenario-from-json.js \
  --input reports/evidence/ags-plazo/flow-context.json \
  --scenario AGS_FIN_UI \
  --principalKey datos.financiero.principal \
  --termKey datos.financiero.plazo \
  --rateKey datos.financiero.tasa \
  --uiMonthlyKey ui.monthlyPayment \
  --uiAnnualKey ui.annualTir \
  --output reports/evidence/ags-plazo/log-scenario.json
```

Argumentos clave:
- `--manual` permite pasar JSON inline.
- `--cashflowsPath` acepta keypath (o varias separadas por coma) para usar cashflows directos.
- `--printCashflows true` imprime tabla inicial.

## 5. Evidencia / Reportes

- Usa plantillas en `reports/templates/*` y checklists en `reports/checklists/*`.
- Registra cada flujo en `reports/onboarding-validation.md`.
- Guarda evidencia por flujo en `reports/evidence/<flujo>/` con subcarpetas `ui/`, `network/`, `logs/`.

## 6. Integración CI

1. Añade paso previo a e2e: `npm run build:testing` para validar compilación con bypass.
2. En pipelines QA:
   ```yaml
   - name: Run QA math validation
     run: |
       npm run build:testing
       npm run serve:testing &
       npx wait-on http://localhost:4300
       node scripts/qa/log-scenario-from-json.js --input $SCENARIO_JSON --scenario $SCENARIO_TAG --output reports/automation/$SCENARIO_TAG.json
   ```
3. Para Cypress headless:
   ```bash
   CYPRESS_mockApis=false npx cypress run --browser chrome --config baseUrl=http://localhost:4300
   ```
4. Publica `reports/onboarding-validation.md` y `reports/evidence/**/*` como artefactos.

## 7. Próximos pasos sugeridos
- Extender scripts Playwright/Cypress para guardar automáticamente `window.__FLOW_CONTEXT__` (`cy.window().then(win => cy.writeFile(...))`).
- Añadir tareas `npm run test:e2e:testing` que orquesten `serve:testing` + `cypress run`/`playwright test` con bypass habilitado.
- Integrar verificación `logScenario` en tests (assert `withinTolerance === true`).

---
Última actualización: `npm run build:testing` exitoso en este repo (ver salida en terminal). Ajusta credenciales/tokens según staging real si difieren.
