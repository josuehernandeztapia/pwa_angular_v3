/**
 * 🎯 KIBAN Risk Evaluation Controller
 * Production-ready HASE algorithm implementation with enterprise validation
 */

import { Controller, Post, Body, Get, Param, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { KibanRiskService } from './kiban-risk.service';
import { RiskEvaluationRequestDto } from './dto/risk-evaluation-request.dto';
import { RiskEvaluationResponseDto, RiskDecision } from './dto/risk-evaluation-response.dto';

@ApiTags('KIBAN Risk Evaluation')
@Controller('risk')
export class KibanRiskController {
  constructor(private readonly kibanRiskService: KibanRiskService) {}

  @Post('evaluate')
  @ApiOperation({ 
    summary: 'Evaluate risk using HASE algorithm',
    description: 'Execute complete KIBAN/HASE risk evaluation with 30/20/50 weighting system'
  })
  @ApiBody({ type: RiskEvaluationRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk evaluation completed successfully',
    type: RiskEvaluationResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request data'
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error during evaluation'
  })
  async evaluateRisk(
    @Body() requestDto: RiskEvaluationRequestDto
  ): Promise<RiskEvaluationResponseDto> {
    try {
      console.log(`🎯 KIBAN Risk Evaluation Started - ID: ${requestDto.evaluationId}`);
      
      // Execute HASE algorithm
      const result = await this.kibanRiskService.evaluateRisk(requestDto);
      
      console.log(`✅ Risk Evaluation Complete - Decision: ${result.decision}, Score: ${result.scoreBreakdown.finalScore}`);
      
      return result;
    } catch (error) {
      console.error('❌ KIBAN Risk Evaluation Failed:', error);
      throw new HttpException(
        `Risk evaluation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('evaluate/batch')
  @ApiOperation({ 
    summary: 'Batch risk evaluation',
    description: 'Process multiple risk evaluations in a single request'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch evaluation completed'
  })
  async evaluateRiskBatch(
    @Body() requests: RiskEvaluationRequestDto[]
  ): Promise<{ results: RiskEvaluationResponseDto[]; summary: any }> {
    try {
      console.log(`🎯 KIBAN Batch Evaluation Started - ${requests.length} requests`);
      
      const results = await this.kibanRiskService.evaluateRiskBatch(requests);
      
      // Calculate summary statistics
      const summary = {
        total: results.length,
        decisions: {
          GO: results.filter(r => r.decision === RiskDecision.GO).length,
          REVIEW: results.filter(r => r.decision === RiskDecision.REVIEW).length,
          NO_GO: results.filter(r => r.decision === RiskDecision.NO_GO).length
        },
        avgScore: results.reduce((sum, r) => sum + r.scoreBreakdown.finalScore, 0) / results.length,
        processingTime: new Date().toISOString()
      };
      
      console.log(`✅ Batch Evaluation Complete - GO: ${summary.decisions.GO}, REVIEW: ${summary.decisions.REVIEW}, NO_GO: ${summary.decisions.NO_GO}`);
      
      return { results, summary };
    } catch (error) {
      console.error('❌ KIBAN Batch Evaluation Failed:', error);
      throw new HttpException(
        `Batch evaluation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('evaluation/:evaluationId')
  @ApiOperation({ 
    summary: 'Get evaluation results',
    description: 'Retrieve stored risk evaluation results by ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Evaluation results retrieved successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Evaluation not found'
  })
  async getEvaluationResults(@Param('evaluationId') evaluationId: string) {
    try {
      const result = await this.kibanRiskService.getEvaluationResults(evaluationId);
      
      if (!result) {
        throw new HttpException(
          `Evaluation ${evaluationId} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      throw new HttpException(
        `Failed to retrieve evaluation: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get risk evaluation statistics',
    description: 'Retrieve system-wide risk evaluation statistics and performance metrics'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully'
  })
  async getEvaluationStats() {
    try {
      const stats = await this.kibanRiskService.getEvaluationStats();
      
      return {
        success: true,
        stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get KIBAN system health',
    description: 'Check KIBAN/HASE system health and performance metrics'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System health retrieved successfully'
  })
  async getSystemHealth() {
    try {
      const health = await this.kibanRiskService.getSystemHealth();
      
      return {
        success: true,
        health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get system health: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('config/update')
  @ApiOperation({ 
    summary: 'Update HASE algorithm configuration',
    description: 'Update HASE weighting and threshold configuration (admin only)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration updated successfully'
  })
  async updateConfiguration(@Body() config: any) {
    try {
      const result = await this.kibanRiskService.updateConfiguration(config);
      
      return {
        success: true,
        message: 'HASE configuration updated successfully',
        config: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}