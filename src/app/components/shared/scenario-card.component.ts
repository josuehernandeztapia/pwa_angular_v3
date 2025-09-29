import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProtectionScenario } from '../../models/types';

@Component({
  selector: 'app-scenario-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scenario-card.component.html',
  styleUrls: ['./scenario-card.component.scss']
})
export class ScenarioCardComponent {
  @Input() scenario!: ProtectionScenario;
  @Input() isSelected = false;
  @Output() onSelect = new EventEmitter<void>();

  handleSelect(): void {
    if (this.onSelect.observed) {
      this.onSelect.emit();
    }
  }

  getButtonClass(): string {
    return this.isSelected ? 'selected' : '';
  }

  getTermChange(): string {
    return this.scenario.termChange >= 0 ? '+' : '';
  }

  // Port exacto de formatCurrency desde React línea 12
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }
}
