// Real Delivery System Types - Universal 77-day tracking
// Follows architectural specification for PWA & BFF integration

import { IconName } from '../components/shared/icon/icon-definitions';

export type Market = 'aguascalientes' | 'edomex';

export type DeliveryStatus = 
  | 'PO_ISSUED'           // Purchase order issued to China
  | 'IN_PRODUCTION'       // Manufacturing in China (30 days)
  | 'READY_AT_FACTORY'    // Ready for shipment from factory
  | 'AT_ORIGIN_PORT'      // At China port (5 days transport)
  | 'ON_VESSEL'           // Maritime transit (30 days)
  | 'AT_DEST_PORT'        // Arrived at Mexico port
  | 'IN_CUSTOMS'          // Customs clearance (10 days)
  | 'RELEASED'            // Released from customs
  | 'AT_WH'               // At local warehouse (2 days transport)
  | 'READY_FOR_HANDOVER'  // Ready for client delivery
  | 'DELIVERED';          // Delivered to client

export type DeliveryEvent = 
  | 'ISSUE_PO'            // Start the order process
  | 'START_PROD'          // Begin production
  | 'FACTORY_READY'       // Production complete
  | 'LOAD_ORIGIN'         // Loading at China port
  | 'DEPART_VESSEL'       // Ship departure
  | 'ARRIVE_DEST'         // Arrival at Mexico port
  | 'CUSTOMS_CLEAR'       // Customs clearance complete
  | 'RELEASE'             // Released from customs
  | 'ARRIVE_WH'           // Arrived at local warehouse
  | 'SCHEDULE_HANDOVER'   // Schedule client delivery
  | 'CONFIRM_DELIVERY';   // Client confirms receipt

export type Role = 'admin' | 'ops' | 'advisor' | 'client';

// Supporting interfaces
export interface RouteInfo {
  id: string;
  name: string;
  market: Market;
}

export interface ClientRef {
  id: string;
  name: string;
  routeId: string;
  market: Market;
}

export interface ContractRef {
  id: string;
  signedAt?: string;
  amount?: number;
  enganchePercentage?: number;
  enganchePaid?: number;
}

// Core domain models
export interface DeliveryOrder {
  id: string;                    // DO-xxxx format
  contract: ContractRef;
  client: ClientRef;
  market: Market;
  route?: RouteInfo;             // Only for EdoMex
  sku: string;                   // Vehicle model (CON_asientos vs SIN_asientos)
  qty: number;                   // Usually 1
  status: DeliveryStatus;
  eta?: string;                  // ISO date - estimated delivery
  createdAt: string;
  updatedAt: string;
  
  // Additional tracking info
  containerNumber?: string;
  billOfLading?: string;
  estimatedTransitDays: number;  // 77 days standard
  actualTransitDays?: number;    // When completed
}

export interface DeliveryEventLog {
  id: string;
  deliveryId: string;
  at: string;                    // ISO timestamp
  event: DeliveryEvent;
  meta?: {                       // Event-specific metadata
    containerNumber?: string;
    portName?: string;
    vesselName?: string;
    customsReference?: string;
    warehouseLocation?: string;
    deliveryAddress?: string;
    notes?: string;
  };
  actor: Role;                   // Who triggered the event
  actorName?: string;            // Human readable name
}

// FSM Definition and Validation
export interface DeliveryTransition {
  from: DeliveryStatus;
  to: DeliveryStatus;
  event: DeliveryEvent;
  requiredRole?: Role[];
  estimatedDays?: number;        // Standard duration for this transition
  validationRules?: string[];    // Business rules that must be met
}

