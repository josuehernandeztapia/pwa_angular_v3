#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 4200);
const DIST_DIR = path.resolve(__dirname, '..', 'dist', 'conductores-pwa', 'browser');

if (!fs.existsSync(DIST_DIR)) {
  console.error(`[serve-prod] Dist directory not found: ${DIST_DIR}`);
  process.exit(1);
}

const INDEX_PATH = path.join(DIST_DIR, 'index.html');
let indexHtml = '';
try {
  indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
} catch (error) {
  console.error(`[serve-prod] Failed to read index.html: ${error.message}`);
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    console.error(`[serve-prod] Error streaming ${filePath}:`, error.message);
    res.writeHead(500);
    res.end('Internal server error');
  });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  // Serve static file if it exists
  const safePath = path.normalize(urlPath).replace(/^\/+/, '');
  let candidate = path.join(DIST_DIR, safePath);
  if (candidate.endsWith(path.sep)) {
    candidate = path.join(candidate, 'index.html');
  }

  if (candidate.startsWith(DIST_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return sendFile(res, candidate);
  }

  // SPA fallback to index.html
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(indexHtml);
});

server.on('listening', () => {
  console.log(`[serve-prod] Serving ${DIST_DIR} on http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('[serve-prod] Server error:', error.message);
  process.exit(1);
});

server.listen(PORT, HOST);
