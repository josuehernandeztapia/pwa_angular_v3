import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';
import { TandaGroup, TandaMember, TransferEvent, ConsensusRequest } from './tanda-delivery.service';
import { TandaDeliveryService } from './tanda-delivery.service';

// Transfer Turn System - "Adjudicación Manual Asistida"
interface TurnTransferRequest {
  tandaId: string;
  fromMemberId: string; // Quien cede el turno
  toMemberId: string;   // Quien recibe el turno
  reason: string;       // Motivo obligatorio para auditoría
  requestedBy: string;  // Asesor que solicita
  timestamp: Date;
}

interface TransferValidation {
  isValid: boolean;
  blockers: string[];
  warnings: string[];
  financialCheck: {
    currentFund: number;         // S_t - Fondo actual del grupo
    requiredDownPayment: number; // DP_nuevo - Enganche requerido
    isSufficient: boolean;       // S_t >= DP_nuevo ?
    shortfall?: number;          // Faltante si no es suficiente
  };
  eligibilityCheck: {
    memberCurrentWithPayments: boolean;
    memberHasDeliveryPending: boolean;
    canReceiveTurn: boolean;
  };
}

interface TransferExecution {
  success: boolean;
  transferId: string;
  originalSchedule: any[];
  newSchedule: any[];
  message: string;
  auditTrail: {
    executedAt: Date;
    executedBy: string;
    fromPosition: number;
    toPosition: number;
    reason: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TandaTransferService {

  constructor(private tandaDelivery: TandaDeliveryService) { }

  /**
   * INTEGRATED FLOW: Request transfer through main delivery service
   */
  requestTransfer(
    tandaId: string,
    fromClientId: string,
    toClientId: string,
    reason: string,
    requestedBy: string
  ): Observable<{
    success: boolean;
    transferEventId: string;
    consensusId: string;
    message: string;
    requiresVoting: boolean;
    votingDeadline: Date;
  }> {
    return this.tandaDelivery.requestTurnTransfer(
      tandaId,
      fromClientId,
      toClientId,
      reason,
      requestedBy
    );
  }

  /**
   * INTEGRATED FLOW: Vote on transfer
   */
  voteOnTransfer(
    tandaId: string,
    consensusId: string,
    memberId: string,
    vote: 'approve' | 'reject' | 'abstain',
    reason?: string
  ): Observable<{
    success: boolean;
    voteRecorded: boolean;
    currentApprovals: number;
    requiredApprovals: number;
    consensusReached: boolean;
    message: string;
  }> {
    return this.tandaDelivery.voteOnTransfer(tandaId, consensusId, memberId, vote, reason);
  }

  /**
   * INTEGRATED FLOW: Company approval
   */
  approveByCompany(
    tandaId: string,
    consensusId: string,
    approvedBy: string,
    operationalReason: string,
    approved: boolean,
    notes?: string
  ): Observable<{
    success: boolean;
    finalApproval: boolean;
    canExecuteTransfer: boolean;
    message: string;
  }> {
    return this.tandaDelivery.approveTransferByCompany(
      tandaId,
      consensusId,
      approvedBy,
      operationalReason,
      approved,
      notes
    );
  }

  /**
   * INTEGRATED FLOW: Execute approved transfer
   */
  executeTransfer(
    tandaId: string,
    transferEventId: string
  ): Observable<{
    success: boolean;
    newSchedule: any[];
    message: string;
  }> {
    return this.tandaDelivery.executeApprovedTransfer(tandaId, transferEventId);
  }

  /**
   * Get pending votes for member
   */
  getPendingVotes(memberId: string): Observable<{
    tandaId: string;
    tandaName: string;
    consensus: ConsensusRequest;
    transferDetails: {
      fromMember: string;
      toMember: string;
      reason: string;
    };
  }[]> {
    return this.tandaDelivery.getPendingConsensusRequests(memberId);
  }

  /**
   * PASO 1: Validar Transferencia de Turno (Guardarraíl Inteligente) - LEGACY
   */
  validateTurnTransfer(
    tanda: TandaGroup,
    request: TurnTransferRequest
  ): Observable<TransferValidation> {
    return new Observable(observer => {
      const fromMember = tanda.members.find(m => m.clientId === request.fromMemberId);
      const toMember = tanda.members.find(m => m.clientId === request.toMemberId);
      
      if (!fromMember || !toMember) {
        observer.error('Members not found');
        return;
      }

      const blockers: string[] = [];
      const warnings: string[] = [];

      // VALIDACIÓN FINANCIERA CRÍTICA
      const currentFund = this.calculateCurrentGroupFund(tanda);
      const requiredDownPayment = this.calculateRequiredDownPayment(tanda, toMember);
      const isFundSufficient = currentFund >= requiredDownPayment;
      
      if (!isFundSufficient) {
        const shortfall = requiredDownPayment - currentFund;
        blockers.push(`Fondo insuficiente. Faltan $${shortfall.toLocaleString('es-MX')} para adjudicar a ${toMember.name}`);
      }

      // VALIDACIÓN DE ELEGIBILIDAD DEL MIEMBRO
      const isToMemberCurrent = this.isMemberCurrentWithPayments(toMember, tanda.currentMonth);
      const hasToMemberPendingDelivery = toMember.deliveryStatus === 'pending' || toMember.deliveryStatus === 'scheduled';
      
      if (!isToMemberCurrent) {
        blockers.push(`${toMember.name} no está al corriente con sus pagos del mes actual`);
      }
      
      if (!hasToMemberPendingDelivery) {
        blockers.push(`${toMember.name} ya recibió su entrega o no es elegible`);
      }

      // VALIDACIÓN DEL MIEMBRO QUE CEDE
      if (fromMember.deliveryStatus === 'delivered') {
        blockers.push(`${fromMember.name} ya recibió su entrega y no puede ceder turno`);
      }

      // WARNINGS (No bloquean, pero alertan)
      if (toMember.position > fromMember.position + 3) {
        warnings.push(`Salto significativo de posiciones: ${fromMember.position} → ${toMember.position}`);
      }

      const validation: TransferValidation = {
        isValid: blockers.length === 0,
        blockers,
        warnings,
        financialCheck: {
          currentFund,
          requiredDownPayment,
          isSufficient: isFundSufficient,
          shortfall: isFundSufficient ? undefined : (requiredDownPayment - currentFund)
        },
        eligibilityCheck: {
          memberCurrentWithPayments: isToMemberCurrent,
          memberHasDeliveryPending: hasToMemberPendingDelivery,
          canReceiveTurn: isToMemberCurrent && hasToMemberPendingDelivery
        }
      };

      observer.next(validation);
      observer.complete();
    }).pipe(delay(800)); // Simula validación del backend
  }

  /**
   * PASO 2: Ejecutar Transferencia de Turno (Inyección de Evento)
   */
  executeTurnTransfer(
    tanda: TandaGroup,
    request: TurnTransferRequest,
    validation: TransferValidation
  ): Observable<TransferExecution> {
    if (!validation.isValid) {
      return of({
        success: false,
        transferId: '',
        originalSchedule: [],
        newSchedule: [],
        message: `Transferencia bloqueada: ${validation.blockers.join(', ')}`,
        auditTrail: {} as any
      });
    }

    return new Observable(observer => {
      const fromMember = tanda.members.find(m => m.clientId === request.fromMemberId)!;
      const toMember = tanda.members.find(m => m.clientId === request.toMemberId)!;
      
      const transferId = `transfer-${Date.now()}`;
      const originalSchedule = [...tanda.deliverySchedule];

      // INYECCIÓN DE EVENTO TRANSFER
      const transferEvent = {
        type: 'TURN_TRANSFER',
        id: transferId,
        timestamp: new Date(),
        fromMemberId: request.fromMemberId,
        toMemberId: request.toMemberId,
        fromPosition: fromMember.position,
        toPosition: toMember.position,
        reason: request.reason,
        executedBy: request.requestedBy,
        financialValidation: validation.financialCheck,
        eligibilityValidation: validation.eligibilityCheck
      };

      // REORDENAMIENTO INTELIGENTE
      // El miembro que recibe el turno se mueve al siguiente slot de entrega
      // El miembro que cede se reprioriza automáticamente para la SIGUIENTE adjudicación
      
      const currentNextDeliveryPosition = tanda.currentMonth + 1;
      
      // Mover al miembro receptor al siguiente slot disponible
      toMember.deliveryMonth = currentNextDeliveryPosition;
      toMember.deliveryStatus = 'scheduled';
      
      // Repriorizar al miembro cedente para el slot siguiente
      fromMember.deliveryMonth = currentNextDeliveryPosition + 1;
      fromMember.deliveryStatus = 'pending';
      
      // RECALCULAR CRONOGRAMA COMPLETO
      const newSchedule = this.recalculateDeliverySchedule(tanda, transferEvent);
      
      // AUDITORÍA
      const auditTrail = {
        executedAt: new Date(),
        executedBy: request.requestedBy,
        fromPosition: fromMember.position,
        toPosition: toMember.position,
        reason: request.reason
      };

      // Añadir evento al historial de la tanda (para auditoría completa)
      if (!(tanda as any).transferEvents) {
        (tanda as any).transferEvents = [];
      }
      (tanda as any).transferEvents.push(transferEvent);

      const execution: TransferExecution = {
        success: true,
        transferId,
        originalSchedule,
        newSchedule,
        message: `Turno transferido exitosamente de ${fromMember.name} a ${toMember.name}. Motivo: ${request.reason}`,
        auditTrail
      };

      observer.next(execution);
      observer.complete();
    }).pipe(delay(1200));
  }

  /**
   * Calcular fondo actual del grupo (S_t)
   */
  private calculateCurrentGroupFund(tanda: TandaGroup): number {
    return tanda.members.reduce((total, member) => total + member.totalContributed, 0);
  }

  /**
   * Calcular enganche requerido para miembro específico (DP_nuevo)
   */
  private calculateRequiredDownPayment(tanda: TandaGroup, member: TandaMember): number {
    // En tandas, normalmente el enganche es el valor total de la unidad
    // porque el grupo ha estado ahorrando para cubrirlo
    return tanda.totalAmount;
  }

  /**
   * Verificar si miembro está al corriente con pagos
   */
  private isMemberCurrentWithPayments(member: TandaMember, currentMonth: number): boolean {
    // Verificar que el miembro haya pagado su aportación del mes actual
    const currentMonthPayment = member.paymentHistory.find(
      payment => payment.month === currentMonth && payment.status === 'confirmed'
    );
    return !!currentMonthPayment;
  }

  /**
   * Recalcular cronograma de entregas después de transferencia
   */
  private recalculateDeliverySchedule(tanda: TandaGroup, transferEvent: any): any[] {
    // Reconstruir el cronograma considerando la transferencia
    const newSchedule = tanda.deliverySchedule.map(schedule => {
      if (schedule.memberId === transferEvent.toMemberId) {
        return {
          ...schedule,
          month: tanda.currentMonth + 1, // Próxima entrega
          deliveryStatus: 'ready',
          scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Próximo mes
        };
      } else if (schedule.memberId === transferEvent.fromMemberId) {
        return {
          ...schedule,
          month: tanda.currentMonth + 2, // Repriorizado para siguiente
          deliveryStatus: 'pending',
          scheduledDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // En 2 meses
        };
      }
      return schedule;
    });

    return newSchedule.sort((a, b) => a.month - b.month);
  }

  /**
   * Obtener historial de transferencias para auditoría
   */
  getTransferHistory(tandaId: string): Observable<any[]> {
    // Retornar historial de todas las transferencias realizadas
    return of([]).pipe(delay(200));
  }

  /**
   * Simular validación en interfaz (para PWA)
   */
  getTransferEligibleMembers(tanda: TandaGroup): Observable<{
    canCedeTurn: TandaMember[];
    canReceiveTurn: TandaMember[];
  }> {
    const canCedeTurn = tanda.members.filter(member => 
      member.deliveryStatus === 'scheduled' || 
      (member.deliveryStatus === 'pending' && member.position <= tanda.currentMonth + 2)
    );

    const canReceiveTurn = tanda.members.filter(member =>
      member.deliveryStatus === 'pending' && 
      this.isMemberCurrentWithPayments(member, tanda.currentMonth)
    );

    return of({
      canCedeTurn,
      canReceiveTurn
    }).pipe(delay(300));
  }
}