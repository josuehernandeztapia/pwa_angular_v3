import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';

export interface GnvStationHealth {
  id: string;
  name: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  lastReportDate?: string;
  utilizationPct?: number;
}

@Injectable({ providedIn: 'root' })
export class GnvHealthService {
  private readonly useBff = !!(environment as any)?.features?.enableGnvBff;
  private readonly base = `${environment.apiUrl}/bff/gnv`;

  constructor(private http: HttpClient) {}

  getStationsHealth(dateISO?: string): Observable<{ date: string; stations: GnvStationHealth[] }> {
    if (!this.useBff) {
      const date = dateISO || new Date().toISOString().slice(0, 10);
      return of({
        date,
        stations: [
          { id: 'gnv-ags-001', name: 'GNV Centro AGS', status: 'excellent', lastReportDate: date, utilizationPct: 82 },
          { id: 'gnv-ags-002', name: 'GNV Norte AGS', status: 'good', lastReportDate: date, utilizationPct: 65 },
          { id: 'gnv-em-001', name: 'GNV Ruta Centro EdoMex', status: 'warning', lastReportDate: date, utilizationPct: 92 },
        ],
      });
    }
    const q = dateISO ? `?date=${encodeURIComponent(dateISO)}` : '';
    return this.http.get<{ date: string; stations: GnvStationHealth[] }>(`${this.base}/stations/health${q}`);
  }

  getTemplateCsvUrl(): string {
    return `${this.base}/template.csv`;
  }

  getGuidePdfUrl(): string {
    return `${this.base}/guide.pdf`;
  }
}

