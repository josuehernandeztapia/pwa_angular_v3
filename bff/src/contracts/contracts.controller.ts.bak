import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';

@ApiTags('contracts')
@Controller('api/bff/contracts')
export class ContractsController {
  constructor(private contracts: ContractsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create contract for client (stub)' })
  create(@Body() body: any) {
    return this.contracts.create(body);
  }
}

@ApiTags('webhooks')
@Controller('webhooks/mifiel')
export class MifielWebhookController {
  constructor(private contracts: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Mifiel webhook receiver (stub)' })
  webhook(@Body() payload: any) {
    return this.contracts.handleWebhook(payload);
  }
}

