import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ContractsApiService {
  private readonly enabled = !!(environment as any)?.features?.enableContractsBff;
  private readonly base = (environment as any)?.integrations?.contracts?.baseUrl || `${environment.apiUrl}/bff/contracts`;

  constructor(private http: HttpClient) {}

  createContract(data: any): Observable<{ ok: boolean; contractId: string; signUrl: string }> {
    if (!this.enabled) return of({ ok: true, contractId: `ct_stub_${Date.now()}`, signUrl: `https://mifiel.local/sign/stub_${Date.now()}` });
    return this.http.post<{ ok: boolean; contractId: string; signUrl: string }>(`${this.base}/create`, data).pipe(
      catchError(error => {
        console.warn('[contracts] BFF fallback', error);
        return of({ ok: true, contractId: `ct_stub_${Date.now()}`, signUrl: `https://mifiel.local/sign/stub_${Date.now()}` });
      })
    );
  }
}
