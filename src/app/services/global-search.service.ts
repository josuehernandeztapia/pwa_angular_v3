import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { BusinessFlow, Client } from '../models/types';
import { HttpClientService } from './http-client.service';
import { MockApiService } from './mock-api.service';
import { ToastService } from './toast.service';
import { AnalyticsService } from './analytics.service';
import { ContractContextSnapshot } from '../models/contract-context';

export type GlobalSearchType = 'client' | 'contract' | 'quote' | 'document';

export interface GlobalSearchResult {
  id: string;
  label: string;
  type: GlobalSearchType;
  description?: string;
  route: any[];
  queryParams?: Record<string, any>;
  externalUrl?: string;
  contractContext?: ContractContextSnapshot;
}

interface QuoteMatch {
  id: string;
  label: string;
  clientId: string;
  clientName: string;
  market?: string;
  amount?: number;
  status?: string;
}

interface DocumentMatch {
  id: string;
  name: string;
  status?: string;
  clientId: string;
  clientName: string;
}

interface ContractMatch {
  id: string;
  label: string;
  contractId: string;
  clientId: string;
  clientName: string;
  market?: string;
  status?: string;
  documentsComplete?: boolean;
  protectionRequired?: boolean;
  protectionApplied?: boolean;
  pendingOfflineRequests?: number;
  updatedAt?: number;
  businessFlow?: BusinessFlow;
  aviDecision?: string;
  aviStatus?: string;
  requiresVoiceVerification?: boolean;
}

interface GlobalSearchAggregate {
  clients: Client[];
  quotes: QuoteMatch[];
  documents: DocumentMatch[];
  contracts: ContractMatch[];
  total: number;
}

interface GlobalSearchApiResponse {
  clients?: Array<Partial<Client> & { id: string; name: string }>;
  quotes?: QuoteMatch[];
  documents?: DocumentMatch[];
  contracts?: ContractMatch[];
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly fallbackIndex: GlobalSearchResult[] = [
    {
      id: 'client-juan-perez',
      label: 'Juan Pérez',
      type: 'client',
      description: 'Cliente • AGS',
      route: ['/clientes'],
      queryParams: { query: 'Juan Pérez', source: 'global-search' }
    },
    {
      id: 'client-maria-gonzalez',
      label: 'María González',
      type: 'client',
      description: 'Cliente • EdoMex',
      route: ['/clientes'],
      queryParams: { query: 'María González', source: 'global-search' }
    },
    {
      id: 'client-carlos-rodriguez',
      label: 'Carlos Rodríguez',
      type: 'client',
      description: 'Cliente • Colectivo',
      route: ['/clientes'],
      queryParams: { query: 'Carlos Rodríguez', source: 'global-search' }
    },
    {
      id: 'quote-ags-1234',
      label: 'Cotización AGS #1234',
      type: 'quote',
      description: 'Ultima actualización hace 4h',
      route: ['/cotizador'],
      queryParams: { id: '1234', source: 'global-search' }
    },
    {
      id: 'quote-edomex-5678',
      label: 'Cotización EdoMex #5678',
      type: 'quote',
      description: 'Pendiente de envío',
      route: ['/cotizador'],
      queryParams: { id: '5678', source: 'global-search' }
    },
    {
      id: 'document-ine-vencido',
      label: 'INE vencido — pendientes',
      type: 'document',
      description: 'Documentos • Filtro vencidos',
      route: ['/documentos'],
      queryParams: { filter: 'expired', source: 'global-search' }
    },
    {
      id: 'document-acta-nacimiento',
      label: 'Acta de Nacimiento',
      type: 'document',
      description: 'Documentos • Requeridos',
      route: ['/documentos'],
      queryParams: { filter: 'required', source: 'global-search' }
    },
    {
      id: 'contract-venta-ags',
      label: 'Contrato Venta a Plazo — Juan Pérez',
      type: 'contract',
      description: 'Contrato • Aguascalientes • Listo para firma',
      route: ['/contratos/generacion'],
      queryParams: { contractId: 'CON-AGS-001', clientId: 'client-juan-perez', source: 'global-search' },
      contractContext: {
        clientId: 'client-juan-perez',
        contractId: 'CON-AGS-001',
        market: 'aguascalientes',
        documentsComplete: true,
        protectionRequired: true,
        protectionApplied: true,
        voiceVerified: true,
        requiresVoiceVerification: false,
        pendingOfflineRequests: 0,
        aviDecision: 'go',
        aviStatus: 'completed',
        updatedAt: Date.now() - 60_000
      }
    },
    {
      id: 'contract-credito-colectivo',
      label: 'Contrato Crédito Colectivo — Grupo Valle',
      type: 'contract',
      description: 'Contrato • EdoMex • En revisión',
      route: ['/contratos/generacion'],
      queryParams: { contractId: 'CON-TANDA-010', clientId: 'group-valle', source: 'global-search' },
      contractContext: {
        clientId: 'group-valle',
        contractId: 'CON-TANDA-010',
        market: 'edomex',
        businessFlow: BusinessFlow.CreditoColectivo,
        documentsComplete: true,
        protectionRequired: true,
        protectionApplied: false,
        voiceVerified: true,
        requiresVoiceVerification: false,
        pendingOfflineRequests: 1,
        aviDecision: 'review',
        aviStatus: 'completed',
        updatedAt: Date.now() - 5 * 60_000
      }
    },
    {
      id: 'client-ana-martinez',
      label: 'Ana Martínez',
      type: 'client',
      description: 'Cliente • Individual',
      route: ['/clientes'],
      queryParams: { query: 'Ana Martínez', source: 'global-search' }
    }
  ];

