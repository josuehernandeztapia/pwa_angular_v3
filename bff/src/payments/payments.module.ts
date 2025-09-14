import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ConektaWebhookController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, ConektaWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
