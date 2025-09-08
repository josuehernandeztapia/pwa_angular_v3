import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="premium-card" [attr.aria-label]="ariaLabel" aria-busy="true">
      <div class="skeleton title" [style.width.%]="titleWidth"></div>
      <div class="skeleton subtitle" [style.width.%]="subtitleWidth"></div>
      <div class="skeleton button" [style.width.%]="buttonWidth"></div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .skeleton { position: relative; overflow: hidden; background: rgba(255,255,255,0.08); border-radius: var(--radius-sm); }
      .title { height: 22px; margin-bottom: var(--space-12); }
      .subtitle { height: 16px; margin-bottom: var(--space-16); }
      .button { height: 36px; width: 120px; border-radius: var(--radius-sm); }
      .skeleton::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); animation: shimmer 1.2s infinite; }
      @keyframes shimmer { 100% { transform: translateX(100%); } }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonCardComponent {
  @Input() titleWidth: number = 60;
  @Input() subtitleWidth: number = 80;
  @Input() buttonWidth: number = 40;
  @Input() ariaLabel: string = 'Cargando contenido';
}

