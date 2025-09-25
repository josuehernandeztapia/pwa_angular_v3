/**
 * 📝 Human Message Component - Contextual Microcopy Display
 * Displays human-first messages with appropriate styling and animations
 */

import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumanMicrocopyService, MicrocopyConfig } from '../../../services/human-microcopy.service';
import { PremiumIconComponent } from '../premium-icon/premium-icon.component';

@Component({
  selector: 'app-human-message',
  standalone: true,
  imports: [CommonModule, PremiumIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      [class]="getMessageClasses()"
      [attr.role]="microcopy?.context === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="getAriaLive()"
      [attr.data-microcopy-id]="microcopy?.id"
      [attr.data-context]="microcopy?.context"
      [attr.data-tone]="microcopy?.tone"
    >
      <!-- Icon (contextual) -->
      <div class="message-icon" *ngIf="showIcon">
        <app-premium-icon 
          [iconName]="getContextIcon()"
          [theme]="getIconTheme()"
          [size]="iconSize"
          [animate]="animateIcon">
        </app-premium-icon>
      </div>

      <!-- Content -->
      <div class="message-content">
        <!-- Primary Text -->
        <div class="message-primary" [innerHTML]="microcopy?.primaryText"></div>
        
        <!-- Secondary Text -->
        <div 
          class="message-secondary" 
          *ngIf="microcopy?.secondaryText"
          [innerHTML]="microcopy.secondaryText">
        </div>

        <!-- Action Button -->
        <div class="message-action" *ngIf="microcopy?.actionText && showAction">
          <button 
            type="button"
            [class]="getActionButtonClasses()"
            (click)="onActionClick()"
            [attr.aria-label]="microcopy.accessibility?.description || microcopy.actionText"
          >
            {{ microcopy.actionText }}
          </button>
        </div>
      </div>

      <!-- Dismiss Button -->
      <button 
        *ngIf="dismissible"
        type="button"
        class="message-dismiss"
        (click)="onDismiss()"
        aria-label="Cerrar mensaje"
      >
        <app-premium-icon iconName="action-delete" size="sm" theme="neutral"></app-premium-icon>
      </button>
    </div>
  `,
  styles: [`
    /* 🎨 Message Container Base */
    .human-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: slideIn 0.4s ease-out;
      position: relative;
      overflow: hidden;
    }

    .human-message::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: currentColor;
      opacity: 0.3;
    }

    /* 🎯 Context-Specific Styling */
    .message-onboarding {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #0284c7;
      color: #0c4a6e;
    }

    .message-success {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #16a34a;
      color: #14532d;
    }

    .message-celebration {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #eab308;
      color: #713f12;
      position: relative;
    }

    .message-celebration::after {
      content: '✨';
      position: absolute;
      top: 8px;
      right: 12px;
      font-size: 18px;
      animation: sparkle 2s infinite;
    }

    .message-error {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #dc2626;
      color: #7f1d1d;
    }

    .message-guidance {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #9333ea;
      color: #581c87;
    }

    .message-encouragement {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #2563eb;
      color: #1e3a8a;
    }

    .message-reassurance {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-color: #6b7280;
      color: #374151;
    }

    /* 📱 Tone-Specific Typography */
    .tone-professional .message-primary {
      font-weight: 600;
      font-size: 14px;
      line-height: 1.4;
    }

    .tone-friendly .message-primary {
      font-weight: 500;
      font-size: 15px;
      line-height: 1.5;
    }

    .tone-celebratory .message-primary {
      font-weight: 700;
      font-size: 16px;
      line-height: 1.3;
    }

    .tone-supportive .message-primary {
      font-weight: 500;
      font-size: 14px;
      line-height: 1.5;
    }

    .tone-urgent .message-primary {
      font-weight: 700;
      font-size: 15px;
      line-height: 1.4;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tone-reassuring .message-primary {
      font-weight: 500;
      font-size: 14px;
      line-height: 1.6;
    }

    /* Content Layout */
    .message-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-primary {
      margin: 0 0 4px 0;
    }

    .message-secondary {
      margin: 4px 0 12px 0;
      font-size: 13px;
      opacity: 0.8;
      line-height: 1.5;
    }

    .message-action {
      margin-top: 12px;
    }

    /* Action Button Styling */
    .action-button {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: none;
    }

    .action-button-primary {
      background: #2563eb;
      color: white;
    }

    .action-button-primary:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    .action-button-secondary {
      background: rgba(255, 255, 255, 0.8);
      color: currentColor;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .action-button-secondary:hover {
      background: white;
      transform: translateY(-1px);
    }

    /* Dismiss Button */
    .message-dismiss {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0.5;
      transition: opacity 0.2s ease;
    }

    .message-dismiss:hover {
      opacity: 0.8;
      background: rgba(0, 0, 0, 0.05);
    }

    /* Animations */
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes sparkle {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
    }

    /* Size Variants */
    .size-compact {
      padding: 12px;
      gap: 8px;
    }

    .size-compact .message-primary {
      font-size: 13px;
    }

    .size-compact .message-secondary {
      font-size: 12px;
    }

    .size-comfortable {
      padding: 20px;
      gap: 16px;
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .human-message {
        padding: 12px;
        gap: 8px;
      }
      
      .message-primary {
        font-size: 14px;
      }
      
      .message-secondary {
        font-size: 12px;
      }
    }

    /* High Contrast Mode Support */
    @media (prefers-contrast: high) {
      .human-message {
        border-width: 2px;
      }
      
      .message-primary {
        font-weight: 700;
      }
    }

    /* Reduced Motion Support */
    @media (prefers-reduced-motion: reduce) {
      .human-message {
        animation: none;
      }
      
      .message-celebration::after {
        animation: none;
      }
      
      .action-button:hover {
        transform: none;
      }
    }
  `]
})
export class HumanMessageComponent implements OnInit {
  @Input() microcopyId!: string;
  @Input() context?: any;
  @Input() size: 'compact' | 'normal' | 'comfortable' = 'normal';
  @Input() showIcon: boolean = true;
  @Input() showAction: boolean = true;
  @Input() dismissible: boolean = false;
  @Input() iconSize: 'sm' | 'md' | 'lg' = 'md';
  @Input() animateIcon: boolean = true;

  microcopy: MicrocopyConfig | null = null;

  constructor(private microcopyService: HumanMicrocopyService) {}

  ngOnInit(): void {
    this.microcopy = this.microcopyService.getMicrocopy(this.microcopyId, this.context);
  }

  getMessageClasses(): string {
    if (!this.microcopy) return 'human-message';

    const classes = [
      'human-message',
      `message-${this.microcopy.context}`,
      `tone-${this.microcopy.tone}`,
      `size-${this.size}`
    ];

    return classes.join(' ');
  }

  getContextIcon(): string {
    if (!this.microcopy) return 'system-healthy';

    const iconMap: Record<string, string> = {
      onboarding: 'nav-dashboard',
      success: 'system-healthy',
      celebration: 'kpi-growth',
      error: 'system-error',
      guidance: 'customer-communication',
      encouragement: 'action-create',
      reassurance: 'protection-shield'
    };

    return iconMap[this.microcopy.context] || 'system-healthy';
  }

  getIconTheme(): string {
    if (!this.microcopy) return 'neutral';

    const themeMap: Record<string, string> = {
      onboarding: 'info',
      success: 'success',
      celebration: 'warning',
      error: 'error',
      guidance: 'primary',
      encouragement: 'info',
      reassurance: 'neutral'
    };

    return themeMap[this.microcopy.context] || 'neutral';
  }

  getActionButtonClasses(): string {
    if (!this.microcopy) return 'action-button action-button-primary';

    const isPrimary = this.microcopy.context === 'onboarding' || 
                     this.microcopy.context === 'success' ||
                     this.microcopy.context === 'celebration';

    return `action-button ${isPrimary ? 'action-button-primary' : 'action-button-secondary'}`;
  }

  getAriaLive(): 'polite' | 'assertive' | 'off' {
    if (!this.microcopy) return 'polite';

    return this.microcopy.context === 'error' ? 'assertive' : 'polite';
  }

  onActionClick(): void {
    // Emit action event or handle navigation
  }

  onDismiss(): void {
    // Emit dismiss event
  }
}
