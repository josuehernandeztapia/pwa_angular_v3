import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { FinancialCalculatorService } from './financial-calculator.service';
import { Client, BusinessFlow, Market } from '../models/types';

export interface AhorroIndividual {
  id: string;
  clientId: string;
  clientName: string;
  market: Market;
  startDate: Date;
  targetAmount: number;
  monthlyGoal: number;
  currentBalance: number;
  monthsCompleted: number;
  estimatedCompletion: Date;
  interestRate: number; // 8% AGS, 0% EdoMex
  projectedInterest: number;
  finalProjectedAmount: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  vehicleTarget?: string; // Tipo de vehículo objetivo
  ahorroHistory: AhorroMovement[];
}

export interface AhorroColectivo {
  id: string;
  groupId: string;
  routeId: string; // Ecosistema/ruta en EdoMex
  groupName: string;
  market: Market;
  tandaType: 'rotativa' | 'colectiva'; // Rotativa = cada mes alguien cobra, Colectiva = todos ahorran para todos
  participants: TandaParticipant[];
  monthlyAmount: number;
  groupSize: number;
  currentCycle: number;
  totalCycles: number;
  startDate: Date;
  status: 'forming' | 'active' | 'completed' | 'paused';
  tandaHistory: TandaMovement[];
  nextRecipient?: string; // Para tandas rotativas
  distributionSchedule: TandaDistribution[];
}

export interface TandaParticipant {
  clientId: string;
  clientName: string;
  position: number; // 1-N, orden de cobro en tanda rotativa
  hasReceived: boolean; // Si ya recibió su turno en tanda rotativa
  receivedDate?: Date;
  receivedAmount?: number;
  totalContributed: number;
  currentBalance: number;
  status: 'active' | 'defaulted' | 'completed';
}

export interface TandaDistribution {
  cycle: number;
  recipientId: string;
  recipientName: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'completed' | 'overdue';
}

export interface AhorroMovement {
  id: string;
  date: Date;
  type: 'deposit' | 'withdrawal' | 'interest' | 'fee';
  amount: number;
  balance: number;
  description: string;
  reference?: string;
}

export interface TandaMovement {
  id: string;
  date: Date;
  type: 'contribution' | 'distribution' | 'penalty' | 'bonus';
  participantId: string;
  participantName: string;
  amount: number;
  cycle: number;
  description: string;
}

export interface AhorroSimulation {
  monthlyAmount: number;
  savingPeriod: number;
  targetAmount: number;
  market: Market;
  withInterest: boolean; // Solo AGS tiene interés
  projectedBalance: number[];
  totalSaved: number;
  totalInterest: number;
  finalAmount: number;
  milestones: { month: number; amount: number; description: string }[];
}

