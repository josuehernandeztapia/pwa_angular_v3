import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Client, BusinessFlow } from '../models/types';

// Tanda (Collective Savings) Delivery System Interfaces
export interface TandaMember {
  clientId: string;
  name: string;
  position: number; // 1-based position in tanda
  monthlyContribution: number;
  totalContributed: number;
  deliveryMonth: number; // Which month they receive delivery
  deliveryStatus: 'pending' | 'scheduled' | 'delivered' | 'cancelled';
  joinedAt: Date;
  lastPayment?: Date;
  paymentHistory: TandaPayment[];
  isActive: boolean;
}

interface TandaPayment {
  id: string;
  memberId: string;
  amount: number;
  paymentDate: Date;
  month: number; // Tanda month (1-based)
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  paymentMethod: 'efectivo' | 'transferencia' | 'spei' | 'tarjeta';
  receiptUrl?: string;
}

export interface TandaGroup {
  id: string;
  name: string;
  totalMembers: number;
  monthlyAmount: number; // Amount each member pays
  totalAmount: number; // Total vehicle/package value
  startDate: Date;
  expectedEndDate: Date;
  currentMonth: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  members: TandaMember[];
  deliverySchedule: TandaDeliverySchedule[];
  groupLeader?: string; // Client ID of group organizer
  market: 'aguascalientes' | 'edomex';
  packageType: string; // Vehicle package being saved for
  ecosystemId: string;
  // Transfer Turn Support
  transferEvents?: TransferEvent[];
  consensusRequests?: ConsensusRequest[];
}

interface TandaDeliverySchedule {
  month: number;
  memberId: string;
  memberName: string;
  memberPosition: number;
  scheduledDate: Date;
  deliveryStatus: 'pending' | 'ready' | 'delivered' | 'delayed';
  requiredAmount: number; // Total amount needed for delivery
  contributedAmount: number; // Amount contributed by all members
  remainingAmount: number;
  deliveryNotes?: string;
}

interface TandaDeliveryResult {
  success: boolean;
  deliveryId: string;
  clientId: string;
  month: number;
  deliveredAmount: number;
  deliveryDate: Date;
  contractId?: string; // MIFIEL contract for the delivery
  message: string;
}

// Transfer Turn Interfaces
export interface TransferEvent {
  id: string;
  type: 'TURN_TRANSFER';
  timestamp: Date;
  fromMemberId: string;
  toMemberId: string;
  fromPosition: number;
  toPosition: number;
  reason: string;
  executedBy: string;
  status: 'pending_consensus' | 'approved' | 'rejected' | 'executed';
  consensusId?: string;
}

export interface ConsensusRequest {
  id: string;
  transferEventId: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'open' | 'approved' | 'rejected' | 'expired';
  requiredApprovals: number; // Total votes needed
  currentApprovals: number;
  votes: ConsensusVote[];
  companyApproval?: CompanyApproval;
}

export interface ConsensusVote {
  memberId: string;
  memberName: string;
  vote: 'approve' | 'reject' | 'abstain';
  votedAt: Date;
  reason?: string;
  digitalSignature?: string; // MIFIEL signature ID
}

