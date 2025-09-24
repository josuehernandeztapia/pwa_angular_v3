/**
 * 🛡️ KIBAN Risk Evaluation Module
 * Enterprise risk assessment with NEON persistence
 */

import { Module } from '@nestjs/common';
import { KibanRiskService } from './kiban-risk.service';
import { KibanRiskController } from './kiban-risk.controller';
import { NeonModule } from '../db/neon.module';

@Module({
  imports: [NeonModule],
  controllers: [KibanRiskController],
  providers: [KibanRiskService],
  exports: [KibanRiskService]
})
export class KibanModule {}