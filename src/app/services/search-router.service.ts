import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { AnalyticsService } from './analytics.service';
import { FlowContextService } from './flow-context.service';
import { GlobalSearchResult, GlobalSearchService } from './global-search.service';
import { ClientContextSnapshot } from '../models/client-context';
import { BusinessFlow } from '../models/types';

export interface SearchNavigationOptions {
  newTab?: boolean;
  query?: string;
  position?: number;
  interaction?: 'keyboard' | 'mouse';
}

@Injectable({ providedIn: 'root' })
export class SearchRouterService {
  constructor(
    private readonly router: Router,
    private readonly analytics: AnalyticsService,
    private readonly globalSearch: GlobalSearchService,
    private readonly flowContext: FlowContextService
  ) {}

  open(result: GlobalSearchResult, options: SearchNavigationOptions = {}): void {
    const { newTab = false, query = '', position, interaction = 'mouse' } = options;

    this.analytics.track('global_search_select', {
      id: result.id,
      type: result.type,
      newTab,
      position,
      query,
      interaction
    });

    this.globalSearch.recordRecent(result);

    if (result.externalUrl) {
      this.openUrl(result.externalUrl, newTab);
      return;
    }

    this.hydrateContext(result);

    const serialized = this.globalSearch.buildExternalUrl(result);

    if (newTab && serialized) {
      this.openUrl(serialized, true);
      return;
    }

    this.router.navigate(result.route, { queryParams: result.queryParams });
  }

  trackResultsView(results: GlobalSearchResult[], context: { query: string; filter: string }): void {
    this.analytics.track('global_search_view', {
      query: context.query,
      filter: context.filter,
      total: results.length
    });
  }

  trackFilterChange(filter: string): void {
    this.analytics.track('global_search_filter', { filter });
  }

  private openUrl(url: string, newTab: boolean): void {
    if (!url) {
      return;
    }
    if (newTab) {
      window.open(url, '_blank', 'noopener');
    } else {
      window.location.href = url;
    }
  }

  private hydrateContext(result: GlobalSearchResult): void {
    switch (result.type) {
      case 'contract':
        if (result.contractContext) {
          this.flowContext.saveContext('contract', result.contractContext, {
            breadcrumbs: ['Documentos', 'Contratos']
          });
        }
        return;
      case 'client':
        this.hydrateClientContext(result);
        return;
      case 'quote':
        this.hydrateQuoteContext(result);
        return;
      case 'document':
        this.hydrateDocumentContext(result);
        return;
      default:
        return;
    }
  }

  private hydrateClientContext(result: GlobalSearchResult): void {
    const clientId = this.extractClientId(result);
    if (!clientId) {
      return;
    }

    const snapshot: ClientContextSnapshot = {
      clientId,
      contractId: result.contractContext?.contractId ?? null,
      market: result.contractContext?.market ?? null,
      lastUpdated: Date.now()
    };

    this.flowContext.saveContext('client', snapshot, {
      breadcrumbs: ['Dashboard', 'Clientes', result.label]
    });
  }

  private hydrateQuoteContext(result: GlobalSearchResult): void {
    const quoteId = typeof result.queryParams?.['id'] === 'string' ? result.queryParams!['id'] : null;
    const clientId = this.extractClientId(result);

    if (!quoteId && !clientId) {
      return;
    }

    const payload: any = {
      quoteId,
      clientId,
      clientName: result.label,
      source: 'cotizador',
      market: this.extractMarket(result) ?? null,
      updatedAt: Date.now(),
      origin: 'global-search'
    };

    this.flowContext.saveContext('cotizador', payload, {
      breadcrumbs: ['Dashboard', 'Cotizador', result.label]
    });
  }

  private hydrateDocumentContext(result: GlobalSearchResult): void {
    const clientId = this.extractClientId(result);
    const documentId = typeof result.queryParams?.['document'] === 'string' ? result.queryParams!['document'] : null;

    const payload: any = {
      flowContext: {
        clientId: clientId ?? undefined,
        clientName: result.label,
        source: 'cotizador',
        market: this.extractMarket(result) ?? 'aguascalientes',
        businessFlow: BusinessFlow.VentaPlazo,
      },
      lastSearch: {
        documentId,
        timestamp: Date.now()
      }
    };

    this.flowContext.saveContext('documentos', payload, {
      breadcrumbs: ['Dashboard', 'Documentos', result.label]
    });
  }

  private extractClientId(result: GlobalSearchResult): string | null {
    if (Array.isArray(result.route) && result.route.length > 1 && typeof result.route[1] === 'string') {
      return result.route[1];
    }

    const qpClient = result.queryParams?.['clientId'];
    if (typeof qpClient === 'string' && qpClient.length) {
      return qpClient;
    }

    return null;
  }

  private extractMarket(result: GlobalSearchResult): string | null {
    if (result.contractContext?.market) {
      return result.contractContext.market;
    }

    const qpMarket = result.queryParams?.['market'];
    if (typeof qpMarket === 'string' && qpMarket.length) {
      return qpMarket;
    }

    return null;
  }
}
