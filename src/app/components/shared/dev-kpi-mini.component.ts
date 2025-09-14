import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-dev-kpi-mini',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dev-kpi-card" aria-label="KPIs de Postventa (dev)">
      <div class="kpi-item">
        <div class="kpi-label">t_first_recommendation (avg)</div>
        <div class="kpi-value">{{ avgMs() }} ms</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">%need_info</div>
        <div class="kpi-value">{{ pctNeedInfo() }}%</div>
      </div>
    </div>
  `,
  styles: [`
    .dev-kpi-card { display:flex; gap:16px; padding:12px; border-radius:12px; border:1px dashed #94a3b8; background:#0b1220; color:#e2e8f0; }
    .kpi-item { display:flex; flex-direction:column; gap:4px; }
    .kpi-label { font-size:12px; color:#94a3b8; }
    .kpi-value { font-size:18px; font-weight:700; }
  `]
})
export class DevKpiMiniComponent {
  private getMs(): number[] {
    try { return JSON.parse(localStorage.getItem('kpi:firstRecommendation:list') || '[]'); } catch { return []; }
  }
  private getNeed(): { need: number; total: number } {
    try { return JSON.parse(localStorage.getItem('kpi:needInfo:agg') || '{"need":0,"total":0}'); } catch { return { need: 0, total: 0 }; }
  }
  avgMs = signal<number>(0);
  pctNeedInfo = signal<number>(0);

  constructor() { this.refresh(); }

  refresh() {
    const arr = this.getMs();
    const avg = arr.length ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length) : 0;
    const agg = this.getNeed();
    const pct = agg.total ? Math.round((agg.need / agg.total) * 100) : 0;
    this.avgMs.set(avg);
    this.pctNeedInfo.set(pct);
  }
}

