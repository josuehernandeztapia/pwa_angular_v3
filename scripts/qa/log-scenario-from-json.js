#!/usr/bin/env node
/**
 * CLI helper to run logScenario() against JSON data captured from the UI/BFF.
 *
 * Usage examples:
 *   node scripts/qa/log-scenario-from-json.js --input reports/evidence/ags-plazo/flow-context.json --scenario AGS_FIN_UI --principalKey documents.financial.principal --termKey documents.financial.term --rateKey documents.financial.annualRate --uiMonthlyKey ui.monthlyPayment --uiAnnualKey ui.annualTir
 *   node scripts/qa/log-scenario-from-json.js --manual '{"name":"AGS_FIN_UI","principal":125000,"term":24,"annualRate":0.255}' --uiMonthly 7321.44 --uiAnnual 0.299
 */
const fs = require('fs');
const path = require('path');

const math = require(path.resolve(__dirname, '..', '..', 'comprehensive-math-validation.js'));

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function getValueByKeyPath(source, keyPath) {
  if (!source || !keyPath) {
    return undefined;
  }
  return keyPath.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), source);
}

function loadInput(args) {
  if (args.manual) {
    return JSON.parse(args.manual);
  }

  if (!args.input) {
    throw new Error('Missing --input <path> or --manual <json>');
  }

  const raw = fs.readFileSync(path.resolve(args.input), 'utf8');
  const json = JSON.parse(raw);
  return json;
}

function buildScenarioConfig(base, args) {
  const result = { ...base };

  const principal = args.principal ?? args.principalKey && getValueByKeyPath(base, args.principalKey);
  const annualRate = args.annualRate ?? args.rate ?? args.rateKey && getValueByKeyPath(base, args.rateKey);
  const term = args.term ?? args.termKey && getValueByKeyPath(base, args.termKey);
  const name = args.scenario ?? args.name ?? base.name ?? 'UI_SCENARIO';

  const numericPrincipal = principal != null ? Number(principal) : undefined;
  const numericTerm = term != null ? Number(term) : undefined;
  const numericAnnualRate = annualRate != null ? Number(annualRate) : undefined;

  if (Number.isFinite(numericPrincipal)) {
    result.principal = numericPrincipal;
  }
  if (Number.isFinite(numericTerm)) {
    result.term = numericTerm;
  }
  if (Number.isFinite(numericAnnualRate)) {
    result.annualRate = numericAnnualRate;
  }

  result.name = name;

  if (args.cashflows && Array.isArray(base[args.cashflows])) {
    result.cashflows = base[args.cashflows];
  }

  if (args.cashflowsPath) {
    const cashflowPath = Array.isArray(args.cashflowsPath)
      ? args.cashflowsPath
      : [args.cashflowsPath];

    for (const candidate of cashflowPath) {
      const extracted = getValueByKeyPath(base, candidate);
      if (Array.isArray(extracted)) {
        result.cashflows = extracted;
        break;
      }
    }
  }

  if (!result.cashflows && result.principal && result.term && result.annualRate) {
    // Let logScenario calculate cashflows using the helper
  }

  return result;
}

function buildUiSnapshot(args, source) {
  const snapshot = {};

  const uiMonthly = args.uiMonthly ?? args.uiMonthlyKey && getValueByKeyPath(source, args.uiMonthlyKey);
  const uiTir = args.uiAnnual ?? args.uiAnnualKey && getValueByKeyPath(source, args.uiAnnualKey);
  const uiMonthlyTir = args.uiMonthlyTir ?? args.uiMonthlyTirKey && getValueByKeyPath(source, args.uiMonthlyTirKey);

  if (uiMonthly != null) {
    snapshot.uiMonthlyPayment = Number(uiMonthly);
  }
  if (uiTir != null) {
    snapshot.uiAnnualTir = Number(uiTir);
  }
  if (uiMonthlyTir != null) {
    snapshot.uiMonthlyTir = Number(uiMonthlyTir);
  }

  snapshot.printCashflows = args.printCashflows === 'true' || args.printCashflows === true;
  if (args.cashflowLimit) {
    snapshot.cashflowLimit = Number(args.cashflowLimit);
  }

  return snapshot;
}

function main() {
  try {
    const args = parseArgs(process.argv);
    const rawInput = loadInput(args);
    const scenarioConfig = buildScenarioConfig(rawInput, args);
    const uiSnapshot = buildUiSnapshot(args, rawInput);

    if (!Number.isFinite(scenarioConfig.principal) || !Number.isFinite(scenarioConfig.term)) {
      throw new Error('Principal and term are required. Provide --principal/--term or the corresponding --*Key paths.');
    }

    if (!Number.isFinite(scenarioConfig.annualRate) && !Array.isArray(scenarioConfig.cashflows)) {
      throw new Error('Provide annualRate via --annualRate/--rate or supply cashflows via --cashflows/--cashflowsPath.');
    }

    console.log('Running logScenario with configuration:', {
      name: scenarioConfig.name,
      principal: scenarioConfig.principal,
      term: scenarioConfig.term,
      annualRate: scenarioConfig.annualRate,
      hasCashflows: Array.isArray(scenarioConfig.cashflows)
    });

    const { summary, comparisons } = math.logScenario(scenarioConfig, uiSnapshot);

    const withinTolerance = comparisons.length === 0 || comparisons.every((item) => item.withinTolerance);

    const output = {
      scenario: summary.name,
      principal: summary.principal,
      term: summary.term,
      annualRate: summary.tirAnnual,
      toleranceCheck: withinTolerance,
      comparisons
    };

    if (args.output) {
      const outPath = path.resolve(args.output);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
      console.log(`\n✅ Resultado almacenado en ${outPath}`);
    }
  } catch (error) {
    console.error('❌ Error executing logScenario helper:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  getValueByKeyPath,
  buildScenarioConfig,
  buildUiSnapshot
};
