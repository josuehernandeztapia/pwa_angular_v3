import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  forward(name: string, payload: any) {
    // In dev/stub mode we just log and return ok
    this.logger.log(`Event ${name}: ${JSON.stringify(payload).slice(0, 500)}`);
    return { ok: true, forwarded: true, name };
  }
}

