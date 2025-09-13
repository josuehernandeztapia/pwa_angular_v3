import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnhancedTandaSimulationService, TandaScenarioResult } from '../../../services/enhanced-tanda-simulation.service';
import { FinancialCalculatorService } from '../../../services/financial-calculator.service';
import { RiskService } from '../../../services/risk.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tanda-enhanced-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="container" style="padding:16px;">
    <h1>🧪 Tanda Enhanced – Panel LAB</h1>
    <p>Simula escenarios de Tanda con prioridades de entrega, eventos y validación de IRR objetivo.</p>

    <form (ngSubmit)="run()" style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
      <label>
        Miembros
        <input type="number" [(ngModel)]="totalMembers" name="members" min="1" class="input" />
      </label>
      <label>
        Aportación mensual
        <input type="number" [(ngModel)]="monthlyAmount" name="amount" min="0" class="input" />
      </label>
      <label>
        Horizonte (meses)
        <input type="number" [(ngModel)]="horizonMonths" name="horizon" min="1" class="input" />
      </label>
      <label>
        Mercado
        <select [(ngModel)]="market" name="market" class="input">
          <option value="aguascalientes">Aguascalientes</option>
          <option value="edomex">Edomex</option>
        </select>
      </label>
      <label>
        Colectivo (opcional)
        <input type="text" [(ngModel)]="collectiveId" name="collectiveId" placeholder="colectivo_edomex_01" class="input" />
      </label>
      <label>
        Ecosistema/Ruta (opcional)
        <input type="text" [(ngModel)]="ecosystemId" name="ecosystemId" placeholder="ruta-centro-edomex" class="input" />
      </label>
      <button type="submit" class="btn">Ejecutar</button>
      <button type="button" class="btn" (click)="exportCSV()" [disabled]="results.length===0">Export CSV</button>
    </form>

    <div style="margin-top:8px; color:#555;">
      Target IRR: <strong>{{ (currentTargetIrr*100) | number:'1.2-2' }}%</strong>
      · Tolerancia: <strong>{{ environment.finance.irrToleranceBps }} bps</strong>
    </div>

    <div *ngIf="results.length" style="margin-top:16px;">
      <h3>Resultados ({{results.length}})</h3>
      <table class="table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #ddd;">Escenario</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">IRR %</th>
            <th style="text-align:center; border-bottom:1px solid #ddd;">TIR OK</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">Awards</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">First</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">Last</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">Active%</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">Deficits</th>
            <th style="text-align:right; border-bottom:1px solid #ddd;">Rescues</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of results">
            <td style="padding:6px 4px;">{{r.name}}</td>
            <td style="padding:6px 4px; text-align:right;">{{ (r.irrAnnual*100) | number:'1.2-2' }}</td>
            <td style="padding:6px 4px; text-align:center;">{{ r.tirOK ? '✓' : '✗' }}</td>
            <td style="padding:6px 4px; text-align:right;">{{ r.metrics.awardsMade }}</td>
            <td style="padding:6px 4px; text-align:right;">{{ r.metrics.firstAwardT || '-' }}</td>
            <td style="padding:6px 4px; text-align:right;">{{ r.metrics.lastAwardT || '-' }}</td>
            <td style="padding:6px 4px; text-align:right;">{{ (r.metrics.activeShareAvg*100) | number:'1.0-0' }}%</td>
            <td style="padding:6px 4px; text-align:right;">{{ r.metrics.deficitsDetected }}</td>
            <td style="padding:6px 4px; text-align:right;">{{ r.metrics.rescuesUsed }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `,
  styles: [`
    .input { padding:6px 8px; border:1px solid #ccc; border-radius:4px; }
    .btn { padding:8px 12px; border:1px solid #333; background:#fff; border-radius:4px; cursor:pointer; }
    .btn:disabled { opacity:0.5; cursor:not-allowed; }
  `]
})
export class TandaEnhancedPanelComponent {
  totalMembers = 12;
  monthlyAmount = 1000;
  horizonMonths = 24;
  market: any = 'aguascalientes';
  collectiveId = '';
  ecosystemId = '';
  environment = environment;
  currentTargetIrr = this.fin.getIrrTarget(this.market);

  results: TandaScenarioResult[] = [];

  constructor(private tandaSvc: EnhancedTandaSimulationService, private fin: FinancialCalculatorService, private risk: RiskService) {}

  run() {
    const baseTarget = this.fin.getIrrTarget(this.market, {
      collectiveId: this.collectiveId || undefined,
      ecosystemId: this.ecosystemId || undefined
    });
    const premiumBps = this.risk.getIrrPremiumBps({ ecosystemId: this.ecosystemId || undefined });
    const target = baseTarget + (premiumBps / 10000);
    this.currentTargetIrr = target;
    this.results = this.tandaSvc.simulateWithGrid({ totalMembers: this.totalMembers, monthlyAmount: this.monthlyAmount }, this.market, this.horizonMonths, { targetIrrAnnual: target });
  }

  exportCSV() {
    if (!this.results.length) return;
    const headers = ['name','irrAnnual','tirOK','awardsMade','firstAwardT','lastAwardT','activeShareAvg','deficitsDetected','rescuesUsed'];
    const rows = this.results.map(r => [
      r.name,
      (r.irrAnnual*100).toFixed(2),
      r.tirOK ? 'true' : 'false',
      String(r.metrics.awardsMade||0),
      String(r.metrics.firstAwardT||''),
      String(r.metrics.lastAwardT||''),
      (r.metrics.activeShareAvg*100).toFixed(0),
      String(r.metrics.deficitsDetected||0),
      String(r.metrics.rescuesUsed||0)
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanda_enhanced_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
