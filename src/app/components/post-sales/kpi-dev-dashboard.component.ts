import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-kpi-dev-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-dev" *ngIf="!isProd">
      <h3>🧪 KPIs (Dev)</h3>
      <div class="grid">
        <div class="card">
          <div class="label">Casos</div>
          <div class="value">{{ summary?.cases || 0 }}</div>
        </div>
        <div class="card">
          <div class="label">Need Info (casos)</div>
          <div class="value">{{ summary?.needInfoCases || 0 }}</div>
        </div>
        <div class="card">
          <div class="label">% Need Info</div>
          <div class="value">{{ (summary?.p_need_info || 0) * 100 | number:'1.0-0' }}%</div>
        </div>
        <div class="card">
          <div class="label">t_first_recommendation (avg)</div>
          <div class="value">{{ ((summary?.t_first_recommendation_avg_ms || 0)/1000) | number:'1.1-1' }}s</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-dev { margin-top: 12px; padding: 12px; border:1px dashed #374151; border-radius:8px; color:#e5e7eb; background:#111827; }
    h3 { margin: 0 0 8px 0; color:#93c5fd; }
    .grid { display:grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap:8px; }
    .card { background:#1f2937; border:1px solid #374151; border-radius:8px; padding:10px; }
    .label { font-size:12px; color:#9ca3af; }
    .value { font-size:16px; font-weight:700; }
    @media (max-width:768px){ .grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
  `]
})
export class KpiDevDashboardComponent implements OnInit {
  isProd = environment.production;
  summary: any = null;
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.isProd) return;
    const base = environment.apiUrl;
    this.http.get(`${base}/cases/metrics/summary`).subscribe({
      next: (data) => this.summary = data,
      error: () => this.summary = { cases: 0, needInfoCases: 0, p_need_info: 0, t_first_recommendation_avg_ms: 0 }
    });
  }
}

