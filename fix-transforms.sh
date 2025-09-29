#!/bin/bash

# Script to fix all transform violations for OpenAI compliance
# This script will replace all transform properties (except text-transform and transform-origin)
# with "transform: none; /* OpenAI no transforms */"

echo "Starting OpenAI Transform Compliance Fix..."
echo "Finding all production files with transform violations..."

# Find all production files (excluding tests, specs, and development files)
PRODUCTION_FILES=$(find /Users/josuehernandez/pwa_angular/src -name "*.scss" -o -name "*.css" -o -name "*.ts" -o -name "*.html" | \
  grep -v test | \
  grep -v spec | \
  grep -v node_modules | \
  grep -v .backup | \
  grep -v .broken | \
  grep -v .working)

echo "Processing production files for transform violations..."

# Count before
BEFORE_COUNT=$(echo "$PRODUCTION_FILES" | xargs rg "transform:" | grep -v "OpenAI no transforms" | grep -v "text-transform" | grep -v "transform-origin" | wc -l)
echo "Found $BEFORE_COUNT transform violations to fix"

# Process each file
for file in $PRODUCTION_FILES; do
  if rg -q "transform:" "$file"; then
    echo "Processing: $file"

    # Skip if file doesn't have violations or only has compliant transforms
    if ! rg -q "transform:" "$file" | grep -v "OpenAI no transforms" | grep -v "text-transform" | grep -v "transform-origin" >/dev/null 2>&1; then
      continue
    fi

    # Create temporary file
    temp_file=$(mktemp)

    # Process the file line by line
    while IFS= read -r line; do
      # Skip text-transform and transform-origin
      if echo "$line" | grep -q "text-transform\|transform-origin"; then
        echo "$line" >> "$temp_file"
      # Skip already compliant transforms
      elif echo "$line" | grep -q "transform:.*OpenAI no transforms"; then
        echo "$line" >> "$temp_file"
      # Fix transform violations
      elif echo "$line" | grep -q "transform:"; then
        # Extract the indentation
        indent=$(echo "$line" | sed 's/\(^[[:space:]]*\).*/\1/')
        echo "${indent}transform: none; /* OpenAI no transforms */" >> "$temp_file"
      else
        echo "$line" >> "$temp_file"
      fi
    done < "$file"

    # Replace original file
    mv "$temp_file" "$file"
  fi
done

# Count after
AFTER_COUNT=$(echo "$PRODUCTION_FILES" | xargs rg "transform:" | grep -v "OpenAI no transforms" | grep -v "text-transform" | grep -v "transform-origin" | wc -l)
FIXED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

echo "Transform compliance fix completed!"
echo "Fixed violations: $FIXED_COUNT"
echo "Remaining violations: $AFTER_COUNT"

# Final verification
if [ $AFTER_COUNT -eq 0 ]; then
  echo "✅ 100% OpenAI Transform Compliance achieved!"
else
  echo "⚠️  $AFTER_COUNT violations remain - manual review needed"
fi