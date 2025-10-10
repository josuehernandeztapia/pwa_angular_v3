/**
 * Icono contextual representado mediante `<app-icon>` para Human Message Component - Contextual Microcopy Display
 * Displays human-first messages with appropriate styling and animations
 */

import { Component, Input, OnInit, ChangeDetectionStrategy, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumanMicrocopyService, MicrocopyConfig } from '../../../services/human-microcopy.service';
import { IconComponent } from "../icon/icon.component"
import { IconName } from '../icon/icon-definitions';

@Component({
  selector: 'app-human-message',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './human-message.component.html',
  styleUrls: ['./human-message.component.scss']
})
export class HumanMessageComponent implements OnInit, OnChanges {
  @Input() microcopyId!: string;
  @Input() context?: any;
  @Input() size: 'compact' | 'normal' | 'comfortable' = 'normal';
  @Input() showIcon: boolean = true;
  @Input() showAction: boolean = true;
  @Input() dismissible: boolean = false;
  @Input() iconSize: 'sm' | 'md' | 'lg' | number = 'md';
  @Input() animateIcon: boolean = true;

  @Output() action = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  @Input('message-context')
  set messageContext(value: any) {
    this.context = value;
    this.loadMicrocopy();
  }

  @Input('personalization-data')
  set personalizationData(value: any) {
    this.personalizationContext = value;
    this.loadMicrocopy();
  }

  @Input('show-animation')
  set showAnimation(value: boolean) {
    this.animateIcon = this.toBoolean(value);
  }

  microcopy: MicrocopyConfig | null = null;
  private personalizationContext: any;

  constructor(private microcopyService: HumanMicrocopyService) {}

  ngOnInit(): void {
    this.loadMicrocopy();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('microcopyId' in changes && !changes['microcopyId'].isFirstChange()) {
      this.loadMicrocopy();
    }

    if ('context' in changes && !changes['context'].isFirstChange()) {
      this.loadMicrocopy();
    }
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

  getContextIcon(): IconName {
    const fallback: IconName = 'information-circle';

    if (!this.microcopy) return fallback;

    const iconMap: Partial<Record<string, IconName>> = {
      onboarding: 'lightbulb',
      success: 'check-circle',
      celebration: 'celebration',
      error: 'alert-triangle',
      guidance: 'lightbulb',
      encouragement: 'target',
      reassurance: 'shield'
    };

    return iconMap[this.microcopy.context] ?? fallback;
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

  get iconPixelSize(): number {
    if (typeof this.iconSize === 'number') {
      return this.iconSize;
    }

    const sizeMap: Record<'sm' | 'md' | 'lg', number> = {
      sm: 16,
      md: 20,
      lg: 24
    };

    return sizeMap[this.iconSize] ?? sizeMap.md;
  }

  onActionClick(): void {
    this.action.emit();
    this.retry.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  private loadMicrocopy(): void {
    if (!this.microcopyId) {
      this.microcopy = null;
      return;
    }

    const personalizationSource = this.personalizationContext ?? this.context;
    this.microcopy = this.microcopyService.getMicrocopy(this.microcopyId, personalizationSource);
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized !== 'false' && normalized !== '0';
    }

    return !!value;
  }
}
