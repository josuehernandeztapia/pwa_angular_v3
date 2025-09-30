import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export interface StepperStep {
  id: string;
  label: string;
  valid?: boolean;
  completed?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="stepper" [class.stepper--mobile]="isMobile" [attr.aria-label]="'Progreso: paso ' + (currentStepIndex + 1) + ' de ' + steps.length">
      <!-- Progress Bar -->
      <div class="stepper__progress" role="progressbar"
           [attr.aria-valuenow]="progressPercentage"
           [attr.aria-valuemin]="0"
           [attr.aria-valuemax]="100"
           [attr.aria-valuetext]="progressPercentage.toFixed(0) + '% completado'">
        <div class="stepper__progress-track">
          <div class="stepper__progress-fill" [style.width.%]="progressPercentage"></div>
        </div>
      </div>

      <!-- Steps -->
      <div class="stepper__steps" role="tablist">
        <div
          *ngFor="let step of steps; let i = index"
          class="stepper__step"
          [class.stepper__step--active]="i === currentStepIndex"
          [class.stepper__step--completed]="step.completed || i < currentStepIndex"
          [class.stepper__step--invalid]="step.valid === false && i === currentStepIndex"
          [attr.role]="i === currentStepIndex ? 'tab' : 'button'"
          [attr.tabindex]="i === currentStepIndex ? '0' : '-1'"
          [attr.aria-selected]="i === currentStepIndex"
          [attr.aria-current]="i === currentStepIndex ? 'step' : null"
          (click)="onStepClick(i)"
          (keydown.enter)="onStepClick(i)"
          (keydown.space)="onStepClick(i)"
        >
          <!-- Step Icon/Number -->
          <div class="stepper__step-indicator">
            <div
              *ngIf="step.completed || i < currentStepIndex"
              class="stepper__step-icon stepper__step-icon--completed"
              aria-label="Completado"
            >
              <app-icon name="check" [size]="16"></app-icon>
            </div>
            <div
              *ngIf="step.icon && !step.completed && i >= currentStepIndex"
              class="stepper__step-icon"
              [attr.aria-label]="step.label"
            >
              <app-icon [name]="step.icon" [size]="16"></app-icon>
            </div>
            <div
              *ngIf="!step.icon && !step.completed && i >= currentStepIndex"
              class="stepper__step-number"
              [attr.aria-label]="'Paso ' + (i + 1)"
            >
              {{ i + 1 }}
            </div>
          </div>

          <!-- Step Label -->
          <span class="stepper__step-label" [id]="'step-label-' + i">
            {{ step.label }}
            <span *ngIf="i === currentStepIndex && step.valid === false" class="stepper__step-error" aria-label="Requiere atención">
              <app-icon name="alert-circle" [size]="14"></app-icon>
            </span>
          </span>

          <!-- Connection line -->
          <div *ngIf="i < steps.length - 1" class="stepper__step-connector" aria-hidden="true"></div>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <div *ngIf="isMobile" class="stepper__mobile-nav" role="group" aria-label="Navegación de pasos">
        <button
          type="button"
          class="stepper__nav-btn stepper__nav-btn--prev"
          [disabled]="currentStepIndex === 0 || !allowNavigation"
          (click)="onPreviousStep()"
          [attr.aria-label]="'Ir al paso anterior: ' + (currentStepIndex > 0 ? steps[currentStepIndex - 1]?.label : '')"
        >
          <app-icon name="chevron-left" [size]="16"></app-icon>
          <span class="stepper__nav-text">Anterior</span>
        </button>

        <span class="stepper__mobile-indicator" aria-live="polite">
          {{ currentStepIndex + 1 }} de {{ steps.length }}
        </span>

        <button
          type="button"
          class="stepper__nav-btn stepper__nav-btn--next"
          [disabled]="currentStepIndex >= steps.length - 1 || !canProceed || !allowNavigation"
          (click)="onNextStep()"
          [attr.aria-label]="'Ir al siguiente paso: ' + (currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1]?.label : '')"
        >
          <span class="stepper__nav-text">Siguiente</span>
          <app-icon name="chevron-right" [size]="16"></app-icon>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./stepper.component.scss']
})
export class StepperComponent implements OnChanges {
  @Input() steps: StepperStep[] = [];
  @Input() currentStepIndex: number = 0;
  @Input() canProceed: boolean = true;
  @Input() allowNavigation: boolean = true;
  @Input() isMobile: boolean = false;

  @Output() stepChange = new EventEmitter<number>();
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStepIndex'] && changes['currentStepIndex'].currentValue >= 0) {
      // Ensure step index is within bounds
      if (this.currentStepIndex >= this.steps.length) {
        this.currentStepIndex = this.steps.length - 1;
      }
    }
  }

  get progressPercentage(): number {
    if (this.steps.length === 0) return 0;
    return (this.currentStepIndex / (this.steps.length - 1)) * 100;
  }

  onStepClick(index: number): void {
    if (!this.allowNavigation || index === this.currentStepIndex) return;

    // Only allow navigation to previous steps or next step if current is valid
    const canNavigate = index < this.currentStepIndex ||
      (index === this.currentStepIndex + 1 && this.canProceed);

    if (canNavigate) {
      this.stepChange.emit(index);
    }
  }

  onNextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1 && this.canProceed && this.allowNavigation) {
      this.nextStep.emit();
    }
  }

  onPreviousStep(): void {
    if (this.currentStepIndex > 0 && this.allowNavigation) {
      this.previousStep.emit();
    }
  }
}