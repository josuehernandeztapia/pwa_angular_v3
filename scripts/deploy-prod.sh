#!/usr/bin/env bash
set -euo pipefail

# Deploy to production: QA → build → staging → smoke → provider deploy

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

echo "📦 Step 0: Ensuring npm is available"
command -v npm >/dev/null 2>&1 || { echo "npm not found"; exit 1; }

echo "🧩 Step 1: Install dependencies (clean)"
if [ -f package-lock.json ]; then npm ci; else npm install; fi

echo "🧹 Step 2: Clean audit"
npm run clean:audit || true

echo "✅ Step 3: Prebuild QA gate"
npm run prebuild:qa

echo "🏗️  Step 4: Production build"
npm run build:prod

APP_DIST="dist/conductores-pwa/browser"
if [ ! -d "$APP_DIST" ]; then
  echo "❌ Build output not found at $APP_DIST"; exit 1
fi

echo "⚖️  Step 5: Verify bundle size via bundlesize (if configured)"
if jq -e '.scripts["bundle:size-check"]' package.json >/dev/null 2>&1; then
  npm run bundle:size-check
else
  echo "ℹ️  bundlesize script not found. Skipping."
fi

echo "🧪 Step 6: Start staging preview and run smoke tests"
STAGING_PORT=4200
if command -v npx >/dev/null 2>&1; then
  npx http-server "$APP_DIST" -p "$STAGING_PORT" -c-1 >/tmp/staging-http.log 2>&1 &
  STAGING_PID=$!
  trap 'kill $STAGING_PID 2>/dev/null || true' EXIT
  echo "⏳ Waiting for http://localhost:$STAGING_PORT"
  npx wait-on "http://localhost:$STAGING_PORT" --timeout 60000
else
  echo "❌ npx not available for staging serve"; exit 1
fi

echo "🚬 Step 6.1: Run E2E smoke"
if jq -e '.scripts["test:e2e"]' package.json >/dev/null 2>&1; then
  npm run test:e2e || { echo "❌ E2E failed"; exit 1; }
else
  echo "ℹ️  test:e2e not defined. Skipping."
fi

echo "♿ Step 6.2: Run accessibility checks"
if jq -e '.scripts["test:a11y"]' package.json >/dev/null 2>&1; then
  npm run test:a11y
  if jq -e '.scripts["test:a11y:report"]' package.json >/dev/null 2>&1; then
    npm run test:a11y:report || true
  fi
else
  echo "ℹ️  test:a11y not defined. Skipping."
fi

echo "🧹 Step 6.3: Stop staging server"
kill "$STAGING_PID" 2>/dev/null || true
trap - EXIT

echo "📡 Step 7: Detect provider and deploy"
DEPLOYED=false
if [ -f firebase.json ] || jq -e '.dependencies["firebase"]' package.json >/dev/null 2>&1; then
  if command -v firebase >/dev/null 2>&1; then
    echo "⚙️  Deploying to Firebase Hosting"
    git checkout main && git pull origin main
    firebase deploy --only hosting
    DEPLOYED=true
  else
    echo "⚠️  Firebase CLI not installed. Skipping Firebase deploy."
  fi
fi

if [ "$DEPLOYED" = false ] && [ -f vercel.json ]; then
  if command -v vercel >/dev/null 2>&1; then
    echo "⚙️  Deploying with Vercel"
    git checkout main && git pull origin main
    vercel --prod --confirm
    DEPLOYED=true
  else
    echo "⚠️  Vercel CLI not installed. Skipping Vercel deploy."
  fi
fi

if [ "$DEPLOYED" = false ] && [ -f Dockerfile ]; then
  echo "🐳 Dockerfile found. Skipping auto-push; please use your registry/K8s pipeline."
fi

if [ "$DEPLOYED" = false ]; then
  echo "ℹ️  No recognized provider config found or CLI missing. Deployment step skipped."
fi

echo "✅ Done. Review reports in ./reports and CI status for AVI Threshold Tests."

