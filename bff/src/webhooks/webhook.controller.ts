/**
 * 🔄 Webhook Controller
 * Enterprise webhook endpoints with retry system integration
 */

import { Controller, Post, Body, Headers, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookRetryService, WebhookProvider } from './webhook-retry.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookRetryService: WebhookRetryService) {}

  @Post('conekta')
  @ApiOperation({ 
    summary: 'Conekta payment webhook',
    description: 'Receive and process Conekta payment notifications with retry mechanism'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleConektaWebhook(@Body() payload: any, @Headers() headers: any) {
    try {
      const webhookId = await this.webhookRetryService.queueWebhookEvent(
        WebhookProvider.CONEKTA,
        payload.event || 'unknown',
        payload,
        headers,
        headers['x-conekta-signature']
      );

      return {
        success: true,
        webhookId,
        message: 'Conekta webhook queued for processing',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process Conekta webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('mifiel')
  @ApiOperation({ 
    summary: 'Mifiel signature webhook',
    description: 'Receive and process Mifiel document signature notifications'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleMifieldWebhook(@Body() payload: any, @Headers() headers: any) {
    try {
      const webhookId = await this.webhookRetryService.queueWebhookEvent(
        WebhookProvider.MIFIEL,
        payload.event || 'document.update',
        payload,
        headers
      );

      return {
        success: true,
        webhookId,
        message: 'Mifiel webhook queued for processing',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process Mifiel webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('metamap')
  @ApiOperation({ 
    summary: 'MetaMap KYC webhook',
    description: 'Receive and process MetaMap verification status updates'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleMetamapWebhook(@Body() payload: any, @Headers() headers: any) {
    try {
      const webhookId = await this.webhookRetryService.queueWebhookEvent(
        WebhookProvider.METAMAP,
        `${payload.resource}.${payload.verificationStatus}` || 'verification.update',
        payload,
        headers
      );

      return {
        success: true,
        webhookId,
        message: 'MetaMap webhook queued for processing',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process MetaMap webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('gnv')
  @ApiOperation({ 
    summary: 'GNV station health webhook',
    description: 'Receive and process GNV station health and metrics updates'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleGnvWebhook(@Body() payload: any, @Headers() headers: any) {
    try {
      const webhookId = await this.webhookRetryService.queueWebhookEvent(
        WebhookProvider.GNV,
        `station.${payload.ingestionStatus}` || 'station.health_update',
        payload,
        headers
      );

      return {
        success: true,
        webhookId,
        message: 'GNV webhook queued for processing',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process GNV webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('test')
  @ApiOperation({ 
    summary: 'Test webhook endpoint',
    description: 'Test webhook processing and retry mechanism'
  })
  @ApiResponse({ status: 200, description: 'Test webhook processed' })
  async handleTestWebhook(@Body() payload: any, @Headers() headers: any) {
    try {
      // For testing, we'll queue as GNV type
      const webhookId = await this.webhookRetryService.queueWebhookEvent(
        WebhookProvider.GNV,
        'test.webhook',
        { ...payload, testRequest: true },
        headers
      );

      return {
        success: true,
        webhookId,
        message: 'Test webhook queued for processing',
        testMode: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process test webhook: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get webhook statistics',
    description: 'Retrieve webhook processing statistics and performance metrics'
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getWebhookStats() {
    try {
      const stats = await this.webhookRetryService.getWebhookStats();
      
      return {
        success: true,
        ...stats
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve webhook statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get webhook system health',
    description: 'Check webhook processing system health and reliability metrics'
  })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getWebhookHealth() {
    try {
      const health = await this.webhookRetryService.getWebhookHealth();
      
      return {
        success: true,
        ...health
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get webhook health: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}