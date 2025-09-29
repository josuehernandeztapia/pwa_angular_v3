import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiIconName = string;

export type UiIconSize = 'sm' | 'md' | 'lg' | 'xl' | number;

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-icon.component.html',
  styleUrls: ['./ui-icon.component.scss']
})
export class UiIconComponent {
  @Input() name!: UiIconName;
  @Input() size: UiIconSize = 'md';
  @Input() ariaLabel?: string;

  getSizePx(): number {
    if (typeof this.size === 'number') return this.size;
    const map: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48
    };
    return map[this.size];
  }
}
