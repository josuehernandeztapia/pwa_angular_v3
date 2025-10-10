import { Injectable, Optional } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { BusinessFlow, Document, DocumentStatus } from '../models/types';
import { FlowContextService } from '../services/flow-context.service';
import { MarketPolicyContext, MarketPolicyService } from '../services/market-policy.service';
import { ToastService } from '../services/toast.service';
import { MathValidationSnapshot } from '../models/math-validation';

interface StoredDocumentContext {
  flowContext?: {
    market?: MarketPolicyContext['market'];
    clientType?: MarketPolicyContext['clientType'];
    saleType?: 'contado' | 'financiero';
    businessFlow?: BusinessFlow;
    collectiveMembers?: number;
    requiresIncomeProof?: boolean;
    monthlyPayment?: number;
    incomeThreshold?: number;
    incomeThresholdRatio?: number;
    quotationData?: {
      monthlyPayment?: number;
      pmt?: number;
      sumPmt?: number;
      incomeThreshold?: number;
      requiredIncomeThreshold?: number;
    };
  };
  policyContext?: MarketPolicyContext;
  documents?: Document[];
  mathValidation?: MathValidationSnapshot | null;
}

@Injectable({ providedIn: 'root' })
export class PlazoGuard implements CanActivate {
  private readonly documentsContextKey = 'documentos';
  private failureMessage = 'Ajusta el plan de pagos antes de continuar.';

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly toast: ToastService,
    private readonly marketPolicy: MarketPolicyService,
    @Optional() private readonly router?: Router,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.evaluateAndHandle(state.url, false);
  }

  enforcePlazoClearance(targetUrl: string): boolean {
    const result = this.evaluateAndHandle(targetUrl, true);
    return result === true;
  }

  private evaluateAndHandle(targetUrl: string, navigateOnFailure: boolean): boolean | UrlTree {
    if (this.hasClearance()) {
      return true;
    }

    this.toast.warning(this.failureMessage);

    if (!this.router) {
      return false;
    }

    const redirectTree = this.router.parseUrl('/cotizador');

    if (navigateOnFailure) {
      this.router.navigateByUrl(redirectTree);
      return false;
    }

    return redirectTree;
  }

  private hasClearance(): boolean {
    this.failureMessage = 'Ajusta el plan de pagos antes de continuar.';

    const stored = this.flowContext.getContextData<StoredDocumentContext>(this.documentsContextKey);
    if (!stored) {
      this.failureMessage = 'Configura la cotización de financiamiento antes de continuar.';
      return false;
    }

    const policyContext = this.resolvePolicyContext(stored);
    if (!policyContext) {
      this.failureMessage = 'Configura la cotización de financiamiento antes de continuar.';
      return false;
    }

    if (policyContext.saleType !== 'financiero') {
      return true;
    }

    const requiresProofFlag = policyContext.requiresIncomeProof ?? stored.flowContext?.requiresIncomeProof;
    if (requiresProofFlag === false) {
      return true;
    }

    const monthlyPayment = this.extractMonthlyPayment(stored);
    const incomeThreshold = this.extractIncomeThreshold(stored, policyContext);

    if (monthlyPayment === null || incomeThreshold === null) {
      this.failureMessage = 'Configura la cotización de financiamiento antes de continuar.';
      return false;
    }

    if (monthlyPayment <= incomeThreshold) {
      return true;
    }

    const documents = stored.documents ?? [];
    const incomeDoc = documents.find(doc => doc.id === 'doc-income');
    if (incomeDoc && incomeDoc.status === DocumentStatus.Aprobado) {
      return true;
    }

    this.failureMessage = 'Reduce el pago mensual (enganche/plazo) o adjunta comprobante de ingresos antes de continuar.';
    return false;
  }

  private resolvePolicyContext(stored: StoredDocumentContext): MarketPolicyContext | null {
    if (stored.policyContext) {
      return stored.policyContext;
    }

    const flow = stored.flowContext;
    if (!flow?.market || !flow?.clientType) {
      return null;
    }

    return {
      market: flow.market,
      clientType: flow.clientType,
      saleType: flow.saleType ?? 'financiero',
      businessFlow: flow.businessFlow ?? BusinessFlow.VentaPlazo,
      requiresIncomeProof: flow.requiresIncomeProof,
      collectiveSize: flow.collectiveMembers,
      incomeThreshold: flow.incomeThreshold,
      incomeThresholdRatio: flow.incomeThresholdRatio,
    };
  }

  private extractMonthlyPayment(stored: StoredDocumentContext): number | null {
    const fromMath = stored.mathValidation?.monthlyPayment;
    if (typeof fromMath === 'number' && Number.isFinite(fromMath) && fromMath > 0) {
      return fromMath;
    }

    const direct = stored.flowContext?.monthlyPayment;
    if (typeof direct === 'number' && Number.isFinite(direct)) {
      return direct;
    }

    const quotation = stored.flowContext?.quotationData;
    const candidates = [
      quotation?.monthlyPayment,
      quotation?.pmt,
      quotation?.sumPmt,
    ];

    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private extractIncomeThreshold(stored: StoredDocumentContext, policyContext: MarketPolicyContext): number | null {
    if (typeof policyContext.incomeThreshold === 'number' && Number.isFinite(policyContext.incomeThreshold)) {
      return policyContext.incomeThreshold;
    }

    const flowThreshold = stored.flowContext?.incomeThreshold;
    if (typeof flowThreshold === 'number' && Number.isFinite(flowThreshold)) {
      return flowThreshold;
    }

    const quotation = stored.flowContext?.quotationData;
    const candidates = [
      quotation?.incomeThreshold,
      quotation?.requiredIncomeThreshold,
    ];
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }

    const ratio = policyContext.incomeThresholdRatio;
    if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0) {
      const monthlyPayment = this.extractMonthlyPayment(stored);
      if (monthlyPayment !== null) {
        return monthlyPayment * ratio;
      }
    }

    const threshold = this.marketPolicy.getIncomeThreshold(policyContext);
    if (typeof threshold === 'number' && Number.isFinite(threshold)) {
      return threshold;
    }

    return null;
  }
}
