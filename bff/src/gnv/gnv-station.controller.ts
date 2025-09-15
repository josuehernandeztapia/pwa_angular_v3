/**
 * 🌿 GNV Station Controller
 * Real-time GNV station health monitoring and data management
 */

import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GnvStationService } from './gnv-station.service';
import { GnvHealthDto, GnvIngestionDto, StationMetricsQueryDto } from './dto/gnv-station.dto';

@ApiTags('GNV Station Management')
@Controller('gnv')
export class GnvStationController {
  constructor(private readonly gnvStationService: GnvStationService) {}

  @Get('stations')
  @ApiOperation({ 
    summary: 'Get all GNV stations',
    description: 'Retrieve all registered GNV stations with current health status'
  })
  @ApiQuery({ name: 'status', required: false, enum: ['healthy', 'degraded', 'critical'] })
  @ApiResponse({ status: 200, description: 'Stations retrieved successfully' })
  async getAllStations(@Query('status') status?: string) {
    try {
      const stations = await this.gnvStationService.getAllStations(status);
      
      return {
        success: true,
        data: stations,
        summary: {
          total: stations.length,
          healthy: stations.filter(s => s.healthScore >= 85).length,
          degraded: stations.filter(s => s.healthScore >= 60 && s.healthScore < 85).length,
          critical: stations.filter(s => s.healthScore < 60).length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve stations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stations/:stationId/health')
  @ApiOperation({ 
    summary: 'Get station health metrics',
    description: 'Retrieve real-time health metrics for a specific GNV station'
  })
  @ApiParam({ name: 'stationId', description: 'Station identifier' })
  @ApiResponse({ status: 200, description: 'Station health retrieved successfully' })
  async getStationHealth(@Param('stationId') stationId: string) {
    try {
      const health = await this.gnvStationService.getStationHealth(stationId);
      
      if (!health) {
        throw new HttpException(
          `Station ${stationId} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      
      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      throw new HttpException(
        `Failed to retrieve station health: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('stations/:stationId/metrics')
  @ApiOperation({ 
    summary: 'Get station metrics history',
    description: 'Retrieve historical metrics for analysis and reporting'
  })
  @ApiParam({ name: 'stationId', description: 'Station identifier' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to retrieve (default: 7)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day'], description: 'Data aggregation interval' })
  @ApiResponse({ status: 200, description: 'Station metrics retrieved successfully' })
  async getStationMetrics(
    @Param('stationId') stationId: string,
    @Query() query: StationMetricsQueryDto
  ) {
    try {
      const metrics = await this.gnvStationService.getStationMetrics(stationId, query);
      
      return {
        success: true,
        data: metrics,
        query: {
          stationId,
          days: query.days || 7,
          interval: query.interval || 'hour'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve station metrics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stations/:stationId/health')
  @ApiOperation({ 
    summary: 'Update station health status',
    description: 'Report health status and metrics for a GNV station'
  })
  @ApiParam({ name: 'stationId', description: 'Station identifier' })
  @ApiResponse({ status: 200, description: 'Health status updated successfully' })
  async updateStationHealth(
    @Param('stationId') stationId: string,
    @Body() healthData: GnvHealthDto
  ) {
    try {
      const result = await this.gnvStationService.updateStationHealth(stationId, healthData);
      
      // Check for alerts
      if (healthData.healthScore < 85) {
        await this.gnvStationService.triggerHealthAlert(stationId, healthData);
      }
      
      return {
        success: true,
        data: result,
        alertTriggered: healthData.healthScore < 85,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update station health: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stations/:stationId/ingest')
  @ApiOperation({ 
    summary: 'Ingest station data',
    description: 'Process and ingest operational data from GNV station'
  })
  @ApiParam({ name: 'stationId', description: 'Station identifier' })
  @ApiResponse({ status: 200, description: 'Data ingested successfully' })
  async ingestStationData(
    @Param('stationId') stationId: string,
    @Body() ingestionData: GnvIngestionDto
  ) {
    try {
      const result = await this.gnvStationService.ingestStationData(stationId, ingestionData);
      
      return {
        success: true,
        data: result,
        processed: {
          totalRows: ingestionData.data.length,
          successfulRows: result.successfulRows,
          rejectedRows: result.rejectedRows,
          successRate: result.successfulRows / ingestionData.data.length * 100
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to ingest station data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('stations/:stationId/ingest/csv')
  @ApiOperation({ 
    summary: 'Ingest data via CSV upload',
    description: 'Upload and process CSV file with GNV station operational data'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'stationId', description: 'Station identifier' })
  @ApiResponse({ status: 200, description: 'CSV data processed successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async ingestStationCSV(
    @Param('stationId') stationId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    try {
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      if (!file.originalname.toLowerCase().endsWith('.csv')) {
        throw new HttpException('Invalid file type. Only CSV files are allowed.', HttpStatus.BAD_REQUEST);
      }

      const result = await this.gnvStationService.processCSVFile(stationId, file);
      
      return {
        success: true,
        data: result,
        file: {
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        },
        processed: {
          totalRows: result.totalRows,
          successfulRows: result.successfulRows,
          rejectedRows: result.rejectedRows,
          successRate: result.totalRows > 0 ? (result.successfulRows / result.totalRows * 100) : 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      throw new HttpException(
        `Failed to process CSV file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('template.csv')
  @ApiOperation({ 
    summary: 'Download CSV template',
    description: 'Download template CSV file for GNV station data ingestion'
  })
  @ApiResponse({ status: 200, description: 'CSV template downloaded' })
  async downloadCSVTemplate() {
    try {
      const template = await this.gnvStationService.generateCSVTemplate();
      
      return {
        success: true,
        template,
        headers: [
          'timestamp',
          'vehicle_id',
          'fuel_consumption_m3',
          'distance_km',
          'efficiency_km_m3',
          'engine_temperature_c',
          'pressure_bar',
          'station_location',
          'driver_id',
          'route_type'
        ],
        exampleRow: {
          timestamp: '2025-09-15T10:30:00Z',
          vehicle_id: 'GNV-001',
          fuel_consumption_m3: '15.5',
          distance_km: '120.0',
          efficiency_km_m3: '7.74',
          engine_temperature_c: '85',
          pressure_bar: '200',
          station_location: 'AGS-01',
          driver_id: 'DRV-12345',
          route_type: 'urban'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate template: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboard/summary')
  @ApiOperation({ 
    summary: 'Get GNV dashboard summary',
    description: 'Retrieve system-wide GNV statistics and health overview'
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved successfully' })
  async getDashboardSummary() {
    try {
      const summary = await this.gnvStationService.getDashboardSummary();
      
      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve dashboard summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('alerts')
  @ApiOperation({ 
    summary: 'Get active GNV alerts',
    description: 'Retrieve all active health and operational alerts'
  })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of alerts to return' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getActiveAlerts(
    @Query('severity') severity?: string,
    @Query('limit') limit?: number
  ) {
    try {
      const alerts = await this.gnvStationService.getActiveAlerts({
        severity,
        limit: limit ? parseInt(limit.toString()) : undefined
      });
      
      return {
        success: true,
        data: alerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve alerts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiOperation({ 
    summary: 'Acknowledge alert',
    description: 'Mark an alert as acknowledged by operator'
  })
  @ApiParam({ name: 'alertId', description: 'Alert identifier' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  async acknowledgeAlert(@Param('alertId') alertId: string) {
    try {
      const result = await this.gnvStationService.acknowledgeAlert(alertId);
      
      return {
        success: true,
        data: result,
        message: 'Alert acknowledged successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to acknowledge alert: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analytics/efficiency')
  @ApiOperation({ 
    summary: 'Get efficiency analytics',
    description: 'Retrieve system-wide efficiency metrics and trends'
  })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Efficiency analytics retrieved successfully' })
  async getEfficiencyAnalytics(@Query('period') period?: string) {
    try {
      const analytics = await this.gnvStationService.getEfficiencyAnalytics(period || 'week');
      
      return {
        success: true,
        data: analytics,
        period: period || 'week',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve efficiency analytics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get GNV system health',
    description: 'Overall system health check for GNV infrastructure'
  })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    try {
      const health = await this.gnvStationService.getSystemHealth();
      
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