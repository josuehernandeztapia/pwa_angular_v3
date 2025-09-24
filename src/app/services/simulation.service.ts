import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Client, EventLog, PaymentLinkDetails, Actor, EventType, Document } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private clientsDB = new Map<string, Client>();

  constructor(private mockApi: MockApiService) {}

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
  async simulateProtectionDemo(baseQuote: { amountToFinance: number; monthlyPayment: number; term: number }, monthsToSimulate: number): Promise<any[]> {
    const { amountToFinance: P, monthlyPayment: M, term: originalTerm } = baseQuote;
    
    const r = 0.255 / 12; 
    
    // Simulate what protection looks like 1 year (12 months) into the loan
    const monthsPaid = 12;
    
    // The simulation only makes sense if there are enough months left in the term
    const remainingTerm = originalTerm - monthsPaid;
    if (remainingTerm <= monthsToSimulate) {
      return Promise.resolve([]);
    }
    
    // Get the outstanding balance after 12 payments
    const B_k = this.getBalance(P, M, r, monthsPaid);
    const scenarios: any[] = [];

    // Scenario A: Deferral
    const newRemainingTerm_A = remainingTerm - monthsToSimulate;
    const newPayment_A = this.annuity(B_k, r, newRemainingTerm_A);
    scenarios.push({
      type: 'defer',
      title: 'Pausa y Prorrateo',
      description: 'Pausa los pagos y distribuye el monto en las mensualidades restantes.',
      newMonthlyPayment: newPayment_A,
      newTerm: originalTerm,
      termChange: 0,
      details: [
        `Pagos de $0 por ${monthsToSimulate} meses`, 
        `El pago mensual sube a ${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(newPayment_A)} después.`
      ]
    });

    // Scenario B: Step-down
    const reducedPayment = M * 0.5;
    const principalAfterStepDown = this.getBalance(B_k, reducedPayment, r, monthsToSimulate);
    const compensationPayment = this.annuity(principalAfterStepDown, r, remainingTerm - monthsToSimulate);
    scenarios.push({
      type: 'step-down',
      title: 'Reducción y Compensación',
      description: 'Reduce el pago a la mitad y compensa la diferencia más adelante.',
      newMonthlyPayment: compensationPayment,
      newTerm: originalTerm,
      termChange: 0,
      details: [
        `Pagos de ${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reducedPayment)} por ${monthsToSimulate} meses`, 
        `El pago sube a ${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(compensationPayment)} después.`
      ]
    });

    // Scenario C: Recalendar (Term Extension)
    const newTerm_C = originalTerm + monthsToSimulate;
    scenarios.push({
      type: 'recalendar',
      title: 'Extensión de Plazo',
      description: 'Pausa los pagos y extiende el plazo del crédito para compensar.',
      newMonthlyPayment: M,
      newTerm: newTerm_C,
      termChange: monthsToSimulate,
      details: [
        `Pagos de $0 por ${monthsToSimulate} meses`, 
        `El plazo se extiende en ${monthsToSimulate} meses.`
      ]
    });

    return this.mockApi.delay(scenarios, 1500);
  }

  // Financial calculation helpers
  private getBalance(P: number, M: number, r: number, k: number): number {
    // Calculate outstanding balance after k payments using annuity formula
    if (r === 0) return P - (M * k);
    return P * Math.pow(1 + r, k) - M * ((Math.pow(1 + r, k) - 1) / r);
  }

  private annuity(P: number, r: number, n: number): number {
    // Calculate annuity payment (monthly payment for given principal, rate, and term)
    if (r === 0) return P / n;
    return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
}
