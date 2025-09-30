# Market Policy Admin – Diff & Confirm Flow

> Implementación parcial en FE: diff modal y auditoría quedan activos a nivel UI; persistencia remota sigue bloqueada por backend.


Objetivo: añadir una capa de confirmación y auditoría al guardar políticas desde el panel QA. Hoy el componente escribe directamente el JSON en el editor y permite “Aplicar” o “Guardar en BFF” sin validar diferencias ni registrar quién hizo el cambio.

## 1. Flujo UX propuesto

1. **Aplicar cambios (sesión)**
   - Al presionar “Aplicar cambios”, parsear el JSON y comparar contra el snapshot activo (`marketPolicy.getRemoteConfigSnapshot()` o, si es nulo, contra las políticas embebidas).
   - Mostrar un diff resumido antes de aplicar:
     - Documentos añadidos/eliminados por mercado.
     - Cambios en metadatos clave (`ocrThreshold`, `protection.required`, `income.threshold`).
   - Usuario confirma → se llama `registerPoliciesFromRemoteConfig` y se actualiza la vista.

2. **Guardar en BFF**
   - Requiere autenticación (token ya presente) + mensaje de confirmación.
   - Modal de confirmación debe incluir:
     - Resumen del diff (ver arriba).
     - Campos para “Motivo/Aprobación” (texto libre, opcional) y “Número de ticket” (opcional) para auditoría.
   - Al confirmar, se invoca `savePoliciesToRemote` con payload extendido:
     ```json
     {
       "config": { ... },
       "meta": {
         "updatedBy": "{userId}",
         "justification": "{texto}",
         "ticket": "{id}",
         "changes": [
           { "market": "ags", "type": "ocrThreshold", "previous": 0.85, "current": 0.9 },
           { "market": "ags", "type": "documentAdded", "id": "doc-income" }
         ]
       }
     }
     ```
     - Si backend no admite `meta`, mantener el PUT original pero mandar auditoría por separado (ver sección Backend).

3. **Historial / Auditoría**
   - Mostrar debajo del editor la lista de últimas publicaciones: fecha, usuario, ticket, resumen de cambios. Fuente: endpoint GET `/config/market-policies/audit`.

## 2. Comparación/diff local

- Implementar helper `computePolicyDiff(current: RemoteConfig, next: RemoteConfig): PolicyDiff[]` que devuelva una lista de cambios por mercado y categoría:
  - `documentAdded` / `documentRemoved`
  - `metadataChanged` (incluye ocrThreshold, protection, income, tanda)
  - `tooltipChanged`
- Mostrar summary en modal usando bullet list.
- Adjuntar diff en el request de auditoría (`meta.changes`).

## 3. Backend considerations

- PUT `/config/market-policies` debe aceptar payload extendido o, alternativamente, registrar auditoría automáticamente a partir del diff recibido.
- Nuevo endpoint sugerido: `POST /config/market-policies/audit`
  ```json
  {
    "userId": "uuid",
    "ticket": "QA-123",
    "justification": "Actualización de OCR EdoMex",
    "changes": [ {"market": "edomex", "field": "ocrThreshold", "before": 0.80, "after": 0.85 } ]
  }
  ```
- GET `/config/market-policies/audit?limit=20` → lista cronológica para mostrar en UI.

## 4. Frontend tasks (por implementar)

1. Extraer snapshot base (tras `loadRemoteConfig`) y almacenarlo para comparar.
2. Implementar `computePolicyDiff` y reusar en ambos botones.
3. Crear modal de confirmación con formulario (Reactivo / Template-driven simple).
4. Ajustar `persistChanges()` para mandar el diff + metadata.
5. Añadir sección de historial en la UI (llamar endpoint GET cuando exista).
6. Tests:
   - `market-policy-admin.component.spec.ts`: cubrir diff, confirmación y envío de metadata.
   - `market-policy.service.spec.ts`: validar helper nuevo si se añade aquí.

## 5. Estado / Bloqueos

- Bloqueado hasta que backend exponga PUT `/config/market-policies` con auditoría y (opcionalmente) endpoint de historial.
- Documentado en `docs/backend-coordination.md` para seguimiento con backend.