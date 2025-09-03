import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { HttpClientService, ApiResponse, ApiError } from './http-client.service';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { ToastService } from './toast.service';

describe('HttpClientService', () => {
  let service: HttpClientService;
  let httpMock: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockLoadingService: jasmine.SpyObj<LoadingService>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);
    mockLoadingService = jasmine.createSpyObj('LoadingService', ['setLoading']);
    mockToastService = jasmine.createSpyObj('ToastService', ['success', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HttpClientService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: LoadingService, useValue: mockLoadingService },
        { provide: ToastService, useValue: mockToastService }
      ]
    });

    service = TestBed.inject(HttpClientService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with connection status', (done) => {
      service.isConnected$.subscribe(connected => {
        expect(connected).toBe(true);
        done();
      });
    });
  });

  describe('Connection Monitoring', () => {
    it('should detect online status change', () => {
      // Trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      expect(mockToastService.success).toHaveBeenCalledWith('Conexión restaurada');
    });

    it('should detect offline status change', () => {
      // Trigger offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      expect(mockToastService.error).toHaveBeenCalledWith('Sin conexión a internet');
    });

    it('should provide current connection status', () => {
      const isConnected = service.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('GET Requests', () => {
    const mockResponse: ApiResponse<{ id: number }> = {
      success: true,
      data: { id: 123 },
      message: 'Success'
    };

    it('should perform GET request with default options', () => {
      service.get<{ id: number }>('users/123').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/users/123');
      expect(req.request.method).toBe('GET');
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(true, 'GET users/123');

      req.flush(mockResponse);
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(false, 'GET users/123');
    });

    it('should handle GET request with custom parameters', () => {
      service.get('users', {
        params: { page: '1', limit: '10' },
        showLoading: false
      }).subscribe();

      const req = httpMock.expectOne(req => {
        return req.url.includes('users') && req.params.get('page') === '1' && req.params.get('limit') === '10';
      });
      expect(req.request.method).toBe('GET');
      expect(mockLoadingService.setLoading).not.toHaveBeenCalled();

      req.flush({ success: true });
    });

    it('should add authentication headers', () => {
      localStorage.setItem('auth_token', 'test_token');

      service.get('protected-resource').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/protected-resource');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test_token');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({ success: true });
    });

    it('should retry failed GET requests', () => {
      let requestCount = 0;

      service.get('failing-endpoint').subscribe({
        error: () => {} // Handle error to prevent test failure
      });

      // First request fails
      const req1 = httpMock.expectOne('http://localhost:3000/api/failing-endpoint');
      req1.error(new ErrorEvent('Network error'));

      // Should retry automatically
      const req2 = httpMock.expectOne('http://localhost:3000/api/failing-endpoint');
      req2.error(new ErrorEvent('Network error'));

      // Should retry again
      const req3 = httpMock.expectOne('http://localhost:3000/api/failing-endpoint');
      req3.error(new ErrorEvent('Network error'));

      // Should retry one more time (total 4 attempts including original)
      const req4 = httpMock.expectOne('http://localhost:3000/api/failing-endpoint');
      req4.error(new ErrorEvent('Network error'));
    });
  });

  describe('POST Requests', () => {
    const postData = { name: 'Test User', email: 'test@example.com' };
    const mockResponse: ApiResponse<{ id: number }> = {
      success: true,
      data: { id: 456 },
      message: 'User created'
    };

    it('should perform POST request with data', () => {
      service.post('users', postData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(postData);
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(true, 'POST users');

      req.flush(mockResponse);
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(false, 'POST users');
    });

    it('should show success message for POST requests', () => {
      service.post('users', postData, { 
        successMessage: 'Usuario creado exitosamente' 
      }).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      req.flush(mockResponse);

      expect(mockToastService.success).toHaveBeenCalledWith('Usuario creado exitosamente');
    });

    it('should retry POST requests once', () => {
      service.post('users', postData).subscribe({
        error: () => {} // Handle error to prevent test failure
      });

      // First request fails
      const req1 = httpMock.expectOne('http://localhost:3000/api/users');
      req1.error(new ErrorEvent('Network error'));

      // Should retry once
      const req2 = httpMock.expectOne('http://localhost:3000/api/users');
      req2.error(new ErrorEvent('Network error'));

      // No more retries for POST
      httpMock.verify();
    });
  });

  describe('PUT Requests', () => {
    const putData = { id: 123, name: 'Updated User' };

    it('should perform PUT request', () => {
      service.put('users/123', putData, {
        successMessage: 'Usuario actualizado'
      }).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users/123');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(putData);

      req.flush({ success: true, data: putData });
      expect(mockToastService.success).toHaveBeenCalledWith('Usuario actualizado');
    });
  });

  describe('DELETE Requests', () => {
    it('should perform DELETE request', () => {
      service.delete('users/123', {
        successMessage: 'Usuario eliminado'
      }).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users/123');
      expect(req.request.method).toBe('DELETE');

      req.flush({ success: true });
      expect(mockToastService.success).toHaveBeenCalledWith('Usuario eliminado');
    });
  });

  describe('File Upload', () => {
    it('should upload file with FormData', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const additionalData = { description: 'Test file' };

      service.uploadFile('upload', file, additionalData).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/upload');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);

      req.flush({ success: true, message: 'File uploaded' });
      expect(mockToastService.success).toHaveBeenCalledWith('Archivo subido exitosamente');
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(false, 'Uploading file');
    });

    it('should upload file without additional data', () => {
      const file = new File(['test'], 'test.txt');

      service.uploadFile('upload', file).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/upload');
      expect(req.request.body instanceof FormData).toBe(true);

      req.flush({ success: true });
    });
  });

  describe('URL Building', () => {
    it('should build correct URLs', () => {
      service.get('users').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      expect(req.request.url).toBe('http://localhost:3000/api/users');

      req.flush({ success: true });
    });

    it('should handle URLs with leading slash', () => {
      service.get('/users').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      expect(req.request.url).toBe('http://localhost:3000/api/users');

      req.flush({ success: true });
    });

    it('should handle nested endpoints', () => {
      service.get('users/123/posts').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users/123/posts');
      req.flush({ success: true });
    });
  });

  describe('Header Management', () => {
    it('should merge custom headers with default headers', () => {
      localStorage.setItem('auth_token', 'test_token');
      const customHeaders = new HttpHeaders({ 'Custom-Header': 'custom-value' });

      service.get('test', { headers: customHeaders }).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/test');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test_token');
      expect(req.request.headers.get('Custom-Header')).toBe('custom-value');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({ success: true });
    });

    it('should work without authentication token', () => {
      service.get('public').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/public');
      expect(req.request.headers.get('Authorization')).toBeNull();
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({ success: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request error', () => {
      service.get('invalid').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(400);
          expect(error.message).toContain('Solicitud inválida');
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/invalid');
      req.error(new ErrorEvent('Bad Request'));

      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should handle 401 Unauthorized and logout user', () => {
      service.get('protected').subscribe({
        error: () => {}
      });

      const req = httpMock.expectOne('http://localhost:3000/api/protected');
      req.error(new ErrorEvent('Unauthorized'));

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockToastService.error).toHaveBeenCalledWith('No autorizado. Por favor, inicia sesión nuevamente');
    });

    it('should handle 404 Not Found error', () => {
      service.get('nonexistent').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
          expect(error.message).toBe('Recurso no encontrado');
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/nonexistent');
      req.error(new ErrorEvent('Not Found'));
    });

    it('should handle 422 Validation Error with detailed messages', () => {
      const errorResponse = {
        message: 'Validation failed',
        errors: {
          email: ['Email is required', 'Email must be valid'],
          name: ['Name is required']
        }
      };

      service.post('users', {}).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
          expect(error.message).toContain('Email is required');
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      req.error(new ErrorEvent('Validation Error'));
    });

    it('should handle 500 Internal Server Error', () => {
      service.get('server-error').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(500);
          expect(error.message).toBe('Error interno del servidor');
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/server-error');
      req.error(new ErrorEvent('Server Error'));
    });

    it('should handle network connectivity issues', () => {
      service.get('test').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(0);
          expect(error.message).toBe('No se puede conectar al servidor');
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/test');
      req.error(new ErrorEvent('Network Error'));

      // Should update connection status
      service.isConnected$.subscribe(connected => {
        expect(connected).toBe(false);
      });
    });

    it('should not show error toast when showError is false', () => {
      service.get('test', { showError: false }).subscribe({
        error: () => {}
      });

      const req = httpMock.expectOne('http://localhost:3000/api/test');
      req.error(new ErrorEvent('Error'), { status: 500, statusText: 'Server Error' });

      expect(mockToastService.error).not.toHaveBeenCalled();
    });

    it('should handle client-side errors', () => {
      service.get('test').subscribe({
        error: (error: ApiError) => {
          expect(error.message).toContain('Client error message');
        }
      });

      const req = httpMock.expectOne('http://localhost:3000/api/test');
      const clientError = new ErrorEvent('Client Error', { message: 'Client error message' });
      req.error(clientError, { status: 0, statusText: '' });
    });
  });

  describe('API Health Check', () => {
    it('should check API health successfully', () => {
      service.checkApiHealth().subscribe(isHealthy => {
        expect(isHealthy).toBe(true);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/health');
      expect(req.request.method).toBe('GET');
      
      req.flush({ success: true, data: { status: 'ok' } });
      
      // Should not show loading or error for health checks
      expect(mockLoadingService.setLoading).not.toHaveBeenCalled();
    });

    it('should handle unhealthy API response', () => {
      service.checkApiHealth().subscribe(isHealthy => {
        expect(isHealthy).toBe(false);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/health');
      req.flush({ success: false, data: { status: 'error' } });
    });

    it('should handle API health check failure', () => {
      service.checkApiHealth().subscribe(isHealthy => {
        expect(isHealthy).toBe(false);
      });

      const req = httpMock.expectOne('http://localhost:3000/api/health');
      req.error(new ErrorEvent('Health check failed'));

      // Should update connection status
      service.isConnected$.subscribe(connected => {
        expect(connected).toBe(false);
      });
    });
  });

  describe('Loading State Management', () => {
    it('should manage loading state for multiple requests', () => {
      // Start multiple requests
      service.get('users').subscribe();
      service.post('posts', { title: 'Test' }).subscribe();

      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(true, 'GET users');
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(true, 'POST posts');

      // Complete requests
      const req1 = httpMock.expectOne('http://localhost:3000/api/users');
      const req2 = httpMock.expectOne('http://localhost:3000/api/posts');

      req1.flush({ success: true });
      req2.flush({ success: true });

      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(false, 'GET users');
      expect(mockLoadingService.setLoading).toHaveBeenCalledWith(false, 'POST posts');
    });

    it('should not show loading when disabled', () => {
      service.get('users', { showLoading: false }).subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      req.flush({ success: true });

      expect(mockLoadingService.setLoading).not.toHaveBeenCalled();
    });
  });

  describe('Success Handling', () => {
    it('should log successful responses with messages', () => {
      spyOn(console, 'log');

      service.get('users').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      req.flush({ success: true, message: 'Users retrieved successfully' });

      expect(console.log).toHaveBeenCalledWith('API Success:', 'Users retrieved successfully');
    });

    it('should not log successful responses without messages', () => {
      spyOn(console, 'log');

      service.get('users').subscribe();

      const req = httpMock.expectOne('http://localhost:3000/api/users');
      req.flush({ success: true });

      expect(console.log).not.toHaveBeenCalled();
    });
  });
});