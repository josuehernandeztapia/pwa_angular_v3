import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PlanMethods {
  collection: boolean;
  voluntary: boolean;
}

interface PlanConfig {
  goal: number;
  methods: PlanMethods;
  plates?: string;
  overprice?: number;
}

@Component({
  selector: 'app-plan-config-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-config-form.component.html',
  styleUrls: ['./plan-config-form.component.scss'],
})
export class PlanConfigFormComponent {
  @Input() isSavings = true;
  @Output() onBack = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<PlanConfig>();

  // Port exacto de state desde React líneas 10-13
  methods: PlanMethods = { collection: false, voluntary: true };
  goal = '';
  plates = '';
  overprice = '';

  // Port exacto de computed properties desde React líneas 15-17
  get title(): string {
    return this.isSavings ? 'Meta de Ahorro (MXN)' : 'Meta de Pago Mensual (MXN)';
  }

  get placeholder(): string {
    return this.isSavings ? '50,000.00' : '15,000.00';
  }

  get buttonText(): string {
    return this.isSavings ? 'Crear Plan de Ahorro' : 'Configurar Plan de Pagos';
  }

  handleBack(): void {
    this.onBack.emit();
  }

  // Port exacto de handleSubmit desde React líneas 19-27
  handleSubmit(): void {
    const config: PlanConfig = {
      goal: parseFloat(this.goal) || (this.isSavings ? 50000 : 15000),
      methods: this.methods,
      plates: this.methods.collection ? this.plates : undefined,
      overprice: this.methods.collection ? parseFloat(this.overprice) : undefined,
    };
    this.onSubmit.emit(config);
  }

  getContainerClasses(): Record<string, boolean> {
    return {
      'plan-config-form--collection-enabled': this.methods.collection,
    };
  }
}
