import { Injectable, Optional } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { BusinessFlow, Document, DocumentStatus } from '../models/types';
import { FlowContextService } from '../services/flow-context.service';
import { MarketPolicyContext, MarketPolicyService, TandaPolicyMetadata } from '../services/market-policy.service';
import { TandaFlowContextState } from '../services/tanda-validation.service';
import { ToastService } from '../services/toast.service';

interface StoredDocumentContext {
  flowContext?: {
    market?: MarketPolicyContext['market'];
    clientType?: MarketPolicyContext['clientType'];
    saleType?: 'contado' | 'financiero';
    businessFlow?: BusinessFlow;
    collectiveMembers?: number;
    requiresIncomeProof?: boolean;
  };
  policyContext?: MarketPolicyContext;
  documents?: Document[];
}

@Injectable({ providedIn: 'root' })
export class TandaValidGuard implements CanActivate {
  private readonly documentsContextKey = 'documentos';
  private failureMessage = 'Completa la configuración de Tanda antes de continuar.';

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly marketPolicy: MarketPolicyService,
    private readonly toast: ToastService,
    @Optional() private readonly router?: Router,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.evaluateAndHandle(state.url, false);
  }

  enforceTandaClearance(targetUrl: string): boolean {
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

    const redirectTree = this.router.parseUrl('/cotizador/edomex-colectivo');

    if (navigateOnFailure) {
      this.router.navigateByUrl(redirectTree);
      return false;
    }

    return redirectTree;
  }

  private hasClearance(): boolean {
    this.failureMessage = 'Completa la configuración de Tanda antes de continuar.';

    const stored = this.flowContext.getContextData<StoredDocumentContext>(this.documentsContextKey);
    if (!stored) {
      return true;
    }

    const policyContext = this.resolvePolicyContext(stored);
    if (!policyContext) {
      return true;
    }

    if (policyContext.market !== 'edomex' || policyContext.clientType !== 'colectivo') {
      return true;
    }

    const tandaRules = this.marketPolicy.getTandaRules(policyContext);
    if (!tandaRules) {
      return true;
    }

    const collectiveMembers = stored.flowContext?.collectiveMembers ?? policyContext.collectiveSize;
    if (typeof collectiveMembers !== 'number') {
      this.failureMessage = 'Captura el número de integrantes de la Tanda antes de continuar.';
      return false;
    }

    if (!this.validateMemberCount(collectiveMembers, tandaRules)) {
      return false;
    }

    if (!this.validateDocuments(collectiveMembers, stored.documents ?? [])) {
      return false;
    }

    const tandaState = this.flowContext.getContextData<TandaFlowContextState>('tanda');
    if (!tandaState || !tandaState.validationId) {
      this.failureMessage = 'Valida la tanda y genera su cronograma antes de continuar.';
      return false;
    }

    if (tandaState.config.members !== collectiveMembers) {
      this.failureMessage = 'Actualiza la validación de tanda después de modificar el número de integrantes.';
      return false;
    }

    if (tandaState.status === 'error') {
      this.failureMessage = 'La validación de tanda falló. Ajusta los parámetros y vuelve a intentarlo.';
      return false;
    }

    if (tandaState.status === 'review') {
      this.failureMessage = 'La tanda está en revisión. Captura la evidencia requerida antes de continuar.';
      return false;
    }

    if (!tandaState.schedule || tandaState.schedule.length === 0) {
      this.failureMessage = 'Genera el cronograma oficial de la tanda antes de continuar.';
      return false;
    }

    if (!tandaState.lastRosterUploadId) {
      this.failureMessage = 'Sincroniza el roster de integrantes con los documentos aprobados antes de continuar.';
      return false;
    }

    return true;
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
      businessFlow: flow.businessFlow ?? BusinessFlow.CreditoColectivo,
      requiresIncomeProof: flow.requiresIncomeProof,
      collectiveSize: flow.collectiveMembers,
    };
  }

  private validateMemberCount(collectiveMembers: number, rules: TandaPolicyMetadata): boolean {
    if (collectiveMembers < rules.minMembers) {
      this.failureMessage = `La tanda requiere al menos ${rules.minMembers} integrantes.`;
      return false;
    }

    if (collectiveMembers > rules.maxMembers) {
      this.failureMessage = `La tanda permite máximo ${rules.maxMembers} integrantes.`;
      return false;
    }

    return true;
  }

  private validateDocuments(collectiveMembers: number, documents: Document[]): boolean {
    const consent = documents.find(doc => doc.id === 'doc-consent');
    if (!consent || consent.status !== DocumentStatus.Aprobado) {
      this.failureMessage = 'La carta de consentimiento colectivo debe estar aprobada.';
      return false;
    }

    for (let index = 1; index <= collectiveMembers; index++) {
      const ineId = `doc-ine-${index}`;
      const rfcId = `doc-rfc-${index}`;
      const ineDocument = documents.find(doc => doc.id === ineId);
      const rfcDocument = documents.find(doc => doc.id === rfcId);

      if (!ineDocument || ineDocument.status !== DocumentStatus.Aprobado) {
        this.failureMessage = `El INE del integrante ${index} aún no está aprobado.`;
        return false;
      }

      if (!rfcDocument || rfcDocument.status !== DocumentStatus.Aprobado) {
        this.failureMessage = `El RFC del integrante ${index} aún no está aprobado.`;
        return false;
      }
    }

    return true;
  }
}
