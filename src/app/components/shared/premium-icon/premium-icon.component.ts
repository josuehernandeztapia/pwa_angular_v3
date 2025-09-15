/**
 * 🎨 Premium Icon Component - World-Class Iconography
 * Phosphor Icons + Semantic Context + Custom Animations
 */

import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PremiumIconsService, IconConfig } from '../../../services/premium-icons.service';

@Component({
  selector: 'app-premium-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <i 
      [class]="getIconClasses()"
      [attr.aria-label]="iconConfig?.accessibilityLabel"
      [attr.data-icon]="iconName"
      [attr.data-semantic-context]="iconConfig?.semanticContext"
      role="img"
    >
      <ng-content></ng-content>
    </i>
  `,
  styles: [`
    /* 🎨 Custom Animation Keyframes */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    @keyframes fade {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }

    @keyframes scale {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    /* Animation Classes */
    .animate-shake {
      animation: shake var(--animation-duration, 300ms) ease-in-out;
    }

    .animate-fade {
      animation: fade var(--animation-duration, 800ms) ease-in-out infinite;
    }

    .animate-scale {
      animation: scale var(--animation-duration, 200ms) ease-out;
    }

    .animate-pulse {
      animation: pulse var(--animation-duration, 1000ms) cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .animate-bounce {
      animation: bounce var(--animation-duration, 500ms) ease-in-out;
    }

    .animate-spin {
      animation: spin var(--animation-duration, 1000ms) linear infinite;
    }

    /* Phosphor Icon Base Styles */
    i {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Icon Font Integration (Phosphor Icons CDN) */
    @import url('https://unpkg.com/phosphor-icons@1.4.2/src/css/icons.css');

    /* Semantic Color Themes */
    .text-primary { color: #3b82f6; }
    .text-success { color: #10b981; }
    .text-warning { color: #f59e0b; }
    .text-error { color: #ef4444; }
    .text-neutral { color: #6b7280; }
    .text-info { color: #6366f1; }

    /* Hover States */
    i:hover {
      transform: translateY(-1px);
      filter: brightness(1.1);
    }

    /* Focus States for Accessibility */
    i:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
      border-radius: 4px;
    }

    /* Size Variants */
    .w-4 { width: 1rem; height: 1rem; }
    .w-5 { width: 1.25rem; height: 1.25rem; }
    .w-6 { width: 1.5rem; height: 1.5rem; }
    .w-8 { width: 2rem; height: 2rem; }
    .h-4 { height: 1rem; }
    .h-5 { height: 1.25rem; }
    .h-6 { height: 1.5rem; }
    .h-8 { height: 2rem; }
  `]
})
export class PremiumIconComponent implements OnInit {
  @Input() iconName!: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() theme?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
  @Input() animate?: boolean = true;
  @Input() semanticContext?: string;
  @Input() customClasses?: string;

  iconConfig: IconConfig | null = null;

  constructor(private iconService: PremiumIconsService) {}

  ngOnInit(): void {
    // Try semantic context first, then fallback to icon name
    if (this.semanticContext) {
      const semanticIcon = this.iconService.getSemanticIcon(this.semanticContext);
      if (semanticIcon) {
        this.iconConfig = semanticIcon.icon;
        this.theme = this.theme || semanticIcon.theme as any;
      }
    }

    if (!this.iconConfig) {
      this.iconConfig = this.iconService.getSafeIcon(this.iconName);
    }
  }

  getIconClasses(): string {
    if (!this.iconConfig) return '';

    const classes = [];

    // Phosphor icon class
    classes.push(`ph-${this.iconConfig.phosphorIcon}`);

    // Size classes
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5', 
      lg: 'w-6 h-6',
      xl: 'w-8 h-8'
    };
    classes.push(sizeClasses[this.size]);

    // Theme colors
    if (this.theme) {
      classes.push(`text-${this.theme}`);
    }

    // Animation classes
    if (this.animate && this.iconConfig.animation) {
      classes.push(`animate-${this.iconConfig.animation}`);
      
      // Set animation duration CSS variable
      const durations = {
        pulse: '1000ms',
        bounce: '500ms',
        shake: '300ms',
        rotate: '1000ms',
        fade: '800ms',
        scale: '200ms'
      };
      
      if (durations[this.iconConfig.animation]) {
        classes.push(`duration-${this.iconConfig.animation}`);
      }
    }

    // Custom classes
    if (this.customClasses) {
      classes.push(this.customClasses);
    }

    return classes.filter(Boolean).join(' ');
  }
}