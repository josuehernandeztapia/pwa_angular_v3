import { Component, OnInit, Output, EventEmitter, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

export type ViewMode = 'advisor' | 'client';

@Component({
  selector: 'app-client-mode-toggle',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['./client-mode-toggle.component.scss'],
  templateUrl: './client-mode-toggle.component.html'
})
export class ClientModeToggleComponent implements OnInit {
  @HostBinding('class') hostClass = 'client-mode-toggle';
  @Input() currentMode: ViewMode = 'advisor';
  @Output() modeChanged = new EventEmitter<ViewMode>();

  isTransitioning = false;
  readonly advisorIcon: IconName = 'settings';
  readonly clientIcon: IconName = 'users';
  transitionIconName: IconName = this.advisorIcon;
  transitionTitle = '';
  transitionDescription = '';

  constructor() {}

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
      this.transitionIconName = this.clientIcon;
      this.transitionTitle = 'Activando Modo Cliente';
      this.transitionDescription = 'Transformando la interfaz a una vista amigable y simplificada para mostrar al cliente';
    } else {
      this.transitionIconName = this.advisorIcon;
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

  getIndicatorClasses(): Record<string, boolean> {
    return {
      'client-mode-toggle__indicator': true,
      'client-mode-toggle__indicator--client': this.currentMode === 'client'
    };
  }

  getSliderClasses(): Record<string, boolean> {
    return {
      'client-mode-toggle__slider': true,
      'client-mode-toggle__slider--client': this.currentMode === 'client'
    };
  }

  getDescriptionClasses(): Record<string, boolean> {
    return {
      'client-mode-toggle__description': true,
      'client-mode-toggle__description--client': this.currentMode === 'client'
    };
  }

  getOverlayClasses(): Record<string, boolean> {
    return {
      'client-mode-toggle__overlay': true,
      'client-mode-toggle__overlay--visible': this.isTransitioning
    };
  }
}
