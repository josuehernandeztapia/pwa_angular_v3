import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class PgService implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  constructor(private cfg: ConfigService) {}

  onModuleInit() {
    const url = this.cfg.get<string>('NEON_DATABASE_URL');
    if (!url) return; // Optional in local/dev
    this.pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
  }

  async onModuleDestroy() {
    await this.pool?.end().catch(()=>undefined);
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    if (!this.pool) throw new Error('Database not configured');
    const res = await this.pool.query(text, params);
    return { rows: res.rows as T[] };
  }
}

