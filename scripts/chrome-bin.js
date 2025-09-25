#!/usr/bin/env node
'use strict';

// Resolve a Chrome/Chromium binary path robustly across environments
try {
  // Prefer Puppeteer CommonJS path if available
  const puppeteer = require('puppeteer');
  if (puppeteer && typeof puppeteer.executablePath === 'function') {
    const p = puppeteer.executablePath();
    if (p) {
      console.log(p);
      process.exit(0);
    }
  }
} catch {}

try {
  // Fallback to Playwright Chromium
  const { chromium } = require('playwright');
  if (chromium && typeof chromium.executablePath === 'function') {
    const p = chromium.executablePath();
    if (p) {
      console.log(p);
      process.exit(0);
    }
  }
} catch {}

const fs = require('fs');
const candidates = [
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/opt/google/chrome/chrome'
].filter(Boolean);

for (const c of candidates) {
  try {
    if (c && fs.existsSync(c)) {
      console.log(c);
      process.exit(0);
    }
  } catch {}
}

// Nothing found; print empty and exit non-zero so callers can fallback
process.exit(1);

 

