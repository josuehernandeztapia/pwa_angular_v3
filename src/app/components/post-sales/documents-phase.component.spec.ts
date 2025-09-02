import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { DocumentsPhaseComponent } from './documents-phase.component';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';
import { PostSalesApiService } from '../../services/post-sales-api.service';

describe('DocumentsPhaseComponent', () => {
  let component: DocumentsPhaseComponent;
  let fixture: ComponentFixture<DocumentsPhaseComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockImportTracker: jasmine.SpyObj<IntegratedImportTrackerService>;
  let mockPostSalesApi: jasmine.SpyObj<PostSalesApiService>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const importTrackerSpy = jasmine.createSpyObj('IntegratedImportTrackerService', 
      ['completeDocumentsPhase']);
    const postSalesApiSpy = jasmine.createSpyObj('PostSalesApiService', 
      ['getClientInfo']);

    await TestBed.configureTestingModule({
      imports: [DocumentsPhaseComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Router, useValue: routerSpy },
        { provide: IntegratedImportTrackerService, useValue: importTrackerSpy },
        { provide: PostSalesApiService, useValue: postSalesApiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentsPhaseComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockImportTracker = TestBed.inject(IntegratedImportTrackerService) as jasmine.SpyObj<IntegratedImportTrackerService>;
    mockPostSalesApi = TestBed.inject(PostSalesApiService) as jasmine.SpyObj<PostSalesApiService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.documentsForm).toBeTruthy();
    expect(component.documentsForm.get('fechaTransferencia')).toBeTruthy();
    expect(component.documentsForm.get('titular')).toBeTruthy();
    expect(component.documentsForm.get('proveedorSeguro')).toBeTruthy();
  });

  it('should validate required fields', () => {
    const form = component.documentsForm;
    expect(form.get('fechaTransferencia')?.hasError('required')).toBeFalsy(); // Has default value
    
    form.get('titular')?.setValue('');
    expect(form.get('titular')?.hasError('required')).toBeTruthy();
    
    form.get('proveedorSeguro')?.setValue('');
    expect(form.get('proveedorSeguro')?.hasError('required')).toBeTruthy();
  });

  it('should detect when required documents are uploaded', () => {
    // Initially no documents
    expect(component.hasRequiredDocuments()).toBeFalsy();
    
    // Add required documents
    component.uploadedDocuments.set({
      factura: {
        filename: 'factura.pdf',
        url: 'test-url',
        uploadedAt: new Date(),
        size: 1024,
        type: 'pdf'
      },
      polizaSeguro: {
        filename: 'poliza.pdf', 
        url: 'test-url',
        uploadedAt: new Date(),
        size: 1024,
        type: 'pdf'
      },
      contratos: [{
        filename: 'contrato.pdf',
        url: 'test-url', 
        uploadedAt: new Date(),
        size: 1024,
        type: 'pdf'
      }],
      endosos: []
    });
    
    expect(component.hasRequiredDocuments()).toBeTruthy();
  });

  it('should complete documents phase when form is valid', () => {
    // Setup valid form and documents
    component.documentsForm.patchValue({
      titular: 'José Hernández Pérez',
      proveedorSeguro: 'GNPAG',
      duracionPoliza: '24',
      facturaValida: true,
      polizaVigente: true,
      contratosFirmados: true,
      datosCorrectos: true
    });
    
    component.uploadedDocuments.set({
      factura: {
        filename: 'factura.pdf',
        url: 'test-url',
        uploadedAt: new Date(),
        size: 1024,
        type: 'pdf'
      },
      polizaSeguro: {
        filename: 'poliza.pdf',
        url: 'test-url', 
        uploadedAt: new Date(),
        size: 1024,
        type: 'pdf'
      },
      contratos: [{
        filename: 'contrato.pdf',
        url: 'test-url',
        uploadedAt: new Date(), 
        size: 1024,
        type: 'pdf'
      }],
      endosos: []
    });

    mockImportTracker.completeDocumentsPhase.and.returnValue(
      of({ success: true, message: 'Documents completed' })
    );

    component.onSubmit();

    expect(mockImportTracker.completeDocumentsPhase).toHaveBeenCalled();
  });

  it('should navigate to plates phase on success', () => {
    component.goToPlatesPhase();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/post-sales/plates', component.clientId()]);
  });

  it('should format file size correctly', () => {
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1048576)).toBe('1 MB');
    expect(component.formatFileSize(0)).toBe('0 Bytes');
  });

  it('should calculate validation errors correctly', () => {
    const form = component.documentsForm;
    form.get('titular')?.setValue('');
    form.get('proveedorSeguro')?.setValue('');
    
    const errors = component.validationErrors();
    expect(errors).toContain('Titular del vehículo');
    expect(errors).toContain('Proveedor de seguro');
    expect(errors).toContain('Factura original');
    expect(errors).toContain('Póliza de seguro');
  });

  it('should prevent submission when form is invalid', () => {
    spyOn(console, 'log');
    component.onSubmit();
    expect(console.log).toHaveBeenCalledWith('❌ Cannot complete documents - validation failed');
  });
});