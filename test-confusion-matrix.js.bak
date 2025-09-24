// 🎤 AVI CONFUSION MATRIX - 30 AUDIOS TEST
console.log('🎤 AVI CONFUSION MATRIX - 30 AUDIOS TEST');
console.log('='.repeat(50));

// Simular 30 casos de audio para confusion matrix
const testCases = [
  // 10 casos CLARO → Esperado: GO/REVIEW
  ...Array.from({length: 10}, (_, i) => ({
    id: i + 1,
    category: 'claro',
    expected: ['GO', 'REVIEW'],
    audio: `claro_${i + 1}.wav`,
    confidence: 0.8 + (Math.random() * 0.15)
  })),
  
  // 10 casos EVASIVO → Esperado: REVIEW/NO-GO
  ...Array.from({length: 10}, (_, i) => ({
    id: i + 11,
    category: 'evasivo',
    expected: ['REVIEW', 'NO-GO'],
    audio: `evasivo_${i + 1}.wav`,
    confidence: 0.4 + (Math.random() * 0.4)
  })),
  
  // 10 casos NERVIOSO CON ADMISIÓN → Esperado: HIGH (no CRITICAL)
  ...Array.from({length: 10}, (_, i) => ({
    id: i + 21,
    category: 'nervioso_con_admision',
    expected: ['HIGH'],
    audio: `nervioso_admision_${i + 1}.wav`,
    confidence: 0.3 + (Math.random() * 0.3)
  }))
];

// Simular análisis de voice engine
function simulateVoiceAnalysis(testCase) {
  const baseScores = {
    claro: { L: 0.15, P: 0.10, D: 0.05, E: 0.75, H: 0.80 },
    evasivo: { L: 0.70, P: 0.60, D: 0.80, E: 0.25, H: 0.40 },
    nervioso_con_admision: { L: 0.45, P: 0.30, D: 0.60, E: 0.40, H: 0.50 }
  };
  
  const weights = { L: 0.25, P: 0.20, D: 0.15, E: 0.20, H: 0.20 };
  const scores = {...baseScores[testCase.category]};
  
  // Agregar variación aleatoria
  Object.keys(scores).forEach(key => {
    scores[key] += (Math.random() - 0.5) * 0.1;
    scores[key] = Math.max(0, Math.min(1, scores[key]));
  });
  
  const voiceScore = 
    weights.L * (1 - scores.L) + 
    weights.P * (1 - scores.P) + 
    weights.D * (1 - scores.D) + 
    weights.E * scores.E + 
    weights.H * scores.H;
    
  const finalScore = Math.round(voiceScore * 1000);
  
  let decision, risk;
  if (finalScore >= 700) {
    decision = 'GO';
    risk = 'LOW';
  } else if (finalScore >= 500) {
    decision = 'REVIEW';
    risk = 'MEDIUM';
  } else if (finalScore >= 300) {
    decision = 'NO-GO';
    risk = 'HIGH';
  } else {
    decision = 'NO-GO';
    risk = 'CRITICAL';
  }
  
  return { finalScore, decision, risk, scores };
}

// Ejecutar matriz de confusión
console.log('📊 Ejecutando análisis de 30 audios...\n');

const results = testCases.map(testCase => {
  const analysis = simulateVoiceAnalysis(testCase);
  const isCorrect = testCase.expected.includes(analysis.decision) || 
                   testCase.expected.includes(analysis.risk);
  
  return {
    ...testCase,
    ...analysis,
    correct: isCorrect,
    status: isCorrect ? '✅ PASS' : '❌ FAIL'
  };
});

// Mostrar resultados por categoría
['claro', 'evasivo', 'nervioso_con_admision'].forEach(category => {
  const categoryResults = results.filter(r => r.category === category);
  const passCount = categoryResults.filter(r => r.correct).length;
  const totalCount = categoryResults.length;
  const accuracy = (passCount / totalCount * 100).toFixed(1);
  
  console.log(`📈 ${category.toUpperCase().replace('_', ' ')}`);
  console.log(`   Accuracy: ${accuracy}% (${passCount}/${totalCount})`);
  console.log(`   Expected: ${categoryResults[0].expected.join(' o ')}`);
  console.log('');
});

// Matriz de confusión global
const totalPass = results.filter(r => r.correct).length;
const totalAccuracy = (totalPass / results.length * 100).toFixed(1);

console.log('🎯 CONFUSION MATRIX GLOBAL');
console.log(`   Overall Accuracy: ${totalAccuracy}% (${totalPass}/${results.length})`);
console.log('');

// Casos fallidos para revisión
const failures = results.filter(r => !r.correct);
if (failures.length > 0) {
  console.log('❌ CASOS FALLIDOS PARA REVISIÓN:');
  failures.forEach(f => {
    console.log(`   ${f.audio}: Expected ${f.expected.join('/')} → Got ${f.decision}/${f.risk}`);
  });
} else {
  console.log('✅ TODOS LOS CASOS PASARON CORRECTAMENTE');
}

console.log('\n' + '='.repeat(50));
console.log('🎤 AVI CONFUSION MATRIX COMPLETADO');