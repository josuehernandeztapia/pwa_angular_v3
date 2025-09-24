import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KycService } from './kyc.service';

@ApiTags('kyc')
@Controller('api/bff/kyc')
export class KycController {
  constructor(private kyc: KycService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start KYC flow for a client' })
  start(@Body() body: { clientId: string; flowId?: string; metadata?: any }) {
    return this.kyc.start(body?.clientId, body);
  }
}

@ApiTags('webhooks')
@Controller('webhooks/metamap')
export class MetaMapWebhookController {
  constructor(private kyc: KycService) {}

  @Post()
  @ApiOperation({ summary: 'MetaMap webhook receiver (stub in dev)' })
  webhook(@Body() payload: any) {
    return this.kyc.handleWebhook(payload);
  }
}

