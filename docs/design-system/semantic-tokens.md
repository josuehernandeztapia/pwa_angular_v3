# Semantic Token Guidance

Las variables centrales se agrupan en `src/styles/tokens/` y se consumen a través de `@import 'styles/tokens/index.scss';`.

## Roles principales
- **CTA**: `--token-cta-*`.
- **Superficies base**: `--token-surface-default`, `--token-surface-muted`, `--token-surface-elevated`, `--token-surface-accent-weak`, `--token-surface-accent-strong`, `--token-surface-danger`, `--token-surface-danger-strong`, `--token-surface-accent-soft`, `--token-surface-accent-tint`, `--token-surface-danger-soft`.
- **Superficies overlay**: familias `--token-surface-accent-alpha-*`, `--token-surface-warning-alpha-*`, `--token-surface-danger-alpha-*`, `--token-surface-neutral-alpha-*`, `--token-surface-inverse-alpha-*`, entre otras variantes generadas (`*` indica porcentaje de mezcla sobre el color base).
- **Bordes**: `--token-border-*` para roles base y `--token-border-*-alpha-*` para mixes con `transparent`.
- **Texto**: `--token-text-*` para colores sólidos y `--token-text-*-alpha-*`/`--token-text-*-blend-*` para estados atenuados.
- **Badges/Chips**: `--token-badge-neutral-bg/text`, `--token-badge-positive-bg/text`, `--token-badge-warning-bg/text`, `--token-badge-danger-bg/text`.
- **Focus**: `--token-focus-ring`, `--token-focus-shadow`.

## Nuevos conjuntos de overlays
- **Superficies**: las familias `--token-surface-{accent,warning,danger,neutral,flat,inverse}-alpha-*` cubren intensidades de mezcla frecuentes (08–95%). Las variantes `blend-*`, `tint-*` y `shade-*` documentan mezclas con blancos, negros u otros tokens.
- **Bordes**: `--token-border-*` ahora incluye niveles adicionales (`alpha-08` a `alpha-90`) y combinaciones específicas (`tint-*`, `risk-radar-*`).
- **Texto**: agrega atenuaciones controladas (`alpha-*`) y mezclas (`blend-*`) para estados secundarios/deshabilitados.
- **Canales manuales y premium**: tokens `--token-surface-manual-*`, `--token-surface-premium-*`, `--token-risk-radar-*` permiten cubrir módulos verticales que requerían literales.
- **Convención**: `alpha-XX` = porcentaje sobre `transparent`; `tint-XX` = mezcla con `var(--openai-white)`; `shade-XX` = mezcla con neutros oscuros; `blend-<token>-XX` = mezcla dirigida con otro token.

## Uso recomendado
1. Evita declarar variables locales (`--dt-*`, `--badge-*`, etc.). Consume los tokens semánticos directamente.
2. Si un componente necesita una variante nueva, proponla en `_semantic.scss` antes de usar un color literal.
3. Los utilitarios existentes (ver `styles/components-openai.scss`) ya consumen los nuevos tokens; extiende esas clases antes de crear estilos ad-hoc.

## Ejemplo
```scss
.card {
  background: var(--token-surface-default);
  border: 1px solid var(--token-border-default);
  color: var(--token-text-primary);
}

.badge--warning {
  background: var(--token-badge-warning-bg);
  color: var(--token-badge-warning-text);
}
```

Actualiza esta guía cuando se agreguen nuevos roles o se retiren tokens.
