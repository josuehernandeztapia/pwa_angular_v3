import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { IconComponent } from '../../shared/icon/icon.component';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { Client, BusinessFlow } from '../../../models/types';
import { FlowContextService } from '../../../services/flow-context.service';
import { ErrorBoundaryService } from '../../../services/error-boundary.service';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.scss']
})
export class ClienteFormComponent implements OnInit, OnDestroy {
  clienteForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  clientId?: string;
  private returnTo: string | null = null;
  private returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private toast: ToastService,
    private errorBoundary: ErrorBoundaryService,
    @Optional() private flowContext?: FlowContextService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.checkEditMode();
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.restoreDraftFromContext();
    this.updateBreadcrumbs();
  }

  ngOnDestroy(): void {
    if (!this.isEditMode) {
      this.flowContext?.saveContext('cliente-form', { formValues: this.clienteForm.value }, {
        ttlMs: 10 * 60 * 1000,
        breadcrumbs: ['Dashboard', 'Clientes', 'Nuevo']
      });
    } else {
      this.flowContext?.clearContext('cliente-form', false);
    }
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

  private updateBreadcrumbs(clientName?: string): void {
    const trail = ['Dashboard', 'Clientes'];
    if (this.isEditMode) {
      trail.push(clientName || 'Editar');
    } else {
      trail.push('Nuevo');
    }
    this.flowContext?.setBreadcrumbs(trail);
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
          this.updateBreadcrumbs(client.name);
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

  private restoreDraftFromContext(): void {
    if (this.isEditMode) {
      return;
    }

    const stored = this.flowContext?.getContextData<{ formValues: any }>('cliente-form');
    if (stored?.formValues) {
      this.clienteForm.patchValue(stored.formValues);
    }
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
        next: client => {
          this.toast.success('Cliente actualizado exitosamente');
          this.isLoading = false;
          this.errorBoundary.resolveIssueByContext(issue => issue.context?.module === 'clientes' && issue.context?.clientId === this.clientId);
          this.handlePostSaveNavigation(client);
        },
        error: () => {
          this.isLoading = false;
          this.toast.error('No se pudo actualizar el cliente');
          this.handleClientPersistenceError('update', formData);
        }
      });
    } else {
      this.apiService.createClient(formData).subscribe({
        next: (client) => {
          this.toast.success('Cliente creado exitosamente');
          this.isLoading = false;
          this.errorBoundary.resolveIssueByContext(issue => issue.context?.module === 'clientes' && issue.context?.clientId === client.id);
          this.handlePostSaveNavigation(client);
        },
        error: () => {
          this.isLoading = false;
          this.toast.error('No se pudo crear el cliente');
          this.handleClientPersistenceError('create', formData);
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

  private handlePostSaveNavigation(client?: Client): void {
    this.flowContext?.clearContext('cliente-form');

    if (this.returnTo === 'cotizador') {
      this.flowContext?.updateContext('cotizador', (ctx) => {
        const next = { ...(ctx || {}) } as any;
        if (client) {
          next.clientId = client.id;
          next.clientName = client.name;
        }
        next.lastClientSync = Date.now();
        return next;
      });

      const target = this.returnUrl || '/cotizador';
      this.router.navigateByUrl(target);
      return;
    }

    if (this.isEditMode && this.clientId) {
      this.router.navigate(['/clientes', this.clientId]);
    } else {
      this.router.navigate(['/clientes']);
    }
  }

  private handleClientPersistenceError(action: 'create' | 'update', payload: any): void {
    const endpoint = action === 'create' ? 'clients' : `clients/${this.clientId}`;
    const method = action === 'create' ? 'POST' : 'PUT';

    this.persistDraft(payload);

    this.errorBoundary.reportNetworkTimeout({
      message: action === 'create'
        ? 'Intentaremos crear el cliente cuando vuelva la conexión.'
        : 'Intentaremos actualizar el cliente cuando vuelva la conexión.',
      context: {
        module: 'clientes',
        clientId: this.clientId ?? undefined
      },
      retry: () => this.retryClientRequest(action, payload),
      queueRequest: {
        endpoint,
        method,
        payload
      },
      onSaveDraft: () => this.persistDraft(payload)
    });
  }

  private persistDraft(payload: any): void {
    this.flowContext?.saveContext('cliente-form', { formValues: payload }, {
      ttlMs: 10 * 60 * 1000,
      breadcrumbs: ['Dashboard', 'Clientes', this.isEditMode ? 'Editar' : 'Nuevo']
    });
  }

  private async retryClientRequest(action: 'create' | 'update', payload: any): Promise<Client> {
    if (action === 'create') {
      return firstValueFrom(this.apiService.createClient(payload));
    }

    if (!this.clientId) {
      throw new Error('No hay cliente seleccionado para reintentar.');
    }

    return firstValueFrom(this.apiService.updateClient(this.clientId, payload));
  }
}
