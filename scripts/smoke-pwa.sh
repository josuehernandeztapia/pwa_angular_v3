#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PWA_URL:-}" ]]; then
  echo "Usage: PWA_URL=https://staging-pwa.example.com npm run smoke:pwa" >&2
  exit 1
fi

echo "🔎 PWA smoke at $PWA_URL"
curl -s -f "$PWA_URL/" >/dev/null && echo "/ OK"
curl -s -f "$PWA_URL/manifest.webmanifest" >/dev/null && echo "manifest OK"
curl -s -f "$PWA_URL/" | grep -qi '<app-root' && echo "app-root present"
echo "✅ PWA smoke passed"

