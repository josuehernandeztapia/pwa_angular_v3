import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OdooService } from './odoo.service';
import { AddLineDto, CreateDraftDto } from './dto';

@ApiTags('odoo')
@Controller('api/bff/odoo/quotes')
export class OdooController {
  constructor(private odoo: OdooService) {}

  @Post()
  createDraft(@Body() body: CreateDraftDto) {
    return this.odoo.createOrGetDraft(body?.clientId, body);
  }

  @Post(':id/lines')
  addLine(
    @Param('id') quoteId: string,
    @Body()
    body: AddLineDto,
  ) {
    return this.odoo.addLine(quoteId, body);
  }
}
