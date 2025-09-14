import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  createOrder(body: any) {
    this.logger.log(`Create order: ${JSON.stringify(body).slice(0, 500)}`);
    return { ok: true, orderId: `ord_${Date.now()}` };
  }

  createCheckout(body: any) {
    this.logger.log(`Create checkout: ${JSON.stringify(body).slice(0, 500)}`);
    return { ok: true, checkoutUrl: `https://payments.local/checkout/${Date.now()}` };
  }

  handleWebhook(payload: any) {
    this.logger.log(`Conekta webhook: ${JSON.stringify(payload).slice(0, 500)}`);
    return { received: true };
  }
}

