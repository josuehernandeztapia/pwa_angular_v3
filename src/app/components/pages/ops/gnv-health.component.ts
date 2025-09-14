import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { GnvHealthService, StationHealthRow } from '../../../services/gnv-health.service';

@Component({
  selector: 'app-gnv-health',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gnv-health-container">
      <!-- Header -->
      <div class="header">
        <h1>⛽ GNV T+1 — Salud por estación</h1>
        <p class="subtitle">Estado de la ingesta del día anterior por estación (stub dev)</p>
      </div>

      <!-- Actions -->
      <div class="actions">
        <a class="btn" href="assets/gnv/template.csv" download data-cy="dl-template">📄 Plantilla CSV</a>
        <a class="btn" href="assets/gnv/gnv_guide.pdf" target="_blank" rel="noopener" data-cy="dl-guide">📘 Guía PDF</a>
        <a class="btn" href="assets/gnv/ingesta_yesterday.csv" download data-cy="dl-latest">⬇️ Última ingesta</a>
      </div>

      <!-- Table -->
      <div class="table-card" *ngIf="rows().length > 0; else emptyTpl">
        <table class="health-table">
          <thead>
            <tr>
              <th>Estación</th>
              <th>Archivo</th>
              <th>Total</th>
              <th>Aceptadas</th>
              <th>Rechazadas</th>
              <th>Warnings</th>
              <th>Semáforo</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows(); trackBy: trackByStation">
              <td class="nowrap">{{ r.stationName }}</td>
              <td>{{ r.fileName || '—' }}</td>
              <td class="num">{{ r.rowsTotal }}</td>
              <td class="num ok">{{ r.rowsAccepted }}</td>
              <td class="num bad">{{ r.rowsRejected }}</td>
              <td class="num warn">{{ r.warnings }}</td>
              <td>
                <span class="status-dot" [class.green]="r.status==='green'" [class.yellow]="r.status==='yellow'" [class.red]="r.status==='red'" [attr.data-cy]="'status-' + r.status" title="{{ r.status | titlecase }}"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyTpl>
        <div class="empty">No hay datos de ingesta disponibles.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .gnv-health-container { padding: 24px; }
    .header h1 { margin: 0 0 4px 0; font-size: 24px; font-weight: 800; }
    .subtitle { color: #64748b; margin: 0 0 16px 0; }
    .actions { display:flex; gap: 8px; margin-bottom: 12px; }
    .btn { padding: 8px 12px; border:1px solid #e5e7eb; border-radius:8px; text-decoration: none; color: #111827; background:#fff; }
    .btn:hover { background:#f9fafb; }
    .table-card { border:1px solid #e5e7eb; border-radius: 12px; background:#fff; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; background:#f8fafc; color:#374151; padding: 10px; font-weight: 700; font-size: 13px; }
    tbody td { padding: 10px; border-top: 1px solid #f1f5f9; font-size: 14px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .nowrap { white-space: nowrap; }
    .ok { color:#047857; }
    .bad { color:#b91c1c; }
    .warn { color:#b45309; }
    .status-dot { display:inline-block; width: 14px; height: 14px; border-radius:50%; border:2px solid transparent; }
    .status-dot.green { background:#10b981; border-color:#34d399; }
    .status-dot.yellow { background:#f59e0b; border-color:#fbbf24; }
    .status-dot.red { background:#ef4444; border-color:#f87171; }
    .empty { padding: 16px; color:#6b7280; }
  `]
})
export class GnvHealthComponent implements OnInit {
  private svc = inject(GnvHealthService);
  rows = signal<StationHealthRow[]>([]);

  ngOnInit(): void {
    this.svc.getYesterdayHealth().subscribe(rows => this.rows.set(rows));
  }

  trackByStation(_: number, r: StationHealthRow) { return r.stationId; }
}
