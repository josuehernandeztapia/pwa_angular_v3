import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type SummaryMetric = { label: string; value: string; badge?: 'success' | 'warning' | 'error' };
export type SummaryAction = { label: string; click: () => void };

@Component({
  selector: 'app-summary-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="premium-card aside" aria-labelledby="summary-title">
      <div class="section-header">
        <h2 id="summary-title" class="section-title">Resumen</h2>
      </div>
      <div class="metrics" role="list">
        <div class="metric" role="listitem" *ngFor="let metric of metrics">
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-value">
            <span class="value">{{ metric.value }}</span>
            <span *ngIf="metric.badge" class="status-badge" [ngClass]="badgeClass(metric.badge)">
              {{ metric.badge | titlecase }}
            </span>
          </div>
        </div>
      </div>

      <div *ngIf="actions?.length" class="actions">
        <button
          *ngFor="let action of actions"
          type="button"
          class="btn-secondary btn-sm"
          (click)="onAction(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </aside>
  `,
  styles: [
    `
      :host { display: block; }
      .metrics { display: grid; gap: var(--space-16); margin-top: var(--space-8); }
      .metric { display: flex; align-items: center; justify-content: space-between; }
      .metric-label { color: rgba(255,255,255,0.75); font-size: var(--font-small-size); }
      .metric-value { display: inline-flex; align-items: center; gap: var(--space-12); }
      .value { font-size: var(--font-h3-size); font-weight: var(--font-weight-bold); }
      .actions { margin-top: var(--space-24); display: flex; flex-wrap: wrap; gap: var(--space-12); }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryPanelComponent {
  @Input() metrics: SummaryMetric[] = [];
  @Input() actions?: SummaryAction[];
  @Output() actionTriggered = new EventEmitter<SummaryAction>();

  badgeClass(kind: 'success' | 'warning' | 'error'): string {
    switch (kind) {
      case 'success':
        return 'status-excellent';
      case 'warning':
        return 'status-warning';
      case 'error':
        return 'status-critical';
      default:
        return '';
    }
  }

  onAction(action: SummaryAction): void {
    try {
      action.click?.();
      this.actionTriggered.emit(action);
    } catch {
      // no-op; actions are provided externally and may be side-effectful
    }
  }
}

