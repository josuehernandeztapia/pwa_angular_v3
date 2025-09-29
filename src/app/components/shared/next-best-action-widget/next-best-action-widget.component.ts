import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { Subject, takeUntil } from 'rxjs';
import { NextBestActionService, NextBestAction, ActionInsights } from '../../../services/next-best-action.service';

@Component({
  selector: 'app-next-best-action-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './next-best-action-widget.component.html',
  styleUrls: ['./next-best-action-widget.component.scss']
})
export class NextBestActionWidgetComponent implements OnInit, OnDestroy {
  @Input() maxDisplayActions = 5;
  @Input() autoRefresh = true;
  @Input() refreshInterval = 300000; // 5 minutes

  allActions: NextBestAction[] = [];
  displayActions: NextBestAction[] = [];
  insights: ActionInsights | null = null;
  isLoading = true;
  showingAll = false;

  private destroy$ = new Subject<void>();

  constructor(private nextBestActionService: NextBestActionService) {}

  ngOnInit(): void {
    this.loadActions();
    
    if (this.autoRefresh) {
      setInterval(() => this.loadActions(), this.refreshInterval);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadActions(): void {
    this.isLoading = true;
    
    this.nextBestActionService.generateNextBestActions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (actions) => {
          this.allActions = actions;
          this.updateDisplayActions();
          this.insights = this.nextBestActionService.getActionInsights(actions);
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.allActions = [];
          this.displayActions = [];
        }
      });
  }

  private updateDisplayActions(): void {
    this.displayActions = this.showingAll 
      ? this.allActions 
      : this.allActions.slice(0, this.maxDisplayActions);
  }

  getCardModifierClasses(action: NextBestAction): Record<string, boolean> {
    const priority = (action.priority || 'low').toLowerCase();
    return {
      [`next-best-action__card--priority-${priority}`]: true,
      'next-best-action__card--with-client': !!action.clientName,
    };
  }

  getPriorityDotClass(priority: string): string {
    return `next-best-action__priority-dot--${(priority || 'low').toLowerCase()}`;
  }

  toggleShowAll(): void {
    this.showingAll = !this.showingAll;
    this.updateDisplayActions();
  }

  getActionIcon(type: string): string {
    const icons = {
      'contact': '',
      'document': '',
      'payment': 'payment',
      'opportunity': '',
      'system': '⚙️'
    };
    return icons[type as keyof typeof icons] || 'pin';
  }

  formatCurrency(value: number): string {
    if (value === 0) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDueDate(dueDate: Date): string {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencida';
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays <= 7) return `En ${diffDays} días`;
    
    return dueDate.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getTagClass(tag: string): string {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('urgente') || tagLower.includes('crítico')) return 'urgent';
    if (tagLower.includes('pago') || tagLower.includes('cobranza')) return 'payment';
    if (tagLower.includes('documento')) return 'document';
    if (tagLower.includes('oportunidad')) return 'opportunity';
    return 'default';
  }

  // TrackBy functions for performance
  trackByActionId(index: number, action: NextBestAction): string {
    return action.id;
  }

  trackByTag(index: number, tag: string): string {
    return tag;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
