import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { VoiceAnalyzeDto, VoiceScoreResponseDto, VoiceEvaluateResponseDto, AVIResponseDto } from './dto/voice.dto';
import {
  evaluateResponse,
  evaluateVoiceAnalysis,
  calculateRiskLevel,
  generateRecommendations,
  generateMockVoiceAnalysis,
  AVIResponse,
  AVIQuestionEnhanced,
} from './utils/avi-engine.util';
import { computeVoiceScore } from './utils/voice-score.util';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  constructor(
    private readonly repo?: import('./voice-eval.repo').VoiceEvalRepo,
  ) {}

  /**
   * Análisis de features pre-extraídas
   * MIGRADO DESDE: avi.service.ts - calculateScore()
   */
  async analyzeFeatures(dto: VoiceAnalyzeDto, requestId?: string): Promise<VoiceScoreResponseDto> {
    this.logger.log(`🔬 Analyzing features for ${dto.questionId} [${requestId}]`);
    
    try {
      // Convertir DTO a formato AVI interno
      const aviResponse: AVIResponse = this.dtoToAVIResponse(dto);
      
      // Mock question (en producción vendría de tu base de datos)
      const mockQuestion = this.getMockQuestion(dto.questionId || 'Q1');
      
      // Cálculo matemático L/P/D/E/H con fórmula ponderada
      const res = computeVoiceScore({
        latencySec: dto.latencySec,
        answerDurationSec: dto.answerDurationSec,
        pitchSeriesHz: dto.pitchSeriesHz,
        energySeries: dto.energySeries,
        words: dto.words,
      });

      return {
        ...res,
        questionId: dto.questionId,
        contextId: dto.contextId,
      };
    } catch (error) {
      this.logger.error(`Error analyzing features: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to analyze voice features');
    }
  }

  /**
   * Análisis de archivo de audio
   * TODO: Integrar con extractores de features reales
   */
  async analyzeAudio(
    file: Express.Multer.File, 
    context: { questionId?: string; contextId?: string }, 
    requestId?: string
  ): Promise<VoiceScoreResponseDto> {
    if (!file) {
      throw new BadRequestException('Audio file required');
    }
    
    this.logger.log(`🎵 Analyzing audio ${file.originalname} for ${context.questionId} [${requestId}]`);
    
    // TODO: IMPLEMENTAR EXTRACTOR REAL
    // Por ahora simula extracción de features
    const mockFeatures = this.extractFeaturesFromAudio(file, context.questionId);
    
    return this.analyzeFeatures(mockFeatures, requestId);
  }

  /**
   * Evaluación completa (Whisper + Análisis)
   * TODO: Integrar Whisper real
   */
  async evaluateAudio(
    file: Express.Multer.File,
    context: { questionId?: string; contextId?: string },
    requestId?: string,
    openaiKeyOverride?: string
  ): Promise<VoiceEvaluateResponseDto> {
    this.logger.log(`🎯 Full evaluation for ${context.questionId} [${requestId}]`);
    
    // TODO: INTEGRAR WHISPER
    const transcript = await this.transcribeAudio(file, openaiKeyOverride);
    const words = this.tokenizeText(transcript);
    
    // Análisis de audio
    const voiceAnalysis = await this.analyzeAudio(file, context, requestId);
    
    // Recalcular con palabras reales
    const enhancedAnalysis = this.enhanceWithTranscript(voiceAnalysis, words);
    
    const payload: VoiceEvaluateResponseDto = {
      transcript,
      words,
      ...enhancedAnalysis,
    };

    // Persist (best-effort)
    try {
      await this.repo?.insertOne({
        questionId: payload.questionId || context.questionId,
        contextId: payload.contextId || context.contextId,
        latencyIndex: payload.latencyIndex,
        pitchVar: payload.pitchVar,
        disfluencyRate: payload.disfluencyRate,
        energyStability: payload.energyStability,
        honestyLexicon: payload.honestyLexicon,
        voiceScore: payload.voiceScore,
        decision: payload.decision,
        flags: payload.flags,
        transcript: payload.transcript,
        words: payload.words,
      });
    } catch (e) {
      this.logger.warn(`DB insert skipped: ${e.message}`);
    }

    return payload;
  }

  // ===== HELPERS MIGRADOS DESDE TU PWA =====

  private dtoToAVIResponse(dto: VoiceAnalyzeDto): AVIResponse {
    return {
      questionId: dto.questionId || 'Q1',
      value: dto.words.join(' '),
      responseTime: dto.latencySec * 1000, // convert to ms
      transcription: dto.words.join(' '),
      voiceAnalysis: {
        pitch_variance: this.calculatePitchVariability(dto.pitchSeriesHz),
        speech_rate_change: 0.2, // mock
        pause_frequency: dto.latencySec > 1 ? 0.8 : 0.2,
        voice_tremor: 0.1,
        confidence_level: 0.85,
      },
      stressIndicators: this.detectStressIndicators(dto.words),
      coherenceScore: 0.75, // mock
    };
  }

  private getMockQuestion(questionId: string): AVIQuestionEnhanced {
    // Mock question - en producción cargar de DB
    return {
      id: questionId,
      category: 'daily_operation',
      weight: 8,
      stressLevel: 4,
      analytics: {
        expectedResponseTime: 5000, // 5 seconds
        truthVerificationKeywords: ['no sé', 'tal vez', 'quizás', 'puede ser'],
      },
    };
  }

  private calculateDetailedMetrics(dto: VoiceAnalyzeDto) {
    return {
      pitchVariability: this.calculatePitchVariability(dto.pitchSeriesHz),
      disfluencyRate: this.calculateDisfluencyRate(dto.words),
      energyStability: this.calculateEnergyStability(dto.energySeries),
      honestyLexicon: this.calculateHonestyLexicon(dto.words),
    };
  }

  private normalizeLatency(latencySec: number, answerDurationSec: number): number {
    const ratio = answerDurationSec > 0 ? latencySec / (answerDurationSec + latencySec) : 1;
    return Math.max(0, Math.min(1, ratio * 2));
  }

  private calculatePitchVariability(pitchHz: number[]): number {
    if (!pitchHz || pitchHz.length < 2) return 0.5;
    
    const mean = pitchHz.reduce((a, b) => a + b, 0) / pitchHz.length;
    const variance = pitchHz.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pitchHz.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalizar: 0 Hz stddev → 0, 50 Hz stddev → 1.0
    return Math.min(1, stdDev / 50);
  }

  private calculateDisfluencyRate(words: string[]): number {
    if (!words || words.length === 0) return 0;
    
    const disfluencies = ['eh', 'mmm', 'pues', 'este', 'bueno', 'o sea'];
    const hits = words.filter(w => disfluencies.includes(w.toLowerCase())).length;
    
    // Rate per 100 words, normalized to 0-1
    const rate = hits / Math.max(1, words.length / 100);
    return Math.min(1, rate / 10);
  }

  private calculateEnergyStability(energy: number[]): number {
    if (!energy || energy.length < 2) return 0.5;
    
    const mean = energy.reduce((a, b) => a + b, 0) / energy.length;
    const variance = energy.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / energy.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Stable if CV ~0.1 → 1.0, unstable if CV ~0.6 → 0
    return Math.max(0, 1 - (coefficientOfVariation / 0.6));
  }

  private calculateHonestyLexicon(words: string[]): number {
    if (!words || words.length === 0) return 0.3;
    
    const honestyTerms = ['hijo', 'familia', 'esposa', 'hermano', 'apoyo', 'socio', 'compañero'];
    const tokens = new Set(words.map(w => w.toLowerCase()));
    const hits = honestyTerms.filter(term => tokens.has(term)).length;
    
    // 0 terms → 0, 3+ terms → 1
    return Math.min(1, hits / 3);
  }

  private detectStressIndicators(words: string[]): string[] {
    const indicators = [];
    const stressWords = ['no sé', 'tal vez', 'quizás', 'puede ser', 'creo que'];
    
    if (words.some(w => stressWords.includes(w.toLowerCase()))) {
      indicators.push('evasive_language');
    }
    
    return indicators;
  }

  private generateFlags(metrics: any): string[] {
    const flags = [];
    
    if (metrics.pitchVariability > 0.7) flags.push('unstablePitch');
    if (metrics.disfluencyRate > 0.6) flags.push('highDisfluency');
    if (metrics.energyStability < 0.3) flags.push('lowEnergyStability');
    if (metrics.honestyLexicon < 0.3) flags.push('lowHonestyLexicon');
    
    return flags;
  }

  private getDecision(score: number, flags: string[]): 'GO' | 'REVIEW' | 'NO-GO' {
    if (score >= 0.75 && flags.length <= 1) return 'GO';
    if (score >= 0.55 && flags.length <= 2) return 'REVIEW';
    return 'NO-GO';
  }

  // ===== TODO: IMPLEMENTAR =====

  private extractFeaturesFromAudio(file: Express.Multer.File, questionId?: string): VoiceAnalyzeDto {
    // Mock feature extraction
    return {
      latencySec: 0.6,
      answerDurationSec: file.size / 16000, // rough estimate
      pitchSeriesHz: [110, 115, 112, 108, 113], // mock data
      energySeries: [0.6, 0.7, 0.65, 0.62, 0.68], // mock data
      words: ['esto', 'es', 'una', 'prueba'], // mock words
      questionId: questionId,
    };
  }

  private async transcribeAudio(file: Express.Multer.File, overrideKey?: string): Promise<string> {
    const apiKey = overrideKey || process.env.OPENAI_API_KEY;
    // Si no hay API key, usar placeholder para no romper pruebas locales
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY no configurada. Usando transcripción simulada.');
      return 'transcripcion simulada sin whisper';
    }

    try {
      // Usar fetch + FormData nativo (Node 18+)
      const FormDataAny: any = (global as any).FormData;
      const BlobAny: any = (global as any).Blob;
      if (!FormDataAny || !BlobAny) {
        this.logger.warn('FormData/Blob no disponible en runtime. Whisper omitido.');
        return 'transcripcion simulada sin whisper';
      }
      const fd = new FormDataAny();
      fd.append('file', new BlobAny([file.buffer], { type: file.mimetype || 'audio/wav' }), file.originalname || 'audio.wav');
      fd.append('model', 'whisper-1');
      fd.append('language', 'es');
      fd.append('response_format', 'json');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: fd as any,
      } as any);

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Whisper HTTP ${res.status}: ${text}`);
        return 'transcripcion simulada sin whisper';
      }

      const data: any = await res.json();
      const transcript: string = data?.text || '';
      return transcript || 'transcripcion vacia';
    } catch (e: any) {
      this.logger.warn(`Whisper error: ${e?.message || e}`);
      return 'transcripcion simulada sin whisper';
    }
  }

  private tokenizeText(text: string): string[] {
    return text.toLowerCase()
      .replace(/[.,;:¡!¿?\-—()"]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  private enhanceWithTranscript(analysis: VoiceScoreResponseDto, words: string[]): VoiceScoreResponseDto {
    // Recalcular disfluency y honesty con palabras reales
    const newDisfluencyRate = this.calculateDisfluencyRate(words);
    const newHonestyLexicon = this.calculateHonestyLexicon(words);
    
    // Recalcular score final
    const newScore = (
      analysis.voiceScore * 0.6 + 
      ((1 - newDisfluencyRate) * 0.2) +
      (newHonestyLexicon * 0.2)
    );
    
    return {
      ...analysis,
      disfluencyRate: newDisfluencyRate,
      honestyLexicon: newHonestyLexicon,
      voiceScore: Math.max(0, Math.min(1, newScore)),
      decision: this.getDecision(newScore, analysis.flags),
    };
  }
}
