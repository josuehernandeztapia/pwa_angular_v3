import { Injectable, Optional } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { BusinessFlow, Document } from '../models/types';
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
    quotationData?: any;
  };
  policyContext?: MarketPolicyContext;
  documents?: Document[];
  mathValidation?: MathValidationSnapshot | null;
}

interface ProtectionContextSnapshot {
  applied?: boolean;
  appliedAt?: number;
  coverageType?: string;
  score?: number;
  advisorId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProtectionRequiredGuard implements CanActivate {
  private readonly documentsContextKey = 'documentos';
  private readonly protectionContextKeys = ['protection', 'proteccion'];
  private failureMessage = 'Aplica la cobertura de Protección obligatoria antes de continuar.';

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly marketPolicy: MarketPolicyService,
    private readonly toast: ToastService,
    @Optional() private readonly router?: Router,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.evaluateAndHandle(state.url, false);
  }

  enforceProtectionClearance(targetUrl: string): boolean {
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

    const redirectTree = this.router.parseUrl('/proteccion');

    if (navigateOnFailure) {
      this.router.navigateByUrl(redirectTree);
      return false;
    }

    return redirectTree;
  }

  private hasClearance(): boolean {
    const policyContext = this.getPolicyContext();
    if (!policyContext) {
      this.failureMessage = 'Configura la cotización antes de continuar con la protección.';
      return false;
    }

    if (!this.marketPolicy.requiresProtection(policyContext)) {
      return true;
    }

    const protection = this.getProtectionSnapshot();
    if (protection?.applied) {
      return true;
    }

    this.failureMessage = 'Aplica la cobertura de Protección obligatoria antes de continuar.';
    return false;
  }

  private getPolicyContext(): MarketPolicyContext | null {
    const stored = this.flowContext.getContextData<StoredDocumentContext>(this.documentsContextKey);
    if (!stored) {
      const cotizadorSnapshot = this.flowContext.getContextData<any>('cotizador');
      return cotizadorSnapshot?.policyContext ?? null;
    }

    if (stored.policyContext) {
      return stored.policyContext;
    }

    const flow = stored.flowContext;
    if (!flow?.market || !flow?.clientType) {
      const cotizadorSnapshot = this.flowContext.getContextData<any>('cotizador');
      return cotizadorSnapshot?.policyContext ?? null;
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

  private getProtectionSnapshot(): ProtectionContextSnapshot | null {
    for (const key of this.protectionContextKeys) {
      const stored = this.flowContext.getContextData<any>(key);
      if (!stored) {
        continue;
      }

      if (typeof stored.applied === 'boolean') {
        return stored as ProtectionContextSnapshot;
      }

      if (stored.state && typeof stored.state.applied === 'boolean') {
        return stored.state as ProtectionContextSnapshot;
      }
    }
    return null;
  }
}
