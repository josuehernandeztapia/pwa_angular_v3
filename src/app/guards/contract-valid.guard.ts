import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';

import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';
import { ContractContextSnapshot } from '../models/contract-context';
import { ClientContextSnapshot } from '../models/client-context';

const CONTRACT_CONTEXT_KEY = 'contract';
const CLIENT_CONTEXT_KEY = 'client';
const CONTRACT_CONTEXT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

@Injectable({ providedIn: 'root' })
export class ContractValidGuard implements CanActivate {
  constructor(
    private readonly flowContext: FlowContextService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    const contractContext = this.flowContext.getContextData<ContractContextSnapshot>(CONTRACT_CONTEXT_KEY);

    if (!contractContext) {
      this.toast.warning('Selecciona un contrato vigente antes de continuar con Postventa.');
      return this.router.parseUrl('/contratos/generacion');
    }

    if (!contractContext.clientId) {
      this.toast.warning('Asocia un cliente al contrato para continuar con Postventa.');
      return this.router.parseUrl('/clientes');
    }

    if (!contractContext.contractId) {
      this.toast.warning('Genera y firma el contrato antes de continuar con Postventa.');
      return this.router.parseUrl('/contratos/generacion');
    }

    if (!contractContext.documentsComplete) {
      this.toast.warning('Completa la checklist de documentos antes de ingresar a Postventa.');
      return this.router.parseUrl('/documentos');
    }

    if (contractContext.pendingOfflineRequests > 0) {
      this.toast.info('Sincroniza los documentos pendientes antes de continuar con Postventa.');
      return this.router.parseUrl('/documentos');
    }

    if (contractContext.requiresVoiceVerification && !contractContext.voiceVerified) {
      this.toast.warning('Confirma la biometría de voz del contrato antes de continuar con Postventa.');
      return this.router.parseUrl('/documentos');
    }

    if (contractContext.protectionRequired && !contractContext.protectionApplied) {
      this.toast.warning('Aplica la protección obligatoria del contrato antes de continuar con Postventa.');
      return this.router.parseUrl('/proteccion');
    }

    const decision = contractContext.aviDecision?.toLowerCase();
    if (decision === 'no_go') {
      this.toast.error('El contrato requiere resolución del caso AVI antes de continuar con Postventa.');
      return this.router.parseUrl('/documentos');
    }

    const updatedAt = contractContext.updatedAt ?? 0;
    const isExpired = !updatedAt || Date.now() - updatedAt > CONTRACT_CONTEXT_MAX_AGE_MS;
    if (isExpired) {
      this.toast.warning('Actualiza el checklist del contrato para continuar con Postventa.');
      return this.router.parseUrl('/contratos/generacion');
    }

    this.persistClientContext(contractContext);

    return true;
  }

  private persistClientContext(contract: ContractContextSnapshot): void {
    if (!contract || (!contract.clientId && !contract.contractId)) {
      return;
    }

    const snapshot: ClientContextSnapshot = {
      clientId: contract.clientId ?? null,
      contractId: contract.contractId ?? null,
      market: contract.market ?? null,
      lastUpdated: Date.now()
    };

    this.flowContext.saveContext(CLIENT_CONTEXT_KEY, snapshot, {
      breadcrumbs: ['Dashboard', 'Postventa']
    });
  }

}
