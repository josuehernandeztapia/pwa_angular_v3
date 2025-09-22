import { Injectable } from '@angular/core';

export interface PartSuggestion {
  id: string;
  name: string;
  oem: string;
  equivalent?: string;
  stock: number;
  priceMXN: number;
}

interface QuoteDraftItem extends PartSuggestion {
  qty: number;
}

interface QuoteDraft {
  id: string; // Phase 4 cleanup: add missing id property
  items: QuoteDraftItem[];
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class PostSalesQuoteDraftService {
  private storageKey = 'postSalesQuoteDraft';

  private load(): QuoteDraft {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { id: 'dev-draft', items: [], updatedAt: Date.now() };
  }

  private save(draft: QuoteDraft) {
    localStorage.setItem(this.storageKey, JSON.stringify(draft));
  }

  getCount(): number {
    return this.load().items.reduce((sum, it) => sum + it.qty, 0);
  }

  getItems(): QuoteDraftItem[] {
    return this.load().items;
  }

  addItem(part: PartSuggestion, qty: number = 1): void {
    const draft = this.load();
    const existing = draft.items.find(i => i.id === part.id);
    if (existing) {
      existing.qty += qty;
    } else {
      draft.items.push({ ...part, qty });
    }
    draft.updatedAt = Date.now();
    this.save(draft);
  }

  clear(): void {
    const draft: QuoteDraft = { id: 'dev-draft', items: [], updatedAt: Date.now() };
    this.save(draft);
  }
}


// removed by clean-audit