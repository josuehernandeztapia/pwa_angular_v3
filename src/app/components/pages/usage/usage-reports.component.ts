import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

interface UsageStat {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
}

interface UsageRow {
  category: string;
  requests: number;
  successRate: string;
  cost: string;
}

@Component({
  selector: 'app-usage-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usage-reports.component.html',
  styleUrls: ['./usage-reports.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsageReportsComponent {
  readonly stats: UsageStat[] = [
    { label: 'Tokens últimos 30 días', value: '2.1M', trend: 'up', delta: '+8.2%' },
    { label: 'Costo mensual', value: '$1,247 MXN', trend: 'flat', delta: '+1.4%' },
    { label: 'Llamadas API', value: '43,210', trend: 'up', delta: '+12.5%' },
    { label: 'Tiempo promedio', value: '620 ms', trend: 'down', delta: '-5.6%' }
  ];

  readonly rows: UsageRow[] = [
    { category: 'Cotizador', requests: 15234, successRate: '99.1%', cost: '$412 MXN' },
    { category: 'Simulador', requests: 8211, successRate: '98.4%', cost: '$198 MXN' },
    { category: 'Documentos OCR', requests: 5342, successRate: '92.7%', cost: '$486 MXN' },
    { category: 'Protección', requests: 1805, successRate: '95.3%', cost: '$112 MXN' },
    { category: 'AVI Voz', requests: 360, successRate: '88.4%', cost: '$39 MXN' }
  ];
}
