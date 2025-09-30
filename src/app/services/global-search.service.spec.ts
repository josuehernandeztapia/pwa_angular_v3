import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { GlobalSearchResult, GlobalSearchService } from './global-search.service';
import { HttpClientService } from './http-client.service';
import { MockApiService } from './mock-api.service';
import { ToastService } from './toast.service';
import { ClientDataService } from './data/client-data.service';
import { EcosystemDataService } from './data/ecosystem-data.service';
import { CollectiveGroupDataService } from './data/collective-group-data.service';

class HttpClientServiceStub {
  get() {
    return of({ success: true, data: {} });
  }
}

class ToastServiceStub {
  error = jasmine.createSpy('error');
  success = jasmine.createSpy('success');
  warning = jasmine.createSpy('warning');
  info = jasmine.createSpy('info');
}

describe('GlobalSearchService', () => {
  let service: GlobalSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        GlobalSearchService,
        MockApiService,
        ClientDataService,
        EcosystemDataService,
        CollectiveGroupDataService,
        { provide: HttpClientService, useClass: HttpClientServiceStub },
        { provide: ToastService, useClass: ToastServiceStub }
      ]
    });

    service = TestBed.inject(GlobalSearchService);
  });

  it('returns client results from mock search', fakeAsync(() => {
    let results: GlobalSearchResult[] = [];
    service.search('Juan').subscribe(r => (results = r));

    tick(600);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.type === 'client' && r.label.toLowerCase().includes('juan'))).toBeTrue();
  }));

  it('falls back to static suggestions when no dynamic results match', fakeAsync(() => {
    let results: GlobalSearchResult[] = [];
    service.search('AGS #1234').subscribe(r => (results = r));

    tick(600);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.id === 'quote-ags-1234')).toBeTrue();
  }));

  it('includes contract suggestions in fallback results', fakeAsync(() => {
    let results: GlobalSearchResult[] = [];
    service.search('Contrato').subscribe(r => (results = r));

    tick(600);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.type === 'contract')).toBeTrue();
  }));

  it('stores recents preserving uniqueness', () => {
    const first: GlobalSearchResult = {
      id: 'client-1',
      label: 'Juan Pérez',
      type: 'client',
      route: ['/clientes', '1']
    };

    const second: GlobalSearchResult = {
      id: 'client-1',
      label: 'Juan Pérez',
      type: 'client',
      route: ['/clientes', '1']
    };

    service.recordRecent(first);
    service.recordRecent(second);

    service.recent$.subscribe(recents => {
      expect(recents.length).toBe(1);
      expect(recents[0].id).toBe('client-1');
    }).unsubscribe();
  });
});
