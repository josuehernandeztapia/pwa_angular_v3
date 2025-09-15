import { Body, Controller, Get, Param, Post, Query, Put } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { DeliveriesDbService } from './deliveries-db.service';
import {
  DeliveryListRequest,
  DeliveryTransitionRequest,
  Market,
  DeliveryStatus
} from '../../../src/app/models/deliveries';

@ApiTags('deliveries')
@Controller('api/v1/deliveries')
export class DeliveriesController {
  constructor(private deliveriesDb: DeliveriesDbService) {}

  /**
   * List deliveries with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'List deliveries with filtering and pagination' })
  @ApiQuery({ name: 'market', required: false, enum: ['AGS', 'EdoMex'] })
  @ApiQuery({ name: 'routeId', required: false, type: String })
  @ApiQuery({ name: 'clientId', required: false, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Comma-separated status list' })
  async listDeliveries(
    @Query('market') market?: Market,
    @Query('routeId') routeId?: string,
    @Query('clientId') clientId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const request: DeliveryListRequest = {
      market,
      routeId,
      clientId,
      cursor,
      limit: limit || 50,
      status: status ? status.split(',') as DeliveryStatus[] : undefined
    };

    return this.deliveriesDb.listDeliveries(request);
  }

  /**
   * Get single delivery by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiParam({ name: 'id', description: 'Delivery order ID (DO-xxxx format)' })
  async getDelivery(@Param('id') id: string) {
    const delivery = await this.deliveriesDb.getDelivery(id);
    if (!delivery) {
      throw new Error('Delivery not found');
    }
    return delivery;
  }

  /**
   * Create new delivery order
   */
  @Post()
  @ApiOperation({ summary: 'Create new delivery order' })
  @ApiBody({
    description: 'Delivery order data',
    schema: {
      type: 'object',
      properties: {
        contract: { type: 'object' },
        client: { type: 'object' },
        market: { type: 'string', enum: ['AGS', 'EdoMex'] },
        sku: { type: 'string' },
        qty: { type: 'number' },
        status: { type: 'string' }
      }
    }
  })
  async createDelivery(@Body() orderData: any) {
    return this.deliveriesDb.createDelivery(orderData);
  }

