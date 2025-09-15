#\!/bin/bash

# CSS Mass Extraction Script for Lighthouse Optimization
# Target: 6 components with CSS >8kB

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
        SCSS_FILE="${TS_FILE%.ts}.scss"
        echo "  Creating: $SCSS_FILE"
        
        # Extract CSS from styles: [' to '] using sed
        sed -n '/styles: \[/,/^  \]/p' "$TS_FILE" | \
        sed '1d;$d' | \
        sed 's/^[ ]*`//g; s/`[ ]*$//g; s/^[ ]*'"'"'//g; s/'"'"'[ ]*$//g' > "$SCSS_FILE"
        
        echo "  ✅ CSS extracted to $SCSS_FILE"
    else
        echo "  ❌ File not found: $TS_FILE"
    fi
done

echo "CSS extraction complete\!"

