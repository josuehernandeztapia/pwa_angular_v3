import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnhancedTandaSimulationService, TandaScenarioResult } from '../../../services/enhanced-tanda-simulation.service';
import { FinancialCalculatorService } from '../../../services/financial-calculator.service';
import { RiskService } from '../../../services/risk.service';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-tanda-enhanced-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './tanda-enhanced-panel.component.html',
  styleUrls: ['./tanda-enhanced-panel.component.scss']
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
