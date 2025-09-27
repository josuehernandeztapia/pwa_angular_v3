import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { FlowDraft, FlowsService } from './flows.service';

describe('FlowsService', () => {
  let service: FlowsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [FlowsService] });
    service = TestBed.inject(FlowsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() should GET flows', () => {
    const mock: FlowDraft[] = [];
    service.list().subscribe(resp => expect(resp).toEqual(mock));
    const req = httpMock.expectOne(`${environment.api.flows}`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('update() should include If-Match when provided', () => {
    const draft: Partial<FlowDraft> = { name: 'x' };
    service.update('id1', draft, 'etag123').subscribe();
    const req = httpMock.expectOne(`${environment.api.flows}/id1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('If-Match')).toBe('etag123');
    req.flush({ id: 'id1', name: 'x', version: 1, nodes: [], edges: [], status: 'draft' });
  });
});

