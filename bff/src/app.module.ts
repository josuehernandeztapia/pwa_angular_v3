import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceModule } from './voice/voice.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { CasesModule } from './cases/cases.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    DbModule,
    VoiceModule,
    CasesModule,
  ],
})
export class AppModule {}
