import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiIconName = string;

export type UiIconSize = 'sm' | 'md' | 'lg' | 'xl' | number;

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="getSizePx()"
      [attr.height]="getSizePx()"
      viewBox="0 0 256 256"
      fill="none"
      stroke="currentColor"
      stroke-width="16"
      class="ui-icon text-neutral-100"
      [attr.aria-label]="ariaLabel || name"
      role="img">
      <ng-container [ngSwitch]="name">
        <g *ngSwitchCase="'cotizador'">
          <rect x="32" y="48" width="192" height="160" rx="8"/>
          <path d="m80,112h96m-96,32h96M80,80h96"/>
        </g>
        <g *ngSwitchCase="'simulador'">
          <circle cx="128" cy="128" r="96"/>
          <polyline points="128,128 128,80"/>
          <polyline points="128,128 168,168"/>
        </g>
        <g *ngSwitchCase="'tanda'">
          <circle cx="88" cy="108" r="52"/>
          <circle cx="168" cy="108" r="52"/>
          <path d="m16,197.4a88,88,0,0,1,144,0"/>
          <path d="m96,197.4a88,88,0,0,1,144,0"/>
        </g>
        <g *ngSwitchCase="'proteccion'">
          <path d="M208,40,128,88,48,40a8,8,0,0,0-8,8V108c0,84,52.4,119.3,75.6,130a8,8,0,0,0,8.8,0C148.6,227.3,216,192,216,108V48A8,8,0,0,0,208,40Z"/>
          <polyline points="88,136 112,160 168,104"/>
        </g>
        <g *ngSwitchCase="'postventa'">
          <path d="M224,64V192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V64A8,8,0,0,1,40,56H88V48a16,16,0,0,1,16-16h32a16,16,0,0,1,16,16v8h48A8,8,0,0,1,224,64Z"/>
          <path d="M168,56V72a8,8,0,0,1-8,8H96a8,8,0,0,1-8-8V56"/>
          <line x1="104" y1="48" x2="152" y2="48"/>
        </g>
        <g *ngSwitchCase="'entregas'">
          <rect x="32" y="144" width="144" height="64" rx="8"/>
          <path d="M176,144h24a8,8,0,0,1,8,8v32a8,8,0,0,1-8,8"/>
          <circle cx="192" cy="192" r="24"/>
          <circle cx="80" cy="192" r="24"/>
          <line x1="32" y1="144" x2="32" y2="72"/>
          <polyline points="224,96 176,96 176,144"/>
        </g>
        <g *ngSwitchCase="'gnv'">
          <rect x="72" y="80" width="80" height="128" rx="8"/>
          <path d="M152,120h16a8,8,0,0,1,8,8v24a8,8,0,0,0,8,8h8a8,8,0,0,0,8-8V96a16,16,0,0,0-16-16H168"/>
          <circle cx="184" cy="88" r="8" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'avi'">
          <rect x="96" y="40" width="64" height="104" rx="32"/>
          <path d="M80,128v16a48,48,0,0,0,96,0V128"/>
          <line x1="128" y1="192" x2="128" y2="224"/>
          <line x1="104" y1="224" x2="152" y2="224"/>
        </g>
        <g *ngSwitchCase="'check-circle'">
          <circle cx="128" cy="128" r="96"/>
          <polyline points="80,128 112,160 176,96"/>
        </g>
        <g *ngSwitchCase="'alert-circle'">
          <circle cx="128" cy="128" r="96"/>
          <line x1="128" y1="80" x2="128" y2="144"/>
          <circle cx="128" cy="176" r="8" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'alert-triangle'">
          <polygon points="128,32 224,224 32,224"/>
          <line x1="128" y1="104" x2="128" y2="152"/>
          <circle cx="128" cy="184" r="8" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'camera'">
          <rect x="40" y="72" width="176" height="120" rx="12"/>
          <circle cx="128" cy="132" r="36"/>
        </g>
        <g *ngSwitchCase="'refresh'">
          <path d="M200,56v48h-48"/>
          <path d="M56,200v-48h48"/>
          <path d="M200,104a96,96,0,0,0-160,72"/>
          <path d="M56,152a96,96,0,0,0,160,-72"/>
        </g>
        <g *ngSwitchCase="'edit'">
          <path d="M196,60a24,24,0,0,0-34,0L64,158l-8,40 40-8 98-98"/>
        </g>
        <g *ngSwitchCase="'speedometer'">
          <circle cx="128" cy="148" r="64"/>
          <line x1="128" y1="148" x2="176" y2="120"/>
        </g>
        <g *ngSwitchCase="'scan'">
          <rect x="64" y="64" width="128" height="128" rx="8"/>
        </g>
        <g *ngSwitchCase="'voice-analysis'">
          <rect x="96" y="40" width="64" height="104" rx="32"/>
          <path d="M80,128v16a48,48,0,0,0,96,0V128"/>
        </g>
        <g *ngSwitchCase="'info'">
          <circle cx="128" cy="128" r="96"/>
          <line x1="128" y1="112" x2="128" y2="176"/>
          <circle cx="128" cy="88" r="8" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'check'">
          <polyline points="48,136 104,192 208,72"/>
        </g>
        <g *ngSwitchCase="'clock'">
          <circle cx="128" cy="128" r="96"/>
          <line x1="128" y1="128" x2="128" y2="80"/>
          <line x1="128" y1="128" x2="168" y2="168"/>
        </g>
        <g *ngSwitchDefault>
          <rect x="64" y="64" width="128" height="128" rx="8"/>
          <line x1="104" y1="104" x2="152" y2="152"/>
          <line x1="152" y1="104" x2="104" y2="152"/>
        </g>
      </ng-container>
    </svg>
  `,
  styles: [`
    .ui-icon {
      display: inline-block;
      vertical-align: middle;
    }
  `]
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

