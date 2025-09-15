/**
 * 📊 NEON PostgreSQL Module
 * Enterprise database module with connection pooling
 */

import { Module, Global } from '@nestjs/common';
import { NeonService } from './neon.service';

@Global()
@Module({
  providers: [NeonService],
  exports: [NeonService]
})
export class NeonModule {}