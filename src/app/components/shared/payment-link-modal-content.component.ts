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
  templateUrl: './payment-link-modal-content.component.html',
  styleUrls: ['./payment-link-modal-content.component.scss'],
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
        `Liga de pago generada por MX$${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericAmount)}.`, 
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

  getContainerClasses(): Record<string, boolean> {
    return {
      'payment-link-modal--loading': this.isLoading,
      'payment-link-modal--showing-details': !this.isLoading && !!this.paymentDetails,
    };
  }
}
