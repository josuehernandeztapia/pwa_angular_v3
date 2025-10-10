import { BusinessFlow, Client, DocumentStatus, Actor, EventType, Market } from '../models/types';
import { Quote } from '../models/business';
import { RiskEvaluation } from '../components/risk-evaluation/risk-panel.component';

export type DemoSaleType = 'financiero' | 'colectivo' | 'contado';

export interface DemoMarket {
  id: Market;
  name: string;
  saleTypes: DemoSaleType[];
  clientTypes: Array<'individual' | 'colectivo'>;
  defaultFlow: BusinessFlow;
  description: string;
  tandaRules?: {
    minMembers: number;
    maxMembers: number;
  };
  incomeThreshold?: number;
}

export interface DemoQuote extends Quote {
  id: string;
  clientId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface DemoRiskEntry {
  evaluation: RiskEvaluation;
  clientId: string;
}

const toDate = (iso: string) => new Date(iso);

export const DEMO_MARKETS: DemoMarket[] = [
  {
    id: 'aguascalientes',
    name: 'Aguascalientes',
    saleTypes: ['financiero'],
    clientTypes: ['individual'],
    defaultFlow: BusinessFlow.VentaPlazo,
    description: 'Mercado piloto individual con escrituración digital y validaciones express.',
    incomeThreshold: 18000
  },
  {
    id: 'edomex',
    name: 'Estado de México',
    saleTypes: ['colectivo', 'financiero'],
    clientTypes: ['individual', 'colectivo'],
    defaultFlow: BusinessFlow.CreditoColectivo,
    description: 'Ruta colectiva con tandas activas y flujo mixto de onboarding + cotizador.',
    tandaRules: {
      minMembers: 5,
      maxMembers: 18
    },
    incomeThreshold: 22000
  },
  {
    id: 'otros',
    name: 'Nuevo León (Piloto)',
    saleTypes: ['financiero', 'contado'],
    clientTypes: ['individual'],
    defaultFlow: BusinessFlow.VentaDirecta,
    description: 'Mercado piloto para validar flujo directo con reglas de cobertura híbrida.',
    incomeThreshold: 20000
  }
];

export const DEMO_CLIENTS: Client[] = [
  {
    id: 'cli-ags-001',
    name: 'Ana García López',
    email: 'ana.garcia@demo.mx',
    phone: '449-812-3409',
    rfc: 'GALA8503151J3',
    market: 'aguascalientes',
    flow: BusinessFlow.VentaPlazo,
    status: 'Activo',
    createdAt: toDate('2024-01-08T11:15:00Z'),
    lastModified: toDate('2024-02-04T09:40:00Z'),
    monthlyIncome: 28000,
    healthScore: 88,
    documents: [
      { id: 'ine', name: 'INE Vigente', status: DocumentStatus.Aprobado },
      { id: 'domicilio', name: 'Comprobante de domicilio', status: DocumentStatus.Aprobado },
      { id: 'csf', name: 'Constancia de situación fiscal', status: DocumentStatus.Aprobado }
    ],
    events: [
      {
        id: 'evt-ags-001',
        timestamp: toDate('2024-01-08T12:05:00Z'),
        message: 'Solicitud completada en Onboarding',
        actor: Actor.Cliente,
        type: EventType.ClientAction
      },
      {
        id: 'evt-ags-002',
        timestamp: toDate('2024-01-11T16:20:00Z'),
        message: 'Validación KYC aprobada',
        actor: Actor.Sistema,
        type: EventType.System
      }
    ],
    paymentPlan: {
      monthlyGoal: 8200,
      currentMonthProgress: 7800,
      currency: 'MXN',
      methods: { collection: true, voluntary: true },
      downPaymentPercentage: 0.18,
      term: 36,
      monthlyPayment: 7850,
      interestRate: 0.245
    },
    protectionPlan: {
      type: 'Total',
      restructuresAvailable: 2,
      restructuresUsed: 0,
      annualResets: 1
    }
  },
  {
    id: 'cli-ags-002',
    name: 'Luis Hernández Torres',
    email: 'luis.hernandez@demo.mx',
    phone: '449-302-1110',
    rfc: 'HETL9004228K1',
    market: 'aguascalientes',
    flow: BusinessFlow.AhorroProgramado,
    status: 'En Expediente',
    createdAt: toDate('2024-01-22T09:30:00Z'),
    lastModified: toDate('2024-02-07T13:55:00Z'),
    monthlyIncome: 19000,
    healthScore: 74,
    savingsPlan: {
      progress: 52,
      goal: 90000,
      currentSavings: 47000,
      currency: 'MXN',
      totalValue: 180000,
      methods: { collection: false, voluntary: true }
    },
    documents: [
      { id: 'ine', name: 'INE Vigente', status: DocumentStatus.Aprobado },
      { id: 'domicilio', name: 'Comprobante de domicilio', status: DocumentStatus.EnRevision },
      { id: 'csf', name: 'Constancia de situación fiscal', status: DocumentStatus.Pendiente }
    ],
    events: [
      {
        id: 'evt-ags-003',
        timestamp: toDate('2024-01-22T10:10:00Z'),
        message: 'Se generó simulación de ahorro',
        actor: Actor.Asesor,
        type: EventType.AdvisorAction
      }
    ]
  },
  {
    id: 'cli-edx-collective-01',
    name: 'Ruta EDOMEX Norte',
    email: 'colectivo.norte@demo.mx',
    phone: '55-8542-0012',
    market: 'edomex',
    flow: BusinessFlow.CreditoColectivo,
    status: 'Activo',
    createdAt: toDate('2023-12-12T14:20:00Z'),
    lastModified: toDate('2024-02-02T18:10:00Z'),
    healthScore: 65,
    collectiveGroupName: 'Colectivo Norte 18',
    collectiveCreditGroupId: 'grp-edx-18',
    documents: [
      { id: 'acta', name: 'Acta Constitutiva de la Ruta', status: DocumentStatus.Aprobado },
      { id: 'poder', name: 'Poder del representante', status: DocumentStatus.Aprobado },
      { id: 'ine', name: 'INE Representante', status: DocumentStatus.Aprobado },
      { id: 'membresias', name: 'Padrón de operadores', status: DocumentStatus.EnRevision }
    ],
    events: [
      {
        id: 'evt-edx-001',
        timestamp: toDate('2024-01-05T08:30:00Z'),
        message: 'Se asignó tanda de 12 meses',
        actor: Actor.Sistema,
        type: EventType.System
      }
    ],
    paymentPlan: {
      monthlyGoal: 24500,
      currentMonthProgress: 19800,
      currency: 'MXN',
      methods: { collection: true, voluntary: false },
      downPaymentPercentage: 0.12,
      term: 48,
      monthlyPayment: 23750,
      interestRate: 0.265
    }
  },
  {
    id: 'cli-edx-002',
    name: 'María Fernanda Ríos',
    email: 'maria.rios@demo.mx',
    phone: '55-4433-9921',
    rfc: 'RIFM9107150V2',
    market: 'edomex',
    flow: BusinessFlow.VentaDirecta,
    status: 'Documentos Incompletos',
    createdAt: toDate('2024-02-03T10:05:00Z'),
    lastModified: toDate('2024-02-10T11:25:00Z'),
    monthlyIncome: 24500,
    healthScore: 58,
    documents: [
      { id: 'ine', name: 'INE Vigente', status: DocumentStatus.Aprobado },
      { id: 'domicilio', name: 'Comprobante de domicilio', status: DocumentStatus.Rechazado, tooltip: 'Documento ilegible' },
      { id: 'ingresos', name: 'Comprobante de ingresos', status: DocumentStatus.Pendiente }
    ],
    events: [
      {
        id: 'evt-edx-002',
        timestamp: toDate('2024-02-03T10:45:00Z'),
        message: 'Cotización enviada al cliente',
        actor: Actor.Asesor,
        type: EventType.AdvisorAction
      },
      {
        id: 'evt-edx-003',
        timestamp: toDate('2024-02-07T09:15:00Z'),
        message: 'Documentación solicitada nuevamente',
        actor: Actor.Sistema,
        type: EventType.System
      }
    ]
  },
  {
    id: 'cli-nl-001',
    name: 'Jorge Salinas Prado',
    email: 'jorge.salinas@demo.mx',
    phone: '81-2201-5511',
    rfc: 'SAPJ921108J91',
    market: 'otros',
    flow: BusinessFlow.VentaDirecta,
    status: 'Pendiente',
    createdAt: toDate('2024-02-12T15:40:00Z'),
    lastModified: toDate('2024-02-12T16:55:00Z'),
    monthlyIncome: 31000,
    healthScore: 82,
    documents: [
      { id: 'ine', name: 'INE Vigente', status: DocumentStatus.EnRevision },
      { id: 'domicilio', name: 'Comprobante de domicilio', status: DocumentStatus.EnRevision },
      { id: 'csf', name: 'Constancia de situación fiscal', status: DocumentStatus.Pendiente }
    ],
    events: [
      {
        id: 'evt-nl-001',
        timestamp: toDate('2024-02-12T16:10:00Z'),
        message: 'Solicitud enviada a revisión de políticas',
        actor: Actor.Sistema,
        type: EventType.System
      }
    ]
  }
];

export const DEMO_QUOTES: DemoQuote[] = [
  {
    id: 'quote-ags-001',
    clientId: 'cli-ags-001',
    status: 'approved',
    createdAt: toDate('2024-01-11T18:00:00Z'),
    totalPrice: 425000,
    downPayment: 76500,
    amountToFinance: 348500,
    term: 36,
    monthlyPayment: 7850,
    market: 'aguascalientes',
    clientType: 'individual',
    flow: BusinessFlow.VentaPlazo,
    interestRate: 0.245,
    processingFees: 3200,
    insuranceCost: 5400
  },
  {
    id: 'quote-ags-002',
    clientId: 'cli-ags-002',
    status: 'pending',
    createdAt: toDate('2024-01-23T09:10:00Z'),
    totalPrice: 240000,
    downPayment: 24000,
    amountToFinance: 216000,
    term: 24,
    monthlyPayment: 9800,
    market: 'aguascalientes',
    clientType: 'individual',
    flow: BusinessFlow.AhorroProgramado,
    interestRate: 0.18,
    processingFees: 1800,
    insuranceCost: 3200
  },
  {
    id: 'quote-edx-collective',
    clientId: 'cli-edx-collective-01',
    status: 'approved',
    createdAt: toDate('2024-01-06T07:50:00Z'),
    totalPrice: 1850000,
    downPayment: 222000,
    amountToFinance: 1628000,
    term: 48,
    monthlyPayment: 23750,
    market: 'edomex',
    clientType: 'colectivo',
    flow: BusinessFlow.CreditoColectivo,
    interestRate: 0.265,
    processingFees: 14800,
    insuranceCost: 38500
  },
  {
    id: 'quote-edx-maria',
    clientId: 'cli-edx-002',
    status: 'pending',
    createdAt: toDate('2024-02-04T08:15:00Z'),
    totalPrice: 389000,
    downPayment: 35000,
    amountToFinance: 354000,
    term: 60,
    monthlyPayment: 8150,
    market: 'edomex',
    clientType: 'individual',
    flow: BusinessFlow.VentaDirecta,
    interestRate: 0.285,
    processingFees: 4500,
    insuranceCost: 6200
  }
];

const baseExplain = [
  { factor: 'KIBAN_SCORE', weight: 0.35, impact: 'POS' },
  { factor: 'AVI_VOICE', weight: 0.2, impact: 'POS' },
  { factor: 'GNV_HISTORY', weight: 0.25, impact: 'NEU' },
  { factor: 'GEO_RISK', weight: 0.2, impact: 'NEU' }
];

const buildRiskEvaluation = (overrides: Partial<RiskEvaluation>): RiskEvaluation => ({
  evaluationId: 'risk-eval-demo',
  processedAt: toDate('2024-02-07T12:00:00Z'),
  processingTimeMs: 1420,
  algorithmVersion: 'kiban-hase-1.4.2',
  decision: 'GO',
  riskCategory: 'BAJO',
  confidenceLevel: 0.88,
  scoreBreakdown: {
    creditScore: 780,
    financialStability: 82,
    behaviorHistory: 76,
    paymentCapacity: 80,
    geographicRisk: 68,
    vehicleProfile: 72,
    finalScore: 84
  },
  kiban: {
    scoreRaw: 742,
    scoreBand: 'B',
    status: 'APPROVED',
    reasons: [
      { code: 'KBN-01', desc: 'Historial crediticio sin atrasos' },
      { code: 'KBN-14', desc: 'Relación cuota-ingreso saludable' }
    ],
    bureauRef: 'KBN-DEMO-001'
  },
  hase: {
    riskScore01: 0.18,
    category: 'BAJO',
    explain: baseExplain
  },
  riskFactors: [
    {
      factorId: 'factor-01',
      factorName: 'Historial crediticio',
      description: 'Sin atrasos registrados en los últimos 18 meses.',
      severity: 'BAJA',
      scoreImpact: 8,
      mitigationRecommendations: ['Mantener pagos puntuales']
    }
  ],
  financialRecommendations: {
    maxLoanAmount: 450000,
    minDownPayment: 60000,
    maxTermMonths: 48,
    suggestedInterestRate: 0.245,
    estimatedMonthlyPayment: 7800,
    resultingDebtToIncomeRatio: 0.28,
    specialConditions: ['Elegible para restructuración automática']
  },
  mitigationPlan: {
    required: false,
    actions: [],
    estimatedDays: 0,
    expectedRiskReduction: 0
  },
  decisionReasons: [
    'Perfil estable con ingresos comprobados',
    'Validación KYC completa'
  ],
  nextSteps: [
    'Programar entrega de unidad',
    'Actualizar póliza de protección'
  ],
  ...overrides
});

export const DEMO_RISK_EVALUATIONS: DemoRiskEntry[] = [
  {
    clientId: 'cli-ags-001',
    evaluation: buildRiskEvaluation({
      evaluationId: 'risk-ags-001',
      decision: 'GO',
      riskCategory: 'BAJO',
      confidenceLevel: 0.91,
      scoreBreakdown: {
        creditScore: 792,
        financialStability: 85,
        behaviorHistory: 80,
        paymentCapacity: 84,
        geographicRisk: 70,
        vehicleProfile: 74,
        finalScore: 87
      },
      kiban: {
        scoreRaw: 758,
        scoreBand: 'A',
        status: 'APPROVED',
        reasons: [
          { code: 'KBN-01', desc: 'Relación cuota-ingreso saludable' },
          { code: 'KBN-05', desc: 'Historial crediticio con score > 750' }
        ],
        bureauRef: 'KBN-AGS-774'
      }
    })
  },
  {
    clientId: 'cli-ags-002',
    evaluation: buildRiskEvaluation({
      evaluationId: 'risk-ags-002',
      decision: 'REVIEW',
      riskCategory: 'MEDIO',
      confidenceLevel: 0.73,
      processedAt: toDate('2024-02-07T13:15:00Z'),
      scoreBreakdown: {
        creditScore: 655,
        financialStability: 68,
        behaviorHistory: 70,
        paymentCapacity: 62,
        geographicRisk: 64,
        vehicleProfile: 60,
        finalScore: 66
      },
      kiban: {
        scoreRaw: 648,
        scoreBand: 'B',
        status: 'REVIEW',
        reasons: [
          { code: 'KBN-12', desc: 'Ingresos variables requieren documentación adicional' }
        ],
        bureauRef: 'KBN-AGS-620'
      },
      riskFactors: [
        {
          factorId: 'factor-02',
          factorName: 'Ingresos variables',
          description: 'Depósitos no recurrentes en cuenta bancaria.',
          severity: 'MEDIA',
          scoreImpact: -6,
          mitigationRecommendations: ['Solicitar comprobante de ingresos adicional']
        }
      ],
      mitigationPlan: {
        required: true,
        actions: ['Capturar comprobantes de ingresos adicionales', 'Actualizar referencias comerciales'],
        estimatedDays: 4,
        expectedRiskReduction: 18
      },
      decisionReasons: [
        'Ingresos no comprobados para cubrir mensualidad',
        'Ajustar estrategia a plan de ahorro'
      ],
      nextSteps: ['Solicitar documentación pendiente', 'Recalcular simulación con ahorro adicional']
    })
  },
  {
    clientId: 'cli-edx-collective-01',
    evaluation: buildRiskEvaluation({
      evaluationId: 'risk-edx-collective-01',
      decision: 'REVIEW',
      riskCategory: 'ALTO',
      confidenceLevel: 0.66,
      processedAt: toDate('2024-02-01T08:10:00Z'),
      scoreBreakdown: {
        creditScore: 612,
        financialStability: 58,
        behaviorHistory: 61,
        paymentCapacity: 70,
        geographicRisk: 62,
        vehicleProfile: 68,
        finalScore: 60
      },
      kiban: {
        scoreRaw: 618,
        scoreBand: 'C',
        status: 'REVIEW',
        reasons: [
          { code: 'KBN-21', desc: 'Riesgo colectivo requiere confirmación de miembros' }
        ],
        bureauRef: 'KBN-EDX-554'
      },
      riskFactors: [
        {
          factorId: 'factor-03',
          factorName: 'Ejecución de tanda',
          description: 'Demora en confirmación de aportaciones colectivas.',
          severity: 'ALTA',
          scoreImpact: -12,
          mitigationRecommendations: ['Confirmar aportaciones iniciales de todos los miembros']
        }
      ],
      mitigationPlan: {
        required: true,
        actions: ['Confirmar aportaciones iniciales', 'Actualizar padrón de operadores'],
        estimatedDays: 6,
        expectedRiskReduction: 22
      },
      financialRecommendations: {
        maxLoanAmount: 1950000,
        minDownPayment: 250000,
        maxTermMonths: 48,
        suggestedInterestRate: 0.27,
        estimatedMonthlyPayment: 24900,
        resultingDebtToIncomeRatio: 0.34,
        specialConditions: ['Mantener tanda activa con 90% asistencia']
      },
      decisionReasons: [
        'Requiere verificación de miembros colectivos',
        'Diferencias en padrón vs. mercado'
      ],
      nextSteps: ['Registrar evidencias de aportaciones', 'Revisar reglas de tanda con MarketPolicy']
    })
  },
  {
    clientId: 'cli-edx-002',
    evaluation: buildRiskEvaluation({
      evaluationId: 'risk-edx-002',
      decision: 'NO-GO',
      riskCategory: 'CRITICO',
      confidenceLevel: 0.82,
      processedAt: toDate('2024-02-08T09:05:00Z'),
      scoreBreakdown: {
        creditScore: 540,
        financialStability: 48,
        behaviorHistory: 52,
        paymentCapacity: 56,
        geographicRisk: 58,
        vehicleProfile: 54,
        finalScore: 52
      },
      kiban: {
        scoreRaw: 532,
        scoreBand: 'D',
        status: 'REJECTED',
        reasons: [
          { code: 'KBN-32', desc: 'Historial con atrasos mayores a 60 días' },
          { code: 'KBN-41', desc: 'Documentación de ingresos insuficiente' }
        ],
        bureauRef: 'KBN-EDX-421'
      },
      riskFactors: [
        {
          factorId: 'factor-04',
          factorName: 'Historial con atrasos',
          description: 'Reportes de atraso >60 días en los últimos 12 meses.',
          severity: 'CRITICA',
          scoreImpact: -18,
          mitigationRecommendations: ['Solicitar coacreditado', 'Incorporar plan de protección reforzado']
        }
      ],
      mitigationPlan: {
        required: true,
        actions: ['Validar documentación de ingresos', 'Proponer plan de rescate con protección total'],
        estimatedDays: 10,
        expectedRiskReduction: 28
      },
      decisionReasons: [
        'Score crediticio fuera de umbral permitido',
        'Documentación obligatoria no completada'
      ],
      nextSteps: ['Notificar al área comercial', 'Documentar seguimiento en CRM']
    })
  },
  {
    clientId: 'cli-nl-001',
    evaluation: buildRiskEvaluation({
      evaluationId: 'risk-nl-001',
      decision: 'GO',
      riskCategory: 'BAJO',
      confidenceLevel: 0.79,
      processedAt: toDate('2024-02-12T17:05:00Z'),
      scoreBreakdown: {
        creditScore: 720,
        financialStability: 76,
        behaviorHistory: 74,
        paymentCapacity: 78,
        geographicRisk: 66,
        vehicleProfile: 70,
        finalScore: 80
      },
      kiban: {
        scoreRaw: 710,
        scoreBand: 'B',
        status: 'APPROVED',
        reasons: [
          { code: 'KBN-09', desc: 'Buen comportamiento de pagos' }
        ],
        bureauRef: 'KBN-NL-702'
      },
      riskFactors: [
        {
          factorId: 'factor-05',
          factorName: 'Geografía piloto',
          description: 'Mercado piloto aún sin referencias históricas.',
          severity: 'MEDIA',
          scoreImpact: -4,
          mitigationRecommendations: ['Monitorear indicadores durante primeros 90 días']
        }
      ],
      nextSteps: ['Inicializar flujo de entrega', 'Configurar alertas de riesgo piloto']
    })
  }
];

export const cloneDemoClient = (client: Client): Client => ({
  ...client,
  createdAt: client.createdAt ? new Date(client.createdAt) : undefined,
  updatedAt: client.updatedAt ? new Date(client.updatedAt) : undefined,
  lastModified: client.lastModified ? new Date(client.lastModified) : undefined,
  lastPayment: client.lastPayment ? new Date(client.lastPayment) : undefined,
  lastPaymentDate: client.lastPaymentDate ? new Date(client.lastPaymentDate) : undefined,
  nextPaymentDue: client.nextPaymentDue ? new Date(client.nextPaymentDue) : undefined,
  documents: client.documents.map(document => ({
    ...document,
    uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : undefined,
    expirationDate: document.expirationDate ? new Date(document.expirationDate) : undefined,
    updatedAt: document.updatedAt ? new Date(document.updatedAt) : undefined,
    reviewedAt: document.reviewedAt ? new Date(document.reviewedAt) : undefined,
    completedAt: document.completedAt ? new Date(document.completedAt) : undefined
  })),
  events: client.events.map(event => ({
    ...event,
    timestamp: new Date(event.timestamp ?? Date.now()),
    details: event.details ? { ...event.details } : undefined
  })),
  savingsPlan: client.savingsPlan
    ? {
        ...client.savingsPlan,
        collectionDetails: client.savingsPlan.collectionDetails
          ? { ...client.savingsPlan.collectionDetails }
          : undefined
      }
    : undefined,
  paymentPlan: client.paymentPlan
    ? {
        ...client.paymentPlan,
        collectionDetails: client.paymentPlan.collectionDetails
          ? { ...client.paymentPlan.collectionDetails }
          : undefined
      }
    : undefined,
  protectionPlan: client.protectionPlan
    ? { ...client.protectionPlan }
    : undefined
});

export const cloneDemoQuote = (quote: Quote): Quote => ({
  ...quote,
  createdAt: quote.createdAt ? new Date(quote.createdAt) : undefined,
  expiresAt: quote.expiresAt ? new Date(quote.expiresAt) : undefined
});

export const getDemoClients = (): Client[] => DEMO_CLIENTS.map(client => cloneDemoClient(client));

export const getDemoQuotes = (): Quote[] => DEMO_QUOTES.map(quote => cloneDemoQuote(quote));

export const getDemoMarkets = (): DemoMarket[] =>
  DEMO_MARKETS.map(market => ({
    ...market,
    tandaRules: market.tandaRules ? { ...market.tandaRules } : undefined
  }));

export const cloneDemoRiskEvaluation = (evaluation: RiskEvaluation): RiskEvaluation => ({
  ...evaluation,
  processedAt: evaluation.processedAt ? new Date(evaluation.processedAt) : new Date(),
  scoreBreakdown: { ...evaluation.scoreBreakdown },
  kiban: {
    ...evaluation.kiban,
    reasons: evaluation.kiban.reasons.map(reason => ({ ...reason }))
  },
  hase: {
    ...evaluation.hase,
    explain: evaluation.hase.explain.map(item => ({ ...item }))
  },
  riskFactors: evaluation.riskFactors.map(factor => ({
    ...factor,
    mitigationRecommendations: factor.mitigationRecommendations ? [...factor.mitigationRecommendations] : []
  })),
  financialRecommendations: evaluation.financialRecommendations
    ? {
        ...evaluation.financialRecommendations,
        specialConditions: evaluation.financialRecommendations.specialConditions
          ? [...evaluation.financialRecommendations.specialConditions]
          : undefined
      }
    : undefined,
  mitigationPlan: evaluation.mitigationPlan
    ? {
        ...evaluation.mitigationPlan,
        actions: evaluation.mitigationPlan.actions ? [...evaluation.mitigationPlan.actions] : []
      }
    : undefined,
  decisionReasons: evaluation.decisionReasons ? [...evaluation.decisionReasons] : [],
  nextSteps: evaluation.nextSteps ? [...evaluation.nextSteps] : []
});

export const getDemoRiskEvaluations = (): DemoRiskEntry[] =>
  DEMO_RISK_EVALUATIONS.map(entry => ({
    clientId: entry.clientId,
    evaluation: cloneDemoRiskEvaluation(entry.evaluation)
  }));

export const DEMO_RISK_MAP: Record<string, string> = DEMO_RISK_EVALUATIONS.reduce((acc, entry) => {
  acc[entry.clientId] = entry.evaluation.evaluationId;
  return acc;
}, {} as Record<string, string>);
