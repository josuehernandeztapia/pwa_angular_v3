import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { BusinessFlow, Document, DocumentStatus } from '../models/types';
import { FlowContextService } from '../services/flow-context.service';
import { MarketPolicyContext, MarketPolicyService } from '../services/market-policy.service';
import { ToastService } from '../services/toast.service';

interface StoredCompletionStatus {
  totalDocs: number;
  completedDocs: number;
  pendingDocs: number;
  completionPercentage: number;
  allComplete: boolean;
}

interface StoredDocumentContext {
  completionStatus?: StoredCompletionStatus;
  documents?: Document[];
  policyContext?: MarketPolicyContext;
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
    quotationData?: any;
  };
}

@Injectable({ providedIn: 'root' })
export class DocsCompletedGuard implements CanActivate {
  private readonly documentsContextKey = 'documentos';
  private readonly onboardingContextKey = 'onboarding-wizard';
  private readonly contractsStepIndex = 4; // selection, client_info, documents, kyc, contracts, completed

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly marketPolicy: MarketPolicyService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.evaluateAndHandle(state.url, false);
  }

  canProceed(): boolean {
    return this.hasClearance();
  }

  enforceDocumentClearance(targetUrl: string): boolean {
    const result = this.evaluateAndHandle(targetUrl, true);
    return result === true;
  }

  private evaluateAndHandle(targetUrl: string, navigateOnFailure: boolean): boolean | UrlTree {
    if (this.hasClearance()) {
      return true;
    }

    this.toast.warning('Completa los documentos requeridos antes de continuar');
    const redirectTree = this.router.parseUrl(this.buildRedirectUrl(targetUrl));

    if (navigateOnFailure) {
      this.router.navigateByUrl(redirectTree);
      return false;
    }

    return redirectTree;
  }

  private hasClearance(): boolean {
    if (this.hasDocumentClearance()) {
      return true;
    }

    if (this.hasWizardClearance()) {
      return true;
    }

    return false;
  }

  private buildRedirectUrl(targetUrl: string): string {
    const sanitizedTarget = targetUrl || '/onboarding/contracts';
    return '/onboarding?redirectTo=' + encodeURIComponent(sanitizedTarget);
  }

  private hasDocumentClearance(): boolean {
    const stored = this.flowContext.getContextData<StoredDocumentContext>(this.documentsContextKey);
    if (!stored) {
      return false;
    }

    const policyContext = this.resolvePolicyContext(stored);
    if (policyContext && Array.isArray(stored.documents) && stored.documents.length) {
      const requiredDocs = this.marketPolicy.getRequiredDocs(policyContext);
      if (requiredDocs.length) {
        const documentsById = new Map(stored.documents.map(doc => [doc.id, doc]));
        const missingRequired = requiredDocs.filter(doc => {
          const current = documentsById.get(doc.id);
          return current?.status !== DocumentStatus.Aprobado;
        });

        if (!missingRequired.length) {
          return true;
        }
      }
    }

    const incomeRequired = policyContext ? this.requiresIncomeDocument(policyContext, stored) : false;
    if (incomeRequired && policyContext && !this.isIncomeDocumentApproved(stored.documents, policyContext)) {
      return false;
    }

    return stored.completionStatus?.allComplete === true;
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

  private requiresIncomeDocument(policyContext: MarketPolicyContext, stored: StoredDocumentContext): boolean {
    if (policyContext.requiresIncomeProof === false) {
      return false;
    }

    if (policyContext.requiresIncomeProof === true) {
      return true;
    }

    if (stored.flowContext?.requiresIncomeProof === true) {
      return true;
    }

    if (stored.flowContext?.requiresIncomeProof === false) {
      return false;
    }

    const monthlyPayment = this.extractMonthlyPayment(stored);
    const threshold = this.extractIncomeThreshold(stored, policyContext);

    if (monthlyPayment === null || threshold === null) {
      return false;
    }

    return monthlyPayment > threshold;
  }

  private isIncomeDocumentApproved(documents: Document[] | undefined, policyContext: MarketPolicyContext): boolean {
    if (!documents || !documents.length) {
      return false;
    }

    const incomeDocId = this.marketPolicy.getIncomeDocumentId(policyContext) ?? 'doc-income';
    const doc = documents.find(entry => entry.id === incomeDocId);
    return doc?.status === DocumentStatus.Aprobado;
  }

  private extractMonthlyPayment(stored: StoredDocumentContext): number | null {
    const direct = stored.flowContext?.monthlyPayment;
    if (typeof direct === 'number' && Number.isFinite(direct)) {
      return direct;
    }

    const quotation = stored.flowContext?.quotationData as any;
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

    const quotation = stored.flowContext?.quotationData as any;
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

  private hasWizardClearance(): boolean {
    const snapshot: any = this.flowContext.getContextData<any>(this.onboardingContextKey);
    if (!snapshot) {
      return false;
    }

    if (typeof snapshot.currentStepIndex === 'number' && snapshot.currentStepIndex >= this.contractsStepIndex) {
      return true;
    }

    const currentStep: string | undefined = snapshot.currentStep;
    if (currentStep) {
      const stepOrder = ['selection', 'client_info', 'documents', 'kyc', 'contracts', 'completed'];
      const index = stepOrder.indexOf(currentStep);
      if (index >= this.contractsStepIndex) {
        return true;
      }
    }

    const docsState: StoredCompletionStatus | undefined = snapshot.documents?.completionStatus;
    if (docsState?.allComplete) {
      return true;
    }

    return false;
  }
}
