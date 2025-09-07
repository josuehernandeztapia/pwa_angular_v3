import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface SimulatorScenario {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  market: 'aguascalientes' | 'edomex';
  clientType: 'Individual' | 'Colectivo';
  route: string;
  gradient: string;
}

interface SavedSimulation {
  id: string;
  clientName: string;
  scenarioType: string;
  scenarioTitle: string;
  market: string;
  clientType: string;
  lastModified: number;
  draftKey: string;
  summary: {
    targetAmount?: number;
    monthlyContribution?: number;
    timeToTarget?: number;
    status: 'draft' | 'completed';
  };
}

@Component({
  selector: 'app-simulador-main',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="simulator-hub" *ngIf="!isRedirecting">
      <!-- Header -->
      <div class="hub-header">
        <button (click)="goBack()" class="back-btn">← Dashboard</button>
        <h1>🧠 Hub de Simuladores</h1>
        <p>Cerebro de orquestación para escenarios de valor</p>
      </div>

      <!-- Visual Selector - 3 Strategic Cards -->
      <div class="scenarios-grid">
        <div 
          *ngFor="let scenario of availableScenarios" 
          class="scenario-card"
          [class]="scenario.gradient"
          (click)="selectScenario(scenario)"
        >
          <div class="scenario-icon">{{ scenario.icon }}</div>
          <div class="scenario-content">
            <h3>{{ scenario.title }}</h3>
            <p class="scenario-subtitle">{{ scenario.subtitle }}</p>
            <p class="scenario-description">{{ scenario.description }}</p>
          </div>
          <div class="scenario-arrow">→</div>
        </div>
      </div>

      <!-- Quick Context Info -->
      <div class="context-info" *ngIf="smartContext.hasContext">
        <div class="context-banner">
          <span class="context-icon">⚡</span>
          <div class="context-text">
            <strong>Contexto detectado:</strong> 
            {{ smartContext.market }} • {{ smartContext.clientType }} 
            <span *ngIf="smartContext.clientName"> • {{ smartContext.clientName }}</span>
          </div>
        </div>
      </div>

      <!-- FASE 2: Dashboard de Simulaciones Previas -->
      <div class="saved-simulations" *ngIf="savedSimulations.length > 0">
        <div class="section-header">
          <h2>💾 Simulaciones Recientes (Borradores)</h2>
          <p>Continúa donde lo dejaste</p>
        </div>
        
        <div class="simulations-grid">
          <div 
            *ngFor="let simulation of savedSimulations.slice(0, 5)" 
            class="simulation-card"
            [class.draft]="simulation.summary.status === 'draft'"
            [class.completed]="simulation.summary.status === 'completed'"
            [class.comparison-mode]="comparisonMode"
            [class.selected-for-comparison]="selectedForComparison.has(simulation.id)"
          >
            <!-- FASE 3: Comparison Checkbox -->
            <div class="comparison-checkbox" *ngIf="comparisonMode">
              <input 
                type="checkbox" 
                [id]="'compare-' + simulation.id"
                [checked]="selectedForComparison.has(simulation.id)"
                [disabled]="!selectedForComparison.has(simulation.id) && selectedForComparison.size >= 3"
                (change)="toggleSimulationSelection(simulation.id)"
              />
              <label [for]="'compare-' + simulation.id" class="checkbox-label"></label>
            </div>

            <div class="simulation-header">
              <div class="simulation-meta">
                <h4>{{ simulation.clientName || 'Cliente sin nombre' }}</h4>
                <span class="simulation-type">{{ simulation.scenarioTitle }}</span>
              </div>
              <div class="simulation-actions" *ngIf="!comparisonMode">
                <button (click)="continueSimulation(simulation)" class="continue-btn">
                  📂 Continuar
                </button>
                <button (click)="deleteSimulation(simulation.id)" class="delete-btn">
                  🗑️
                </button>
              </div>
            </div>

            <div class="simulation-details">
              <div class="detail-row">
                <span class="detail-label">Mercado:</span>
                <span class="detail-value">{{ getMarketLabel(simulation.market) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tipo:</span>
                <span class="detail-value">{{ simulation.clientType }}</span>
              </div>
              <div class="detail-row" *ngIf="simulation.summary.targetAmount">
                <span class="detail-label">Meta:</span>
                <span class="detail-value">{{ simulation.summary.targetAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
              <div class="detail-row" *ngIf="simulation.summary.monthlyContribution">
                <span class="detail-label">Mensual:</span>
                <span class="detail-value">{{ simulation.summary.monthlyContribution | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <div class="simulation-footer">
              <span class="last-modified">
                {{ formatLastModified(simulation.lastModified) }}
              </span>
              <span class="simulation-status" [class]="simulation.summary.status">
                {{ simulation.summary.status === 'draft' ? '📝 Borrador' : '✅ Completado' }}
              </span>
            </div>
          </div>
        </div>

        <!-- FASE 3: Comparison Controls -->
        <div class="comparison-controls" *ngIf="savedSimulations.length > 1">
          <div class="comparison-header">
            <button 
              (click)="toggleComparisonMode()" 
              [class.active]="comparisonMode"
              class="comparison-toggle-btn">
              {{ comparisonMode ? '✅ Modo Comparación' : '📊 Comparar Escenarios' }}
            </button>
            
            <div class="comparison-counter" *ngIf="comparisonMode">
              <span class="counter-text">
                {{ selectedForComparison.size }}/3 seleccionados
              </span>
              <button 
                (click)="clearSelection()" 
                *ngIf="selectedForComparison.size > 0"
                class="clear-selection-btn">
                Limpiar
              </button>
            </div>
          </div>

          <div class="comparison-actions" *ngIf="comparisonMode && selectedForComparison.size > 1">
            <button 
              (click)="compareSelectedSimulations()" 
              [disabled]="selectedForComparison.size < 2"
              class="compare-btn">
              🔬 Comparar {{ selectedForComparison.size }} Escenarios
            </button>
          </div>
        </div>

        <div class="simulations-actions" *ngIf="savedSimulations.length > 5">
          <button (click)="showAllSimulations()" class="show-all-btn">
            Ver todas las simulaciones ({{ savedSimulations.length }})
          </button>
        </div>
      </div>

      <!-- Empty State for No Simulations -->
      <div class="empty-simulations" *ngIf="savedSimulations.length === 0 && !smartContext.hasContext">
        <div class="empty-content">
          <div class="empty-icon">📊</div>
          <h3>Primera vez en el Hub de Simuladores</h3>
          <p>Selecciona un escenario arriba para comenzar tu primera simulación. Tus borradores aparecerán aquí para continuar más tarde.</p>
        </div>
      </div>
    </div>

    <!-- Smart Redirection Loading -->
    <div class="smart-redirect" *ngIf="isRedirecting">
      <div class="redirect-content">
        <div class="redirect-spinner"></div>
        <h2>🧠 Analizando contexto...</h2>
        <p>{{ redirectMessage }}</p>
      </div>
    </div>

    <!-- FASE 3: Comparison Modal -->
    <div class="comparison-modal" *ngIf="showComparisonModal">
      <div class="modal-overlay" (click)="closeComparisonModal()"></div>
      <div class="comparison-modal-content">
        <div class="comparison-modal-header">
          <h2>📊 Comparación de Escenarios</h2>
          <button (click)="closeComparisonModal()" class="modal-close-btn">×</button>
        </div>

        <div class="comparison-table-container">
          <table class="comparison-table table-lg">
            <thead>
              <tr>
                <th class="metric-column">Métrica</th>
                <th *ngFor="let sim of getSelectedSimulations()" class="scenario-column">
                  <div class="scenario-header">
                    <div class="scenario-name">{{ sim.clientName }}</div>
                    <div class="scenario-type">{{ sim.scenarioTitle }}</div>
                    <div class="scenario-market">{{ getMarketLabel(sim.market) }}</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="metric-row">
                <td class="metric-label">🎯 Meta Total</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value num">
                  {{ sim.summary.targetAmount ? (sim.summary.targetAmount | currency:'MXN':'symbol':'1.0-0') : 'N/D' }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">💰 Aportación Mensual</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value num">
                  {{ sim.summary.monthlyContribution ? (sim.summary.monthlyContribution | currency:'MXN':'symbol':'1.0-0') : 'N/D' }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">⏱️ Tiempo a la Meta</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value num">
                  {{ sim.summary.timeToTarget ? (sim.summary.timeToTarget + ' meses') : 'N/D' }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">📊 Tipo de Cliente</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value">
                  {{ sim.clientType }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">📅 Estado</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value">
                  <span class="status-badge" [class]="sim.summary.status">
                    {{ sim.summary.status === 'draft' ? '📝 Borrador' : '✅ Completado' }}
                  </span>
                </td>
              </tr>
              <tr class="metric-row highlight-row">
                <td class="metric-label">🎯 Eficiencia</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value">
                  <div class="efficiency-score" [class]="getEfficiencyClass(sim)">
                    {{ getEfficiencyScore(sim) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="comparison-insights">
          <h3>💡 Insights Automáticos</h3>
          <div class="insights-grid">
            <div class="insight-card">
              <div class="insight-icon">👑</div>
              <div class="insight-content">
                <h4>Mejor Opción</h4>
                <p>{{ getBestOption() }}</p>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-icon">⚡</div>
              <div class="insight-content">
                <h4>Más Rápido</h4>
                <p>{{ getFastestOption() }}</p>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-icon">💰</div>
              <div class="insight-content">
                <h4>Menor Aportación</h4>
                <p>{{ getLowestContributionOption() }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="comparison-modal-actions">
          <button (click)="exportComparison()" class="export-btn">
            📋 Exportar Comparación
          </button>
          <button (click)="shareComparison()" class="share-btn">
            📱 Compartir WhatsApp
          </button>
          <button (click)="closeComparisonModal()" class="close-modal-btn">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .simulator-hub {
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 24px;
    }

    .hub-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .back-btn {
      display: inline-block;
      margin-bottom: 16px;
      padding: 8px 16px;
      background: rgba(255,255,255,0.9);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .back-btn:hover {
      background: white;
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }

    .hub-header h1 {
      font-size: 36px;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 8px 0;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }

    .hub-header p {
      color: #64748b;
      font-size: 18px;
      margin: 0;
    }

    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      max-width: 1200px;
      margin: 0 auto 32px auto;
    }

    @media (max-width: 768px) {
      .scenarios-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    .scenario-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid transparent;
      position: relative;
      overflow: hidden;
      min-height: 200px;
      display: flex;
      flex-direction: column;
    }

    .scenario-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: currentColor;
      opacity: 0.8;
    }

    .scenario-card.ags-gradient {
      border-color: #f59e0b;
      color: #92400e;
    }

    .scenario-card.ags-gradient:hover {
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(245, 158, 11, 0.15);
    }

    .scenario-card.edomex-individual-gradient {
      border-color: #3b82f6;
      color: #1d4ed8;
    }

    .scenario-card.edomex-individual-gradient:hover {
      background: linear-gradient(135deg, #dbeafe, #bfdbfe);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(59, 130, 246, 0.15);
    }

    .scenario-card.edomex-collective-gradient {
      border-color: #8b5cf6;
      color: #6d28d9;
    }

    .scenario-card.edomex-collective-gradient:hover {
      background: linear-gradient(135deg, #ede9fe, #ddd6fe);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15);
    }

    .scenario-icon {
      font-size: 48px;
      margin-bottom: 16px;
      text-align: center;
    }

    .scenario-content {
      flex: 1;
    }

    .scenario-content h3 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: inherit;
    }

    .scenario-subtitle {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
      opacity: 0.8;
    }

    .scenario-description {
      font-size: 16px;
      line-height: 1.5;
      margin: 0;
      color: #64748b;
    }

    .scenario-arrow {
      position: absolute;
      top: 24px;
      right: 24px;
      font-size: 24px;
      font-weight: bold;
      opacity: 0;
      transition: all 0.3s;
      color: inherit;
    }

    .scenario-card:hover .scenario-arrow {
      opacity: 1;
      transform: translateX(4px);
    }

    .context-info {
      max-width: 800px;
      margin: 0 auto;
    }

    .context-banner {
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2);
    }

    .context-icon {
      font-size: 24px;
    }

    .context-text {
      flex: 1;
      font-size: 16px;
    }

    .smart-redirect {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .redirect-content {
      text-align: center;
      color: white;
      max-width: 400px;
      padding: 40px;
    }

    .redirect-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255,255,255,0.2);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 24px auto;
    }

    .redirect-content h2 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 16px 0;
    }

    .redirect-content p {
      font-size: 18px;
      opacity: 0.9;
      margin: 0;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* FASE 2: Saved Simulations Styles */
    .saved-simulations {
      max-width: 1200px;
      margin: 48px auto 0 auto;
    }

    .section-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .section-header h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .section-header p {
      color: #64748b;
      font-size: 16px;
      margin: 0;
    }

    .simulations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    @media (max-width: 768px) {
      .simulations-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    .simulation-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid transparent;
      transition: all 0.3s ease;
      position: relative;
    }

    .simulation-card.draft {
      border-color: #f59e0b;
      background: linear-gradient(135deg, #fef9e7, #ffffff);
    }

    .simulation-card.completed {
      border-color: #10b981;
      background: linear-gradient(135deg, #ecfdf5, #ffffff);
    }

    .simulation-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .simulation-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .simulation-meta h4 {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .simulation-type {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .simulation-actions {
      display: flex;
      gap: 8px;
    }

    .continue-btn, .delete-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .continue-btn {
      background: #3b82f6;
      color: white;
    }

    .continue-btn:hover {
      background: #2563eb;
      transform: scale(1.05);
    }

    .delete-btn {
      background: #f3f4f6;
      color: #6b7280;
    }

    .delete-btn:hover {
      background: #ef4444;
      color: white;
    }

    .simulation-details {
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 14px;
    }

    .detail-label {
      color: #6b7280;
      font-weight: 500;
    }

    .detail-value {
      color: #1e293b;
      font-weight: 600;
    }

    .simulation-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
    }

    .last-modified {
      color: #6b7280;
    }

    .simulation-status {
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .simulation-status.draft {
      background: #fef3c7;
      color: #92400e;
    }

    .simulation-status.completed {
      background: #d1fae5;
      color: #065f46;
    }

    .simulations-actions {
      text-align: center;
      margin-top: 24px;
    }

    .show-all-btn {
      padding: 12px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .show-all-btn:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }

    .empty-simulations {
      max-width: 400px;
      margin: 48px auto;
      text-align: center;
    }

    .empty-content {
      padding: 40px 24px;
      background: white;
      border-radius: 16px;
      border: 2px dashed #e2e8f0;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-content h3 {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 12px 0;
    }

    .empty-content p {
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }

    /* FASE 3: Comparison Styles */
    .comparison-controls {
      margin-top: 32px;
      padding: 24px;
      background: white;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
    }

    .comparison-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .comparison-toggle-btn {
      padding: 12px 24px;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      background: white;
      color: #3b82f6;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .comparison-toggle-btn:hover,
    .comparison-toggle-btn.active {
      background: #3b82f6;
      color: white;
      transform: translateY(-1px);
    }

    .comparison-counter {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .counter-text {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
    }

    .clear-selection-btn {
      padding: 6px 12px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #6b7280;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .clear-selection-btn:hover {
      background: #ef4444;
      border-color: #ef4444;
      color: white;
    }

    .comparison-actions {
      text-align: center;
      margin-top: 16px;
    }

    .compare-btn {
      padding: 14px 28px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .compare-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669, #047857);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
    }

    .compare-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .simulation-card.comparison-mode {
      position: relative;
      cursor: pointer;
    }

    .simulation-card.selected-for-comparison {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #dbeafe, #ffffff);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
    }

    .comparison-checkbox {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
    }

    .comparison-checkbox input[type="checkbox"] {
      display: none;
    }

    .checkbox-label {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: all 0.3s ease;
      background: white;
    }

    .comparison-checkbox input:checked + .checkbox-label {
      background: #3b82f6;
      border-color: #3b82f6;
    }

    .comparison-checkbox input:checked + .checkbox-label::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .comparison-checkbox input:disabled + .checkbox-label {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Comparison Modal Styles */
    .comparison-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }

    .comparison-modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      max-width: 1200px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .comparison-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #f8fafc, #ffffff);
    }

    .comparison-modal-header h2 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 28px;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .modal-close-btn:hover {
      color: #1e293b;
      background: #f3f4f6;
    }

    .comparison-table-container {
      padding: 32px;
      overflow-x: auto;
    }

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .comparison-table th,
    .comparison-table td {
      padding: 16px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    .comparison-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #374151;
    }

    .metric-column {
      width: 200px;
      font-weight: 700;
    }

    .scenario-column {
      min-width: 180px;
    }

    .scenario-header {
      text-align: center;
    }

    .scenario-name {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .scenario-type {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 2px;
    }

    .scenario-market {
      font-size: 11px;
      color: #9ca3af;
    }

    .metric-row:hover {
      background: #f8fafc;
    }

    .highlight-row {
      background: linear-gradient(135deg, #fef3c7, #fbbf24);
    }

    .highlight-row:hover {
      background: linear-gradient(135deg, #fde68a, #f59e0b);
    }

    .metric-label {
      font-weight: 600;
      color: #374151;
    }

    .metric-value {
      font-weight: 500;
      text-align: center;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge.draft {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.completed {
      background: #d1fae5;
      color: #065f46;
    }

    .efficiency-score {
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 700;
      text-align: center;
    }

    .efficiency-score.excellent {
      background: #d1fae5;
      color: #065f46;
    }

    .efficiency-score.good {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .efficiency-score.fair {
      background: #fef3c7;
      color: #92400e;
    }

    .comparison-insights {
      padding: 32px;
      background: #f8fafc;
    }

    .comparison-insights h3 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .insight-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid #e5e7eb;
      transition: all 0.3s ease;
    }

    .insight-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .insight-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .insight-content h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .insight-content p {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }

    .comparison-modal-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 24px 32px;
      border-top: 1px solid #e5e7eb;
      background: #f8fafc;
    }

    .export-btn, .share-btn, .close-modal-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .export-btn {
      background: #8b5cf6;
      color: white;
    }

    .export-btn:hover {
      background: #7c3aed;
      transform: translateY(-1px);
    }

    .share-btn {
      background: #10b981;
      color: white;
    }

    .share-btn:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .close-modal-btn {
      background: #f3f4f6;
      color: #6b7280;
    }

    .close-modal-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    @media (max-width: 768px) {
      .comparison-modal-content {
        margin: 10px;
        max-height: 95vh;
      }
      
      .comparison-table-container {
        padding: 16px;
      }
      
      .comparison-table {
        font-size: 12px;
      }
      
      .comparison-table th,
      .comparison-table td {
        padding: 8px 6px;
      }
      
      .insights-grid {
        grid-template-columns: 1fr;
      }
      
      .comparison-modal-actions {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class SimuladorMainComponent implements OnInit {
  isRedirecting = false;
  redirectMessage = '';
  
  smartContext = {
    hasContext: false,
    market: '',
    clientType: '',
    clientName: '',
    source: ''
  };

  // FASE 2: Saved Simulations
  savedSimulations: SavedSimulation[] = [];

  // FASE 3: Comparison Tool
  selectedForComparison: Set<string> = new Set();
  showComparisonModal = false;
  comparisonMode = false;

  availableScenarios: SimulatorScenario[] = [
    {
      id: 'ags-ahorro',
      title: 'Proyector de Ahorro y Liquidación',
      subtitle: '🌵 AGS Individual',
      icon: '🏦',
      description: 'Modela un plan de ahorro con aportación fuerte y recaudación para clientes de Aguascalientes.',
      market: 'aguascalientes',
      clientType: 'Individual',
      route: '/simulador/ags-ahorro',
      gradient: 'ags-gradient'
    },
    {
      id: 'edomex-individual',
      title: 'Planificador de Enganche',
      subtitle: '🏢 EdoMex Individual',
      icon: '📊',
      description: 'Proyecta el tiempo para alcanzar la meta de enganche para un cliente individual en EdoMex.',
      market: 'edomex',
      clientType: 'Individual',
      route: '/simulador/edomex-individual',
      gradient: 'edomex-individual-gradient'
    },
    {
      id: 'tanda-colectiva',
      title: 'Simulador de Tanda Colectiva',
      subtitle: '👥 EdoMex Colectivo',
      icon: '🔄',
      description: 'Modela el "efecto bola de nieve" para un grupo de crédito colectivo.',
      market: 'edomex',
      clientType: 'Colectivo',
      route: '/simulador/tanda-colectiva',
      gradient: 'edomex-collective-gradient'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.analyzeContext();
    this.loadSavedSimulations();
  }

  private analyzeContext(): void {
    // Check for smart context from Nueva Oportunidad or other sources
    this.route.queryParams.subscribe((params: any) => {
      const market = params['market'];
      const clientType = params['clientType'];
      const clientName = params['clientName'];
      const source = params['source'];

      if (market && clientType) {
        this.smartContext = {
          hasContext: true,
          market,
          clientType,
          clientName: clientName || '',
          source: source || 'unknown'
        };

        // SMART CONTEXT INTEGRATION: Automatic redirection
        this.performSmartRedirection();
      }
    });
  }

  private performSmartRedirection(): void {
    if (!this.smartContext.hasContext) return;

    this.isRedirecting = true;
    this.redirectMessage = `Detecté contexto: ${this.smartContext.market} ${this.smartContext.clientType}. Navegando al simulador óptimo...`;

    // Find the matching scenario
    const targetScenario = this.availableScenarios.find(scenario => 
      scenario.market === this.smartContext.market && 
      scenario.clientType === this.smartContext.clientType
    );

    if (targetScenario) {
      // Simulate intelligent processing time
      setTimeout(() => {
        this.redirectMessage = `Lanzando ${targetScenario.title}...`;
        
        setTimeout(() => {
          this.router.navigate([targetScenario.route], {
            queryParams: {
              market: this.smartContext.market,
              clientType: this.smartContext.clientType,
              clientName: this.smartContext.clientName,
              fromHub: 'true'
            }
          });
        }, 800);
      }, 1200);
    } else {
      // Fallback: show selector
      this.isRedirecting = false;
    }
  }

  selectScenario(scenario: SimulatorScenario): void {
    // Navigate to Nueva Oportunidad with pre-selected context for full onboarding
    this.router.navigate(['/nueva-oportunidad'], {
      queryParams: {
        market: scenario.market,
        clientType: scenario.clientType,
        preselectedFlow: 'SIMULACION',
        targetSimulator: scenario.id,
        fromHub: 'true'
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // === FASE 2: SAVED SIMULATIONS MANAGEMENT ===
  
  private loadSavedSimulations(): void {
    const allKeys = Object.keys(localStorage);
    const draftKeys = allKeys.filter(key => 
      key.includes('-draft') || 
      key.includes('Scenario') ||
      key.includes('agsScenario') ||
      key.includes('edomexScenario')
    );

    this.savedSimulations = [];

    draftKeys.forEach(key => {
      try {
        const draftData = JSON.parse(localStorage.getItem(key) || '{}');
        
        if (this.isValidSimulationDraft(draftData)) {
          const simulation: SavedSimulation = {
            id: key,
            clientName: draftData.clientName || draftData.client?.name || 'Cliente sin nombre',
            scenarioType: this.inferScenarioType(key, draftData),
            scenarioTitle: this.getScenarioTitle(key, draftData),
            market: draftData.market || this.inferMarket(key),
            clientType: draftData.clientType || this.inferClientType(key),
            lastModified: draftData.timestamp || draftData.lastModified || Date.now(),
            draftKey: key,
            summary: this.extractSummary(draftData, key)
          };

          this.savedSimulations.push(simulation);
        }
      } catch (error) {
        console.warn(`Error parsing draft ${key}:`, error);
      }
    });

    // Sort by last modified (most recent first)
    this.savedSimulations.sort((a, b) => b.lastModified - a.lastModified);
  }

  private isValidSimulationDraft(data: any): boolean {
    return data && (
      data.clientName || 
      data.targetAmount || 
      data.monthlyContribution ||
      data.scenario ||
      data.configParams
    );
  }

  private inferScenarioType(key: string, data: any): string {
    if (key.includes('ags') || data.market === 'aguascalientes') return 'ags-ahorro';
    if (key.includes('edomex-individual') || data.type === 'EDOMEX_INDIVIDUAL') return 'edomex-individual';
    if (key.includes('tanda') || key.includes('collective') || data.type === 'EDOMEX_COLLECTIVE') return 'tanda-colectiva';
    return 'unknown';
  }

  private getScenarioTitle(key: string, data: any): string {
    const scenarioType = this.inferScenarioType(key, data);
    const scenario = this.availableScenarios.find(s => s.id === scenarioType);
    return scenario?.title || 'Simulación';
  }

  private inferMarket(key: string): string {
    if (key.includes('ags')) return 'aguascalientes';
    if (key.includes('edomex')) return 'edomex';
    return 'unknown';
  }

  private inferClientType(key: string): string {
    if (key.includes('individual')) return 'Individual';
    if (key.includes('collective') || key.includes('tanda')) return 'Colectivo';
    return 'Individual';
  }

  private extractSummary(data: any, key: string): SavedSimulation['summary'] {
    // Try different data structures based on simulator type
    const summary: SavedSimulation['summary'] = {
      status: 'draft'
    };

    // AGS Ahorro format
    if (data.scenario) {
      summary.targetAmount = data.scenario.targetAmount;
      summary.monthlyContribution = data.scenario.monthlyContribution;
      summary.timeToTarget = data.scenario.monthsToTarget;
    }

    // EdoMex Individual format  
    if (data.targetDownPayment || data.configParams?.targetDownPayment) {
      summary.targetAmount = data.targetDownPayment || data.configParams?.targetDownPayment;
    }

    // Tanda Colectiva format
    if (data.simulationResult) {
      summary.targetAmount = data.simulationResult.scenario?.targetAmount;
      summary.monthlyContribution = data.simulationResult.scenario?.monthlyContribution;
      summary.timeToTarget = data.simulationResult.scenario?.monthsToTarget;
    }

    // Generic formats
    if (data.targetAmount) summary.targetAmount = data.targetAmount;
    if (data.monthlyContribution) summary.monthlyContribution = data.monthlyContribution;

    return summary;
  }

  continueSimulation(simulation: SavedSimulation): void {
    const scenario = this.availableScenarios.find(s => s.id === simulation.scenarioType);
    
    if (scenario) {
      // Navigate directly to the specific simulator with the draft data
      this.router.navigate([scenario.route], {
        queryParams: {
          market: simulation.market,
          clientType: simulation.clientType,
          clientName: simulation.clientName,
          resumeDraft: 'true',
          draftKey: simulation.draftKey
        }
      });
    } else {
      console.error('Scenario not found:', simulation.scenarioType);
    }
  }

  deleteSimulation(simulationId: string): void {
    if (confirm('¿Estás seguro de eliminar esta simulación? Esta acción no se puede deshacer.')) {
      localStorage.removeItem(simulationId);
      this.loadSavedSimulations(); // Refresh the list
    }
  }

  showAllSimulations(): void {
    // Future implementation: navigate to a full simulations management page
    console.log('Show all simulations - Future implementation');
  }

  getMarketLabel(market: string): string {
    switch (market) {
      case 'aguascalientes': return 'Aguascalientes';
      case 'edomex': return 'Estado de México';
      default: return market;
    }
  }

  formatLastModified(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days} días`;
    
    return new Date(timestamp).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    });
  }

  // === FASE 3: COMPARISON TOOL METHODS ===
  
  toggleComparisonMode(): void {
    this.comparisonMode = !this.comparisonMode;
    if (!this.comparisonMode) {
      this.selectedForComparison.clear();
    }
  }

  toggleSimulationSelection(simulationId: string): void {
    if (this.selectedForComparison.has(simulationId)) {
      this.selectedForComparison.delete(simulationId);
    } else {
      if (this.selectedForComparison.size < 3) {
        this.selectedForComparison.add(simulationId);
      }
    }
  }

  clearSelection(): void {
    this.selectedForComparison.clear();
  }

  compareSelectedSimulations(): void {
    if (this.selectedForComparison.size >= 2) {
      this.showComparisonModal = true;
    }
  }

  getSelectedSimulations(): SavedSimulation[] {
    return this.savedSimulations.filter(sim => 
      this.selectedForComparison.has(sim.id)
    );
  }

  getEfficiencyScore(simulation: SavedSimulation): string {
    if (!simulation.summary.targetAmount || !simulation.summary.monthlyContribution) {
      return 'N/D';
    }

    const targetAmount = simulation.summary.targetAmount;
    const monthlyContribution = simulation.summary.monthlyContribution;
    const timeToTarget = simulation.summary.timeToTarget || 0;
    
    // Calculate efficiency score based on contribution to target ratio
    const contributionRatio = monthlyContribution / targetAmount;
    const timeEfficiency = timeToTarget > 0 ? (1 / timeToTarget) * 100 : 0;
    
    // Weighted score: 60% contribution efficiency, 40% time efficiency
    const score = (contributionRatio * 60000) + (timeEfficiency * 40);
    
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Buena';
    if (score >= 40) return 'Regular';
    return 'Baja';
  }

  getEfficiencyClass(simulation: SavedSimulation): string {
    const score = this.getEfficiencyScore(simulation);
    switch (score) {
      case 'Excelente': return 'excellent';
      case 'Buena': return 'good';
      case 'Regular': return 'fair';
      default: return 'poor';
    }
  }

  getBestOption(): string {
    const selected = this.getSelectedSimulations();
    if (selected.length === 0) return 'No hay simulaciones seleccionadas';
    
    let bestSim = selected[0];
    let bestScore = -1;
    
    selected.forEach(sim => {
      const score = this.calculateOverallScore(sim);
      if (score > bestScore) {
        bestScore = score;
        bestSim = sim;
      }
    });
    
    return `${bestSim.clientName} - ${bestSim.scenarioTitle}`;
  }

  getFastestOption(): string {
    const selected = this.getSelectedSimulations();
    if (selected.length === 0) return 'No hay simulaciones seleccionadas';
    
    const withTime = selected.filter(sim => sim.summary.timeToTarget);
    if (withTime.length === 0) return 'Información de tiempo no disponible';
    
    const fastest = withTime.reduce((min, sim) => 
      (sim.summary.timeToTarget || 999) < (min.summary.timeToTarget || 999) ? sim : min
    );
    
    return `${fastest.clientName} - ${fastest.summary.timeToTarget} meses`;
  }

  getLowestContributionOption(): string {
    const selected = this.getSelectedSimulations();
    if (selected.length === 0) return 'No hay simulaciones seleccionadas';
    
    const withContribution = selected.filter(sim => sim.summary.monthlyContribution);
    if (withContribution.length === 0) return 'Información de aportación no disponible';
    
    const lowest = withContribution.reduce((min, sim) => 
      (sim.summary.monthlyContribution || 999999) < (min.summary.monthlyContribution || 999999) ? sim : min
    );
    
    return `${lowest.clientName} - $${lowest.summary.monthlyContribution?.toLocaleString('es-MX')}`;
  }

  private calculateOverallScore(simulation: SavedSimulation): number {
    let score = 0;
    
    // Status weight (completed simulations score higher)
    if (simulation.summary.status === 'completed') score += 30;
    
    // Target amount reasonable range (middle scores higher)
    if (simulation.summary.targetAmount) {
      const amount = simulation.summary.targetAmount;
      if (amount >= 50000 && amount <= 500000) score += 20;
      else if (amount >= 20000 && amount <= 1000000) score += 10;
    }
    
    // Monthly contribution feasibility (lower is better for accessibility)
    if (simulation.summary.monthlyContribution) {
      const monthly = simulation.summary.monthlyContribution;
      if (monthly <= 3000) score += 25;
      else if (monthly <= 7000) score += 15;
      else if (monthly <= 15000) score += 5;
    }
    
    // Time to target efficiency
    if (simulation.summary.timeToTarget) {
      const months = simulation.summary.timeToTarget;
      if (months <= 12) score += 15;
      else if (months <= 24) score += 10;
      else if (months <= 36) score += 5;
    }
    
    // Recent activity bonus
    const daysSinceModified = (Date.now() - simulation.lastModified) / (1000 * 60 * 60 * 24);
    if (daysSinceModified <= 1) score += 10;
    else if (daysSinceModified <= 7) score += 5;
    
    return score;
  }

  exportComparison(): void {
    const selected = this.getSelectedSimulations();
    const comparisonData = {
      timestamp: new Date().toISOString(),
      simulations: selected.map(sim => ({
        clientName: sim.clientName,
        scenarioTitle: sim.scenarioTitle,
        market: this.getMarketLabel(sim.market),
        clientType: sim.clientType,
        targetAmount: sim.summary.targetAmount,
        monthlyContribution: sim.summary.monthlyContribution,
        timeToTarget: sim.summary.timeToTarget,
        status: sim.summary.status,
        efficiency: this.getEfficiencyScore(sim)
      })),
      insights: {
        bestOption: this.getBestOption(),
        fastestOption: this.getFastestOption(),
        lowestContribution: this.getLowestContributionOption()
      }
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(comparisonData, null, 2)], { 
      type: 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparacion-simulaciones-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  shareComparison(): void {
    const selected = this.getSelectedSimulations();
    const bestOption = this.getBestOption();
    const fastestOption = this.getFastestOption();
    const lowestContribution = this.getLowestContributionOption();
    
    const message = `📊 *Comparación de Simulaciones*\n\n` +
      `🔬 Analizadas: ${selected.length} opciones\n\n` +
      `👑 *Mejor Opción General:*\n${bestOption}\n\n` +
      `⚡ *Opción Más Rápida:*\n${fastestOption}\n\n` +
      `💰 *Menor Aportación Mensual:*\n${lowestContribution}\n\n` +
      `📋 *Detalles:*\n` +
      selected.map(sim => {
        const target = sim.summary.targetAmount ? `$${sim.summary.targetAmount.toLocaleString('es-MX')}` : 'N/D';
        const monthly = sim.summary.monthlyContribution ? `$${sim.summary.monthlyContribution.toLocaleString('es-MX')}` : 'N/D';
        const months = sim.summary.timeToTarget ? `${sim.summary.timeToTarget} meses` : 'N/D';
        return `• ${sim.clientName} (${sim.scenarioTitle})\n  Meta: ${target} | Mensual: ${monthly} | Tiempo: ${months}`;
      }).join('\n') +
      `\n\n🚗 Generado desde Conductores PWA`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  closeComparisonModal(): void {
    this.showComparisonModal = false;
  }
}