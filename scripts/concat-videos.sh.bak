#!/bin/bash

# 🎬 PWA E2E Video Concatenation Script - Co-founder + QA Implementation
# Concatena todos los videos de Playwright en un demo profesional

set -e

echo "🎬 Starting PWA E2E Demo Video Concatenation..."
echo "=============================================="

# Directorios
VIDEO_DIR="test-results"
OUTPUT_DIR="reports/videos"
FINAL_VIDEO="pwa-e2e-demo.mp4"

# Crear directorios
mkdir -p "$OUTPUT_DIR"

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

# Buscar videos .webm
echo "🔍 Buscando videos E2E..."
VIDEOS=$(find "$VIDEO_DIR" -name "*.webm" -type f 2>/dev/null || true)

if [ -z "$VIDEOS" ]; then
    echo "❌ No se encontraron videos .webm en $VIDEO_DIR"
    echo "Buscando en ubicaciones alternativas..."
    VIDEOS=$(find . -name "*.webm" -type f -not -path "./node_modules/*" 2>/dev/null || true)
fi

if [ -z "$VIDEOS" ]; then
    echo "❌ No hay videos para concatenar"
    exit 1
fi

echo "📹 Videos encontrados:"
echo "$VIDEOS" | while read video; do
    echo "  - $video"
done

# Crear lista temporal para FFmpeg
CONCAT_FILE="temp_video_list.txt"
rm -f "$CONCAT_FILE"

echo "$VIDEOS" | while read video; do
    if [ -f "$video" ]; then
        echo "file '$PWD/$video'" >> "$CONCAT_FILE"
    fi
done

# Verificar que hay contenido en la lista
if [ ! -s "$CONCAT_FILE" ]; then
    echo "❌ No se pudo crear lista de concatenación"
    exit 1
fi

echo "📋 Lista de concatenación creada:"
cat "$CONCAT_FILE"

# Concatenar videos
echo "🔄 Concatenando videos..."
ffmpeg -y -f concat -safe 0 -i "$CONCAT_FILE" \
    -c:v libx264 -preset fast -crf 18 \
    -c:a aac -b:a 128k \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "$OUTPUT_DIR/$FINAL_VIDEO"

# Cleanup
rm -f "$CONCAT_FILE"

# Verificar resultado
if [ -f "$OUTPUT_DIR/$FINAL_VIDEO" ]; then
    SIZE=$(du -h "$OUTPUT_DIR/$FINAL_VIDEO" | cut -f1)
    DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_DIR/$FINAL_VIDEO" 2>/dev/null | cut -d. -f1)
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    echo "🎉 ¡Video demo creado exitosamente!"
    echo "================================="
    echo "📁 Archivo: $OUTPUT_DIR/$FINAL_VIDEO"
    echo "📏 Tamaño: $SIZE"
    echo "⏱️ Duración: ${MINUTES}m ${SECONDS}s"
    echo ""
    echo "🚀 Listo para subir como artifact de GitHub Actions"
else
    echo "❌ Error: No se pudo crear el video final"
    exit 1
fi