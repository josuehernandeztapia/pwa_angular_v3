import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { AnalyticsService } from './analytics.service';
import { FlowContextService } from './flow-context.service';
import { GlobalSearchResult, GlobalSearchService } from './global-search.service';

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
    if (result.type === 'contract' && result.contractContext) {
      this.flowContext.saveContext('contract', result.contractContext, {
        breadcrumbs: ['Documentos', 'Contratos']
      });
    }
  }
}
