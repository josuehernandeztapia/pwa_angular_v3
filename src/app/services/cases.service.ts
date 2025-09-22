import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, switchMap } from 'rxjs';
import { ManualOCRData } from '../components/shared/manual-ocr-entry/manual-ocr-entry.component';

export type AttachmentType = 'plate' | 'vin' | 'odometer' | 'evidence' | 'other';

export interface CaseRecord {
  id: string;
  status: 'open' | 'need_info' | 'in_progress' | 'solved';
  created_at: string;
}

export interface PresignResponse {
  uploadId: string;
  url: string;
  fields: Record<string, string>;
  key: string;
  bucket: string;
  region: string;
}

export interface RegisteredAttachment {
  id: string;
  case_id: string;
  type: AttachmentType;
  filename: string;
  content_type: string;
  url: string;
  ocr_confidence?: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CasesService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  createCase(): Observable<CaseRecord> {
    return this.http.post<CaseRecord>(`${this.base}/cases`, {});
  }

  getCase(id: string): Observable<CaseRecord> {
    return this.http.get<CaseRecord>(`${this.base}/cases/${id}`);
  }

  presign(caseId: string, type: AttachmentType, file: File): Observable<PresignResponse> {
    const body = { type, filename: file.name, contentType: file.type || 'application/octet-stream' };
    return this.http.post<PresignResponse>(`${this.base}/cases/${caseId}/attachments/presign`, body);
  }

// removed by clean-audit
  // For real S3, replace with actual form POST to url with fields + file
  register(
    caseId: string,
    presign: PresignResponse,
    type: AttachmentType,
    file: File
  ): Observable<RegisteredAttachment> {
    const publicUrl = `${presign.url}/${presign.key}`;
    const body = {
      uploadId: presign.uploadId,
      type,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      publicUrl,
    };
    return this.http.post<RegisteredAttachment>(`${this.base}/cases/${caseId}/attachments/register`, body);
  }

  ocr(caseId: string, attachmentId: string, forceLow = false): Observable<{ confidence: number; missing?: string[] }> {
    const body = forceLow ? { forceLow: true } : {};
    return this.http.post<{ confidence: number; missing?: string[] }>(
      `${this.base}/cases/${caseId}/attachments/${attachmentId}/ocr`,
      body
    );
  }

  // Helper to do presign -> register -> ocr in one shot
  uploadAndAnalyze(
    caseId: string,
    type: AttachmentType,
    file: File
  ): Observable<{ attachment: RegisteredAttachment; ocr: { confidence: number; missing?: string[] } }> {
    return this.presign(caseId, type, file).pipe(
      switchMap((pre) => this.register(caseId, pre, type, file).pipe(
        switchMap((att) => this.ocr(caseId, att.id).pipe(
          switchMap((ocr) => of({ attachment: att, ocr }))
        ))
      ))
    );
  }

  // Metrics endpoints
  recordFirstRecommendation(caseId: string, millis: number): Observable<{ ok: boolean; firstRecommendationMs: number }> {
    return this.http.post<{ ok: boolean; firstRecommendationMs: number }>(`${this.base}/cases/${caseId}/metrics/first-recommendation`, { millis });
  }

  recordNeedInfo(caseId: string, fields: string[]): Observable<{ ok: boolean; count: number }> {
    return this.http.post<{ ok: boolean; count: number }>(`${this.base}/cases/${caseId}/metrics/need-info`, { fields });
  }

  /**
   * 🔄 P0.2 SURGICAL FIX - Store manual OCR data
   */
  storeManualOCRData(caseId: string, documentType: string, data: ManualOCRData): Observable<{ ok: boolean; stored: boolean }> {
    const body = {
      documentType,
      fields: data.fields,
      confidence: data.confidence,
      isManual: data.isManual,
      timestamp: new Date().toISOString()
    };

    return this.http.post<{ ok: boolean; stored: boolean }>(`${this.base}/cases/${caseId}/manual-ocr`, body);
  }
}

// removed by clean-audit