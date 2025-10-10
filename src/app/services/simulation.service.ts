import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Client, EventLog, PaymentLinkDetails, Actor, EventType, Document, ProtectionScenario } from '../models/types';
import { MockApiService } from './mock-api.service';
import { ProtectionEngineService } from './protection-engine.service';
import { FinancialCalculatorService } from './financial-calculator.service';
import { BusinessFlow } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private clientsDB = new Map<string, Client>();

  constructor(
    private mockApi: MockApiService,
    private protectionEngine: ProtectionEngineService,
    private financialCalc: FinancialCalculatorService
  ) {}

  // Port exacto de generatePaymentLink desde React líneas 431-450
  generatePaymentLink(clientId: string, amount: number): Promise<PaymentLinkDetails> {
    
    if (amount <= 20000) {
      return this.mockApi.delay({
        type: 'Conekta' as const,
        amount,
        details: { 
          link: `https://pay.conekta.com/link/${Math.random().toString(36).substring(7)}` 
        }
      }, 1500);
    } else {
      return this.mockApi.delay({
        type: 'SPEI' as const,
        amount,
        details: {
          clabe: '012180001234567895',
          reference: `CLI${clientId.padStart(4, '0')}${Date.now() % 10000}`,
          bank: 'STP'
        }
      }, 1500);
    }
  }

  // Port exacto de addNewEvent desde React 
  addNewEvent(clientId: string, message: string, actor: Actor, type: EventType, details?: any): Promise<EventLog> {
    const client = this.clientsDB.get(clientId);
    if (!client) return Promise.reject("Client not found");
    
    const newEvent: EventLog = {
      id: `evt-${clientId}-${Date.now()}`,
      timestamp: new Date(),
      message,
      actor,
      type,
      details
    };
    
    client.events = [newEvent, ...client.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    this.clientsDB.set(clientId, client);
    
    return this.mockApi.delay(newEvent);
  }

  // Port exacto de simulateClientPayment desde React líneas 462-472
  simulateClientPayment(clientId: string, amount: number): Promise<Client> {
    const client = this.clientsDB.get(clientId);
    if (!client || !client.savingsPlan) {
      return Promise.reject("Client or savings plan not found");
    }
    
    client.savingsPlan.progress += amount;
    if (client.savingsPlan.progress >= client.savingsPlan.goal) {
      client.status = "Meta Alcanzada";
      client.healthScore = 98;
    }
    
    this.clientsDB.set(clientId, client);
    return this.mockApi.delay(client, 1000);
  }

  // Port exacto de simulateMonthlyPayment desde React líneas 473-479
  simulateMonthlyPayment(clientId: string, amount: number): Promise<Client> {
    const client = this.clientsDB.get(clientId);
    if (!client || !client.paymentPlan) {
      return Promise.reject("Client or payment plan not found");
    }
    
    client.paymentPlan.currentMonthProgress += amount;
    this.clientsDB.set(clientId, client);
    
    return this.mockApi.delay(client, 1000);
  }

  // Port exacto de uploadDocument desde React líneas 452-461
  uploadDocument(clientId: string, docId: string): Promise<Document> {
    const client = this.clientsDB.get(clientId);
    const doc = client?.documents.find(d => d.id === docId);
    
    if (doc && client) {
      doc.status = 'En Revisión' as any;
      this.clientsDB.set(clientId, client);
      return this.mockApi.delay(doc, 2000);
    }
    
    return Promise.reject("Document not found");
  }

  // Initialize client in service
  setClient(client: Client): void {
    this.clientsDB.set(client.id, client);
  }

  // Get client from service
  getClient(clientId: string): Client | undefined {
    return this.clientsDB.get(clientId);
  }

  // Port exacto de simulateProtectionDemo desde React líneas 748-807
  async simulateProtectionDemo(
    baseQuote: {
      amountToFinance: number;
      monthlyPayment: number;
      term: number;
      market?: string;
      monthsPaid?: number;
    },
    monthsToSimulate: number
  ): Promise<ProtectionScenario[]> {
    const {
      amountToFinance: principal,
      monthlyPayment,
      term,
      market = 'aguascalientes',
      monthsPaid = 12,
    } = baseQuote;

    const monthlyRate = this.financialCalc.getTIRMin(market) / 12;
    const remainingTerm = Math.max(term - monthsPaid, 0);

    if (remainingTerm <= monthsToSimulate) {
      return [];
    }

    const outstandingBalance = this.financialCalc.getBalance(principal, monthlyPayment, monthlyRate, monthsPaid);

    const scenarios = [
      this.protectionEngine.generateScenarioWithTIR(
        'DEFER',
        'Pausa y prorrateo',
        `Pausa ${monthsToSimulate} mes(es) y redistribuye el saldo en el plazo restante.`,
        outstandingBalance,
        monthlyRate,
        monthlyPayment,
        remainingTerm,
        monthsToSimulate,
        1,
        market
      ),
      this.protectionEngine.generateScenarioWithTIR(
        'STEPDOWN',
        'Reducción temporal de pago',
        `Reduce el pago mensual y compensa al finalizar los ${monthsToSimulate} mes(es).`,
        outstandingBalance,
        monthlyRate,
        monthlyPayment,
        remainingTerm,
        monthsToSimulate,
        0.6,
        market
      ),
      this.protectionEngine.generateScenarioWithTIR(
        'RECALENDAR',
        'Extensión de plazo',
        `Pausa ${monthsToSimulate} mes(es) y extiende el plazo del crédito para mantener el pago actual.`,
        outstandingBalance,
        monthlyRate,
        monthlyPayment,
        remainingTerm,
        monthsToSimulate,
        1,
        market
      )
    ].filter((scenario): scenario is ProtectionScenario => !!scenario);

    if (!scenarios.length) {
      return [];
    }

    return scenarios.map(scenario => this.enrichDemoScenario(scenario, monthlyPayment, remainingTerm, monthsToSimulate));
  }

  private enrichDemoScenario(
    scenario: ProtectionScenario,
    basePayment: number,
    baseTerm: number,
    monthsToSimulate: number
  ): ProtectionScenario {
    const formatter = (value: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    switch (scenario.type) {
      case 'DEFER':
        return {
          ...scenario,
          title: scenario.title ?? 'Pausa y prorrateo',
          details: [
            `Pagos de $0 por ${monthsToSimulate} mes(es)`,
            `El pago mensual sube a ${formatter(scenario.newPayment ?? scenario.Mprime ?? basePayment)} después.`,
          ]
        };
      case 'STEPDOWN':
        return {
          ...scenario,
          title: scenario.title ?? 'Reducción temporal de pago',
          details: [
            `Pagos de ${formatter((scenario.params?.alpha ?? 0.6) * basePayment)} por ${monthsToSimulate} mes(es)`,
            `El pago sube a ${formatter(scenario.newPayment ?? scenario.Mprime ?? basePayment)} después.`
          ]
        };
      case 'RECALENDAR':
        return {
          ...scenario,
          title: scenario.title ?? 'Extensión de plazo',
          details: [
            `Pagos de $0 por ${monthsToSimulate} mes(es)`,
            `El plazo se extiende en ${Math.max((scenario.newTerm ?? scenario.nPrime ?? baseTerm) - baseTerm, 0)} mes(es).`
          ]
        };
      default:
        return scenario;
    }
  }
}
