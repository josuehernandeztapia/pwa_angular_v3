/**
 *  Premium Loading States Component
 * High-quality loading experiences with micro-interactions
 */

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon/icon.component';

export type LoadingType =
  | 'spinner'
  | 'skeleton'
  | 'pulse'
  | 'wave'
  | 'dots'
  | 'bars'
  | 'progress'
  | 'fade';

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'primary' | 'secondary' | 'accent' | 'neutral';

@Component({
  selector: 'app-premium-loading',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './premium-loading.component.html',
  styleUrls: ['./premium-loading.component.scss']
})
export class PremiumLoadingComponent implements OnInit, OnDestroy {
  @Input() type: LoadingType = 'spinner';
  @Input() size: LoadingSize = 'md';
  @Input() variant: LoadingVariant = 'primary';
  @Input() label: string = 'Cargando...';
  @Input() showLabel: boolean = false;
  @Input() progress: number = 0;
  @Input() ariaLabel: string = 'Contenido cargando';

  private progressInterval?: any;
  readonly waveBars = [0, 1, 2, 3, 4];
  readonly dotItems = [0, 1, 2];
  readonly barItems = [0, 1, 2, 3];

  ngOnInit() {
    // Auto-progress for progress type if not provided
    if (this.type === 'progress' && this.progress === 0) {
      this.startAutoProgress();
    }
  }

  ngOnDestroy() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  getContainerClasses(): Record<string, boolean> {
    return {
      [`premium-loading--size-${this.size}`]: true,
      [`premium-loading--variant-${this.variant}`]: true,
      [`premium-loading--type-${this.type}`]: true
    };
  }

  getSpinnerSize(): number {
    const sizes = {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 48
    };
    return sizes[this.size];
  }

  private startAutoProgress() {
    let currentProgress = 0;
    this.progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 90) {
        currentProgress = 90; // Don't reach 100% automatically
      }
      this.progress = Math.round(currentProgress);
    }, 200);
  }

  // Public method to complete progress
  completeProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    this.progress = 100;
  }
}
