#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const COMPONENTS_DIR = path.join(ROOT, 'src', 'app', 'components');
const ROUTES_FILE = path.join(ROOT, 'src', 'app', 'app.routes.ts');
const routesContent = fs.existsSync(ROUTES_FILE) ? fs.readFileSync(ROUTES_FILE, 'utf8') : '';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function extractSelector(content) {
  const match = content.match(/selector:\s*'([^']+)'/);
  return match ? match[1] : null;
}

function extractClassName(content) {
  const match = content.match(/^export\s+class\s+(\w+)/m);
  return match ? match[1] : null;
}

function isComponent(content) {
  return /@Component\(/.test(content);
}

function mapToRoutesUsage(relPath) {
  if (!routesContent) return null;
  const candidate = './' + relPath.replace('src/app/', '').replace(/\.ts$/, '');
  if (routesContent.includes(candidate)) {
    return `app.routes.ts::${candidate}`;
  }
  return null;
}

function audit() {
  const report = [];
  const files = walk(COMPONENTS_DIR);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!isComponent(content)) continue;
    const selector = extractSelector(content);
    if (!selector) continue;

    const relPath = path.relative(ROOT, file);
    const rg = spawnSync('rg', ['--files-with-matches', `<${selector}`, 'src/app'], { encoding: 'utf8' });
    if (rg.error) {
      console.error(`Failed to run rg for ${selector}`, rg.error);
      continue;
    }
    const hits = new Set(
      rg.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
    );
    hits.delete(relPath);

    const routeUsage = mapToRoutesUsage(relPath);
    if (routeUsage) {
      hits.add(routeUsage);
    }

    report.push({ selector, file: relPath, usageCount: hits.size, usages: Array.from(hits).sort() });
  }

  console.log(JSON.stringify(report, null, 2));
}

audit();
