#!/bin/bash

# 🎬 PWA E2E Enhanced Video Concatenation Script
# QA Automation Engineer + DevOps Implementation
# Concatena videos con orden inteligente y categorización

set -e

echo "🎬 Starting Enhanced PWA E2E Demo Video Concatenation..."
echo "======================================================"

# Directorios
VIDEO_DIR="test-results"
OUTPUT_DIR="reports/videos"
FINAL_VIDEO="pwa-e2e-demo-complete.mp4"
TEMP_DIR="temp_video_processing"

# Crear directorios
mkdir -p "$OUTPUT_DIR"
mkdir -p "$TEMP_DIR"

# Verificar FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg no encontrado. Instalando..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ffmpeg
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y ffmpeg
    fi
fi

echo "✅ FFmpeg version: $(ffmpeg -version | head -n1)"

# Definir orden inteligente de flujos
declare -a FLOW_ORDER=(
    "login-flow"
    "cotizador-ags"
    "cotizador-edomex"
    "cotizador-edomex-colectivo"
    "simulador-ags"
    "simulador-edomex-individual"
    "simulador-edomex-colectivo"
    "configuracion-flujos"
    "avi-flow"
)

# Buscar y organizar videos
echo "🔍 Organizando videos por flujo..."

declare -A FOUND_VIDEOS
CONCAT_LIST=""

# Buscar videos en el orden definido
for flow in "${FLOW_ORDER[@]}"; do
    echo "📹 Buscando videos para flujo: $flow"

    # Buscar videos que coincidan con el flujo
    FLOW_VIDEOS=$(find "$VIDEO_DIR" -name "*.webm" -path "*${flow}*" 2>/dev/null || true)

    if [ ! -z "$FLOW_VIDEOS" ]; then
        # Tomar el primer video encontrado para este flujo
        VIDEO_FILE=$(echo "$FLOW_VIDEOS" | head -1)

        if [ -f "$VIDEO_FILE" ]; then
            FOUND_VIDEOS["$flow"]="$VIDEO_FILE"
            echo "  ✅ Encontrado: $(basename "$VIDEO_FILE")"

            # Crear entrada para concatenación
            CONCAT_LIST="${CONCAT_LIST}file '$PWD/$VIDEO_FILE'\n"
        else
            echo "  ⚠️ Archivo no existe: $VIDEO_FILE"
        fi
    else
        echo "  ⚠️ No se encontró video para: $flow"
    fi
done

