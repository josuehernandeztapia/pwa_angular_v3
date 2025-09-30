/**
 * Icono contextual representado mediante `<app-icon>` para Human Message Component - Contextual Microcopy Display
 * Displays human-first messages with appropriate styling and animations
 */

import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumanMicrocopyService, MicrocopyConfig } from '../../../services/human-microcopy.service';
import { IconComponent } from "../shared/icon/icon.component"

@Component({
  selector: 'app-human-message',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './human-message.component.html',
  styleUrls: ['./human-message.component.scss']
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

  getMessageClasses(): Record<string, boolean> {
    const classes: Record<string, boolean> = {
      'human-message': true,
      [`human-message--size-${this.size}`]: true,
      'human-message--dismissible': this.dismissible,
    };

    const context = this.microcopy?.context;
    if (context) {
      classes[`human-message--context-${context}`] = true;
    }

    const tone = this.microcopy?.tone;
    if (tone) {
      classes[`human-message--tone-${tone}`] = true;
    }

    return classes;
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

  getActionButtonClasses(): Record<string, boolean> {
    const context = this.microcopy?.context;
    const isPrimary = context === 'onboarding' || context === 'success' || context === 'celebration';

    return {
      'human-message__action-button': true,
      'human-message__action-button--primary': isPrimary,
      'human-message__action-button--secondary': !isPrimary,
    };
  }

  getIconClasses(): Record<string, boolean> {
    return {
      'human-message__icon': true,
      'human-message__icon--animated': this.animateIcon,
    };
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
