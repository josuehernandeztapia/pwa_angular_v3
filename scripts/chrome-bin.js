#!/usr/bin/env node

async function resolveChromeBin() {
  try {
    // Try Puppeteer first
    const puppeteer = require('puppeteer');
    if (puppeteer && typeof puppeteer.executablePath === 'function') {
      console.log(puppeteer.executablePath());
      return;
    }
  } catch {}

  try {
    // Fallback to Playwright Chromium
    const { chromium } = require('playwright');
    if (chromium && typeof chromium.executablePath === 'function') {
      console.log(chromium.executablePath());
      return;
    }
  } catch {}

  // Final fallback: empty (system Chrome expected)
  console.log('');
}

resolveChromeBin();

