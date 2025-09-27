import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { PostventaService } from './postventa.service';

describe('PostventaService', () => {
  let service: PostventaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [PostventaService] });
    service = TestBed.inject(PostventaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getOrCreateDraftQuote should POST draft', () => {
    const mock = { id: 'q1', lines: [] };
    service.getOrCreateDraftQuote('cust1').subscribe(r => expect(r).toEqual(mock as any));
    const req = httpMock.expectOne(`${environment.api.quotes}/draft`);
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });
});

