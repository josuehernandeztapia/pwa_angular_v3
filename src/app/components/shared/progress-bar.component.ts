import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type ProgressTheme = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gradient';
type ProgressSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-container" [class]="getContainerClass()">
      <!-- Label and Progress Info -->
      <div class="progress-header mb-2" *ngIf="label || showPercentage || showValues">
        <div class="flex justify-between items-center">
          <span class="progress-label text-sm font-medium" [class]="getLabelColorClass()" *ngIf="label">
            {{ label }}
          </span>
          <div class="progress-info flex items-center gap-3">
            <span class="progress-percentage text-sm font-medium" [class]="getPercentageColorClass()" *ngIf="showPercentage">
              {{ getPercentage() }}%
            </span>
            <span class="progress-values text-sm text-gray-400" *ngIf="showValues && currency">
              {{ formatValue(progress) }} / {{ formatValue(goal) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Progress Bar Track -->
      <div class="progress-track relative rounded-full overflow-hidden" [class]="getTrackClass()">
        <!-- Background Track -->
        <div class="track-background absolute inset-0" [class]="getBackgroundClass()"></div>
        
        <!-- Progress Fill -->
        <div 
          class="progress-fill h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          [class]="getFillClass()"
          [style.width.%]="getPercentage()"
        >
          <!-- Animated Shimmer Effect -->
          <div 
            class="shimmer-effect absolute inset-0 opacity-30" 
            *ngIf="animated"
            [class]="getShimmerClass()"
          ></div>
          
          <!-- Stripes Pattern -->
          <div 
            class="stripes-pattern absolute inset-0" 
            *ngIf="striped"
            [class]="getStripesClass()"
          ></div>
        </div>

        <!-- Goal Marker (if different from max) -->
        <div 
          *ngIf="goalMarker && goal < max" 
          class="goal-marker absolute top-0 w-0.5 h-full bg-white/80 z-10"
          [style.left.%]="(goal / max) * 100"
        >
          <div class="marker-tooltip absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
            Meta: {{ formatValue(goal) }}
          </div>
        </div>

        <!-- Milestone Markers -->
        <div 
          *ngFor="let milestone of milestones" 
          class="milestone-marker absolute top-0 w-0.5 h-full bg-gray-300 z-10"
          [style.left.%]="(milestone.value / max) * 100"
        >
          <div class="milestone-tooltip absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {{ milestone.label }}
          </div>
        </div>
      </div>

      <!-- Sub-progress Segments (for multi-part progress) -->
      <div class="progress-segments mt-2" *ngIf="segments && segments.length > 0">
        <div class="segments-container flex gap-1">
          <div 
            *ngFor="let segment of segments; let i = index"
            class="segment flex-1 h-1 rounded-full transition-all duration-300"
            [class]="getSegmentClass(segment, i)"
            [style.background-color]="segment.color"
            [title]="segment.label"
          ></div>
        </div>
      </div>

      <!-- Status Messages -->
      <div class="progress-messages mt-2" *ngIf="showMessages">
        <div class="flex items-center justify-between text-xs">
          <span class="status-message" [class]="getStatusMessageClass()">
            {{ getStatusMessage() }}
          </span>
          <span class="remaining-message text-gray-500" *ngIf="showRemaining">
            {{ getRemainingMessage() }}
          </span>
        </div>
      </div>

      <!-- Action Button (optional) -->
      <div class="progress-action mt-3" *ngIf="actionLabel && actionCallback">
        <button 
          (click)="onActionClick()"
          [disabled]="actionDisabled"
          class="action-btn px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          [class]="getActionButtonClass()"
        >
          {{ actionLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .progress-container {
      width: 100%;
    }

    /* Size Variants */
    .size-sm .progress-track { height: 0.375rem; }
    .size-md .progress-track { height: 0.5rem; }
    .size-lg .progress-track { height: 0.75rem; }
    .size-xl .progress-track { height: 1rem; }

    /* Theme Colors */
    .theme-default .progress-fill {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .theme-success .progress-fill {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .theme-warning .progress-fill {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .theme-danger .progress-fill {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .theme-info .progress-fill {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .theme-gradient .progress-fill {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    /* Track Backgrounds */
    .track-bg-light { background-color: #f1f5f9; }
    .track-bg-dark { background-color: #374151; }

    /* Label Colors */
    .label-light { color: #374151; }
    .label-dark { color: #f9fafb; }
    .label-primary { color: #3b82f6; }

    /* Percentage Colors */
    .percentage-light { color: #1f2937; }
    .percentage-dark { color: #f3f4f6; }
    .percentage-primary { color: #3b82f6; }
    .percentage-success { color: #10b981; }
    .percentage-warning { color: #f59e0b; }
    .percentage-danger { color: #ef4444; }

    /* Shimmer Animation */
    .shimmer-effect {
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
      transform: translateX(-100%);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Stripes Pattern */
    .stripes-pattern {
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 6px,
        rgba(255,255,255,0.1) 6px,
        rgba(255,255,255,0.1) 12px
      );
      animation: move-stripes 1s linear infinite;
    }

    @keyframes move-stripes {
      0% { background-position: 0 0; }
      100% { background-position: 17px 0; }
    }

    /* Segments */
    .segment {
      opacity: 0.3;
      transition: opacity 0.3s ease;
    }

    .segment.segment-active {
      opacity: 1;
    }

    .segment.segment-completed {
      opacity: 1;
    }

    /* Status Message Colors */
    .status-on-track { color: #10b981; }
    .status-behind { color: #f59e0b; }
    .status-at-risk { color: #ef4444; }
    .status-completed { color: #10b981; }

    /* Action Button */
    .action-btn.btn-primary {
      background-color: #3b82f6;
      color: white;
    }

    .action-btn.btn-primary:hover:not(:disabled) {
      background-color: #2563eb;
    }

    .action-btn.btn-success {
      background-color: #10b981;
      color: white;
    }

    .action-btn.btn-success:hover:not(:disabled) {
      background-color: #059669;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Tooltips */
    .goal-marker:hover .marker-tooltip,
    .milestone-marker:hover .milestone-tooltip {
      opacity: 1;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .progress-header {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }
      
      .progress-info {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `]
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
  @Input() milestones: { value: number, label: string }[] = [];
  @Input() segments: { value: number, label: string, color: string }[] = [];
  @Input() actionLabel?: string;
  @Input() actionCallback?: () => void;
  @Input() actionDisabled: boolean = false;

  getPercentage(): number {
    if (this.max === 0) return 0;
    return Math.min(Math.round((this.progress / this.max) * 100), 100);
  }

  getContainerClass(): string {
    return `progress-container size-${this.size}`;
  }

  getTrackClass(): string {
    return `progress-track ${this.darkMode ? 'track-bg-dark' : 'track-bg-light'}`;
  }

  getBackgroundClass(): string {
    return this.darkMode ? 'track-bg-dark' : 'track-bg-light';
  }

  getFillClass(): string {
    return `progress-fill theme-${this.theme}`;
  }

  getLabelColorClass(): string {
    if (this.darkMode) return 'label-dark';
    return 'label-light';
  }

  getPercentageColorClass(): string {
    const percentage = this.getPercentage();
    if (percentage >= 100) return 'percentage-success';
    if (percentage >= 80) return 'percentage-primary';
    if (percentage >= 60) return this.darkMode ? 'percentage-dark' : 'percentage-light';
    if (percentage >= 40) return 'percentage-warning';
    return 'percentage-danger';
  }

  getShimmerClass(): string {
    return 'shimmer-effect';
  }

  getStripesClass(): string {
    return 'stripes-pattern';
  }

  getSegmentClass(segment: any, index: number): string {
    const segmentProgress = this.progress - this.getSegmentStartValue(index);
    if (segmentProgress >= segment.value) return 'segment segment-completed';
    if (segmentProgress > 0) return 'segment segment-active';
    return 'segment';
  }

  getSegmentStartValue(index: number): number {
    return this.segments.slice(0, index).reduce((sum, seg) => sum + seg.value, 0);
  }

  getStatusMessage(): string {
    const percentage = this.getPercentage();
    if (percentage >= 100) return '¡Objetivo completado!';
    if (percentage >= 80) return 'En buen camino';
    if (percentage >= 60) return 'Progreso constante';
    if (percentage >= 40) return 'Necesita atención';
    return 'Requiere acción urgente';
  }

  getStatusMessageClass(): string {
    const percentage = this.getPercentage();
    if (percentage >= 100) return 'status-completed';
    if (percentage >= 80) return 'status-on-track';
    if (percentage >= 60) return 'status-on-track';
    if (percentage >= 40) return 'status-behind';
    return 'status-at-risk';
  }

  getRemainingMessage(): string {
    const remaining = this.goal - this.progress;
    if (remaining <= 0) return 'Meta alcanzada';
    return `Faltan ${this.formatValue(remaining)}`;
  }

  getActionButtonClass(): string {
    const percentage = this.getPercentage();
    if (percentage >= 100) return 'action-btn btn-success';
    return 'action-btn btn-primary';
  }

  formatValue(value: number): string {
    if (this.currency === 'MXN') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    }
    return value.toLocaleString();
  }

  onActionClick(): void {
    if (this.actionCallback && !this.actionDisabled) {
      this.actionCallback();
    }
  }
}

// Usage Examples:
/*
<!-- Basic Progress Bar -->
<app-progress-bar 
  [progress]="currentAmount"
  [goal]="targetAmount"
  label="Ahorro Acumulado"
  currency="MXN"
  [showValues]="true">
</app-progress-bar>

<!-- Success Theme with Animation -->
<app-progress-bar 
  [progress]="completedTasks"
  [max]="totalTasks"
  theme="success"
  size="lg"
  [animated]="true"
  label="Documentos Aprobados">
</app-progress-bar>

<!-- Multi-segment Progress -->
<app-progress-bar 
  [progress]="totalSavings"
  [goal]="downPaymentGoal"
  [segments]="savingsSegments"
  label="Progreso de Ahorro"
  [showMessages]="true"
  [showRemaining]="true">
</app-progress-bar>

<!-- With Action Button -->
<app-progress-bar 
  [progress]="monthlyProgress"
  [goal]="monthlyTarget"
  theme="gradient"
  [animated]="true"
  actionLabel="Realizar Pago"
  [actionCallback]="makePayment"
  [showMessages]="true">
</app-progress-bar>

<!-- Goal with Milestones -->
<app-progress-bar 
  [progress]="currentAmount"
  [goal]="finalGoal"
  [milestones]="[
    {value: 50000, label: 'Primer Hito'},
    {value: 100000, label: 'Segundo Hito'}
  ]"
  [goalMarker]="true"
  theme="info"
  size="xl">
</app-progress-bar>
*/