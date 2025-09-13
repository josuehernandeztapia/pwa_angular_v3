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
  template: `
  <div style="padding:16px;">
    <h1>🧪 LAB – Transferencia de Turno (Consenso)</h1>
    <p>Inicia solicitudes de transferencia, recolecta votos, aprueba como empresa y ejecuta la transferencia en el calendario.</p>

    <fieldset style="border:1px solid #ddd; padding:12px; margin-bottom:16px;">
      <legend>Crear solicitud</legend>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <label>Tanda ID <input class="input" [(ngModel)]="tandaId" name="tandaId"></label>
        <label>De (memberId) <input class="input" [(ngModel)]="fromMemberId" name="fromMemberId"></label>
        <label>A (memberId) <input class="input" [(ngModel)]="toMemberId" name="toMemberId"></label>
        <label>Razón <input class="input" [(ngModel)]="reason" name="reason"></label>
        <label>Solicitado por <input class="input" [(ngModel)]="requestedBy" name="requestedBy"></label>
        <button class="btn" (click)="createRequest()">Crear solicitud</button>
      </div>
      <div *ngIf="message" style="margin-top:8px;">{{message}}</div>
    </fieldset>

    <fieldset style="border:1px solid #ddd; padding:12px; margin-bottom:16px;">
      <legend>Votar solicitud</legend>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <label>Consensus ID <input class="input" [(ngModel)]="consensusId" name="consensusId"></label>
        <label>Miembro (id) <input class="input" [(ngModel)]="voterId" name="voterId"></label>
        <label>Nombre <input class="input" [(ngModel)]="voterName" name="voterName"></label>
        <label>Voto
          <select class="input" [(ngModel)]="vote" name="vote">
            <option value="approve">approve</option>
            <option value="reject">reject</option>
            <option value="abstain">abstain</option>
          </select>
        </label>
        <button class="btn" (click)="castVote()">Votar</button>
      </div>
      <div *ngIf="voteMessage" style="margin-top:8px;">{{voteMessage}}</div>
    </fieldset>

    <fieldset style="border:1px solid #ddd; padding:12px; margin-bottom:16px;">
      <legend>Aprobación de empresa</legend>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <label>Consensus ID <input class="input" [(ngModel)]="consensusId" name="consensusId2"></label>
        <label>Aprobado por <input class="input" [(ngModel)]="companyApprover" name="companyApprover"></label>
        <label>¿Aprobar?
          <select class="input" [(ngModel)]="companyApprove" name="companyApprove">
            <option [ngValue]="true">Sí</option>
            <option [ngValue]="false">No</option>
          </select>
        </label>
        <button class="btn" (click)="companyApproval()">Aprobar/Rechazar</button>
      </div>
      <div *ngIf="companyMessage" style="margin-top:8px;">{{companyMessage}}</div>
    </fieldset>

    <fieldset style="border:1px solid #ddd; padding:12px; margin-bottom:16px;">
      <legend>Ejecutar transferencia</legend>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <label>Tanda ID <input class="input" [(ngModel)]="tandaId" name="tandaId2"></label>
        <label>Transfer Event ID <input class="input" [(ngModel)]="transferEventId" name="transferEventId"></label>
        <button class="btn" (click)="executeTransfer()">Ejecutar</button>
      </div>
      <div *ngIf="execMessage" style="margin-top:8px;">{{execMessage}}</div>
    </fieldset>

    <fieldset style="border:1px solid #ddd; padding:12px; margin-bottom:16px;">
      <legend>Impacto IRR (previo)</legend>
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
        <label>Tanda ID <input class="input" [(ngModel)]="tandaId" name="tandaId3"></label>
        <label>Horizonte (m) <input type="number" class="input" [(ngModel)]="horizon" name="horizon"></label>
        <label>Colectivo <input class="input" [(ngModel)]="collectiveId" name="collectiveIdPrev" placeholder="colectivo_edomex_01"></label>
        <button class="btn" (click)="previewIrr()">Calcular</button>
      </div>
      <div style="margin-top:8px; color:#555;">
        Target IRR: <strong>{{ (currentTargetIrr*100) | number:'1.2-2' }}%</strong>
      </div>
      <div *ngIf="irrResults.length" style="margin-top:8px;">
        <table class="table" style="width:100%; border-collapse:collapse;">
          <thead><tr><th>Escenario</th><th>IRR%</th><th>tirOK</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of irrResults"><td>{{r.name}}</td><td>{{(r.irrAnnual*100) | number:'1.2-2'}}</td><td>{{r.tirOK?'✓':'✗'}}</td></tr>
          </tbody>
        </table>
      </div>
    </fieldset>
  </div>
  `,
  styles: [`.input{padding:6px 8px;border:1px solid #ccc;border-radius:4px}.btn{padding:8px 12px;border:1px solid #333;background:#fff;border-radius:4px;cursor:pointer}`]
})
export class TandaConsensusPanelComponent {
  tandaId = 'tanda-demo-001';
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
        next: res => this.message = `✅ Solicitud creada. transferEventId=${res.transferEventId}, consensusId=${res.consensusId}`,
        error: err => this.message = `❌ ${err}`
      });
  }

  castVote() {
    this.voteMessage = '';
    this.tanda.voteOnTransfer(this.tandaId, this.consensusId, this.voterId, this.vote)
      .subscribe({
        next: (res: any) => this.voteMessage = `✅ Voto registrado. Aprobaciones: ${res.currentApprovals}/${res.requiredApprovals} (estado: ${res.consensusReached ? 'reached' : 'open'})`,
        error: (err: any) => this.voteMessage = `❌ ${err}`
      });
  }

  companyApproval() {
    this.companyMessage = '';
    this.tanda.approveTransferByCompany(this.tandaId, this.consensusId, this.companyApprover, 'Operación', this.companyApprove)
      .subscribe({
        next: (res: any) => this.companyMessage = res.message,
        error: (err: any) => this.companyMessage = `❌ ${err}`
      });
  }

  executeTransfer() {
    this.execMessage = '';
    this.tanda.executeApprovedTransfer(this.tandaId, this.transferEventId)
      .subscribe({
        next: (res: any) => this.execMessage = res.message,
        error: (err: any) => this.execMessage = `❌ ${err}`
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
