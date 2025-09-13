import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgService } from '../db/pg.service';

export interface CaseRecord {
  id: string;
  status: 'open' | 'need_info' | 'in_progress' | 'solved';
  created_at: string;
}

export interface CaseAttachment {
  id: string;
  case_id: string;
  type: 'plate' | 'vin' | 'odometer' | 'evidence' | 'other';
  filename: string;
  content_type: string;
  url: string;
  ocr_confidence?: number;
  created_at: string;
}

@Injectable()
export class CasesService implements OnModuleInit {
  private readonly logger = new Logger(CasesService.name);
  private memoryCases = new Map<string, CaseRecord>();
  private memoryAttachments = new Map<string, CaseAttachment>();

  constructor(private cfg: ConfigService, private pg: PgService) {}

  async onModuleInit() {
    // Best-effort schema init when DB is configured
    try {
      await this.ensureSchema();
    } catch (err) {
      this.logger.warn(`Skipping schema init (DB optional in dev): ${(err as Error).message}`);
    }
  }

  private async ensureSchema() {
    // Create minimal tables if not present (idempotent)
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        status TEXT CHECK (status IN ('open','need_info','in_progress','solved')) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS case_attachments (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        type TEXT CHECK (type IN ('plate','vin','odometer','evidence','other')) NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        url TEXT NOT NULL,
        ocr_confidence NUMERIC(5,4),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
    `);
  }

  private hasDb(): boolean {
    try {
      // If no connection string configured, PgService throws on query
      return !!this.cfg.get<string>('NEON_DATABASE_URL');
    } catch {
      return false;
    }
  }

  async createCase(): Promise<CaseRecord> {
    const id = `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const record: CaseRecord = { id, status: 'open', created_at: now };
    if (this.hasDb()) {
      await this.pg.query('INSERT INTO cases(id, status) VALUES($1, $2)', [id, 'open']);
    } else {
      this.memoryCases.set(id, record);
    }
    return record;
  }

  async getCase(id: string): Promise<CaseRecord | null> {
    if (this.hasDb()) {
      const { rows } = await this.pg.query<CaseRecord>('SELECT id, status, created_at FROM cases WHERE id=$1', [id]);
      return rows[0] || null;
    }
    return this.memoryCases.get(id) || null;
  }

  async updateCaseStatus(id: string, status: CaseRecord['status']): Promise<void> {
    if (this.hasDb()) {
      await this.pg.query('UPDATE cases SET status=$1 WHERE id=$2', [status, id]);
    } else {
      const cur = this.memoryCases.get(id);
      if (cur) this.memoryCases.set(id, { ...cur, status });
    }
  }

  async presignAttachment(caseId: string, opts: { type: CaseAttachment['type']; filename: string; contentType: string }) {
    // Stub presign: return a pseudo-URL for local/dev and a fields object compatible with S3 form upload
    const uploadId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const key = `cases/${caseId}/${uploadId}_${opts.filename}`;
    const bucket = this.cfg.get<string>('AWS_S3_BUCKET') || 'local-dev-bucket';
    const region = this.cfg.get<string>('AWS_REGION') || 'us-east-1';
    const url = this.cfg.get<string>('S3_UPLOAD_URL') || `https://s3.${region}.amazonaws.com/${bucket}`;

    // Note: for local stub we don't sign; in prod, replace with AWS SDK v3 S3 presign
    const fields = {
      key,
      'Content-Type': opts.contentType,
      acl: 'public-read',
      // policy/signature would be added in real presign
    } as Record<string, string>;

    return { uploadId, url, fields, key, bucket, region };
  }

  async registerAttachment(meta: {
    caseId: string;
    uploadId: string;
    type: CaseAttachment['type'];
    filename: string;
    contentType: string;
    publicUrl: string;
  }): Promise<CaseAttachment> {
    const id = meta.uploadId;
    const now = new Date().toISOString();
    const row: CaseAttachment = {
      id,
      case_id: meta.caseId,
      type: meta.type,
      filename: meta.filename,
      content_type: meta.contentType,
      url: meta.publicUrl,
      created_at: now,
    };
    if (this.hasDb()) {
      await this.pg.query(
        'INSERT INTO case_attachments(id, case_id, type, filename, content_type, url) VALUES($1,$2,$3,$4,$5,$6)',
        [id, meta.caseId, meta.type, meta.filename, meta.contentType, meta.publicUrl]
      );
    } else {
      this.memoryAttachments.set(id, row);
    }
    return row;
  }

  async ocrAttachment(attachmentId: string, forceLow = false): Promise<{ confidence: number; missing?: string[] }> {
    // Stub OCR: derive confidence from name pattern to make tests deterministic
    const att = this.memoryAttachments.get(attachmentId);
    const name = att?.filename || '';
    let confidence = 0.9;
    const missing: string[] = [];
    if (/low|blurry|bad/i.test(name) || forceLow) confidence = 0.62;
    if (/novin/i.test(name)) missing.push('vin');
    if (/noodo/i.test(name)) missing.push('odometer');
    if (/noevi/i.test(name)) missing.push('evidence');

    if (this.hasDb()) {
      await this.pg.query('UPDATE case_attachments SET ocr_confidence=$1 WHERE id=$2', [confidence, attachmentId]);
    } else if (att) {
      this.memoryAttachments.set(attachmentId, { ...att, ocr_confidence: confidence });
    }
    return { confidence, missing: missing.length ? missing : undefined };
  }
}

