#!/bin/bash

# Fix SCSS files by removing non-CSS content

SCSS_FILES=(
    'src/app/components/pages/onboarding/onboarding-main.component.scss'
    'src/app/components/pages/nueva-oportunidad/nueva-oportunidad.component.scss'
    'src/app/components/pages/cotizador/cotizador-main.component.scss'
    'src/app/components/pages/simulador/ags-ahorro/ags-ahorro.component.scss'
    'src/app/components/pages/clientes/clientes-list.component.scss'
    'src/app/components/shared/avi-verification-modal/avi-verification-modal.component.scss'
)

for scss_file in "${SCSS_FILES[@]}"; do
    echo "Cleaning: $scss_file"

    # Create temporary file with only CSS content (stop at first non-CSS line)
    awk '
    BEGIN { in_css = 1 }
    /^[[:space:]]*[a-zA-Z_-]+[[:space:]]*\([^)]*\)[[:space:]]*{/ { in_css = 0 }
    /^[[:space:]]*if[[:space:]]*\(/ { in_css = 0 }
    /^[[:space:]]*function[[:space:]]*/ { in_css = 0 }
    /^[[:space:]]*export[[:space:]]*/ { in_css = 0 }
    /^[[:space:]]*import[[:space:]]*/ { in_css = 0 }
    /^[[:space:]]*\}[[:space:]]*$/ && !in_css { exit }
    in_css { print }
    ' "$scss_file" > "${scss_file}.tmp"

    # Replace original file with cleaned version
    mv "${scss_file}.tmp" "$scss_file"

    echo "  ✅ Cleaned $scss_file"
done

echo "SCSS cleanup complete!"