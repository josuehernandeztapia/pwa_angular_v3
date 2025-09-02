import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <div class="error-illustration">
          <div class="error-number">404</div>
          <div class="error-icon">🚐💨</div>
        </div>
        
        <div class="error-message">
          <h1>¡Ups! Página no encontrada</h1>
          <p>
            La página que buscas se fue por otra ruta. 
            Parece que tomó el camión equivocado.
          </p>
        </div>

        <div class="error-actions">
          <button 
            class="btn-primary"
            (click)="goHome()"
          >
            🏠 Volver al Dashboard
          </button>
          
          <button 
            class="btn-secondary"
            (click)="goBack()"
          >
            ⬅️ Regresar
          </button>
        </div>

        <div class="help-section">
          <h3>¿Necesitas ayuda?</h3>
          <div class="help-links">
            <button class="help-link" (click)="openHelp()">
              📚 Ver Guía de Usuario
            </button>
            <button class="help-link" (click)="contactSupport()">
              💬 Contactar Soporte
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .not-found-content {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 60px 40px;
      text-align: center;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
    }

    .error-illustration {
      margin-bottom: 40px;
    }

    .error-number {
      font-size: 6rem;
      font-weight: 900;
      color: #4299e1;
      line-height: 1;
      margin-bottom: 16px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    }

    .error-icon {
      font-size: 3rem;
      margin-bottom: 20px;
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }

    .error-message {
      margin-bottom: 40px;
    }

    .error-message h1 {
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .error-message p {
      color: #718096;
      font-size: 1.1rem;
      line-height: 1.6;
      margin: 0;
    }

    .error-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 14px 28px;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1, #3182ce);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #3182ce, #2c5282);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(66, 153, 225, 0.3);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 2px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
      border-color: #cbd5e0;
      transform: translateY(-1px);
    }

    .help-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 32px;
    }

    .help-section h3 {
      color: #2d3748;
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .help-links {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .help-link {
      background: none;
      border: none;
      color: #4299e1;
      font-size: 0.95rem;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.2s;
      text-decoration: underline;
    }

    .help-link:hover {
      background: rgba(66, 153, 225, 0.1);
      color: #3182ce;
    }

    @media (max-width: 480px) {
      .not-found-content {
        padding: 40px 24px;
      }
      
      .error-number {
        font-size: 4rem;
      }
      
      .error-message h1 {
        font-size: 1.5rem;
      }
      
      .error-actions {
        flex-direction: column;
        align-items: center;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
        max-width: 200px;
        justify-content: center;
      }
      
      .help-links {
        flex-direction: column;
        align-items: center;
      }
    }
  `]
})
export class NotFoundComponent {
  
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  openHelp(): void {
    // Open help documentation or modal
    console.log('Opening help documentation...');
    // This would typically open a help modal or navigate to help section
  }

  contactSupport(): void {
    // Open support contact form or redirect to support
    console.log('Contacting support...');
    // This would typically open a support chat or contact form
    window.open('mailto:soporte@conductores.com?subject=Ayuda con navegación', '_blank');
  }
}