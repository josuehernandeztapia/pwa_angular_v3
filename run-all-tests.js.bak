#!/usr/bin/env node
/**
 * 🧪 VOICE EVALUATION SYSTEM - COMPLETE TEST RUNNER
 * Ejecuta todos los tests del sistema HASE de forma secuencial
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 EJECUTANDO SUITE COMPLETA DE TESTS DEL SISTEMA DE EVALUACIÓN DE VOZ HASE\n');
console.log('=' .repeat(80));

const testSuites = [
  {
    name: 'Voice Evaluation Framework',
    file: 'test-voice-evaluation.js',
    description: 'Tests básicos del framework de evaluación de voz'
  },
  {
    name: 'Fallback Mechanisms',
    file: 'test-fallback-mechanisms.js', 
    description: 'Tests de mecanismos de respaldo y recuperación'
  },
  {
    name: 'Scoring Algorithms & Thresholds',
    file: 'test-scoring-thresholds.js',
    description: 'Tests de algoritmos de scoring y umbrales de decisión'
  },
  {
    name: 'UI-Backend Integration',
    file: 'test-ui-backend-integration.js',
    description: 'Tests de integración entre interfaz y backend'
  }
];

async function runTest(testSuite) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 EJECUTANDO: ${testSuite.name}`);
    console.log(`📄 Archivo: ${testSuite.file}`);
    console.log(`📝 Descripción: ${testSuite.description}`);
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    
    const child = spawn('node', [testSuite.file], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('-'.repeat(60));
      
      if (code === 0) {
        console.log(`✅ ${testSuite.name} - EXITOSO (${duration}ms)`);
        resolve({ success: true, duration, name: testSuite.name });
      } else {
        console.log(`❌ ${testSuite.name} - FALLIDO (código: ${code})`);
        resolve({ success: false, duration, name: testSuite.name, code });
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ ${testSuite.name} - ERROR: ${error.message}`);
      resolve({ success: false, error: error.message, name: testSuite.name });
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  const results = [];
  
  console.log('📋 TESTS A EJECUTAR:');
  testSuites.forEach((suite, index) => {
    console.log(`   ${index + 1}. ${suite.name}`);
  });
  console.log('');
  
  // Ejecutar cada test suite secuencialmente
  for (const testSuite of testSuites) {
    const result = await runTest(testSuite);
    results.push(result);
    
    if (!result.success) {
      console.log(`\n⚠️ Test suite falló: ${testSuite.name}`);
      console.log('Continuando con el siguiente test...\n');
    }
  }
  
  // Generar reporte final
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 REPORTE FINAL DE EJECUCIÓN');
  console.log('='.repeat(80));
  
  console.log(`\n📊 ESTADÍSTICAS GENERALES:`);
  console.log(`   Total de Suites: ${results.length}`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Fallidos: ${failureCount}`);
  console.log(`   ⏱️ Tiempo Total: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
  
  console.log(`\n📋 RESULTADOS DETALLADOS:`);
  results.forEach((result, index) => {
    const status = result.success ? '✅ EXITOSO' : '❌ FALLIDO';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`   ${index + 1}. ${result.name}: ${status} (${duration})`);
    
    if (!result.success && result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  // Generar recomendación final
  console.log(`\n🎯 RECOMENDACIÓN FINAL:`);
  if (successCount === results.length) {
    console.log('   🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('   ✅ Sistema de Evaluación de Voz HASE completamente validado');
    console.log('   🚀 LISTO PARA PRODUCCIÓN');
  } else if (successCount >= results.length * 0.75) {
    console.log('   ⚠️ MAYORÍA DE TESTS EXITOSOS - Revisar fallos menores');
    console.log('   🔧 Sistema funcional pero requiere ajustes');
  } else {
    console.log('   🚨 MÚLTIPLES FALLOS DETECTADOS - Revisión requerida');
    console.log('   ❌ Sistema necesita correcciones antes de producción');
  }
  
  // Verificar si existe el reporte y mostrarlo
  if (fs.existsSync('VOICE_EVALUATION_TEST_REPORT.md')) {
    console.log(`\n📄 REPORTE DETALLADO disponible en: VOICE_EVALUATION_TEST_REPORT.md`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SUITE DE TESTS COMPLETADA');
  console.log('='.repeat(80));
  
  // Exit code basado en resultados
  process.exit(failureCount > 0 ? 1 : 0);
}

// Verificar que todos los archivos de test existen
console.log('🔍 VERIFICANDO ARCHIVOS DE TEST...');
const missingFiles = [];

testSuites.forEach(suite => {
  if (!fs.existsSync(suite.file)) {
    missingFiles.push(suite.file);
  }
});

if (missingFiles.length > 0) {
  console.log('❌ ARCHIVOS DE TEST FALTANTES:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
  console.log('\nPor favor, asegúrate de que todos los archivos de test estén presentes.');
  process.exit(1);
}

console.log('✅ Todos los archivos de test encontrados');

// Ejecutar todos los tests
runAllTests().catch(error => {
  console.error('❌ Error fatal ejecutando tests:', error);
  process.exit(1);
});