  private recentsSubject = new BehaviorSubject<GlobalSearchResult[]>([]);
  readonly recent$ = this.recentsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private suggestionsSubject = new BehaviorSubject<GlobalSearchResult[]>(this.fallbackIndex.slice(0, 5));
  readonly suggestions$ = this.suggestionsSubject.asObservable();

  constructor(
    private router: Router,
    private httpClient: HttpClientService,
    private mockApi: MockApiService,
    private toast: ToastService,
    private analytics: AnalyticsService
  ) {}

  search(query: string): Observable<GlobalSearchResult[]> {
    const trimmed = (query ?? '').trim();
    if (!trimmed) {
      const initial = this.initialResults();
      this.analytics.track('global_search_idle', {
        hasRecents: this.recentsSubject.value.length > 0,
        suggestions: initial.length
      });
      return of(initial);
    }

    this.analytics.track('global_search_query', {
      query: trimmed,
      length: trimmed.length
    });

    return this.fetchResults(trimmed).pipe(
      tap(results =>
        this.analytics.track('global_search_results', {
          query: trimmed,
          total: results.length
        })
      )
    );
  }

  recordRecent(result: GlobalSearchResult): void {
    const current = this.recentsSubject.value.filter(item => item.id !== result.id);
    const next = [result, ...current].slice(0, 8);
    this.recentsSubject.next(next);
    this.analytics.track('global_search_recent', {
      id: result.id,
      type: result.type
    });
  }

  buildExternalUrl(result: GlobalSearchResult): string | null {
    if (result.externalUrl) {
      return result.externalUrl;
    }

    const tree = this.router.createUrlTree(result.route, { queryParams: result.queryParams });
    return this.router.serializeUrl(tree);
  }

  private fetchResults(query: string): Observable<GlobalSearchResult[]> {
    this.loadingSubject.next(true);

    const source$ = environment.features.enableMockData
      ? this.mockApi.globalSearch(query).pipe(map(payload => this.mapAggregateToResults(payload)))
      : this.httpClient
          .get<GlobalSearchApiResponse>('search', {
            params: { q: query, limit: '12' },
            showLoading: false,
            showError: false
          })
          .pipe(map(response => this.mapApiResponse(response.data)));

    return source$.pipe(
      map(results => (results.length ? results : this.filterFallback(query))),
      tap(results => {
        if (results.length) {
          this.suggestionsSubject.next(results.slice(0, 5));
        }
      }),
      catchError(error => {
        this.toast.error('No se pudo completar la búsqueda. Intenta de nuevo.');
        this.analytics.track('global_search_error', {
          query,
          message: (error as Error)?.message ?? 'unknown'
        });
        return of(this.filterFallback(query));
      }),
      finalize(() => this.loadingSubject.next(false))
    );
  }

  private mapAggregateToResults(payload: GlobalSearchAggregate): GlobalSearchResult[] {
    if (!payload) {
      return [];
    }

    const results = [
      ...this.mapClients(payload.clients ?? []),
      ...this.mapContracts(payload.contracts ?? []),
      ...this.mapQuotes(payload.quotes ?? []),
      ...this.mapDocuments(payload.documents ?? [])
    ];

    return this.sortResults(results);
  }

  private mapApiResponse(data?: GlobalSearchApiResponse | null): GlobalSearchResult[] {
    if (!data) {
      return [];
    }

    const clientResults = this.mapClients(
      (data.clients as Array<Partial<Client> & { id: string; name: string }> | undefined) ?? []
    );
    const contractResults = this.mapContracts(data.contracts ?? []);
    const quoteResults = this.mapQuotes(data.quotes ?? []);
    const documentResults = this.mapDocuments(data.documents ?? []);

    return this.sortResults([...clientResults, ...contractResults, ...quoteResults, ...documentResults]);
  }

