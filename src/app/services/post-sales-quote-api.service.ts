import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { PartSuggestion } from './post-sales-quote-draft.service';

export interface DraftQuoteResponse {
  quoteId: string;
  number?: string;
}

export interface AddLineResponse {
  quoteId: string;
  lineId: string;
  total?: number;
  currency?: string;
}

@Injectable({ providedIn: 'root' })
export class PostSalesQuoteApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bff/odoo/quotes`;

  getOrCreateDraftQuote(clientId?: string, meta?: any): Observable<DraftQuoteResponse> {
    if (!environment.features.enableOdooQuoteBff) {
      return of({ quoteId: 'dev-draft' });
    }
    const body: any = { clientId, meta };
    return this.http.post<any>(this.base, body).pipe(
      map(res => ({ quoteId: res.quoteId || res.id || 'unknown', number: res.number }))
    );
  }

  addLine(quoteId: string, part: PartSuggestion, qty: number = 1, meta?: any): Observable<AddLineResponse> {
    if (!environment.features.enableOdooQuoteBff) {
      return of({ quoteId: quoteId || 'dev-draft', lineId: `dev-${Date.now()}` });
    }
    const body: any = {
      sku: part.id,
      name: part.name,
      oem: part.oem,
      equivalent: part.equivalent,
      qty,
      unitPrice: part.priceMXN,
      currency: 'MXN',
      meta
    };
    return this.http.post<any>(`${this.base}/${quoteId}/lines`, body).pipe(
      map(res => ({ quoteId: res.quoteId || quoteId, lineId: res.lineId || res.id, total: res.total, currency: res.currency }))
    );
  }
}

