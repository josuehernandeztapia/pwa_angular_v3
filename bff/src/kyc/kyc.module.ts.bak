import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { MetaMapWebhookController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  controllers: [KycController, MetaMapWebhookController],
  providers: [KycService],
})
export class KycModule {}
