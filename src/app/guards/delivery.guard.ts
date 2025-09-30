
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

@Injectable({ providedIn: 'root' })
export class DeliveryGuard implements CanActivate {
  private readonly contractContextKey = 'contract';
  private readonly deliveryContextKey = 'delivery';

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    const contract = this.flowContext.getContextData<ContractContextSnapshot>(this.contractContextKey);

    if (contract) {
      if (!contract.contractId) {
        this.toast.warning('Selecciona un contrato antes de revisar las entregas.');
        return this.router.parseUrl('/contratos/generacion');
      }

      if (!contract.documentsComplete || (contract.pendingOfflineRequests ?? 0) > 0) {
        this.toast.warning('Completa y sincroniza la checklist de documentos para consultar entregas.');
        return this.router.parseUrl('/documentos');
      }

      return true;
    }

    const deliverySnapshot = this.flowContext.getContextData<Record<string, unknown>>(this.deliveryContextKey);
    if (deliverySnapshot && Array.isArray((deliverySnapshot as any).events) && (deliverySnapshot as any).events.length) {
      return true;
    }

    this.toast.warning('Activa un contrato con entregas para acceder a este módulo.');
    return this.router.parseUrl('/contratos/generacion');
  }
}
