import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { generateSineWav } from './helpers/wav-synth';

describe('Voice E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/voice/analyze returns score 0-1', async () => {
    const payload = {
      latencySec: 0.4,
      answerDurationSec: 7.6,
      pitchSeriesHz: [110,114,117,112,111,113,115,114],
      energySeries: [0.62,0.64,0.63,0.65,0.64,0.63],
      words: ['mi','hijo','me','cubre','si','yo','no','puedo'],
      questionId: 'Q2',
      contextId: 'L-E2E'
    };
    const res = await request(app.getHttpServer())
      .post('/v1/voice/analyze')
      .send(payload)
      .expect(200);

    expect(res.body).toHaveProperty('voiceScore');
    expect(res.body.voiceScore).toBeGreaterThanOrEqual(0);
    expect(res.body.voiceScore).toBeLessThanOrEqual(1);
    expect(['GO','REVIEW','NO-GO']).toContain(res.body.decision);
  });

  it('POST /v1/voice/analyze with lexicons enabled returns reason codes when phrases hit', async () => {
    const payload = {
      latencySec: 0.6,
      answerDurationSec: 6.2,
      pitchSeriesHz: [110,112,111,113,112,111],
      energySeries: [0.6,0.61,0.62,0.6],
      // Contains admission_partial phrase
      words: ['pago', 'poquito', 'cuando', 'se', 'puede'],
      questionId: 'Q3',
      contextId: 'L-E2E-LEX'
    };
    const res = await request(app.getHttpServer())
      .post('/v1/voice/analyze')
      .set('X-Lexicons-Enabled', 'true')
      .set('X-Lexicon-Plaza', 'edomex')
      .set('X-Reasons-Enabled', 'true')
      .send(payload)
      .expect(200);
    expect(res.body).toHaveProperty('flags');
    // We accept either in flags or in reasons (both are populated when enabled)
    const bag = ([] as string[]).concat(res.body.flags || [], res.body.reasons || []);
    expect(bag).toEqual(expect.arrayContaining(['admission_relief_applied']));
  });

  it('GET /v1/voice/evaluations/:contextId returns list (empty ok)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/voice/evaluations/L-E2E?limit=5&offset=0')
      .expect(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('POST /v1/voice/evaluate (multipart) returns transcript + voiceScore', async () => {
    const wav = generateSineWav(1, 16000, 110);
    const res = await request(app.getHttpServer())
      .post('/v1/voice/evaluate')
      .attach('audio', wav, { filename: 'test.wav', contentType: 'audio/wav' })
      .field('questionId', 'Q1')
      .field('contextId', 'L-E2E')
      .expect(200);
    expect(res.body).toHaveProperty('transcript');
    expect(res.body).toHaveProperty('voiceScore');
    expect(['GO','REVIEW','NO-GO']).toContain(res.body.decision);
  });

  it('POST /v1/voice/evaluate supports skipped without audio and orderIndex', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/voice/evaluate')
      .field('questionId', 'Q1')
      .field('contextId', 'L-E2E')
      .field('skipped', 'true')
      .field('orderIndex', '3')
      .expect(200);
    expect(res.body.flags).toEqual(expect.arrayContaining(['skipped', 'ord:3']));
    expect(res.body.voiceScore).toBe(0);
    expect(res.body.decision).toBe('REVIEW');
  });

  it('GET /v1/voice/evaluations/stats works (decision, question)', async () => {
    const byDecision = await request(app.getHttpServer())
      .get('/v1/voice/evaluations/stats?groupBy=decision&sinceHours=24')
      .expect(200);
    expect(Array.isArray(byDecision.body.items)).toBe(true);

    const byQuestion = await request(app.getHttpServer())
      .get('/v1/voice/evaluations/stats?groupBy=question&sinceHours=24')
      .expect(200);
    expect(Array.isArray(byQuestion.body.items)).toBe(true);
  });
});
