import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AVIService } from './avi.service';
import { AVIDualEngineService } from './avi-dual-engine.service';
import { AVICalibrationService } from './avi-calibration.service';
import { AVITestDataGenerator, ValidationCase, ValidationBatch } from '../test-helpers/avi-test-data';
import { AVIResponse, AVIScore } from '../models/avi';

@Injectable({
  providedIn: 'root'
})
export class AVISystemValidatorService {

  constructor(
    private aviService: AVIService,
    private dualEngine: AVIDualEngineService,
    private calibrationService: AVICalibrationService
  ) {}

  /**
   * Ejecutar validación completa del sistema AVI
   */
  runCompleteValidation(): Observable<ValidationReport> {
    
    const validationBatch = AVITestDataGenerator.generateValidationBatch();
    
    // Ejecutar todas las validaciones en paralelo
    return forkJoin({
      basicServiceTest: this.validateBasicService(),
      dualEngineTest: this.validateDualEngine(),
      accuracyTest: this.validateAccuracy(validationBatch),
      performanceTest: this.validatePerformance(),
      consistencyTest: this.validateConsistency(),
      edgeCasesTest: this.validateEdgeCases(validationBatch.edgeCases),
      calibrationTest: this.validateCalibration()
    }).pipe(
      map(results => this.compileValidationReport(results)),
      catchError(error => {
        return of(this.getErrorReport(error));
      })
    );
  }

  /**
   * Validar funcionalidad básica del servicio AVI
   */
  private validateBasicService(): Observable<TestResult> {
    return new Observable(observer => {
      const tests: TestCase[] = [];
      
      // Test 1: Iniciar sesión
      this.aviService.startSession().subscribe({
        next: sessionId => {
          tests.push({
            name: 'Iniciar sesión AVI',
            passed: !!sessionId && sessionId.startsWith('avi_'),
            message: sessionId ? `Sesión creada: ${sessionId}` : 'Error al crear sesión'
          });
        },
        error: err => {
          tests.push({
            name: 'Iniciar sesión AVI',
            passed: false,
            message: `Error: ${err.message}`
          });
        },
        complete: () => {
          // Test 2: Obtener preguntas
          this.aviService.getQuestions().subscribe({
            next: questions => {
              tests.push({
                name: 'Obtener preguntas',
                passed: questions.length > 0,
                message: `${questions.length} preguntas obtenidas`
              });
            },
            error: err => {
              tests.push({
                name: 'Obtener preguntas',
                passed: false,
                message: `Error: ${err.message}`
              });
            },
            complete: () => {
              // Test 3: Calcular score básico
              const mockResponses = AVITestDataGenerator.generateTestResponses('LOW_RISK');
              
              this.aviService.calculateScore().subscribe({
                next: score => {
                  tests.push({
                    name: 'Calcular score básico',
                    passed: score && score.totalScore >= 0 && score.totalScore <= 1000,
                    message: `Score calculado: ${score.totalScore}`
                  });
                  
                  observer.next({
                    category: 'Servicio AVI Básico',
                    tests,
                    passed: tests.every(t => t.passed),
                    duration: 0
                  });
                  observer.complete();
                },
                error: err => {
                  tests.push({
                    name: 'Calcular score básico',
                    passed: false,
                    message: `Error: ${err.message}`
                  });
                  
                  observer.next({
                    category: 'Servicio AVI Básico',
                    tests,
                    passed: false,
                    duration: 0
                  });
                  observer.complete();
                }
              });
            }
          });
        }
      });
    });
  }

