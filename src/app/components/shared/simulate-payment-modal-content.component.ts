import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client, EventLog, Actor, EventType } from '../../models/types';
import { SimulationService } from '../../services/simulation.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-simulate-payment-modal-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">Procesando simulación...</p>
    </div>

    <!-- Form State -->
    <form *ngIf="!isLoading" (ngSubmit)="handleSimulatePayment($event)" class="payment-form">
      <p class="form-intro">
        Introduce el monto que deseas simular como una aportación del cliente. 
        Esto actualizará el estado del cliente y agregará un evento al historial.
      </p>
      
      <div class="amount-field">
        <label for="simAmount" class="field-label">Monto (MXN)</label>
        <div class="currency-input">
          <span class="currency-symbol">$</span>
          <input
            type="number"
            id="simAmount"
            name="simAmount"
            [(ngModel)]="amount"
            class="amount-input"
            placeholder="0.00"
            min="1"
            step="any"
            required
          />
        </div>
      </div>
      
      <div class="submit-section">
        <button type="submit" class="btn-confirm">
          Confirmar Simulación
        </button>
      </div>
    </form>
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 192px;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 2px solid #4a5568;
      border-left-color: #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      margin-top: 16px;
      color: #9ca3af;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-intro {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
    }

    .amount-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #9ca3af;
    }

    .currency-input {
      position: relative;
      border-radius: 6px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .currency-symbol {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #6b7280;
      font-size: 14px;
      pointer-events: none;
    }

    .amount-input {
      width: 100%;
      padding: 8px 48px 8px 28px;
      background: #111827;
      border: 1px solid #4b5563;
      border-radius: 6px;
      color: white;
      font-size: 16px;
      outline: none;
      transition: all 0.2s;
    }

    .amount-input:focus {
      border-color: #06d6a0;
      box-shadow: 0 0 0 1px #06d6a0;
    }

    .submit-section {
      padding-top: 8px;
    }

    .btn-confirm {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: #10b981;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .btn-confirm:hover {
      background: #059669;
    }

    .btn-confirm:focus {
      outline: none;
      box-shadow: 0 0 0 2px #374151, 0 0 0 4px #10b981;
    }
  `]
})
export class SimulatePaymentModalContentComponent implements OnInit {
  @Input() client!: Client;
  @Output() onClientUpdate = new EventEmitter<Client>();
  @Output() onAddEvent = new EventEmitter<EventLog>();
  @Output() onClose = new EventEmitter<void>();

  // Port exacto de state desde React líneas 464-465
  amount = '';
  isLoading = false;

  constructor(
    private simulationService: SimulationService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Component initialized
  }

  // Port exacto de handleSimulatePayment desde React líneas 467-502
  async handleSimulatePayment(event: Event): Promise<void> {
    event.preventDefault();
    
    const numericAmount = parseFloat(this.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      this.toast.error("Por favor, introduce un monto válido.");
      return;
    }

    this.isLoading = true;
    try {
      let updatedClient: Client;
      let message: string;
      
      if (this.client.savingsPlan) {
        updatedClient = await this.simulationService.simulateClientPayment(this.client.id, numericAmount);
        message = `Aportación Voluntaria (simulada) confirmada.`;
      } else if (this.client.paymentPlan) {
        updatedClient = await this.simulationService.simulateMonthlyPayment(this.client.id, numericAmount);
        message = `Aportación a mensualidad (simulada) confirmada.`;
      } else {
        this.toast.error("El cliente no tiene un plan de ahorro o pagos activo.");
        this.isLoading = false;
        return;
      }
      
      this.onClientUpdate.emit(updatedClient);
      const newEvent = await this.simulationService.addNewEvent(
        this.client.id, 
        message, 
        Actor.Asesor, 
        EventType.AdvisorAction, 
        { amount: numericAmount, currency: 'MXN' }
      );
      this.onAddEvent.emit(newEvent);
      this.toast.success("¡Pago simulado con éxito!");
      this.onClose.emit();
    } catch(error) {
      this.toast.error("Error al simular el pago.");
    } finally {
      this.isLoading = false;
    }
  }
}