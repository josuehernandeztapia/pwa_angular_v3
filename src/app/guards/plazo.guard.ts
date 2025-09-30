import { Injectable, Optional } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { BusinessFlow, Document, DocumentStatus } from '../models/types';
import { FlowContextService } from '../services/flow-context.service';
import { MarketPolicyContext } from '../services/market-policy.service';
import { ToastService } from '../services/toast.service';

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
}

@Injectable({ providedIn: 'root' })
export class PlazoGuard implements CanActivate {
  private readonly documentsContextKey = 'documentos';
  private failureMessage = 'Ajusta el plan de pagos antes de continuar.';

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly toast: ToastService,
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
      return true;
    }

    const policyContext = this.resolvePolicyContext(stored);
    if (!policyContext) {
      return true;
    }

    if (policyContext.saleType !== 'financiero') {
      return true;
    }

    const monthlyPayment = this.extractMonthlyPayment(stored);
    const incomeThreshold = this.extractIncomeThreshold(stored);

    if (monthlyPayment === null || incomeThreshold === null) {
      return true;
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
    };
  }

  private extractMonthlyPayment(stored: StoredDocumentContext): number | null {
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

  private extractIncomeThreshold(stored: StoredDocumentContext): number | null {
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

    return null;
  }
}
