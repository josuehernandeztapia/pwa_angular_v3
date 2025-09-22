import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap, delay } from 'rxjs/operators';
import { 
  ApplicationConfiguration, 
  MarketConfiguration, 
  ScoringConfiguration,
  PaymentCapacityConfiguration,
  DocumentConfiguration,
  EarlyPaymentConfiguration,
  DownPaymentConfiguration,
  APIConfiguration,
  BusinessFlowConfiguration,
  AVIConfiguration,
  QuestionnaireConfiguration,
  NotificationConfiguration,
  WorkflowConfiguration,
  SimpleUIConfiguration,
  SmartUXConfiguration,
  AnalyticsConfiguration,
  UXOptimizationConfiguration
} from '../models/configuration.types';
import { BusinessFlow } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  private configurationSubject = new BehaviorSubject<ApplicationConfiguration>(this.getDefaultConfiguration());
  public configuration$ = this.configurationSubject.asObservable();

  // Namespace config cache (for dynamic JSON loads)
  private namespaceCache = new Map<string, { etag?: string; value: any }>();
  private namespaceObsCache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {
    this.loadConfiguration();
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): ApplicationConfiguration {
    return this.configurationSubject.value;
  }

  /**
   * Load configuration from external API/webhook
   */
  private loadConfiguration(): void {
    // Load from external configuration API
    this.loadConfigurationFromAPI().subscribe({
      next: (config) => {
        this.configurationSubject.next(config);
      },
      error: (error) => {
// removed by clean-audit
        const config = this.getDefaultConfiguration();
        this.configurationSubject.next(config);
      }
    });
  }

  /**
   * Load configuration from external API
   */
  private loadConfigurationFromAPI(): Observable<ApplicationConfiguration> {
    // Backward-compatible: keep existing default config as fallback
    return of(this.getDefaultConfiguration());
  }

  /**
   * Refresh configuration from webhook/API
   */
  refreshConfiguration(): Observable<ApplicationConfiguration> {
    return this.loadConfigurationFromAPI();
  }

  /**
   * Load a configuration namespace with precedence:
   * environment.remoteBaseUrl (if enabled) -> assets -> default
   * Caches responses and honors ETag if provided by remote.
   */
  loadNamespace<T = any>(namespace: string, defaultValue: T): Observable<T> {
    const cached = this.namespaceObsCache.get(namespace);
    if (cached) return cached as Observable<T>;

    const obs = this.loadFromRemote<T>(namespace).pipe(
      catchError(() => this.loadFromAssets<T>(namespace)),
      catchError(() => of(defaultValue)),
      shareReplay(1)
    );

    this.namespaceObsCache.set(namespace, obs);
    return obs;
  }

  private loadFromRemote<T>(namespace: string): Observable<T> {
    const { environment } = (window as any);
    // Prefer Angular's environment if bundled
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const env = require('../../environments/environment');
      const features = env.environment?.features || {};
      const remoteBaseUrl = env.environment?.config?.remoteBaseUrl || '';
      if (!features.enableRemoteConfig || !remoteBaseUrl) {
        return throwError(() => new Error('Remote config disabled'));
      }

      const cache = this.namespaceCache.get(namespace);
      const headers: Record<string, string> = {};
      if (cache?.etag) headers['If-None-Match'] = cache.etag;

      return this.http.get(`${remoteBaseUrl}/${namespace}.json`, { observe: 'response', headers }).pipe(
        map(resp => {
          if (resp.status === 304 && cache) return cache.value as T;
          const etag = resp.headers.get('ETag') || undefined;
          const body = resp.body as T;
          this.namespaceCache.set(namespace, { etag, value: body });
          return body;
        })
      );
    } catch {
      return throwError(() => new Error('Environment not available for remote config'));
    }
  }

  private loadFromAssets<T>(namespace: string): Observable<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const env = require('../../environments/environment');
      const assetsBasePath = env.environment?.config?.assetsBasePath || '/assets/config';
      return this.http.get<T>(`${assetsBasePath}/${namespace}.json`).pipe(
        tap(value => this.namespaceCache.set(namespace, { value }))
      );
    } catch {
      return throwError(() => new Error('Assets base path not available'));
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<ApplicationConfiguration>): Observable<boolean> {
    const currentConfig = this.getCurrentConfiguration();
    const updatedConfig: ApplicationConfiguration = {
      ...currentConfig,
      ...config,
      lastUpdated: new Date()
    };

    // In production, this would save to API/localStorage
    this.configurationSubject.next(updatedConfig);
    
    return of(true).pipe(delay(200));
  }

  /**
   * Get market configuration
   */
  getMarketConfiguration(): MarketConfiguration {
    return this.getCurrentConfiguration().markets;
  }

  /**
   * Get scoring configuration
   */
  getScoringConfiguration(): ScoringConfiguration {
    return this.getCurrentConfiguration().scoring;
  }

  /**
   * Get business flow configuration
   */
  getBusinessFlowConfiguration(): BusinessFlowConfiguration {
    return this.getCurrentConfiguration().businessFlows;
  }

  /**
   * Get AVI configuration
   */
  getAVIConfiguration(): AVIConfiguration {
    return this.getCurrentConfiguration().avi;
  }

  /**
   * Get AVI questions by category
   */
  getAVIQuestionsByCategory(category?: string): any[] {
    const aviConfig = this.getAVIConfiguration();
    const allQuestions: any[] = [
      ...aviConfig.questions.core,
      ...Object.values(aviConfig.questions.businessFlow).flat().filter(Boolean) as any[],
      ...Object.values(aviConfig.questions.market).flat().filter(Boolean) as any[]
    ];
    if (category) {
      return allQuestions.filter((q: any) => q.category === category);
    }
    return allQuestions;
  }

  /**
   * Get critical AVI questions (weight >= 9)
   */
  getCriticalAVIQuestions(): any[] {
    const aviConfig = this.getAVIConfiguration();
    const allQuestions: any[] = [
      ...aviConfig.questions.core,
      ...Object.values(aviConfig.questions.businessFlow).flat().filter(Boolean) as any[],
      ...Object.values(aviConfig.questions.market).flat().filter(Boolean) as any[]
    ];
    return allQuestions.filter((q: any) => q.weight >= 9);
  }

  /**
   * Get questionnaire configuration
   */
  getQuestionnaireConfiguration(): QuestionnaireConfiguration {
    return this.getCurrentConfiguration().questionnaire;
  }

  /**
   * Get notification configuration
   */
  getNotificationConfiguration(): NotificationConfiguration {
    return this.getCurrentConfiguration().notifications;
  }

  /**
   * Get workflow configuration
   */
  getWorkflowConfiguration(): WorkflowConfiguration {
    return this.getCurrentConfiguration().workflows;
  }

  /**
   * Get simple UI configuration
   */
  getSimpleUIConfiguration(): SimpleUIConfiguration {
    return this.getCurrentConfiguration().simpleUI;
  }

  /**
   * Get smart UX configuration
   */
  getSmartUXConfiguration(): SmartUXConfiguration {
    return this.getCurrentConfiguration().smartUX;
  }

  /**
   * Get analytics configuration
   */
  getAnalyticsConfiguration(): AnalyticsConfiguration {
    return this.getCurrentConfiguration().analytics;
  }

  /**
   * Get UX optimization configuration
   */
  getUXOptimizationConfiguration(): UXOptimizationConfiguration {
    return this.getCurrentConfiguration().uxOptimization;
  }

  /**
   * Get default configuration based on current business logic
   */
  private getDefaultConfiguration(): ApplicationConfiguration {
    const getEnv = (key: string, fallback: string): string => {
      try {
        // Safe access to process.env in browser
        const env = (typeof process !== 'undefined' && (process as any).env)
          || ((typeof window !== 'undefined' && (window as any).process && (window as any).process.env) ? (window as any).process.env : undefined);
        const value = env?.[key];
        return (typeof value === 'string' && value.length > 0) ? value : fallback;
      } catch {
        return fallback;
      }
    };
    const markets: MarketConfiguration = {
      aguascalientes: {
        interestRate: 0.255,
        standardTerm: 24,
        minimumDownPayment: 0.60
      },
      edomex: {
        interestRate: 0.299,
        standardTermIndividual: 48,
        standardTermCollective: 60,
        minimumDownPaymentIndividual: 0.25,
        minimumDownPaymentCollective: 0.15,
        municipalities: [
          // ZMVM
          { code: 'ecatepec', name: 'Ecatepec de Morelos', zone: 'ZMVM' },
          { code: 'nezahualcoyotl', name: 'Ciudad Nezahualcóyotl', zone: 'ZMVM' },
          { code: 'naucalpan', name: 'Naucalpan de Juárez', zone: 'ZMVM' },
          { code: 'tlalnepantla', name: 'Tlalnepantla de Baz', zone: 'ZMVM' },
          { code: 'chimalhuacan', name: 'Chimalhuacán', zone: 'ZMVM' },
          { code: 'atizapan', name: 'Atizapán de Zaragoza', zone: 'ZMVM' },
          { code: 'cuautitlan_izcalli', name: 'Cuautitlán Izcalli', zone: 'ZMVM' },
          { code: 'tultitlan', name: 'Tultitlán', zone: 'ZMVM' },
          // Central
          { code: 'toluca', name: 'Toluca de Lerdo', zone: 'Central' },
          { code: 'metepec', name: 'Metepec', zone: 'Central' },
          { code: 'lerma', name: 'Lerma', zone: 'Central' },
          { code: 'zinacantepec', name: 'Zinacantepec', zone: 'Central' },
          // Eastern
          { code: 'texcoco', name: 'Texcoco', zone: 'Eastern' },
          { code: 'chalco', name: 'Chalco', zone: 'Eastern' },
          { code: 'valle_chalco', name: 'Valle de Chalco Solidaridad', zone: 'Eastern' },
          { code: 'la_paz', name: 'La Paz', zone: 'Eastern' },
          // Northern
          { code: 'teotihuacan', name: 'Teotihuacán', zone: 'Northern' },
          { code: 'zumpango', name: 'Zumpango', zone: 'Northern' },
          { code: 'huehuetoca', name: 'Huehuetoca', zone: 'Northern' },
          // Southern
          { code: 'tenancingo', name: 'Tenancingo', zone: 'Southern' },
          { code: 'ixtapan_sal', name: 'Ixtapan de la Sal', zone: 'Southern' }
        ]
      }
    };

    const scoring: ScoringConfiguration = {
      businessFlowRequirements: {
        [BusinessFlow.VentaDirecta]: {
          minScore: 700,
          preferredGrades: ['A+', 'A'],
          maxLoanToValue: 0.50,
          notes: ['Venta de contado requiere mayor capacidad de pago inmediato']
        },
        [BusinessFlow.VentaPlazo]: {
          minScore: 650,
          preferredGrades: ['A+', 'A', 'B+'],
          maxLoanToValue: 0.80,
          notes: ['Plazo máximo 48 meses']
        },
        [BusinessFlow.CreditoColectivo]: {
          minScore: 620,
          preferredGrades: ['A+', 'A', 'B+', 'B'],
          maxLoanToValue: 0.85,
          notes: [
            'Crédito grupal permite mayor apalancamiento',
            'Evaluación individual + grupal',
            'Mínimo 5 integrantes con score promedio >= 650'
          ]
        },
        [BusinessFlow.AhorroProgramado]: {
          minScore: 600,
          preferredGrades: ['A+', 'A', 'B+', 'B', 'C+'],
          maxLoanToValue: 0.70,
          notes: [
            'Programa de ahorro con menor riesgo crediticio',
            'Capacidad de ahorro es indicador principal'
          ]
        },
        [BusinessFlow.Individual]: {
          minScore: 620,
          preferredGrades: ['A+', 'A', 'B+'],
          maxLoanToValue: 0.75,
          notes: ['Perfil individual estándar']
        }
      },
      scoringThresholds: {
        grades: {
          'A+': { min: 800, decision: 'APPROVED', risk: 'LOW' },
          'A': { min: 750, decision: 'APPROVED', risk: 'LOW' },
          'B+': { min: 700, decision: 'APPROVED', risk: 'MEDIUM' },
          'B': { min: 650, decision: 'CONDITIONAL', risk: 'MEDIUM' },
          'C+': { min: 600, decision: 'CONDITIONAL', risk: 'HIGH' },
          'C': { min: 550, decision: 'REJECTED', risk: 'HIGH' },
          'D': { min: 500, decision: 'REJECTED', risk: 'VERY_HIGH' },
          'E': { min: 0, decision: 'REJECTED', risk: 'VERY_HIGH' }
        }
      },
      scoringFactors: {
        documentBonus: {
          ineApproved: 20,
          comprobanteApproved: 15,
          kycCompleted: 25
        },
        financialFactors: {
          lowDebtRatio: { threshold: 0.3, bonus: 30 },
          highDebtRatio: { threshold: 0.6, penalty: -50 },
          lowLoanRatio: { threshold: 0.3, bonus: 20 },
          highLoanRatio: { threshold: 0.5, penalty: -30 }
        },
        marketBonus: {
          aguascalientes: 10
        },
        businessFlowModifiers: {
          [BusinessFlow.CreditoColectivo]: 15,
          [BusinessFlow.VentaDirecta]: -10,
          [BusinessFlow.VentaPlazo]: 0,
          [BusinessFlow.AhorroProgramado]: 0,
          [BusinessFlow.Individual]: 0
        }
      }
    };

    const paymentCapacity: PaymentCapacityConfiguration = {
      debtToIncomeRatios: {
        maxTotalDebt: 0.35,
        availableForNewDebt: 0.4,
        riskThresholds: {
          low: { debt: 0.25, payment: 0.15 },
          medium: { debt: 0.4, payment: 0.25 },
          high: { debt: 0.4, payment: 0.25 }
        }
      },
      recommendationRules: {
        excellentCapacity: { paymentRatio: 0.10 },
        edomexCollectiveThreshold: { paymentRatio: 0.20 },
        liquidationRequired: { debtRatio: 0.35 }
      }
    };

    const documents: DocumentConfiguration = {
      requiredDocuments: {
        core: ['INE Vigente', 'Comprobante de domicilio', 'Verificación Biométrica (Metamap)'],
        businessFlow: {
          [BusinessFlow.VentaPlazo]: ['Copia de la concesión', 'Tarjeta de circulación'],
          [BusinessFlow.CreditoColectivo]: ['Acta Constitutiva de la Ruta', 'Poder del Representante Legal']
        },
        market: {
          edomex: ['Carta de antigüedad de la ruta'],
          aguascalientes: ['Constancia de situación fiscal']
        }
      }
    };

    const earlyPayment: EarlyPaymentConfiguration = {
      recommendedPaymentPercentage: 0.10,
      breakEvenCalculation: {
        enabled: true,
        basedOnMonthlyRate: true
      },
      savingsCalculation: {
        includeMonthsSaved: true,
        calculateNewPayoffDate: true
      }
    };

    const downPayment: DownPaymentConfiguration = {
      minimumPercentages: {
        [BusinessFlow.VentaPlazo]: {
          aguascalientes: 0.60,
          edomex: 0.25
        },
        [BusinessFlow.CreditoColectivo]: {
          edomex: 0.15
        },
        [BusinessFlow.VentaDirecta]: {},
        [BusinessFlow.AhorroProgramado]: {},
        [BusinessFlow.Individual]: { aguascalientes: 0.20, edomex: 0.20 }
      },
      recommendations: {
        recommendedBonus: 0.10,
        emergencyFundReserve: 0.20,
        optimalPercentage: 0.35,
        maxOptimalPercentage: 0.60,
        maxCashUtilization: 0.75
      },
      scenarioPercentages: [0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
    };

    const api: APIConfiguration = {
      kinban: {
        apiUrl: getEnv('KINBAN_API_URL', 'https://api.kinban.com'),
        clientId: getEnv('KINBAN_CLIENT_ID', 'demo_client_id'),
        secret: getEnv('KINBAN_SECRET', 'demo_secret'),
        timeout: 30000
      },
      hase: {
        apiUrl: getEnv('HASE_API_URL', 'https://api.hase.mx'),
        token: getEnv('HASE_TOKEN', 'demo_hase_token'),
        timeout: 30000
      },
      estimatedProcessingTime: 3
    };

    const businessFlows: BusinessFlowConfiguration = {
      [BusinessFlow.VentaDirecta]: {
        interestRate: 0,
        requiresImmediateCapacity: true
      },
      [BusinessFlow.AhorroProgramado]: {
        interestRate: 0.12,
        focusOnSavingsCapacity: true
      },
      [BusinessFlow.VentaPlazo]: {
        maxTerm: {
          aguascalientes: 24,
          edomex: 48
        }
      },
      [BusinessFlow.CreditoColectivo]: {
        maxTerm: {
          edomex: 60
        },
        groupRequirements: {
          minMembers: 5,
          avgScoreRequired: 650
        }
      },
      [BusinessFlow.Individual]: {
        maxTerm: {
          aguascalientes: 36,
          edomex: 36
        }
      }
    };

    const avi: AVIConfiguration = {
      enabled: true,
      apiUrl: getEnv('AVI_API_URL', 'https://api.avi-service.com'),
      apiKey: getEnv('AVI_API_KEY', 'demo_avi_key'),
      timeout: 30000,
      retryAttempts: 3,
      questions: {
        core: [
          {
            id: 'name_verification',
            type: 'identity',
            question: '¿Cuál es su nombre completo?',
            expectedAnswerType: 'text',
            weight: 10,
            required: true,
            validationRules: { minLength: 3, maxLength: 100 }
          },
          {
            id: 'rfc_verification',
            type: 'identity',
            question: '¿Cuál es su RFC?',
            expectedAnswerType: 'text',
            weight: 15,
            required: true,
            validationRules: { pattern: '^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$' }
          },
          {
            id: 'monthly_income',
            type: 'financial',
            question: '¿Cuál es su ingreso mensual aproximado?',
            expectedAnswerType: 'number',
            weight: 20,
            required: true,
            validationRules: { range: { min: 5000, max: 500000 } }
          }
        ],
        businessFlow: {
          [BusinessFlow.VentaPlazo]: [
            {
              id: 'route_experience',
              type: 'business',
              question: '¿Cuántos años tiene trabajando en esta ruta?',
              expectedAnswerType: 'number',
              weight: 15,
              required: true,
              validationRules: { range: { min: 0, max: 50 } }
            }
          ],
          [BusinessFlow.CreditoColectivo]: [
            {
              id: 'group_knowledge',
              type: 'business',
              question: '¿Conoce personalmente a todos los integrantes del grupo?',
              expectedAnswerType: 'boolean',
              weight: 10,
              required: true
            }
          ],
          [BusinessFlow.AhorroProgramado]: [],
          [BusinessFlow.VentaDirecta]: [],
          [BusinessFlow.Individual]: []
        },
        market: {
          all: [],
          aguascalientes: [],
          edomex: [
            {
              id: 'municipality_confirm',
              type: 'verification',
              question: '¿En qué municipio opera su ruta?',
              expectedAnswerType: 'choice',
              choices: ['Ecatepec', 'Nezahualcóyotl', 'Toluca', 'Naucalpan', 'Otro'],
              weight: 8,
              required: true
            }
          ]
        }
      },
      randomQuestions: {
        enabled: true,
        selectionCount: 2,
        weightedSelection: true,
        optimization: {
          enabled: true,
          learningAlgorithm: 'simple_weighted',
          adjustmentFrequency: 'weekly',
          minSampleSize: 50
        },
        pool: [
          {
            id: 'family_size',
            category: 'personal',
            question: '¿Cuántas personas dependen económicamente de usted?',
            expectedAnswerType: 'number',
            weight: 5,
            difficultyLevel: 'easy',
            tags: ['family', 'dependents']
          },
          {
            id: 'vehicle_age',
            category: 'vehicle',
            question: '¿Qué edad tiene su vehículo actual?',
            expectedAnswerType: 'number',
            weight: 7,
            difficultyLevel: 'medium',
            tags: ['vehicle', 'age']
          },
          {
            id: 'route_challenges',
            category: 'experience',
            question: '¿Cuál ha sido el mayor reto en su trabajo como conductor?',
            expectedAnswerType: 'text',
            weight: 8,
            difficultyLevel: 'hard',
            tags: ['experience', 'challenges']
          }
        ]
      },
      validation: {
        minimumConfidenceScore: 0.75,
        requiresHumanReview: true,
        autoApprovalThreshold: 0.90
      },
      analytics: {
        stressIndicators: {
          enabled: true,
          metrics: {
            responseTime: { track: true, thresholds: { normal: 5, slow: 10, critical: 20 } },
            pauseAnalysis: { track: true, longPauseThreshold: 3, maxPausesPerQuestion: 5 },
            repetitionRequests: { track: true, maxRepetitions: 3 },
            uncertaintyWords: { track: true, keywords: ['mmm', 'no sé'], threshold: 3 },
            voiceAnalysis: { enabled: true, toneChanges: true, speedVariation: true, volumeChanges: false }
          }
        },
        effectivenessMetrics: {
          enabled: true,
          tracking: {
            correctnessRate: true,
            consistencyBetweenSessions: true,
            confidenceCorrelation: true,
            abandonmentByQuestion: true,
            completionTime: true,
            humanReviewAgreement: true
          },
          segmentation: { byDemographics: false, byExperience: false, byMarket: true, byBusinessFlow: true }
        },
        realTimeMonitoring: {
          enabled: true,
          alertsThreshold: { highAbandonmentRate: 30, lowConfidenceRate: 50, longResponseTime: 20 },
          adaptiveQuestioning: { enabled: true, skipOnHighStress: true, simplifyOnConfusion: true, reorderOnDifficulty: true }
        }
      },
      optimization: {
        weightOptimization: {
          enabled: true,
          algorithm: 'manual_override',
          factors: {
            correctnessWeight: 0.4,
            responseTimeWeight: 0.2,
            stressIndicatorWeight: 0.2,
            consistencyWeight: 0.1,
            humanAgreementWeight: 0.1
          },
          adjustmentRules: []
        },
        questionLifecycle: {
          enabled: true,
          retirement: { lowPerformanceThreshold: 0.3, minSampleSize: 50, autoRemove: false },
          promotion: { highPerformanceThreshold: 0.8, increaseWeight: true },
          rotation: { enabled: true, newQuestionIntroduction: 0.1, testPeriod: 14 }
        },
        smartOrdering: { enabled: true, strategy: 'adaptive_flow', rules: [], dynamicReordering: true },
        abTesting: { enabled: false, testTypes: ['question_wording'], sampleSize: 200, confidenceLevel: 0.95, maxTestDuration: 14, autoImplementWinner: false },
        learningSystem: { enabled: false, modelType: 'rule_based', trainingData: { includeStressMetrics: true, includeOutcomes: true, includeHumanFeedback: false, retentionPeriod: 90 }, continuousLearning: { enabled: false, updateFrequency: 'weekly', minSampleForUpdate: 100 } }
      }
    };

    const questionnaire: QuestionnaireConfiguration = {
      standardQuestionnaire: {
        sections: [
          {
            id: 'personal_info',
            title: 'Información Personal',
            order: 1,
            required: true,
            questions: [
              {
                id: 'full_name',
                type: 'text',
                label: 'Nombre completo',
                required: true,
                validation: { minLength: 3, maxLength: 100 }
              },
              {
                id: 'birth_date',
                type: 'date',
                label: 'Fecha de nacimiento',
                required: true
              }
            ]
          },
          {
            id: 'financial_info',
            title: 'Información Financiera',
            order: 2,
            required: true,
            questions: [
              {
                id: 'monthly_income',
                type: 'number',
                label: 'Ingreso mensual',
                required: true,
                validation: { min: 0, max: 1000000 }
              },
              {
                id: 'existing_debts',
                type: 'number',
                label: 'Deudas existentes mensuales',
                required: false,
                validation: { min: 0 }
              }
            ]
          }
        ],
        completionRequirements: {
          minimumSections: 2,
          minimumQuestionsPerSection: 1,
          allowSkipOptional: true
        }
      },
      dynamicQuestionnaire: {
        enabled: true,
        adaptiveLogic: true,
        branchingRules: [
          {
            id: 'high_income_branch',
            condition: {
              questionId: 'monthly_income',
              operator: 'greater_than',
              value: 50000
            },
            action: {
              type: 'show',
              target: 'investment_section'
            }
          }
        ]
      },
      validation: {
        realTimeValidation: true,
        crossFieldValidation: true,
        progressSaving: true
      }
    };

    const notifications: NotificationConfiguration = {
      channels: {
        email: {
          enabled: true,
          templates: [
            {
              id: 'welcome_email',
              name: 'Correo de Bienvenida',
              subject: 'Bienvenido a Conductores PWA',
              body: 'Estimado {{clientName}}, gracias por registrarse...',
              variables: ['clientName', 'advisorName']
            }
          ]
        },
        sms: {
          enabled: true,
          templates: [
            {
              id: 'payment_reminder',
              name: 'Recordatorio de Pago',
              message: 'Hola {{clientName}}, le recordamos que su pago de ${{amount}} vence el {{dueDate}}',
              maxLength: 160,
              variables: ['clientName', 'amount', 'dueDate']
            }
          ]
        },
        push: {
          enabled: true,
          templates: [
            {
              id: 'doc_approved',
              name: 'Documento Aprobado',
              title: 'Documento Aprobado',
              body: 'Su documento {{docName}} ha sido aprobado',
              variables: ['docName']
            }
          ]
        },
        whatsapp: {
          enabled: false,
          templates: []
        }
      },
      triggers: [
        {
          id: 'new_client_trigger',
          event: 'client_created',
          channels: ['email', 'sms'],
          templateId: 'welcome_email'
        }
      ],
      schedules: [
        {
          id: 'monthly_statement',
          name: 'Estado de Cuenta Mensual',
          frequency: 'monthly',
          dayOfMonth: 1,
          channels: ['email'],
          templateId: 'monthly_statement',
          targetAudience: {
            status: ['active']
          }
        }
      ]
    };

    const workflows: WorkflowConfiguration = {
      automations: [
        {
          id: 'auto_approve_high_score',
          name: 'Auto Aprobación Score Alto',
          trigger: {
            event: 'scoring_completed',
            conditions: [{ field: 'score', operator: 'greater_than', value: 800 }]
          },
          actions: [
            {
              type: 'update_status',
              parameters: { status: 'approved' }
            },
            {
              type: 'notify',
              parameters: { template: 'approval_notification' }
            }
          ],
          enabled: true
        }
      ],
      approvalChains: [
        {
          id: 'loan_approval_chain',
          name: 'Cadena de Aprobación de Crédito',
          steps: [
            {
              id: 'supervisor_approval',
              approverRole: 'supervisor',
              timeoutMinutes: 1440
            }
          ],
          parallelApproval: false,
          requiredApprovals: 1
        }
      ],
      escalationRules: [
        {
          id: 'pending_docs_escalation',
          trigger: 'documents_pending',
          timeThresholdMinutes: 4320, // 3 days
          escalateTo: ['supervisor'],
          actions: ['send_reminder', 'assign_priority']
        }
      ],
      slaTargets: [
        {
          process: 'document_review',
          targetMinutes: 1440, // 24 hours
          warningThresholdPercent: 80,
          escalationThresholdPercent: 100
        }
      ]
    };

    const simpleUI: SimpleUIConfiguration = {
      theme: {
        primaryColor: '#1E40AF',
        secondaryColor: '#64748B',
        fontSize: 'large',
        buttonSize: 'large',
        spacing: 'comfortable',
        contrast: 'high'
      },
      navigation: {
        breadcrumbs: true,
        backButton: true,
        progressIndicator: true,
        stepNumbers: true,
        quickActions: false
      },
      forms: {
        autoFocus: true,
        largeInputs: true,
        clearLabels: true,
        inlineValidation: true,
        helpTooltips: true,
        requiredIndicators: true
      },
      language: {
        locale: 'es-MX',
        simplifiedTerms: true,
        industryJargon: false,
        formalLanguage: false
      }
    };

    const smartUX: SmartUXConfiguration = {
      autoComplete: {
        enabled: true,
        sources: ['user_history', 'regional_patterns', 'market_data'],
        fields: [
          {
            fieldId: 'municipality',
            type: 'select',
            source: 'regional_patterns',
            weight: 10,
            minConfidence: 0.8
          },
          {
            fieldId: 'monthly_income',
            type: 'number',
            source: 'market_data',
            weight: 8,
            minConfidence: 0.7
          }
        ],
        confidence: {
          minimum: 0.7,
          showLevel: false
        }
      },
      realTimeValidation: {
        enabled: true,
        types: ['format', 'business_rules', 'duplicate_check'],
        showSuccess: true,
        preventSubmission: true
      },
      visualProgress: {
        type: 'steps',
        showTimeEstimate: true,
        showCompletion: true,
        milestones: true
      },
      sessionRecovery: {
        enabled: true,
        autoSave: true,
        saveInterval: 30,
        maxRetention: 24,
        crossDevice: false
      },
      smartDefaults: {
        enabled: true,
        basedOn: ['market_trends', 'advisor_patterns'],
        fields: [
          {
            fieldId: 'business_flow',
            strategy: 'most_common',
            conditions: ['market:edomex']
          }
        ]
      }
    };

    const analytics: AnalyticsConfiguration = {
      heatmaps: {
        enabled: true,
        pages: ['nueva-oportunidad', 'dashboard', 'cliente-detail'],
        clickTracking: true,
        scrollTracking: true,
        hoverTracking: false,
        formInteractions: true
      },
      sessionRecording: {
        enabled: true,
        sampleRate: 10,
        maxDuration: 30,
        excludeFields: ['rfc', 'phone', 'email'],
        maskSensitiveData: true
      },
      funnelAnalysis: {
        enabled: true,
        funnels: [
          {
            id: 'nueva_oportunidad_funnel',
            name: 'Nueva Oportunidad',
            steps: [
              { id: 'start', name: 'Inicio', required: true, order: 1 },
              { id: 'basic_info', name: 'Información Básica', required: true, order: 2 },
              { id: 'documents', name: 'Documentos', required: true, order: 3 },
              { id: 'submit', name: 'Envío', required: true, order: 4 }
            ],
            goals: ['conversion', 'completion_time'],
            alerts: {
              dropoffRate: 25,
              completionRate: 75,
              timeThreshold: 15
            }
          }
        ],
        dropoffAlerts: true,
        realTimeMonitoring: true
      },
      errorTracking: {
        enabled: true,
        types: ['validation_errors', 'system_errors', 'user_errors'],
        autoGrouping: true,
        alertThreshold: 10
      },
      performanceMetrics: {
        enabled: true,
        metrics: [
          {
            name: 'page_load_time',
            target: 2000,
            warning: 3000,
            critical: 5000,
            unit: 'ms',
            pages: ['nueva-oportunidad', 'dashboard']
          },
          {
            name: 'form_completion_time',
            target: 300,
            warning: 600,
            critical: 900,
            unit: 'seconds'
          },
          {
            name: 'error_rate',
            target: 5,
            warning: 10,
            critical: 20,
            unit: 'percentage'
          }
        ],
        realTime: true,
        benchmarking: true
      },
      userBehavior: {
        enabled: true,
        trackingEvents: [
          {
            name: 'form_field_focus',
            category: 'form_interaction',
            trigger: 'focus',
            properties: ['field_id', 'form_name'],
            valuable: false
          },
          {
            name: 'nueva_oportunidad_completed',
            category: 'business_action',
            trigger: 'submit',
            properties: ['business_flow', 'market', 'completion_time'],
            valuable: true
          }
        ],
        segmentation: [
          {
            name: 'by_market',
            criteria: [
              { field: 'market', operator: 'equals', value: 'aguascalientes' },
              { field: 'market', operator: 'equals', value: 'edomex' }
            ],
            trackSeparately: true
          }
        ],
        cohortAnalysis: true
      }
    };

    const uxOptimization: UXOptimizationConfiguration = {
      abTesting: {
        enabled: true,
        autoCreate: false,
        testTypes: ['ui_variant', 'flow_optimization'],
        sampleSize: 1000,
        confidenceLevel: 0.95,
        maxTestDuration: 30
      },
      recommendations: {
        enabled: true,
        aiPowered: false,
        categories: ['performance', 'usability', 'conversion'],
        autoApply: {
          enabled: false,
          safetyThreshold: 0.95,
          rollbackOnFailure: true
        }
      },
      realTimeOptimization: {
        enabled: true,
        adaptiveUI: true,
        personalizedExperience: false,
        loadOptimization: true
      }
    };

    return {
      markets,
      scoring,
      paymentCapacity,
      documents,
      earlyPayment,
      downPayment,
      api,
      businessFlows,
      avi,
      questionnaire,
      notifications,
      workflows,
      simpleUI,
      smartUX,
      analytics,
      uxOptimization,
      version: '1.0.0',
      lastUpdated: new Date()
    };
  }
}
// removed by clean-audit