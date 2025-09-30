import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AutomationApiService {
  private readonly enabled = !!(environment as any)?.features?.enableAutomationBff;
  private readonly base = (environment as any)?.integrations?.automation?.baseUrl || `${environment.apiUrl}/bff/events`;

  constructor(private http: HttpClient) {}

  sendEvent(name: string, payload: any): Observable<{ ok: boolean; forwarded: boolean }> {
    if (!this.enabled) return of({ ok: true, forwarded: false });
    return this.http.post<{ ok: boolean; forwarded: boolean }>(`${this.base}/${encodeURIComponent(name)}`, payload).pipe(
      catchError(error => {
        console.warn('[automation] BFF fallback', error);
        return of({ ok: true, forwarded: false });
      })
    );
  }
}