// FSM State Machine - Universal 77-day timeline
export const DELIVERY_FSM: DeliveryTransition[] = [
  // Initial order creation
  { from: 'PO_ISSUED', to: 'IN_PRODUCTION', event: 'START_PROD', estimatedDays: 0, requiredRole: ['ops', 'admin'] },
  
  // Production phase (30 days)
  { from: 'IN_PRODUCTION', to: 'READY_AT_FACTORY', event: 'FACTORY_READY', estimatedDays: 30, requiredRole: ['ops', 'admin'] },
  
  // Transport to port (5 days)
  { from: 'READY_AT_FACTORY', to: 'AT_ORIGIN_PORT', event: 'LOAD_ORIGIN', estimatedDays: 5, requiredRole: ['ops', 'admin'] },
  
  // Maritime transit (30 days)
  { from: 'AT_ORIGIN_PORT', to: 'ON_VESSEL', event: 'DEPART_VESSEL', estimatedDays: 0, requiredRole: ['ops', 'admin'] },
  { from: 'ON_VESSEL', to: 'AT_DEST_PORT', event: 'ARRIVE_DEST', estimatedDays: 30, requiredRole: ['ops', 'admin'] },
  
  // Customs clearance (10 days)
  { from: 'AT_DEST_PORT', to: 'IN_CUSTOMS', event: 'CUSTOMS_CLEAR', estimatedDays: 0, requiredRole: ['ops', 'admin'] },
  { from: 'IN_CUSTOMS', to: 'RELEASED', event: 'RELEASE', estimatedDays: 10, requiredRole: ['ops', 'admin'] },
  
  // Final delivery (2 days)
  { from: 'RELEASED', to: 'AT_WH', event: 'ARRIVE_WH', estimatedDays: 2, requiredRole: ['ops', 'admin'] },
  { from: 'AT_WH', to: 'READY_FOR_HANDOVER', event: 'SCHEDULE_HANDOVER', estimatedDays: 0, requiredRole: ['ops', 'admin', 'advisor'] },
  { from: 'READY_FOR_HANDOVER', to: 'DELIVERED', event: 'CONFIRM_DELIVERY', estimatedDays: 0, requiredRole: ['ops', 'admin', 'advisor', 'client'] }
];

// Utility functions for FSM validation
export function canTransition(from: DeliveryStatus, to: DeliveryStatus, event: DeliveryEvent): boolean {
  return DELIVERY_FSM.some(t => 
    t.from === from && 
    t.to === to && 
    t.event === event
  );
}

export function getValidTransitions(currentStatus: DeliveryStatus): DeliveryTransition[] {
  return DELIVERY_FSM.filter(t => t.from === currentStatus);
}

export function getRequiredRole(from: DeliveryStatus, to: DeliveryStatus, event: DeliveryEvent): Role[] | undefined {
  const transition = DELIVERY_FSM.find(t => 
    t.from === from && 
    t.to === to && 
    t.event === event
  );
  return transition?.requiredRole;
}

export function calculateETA(createdAt: string, currentStatus: DeliveryStatus): string {
  const baseDate = new Date(createdAt);
  let totalDays = 0;
  
  // Calculate days based on current status
  for (const transition of DELIVERY_FSM) {
    totalDays += transition.estimatedDays || 0;
    if (transition.to === currentStatus) break;
  }
  
  // Add remaining days to complete delivery
  const remainingTransitions = DELIVERY_FSM.filter(t => {
    const currentIndex = DELIVERY_FSM.findIndex(tr => tr.to === currentStatus);
    const transitionIndex = DELIVERY_FSM.findIndex(tr => tr === t);
    return transitionIndex > currentIndex;
  });
  
  const remainingDays = remainingTransitions.reduce((acc, t) => acc + (t.estimatedDays || 0), 0);
  totalDays += remainingDays;
  
  const eta = new Date(baseDate);
  eta.setDate(eta.getDate() + totalDays);
  
  return eta.toISOString();
}

// Status descriptions for UI
export const DELIVERY_STATUS_DESCRIPTIONS: Record<DeliveryStatus, {
  title: string;
  description: string;
  color: string;
  iconType: IconName;
  clientFriendly: string; // Simplified version for clients
}> = {
  PO_ISSUED: {
    title: 'Orden Emitida',
    description: 'Orden de compra enviada a fábrica',
    color: 'var(--accent-amber-500)',
    iconType: 'clipboard-list',
    clientFriendly: 'Procesando pedido'
  },
  IN_PRODUCTION: {
    title: 'En Producción',
    description: 'Vagoneta siendo fabricada en China',
    color: 'var(--accent-amber-500)',
    iconType: 'factory',
    clientFriendly: 'En producción'
  },
  READY_AT_FACTORY: {
    title: 'Lista en Fábrica',
    description: 'Producción completa, lista para envío',
    color: 'var(--accent-amber-500)',
    iconType: 'check-circle',
    clientFriendly: 'En producción'
  },
  AT_ORIGIN_PORT: {
    title: 'En Puerto Origen',
    description: 'En puerto de China para embarque',
    color: 'var(--accent-amber-500)',
    iconType: 'ship',
    clientFriendly: 'En camino'
  },
  ON_VESSEL: {
    title: 'En Tránsito Marítimo',
    description: 'Navegando hacia México',
    color: 'var(--accent-amber-500)',
    iconType: 'waves',
    clientFriendly: 'En camino'
  },
  AT_DEST_PORT: {
    title: 'En Puerto Destino',
    description: 'Arribó a puerto mexicano',
    color: 'var(--accent-amber-500)',
    iconType: 'building-construction',
    clientFriendly: 'En camino'
  },
  IN_CUSTOMS: {
    title: 'En Aduanas',
    description: 'Proceso de liberación aduanal',
    color: 'var(--accent-amber-500)',
    iconType: 'document-text',
    clientFriendly: 'En camino'
  },
  RELEASED: {
    title: 'Liberado',
    description: 'Liberado de aduanas, en transporte local',
    color: 'var(--accent-amber-500)',
    iconType: 'truck',
    clientFriendly: 'En camino'
  },
  AT_WH: {
    title: 'En Bodega',
    description: 'En bodega local, preparando entrega',
    color: 'var(--accent-amber-500)',
    iconType: 'store',
    clientFriendly: 'Lista para entrega'
  },
  READY_FOR_HANDOVER: {
    title: 'Lista para Entrega',
    description: 'Lista para coordinar entrega con cliente',
    color: 'var(--accent-green-400)',
    iconType: 'target',
    clientFriendly: 'Lista para entrega'
  },
  DELIVERED: {
    title: 'Entregada',
    description: 'Entregada exitosamente al cliente',
    color: 'var(--accent-green-500)',
    iconType: 'celebration',
    clientFriendly: 'Entregada'
  }
};

