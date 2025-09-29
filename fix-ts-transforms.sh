#!/bin/bash

# Script to fix transform violations in TypeScript files
echo "Fixing transform violations in TypeScript files..."

# Find TypeScript files with transform violations
TS_FILES=$(find /Users/josuehernandez/pwa_angular/src -name "*.ts" | grep -v test | grep -v spec | grep -v node_modules)

for file in $TS_FILES; do
  if grep -q "transform:" "$file" && ! grep -q "text-transform\|transform-origin" "$file"; then
    echo "Processing: $file"

    # Use sed to replace transform properties while preserving indentation and structure
    sed -i '' 's/transform: [^;]*;/transform: none; \/\* OpenAI no transforms \*\//g' "$file"
    sed -i '' 's/transform: [^}]*}/transform: none; \/\* OpenAI no transforms \*\/}/g' "$file"
  fi
done

echo "TypeScript transform violations fixed!"