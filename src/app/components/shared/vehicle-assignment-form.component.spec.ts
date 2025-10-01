import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { VehicleAssignmentFormComponent } from './vehicle-assignment-form.component';
import { buildComponentTestProviders } from '../../../test-helpers/component-test-providers';
import { VehicleAssignmentService } from '../../services/vehicle-assignment.service';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';

describe('VehicleAssignmentFormComponent', () => {
  let component: VehicleAssignmentFormComponent;
  let fixture: ComponentFixture<VehicleAssignmentFormComponent>;
  let mockVehicleService: jasmine.SpyObj<VehicleAssignmentService>;
  let mockImportTracker: jasmine.SpyObj<IntegratedImportTrackerService>;

  beforeEach(async () => {
    const vehicleServiceSpy = jasmine.createSpyObj('VehicleAssignmentService', 
      ['assignVehicleToClient', 'validateVIN']);
    const importTrackerSpy = jasmine.createSpyObj('IntegratedImportTrackerService', 
      ['updateVehicleAssignment']);
    const providerSetup = buildComponentTestProviders();

    await TestBed.configureTestingModule({
      imports: [VehicleAssignmentFormComponent, ReactiveFormsModule],
      providers: [
        ...providerSetup.providers,
        FormBuilder,
        { provide: VehicleAssignmentService, useValue: vehicleServiceSpy },
        { provide: IntegratedImportTrackerService, useValue: importTrackerSpy }
      ]
    }).compileComponents();

    mockVehicleService = TestBed.inject(VehicleAssignmentService) as jasmine.SpyObj<VehicleAssignmentService>;
    mockImportTracker = TestBed.inject(IntegratedImportTrackerService) as jasmine.SpyObj<IntegratedImportTrackerService>;

    fixture = TestBed.createComponent(VehicleAssignmentFormComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.clientId.set('client-001');
    component.clientName.set('José Hernández Pérez');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with validators', () => {
    expect(component.assignmentForm).toBeTruthy();
    
    // Test required validators
    const vinControl = component.assignmentForm.get('vin');
    expect(vinControl?.hasError('required')).toBeTruthy();
    
    vinControl?.setValue('invalid');
    expect(vinControl?.hasError('minlength')).toBeTruthy();
    
    vinControl?.setValue('1234567890123456@'); // 17 chars but invalid format
    expect(vinControl?.hasError('pattern')).toBeTruthy();
    
    vinControl?.setValue('3N1CN7AP8KL123456');
    expect(vinControl?.valid).toBeTruthy();
  });

  it('should validate VIN format correctly', () => {
    const form = component.assignmentForm;
    
    // Test invalid VINs
    form.get('vin')?.setValue('123'); // Too short
    expect(form.get('vin')?.hasError('minlength')).toBeTruthy();
    
    form.get('vin')?.setValue('IOQUV123456789012'); // Contains invalid characters
    expect(form.get('vin')?.hasError('pattern')).toBeTruthy();
    
    // Test valid VIN
    form.get('vin')?.setValue('3N1CN7AP8KL123456');
    expect(form.get('vin')?.valid).toBeTruthy();
  });

  it('should show field errors correctly', () => {
    const form = component.assignmentForm;
    
    // Mark field as touched to trigger validation
    form.get('vin')?.markAsTouched();
    form.get('vin')?.setValue('');
    
    expect(component.isFieldInvalid('vin')).toBeTruthy();
    expect(component.getFieldError('vin')).toBe('VIN es requerido');
    
    form.get('vin')?.setValue('123');
    expect(component.getFieldError('vin')).toBe('VIN debe tener exactamente 17 caracteres');
  });

  it('should submit valid form successfully', () => {
    // Setup valid form data
    component.assignmentForm.patchValue({
      vin: '3N1CN7AP8KL123456',
      serie: 'ABC123',
      modelo: 'Nissan Urvan',
      year: 2024,
      numeroMotor: 'MOT123456',
      transmission: 'Manual',
      productionBatch: 'BATCH-001',
      factoryLocation: 'Aguascalientes',
      notes: 'Test vehicle'
    });

    const mockResponse = {
      success: true,
      assignmentId: 'assign-001',
      message: 'Vehicle assigned successfully'
    };

    mockVehicleService.assignVehicleToClient.and.returnValue(of(mockResponse));
    mockImportTracker.updateVehicleAssignment.and.returnValue(of({ success: true }));

    spyOn(component.assignmentCompleted, 'emit');

    component.onSubmit();

    expect(mockVehicleService.assignVehicleToClient).toHaveBeenCalled();
    expect(component.assignmentCompleted.emit).toHaveBeenCalledWith({
      success: true,
      vehicleData: jasmine.any(Object)
    });
  });

  it('should handle assignment errors', () => {
    // Setup valid form
    component.assignmentForm.patchValue({
      vin: '3N1CN7AP8KL123456',
      serie: 'ABC123',
      modelo: 'Nissan Urvan',
      year: 2024,
      numeroMotor: 'MOT123456'
    });

    const mockError = {
      success: false,
      error: 'VIN already assigned'
    };

    mockVehicleService.assignVehicleToClient.and.returnValue(of(mockError));
    mockImportTracker.updateVehicleAssignment.and.returnValue(of({ success: true }));

    spyOn(component.assignmentCompleted, 'emit');
    spyOn(window, 'alert');

    component.onSubmit();

    expect(window.alert).toHaveBeenCalledWith('Error: VIN already assigned');
    expect(component.assignmentCompleted.emit).not.toHaveBeenCalled();
  });

  it('should prevent submission with invalid form', () => {
    spyOn(console, 'log');
    
    // Form is invalid by default (empty required fields)
    component.onSubmit();
    
    expect(console.log).toHaveBeenCalledWith('Form is invalid, cannot submit');
    expect(mockVehicleService.assignVehicleToClient).not.toHaveBeenCalled();
  });

  it('should handle network errors gracefully', () => {
    // Setup valid form
    component.assignmentForm.patchValue({
      vin: '3N1CN7AP8KL123456',
      serie: 'ABC123',
      modelo: 'Nissan Urvan',
      year: 2024,
      numeroMotor: 'MOT123456'
    });

    mockVehicleService.assignVehicleToClient.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    mockImportTracker.updateVehicleAssignment.and.returnValue(of({ success: true }));

    spyOn(window, 'alert');

    component.onSubmit();

    expect(window.alert).toHaveBeenCalledWith(
      'Error de conexión al asignar vehículo. Verifica tu conexión a internet.'
    );
  });

  it('should emit cancellation when cancel is called', () => {
    spyOn(component.assignmentCancelled, 'emit');
    
    component.onCancel();
    
    expect(component.assignmentCancelled.emit).toHaveBeenCalled();
  });

  it('should update year options based on current year', () => {
    const currentYear = new Date().getFullYear();
    const yearOptions = component.getYearOptions();
    
    expect(yearOptions).toContain(currentYear);
    expect(yearOptions).toContain(currentYear + 1); // Next year
    expect(yearOptions.length).toBeGreaterThan(5); // Multiple year options
  });
});