  private mapClients(clients: Array<Partial<Client> & { id: string; name: string }>): GlobalSearchResult[] {
    return clients.slice(0, 10).map(client => ({
      id: `client-${client.id}`,
      label: client.name,
      type: 'client' as const,
      description: this.buildClientDescription(client),
      route: ['/clientes', client.id],
      queryParams: { source: 'global-search' }
    }));
  }

  private mapContracts(contracts: ContractMatch[]): GlobalSearchResult[] {
    return contracts.slice(0, 10).map(contract => ({
      id: `contract-${contract.id}`,
      label: contract.label,
      type: 'contract' as const,
      description: this.buildContractDescription(contract),
      route: ['/contratos/generacion'],
      queryParams: {
        contractId: contract.contractId,
        clientId: contract.clientId,
        source: 'global-search'
      },
      contractContext: this.buildContractContext(contract)
    }));
  }

  private mapQuotes(quotes: QuoteMatch[]): GlobalSearchResult[] {
    return quotes.slice(0, 10).map(quote => ({
      id: `quote-${quote.id}`,
      label: quote.label,
      type: 'quote' as const,
      description: this.buildQuoteDescription(quote),
      route: ['/cotizador'],
      queryParams: {
        id: quote.id,
        clientId: quote.clientId,
        source: 'global-search'
      }
    }));
  }

  private mapDocuments(documents: DocumentMatch[]): GlobalSearchResult[] {
    return documents.slice(0, 10).map(document => ({
      id: `document-${document.id}`,
      label: `${document.name} — ${document.clientName}`,
      type: 'document' as const,
      description: this.buildDocumentDescription(document),
      route: ['/documentos'],
      queryParams: {
        clientId: document.clientId,
        document: document.id,
        source: 'global-search'
      }
    }));
  }

  private buildClientDescription(client: Partial<Client>): string {
    const marketLabel = client.market ? this.getMarketLabel(client.market as string) : 'Sin mercado';
    const status = client.status ? client.status : 'Sin estado';
    return `Cliente • ${marketLabel} • ${status}`;
  }

  private buildQuoteDescription(quote: QuoteMatch): string {
    const parts = [quote.clientName];
    if (quote.market) {
      parts.push(this.getMarketLabel(quote.market));
    }
    if (quote.status) {
      parts.push(quote.status);
    }
    if (quote.amount) {
      parts.push(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(quote.amount));
    }
    return `Cotización • ${parts.join(' • ')}`;
  }

  private buildDocumentDescription(document: DocumentMatch): string {
    const status = document.status ? document.status : 'Sin estado';
    return `Documento • ${status}`;
  }

  private buildContractDescription(contract: ContractMatch): string {
    const parts = [contract.clientName];
    if (contract.market) {
      parts.push(this.getMarketLabel(contract.market));
    }
    if (contract.status) {
      parts.push(contract.status);
    }
    return `Contrato • ${parts.join(' • ')}`;
  }

  private buildContractContext(contract: ContractMatch): ContractContextSnapshot {
    return {
      clientId: contract.clientId,
      contractId: contract.contractId,
      market: contract.market ?? null,
      businessFlow: contract.businessFlow,
      documentsComplete: contract.documentsComplete ?? false,
      aviDecision: contract.aviDecision ?? 'go',
      aviStatus: contract.aviStatus ?? 'completed',
      voiceVerified: contract.aviStatus ? contract.aviStatus !== 'pending' : true,
      requiresVoiceVerification: contract.requiresVoiceVerification ?? false,
      protectionRequired: contract.protectionRequired ?? false,
      protectionApplied: contract.protectionApplied ?? false,
      pendingOfflineRequests: contract.pendingOfflineRequests ?? 0,
      updatedAt: contract.updatedAt ?? Date.now()
    };
  }

  private getMarketLabel(market: string): string {
    switch (market) {
      case 'aguascalientes':
        return 'Aguascalientes';
      case 'edomex':
      case 'estado_de_mexico':
        return 'Estado de México';
      default:
        return market || 'Sin mercado';
    }
  }

  private sortResults(results: GlobalSearchResult[]): GlobalSearchResult[] {
    const order: Record<GlobalSearchType, number> = {
      client: 0,
      contract: 1,
      quote: 2,
      document: 3
    };

    return results
      .filter(Boolean)
      .sort((a, b) => order[a.type] - order[b.type])
      .slice(0, 20);
  }

  private initialResults(): GlobalSearchResult[] {
    const recents = this.recentsSubject.value;
    if (recents.length) {
      return recents;
    }
    return this.suggestionsSubject.value;
  }

  private filterFallback(query: string): GlobalSearchResult[] {
    const lowered = query.toLowerCase();
    const fallback = this.fallbackIndex.filter(item =>
      item.label.toLowerCase().includes(lowered) ||
      item.description?.toLowerCase().includes(lowered)
    );
    this.analytics.track('global_search_fallback', {
      query,
      total: fallback.length
    });
    return fallback;
  }
}
