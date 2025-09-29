import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProtectionScenario } from '../../models/types';
import { SimulationService } from '../../services/simulation.service';
import { ToastService } from '../../services/toast.service';
import { ScenarioCardComponent } from './scenario-card.component';

interface BaseQuote {
  amountToFinance: number;
  monthlyPayment: number;
  term: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ScenarioCardComponent],
  templateUrl: './protection-demo-simulator.component.html',
  styleUrls: ['./protection-demo-simulator.component.scss']
})
export class ProtectionDemoSimulatorComponent implements OnInit {
  @Input() baseQuote!: BaseQuote;
  @Output() onClose = new EventEmitter<void>();

  // Port exacto de state desde React líneas 17-19
  months = '2';
  scenarios: ProtectionScenario[] = [];
  isLoading = false;

  constructor(
    private simulationService: SimulationService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Component initialized
  }

  // Port exacto de handleSimulate desde React líneas 21-40
  async handleSimulate(event: Event): Promise<void> {
    event.preventDefault();
    
    const numMonths = parseInt(this.months, 10);
    if (isNaN(numMonths) || numMonths <= 0) {
      this.toast.error("Por favor, introduce un número de meses válido.");
      return;
    }

    this.isLoading = true;
    try {
      const results = await this.simulationService.simulateProtectionDemo(this.baseQuote, numMonths);
      this.scenarios = results;
      if (results.length === 0) {
        this.toast.info("No se pudieron generar escenarios. El plazo restante es muy corto.");
      }
    } catch (error) {
      this.toast.error("Error al simular la demostración.");
    } finally {
      this.isLoading = false;
    }
  }

  handleClose(): void {
    this.onClose.emit();
  }

  getSimulateButtonText(): string {
    return this.isLoading ? 'Calculando...' : 'Simular Escenarios';
  }

  trackScenario(index: number, scenario: ProtectionScenario): string {
    return scenario.type;
  }
}
