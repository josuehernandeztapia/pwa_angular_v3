#!/bin/bash

# Script to fix transform violations in SCSS/CSS files
echo "Fixing transform violations in SCSS/CSS files..."

# Find SCSS and CSS files with transform violations
STYLE_FILES=$(find /Users/josuehernandez/pwa_angular/src -name "*.scss" -o -name "*.css" | grep -v node_modules)

for file in $STYLE_FILES; do
  if grep -q "transform:" "$file" && ! grep -q "text-transform\|transform-origin" "$file"; then
    # Check if file has non-compliant transforms
    if grep "transform:" "$file" | grep -v "OpenAI no transforms" > /dev/null; then
      echo "Processing: $file"

      # Use sed to replace non-compliant transform properties
      sed -i '' '/text-transform:/!s/transform: [^;]*;/transform: none; \/\* OpenAI no transforms \*\//g' "$file"
      sed -i '' '/transform-origin:/!s/transform: [^}]*}/transform: none; \/\* OpenAI no transforms \*\/}/g' "$file"
    fi
  fi
done

echo "SCSS/CSS transform violations fixed!"