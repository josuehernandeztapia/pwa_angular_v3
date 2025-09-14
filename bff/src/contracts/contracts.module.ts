import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { MifielWebhookController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [ContractsController, MifielWebhookController],
  providers: [ContractsService],
})
export class ContractsModule {}
