import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { MarketPolicyService, MarketPolicyContext, RemoteMarketPolicyConfig } from './market-policy.service';
import { ConfigurationService } from './configuration.service';
import { DocumentStatus } from '../models/types';
import { HttpClientService } from './http-client.service';

describe('MarketPolicyService', () => {
  class ConfigurationServiceStub {
    value: any = {};
    lastNamespace?: string;

    loadNamespace<T>(namespace: string, defaultValue: T) {
      this.lastNamespace = namespace;
      return of((Object.keys(this.value).length ? this.value : defaultValue) as T);
    }
  }

  class HttpClientServiceStub {
    put = jasmine.createSpy('put').and.returnValue(of({ success: true }));
  }

  function createServiceWithRemoteConfig(remoteConfig: RemoteMarketPolicyConfig = {}, withHttp = false) {
    TestBed.configureTestingModule({
      providers: [
        MarketPolicyService,
        { provide: ConfigurationService, useClass: ConfigurationServiceStub },
        { provide: HttpClientService, useClass: HttpClientServiceStub }
      ]
    });

    const config = TestBed.inject(ConfigurationService) as unknown as ConfigurationServiceStub;
    config.value = remoteConfig;
    const service = TestBed.inject(MarketPolicyService);
    const http = withHttp ? (TestBed.inject(HttpClientService) as unknown as HttpClientServiceStub) : undefined;
    return { service, config, http };
  }

  it('registers policies provided by remote configuration', async () => {
    const remoteConfig = {
      ags: {
        documents: [
          { id: 'doc-remoto', label: 'Documento Remoto' }
        ],
        metadata: {
          ocrThreshold: 0.9
        }
      }
    };

    const { service, config } = createServiceWithRemoteConfig(remoteConfig);
    await service.reloadRemotePolicies();

    expect(config.lastNamespace).toBe('markets/market-policies');

    const context: MarketPolicyContext = {
      market: 'aguascalientes',
      clientType: 'individual',
      saleType: 'financiero',
      businessFlow: undefined
    };

    const policy = service.getPolicyDocuments(context);
    expect(policy.documents[0].id).toBe('doc-remoto');
    expect(policy.metadata.ocrThreshold).toBe(0.9);

    const docs = service.toDocuments(policy);
    expect(docs[0].status).toBe(DocumentStatus.Pendiente);
  });

  it('falls back to built-in policies when configuration service is absent', () => {
    const service = new MarketPolicyService(undefined);

    const context: MarketPolicyContext = {
      market: 'edomex',
      clientType: 'colectivo',
      saleType: 'financiero'
    };

    const policy = service.getPolicyDocuments(context);
    expect(policy.documents.length).toBeGreaterThan(0);
  });

  it('maps unknown remote keys to default market and preserves snapshot', async () => {
    const remoteConfig: RemoteMarketPolicyConfig = {
      'custom-market': {
        documents: [{ id: 'doc-x', label: 'Doc X', optional: true }],
        metadata: { ocrThreshold: 0.7 }
      }
    };

    const { service } = createServiceWithRemoteConfig(remoteConfig);
    await service.reloadRemotePolicies();
    const fallbackContext: MarketPolicyContext = {
      market: 'otros',
      clientType: 'individual',
      saleType: 'contado'
    };

    const policy = service.getPolicyDocuments(fallbackContext);
    expect(policy.metadata.ocrThreshold).toBe(0.7);
    expect(policy.documents[0].id).toBe('doc-x');

    const snapshot = service.getRemoteConfigSnapshot();
    expect(snapshot).toEqual(remoteConfig);
  });

  it('persists remote policies via HttpClientService and updates in-memory cache', async () => {
    const remoteConfig: RemoteMarketPolicyConfig = {
      ags: {
        documents: [{ id: 'doc-initial', label: 'Documento Inicial' }],
        metadata: { ocrThreshold: 0.85 }
      }
    };

    const { service, http } = createServiceWithRemoteConfig(remoteConfig, true);
    await service.reloadRemotePolicies();
    const updatedConfig: RemoteMarketPolicyConfig = {
      ags: {
        documents: [{ id: 'doc-updated', label: 'Documento Actualizado' }],
        metadata: { ocrThreshold: 0.91 }
      }
    };

    await firstValueFrom(service.savePoliciesToRemote(updatedConfig));

    expect(http!.put).toHaveBeenCalledWith('config/market-policies', updatedConfig, jasmine.objectContaining({ successMessage: 'Políticas guardadas' }));
    const snapshot = service.getRemoteConfigSnapshot();
    expect(snapshot).toEqual(updatedConfig);
    const updatedAt = service.getRemoteConfigUpdatedAt();
    expect(typeof updatedAt).toBe('number');

    const context: MarketPolicyContext = {
      market: 'aguascalientes',
      clientType: 'individual',
      saleType: 'financiero'
    };

    const policy = service.getPolicyDocuments(context);
    expect(policy.documents[0].id).toBe('doc-updated');
    expect(policy.metadata.ocrThreshold).toBe(0.91);
  });
});
