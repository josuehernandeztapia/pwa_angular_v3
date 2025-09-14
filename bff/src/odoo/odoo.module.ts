import { Module } from '@nestjs/common';
import { OdooController } from './odoo.controller';
import { OdooService } from './odoo.service';

@Module({
  controllers: [OdooController],
  providers: [OdooService],
})
export class OdooModule {}

