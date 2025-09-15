/**
 * 🎯 AVI Calibration Controller
 * Enterprise-grade calibration management and metrics API
 */

import { Controller, Get, Post, HttpStatus, HttpException } from '@nestjs/common';
import { AviCalibrationService } from './avi-calibration.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('AVI Calibration')
@Controller('avi/calibration')
export class AviCalibrationController {
  constructor(private readonly calibrationService: AviCalibrationService) {}

  @Get('results')
  @ApiOperation({ 
    summary: 'Get calibration results',
    description: 'Retrieve latest and historical calibration results for admin dashboard'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Calibration results retrieved successfully'
  })
  async getCalibrationResults() {
    try {
      const results = await this.calibrationService.getCalibrationResults();
      return {
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get calibration results: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('run')
  @ApiOperation({ 
    summary: 'Run new calibration',
    description: 'Execute new AVI calibration with real audio samples'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Calibration completed successfully'
  })
  async runCalibration() {
    try {
      const result = await this.calibrationService.runNewCalibration();
      return {
        success: true,
        data: result,
        message: 'Calibration completed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Calibration failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('results')
  @ApiOperation({ 
    summary: 'Store calibration results',
    description: 'Store calibration results from calibration job'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Calibration results stored successfully'
  })
  async storeCalibrationResults(calibrationResults: any) {
    try {
      const calibrationId = await this.calibrationService.storeResults(calibrationResults);
      return {
        success: true,
        calibrationId,
        message: 'Calibration results stored successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to store calibration results: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get calibration system health',
    description: 'Check calibration system health and recent performance'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System health retrieved successfully'
  })
  async getSystemHealth() {
    try {
      const health = await this.calibrationService.getSystemHealth();
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
}