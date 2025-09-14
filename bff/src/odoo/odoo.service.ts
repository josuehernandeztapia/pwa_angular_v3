import { Injectable } from '@nestjs/common';

interface DraftQuote {
  quoteId: string;
  number: string;
  clientId?: string;
  market?: string;
  total: number;
  currency: string;
  lines: Array<{ id: string; name: string; qty: number; unitPrice: number }>;
}

@Injectable()
export class OdooService {
  private drafts = new Map<string, DraftQuote>();

  createOrGetDraft(clientId?: string, meta?: any) {
    // In a real impl, search existing draft by client; here always create a new one per request
    const id = `Q-${Date.now().toString(36)}`;
    const number = `SO${Math.floor(Math.random() * 90000 + 10000)}`;
    const draft: DraftQuote = {
      quoteId: id,
      number,
      clientId,
      market: meta?.market,
      total: 0,
      currency: 'MXN',
      lines: [],
    };
    this.drafts.set(id, draft);
    return { quoteId: id, number };
  }

  addLine(
    quoteId: string,
    body: { sku?: string; oem?: string; name: string; equivalent?: string; qty?: number; unitPrice: number; currency?: string; meta?: any },
  ) {
    const draft = this.drafts.get(quoteId);
    if (!draft) {
      // auto-create if not found
      this.createOrGetDraft(undefined, {});
    }
    const q = this.drafts.get(quoteId)!;
    const id = `L-${Date.now().toString(36)}`;
    const qty = Math.max(1, Math.floor(body?.qty || 1));
    const unitPrice = Number(body?.unitPrice || 0);
    q.lines.push({ id, name: body?.name || body?.sku || 'Item', qty, unitPrice });
    q.total = q.lines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0);
    return { quoteId, lineId: id, total: q.total, currency: q.currency };
  }
}

