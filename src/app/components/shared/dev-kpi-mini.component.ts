import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-dev-kpi-mini',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dev-kpi-mini.component.html',
  styleUrls: ['./dev-kpi-mini.component.scss']
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
