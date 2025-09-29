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
  templateUrl: './simulate-payment-modal-content.component.html',
  styleUrls: ['./simulate-payment-modal-content.component.scss']
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