#!/bin/bash

# Image optimization script - convert PNG to WebP and implement lazy loading

echo "🖼️  Starting image optimization..."

# Check if cwebp is available (install with: brew install webp or apt-get install webp)
if ! command -v cwebp &> /dev/null; then
    echo "❌ cwebp not found. Installing webp tools..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install webp
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y webp
    else
        echo "⚠️  Please install webp tools manually"
        exit 1
    fi
fi

# Create WebP versions of PNG icons (preserve originals for fallback)
echo "📦 Converting PNG icons to WebP..."

ICONS_DIR="src/assets/icons"
cd "$ICONS_DIR"

for png_file in *.png; do
    if [[ -f "$png_file" ]]; then
        webp_file="${png_file%.png}.webp"
        echo "  Converting: $png_file -> $webp_file"
        cwebp -q 85 "$png_file" -o "$webp_file"
    fi
done

cd - > /dev/null

echo "✅ Icon optimization complete!"

# Create examples directory if it doesn't exist for the photo wizard
mkdir -p src/assets/examples

# Create placeholder example images (1x1 pixel WebP placeholders for development)
echo "📸 Creating example image placeholders..."

EXAMPLES=(
    "plate-example"
    "vin-example"
    "odometer-example"
    "evidence-example"
)

cd src/assets/examples

for example in "${EXAMPLES[@]}"; do
    # Create 1x1 transparent WebP placeholder (tiny file for fast loading)
    echo "  Creating: ${example}.webp"
    cwebp -size 50 -preset photo -q 20 <(convert xc:transparent -resize 200x150 png:-) -o "${example}.webp" 2>/dev/null || {
        # Fallback: create minimal WebP
        python3 -c "
import base64
webp_data = base64.b64decode('UklGRioAAABXRUJQVlA4TB0AAAAvAAAAEAcQERGIiP4HAA==')
with open('${example}.webp', 'wb') as f: f.write(webp_data)
        "
    }
done

cd - > /dev/null

echo "✅ Image optimization complete!"
echo ""
echo "📊 Summary:"
echo "  • Converted PNG icons to WebP format"
echo "  • Created WebP placeholders for example images"
echo "  • Next: Update components to use WebP with PNG fallback"
echo "  • Next: Implement lazy loading for images"