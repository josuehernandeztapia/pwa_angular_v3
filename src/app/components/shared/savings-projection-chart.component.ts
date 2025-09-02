import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SavingsMonth {
  name: string;
  saved: number;
}

@Component({
  selector: 'app-savings-projection-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="savings-chart-container">
      <div class="chart-bars">
        <div 
          *ngFor="let month of months; let i = index" 
          class="bar-container"
        >
          <div class="bar-tooltip">
            {{ formatCurrency(month.saved) }}
          </div>
          <div 
            class="bar"
            [class.bar-complete]="month.saved >= goal"
            [class.bar-progress]="month.saved < goal"
            [style.height.%]="getBarHeight(month.saved)"
          ></div>
          <div class="bar-label">{{ getMonthNumber(month.name) }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .savings-chart-container {
      width: 100%;
      height: 256px;
      background: rgba(31, 41, 55, 0.5);
      border-radius: 8px;
      display: flex;
      align-items: end;
      padding: 16px;
    }

    .chart-bars {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: end;
      gap: 8px;
    }

    .bar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: end;
      align-items: center;
      position: relative;
      height: 100%;
    }

    .bar-tooltip {
      position: absolute;
      top: -32px;
      background: #111827;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      z-index: 10;
    }

    .bar-container:hover .bar-tooltip {
      opacity: 1;
    }

    .bar {
      width: 100%;
      border-radius: 4px 4px 0 0;
      transition: all 0.3s ease;
      min-height: 2px;
    }

    .bar-complete {
      background: #10b981; /* emerald-500 */
    }

    .bar-progress {
      background: #0891b2; /* cyan-600 */
    }

    .bar:hover {
      background: #06b6d4 !important; /* cyan-400 */
    }

    .bar-label {
      color: #6b7280; /* gray-500 */
      font-size: 12px;
      margin-top: 4px;
    }

    @media (max-width: 768px) {
      .savings-chart-container {
        height: 200px;
        padding: 12px;
      }
      
      .chart-bars {
        gap: 4px;
      }
      
      .bar-tooltip {
        font-size: 10px;
        padding: 2px 6px;
      }
    }
  `]
})
export class SavingsProjectionChartComponent implements OnChanges {
  @Input() goal: number = 0;
  @Input() monthlySavings: number = 0;

  months: SavingsMonth[] = [];
  maxValue: number = 0;

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