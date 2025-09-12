import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PgService } from './pg.service';

@Module({
  imports: [ConfigModule],
  providers: [PgService],
  exports: [PgService],
})
export class DbModule {}

