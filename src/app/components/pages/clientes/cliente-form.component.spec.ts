import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fireEvent } from '@testing-library/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ClienteFormComponent } from './cliente-form.component';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { Client, BusinessFlow } from '../../../models/types';

const mockClient: Client = {
  id: '1',
  name: 'Juan Pérez García',
  email: 'juan@example.com',
  phone: '5551234567',
  rfc: 'PEGJ850315ABC',
  market: 'aguascalientes',
  flow: BusinessFlow.VentaPlazo,
  status: 'Activo',
  avatarUrl: '',
  documents: [],
  events: [],
  createdAt: new Date(),
  lastModified: new Date()
};

describe('ClienteFormComponent', () => {
  let component: ClienteFormComponent;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['createClient', 'updateClient', 'getClientById']);

    mockActivatedRoute = {
      params: of({ id: null }),
      snapshot: { 
        params: { id: null }
      },
      data: of({})
    };

    await TestBed.configureTestingModule({
      imports: [ClienteFormComponent, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    }).compileComponents();

    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    mockApiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values for new client', () => {
    component.ngOnInit();
    
    expect(component.isEditMode).toBe(false);
    expect(component.clienteForm.get('name')?.value).toBe('');
    expect(component.clienteForm.get('email')?.value).toBe('');
    expect(component.clienteForm.get('phone')?.value).toBe('');
    expect(component.clienteForm.get('market')?.value).toBe('aguascalientes');
    expect(component.clienteForm.get('flow')?.value).toBe(BusinessFlow.VentaPlazo);
  });

  it('should validate required fields', () => {
    const nameControl = component.clienteForm.get('name');
    const emailControl = component.clienteForm.get('email');
    
    nameControl?.setValue('');
    emailControl?.setValue('');
    nameControl?.markAsTouched();
    emailControl?.markAsTouched();
    
    expect(component.isFieldInvalid('name')).toBe(true);
    expect(component.isFieldInvalid('email')).toBe(true);
    expect(nameControl?.errors?.['required']).toBeTruthy();
    expect(emailControl?.errors?.['required']).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.clienteForm.get('email');
    
    emailControl?.setValue('invalid-email');
    emailControl?.markAsTouched();
    
    expect(component.isFieldInvalid('email')).toBe(true);
    expect(emailControl?.errors?.['email']).toBeTruthy();
  });

  it('should validate phone format', () => {
    const phoneControl = component.clienteForm.get('phone');
    
    phoneControl?.setValue('invalid-phone');
    phoneControl?.markAsTouched();
    
    expect(component.isFieldInvalid('phone')).toBe(true);
  });

  it('should validate RFC format if provided', () => {
    const rfcControl = component.clienteForm.get('rfc');
    
    rfcControl?.setValue('INVALID_RFC');
    rfcControl?.markAsTouched();
    
    expect(component.isFieldInvalid('rfc')).toBe(true);
  });

  it('should create new client with valid form data', () => {
    const clientData = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '5551234567',
      rfc: 'TESU850315ABC',
      market: 'aguascalientes',
      flow: BusinessFlow.VentaPlazo
    };

    mockApiService.createClient.and.returnValue(of({ ...clientData, id: '123' } as Client));

    component.clienteForm.patchValue(clientData);
    component.onSubmit();

    expect(mockApiService.createClient).toHaveBeenCalledWith(jasmine.objectContaining(clientData));
    expect(mockToastService.success).toHaveBeenCalledWith('Cliente creado exitosamente');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes']);
  });

  it('should load existing client data in edit mode', () => {
    mockActivatedRoute.params = of({ id: '1' });
    mockActivatedRoute.snapshot.params = { id: '1' };
    mockApiService.getClientById.and.returnValue(of(mockClient));

    component.ngOnInit();

    expect(mockApiService.getClientById).toHaveBeenCalledWith('1');
    expect(component.isEditMode).toBe(true);
    expect(component.clienteForm.get('name')?.value).toBe(mockClient.name);
    expect(component.clienteForm.get('email')?.value).toBe(mockClient.email);
  });

  it('should update existing client with valid form data', () => {
    component.isEditMode = true;
    component.clientId = '1';
    
    const updatedData = {
      name: 'Updated Name',
      email: 'updated@example.com',
      phone: '5559876543',
      rfc: 'UPDA850315XYZ',
      market: 'edomex',
      flow: BusinessFlow.AhorroProgramado
    };

    mockApiService.updateClient.and.returnValue(of({ ...updatedData, id: '1' } as Client));

    component.clienteForm.patchValue(updatedData);
    component.onSubmit();

    expect(mockApiService.updateClient).toHaveBeenCalledWith('1', jasmine.objectContaining(updatedData));
    expect(mockToastService.success).toHaveBeenCalledWith('Cliente actualizado exitosamente');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes', '1']);
  });

  it('should handle API error during client creation', () => {
    const errorMessage = 'Error creating client';
    mockApiService.createClient.and.returnValue(throwError(() => new Error(errorMessage)));

    component.clienteForm.patchValue({
      name: 'Test User',
      email: 'test@example.com',
      phone: '5551234567',
      market: 'aguascalientes',
      flow: BusinessFlow.VentaPlazo
    });

    component.onSubmit();

    expect(mockToastService.error).toHaveBeenCalledWith('Error al crear el cliente');
    expect(component.isLoading).toBe(false);
  });

  it('should prevent form submission when invalid', () => {
    spyOn(component, 'createClient');
    spyOn(component, 'updateClient');

    component.onSubmit();

    expect(component.createClient).not.toHaveBeenCalled();
    expect(component.updateClient).not.toHaveBeenCalled();
    expect(component.clienteForm.get('name')?.touched).toBe(true);
    expect(component.clienteForm.get('email')?.touched).toBe(true);
  });

  it('should navigate back when goBack is called', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes']);
  });

  it('should set loading state during form submission', () => {
    mockApiService.createClient.and.returnValue(of(mockClient));

    component.clienteForm.patchValue({
      name: 'Test User',
      email: 'test@example.com',
      phone: '5551234567',
      market: 'aguascalientes',
      flow: BusinessFlow.VentaPlazo
    });

    expect(component.isLoading).toBe(false);
    component.onSubmit();
    expect(component.isLoading).toBe(false); // Should be reset after success
  });

  it('should handle different business flows correctly', () => {
    const flows = [
      BusinessFlow.VentaPlazo,
      BusinessFlow.AhorroProgramado,
      BusinessFlow.CreditoColectivo,
      BusinessFlow.VentaDirecta
    ];

    flows.forEach(flow => {
      component.clienteForm.get('flow')?.setValue(flow);
      expect(component.clienteForm.get('flow')?.value).toBe(flow);
    });
  });

  it('should handle different markets correctly', () => {
    const markets = ['aguascalientes', 'edomex'];

    markets.forEach(market => {
      component.clienteForm.get('market')?.setValue(market);
      expect(component.clienteForm.get('market')?.value).toBe(market);
    });
  });

  it('should clean form when switching between markets', () => {
    // This test assumes there's market-specific logic
    component.onMarketChange('edomex');
    
    // Verify that market-specific validations or fields are updated
    expect(component.clienteForm.get('market')?.value).toBe('edomex');
  });
});

