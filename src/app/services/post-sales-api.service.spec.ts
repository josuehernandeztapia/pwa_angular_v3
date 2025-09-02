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
        vin: '3N1CN7AP8KL123456',
        deliveryDate: new Date('2024-02-01'),
        clientName: 'José Hernández Pérez',
        market: 'aguascalientes',
        vehicleModel: 'Nissan Urvan',
        clientContact: {
          phone: '+5244000000',
          email: 'jose.hernandez@email.com',
          preferredChannel: 'whatsapp'
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
        vin: 'invalid-vin',
        deliveryDate: new Date(),
        clientName: 'Test Client',
        market: 'aguascalientes',
        vehicleModel: 'Test Model',
        clientContact: {
          phone: '+5244000000',
          email: 'test@email.com',
          preferredChannel: 'sms'
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
      const mockRecord: PostSalesRecord = {
        id: 'ps-001',
        vin: mockVin,
        clientName: 'José Hernández Pérez',
        deliveryDate: new Date('2024-02-01'),
        vehicleModel: 'Nissan Urvan',
        status: 'active',
        nextServiceDate: new Date('2024-08-01'),
        totalRevenue: 0,
        servicesCompleted: 0,
        clientSatisfactionScore: null,
        preferredContactChannel: 'whatsapp',
        contactFrequency: 'monthly',
        specialNotes: null
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
      };

      const mockResponse = {
        success: true,
        serviceId: 'svc-001'
      };

      service.scheduleMaintenanceService(mockRequest).subscribe(response => {
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
      const mockContact = {
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

      service.recordClientContact(mockContact).subscribe(response => {
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