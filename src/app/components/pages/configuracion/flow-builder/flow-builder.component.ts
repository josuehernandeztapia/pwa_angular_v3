import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

export interface FlowNode {
  id: string;
  type: NodeType;
  name: string;
  icon: string;
  color: string;
  position: { x: number; y: number };
  config: any;
  inputs: NodePort[];
  outputs: NodePort[];
  isSelected?: boolean;
}

export interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: string;
}

export interface FlowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  isValid?: boolean;
  validationMessage?: string;
  condition?: 'always' | 'success' | 'failure' | 'custom';
}

export enum NodeType {
  Market = 'market',
  Document = 'document',
  Verification = 'verification',
  Product = 'product',
  BusinessRule = 'business-rule',
  Route = 'route'
}

export interface NodeTemplate {
  type: NodeType;
  name: string;
  icon: string;
  color: string;
  category: string;
  description: string;
  defaultConfig: any;
  inputs: Omit<NodePort, 'id'>[];
  outputs: Omit<NodePort, 'id'>[];
  compatibleWith?: string[]; // For products: compatible markets
}

export interface MarketProductCompatibility {
  marketCode: string;
  marketName: string;
  availableProducts: string[];
  restrictions: string[];
  regulatoryInheritance?: string; // Markets with CreditoColectivo inherit EdoMex rules
  isComplexMarket?: boolean; // Markets that require full AVI/Voice Pattern
}

