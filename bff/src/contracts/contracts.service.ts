import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  create(body: any) {
    this.logger.log(`Create contract: ${JSON.stringify(body).slice(0, 500)}`);
    return { ok: true, contractId: `ct_${Date.now()}`, signUrl: `https://mifiel.local/sign/${Date.now()}` };
  }

  handleWebhook(payload: any) {
    this.logger.log(`Mifiel webhook: ${JSON.stringify(payload).slice(0, 500)}`);
    return { received: true };
  }
}

