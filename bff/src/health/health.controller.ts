import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'conductores-bff',
      version: '1.0.0',
    };
  }

  @Get('voice')
  @ApiOperation({ summary: 'Voice service health check' })
  @ApiResponse({ status: 200, description: 'Voice service is healthy' })
  voiceHealth() {
    return {
      status: 'ok',
      service: 'voice-analysis',
      features: ['analyze', 'evaluate', 'whisper-ready'],
      timestamp: new Date().toISOString(),
    };
  }
}