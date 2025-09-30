import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';
import { ContractContextSnapshot } from '../models/contract-context';

@Injectable({ providedIn: 'root' })
export class ContractReadyGuard implements CanActivate {
  constructor(
    private readonly flowContext: FlowContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    const context = this.flowContext.getContextData<ContractContextSnapshot>('contract');

    if (!context) {
      this.toast.warning('Completa Documentos antes de generar el contrato.');
      return this.router.parseUrl('/documentos');
    }

    if (!context.documentsComplete) {
      this.toast.warning('Aún hay documentos pendientes por aprobar.');
      return this.router.parseUrl('/documentos');
    }

    if (context.pendingOfflineRequests > 0) {
      this.toast.warning('Esperando sincronizar documentos pendientes antes de generar el contrato.');
      return this.router.parseUrl('/documentos');
    }

    if (context.requiresVoiceVerification && !context.voiceVerified) {
      this.toast.warning('Confirma la biometría de voz antes de continuar.');
      return this.router.parseUrl('/documentos');
    }

    const decision = context.aviDecision?.toLowerCase();
    if (decision === 'no_go') {
      this.toast.error('El resultado AVI bloquea la generación de contrato.');
      return this.router.parseUrl('/documentos');
    }

    if (context.protectionRequired && !context.protectionApplied) {
      this.toast.warning('Aplica la cobertura de protección obligatoria antes de generar el contrato.');
      return this.router.parseUrl('/proteccion');
    }

    return true;
  }
}
