import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { TandaLabService } from './tanda-lab.service';

describe('TandaLabService', () => {
  let service: TandaLabService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [TandaLabService] });
    service = TestBed.inject(TandaLabService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('simulateEnhanced posts and returns result', () => {
    const body = { participants: 10, monthly: 1000, startMonth: 1 };
    const mock = { assignedMonth: 3, coverage: 0.9 };
    service.simulateEnhanced(body as any).subscribe(r => expect(r).toEqual(mock as any));
    const req = httpMock.expectOne(`${environment.api.labs}/tanda/enhanced`);
    expect(req.request.method).toBe('POST');
    req.flush(mock);
  });
});

