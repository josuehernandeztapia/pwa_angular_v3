import { Injectable, Logger } from '@nestjs/common';
import { PgService } from '../db/pg.service';
import {
  DeliveryOrder,
  DeliveryEventLog,
  DeliveryStatus,
  DeliveryEvent,
  Market,
  DeliveryListRequest,
  DeliveryListResponse,
  DeliveryTransitionRequest,
  DeliveryTransitionResponse,
  calculateETA,
  canTransition,
  getValidTransitions,
  DELIVERY_STATUS_DESCRIPTIONS
} from '../../../src/app/models/deliveries';

interface DeliveryOrderDb {
  id: string;
  contract_id: string;
  client_id: string;
  client_name: string;
  route_id?: string;
  market: Market;
  sku: string;
  qty: number;
  status: DeliveryStatus;
  eta?: string;
  created_at: string;
  updated_at: string;
  container_number?: string;
  bill_of_lading?: string;
  estimated_transit_days: number;
  actual_transit_days?: number;
  contract_signed_at?: string;
  contract_amount?: number;
  enganche_percentage?: number;
  enganche_paid?: number;
}

interface DeliveryEventDb {
  id: number;
  delivery_id: string;
  event_at: string;
  event: DeliveryEvent;
  from_status?: DeliveryStatus;
  to_status?: DeliveryStatus;
  metadata?: any;
  notes?: string;
  actor_role: string;
  actor_name?: string;
  actor_id?: string;
}

interface DeliveryEtaHistoryDb {
  id: number;
  delivery_id: string;
  previous_eta?: string;
  new_eta: string;
  status_when_calculated: DeliveryStatus;
  calculation_method: 'automatic' | 'manual' | 'delay_adjustment';
  delay_reason?: string;
  calculated_at: string;
  calculated_by?: string;
}

@Injectable()
export class DeliveriesDbService {
  private readonly logger = new Logger(DeliveriesDbService.name);

  constructor(private pg: PgService) {}