  /**
   * Transition delivery to next state
   */
  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition delivery status with FSM validation' })
  @ApiParam({ name: 'id', description: 'Delivery order ID' })
  @ApiBody({ 
    type: Object,
    description: 'Transition request with event and metadata',
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string' },
        meta: { type: 'object' },
        notes: { type: 'string' }
      },
      required: ['event']
    }
  })
  async transitionDelivery(
    @Param('id') id: string,
    @Body() request: DeliveryTransitionRequest,
    // In production, would get from JWT token or session
    @Query('actorRole') actorRole: string = 'ops',
    @Query('actorName') actorName?: string
  ) {
    return this.deliveriesDb.transitionDelivery(id, request, actorRole, actorName);
  }

  /**
   * Get delivery event timeline
   */
  @Get(':id/events')
  @ApiOperation({ summary: 'Get delivery event timeline/history' })
  @ApiParam({ name: 'id', description: 'Delivery order ID' })
  async getDeliveryEvents(@Param('id') id: string) {
    return this.deliveriesDb.getDeliveryEvents(id);
  }

  /**
   * Get ETA calculation history
   */
  @Get(':id/eta-history')
  @ApiOperation({ summary: 'Get ETA calculation and adjustment history' })
  @ApiParam({ name: 'id', description: 'Delivery order ID' })
  async getEtaHistory(@Param('id') id: string) {
    return this.deliveriesDb.getEtaHistory(id);
  }

  /**
   * Manual ETA adjustment
   */
  @Put(':id/eta')
  @ApiOperation({ summary: 'Manually adjust delivery ETA' })
  @ApiParam({ name: 'id', description: 'Delivery order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newEta: { type: 'string', format: 'date-time' },
        reason: { type: 'string' },
        adjustedBy: { type: 'string' }
      },
      required: ['newEta', 'reason', 'adjustedBy']
    }
  })
  async adjustEta(
    @Param('id') id: string,
    @Body() body: { newEta: string; reason: string; adjustedBy: string }
  ) {
    await this.deliveriesDb.adjustEta(id, body.newEta, body.reason, body.adjustedBy);
    return { success: true, message: 'ETA adjusted successfully' };
  }

  /**
   * Get delivery statistics for dashboard
   */
  @Get('/stats/summary')
  @ApiOperation({ summary: 'Get delivery statistics for ops dashboard' })
  @ApiQuery({ name: 'market', required: false, enum: ['AGS', 'EdoMex'] })
  @ApiQuery({ name: 'routeId', required: false, type: String })
  async getDeliveryStats(
    @Query('market') market?: Market,
    @Query('routeId') routeId?: string
  ) {
    return this.deliveriesDb.getDeliveryStats(market, routeId);
  }

  /**
   * Get deliveries ready for handover (scheduling)
   */
  @Get('/ready-for-handover')
  @ApiOperation({ summary: 'Get deliveries ready for handover/scheduling' })
  @ApiQuery({ name: 'market', required: false, enum: ['AGS', 'EdoMex'] })
  async getReadyForHandover(@Query('market') market?: Market) {
    const request: DeliveryListRequest = {
      market,
      status: ['READY_FOR_HANDOVER'],
      limit: 100
    };
    
    const result = await this.deliveriesDb.listDeliveries(request);
    return result.items;
  }

  /**
   * Get deliveries by client (simplified for client view)
   */
  @Get('/client/:clientId')
  @ApiOperation({ summary: 'Get client deliveries with simplified status' })
  @ApiParam({ name: 'clientId', description: 'Client ID' })
  async getClientDeliveries(@Param('clientId') clientId: string) {
    const request: DeliveryListRequest = {
      clientId,
      limit: 50
    };
    
    const result = await this.deliveriesDb.listDeliveries(request);
    
    // Transform to client-friendly format
    const clientDeliveries = result.items.map(order => ({
      orderId: order.id,
      status: this.getClientFriendlyStatus(order.status),
      estimatedDate: this.formatClientDate(order.eta),
      message: this.getClientMessage(order.status, order.eta),
      canScheduleHandover: order.status === 'READY_FOR_HANDOVER',
      isDelivered: order.status === 'DELIVERED'
    }));

    return clientDeliveries;
  }

  /**
   * Schedule delivery handover
   */
  @Post(':id/schedule')
  @ApiOperation({ summary: 'Schedule delivery handover with client' })
  @ApiParam({ name: 'id', description: 'Delivery order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scheduledDate: { type: 'string', format: 'date-time' },
        notes: { type: 'string' }
      },
      required: ['scheduledDate']
    }
  })
  async scheduleHandover(
    @Param('id') id: string,
    @Body() body: { scheduledDate: string; notes?: string }
  ) {
    // This would typically create a calendar event or notification
    // For now, just transition to scheduled state with metadata
    const request: DeliveryTransitionRequest = {
      event: 'SCHEDULE_HANDOVER',
      meta: {
        scheduledDate: body.scheduledDate,
        notes: body.notes
      },
      notes: `Delivery scheduled for ${body.scheduledDate}`
    };

    const result = await this.deliveriesDb.transitionDelivery(id, request, 'advisor');
    
    if (result.success) {
      return {
        success: true,
        message: 'Delivery handover scheduled successfully',
        scheduledDate: body.scheduledDate
      };
    }

    throw new Error(result.message || 'Failed to schedule handover');
  }

  /**
   * Initialize database (dev/setup endpoint)
   */
  @Post('/admin/init-db')
  @ApiOperation({ summary: 'Initialize delivery database schema (admin only)' })
  async initializeDatabase() {
    try {
      await this.deliveriesDb.initializeDatabase();
      return { success: true, message: 'Database initialized successfully' };
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  // Helper methods for client-friendly responses
  private getClientFriendlyStatus(status: DeliveryStatus): string {
    switch (status) {
      case 'PO_ISSUED':
      case 'IN_PRODUCTION':
      case 'READY_AT_FACTORY':
        return 'En producción';
      
      case 'AT_ORIGIN_PORT':
      case 'ON_VESSEL':
      case 'AT_DEST_PORT':
      case 'IN_CUSTOMS':
      case 'RELEASED':
        return 'En camino';
      
      case 'AT_WH':
      case 'READY_FOR_HANDOVER':
        return 'Lista para entrega';
      
      case 'DELIVERED':
        return 'Entregada';
      
      default:
        return 'En proceso';
    }
  }

  private formatClientDate(eta?: string): string {
    if (!eta) return 'Fecha por confirmar';
    
    const date = new Date(eta);
    const formatter = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long'
    });
    
    return `${formatter.format(date)} (aproximadamente)`;
  }

  private getClientMessage(status: DeliveryStatus, eta?: string): string {
    switch (status) {
      case 'PO_ISSUED':
      case 'IN_PRODUCTION':
      case 'READY_AT_FACTORY':
        return 'Tu vagoneta se está fabricando. Te notificaremos cuando esté lista.';
      
      case 'AT_ORIGIN_PORT':
      case 'ON_VESSEL':
      case 'AT_DEST_PORT':
      case 'IN_CUSTOMS':
      case 'RELEASED':
        return `Tu vagoneta está en camino. Llegará ${this.formatClientDate(eta)}.`;
      
      case 'AT_WH':
      case 'READY_FOR_HANDOVER':
        return 'Tu vagoneta está lista. Te contactaremos para coordinar la entrega.';
      
      case 'DELIVERED':
        return '¡Tu vagoneta ha sido entregada exitosamente!';
      
      default:
        return 'Procesando tu pedido...';
    }
  }
}