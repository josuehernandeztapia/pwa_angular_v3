import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client, EventLog, PaymentLinkDetails, BusinessFlow, Actor, EventType } from '../../models/types';
import { SimulationService } from '../../services/simulation.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-payment-link-modal-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">Procesando...</p>
    </div>

    <!-- Payment Details State -->
    <div *ngIf="!isLoading && paymentDetails" class="payment-details">
      <p class="details-intro">
        Información de pago generada. Compártela con el cliente y simula el pago una vez confirmado.
      </p>
      
      <!-- Conekta Payment Link -->
      <div *ngIf="paymentDetails.type === 'Conekta'" class="conekta-section">
        <label class="field-label">Liga de Pago Conekta</label>
        <div class="input-with-copy">
          <input 
            type="text" 
            readonly 
            [value]="paymentDetails.details.link" 
            class="readonly-input"
          />
          <button 
            (click)="handleCopy(getDetailsToCopy())" 
            class="copy-button"
          >
            📋
          </button>
        </div>
      </div>
      
      <!-- SPEI Bank Details -->
      <div *ngIf="paymentDetails.type === 'SPEI'" class="spei-section">
        <div class="spei-detail">
          <span class="detail-label">Banco:</span>
          <span class="detail-value">{{ paymentDetails.details.bank }}</span>
        </div>
        <div class="spei-detail">
          <span class="detail-label">CLABE:</span>
          <span class="detail-value">{{ paymentDetails.details.clabe }}</span>
        </div>
        <div class="spei-detail">
          <span class="detail-label">Referencia:</span>
          <span class="detail-value">{{ paymentDetails.details.reference }}</span>
        </div>
        <button 
          (click)="handleCopy(getDetailsToCopy())" 
          class="copy-all-button"
        >
          📋 Copiar Datos
        </button>
      </div>
      
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          (click)="handleSimulatePayment()" 
          class="btn-simulate-payment"
        >
          Simular Pago del Cliente
        </button>
        <button 
          (click)="handleClose()" 
          class="btn-close"
        >
          Cerrar
        </button>
      </div>
    </div>

    <!-- Form State -->
    <form *ngIf="!isLoading && !paymentDetails" (ngSubmit)="handleGenerateLink($event)" class="payment-form">
      <p class="form-intro">
        Introduce el monto del pago para generar la liga de pago o los datos de transferencia correspondientes.
      </p>
      
      <div class="amount-field">
        <label for="amount" class="field-label">Monto (MXN)</label>
        <div class="currency-input">
          <span class="currency-symbol">$</span>
          <input
            type="number"
            id="amount"
            name="amount"
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
        <button type="submit" class="btn-generate">
          Generar
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

    .payment-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .details-intro {
      color: #9ca3af;
    }

    .conekta-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
    }

    .input-with-copy {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .readonly-input {
      flex: 1;
      padding: 8px 12px;
      background: #111827;
      border: 1px solid #4b5563;
      border-radius: 6px;
      color: #9ca3af;
      outline: none;
    }

    .copy-button {
      padding: 8px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .copy-button:hover {
      background: #059669;
    }

    .spei-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
    }

    .spei-detail {
      display: flex;
      justify-content: space-between;
    }

    .detail-label {
      color: #6b7280;
    }

    .detail-value {
      font-family: monospace;
      color: white;
    }

    .copy-all-button {
      width: 100%;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      background: #4b5563;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .copy-all-button:hover {
      background: #6b7280;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      padding-top: 16px;
    }

    .btn-simulate-payment {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 600;
      color: white;
      background: #10b981;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-simulate-payment:hover {
      background: #059669;
    }

    .btn-close {
      flex: 1;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #9ca3af;
      background: #4b5563;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-close:hover {
      background: #6b7280;
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-intro {
      color: #6b7280;
    }

    .amount-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
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
      transition: border-color 0.2s;
    }

    .amount-input:focus {
      border-color: #06d6a0;
      box-shadow: 0 0 0 1px #06d6a0;
    }

    .submit-section {
      padding-top: 8px;
    }

    .btn-generate {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: #06d6a0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .btn-generate:hover {
      background: #059669;
    }

    .btn-generate:focus {
      outline: none;
      box-shadow: 0 0 0 2px #374151, 0 0 0 4px #06d6a0;
    }
  `]
})
export class PaymentLinkModalContentComponent implements OnInit {
  @Input() client!: Client;
  @Input() initialAmount?: number;
  @Output() onClientUpdate = new EventEmitter<Client>();
  @Output() onAddEvent = new EventEmitter<EventLog>();
  @Output() onClose = new EventEmitter<void>();

  // Port exacto de state desde React líneas 324-326
  amount = '';
  isLoading = false;
  paymentDetails: PaymentLinkDetails | null = null;

  constructor(
    private simulationService: SimulationService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.initialAmount) {
      this.amount = String(this.initialAmount);
    }
  }

  // Port exacto de handleGenerateLink desde React líneas 328-348
  async handleGenerateLink(event: Event): Promise<void> {
    event.preventDefault();
    
    const numericAmount = parseFloat(this.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      this.toast.error("Por favor, introduce un monto válido.");
      return;
    }

    this.isLoading = true;
    this.paymentDetails = null;
    
    try {
      const details = await this.simulationService.generatePaymentLink(this.client.id, numericAmount);
      this.paymentDetails = details;
      
      const newEvent = await this.simulationService.addNewEvent(
        this.client.id, 
        `Liga de pago generada por ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(numericAmount)}.`, 
        Actor.Asesor, 
        EventType.AdvisorAction
      );
      this.onAddEvent.emit(newEvent);
    } catch (error) {
      this.toast.error("Hubo un error al generar la liga de pago.");
    } finally {
      this.isLoading = false;
    }
  }

  // Port exacto de handleCopy desde React líneas 350-353
  handleCopy(text: string): void {
    navigator.clipboard.writeText(text);
    this.toast.success('¡Copiado al portapapeles!');
  }

  // Port exacto de handleSimulatePayment desde React líneas 355-380
  async handleSimulatePayment(): Promise<void> {
    if (!this.paymentDetails) return;

    this.isLoading = true;
    try {
      let updatedClient: Client;
      let message: string;
      
      if (this.client.flow === BusinessFlow.AhorroProgramado) {
        updatedClient = await this.simulationService.simulateClientPayment(this.client.id, this.paymentDetails.amount);
        message = `Aportación Voluntaria confirmada.`;
      } else { // Venta a Plazo or Venta Directa
        updatedClient = await this.simulationService.simulateMonthlyPayment(this.client.id, this.paymentDetails.amount);
        message = `Aportación a mensualidad confirmada.`;
      }
      
      this.onClientUpdate.emit(updatedClient);
      const newEvent = await this.simulationService.addNewEvent(
        this.client.id, 
        message, 
        Actor.Sistema, 
        EventType.Contribution, 
        { amount: this.paymentDetails.amount, currency: 'MXN' }
      );
      this.onAddEvent.emit(newEvent);
      this.toast.success("¡Pago simulado con éxito!");
      this.handleClose();
    } catch(error) {
      this.toast.error("Error al simular el pago.");
    } finally {
      this.isLoading = false;
    }
  }

  handleClose(): void {
    this.onClose.emit();
  }

  // Port exacto de details copy logic desde React líneas 393-395
  getDetailsToCopy(): string {
    if (!this.paymentDetails) return '';
    
    const isConekta = this.paymentDetails.type === 'Conekta';
    return isConekta
      ? this.paymentDetails.details.link!
      : `Banco: ${this.paymentDetails.details.bank}\nCLABE: ${this.paymentDetails.details.clabe}\nReferencia: ${this.paymentDetails.details.reference}`;
  }
}