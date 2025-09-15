#!/bin/bash

# Update components to use styleUrl instead of inline styles

COMPONENTS=(
    'onboarding/onboarding-main'
    'nueva-oportunidad/nueva-oportunidad'
    'cotizador/cotizador-main'
    'simulador/ags-ahorro/ags-ahorro'
    'clientes/clientes-list'
    'shared/avi-verification-modal/avi-verification-modal'
)

for comp in "${COMPONENTS[@]}"; do
    echo "Processing: $comp"

    # Find .ts file
    TS_FILE="src/app/components/pages/$comp.component.ts"
    if [[ $comp == *"shared"* ]]; then
        TS_FILE="src/app/components/$comp.component.ts"
    fi

    if [[ -f $TS_FILE ]]; then
        SCSS_FILE="${comp}.component.scss"
        echo "  Updating: $TS_FILE"

        # Remove the entire styles block and add styleUrl
        perl -i -pe '
            BEGIN { $in_styles = 0; }
            if (/^\s*styles:\s*\[\s*`?/) {
                $in_styles = 1;
                $_ = "  styleUrl: \"./$SCSS_FILE\",\n";
            }
            elsif ($in_styles && /^\s*\]\s*,?\s*$/) {
                $in_styles = 0;
                $_ = "";
            }
            elsif ($in_styles) {
                $_ = "";
            }
        ' "$TS_FILE"

        echo "  ✅ Updated $TS_FILE to use styleUrl"
    else
        echo "  ❌ File not found: $TS_FILE"
    fi
done

echo "Components update complete!"