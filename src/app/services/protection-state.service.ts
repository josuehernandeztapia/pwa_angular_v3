import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, finalize, Subject, switchMap, tap } from 'rxjs';

import {
  getValidTransitions,
  HealthTriggerEvent,
  PROTECTION_STATE_DESCRIPTIONS,
  ProtectionPlan,
  ProtectionScenario,
  ProtectionSelectRequest,
  ProtectionSimulateRequest,
  ProtectionState as ProtectionStateEnum
} from '../models/protection';
import { ProtectionService } from './protection.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class ProtectionStateService {
  private protectionService = inject(ProtectionService);
  private toastService = inject(ToastService);

  // Core state signals
  private _currentPlan = signal<ProtectionPlan | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _simulatingScenarios = signal<boolean>(false);
  private _lastAction = signal<string | null>(null);

  // Action triggers (subjects for reactive operations)
  private loadPlanTrigger = new Subject<string>();
  private simulateTrigger = new Subject<ProtectionSimulateRequest>();
  private selectScenarioTrigger = new Subject<ProtectionSelectRequest>();
  private healthEventTrigger = new Subject<HealthTriggerEvent>();

  // Public readonly signals
  readonly currentPlan = this._currentPlan.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly simulatingScenarios = this._simulatingScenarios.asReadonly();
  readonly lastAction = this._lastAction.asReadonly();

  // Computed signals
  readonly hasActivePlan = computed(() => this._currentPlan() !== null);
  
  readonly currentState = computed(() => this._currentPlan()?.state || 'IDLE');
  
  readonly availableScenarios = computed(() => this._currentPlan()?.scenarios || []);
  
  readonly selectedScenario = computed(() => this._currentPlan()?.selected);
  
  readonly canSimulate = computed(() => {
    const state = this.currentState();
    return ['IDLE', 'ELIGIBLE'].includes(state) && !this._loading();
  });
  
  readonly canSelect = computed(() => {
    const state = this.currentState();
    const hasScenarios = this.availableScenarios().length > 0;
    return state === 'ELIGIBLE' && hasScenarios && !this._loading();
  });
  
  readonly canApprove = computed(() => {
    const state = this.currentState();
    return state === 'PENDING_APPROVAL' && !this._loading();
  });
  
  readonly canSign = computed(() => {
    const state = this.currentState();
    return state === 'READY_TO_SIGN' && !this._loading();
  });
  
  readonly isEligible = computed(() => this.currentState() === 'ELIGIBLE');
  
  readonly needsAttention = computed(() => {
    const state = this.currentState();
    return ['ELIGIBLE', 'READY_TO_SIGN'].includes(state);
  });
  
  readonly statusInfo = computed(() => {
    const plan = this._currentPlan();
    if (!plan) return null;
    
    const stateDesc = PROTECTION_STATE_DESCRIPTIONS[plan.state];
    const statusMsg = this.protectionService.getStatusMessage(plan);
    
    return {
      ...stateDesc,
      ...statusMsg,
      plan
    };
  });
  
  readonly eligibilityInfo = computed(() => {
    const plan = this._currentPlan();
    if (!plan) return null;
    
    return {
      isEligible: plan.state === 'ELIGIBLE',
      reason: plan.eligibilityReason,
      usageRemaining: plan.used,
      nextEligibility: plan.nextEligibilityDate
    };
  });
  
  readonly validTransitions = computed(() => {
    const state = this.currentState() as ProtectionStateEnum;
    return getValidTransitions(state);
  });

  constructor() {
    this.setupReactiveStreams();
  }

  private setupReactiveStreams(): void {
    // Load plan stream
    const loadPlan$ = this.loadPlanTrigger.pipe(
      tap(() => {
        this._loading.set(true);
        this._error.set(null);
        this._lastAction.set('loading');
      }),
      switchMap(contractId => 
        this.protectionService.getPlan(contractId).pipe(
          tap(plan => {
            this._currentPlan.set(plan);
            this._lastAction.set('loaded');
          }),
          catchError(error => {
            this._error.set(error.userMessage || 'Error loading protection plan');
            this.toastService.error('Error al cargar plan de protección');
            return EMPTY;
          }),
          finalize(() => this._loading.set(false))
        )
      )
    );

    // Simulate scenarios stream  
    const simulate$ = this.simulateTrigger.pipe(
      tap(() => {
        this._simulatingScenarios.set(true);
        this._error.set(null);
        this._lastAction.set('simulating');
      }),
      switchMap(request =>
        this.protectionService.simulate(request).pipe(
          tap(response => {
            const currentPlan = this._currentPlan();
            if (currentPlan) {
              const updatedPlan: ProtectionPlan = {
                ...currentPlan,
                scenarios: response.scenarios,
                state: 'ELIGIBLE',
                eligibilityReason: response.eligibilityCheck.reason
              };
              this._currentPlan.set(updatedPlan);
              this._lastAction.set('simulated');
              
              if (response.scenarios.length === 0) {
                this.toastService.info('No hay escenarios de protección disponibles en este momento');
              } else {
                this.toastService.success(`${response.scenarios.length} opciones de protección disponibles`);
              }
            }
          }),
          catchError(error => {
            this._error.set(error.userMessage || 'Error simulating scenarios');
            this.toastService.error('Error al simular escenarios de protección');
            return EMPTY;
          }),
          finalize(() => this._simulatingScenarios.set(false))
        )
      )
    );

    // Select scenario stream
    const selectScenario$ = this.selectScenarioTrigger.pipe(
      tap(() => {
        this._loading.set(true);
        this._error.set(null);
        this._lastAction.set('selecting');
      }),
      switchMap(request =>
        this.protectionService.select(request).pipe(
          tap(response => {
            const currentPlan = this._currentPlan();
            if (currentPlan && response.success) {
              const updatedPlan: ProtectionPlan = {
                ...currentPlan,
                selected: request.scenario,
                state: response.newState,
                audit: {
                  ...currentPlan.audit,
                  updatedAt: new Date().toISOString()
                }
              };
              this._currentPlan.set(updatedPlan);
              this._lastAction.set('selected');
              this.toastService.success('Escenario seleccionado, esperando aprobación');
            }
          }),
          catchError(error => {
            this._error.set(error.userMessage || 'Error selecting scenario');
            this.toastService.error('Error al seleccionar escenario');
            return EMPTY;
          }),
          finalize(() => this._loading.set(false))
        )
      )
    );

    // Health event trigger stream
    const healthEvent$ = this.healthEventTrigger.pipe(
      switchMap(event =>
        this.protectionService.triggerHealthEvent(event).pipe(
          tap(response => {
            if (response.triggered && response.newState) {
              const currentPlan = this._currentPlan();
              if (currentPlan) {
                const updatedPlan: ProtectionPlan = {
                  ...currentPlan,
                  state: response.newState,
                  eligibilityReason: response.reason,
                  audit: {
                    ...currentPlan.audit,
                    updatedAt: new Date().toISOString(),
                    triggeredBy: 'automatic',
                    reason: response.reason
                  }
                };
                this._currentPlan.set(updatedPlan);
                
                if (response.newState === 'ELIGIBLE') {
                  this.toastService.info('Protección disponible por cambio en situación financiera');
                }
              }
            }
          }),
          catchError(error => {
// removed by clean-audit
            return EMPTY;
          })
        )
      )
    );

    // Subscribe to all streams
    loadPlan$.subscribe();
    simulate$.subscribe();  
    selectScenario$.subscribe();
    healthEvent$.subscribe();
  }

  // Public actions
  loadPlan(contractId: string): void {
    this.loadPlanTrigger.next(contractId);
  }

  simulateScenarios(contractId: string, monthK: number, options: any = {}): void {
    const request: ProtectionSimulateRequest = {
      contractId,
      monthK,
      options
    };
    this.simulateTrigger.next(request);
  }

  selectScenario(contractId: string, scenario: ProtectionScenario, reason?: string): void {
    if (!this.canSelect()) {
      this.toastService.error('No puedes seleccionar escenarios en este momento');
      return;
    }

    const request: ProtectionSelectRequest = {
      contractId,
      scenario,
      reason
    };
    this.selectScenarioTrigger.next(request);
  }

  approveScenario(contractId: string, approvedBy: string, notes?: string): void {
    if (!this.canApprove()) {
      this.toastService.error('No puedes aprobar en este momento');
      return;
    }

    this._loading.set(true);
    this._lastAction.set('approving');
    
    this.protectionService.approve({ contractId, approvedBy, notes })
      .pipe(
        tap(response => {
          if (response.success) {
            const currentPlan = this._currentPlan();
            if (currentPlan) {
              const updatedPlan: ProtectionPlan = {
                ...currentPlan,
                state: response.newState,
                audit: {
                  ...currentPlan.audit,
                  updatedAt: new Date().toISOString(),
                  approvedBy
                }
              };
              this._currentPlan.set(updatedPlan);
              this._lastAction.set('approved');
              this.toastService.success('Protección aprobada, listo para firmar');
            }
          }
        }),
        catchError(error => {
          this._error.set(error.userMessage || 'Error approving scenario');
          this.toastService.error('Error al aprobar protección');
          return EMPTY;
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  denyScenario(contractId: string, deniedBy: string, reason: string): void {
    this._loading.set(true);
    this._lastAction.set('denying');
    
    this.protectionService.deny({ contractId, deniedBy, reason })
      .pipe(
        tap(response => {
          if (response.success) {
            const currentPlan = this._currentPlan();
            if (currentPlan) {
              const updatedPlan: ProtectionPlan = {
                ...currentPlan,
                state: response.newState,
                audit: {
                  ...currentPlan.audit,
                  updatedAt: new Date().toISOString(),
                  rejectedReason: reason
                }
              };
              this._currentPlan.set(updatedPlan);
              this._lastAction.set('denied');
              this.toastService.info('Solicitud de protección denegada');
            }
          }
        }),
        catchError(error => {
          this._error.set(error.userMessage || 'Error denying scenario');
          this.toastService.error('Error al denegar protección');
          return EMPTY;
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  signDocument(contractId: string): void {
    if (!this.canSign()) {
      this.toastService.error('No puedes firmar en este momento');
      return;
    }

    this._loading.set(true);
    this._lastAction.set('creating_mifiel');
    
    // Get Mifiel signing URL first
    this.protectionService.getMifielSigningUrl(contractId, this.selectedScenario()?.type || 'DEFER')
      .pipe(
        tap(mifielResponse => {
          // Open Mifiel in new window/tab
          const signingWindow = window.open(
            mifielResponse.signingUrl,
            'mifiel_signing',
            'width=800,height=600,scrollbars=yes,resizable=yes'
          );

          // Listen for Mifiel completion (this would be handled by postMessage or callback)
          const checkSigning = setInterval(() => {
            if (signingWindow?.closed) {
              clearInterval(checkSigning);
              // In real implementation, we'd check if signing was completed
              // For now, simulate successful signing
              this.handleMifielCompletion(contractId, mifielResponse.sessionId, mifielResponse.documentId);
            }
          }, 1000);
        }),
        catchError(error => {
          this._error.set(error.userMessage || 'Error creating signing session');
          this.toastService.error('Error al crear sesión de firma');
          return EMPTY;
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  private handleMifielCompletion(contractId: string, sessionId: string, documentUrl: string): void {
    this._loading.set(true);
    this._lastAction.set('signing');
    
    this.protectionService.sign({
      contractId,
      mifielSessionId: sessionId,
      signedDocumentUrl: documentUrl
    })
      .pipe(
        tap(response => {
          if (response.success) {
            const currentPlan = this._currentPlan();
            if (currentPlan) {
              const updatedPlan: ProtectionPlan = {
                ...currentPlan,
                state: response.newState,
                mifielSessionId: sessionId,
                signedDocumentUrl: documentUrl,
                audit: {
                  ...currentPlan.audit,
                  updatedAt: new Date().toISOString()
                }
              };
              this._currentPlan.set(updatedPlan);
              this._lastAction.set('signed');
              this.toastService.success('Documento firmado exitosamente, aplicando cambios');
              
              // Auto-trigger application
              setTimeout(() => this.applyProtection(contractId), 2000);
            }
          }
        }),
        catchError(error => {
          this._error.set(error.userMessage || 'Error confirming signature');
          this.toastService.error('Error al confirmar firma');
          return EMPTY;
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  applyProtection(contractId: string, effectiveDate?: string): void {
    this._loading.set(true);
    this._lastAction.set('applying');
    
    this.protectionService.apply({ contractId, effectiveDate })
      .pipe(
        tap(response => {
          if (response.success) {
            const currentPlan = this._currentPlan();
            if (currentPlan) {
              const updatedPlan: ProtectionPlan = {
                ...currentPlan,
                state: 'APPLIED',
                newPaymentSchedule: response.newSchedule,
                audit: {
                  ...currentPlan.audit,
                  updatedAt: new Date().toISOString()
                }
              };
              this._currentPlan.set(updatedPlan);
              this._lastAction.set('applied');
              this.toastService.success('¡Protección aplicada exitosamente!');
            }
          }
        }),
        catchError(error => {
          this._error.set(error.userMessage || 'Error applying protection');
          this.toastService.error('Error al aplicar protección');
          return EMPTY;
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  triggerHealthEvent(event: HealthTriggerEvent): void {
    this.healthEventTrigger.next(event);
  }

  // Utility methods
  canTransitionTo(targetState: ProtectionStateEnum): boolean {
    const currentState = this.currentState() as ProtectionStateEnum;
    const transitions = this.validTransitions();
    return transitions.some(t => t.to === targetState);
  }

  getScenarioById(scenarioType: string): ProtectionScenario | undefined {
    return this.availableScenarios().find(s => s.type === scenarioType);
  }

  clearError(): void {
    this._error.set(null);
  }

  reset(): void {
    this._currentPlan.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._simulatingScenarios.set(false);
    this._lastAction.set(null);
  }
}
// removed by clean-audit