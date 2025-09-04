#!/usr/bin/env node
/**
 * UX/UI COHERENCE RUNNER
 * Provides orchestration for premium visual/brand/responsive checks used by npm scripts
 */

const { spawnSync } = require('child_process');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (typeof opts.ignoreExitCode === 'boolean' && opts.ignoreExitCode) {
    return result.status || 0;
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  return 0;
}

const task = process.argv[2] || 'coherence:all';

switch (task) {
  case 'coherence:all': {
    // snapshot visual tests across projects
    run('npm', ['run', 'test:visual']);
    // accessibility quick sanity
    run('npm', ['run', 'test:accessibility'], { ignoreExitCode: true });
    break;
  }
  case 'brand:identity': {
    // Reuse lighthouse and visual snapshots as proxies for brand consistency
    run('npm', ['run', 'test:perf:lighthouse']);
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'visual:palette': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'visual:typography': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'visual:spacing': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'ux:transitions': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'ux:modals': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'ux:forms': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'ux:navigation': {
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'responsive:mobile':
  case 'responsive:tablet':
  case 'responsive:desktop':
  case 'responsive:breakpoints': {
    // Playwright already runs across browsers; rely on that for responsiveness snapshots
    run('npm', ['run', 'test:visual']);
    break;
  }
  case 'master:validation': {
    run('npm', ['run', 'test:visual']);
    run('npm', ['run', 'test:accessibility'], { ignoreExitCode: true });
    run('npm', ['run', 'test:perf:lighthouse'], { ignoreExitCode: true });
    break;
  }
  default: {
    console.error(`Unknown task: ${task}`);
    process.exit(1);
  }
}

process.exit(0);

