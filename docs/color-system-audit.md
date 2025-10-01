# Color System Notes

## Paleta actual
- `src/styles.scss` define los cuatro acentos finales:
  - `--accent-primary` (`#10a37f`)
  - `--accent-primary-hover` (`#0c8c6c`)
  - `--accent-muted` (`#2f2f2f`)
  - `--accent-danger` (`#d63b3b`)
- Se añadieron utilidades neutrales (`--surface-accent-*`, `--surface-danger-*`, `--border-accent-*`) para cubrir fondos y bordes sin reintroducir escalas de color.
- `src/styles/design-system-openai.scss` alinea la escala `--color-primary-*` con el mismo turquesa y ajusta warn/danger a neutrales + rojo discreto.

## Checklist de migración
- `rg "--accent-" src` sólo debe arrojar los cuatro tokens nuevos (más utilidades derivadas). Revisar periódicamente.
- Sustituir cualquier literal heredado (`#3b82f6`, `rgba(59,130,246,…)`, etc.) por mezclas con los nuevos tokens.
- Mantener gradientes brillantes fuera de la UI; usar fondos planos + `color-mix` suave cuando se requiera realce.
- Los datasets de gráficos y estados de servicios deben mapearse a `--accent-primary`, `--accent-muted` o `--accent-danger` según la severidad.

## QA pendiente
- Revisar staging para validar contraste (especialmente en hover y badges con `--accent-muted`).
- Alinear capturas / design docs con la nueva paleta para evitar regresiones en futuros PRs.

> Nota: conservar este archivo como recordatorio rápido de la paleta y la verificación que debe hacerse antes de mezclar nuevas características.
