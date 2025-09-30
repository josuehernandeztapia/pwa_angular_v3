import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';

export interface DocumentUploadRequest {
  file: File;
  clientId: string;
  documentId: string;
  metadata?: Record<string, any>;
  hash?: string;
}

export type DocumentUploadEvent =
  | { type: 'hash-computed'; hash: string; fileSize: number }
  | { type: 'progress'; percentage: number; loaded: number; total?: number }
  | { type: 'completed'; response: any; hash: string }
  | { type: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class DocumentUploadService {
  private readonly uploadEndpoint = `${environment.apiUrl || ''}/documents/upload`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly analytics: AnalyticsService
  ) {}

  async computeFileHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback hash based on file metadata
      return `${file.name}-${file.size}-${file.lastModified}`;
    }
  }

  uploadDocument(request: DocumentUploadRequest): Observable<DocumentUploadEvent> {
    return new Observable<DocumentUploadEvent>(observer => {
      let subscription: Subscription | undefined;
      const emitProgress = (loaded: number, total?: number) => {
        if (!total || total === 0) {
          observer.next({ type: 'progress', percentage: 0, loaded, total });
          return;
        }
        const percentage = Math.min(100, Math.round((loaded / total) * 100));
        observer.next({ type: 'progress', percentage, loaded, total });
      };

      const startUpload = async () => {
        let hash = request.hash;
        if (!hash) {
          hash = await this.computeFileHash(request.file);
          observer.next({ type: 'hash-computed', hash, fileSize: request.file.size });
        } else {
          observer.next({ type: 'hash-computed', hash, fileSize: request.file.size });
        }

        const formData = new FormData();
        formData.append('file', request.file);
        formData.append('client_id', request.clientId);
        formData.append('document_id', request.documentId);
        formData.append('hash', hash);

        if (request.metadata) {
          Object.entries(request.metadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
          });
        }

        const token = this.auth.getToken();
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }

        const httpRequest = new HttpRequest('POST', this.uploadEndpoint, formData, {
          reportProgress: true,
          headers
        });

        subscription = this.http.request(httpRequest).subscribe({
          next: (event: HttpEvent<any>) => {
            switch (event.type) {
              case HttpEventType.Sent:
                emitProgress(0, request.file.size);
                break;
              case HttpEventType.UploadProgress:
                emitProgress(event.loaded, event.total ?? request.file.size);
                break;
              case HttpEventType.Response:
                observer.next({ type: 'completed', response: event.body, hash: hash! });
                observer.complete();
                break;
            }
          },
          error: error => {
            const message = (error?.message || 'Error al subir documento') as string;
            this.analytics.track('documents_upload_error', {
              documentId: request.documentId,
              clientId: request.clientId,
              message,
            });
            observer.next({ type: 'error', message });
            observer.error(error);
          }
        });

      };

      startUpload().catch(error => {
        const message = (error?.message || 'Error al calcular hash') as string;
        observer.next({ type: 'error', message });
        observer.error(error);
      });

      return () => subscription?.unsubscribe();
    });
  }

  async serializeFile(file: File): Promise<{ base64: string; name: string; type: string; size: number }> {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = typeof window !== 'undefined' && window.btoa
      ? window.btoa(binary)
      : btoa(binary);
    return {
      base64,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  }

  async uploadQueuedDocument(request: {
    clientId: string;
    documentId: string;
    fileBase64: string;
    fileName: string;
    fileType: string;
    fileSize?: number;
    hash?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const file = this.deserializeFile(request.fileBase64, request.fileName, request.fileType);
    return new Promise<void>((resolve, reject) => {
      const upload$ = this.uploadDocument({
        file,
        clientId: request.clientId,
        documentId: request.documentId,
        metadata: request.metadata,
        hash: request.hash,
      });

      const subscription = upload$.subscribe({
        next: event => {
          if (event.type === 'completed') {
            subscription.unsubscribe();
            resolve();
          }
        },
        error: error => {
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  private deserializeFile(base64: string, name: string, type: string): File {
    const binary = typeof window !== 'undefined' && window.atob
      ? window.atob(base64)
      : atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], name, { type, lastModified: Date.now() });
  }
}
