import { IsArray, IsNumber, IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoiceAnalyzeDto {
  @ApiProperty({ example: 0.4, description: 'Response latency in seconds' })
  @IsNumber() @Min(0)
  latencySec: number;

  @ApiProperty({ example: 7.6, description: 'Answer duration in seconds' })
  @IsNumber() @Min(0.01)
  answerDurationSec: number;

  @ApiProperty({ example: [110,114,117,112], description: 'Pitch series in Hz' })
  @IsArray()
  pitchSeriesHz: number[];

  @ApiProperty({ example: [0.62,0.64,0.63], description: 'Energy series 0-1' })
  @IsArray()
  energySeries: number[];

  @ApiProperty({ example: ['mi','hijo','cubre'], description: 'Transcribed words' })
  @IsArray()
  words: string[];

  @ApiPropertyOptional({ example: 'Q1', description: 'Question ID from AVI questionnaire' })
  @IsOptional() @IsString()
  questionId?: string;

  @ApiPropertyOptional({ example: 'L-123', description: 'Lead/Contract ID for tracking' })
  @IsOptional() @IsString()
  contextId?: string;
}

export class VoiceAnalysisDto {
  @ApiProperty({ example: 0.45, description: 'Pitch variance 0-1' })
  @IsNumber()
  pitch_variance: number;

  @ApiProperty({ example: 0.23, description: 'Speech rate change 0-1' })
  @IsNumber()
  speech_rate_change: number;

  @ApiProperty({ example: 0.12, description: 'Pause frequency 0-1' })
  @IsNumber()
  pause_frequency: number;

  @ApiProperty({ example: 0.05, description: 'Voice tremor 0-1' })
  @IsNumber()
  voice_tremor: number;

  @ApiProperty({ example: 0.87, description: 'Confidence level 0-1' })
  @IsNumber()
  confidence_level: number;
}

export class AVIResponseDto {
  @ApiProperty({ example: 'Q1', description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ example: 'Mi hijo me cubre cuando no puedo', description: 'Response text' })
  @IsString()
  value: string;

  @ApiProperty({ example: 3500, description: 'Response time in milliseconds' })
  @IsNumber()
  responseTime: number;

  @ApiProperty({ example: 'Mi hijo me cubre cuando no puedo', description: 'Transcribed text' })
  @IsString()
  transcription: string;

  @ApiPropertyOptional({ type: VoiceAnalysisDto, description: 'Voice analysis metrics' })
  @IsOptional()
  voiceAnalysis?: VoiceAnalysisDto;

  @ApiProperty({ example: ['nerviosismo_moderado'], description: 'Stress indicators' })
  @IsArray()
  stressIndicators: string[];

  @ApiProperty({ example: 0.78, description: 'Coherence score 0-1' })
  @IsNumber()
  coherenceScore: number;
}

export class VoiceScoreResponseDto {
  @ApiProperty({ example: 0.12, description: 'Latency index 0-1 (higher = worse)' })
  latencyIndex: number;

  @ApiProperty({ example: 0.18, description: 'Pitch variability 0-1 (higher = more stressed)' })
  pitchVar: number;

  @ApiProperty({ example: 0.04, description: 'Disfluency rate 0-1 (higher = worse)' })
  disfluencyRate: number;

  @ApiProperty({ example: 0.86, description: 'Energy stability 0-1 (higher = better)' })
  energyStability: number;

  @ApiProperty({ example: 0.67, description: 'Honesty lexicon 0-1 (higher = better)' })
  honestyLexicon: number;

  @ApiProperty({ example: 0.82, description: 'Final voice score 0-1' })
  voiceScore: number;

  @ApiProperty({ example: ['lowLatency', 'stableEnergy'], description: 'Analysis flags' })
  flags: string[];

  @ApiPropertyOptional({ example: ['unstablePitch','admission_relief_applied'], description: 'Human-readable reason codes' })
  reasons?: string[];

  @ApiProperty({ 
    example: 'GO', 
    enum: ['GO','REVIEW','NO-GO'],
    description: 'Decision based on voice analysis'
  })
  @IsEnum(['GO','REVIEW','NO-GO'])
  decision: 'GO' | 'REVIEW' | 'NO-GO';

  @ApiPropertyOptional({ example: 'Q1', description: 'Question ID' })
  questionId?: string;

  @ApiPropertyOptional({ example: 'L-123', description: 'Context ID' })
  contextId?: string;
}

export class VoiceEvaluateResponseDto extends VoiceScoreResponseDto {
  @ApiProperty({ example: 'Mi hijo me cubre cuando no puedo trabajar', description: 'Whisper transcript' })
  transcript: string;

  @ApiProperty({ example: ['mi','hijo','me','cubre','cuando','no','puedo','trabajar'], description: 'Tokenized words' })
  words: string[];
}

export class AVIScoreDto {
  @ApiProperty({ example: 750, description: 'Total AVI score 0-1000' })
  totalScore: number;

  @ApiProperty({ 
    example: 'MEDIUM',
    enum: ['LOW','MEDIUM','HIGH','CRITICAL'],
    description: 'Risk level assessment'
  })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ example: { basic_info: 8.5, daily_operation: 7.2 }, description: 'Scores by category' })
  categoryScores: Record<string, number>;

  @ApiProperty({ example: [], description: 'Red flags detected' })
  redFlags: any[];

  @ApiProperty({ example: ['Cliente de riesgo moderado'], description: 'Recommendations' })
  recommendations: string[];

  @ApiProperty({ example: 150, description: 'Processing time in milliseconds' })
  processingTime: number;
}
