import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CasesService } from './cases.service';

@ApiTags('cases')
@Controller('api/cases')
export class CasesController {
  constructor(private cases: CasesService) {}

  @Post()
  async createCase() {
    return this.cases.createCase();
  }

  @Get(':id')
  async getCase(@Param('id') id: string) {
    const rec = await this.cases.getCase(id);
    return rec || { id, status: 'open', created_at: new Date().toISOString() };
  }

  @Post(':id/attachments/presign')
  async presign(
    @Param('id') id: string,
    @Body() body: { type: 'plate' | 'vin' | 'odometer' | 'evidence' | 'other'; filename: string; contentType: string }
  ) {
    const { uploadId, url, fields, key, bucket, region } = await this.cases.presignAttachment(id, body);
    return { uploadId, url, fields, key, bucket, region };
  }

  @Post(':id/attachments/register')
  async register(
    @Param('id') id: string,
    @Body() body: { uploadId: string; type: 'plate' | 'vin' | 'odometer' | 'evidence' | 'other'; filename: string; contentType: string; publicUrl: string }
  ) {
    return this.cases.registerAttachment({ caseId: id, ...body });
  }

  @Post(':id/attachments/:attId/ocr')
  async ocr(
    @Param('id') _id: string,
    @Param('attId') attId: string,
    @Body() body?: { forceLow?: boolean }
  ) {
    return this.cases.ocrAttachment(attId, !!body?.forceLow);
  }

  @Post(':id/metrics/first-recommendation')
  async firstRecommendation(
    @Param('id') id: string,
    @Body() body: { millis: number }
  ) {
    const ms = Math.max(0, Number(body?.millis || 0));
    return this.cases.recordFirstRecommendation(id, ms);
  }

  @Post(':id/metrics/need-info')
  async needInfo(
    @Param('id') id: string,
    @Body() body: { fields: string[] }
  ) {
    const fields = Array.isArray(body?.fields) ? body!.fields : [];
    return this.cases.recordNeedInfo(id, fields);
  }

  @Get('metrics/summary')
  async metricsSummary() {
    return this.cases.getSummary();
  }
}
