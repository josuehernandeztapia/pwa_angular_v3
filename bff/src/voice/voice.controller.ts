import { 
  Controller, 
  Post, 
  Body, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Headers,
  Logger,
  Get,
  Param,
  Query 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { 
  VoiceAnalyzeDto, 
  VoiceScoreResponseDto, 
  VoiceEvaluateResponseDto 
} from './dto/voice.dto';
import { VoiceEvalRepo } from './voice-eval.repo';

@ApiTags('voice')
@Controller('v1/voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private readonly voiceService: VoiceService,
    private readonly evalRepo: VoiceEvalRepo,
  ) {}

  @Post('analyze')
  @ApiOperation({ 
    summary: 'Analyze pre-extracted voice features',
    description: 'Analyze voice features that have been pre-extracted from audio (latency, pitch, energy, words)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Voice analysis completed successfully',
    type: VoiceScoreResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data' 
  })
  async analyzeFeatures(
    @Body() dto: VoiceAnalyzeDto,
    @Headers('x-request-id') requestId?: string,
    @Headers('x-lexicons-enabled') lexiconsEnabled?: string,
    @Headers('x-lexicon-plaza') lexiconPlaza?: string,
    @Headers('x-reasons-enabled') reasonsEnabled?: string,
  ): Promise<VoiceScoreResponseDto> {
    this.logger.log(`🔬 POST /v1/voice/analyze - Question: ${dto.questionId} [${requestId}]`);
    
    // Derive defaults from env when headers absent
    const envLex = (process.env.LEXICONS_ENABLED || '').toLowerCase() === 'true';
    const envPlaza = (process.env.LEXICON_PLAZA as any) || 'general';
    const envReasons = (process.env.REASONS_ENABLED || 'true').toLowerCase() !== 'false';
    return this.voiceService.analyzeFeatures(dto, requestId, {
      lexiconsEnabled: (String(lexiconsEnabled || '') ? String(lexiconsEnabled).toLowerCase() === 'true' : envLex),
      lexiconPlaza: ((lexiconPlaza as any) || envPlaza),
      reasonsEnabled: (String(reasonsEnabled || '') ? String(reasonsEnabled).toLowerCase() !== 'false' : envReasons),
    });
  }

  @Post('analyze/audio')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Analyze audio file (extract features + analyze)',
    description: 'Upload an audio file to extract voice features and perform analysis'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (WAV, MP3, M4A, etc.)'
        },
        questionId: {
          type: 'string',
          example: 'Q1',
          description: 'Question ID from AVI questionnaire'
        },
        contextId: {
          type: 'string',
          example: 'L-123',
          description: 'Lead/Contract ID for tracking'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Audio analysis completed successfully',
    type: VoiceScoreResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Audio file required or invalid format' 
  })
  async analyzeAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() context: { questionId?: string; contextId?: string },
    @Headers('x-request-id') requestId?: string,
    @Headers('x-lexicons-enabled') lexiconsEnabled?: string,
    @Headers('x-lexicon-plaza') lexiconPlaza?: string,
    @Headers('x-reasons-enabled') reasonsEnabled?: string,
  ): Promise<VoiceScoreResponseDto> {
    this.logger.log(`🎵 POST /v1/voice/analyze/audio - Question: ${context.questionId} [${requestId}]`);

    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const envLex = (process.env.LEXICONS_ENABLED || '').toLowerCase() === 'true';
    const envPlaza = (process.env.LEXICON_PLAZA as any) || 'general';
    const envReasons = (process.env.REASONS_ENABLED || 'true').toLowerCase() !== 'false';
    return this.voiceService.analyzeAudio(file, context, requestId, {
      lexiconsEnabled: (String(lexiconsEnabled || '') ? String(lexiconsEnabled).toLowerCase() === 'true' : envLex),
      lexiconPlaza: ((lexiconPlaza as any) || envPlaza),
      reasonsEnabled: (String(reasonsEnabled || '') ? String(reasonsEnabled).toLowerCase() !== 'false' : envReasons),
    });
  }

  @Post('evaluate')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Full voice evaluation (Whisper + Analysis)',
    description: 'Complete voice evaluation: transcribe with Whisper + extract features + analyze'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (WAV, MP3, M4A, etc.)'
        },
        questionId: {
          type: 'string',
          example: 'Q1',
          description: 'Question ID from AVI questionnaire'
        },
        contextId: {
          type: 'string',
          example: 'L-123',
          description: 'Lead/Contract ID for tracking'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Full voice evaluation completed successfully',
    type: VoiceEvaluateResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Audio file required or invalid format' 
  })
  async evaluateAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() context: { questionId?: string; contextId?: string; skipped?: string | boolean; orderIndex?: string | number },
    @Headers('x-request-id') requestId?: string,
    @Headers('x-openai-key') openaiKey?: string,
    @Headers('x-lexicons-enabled') lexiconsEnabled?: string,
    @Headers('x-lexicon-plaza') lexiconPlaza?: string,
    @Headers('x-reasons-enabled') reasonsEnabled?: string,
  ): Promise<VoiceEvaluateResponseDto> {
    this.logger.log(`🎯 POST /v1/voice/evaluate - Question: ${context.questionId} [${requestId}]`);

    // Allow logging of skipped questions without audio
    const skipped = String((context?.skipped as any) || '').toLowerCase() === 'true';
    const orderIndex = (context?.orderIndex ?? '').toString().trim();

    if (skipped) {
      const flags = ['skipped'];
      if (orderIndex) flags.push(`ord:${orderIndex}`);
      const payload: VoiceEvaluateResponseDto = {
        questionId: context.questionId,
        contextId: context.contextId,
        transcript: '',
        words: [],
        latencyIndex: 0,
        pitchVar: 0,
        disfluencyRate: 0,
        energyStability: 0,
        honestyLexicon: 0,
        voiceScore: 0,
        decision: 'REVIEW', // keep type-safe; mark skipped in flags
        flags,
      } as any;

      // Best-effort persist
      await this.evalRepo.insertOne({
        questionId: payload.questionId,
        contextId: payload.contextId,
        latencyIndex: payload.latencyIndex,
        pitchVar: payload.pitchVar,
        disfluencyRate: payload.disfluencyRate,
        energyStability: payload.energyStability,
        honestyLexicon: payload.honestyLexicon,
        voiceScore: payload.voiceScore,
        decision: payload.decision as any,
        flags: payload.flags,
        transcript: '',
        words: [],
      }).catch(() => undefined);

      return payload;
    }

    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const envLex = (process.env.LEXICONS_ENABLED || '').toLowerCase() === 'true';
    const envPlaza = (process.env.LEXICON_PLAZA as any) || 'general';
    const envReasons = (process.env.REASONS_ENABLED || 'true').toLowerCase() !== 'false';
    return this.voiceService.evaluateAudio(file, context, requestId, openaiKey, {
      lexiconsEnabled: (String(lexiconsEnabled || '') ? String(lexiconsEnabled).toLowerCase() === 'true' : envLex),
      lexiconPlaza: ((lexiconPlaza as any) || envPlaza),
      reasonsEnabled: (String(reasonsEnabled || '') ? String(reasonsEnabled).toLowerCase() !== 'false' : envReasons),
    });
  }

  @Get('evaluations/:contextId')
  @ApiOperation({ summary: 'List voice evaluations by contextId (pagination)' })
  async listEvaluations(
    @Param('contextId') contextId: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const lim = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 50));
    const off = Math.max(0, parseInt(String(offset), 10) || 0);
    this.logger.log(`📄 GET /v1/voice/evaluations/${contextId}?limit=${lim}&offset=${off}`);
    const rows = await this.evalRepo.listByContext(contextId, lim, off);
    return { contextId, limit: lim, offset: off, count: rows.length, items: rows };
  }

  @Get('evaluations')
  @ApiOperation({ summary: 'List voice evaluations (pagination, optional contextId)' })
  async listEvaluationsAll(
    @Query('contextId') contextId?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const ctx = contextId || '';
    const lim = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 50));
    const off = Math.max(0, parseInt(String(offset), 10) || 0);
    const rows = await this.evalRepo.listByContext(ctx, lim, off);
    return { contextId: ctx, limit: lim, offset: off, count: rows.length, items: rows };
  }

  @Get('evaluations/stats')
  @ApiOperation({ summary: 'Quick stats for voice evaluations (groupBy=decision|question)' })
  async stats(
    @Query('contextId') contextId?: string,
    @Query('sinceHours') sinceHours = '168',
    @Query('groupBy') groupBy: 'decision'|'question' = 'decision',
  ) {
    const hours = Math.max(1, Math.min(24 * 90, parseInt(String(sinceHours), 10) || 168));
    const rows = await this.evalRepo.stats({ contextId, sinceHours: hours, groupBy });
    return { contextId: contextId || null, sinceHours: hours, groupBy, items: rows };
  }
}