describe('ClienteFormComponent Integration Tests', () => {
  it('should render form with all required fields', async () => {
    const mockActivatedRoute = {
      params: of({ id: null }),
      snapshot: { params: { id: null } },
      data: of({})
    };

    const mockApiService = jasmine.createSpyObj('ApiService', ['createClient', 'updateClient', 'getClientById']);
    mockApiService.createClient.and.returnValue(of(mockClient));
    mockApiService.updateClient.and.returnValue(of(mockClient));
    mockApiService.getClientById.and.returnValue(of(mockClient));

    await render(ClienteFormComponent, {
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    expect(screen.getByText('Nuevo Cliente')).toBeTruthy();
    expect(screen.getByLabelText('Nombre Completo *')).toBeTruthy();
    expect(screen.getByLabelText('Correo Electrónico *')).toBeTruthy();
    expect(screen.getByLabelText('Teléfono *')).toBeTruthy();
    expect(screen.getByRole('button', { name: /crear cliente/i })).toBeTruthy();
  });

  it('should show validation errors when submitting empty form', async () => {
    const mockActivatedRoute = {
      params: of({ id: null }),
      snapshot: { params: { id: null } },
      data: of({})
    };

    const mockApiService = jasmine.createSpyObj('ApiService', ['createClient', 'updateClient', 'getClientById']);
    mockApiService.createClient.and.returnValue(of(mockClient));
    mockApiService.updateClient.and.returnValue(of(mockClient));
    mockApiService.getClientById.and.returnValue(of(mockClient));

    await render(ClienteFormComponent, {
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    const submitButton = screen.getByRole('button', { name: /crear cliente/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Nombre completo es requerido')).toBeTruthy();
      expect(screen.getByText('Correo es requerido')).toBeTruthy();
    });
  });

  it('should handle form input correctly', async () => {
    const mockActivatedRoute = {
      params: of({ id: null }),
      snapshot: { params: { id: null } },
      data: of({})
    };

    const user = userEvent.setup();

    await render(ClienteFormComponent, {
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
        { provide: ApiService, useValue: jasmine.createSpyObj('ApiService', ['createClient', 'updateClient', 'getClientById']) }
      ]
    });

    const nameInput = screen.getByLabelText('Nombre Completo *');
    const emailInput = screen.getByLabelText('Correo Electrónico *');
    const phoneInput = screen.getByLabelText('Teléfono *');

    await user.type(nameInput, 'Juan Pérez García');
    await user.type(emailInput, 'juan@example.com');
    await user.type(phoneInput, '5551234567');

    expect((nameInput as HTMLInputElement).value).toBe('Juan Pérez García');
    expect((emailInput as HTMLInputElement).value).toBe('juan@example.com');
    expect((phoneInput as HTMLInputElement).value).toBe('5551234567');
  });

  it('should submit form with valid data', async () => {
    const mockActivatedRoute = {
      params: of({ id: null }),
      snapshot: { params: { id: null } },
      data: of({})
    };

    const mockApiService = jasmine.createSpyObj('ApiService', ['createClient']);
    mockApiService.createClient.and.returnValue(of({
      id: '123',
      name: 'Juan Pérez García',
      email: 'juan@example.com',
      phone: '5551234567'
    }));

    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const user = userEvent.setup();

    await render(ClienteFormComponent, {
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    const nameInput = screen.getByLabelText('Nombre Completo *');
    const emailInput = screen.getByLabelText('Correo Electrónico *');
    const phoneInput = screen.getByLabelText('Teléfono *');
    const submitButton = screen.getByRole('button', { name: /crear cliente/i });

    await user.type(nameInput, 'Juan Pérez García');
    await user.type(emailInput, 'juan@example.com');
    await user.type(phoneInput, '5551234567');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockApiService.createClient).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes']);
    });
  });

  it('should handle back button click', async () => {
    const mockActivatedRoute = {
      params: of({ id: null }),
      snapshot: { params: { id: null } },
      data: of({})
    };

    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const user = userEvent.setup();

    await render(ClienteFormComponent, {
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
        { provide: ApiService, useValue: jasmine.createSpyObj('ApiService', ['createClient', 'updateClient', 'getClientById']) }
      ]
    });

    const backButton = screen.getByText('← Volver');
    await user.click(backButton);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes']);
  });
});

