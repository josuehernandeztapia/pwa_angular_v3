import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

export interface NextBestActionData {
  id: string;
  type: 'contact' | 'document' | 'renewal' | 'opportunity' | 'payment';
  priority: 'critical' | 'high' | 'medium';
  client: {
    id: string;
    name: string;
    healthScore: number;
    route?: string;
    avatar?: string;
  };
  action: {
    title: string;
    description: string;
    reasoning: string;
    timeEstimate: string;
  };
  context: {
    daysWaiting?: number;
    amountInvolved?: number;
    expirationDate?: string;
    lastContact?: string;
  };
  suggestedActions: {
    primary: ActionButton;
    secondary: ActionButton[];
  };
}

export interface ActionButton {
  label: string;
  icon?: string | IconName;
  action: string;
  params?: any;
}

@Component({
  selector: 'app-next-best-action-hero',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './next-best-action-hero.component.html',
  styleUrls: ['./next-best-action-hero.component.scss']
})
export class NextBestActionHeroComponent implements OnInit {
  @Input('data') actionData?: NextBestActionData;
  @Output() actionExecuted = new EventEmitter<{ action: ActionButton; context: NextBestActionData }>();

  private readonly actionTypeIconMap: Record<NextBestActionData['type'], IconName> = {
    contact: 'phone',
    document: 'document-text',
    renewal: 'refresh',
    opportunity: 'lightbulb',
    payment: 'currency-dollar'
  };

  private readonly actionIconFallbackMap: Record<string, IconName> = {
    call: 'phone',
    phone: 'phone',
    chat: 'chat',
    whatsapp: 'chat',
    sms: 'chat',
    message: 'chat',
    email: 'mail',
    mail: 'mail',
    document: 'document-text',
    description: 'document-text',
    upload: 'cloud-upload',
    reminder: 'bell',
    payments: 'currency-dollar',
    payment: 'currency-dollar',
    invoice: 'document-text',
    renew: 'refresh',
    autorenew: 'refresh',
    followup: 'target',
    link: 'link',
    calendar_today: 'calendar',
    calendar: 'calendar',
    download: 'download',
    view: 'eye'
  };

  constructor() {}

  ngOnInit(): void {}

  getActionIconName(): IconName {
    if (!this.actionData) return 'information-circle';
    return this.actionTypeIconMap[this.actionData.type];
  }

  getPriorityClasses(): Record<string, boolean> {
    const priority = this.actionData?.priority ?? 'medium';
    return {
      'next-best-hero__indicator-ring--critical': priority === 'critical',
      'next-best-hero__indicator-ring--high': priority === 'high',
      'next-best-hero__indicator-ring--medium': priority === 'medium'
    };
  }

  getAvatarStyle(): Record<string, string> {
    if (this.actionData?.client.avatar) {
      return { 'background-image': `url(${this.actionData.client.avatar})` };
    }
    return {};
  }

  getInitials(): string {
    if (!this.actionData?.client.name) {
      return '?';
    }

    return this.actionData.client.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getHealthScoreClasses(): Record<string, boolean> {
    const score = this.actionData?.client.healthScore ?? 0;
    return {
      'next-best-hero__health--excellent': score >= 80,
      'next-best-hero__health--good': score >= 65 && score < 80,
      'next-best-hero__health--warning': score >= 40 && score < 65,
      'next-best-hero__health--critical': score < 40
    };
  }

  hasContextMetrics(): boolean {
    const context = this.actionData?.context;
    if (!context) {
      return false;
    }

    return !!(context.daysWaiting || context.amountInvolved || context.expirationDate);
  }

  resolveActionIcon(icon?: string | IconName): IconName {
    if (!icon) {
      return 'information-circle';
    }

    if (typeof icon !== 'string') {
      return icon;
    }

    const normalized = icon.toLowerCase();
    if (this.actionIconFallbackMap[normalized]) {
      return this.actionIconFallbackMap[normalized];
    }
    return normalized as IconName;
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) {
      return 'MXN\u00a00';
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric'
    });
  }

  executeAction(action: ActionButton): void {
    if (!this.actionData) {
      return;
    }

    this.actionExecuted.emit({
      action,
      context: this.actionData
    });
  }
}
