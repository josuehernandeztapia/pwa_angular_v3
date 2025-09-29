import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { Client, BusinessFlow } from '../../../models/types';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.scss']
})
export class ClienteFormComponent implements OnInit {
  clienteForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  clientId?: string;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.checkEditMode();
  }

  private createForm(): void {
    this.clienteForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, CustomValidators.mexicanPhone]],
      rfc: ['', [CustomValidators.rfc]],
      market: ['aguascalientes', [Validators.required]],
      flow: [BusinessFlow.VentaPlazo, [Validators.required]],
      notes: ['']
    });
  }

  private checkEditMode(): void {
    this.clientId = this.route.snapshot.params['id'];
    if (this.clientId) {
      this.isEditMode = true;
      this.loadClient(this.clientId);
    }
  }

  private loadClient(id: string): void {
    this.isLoading = true;
    this.apiService.getClientById(id).subscribe({
      next: (client) => {
        if (client) {
          this.clienteForm.patchValue({
            name: client.name,
            email: client.email,
            phone: client.phone,
            rfc: client.rfc || '',
            market: client.market,
            flow: client.flow,
            notes: ''
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error('Error al cargar el cliente');
        this.isLoading = false;
        this.router.navigate(['/clientes']);
      }
    });
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.markFormGroupTouched();
      this.toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    this.isLoading = true;
    const formData = this.clienteForm.value;

    if (this.isEditMode && this.clientId) {
      this.apiService.updateClient(this.clientId, formData).subscribe({
        next: (client) => {
          this.toast.success('Cliente actualizado exitosamente');
          this.isLoading = false;
          this.router.navigate(['/clientes', this.clientId]);
        },
        error: (error) => {
          this.toast.error('Error al actualizar el cliente');
          this.isLoading = false;
        }
      });
    } else {
      this.apiService.createClient(formData).subscribe({
        next: (client) => {
          this.toast.success('Cliente creado exitosamente');
          this.isLoading = false;
          this.router.navigate(['/clientes']);
        },
        error: (error) => {
          this.toast.error('Error al crear el cliente');
          this.isLoading = false;
        }
      });
    }
  }

  // Methods referenced by specs
  createClient(): void {
    // Delegate to onSubmit (create flow)
    this.isEditMode = false;
    this.onSubmit();
  }

  updateClient(): void {
    // Delegate to onSubmit (update flow)
    this.isEditMode = true;
    this.onSubmit();
  }

  onMarketChange(market: string): void {
    this.clienteForm.patchValue({ market });
  }

  onRfcInput(event: any): void {
    // Convertir a mayúsculas
    const value = event.target.value.toUpperCase();
    this.clienteForm.patchValue({ rfc: value });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clienteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clienteForm.controls).forEach(key => {
      const control = this.clienteForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/clientes']);
  }
}
