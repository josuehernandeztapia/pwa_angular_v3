import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/icon/icon.component';
import { IconName } from '../../../shared/icon/icon-definitions';
import { Subject } from 'rxjs';

export interface FlowNode {
  id: string;
  type: NodeType;
  name: string;
  icon?: string;
  iconType?: string;
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
  icon?: string;
  iconType?: string;
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
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './flow-builder.component.html',
  styleUrls: ['./flow-builder.component.scss'],
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
      restrictions: ['No tanda colectiva', 'Regulación SEMOV especial', 'Hereda regulaciones EdoMex para Crédito Colectivo'],
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
      restrictions: ['Regulación estatal NL', 'Hereda regulaciones EdoMex para Crédito Colectivo'],
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
      iconType: 'building-office',
      color: 'var(--accent-primary)',
      category: 'Mercados',
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
      iconType: 'document-text',
      color: 'var(--color-border-muted)',
      category: 'Documentos',
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
      iconType: 'document-report',
      color: 'var(--color-border-muted)',
      category: 'Documentos',
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
      iconType: 'document',
      color: 'var(--color-border-muted)',
      category: 'Documentos',
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
      iconType: 'microphone',
      color: 'var(--accent-muted)',
      category: 'Verificaciones',
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
      iconType: 'monitor',
      color: 'var(--accent-muted)',
      category: 'Verificaciones',
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
      iconType: 'currency-dollar',
      color: 'var(--color-success)',
      category: 'Productos',
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
      iconType: 'bank',
      color: 'var(--accent-primary)',
      category: 'Productos',
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
      iconType: 'chart',
      color: 'var(--accent-muted)',
      category: 'Productos',
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
      iconType: 'collection',
      color: 'var(--accent-primary)',
      category: 'Productos',
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
      compatibleWith: ['edomex', 'guadalajara'] //  NO disponible en Aguascalientes
    },

    {
      type: NodeType.Product,
      name: 'Tanda Colectiva',
      iconType: 'sparkles',
      color: 'var(--accent-muted)',
      category: 'Productos',
      description: 'Sistema de tanda para ahorro grupal',
      defaultConfig: {
        productType: 'tanda_colectiva',
        complexity: 'complex',
        requiresVerification: true,
        participants: 12
      },
      inputs: [{ name: 'Entrada', type: 'input', dataType: 'flow' }],
      outputs: [{ name: 'Contrato', type: 'output', dataType: 'flow' }],
      compatibleWith: ['edomex'] //  Solo EdoMex
    }
    ,
    // Business rule nodes
    {
      type: NodeType.BusinessRule,
      name: 'Regla de Negocio',
      iconType: 'lightbulb',
      color: 'var(--color-warning)',
      category: 'Reglas',
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
      iconType: 'target',
      color: 'var(--color-border-muted)',
      category: 'Rutas',
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
    const x = (event.clientX - rect.left) / this.zoomLevel;
    const y = (event.clientY - rect.top) / this.zoomLevel;

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
      icon: template.icon ?? template.iconType ?? '',
      iconType: template.iconType ?? template.icon ?? '',
      color: template.color ?? 'var(--color-border-muted)',
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

  openGenerationModal() {
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
          message: ` ${productNames[productType as keyof typeof productNames]} no disponible en ${marketConfig.marketName}` 
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
        iconType: 'building-office',
        color: 'var(--accent-primary)',
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
        iconType: 'document-text',
        color: 'var(--color-border-muted)',
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
        iconType: 'currency-dollar',
        color: 'var(--color-success)',
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

  getTemplateIconName(template: NodeTemplate): IconName {
    const iconName = template.iconType || template.icon || 'document';
    return iconName as IconName;
  }

  getNodeIconName(node: FlowNode): IconName {
    const iconName = node.iconType || node.icon || 'document';
    return iconName as IconName;
  }
}
