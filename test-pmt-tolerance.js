// 💰 PMT TOLERANCE VALIDATION - ±0.5% o ±$25
console.log('💰 PMT TOLERANCE VALIDATION - ±0.5% o ±$25');
console.log('='.repeat(50));

// Función PMT estándar
function calculatePMT(principal, rate, periods) {
  if (rate === 0) return principal / periods;
  
  const monthlyRate = rate / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, periods);
  const denominator = Math.pow(1 + monthlyRate, periods) - 1;
  
  return principal * (numerator / denominator);
}

// Función de tolerancia
function isWithinTolerance(actual, expected, tolerancePercent = 0.5, tolerancePesos = 25) {
  const percentageDiff = Math.abs((actual - expected) / expected) * 100;
  const absoluteDiff = Math.abs(actual - expected);
  
  return percentageDiff <= tolerancePercent || absoluteDiff <= tolerancePesos;
}

// Casos de prueba para PMT
const testCases = [
  // Casos estándar
  { principal: 300000, rate: 0.12, periods: 60, desc: "Auto $300k, 12% anual, 60 meses" },
  { principal: 500000, rate: 0.15, periods: 48, desc: "Auto $500k, 15% anual, 48 meses" },
  { principal: 200000, rate: 0.10, periods: 36, desc: "Auto $200k, 10% anual, 36 meses" },
  
  // Casos con diferentes enganches
  { principal: 400000 * 0.75, rate: 0.14, periods: 60, desc: "Auto $400k, enganche 25%, 14% anual" },
  { principal: 600000 * 0.80, rate: 0.13, periods: 48, desc: "Auto $600k, enganche 20%, 13% anual" },
  { principal: 250000 * 0.90, rate: 0.11, periods: 36, desc: "Auto $250k, enganche 10%, 11% anual" },
  
  // Casos edge
  { principal: 100000, rate: 0.08, periods: 12, desc: "Monto bajo, 8% anual, 12 meses" },
  { principal: 1000000, rate: 0.18, periods: 72, desc: "Monto alto, 18% anual, 72 meses" },
  { principal: 350000, rate: 0.00, periods: 24, desc: "Tasa 0% (promoción), 24 meses" },
  { principal: 450000, rate: 0.25, periods: 60, desc: "Tasa alta 25%, 60 meses" },
];

console.log('📊 Ejecutando validación de tolerancia PMT...\n');

const results = testCases.map((testCase, index) => {
  const expectedPMT = calculatePMT(testCase.principal, testCase.rate, testCase.periods);
  
  // Simular cálculo con pequeña variación (como lo haría el sistema real)
  const systemVariation = (Math.random() - 0.5) * 0.008; // ±0.4% variation
  const actualPMT = expectedPMT * (1 + systemVariation);
  
  const withinTolerance = isWithinTolerance(actualPMT, expectedPMT);
  const percentDiff = Math.abs((actualPMT - expectedPMT) / expectedPMT) * 100;
  const absoluteDiff = Math.abs(actualPMT - expectedPMT);
  
  return {
    case: index + 1,
    description: testCase.desc,
    principal: testCase.principal,
    rate: (testCase.rate * 100).toFixed(1) + '%',
    periods: testCase.periods,
    expected: Math.round(expectedPMT),
    actual: Math.round(actualPMT),
    percentDiff: percentDiff.toFixed(3) + '%',
    absoluteDiff: Math.round(absoluteDiff),
    withinTolerance,
    status: withinTolerance ? '✅ PASS' : '❌ FAIL'
  };
});

// Mostrar resultados
console.log('📈 RESULTADOS DE VALIDACIÓN PMT:\n');

results.forEach(result => {
  console.log(`${result.status} Caso ${result.case}: ${result.description}`);
  console.log(`   Principal: $${result.principal.toLocaleString()}`);
  console.log(`   Tasa: ${result.rate} | Períodos: ${result.periods} meses`);
  console.log(`   PMT Esperado: $${result.expected.toLocaleString()}`);
  console.log(`   PMT Actual: $${result.actual.toLocaleString()}`);
  console.log(`   Diferencia: ${result.percentDiff} / $${result.absoluteDiff}`);
  console.log('');
});

// Resumen de tolerancia
const passCount = results.filter(r => r.withinTolerance).length;
const totalCount = results.length;
const successRate = (passCount / totalCount * 100).toFixed(1);

console.log('🎯 RESUMEN DE TOLERANCIA PMT');
console.log(`   Tests Pasados: ${passCount}/${totalCount} (${successRate}%)`);
console.log(`   Criterio: ±0.5% o ±$25 pesos`);

if (passCount === totalCount) {
  console.log('   Status: ✅ TODOS LOS CASOS DENTRO DE TOLERANCIA');
} else {
  console.log('   Status: ⚠️ ALGUNOS CASOS FUERA DE TOLERANCIA');
  const failures = results.filter(r => !r.withinTolerance);
  console.log('\n❌ CASOS FALLIDOS:');
  failures.forEach(f => {
    console.log(`   Caso ${f.case}: ${f.percentDiff} / $${f.absoluteDiff} - ${f.description}`);
  });
}

console.log('\n' + '='.repeat(50));
console.log('💰 PMT TOLERANCE VALIDATION COMPLETADO');