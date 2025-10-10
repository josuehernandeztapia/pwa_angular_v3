# Desarrollo sin mocks

Este proyecto puede trabajar con datos simulados (`enableMockData`) o contra el BFF real.
Los siguientes pasos describen cómo levantar el entorno “real” y qué módulos dependen de él.

## 1. Arranque

```bash
# Instalar dependencias
npm ci

# Levantar el BFF local (demo)
npm run demo:bff

# Iniciar la PWA consumiendo el BFF
npm run start:real
# La aplicación queda disponible en http://localhost:4301
# API esperada: http://localhost:3000/api
```

> El build productivo (`npm run build:prod`) también asume que `/api` apuntará al BFF en tiempo de ejecución.

## 2. Servicios clave y origen de datos

| Módulo | Servicio | Endpoint/BFF | Notas |
| --- | --- | --- | --- |
| Cotizador | `CotizadorEngineService` | `/api/bff/odoo/quotes` | Tasas, componentes y límites se cargan desde el BFF o desde los paquetes locales (fallback). |
| Simulador (Ahorro/Tanda) | `SimuladorEngineService` | `/api/bff/flows` (según escenario) | `generateEdoMexCollectiveScenario` usa metadata de `MarketPolicyService`; sin BFF se basa en `db.json`. |
| Protección | `ProtectionService` + `ProtectionEngineService` | `/api/v1/protection/*` | El simulador y la demo ya delegan los cálculos al engine real; el BFF confirma selección/aplicación. |
| Onboarding/Documentos | `DocumentRequirementsService` | `/api/config/market-policies` (si existe remota) | Depende de `MarketPolicyService`; con mocks usa la config local. |
| Dashboard/KPIs | `DashboardService` | `/api/dashboard/*` | Con `enableMockData=false` deja de usar seeds y espera respuestas del BFF. |
| Clientes/Portafolio | `ApiService` | `/api/clients` | El mock se alimenta de `db.json`; con BFF contribuye la lista real. |

## 3. ¿Cómo desactivar mocks manualmente?

`environment.features.enableMockData` se inicializa a `false`. Si necesitas reactivar la ruta mock (por ejemplo, para demos donde el BFF no está disponible), puedes ejecutar en la consola del navegador:

```js
globalThis.__USE_MOCK_DATA__ = true;
window.location.reload();
```

Esto evita recompilar y queda documentado para revisiones de QA.

## 4. Verificación recomendada

1. Cotizador → seleccionar mercado/tipo y confirmar que tasas/enganches coinciden con la respuesta del BFF.
2. Simulador/Tanda → correr un escenario y validar que `monthlyContribution`/`timeline` reflejen el cálculo de `SimuladorEngineService`.
3. Protección → simular desde el wizard y verificar que `ProtectionStateService` reciba `scenarios` con TIR validada.
4. Dashboard → revisar que las cards muestren datos del BFF (sin seeds).

## 5. Recursos adicionales

- `scripts/demo-bff.js`: mini BFF para pruebas locales.
- `docs/market-policies.md`: detalles de las políticas por mercado.
- `docs/navigation.md`: mapeo de módulos y guards.

Documenta cualquier endpoint adicional en este archivo para mantener sincronizados frontend y backend.
