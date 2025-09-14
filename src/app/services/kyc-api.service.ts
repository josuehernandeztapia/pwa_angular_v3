import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KycApiService {
  private readonly enabled = !!(environment as any)?.features?.enableKycBff;
  private readonly base = (environment as any)?.integrations?.kyc?.baseUrl || `${environment.apiUrl}/bff/kyc`;

  constructor(private http: HttpClient) {}

  start(clientId: string, opts?: any): Observable<{ ok: boolean; kycSessionId: string }> {
    if (!this.enabled) {
      return of({ ok: true, kycSessionId: `stub_${Date.now()}` });
    }
    return this.http.post<{ ok: boolean; kycSessionId: string }>(`${this.base}/start`, { clientId, ...(opts || {}) });
  }
}

