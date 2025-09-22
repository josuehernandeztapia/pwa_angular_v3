#!/bin/bash

# 🎬 PWA E2E Individual Demo Videos Generator
# Crea videos separados por flujo con títulos descriptivos

set -e

echo "🎬 Creating Individual PWA Demo Videos..."
echo "========================================"

# Directorios
VIDEO_DIR="test-results/visual"
OUTPUT_DIR="reports/videos/individual"
mkdir -p "$OUTPUT_DIR"

# Verificar FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found"
    exit 1
fi

echo "✅ FFmpeg available: $(ffmpeg -version | head -n1)"

# Array de videos con nombres descriptivos
declare -A VIDEOS=(
    ["login-flow"]="01_Login_and_Dashboard_Navigation"
    ["cotizador-ags"]="02_Cotizador_Aguascalientes_25_5_Rate"
    ["cotizador-edomex"]="03_Cotizador_Estado_Mexico_29_9_Rate"
    ["avi-flow"]="04_AVI_Voice_Interview_GO_Decision"
)

# Buscar y procesar cada video
for flow in "${!VIDEOS[@]}"; do
    DESCRIPTIVE_NAME="${VIDEOS[$flow]}"

    echo ""
    echo "🔍 Procesando flujo: $flow → $DESCRIPTIVE_NAME"

    # Buscar archivo de video para este flujo
    VIDEO_FILE=$(find "$VIDEO_DIR" -name "*.webm" -path "*${flow}*" | head -1)

    if [ -z "$VIDEO_FILE" ]; then
        echo "⚠️ No se encontró video para $flow"
        continue
    fi

    if [ ! -f "$VIDEO_FILE" ]; then
        echo "❌ Archivo no existe: $VIDEO_FILE"
        continue
    fi

    echo "✅ Encontrado: $(basename "$VIDEO_FILE")"

    # Crear video con título
    OUTPUT_FILE="$OUTPUT_DIR/${DESCRIPTIVE_NAME}.mp4"

    # Añadir título al video
    ffmpeg -y -i "$VIDEO_FILE" \
        -vf "drawtext=text='$DESCRIPTIVE_NAME':fontfile=/System/Library/Fonts/Arial.ttf:fontsize=32:fontcolor=white:x=10:y=10:box=1:boxcolor=black@0.8" \
        -c:v libx264 -preset fast -crf 18 \
        -pix_fmt yuv420p \
        -movflags +faststart \
        "$OUTPUT_FILE" \
        2>/dev/null

    if [ -f "$OUTPUT_FILE" ]; then
        SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo "✅ Creado: ${DESCRIPTIVE_NAME}.mp4 (${SIZE})"
    else
        echo "❌ Error creando: $DESCRIPTIVE_NAME"
    fi
done

echo ""
echo "🎉 Videos individuales creados:"
echo "=============================="

if [ -d "$OUTPUT_DIR" ]; then
    ls -lh "$OUTPUT_DIR"/*.mp4 2>/dev/null | while read -r file; do
        echo "📹 $(basename "$file")"
    done
else
    echo "❌ No se crearon videos"
fi

echo ""
echo "📁 Ubicación: $OUTPUT_DIR"
echo "🚀 Listos para revisión individual"