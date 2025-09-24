import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceModule } from './voice/voice.module';
import { DbModule } from './db/db.module';
import { NeonModule } from './db/neon.module';
import { HealthModule } from './health/health.module';
import { CasesModule } from './cases/cases.module';
import { OdooModule } from './odoo/odoo.module';
import { GnvModule } from './gnv/gnv.module';
import { KycModule } from './kyc/kyc.module';
import { PaymentsModule } from './payments/payments.module';
import { ContractsModule } from './contracts/contracts.module';
import { EventsModule } from './events/events.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { KibanModule } from './kiban/kiban.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    DbModule,
    NeonModule,
    VoiceModule,
    CasesModule,
    OdooModule,
    GnvModule,
    KycModule,
    PaymentsModule,
    ContractsModule,
    EventsModule,
    DeliveriesModule,
    KibanModule,
    WebhooksModule,
  ],
})
export class AppModule {}
