// Script para ejecutar validación del sistema AVI
// Ejecutar con: npx ts-node src/app/scripts/run-avi-validation.ts

import { AVITestDataGenerator, ValidationCase } from '../test-helpers/avi-test-data';


// Simulación de validación sin dependencias de Angular
class AVIValidationRunner {
  
  async runBasicValidation() {
    
    // Generar datos de prueba
    const lowRiskData = AVITestDataGenerator.generateTestResponses('LOW_RISK');
    const highRiskData = AVITestDataGenerator.generateTestResponses('HIGH_RISK');
    const inconsistentData = AVITestDataGenerator.generateTestResponses('INCONSISTENT');
    
    
    return true;
  }
  
  async runDataQualityValidation() {
    
    const profiles = ['LOW_RISK', 'HIGH_RISK', 'INCONSISTENT', 'NERVOUS_TRUTHFUL'];
    let validationsPassed = 0;
    
    for (const profile of profiles) {
      const responses = AVITestDataGenerator.generateTestResponses(profile as any);
      
      // Validar estructura de respuestas
      const hasValidStructure = responses.every(r => 
        r.questionId && 
        r.value && 
        r.responseTime > 0 && 
        r.transcription &&
        Array.isArray(r.stressIndicators)
      );
      
      if (hasValidStructure) {
        validationsPassed++;
      } else {
      }
      
      // Validar coherencia del perfil
      let coherenceCheck = true;
      
      if (profile === 'LOW_RISK') {
        // Bajo riesgo debe tener pocos stress indicators
        const avgStress = responses.reduce((sum, r) => sum + r.stressIndicators.length, 0) / responses.length;
        if (avgStress > 1) coherenceCheck = false;
      }
      
      if (profile === 'HIGH_RISK') {
        // Alto riesgo debe tener muchos stress indicators
        const avgStress = responses.reduce((sum, r) => sum + r.stressIndicators.length, 0) / responses.length;
        if (avgStress < 2) coherenceCheck = false;
      }
      
      if (coherenceCheck) {
      } else {
      }
    }
    
    return validationsPassed === profiles.length;
  }
  
  async runMathematicalConsistencyValidation() {
    
    const inconsistentData = AVITestDataGenerator.generateTestResponses('INCONSISTENT');
    
    // Buscar respuestas financieras
    const ingresos = inconsistentData.find(r => r.questionId === 'ingresos_promedio_diarios');
    const gasolina = inconsistentData.find(r => r.questionId === 'gasto_diario_gasolina');
    const pasajeros = inconsistentData.find(r => r.questionId === 'pasajeros_por_vuelta');
    const tarifa = inconsistentData.find(r => r.questionId === 'tarifa_por_pasajero');
    const vueltas = inconsistentData.find(r => r.questionId === 'vueltas_por_dia');
    
    if (ingresos && gasolina && pasajeros && tarifa && vueltas) {
      const ingresosVal = parseFloat(ingresos.value);
      const gasolinaVal = parseFloat(gasolina.value);
      const pasajerosVal = parseFloat(pasajeros.value);
      const tarifaVal = parseFloat(tarifa.value);
      const vueltasVal = parseFloat(vueltas.value);
      
      // Calcular ingreso teórico
      const ingresoTeorico = pasajerosVal * tarifaVal * vueltasVal;
      const diferencia = Math.abs(ingresosVal - ingresoTeorico);
      const porcentajeDiferencia = (diferencia / ingresosVal) * 100;
      
      
      // Ratio gasolina/ingreso
      const ratioGasolina = (gasolinaVal / ingresosVal) * 100;
      
      // Validaciones
      if (porcentajeDiferencia > 20) {
      }
      
      if (ratioGasolina > 70) {
      }
      
      return true;
    }
    
    return false;
  }
  
  async runCalibrationDataValidation() {
    
    const calibrationSamples = AVITestDataGenerator.generateCalibrationSamples(10);
    
    
    // Validar estructura de muestras
    let validSamples = 0;
    calibrationSamples.forEach((sample, index) => {
      if (sample.responses.length > 0 && 
          sample.dualResult && 
          sample.actualOutcome &&
          sample.interviewId &&
          sample.timestamp) {
        validSamples++;
      }
    });
    
    
    // Validar distribución de outcomes
    const outcomes = calibrationSamples.map(s => s.actualOutcome);
    const outcomeCount = {
      GOOD: outcomes.filter(o => o === 'GOOD').length,
      ACCEPTABLE: outcomes.filter(o => o === 'ACCEPTABLE').length,
      BAD: outcomes.filter(o => o === 'BAD').length
    };
    
    
    return validSamples === calibrationSamples.length;
  }
  
  async runPerformanceSimulation() {
    
    const startTime = Date.now();
    
    // Simular procesamiento de múltiples perfiles
    const profiles = ['LOW_RISK', 'HIGH_RISK', 'INCONSISTENT', 'NERVOUS_TRUTHFUL'];
    const batchSize = 20;
    
    let totalResponses = 0;
    for (const profile of profiles) {
      for (let i = 0; i < batchSize; i++) {
        const responses = AVITestDataGenerator.generateTestResponses(profile as any);
        totalResponses += responses.length;
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const responsesPerSecond = (totalResponses / (duration / 1000)).toFixed(1);
    
    
    return duration < 10000; // Menos de 10 segundos
  }
  
  async runCompleteValidation() {
    
    const results = {
      basicValidation: await this.runBasicValidation(),
      dataQualityValidation: await this.runDataQualityValidation(),
      mathematicalConsistency: await this.runMathematicalConsistencyValidation(),
      calibrationData: await this.runCalibrationDataValidation(),
      performance: await this.runPerformanceSimulation()
    };
    
    
    let passedTests = 0;
    let totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
      const icon = passed ? '' : '';
      const status = passed ? 'PASÓ' : 'FALLÓ';
      if (passed) passedTests++;
    });
    
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    if (passedTests === totalTests) {
    } else {
    }
    
    return results;
  }
}

// Ejecutar validación
async function main() {
  const runner = new AVIValidationRunner();
  
  try {
    await runner.runCompleteValidation();
  } catch (error) {
  }
  
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}
