#!/usr/bin/env node
/*
  Clean Audit Script for Conductores PWA
  - Scans src/ for TODO, FIXME, HACK, DEPRECATED, console.log, mock/demo refs
  - Lists files > 500KB under src/
  - With --fix: removes matching lines (replaces with // removed by clean-audit)
  - Emits Markdown report to stdout
  - Exit codes: 0 if clean or fixed with --fix, 1 if issues found without --fix
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const FIX_MODE = process.argv.includes('--fix');

/** Patterns to detect */
const issuePatterns = [
  { name: 'TODO', regex: /\bTODO\b/i },
  { name: 'FIXME', regex: /\bFIXME\b/i },
  { name: 'HACK', regex: /\bHACK\b/i },
  { name: 'DEPRECATED', regex: /\bDEPRECATED\b/i },
  { name: 'console.log', regex: /\bconsole\.(log|debug|info|warn|error)\s*\(/ },
  { name: 'mock/demo', regex: /\b(mock|mocks|demo|stub|fixture)s?\b/i },
];

/** File extensions to inspect */
const allowedExtensions = new Set(['.ts', '.js', '.tsx', '.jsx', '.html', '.scss', '.css']);

/** Max file size in bytes: 500KB */
const LARGE_FILE_BYTES = 500 * 1024;

/** Ignore directories */
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.output']);

function isTextFile(filePath) {
  return allowedExtensions.has(path.extname(filePath));
}

function walk(dirPath, fileList = []) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    return fileList;
  }
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        walk(full, fileList);
      } else if (entry.isFile()) {
        fileList.push(full);
      }
    } catch (_) {
      // skip unreadable entries
    }
  }
  return fileList;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of issuePatterns) {
      if (p.regex.test(line)) {
        findings.push({ lineNumber: i + 1, type: p.name, text: line });
      }
    }
  }
  return { findings, lines };
}

function applyFixes(filePath, lines, findings) {
  // Build a set of line numbers to replace
  const linesToReplace = new Set(findings.map(f => f.lineNumber));
  let modified = false;
  const newLines = lines.map((line, idx) => {
    const lineNumber = idx + 1;
    if (linesToReplace.has(lineNumber)) {
      modified = true;
      return '// removed by clean-audit';
    }
    return line;
  });
  if (modified) {
    // Ensure a trailing audit comment trail (once per file)
    if (newLines.length === 0 || !/removed by clean-audit/.test(newLines[newLines.length - 1])) {
      newLines.push('// removed by clean-audit');
    }
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  }
  return modified;
}

function humanBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('src/ directory not found.');
    process.exit(0);
  }

  const allFiles = walk(SRC_DIR);
  const textFiles = allFiles.filter(isTextFile);
  const largeFiles = allFiles
    .filter(p => {
      try {
        return fs.statSync(p).size > LARGE_FILE_BYTES;
      } catch (_) {
        return false;
      }
    })
    .map(p => ({ path: p, size: fs.statSync(p).size }))
    .sort((a, b) => b.size - a.size);

  let totalFindings = 0;
  let totalFixed = 0;
  const fileReports = [];
  const modifiedFiles = [];

  for (const filePath of textFiles) {
    const { findings, lines } = scanFile(filePath);
    if (findings.length > 0) {
      totalFindings += findings.length;
      let fixedInFile = 0;
      if (FIX_MODE) {
        const modified = applyFixes(filePath, lines, findings);
        if (modified) {
          fixedInFile = findings.length;
          totalFixed += fixedInFile;
          modifiedFiles.push(filePath);
        }
      }
      fileReports.push({ filePath, findings, fixedInFile });
    }
  }

  // Markdown report
  const isClean = totalFindings === 0;
  const statusIcon = isClean ? '✅' : (FIX_MODE && totalFixed > 0 ? '✅' : '⚠️');
  const lines = [];
  lines.push(`# Clean Audit Report ${statusIcon}`);
  lines.push('');
  lines.push('## Resumen');
  lines.push(`- Total de incidencias detectadas: ${totalFindings}`);
  lines.push(`- Total de incidencias corregidas: ${FIX_MODE ? totalFixed : 0}`);
  lines.push(`- Archivos grandes (>500KB): ${largeFiles.length}`);
  lines.push('');

  lines.push('## Archivos modificados');
  if (modifiedFiles.length === 0) {
    lines.push('- Ninguno');
  } else {
    for (const f of modifiedFiles) {
      lines.push(`- ${path.relative(ROOT, f)}`);
    }
  }
  lines.push('');

  lines.push('## Archivos grandes');
  if (largeFiles.length === 0) {
    lines.push('- Ninguno');
  } else {
    for (const lf of largeFiles) {
      lines.push(`- ${path.relative(ROOT, lf.path)} (${humanBytes(lf.size)})`);
    }
  }
  lines.push('');

  lines.push('## Acciones recomendadas');
  if (isClean) {
    lines.push('- Mantener consistencia. Integrar el hook pre-commit para prevenir regresiones.');
  } else if (FIX_MODE) {
    lines.push('- Revisar cambios automáticos. Ejecutar tests y commitear.');
  } else {
    lines.push('- Ejecutar "npm run clean:audit:fix" o corregir manualmente y reintentar.');
  }
  lines.push('');

  // Optional detailed section (collapsed if needed by consumers)
  if (fileReports.length > 0) {
    lines.push('## Detalle por archivo');
    for (const rep of fileReports) {
      lines.push(`- ${path.relative(ROOT, rep.filePath)}: ${rep.findings.length} incidencias${FIX_MODE ? `, corregidas: ${rep.fixedInFile}` : ''}`);
    }
    lines.push('');
  }

  // Print report
  console.log(lines.join('\n'));

  // Exit code logic
  if (!FIX_MODE && totalFindings > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
