import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getDataColor, getChartColor } from '../../styles/design-tokens';

interface SavingsMonth {
  name: string;
  saved: number;
}

@Component({
  selector: 'app-savings-projection-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './savings-projection-chart.component.html',
  styleUrls: ['./savings-projection-chart.component.scss']
})
export class SavingsProjectionChartComponent implements OnChanges {
  @Input() goal: number = 0;
  @Input() monthlySavings: number = 0;

  months: SavingsMonth[] = [];
  maxValue: number = 0;

  // OpenAI compliant colors for data visualization
  get completeColor(): string {
    return getDataColor('secondary'); // Green for completed goals
  }

  get progressColor(): string {
    return getDataColor('primary'); // Blue for progress
  }

  get hoverColor(): string {
    return getDataColor('accent'); // Cyan for hover states
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['goal'] || changes['monthlySavings']) {
      this.calculateMonths();
    }
  }

  private calculateMonths(): void {
    // Port exacto de useMemo desde React SavingsProjectionChart líneas 67-77
    if (this.goal <= 0 || this.monthlySavings <= 0) {
      this.months = [];
      return;
    }

    const timeToGoal = this.goal / this.monthlySavings;
    const totalMonths = Math.ceil(timeToGoal) + 2;
    const data: SavingsMonth[] = [];
    
    for (let i = 1; i <= totalMonths; i++) {
      const saved = Math.min(this.monthlySavings * i, this.goal);
      data.push({ name: `Mes ${i}`, saved });
    }
    
    this.months = data;
    this.maxValue = this.goal;
  }

  getBarHeight(saved: number): number {
    // Port exacto de cálculo de altura desde React línea 88
    if (this.maxValue <= 0) return 0;
    return (saved / this.maxValue) * 100;
  }

  getMonthNumber(monthName: string): string {
    // Port exacto de month.name.split(' ')[1] desde React línea 90
    return monthName.split(' ')[1];
  }

  formatCurrency(amount: number): string {
    // Port exacto de Intl.NumberFormat desde React línea 85
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }
}
