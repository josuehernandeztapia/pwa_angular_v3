/**
 * 🔄 Webhooks Module  
 * Enterprise webhook processing with retry mechanism
 */

import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookRetryService } from './webhook-retry.service';
import { NeonModule } from '../db/neon.module';

@Module({
  imports: [NeonModule],
  controllers: [WebhookController],
  providers: [WebhookRetryService],
  exports: [WebhookRetryService]
})
export class WebhooksModule {}