  /**
   * Initialize database with delivery tables
   */
  async initializeDatabase(): Promise<void> {
    try {
      this.logger.log('Initializing delivery ETA database schema...');
      
      // Read and execute the delivery ETA schema
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../../../src/app/database/delivery-eta-schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await this.pg.query(schema);
        this.logger.log('Delivery ETA database schema initialized successfully');
      } else {
        this.logger.warn('Delivery ETA schema file not found, skipping initialization');
      }
    } catch (error) {
      this.logger.error('Failed to initialize delivery database:', error);
      throw error;
    }
  }

  /**
   * List deliveries with filtering and pagination
   */
  async listDeliveries(request: DeliveryListRequest): Promise<DeliveryListResponse> {
    try {
      let query = `
        SELECT d.*, c.name as client_name 
        FROM delivery_orders d 
        LEFT JOIN delivery_clients c ON d.client_id = c.id 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Build dynamic WHERE clause
      if (request.market) {
        query += ` AND d.market = $${paramIndex}`;
        params.push(request.market);
        paramIndex++;
      }

      if (request.routeId) {
        query += ` AND d.route_id = $${paramIndex}`;
        params.push(request.routeId);
        paramIndex++;
      }

      if (request.clientId) {
        query += ` AND d.client_id = $${paramIndex}`;
        params.push(request.clientId);
        paramIndex++;
      }

      if (request.status && request.status.length > 0) {
        query += ` AND d.status = ANY($${paramIndex})`;
        params.push(request.status);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY d.created_at DESC`;
      
      if (request.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(request.limit);
        paramIndex++;
      }

      if (request.cursor) {
        // Simple cursor-based pagination using created_at
        query = query.replace('ORDER BY d.created_at DESC', 
          `AND d.created_at < $${paramIndex} ORDER BY d.created_at DESC`);
        params.push(new Date(request.cursor));
      }

      const result = await this.pg.query<DeliveryOrderDb>(query, params);
      
      // Transform DB results to domain models
      const items = result.rows.map(this.transformDbToDeliveryOrder);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM delivery_orders d WHERE 1=1';
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (request.market) {
        countQuery += ` AND d.market = $${countParamIndex}`;
        countParams.push(request.market);
        countParamIndex++;
      }

      if (request.clientId) {
        countQuery += ` AND d.client_id = $${countParamIndex}`;
        countParams.push(request.clientId);
      }

      const countResult = await this.pg.query<{ total: string }>(countQuery, countParams);
      const total = parseInt(countResult.rows[0]?.total || '0');

      // Generate next cursor
      const nextCursor = items.length > 0 ? items[items.length - 1].createdAt : undefined;

      return {
        items,
        total,
        nextCursor
      };
    } catch (error) {
      this.logger.error('Failed to list deliveries:', error);
      throw error;
    }
  }

  /**
   * Get single delivery by ID
   */
  async getDelivery(id: string): Promise<DeliveryOrder | null> {
    try {
      const result = await this.pg.query<DeliveryOrderDb>(
        'SELECT * FROM delivery_orders WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformDbToDeliveryOrder(result.rows[0]);
    } catch (error) {
      this.logger.error(`Failed to get delivery ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new delivery order
   */
  async createDelivery(order: Partial<DeliveryOrder>): Promise<DeliveryOrder> {
    try {
      const id = order.id || `DO-${Date.now()}`;
      const now = new Date().toISOString();
      const eta = calculateETA(now, order.status || 'PO_ISSUED');

      const result = await this.pg.query<DeliveryOrderDb>(
        `INSERT INTO delivery_orders (
          id, contract_id, client_id, client_name, route_id, market, 
          sku, qty, status, eta, created_at, updated_at,
          estimated_transit_days, container_number, bill_of_lading
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          id,
          order.contract?.id || 'unknown',
          order.client?.id || 'unknown',
          order.client?.name || 'Unknown Client',
          order.route?.id,
          order.market || 'AGS',
          order.sku || 'CON_asientos',
          order.qty || 1,
          order.status || 'PO_ISSUED',
          eta,
          now,
          now,
          order.estimatedTransitDays || 77,
          order.containerNumber,
          order.billOfLading
        ]
      );

      const createdOrder = this.transformDbToDeliveryOrder(result.rows[0]);
      
      this.logger.log(`Created delivery order: ${id}`);
      return createdOrder;
    } catch (error) {
      this.logger.error('Failed to create delivery:', error);
      throw error;
    }
  }

  /**
   * Update delivery status (triggers ETA recalculation)
   */
  async transitionDelivery(
    id: string, 
    request: DeliveryTransitionRequest,
    actorRole: string = 'ops',
    actorName?: string
  ): Promise<DeliveryTransitionResponse> {
    try {
      // Get current delivery
      const current = await this.getDelivery(id);
      if (!current) {
        return {
          success: false,
          newStatus: current?.status || 'PO_ISSUED',
          message: 'Delivery not found',
          validationErrors: ['Delivery order not found']
        };
      }

      // Validate transition
      if (!canTransition(current.status, request.event)) {
        return {
          success: false,
          newStatus: current.status,
          message: 'Invalid status transition',
          validationErrors: [`Cannot perform ${request.event} from status ${current.status}`]
        };
      }

      // Determine new status from event
      const validTransitions = getValidTransitions(current.status);
      const transition = validTransitions.find(t => t.event === request.event);
      
      if (!transition) {
        return {
          success: false,
          newStatus: current.status,
          message: 'No valid transition found',
          validationErrors: [`No transition found for event ${request.event}`]
        };
      }

      const newStatus = transition.to;
      const now = new Date().toISOString();

      // Update delivery status (triggers automatic ETA recalculation)
      await this.pg.query(
        `UPDATE delivery_orders 
         SET status = $1, updated_at = $2 
         WHERE id = $3`,
        [newStatus, now, id]
      );

      // Log the event with metadata
      await this.pg.query(
        `INSERT INTO delivery_events (
          delivery_id, event, from_status, to_status, metadata, notes,
          actor_role, actor_name, event_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          request.event,
          current.status,
          newStatus,
          JSON.stringify(request.meta || {}),
          request.notes,
          actorRole,
          actorName,
          now
        ]
      );

      // Get updated delivery to return new ETA
      const updated = await this.getDelivery(id);
      
      this.logger.log(`Delivery ${id} transitioned from ${current.status} to ${newStatus}`);
      
      return {
        success: true,
        newStatus,
        newEta: updated?.eta,
        message: `Successfully transitioned to ${DELIVERY_STATUS_DESCRIPTIONS[newStatus].title}`
      };
    } catch (error) {
      this.logger.error(`Failed to transition delivery ${id}:`, error);
      return {
        success: false,
        newStatus: current?.status || 'PO_ISSUED',
        message: 'Internal server error',
        validationErrors: [error.message]
      };
    }
  }

  /**
   * Get delivery events history
   */
  async getDeliveryEvents(id: string): Promise<DeliveryEventLog[]> {
    try {
      const result = await this.pg.query<DeliveryEventDb>(
        `SELECT * FROM delivery_events 
         WHERE delivery_id = $1 
         ORDER BY event_at ASC`,
        [id]
      );

      return result.rows.map(row => ({
        id: row.id.toString(),
        deliveryId: row.delivery_id,
        at: row.event_at,
        event: row.event,
        meta: row.metadata || {},
        actor: row.actor_role as any,
        actorName: row.actor_name
      }));
    } catch (error) {
      this.logger.error(`Failed to get delivery events for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get ETA history for a delivery
   */
  async getEtaHistory(id: string): Promise<DeliveryEtaHistoryDb[]> {
    try {
      const result = await this.pg.query<DeliveryEtaHistoryDb>(
        `SELECT * FROM delivery_eta_history 
         WHERE delivery_id = $1 
         ORDER BY calculated_at ASC`,
        [id]
      );

      return result.rows;
    } catch (error) {
      this.logger.error(`Failed to get ETA history for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Manual ETA adjustment (for delays or other factors)
   */
  async adjustEta(
    id: string, 
    newEta: string, 
    reason: string,
    adjustedBy: string
  ): Promise<void> {
    try {
      const current = await this.getDelivery(id);
      if (!current) {
        throw new Error('Delivery not found');
      }

      await this.pg.query(
        `UPDATE delivery_orders SET eta = $1, updated_at = $2 WHERE id = $3`,
        [newEta, new Date().toISOString(), id]
      );

      // Log the manual ETA adjustment
      await this.pg.query(
        `INSERT INTO delivery_eta_history (
          delivery_id, previous_eta, new_eta, status_when_calculated, 
          calculation_method, delay_reason, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, current.eta, newEta, current.status, 'manual', reason, adjustedBy]
      );

      this.logger.log(`Manual ETA adjustment for delivery ${id}: ${current.eta} -> ${newEta}`);
    } catch (error) {
      this.logger.error(`Failed to adjust ETA for delivery ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(market?: Market, routeId?: string): Promise<any> {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'PO_ISSUED' THEN 1 END) as po_issued,
          COUNT(CASE WHEN status = 'IN_PRODUCTION' THEN 1 END) as in_production,
          COUNT(CASE WHEN status = 'READY_AT_FACTORY' THEN 1 END) as ready_at_factory,
          COUNT(CASE WHEN status = 'AT_ORIGIN_PORT' THEN 1 END) as at_origin_port,
          COUNT(CASE WHEN status = 'ON_VESSEL' THEN 1 END) as on_vessel,
          COUNT(CASE WHEN status = 'AT_DEST_PORT' THEN 1 END) as at_dest_port,
          COUNT(CASE WHEN status = 'IN_CUSTOMS' THEN 1 END) as in_customs,
          COUNT(CASE WHEN status = 'RELEASED' THEN 1 END) as released,
          COUNT(CASE WHEN status = 'AT_WH' THEN 1 END) as at_wh,
          COUNT(CASE WHEN status = 'READY_FOR_HANDOVER' THEN 1 END) as ready_for_handover,
          COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered,
          AVG(actual_transit_days) as average_transit_days,
          COUNT(CASE WHEN actual_transit_days <= estimated_transit_days THEN 1 END) as on_time_deliveries
        FROM delivery_orders
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (market) {
        query += ` AND market = $${paramIndex}`;
        params.push(market);
        paramIndex++;
      }

      if (routeId) {
        query += ` AND route_id = $${paramIndex}`;
        params.push(routeId);
      }

      const result = await this.pg.query(query, params);
      const stats = result.rows[0];

      // Transform to expected format
      return {
        totalOrders: parseInt(stats.total_orders),
        byStatus: {
          PO_ISSUED: parseInt(stats.po_issued),
          IN_PRODUCTION: parseInt(stats.in_production),
          READY_AT_FACTORY: parseInt(stats.ready_at_factory),
          AT_ORIGIN_PORT: parseInt(stats.at_origin_port),
          ON_VESSEL: parseInt(stats.on_vessel),
          AT_DEST_PORT: parseInt(stats.at_dest_port),
          IN_CUSTOMS: parseInt(stats.in_customs),
          RELEASED: parseInt(stats.released),
          AT_WH: parseInt(stats.at_wh),
          READY_FOR_HANDOVER: parseInt(stats.ready_for_handover),
          DELIVERED: parseInt(stats.delivered)
        },
        averageTransitDays: parseFloat(stats.average_transit_days) || 0,
        onTimeDeliveries: parseInt(stats.on_time_deliveries),
        delayedOrders: [] // Could be implemented as separate query if needed
      };
    } catch (error) {
      this.logger.error('Failed to get delivery stats:', error);
      throw error;
    }
  }

  /**
   * Transform database row to DeliveryOrder domain model
   */
  private transformDbToDeliveryOrder(row: DeliveryOrderDb): DeliveryOrder {
    return {
      id: row.id,
      contract: {
        id: row.contract_id,
        signedAt: row.contract_signed_at,
        amount: row.contract_amount,
        enganchePercentage: row.enganche_percentage,
        enganchePaid: row.enganche_paid
      },
      client: {
        id: row.client_id,
        name: row.client_name,
        routeId: row.route_id || '',
        market: row.market
      },
      market: row.market,
      route: row.route_id ? {
        id: row.route_id,
        name: '', // Would need join to get route name
        market: row.market
      } : undefined,
      sku: row.sku,
      qty: row.qty,
      status: row.status,
      eta: row.eta,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      containerNumber: row.container_number,
      billOfLading: row.bill_of_lading,
      estimatedTransitDays: row.estimated_transit_days,
      actualTransitDays: row.actual_transit_days
    };
  }
}