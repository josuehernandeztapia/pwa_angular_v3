# Dockerfile - Conductores PWA (Mobility Tech Platform)
# Multi-stage build for optimized production image

# Stage 1: Build the Angular application
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with npm ci (faster, more reliable)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build production bundle
RUN npm run build:prod

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config (if exists)
COPY nginx.conf /etc/nginx/nginx.conf 2>/dev/null || true

# Copy built application from build stage
COPY --from=build /app/dist/conductores-pwa /usr/share/nginx/html

# Copy PWA assets and manifest
COPY --from=build /app/dist/conductores-pwa/ngsw-worker.js /usr/share/nginx/html/ 2>/dev/null || true
COPY --from=build /app/dist/conductores-pwa/manifest.webmanifest /usr/share/nginx/html/ 2>/dev/null || true

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