# Verificar que encontramos videos
if [ ${#FOUND_VIDEOS[@]} -eq 0 ]; then
    echo "❌ No se encontraron videos para concatenar"
    exit 1
fi

echo ""
echo "📊 Resumen de videos encontrados:"
echo "================================="
for flow in "${FLOW_ORDER[@]}"; do
    if [[ -v FOUND_VIDEOS["$flow"] ]]; then
        VIDEO_FILE="${FOUND_VIDEOS[$flow]}"
        DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null | cut -d. -f1)
        SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
        echo "  $flow: ${DURATION}s ($SIZE)"
    fi
done

# Crear archivo de concatenación
CONCAT_FILE="$TEMP_DIR/video_concat_list.txt"
echo -e "$CONCAT_LIST" > "$CONCAT_FILE"

echo ""
echo "📋 Lista de concatenación generada:"
cat "$CONCAT_FILE"

# Preparar videos intermedios (normalizar formatos)
echo ""
echo "🔄 Preparando videos para concatenación..."

NORMALIZED_LIST=""
counter=0

for flow in "${FLOW_ORDER[@]}"; do
    if [[ -v FOUND_VIDEOS["$flow"] ]]; then
        VIDEO_FILE="${FOUND_VIDEOS[$flow]}"
        NORMALIZED_FILE="$TEMP_DIR/normalized_${counter}_${flow}.mp4"

        echo "  📐 Normalizando: $flow"

        # Normalizar video (mismo codec, resolución, frame rate)
        ffmpeg -y -i "$VIDEO_FILE" \
            -c:v libx264 -preset fast -crf 23 \
            -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
            -r 25 -pix_fmt yuv420p \
            -c:a aac -b:a 128k -ar 44100 \
            "$NORMALIZED_FILE" \
            2>/dev/null

        if [ -f "$NORMALIZED_FILE" ]; then
            NORMALIZED_LIST="${NORMALIZED_LIST}file '$PWD/$NORMALIZED_FILE'\n"
            echo "    ✅ Normalizado: $(basename "$NORMALIZED_FILE")"
        else
            echo "    ❌ Error normalizando: $flow"
        fi

        ((counter++))
    fi
done

# Crear lista de videos normalizados
NORMALIZED_CONCAT_FILE="$TEMP_DIR/normalized_concat_list.txt"
echo -e "$NORMALIZED_LIST" > "$NORMALIZED_CONCAT_FILE"

# Concatenar videos normalizados
echo ""
echo "🎬 Concatenando videos normalizados..."
ffmpeg -y -f concat -safe 0 -i "$NORMALIZED_CONCAT_FILE" \
    -c:v libx264 -preset medium -crf 18 \
    -c:a aac -b:a 192k \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "$OUTPUT_DIR/$FINAL_VIDEO" \
    2>/dev/null

# Crear también el video con el nombre original
cp "$OUTPUT_DIR/$FINAL_VIDEO" "$OUTPUT_DIR/pwa-e2e-demo.mp4"

# Cleanup
rm -rf "$TEMP_DIR"

# Verificar resultado
if [ -f "$OUTPUT_DIR/$FINAL_VIDEO" ]; then
    SIZE=$(du -h "$OUTPUT_DIR/$FINAL_VIDEO" | cut -f1)
    DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_DIR/$FINAL_VIDEO" 2>/dev/null | cut -d. -f1)
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    echo "🎉 ¡Video demo completo creado exitosamente!"
    echo "==========================================="
    echo "📁 Archivo principal: $OUTPUT_DIR/$FINAL_VIDEO"
    echo "📁 Archivo compatible: $OUTPUT_DIR/pwa-e2e-demo.mp4"
    echo "📏 Tamaño: $SIZE"
    echo "⏱️ Duración: ${MINUTES}m ${SECONDS}s"
    echo "📊 Flujos incluidos: ${#FOUND_VIDEOS[@]} de ${#FLOW_ORDER[@]}"
    echo ""

    # Mostrar flujos incluidos
    echo "✅ Flujos concatenados:"
    for flow in "${FLOW_ORDER[@]}"; do
        if [[ -v FOUND_VIDEOS["$flow"] ]]; then
            echo "  • $flow"
        fi
    done

    echo ""
    echo "🚀 Videos listos para GitHub Actions artifacts"
else
    echo "❌ Error: No se pudo crear el video final"
    exit 1
fi

# Generar reporte de concatenación
cat > "$OUTPUT_DIR/concatenation-report.md" << EOF
# 🎬 PWA E2E Video Concatenation Report

**Generated**: $(date)
**Total Duration**: ${MINUTES}m ${SECONDS}s
**File Size**: $SIZE
**Flows Processed**: ${#FOUND_VIDEOS[@]} of ${#FLOW_ORDER[@]}

## 📹 Included Flows

$(for flow in "${FLOW_ORDER[@]}"; do
    if [[ -v FOUND_VIDEOS["$flow"] ]]; then
        echo "- ✅ **$flow**: $(basename "${FOUND_VIDEOS[$flow]}")"
    else
        echo "- ❌ **$flow**: Not found"
    fi
done)

## 📊 Technical Details

- **Resolution**: 1280x720 HD
- **Codec**: H.264 (libx264)
- **Audio**: AAC 192kbps
- **Frame Rate**: 25 FPS
- **Container**: MP4 with fast start

## 🚀 Usage

The generated video demonstrates the complete PWA Conductores flow including:
1. Login and authentication
2. Cotizador flows (AGS, EdoMex Individual, EdoMex Colectivo)
3. Simulator scenarios (Ahorro, Liquidación, Planificador)
4. Configuration management (Dual-mode, Products)
5. AVI voice interview process

Perfect for stakeholder presentations and technical demos.
EOF

echo "📄 Reporte generado: $OUTPUT_DIR/concatenation-report.md"