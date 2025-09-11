import { 
  Controller, 
  Post, 
  Body, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Headers,
  Logger 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { 
  VoiceAnalyzeDto, 
  VoiceScoreResponseDto, 
  VoiceEvaluateResponseDto 
} from './dto/voice.dto';

@ApiTags('voice')
@Controller('v1/voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voiceService: VoiceService) {}

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
    @Headers('x-request-id') requestId?: string
  ): Promise<VoiceScoreResponseDto> {
    this.logger.log(`🔬 POST /v1/voice/analyze - Question: ${dto.questionId} [${requestId}]`);
    
    return this.voiceService.analyzeFeatures(dto, requestId);
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
    @Headers('x-request-id') requestId?: string
  ): Promise<VoiceScoreResponseDto> {
    this.logger.log(`🎵 POST /v1/voice/analyze/audio - Question: ${context.questionId} [${requestId}]`);

    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    return this.voiceService.analyzeAudio(file, context, requestId);
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
    @Body() context: { questionId?: string; contextId?: string },
    @Headers('x-request-id') requestId?: string
  ): Promise<VoiceEvaluateResponseDto> {
    this.logger.log(`🎯 POST /v1/voice/evaluate - Question: ${context.questionId} [${requestId}]`);

    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    return this.voiceService.evaluateAudio(file, context, requestId);
  }
}