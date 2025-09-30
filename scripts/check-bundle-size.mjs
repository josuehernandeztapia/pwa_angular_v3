#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const CONFIG_PATH = path.resolve('.bundlesizerc');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[size-guard] Missing .bundlesizerc configuration.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const rules = Array.isArray(config.files) ? config.files : [];

if (!rules.length) {
  console.warn('[size-guard] No bundle size rules defined.');
  process.exit(0);
}

const UNIT_MAP = new Map([
  ['b', 1],
  ['kb', 1024],
  ['mb', 1024 * 1024],
  ['gb', 1024 * 1024 * 1024]
]);

const normalizeWildcardToRegex = (pattern) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexSource = `^${escaped.replace(/\*/g, '.*')}$`;
  return new RegExp(regexSource);
};

const parseSize = (raw) => {
  const match = String(raw).trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i);
  if (!match) {
    throw new Error(`Invalid maxSize value: ${raw}`);
  }
  const [, value, unit] = match;
  return Number(value) * (UNIT_MAP.get(unit.toLowerCase()) ?? 1);
};

let hasViolations = false;
const results = [];

for (const rule of rules) {
  if (!rule?.path || !rule?.maxSize) continue;
  const targetPath = path.resolve(rule.path);
  const dir = path.dirname(targetPath);
  const pattern = path.basename(rule.path);
  const regex = normalizeWildcardToRegex(pattern);

  if (!fs.existsSync(dir)) {
    console.warn(`[size-guard] Directory not found: ${dir}`);
    continue;
  }

  const matches = fs
    .readdirSync(dir)
    .filter((name) => regex.test(name))
    .map((name) => path.join(dir, name));

  if (!matches.length) {
    console.error(`[size-guard] No files matched pattern: ${rule.path}`);
    hasViolations = true;
    continue;
  }

  const maxBytes = parseSize(rule.maxSize);

  for (const filePath of matches) {
    const fileBuffer = fs.readFileSync(filePath);
    const compressed = rule.compression?.toLowerCase() === 'gzip'
      ? zlib.gzipSync(fileBuffer)
      : fileBuffer;

    const sizeBytes = compressed.length;
    const withinBudget = sizeBytes <= maxBytes;

    results.push({
      file: filePath,
      sizeBytes,
      maxBytes,
      withinBudget,
      compression: rule.compression ?? 'none'
    });

    if (!withinBudget) {
      hasViolations = true;
    }
  }
}

const toHuman = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
};

for (const result of results) {
  const status = result.withinBudget ? 'PASS' : 'FAIL';
  console.log(
    `[size-guard] ${status} ${result.file} (${toHuman(result.sizeBytes)} / ${toHuman(result.maxBytes)})` +
    (result.compression !== 'none' ? ` [${result.compression}]` : '')
  );
}

if (hasViolations) {
  console.error('[size-guard] Bundle size budget exceeded.');
  process.exit(1);
}

if (!results.length) {
  console.error('[size-guard] No bundle files evaluated. Check configuration.');
  process.exit(1);
}

console.log('[size-guard] All bundle size checks passed.');
