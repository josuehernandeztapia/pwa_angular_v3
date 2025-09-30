import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { environment } from '../../environments/environment';
import { BusinessFlow } from '../models/types';
import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';

@Injectable({ providedIn: 'root' })
export class AviCompletedGuard implements CanActivate {
  private readonly documentsContextKey = 'documentos';
  private readonly onboardingContextKey = 'onboarding-wizard';
  private readonly documentStepIndex = 2;

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly router: Router,
    private readonly toast: ToastService
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!environment.features?.enableAVISystem) {
      return true;
    }

    if (this.hasDocumentClearance() || this.hasWizardClearance()) {
      return true;
    }

    this.toast.warning('Completa la verificación AVI antes de subir documentos');
    return this.router.parseUrl('/onboarding?redirectTo=' + encodeURIComponent(state.url));
  }

  private hasDocumentClearance(): boolean {
    const context: any = this.flowContext.getContextData<any>(this.documentsContextKey);
    const aviContext: any = this.flowContext.getContextData<any>('avi');

    if (aviContext) {
      const decision = (aviContext.decision || '').toUpperCase();
      if (decision && ['GO', 'REVIEW'].includes(decision)) {
        return true;
      }
      if (aviContext.status === 'COMPLETED' && decision !== 'NO_GO' && aviContext.riskLevel !== 'CRITICAL') {
        return true;
      }
    }

    if (!context) {
      return false;
    }

    const flowContext = context.flowContext;
    const showAvi = context.showAVI ?? this.requiresAvi(flowContext);

    if (!showAvi) {
      return true;
    }

    const aviAnalysis = context.aviAnalysis || flowContext?.aviAnalysis;
    if (aviAnalysis?.status === 'completed' && aviAnalysis?.fraudRisk !== 'HIGH') {
      return true;
    }

    return false;
  }

  private hasWizardClearance(): boolean {
    const snapshot: any = this.flowContext.getContextData<any>(this.onboardingContextKey);
    if (!snapshot) {
      return false;
    }

    if (typeof snapshot.currentStepIndex === 'number' && snapshot.currentStepIndex >= this.documentStepIndex) {
      return true;
    }

    const currentStep: string | undefined = snapshot.currentStep;
    if (currentStep) {
      const stepOrder = ['selection', 'client_info', 'documents', 'kyc', 'contracts', 'completed'];
      const index = stepOrder.indexOf(currentStep);
      if (index >= this.documentStepIndex) {
        return true;
      }
    }

    const aviDecision: string | undefined = snapshot.aviDecision || snapshot.aviStatus || snapshot.form?.aviDecision;
    if (aviDecision && ['GO', 'REVIEW'].includes(aviDecision.toUpperCase())) {
      return true;
    }

    return false;
  }

  private requiresAvi(flowContext: any): boolean {
    if (!flowContext) {
      return false;
    }

    const businessFlow = flowContext.businessFlow as BusinessFlow | undefined;
    const market = (flowContext.market as string | undefined)?.toLowerCase();

    if (businessFlow === BusinessFlow.VentaDirecta) {
      return false;
    }

    if (businessFlow === BusinessFlow.VentaPlazo || businessFlow === BusinessFlow.CreditoColectivo) {
      return true;
    }

    return market === 'edomex' || market === 'estado_de_mexico';
  }
}
