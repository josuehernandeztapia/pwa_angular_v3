import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('api/bff/payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('orders')
  @ApiOperation({ summary: 'Create payment order (stub)' })
  createOrder(@Body() body: any) {
    return this.payments.createOrder(body);
  }

  @Post('checkouts')
  @ApiOperation({ summary: 'Create checkout session (stub)' })
  createCheckout(@Body() body: any) {
    return this.payments.createCheckout(body);
  }

  @Get('webhook-stats')
  @ApiOperation({ summary: 'Get webhook retry statistics' })
  getWebhookStatistics() {
    return this.payments.getWebhookStatistics();
  }

  @Get('dead-letter-queue')
  @ApiOperation({ summary: 'Get dead letter queue for debugging' })
  getDeadLetterQueue() {
    return this.payments.getDeadLetterQueue();
  }
}

@ApiTags('webhooks')
@Controller('webhooks/conekta')
export class ConektaWebhookController {
  constructor(private payments: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Conekta webhook receiver (stub/HMAC optional)' })
  webhook(@Body() payload: any) {
    return this.payments.handleWebhook(payload);
  }
}

