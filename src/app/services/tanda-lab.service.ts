import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';

export interface TandaInput { participants: number; monthly: number; startMonth: number; }
export interface TandaResult { assignedMonth: number; coverage: number; warnings?: string[]; }

@Injectable({ providedIn: 'root' })
export class TandaLabService {
  constructor(private http: HttpClient, private errors: ErrorHandlerService) {}
  simulateEnhanced(body: TandaInput): Observable<TandaResult> { 
    return this.http.post<TandaResult>(`${environment.api.labs}/tanda/enhanced`, body).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }
  simulateConsensus(body: TandaInput): Observable<TandaResult> { 
    return this.http.post<TandaResult>(`${environment.api.labs}/tanda/consensus`, body).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }
  private handle(error: HttpErrorResponse) { this.errors.handleHttpError(error); return throwError(() => error); }
}

