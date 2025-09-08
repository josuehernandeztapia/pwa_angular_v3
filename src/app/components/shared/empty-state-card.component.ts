import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="premium-card" role="status" aria-live="polite">
      <div class="media" aria-hidden="true">{{ icon }}</div>
      <h3 class="section-title">{{ title }}</h3>
      <p class="helper-text">{{ subtitle }}</p>
      <div class="actions">
        <button *ngIf="primaryCtaLabel" class="btn-primary btn-sm" type="button" (click)="primary.emit()">
          {{ primaryCtaLabel }}
        </button>
        <button *ngIf="secondaryCtaLabel" class="btn-secondary btn-sm" type="button" (click)="secondary.emit()">
          {{ secondaryCtaLabel }}
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      section { text-align: center; }
      .media { font-size: 40px; line-height: 1; margin-bottom: var(--space-12); }
      .actions { margin-top: var(--space-16); display: inline-flex; gap: var(--space-12); }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateCardComponent {
  @Input() icon: string = '📦';
  @Input() title: string = 'Sin resultados';
  @Input() subtitle: string = 'Ajusta filtros o intenta otra búsqueda.';
  @Input() primaryCtaLabel?: string;
  @Input() secondaryCtaLabel?: string;

  @Output() primary = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();
}

