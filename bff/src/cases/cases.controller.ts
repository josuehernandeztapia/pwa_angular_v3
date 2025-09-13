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
}

