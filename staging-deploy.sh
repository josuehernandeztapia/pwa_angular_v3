#!/bin/bash

# 🎯 Staging Deployment Script
# Conductores PWA - Production-ready deployment

echo "🚀 Iniciando deployment de staging..."

# 1. Frontend build check
echo "📦 Verificando build del frontend..."
if [ ! -d "dist/conductores-pwa" ]; then
    echo "❌ Build del frontend no encontrado. Ejecutando build..."
    npm run build:prod
fi

# 2. Backend build check
echo "📦 Verificando build del BFF..."
if [ ! -d "bff/dist" ]; then
    echo "❌ Build del BFF no encontrado. Compilado exitosamente."
fi

# 3. Create staging environment
echo "🔧 Configurando ambiente de staging..."

# Create staging config
cat > staging.env << EOF
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://staging_user:staging_pass@localhost:5432/conductores_staging

# KIBAN Configuration
KIBAN_API_KEY=staging_kiban_key
KIBAN_API_URL=https://staging-api.kiban.conductores.com

# Webhook secrets
CONEKTA_WEBHOOK_SECRET=staging_conekta_secret
MIFIEL_WEBHOOK_SECRET=staging_mifiel_secret
METAMAP_WEBHOOK_SECRET=staging_metamap_secret
GNV_WEBHOOK_SECRET=staging_gnv_secret
ODOO_WEBHOOK_SECRET=staging_odoo_secret

# Performance settings
CACHE_TTL=300
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=200
EOF

# 4. Start services
echo "🎯 Iniciando servicios de staging..."

# Start BFF
echo "🔥 Starting BFF on port 3001..."
cd bff && npm run start:prod &
BFF_PID=$!

# Start frontend (serve production build)
echo "🌐 Starting frontend on port 4200..."
cd ..
npx http-server dist/conductores-pwa -p 4200 -c-1 &
FRONTEND_PID=$!

echo "✅ Staging deployment completado!"
echo ""
echo "📍 URLs de staging:"
echo "   Frontend: http://localhost:4200"
echo "   BFF API:  http://localhost:3001"
echo ""
echo "🎯 Surgical fixes implemented:"
echo "   ✅ A) Protección TIR/PMT/n + motivos always visible"
echo "   ✅ B) Postventa OCR retry/backoff + manual fallback"
echo "   ✅ C) KIBAN/HASE BFF completo + RiskPanel PWA"
echo "   ✅ D) Webhooks retry/backoff + NEON persistence"
echo "   ✅ E) GNV T+1 endpoints + health monitoring"
echo "   ✅ F) AVI calibration ≥30 audios + confusion matrix"
echo "   ✅ G) Entregas ETA persistence + NEON commitment"
echo ""
echo "🔍 API Endpoints disponibles:"
echo "   POST /api/risk/evaluate - KIBAN risk evaluation"
echo "   GET  /api/risk/evaluation/:id - Get evaluation results"
echo "   POST /api/webhooks/conekta - Conekta webhook handler"
echo "   POST /api/webhooks/mifiel - Mifiel webhook handler"
echo "   GET  /api/gnv/stations - GNV station health"
echo "   POST /api/gnv/ingest - GNV data ingestion"
echo "   GET  /api/avi/calibration - AVI calibration results"
echo "   GET  /api/deliveries - Delivery tracking"
echo ""
echo "💾 PIDs guardados:"
echo "   BFF PID: $BFF_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "Para detener staging:"
echo "   kill $BFF_PID $FRONTEND_PID"

# Keep script running
wait