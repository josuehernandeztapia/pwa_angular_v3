import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ControlContainer, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: ControlContainer }],
  template: `
    <div class="form-field" [class.sm]="size === 'sm'">
      <label *ngIf="label" [for]="id" class="label">{{ label }}</label>
      <ng-content></ng-content>
      <div class="helper-text" *ngIf="helper && !error" [id]="helperId">{{ helper }}</div>
      <div class="error-text" *ngIf="error" [id]="errorId">{{ error }}</div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .form-field { display: grid; gap: var(--space-8); }
      .form-field.sm :where(input, select, textarea) { padding: 8px 10px; font-size: 0.875rem; border-radius: var(--radius-sm); }
      .label { font-weight: var(--font-weight-semibold); }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
  @Input() id?: string;
  @Input() label?: string;
  @Input() helper?: string;
  @Input() error?: string;
  @Input() size: 'sm' | 'md' = 'md';

  get helperId(): string | null { return this.id ? `${this.id}-helper` : null; }
  get errorId(): string | null { return this.id ? `${this.id}-error` : null; }
}

