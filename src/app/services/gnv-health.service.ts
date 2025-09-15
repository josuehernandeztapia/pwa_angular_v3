import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StationHealthStatus = 'green' | 'yellow' | 'red';

export interface StationHealthRow {
  stationId: string;
  stationName: string;
  fileName: string;
  rowsTotal: number;
  rowsAccepted: number;
  rowsRejected: number;
  warnings: number;
  status: StationHealthStatus;
}

@Injectable({ providedIn: 'root' })
export class GnvHealthService {
  private http = inject(HttpClient);
  private csvPath = 'assets/gnv/ingesta_yesterday.csv';

  getYesterdayHealth(): Observable<StationHealthRow[]> {
    // If BFF is enabled, fetch JSON; else parse CSV from assets
    if ((environment.features as any)?.enableGnvBff) {
      const date = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10);
      const url = `${environment.apiUrl}/bff/gnv/stations/health?date=${date}`;
      return this.http.get<any[]>(url).pipe(map(items => this.normalize(items)));
    } else {
      return this.http.get(this.csvPath, { responseType: 'text' }).pipe(
        map(text => this.parseCsv(text))
      );
    }
  }

  private parseCsv(text: string): StationHealthRow[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];
    const header = lines[0].split(',').map(h => h.trim());
    const idx = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());
    const iStationId = idx('station_id');
    const iStationName = idx('station_name');
    const iFileName = idx('file_name');
    const iRowsTotal = idx('rows_total');
    const iRowsAccepted = idx('rows_accepted');
    const iRowsRejected = idx('rows_rejected');
    const iWarnings = idx('warnings');

    const rows: StationHealthRow[] = [];
    for (let li = 1; li < lines.length; li++) {
      const cols = lines[li].split(',');
      if (cols.length < header.length) continue;
      const total = parseInt(cols[iRowsTotal] || '0', 10) || 0;
      const accepted = parseInt(cols[iRowsAccepted] || '0', 10) || 0;
      const rejected = parseInt(cols[iRowsRejected] || '0', 10) || 0;
      const warnings = parseInt(cols[iWarnings] || '0', 10) || 0;
      const fileName = (cols[iFileName] || '').trim();

      let status: StationHealthStatus = 'green';
      if (!fileName || total === 0) {
        status = 'red';
      } else {
        const acceptanceRate = accepted / total;
        const rejectionRate = rejected / total;
        const warningRate = warnings / total;
        
        // Weighted health score calculation
        // Base score from acceptance rate (0-100)
        let healthScore = acceptanceRate * 100;
        
        // Penalize rejections more heavily than warnings
        const rejectionPenalty = rejectionRate * 60; // Max 60 point penalty
        const warningPenalty = warningRate * 20; // Max 20 point penalty
        
        healthScore = Math.max(0, healthScore - rejectionPenalty - warningPenalty);
        
        // Apply thresholds for status determination
        if (healthScore >= 80 || (acceptanceRate >= 0.85 && rejectionRate <= 0.15)) {
          status = 'green';
        } else if (healthScore >= 60 || (acceptanceRate >= 0.7 && rejectionRate <= 0.25)) {
          status = 'yellow';
        } else {
          status = 'red';
        }
      }

      rows.push({
        stationId: (cols[iStationId] || '').trim(),
        stationName: (cols[iStationName] || '').trim(),
        fileName,
        rowsTotal: total,
        rowsAccepted: accepted,
        rowsRejected: rejected,
        warnings,
        status
      });
    }
    return rows;
  }

  private normalize(items: any[]): StationHealthRow[] {
    return (items || []).map(it => {
      const total = Number(it.rowsTotal || 0);
      const accepted = Number(it.rowsAccepted || 0);
      const rejected = Number(it.rowsRejected || 0);
      const warnings = Number(it.warnings || 0);
      const fileName = it.fileName || '';

      let status: StationHealthStatus = 'green';
      if (!fileName || total === 0) {
        status = 'red';
      } else {
        const acceptanceRate = accepted / total;
        const rejectionRate = rejected / total;
        const warningRate = warnings / total;
        
        // Weighted health score calculation
        // Base score from acceptance rate (0-100)
        let healthScore = acceptanceRate * 100;
        
        // Penalize rejections more heavily than warnings
        const rejectionPenalty = rejectionRate * 60; // Max 60 point penalty
        const warningPenalty = warningRate * 20; // Max 20 point penalty
        
        healthScore = Math.max(0, healthScore - rejectionPenalty - warningPenalty);
        
        // Apply thresholds for status determination
        if (healthScore >= 80 || (acceptanceRate >= 0.85 && rejectionRate <= 0.15)) {
          status = 'green';
        } else if (healthScore >= 60 || (acceptanceRate >= 0.7 && rejectionRate <= 0.25)) {
          status = 'yellow';
        } else {
          status = 'red';
        }
      }

      return {
        stationId: it.stationId || it.id || '',
        stationName: it.stationName || it.name || '',
        fileName,
        rowsTotal: total,
        rowsAccepted: accepted,
        rowsRejected: rejected,
        warnings,
        status
      };
    });
  }
}
