#!/bin/bash

# 🎬 PWA E2E Individual Video Creation Script
# Creates separate titled videos for each of the 7 flows
# QA Automation Engineer + DevOps Implementation

set -e

echo "🎬 Starting Individual Flow Videos Creation..."
echo "============================================="

# Directorios
VIDEO_DIR="test-results"
OUTPUT_DIR="reports/videos"
INDIVIDUAL_DIR="$OUTPUT_DIR/individual"

# Crear directorio para videos individuales
mkdir -p "$INDIVIDUAL_DIR"

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

# Definir configuración de flujos con títulos descriptivos
declare -a FLOWS=(
    "login-flow:🚀 Login & Authentication:Login and authentication flow"
    "cotizador-ags:💰 Cotizador AGS (25.5%):Aguascalientes insurance quotation with 25.5% rate"
    "cotizador-edomex:💰 Cotizador EdoMex (29.9%):Estado de México individual insurance with 29.9% high-risk rate"
    "cotizador-edomex-colectivo:🏢 Cotizador EdoMex Colectivo (32.5%):Estado de México collective insurance with 32.5% rate and group benefits"
    "simulador-ags:📊 Simulador AGS:Aguascalientes simulator with Ahorro and Liquidación scenarios"
    "simulador-edomex-individual:📊 Simulador EdoMex Individual:Estado de México individual simulator scenarios"
    "simulador-edomex-colectivo:📊 Simulador EdoMex Colectivo:Estado de México collective simulator scenarios"
    "configuracion-flujos:⚙️ Configuración Dual-Mode:Configuration management and dual-mode cotizador setup"
    "avi-flow:🎤 AVI Voice Interview:AVI voice interview process with GO decision"
)

# Función para crear video individual con título
create_individual_video() {
    local flow_key="$1"
    local title="$2"
    local description="$3"
    local input_video="$4"

    if [ ! -f "$input_video" ]; then
        echo "  ❌ Video not found: $input_video"
        return 1
    fi

    local output_video="$INDIVIDUAL_DIR/${flow_key}.mp4"
    local temp_title_video="/tmp/title_${flow_key}.mp4"

    echo "  🎬 Creating: $title"

    # Obtener duración del video original
    local duration=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input_video" 2>/dev/null | cut -d. -f1)

    # Crear video de título (3 segundos)
    ffmpeg -y -f lavfi -i color=c=#1565C0:size=1280x720:duration=3 \
        -vf "drawtext=text='$title':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2-50:fontfile=/System/Library/Fonts/Helvetica.ttc,drawtext=text='$description':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+50:fontfile=/System/Library/Fonts/Helvetica.ttc" \
        -pix_fmt yuv420p "$temp_title_video" 2>/dev/null

    # Concatenar título + video original
    echo "file '$temp_title_video'" > "/tmp/concat_${flow_key}.txt"
    echo "file '$PWD/$input_video'" >> "/tmp/concat_${flow_key}.txt"

    ffmpeg -y -f concat -safe 0 -i "/tmp/concat_${flow_key}.txt" \
        -c:v libx264 -preset fast -crf 23 \
        -c:a aac -b:a 128k \
        -pix_fmt yuv420p \
        -movflags +faststart \
        "$output_video" 2>/dev/null

    # Cleanup temporal files
    rm -f "$temp_title_video" "/tmp/concat_${flow_key}.txt"

    if [ -f "$output_video" ]; then
        local size=$(du -h "$output_video" | cut -f1)
        local total_duration=$((duration + 3))
        local minutes=$((total_duration / 60))
        local seconds=$((total_duration % 60))
        echo "    ✅ Created: $(basename "$output_video") (${minutes}m ${seconds}s, $size)"
        return 0
    else
        echo "    ❌ Failed to create: $flow_key"
        return 1
    fi
}

# Procesar cada flujo
echo ""
echo "🔍 Searching and processing individual flows..."
echo "=============================================="

created_count=0
total_flows=${#FLOWS[@]}

for flow_config in "${FLOWS[@]}"; do
    IFS=':' read -r flow_key title description <<< "$flow_config"

    echo "📹 Processing flow: $flow_key"

    # Buscar videos que coincidan con el flujo
    FLOW_VIDEOS=$(find "$VIDEO_DIR" -name "*.webm" -path "*${flow_key}*" 2>/dev/null || true)

    if [ ! -z "$FLOW_VIDEOS" ]; then
        # Tomar el primer video encontrado
        VIDEO_FILE=$(echo "$FLOW_VIDEOS" | head -1)

        if create_individual_video "$flow_key" "$title" "$description" "$VIDEO_FILE"; then
            ((created_count++))
        fi
    else
        echo "  ⚠️ No video found for: $flow_key"
    fi

    echo ""
done

# Crear índice HTML para visualización
echo "📄 Creating video index..."
cat > "$INDIVIDUAL_DIR/index.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>🎬 PWA Conductores - Individual E2E Flow Videos</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #1565C0; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .video-card { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .video-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1565C0; }
        .video-description { font-size: 14px; color: #666; margin-bottom: 15px; }
        video { width: 100%; border-radius: 4px; }
        .stats { margin-top: 10px; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 PWA Conductores - Individual E2E Flow Videos</h1>
            <p>Individual demonstration videos for each business flow</p>
            <p><strong>Generated:</strong> $(date)</p>
            <p><strong>Videos Created:</strong> $created_count of $total_flows flows</p>
        </div>

        <div class="video-grid">
EOF

# Agregar cada video al índice HTML
for flow_config in "${FLOWS[@]}"; do
    IFS=':' read -r flow_key title description <<< "$flow_config"

    video_file="$INDIVIDUAL_DIR/${flow_key}.mp4"
    if [ -f "$video_file" ]; then
        size=$(du -h "$video_file" | cut -f1)
        cat >> "$INDIVIDUAL_DIR/index.html" << EOF
            <div class="video-card">
                <div class="video-title">$title</div>
                <div class="video-description">$description</div>
                <video controls>
                    <source src="${flow_key}.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="stats">
                    File: ${flow_key}.mp4 | Size: $size
                </div>
            </div>
EOF
    fi
done

cat >> "$INDIVIDUAL_DIR/index.html" << EOF
        </div>
    </div>
</body>
</html>
EOF

# Resumen final
echo "🎉 Individual Videos Creation Complete!"
echo "======================================"
echo "📁 Videos Directory: $INDIVIDUAL_DIR"
echo "🌐 Video Index: $INDIVIDUAL_DIR/index.html"
echo "📊 Created Videos: $created_count of $total_flows flows"
echo ""

echo "✅ Individual videos created:"
for video_file in "$INDIVIDUAL_DIR"/*.mp4; do
    if [ -f "$video_file" ]; then
        basename_file=$(basename "$video_file")
        size=$(du -h "$video_file" | cut -f1)
        echo "  • $basename_file ($size)"
    fi
done

echo ""
echo "🚀 Videos ready for individual review and stakeholder presentations"