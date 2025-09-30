import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { UpdatePasswordDto, UpdateUserProfileDto, UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserProfileService]
    });
    service = TestBed.inject(UserProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('me() should GET current user', () => {
    const mock = { id: 'u1', email: 'a@b.com', name: 'Test User', role: 'asesor' as const };
    service.me().subscribe(resp => {
      expect(resp).toEqual(mock);
    });
    const req = httpMock.expectOne(`${environment.api.users}/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('update() should PUT and return updated user', () => {
    const body: UpdateUserProfileDto = { name: 'New Name' };
    const mock = { id: 'u1', email: 'a@b.com', name: 'New Name', role: 'asesor' as const };
    service.update(body).subscribe(resp => {
      expect(resp.name).toBe('New Name');
    });
    const req = httpMock.expectOne(`${environment.api.users}/me`);
    expect(req.request.method).toBe('PUT');
    req.flush(mock);
  });

  it('updatePassword() should PATCH and return void', () => {
    const body: UpdatePasswordDto = { currentPassword: 'x', newPassword: 'y' };
    service.updatePassword(body).subscribe(resp => {
      expect(resp).toBeNull();
    });
    const req = httpMock.expectOne(`${environment.api.users}/me/password`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });
});

