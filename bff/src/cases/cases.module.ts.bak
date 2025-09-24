import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [ConfigModule, DbModule],
  providers: [CasesService],
  controllers: [CasesController],
})
export class CasesModule {}

