import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Client, EventType } from '../../models/types';
import { CollectiveCreditGroup, CollectiveCreditMember } from '../../models/tanda';

@Injectable({
  providedIn: 'root'
})
export class CollectiveGroupDataService {
  private collectiveCreditGroupsDB = new Map<string, CollectiveCreditGroup>();
  private groupsSubject = new BehaviorSubject<CollectiveCreditGroup[]>([]);

  public groups$ = this.groupsSubject.asObservable();

  constructor() {
    // Initialize will be called after ClientDataService is available
  }

  /**
   * Initialize with exact data from React simulationService.ts
   * This should be called after ClientDataService is initialized
   */
  initializeCollectiveGroups(clients: Client[]): void {
    // Port exacto de createMembers function
    const createMembers = (clientList: Client[]): CollectiveCreditMember[] => { 
      return clientList.map(c => ({ 
        clientId: c.id, 
        name: c.name, 
        avatarUrl: c.avatarUrl || `https://picsum.photos/seed/${c.id}/100/100`, 
        status: 'active' as const, 
        individualContribution: c.events
          .filter(e => e.type === EventType.Contribution && e.details?.amount)
          .reduce((sum, e) => sum + (e.details?.amount || 0), 0) 
      })); 
    };

    // Port exacto de group members creation
    const group1Members = createMembers([
      ...clients.filter(c => c.collectiveCreditGroupId === 'cc-2405'),
    ]);
    
    const group2Members = createMembers(
      clients.filter(c => c.collectiveCreditGroupId === 'cc-2406')
    );
    
    const group3Members = createMembers(
      clients.filter(c => c.collectiveCreditGroupId === 'cc-2408')
    );

    // Port exacto de initialCollectiveCreditGroups
    const initialCollectiveCreditGroups: CollectiveCreditGroup[] = [
      { 
        id: 'cc-2405', 
        name: 'CC-2405 MAYO', 
        capacity: 10, 
        members: group1Members, 
        totalUnits: 5, 
        unitsDelivered: 0, 
        savingsGoalPerUnit: 153075, 
        currentSavingsProgress: group1Members.reduce((sum, m) => sum + m.individualContribution, 0), 
        monthlyPaymentPerUnit: 25720.52, 
        currentMonthPaymentProgress: 0,
      },
      { 
        id: 'cc-2406', 
        name: 'CC-2406 JUNIO', 
        capacity: 10, 
        members: group2Members, 
        totalUnits: 5, 
        unitsDelivered: 0, 
        savingsGoalPerUnit: 153075, 
        currentSavingsProgress: group2Members.reduce((sum, m) => sum + m.individualContribution, 0), 
        monthlyPaymentPerUnit: 25720.52, 
        currentMonthPaymentProgress: 0,
      },
      { 
        id: 'cc-2407', 
        name: 'CC-2407 JULIO', 
        capacity: 10, 
        members: [], 
        totalUnits: 5, 
        unitsDelivered: 5, 
        savingsGoalPerUnit: 153075, 
        currentSavingsProgress: 0, 
        monthlyPaymentPerUnit: 25720.52, 
        currentMonthPaymentProgress: 100000,
      },
      { 
        id: 'cc-2408', 
        name: 'CC-2408 AGOSTO', 
        capacity: 10, 
        members: group3Members, 
        totalUnits: 5, 
        unitsDelivered: 1, 
        savingsGoalPerUnit: 153075, 
        currentSavingsProgress: 45000, 
        monthlyPaymentPerUnit: 25720.52, 
        currentMonthPaymentProgress: 18000,
      },
    ];

    // Initialize collectiveCreditGroupsDB Map
    this.collectiveCreditGroupsDB.clear();
    initialCollectiveCreditGroups.forEach(group => {
      const groupWithDerived = this.addDerivedGroupProperties(group);
      this.collectiveCreditGroupsDB.set(group.id, groupWithDerived);
    });

    // Update observable
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));
  }

  /**
   * Port exacto de addDerivedGroupProperties desde React
   */
  private addDerivedGroupProperties(group: CollectiveCreditGroup): CollectiveCreditGroup {
    const isSavingPhase = group.unitsDelivered < group.totalUnits;
    const isPayingPhase = group.unitsDelivered > 0;

    let phase: 'saving' | 'payment' | 'dual' | 'completed' = 'saving';
    if (isSavingPhase && isPayingPhase) {
        phase = 'dual';
    } else if (isPayingPhase && !isSavingPhase) {
        phase = 'payment';
    } else if (group.unitsDelivered === group.totalUnits) {
        phase = 'payment';
    }

    return {
        ...group,
        phase,
        savingsGoal: group.savingsGoalPerUnit,
        currentSavings: group.currentSavingsProgress,
        monthlyPaymentGoal: group.monthlyPaymentPerUnit * group.unitsDelivered,
    };
  }

  /**
   * Get all collective credit groups
   */
  getCollectiveGroups(): Observable<CollectiveCreditGroup[]> {
    return of(Array.from(this.collectiveCreditGroupsDB.values())).pipe(delay(300));
  }

  /**
   * Get collective group by ID
   */
  getCollectiveGroupById(id: string): Observable<CollectiveCreditGroup | null> {
    return of(this.collectiveCreditGroupsDB.get(id) || null).pipe(delay(200));
  }

  /**
   * Get groups by phase
   */
  getGroupsByPhase(phase: 'saving' | 'payment' | 'dual' | 'completed'): Observable<CollectiveCreditGroup[]> {
    return of(Array.from(this.collectiveCreditGroupsDB.values()).filter(group => group.phase === phase))
      .pipe(delay(250));
  }

  /**
   * Get active groups (not completed)
   */
  getActiveGroups(): Observable<CollectiveCreditGroup[]> {
    return of(Array.from(this.collectiveCreditGroupsDB.values()).filter(group => group.phase !== 'completed'))
      .pipe(delay(300));
  }

  /**
   * Add member to collective group
   */
  addMemberToGroup(groupId: string, member: CollectiveCreditMember): Observable<CollectiveCreditGroup | null> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of(null).pipe(delay(200));
    }

    // Check capacity
    if (group.members.length >= group.capacity) {
      throw new Error(`Grupo ${group.name} ha alcanzado su capacidad máxima de ${group.capacity} miembros`);
    }

    const updatedMembers = [...group.members, member];
    const updatedGroup = {
      ...group,
      members: updatedMembers,
      currentSavingsProgress: updatedMembers.reduce((sum, m) => sum + m.individualContribution, 0)
    };

    const finalGroup = this.addDerivedGroupProperties(updatedGroup);
    this.collectiveCreditGroupsDB.set(groupId, finalGroup);
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));

    return of(finalGroup).pipe(delay(400));
  }

  /**
   * Remove member from collective group
   */
  removeMemberFromGroup(groupId: string, memberId: string): Observable<CollectiveCreditGroup | null> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of(null).pipe(delay(200));
    }

    const updatedMembers = group.members.filter(member => member.clientId !== memberId);
    const updatedGroup = {
      ...group,
      members: updatedMembers,
      currentSavingsProgress: updatedMembers.reduce((sum, m) => sum + m.individualContribution, 0)
    };

    const finalGroup = this.addDerivedGroupProperties(updatedGroup);
    this.collectiveCreditGroupsDB.set(groupId, finalGroup);
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));

    return of(finalGroup).pipe(delay(400));
  }

  /**
   * Update member contribution
   */
  updateMemberContribution(groupId: string, memberId: string, contribution: number): Observable<CollectiveCreditGroup | null> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of(null).pipe(delay(200));
    }

    const updatedMembers = group.members.map(member =>
      member.clientId === memberId 
        ? { ...member, individualContribution: contribution }
        : member
    );

    const updatedGroup = {
      ...group,
      members: updatedMembers,
      currentSavingsProgress: updatedMembers.reduce((sum, m) => sum + m.individualContribution, 0)
    };

    const finalGroup = this.addDerivedGroupProperties(updatedGroup);
    this.collectiveCreditGroupsDB.set(groupId, finalGroup);
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));

    return of(finalGroup).pipe(delay(400));
  }

  /**
   * Deliver unit to group (increase unitsDelivered)
   */
  deliverUnitToGroup(groupId: string): Observable<CollectiveCreditGroup | null> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of(null).pipe(delay(200));
    }

    if (group.unitsDelivered >= group.totalUnits) {
      throw new Error(`Grupo ${group.name} ya ha recibido todas sus unidades`);
    }

    const updatedGroup = {
      ...group,
      unitsDelivered: group.unitsDelivered + 1,
      // Reset savings progress after delivery
      currentSavingsProgress: Math.max(0, group.currentSavingsProgress - group.savingsGoalPerUnit)
    };

    const finalGroup = this.addDerivedGroupProperties(updatedGroup);
    this.collectiveCreditGroupsDB.set(groupId, finalGroup);
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));

    return of(finalGroup).pipe(delay(500));
  }

  /**
   * Update monthly payment progress
   */
  updatePaymentProgress(groupId: string, amount: number): Observable<CollectiveCreditGroup | null> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of(null).pipe(delay(200));
    }

    const updatedGroup = {
      ...group,
      currentMonthPaymentProgress: Math.min(
        group.currentMonthPaymentProgress + amount,
        group.monthlyPaymentPerUnit * group.unitsDelivered
      )
    };

    const finalGroup = this.addDerivedGroupProperties(updatedGroup);
    this.collectiveCreditGroupsDB.set(groupId, finalGroup);
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));

    return of(finalGroup).pipe(delay(300));
  }

  /**
   * Create new collective group
   */
  createCollectiveGroup(groupData: Partial<CollectiveCreditGroup>): Observable<CollectiveCreditGroup> {
    const newGroup: CollectiveCreditGroup = {
      id: `cc-${Date.now()}`,
      name: groupData.name || 'Nuevo Grupo Colectivo',
      capacity: groupData.capacity || 10,
      members: [],
      totalUnits: groupData.totalUnits || 5,
      unitsDelivered: 0,
      savingsGoalPerUnit: groupData.savingsGoalPerUnit || 153075,
      currentSavingsProgress: 0,
      monthlyPaymentPerUnit: groupData.monthlyPaymentPerUnit || 25720.52,
      currentMonthPaymentProgress: 0,
      ...groupData
    };

    const finalGroup = this.addDerivedGroupProperties(newGroup);
    this.collectiveCreditGroupsDB.set(finalGroup.id, finalGroup);
    this.groupsSubject.next(Array.from(this.collectiveCreditGroupsDB.values()));

    return of(finalGroup).pipe(delay(500));
  }

  /**
   * Get group statistics
   */
  getGroupStats(): Observable<{
    totalGroups: number;
    totalMembers: number;
    byPhase: Record<string, number>;
    averageCompletion: number;
    totalUnitsDelivered: number;
  }> {
    const groups = Array.from(this.collectiveCreditGroupsDB.values());
    
    const byPhase = groups.reduce((acc, group) => {
      const phase = group.phase || 'saving';
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalMembers = groups.reduce((sum, group) => sum + group.members.length, 0);
    const totalUnitsDelivered = groups.reduce((sum, group) => sum + group.unitsDelivered, 0);
    
    const completionRates = groups.map(group => 
      group.totalUnits > 0 ? (group.unitsDelivered / group.totalUnits) * 100 : 0
    );
    const averageCompletion = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;

    return of({
      totalGroups: groups.length,
      totalMembers,
      byPhase,
      averageCompletion: averageCompletion || 0,
      totalUnitsDelivered
    }).pipe(delay(300));
  }

  /**
   * Get members eligible for next unit delivery
   */
  getEligibleMembers(groupId: string): Observable<CollectiveCreditMember[]> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of([]).pipe(delay(200));
    }

    // Simple eligibility: active members who haven't been delivered yet
    // In real implementation, this would check payment history, priority, etc.
    const eligibleMembers = group.members.filter(member => 
      member.status === 'active' && 
      member.individualContribution >= (group.savingsGoalPerUnit * 0.8) // 80% of goal
    );

    return of(eligibleMembers).pipe(delay(300));
  }

  /**
   * Search groups
   */
  searchGroups(query: string): Observable<CollectiveCreditGroup[]> {
    const lowerQuery = query.toLowerCase();
    const matchingGroups = Array.from(this.collectiveCreditGroupsDB.values()).filter(group =>
      group.name.toLowerCase().includes(lowerQuery) ||
      group.members.some(member => member.name.toLowerCase().includes(lowerQuery))
    );

    return of(matchingGroups).pipe(delay(400));
  }

  /**
   * Calculate group health score
   */
  calculateGroupHealth(groupId: string): Observable<{
    healthScore: number;
    factors: {
      memberParticipation: number;
      savingsProgress: number;
      paymentConsistency: number;
    };
  } | null> {
    const group = this.collectiveCreditGroupsDB.get(groupId);
    if (!group) {
      return of(null).pipe(delay(200));
    }

    // Calculate various health factors
    const memberParticipation = (group.members.length / group.capacity) * 100;
    
    const savingsProgress = group.savingsGoalPerUnit > 0 
      ? (group.currentSavingsProgress / group.savingsGoalPerUnit) * 100 
      : 0;
    
    const expectedPayment = group.monthlyPaymentPerUnit * group.unitsDelivered;
    const paymentConsistency = expectedPayment > 0 
      ? (group.currentMonthPaymentProgress / expectedPayment) * 100 
      : 100;

    // Overall health score (weighted average)
    const healthScore = (
      memberParticipation * 0.3 +
      Math.min(savingsProgress, 100) * 0.4 +
      Math.min(paymentConsistency, 100) * 0.3
    );

    return of({
      healthScore: Math.round(healthScore),
      factors: {
        memberParticipation: Math.round(memberParticipation),
        savingsProgress: Math.round(Math.min(savingsProgress, 100)),
        paymentConsistency: Math.round(Math.min(paymentConsistency, 100))
      }
    }).pipe(delay(300));
  }
}