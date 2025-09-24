import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesDbService } from './deliveries-db.service';
import { PgService } from '../db/pg.service';

@Module({
  controllers: [DeliveriesController],
  providers: [DeliveriesDbService, PgService],
  exports: [DeliveriesDbService]
})
export class DeliveriesModule {}