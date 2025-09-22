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

@Component({
  selector: 'app-proteccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './proteccion.component.scss',
  templateUrl: './proteccion.component.html'
})
export class ProteccionComponent implements OnInit {
  // Minimalista Protection KPIs
  loading = false;
  healthScore = 82;
  cobertura = 'Estándar';

  // Original functionality
  highRiskClients = 12;
  mediumRiskClients = 35;
  lowRiskClients = 203;

  contractForm: FormGroup;
  scenarios: ProtectionScenario[] = [];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private pdfExportService: PdfExportService,
    private toast: ToastService,
    private financialCalc: FinancialCalculatorService,
    private protectionEngine: ProtectionEngineService
  ) {
    this.contractForm = this.fb.group({
      currentBalance: [320000, [Validators.required, Validators.min(1)]],
      originalPayment: [10500, [Validators.required, Validators.min(1)]],
      remainingTerm: [36, [Validators.required, Validators.min(1), Validators.max(120)]],
      market: ['edomex', Validators.required]
    });
  }

  ngOnInit(): void {
    // Initialize with default values
  }

  // Minimalista Protection functionality
  aplicarProteccion(): void {
    this.loading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.loading = false;
      this.cobertura = this.cobertura === 'Estándar' ? 'Premium' : 'Estándar';
      this.healthScore = this.cobertura === 'Premium' ? 95 : 82;
      this.cdr.detectChanges();

      this.toast.success(`Protección aplicada: ${this.cobertura}`);
    }, 1500);
  }

  openTool(tool: string): void {
    this.toast.info(`Abriendo herramienta: ${tool}`);
  }

  generateProtectionReport(): void {
    this.toast.info('Generando reporte PDF...');
    // In a real scenario, this would call the PDF service
    setTimeout(() => {
      this.toast.success('Reporte PDF generado');
    }, 1000);
  }

  // === Advanced Protection Logic (Original) ===
  computeScenarios(): void {
    if (!this.contractForm.valid) return;

    const values = this.contractForm.value;
    const market = values.market as Market;

    this.scenarios = this.protectionEngine.generateScenarios({
      currentBalance: values.currentBalance,
      originalPayment: values.originalPayment,
      remainingTerm: values.remainingTerm,
      market
    });

    this.cdr.detectChanges();
    this.toast.success(`${this.scenarios.length} escenarios calculados`);
  }

  isScenarioEligible(scenario: ProtectionScenario): boolean {
    return scenario.eligible ?? false;
  }

  getNewMonthlyPayment(scenario: ProtectionScenario): number {
    return scenario.newPayment || 0;
  }

  getNewTerm(scenario: ProtectionScenario): number {
    return scenario.newTerm || 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getIrrPct(scenario: ProtectionScenario): number {
    return (scenario.irr || 0) * 100;
  }

  isTirOk(scenario: ProtectionScenario): boolean {
    return (scenario.irr || 0) >= 0.08; // 8% default minimum
  }

  isBelowMinPayment(scenario: ProtectionScenario): boolean {
    return (scenario.newPayment || 0) < 5000; // Example minimum payment
  }

  hasRejectionReasons(scenario: ProtectionScenario): boolean {
    return !this.isTirOk(scenario) || this.isBelowMinPayment(scenario);
  }
}