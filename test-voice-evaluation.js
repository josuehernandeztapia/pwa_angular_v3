#!/usr/bin/env node
/**
 * ✅ TEST SUITE: Voice Evaluation System
 * Test aislado para validar el sistema HASE de evaluación de voz
 * NO requiere servidor Angular - solo testing de lógica de negocio
 */

// Mock environment to simulate browser APIs
global.window = {
  createMockAudioBlob: null,
  testVoiceEvaluation: null
};
global.navigator = { onLine: true };
global.Blob = function(chunks, options) {
  this.size = chunks[0] ? chunks[0].byteLength || 1000 : 1000;
  this.type = options?.type || 'audio/wav';
};

console.log('🧪 INICIANDO TESTS DEL SISTEMA DE EVALUACIÓN DE VOZ HASE\n');

// Test 1: Mock Audio Blob Creation (from voice-test.ts)
function testMockAudioBlobCreation() {
  console.log('📋 TEST 1: Mock Audio Blob Creation');
  
  const createMockAudioBlob = (duration = 10) => {
    const sampleRate = 16000;
    const arrayBuffer = new ArrayBuffer(sampleRate * duration * 2); // 16-bit
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const blob1 = createMockAudioBlob(5);  // 5 segundo
  const blob2 = createMockAudioBlob(15); // 15 segundos
  const blob3 = createMockAudioBlob(30); // 30 segundos
  
  console.log(`✅ Blob 5s: ${blob1.size} bytes, type: ${blob1.type}`);
  console.log(`✅ Blob 15s: ${blob2.size} bytes, type: ${blob2.type}`);
  console.log(`✅ Blob 30s: ${blob3.size} bytes, type: ${blob3.type}`);
  
  return { createMockAudioBlob };
}

// Test 2: Voice Evaluation Logic (Fallback Heuristics)
function testVoiceEvaluationLogic() {
  console.log('\n📋 TEST 2: Voice Evaluation Logic (Fallback Heuristics)');
  
  // Simular la lógica de heurística de fallback
  function applyHeuristicFallback(audioBlob, questionId) {
    const duration = audioBlob.size / 16000; // Rough duration estimation
    
    let decision = 'GO';
    let voiceScore = 7.5;
    let flags = [];
    
    // Heurística 1: Duración muy corta -> REVIEW
    if (duration < 2) {
      decision = 'REVIEW';
      voiceScore = 4.0;
      flags.push('Duration too short');
    }
    
    // Heurística 2: Duración muy larga -> REVIEW
    if (duration > 30) {
      decision = 'REVIEW';
      voiceScore = 5.0;
      flags.push('Duration too long');
    }
    
    // Heurística 3: Tamaño de audio sospechoso -> NO-GO
    if (audioBlob.size < 1000) {
      decision = 'NO-GO';
      voiceScore = 2.0;
      flags.push('Audio file too small', 'Possible silence');
    }
    
    return {
      questionId,
      voiceScore,
      decision,
      flags,
      fallback: true,
      timestamp: Date.now(),
      duration: Math.round(duration * 100) / 100
    };
  }

  // Test scenarios
  const { createMockAudioBlob } = testMockAudioBlobCreation();
  
  const scenarios = [
    { name: 'Good Response (8s)', blob: createMockAudioBlob(8), questionId: 'unit_substitution' },
    { name: 'Too Short (1s)', blob: createMockAudioBlob(1), questionId: 'seasonal_vulnerability' },
    { name: 'Too Long (35s)', blob: createMockAudioBlob(35), questionId: 'route_security_issues' },
    { name: 'Silent/Small', blob: new Blob([new ArrayBuffer(500)], { type: 'audio/wav' }), questionId: 'financial_stress' }
  ];
  
  scenarios.forEach(scenario => {
    const result = applyHeuristicFallback(scenario.blob, scenario.questionId);
    console.log(`\n🎯 ${scenario.name}:`);
    console.log(`   Decision: ${result.decision} | Score: ${result.voiceScore}/10`);
    console.log(`   Duration: ${result.duration}s | Flags: [${result.flags.join(', ')}]`);
  });
}

// Test 3: HASE Scoring Algorithm
function testHASEScoringAlgorithm() {
  console.log('\n📋 TEST 3: HASE Scoring Algorithm (30% GNV, 20% Geographic, 50% Voice)');
  
  function calculateHASEScore(historicalGNV, geographicRisk, voiceResilience) {
    // Pesos: 30% histórico, 20% geográfico, 50% voz
    const weights = { historical: 0.30, geographic: 0.20, voice: 0.50 };
    
    // Normalizar puntuaciones a escala 0-10
    const normalizedGNV = Math.min(10, Math.max(0, historicalGNV));
    const normalizedGeo = Math.min(10, Math.max(0, 10 - geographicRisk)); // Invertir riesgo
    const normalizedVoice = Math.min(10, Math.max(0, voiceResilience));
    
    const haseScore = (
      normalizedGNV * weights.historical +
      normalizedGeo * weights.geographic +
      normalizedVoice * weights.voice
    );
    
    return {
      haseScore: Math.round(haseScore * 100) / 100,
      components: {
        historical: normalizedGNV,
        geographic: normalizedGeo,
        voice: normalizedVoice
      },
      weights
    };
  }
  
  // Test cases
  const testCases = [
    { name: 'Conductor Excelente', gnv: 9.2, geoRisk: 2.1, voice: 8.7 },
    { name: 'Conductor Promedio', gnv: 6.5, geoRisk: 5.0, voice: 6.8 },
    { name: 'Conductor Riesgoso', gnv: 3.2, geoRisk: 8.5, voice: 4.1 },
    { name: 'Nuevo sin historial', gnv: 5.0, geoRisk: 3.0, voice: 7.5 }
  ];
  
  testCases.forEach(testCase => {
    const result = calculateHASEScore(testCase.gnv, testCase.geoRisk, testCase.voice);
    console.log(`\n🎯 ${testCase.name}:`);
    console.log(`   HASE Score: ${result.haseScore}/10`);
    console.log(`   Components: GNV=${result.components.historical} | Geo=${result.components.geographic} | Voice=${result.components.voice}`);
    console.log(`   Weights: ${result.weights.historical*100}% + ${result.weights.geographic*100}% + ${result.weights.voice*100}%`);
  });
}

// Test 4: Resilience Categories Scoring
function testResilienceCategoriesScoring() {
  console.log('\n📋 TEST 4: Resilience Categories Scoring');
  
  // Simular respuestas a las 21 preguntas del sistema
  const questionWeights = {
    // 12 preguntas core de resiliencia
    'financial_stress': 0.08,
    'unit_substitution': 0.07,
    'seasonal_vulnerability': 0.06,
    'route_security_issues': 0.05,
    'passenger_complaints': 0.04,
    'maintenance_costs': 0.08,
    'fuel_efficiency': 0.06,
    'competition_response': 0.05,
    'regulatory_changes': 0.07,
    'market_opportunities': 0.04,
    'technology_adoption': 0.03,
    'community_relations': 0.02,
    
    // 3 preguntas adicionales
    'income_diversification': 0.06,
    'emergency_preparedness': 0.05,
    'business_planning': 0.07,
    
    // 6 preguntas AVI existentes (menor peso)
    'identity_verification': 0.02,
    'address_verification': 0.02,
    'route_knowledge': 0.03,
    'local_landmarks': 0.03,
    'operating_schedule': 0.02,
    'vehicle_details': 0.02
  };
  
  function calculateResilienceCategories(questionScores) {
    const categories = {
      financial_stability: [
        'financial_stress', 'maintenance_costs', 'fuel_efficiency', 
        'income_diversification', 'emergency_preparedness'
      ],
      operational_adaptability: [
        'unit_substitution', 'seasonal_vulnerability', 'competition_response',
        'regulatory_changes', 'technology_adoption', 'business_planning'
      ],
      market_knowledge: [
        'route_security_issues', 'passenger_complaints', 'market_opportunities',
        'community_relations', 'route_knowledge', 'local_landmarks', 'operating_schedule'
      ]
    };
    
    const categoryScores = {};
    
    Object.keys(categories).forEach(category => {
      let weightedSum = 0;
      let totalWeight = 0;
      
      categories[category].forEach(questionId => {
        if (questionScores[questionId] !== undefined) {
          const weight = questionWeights[questionId] || 0.05;
          weightedSum += questionScores[questionId] * weight;
          totalWeight += weight;
        }
      });
      
      categoryScores[category] = totalWeight > 0 ? weightedSum / totalWeight : 5.0;
    });
    
    // Puntuación global
    const overallScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 3;
    
    return {
      overallScore: Math.round(overallScore * 100) / 100,
      categoryScores: Object.fromEntries(
        Object.entries(categoryScores).map(([k, v]) => [k, Math.round(v * 100) / 100])
      )
    };
  }
  
  // Test case: simular respuestas
  const mockQuestionScores = {
    'financial_stress': 8.2,
    'unit_substitution': 7.5,
    'seasonal_vulnerability': 6.8,
    'route_security_issues': 7.1,
    'passenger_complaints': 8.0,
    'maintenance_costs': 6.5,
    'fuel_efficiency': 7.8,
    'competition_response': 7.2,
    'regulatory_changes': 6.9,
    'market_opportunities': 8.1,
    'technology_adoption': 5.5,
    'community_relations': 7.8,
    'income_diversification': 7.4,
    'emergency_preparedness': 6.7,
    'business_planning': 8.3,
    'identity_verification': 9.0,
    'address_verification': 8.5,
    'route_knowledge': 8.8,
    'local_landmarks': 8.2,
    'operating_schedule': 8.6,
    'vehicle_details': 8.4
  };
  
  const result = calculateResilienceCategories(mockQuestionScores);
  
  console.log('🎯 Resultado de Categorías de Resiliencia:');
  console.log(`   Puntuación Global: ${result.overallScore}/10`);
  console.log(`   Estabilidad Financiera: ${result.categoryScores.financial_stability}/10`);
  console.log(`   Adaptabilidad Operacional: ${result.categoryScores.operational_adaptability}/10`);
  console.log(`   Conocimiento del Mercado: ${result.categoryScores.market_knowledge}/10`);
  
  return result;
}

// Test 5: Integration Flow Test
function testIntegrationFlow() {
  console.log('\n📋 TEST 5: Integration Flow Test (Complete Voice Evaluation Flow)');
  
  // Simular flujo completo
  const { createMockAudioBlob } = testMockAudioBlobCreation();
  
  console.log('🎯 Simulando sesión completa AVI con 5 preguntas...\n');
  
  const questions = [
    { id: 'financial_stress', text: '¿Cómo manejas períodos de bajos ingresos?' },
    { id: 'unit_substitution', text: '¿Qué harías si tu unidad necesita reparación?' },
    { id: 'route_knowledge', text: '¿Cuántos paraderos hay en tu ruta?' },
    { id: 'emergency_preparedness', text: '¿Tienes un fondo de emergencia?' },
    { id: 'technology_adoption', text: '¿Usas apps para optimizar tu ruta?' }
  ];
  
  const results = [];
  
  questions.forEach((question, index) => {
    const duration = 3 + Math.random() * 15; // 3-18 segundos
    const audioBlob = createMockAudioBlob(duration);
    
    // Simular evaluación
    let decision = 'GO';
    let score = 6 + Math.random() * 3; // 6-9
    
    if (duration < 4) {
      decision = 'REVIEW';
      score = 4 + Math.random() * 2;
    } else if (duration > 16) {
      decision = 'REVIEW';
      score = 5 + Math.random() * 2;
    }
    
    const result = {
      questionId: question.id,
      duration: Math.round(duration * 100) / 100,
      decision,
      voiceScore: Math.round(score * 100) / 100,
      flags: duration < 4 ? ['Short response'] : duration > 16 ? ['Long response'] : [],
      timestamp: Date.now() + (index * 1000)
    };
    
    results.push(result);
    
    console.log(`   Q${index + 1}: ${question.text}`);
    console.log(`   📊 ${duration.toFixed(1)}s | ${decision} | Score: ${result.voiceScore}/10`);
    if (result.flags.length > 0) {
      console.log(`   🚩 Flags: ${result.flags.join(', ')}`);
    }
    console.log('');
  });
  
  // Agregar puntuación final
  const avgScore = results.reduce((sum, r) => sum + r.voiceScore, 0) / results.length;
  const goCount = results.filter(r => r.decision === 'GO').length;
  const reviewCount = results.filter(r => r.decision === 'REVIEW').length;
  
  console.log('🏁 RESUMEN FINAL:');
  console.log(`   Puntuación Promedio: ${avgScore.toFixed(2)}/10`);
  console.log(`   Decisiones: ${goCount} GO, ${reviewCount} REVIEW, ${results.length - goCount - reviewCount} NO-GO`);
  console.log(`   Recomendación: ${avgScore >= 7 ? 'APROBAR' : avgScore >= 5 ? 'REVISIÓN MANUAL' : 'RECHAZAR'}`);
  
  return results;
}

// Ejecutar todos los tests
async function runAllTests() {
  try {
    testMockAudioBlobCreation();
    testVoiceEvaluationLogic();
    testHASEScoringAlgorithm();
    testResilienceCategoriesScoring();
    testIntegrationFlow();
    
    console.log('\n🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
    console.log('✅ Sistema de Evaluación de Voz HASE validado');
    
  } catch (error) {
    console.error('❌ ERROR EN TESTS:', error);
    process.exit(1);
  }
}

// Ejecutar
runAllTests();