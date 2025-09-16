#!/bin/bash

# 🎥 PWA E2E DEMO VIDEO CONCATENATION SCRIPT
# QA Automation Engineer + DevOps Implementation
# Concatenates all Playwright test videos into a single demo video

set -e  # Exit on any error

echo "🎬 Starting PWA E2E Demo Video Concatenation..."
echo "================================================"

# Configuration
PLAYWRIGHT_VIDEOS_DIR="test-results"
OUTPUT_DIR="reports/videos"
TEMP_DIR="temp-video-processing"
FINAL_VIDEO="pwa-e2e-demo.mp4"
DEMO_TITLE="PWA Conductores - Complete E2E Demo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directories
echo "📁 Creating output directories..."
mkdir -p "$OUTPUT_DIR"
mkdir -p "$TEMP_DIR"

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ Error: ffmpeg is not installed or not in PATH${NC}"
    echo "Please install ffmpeg:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt-get install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

echo -e "${GREEN}✅ ffmpeg found: $(ffmpeg -version | head -n1)${NC}"

# Find all video files from Playwright tests
echo "🔍 Searching for Playwright video files..."

# Common Playwright video locations
VIDEO_PATHS=(
    "$PLAYWRIGHT_VIDEOS_DIR/**/videos/*.webm"
    "test-results/**/videos/*.webm"
    "test-results/**/login-flow-Complete-PWA-User-Journey-Professional-Demo-chromium/*.webm"
    "test-results/*chromium*/*.webm"
    "test-results/visual/*chromium*/*.webm"
)

# Find all video files
VIDEO_FILES=()
for pattern in "${VIDEO_PATHS[@]}"; do
    for file in $pattern; do
        if [[ -f "$file" ]]; then
            VIDEO_FILES+=("$file")
            echo -e "${BLUE}📹 Found: $file${NC}"
        fi
    done
done

# Check if we found any videos
if [[ ${#VIDEO_FILES[@]} -eq 0 ]]; then
    echo -e "${RED}❌ No video files found!${NC}"
    echo "Expected locations:"
    for pattern in "${VIDEO_PATHS[@]}"; do
        echo "  - $pattern"
    done
    echo ""
    echo "Make sure you ran Playwright tests with video recording enabled:"
    echo "  npm run test:e2e-demo"
    exit 1
fi

echo -e "${GREEN}✅ Found ${#VIDEO_FILES[@]} video file(s)${NC}"

# If only one video file, just copy it
if [[ ${#VIDEO_FILES[@]} -eq 1 ]]; then
    echo "📼 Single video found, copying to output..."
    cp "${VIDEO_FILES[0]}" "$OUTPUT_DIR/$FINAL_VIDEO"
    echo -e "${GREEN}✅ Demo video ready: $OUTPUT_DIR/$FINAL_VIDEO${NC}"
    exit 0
fi

# Create file list for ffmpeg concat
CONCAT_FILE="$TEMP_DIR/video_list.txt"
echo "📝 Creating video concatenation list..."

> "$CONCAT_FILE"  # Clear the file
for video in "${VIDEO_FILES[@]}"; do
    # Convert relative path to absolute for ffmpeg
    abs_path=$(realpath "$video")
    echo "file '$abs_path'" >> "$CONCAT_FILE"
    echo "  - Added: $(basename "$video")"
done

echo "📋 Video list created: $CONCAT_FILE"
cat "$CONCAT_FILE"

# Concatenate videos using ffmpeg
echo "🔄 Concatenating videos..."

# Method 1: Try concat demuxer (fastest, best quality)
echo "Attempting fast concatenation with concat demuxer..."
if ffmpeg -y \
    -f concat \
    -safe 0 \
    -i "$CONCAT_FILE" \
    -c copy \
    -avoid_negative_ts make_zero \
    "$OUTPUT_DIR/$FINAL_VIDEO" 2>/dev/null; then

    echo -e "${GREEN}✅ Fast concatenation successful!${NC}"
else
    echo -e "${YELLOW}⚠️ Fast concatenation failed, trying compatibility mode...${NC}"

    # Method 2: Re-encode for compatibility (slower but works with mismatched codecs)
    if ffmpeg -y \
        -f concat \
        -safe 0 \
        -i "$CONCAT_FILE" \
        -c:v libx264 \
        -c:a aac \
        -preset fast \
        -crf 18 \
        -pix_fmt yuv420p \
        -movflags +faststart \
        "$OUTPUT_DIR/$FINAL_VIDEO" 2>/dev/null; then

        echo -e "${GREEN}✅ Compatibility concatenation successful!${NC}"
    else
        echo -e "${RED}❌ Both concatenation methods failed!${NC}"
        echo "Manual concatenation required. Video files found at:"
        for video in "${VIDEO_FILES[@]}"; do
            echo "  - $video"
        done
        exit 1
    fi
fi

# Verify output file
if [[ -f "$OUTPUT_DIR/$FINAL_VIDEO" ]]; then
    # Get video info
    echo "📊 Final video information:"
    echo "=========================="

    FILESIZE=$(du -h "$OUTPUT_DIR/$FINAL_VIDEO" | cut -f1)
    echo "📁 File: $OUTPUT_DIR/$FINAL_VIDEO"
    echo "📏 Size: $FILESIZE"

    # Get duration if ffprobe is available
    if command -v ffprobe &> /dev/null; then
        DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_DIR/$FINAL_VIDEO" 2>/dev/null | cut -d. -f1)
        if [[ -n "$DURATION" && "$DURATION" != "N/A" ]]; then
            MINUTES=$((DURATION / 60))
            SECONDS=$((DURATION % 60))
            echo "⏱️ Duration: ${MINUTES}m ${SECONDS}s"
        fi
    fi

    echo ""
    echo -e "${GREEN}🎉 SUCCESS: PWA E2E Demo video created!${NC}"
    echo -e "${GREEN}📍 Location: $OUTPUT_DIR/$FINAL_VIDEO${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "1. This video will be uploaded as GitHub Actions artifact"
    echo "2. Download from Actions tab: https://github.com/your-repo/actions"
    echo "3. Look for 'pwa-e2e-demo' artifact in the latest workflow run"

else
    echo -e "${RED}❌ Final video file not found!${NC}"
    exit 1
fi

# Cleanup temp files
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}🎬 PWA E2E Demo Video Concatenation Complete!${NC}"
echo "================================================"
