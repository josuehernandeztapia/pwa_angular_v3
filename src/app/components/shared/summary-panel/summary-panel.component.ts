import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type SummaryMetric = { label: string; value: string; badge?: 'success' | 'warning' | 'error' };
export type SummaryAction = { label: string; click: () => void };

@Component({
  selector: 'app-summary-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-panel.component.html',
  styleUrls: ['./summary-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryPanelComponent {
  @Input() metrics: SummaryMetric[] = [];
  @Input() actions?: SummaryAction[];
  @Output() actionTriggered = new EventEmitter<SummaryAction>();

  getBadgeClasses(kind: 'success' | 'warning' | 'error'): Record<string, boolean> {
    return {
      'summary-panel__metric-badge--success': kind === 'success',
      'summary-panel__metric-badge--warning': kind === 'warning',
      'summary-panel__metric-badge--error': kind === 'error',
    };
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
