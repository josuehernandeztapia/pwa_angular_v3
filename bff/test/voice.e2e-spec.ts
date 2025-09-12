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
});
