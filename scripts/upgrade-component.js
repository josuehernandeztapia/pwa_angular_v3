#!/usr/bin/env node
/**
 * Upgrade Component Script
 * Applies minimal, non-destructive premium class scaffolding hints to target components.
 * This is a scaffold utility; teams can extend per-component transformations.
 */

const fs = require('fs');
const path = require('path');

const componentKey = process.argv[2];
if (!componentKey) {
  console.error('Usage: node scripts/upgrade-component.js <component-key>');
  process.exit(1);
}

const SRC_ROOT = path.resolve(__dirname, '..', 'src', 'app');

// Map simple keys to glob-friendly search hints
const COMPONENT_HINTS = [
  'nueva-oportunidad',
  'flow-builder',
  'simulador-main',
  'delivery-phase',
  'documents-phase',
  'plates-phase',
  'cotizador-main',
  'opportunities-pipeline',
  'cliente-form',
  'avi-verification-modal',
  'document-upload-flow',
  'savings-projection-chart',
  'tanda-timeline',
  'scenario-card',
  'progress-bar',
  'guarantee-panel',
  'ops-deliveries',
  'delivery-detail',
  'triggers-monitor',
  'client-tracking'
];

if (!COMPONENT_HINTS.includes(componentKey)) {
  console.error(`Unknown component key: ${componentKey}`);
  process.exit(1);
}

function findFiles(dir, matcher) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(abs, matcher));
    } else if (matcher(abs)) {
      results.push(abs);
    }
  }
  return results;
}

// Find target component TypeScript files
const candidates = findFiles(SRC_ROOT, (p) => p.endsWith('.component.ts') && p.includes(componentKey));

if (candidates.length === 0) {
  console.error(`No component found for key: ${componentKey}`);
  process.exit(1);
}

const target = candidates[0];
const original = fs.readFileSync(target, 'utf8');

// Attempt to inject premium container class to top-level wrapper in inline template
let updated = original;

if (original.includes('template: `')) {
  updated = updated.replace(
    /template:\s*`([\s\S]*?)`/,
    (match, tpl) => {
      // Heuristic: wrap first top-level <div ...> with premium-container class if missing
      const injected = tpl.replace(
        /<div(\s+[^>]*)?>/,
        (divMatch) => {
          if (divMatch.includes('premium-container')) return divMatch;
          if (divMatch.includes('class="')) {
            return divMatch.replace('class="', 'class="premium-container ');
          }
          return divMatch.replace('<div', '<div class="premium-container"');
        }
      );
      return `template: ` + '`' + injected + '`';
    }
  );
}

if (updated !== original) {
  fs.writeFileSync(target, updated, 'utf8');
  console.log(`✅ Premium scaffold applied to: ${path.relative(process.cwd(), target)}`);
} else {
  console.log(`ℹ️ No inline template changes applied for: ${path.relative(process.cwd(), target)} (possibly external template)`);
}

process.exit(0);

