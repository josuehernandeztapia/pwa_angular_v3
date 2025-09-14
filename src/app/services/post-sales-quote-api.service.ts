import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';

interface QuoteDraftResponse { quoteId: string; created?: boolean }
interface AddLineDto { name: string; unitPrice: number; quantity?: number }

@Injectable({ providedIn: 'root' })
export class PostSalesQuoteApiService {
  private readonly useBff = !!(environment as any)?.features?.enableOdooQuoteBff;
  private readonly base = `${environment.apiUrl}/bff/odoo/quotes`;

  // Local stub store when flag is off
  private draftsByClient = new Map<string, string>();

  constructor(private http: HttpClient) {}

  createOrGetDraft(clientId: string, payload?: any): Observable<QuoteDraftResponse> {
    if (!this.useBff) {
      let qid = this.draftsByClient.get(clientId);
      if (!qid) {
        qid = `Q-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        this.draftsByClient.set(clientId, qid);
      }
      return of({ quoteId: qid, created: true });
    }
    return this.http.post<QuoteDraftResponse>(`${this.base}`, { clientId, ...(payload || {}) });
  }

  addLine(quoteId: string, line: AddLineDto): Observable<{ ok: boolean }> {
    if (!this.useBff) {
      // Pretend success in stub mode
      return of({ ok: true });
    }
    return this.http.post<{ ok: boolean }>(`${this.base}/${encodeURIComponent(quoteId)}/lines`, line);
  }
}

