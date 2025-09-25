import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ViewMode = 'advisor' | 'client';

@Component({
  selector: 'app-client-mode-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="client-mode-toggle">
      <div class="toggle-container">
        <div class="mode-indicator" [class.client-mode]="currentMode === 'client'">
          <div class="mode-label">
            <span class="mode-icon">{{ currentMode === 'advisor' ? '👤' : '🚚' }}</span>
            <span class="mode-text">{{ currentMode === 'advisor' ? 'Modo Asesor' : 'Modo Cliente' }}</span>
          </div>
          <button 
            class="toggle-button"
            (click)="toggleMode()"
            [attr.aria-label]="'Cambiar a ' + (currentMode === 'advisor' ? 'Modo Cliente' : 'Modo Asesor')"
          >
            <div class="toggle-slider" [class.slider-client]="currentMode === 'client'">
              <div class="slider-handle">
                <span class="handle-icon">{{ currentMode === 'advisor' ? '👔' : '👥' }}</span>
              </div>
            </div>
            <span class="toggle-text">
              {{ currentMode === 'advisor' ? 'Cambiar a Cliente' : 'Volver a Asesor' }}
            </span>
          </button>
        </div>
        
        <div class="mode-description" [class.client-description]="currentMode === 'client'">
          <p *ngIf="currentMode === 'advisor'">
            Vista completa con herramientas de poder para análisis y gestión avanzada
          </p>
          <p *ngIf="currentMode === 'client'">
            Vista simplificada y amigable para mostrar información al cliente
          </p>
        </div>
      </div>

      <!-- Mode transition overlay -->
      <div class="transition-overlay" [class.show-overlay]="isTransitioning">
        <div class="transition-content">
          <div class="transition-icon">{{ transitionIcon }}</div>
          <h3 class="transition-title">{{ transitionTitle }}</h3>
          <p class="transition-description">{{ transitionDescription }}</p>
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .client-mode-toggle {
      position: relative;
    }

    .toggle-container {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--flat-surface-bg); // FIXED (verify-ux)
      border: 1px solid var(--neutral-800); // FIXED (verify-ux)
      padding: 12px 20px;
      border-radius: 16px;
      transition: all 0.3s ease;
    }

    .toggle-container:hover {
      border-color: var(--primary-cyan-400);
      box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.1);
    }

    .mode-indicator {
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;
    }

    .mode-indicator.client-mode {
      transform: scale(1.02);
    }

    .mode-label {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 140px;
    }

    .mode-icon {
      font-size: 1.3rem;
      transition: all 0.3s ease;
    }

    .client-mode .mode-icon {
      filter: drop-shadow(0 0 8px var(--accent-amber-400));
    }

    .mode-text {
      color: var(--neutral-100);
      font-weight: 600;
      font-size: 1rem;
    }

    .client-mode .mode-text {
      color: var(--accent-amber-400);
    }

    .toggle-button {
      display: flex;
      align-items: center;
      gap: 12px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: all 0.2s ease;
    }

    .toggle-button:hover {
      transform: scale(1.02);
    }

    .toggle-slider {
      width: 60px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--neutral-800); // FIXED (verify-ux)
      border-radius: 20px;
      position: relative;
      transition: all 0.3s ease;
    }

    .toggle-slider.slider-client {
      background: linear-gradient(135deg, var(--accent-amber-500), var(--accent-amber-600));
      border-color: var(--accent-amber-400);
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    .slider-handle {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 26px;
      height: 26px;
      background: linear-gradient(135deg, var(--primary-cyan-400), var(--primary-cyan-500));
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .slider-client .slider-handle {
      transform: translateX(28px);
      background: linear-gradient(135deg, var(--neutral-950), var(--neutral-800));
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }

    .handle-icon {
      font-size: 0.8rem;
      transition: all 0.3s ease;
    }

    .toggle-text {
      color: var(--neutral-300);
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .toggle-button:hover .toggle-text {
      color: var(--primary-cyan-300);
    }

    .client-mode .toggle-button:hover .toggle-text {
      color: var(--accent-amber-300);
    }

    .mode-description {
      flex: 1;
      min-width: 200px;
    }

    .mode-description p {
      margin: 0;
      color: var(--neutral-400);
      font-size: 0.85rem;
      line-height: 1.4;
      transition: all 0.3s ease;
    }

    .client-description p {
      color: var(--accent-amber-300);
    }

    /* ===== TRANSITION OVERLAY ===== */
    .transition-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(3, 7, 18, 0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
      transition: all 0.4s ease;
    }

    .transition-overlay.show-overlay {
      opacity: 1;
      pointer-events: all;
    }

    .transition-content {
      text-align: center;
      padding: 40px;
      max-width: 400px;
    }

    .transition-icon {
      font-size: 4rem;
      margin-bottom: 24px;
      animation: bounce-in 0.8s ease-out;
    }

    @keyframes bounce-in {
      0% { opacity: 0; transform: scale(0.3); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }

    .transition-title {
      color: var(--neutral-100);
      font-size: 1.8rem;
      font-weight: 700;
      margin: 0 0 12px 0;
    }

    .transition-description {
      color: var(--neutral-300);
      font-size: 1rem;
      line-height: 1.5;
      margin: 0 0 32px 0;
    }

    .loading-dots {
      display: flex;
      justify-content: center;
      gap: 6px;
    }

    .loading-dots span {
      width: 8px;
      height: 8px;
      background: var(--primary-cyan-400);
      border-radius: 50%;
      animation: loading-pulse 1.4s infinite ease-in-out both;
    }

    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
    .loading-dots span:nth-child(3) { animation-delay: 0s; }

    @keyframes loading-pulse {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 768px) {
      .toggle-container {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 16px;
      }

      .mode-indicator {
        justify-content: space-between;
      }

      .mode-label {
        min-width: auto;
      }

      .mode-description {
        min-width: auto;
        text-align: center;
      }

      .toggle-button {
        justify-content: center;
      }

      .transition-content {
        padding: 20px;
        margin: 0 20px;
      }

      .transition-icon {
        font-size: 3rem;
      }

      .transition-title {
        font-size: 1.5rem;
      }
    }

    /* ===== ACCESSIBILITY ===== */
    .toggle-button:focus {
      outline: 2px solid var(--primary-cyan-400);
      outline-offset: 2px;
      border-radius: 8px;
    }

    @media (prefers-reduced-motion: reduce) {
      .toggle-slider,
      .slider-handle,
      .transition-overlay,
      .mode-indicator {
        transition: none;
      }
      
      .transition-icon {
        animation: none;
      }
      
      .loading-dots span {
        animation: none;
      }
    }
  `]
})
export class ClientModeToggleComponent implements OnInit {
  @Input() currentMode: ViewMode = 'advisor';
  @Output() modeChanged = new EventEmitter<ViewMode>();

  isTransitioning = false;
  transitionIcon = '';
  transitionTitle = '';
  transitionDescription = '';

  constructor() { }

  ngOnInit(): void { }

  async toggleMode(): Promise<void> {
    if (this.isTransitioning) return;

    const newMode: ViewMode = this.currentMode === 'advisor' ? 'client' : 'advisor';
    
    this.startTransition(newMode);
    
    // Simulate transition time
    await this.delay(2000);
    
    this.currentMode = newMode;
    this.modeChanged.emit(newMode);
    this.endTransition();
  }

  private startTransition(newMode: ViewMode): void {
    this.isTransitioning = true;
    
    if (newMode === 'client') {
      this.transitionIcon = '🚚';
      this.transitionTitle = 'Activando Modo Cliente';
      this.transitionDescription = 'Transformando la interfaz a una vista amigable y simplificada para mostrar al cliente';
    } else {
      this.transitionIcon = '👔';
      this.transitionTitle = 'Regresando a Modo Asesor';
      this.transitionDescription = 'Restaurando todas las herramientas de poder y análisis avanzado';
    }
  }

  private endTransition(): void {
    this.isTransitioning = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}