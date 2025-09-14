import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GnvService } from './gnv.service';

@ApiTags('gnv')
@Controller('api/bff/gnv')
export class GnvController {
  constructor(private gnv: GnvService) {}

  @Get('stations/health')
  health(@Query('date') date?: string) {
    return this.gnv.getHealth(date);
  }

  @Get('template.csv')
  @Header('Content-Type', 'text/csv')
  template(@Res() res: Response) {
    const csv = this.gnv.getTemplateCsv();
    res.send(csv);
  }

  @Get('guide.pdf')
  @Header('Content-Type', 'application/pdf')
  guide(@Res() res: Response) {
    const pdf = this.gnv.getGuidePdf();
    res.send(pdf);
  }
}