// Event descriptions for timeline
export const DELIVERY_EVENT_DESCRIPTIONS: Record<DeliveryEvent, {
  title: string;
  description: string;
  iconType: string;
}> = {
  ISSUE_PO: {
    title: 'Orden Emitida',
    description: 'Orden de compra enviada a proveedor',
    iconType: 'clipboard-list'
  },
  START_PROD: {
    title: 'Inicio de Producción',
    description: 'Comenzó el proceso de fabricación',
    iconType: 'factory'
  },
  FACTORY_READY: {
    title: 'Lista en Fábrica',
    description: 'Producción completada exitosamente',
    iconType: 'check-circle'
  },
  LOAD_ORIGIN: {
    title: 'Carga en Puerto',
    description: 'Cargada en contenedor para embarque',
    iconType: 'package'
  },
  DEPART_VESSEL: {
    title: 'Embarcación Zarpó',
    description: 'Inició tránsito marítimo hacia México',
    iconType: 'ship'
  },
  ARRIVE_DEST: {
    title: 'Arribó a México',
    description: 'Llegó al puerto de destino',
    iconType: 'building-construction'
  },
  CUSTOMS_CLEAR: {
    title: 'En Proceso Aduanal',
    description: 'Iniciado proceso de liberación',
    iconType: 'document-text'
  },
  RELEASE: {
    title: 'Liberación Aduanal',
    description: 'Liberada de aduanas exitosamente',
    iconType: 'lock-open'
  },
  ARRIVE_WH: {
    title: 'Llegó a Bodega',
    description: 'Arribó a bodega local',
    iconType: 'store'
  },
  SCHEDULE_HANDOVER: {
    title: 'Agendando Entrega',
    description: 'Coordinando entrega con cliente',
    iconType: 'calendar'
  },
  CONFIRM_DELIVERY: {
    title: 'Entrega Confirmada',
    description: 'Cliente confirmó recepción',
    iconType: 'celebration'
  }
};

// API Request/Response types for BFF integration
export interface DeliveryListRequest {
  market?: Market;
  routeId?: string;
  clientId?: string;
  cursor?: string;
  limit?: number;
  status?: DeliveryStatus[];
}

export interface DeliveryListResponse {
  items: DeliveryOrder[];
  nextCursor?: string;
  total: number;
}

export interface DeliveryTransitionRequest {
  event: DeliveryEvent;
  meta?: any;
  notes?: string;
}

export interface DeliveryTransitionResponse {
  success: boolean;
  newStatus: DeliveryStatus;
  newEta?: string;
  message: string;
  validationErrors?: string[];
}

// Client-facing simplified interfaces
export interface ClientDeliveryInfo {
  orderId: string;
  status: 'En producción' | 'En camino' | 'Lista para entrega' | 'Entregada';
  estimatedDate: string;         // User-friendly date like "15 de Mayo (aproximadamente)"
  message: string;               // Simple status message
  canScheduleHandover: boolean;  // If client can schedule delivery
  isDelivered: boolean;
}

// Stock management interfaces (for Phase 2)
export interface StockPosition {
  market: Market;
  sku: string;
  onHand: number;
  onOrder: number;
  forecast: number;
  reorderPoint: number;
  reorderQuantity: number;
  lastUpdated: string;
}

export interface StockAlert {
  id: string;
  market: Market;
  sku: string;
  type: 'REORDER_NEEDED' | 'STOCK_OUT' | 'OVERSTOCK';
  severity: 'low' | 'medium' | 'high';
  message: string;
  createdAt: string;
  resolved: boolean;
}