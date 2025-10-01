import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, Router, UrlSegment } from '@angular/router';
import { of } from 'rxjs';

export interface ComponentTestProviderMocks {
  activatedRoute: Partial<ActivatedRoute>;
  httpClient: jasmine.SpyObj<HttpClient>;
  router: jasmine.SpyObj<Router>;
}

export interface ComponentTestProvidersResult {
  providers: Array<{ provide: any; useValue: any }>;
  mocks: ComponentTestProviderMocks;
}

const buildActivatedRouteMock = (): Partial<ActivatedRoute> => {
  const emptyParamMap = convertToParamMap({});
  return {
    params: of({}),
    queryParams: of({}),
    fragment: of(null),
    data: of({}),
    url: of([] as UrlSegment[]),
    snapshot: {
      paramMap: emptyParamMap,
      queryParamMap: emptyParamMap,
      params: {},
      queryParams: {},
      data: {},
      url: [],
      fragment: null,
      outlet: 'primary',
      component: null,
      routeConfig: null,
      root: {} as any,
      parent: null,
      firstChild: null,
      children: [],
      pathFromRoot: [],
      title: undefined
    },
  };
};

const buildHttpClientMock = (): jasmine.SpyObj<HttpClient> =>
  jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post', 'put', 'delete', 'patch']);

const buildRouterMock = (): jasmine.SpyObj<Router> =>
  jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl', 'createUrlTree']);

export const buildComponentTestProviders = (
  overrides?: Partial<ComponentTestProviderMocks>
): ComponentTestProvidersResult => {
  const activatedRoute = overrides?.activatedRoute ?? buildActivatedRouteMock();
  const httpClient = overrides?.httpClient ?? buildHttpClientMock();
  const router = overrides?.router ?? buildRouterMock();

  return {
    providers: [
      { provide: ActivatedRoute, useValue: activatedRoute },
      { provide: HttpClient, useValue: httpClient },
      { provide: Router, useValue: router },
    ],
    mocks: {
      activatedRoute,
      httpClient,
      router,
    },
  };
};

