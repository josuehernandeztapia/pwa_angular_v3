import { Injectable, Logger } from '@nestjs/common';
import { PgService } from '../db/pg.service';

export type VoiceEvalInsert = {
  questionId?: string; contextId?: string;
  latencyIndex: number; pitchVar: number;
  disfluencyRate: number; energyStability: number; honestyLexicon: number;
  voiceScore: number; decision: 'GO'|'REVIEW'|'NO-GO';
  flags: string[]; transcript?: string; words?: string[];
};

@Injectable()
export class VoiceEvalRepo {
  private readonly logger = new Logger(VoiceEvalRepo.name);
  constructor(private pg: PgService) {}

  async insertOne(v: VoiceEvalInsert) {
    try {
      const sql = `
        INSERT INTO voice_evaluations
        (question_id, context_id, latency_index, pitch_var, disfluency_rate, energy_stability, honesty_lexicon,
         voice_score, decision, flags, transcript, words)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb)
        RETURNING id, created_at;
      `;
      const params = [
        v.questionId || null, v.contextId || null,
        v.latencyIndex, v.pitchVar, v.disfluencyRate, v.energyStability, v.honestyLexicon,
        v.voiceScore, v.decision, JSON.stringify(v.flags || []),
        v.transcript || null, JSON.stringify(v.words || [])
      ];
      const { rows } = await this.pg.query(sql, params);
      return rows[0];
    } catch (e) {
      this.logger.warn(`Skipping DB insert (not configured or failed): ${e.message}`);
      return null;
    }
  }

  async listByContext(contextId: string, limit = 50, offset = 0) {
    try {
      const sql = `
        SELECT id, created_at, question_id, context_id,
               latency_index, pitch_var, disfluency_rate, energy_stability, honesty_lexicon,
               voice_score, decision, flags
        FROM voice_evaluations
        WHERE context_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
      `;
      const { rows } = await this.pg.query(sql, [contextId, limit, offset]);
      return rows;
    } catch (e) {
      this.logger.warn(`Query failed or DB not configured: ${e.message}`);
      return [];
    }
  }

  async stats(params: { contextId?: string; sinceHours?: number; groupBy?: 'decision'|'question' }) {
    try {
      const contextId = params.contextId || null;
      const hours = Math.max(1, Math.min(24 * 90, params.sinceHours || 168)); // default 7 days
      const group = params.groupBy === 'question' ? 'question_id' : 'decision';
      const sql = `
        SELECT ${group} as group_key,
               COUNT(*) as count,
               AVG(voice_score) as avg_score,
               SUM(CASE WHEN decision = 'GO' THEN 1 ELSE 0 END) as go_count,
               SUM(CASE WHEN decision = 'REVIEW' THEN 1 ELSE 0 END) as review_count,
               SUM(CASE WHEN decision = 'NO-GO' THEN 1 ELSE 0 END) as nogo_count
        FROM voice_evaluations
        WHERE created_at >= NOW() - ($1 || ' hours')::interval
          AND ($2::text IS NULL OR context_id = $2::text)
        GROUP BY ${group}
        ORDER BY count DESC
        LIMIT 200;
      `;
      const { rows } = await this.pg.query(sql, [String(hours), contextId]);
      return rows;
    } catch (e) {
      this.logger.warn(`Stats failed or DB not configured: ${e.message}`);
      return [];
    }
  }
}
