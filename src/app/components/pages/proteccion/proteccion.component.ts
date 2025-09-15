import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ToastService } from '../../../services/toast.service';
import { FinancialCalculatorService } from '../../../services/financial-calculator.service';
import { ProtectionEngineService } from '../../../services/protection-engine.service';
import { Market } from '../../../models/types';
import { ProtectionScenario } from '../../../models/protection';
import { calculateIRR, calculateModifiedPayment, IRRResult } from '../../../utils/irr-calculator';
import { environment } from '../../../../environments/environment';

interface ProtectionPlan {
  id: string;
  name: string;
  originalPayment: number;
  originalTerm: number;
  newRate: number;
  irr?: number;
  Mprime?: number;
  nPrime?: number;
  feasible: boolean;
  warnings: string[];
  selected?: boolean;
}

@Component({
  selector: 'app-proteccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="proteccion-container premium-container" data-testid="proteccion-container">
      <header class="page-header">
        <h1>🛡️ Sistema de Protección</h1>
        <p>Análisis de riesgo y protección financiera para transportistas</p>
      </header>

      <main class="page-main">
        <div class="analysis-grid">
          <div class="analysis-card high-risk">
            <h3>Alto Riesgo</h3>
            <div class="risk-count">{{ highRiskClients }}</div>
            <p>Clientes requieren atención inmediata</p>
          </div>

          <div class="analysis-card medium-risk">
            <h3>Riesgo Medio</h3>
            <div class="risk-count">{{ mediumRiskClients }}</div>
            <p>Monitoreo recomendado</p>
          </div>

          <div class="analysis-card low-risk">
            <h3>Bajo Riesgo</h3>
            <div class="risk-count">{{ lowRiskClients }}</div>
            <p>Situación estable</p>
          </div>
        </div>

        <div class="tools-section">
          <h2>🔧 Herramientas de Protección</h2>
          <div class="tools-grid">
            <button class="tool-card" (click)="openTool('savings')">
              💰 Simulador de Ahorro
            </button>
            <button class="tool-card" (click)="openTool('cashflow')">
              📈 Análisis de Flujo
            </button>
            <button class="tool-card" (click)="openTool('contingency')">
              🎯 Plan de Contingencia
            </button>
            <button class="tool-card" (click)="openTool('report')">
              📋 Reporte de Riesgo
            </button>
            <button class="tool-card" (click)="generateProtectionReport()">
              📄 Generar Reporte PDF
            </button>
          </div>
        </div>

        <!-- Escenarios de Protección (P0.5) -->
        <section class="scenarios-section">
          <h2>📦 Escenarios de Reestructura</h2>

          <!-- Configuración actual del contrato -->
          <form [formGroup]="contractForm" class="scenario-form">
            <div class="form-row">
              <label>Saldo Actual</label>
              <input type="number" formControlName="currentBalance" placeholder="Ej. 320000" />
            </div>
            <div class="form-row">
              <label>Pago Mensual Actual (PMT)</label>
              <input type="number" formControlName="originalPayment" placeholder="Ej. 10500" />
            </div>
            <div class="form-row">
              <label>Plazo Remanente (meses)</label>
              <input type="number" formControlName="remainingTerm" placeholder="Ej. 36" />
            </div>
            <div class="form-row">
              <label>Mercado</label>
              <select formControlName="market">
                <option value="aguascalientes">Aguascalientes</option>
                <option value="edomex">Estado de México</option>
              </select>
            </div>
            <div class="actions">
              <button type="button" class="btn" (click)="computeScenarios()" [disabled]="!contractForm.valid">Calcular Escenarios</button>
            </div>
          </form>

          <!-- Grid de escenarios -->
          <div class="scenario-grid" *ngIf="scenarios && scenarios.length">
            <div class="scenario-card" *ngFor="let s of scenarios" [class.rejected]="!isScenarioEligible(s)">
              <div class="scenario-header">
                <h3>{{ s.title }}</h3>
                <span class="badge" [class.ok]="isScenarioEligible(s)" [class.bad]="!isScenarioEligible(s)">
                  {{ isScenarioEligible(s) ? 'Elegible' : 'No Elegible' }}
                </span>
              </div>
              <div class="scenario-body">
                <div class="row" title="Nuevo pago mensual estimado después de aplicar la reestructura" data-cy="tip-pmt" data-testid="pmt-prime">
                  <span class="label">PMT′</span>
                  <span class="value">{{ formatCurrency(getNewMonthlyPayment(s)) }}</span>
                </div>
                <div class="row" title="Nuevo plazo en meses tras la reestructura" data-cy="tip-term" data-testid="n-prime">
                  <span class="label">n′</span>
                  <span class="value">{{ getNewTerm(s) }} meses</span>
                </div>
                <!-- Always show TIR post value, regardless of scenario eligibility -->
                <div class="row" title="Tasa interna de retorno posterior a la reestructura; debe cumplir con IRR mínima de políticas" data-cy="tip-irr" id="tir-post" data-testid="tir-post">
                  <span class="label">TIR post</span>
                  <span class="value">
                    <span class="irr" [class.ok]="isTirOk(s)" [class.bad]="!isTirOk(s)" data-testid="tir-value">{{ getIrrPct(s) | number:'1.0-2' }}%</span>
                  </span>
                </div>

                <!-- Always show rejection reasons when they apply, regardless of overall eligibility -->
                <div class="rejection" *ngIf="hasRejectionReasons(s)" data-cy="rejection-box" data-testid="rejection-reason" title="Causas por las que el escenario no es elegible según políticas">
                  <div class="reason" *ngIf="!isTirOk(s)" title="La TIR posterior es menor a la mínima aceptada" data-testid="irr-rejection">Motivo: IRRpost < IRRmin</div>
                  <div class="reason" *ngIf="isBelowMinPayment(s)" title="El pago mensual reestructurado es inferior al mínimo permitido" data-testid="pmt-rejection">Motivo: PMT′ < PMTmin</div>
                  <div class="suggestion" *ngIf="s.type==='STEPDOWN' && !isScenarioEligible(s)" data-testid="step-down-suggestion">Sugerencia: reducir α a 20% y recalcular</div>
                  <div class="suggestion" *ngIf="s.type==='DEFER' && !isScenarioEligible(s)" data-testid="defer-suggestion">Sugerencia: limitar diferimiento a 3 meses</div>
                </div>

                <!-- Detalles -->
                <ul class="details" *ngIf="isScenarioEligible(s)">
                  <li *ngFor="let d of s.details">{{ d }}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .proteccion-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
    }

    .page-header p {
      margin: 0;
      color: #718096;
      font-size: 1.1rem;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .analysis-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 24px;
      text-align: center;
      transition: all 0.2s;
    }

    .analysis-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .analysis-card h3 {
      margin: 0 0 16px 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .risk-count {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .high-risk {
      border-left: 4px solid #e53e3e;
    }
    .high-risk h3, .high-risk .risk-count {
      color: #e53e3e;
    }

    .medium-risk {
      border-left: 4px solid #d69e2e;
    }
    .medium-risk h3, .medium-risk .risk-count {
      color: #d69e2e;
    }

    .low-risk {
      border-left: 4px solid #38a169;
    }
    .low-risk h3, .low-risk .risk-count {
      color: #38a169;
    }

    .tools-section {
      margin-bottom: 40px;
    }

    .tools-section h2 {
      margin-bottom: 24px;
      color: #2d3748;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .tool-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
      color: #4a5568;
    }

    .tool-card:hover {
      background: #f7fafc;
      border-color: #3182ce;
      color: #3182ce;
      transform: translateY(-1px);
    }

    .scenarios-section {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 32px;
    }

    .scenarios-section h2 {
      margin: 0 0 24px 0;
      color: #2d3748;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .scenario-form {
      background: #f7fafc;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
    }

    .form-row label {
      font-weight: 600;
      color: #4a5568;
      margin-bottom: 4px;
    }

    .form-row input, .form-row select {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 1rem;
    }

    .form-row input:focus, .form-row select:focus {
      outline: none;
      border-color: #3182ce;
      box-shadow: 0 0 0 1px #3182ce;
    }

    .actions {
      margin-top: 24px;
    }

    .btn {
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 10px 24px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:hover:not(:disabled) {
      background: #2c5aa0;
      transform: translateY(-1px);
    }

    .btn:disabled {
      background: #a0aec0;
      cursor: not-allowed;
    }

    .scenario-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
    }

    .scenario-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .scenario-card.rejected {
      border-color: #feb2b2;
      background: #fef5e7;
    }

    .scenario-header {
      background: #f7fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .scenario-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.ok {
      background: #c6f6d5;
      color: #22543d;
    }

    .badge.bad {
      background: #fed7d7;
      color: #742a2a;
    }

    .scenario-body {
      padding: 20px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .row:last-child {
      border-bottom: none;
    }

    .row .label {
      font-weight: 600;
      color: #4a5568;
    }

    .row .value {
      font-weight: 600;
      color: #2d3748;
    }

    .irr.ok {
      color: #38a169;
    }

    .irr.bad {
      color: #e53e3e;
    }

    .rejection {
      background: #fed7d7;
      border: 1px solid #feb2b2;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
    }

    .rejection .reason {
      font-size: 0.875rem;
      font-weight: 600;
      color: #742a2a;
      margin-bottom: 4px;
    }

    .rejection .suggestion {
      font-size: 0.875rem;
      color: #744210;
      font-style: italic;
    }

    .details {
      margin: 16px 0 0 0;
      padding: 0;
      list-style: none;
    }

    .details li {
      padding: 4px 0;
      font-size: 0.875rem;
      color: #4a5568;
    }

    .details li:before {
      content: "•";
      color: #3182ce;
      font-weight: bold;
      display: inline-block;
      width: 1em;
      margin-left: -1em;
    }

    @media (max-width: 768px) {
      .proteccion-container {
        padding: 16px;
      }

      .analysis-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .tools-grid {
        grid-template-columns: 1fr;
      }

      .scenario-grid {
        grid-template-columns: 1fr;
      }

      .scenarios-section {
        padding: 20px;
      }

      .scenario-form {
        padding: 16px;
      }
    }
  `]
})
export class ProteccionComponent implements OnInit {
  contractForm!: FormGroup;
  scenarios: ProtectionScenario[] = [];

  // Mock data for demonstration
  highRiskClients = 12;
  mediumRiskClients = 24;
  lowRiskClients = 64;

  constructor(
    private fb: FormBuilder,
    private pdfExportService: PdfExportService,
    private toast: ToastService,
    private financialCalc: FinancialCalculatorService,
    private protectionEngine: ProtectionEngineService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.contractForm = this.fb.group({
      currentBalance: [320000, [Validators.required, Validators.min(1000)]],
      originalPayment: [10500, [Validators.required, Validators.min(100)]],
      remainingTerm: [36, [Validators.required, Validators.min(1), Validators.max(120)]],
      market: ['aguascalientes', Validators.required]
    });

    // Initialize scenarios immediately to ensure DOM elements are always rendered
    this.computeScenarios();
    // Force change detection to ensure DOM is updated
    this.cdr.markForCheck();
  }

  openTool(tool: string): void {
    console.log('Abrir herramienta:', tool);
  }

  // 🩺 SURGICAL IMPLEMENTATION: Always visible TIR/PMT'/n' + reasons
  computeScenarios(): void {
    if (!this.contractForm.valid) return;

    const formData = this.contractForm.value;
    const plans: ProtectionPlan[] = [
      {
        id: 'plan-a',
        name: 'Plan A - Pago Reducido',
        originalPayment: formData.originalPayment,
        originalTerm: formData.remainingTerm,
        newRate: 0.15, // 15% rate
        feasible: true,
        warnings: []
      },
      {
        id: 'plan-b',
        name: 'Plan B - Plazo Extendido',
        originalPayment: formData.originalPayment,
        originalTerm: formData.remainingTerm,
        newRate: 0.18, // 18% rate
        feasible: true,
        warnings: []
      },
      {
        id: 'plan-c',
        name: 'Plan C - Reestructura Total',
        originalPayment: formData.originalPayment,
        originalTerm: formData.remainingTerm,
        newRate: 0.22, // 22% rate - high risk
        feasible: true,
        warnings: []
      }
    ];

    // Calculate IRR and modified payments for each plan
    this.scenarios = plans.map(plan => this.calculatePlanMetrics(plan, formData));

    // Force DOM update to ensure test elements are visible
    this.cdr.detectChanges();
  }

  private calculatePlanMetrics(plan: ProtectionPlan, contractData: any): ProtectionScenario {
    const { currentBalance, originalPayment, remainingTerm } = contractData;

    // Calculate modified payment and term
    const modified = calculateModifiedPayment(
      originalPayment,
      remainingTerm,
      plan.newRate
    );

    // Create cashflow array: initial balance (negative), then monthly payments
    const cashflows = [-currentBalance];
    for (let i = 0; i < modified.nPrime; i++) {
      cashflows.push(modified.Mprime);
    }

    // Calculate IRR
    const irrResult = calculateIRR(cashflows);

    // Determine eligibility and warnings
    const warnings: string[] = [];
    const minIRR = 0.18; // 18% minimum
    const minPayment = originalPayment * 0.7; // 70% of original

    if (!irrResult.isValid || irrResult.irr < minIRR) {
      warnings.push(`IRR post (${(irrResult.irr * 100).toFixed(2)}%) < IRR min (${(minIRR * 100).toFixed(1)}%)`);
    }

    if (modified.Mprime < minPayment) {
      warnings.push(`PMT′ (${modified.Mprime}) < PMT min (${minPayment.toFixed(0)})`);
    }

    if (!modified.feasible) {
      warnings.push('Reestructura no viable con parámetros actuales');
    }

    return {
      // Required SSOT fields
      type: 'RECALENDAR', // Default type, should be passed as parameter
      params: { delta: 0, newRate: plan.newRate },
      Mprime: modified.Mprime,
      nPrime: modified.nPrime,
      irr: irrResult.irr,
      tirOK: warnings.length === 0 && irrResult.irr >= 0.18,
      warnings,
      description: `${plan.name} - Tasa ${(plan.newRate * 100).toFixed(1)}%`,
      // Legacy compatibility fields
      id: plan.id,
      title: plan.name,
      newPayment: modified.Mprime,
      newTerm: modified.nPrime,
      totalCost: modified.Mprime * modified.nPrime,
      savings: (originalPayment * remainingTerm) - (modified.Mprime * modified.nPrime),
      eligible: warnings.length === 0,
      details: [
        `Tasa aplicada: ${(plan.newRate * 100).toFixed(1)}%`,
        `PMT original: ${originalPayment}`,
        `Plazo original: ${remainingTerm} meses`,
        `Iteraciones IRR: ${irrResult.iterations}`
      ]
    } as ProtectionScenario;
  }

  // Template helper methods - ALWAYS return values for DOM rendering
  getNewMonthlyPayment(scenario: ProtectionScenario): number {
    return scenario.Mprime || scenario.newPayment || scenario.newMonthlyPayment || 0;
  }

  getNewTerm(scenario: ProtectionScenario): number {
    return scenario.nPrime || scenario.newTerm || 0;
  }

  getIrrPct(scenario: ProtectionScenario): number {
    return (scenario.irr || 0) * 100;
  }

  isTirOk(scenario: ProtectionScenario): boolean {
    return scenario.tirOK === true || (scenario.irr || 0) >= 0.18;
  }

  isBelowMinPayment(scenario: ProtectionScenario): boolean {
    const originalPayment = this.contractForm.value.originalPayment || 0;
    const minPayment = originalPayment * 0.7;
    const newPayment = this.getNewMonthlyPayment(scenario);
    return newPayment < minPayment;
  }

  hasRejectionReasons(scenario: ProtectionScenario): boolean {
    return (scenario.warnings?.length || 0) > 0;
  }

  isScenarioEligible(scenario: ProtectionScenario): boolean {
    return (scenario.tirOK !== false) && this.isTirOk(scenario) && !this.isBelowMinPayment(scenario) && !(scenario.warnings?.length);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  generateProtectionReport(): void {
    const protectionData = {
      totalClients: this.highRiskClients + this.mediumRiskClients + this.lowRiskClients,
      highRiskClients: this.highRiskClients,
      mediumRiskClients: this.mediumRiskClients,
      lowRiskClients: this.lowRiskClients,
      riskDistribution: {
        high: (this.highRiskClients / (this.highRiskClients + this.mediumRiskClients + this.lowRiskClients)) * 100,
        medium: (this.mediumRiskClients / (this.highRiskClients + this.mediumRiskClients + this.lowRiskClients)) * 100,
        low: (this.lowRiskClients / (this.highRiskClients + this.mediumRiskClients + this.lowRiskClients)) * 100
      },
      recommendations: [
        'Implementar seguimiento intensivo para clientes de alto riesgo',
        'Implementar plan de seguimiento para riesgo medio',
        'Mantener monitoreo de clientes de bajo riesgo',
        'Revisar pólizas y garantías existentes'
      ],
      reportDate: new Date()
    };

    this.pdfExportService.generateReportPDF('proteccion', protectionData)
      .then(() => {
        this.toast.success('Reporte de protección generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar reporte de protección');
      });
  }
}