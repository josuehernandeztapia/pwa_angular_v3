#!/usr/bin/env node
// Minimal icon generation placeholder: ensures required files exist
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src', 'assets', 'icons');

const requiredIcons = [
  'icon-72x72.png',
  'icon-96x96.png',
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-152x152.png',
  'icon-192x192.png',
  'icon-384x384.png',
  'icon-512x512.png',
  'shortcut-new.png',
  'shortcut-quote.png',
  'shortcut-clients.png'
];

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create simple 1x1 PNG placeholders if missing (base64 transparent pixel)
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgMBgslpWl8AAAAASUVORK5CYII=',
  'base64'
);

let created = 0;
requiredIcons.forEach((name) => {
  const dest = path.join(iconsDir, name);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, transparentPng);
    created++;
  }
});

console.log(`App icons check complete. Created ${created} placeholder icon(s) in ${iconsDir}`);

