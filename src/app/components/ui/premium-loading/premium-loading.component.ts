/**
 * 🎭 Premium Loading States Component
 * High-quality loading experiences with micro-interactions
 */

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  template: `
    <div
      class="premium-loading"
      [class]="getLoadingClasses()"
      [attr.data-testid]="'loading-' + type"
      [attr.aria-label]="ariaLabel"
      role="status">

      <!-- Spinner Loading -->
      <div *ngIf="type === 'spinner'" class="spinner-container">
        <div class="spinner" [style.width.px]="getSpinnerSize()" [style.height.px]="getSpinnerSize()">
          <div class="spinner-ring"></div>
        </div>
        <div *ngIf="showLabel" class="loading-label">{{ label }}</div>
      </div>

      <!-- Skeleton Loading -->
      <div *ngIf="type === 'skeleton'" class="skeleton-container">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-subtitle"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text short"></div>
      </div>

      <!-- Pulse Loading -->
      <div *ngIf="type === 'pulse'" class="pulse-container">
        <div class="pulse-circle"></div>
        <div *ngIf="showLabel" class="loading-label">{{ label }}</div>
      </div>

      <!-- Wave Loading -->
      <div *ngIf="type === 'wave'" class="wave-container">
        <div class="wave-bar" *ngFor="let bar of [1,2,3,4,5]; index as i"
             [style.animation-delay]="(i * 0.1) + 's'"></div>
      </div>

      <!-- Dots Loading -->
      <div *ngIf="type === 'dots'" class="dots-container">
        <div class="dot" *ngFor="let dot of [1,2,3]; index as i"
             [style.animation-delay]="(i * 0.2) + 's'"></div>
        <div *ngIf="showLabel" class="loading-label">{{ label }}</div>
      </div>

      <!-- Bars Loading -->
      <div *ngIf="type === 'bars'" class="bars-container">
        <div class="bar" *ngFor="let bar of [1,2,3,4]; index as i"
             [style.animation-delay]="(i * 0.15) + 's'"></div>
      </div>

      <!-- Progress Loading -->
      <div *ngIf="type === 'progress'" class="progress-container">
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="progress"></div>
        </div>
        <div *ngIf="showLabel" class="progress-label">
          {{ label }} {{ progress }}%
        </div>
      </div>

      <!-- Fade Loading -->
      <div *ngIf="type === 'fade'" class="fade-container">
        <div class="fade-content">
          <div class="fade-icon">⚡</div>
          <div *ngIf="showLabel" class="loading-label">{{ label }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .premium-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: var(--loading-min-height, 60px);
    }

    /* Size Variants */
    .loading--xs { --size: 16px; --font-size: 0.75rem; }
    .loading--sm { --size: 20px; --font-size: 0.875rem; }
    .loading--md { --size: 24px; --font-size: 1rem; }
    .loading--lg { --size: 32px; --font-size: 1.125rem; }
    .loading--xl { --size: 48px; --font-size: 1.25rem; }

    /* Color Variants */
    .loading--primary { --color: #06b6d4; --bg: rgba(6, 182, 212, 0.1); }
    .loading--secondary { --color: #64748b; --bg: rgba(100, 116, 139, 0.1); }
    .loading--accent { --color: #f59e0b; --bg: rgba(245, 158, 11, 0.1); }
    .loading--neutral { --color: #374151; --bg: rgba(55, 65, 81, 0.1); }

    /* Spinner Loading */
    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .spinner {
      position: relative;
      animation: rotate 2s linear infinite;
    }

    .spinner-ring {
      width: 100%;
      height: 100%;
      border: 2px solid var(--bg);
      border-top: 2px solid var(--color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Skeleton Loading */
    .skeleton-container {
      width: 100%;
      max-width: 300px;
    }

    .skeleton-line {
      height: 12px;
      background: linear-gradient(90deg, var(--bg) 25%, transparent 50%, var(--bg) 75%);
      background-size: 200% 100%;
      border-radius: 6px;
      margin-bottom: 8px;
      animation: shimmer 2s infinite;
    }

    .skeleton-title { height: 16px; width: 60%; }
    .skeleton-subtitle { height: 14px; width: 40%; }
    .skeleton-text { height: 12px; width: 100%; }
    .skeleton-text.short { width: 75%; margin-bottom: 0; }

    /* Pulse Loading */
    .pulse-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .pulse-circle {
      width: var(--size);
      height: var(--size);
      background: var(--color);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    /* Wave Loading */
    .wave-container {
      display: flex;
      align-items: end;
      gap: 4px;
      height: var(--size);
    }

    .wave-bar {
      width: 4px;
      height: 100%;
      background: var(--color);
      border-radius: 2px;
      animation: wave 1.2s infinite ease-in-out;
    }

    /* Dots Loading */
    .dots-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .dots-container .dot {
      width: 8px;
      height: 8px;
      background: var(--color);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
      margin: 0 2px;
    }

    .dots-container {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4px;
    }

    /* Bars Loading */
    .bars-container {
      display: flex;
      align-items: end;
      gap: 2px;
      height: var(--size);
    }

    .bar {
      width: 3px;
      height: 100%;
      background: var(--color);
      border-radius: 1.5px;
      animation: bars 1s infinite ease-in-out;
    }

    /* Progress Loading */
    .progress-container {
      width: 100%;
      max-width: 200px;
    }

    .progress-track {
      width: 100%;
      height: 8px;
      background: var(--bg);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color), rgba(6, 182, 212, 0.7));
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-label {
      margin-top: 8px;
      text-align: center;
      font-size: var(--font-size);
      color: var(--color);
    }

    /* Fade Loading */
    .fade-container {
      display: flex;
      justify-content: center;
    }

    .fade-content {
      text-align: center;
      animation: fadeInOut 2s infinite;
    }

    .fade-icon {
      font-size: var(--size);
      margin-bottom: 8px;
    }

    /* Loading Labels */
    .loading-label {
      font-size: var(--font-size);
      color: var(--color);
      font-weight: 500;
      text-align: center;
    }

    /* Animations */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }

    @keyframes wave {
      0%, 40%, 100% { transform: scaleY(0.4); }
      20% { transform: scaleY(1); }
    }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    @keyframes bars {
      0%, 40%, 100% { transform: scaleY(0.4); }
      20% { transform: scaleY(1); }
    }

    @keyframes fadeInOut {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .skeleton-container { max-width: 250px; }
      .progress-container { max-width: 150px; }
    }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      .loading--primary { --bg: rgba(6, 182, 212, 0.2); }
      .loading--secondary { --bg: rgba(100, 116, 139, 0.2); }
      .loading--accent { --bg: rgba(245, 158, 11, 0.2); }
      .loading--neutral { --color: #9ca3af; --bg: rgba(156, 163, 175, 0.2); }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `]
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

  getLoadingClasses(): string {
    return [
      'premium-loading',
      `loading--${this.size}`,
      `loading--${this.variant}`,
      `loading--${this.type}`
    ].join(' ');
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