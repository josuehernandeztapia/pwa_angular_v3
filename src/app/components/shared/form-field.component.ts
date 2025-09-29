import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ControlContainer, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: ControlContainer }],
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.scss'],
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

  getContainerClasses(): Record<string, boolean> {
    return {
      'form-field--size-sm': this.size === 'sm',
    };
  }
}
