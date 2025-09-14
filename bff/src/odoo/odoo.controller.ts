import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OdooService } from './odoo.service';

@ApiTags('odoo')
@Controller('api/bff/odoo/quotes')
export class OdooController {
  constructor(private odoo: OdooService) {}

  @Post()
  createDraft(@Body() body: { clientId?: string; market?: string; notes?: string; meta?: any }) {
    return this.odoo.createOrGetDraft(body?.clientId, body);
  }

  @Post(':id/lines')
  addLine(
    @Param('id') quoteId: string,
    @Body()
    body: {
      sku?: string;
      oem?: string;
      name: string;
      equivalent?: string;
      qty?: number;
      unitPrice: number;
      currency?: string;
      meta?: any;
    },
  ) {
    return this.odoo.addLine(quoteId, body);
  }
}

