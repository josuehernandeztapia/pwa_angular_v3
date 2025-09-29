import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Usuario, UsuarioDto, UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(UsuariosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list usuarios', () => {
    const mock: Usuario[] = [
      { id: '1', nombre: 'Ana', email: 'ana@test.com', rol: 'asesor', activo: true }
    ];

    service.list().subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].email).toBe('ana@test.com');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/usuarios`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('should create usuario', () => {
    const dto: UsuarioDto = { nombre: 'Luis', email: 'luis@test.com', rol: 'operaciones' };
    const response: Usuario = { id: '2', activo: true, ...dto } as Usuario;

    service.create(dto).subscribe(u => {
      expect(u.id).toBe('2');
      expect(u.rol).toBe('operaciones');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/usuarios`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(response);
  });

  it('should update usuario', () => {
    const dto: UsuarioDto = { nombre: 'Ana B', email: 'ana@test.com', rol: 'admin' };
    const response: Usuario = { id: '1', activo: true, ...dto } as Usuario;

    service.update('1', dto).subscribe(u => {
      expect(u.rol).toBe('admin');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/usuarios/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(response);
  });

  it('should toggle status', () => {
    const response: Usuario = { id: '1', nombre: 'Ana', email: 'ana@test.com', rol: 'asesor', activo: false };

    service.toggleStatus('1', false).subscribe(u => {
      expect(u.activo).toBeFalse();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/usuarios/1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: false });
    req.flush(response);
  });
});

