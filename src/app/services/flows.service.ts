import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';

export interface FlowNode { id: string; type: string; name: string; config: Record<string,any>; }
export interface FlowEdge { id: string; from: string; to: string; condition?: string; }
export interface FlowDraft { id: string; name: string; version: number; nodes: FlowNode[]; edges: FlowEdge[]; status: 'draft'|'published'; etag?: string; }

@Injectable({ providedIn: 'root' })
export class FlowsService {
  constructor(private http: HttpClient, private errors: ErrorHandlerService) {}

  list(): Observable<FlowDraft[]> { 
    return this.http.get<FlowDraft[]>(`${environment.api.flows}`).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }
  get(id: string): Observable<FlowDraft> { 
    return this.http.get<FlowDraft>(`${environment.api.flows}/${id}`).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }
  create(body: Partial<FlowDraft>): Observable<FlowDraft> { 
    return this.http.post<FlowDraft>(`${environment.api.flows}`, body).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }
  update(id: string, body: Partial<FlowDraft>, etag?: string): Observable<FlowDraft> {
    const options = etag ? { headers: new HttpHeaders({ 'If-Match': etag }) } : {};
    return this.http.put<FlowDraft>(`${environment.api.flows}/${id}`, body, options).pipe(catchError((e: HttpErrorResponse) => this.handle(e)));
  }
  publish(id: string): Observable<void> { 
    return this.http.post<void>(`${environment.api.flows}/${id}/publish`, {}).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }
  validate(id: string): Observable<{ ok: boolean; errors: string[] }> { 
    return this.http.post<{ok:boolean;errors:string[]}>(`${environment.api.flows}/${id}/validate`, {}).pipe(catchError((e: HttpErrorResponse) => this.handle(e))); 
  }

  private handle(error: HttpErrorResponse) {
    this.errors.handleHttpError(error);
    return throwError(() => error);
  }
}

