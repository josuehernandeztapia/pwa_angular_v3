import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { getDataColor } from '../../../styles/design-tokens';

export interface RiskRadarClient {
  id: string;
  name: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  position: { x: number; y: number }; // 0-100 for positioning
  issues: string[];
  lastContact: string;
  value: number; // Portfolio value
  urgency: number; // 1-10 scale
}

@Component({
  selector: 'app-risk-radar',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './risk-radar.component.html',
  styleUrls: ['./risk-radar.component.scss'],
})
export class RiskRadarComponent implements OnInit {
  @Input() clients: RiskRadarClient[] = [];
  @Output() clientSelected = new EventEmitter<RiskRadarClient>();
  @Output() actionRequested = new EventEmitter<RiskRadarClient>();

  selectedClient?: RiskRadarClient;

  riskLevels = [
    { key: 'low', label: 'Bajo' },
    { key: 'medium', label: 'Medio' },
    { key: 'high', label: 'Alto' },
    { key: 'critical', label: 'Crítico' }
  ];

  constructor() { }

  ngOnInit(): void { }

  trackByClient(index: number, client: RiskRadarClient): string {
    return client.id;
  }

  getClientInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getClientTooltip(client: RiskRadarClient): string {
    return `${client.name} - Health Score: ${client.healthScore} - Issues: ${client.issues.length}`;
  }

  getRiskBadgeClasses(level: RiskRadarClient['riskLevel'] | string): Record<string, boolean> {
    return {
      'risk-radar__legend-dot--low': level === 'low',
      'risk-radar__legend-dot--medium': level === 'medium',
      'risk-radar__legend-dot--high': level === 'high',
      'risk-radar__legend-dot--critical': level === 'critical',
    };
  }

  getClientClasses(client: RiskRadarClient): Record<string, boolean> {
    return {
      'risk-radar__client--low': client.riskLevel === 'low',
      'risk-radar__client--medium': client.riskLevel === 'medium',
      'risk-radar__client--high': client.riskLevel === 'high',
      'risk-radar__client--critical': client.riskLevel === 'critical',
      'risk-radar__client--selected': this.selectedClient?.id === client.id,
    };
  }

  getClientPulseClasses(client: RiskRadarClient): Record<string, boolean> {
    return {
      'risk-radar__client-pulse--low': client.riskLevel === 'low',
      'risk-radar__client-pulse--medium': client.riskLevel === 'medium',
      'risk-radar__client-pulse--high': client.riskLevel === 'high',
      'risk-radar__client-pulse--critical': client.riskLevel === 'critical',
    };
  }

  getHealthScoreClasses(score: number): Record<string, boolean> {
    return {
      'risk-radar__healthValue--excellent': score >= 80,
      'risk-radar__healthValue--good': score >= 65 && score < 80,
      'risk-radar__healthValue--warning': score >= 40 && score < 65,
      'risk-radar__healthValue--critical': score < 40
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  selectClient(client: RiskRadarClient): void {
    this.selectedClient = client;
    this.clientSelected.emit(client);
  }

  takeAction(client: RiskRadarClient): void {
    this.actionRequested.emit(client);
  }

  getRadarStats() {
    const stats = this.clients.reduce((acc, client) => {
      acc[client.riskLevel] = (acc[client.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<'low' | 'medium' | 'high' | 'critical', number>);

    return [
      {
        value: stats['critical'] || 0,
        label: 'Críticos',
        color: 'var(--error-500)'
      },
      {
        value: stats['high'] || 0,
        label: 'Alto Riesgo',
        color: 'var(--warning-500)'
      },
      {
        value: stats['medium'] || 0,
        label: 'Atención',
        color: 'var(--accent-amber-500)'
      },
      {
        value: stats['low'] || 0,
        label: 'Estables',
        color: 'var(--success-500)'
      }
    ];
  }
}
