import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PaymentsApiService {
  private readonly enabled = !!(environment as any)?.features?.enablePaymentsBff;
  private readonly base = (environment as any)?.integrations?.payments?.baseUrl || `${environment.apiUrl}/bff/payments`;

  constructor(private http: HttpClient) {}

  createOrder(data: any): Observable<{ ok: boolean; orderId: string }> {
    if (!this.enabled) return of({ ok: true, orderId: `ord_stub_${Date.now()}` });
    return this.http.post<{ ok: boolean; orderId: string }>(`${this.base}/orders`, data).pipe(
      catchError(error => {
        console.warn('[payments] BFF order fallback', error);
        return of({ ok: true, orderId: `ord_stub_${Date.now()}` });
      })
    );
  }

  createCheckout(data: any): Observable<{ ok: boolean; checkoutUrl: string }> {
    if (!this.enabled) return of({ ok: true, checkoutUrl: `https://payments.local/checkout/stub_${Date.now()}` });
    return this.http.post<{ ok: boolean; checkoutUrl: string }>(`${this.base}/checkouts`, data).pipe(
      catchError(error => {
        console.warn('[payments] BFF checkout fallback', error);
        return of({ ok: true, checkoutUrl: `https://payments.local/checkout/stub_${Date.now()}` });
      })
    );
  }
}
