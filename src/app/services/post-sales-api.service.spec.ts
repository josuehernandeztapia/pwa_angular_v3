import { TestBed } from '@angular/core/testing';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { PostSalesApiService } from './post-sales-api.service';
import { VehicleDeliveredEvent, PostSalesRecord } from '../models/types';

describe('PostSalesApiService', () => {
  let service: PostSalesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PostSalesApiService]
    });
    service = TestBed.inject(PostSalesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendVehicleDeliveredEvent', () => {
    it('should send vehicle delivered event successfully', () => {
      const mockEvent: VehicleDeliveredEvent = {
        event: 'vehicle.delivered',
        timestamp: new Date('2024-02-01'),
        payload: {
          clientId: 'client-1',
          vehicle: {
            vin: '3N1CN7AP8KL123456',
            modelo: 'Nissan Urvan',
            numeroMotor: 'NM123',
            odometer_km_delivery: 10,
            placas: 'XYZ-123',
            estado: 'AGS'
          },
          contract: {
            id: 'contract-1',
            servicePackage: 'premium',
            warranty_start: new Date('2024-02-01'),
            warranty_end: new Date('2025-02-01')
          },
          contacts: {
            primary: { name: 'José Hernández Pérez', phone: '+5244000000', email: 'jose.hernandez@email.com' },
            whatsapp_optin: true
          },
          delivery: {
            odometroEntrega: 10,
            fechaEntrega: new Date('2024-02-01'),
            horaEntrega: '10:00',
            domicilioEntrega: 'Calle 1',
            fotosVehiculo: [],
            firmaDigitalCliente: 'url',
            checklistEntrega: [],
            incidencias: [],
            entregadoPor: 'advisor-1'
          },
          legalDocuments: { factura: { filename: 'f.pdf', url: '', uploadedAt: new Date(), size: 1, type: 'pdf' }, polizaSeguro: { filename: 'p.pdf', url: '', uploadedAt: new Date(), size: 1, type: 'pdf' }, contratos: [], fechaTransferencia: new Date(), proveedorSeguro: 'X', duracionPoliza: 12, titular: 'Client' },
          plates: { numeroPlacas: 'XYZ-123', estado: 'AGS', fechaAlta: new Date(), tarjetaCirculacion: { filename: 't.pdf', url: '', uploadedAt: new Date(), size: 1, type: 'pdf' }, fotografiasPlacas: [], hologramas: true }
        }
      };

      const mockResponse = {
        success: true,
        postSalesRecordId: 'ps-001',
        remindersCreated: 3
      };

      service.sendVehicleDeliveredEvent(mockEvent).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.postSalesRecordId).toBe('ps-001');
        expect(response.remindersCreated).toBe(3);
      });

      const req = httpMock.expectOne('/api/events/vehicle-delivered');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockEvent);
      req.flush(mockResponse);
    });

    it('should handle error when sending vehicle delivered event', () => {
      const mockEvent: VehicleDeliveredEvent = {
        event: 'vehicle.delivered',
        timestamp: new Date(),
        payload: {
          clientId: 'client-1',
          vehicle: {
            vin: 'invalid-vin',
            modelo: 'Test Model',
            numeroMotor: 'NM',
            odometer_km_delivery: 0,
            placas: 'AAA-000',
            estado: 'AGS'
          },
          contract: { id: 'c', servicePackage: 'basic', warranty_start: new Date(), warranty_end: new Date() },
          contacts: { primary: { name: 'Test Client', phone: '+52', email: 'test@email.com' }, whatsapp_optin: false },
          delivery: { odometroEntrega: 0, fechaEntrega: new Date(), horaEntrega: '10:00', domicilioEntrega: 'X', fotosVehiculo: [], firmaDigitalCliente: 'X', checklistEntrega: [], incidencias: [], entregadoPor: 'a' },
          legalDocuments: { factura: { filename: 'f', url: '', uploadedAt: new Date(), size: 1, type: 'pdf' }, polizaSeguro: { filename: 'p', url: '', uploadedAt: new Date(), size: 1, type: 'pdf' }, contratos: [], fechaTransferencia: new Date(), proveedorSeguro: 'X', duracionPoliza: 12, titular: 'X' },
          plates: { numeroPlacas: 'AAA-000', estado: 'AGS', fechaAlta: new Date(), tarjetaCirculacion: { filename: 't', url: '', uploadedAt: new Date(), size: 1, type: 'pdf' }, fotografiasPlacas: [], hologramas: false }
        }
      };

      service.sendVehicleDeliveredEvent(mockEvent).subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      });

      const req = httpMock.expectOne('/api/events/vehicle-delivered');
      req.error(new ProgressEvent('Network error'), {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });
  });

  describe('getPostSalesRecord', () => {
    it('should retrieve post-sales record by VIN', () => {
      const mockVin = '3N1CN7AP8KL123456';
      const mockRecord: any = {
        id: 'ps-001',
        vin: mockVin,
        clientId: 'client-1',
        postSalesAgent: 'agent-1',
        warrantyStatus: 'active',
        servicePackage: 'premium',
        nextMaintenanceDate: new Date('2024-08-01'),
        nextMaintenanceKm: 10000,
        odometroEntrega: 10,
        createdAt: new Date('2024-02-01'),
        warrantyStart: new Date('2024-02-01'),
        warrantyEnd: new Date('2025-02-01')
      };

      const mockResponse = {
        record: mockRecord,
        services: [],
        contacts: [],
        reminders: [],
        revenue: null
      };

      service.getPostSalesRecord(mockVin).subscribe(response => {
        expect(response).toBeTruthy();
        expect(response?.record.vin).toBe(mockVin);
        expect(response?.record.clientName).toBe('José Hernández Pérez');
      });

      const req = httpMock.expectOne(`/api/post-sales/${mockVin}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return null for non-existent VIN', () => {
      const mockVin = 'nonexistent-vin';

      service.getPostSalesRecord(mockVin).subscribe(response => {
        expect(response).toBeNull();
      });

      const req = httpMock.expectOne(`/api/post-sales/${mockVin}`);
      req.error(new ProgressEvent('Not Found'), {
        status: 404,
        statusText: 'Not Found'
      });
    });
  });

  describe('scheduleMaintenanceService', () => {
    it('should schedule maintenance service successfully', () => {
      const mockRequest = {
        vin: '3N1CN7AP8KL123456',
        serviceType: 'mantenimiento' as const,
        scheduledDate: new Date('2024-08-01'),
        servicePackage: 'premium' as const,
        notes: 'Regular maintenance'
      } as any;

      const mockResponse = {
        success: true,
        serviceId: 'svc-001'
      };

      (service as any).scheduleMaintenanceService(mockRequest).subscribe((response: any) => {
        expect(response.success).toBe(true);
        expect(response.serviceId).toBe('svc-001');
      });

      const req = httpMock.expectOne('/api/post-sales/schedule-service');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRequest);
      req.flush(mockResponse);
    });
  });

  describe('recordClientContact', () => {
    it('should record client contact successfully', () => {
      const mockContact: any = {
        vin: '3N1CN7AP8KL123456',
        contactDate: new Date('2024-02-01'),
        channel: 'whatsapp' as const,
        purpose: 'seguimiento' as const,
        notes: 'Follow-up call',
        contactedBy: 'advisor-001',
        clientResponse: 'positive',
        nextContactDate: new Date('2024-03-01')
      };

      const mockResponse = {
        success: true,
        contactId: 'contact-001'
      };

      (service as any).recordClientContact(mockContact).subscribe((response: any) => {
        expect(response.success).toBe(true);
        expect(response.contactId).toBe('contact-001');
      });

      const req = httpMock.expectOne('/api/post-sales/contact');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockContact);
      req.flush(mockResponse);
    });
  });
});