@Component({
  selector: 'app-flow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flow-builder-container premium-container">
      
      <!-- Header -->
      <div class="flow-builder-header premium-card">
        <div class="header-left">
          <h1>🎨 Flow Builder</h1>
          <span class="subtitle">Crear ciudad/flujo visualmente</span>
        </div>
        <div class="header-right">
          <button class="btn-secondary" (click)="clearFlow()">🗑️ Limpiar</button>
          <button class="btn-secondary" (click)="saveFlow()">💾 Guardar</button>
          <button class="btn-primary" (click)="deployFlow()" [disabled]="!canDeploy">🚀 Deploy</button>
        </div>
      </div>

      <div class="flow-builder-content">
        
        <!-- Nodes Palette Sidebar -->
        <div class="nodes-palette premium-card">
          <div class="palette-header">
            <h3>📦 Componentes</h3>
            <input 
              type="text" 
              placeholder="Buscar nodos..."
              [(ngModel)]="searchTerm"
              class="search-input"
            />
          </div>

          <div class="palette-content">
            <!-- Market Compatibility Info -->
            <div *ngIf="getSelectedMarketCode()" class="market-info-panel">
              <div class="market-info-header">
                <span class="market-icon">🏙️</span>
                <div class="market-details">
                  <div class="market-name">{{ getSelectedMarketName() }}</div>
                  <div class="market-products">{{ getAvailableProductsForMarket().length }} productos disponibles</div>
                </div>
              </div>
              <div class="market-restrictions">
                <div class="restrictions-title">⚠️ Restricciones:</div>
                <div *ngFor="let restriction of getMarketRestrictions(getSelectedMarketCode())" class="restriction-item">
                  • {{ restriction }}
                </div>
              </div>
            </div>

            <div *ngFor="let category of getFilteredCategories()" class="node-category">
              <div class="category-header" (click)="toggleCategory(category.name)">
                <span class="category-icon">{{ category.expanded ? '▼' : '▶' }}</span>
                <span class="category-name">{{ category.name }}</span>
                <span class="category-count">({{ category.templates.length }})</span>
              </div>
              
              <div class="category-content" [class.expanded]="category.expanded">
                <div 
                  *ngFor="let template of getFilteredTemplates(category.templates)" 
                  class="node-template"
                  [style.border-left-color]="template.color"
                  [class.template-disabled]="!isTemplateCompatible(template)"
                  [attr.title]="getTemplateTooltip(template)"
                  draggable="true"
                  (dragstart)="onDragStart($event, template)"
                >
                  <div class="template-icon">{{ template.icon }}</div>
                  <div class="template-info">
                    <div class="template-name">{{ template.name }}</div>
                    <div class="template-description">{{ template.description }}</div>
                    <div *ngIf="!isTemplateCompatible(template)" class="template-warning">
                      ❌ No compatible con {{ getSelectedMarketName() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Canvas -->
        <div class="flow-canvas-container premium-card">
          <div class="canvas-toolbar">
            <div class="zoom-controls">
              <button class="zoom-btn" (click)="zoomOut()">➖</button>
              <span class="zoom-level">{{ (zoomLevel * 100).toFixed(0) }}%</span>
              <button class="zoom-btn" (click)="zoomIn()">➕</button>
            </div>
            <div class="canvas-controls">
              <button class="canvas-btn" (click)="fitToView()">🎯 Ajustar</button>
              <button class="canvas-btn" (click)="centerView()">📐 Centrar</button>
            </div>
          </div>

          <div 
            #flowCanvas
            class="flow-canvas"
            [style.transform]="'scale(' + zoomLevel + ') translate(' + panX + 'px, ' + panY + 'px)'"
            (drop)="onDrop($event)"
            (dragover)="onDragOver($event)"
            (mousedown)="onCanvasMouseDown($event)"
            (mousemove)="onCanvasMouseMove($event)"
            (mouseup)="onCanvasMouseUp($event)"
          >
            
            <!-- SVG Layer for Connections -->
            <svg class="connections-layer" [attr.viewBox]="'0 0 ' + canvasWidth + ' ' + canvasHeight">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
                </marker>
              </defs>
              
              <!-- Connection Lines -->
              <path 
                *ngFor="let connection of connections; trackBy: trackConnection"
                [attr.d]="getConnectionPath(connection)"
                class="connection-line"
                [class.connection-selected]="selectedConnection?.id === connection.id"
                [class.connection-invalid]="connection.isValid === false"
                [attr.title]="connection.validationMessage"
                (click)="selectConnection(connection)"
                marker-end="url(#arrowhead)"
              />
              
              <!-- Temporary Connection Line (during dragging) -->
              <path 
                *ngIf="tempConnection"
                [attr.d]="tempConnection.path"
                class="connection-temp"
                marker-end="url(#arrowhead)"
              />
            </svg>

            <!-- Nodes Layer -->
            <div class="nodes-layer">
              <div 
                *ngFor="let node of nodes; trackBy: trackNode"
                class="flow-node"
                [class.node-selected]="selectedNode?.id === node.id"
                [style.left.px]="node.position.x"
                [style.top.px]="node.position.y"
                [style.border-color]="node.color"
                (click)="selectNode(node)"
                (mousedown)="onNodeMouseDown($event, node)"
              >
                <!-- Node Header -->
                <div class="node-header" [style.background-color]="node.color">
                  <div class="node-icon">{{ node.icon }}</div>
                  <div class="node-name">{{ node.name }}</div>
                  <div class="node-actions">
                    <button class="node-action-btn" (click)="duplicateNode(node)">📋</button>
                    <button class="node-action-btn" (click)="deleteNode(node)">🗑️</button>
                  </div>
                </div>

                <!-- Node Content -->
                <div class="node-content">
                  <div class="node-description">{{ getNodeDescription(node) }}</div>
                  
                  <!-- Quick Config -->
                  <div class="node-quick-config" *ngIf="node.type === 'document'">
                    <label class="config-checkbox">
                      <input type="checkbox" [(ngModel)]="node.config.required">
                      <span>Obligatorio</span>
                    </label>
                    <label class="config-checkbox">
                      <input type="checkbox" [(ngModel)]="node.config.ocrEnabled">
                      <span>OCR</span>
                    </label>
                  </div>
                </div>

                <!-- Input Ports -->
                <div class="node-ports inputs">
                  <div 
                    *ngFor="let input of node.inputs"
                    class="node-port input-port"
                    [attr.data-port-id]="input.id"
                    [attr.data-node-id]="node.id"
                    (mousedown)="onPortMouseDown($event, node, input, 'input')"
                    [title]="input.name"
                  >
                    <div class="port-connector"></div>
                  </div>
                </div>

                <!-- Output Ports -->
                <div class="node-ports outputs">
                  <div 
                    *ngFor="let output of node.outputs"
                    class="node-port output-port"
                    [attr.data-port-id]="output.id"
                    [attr.data-node-id]="node.id"
                    (mousedown)="onPortMouseDown($event, node, output, 'output')"
                    [title]="output.name"
                  >
                    <div class="port-connector"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Properties Panel -->
        <div class="properties-panel" [class.panel-collapsed]="!selectedNode && !selectedConnection">
          <div class="panel-header">
            <h3>⚙️ Propiedades</h3>
            <button class="panel-toggle" (click)="togglePropertiesPanel()">
              {{ propertiesPanelExpanded ? '→' : '←' }}
            </button>
          </div>

          <div class="panel-content" *ngIf="selectedNode || selectedConnection">
            
            <!-- Node Properties -->
            <div *ngIf="selectedNode" class="node-properties">
              <h4>📦 {{ selectedNode.name }}</h4>
              
              <div class="property-group">
                <label class="property-label">Nombre:</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedNode.name"
                  class="property-input"
                  (ngModelChange)="onNodePropertyChange()"
                />
              </div>

              <div class="property-group" *ngIf="selectedNode.type === 'document'">
                <label class="property-label">Tipo de Documento:</label>
                <select [(ngModel)]="selectedNode.config.documentType" class="property-select">
                  <option value="identification">Identificación</option>
                  <option value="vehicle">Vehículo</option>
                  <option value="address">Comprobante Domicilio</option>
                  <option value="financial">Financiero</option>
                  <option value="legal">Legal</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div class="property-group" *ngIf="selectedNode.type === 'market'">
                <label class="property-label">Código de Ciudad:</label>
                <input 
                  type="text" 
                  [(ngModel)]="selectedNode.config.cityCode"
                  class="property-input"
                  placeholder="guadalajara"
                />
                
                <label class="property-label">Regulaciones:</label>
                <div class="regulations-list">
                  <div *ngFor="let regulation of selectedNode.config.regulations; let i = index" class="regulation-item">
                    <input 
                      type="text" 
                      [(ngModel)]="selectedNode.config.regulations[i]"
                      class="regulation-input"
                      placeholder="SEMOV, Verificación..."
                    />
                    <button class="remove-btn" (click)="removeRegulation(i)">✕</button>
                  </div>
                  <button class="add-regulation-btn" (click)="addRegulation()">+ Agregar</button>
                </div>
              </div>

              <div class="property-group" *ngIf="selectedNode.type === 'verification'">
                <label class="property-label">Tipo de Verificación:</label>
                <select [(ngModel)]="selectedNode.config.verificationType" class="property-select">
                  <option value="voice">Patrón de Voz</option>
                  <option value="avi">Análisis AVI</option>
                  <option value="biometric">Biométrica</option>
                  <option value="document">Documento</option>
                </select>
              </div>
            </div>

            <!-- Connection Properties -->
            <div *ngIf="selectedConnection" class="connection-properties">
              <h4>🔗 Conexión</h4>
              
              <div class="property-group">
                <label class="property-label">Condición:</label>
                <select [(ngModel)]="selectedConnection.condition" class="property-select">
                  <option value="always">Siempre</option>
                  <option value="success">En éxito</option>
                  <option value="failure">En fallo</option>
                  <option value="custom">Personalizada</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Flow Generation Modal -->
      <div class="flow-modal" *ngIf="showGenerationModal" (click)="closeGenerationModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🚀 Generar Flujo</h3>
            <button class="modal-close" (click)="closeGenerationModal()">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="generation-progress" *ngIf="isGenerating">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="generationProgress"></div>
              </div>
              <p class="progress-text">{{ generationStatus }}</p>
            </div>

            <div class="generation-preview" *ngIf="generatedCode && !isGenerating">
              <h4>📋 Código Generado:</h4>
              <div class="code-tabs">
                <button 
                  *ngFor="let file of getGeneratedFiles()"
                  class="code-tab"
                  [class.active]="activeCodeTab === file"
                  (click)="activeCodeTab = file"
                >
                  {{ file }}
                </button>
              </div>
              <div class="code-content">
                <pre><code>{{ getGeneratedCode(activeCodeTab) }}</code></pre>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeGenerationModal()">Cancelar</button>
            <button 
              class="btn-primary" 
              (click)="downloadGeneratedCode()"
              [disabled]="!generatedCode"
            >
              📥 Descargar Código
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flow-builder-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .flow-builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header-left h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }

    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-left: 12px;
    }

    .header-right {
      display: flex;
      gap: 12px;
    }

    .btn-primary,
    .btn-secondary {
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 14px;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .flow-builder-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    /* Nodes Palette */
    .nodes-palette {
      width: 300px;
      background: white;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
    }

    .palette-header {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .palette-header h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
    }

    .palette-content {
      flex: 1;
      overflow-y: auto;
    }

    .node-category {
      border-bottom: 1px solid #f1f5f9;
    }

    .category-header {
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #374151;
      transition: background 0.2s;
    }

    .category-header:hover {
      background: #f8fafc;
    }

    .category-icon {
      color: #6b7280;
      font-size: 12px;
    }

    .category-count {
      color: #9ca3af;
      font-size: 12px;
      margin-left: auto;
    }

    .category-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .category-content.expanded {
      max-height: 500px;
    }

    .node-template {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      cursor: grab;
      border-left: 3px solid transparent;
      transition: all 0.2s;
    }

    .node-template:hover {
      background: #f8fafc;
      border-left-color: currentColor !important;
    }

    .node-template:active {
      cursor: grabbing;
    }

    .template-icon {
      font-size: 18px;
      width: 24px;
      text-align: center;
    }

    .template-info {
      flex: 1;
    }

    .template-name {
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }

    .template-description {
      color: #6b7280;
      font-size: 12px;
      margin-top: 2px;
    }

    .template-disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      background: #f8fafc;
    }

    .template-warning {
      color: #ef4444;
      font-size: 10px;
      font-weight: 500;
      margin-top: 4px;
    }

    .market-info-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .market-info-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .market-icon {
      font-size: 16px;
    }

    .market-name {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }

    .market-products {
      color: #6b7280;
      font-size: 11px;
    }

    .market-restrictions {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }

    .restrictions-title {
      font-size: 11px;
      font-weight: 600;
      color: #f59e0b;
      margin-bottom: 4px;
    }

    .restriction-item {
      font-size: 10px;
      color: #6b7280;
      line-height: 1.3;
    }

    /* Flow Canvas */
    .flow-canvas-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .canvas-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: white;
      border-bottom: 1px solid #e2e8f0;
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .zoom-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .zoom-level {
      font-size: 12px;
      color: #6b7280;
      min-width: 40px;
      text-align: center;
    }

    .canvas-controls {
      display: flex;
      gap: 8px;
    }

    .canvas-btn {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: #6b7280;
    }

    .flow-canvas {
      flex: 1;
      position: relative;
      background: 
        radial-gradient(circle, #e2e8f0 1px, transparent 1px);
      background-size: 20px 20px;
      cursor: grab;
      transform-origin: 0 0;
      transition: transform 0.2s ease;
    }

    .flow-canvas.dragging {
      cursor: grabbing;
    }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .connection-line {
      fill: none;
      stroke: #6b7280;
      stroke-width: 2;
      pointer-events: stroke;
      cursor: pointer;
    }

    .connection-line:hover,
    .connection-selected {
      stroke: #3b82f6;
      stroke-width: 3;
    }

    .connection-temp {
      fill: none;
      stroke: #94a3b8;
      stroke-width: 2;
      stroke-dasharray: 5,5;
    }

    .connection-invalid {
      stroke: #ef4444 !important;
      stroke-width: 3;
      stroke-dasharray: 8,4;
      animation: pulse-error 2s infinite;
    }

    @keyframes pulse-error {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .nodes-layer {
      position: relative;
      z-index: 2;
    }

    .flow-node {
      position: absolute;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      min-width: 200px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
    }

    .flow-node:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .flow-node.node-selected {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      color: white;
      font-weight: 500;
      font-size: 14px;
      border-radius: 6px 6px 0 0;
    }

    .node-name {
      flex: 1;
    }

    .node-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .flow-node:hover .node-actions {
      opacity: 1;
    }

    .node-action-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 10px;
    }

    .node-content {
      padding: 12px;
    }

    .node-description {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .node-quick-config {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .config-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #6b7280;
    }

    .node-ports {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
    }

    .node-ports.inputs {
      left: -6px;
    }

    .node-ports.outputs {
      right: -6px;
    }

    .node-port {
      position: relative;
      margin: 8px 0;
    }

    .port-connector {
      width: 12px;
      height: 12px;
      border: 2px solid #6b7280;
      background: white;
      border-radius: 50%;
      cursor: crosshair;
      transition: all 0.2s;
    }

    .port-connector:hover {
      border-color: #3b82f6;
      background: #3b82f6;
      transform: scale(1.2);
    }

    /* Properties Panel */
    .properties-panel {
      width: 320px;
      background: white;
      border-left: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
    }

    .properties-panel.panel-collapsed {
      width: 0;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .panel-toggle {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 16px;
    }

    .panel-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    }

    .property-group {
      margin-bottom: 16px;
    }

    .property-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .property-input,
    .property-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    }

    .property-input:focus,
    .property-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Modal */
    .flow-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 80%;
      max-height: 80%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #6b7280;
      cursor: pointer;
    }

    .modal-body {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e2e8f0;
      justify-content: flex-end;
    }

    @media (max-width: 1024px) {
      .nodes-palette {
        width: 250px;
      }
      
      .properties-panel {
        width: 280px;
      }
    }
  `]
})
export class FlowBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Canvas state
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  canvasWidth = 2000;
  canvasHeight = 2000;
  private isPanning = false;
  private panStartClientX = 0;
  private panStartClientY = 0;
  private panStartX = 0;
  private panStartY = 0;

  // Selection state
  selectedNode: FlowNode | null = null;
  selectedConnection: FlowConnection | null = null;

  // Drag & Drop state
  isDragging = false;
  dragStartPos = { x: 0, y: 0 };
  draggedTemplate: NodeTemplate | null = null;
  private draggingNode: FlowNode | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  // Connection state
  tempConnection: { path: string } | null = null;
  connectionStart: { nodeId: string; portId: string; portType: 'input' | 'output'; x: number; y: number } | null = null;

  // UI state
  searchTerm = '';
  propertiesPanelExpanded = true;
  showGenerationModal = false;
  isGenerating = false;
  generationProgress = 0;
  generationStatus = '';
  generatedCode: { [filename: string]: string } = {};
  activeCodeTab = '';
  private categoryExpanded: { [category: string]: boolean } = {};

  // Flow data
  nodes: FlowNode[] = [];
  connections: FlowConnection[] = [];
  nodeIdCounter = 1;
  connectionIdCounter = 1;

  // Market-Product compatibility matrix
  marketCompatibilityMatrix: MarketProductCompatibility[] = [
    {
      marketCode: 'aguascalientes',
      marketName: 'Aguascalientes',
      availableProducts: ['venta_directa', 'venta_plazo', 'ahorro_programado'],
      restrictions: ['No crédito colectivo', 'No tanda colectiva', 'SEMOV obligatorio'],
      isComplexMarket: false // Simple market - no complex products
    },
    {
      marketCode: 'edomex',
      marketName: 'Estado de México',
      availableProducts: ['venta_directa', 'venta_plazo', 'ahorro_programado', 'credito_colectivo', 'tanda_colectiva'],
      restrictions: ['Verificación vehicular obligatoria', 'Límites de riesgo por municipio', 'AVI + Voice Pattern para productos complejos'],
      isComplexMarket: true, // Master template for complex regulatory framework
      regulatoryInheritance: 'master' // This is the master regulatory template
    },
    {
      marketCode: 'guadalajara',
      marketName: 'Guadalajara',
      availableProducts: ['venta_directa', 'venta_plazo', 'ahorro_programado', 'credito_colectivo'],
      restrictions: ['No tanda colectiva', 'Regulación SEMOV especial', '⚠️ Hereda regulaciones EdoMex para Crédito Colectivo'],
      isComplexMarket: true, // Has CreditoColectivo → inherits EdoMex complexity
      regulatoryInheritance: 'edomex' // Inherits EdoMex regulatory framework
    },
    {
      marketCode: 'cdmx',
      marketName: 'Ciudad de México',
      availableProducts: ['venta_directa', 'venta_plazo', 'ahorro_programado'],
      restrictions: ['Verificación obligatoria', 'No productos colectivos'],
      isComplexMarket: false
    },
    {
      marketCode: 'monterrey',
      marketName: 'Monterrey',
      availableProducts: ['venta_directa', 'venta_plazo', 'ahorro_programado', 'credito_colectivo'],
      restrictions: ['Regulación estatal NL', '⚠️ Hereda regulaciones EdoMex para Crédito Colectivo'],
      isComplexMarket: true, // Has CreditoColectivo → inherits EdoMex complexity  
      regulatoryInheritance: 'edomex'
    }
  ];

  // Node templates
  nodeTemplates: NodeTemplate[] = [
    // Market nodes
    {
      type: NodeType.Market,
      name: 'Ciudad/Mercado',
      icon: '🏙️',
      color: '#3b82f6',
      category: '🌍 Mercados',
      description: 'Define una nueva ciudad o mercado',
      defaultConfig: {
        cityCode: '',
        name: '',
        regulations: ['Regulación 1'],
        timezone: 'America/Mexico_City',
        language: 'es-MX'
      },
      inputs: [],
      outputs: [{ name: 'Flujo', type: 'output', dataType: 'flow' }]
    },
    
    // Document nodes
    {
      type: NodeType.Document,
      name: 'INE Vigente',
      icon: '🆔',
      color: '#10b981',
      category: '📄 Documentos',
      description: 'Documento de identificación oficial',
      defaultConfig: {
        documentType: 'identification',
        required: true,
        ocrEnabled: true,
        validationRules: ['must_be_valid', 'not_expired']
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Aprobado', type: 'output', dataType: 'flow' }, { name: 'Rechazado', type: 'output', dataType: 'flow' }]
    },

    {
      type: NodeType.Document,
      name: 'Tarjeta de Circulación',
      icon: '🚗',
      color: '#10b981',
      category: '📄 Documentos',
      description: 'Documento del vehículo',
      defaultConfig: {
        documentType: 'vehicle',
        required: true,
        ocrEnabled: true,
        extractFields: ['placas', 'marca', 'modelo', 'año']
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Aprobado', type: 'output', dataType: 'flow' }, { name: 'Rechazado', type: 'output', dataType: 'flow' }]
    },

    {
      type: NodeType.Document,
      name: 'Documento Personalizado',
      icon: '📋',
      color: '#10b981',
      category: '📄 Documentos',
      description: 'Documento específico de la ciudad',
      defaultConfig: {
        documentType: 'custom',
        name: 'Documento Personalizado',
        required: true,
        ocrEnabled: false
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Aprobado', type: 'output', dataType: 'flow' }, { name: 'Rechazado', type: 'output', dataType: 'flow' }]
    },

    // Verification nodes
    {
      type: NodeType.Verification,
      name: 'Patrón de Voz',
      icon: '🎤',
      color: '#f59e0b',
      category: '🔍 Verificaciones',
      description: 'Verificación por patrón de voz',
      defaultConfig: {
        verificationType: 'voice',
        duration: '2-3 min',
        required: true
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Verificado', type: 'output', dataType: 'flow' }, { name: 'Fallido', type: 'output', dataType: 'flow' }]
    },

    {
      type: NodeType.Verification,
      name: 'Análisis AVI',
      icon: '🤖',
      color: '#f59e0b',
      category: '🔍 Verificaciones',
      description: 'Análisis automático de voz e inteligencia',
      defaultConfig: {
        verificationType: 'avi',
        duration: '15-20 min',
        questions: 12,
        required: true
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Aprobado', type: 'output', dataType: 'flow' }, { name: 'Rechazado', type: 'output', dataType: 'flow' }]
    },

    // Product nodes
    {
      type: NodeType.Product,
      name: 'Venta Directa',
      icon: '💰',
      color: '#8b5cf6',
      category: '💼 Productos',
      description: 'Producto de venta directa simplificado',
      defaultConfig: {
        productType: 'venta_directa',
        complexity: 'simple',
        requiresVerification: false
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Contrato', type: 'output', dataType: 'flow' }],
      compatibleWith: ['aguascalientes', 'edomex', 'guadalajara', 'cdmx'] // Compatible con todas las ciudades
    },

    {
      type: NodeType.Product,
      name: 'Venta a Plazo',
      icon: '🏦',
      color: '#8b5cf6',
      category: '💼 Productos',
      description: 'Producto de financiamiento completo',
      defaultConfig: {
        productType: 'venta_plazo',
        complexity: 'complex',
        requiresVerification: true
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Contrato', type: 'output', dataType: 'flow' }],
      compatibleWith: ['aguascalientes', 'edomex', 'guadalajara', 'cdmx']
    },

    {
      type: NodeType.Product,
      name: 'Ahorro Programado',
      icon: '🐷',
      color: '#8b5cf6',
      category: '💼 Productos',
      description: 'Plan de ahorro para vehículo',
      defaultConfig: {
        productType: 'ahorro_programado',
        complexity: 'medium',
        requiresVerification: false
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Contrato', type: 'output', dataType: 'flow' }],
      compatibleWith: ['aguascalientes', 'edomex', 'guadalajara', 'cdmx']
    },

    {
      type: NodeType.Product,
      name: 'Crédito Colectivo',
      icon: '👥',
      color: '#8b5cf6',
      category: '💼 Productos',
      description: 'Crédito grupal para vehículos',
      defaultConfig: {
        productType: 'credito_colectivo',
        complexity: 'complex',
        requiresVerification: true,
        minMembers: 5,
        maxMembers: 50
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Contrato', type: 'output', dataType: 'flow' }],
      compatibleWith: ['edomex', 'guadalajara'] // ❌ NO disponible en Aguascalientes
    },

    {
      type: NodeType.Product,
      name: 'Tanda Colectiva',
      icon: '🔄',
      color: '#8b5cf6',
      category: '💼 Productos',
      description: 'Sistema de tanda para ahorro grupal',
      defaultConfig: {
        productType: 'tanda_colectiva',
        complexity: 'complex',
        requiresVerification: true,
        participants: 12
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Contrato', type: 'output', dataType: 'flow' }],
      compatibleWith: ['edomex'] // ❌ Solo EdoMex
    }
    ,
    // Business rule nodes
    {
      type: NodeType.BusinessRule,
      name: 'Regla de Negocio',
      icon: '🧠',
      color: '#ef4444',
      category: '⚙️ Reglas',
      description: 'Evalúa una condición para bifurcar el flujo',
      defaultConfig: {
        ruleName: 'eligibilidad_basica',
        expression: 'ingresos >= 2 * pago_mensual',
        parameters: []
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [
        { name: 'Verdadero', type: 'output', dataType: 'flow' },
        { name: 'Falso', type: 'output', dataType: 'flow' }
      ]
    },
    // Route/switch nodes
    {
      type: NodeType.Route,
      name: 'Ruta Condicional',
      icon: '🛣️',
      color: '#0ea5e9',
      category: '🧭 Rutas',
      description: 'Redirige según una condición del contexto',
      defaultConfig: {
        condition: 'resultado_documentos == "ok"',
        trueLabel: 'Sí',
        falseLabel: 'No'
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [
        { name: 'Sí', type: 'output', dataType: 'flow' },
        { name: 'No', type: 'output', dataType: 'flow' }
      ]
    }
  ];

  @ViewChild('flowCanvas') flowCanvas!: ElementRef<HTMLDivElement>;

  constructor() {}

  ngOnInit() {
    // Load saved flow if present; otherwise use sample
    const saved = localStorage.getItem('flow_builder_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.nodes = parsed.nodes || [];
        this.connections = parsed.connections || [];
        this.validateAllConnections();
      } catch {
        this.loadSampleFlow();
      }
    } else {
      this.loadSampleFlow();
    }
  }

  getGeneratedFiles(): string[] {
    return Object.keys(this.generatedCode || {});
  }

  getGeneratedCode(file: string): string {
    return (this.generatedCode && this.generatedCode[file]) || '';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Category management
  getFilteredCategories() {
    const categories: { [key: string]: { name: string; expanded: boolean; templates: NodeTemplate[] } } = {};
    
    const filteredTemplates = this.nodeTemplates.filter(template => 
      !this.searchTerm || 
      template.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    filteredTemplates.forEach(template => {
      if (!categories[template.category]) {
        categories[template.category] = {
          name: template.category,
          expanded: this.categoryExpanded[template.category] ?? true,
          templates: []
        };
      }
      categories[template.category].templates.push(template);
    });

    return Object.values(categories);
  }

  toggleCategory(categoryName: string) {
    const current = this.categoryExpanded[categoryName] ?? true;
    this.categoryExpanded[categoryName] = !current;
  }

  // Drag & Drop
  onDragStart(event: DragEvent, template: NodeTemplate) {
    this.draggedTemplate = template;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/json', JSON.stringify(template));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!this.draggedTemplate) return;

    const rect = this.flowCanvas.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.panX) / this.zoomLevel;
    const y = (event.clientY - rect.top - this.panY) / this.zoomLevel;

    this.createNodeFromTemplate(this.draggedTemplate, { x, y });
    this.draggedTemplate = null;
  }

  createNodeFromTemplate(template: NodeTemplate, position: { x: number; y: number }) {
    // Check compatibility before creating product nodes
    if (template.type === NodeType.Product && !this.isTemplateCompatible(template)) {
      const marketName = this.getSelectedMarketName();
      return;
    }

    const node: FlowNode = {
      id: `node_${this.nodeIdCounter++}`,
      type: template.type,
      name: template.name,
      icon: template.icon,
      color: template.color,
      position,
      config: JSON.parse(JSON.stringify(template.defaultConfig)),
      inputs: template.inputs.map((input, index) => ({
        ...input,
        id: `input_${node.id}_${index}`
      })),
      outputs: template.outputs.map((output, index) => ({
        ...output,
        id: `output_${node.id}_${index}`
      }))
    };

    this.nodes.push(node);
    
    // Revalidate all connections when a new node is added
    this.validateAllConnections();
  }

  // Canvas controls
  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel * 1.2, 3);
  }

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.2);
  }

  fitToView() {
    // Reset zoom and pan to fit all nodes
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  centerView() {
    this.panX = 0;
    this.panY = 0;
  }

  // Node management
  selectNode(node: FlowNode) {
    this.selectedNode = node;
    this.selectedConnection = null;
  }

  duplicateNode(node: FlowNode) {
    const newNode = JSON.parse(JSON.stringify(node));
    newNode.id = `node_${this.nodeIdCounter++}`;
    newNode.position.x += 50;
    newNode.position.y += 50;
    newNode.isSelected = false;
    // Regenerate unique port IDs to avoid collisions
    newNode.inputs = (node.inputs || []).map((input: NodePort, index: number) => ({
      ...input,
      id: `input_${newNode.id}_${index}`
    }));
    newNode.outputs = (node.outputs || []).map((output: NodePort, index: number) => ({
      ...output,
      id: `output_${newNode.id}_${index}`
    }));
    this.nodes.push(newNode);
  }

  deleteNode(node: FlowNode) {
    // Remove connections
    this.connections = this.connections.filter(conn => 
      conn.sourceNodeId !== node.id && conn.targetNodeId !== node.id
    );
    
    // Remove node
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    
    if (this.selectedNode?.id === node.id) {
      this.selectedNode = null;
    }
  }

  getNodeDescription(node: FlowNode): string {
    switch (node.type) {
      case NodeType.Market:
        return `Ciudad: ${node.config.cityCode || 'Sin configurar'}`;
      case NodeType.Document:
        return `${node.config.required ? 'Obligatorio' : 'Opcional'} | ${node.config.ocrEnabled ? 'OCR' : 'Manual'}`;
      case NodeType.Verification:
        return `${node.config.verificationType} | ${node.config.duration || 'N/A'}`;
      case NodeType.Product:
        return `${node.config.complexity} | ${node.config.requiresVerification ? 'Con verificación' : 'Sin verificación'}`;
      default:
        return 'Nodo personalizado';
    }
  }

  // Connection management
  getConnectionPath(connection: FlowConnection): string {
    const sourceNode = this.nodes.find(n => n.id === connection.sourceNodeId);
    const targetNode = this.nodes.find(n => n.id === connection.targetNodeId);
    
    if (!sourceNode || !targetNode) return '';

    const sourceX = sourceNode.position.x + 200; // Node width
    const sourceY = sourceNode.position.y + 50;  // Node height / 2
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + 50;

    // Create curved path
    const controlX1 = sourceX + (targetX - sourceX) * 0.5;
    const controlY1 = sourceY;
    const controlX2 = targetX - (targetX - sourceX) * 0.5;
    const controlY2 = targetY;

    return `M ${sourceX} ${sourceY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${targetX} ${targetY}`;
  }

  selectConnection(connection: FlowConnection) {
    this.selectedConnection = connection;
    this.selectedNode = null;
  }

  trackConnection(index: number, connection: FlowConnection) {
    return connection.id;
  }

  trackNode(index: number, node: FlowNode) {
    return node.id;
  }

  // Mouse events
  onCanvasMouseDown(event: MouseEvent) {
    if (event.target === this.flowCanvas.nativeElement) {
      this.selectedNode = null;
      this.selectedConnection = null;
      // Start panning
      this.isPanning = true;
      this.panStartClientX = event.clientX;
      this.panStartClientY = event.clientY;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    // Update temporary connection rubber band
    if (this.connectionStart) {
      const rect = this.flowCanvas.nativeElement.getBoundingClientRect();
      const endX = (event.clientX - rect.left - this.panX) / this.zoomLevel;
      const endY = (event.clientY - rect.top - this.panY) / this.zoomLevel;
      this.tempConnection = {
        path: this.buildBezierPath(this.connectionStart.x, this.connectionStart.y, endX, endY)
      };
    }

    // Dragging node
    if (this.draggingNode) {
      const rect = this.flowCanvas.nativeElement.getBoundingClientRect();
      const cursorX = (event.clientX - rect.left - this.panX) / this.zoomLevel;
      const cursorY = (event.clientY - rect.top - this.panY) / this.zoomLevel;
      this.draggingNode.position.x = cursorX - this.dragOffsetX;
      this.draggingNode.position.y = cursorY - this.dragOffsetY;
    }

    // Canvas panning
    if (this.isPanning) {
      this.panX = this.panStartX + (event.clientX - this.panStartClientX);
      this.panY = this.panStartY + (event.clientY - this.panStartClientY);
    }
  }

  onCanvasMouseUp(event: MouseEvent) {
    // Finish connection if any
    if (this.connectionStart) {
      const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const targetPortEl = el ? (el.closest('.node-port') as HTMLElement | null) : null;
      if (targetPortEl) {
        const targetPortId = targetPortEl.getAttribute('data-port-id') || '';
        const targetNodeId = targetPortEl.getAttribute('data-node-id') || '';
        const start = this.connectionStart;

        // Determine direction
        const isOppositeType = targetPortEl.classList.contains('input-port') ? start.portType === 'output' : start.portType === 'input';
        if (isOppositeType) {
          const sourceNodeId = start.portType === 'output' ? start.nodeId : targetNodeId;
          const sourcePortId = start.portType === 'output' ? start.portId : targetPortId;
          const targetNodeFinalId = start.portType === 'output' ? targetNodeId : start.nodeId;
          const targetPortFinalId = start.portType === 'output' ? targetPortId : start.portId;
          this.addConnection(sourceNodeId, sourcePortId, targetNodeFinalId, targetPortFinalId);
        }
      }
      this.connectionStart = null;
      this.tempConnection = null;
    }

    // Stop dragging node
    this.draggingNode = null;

    // Stop panning
    this.isPanning = false;
  }

  onNodeMouseDown(event: MouseEvent, node: FlowNode) {
    event.stopPropagation();
    this.selectNode(node);
    // Prepare dragging
    const rect = this.flowCanvas.nativeElement.getBoundingClientRect();
    const cursorX = (event.clientX - rect.left - this.panX) / this.zoomLevel;
    const cursorY = (event.clientY - rect.top - this.panY) / this.zoomLevel;
    this.draggingNode = node;
    this.dragOffsetX = cursorX - node.position.x;
    this.dragOffsetY = cursorY - node.position.y;
  }

  onPortMouseDown(event: MouseEvent, node: FlowNode, port: NodePort, portType: 'input' | 'output') {
    event.stopPropagation();
    // Start a new connection from this port
    const portEl = event.currentTarget as HTMLElement;
    const { x, y } = this.getPortCenterPosition(portEl);
    this.connectionStart = { nodeId: node.id, portId: port.id, portType, x, y };
    this.tempConnection = { path: this.buildBezierPath(x, y, x, y) };
  }

  // Properties panel
  togglePropertiesPanel() {
    this.propertiesPanelExpanded = !this.propertiesPanelExpanded;
  }

  onNodePropertyChange() {
    // Handle node property changes
  }

  addRegulation() {
    if (this.selectedNode?.config.regulations) {
      this.selectedNode.config.regulations.push('');
    }
  }

  removeRegulation(index: number) {
    if (this.selectedNode?.config.regulations) {
      this.selectedNode.config.regulations.splice(index, 1);
    }
  }

  // Flow operations
  get canDeploy(): boolean {
    return this.isGraphValid();
  }

  clearFlow() {
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.selectedConnection = null;
  }

  saveFlow() {
    const flowData = {
      nodes: this.nodes,
      connections: this.connections,
      version: '1.0'
    };
    
    // Save to localStorage or send to backend
    localStorage.setItem('flow_builder_data', JSON.stringify(flowData));
  }

  deployFlow() {
    this.showGenerationModal = true;
    this.generateCode();
  }

  closeGenerationModal() {
    this.showGenerationModal = false;
    this.generatedCode = {};
    this.activeCodeTab = '';
  }

  downloadGeneratedCode() {
    // Download generated code files
    Object.entries(this.generatedCode).forEach(([filename, content]) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  private async generateCode() {
    this.isGenerating = true;
    this.generationProgress = 0;
    this.generationStatus = 'Analizando flujo...';

    // Simulate code generation process
    await this.delay(500);
    this.generationProgress = 25;
    this.generationStatus = 'Generando componentes...';

    await this.delay(500);
    this.generationProgress = 50;
    this.generationStatus = 'Creando rutas...';

    await this.delay(500);
    this.generationProgress = 75;
    this.generationStatus = 'Generando servicios...';

    await this.delay(500);
    this.generationProgress = 100;
    this.generationStatus = 'Completado';

    // Generate actual code
    this.generatedCode = this.createGeneratedCode();
    this.activeCodeTab = Object.keys(this.generatedCode)[0] || '';
    this.isGenerating = false;
  }

  private createGeneratedCode(): { [filename: string]: string } {
    const marketNodes = this.nodes.filter(n => n.type === NodeType.Market);
    const documentNodes = this.nodes.filter(n => n.type === NodeType.Document);
    const productNodes = this.nodes.filter(n => n.type === NodeType.Product);

    const code: { [filename: string]: string } = {};

    // Generate route configuration
    if (marketNodes.length > 0) {
      const cityCode = marketNodes[0].config.cityCode;
      code[`${cityCode}-routes.ts`] = this.generateRouteCode(cityCode, productNodes);
    }

    // Generate document requirements service
    if (documentNodes.length > 0) {
      code['document-requirements.service.ts'] = this.generateDocumentService(documentNodes);
    }

    // Generate component files
    productNodes.forEach(product => {
      const componentName = product.config.productType.replace('_', '-');
      code[`${componentName}.component.ts`] = this.generateComponentCode(product);
    });

    return code;
  }

  private addConnection(sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string): void {
    // Prevent self-connections
    if (sourceNodeId === targetNodeId) {
      return;
    }

    // Prevent duplicates
    const duplicate = this.connections.some(c =>
      c.sourceNodeId === sourceNodeId &&
      c.sourcePortId === sourcePortId &&
      c.targetNodeId === targetNodeId &&
      c.targetPortId === targetPortId
    );
    if (duplicate) return;

    const sourceNode = this.nodes.find(n => n.id === sourceNodeId);
    const targetNode = this.nodes.find(n => n.id === targetNodeId);
    if (!sourceNode || !targetNode) return;

    const sourcePort = [...sourceNode.outputs, ...sourceNode.inputs].find(p => p.id === sourcePortId);
    const targetPort = [...targetNode.outputs, ...targetNode.inputs].find(p => p.id === targetPortId);
    if (!sourcePort || !targetPort) return;

    // Enforce data type compatibility
    if (sourcePort.dataType !== targetPort.dataType) {
      return;
    }

    // Enforce single incoming per input port
    const hasIncoming = this.connections.some(c => c.targetNodeId === targetNodeId && c.targetPortId === targetPortId);
    if (hasIncoming) return;

    const connection: FlowConnection = {
      id: `connection_${this.connectionIdCounter++}`,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId
    };

    // Validate business rules
    const validation = this.validateConnection(sourceNode, targetNode);
    connection.isValid = validation.isValid;
    connection.validationMessage = validation.message;

    this.connections.push(connection);
  }

  private generateRouteCode(cityCode: string, productNodes: FlowNode[]): string {
    const routes = productNodes.map(product => {
      const routeName = product.config.productType.replace('_', '-');
      return `  {
    path: '${routeName}',
    loadComponent: () => import('./components/${routeName}/${routeName}.component').then(c => c.${this.toPascalCase(routeName)}Component),
    title: '${product.name} - ${cityCode.toUpperCase()}'
  }`;
    }).join(',\n');

    return `// Generated routes for ${cityCode}
export const ${cityCode}Routes = [
${routes}
];`;
  }

  private generateDocumentService(documentNodes: FlowNode[]): string {
    const documents = documentNodes.map(doc => {
      return `  {
    id: '${doc.id}',
    name: '${doc.name}',
    type: '${doc.config.documentType}',
    required: ${doc.config.required},
    ocrEnabled: ${doc.config.ocrEnabled}
  }`;
    }).join(',\n');

    return `// Generated document requirements
export const GENERATED_DOCUMENTS = [
${documents}
];`;
  }

  private generateComponentCode(productNode: FlowNode): string {
    const className = this.toPascalCase(productNode.config.productType.replace('_', '-'));
    return `// Generated component for ${productNode.name}
@Component({
  selector: 'app-${productNode.config.productType.replace('_', '-')}',
  template: \`
    <div class="product-container">
      <h2>${productNode.name}</h2>
      <p>Generated component for ${productNode.name}</p>
    </div>
  \`
})
export class ${className}Component {
  // Generated implementation
}`;
  }

  private toPascalCase(str: string): string {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helpers for canvas/ports
  private getPortCenterPosition(portEl: HTMLElement): { x: number; y: number } {
    const portRect = portEl.getBoundingClientRect();
    const canvasRect = this.flowCanvas.nativeElement.getBoundingClientRect();
    const centerClientX = portRect.left + portRect.width / 2;
    const centerClientY = portRect.top + portRect.height / 2;
    const x = (centerClientX - canvasRect.left - this.panX) / this.zoomLevel;
    const y = (centerClientY - canvasRect.top - this.panY) / this.zoomLevel;
    return { x, y };
  }

  private buildBezierPath(startX: number, startY: number, endX: number, endY: number): string {
    const controlX1 = startX + (endX - startX) * 0.5;
    const controlY1 = startY;
    const controlX2 = endX - (endX - startX) * 0.5;
    const controlY2 = endY;
    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
  }

  // Market-Product Compatibility Validation
  validateConnection(sourceNode: FlowNode, targetNode: FlowNode): { isValid: boolean; message?: string } {
    // If connecting a Market to a Product, validate compatibility
    if (sourceNode.type === NodeType.Market && targetNode.type === NodeType.Product) {
      const marketCode = sourceNode.config.cityCode;
      const productType = targetNode.config.productType;
      
      const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === marketCode);
      
      if (!marketConfig) {
        return { isValid: false, message: `Ciudad ${marketCode} no configurada` };
      }
      
      if (!marketConfig.availableProducts.includes(productType)) {
        const productNames = {
          'credito_colectivo': 'Crédito Colectivo',
          'tanda_colectiva': 'Tanda Colectiva',
          'venta_directa': 'Venta Directa',
          'venta_plazo': 'Venta a Plazo',
          'ahorro_programado': 'Ahorro Programado'
        };
        
        return { 
          isValid: false, 
          message: `❌ ${productNames[productType as keyof typeof productNames]} no disponible en ${marketConfig.marketName}` 
        };
      }
    }
    
    return { isValid: true };
  }

  private isGraphValid(): boolean {
    if (this.nodes.length === 0) return false;

    // Must have a market with configured cityCode
    const marketNodes = this.nodes.filter(n => n.type === NodeType.Market && !!n.config.cityCode);
    if (marketNodes.length === 0) return false;

    // No invalid connections
    const anyInvalid = this.connections.some(c => c.isValid === false);
    if (anyInvalid) return false;

    // Each connection must reference existing nodes and ports
    const portsExist = this.connections.every(c => {
      const s = this.nodes.find(n => n.id === c.sourceNodeId);
      const t = this.nodes.find(n => n.id === c.targetNodeId);
      if (!s || !t) return false;
      const hasS = [...s.outputs, ...s.inputs].some(p => p.id === c.sourcePortId);
      const hasT = [...t.outputs, ...t.inputs].some(p => p.id === c.targetPortId);
      return hasS && hasT;
    });
    if (!portsExist) return false;

    // Reachability: products should be reachable from a market
    const productNodes = this.nodes.filter(n => n.type === NodeType.Product);
    if (productNodes.length === 0) return true; // allow drafts

    const adj = new Map<string, string[]>();
    this.connections.forEach(c => {
      const list = adj.get(c.sourceNodeId) || [];
      list.push(c.targetNodeId);
      adj.set(c.sourceNodeId, list);
    });

    const visited = new Set<string>();
    const stack = [...marketNodes.map(n => n.id)];
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      (adj.get(id) || []).forEach(nid => {
        if (!visited.has(nid)) stack.push(nid);
      });
    }

    return productNodes.every(p => visited.has(p.id));
  }

  getFilteredProductTemplates(selectedMarketCode?: string): NodeTemplate[] {
    if (!selectedMarketCode) {
      return this.nodeTemplates.filter(t => t.type === NodeType.Product);
    }

    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === selectedMarketCode);
    if (!marketConfig) {
      return this.nodeTemplates.filter(t => t.type === NodeType.Product);
    }

    return this.nodeTemplates.filter(template => {
      if (template.type !== NodeType.Product) return false;
      
      const productType = template.defaultConfig.productType;
      return marketConfig.availableProducts.includes(productType);
    });
  }

  getMarketRestrictions(marketCode: string): string[] {
    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === marketCode);
    return marketConfig?.restrictions || [];
  }

  // Update validation when connections are created
  validateAllConnections(): void {
    this.connections.forEach(connection => {
      const sourceNode = this.nodes.find(n => n.id === connection.sourceNodeId);
      const targetNode = this.nodes.find(n => n.id === connection.targetNodeId);
      
      if (sourceNode && targetNode) {
        const validation = this.validateConnection(sourceNode, targetNode);
        connection.isValid = validation.isValid;
        connection.validationMessage = validation.message;
      }
    });
  }

  // Get available products for selected market
  getAvailableProductsForMarket(): string[] {
    const marketNodes = this.nodes.filter(n => n.type === NodeType.Market);
    if (marketNodes.length === 0) return [];
    
    const selectedMarket = marketNodes[0]; // Use first market node
    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === selectedMarket.config.cityCode);
    return marketConfig?.availableProducts || [];
  }

  // Helper functions for template filtering
  getSelectedMarketCode(): string {
    const marketNodes = this.nodes.filter(n => n.type === NodeType.Market);
    return marketNodes.length > 0 ? marketNodes[0].config.cityCode : '';
  }

  getSelectedMarketName(): string {
    const marketCode = this.getSelectedMarketCode();
    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === marketCode);
    return marketConfig?.marketName || marketCode;
  }

  getFilteredTemplates(templates: NodeTemplate[]): NodeTemplate[] {
    return templates; // Show all templates but mark incompatible ones
  }

  isTemplateCompatible(template: NodeTemplate): boolean {
    if (template.type !== NodeType.Product) return true;
    
    const marketCode = this.getSelectedMarketCode();
    if (!marketCode) return true;
    
    const productType = template.defaultConfig.productType;
    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === marketCode);
    
    return marketConfig?.availableProducts.includes(productType) || false;
  }

  getTemplateTooltip(template: NodeTemplate): string {
    if (template.type !== NodeType.Product) {
      return template.description;
    }
    
    const marketCode = this.getSelectedMarketCode();
    if (!marketCode) {
      return template.description;
    }
    
    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === marketCode);
    const productType = template.defaultConfig.productType;
    
    if (this.isTemplateCompatible(template)) {
      let tooltip = `${template.description} - Compatible con ${this.getSelectedMarketName()}`;
      
      // Add complexity information
      if (this.isComplexProduct(productType) && marketConfig?.isComplexMarket) {
        tooltip += ` [Mercado Complejo - Requiere AVI + Voice Pattern]`;
        
        if (marketConfig.regulatoryInheritance === 'edomex') {
          tooltip += ` [Hereda regulaciones EdoMex]`;
        }
      }
      
      return tooltip;
    } else {
      return `${template.description} - No disponible en ${this.getSelectedMarketName()}`;
    }
  }

  // Check if product type is complex (requires AVI/Voice Pattern)
  isComplexProduct(productType: string): boolean {
    return ['credito_colectivo', 'tanda_colectiva'].includes(productType);
  }

  // Get regulatory inheritance info
  getRegulatoryFramework(marketCode: string): string {
    const marketConfig = this.marketCompatibilityMatrix.find(m => m.marketCode === marketCode);
    
    if (!marketConfig) return 'unknown';
    
    if (marketConfig.regulatoryInheritance === 'master') {
      return 'edomex_master';
    } else if (marketConfig.regulatoryInheritance === 'edomex') {
      return 'edomex_inherited';
    } else if (marketConfig.isComplexMarket) {
      return 'complex_custom';
    } else {
      return 'simple';
    }
  }

  // Get required verification flow for a product in a market
  getRequiredVerificationFlow(marketCode: string, productType: string): string[] {
    const framework = this.getRegulatoryFramework(marketCode);
    const isComplexProduct = this.isComplexProduct(productType);
    
    const verificationSteps: string[] = ['documents'];
    
    if (isComplexProduct && (framework.includes('edomex') || framework === 'complex_custom')) {
      verificationSteps.push('voice_pattern');
      verificationSteps.push('avi_analysis'); 
    }
    
    return verificationSteps;
  }

  private loadSampleFlow() {
    // Load a sample flow for demonstration
    const sampleNodes: FlowNode[] = [
      {
        id: 'market_1',
        type: NodeType.Market,
        name: 'Guadalajara',
        icon: '🏙️',
        color: '#3b82f6',
        position: { x: 50, y: 100 },
        config: {
          cityCode: 'guadalajara',
          name: 'Guadalajara',
          regulations: ['SEMOV', 'Verificación Vehicular'],
          timezone: 'America/Mexico_City',
          language: 'es-MX'
        },
        inputs: [],
        outputs: [{ id: 'output_market_1_0', name: 'Flujo', type: 'output', dataType: 'flow' }]
      },
      {
        id: 'doc_1',
        type: NodeType.Document,
        name: 'INE Vigente',
        icon: '🆔',
        color: '#10b981',
        position: { x: 350, y: 50 },
        config: {
          documentType: 'identification',
          required: true,
          ocrEnabled: true,
          validationRules: ['must_be_valid', 'not_expired']
        },
        inputs: [{ id: 'input_doc_1_0', name: 'Entrada', type: 'input', dataType: 'flow' }],
        outputs: [
          { id: 'output_doc_1_0', name: 'Aprobado', type: 'output', dataType: 'flow' },
          { id: 'output_doc_1_1', name: 'Rechazado', type: 'output', dataType: 'flow' }
        ]
      },
      {
        id: 'product_1',
        type: NodeType.Product,
        name: 'Venta Directa',
        icon: '💰',
        color: '#8b5cf6',
        position: { x: 650, y: 100 },
        config: {
          productType: 'venta_directa',
          complexity: 'simple',
          requiresVerification: false
        },
        inputs: [{ id: 'input_product_1_0', name: 'Entrada', type: 'input', dataType: 'flow' }],
        outputs: [{ id: 'output_product_1_0', name: 'Contrato', type: 'output', dataType: 'flow' }]
      }
    ];

    this.nodes = sampleNodes;
    this.nodeIdCounter = 4;
  }
}
