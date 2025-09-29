#!/bin/bash

# Tailwind Utilities Audit Script
# Genera un CSV con conteo exacto de utilidades por archivo
# Excluye comentarios BEM y falsos positivos

echo "file,utility_type,count,examples" > reports/tailwind-audit.csv
echo "📊 Auditando utilidades Tailwind restantes..."

# Función para contar utilidades específicas
count_utilities() {
    local file="$1"
    local pattern="$2"
    local type="$3"

    # Excluir comentarios, clases BEM, y strings comentados
    local count=$(rg -o "$pattern" "$file" 2>/dev/null | \
                  grep -v '^//' | \
                  grep -v '__' | \
                  wc -l | tr -d ' ')

    if [ "$count" -gt 0 ]; then
        local examples=$(rg -o "$pattern" "$file" 2>/dev/null | \
                        grep -v '^//' | \
                        grep -v '__' | \
                        head -3 | \
                        tr '\n' ';' | \
                        sed 's/;$//')
        echo "$file,$type,$count,\"$examples\"" >> reports/tailwind-audit.csv
    fi
}

# Crear directorio de reportes si no existe
mkdir -p reports

# Definir patrones sin arrays asociativos
layout_pattern="(?:^| )(?:flex|grid|hidden|block|inline|absolute|relative|fixed|sticky)(?:$| |\")"
spacing_pattern="(?:^| )(?:p|px|py|pl|pr|pt|pb|m|mx|my|ml|mr|mt|mb)-\d+(?:$| |\")"
sizing_pattern="(?:^| )(?:w|h|min-w|min-h|max-w|max-h)-\d+(?:$| |\")"
gaps_pattern="(?:^| )(?:gap|space-x|space-y)-\d+(?:$| |\")"
borders_pattern="(?:^| )(?:rounded|border)-(?:\w+)?(?:$| |\")"
text_pattern="(?:^| )(?:text-(?:xs|sm|base|lg|xl|\d+xl)|font-(?:thin|light|normal|medium|semibold|bold|extrabold|black))(?:$| |\")"
colors_pattern="(?:^| )(?:text|bg|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+(?:$| |\")"
effects_pattern="(?:^| )(?:shadow|opacity|transition|transform|scale|rotate|translate)-\w+(?:$| |\")"

# Escanear archivos TypeScript, HTML y SCSS
echo "🔍 Escaneando archivos..."
find src/app -name "*.ts" -o -name "*.html" -o -name "*.scss" | while read file; do
    count_utilities "$file" "$layout_pattern" "layout"
    count_utilities "$file" "$spacing_pattern" "spacing"
    count_utilities "$file" "$sizing_pattern" "sizing"
    count_utilities "$file" "$gaps_pattern" "gaps"
    count_utilities "$file" "$borders_pattern" "borders"
    count_utilities "$file" "$text_pattern" "text"
    count_utilities "$file" "$colors_pattern" "colors"
    count_utilities "$file" "$effects_pattern" "effects"
done

# Generar resumen
echo ""
echo "📋 RESUMEN DE AUDITORÍA:"
echo "========================"

# Contar total por tipo
for type in layout spacing sizing gaps borders text colors effects; do
    total=$(awk -F',' -v type="$type" '$2 == type {sum += $3} END {print sum+0}' reports/tailwind-audit.csv)
    if [ "$total" -gt 0 ]; then
        echo "$type: $total utilidades"
    fi
done

# Top 10 archivos con más utilidades
echo ""
echo "🔥 TOP 10 ARCHIVOS CON MÁS UTILIDADES:"
echo "======================================"
awk -F',' 'NR>1 {files[$1] += $3} END {for (f in files) print files[f], f}' reports/tailwind-audit.csv | \
sort -nr | head -10

echo ""
echo "📄 Reporte completo guardado en: reports/tailwind-audit.csv"
echo "📅 Fecha: $(date '+%Y-%m-%d %H:%M:%S')"