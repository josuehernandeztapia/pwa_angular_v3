import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';

export interface PhotoMeta { kind: 'front'|'side'|'interior'|'detail'; url: string; }
export interface Suggestion { id: string; name: string; qty: number; price?: number; selected: boolean; }
export interface DraftQuote { id: string; lines: Array<{ sku:string; qty:number; }>; }

@Injectable({ providedIn: 'root' })
export class PostventaService {
  constructor(private http: HttpClient, private errors: ErrorHandlerService) {}

  getOrCreateDraftQuote(customerId: string): Observable<DraftQuote> {
    return this.http.post<DraftQuote>(`${environment.api.quotes}/draft`, { customerId }).pipe(catchError((e: HttpErrorResponse) => this.handle(e)));
  }

  uploadPhoto(file: File, kind: PhotoMeta['kind']): Observable<{ url: string }> {
    const fd = new FormData(); fd.append('file', file); fd.append('kind', kind);
    return this.http.post<{url:string}>(`${environment.api.postventa}/photos`, fd).pipe(catchError((e: HttpErrorResponse) => this.handle(e)));
  }

  analyzePhotos(photos: PhotoMeta[]): Observable<Suggestion[]> {
    return this.http.post<Suggestion[]>(`${environment.api.postventa}/analyze`, { photos }).pipe(catchError((e: HttpErrorResponse) => this.handle(e)));
  }

  addLines(quoteId: string, lines: Array<{ sku:string; qty:number }>): Observable<DraftQuote> {
    return this.http.post<DraftQuote>(`${environment.api.quotes}/${quoteId}/lines`, { lines }).pipe(catchError((e: HttpErrorResponse) => this.handle(e)));
  }

  private handle(error: HttpErrorResponse) { this.errors.handleHttpError(error); return throwError(() => error); }
}

