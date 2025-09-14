import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GnvHealthService, GnvStationHealth } from '../../../services/gnv-health.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gnv-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gnv-health-container">
      <header class="page-header">
        <h1>⛽ GNV – Panel T+1</h1>
        <p class="subtitle">Estado de estaciones y semáforos operativos</p>
      </header>

      <section class="controls">
        <label for="date">Fecha (T+1)</label>
        <input id="date" type="date" [value]="date()" (change)="onDateChange($event)" />
        <a class="link" [href]="templateCsvUrl" target="_blank" rel="noopener">Descargar template CSV</a>
        <a class="link" [href]="guidePdfUrl" target="_blank" rel="noopener">Guía PDF</a>
      </section>

      <section *ngIf="!enabled" class="disabled">
        <p>Integración GNV desactivada. Habilita el flag <code>features.enableGnvBff</code> para conectar BFF.</p>
      </section>

      <section *ngIf="enabled" class="panel">
        <div class="stations" *ngIf="stations().length > 0; else empty">
          <div class="station-card" *ngFor="let s of stations()" [class]="'status-' + s.status">
            <div class="title">{{ s.name }}</div>
            <div class="status">
              <span class="dot"></span>
              <span class="label">{{ s.status | titlecase }}</span>
            </div>
            <div class="meta">
              <div>Últ. reporte: {{ s.lastReportDate || date() }}</div>
              <div>Uso: {{ (s.utilizationPct ?? 0) | number:'1.0-0' }}%</div>
            </div>
          </div>
        </div>
        <ng-template #empty>
          <div class="empty">Sin datos para {{ date() }}</div>
        </ng-template>
      </section>
    </div>
  `,
  styles: [`
    .gnv-health-container { padding: 24px; max-width: 1000px; margin: 0 auto; }
    .page-header h1 { margin: 0 0 6px 0; }
    .subtitle { color: #64748b; margin: 0; }
    .controls { display:flex; align-items:center; gap:12px; margin: 16px 0 12px; }
    .link { color:#0ea5e9; text-decoration:none; }
    .link:hover { text-decoration:underline; }
    .disabled { background:#fff7ed; border:1px solid #fed7aa; padding:12px; border-radius:8px; color:#9a3412; }
    .panel { margin-top: 12px; }
    .stations { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
    .station-card { border:1px solid #e2e8f0; border-radius:10px; padding:12px; background:#fff; }
    .station-card .title { font-weight:600; margin-bottom:6px; }
    .status { display:flex; align-items:center; gap:6px; }
    .status .dot { width:10px; height:10px; border-radius:999px; display:inline-block; }
    .status-excellent .dot { background:#10b981; }
    .status-good .dot { background:#22c55e; }
    .status-warning .dot { background:#f59e0b; }
    .status-critical .dot { background:#ef4444; }
    .meta { color:#64748b; font-size:12px; display:flex; justify-content:space-between; margin-top:8px; }
    .empty { color:#64748b; padding: 12px; }
  `]
})
export class GnvHealthComponent implements OnInit {
  private svc = inject(GnvHealthService);
  enabled = !!(environment as any)?.features?.enableGnvBff;

  date = signal<string>(GnvHealthComponent.yesterdayISO());
  stations = signal<GnvStationHealth[]>([]);

  get templateCsvUrl(): string { return this.svc.getTemplateCsvUrl(); }
  get guidePdfUrl(): string { return this.svc.getGuidePdfUrl(); }

  static yesterdayISO(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    if (this.enabled) this.load();
  }

  onDateChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.date.set(v);
    if (this.enabled) this.load();
  }

  private load(): void {
    this.svc.getStationsHealth(this.date()).subscribe({
      next: (res) => this.stations.set(res?.stations || []),
      error: () => this.stations.set([]),
    });
  }
}

