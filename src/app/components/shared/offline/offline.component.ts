import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-container">
      <div class="icon">📵</div>
      <h1>Sin conexión</h1>
      <p>No pudimos conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.</p>
      <button (click)="retry()">Reintentar</button>
    </div>
  `,
  styles: [`
    .offline-container {
      min-height: 80vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
      padding: 24px;
    }
    .icon { font-size: 48px; }
    h1 { font-size: 24px; margin: 8px 0; }
    p { color: #6b7280; max-width: 420px; }
    button { padding: 12px 16px; border: none; border-radius: 8px; background: #06d6a0; color: #fff; font-weight: 700; cursor: pointer; }
    button:hover { background: #059669; }
  `]
})
export class OfflineComponent {
  retry(): void {
    window.location.reload();
  }
}

