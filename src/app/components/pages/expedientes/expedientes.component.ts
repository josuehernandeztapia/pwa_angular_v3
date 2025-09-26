import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-expedientes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="expedientes-container container-neutral">
      <header class="page-header">
        <div class="header-content">
          <h1>📂 Expedientes</h1>
          <p class="page-description">Gestión de documentos y expedientes de clientes</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" (click)="newExpediente()">
            📝 Nuevo Expediente
          </button>
        </div>
      </header>

      <main class="page-main">
        <!-- Filter Section -->
        <section class="filters-section">
          <div class="filters-row">
            <div class="filter-group">
              <label>🔍 Buscar expediente</label>
              <input 
                type="text" 
                placeholder="Nombre, RFC, o número de expediente..." 
                class="filter-input"
                [(ngModel)]="searchTerm"
                (input)="onSearch()"
              >
            </div>
            <div class="filter-group">
              <label>📊 Estado</label>
              <select class="filter-select" [(ngModel)]="statusFilter" (change)="onFilterChange()">
                <option value="">Todos</option>
                <option value="completo">Completo</option>
                <option value="pendiente">Pendiente</option>
                <option value="revision">En Revisión</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Expedientes Grid -->
        <section class="expedientes-grid">
          <div *ngFor="let expediente of filteredExpedientes" class="expediente-card premium-card">
            <div class="expediente-header">
              <div class="expediente-info">
                <h3>{{ expediente.clientName }}</h3>
                <p class="expediente-id">ID: {{ expediente.id }}</p>
              </div>
              <div class="expediente-status" [class]="'status-' + expediente.status">
                {{ getStatusText(expediente.status) }}
              </div>
            </div>
            
            <div class="expediente-body">
              <div class="document-summary">
                <div class="doc-stat">
                  <span class="doc-count">{{ expediente.totalDocuments }}</span>
                  <span class="doc-label">Documentos</span>
                </div>
                <div class="doc-stat">
                  <span class="doc-count completed">{{ expediente.completedDocuments }}</span>
                  <span class="doc-label">Completos</span>
                </div>
                <div class="doc-stat">
                  <span class="doc-count pending">{{ expediente.pendingDocuments }}</span>
                  <span class="doc-label">Pendientes</span>
                </div>
              </div>
              
              <div class="expediente-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    [style.width.%]="expediente.completionPercentage"
                  ></div>
                </div>
                <span class="progress-text">{{ expediente.completionPercentage }}% completo</span>
              </div>
            </div>

            <div class="expediente-actions">
              <button class="btn-secondary" (click)="viewExpediente(expediente.id)">
                👁️ Ver Detalles
              </button>
              <button class="btn-tertiary" (click)="uploadDocument(expediente.id)">
                📤 Subir Documento
              </button>
            </div>
          </div>
        </section>

        <!-- Empty State -->
        <div *ngIf="filteredExpedientes.length === 0" class="empty-state premium-card" role="status" aria-live="polite">
          <div class="empty-icon">📂</div>
          <h3>No hay expedientes</h3>
          <p>{{ searchTerm ? 'No se encontraron expedientes con ese criterio' : 'Aún no hay expedientes creados' }}</p>
          <button class="btn-primary" (click)="newExpediente()">
            📝 Crear Primer Expediente
          </button>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .expedientes-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
    }

    .page-description {
      margin: 0;
      color: #718096;
      font-size: 1.1rem;
    }

    .btn-primary, .btn-secondary, .btn-tertiary {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .btn-primary {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
    }

    .btn-primary:hover {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
    }

    .btn-tertiary {
      background: transparent;
      color: #4299e1;
      border: 1px solid #4299e1;
    }

    .btn-tertiary:hover {
      background: #4299e1;
      color: white;
    }

    .filters-section {
      margin-bottom: 24px;
    }

    .filters-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .filter-group {
      flex: 1;
      min-width: 200px;
    }

    .filter-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #4a5568;
    }

    .filter-input, .filter-select {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      background: white;
    }

    .filter-input:focus, .filter-select:focus {
      outline: none;
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .expedientes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .expediente-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      transition: all 0.2s;
    }

    .expediente-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .expediente-header {
      padding: 20px;
      background: #f7fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .expediente-info h3 {
      margin: 0 0 4px 0;
      color: #2d3748;
      font-size: 1.2rem;
    }

    .expediente-id {
      margin: 0;
      color: #718096;
      font-size: 0.9rem;
    }

    .expediente-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-completo {
      background: #c6f6d5;
      color: #22543d;
    }

    .status-pendiente {
      background: #fed7d7;
      color: #742a2a;
    }

    .status-revision {
      background: #feebc8;
      color: #7b341e;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #718096;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      margin: 0 0 12px 0;
      color: #4a5568;
      font-size: 1.5rem;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      font-size: 1.1rem;
    }

    @media (max-width: 768px) {
      .expedientes-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .filters-row {
        flex-direction: column;
      }

      .expedientes-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ExpedientesComponent implements OnInit {
  searchTerm = '';
  statusFilter = '';
  
  expedientes = [
    {
      id: 'EXP-001',
      clientName: 'Juan Pérez García',
      status: 'completo',
      totalDocuments: 8,
      completedDocuments: 8,
      pendingDocuments: 0,
      completionPercentage: 100
    },
    {
      id: 'EXP-002',  
      clientName: 'María González López',
      status: 'pendiente',
      totalDocuments: 6,
      completedDocuments: 4,
      pendingDocuments: 2,
      completionPercentage: 67
    }
  ];

  filteredExpedientes = [...this.expedientes];

  ngOnInit(): void {
    // Component initialization
  }

  onSearch(): void {
    this.filterExpedientes();
  }

  onFilterChange(): void {
    this.filterExpedientes();
  }

  private filterExpedientes(): void {
    this.filteredExpedientes = this.expedientes.filter(expediente => {
      const matchesSearch = !this.searchTerm || 
        expediente.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        expediente.id.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.statusFilter || expediente.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'completo': 'Completo',
      'pendiente': 'Pendiente', 
      'revision': 'En Revisión'
    };
    return statusMap[status] || status;
  }

  newExpediente(): void {
  }

  viewExpediente(id: string): void {
  }

  uploadDocument(expedienteId: string): void {
  }
}