export interface CompanyApproval {
  approvedBy: string; // Asesor/Supervisor ID
  approvedAt: Date;
  operationalReason: string;
  approved: boolean;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TandaDeliveryService {

  // Tanda Groups Storage
  private tandaGroups = new Map<string, TandaGroup>();
  private memberTandas = new Map<string, string[]>(); // clientId -> tandaIds[]
  
  // Reactive subjects for real-time updates
  private groupUpdatesSubject = new BehaviorSubject<TandaGroup[]>([]);
  public groupUpdates$ = this.groupUpdatesSubject.asObservable();

  constructor() {
    this.initializeDemoData();
  }

  /**
   * Initialize demo tanda data for testing
   */
  private initializeDemoData(): void {
    const demoTanda: TandaGroup = {
      id: 'tanda-demo-001',
      name: 'Tanda Ruta Centro EdoMex',
      totalMembers: 12,
      monthlyAmount: 8500, // Each member pays 8,500 monthly
      totalAmount: 102000, // Vehicle package value
      startDate: new Date('2024-01-01'),
      expectedEndDate: new Date('2024-12-31'),
      currentMonth: 3,
      status: 'active',
      market: 'edomex',
      packageType: 'Vagoneta H6C Conversión Gas',
      ecosystemId: 'ruta-centro-edomex',
      members: [
        {
          clientId: 'member-001',
          name: 'Carlos Hernández',
          position: 1,
          monthlyContribution: 8500,
          totalContributed: 25500, // 3 months
          deliveryMonth: 1,
          deliveryStatus: 'delivered',
          joinedAt: new Date('2024-01-01'),
          lastPayment: new Date('2024-03-01'),
          paymentHistory: [],
          isActive: true
        },
        {
          clientId: 'member-002', 
          name: 'María González',
          position: 2,
          monthlyContribution: 8500,
          totalContributed: 25500,
          deliveryMonth: 4, // Next delivery
          deliveryStatus: 'scheduled',
          joinedAt: new Date('2024-01-01'),
          lastPayment: new Date('2024-03-01'),
          paymentHistory: [],
          isActive: true
        }
      ],
      deliverySchedule: [],
      groupLeader: 'member-001'
    };

    this.tandaGroups.set(demoTanda.id, demoTanda);
    this.generateDeliverySchedule(demoTanda);
  }

  /**
   * Create new tanda group for collective savings
   */
  createTandaGroup(config: {
    name: string;
    totalMembers: number;
    packageValue: number;
    startDate: Date;
    market: 'aguascalientes' | 'edomex';
    packageType: string;
    ecosystemId: string;
    groupLeader: string;
  }): Observable<TandaGroup> {
    const tandaId = `tanda-${Date.now()}`;
    const monthlyAmount = Math.round(config.packageValue / config.totalMembers);
    
    const newTanda: TandaGroup = {
      id: tandaId,
      name: config.name,
      totalMembers: config.totalMembers,
      monthlyAmount,
      totalAmount: config.packageValue,
      startDate: config.startDate,
      expectedEndDate: new Date(
        config.startDate.getFullYear(),
        config.startDate.getMonth() + config.totalMembers,
        config.startDate.getDate()
      ),
      currentMonth: 1,
      status: 'forming',
      members: [],
      deliverySchedule: [],
      groupLeader: config.groupLeader,
      market: config.market,
      packageType: config.packageType,
      ecosystemId: config.ecosystemId
    };

    this.tandaGroups.set(tandaId, newTanda);
    this.updateGroupsSubject();
    
    return of(newTanda).pipe(delay(500));
  }

  /**
   * Add member to tanda group
   */
  addMemberToTanda(
    tandaId: string, 
    client: Client, 
    preferredPosition?: number
  ): Observable<{ success: boolean; position: number; message: string }> {
    return new Observable<{ success: boolean; position: number; message: string }>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      if (!tanda) {
        observer.error('Tanda not found');
        return;
      }

      if (tanda.members.length >= tanda.totalMembers) {
        observer.next({
          success: false,
          position: 0,
          message: 'Tanda already full'
        });
        observer.complete();
        return;
      }

      // Determine position
      const takenPositions = tanda.members.map(m => m.position);
      let assignedPosition = preferredPosition || 0;
      
      if (!assignedPosition || takenPositions.includes(assignedPosition)) {
        // Find first available position
        for (let i = 1; i <= tanda.totalMembers; i++) {
          if (!takenPositions.includes(i)) {
            assignedPosition = i;
            break;
          }
        }
      }

      const newMember: TandaMember = {
        clientId: client.id,
        name: client.name,
        position: assignedPosition,
        monthlyContribution: tanda.monthlyAmount,
        totalContributed: 0,
        deliveryMonth: assignedPosition,
        deliveryStatus: 'pending',
        joinedAt: new Date(),
        paymentHistory: [],
        isActive: true
      };

      tanda.members.push(newMember);
      tanda.members.sort((a, b) => a.position - b.position);

      // Update member-tanda mapping
      const clientTandas = this.memberTandas.get(client.id) || [];
      clientTandas.push(tandaId);
      this.memberTandas.set(client.id, clientTandas);

      // Activate tanda if full
      if (tanda.members.length === tanda.totalMembers) {
        tanda.status = 'active';
        this.generateDeliverySchedule(tanda);
      }

      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();

      observer.next({
        success: true,
        position: assignedPosition,
        message: `Agregado a tanda en posición ${assignedPosition}`
      });
      observer.complete();
    }).pipe(delay(800));
  }

  /**
   * Generate delivery schedule for tanda
   */
  private generateDeliverySchedule(tanda: TandaGroup): void {
    const schedule: TandaDeliverySchedule[] = [];
    
    tanda.members.forEach(member => {
      const deliveryDate = new Date(tanda.startDate);
      deliveryDate.setMonth(deliveryDate.getMonth() + (member.position - 1));
      
      schedule.push({
        month: member.position,
        memberId: member.clientId,
        memberName: member.name,
        memberPosition: member.position,
        scheduledDate: deliveryDate,
        deliveryStatus: member.position <= tanda.currentMonth ? 'ready' : 'pending',
        requiredAmount: tanda.totalAmount,
        contributedAmount: member.totalContributed,
        remainingAmount: Math.max(0, tanda.totalAmount - member.totalContributed)
      });
    });

    tanda.deliverySchedule = schedule.sort((a, b) => a.month - b.month);
  }

  /**
   * Get tanda groups for a client
   */
  getClientTandas(clientId: string): Observable<TandaGroup[]> {
    const tandaIds = this.memberTandas.get(clientId) || [];
    const clientTandas = tandaIds
      .map(id => this.tandaGroups.get(id))
      .filter(tanda => tanda !== undefined) as TandaGroup[];
    
    return of(clientTandas).pipe(delay(200));
  }

  /**
   * Get tanda by ID
   */
  getTandaById(tandaId: string): Observable<TandaGroup | null> {
    const tanda = this.tandaGroups.get(tandaId);
    return of(tanda || null).pipe(delay(100));
  }

  /**
   * Get member position and delivery info
   */
  getMemberDeliveryInfo(clientId: string, tandaId: string): Observable<{
    position: number;
    deliveryMonth: number;
    deliveryDate: Date;
    deliveryStatus: string;
    contributedAmount: number;
    remainingAmount: number;
    isMyTurn: boolean;
  } | null> {
    return this.getTandaById(tandaId).pipe(
      map(tanda => {
        if (!tanda) return null;
        
        const member = tanda.members.find(m => m.clientId === clientId);
        if (!member) return null;
        
        const schedule = tanda.deliverySchedule.find(s => s.memberId === clientId);
        if (!schedule) return null;
        
        return {
          position: member.position,
          deliveryMonth: member.deliveryMonth,
          deliveryDate: schedule.scheduledDate,
          deliveryStatus: member.deliveryStatus,
          contributedAmount: member.totalContributed,
          remainingAmount: schedule.remainingAmount,
          isMyTurn: tanda.currentMonth === member.position
        };
      })
    );
  }

  /**
   * Record payment for tanda member
   */
  recordTandaPayment(
    tandaId: string,
    clientId: string,
    amount: number,
    paymentMethod: TandaPayment['paymentMethod'],
    receiptUrl?: string
  ): Observable<{ success: boolean; newTotal: number; message: string }> {
    return new Observable<{ success: boolean; newTotal: number; message: string }>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      if (!tanda) {
        observer.error('Tanda not found');
        return;
      }

      const member = tanda.members.find(m => m.clientId === clientId);
      if (!member) {
        observer.error('Member not found in tanda');
        return;
      }

      const payment: TandaPayment = {
        id: `payment-${Date.now()}`,
        memberId: clientId,
        amount,
        paymentDate: new Date(),
        month: tanda.currentMonth,
        status: 'confirmed',
        paymentMethod,
        receiptUrl
      };

      member.paymentHistory.push(payment);
      member.totalContributed += amount;
      member.lastPayment = new Date();

      // Update delivery schedule
      const schedule = tanda.deliverySchedule.find(s => s.memberId === clientId);
      if (schedule) {
        schedule.contributedAmount = member.totalContributed;
        schedule.remainingAmount = Math.max(0, tanda.totalAmount - member.totalContributed);
        
        // Check if ready for delivery
        if (schedule.remainingAmount === 0 && schedule.deliveryStatus === 'pending') {
          schedule.deliveryStatus = 'ready';
          member.deliveryStatus = 'scheduled';
        }
      }

      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();

      observer.next({
        success: true,
        newTotal: member.totalContributed,
        message: `Pago de $${amount.toLocaleString('es-MX')} registrado exitosamente`
      });
      observer.complete();
    }).pipe(delay(600));
  }

  /**
   * REQUEST TURN TRANSFER - Initiate consensus process
   */
  requestTurnTransfer(
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
    return new Observable<{ success: boolean; transferEventId: string; consensusId: string; message: string; requiresVoting: boolean; votingDeadline: Date }>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      if (!tanda) {
        observer.error('Tanda not found');
        return;
      }

      const fromMember = tanda.members.find(m => m.clientId === fromClientId);
      const toMember = tanda.members.find(m => m.clientId === toClientId);
      
      if (!fromMember || !toMember) {
        observer.error('One or both members not found');
        return;
      }

      // Create transfer event
      const transferEventId = `transfer-${Date.now()}`;
      const transferEvent: TransferEvent = {
        id: transferEventId,
        type: 'TURN_TRANSFER',
        timestamp: new Date(),
        fromMemberId: fromClientId,
        toMemberId: toClientId,
        fromPosition: fromMember.position,
        toPosition: toMember.position,
        reason,
        executedBy: requestedBy,
        status: 'pending_consensus'
      };

      // Create consensus request
      const consensusId = `consensus-${Date.now()}`;
      const consensusRequest: ConsensusRequest = {
        id: consensusId,
        transferEventId,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to vote
        status: 'open',
        requiredApprovals: Math.ceil(tanda.members.length * 0.8), // 80% consensus
        currentApprovals: 0,
        votes: []
      };

      transferEvent.consensusId = consensusId;

      // Initialize tanda transfer arrays if needed
      if (!tanda.transferEvents) tanda.transferEvents = [];
      if (!tanda.consensusRequests) tanda.consensusRequests = [];

      tanda.transferEvents.push(transferEvent);
      tanda.consensusRequests.push(consensusRequest);

      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();

      observer.next({
        success: true,
        transferEventId,
        consensusId,
        message: `Solicitud de transferencia creada. Requiere ${consensusRequest.requiredApprovals} votos de ${tanda.members.length} miembros`,
        requiresVoting: true,
        votingDeadline: consensusRequest.expiresAt
      });
      observer.complete();
    }).pipe(delay(800));
  }

  /**
   * MEMBER VOTE on transfer request
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
    return new Observable<{ success: boolean; voteRecorded: boolean; currentApprovals: number; requiredApprovals: number; consensusReached: boolean; message: string }>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      const consensus = tanda?.consensusRequests?.find(c => c.id === consensusId);
      
      if (!tanda || !consensus) {
        observer.error('Tanda or consensus not found');
        return;
      }

      if (consensus.status !== 'open') {
        observer.next({
          success: false,
          voteRecorded: false,
          currentApprovals: consensus.currentApprovals,
          requiredApprovals: consensus.requiredApprovals,
          consensusReached: false,
          message: 'Votación ya cerrada'
        });
        observer.complete();
        return;
      }

      const member = tanda.members.find(m => m.clientId === memberId);
      if (!member) {
        observer.error('Member not found in tanda');
        return;
      }

      // Check if member already voted
      const existingVote = consensus.votes.find(v => v.memberId === memberId);
      if (existingVote) {
        observer.next({
          success: false,
          voteRecorded: false,
          currentApprovals: consensus.currentApprovals,
          requiredApprovals: consensus.requiredApprovals,
          consensusReached: false,
          message: 'Ya votaste en esta solicitud'
        });
        observer.complete();
        return;
      }

      // Record vote
      const consensusVote: ConsensusVote = {
        memberId,
        memberName: member.name,
        vote,
        votedAt: new Date(),
        reason
      };

      consensus.votes.push(consensusVote);
      
      // Update approval count
      if (vote === 'approve') {
        consensus.currentApprovals++;
      }

      // Check if consensus reached
      const consensusReached = consensus.currentApprovals >= consensus.requiredApprovals;
      
      if (consensusReached) {
        consensus.status = 'approved';
        // Also need company approval before execution
      } else if (consensus.votes.length === tanda.members.length) {
        // All members voted but consensus not reached
        consensus.status = 'rejected';
      }

      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();

      observer.next({
        success: true,
        voteRecorded: true,
        currentApprovals: consensus.currentApprovals,
        requiredApprovals: consensus.requiredApprovals,
        consensusReached,
        message: consensusReached 
          ? `¡Consenso alcanzado! (${consensus.currentApprovals}/${consensus.requiredApprovals}). Esperando aprobación de la empresa.`
          : `Voto registrado (${consensus.currentApprovals}/${consensus.requiredApprovals})`
      });
      observer.complete();
    }).pipe(delay(600));
  }

  /**
   * COMPANY APPROVAL for transfer (after member consensus)
   */
  approveTransferByCompany(
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
    return new Observable<{ success: boolean; finalApproval: boolean; canExecuteTransfer: boolean; message: string }>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      const consensus = tanda?.consensusRequests?.find(c => c.id === consensusId);
      
      if (!tanda || !consensus) {
        observer.error('Tanda or consensus not found');
        return;
      }

      if (consensus.status !== 'approved') {
        observer.next({
          success: false,
          finalApproval: false,
          canExecuteTransfer: false,
          message: 'Consenso de miembros no alcanzado aún'
        });
        observer.complete();
        return;
      }

      // Record company approval
      const companyApproval: CompanyApproval = {
        approvedBy,
        approvedAt: new Date(),
        operationalReason,
        approved,
        notes
      };

      consensus.companyApproval = companyApproval;

      if (approved) {
        // Find related transfer event and mark as approved
        const transferEvent = tanda.transferEvents?.find(t => t.id === consensus.transferEventId);
        if (transferEvent) {
          transferEvent.status = 'approved';
        }
        
        observer.next({
          success: true,
          finalApproval: true,
          canExecuteTransfer: true,
          message: `Transferencia aprobada por la empresa. Lista para ejecutar.`
        });
      } else {
        consensus.status = 'rejected';
        const transferEvent = tanda.transferEvents?.find(t => t.id === consensus.transferEventId);
        if (transferEvent) {
          transferEvent.status = 'rejected';
        }

        observer.next({
          success: true,
          finalApproval: false,
          canExecuteTransfer: false,
          message: `Transferencia rechazada por la empresa: ${operationalReason}`
        });
      }

      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();
      observer.complete();
    }).pipe(delay(1000));
  }

  /**
   * EXECUTE APPROVED TRANSFER (Final step)
   */
  executeApprovedTransfer(
    tandaId: string,
    transferEventId: string
  ): Observable<{
    success: boolean;
    newSchedule: TandaDeliverySchedule[];
    message: string;
  }> {
    return new Observable<{ success: boolean; newSchedule: TandaDeliverySchedule[]; message: string }>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      const transferEvent = tanda?.transferEvents?.find(t => t.id === transferEventId);
      
      if (!tanda || !transferEvent) {
        observer.error('Tanda or transfer event not found');
        return;
      }

      if (transferEvent.status !== 'approved') {
        observer.next({
          success: false,
          newSchedule: tanda.deliverySchedule,
          message: 'Transferencia no aprobada para ejecución'
        });
        observer.complete();
        return;
      }

      const fromMember = tanda.members.find(m => m.clientId === transferEvent.fromMemberId);
      const toMember = tanda.members.find(m => m.clientId === transferEvent.toMemberId);
      
      if (!fromMember || !toMember) {
        observer.error('Members not found');
        return;
      }

      // Execute the transfer with financial validation
      const currentFund = tanda.members.reduce((total, member) => total + member.totalContributed, 0);
      const requiredDownPayment = tanda.totalAmount;
      
      if (currentFund < requiredDownPayment) {
        observer.next({
          success: false,
          newSchedule: tanda.deliverySchedule,
          message: `Fondo insuficiente: $${currentFund.toLocaleString('es-MX')} < $${requiredDownPayment.toLocaleString('es-MX')}`
        });
        observer.complete();
        return;
      }

      // EXECUTE: Swap delivery positions
      const originalFromDeliveryMonth = fromMember.deliveryMonth;
      const originalToDeliveryMonth = toMember.deliveryMonth;
      
      // Move recipient to next available slot
      toMember.deliveryMonth = tanda.currentMonth + 1;
      toMember.deliveryStatus = 'scheduled';
      
      // Repriorize original member for following slot
      fromMember.deliveryMonth = tanda.currentMonth + 2;
      fromMember.deliveryStatus = 'pending';
      
      // Update delivery schedule
      const fromSchedule = tanda.deliverySchedule.find(s => s.memberId === transferEvent.fromMemberId);
      const toSchedule = tanda.deliverySchedule.find(s => s.memberId === transferEvent.toMemberId);
      
      if (fromSchedule && toSchedule) {
        toSchedule.month = tanda.currentMonth + 1;
        toSchedule.deliveryStatus = 'ready';
        toSchedule.scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        fromSchedule.month = tanda.currentMonth + 2;
        fromSchedule.deliveryStatus = 'pending';
        fromSchedule.scheduledDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      }
      
      // Mark transfer as executed
      transferEvent.status = 'executed';
      
      // Sort schedules
      tanda.deliverySchedule.sort((a, b) => a.month - b.month);
      
      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();

      observer.next({
        success: true,
        newSchedule: tanda.deliverySchedule,
        message: `Transferencia ejecutada exitosamente. ${toMember.name} recibirá en el mes ${toMember.deliveryMonth}, ${fromMember.name} repriorizado al mes ${fromMember.deliveryMonth}.`
      });
      observer.complete();
    }).pipe(delay(1200));
  }

  /**
   * Get pending consensus requests for member
   */
  getPendingConsensusRequests(memberId: string): Observable<{
    tandaId: string;
    tandaName: string;
    consensus: ConsensusRequest;
    transferDetails: {
      fromMember: string;
      toMember: string;
      reason: string;
    };
  }[]> {
    const pendingRequests: any[] = [];
    
    this.tandaGroups.forEach((tanda, tandaId) => {
      const memberInTanda = tanda.members.find(m => m.clientId === memberId);
      if (!memberInTanda) return;
      
      const openConsensus = tanda.consensusRequests?.filter(c => 
        c.status === 'open' && 
        !c.votes.find(v => v.memberId === memberId)
      ) || [];
      
      openConsensus.forEach(consensus => {
        const transferEvent = tanda.transferEvents?.find(t => t.id === consensus.transferEventId);
        if (transferEvent) {
          const fromMember = tanda.members.find(m => m.clientId === transferEvent.fromMemberId);
          const toMember = tanda.members.find(m => m.clientId === transferEvent.toMemberId);
          
          pendingRequests.push({
            tandaId,
            tandaName: tanda.name,
            consensus,
            transferDetails: {
              fromMember: fromMember?.name || 'Unknown',
              toMember: toMember?.name || 'Unknown',
              reason: transferEvent.reason
            }
          });
        }
      });
    });

    return of(pendingRequests).pipe(delay(300));
  }

  /**
   * Execute delivery for tanda member
   */
  executeDelivery(
    tandaId: string,
    clientId: string
  ): Observable<TandaDeliveryResult> {
    return new Observable<TandaDeliveryResult>(observer => {
      const tanda = this.tandaGroups.get(tandaId);
      if (!tanda) {
        observer.error('Tanda not found');
        return;
      }

      const member = tanda.members.find(m => m.clientId === clientId);
      const schedule = tanda.deliverySchedule.find(s => s.memberId === clientId);
      
      if (!member || !schedule) {
        observer.error('Member or schedule not found');
        return;
      }

      if (schedule.deliveryStatus !== 'ready') {
        observer.next({
          success: false,
          deliveryId: '',
          clientId,
          month: schedule.month,
          deliveredAmount: 0,
          deliveryDate: new Date(),
          message: 'Member not ready for delivery'
        });
        observer.complete();
        return;
      }

      // Execute delivery
      const deliveryId = `delivery-${Date.now()}`;
      const result: TandaDeliveryResult = {
        success: true,
        deliveryId,
        clientId,
        month: schedule.month,
        deliveredAmount: tanda.totalAmount,
        deliveryDate: new Date(),
        message: `Entrega exitosa para ${member.name} - Posición ${member.position}`
      };

      // Update status
      member.deliveryStatus = 'delivered';
      schedule.deliveryStatus = 'delivered';
      
      // Advance to next month if this was current month delivery
      if (tanda.currentMonth === member.position) {
        tanda.currentMonth++;
        
        // Check if tanda is complete
        if (tanda.currentMonth > tanda.totalMembers) {
          tanda.status = 'completed';
        }
      }

      this.tandaGroups.set(tandaId, tanda);
      this.updateGroupsSubject();

      observer.next(result);
      observer.complete();
    }).pipe(delay(1000));
  }

  /**
   * Get upcoming deliveries for all tandas
   */
  getUpcomingDeliveries(): Observable<{
    tandaId: string;
    tandaName: string;
    memberId: string;
    memberName: string;
    scheduledDate: Date;
    readyForDelivery: boolean;
  }[]> {
    const upcomingDeliveries: any[] = [];
    
    this.tandaGroups.forEach(tanda => {
      const nextDeliveries = tanda.deliverySchedule
        .filter(schedule => 
          schedule.deliveryStatus === 'ready' || 
          (schedule.deliveryStatus === 'pending' && schedule.month <= tanda.currentMonth + 1)
        )
        .map(schedule => ({
          tandaId: tanda.id,
          tandaName: tanda.name,
          memberId: schedule.memberId,
          memberName: schedule.memberName,
          scheduledDate: schedule.scheduledDate,
          readyForDelivery: schedule.deliveryStatus === 'ready'
        }));
      
      upcomingDeliveries.push(...nextDeliveries);
    });

    return of(upcomingDeliveries.sort((a, b) => 
      a.scheduledDate.getTime() - b.scheduledDate.getTime()
    )).pipe(delay(300));
  }

  /**
   * Get tanda statistics
   */
  getTandaStats(): Observable<{
    activeTandas: number;
    totalMembers: number;
    completedDeliveries: number;
    pendingDeliveries: number;
    totalValueInTandas: number;
    averageCompletionTime: number;
  }> {
    const tandas = Array.from(this.tandaGroups.values());
    
    const stats = {
      activeTandas: tandas.filter(t => t.status === 'active').length,
      totalMembers: tandas.reduce((acc, t) => acc + t.members.length, 0),
      completedDeliveries: tandas.reduce((acc, t) => 
        acc + t.members.filter(m => m.deliveryStatus === 'delivered').length, 0),
      pendingDeliveries: tandas.reduce((acc, t) => 
        acc + t.members.filter(m => m.deliveryStatus !== 'delivered').length, 0),
      totalValueInTandas: tandas.reduce((acc, t) => acc + (t.totalAmount * t.members.length), 0),
      averageCompletionTime: 8.5 // months - would calculate from actual data
    };

    return of(stats).pipe(delay(200));
  }

  /**
   * Update reactive subject with current groups
   */
  private updateGroupsSubject(): void {
    const allGroups = Array.from(this.tandaGroups.values());
    this.groupUpdatesSubject.next(allGroups);
  }

  /**
   * Check if client can join specific tanda
   */
  canClientJoinTanda(clientId: string, tandaId: string): Observable<{
    canJoin: boolean;
    reason?: string;
    availablePositions: number[];
  }> {
    return this.getTandaById(tandaId).pipe(
      map(tanda => {
        if (!tanda) {
          return {
            canJoin: false,
            reason: 'Tanda not found',
            availablePositions: []
          };
        }

        if (tanda.status !== 'forming') {
          return {
            canJoin: false,
            reason: 'Tanda no longer accepting members',
            availablePositions: []
          };
        }

        const takenPositions = tanda.members.map(m => m.position);
        const availablePositions = Array.from({length: tanda.totalMembers}, (_, i) => i + 1)
          .filter(pos => !takenPositions.includes(pos));

        return {
          canJoin: availablePositions.length > 0,
          reason: availablePositions.length === 0 ? 'No available positions' : undefined,
          availablePositions
        };
      })
    );
  }
}
