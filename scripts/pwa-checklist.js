#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve('dist', 'conductores-pwa');
const OUTPUT_DIR = path.resolve('reports', 'pwa');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'checklist.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

function findFileByPatterns(baseDir, patterns) {
  for (const pat of patterns) {
    const full = path.join(baseDir, pat);
    if (fileExists(full)) return full;
  }
  return null;
}

function generateChecklist() {
  const manifestPath = findFileByPatterns(DIST_DIR, ['manifest.webmanifest', 'manifest.json']);
  const ngswPath = findFileByPatterns(DIST_DIR, ['ngsw.json']);
  const swPath = findFileByPatterns(DIST_DIR, ['ngsw-worker.js', 'service-worker.js']);

  const manifest = manifestPath ? readJSON(manifestPath) : null;

  const icons = manifest?.icons || [];
  const hasIcons = Array.isArray(icons) && icons.length > 0;
  const has192 = !!icons.find(i => /192x192/.test(i.sizes || ''));
  const has512 = !!icons.find(i => /512x512/.test(i.sizes || ''));

  const startUrlOk = typeof manifest?.start_url === 'string' && manifest.start_url.length > 0;
  const displayOk = typeof manifest?.display === 'string' && manifest.display.length > 0;
  const themeColorOk = typeof manifest?.theme_color === 'string' && manifest.theme_color.length > 0;
  const backgroundColorOk = typeof manifest?.background_color === 'string' && manifest.background_color.length > 0;

  const checklist = {
    generatedAt: new Date().toISOString(),
    distDir: DIST_DIR,
    items: [
      { id: 'manifest_exists', label: 'Manifest present', passed: !!manifestPath, details: manifestPath || 'not found' },
      { id: 'service_worker_exists', label: 'Service worker present', passed: !!(swPath || ngswPath), details: swPath || ngswPath || 'not found' },
      { id: 'icons_present', label: 'Icons present', passed: hasIcons, details: hasIcons ? `${icons.length} icons` : 'no icons' },
      { id: 'icon_192', label: 'Icon 192x192 present', passed: has192 },
      { id: 'icon_512', label: 'Icon 512x512 present', passed: has512 },
      { id: 'start_url', label: 'start_url defined', passed: startUrlOk, details: manifest?.start_url || '' },
      { id: 'display_mode', label: 'display mode set', passed: displayOk, details: manifest?.display || '' },
      { id: 'theme_color', label: 'theme_color set', passed: themeColorOk, details: manifest?.theme_color || '' },
      { id: 'background_color', label: 'background_color set', passed: backgroundColorOk, details: manifest?.background_color || '' },
    ],
  };

  checklist.summary = {
    passed: checklist.items.filter(i => i.passed).length,
    total: checklist.items.length,
  };

  return checklist;
}

function main() {
  ensureDir(OUTPUT_DIR);
  const checklist = generateChecklist();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(checklist, null, 2));
  console.log(`✅ PWA checklist generated at ${OUTPUT_FILE}`);
}

main();

