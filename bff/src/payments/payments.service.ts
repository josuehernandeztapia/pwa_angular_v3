import { Injectable, Logger } from '@nestjs/common';
import { webhookRetryService } from '../utils/webhook-retry.utils';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async createOrder(body: any) {
    this.logger.log(`Create order: ${JSON.stringify(body).slice(0, 500)}`);
    const orderId = `ord_${Date.now()}`;
    
    // Schedule webhook notification to external systems (ODOO, etc.)
    if (body.notify_external) {
      const webhookPayload = {
        event: 'order.created',
        orderId: orderId,
        data: body,
        timestamp: new Date().toISOString()
      };
      
      // Schedule webhooks to external systems with retry
      if (body.odoo_webhook_url) {
        await webhookRetryService.scheduleWebhook(
          body.odoo_webhook_url,
          webhookPayload,
          { 'Authorization': `Bearer ${body.odoo_auth_token || ''}` },
          'ODOO'
        );
      }
    }
    
    return { ok: true, orderId };
  }

  async createCheckout(body: any) {
    this.logger.log(`Create checkout: ${JSON.stringify(body).slice(0, 500)}`);
    const checkoutId = `checkout_${Date.now()}`;
    
    // Schedule webhook for checkout creation
    if (body.webhook_url) {
      const webhookPayload = {
        event: 'checkout.created',
        checkoutId: checkoutId,
        data: body,
        timestamp: new Date().toISOString()
      };
      
      await webhookRetryService.scheduleWebhook(
        body.webhook_url,
        webhookPayload,
        {},
        'CONEKTA'
      );
    }
    
    return { ok: true, checkoutUrl: `https://payments.local/checkout/${checkoutId}` };
  }

  async handleWebhook(payload: any) {
    this.logger.log(`Conekta webhook: ${JSON.stringify(payload).slice(0, 500)}`);
    
    // Process webhook and schedule notifications to internal systems
    const processedData = this.processWebhookEvent(payload);
    
    // Schedule internal webhooks with retry if needed
    if (processedData.shouldNotifyInternal) {
      const internalWebhookPayload = {
        event: 'payment.processed',
        source: 'conekta',
        data: processedData,
        timestamp: new Date().toISOString()
      };
      
      // Notify internal systems (dashboard, notifications, etc.)
      await webhookRetryService.scheduleWebhook(
        `${process.env.INTERNAL_API_URL || 'http://localhost:4000'}/api/internal/payment-events`,
        internalWebhookPayload,
        { 'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || ''}` },
        'CONEKTA'
      );
    }
    
    return { received: true, processed: processedData.success };
  }

  private processWebhookEvent(payload: any): { success: boolean; shouldNotifyInternal: boolean; data: any } {
    try {
      // Process different webhook events
      switch (payload.type) {
        case 'order.paid':
          return {
            success: true,
            shouldNotifyInternal: true,
            data: {
              orderId: payload.data?.object?.id,
              amount: payload.data?.object?.amount,
              status: 'paid',
              currency: payload.data?.object?.currency
            }
          };
          
        case 'order.canceled':
          return {
            success: true,
            shouldNotifyInternal: true,
            data: {
              orderId: payload.data?.object?.id,
              status: 'canceled',
              reason: payload.data?.object?.failure_code
            }
          };
          
        default:
          this.logger.warn(`Unknown webhook event type: ${payload.type}`);
          return {
            success: true,
            shouldNotifyInternal: false,
            data: payload
          };
      }
    } catch (error) {
      this.logger.error('Error processing webhook event:', error);
      return {
        success: false,
        shouldNotifyInternal: false,
        data: { error: error.message }
      };
    }
  }

  /**
   * Get webhook retry statistics for monitoring
   */
  getWebhookStatistics() {
    return webhookRetryService.getRetryStatistics();
  }

  /**
   * Get dead letter queue for debugging
   */
  getDeadLetterQueue() {
    return webhookRetryService.getDeadLetterQueue();
  }
}

