import { TestBed } from '@angular/core/testing';
import { take, skip } from 'rxjs/operators';
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
      service.isConnected$.pipe(take(1)).subscribe(connected => {
        expect(connected).toBe(true);
        done();
      });
    });
  });

  describe('Connection Monitoring', () => {
    it('should detect online status change', (done) => {
      // Observe next emission and expect true
      service.isConnected$.pipe(skip(1), take(1)).subscribe(val => {
        expect(val).toBe(true);
        expect(mockToastService.success).toHaveBeenCalledWith('Conexión restaurada');
        done();
      });
      // Trigger online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
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

      const err1 = httpMock.expectOne('http://localhost:3000/api/invalid');
      err1.flush({ message: 'Solicitud inválida' }, { status: 400, statusText: 'Bad Request' });
      const err2 = httpMock.expectOne('http://localhost:3000/api/invalid');
      err2.flush({ message: 'Solicitud inválida' }, { status: 400, statusText: 'Bad Request' });
      const err3 = httpMock.expectOne('http://localhost:3000/api/invalid');
      err3.flush({ message: 'Solicitud inválida' }, { status: 400, statusText: 'Bad Request' });
      const err4 = httpMock.expectOne('http://localhost:3000/api/invalid');
      err4.flush({ message: 'Solicitud inválida' }, { status: 400, statusText: 'Bad Request' });

      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should handle 401 Unauthorized and logout user', () => {
      service.get('protected').subscribe({
        error: () => {}
      });

      const r1 = httpMock.expectOne('http://localhost:3000/api/protected');
      r1.flush({}, { status: 401, statusText: 'Unauthorized' });
      const r2 = httpMock.expectOne('http://localhost:3000/api/protected');
      r2.flush({}, { status: 401, statusText: 'Unauthorized' });
      const r3 = httpMock.expectOne('http://localhost:3000/api/protected');
      r3.flush({}, { status: 401, statusText: 'Unauthorized' });
      const r4 = httpMock.expectOne('http://localhost:3000/api/protected');
      r4.flush({}, { status: 401, statusText: 'Unauthorized' });

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

      const n1 = httpMock.expectOne('http://localhost:3000/api/nonexistent');
      n1.flush({}, { status: 404, statusText: 'Not Found' });
      const n2 = httpMock.expectOne('http://localhost:3000/api/nonexistent');
      n2.flush({}, { status: 404, statusText: 'Not Found' });
      const n3 = httpMock.expectOne('http://localhost:3000/api/nonexistent');
      n3.flush({}, { status: 404, statusText: 'Not Found' });
      const n4 = httpMock.expectOne('http://localhost:3000/api/nonexistent');
      n4.flush({}, { status: 404, statusText: 'Not Found' });
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

      const v1 = httpMock.expectOne('http://localhost:3000/api/users');
      v1.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });
      const v2 = httpMock.expectOne('http://localhost:3000/api/users');
      v2.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('should handle 500 Internal Server Error', () => {
      service.get('server-error').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(500);
          expect(error.message).toBe('Error interno del servidor');
        }
      });

      const s1 = httpMock.expectOne('http://localhost:3000/api/server-error');
      s1.flush({}, { status: 500, statusText: 'Server Error' });
      const s2 = httpMock.expectOne('http://localhost:3000/api/server-error');
      s2.flush({}, { status: 500, statusText: 'Server Error' });
      const s3 = httpMock.expectOne('http://localhost:3000/api/server-error');
      s3.flush({}, { status: 500, statusText: 'Server Error' });
      const s4 = httpMock.expectOne('http://localhost:3000/api/server-error');
      s4.flush({}, { status: 500, statusText: 'Server Error' });
    });

    it('should handle network connectivity issues', (done) => {
      // Observe the next transition to false
      service.isConnected$.pipe(skip(1), take(1)).subscribe(connected => {
        expect(connected).toBe(false);
        done();
      });

      service.get('test').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(0);
          expect(error.message).toBe('No se puede conectar al servidor');
        }
      });

      const nerr1 = httpMock.expectOne('http://localhost:3000/api/test');
      nerr1.error(new ErrorEvent('Network Error'), { status: 0, statusText: 'Unknown Error' });
      const nerr2 = httpMock.expectOne('http://localhost:3000/api/test');
      nerr2.error(new ErrorEvent('Network Error'), { status: 0, statusText: 'Unknown Error' });
      const nerr3 = httpMock.expectOne('http://localhost:3000/api/test');
      nerr3.error(new ErrorEvent('Network Error'), { status: 0, statusText: 'Unknown Error' });
      const nerr4 = httpMock.expectOne('http://localhost:3000/api/test');
      nerr4.error(new ErrorEvent('Network Error'), { status: 0, statusText: 'Unknown Error' });
    });

    it('should not show error toast when showError is false', () => {
      service.get('test', { showError: false }).subscribe({
        error: () => {}
      });

      const ne1 = httpMock.expectOne('http://localhost:3000/api/test');
      ne1.error(new ErrorEvent('Error'), { status: 500, statusText: 'Server Error' });
      const ne2 = httpMock.expectOne('http://localhost:3000/api/test');
      ne2.error(new ErrorEvent('Error'), { status: 500, statusText: 'Server Error' });
      const ne3 = httpMock.expectOne('http://localhost:3000/api/test');
      ne3.error(new ErrorEvent('Error'), { status: 500, statusText: 'Server Error' });
      const ne4 = httpMock.expectOne('http://localhost:3000/api/test');
      ne4.error(new ErrorEvent('Error'), { status: 500, statusText: 'Server Error' });

      expect(mockToastService.error).not.toHaveBeenCalled();
    });

    it('should handle client-side errors', () => {
      service.get('test').subscribe({
        error: (error: ApiError) => {
          expect(error.message).toContain('Client error message');
        }
      });

      const c1 = httpMock.expectOne('http://localhost:3000/api/test');
      const clientError = new ErrorEvent('Client Error', { message: 'Client error message' });
      c1.error(clientError, { status: 0, statusText: 'Client Error' });
      const c2 = httpMock.expectOne('http://localhost:3000/api/test');
      c2.error(clientError, { status: 0, statusText: 'Client Error' });
      const c3 = httpMock.expectOne('http://localhost:3000/api/test');
      c3.error(clientError, { status: 0, statusText: 'Client Error' });
      const c4 = httpMock.expectOne('http://localhost:3000/api/test');
      c4.error(clientError, { status: 0, statusText: 'Client Error' });
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

      const h1 = httpMock.expectOne('http://localhost:3000/api/health');
      h1.error(new ErrorEvent('Health check failed'), { status: 0, statusText: 'Unknown Error' });
      const h2 = httpMock.expectOne('http://localhost:3000/api/health');
      h2.error(new ErrorEvent('Health check failed'), { status: 0, statusText: 'Unknown Error' });
      const h3 = httpMock.expectOne('http://localhost:3000/api/health');
      h3.error(new ErrorEvent('Health check failed'), { status: 0, statusText: 'Unknown Error' });
      const h4 = httpMock.expectOne('http://localhost:3000/api/health');
      h4.error(new ErrorEvent('Health check failed'), { status: 0, statusText: 'Unknown Error' });

      // Should update connection status
      service.isConnected$.pipe(skip(1), take(1)).subscribe(connected => {
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