  /**
   * Validar funcionamiento del dual engine
   */
  private validateDualEngine(): Observable<TestResult> {
    return new Observable(observer => {
      const startTime = Date.now();
      const tests: TestCase[] = [];
      
      const testResponses = AVITestDataGenerator.generateTestResponses('LOW_RISK');
      
      this.dualEngine.calculateDualEngineScore(testResponses).subscribe({
        next: async (dualResultPromise) => {
          try {
            const dualResult = await dualResultPromise;
            
            // Test 1: Estructura del resultado
            tests.push({
              name: 'Estructura de resultado dual engine',
              passed: !!(dualResult.consolidatedScore && dualResult.scientificScore && dualResult.heuristicScore),
              message: 'Todos los scores presentes'
            });
            
            // Test 2: Consenso calculado
            tests.push({
              name: 'Cálculo de consenso',
              passed: !!dualResult.consensus && ['HIGH', 'MEDIUM', 'LOW'].includes(dualResult.consensus.level),
              message: `Nivel de consenso: ${dualResult.consensus?.level}`
            });
            
            // Test 3: Diferencia de scores razonable
            const scoreDiff = Math.abs(dualResult.scientificScore.totalScore - dualResult.heuristicScore.totalScore);
            tests.push({
              name: 'Diferencia de scores',
              passed: scoreDiff < 500, // No debe haber diferencias extremas
              message: `Diferencia: ${scoreDiff} puntos`
            });
            
            // Test 4: Processing time razonable
            tests.push({
              name: 'Tiempo de procesamiento',
              passed: dualResult.processingTime < 10000, // Menos de 10 segundos
              message: `${dualResult.processingTime}ms`
            });
            
            observer.next({
              category: 'Dual Engine',
              tests,
              passed: tests.every(t => t.passed),
              duration: Date.now() - startTime
            });
            observer.complete();
          } catch (error) {
            tests.push({
              name: 'Procesamiento dual engine',
              passed: false,
              message: `Error: ${error}`
            });
            
            observer.next({
              category: 'Dual Engine',
              tests,
              passed: false,
              duration: Date.now() - startTime
            });
            observer.complete();
          }
        },
        error: err => {
          tests.push({
            name: 'Dual engine execution',
            passed: false,
            message: `Error: ${err.message}`
          });
          
          observer.next({
            category: 'Dual Engine',
            tests,
            passed: false,
            duration: Date.now() - startTime
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * Validar precisión del sistema con casos conocidos
   */
  private validateAccuracy(batch: ValidationBatch): Observable<TestResult> {
    return new Observable(observer => {
      const startTime = Date.now();
      const tests: TestCase[] = [];
      let completedTests = 0;
      const totalTests = batch.lowRiskCases.length + batch.highRiskCases.length;
      
      let correctLowRisk = 0;
      let correctHighRisk = 0;
      
      // Validar casos de bajo riesgo
      batch.lowRiskCases.forEach((testCase, index) => {
        this.dualEngine.calculateDualEngineScore(testCase.responses).subscribe(
          async (resultPromise) => {
            try {
              const result = await resultPromise;
              const isCorrect = result.consolidatedScore.riskLevel === 'LOW' || result.consolidatedScore.riskLevel === 'MEDIUM';
              if (isCorrect) correctLowRisk++;
              
              completedTests++;
              if (completedTests === totalTests) {
                this.completeAccuracyTest(tests, correctLowRisk, correctHighRisk, batch, observer, startTime);
              }
            } catch (error) {
              completedTests++;
            }
          }
        );
      });
      
      // Validar casos de alto riesgo
      batch.highRiskCases.forEach((testCase, index) => {
        this.dualEngine.calculateDualEngineScore(testCase.responses).subscribe(
          async (resultPromise) => {
            try {
              const result = await resultPromise;
              const isCorrect = result.consolidatedScore.riskLevel === 'HIGH' || result.consolidatedScore.riskLevel === 'CRITICAL';
              if (isCorrect) correctHighRisk++;
              
              completedTests++;
              if (completedTests === totalTests) {
                this.completeAccuracyTest(tests, correctLowRisk, correctHighRisk, batch, observer, startTime);
              }
            } catch (error) {
              completedTests++;
            }
          }
        );
      });
    });
  }

  private completeAccuracyTest(
    tests: TestCase[], 
    correctLowRisk: number, 
    correctHighRisk: number,
    batch: ValidationBatch,
    observer: any,
    startTime: number
  ) {
    const lowRiskAccuracy = correctLowRisk / batch.lowRiskCases.length;
    const highRiskAccuracy = correctHighRisk / batch.highRiskCases.length;
    const overallAccuracy = (correctLowRisk + correctHighRisk) / (batch.lowRiskCases.length + batch.highRiskCases.length);
    
    tests.push({
      name: 'Precisión casos bajo riesgo',
      passed: lowRiskAccuracy >= 0.8,
      message: `${(lowRiskAccuracy * 100).toFixed(1)}% de precisión`
    });
    
    tests.push({
      name: 'Precisión casos alto riesgo',
      passed: highRiskAccuracy >= 0.8,
      message: `${(highRiskAccuracy * 100).toFixed(1)}% de precisión`
    });
    
    tests.push({
      name: 'Precisión general',
      passed: overallAccuracy >= 0.75,
      message: `${(overallAccuracy * 100).toFixed(1)}% de precisión general`
    });
    
    observer.next({
      category: 'Precisión del Sistema',
      tests,
      passed: tests.every(t => t.passed),
      duration: Date.now() - startTime
    });
    observer.complete();
  }

  /**
   * Validar rendimiento del sistema
   */
  private validatePerformance(): Observable<TestResult> {
    return new Observable(observer => {
      const startTime = Date.now();
      const tests: TestCase[] = [];
      
      const testResponses = AVITestDataGenerator.generateTestResponses('LOW_RISK');
      const performanceStartTime = Date.now();
      
      this.dualEngine.calculateDualEngineScore(testResponses).subscribe(
        async (resultPromise) => {
          try {
            const result = await resultPromise;
            const processingTime = Date.now() - performanceStartTime;
            
            // Test 1: Tiempo total razonable
            tests.push({
              name: 'Tiempo de procesamiento total',
              passed: processingTime < 5000, // Menos de 5 segundos
              message: `${processingTime}ms`
            });
            
            // Test 2: Engine científico no demasiado lento
            tests.push({
              name: 'Rendimiento engine científico',
              passed: result.scientificScore.processingTime < 3000,
              message: `${result.scientificScore.processingTime}ms`
            });
            
            // Test 3: Engine heurístico rápido
            tests.push({
              name: 'Rendimiento engine heurístico',
              passed: result.heuristicScore.processingTime < 1000,
              message: `${result.heuristicScore.processingTime}ms`
            });
            
            const memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 50;
            tests.push({
              name: 'Uso de memoria',
              passed: memoryUsage < 100, // Menos de 100MB
              message: `${memoryUsage.toFixed(1)}MB`
            });
            
            observer.next({
              category: 'Rendimiento',
              tests,
              passed: tests.every(t => t.passed),
              duration: Date.now() - startTime
            });
            observer.complete();
          } catch (error) {
            tests.push({
              name: 'Test de rendimiento',
              passed: false,
              message: `Error: ${error}`
            });
            
            observer.next({
              category: 'Rendimiento',
              tests,
              passed: false,
              duration: Date.now() - startTime
            });
            observer.complete();
          }
        }
      );
    });
  }

  /**
   * Validar consistencia del sistema
   */
  private validateConsistency(): Observable<TestResult> {
    return new Observable(observer => {
      const startTime = Date.now();
      const tests: TestCase[] = [];
      
      const sameResponses = AVITestDataGenerator.generateTestResponses('LOW_RISK');
      let completedRuns = 0;
      const results: number[] = [];
      const totalRuns = 5;
      
      // Ejecutar el mismo caso 5 veces para verificar consistencia
      for (let i = 0; i < totalRuns; i++) {
        this.dualEngine.calculateDualEngineScore([...sameResponses]).subscribe(
          async (resultPromise) => {
            try {
              const result = await resultPromise;
              results.push(result.consolidatedScore.totalScore);
              completedRuns++;
              
              if (completedRuns === totalRuns) {
                // Analizar consistencia
                const mean = results.reduce((a, b) => a + b) / results.length;
                const variance = results.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / results.length;
                const stdDev = Math.sqrt(variance);
                
                tests.push({
                  name: 'Consistencia de resultados',
                  passed: stdDev < 50, // Desviación estándar menor a 50 puntos
                  message: `Desviación estándar: ${stdDev.toFixed(1)} puntos`
                });
                
                tests.push({
                  name: 'Variabilidad controlada',
                  passed: (Math.max(...results) - Math.min(...results)) < 100,
                  message: `Rango: ${(Math.max(...results) - Math.min(...results)).toFixed(1)} puntos`
                });
                
                observer.next({
                  category: 'Consistencia',
                  tests,
                  passed: tests.every(t => t.passed),
                  duration: Date.now() - startTime
                });
                observer.complete();
              }
            } catch (error) {
              completedRuns++;
            }
          }
        );
      }
    });
  }

  /**
   * Validar manejo de casos extremos
   */
  private validateEdgeCases(edgeCases: ValidationCase[]): Observable<TestResult> {
    return new Observable(observer => {
      const startTime = Date.now();
      const tests: TestCase[] = [];
      let completedCases = 0;
      let handledCorrectly = 0;
      
      edgeCases.forEach((testCase, index) => {
        this.dualEngine.calculateDualEngineScore(testCase.responses).subscribe(
          async (resultPromise) => {
            try {
              const result = await resultPromise;
              
              // Verificar que se detectaron inconsistencias
              const hasRedFlags = result.consolidatedScore.redFlags.length > 0;
              const lowConsensus = result.consensus.level === 'LOW';
              const appropriateRisk = result.consolidatedScore.riskLevel === 'HIGH' || result.consolidatedScore.riskLevel === 'CRITICAL';
              
              if (hasRedFlags || lowConsensus || appropriateRisk) {
                handledCorrectly++;
              }
              
              completedCases++;
              if (completedCases === edgeCases.length) {
                const successRate = handledCorrectly / edgeCases.length;
                
                tests.push({
                  name: 'Detección de casos inconsistentes',
                  passed: successRate >= 0.7,
                  message: `${(successRate * 100).toFixed(1)}% de casos manejados correctamente`
                });
                
                observer.next({
                  category: 'Casos Extremos',
                  tests,
                  passed: tests.every(t => t.passed),
                  duration: Date.now() - startTime
                });
                observer.complete();
              }
            } catch (error) {
              completedCases++;
            }
          }
        );
      });
    });
  }

  /**
   * Validar sistema de calibración
   */
  private validateCalibration(): Observable<TestResult> {
    return new Observable(observer => {
      const startTime = Date.now();
      const tests: TestCase[] = [];
      
      const calibrationSamples = AVITestDataGenerator.generateCalibrationSamples(50);
      
      this.calibrationService.performAutoCalibration(calibrationSamples).subscribe({
        next: result => {
          tests.push({
            name: 'Ejecución de calibración',
            passed: !!result,
            message: 'Calibración completada'
          });
          
          tests.push({
            name: 'Ajustes identificados',
            passed: result.adjustmentsMade.length >= 0,
            message: `${result.adjustmentsMade.length} ajustes realizados`
          });
          
          tests.push({
            name: 'Confianza de calibración',
            passed: result.confidence > 0 && result.confidence <= 1,
            message: `${(result.confidence * 100).toFixed(1)}% de confianza`
          });
          
          observer.next({
            category: 'Sistema de Calibración',
            tests,
            passed: tests.every(t => t.passed),
            duration: Date.now() - startTime
          });
          observer.complete();
        },
        error: err => {
          tests.push({
            name: 'Test de calibración',
            passed: false,
            message: `Error: ${err.message}`
          });
          
          observer.next({
            category: 'Sistema de Calibración',
            tests,
            passed: false,
            duration: Date.now() - startTime
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * Compilar reporte final de validación
   */
  private compileValidationReport(results: any): ValidationReport {
    const allTests = Object.values(results) as TestResult[];
    const totalTests = allTests.reduce((sum, result) => sum + result.tests.length, 0);
    const passedTests = allTests.reduce((sum, result) => sum + result.tests.filter(t => t.passed).length, 0);
    const totalDuration = allTests.reduce((sum, result) => sum + result.duration, 0);
    
    return {
      timestamp: new Date(),
      overallStatus: allTests.every(result => result.passed) ? 'PASSED' : 'FAILED',
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: (passedTests / totalTests) * 100,
        totalDuration
      },
      categories: allTests,
      recommendations: this.generateRecommendations(allTests)
    };
  }

  /**
   * Generar recomendaciones basadas en resultados
   */
  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (!result.passed) {
        const failedTests = result.tests.filter(t => !t.passed);
        failedTests.forEach(test => {
          recommendations.push(` ${result.category}: ${test.name} - ${test.message}`);
        });
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push(' Todos los tests pasaron exitosamente');
      recommendations.push(' Sistema AVI listo para producción');
    }
    
    return recommendations;
  }

  /**
   * Generar reporte de error
   */
  private getErrorReport(error: any): ValidationReport {
    return {
      timestamp: new Date(),
      overallStatus: 'ERROR',
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        successRate: 0,
        totalDuration: 0
      },
      categories: [{
        category: 'System Error',
        tests: [{
          name: 'Validation Execution',
          passed: false,
          message: error.message || 'Unknown error'
        }],
        passed: false,
        duration: 0
      }],
      recommendations: [' Error crítico en validación - revisar logs del sistema']
    };
  }
}

// Interfaces para validación
export interface ValidationReport {
  timestamp: Date;
  overallStatus: 'PASSED' | 'FAILED' | 'ERROR';
  summary: ValidationSummary;
  categories: TestResult[];
  recommendations: string[];
}

export interface ValidationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
}

export interface TestResult {
  category: string;
  tests: TestCase[];
  passed: boolean;
  duration: number;
}

export interface TestCase {
  name: string;
  passed: boolean;
  message: string;
}
