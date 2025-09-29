#!/bin/bash

# Script to clean all emojis from PWA Angular codebase
# This script processes TypeScript, JavaScript, HTML, SCSS, CSS, Markdown, JSON, YAML, and Shell files

echo "[INIT] Starting emoji cleanup for PWA Angular codebase..."

# Define emoji mappings
declare -A emoji_map
emoji_map["🚀"]="LAUNCH"
emoji_map["🎯"]="TARGET"
emoji_map["💡"]="IDEA"
emoji_map["✨"]="SPARKLE"
emoji_map["🔥"]="HOT"
emoji_map["⚡"]="FAST"
emoji_map["🎉"]="CELEBRATE"
emoji_map["🎊"]="PARTY"
emoji_map["🏆"]="WINNER"
emoji_map["✅"]="SUCCESS"
emoji_map["❌"]="ERROR"
emoji_map["⚠️"]="WARNING"
emoji_map["📝"]="NOTE"
emoji_map["📋"]="CHECKLIST"
emoji_map["🔧"]="TOOLS"
emoji_map["🛠️"]="BUILD"
emoji_map["⭐"]="STAR"
emoji_map["💯"]="PERFECT"
emoji_map["👍"]="GOOD"
emoji_map["👎"]="BAD"
emoji_map["🎨"]="ART"
emoji_map["📦"]="PACKAGE"
emoji_map["🚨"]="ALERT"
emoji_map["🔍"]="SEARCH"
emoji_map["💻"]="COMPUTER"
emoji_map["📱"]="MOBILE"
emoji_map["🌟"]="SHINE"
emoji_map["✓"]="[OK]"
emoji_map["✗"]="[NO]"
emoji_map["✕"]="X"
emoji_map["➕"]="+"
emoji_map["🔼"]="UP"
emoji_map["🔽"]="DOWN"
emoji_map["🇲🇽"]="MX"
emoji_map["💳"]="CARD"
emoji_map["🎤"]="MIC"
emoji_map["📅"]="DATE"
emoji_map["🤝"]="HANDSHAKE"
emoji_map["⚪"]="WAIT"
emoji_map["🚐"]="VAN"
emoji_map["🗒️"]="NOTES"
emoji_map["🚫"]="FORBIDDEN"
emoji_map["💬"]="CHAT"
emoji_map["✉️"]="EMAIL"
emoji_map["🏭"]="FACTORY"
emoji_map["🚢"]="SHIP"
emoji_map["❓"]="?"
emoji_map["🎚️"]="SLIDER"
emoji_map["📊"]="CHART"
emoji_map["🔄"]="REFRESH"
emoji_map["⏰"]="TIME"
emoji_map["🎪"]="TENT"
emoji_map["🎭"]="THEATER"
emoji_map["🎬"]="MOVIE"
emoji_map["🎵"]="MUSIC"
emoji_map["🎶"]="NOTE"
emoji_map["🎤"]="MIC"
emoji_map["🎧"]="HEADPHONE"
emoji_map["🎸"]="GUITAR"
emoji_map["🎺"]="TRUMPET"
emoji_map["🎻"]="VIOLIN"
emoji_map["🥁"]="DRUM"
emoji_map["🎹"]="PIANO"

# Function to clean emojis from a file
clean_file() {
    local file="$1"
    local temp_file=$(mktemp)

    echo "Processing: $file"

    # Copy original to temp
    cp "$file" "$temp_file"

    # Replace emojis
    for emoji in "${!emoji_map[@]}"; do
        replacement="${emoji_map[$emoji]}"
        # Use perl for better Unicode handling
        perl -i -pe "s/\Q$emoji\E/$replacement/g" "$temp_file"
    done

    # Check if file was modified
    if ! cmp -s "$file" "$temp_file"; then
        cp "$temp_file" "$file"
        echo "  [MODIFIED] File: $file"
    fi

    rm "$temp_file"
}

# Process all relevant files
echo "Finding files to process..."

# Find all files with specific extensions
find /Users/josuehernandez/pwa_angular -type f \( \
    -name "*.ts" -o \
    -name "*.js" -o \
    -name "*.html" -o \
    -name "*.scss" -o \
    -name "*.css" -o \
    -name "*.md" -o \
    -name "*.sh" -o \
    -name "*.json" -o \
    -name "*.yml" -o \
    -name "*.yaml" \
\) | while read -r file; do
    # Check if file contains emojis before processing
    if grep -qP '[\x{1F000}-\x{1F9FF}]|[\x{2600}-\x{26FF}]|[\x{2700}-\x{27BF}]|🚀|🎯|💡|✨|🔥|⚡|🎉|🎊|🏆|✅|❌|⚠️|📝|📋|🔧|🛠️|⭐|💯|👍|👎|🎨|📦|🚨|🔍|💻|📱|🌟|✓|✗|✕|➕|🔼|🔽|🇲🇽|💳|🎤|📅|🤝|⚪|🚐|🗒️|🚫|💬|✉️|🏭|🚢|❓|🎚️|📊' "$file" 2>/dev/null; then
        clean_file "$file"
    fi
done

echo "[COMPLETE] Emoji cleanup completed!"