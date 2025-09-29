import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TandaDeliveryService } from '../../../services/tanda-delivery.service';
import { EnhancedTandaSimulationService, TandaScenarioResult } from '../../../services/enhanced-tanda-simulation.service';
import { FinancialCalculatorService } from '../../../services/financial-calculator.service';
import { RiskService } from '../../../services/risk.service';

@Component({
  selector: 'app-tanda-consensus-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tanda-consensus-panel.component.html',
  styleUrls: ['./tanda-consensus-panel.component.scss']
})
export class TandaConsensusPanelComponent {
  tandaId = '';
  fromMemberId = '';
  toMemberId = '';
  reason = '';
  requestedBy = '';
  consensusId = '';
  voterId = '';
  voterName = '';
  vote: 'approve'|'reject'|'abstain' = 'approve';
  companyApprover = '';
  companyApprove = true;
  transferEventId = '';
  horizon = 12;
  collectiveId = '';
  currentTargetIrr = 0;

  message = '';
  voteMessage = '';
  companyMessage = '';
  execMessage = '';
  irrResults: TandaScenarioResult[] = [];

  constructor(
    private tanda: TandaDeliveryService,
    private sim: EnhancedTandaSimulationService,
    private fin: FinancialCalculatorService,
    private risk: RiskService
  ) {}

  createRequest() {
    this.message = '';
    this.tanda.requestTurnTransfer(this.tandaId, this.fromMemberId, this.toMemberId, this.reason, this.requestedBy)
      .subscribe({
        next: res => this.message = ` Solicitud creada. transferEventId=${res.transferEventId}, consensusId=${res.consensusId}`,
        error: err => this.message = ` ${err}`
      });
  }

  castVote() {
    this.voteMessage = '';
    this.tanda.voteOnTransfer(this.tandaId, this.consensusId, this.voterId, this.vote)
      .subscribe({
        next: (res: any) => this.voteMessage = ` Voto registrado. Aprobaciones: ${res.currentApprovals}/${res.requiredApprovals} (estado: ${res.consensusReached ? 'reached' : 'open'})`,
        error: (err: any) => this.voteMessage = ` ${err}`
      });
  }

  companyApproval() {
    this.companyMessage = '';
    this.tanda.approveTransferByCompany(this.tandaId, this.consensusId, this.companyApprover, 'Operación', this.companyApprove)
      .subscribe({
        next: (res: any) => this.companyMessage = res.message,
        error: (err: any) => this.companyMessage = ` ${err}`
      });
  }

  executeTransfer() {
    this.execMessage = '';
    this.tanda.executeApprovedTransfer(this.tandaId, this.transferEventId)
      .subscribe({
        next: (res: any) => this.execMessage = res.message,
        error: (err: any) => this.execMessage = ` ${err}`
      });
  }

  previewIrr() {
    this.irrResults = [];
    this.tanda.getTandaById(this.tandaId).subscribe(group => {
      if (!group) { this.execMessage = 'No se encontró la tanda'; return; }
      const baseTarget = this.fin.getIrrTarget(group.market, {
        collectiveId: (this.collectiveId || group.id) || undefined,
        ecosystemId: group.ecosystemId
      });
      const premiumBps = this.risk.getIrrPremiumBps({ ecosystemId: group.ecosystemId });
      const target = baseTarget + (premiumBps / 10000);
      this.currentTargetIrr = target;
      const res = this.sim.simulateWhatIfFromSchedule(group, group.market as any, { targetIrrAnnual: target, horizonMonths: this.horizon });
      this.irrResults = [res];
    });
  }
}
