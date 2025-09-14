import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ToastService } from '../../../services/toast.service';
import { FinancialCalculatorService } from '../../../services/financial-calculator.service';
import { ProtectionEngineService } from '../../../services/protection-engine.service';
import { Market, ProtectionScenario } from '../../../models/types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-proteccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="proteccion-container">
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
                <div class="row" title="Nuevo pago mensual estimado después de aplicar la reestructura" data-cy="tip-pmt">
                  <span class="label">PMT′</span>
                  <span class="value">{{ formatCurrency(s.newMonthlyPayment) }}</span>
                </div>
                <div class="row" title="Nuevo plazo en meses tras la reestructura" data-cy="tip-term">
                  <span class="label">n′</span>
                  <span class="value">{{ s.newTerm }} meses</span>
                </div>
                <div class="row" title="Tasa interna de retorno posterior a la reestructura; debe cumplir con IRR mínima de políticas" data-cy="tip-irr">
                  <span class="label">TIR post</span>
                  <span class="value">
                    <span class="irr" [class.ok]="isTirOk(s)" [class.bad]="!isTirOk(s)">{{ getIrrPct(s) | number:'1.0-2' }}%</span>
                  </span>
                </div>

                <!-- Motivos de rechazo y sugerencias -->
                <div class="rejection" *ngIf="!isScenarioEligible(s)" data-cy="rejection-box" title="Causas por las que el escenario no es elegible según políticas">
                  <div class="reason" *ngIf="!isTirOk(s)" title="La TIR posterior es menor a la mínima aceptada">Motivo: IRRpost < IRRmin</div>
                  <div class="reason" *ngIf="isBelowMinPayment(s)" title="El pago mensual reestructurado es inferior al mínimo permitido">Motivo: PMT′ < PMTmin</div>
                  <div class="suggestion" *ngIf="s.type==='step-down'">Sugerencia: reducir α a 20% y recalcular</div>
                  <div class="suggestion" *ngIf="s.type==='defer'">Sugerencia: limitar diferimiento a 3 meses</div>
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
      margin: 0 0 12px 0;
      color: #2d3748;
      font-size: 1.2rem;
    }

    .risk-count {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .high-risk .risk-count { color: #e53e3e; }
    .medium-risk .risk-count { color: #dd6b20; }
    .low-risk .risk-count { color: #38a169; }

    .analysis-card p { margin: 0; color: #718096; }

    .tools-section h2 { margin-bottom: 20px; color: #2d3748; text-align: center; }
    .tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .tool-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s; font-size: 1rem; color: #4a5568;
    }
    .tool-card:hover { background: #f7fafc; transform: translateY(-1px); }

    /* Scenarios */
    .scenarios-section { margin-top: 32px; }
    .scenario-form {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px;
      background: #ffffff; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;
    }
    .scenario-form .form-row { display:flex; flex-direction:column; gap:6px; }
    .scenario-form label { font-size: 12px; color: #4a5568; }
    .scenario-form input, .scenario-form select { padding: 8px 10px; border: 1px solid #cbd5e0; border-radius: 6px; }
    .scenario-form .actions { grid-column: 1 / -1; display:flex; justify-content: flex-end; }
    .scenario-form .btn { padding: 10px 16px; background: #2b6cb0; color: #fff; border: none; border-radius: 8px; cursor: pointer; }

    .scenario-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .scenario-card { background: #fff; border:1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .scenario-card.rejected { opacity: 0.9; }
    .scenario-header { display:flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .scenario-header h3 { margin: 0; font-size: 16px; color:#2d3748; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; background:#edf2f7; color:#4a5568; }
    .badge.ok { background: #e6fffa; color: #047857; border:1px solid #99f6e4; }
    .badge.bad { background: #fff7ed; color: #9a3412; border:1px solid #fed7aa; }
    .scenario-body .row { display:flex; justify-content: space-between; padding: 6px 0; border-bottom:1px dashed #edf2f7; }
    .scenario-body .row:last-child { border-bottom:none; }
    .label { color:#718096; font-size: 12px; }
    .value { font-weight:700; color:#2d3748; }
    .irr.ok { color:#047857; font-weight:700; }
    .irr.bad { color:#b91c1c; font-weight:700; }
    .rejection { margin-top:10px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; border-radius:8px; padding:8px; font-size: 13px; }
    .rejection .reason { margin-bottom:4px; }
    .rejection .suggestion { color:#7c2d12; }
    .details { margin-top:10px; padding-left: 16px; color:#4a5568; }

    @media (max-width: 768px) {
      .proteccion-container { padding: 16px; }
      .analysis-grid, .tools-grid { grid-template-columns: 1fr; }
      .scenario-form { grid-template-columns: 1fr; }
    }
  `]
})
export class ProteccionComponent {
  highRiskClients = 12;
  mediumRiskClients = 28;
  lowRiskClients = 156;
  contractForm: FormGroup;
  scenarios: ProtectionScenario[] = [];

  constructor(
    private fb: FormBuilder,
    private financialCalc: FinancialCalculatorService,
    private protectionEngine: ProtectionEngineService,
    private pdfExportService: PdfExportService,
    private toast: ToastService
  ) {
    this.contractForm = this.fb.group({
      currentBalance: [320000, [Validators.required, Validators.min(10000)]],
      originalPayment: [10500, [Validators.required, Validators.min(1000)]],
      remainingTerm: [36, [Validators.required, Validators.min(6)]],
      market: ['edomex', Validators.required]
    });
  }

  openTool(tool: string): void {
    console.log('Abrir herramienta:', tool);
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
        'Contactar inmediatamente a clientes de alto riesgo',
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

  computeScenarios(): void {
    if (!this.contractForm.valid) return;
    const { currentBalance, originalPayment, remainingTerm, market } = this.contractForm.value as {
      currentBalance: number; originalPayment: number; remainingTerm: number; market: Market;
    };
    this.scenarios = this.protectionEngine.generateProtectionScenarios(currentBalance, originalPayment, remainingTerm, market);
    if (!this.scenarios || this.scenarios.length === 0) {
      this.toast.info('No hay escenarios elegibles con los datos actuales');
    }
  }

  isScenarioEligible(s: ProtectionScenario): boolean {
    return ((s as any).tirOK !== false) && !this.isBelowMinPayment(s);
  }

  isBelowMinPayment(s: ProtectionScenario): boolean {
    const minPct = environment.finance?.minPaymentRatio ?? 0.5; // Política configurable
    const orig = this.contractForm.value.originalPayment as number;
    return s.newMonthlyPayment < (orig * minPct);
  }

  // Template helpers to avoid type assertions in bindings
  isTirOk(s: any): boolean { return !!(s && (s as any).tirOK); }
  getIrrPct(s: any): number { return Math.max(0, Number((s && (s as any).irr) || 0) * 100); }

  formatCurrency(v: number): string { return this.financialCalc.formatCurrency(v); }
}