export interface TandaSimulation {
  groupSize: number;
  monthlyAmount: number;
  market: Market;
  participantPosition: number;
  totalCycles: number;
  receivingCycle: number;
  receivingAmount: number;
  totalContribution: number;
  netBenefit: number; // Positivo si recibe temprano, negativo si recibe tarde
  riskAssessment: 'low' | 'medium' | 'high';
  projectedTimeline: { cycle: number; event: string; amount?: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AhorroService {

  constructor(private financialCalc: FinancialCalculatorService) {}

  /**
   * Crear ahorro individual para AGS o EdoMex
   */
  createAhorroIndividual(
    client: Client,
    monthlyGoal: number,
    targetAmount: number,
    vehicleTarget?: string
  ): Observable<AhorroIndividual> {
    
    const interestRate = client.market === 'aguascalientes' ? 0.08 : 0; // 8% AGS, 0% EdoMex
    const estimatedMonths = interestRate > 0 
      ? this.calculateMonthsWithInterest(targetAmount, monthlyGoal, interestRate)
      : Math.ceil(targetAmount / monthlyGoal);
    
    const estimatedCompletion = new Date();
    estimatedCompletion.setMonth(estimatedCompletion.getMonth() + estimatedMonths);

    const projectedInterest = interestRate > 0 
      ? this.calculateCompoundInterest(monthlyGoal, estimatedMonths, interestRate) - (monthlyGoal * estimatedMonths)
      : 0;

    const ahorro: AhorroIndividual = {
      id: `ahorro-${client.id}-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      market: client.market,
      startDate: new Date(),
      targetAmount,
      monthlyGoal,
      currentBalance: 0,
      monthsCompleted: 0,
      estimatedCompletion,
      interestRate,
      projectedInterest,
      finalProjectedAmount: targetAmount + projectedInterest,
      status: 'active',
      vehicleTarget,
      ahorroHistory: []
    };

    return of(ahorro).pipe(delay(400));
  }

  /**
   * Crear tanda colectiva para EdoMex (solo disponible en EdoMex)
   */
  createTandaColectiva(
    routeId: string,
    groupName: string,
    participants: { clientId: string; clientName: string }[],
    monthlyAmount: number,
    tandaType: 'rotativa' | 'colectiva' = 'rotativa'
  ): Observable<AhorroColectivo> {
    
    if (participants.length < 5) {
      throw new Error('Tanda colectiva requiere mínimo 5 participantes');
    }

    const groupSize = participants.length;
    const totalCycles = tandaType === 'rotativa' ? groupSize : 12; // 12 meses para colectiva

    // Asignar posiciones aleatorias para tanda rotativa
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    
    const tandaParticipants: TandaParticipant[] = shuffledParticipants.map((p, index) => ({
      clientId: p.clientId,
      clientName: p.clientName,
      position: index + 1,
      hasReceived: false,
      totalContributed: 0,
      currentBalance: 0,
      status: 'active'
    }));

    // Generar cronograma de distribución
    const distributionSchedule: TandaDistribution[] = [];
    const startDate = new Date();
    
    for (let cycle = 1; cycle <= totalCycles; cycle++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + cycle - 1);
      
      const recipient = tandaType === 'rotativa' 
        ? tandaParticipants[cycle - 1]
        : tandaParticipants[0]; // En colectiva, todos reciben cada ciclo

      distributionSchedule.push({
        cycle,
        recipientId: recipient.clientId,
        recipientName: recipient.clientName,
        amount: monthlyAmount * groupSize,
        dueDate,
        status: 'pending'
      });
    }

    const tanda: AhorroColectivo = {
      id: `tanda-${routeId}-${Date.now()}`,
      groupId: `group-${routeId}-${Date.now()}`,
      routeId,
      groupName,
      market: 'edomex', // Tandas solo en EdoMex
      tandaType,
      participants: tandaParticipants,
      monthlyAmount,
      groupSize,
      currentCycle: 0,
      totalCycles,
      startDate,
      status: 'forming',
      tandaHistory: [],
      nextRecipient: tandaParticipants[0]?.clientId,
      distributionSchedule
    };

    return of(tanda).pipe(delay(600));
  }

  /**
   * Simular ahorro individual con proyecciones
   */
  simulateAhorroIndividual(
    monthlyAmount: number,
    targetAmount: number,
    market: Market
  ): Observable<AhorroSimulation> {
    
    const withInterest = market === 'aguascalientes';
    const interestRate = withInterest ? 0.08 : 0; // 8% anual AGS
    
    const savingPeriod = withInterest
      ? this.calculateMonthsWithInterest(targetAmount, monthlyAmount, interestRate)
      : Math.ceil(targetAmount / monthlyAmount);

    const projectedBalance: number[] = [];
    const milestones: { month: number; amount: number; description: string }[] = [];
    
    let currentBalance = 0;
    let totalSaved = 0;

    for (let month = 1; month <= savingPeriod; month++) {
      totalSaved += monthlyAmount;
      
      if (withInterest) {
        // Interés compuesto mensual
        currentBalance = (currentBalance + monthlyAmount) * (1 + interestRate / 12);
      } else {
        currentBalance += monthlyAmount;
      }
      
      projectedBalance.push(currentBalance);

      // Agregar milestones
      if (month === Math.floor(savingPeriod * 0.25)) {
        milestones.push({
          month,
          amount: currentBalance,
          description: '25% del objetivo alcanzado'
        });
      } else if (month === Math.floor(savingPeriod * 0.5)) {
        milestones.push({
          month,
          amount: currentBalance,
          description: '50% del objetivo alcanzado'
        });
      } else if (month === Math.floor(savingPeriod * 0.75)) {
        milestones.push({
          month,
          amount: currentBalance,
          description: '75% del objetivo alcanzado'
        });
      }
    }

    const totalInterest = withInterest ? currentBalance - totalSaved : 0;
    const finalAmount = currentBalance;

    const simulation: AhorroSimulation = {
      monthlyAmount,
      savingPeriod,
      targetAmount,
      market,
      withInterest,
      projectedBalance,
      totalSaved,
      totalInterest,
      finalAmount,
      milestones
    };

    return of(simulation).pipe(delay(300));
  }

  /**
   * Simular tanda colectiva rotativa
   */
  simulateTandaColectiva(
    groupSize: number,
    monthlyAmount: number,
    participantPosition: number
  ): Observable<TandaSimulation> {
    
    if (groupSize < 5 || groupSize > 20) {
      throw new Error('Tanda debe tener entre 5 y 20 participantes');
    }
    
    if (participantPosition < 1 || participantPosition > groupSize) {
      throw new Error('Posición del participante inválida');
    }

    const totalCycles = groupSize;
    const receivingCycle = participantPosition;
    const receivingAmount = monthlyAmount * groupSize;
    const totalContribution = monthlyAmount * totalCycles;
    
    // Calcular beneficio neto (positivo si recibe temprano, negativo si tarde)
    const timeValueOfMoney = 0.02; // 2% mensual costo de oportunidad
    let netBenefit = receivingAmount; // Monto recibido
    
    // Descontar contribuciones futuras después de recibir
    for (let cycle = receivingCycle + 1; cycle <= totalCycles; cycle++) {
      const discountedContribution = monthlyAmount / Math.pow(1 + timeValueOfMoney, cycle - receivingCycle);
      netBenefit -= discountedContribution;
    }
    
    // Descontar contribuciones antes de recibir
    for (let cycle = 1; cycle < receivingCycle; cycle++) {
      netBenefit -= monthlyAmount;
    }

    // Evaluación de riesgo basada en posición
    let riskAssessment: 'low' | 'medium' | 'high' = 'low';
    if (participantPosition > groupSize * 0.7) {
      riskAssessment = 'high'; // Posiciones tardías tienen más riesgo
    } else if (participantPosition > groupSize * 0.4) {
      riskAssessment = 'medium';
    }

    // Generar cronograma
    const projectedTimeline: { cycle: number; event: string; amount?: number }[] = [];
    
    for (let cycle = 1; cycle <= totalCycles; cycle++) {
      if (cycle === receivingCycle) {
        projectedTimeline.push({
          cycle,
          event: `Recibes tu turno en la tanda`,
          amount: receivingAmount
        });
      } else {
        projectedTimeline.push({
          cycle,
          event: `Contribución mensual`,
          amount: -monthlyAmount
        });
      }
    }

    const simulation: TandaSimulation = {
      groupSize,
      monthlyAmount,
      market: 'edomex',
      participantPosition,
      totalCycles,
      receivingCycle,
      receivingAmount,
      totalContribution,
      netBenefit,
      riskAssessment,
      projectedTimeline
    };

    return of(simulation).pipe(delay(400));
  }

  /**
   * Procesar contribución a ahorro individual
   */
  processAhorroContribution(
    ahorroId: string,
    amount: number,
    reference?: string
  ): Observable<{ success: boolean; newBalance: number; movement: AhorroMovement }> {
    
    // Simular procesamiento
    const movement: AhorroMovement = {
      id: `mov-${Date.now()}`,
      date: new Date(),
      type: 'deposit',
      amount,
      balance: amount, // En implementación real, se sumaría al balance actual
      description: `Aportación mensual${reference ? ` - ${reference}` : ''}`,
      reference
    };

    return of({
      success: true,
      newBalance: amount,
      movement
    }).pipe(delay(200));
  }

  /**
   * Procesar distribución de tanda
   */
  processTandaDistribution(
    tandaId: string,
    cycle: number,
    recipientId: string
  ): Observable<{ success: boolean; distributedAmount: number; movement: TandaMovement }> {
    
    // Simular procesamiento
    const distributedAmount = 25000; // Ejemplo: monto distribuido
    
    const movement: TandaMovement = {
      id: `tanda-mov-${Date.now()}`,
      date: new Date(),
      type: 'distribution',
      participantId: recipientId,
      participantName: 'Participante Ejemplo',
      amount: distributedAmount,
      cycle,
      description: `Distribución ciclo ${cycle} - Tanda ${tandaId}`
    };

    return of({
      success: true,
      distributedAmount,
      movement
    }).pipe(delay(300));
  }

  /**
   * Obtener ahorros activos del cliente
   */
  getClientAhorros(clientId: string): Observable<{
    individual: AhorroIndividual[];
    colectivo: AhorroColectivo[];
  }> {
    // Simular datos - en implementación real vendría de API
    const individual: AhorroIndividual[] = [];
    const colectivo: AhorroColectivo[] = [];

    return of({ individual, colectivo }).pipe(delay(200));
  }

  /**
   * Obtener tandas disponibles en una ruta
   */
  getAvailableTandasByRoute(routeId: string): Observable<AhorroColectivo[]> {
    // Simular tandas disponibles para unirse
    const availableTandas: AhorroColectivo[] = [];
    
    return of(availableTandas).pipe(delay(300));
  }

  // === MÉTODOS PRIVADOS DE CÁLCULO ===

  private calculateMonthsWithInterest(targetAmount: number, monthlyAmount: number, annualRate: number): number {
    const monthlyRate = annualRate / 12;
    
    if (monthlyRate === 0) {
      return Math.ceil(targetAmount / monthlyAmount);
    }
    
    // Fórmula de anualidad: FV = PMT * [((1 + r)^n - 1) / r]
    // Resolviendo para n: n = ln(1 + (FV * r) / PMT) / ln(1 + r)
    const n = Math.log(1 + (targetAmount * monthlyRate) / monthlyAmount) / Math.log(1 + monthlyRate);
    
    return Math.ceil(n);
  }

  private calculateCompoundInterest(monthlyAmount: number, months: number, annualRate: number): number {
    const monthlyRate = annualRate / 12;
    
    if (monthlyRate === 0) {
      return monthlyAmount * months;
    }
    
    // Valor futuro de anualidad ordinaria
    const futureValue = monthlyAmount * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    
    return futureValue;
  }
}