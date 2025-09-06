import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';

type RequirementsConfig = any;

export interface EngineInput {
  market: string; // 'aguascalientes' | 'edomex' | '*'
  flow: string;   // 'VentaPlazo' | 'VentaDirecta' | 'CreditoColectivo' | 'AhorroProgramado'
  city?: string;
  productId?: string;
  clientType?: string; // 'individual' | 'colectivo'
  documents: Array<{ name: string; status: string; uploadedAt?: string; expirationDate?: string }>;
}

export interface EngineOutput {
  checklist: Array<{
    docTypeId: string;
    label: string;
    group: string;
    criticalLevel: string;
    status: string; // Pendiente | En Revisión | Aprobado | Rechazado
    expiryState?: 'ok' | 'warning' | 'expired';
  }>;
  readiness: { kycReady: boolean; scoringReady: boolean; contractReady: boolean };
  blockingReasons: Array<{ gate: 'kyc' | 'scoring' | 'contract'; docTypeId: string; label: string; reason: string }>;
}

@Injectable({ providedIn: 'root' })
export class RequirementsEngineService {
  constructor(private http: HttpClient) {}

  loadConfig(market: string, flow: string, city?: string): Observable<RequirementsConfig> {
    const base$ = this.http.get('assets/config/requirements/base.json');
    const market$ = this.http.get(`assets/config/requirements/markets/${market}.json`).pipe(map(r => r),);
    const flow$ = this.http.get(`assets/config/requirements/flows/${this.normalizeFlow(flow)}.json`).pipe(map(r => r));

    return combineLatest([base$, market$, flow$]).pipe(
      map(([base, mkt, flw]) => this.deepMerge(this.deepMerge(base, mkt || {}), flw || {}))
    );
  }

  evaluate(input: EngineInput): Observable<EngineOutput> {
    return this.loadConfig(input.market, input.flow, input.city).pipe(
      map(cfg => this.buildOutput(cfg, input))
    );
  }

  private buildOutput(cfg: any, input: EngineInput): EngineOutput {
    const docTypes = cfg.docTypes || {};
    const reqGroups = cfg.requirements || {};
    const requiredDocIds = Object.values(reqGroups).flat() as string[];

    const checklist = requiredDocIds.map((id) => {
      const meta = docTypes[id] || { label: id, group: 'otros', criticalLevel: 'none' };
      const match = this.findDocumentMatch(input.documents, meta.label);
      const status = match?.status || 'Pendiente';
      const expiryState = this.computeExpiryState(meta, match);
      return {
        docTypeId: id,
        label: meta.label,
        group: meta.group || 'otros',
        criticalLevel: meta.criticalLevel || 'none',
        status,
        expiryState
      };
    });

    const kycReady = this.isGateReady(checklist, ['INE', 'COMPROBANTE_DOMICILIO']);
    const scoringReady = kycReady && this.isChecklistComplete(checklist, ['kyc', 'personal', 'vehiculo', 'ecosystem', 'ingresos', 'grupo']);
    const contractReady = scoringReady && this.noContractGateBlocks(checklist);

    const blockingReasons = this.computeBlocking(checklist, { kycReady, scoringReady, contractReady });

    return {
      checklist,
      readiness: { kycReady, scoringReady, contractReady },
      blockingReasons
    };
  }

  private findDocumentMatch(docs: EngineInput['documents'], label: string) {
    const lower = label.toLowerCase();
    return docs.find(d => (d.name || '').toLowerCase() === lower) || docs.find(d => (d.name || '').toLowerCase().includes(lower));
  }

  private computeExpiryState(meta: any, doc?: { uploadedAt?: string; expirationDate?: string }): 'ok' | 'warning' | 'expired' | undefined {
    if (!meta?.expiry) return undefined;
    const warn = Number(meta.expiry.warnDays || 14);
    const now = new Date();
    if (doc?.expirationDate) {
      const exp = new Date(doc.expirationDate);
      const diff = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) return 'expired';
      if (diff <= warn) return 'warning';
      return 'ok';
    }
    if (meta.expiry.source === 'uploadedAt' && doc?.uploadedAt) {
      const up = new Date(doc.uploadedAt);
      const elapsed = Math.floor((now.getTime() - up.getTime()) / (1000 * 60 * 60 * 24));
      const windowDays = Number(meta.expiry.windowDays || 0);
      const remaining = windowDays - elapsed;
      if (remaining <= 0) return 'expired';
      if (remaining <= warn) return 'warning';
      return 'ok';
    }
    return undefined;
  }

  private isGateReady(checklist: EngineOutput['checklist'], coreIds: string[]): boolean {
    const map = new Map(checklist.map(i => [i.docTypeId, i]));
    return coreIds.every(id => (map.get(id)?.status || 'Pendiente') === 'Aprobado');
  }

  private isChecklistComplete(checklist: EngineOutput['checklist'], consideredGroups: string[]): boolean {
    const items = checklist.filter(i => consideredGroups.includes(i.group) || i.group === 'kyc');
    return items.every(i => i.status === 'Aprobado' || i.docTypeId === 'KYC_BIOMETRICO');
  }

  private noContractGateBlocks(checklist: EngineOutput['checklist']): boolean {
    return checklist.filter(i => i.criticalLevel === 'contract_gate').every(i => i.status === 'Aprobado');
  }

  private computeBlocking(checklist: EngineOutput['checklist'], readiness: { kycReady: boolean; scoringReady: boolean; contractReady: boolean }): EngineOutput['blockingReasons'] {
    const reasons: EngineOutput['blockingReasons'] = [];
    if (!readiness.kycReady) {
      const need = checklist.filter(i => ['INE', 'COMPROBANTE_DOMICILIO'].includes(i.docTypeId) && i.status !== 'Aprobado');
      need.forEach(n => reasons.push({ gate: 'kyc', docTypeId: n.docTypeId, label: n.label, reason: 'Requerido para KYC' }));
    }
    if (!readiness.scoringReady) {
      const need = checklist.filter(i => i.status !== 'Aprobado' && (i.group !== 'otros'));
      need.forEach(n => reasons.push({ gate: 'scoring', docTypeId: n.docTypeId, label: n.label, reason: 'Requerido para Scoring' }));
    }
    if (!readiness.contractReady) {
      const need = checklist.filter(i => i.criticalLevel === 'contract_gate' && i.status !== 'Aprobado');
      need.forEach(n => reasons.push({ gate: 'contract', docTypeId: n.docTypeId, label: n.label, reason: 'Requerido para Contrato' }));
    }
    return reasons;
  }

  private deepMerge(a: any, b: any): any {
    if (!a) return b;
    if (!b) return a;
    const out: any = Array.isArray(a) ? [...a] : { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) {
        out[k] = this.deepMerge(a[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  private normalizeFlow(flow: string): string {
    // Map TypeScript enum labels to file names
    switch (flow) {
      case 'VentaPlazo': return 'venta_plazo';
      case 'VentaDirecta': return 'venta_directa';
      case 'CreditoColectivo': return 'credito_colectivo';
      case 'AhorroProgramado': return 'ahorro_programado';
      default: return 'venta_plazo';
    }
  }
}

