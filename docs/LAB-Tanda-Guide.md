# LAB Tanda – Guía Rápida

Esta guía resume cómo usar los paneles LAB de Tanda, cómo configurar tolerancias/caps por ambiente y cómo interpretar las métricas para validar escenarios sin afectar la UI de cliente.

## Acceso y Flags
- Rutas LAB: `/lab/tanda-enhanced` y `/lab/tanda-consensus` (solo AuthGuard).
- Feature flag: `environment.features.enableTandaLab`
  - Dev: `true` (visible).
  - Prod: `false` (oculto). Requiere habilitarlo explícitamente si se desea.

## Variables y Configuración
- IRR tolerancia (bps): `environment.finance.irrToleranceBps` (prod admite `IRR_TOLERANCE_BPS`).
- Caps Tanda (`environment.finance.tandaCaps` | prod admite `TANDA_*`):
  - `rescueCapPerMonth`: fracción del aporte grupal mensual como tope de rescate.
  - `freezeMaxPct`: fracción máx. de miembros congelados simultáneamente.
  - `freezeMaxMonths`: meses máx. de congelamiento por miembro.
  - `activeThreshold`: umbral de miembros activos para permitir entregas.
- IRR objetivo por ruta/grupo (prioridad):
  - `byCollective`: `{ 'colectivo_01': 0.305 }`.
  - `byEcosystem`: `{ 'ruta-centro-edomex': 0.305 }`.
  - Fallback a baseline de mercado: `getTIRMin(market)`.
- Premiums por riesgo geográfico (bps):
  - `environment.finance.riskPremiums.byEcosystem`: `{ 'ruta-centro-edomex': 25 }`.
  - Servicio `RiskService` (opcional) suma bps desde `loadGeographicRisk()` (AVI) según `state/municipality/riskZone`.

## Paneles
- Tanda Enhanced: simula grid de escenarios (prioridades/caps/eventos) y exporta CSV.
- Tanda Consensus: gestiona una transferencia de turno con consenso (crear, votar, aprobar empresa y ejecutar) y previsualiza IRR usando el calendario real (what‑if). El target IRR se calcula como:
  - `target = targetBase(byCollective → byEcosystem → market) + premiumBps/10000`.
  - `premiumBps` puede venir de `riskPremiums.byEcosystem` o del `RiskService` (AVI geográfico).

## Métricas Clave
- `irrAnnual`: TIR anual del escenario simulado.
- `tirOK`: `true` si `irrAnnual >= target` (target viene de colectivo/ruta o mercado).
- `awardsMade`, `firstAwardT`, `lastAwardT`: volumen y timing de entregas.
- `activeShareAvg`: fracción promedio de miembros activos.
- `deficitsDetected`: meses en que las entregas superan aportes.
- `rescuesUsed`: rescates aceptados bajo el cap mensual.

## Criterios de Aprobación (sugeridos)
- `tirOK` debe ser `true` con tolerancia razonable (p. ej., ±50 bps).
- Evitar patrones con `deficitsDetected` altos o `activeShareAvg` bajo.
- Ajustar caps según evidencia (bajar `rescueCapPerMonth` si hay rescates recurrentes sin necesidad real; limitar `freezeMaxPct` si cae el `activeShareAvg`).

## Integración con AVI (Riesgo Geográfico)
- `ApiConfigService.loadGeographicRisk()` expone `riskMatrix` por estado/municipio y `multipliers` (urban/rural/highway/conflictZone).
- `RiskService` traduce score/multiplier a `premiumBps` (configurable) y lo suma al target IRR.
- Si no hay backend/config, usar `environment.finance.riskPremiums.byEcosystem`.

## QA/CI
- Smokes recomendados en CI:
  - `npm run test:smoke:guided` (MAIN).
  - `npm run test:smoke:lab` (LAB, sirve `avi-lab` en 8080).
- Workflow ejemplo: `.github/workflows/ci-smokes.yml`.

## Notas
- Todo el LAB está detrás de AuthGuard y opcionalmente del flag `enableTandaLab`.
- No afecta producción salvo que se habilite explícitamente.
- Para escenarios con calendario real, use el panel de consenso (vista de IRR what‑if).
