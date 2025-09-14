import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  start(clientId: string, body: any) {
    this.logger.log(`KYC start for client ${clientId}`);
    return { ok: true, clientId, kycSessionId: `kyc_${Date.now()}`, echo: body };
  }

  handleWebhook(payload: any) {
    this.logger.log(`MetaMap webhook: ${JSON.stringify(payload).slice(0, 500)}`);
    return { received: true };
  }
}

