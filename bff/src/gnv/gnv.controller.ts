import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { GnvService } from './gnv.service';

@ApiTags('gnv')
@Controller('api/bff/gnv')
export class GnvController {
  constructor(private gnv: GnvService) {}

  @Get('stations/health')
  @ApiOperation({ summary: 'Get station health data for a specific date' })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format (defaults to yesterday)' })
  @ApiResponse({ status: 200, description: 'Returns array of station health data with enhanced scoring' })
  health(@Query('date') date?: string) {
    return this.gnv.getHealth(date);
  }

  @Get('health/summary')
  @ApiOperation({ summary: 'Get overall system health summary with ≥85% scoring target' })
  @ApiQuery({ name: 'date', required: false, description: 'Date in YYYY-MM-DD format (defaults to yesterday)' })
  @ApiResponse({ status: 200, description: 'Returns overall health summary with score, station counts, and metrics' })
  healthSummary(@Query('date') date?: string) {
    return this.gnv.getHealthSummary(date);
  }

  @Get('template.csv')
  @Header('Content-Type', 'text/csv')
  @ApiOperation({ summary: 'Download CSV template for GNV data ingestion' })
  template(@Res() res: Response) {
    const csv = this.gnv.getTemplateCsv();
    res.send(csv);
  }

  @Get('guide.pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download PDF guide for GNV data ingestion' })
  guide(@Res() res: Response) {
    const pdf = this.gnv.getGuidePdf();
    res.send(pdf);
  }
}

