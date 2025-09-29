import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type ProgressTheme = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gradient';
type ProgressSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent {
  @Input() progress: number = 0;
  @Input() goal: number = 100;
  @Input() max: number = 100;
  @Input() label?: string;
  @Input() currency: string = 'MXN';
  @Input() theme: ProgressTheme = 'default';
  @Input() size: ProgressSize = 'md';
  @Input() animated: boolean = false;
  @Input() striped: boolean = false;
  @Input() showPercentage: boolean = true;
  @Input() showValues: boolean = false;
  @Input() showMessages: boolean = false;
  @Input() showRemaining: boolean = false;
  @Input() goalMarker: boolean = false;
  @Input() darkMode: boolean = true;
  @Input() milestones: { value: number; label: string }[] = [];
  @Input() segments: { value: number; label: string; color: string }[] = [];
  @Input() actionLabel?: string;
  @Input() actionCallback?: () => void;
  @Input() actionDisabled: boolean = false;

  getPercentage(): number {
    if (this.max === 0) return 0;
    return Math.min(Math.round((this.progress / this.max) * 100), 100);
  }

  getContainerModifiers(): Record<string, boolean> {
    return {
      [`progress-bar--size-${this.size}`]: true,
    };
  }

  getTrackModifiers(): Record<string, boolean> {
    return {
      'progress-bar__track--dark': this.darkMode,
    };
  }

  getFillModifiers(): Record<string, boolean> {
    return {
      'progress-bar__fill--success': this.theme === 'success',
      'progress-bar__fill--warning': this.theme === 'warning',
      'progress-bar__fill--danger': this.theme === 'danger',
      'progress-bar__fill--info': this.theme === 'info',
      'progress-bar__fill--gradient': this.theme === 'gradient',
    };
  }

  getLabelModifiers(): Record<string, boolean> {
    return {
      'progress-bar__label--dark': this.darkMode,
    };
  }

  getPercentageModifiers(): Record<string, boolean> {
    const percentage = this.getPercentage();

    return {
      'progress-bar__percentage--success': percentage >= 100,
      'progress-bar__percentage--primary': percentage >= 80 && percentage < 100,
      'progress-bar__percentage--neutral': percentage >= 60 && percentage < 80,
      'progress-bar__percentage--warning': percentage >= 40 && percentage < 60,
      'progress-bar__percentage--danger': percentage < 40,
    };
  }

  getSegmentModifiers(segment: { value: number }, index: number): Record<string, boolean> {
    const completedBefore = this.getSegmentStartValue(index);
    const segmentProgress = this.progress - completedBefore;

    return {
      'progress-bar__segment--completed': segmentProgress >= segment.value,
      'progress-bar__segment--active': segmentProgress > 0 && segmentProgress < segment.value,
    };
  }

  getStatusMessage(): string {
    const percentage = this.getPercentage();
    if (percentage >= 100) return '¡Objetivo completado!';
    if (percentage >= 80) return 'En buen camino';
    if (percentage >= 60) return 'Progreso constante';
    if (percentage >= 40) return 'Necesita atención';
    return 'Requiere acción urgente';
  }

  getStatusMessageClass(): Record<string, boolean> {
    const percentage = this.getPercentage();
    return {
      'progress-bar__status--completed': percentage >= 100,
      'progress-bar__status--on-track': percentage >= 60 && percentage < 100,
      'progress-bar__status--behind': percentage >= 40 && percentage < 60,
      'progress-bar__status--at-risk': percentage < 40,
    };
  }

  getRemainingMessage(): string {
    const remaining = this.goal - this.progress;
    if (remaining <= 0) return 'Meta alcanzada';
    return `Faltan ${formatNumber(remaining, this.currency)}`;
  }

  getActionButtonClass(): Record<string, boolean> {
    const percentage = this.getPercentage();
    return {
      'progress-bar__action-button--success': percentage >= 100,
      'progress-bar__action-button--primary': percentage < 100,
    };
  }

  getSegmentStartValue(index: number): number {
    return this.segments.slice(0, index).reduce((sum, seg) => sum + seg.value, 0);
  }

  formatValue(value: number): string {
    return formatNumber(value, this.currency);
  }

  onActionClick(): void {
    if (this.actionCallback) {
      this.actionCallback();
    }
  }
}

function formatNumber(value: number, currency: string): string {
  if (currency === 'MXN') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return value.toLocaleString();
}
