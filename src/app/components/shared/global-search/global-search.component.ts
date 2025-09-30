import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { IconComponent } from '../icon/icon.component';
import { GlobalSearchResult, GlobalSearchService, GlobalSearchType } from '../../../services/global-search.service';
import { SearchRouterService } from '../../../services/search-router.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss']
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  query = '';
  results: GlobalSearchResult[] = [];
  filteredResults: GlobalSearchResult[] = [];
  recents: GlobalSearchResult[] = [];
  suggestions: GlobalSearchResult[] = [];
  isOpen = false;
  highlightedIndex = -1;
  activeFilter: GlobalSearchType | 'all' = 'all';
  readonly filters: Array<{ label: string; value: GlobalSearchType | 'all'; dataCy: string }> = [
    { label: 'Todo', value: 'all', dataCy: 'global-search-filter-all' },
    { label: 'Clientes', value: 'client', dataCy: 'global-search-filter-cliente' },
    { label: 'Contratos', value: 'contract', dataCy: 'global-search-filter-contrato' },
    { label: 'Cotizaciones', value: 'quote', dataCy: 'global-search-filter-cotizacion' },
    { label: 'Documentos', value: 'document', dataCy: 'global-search-filter-documento' }
  ];

  private searchTerm$ = new Subject<string>();
  private subscription = new Subscription();
  readonly isEnabled = environment.features.enableGlobalSearch ?? true;

  constructor(
    private globalSearch: GlobalSearchService,
    private searchRouter: SearchRouterService
  ) {}

  ngOnInit(): void {
    if (!this.isEnabled) {
      return;
    }

    const searchSub = this.searchTerm$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap(term => this.globalSearch.search(term))
      )
      .subscribe(results => {
        this.results = results;
        this.updateFilteredResults();
      });

    const recentsSub = this.globalSearch.recent$.subscribe(recents => {
      this.recents = recents;
      if (!this.query) {
        this.results = this.initialResults();
        this.updateFilteredResults();
      }
    });

    const suggestionsSub = this.globalSearch.suggestions$.subscribe(list => {
      this.suggestions = list;
      if (!this.query && !this.recents.length) {
        this.results = this.suggestions;
        this.updateFilteredResults();
      }
    });

    this.subscription.add(searchSub);
    this.subscription.add(recentsSub);
    this.subscription.add(suggestionsSub);

    // Auto-focus on mobile when component initializes if no other input is focused
    this.autoFocusOnMobile();
  }

  private autoFocusOnMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setTimeout(() => {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).contentEditable === 'true'
        );

        if (!isInputFocused && this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onFocus(): void {
    if (!this.isEnabled) {
      return;
    }
    if (!this.query) {
      this.results = this.initialResults();
    }
    this.isOpen = true;
    this.updateFilteredResults();
  }

  onBlur(): void {
    if (!this.isEnabled) {
      return;
    }
    setTimeout(() => {
      this.isOpen = false;
      this.highlightedIndex = -1;
    }, 120);
  }

  onInput(value: string): void {
    if (!this.isEnabled) {
      return;
    }
    this.query = value;
    this.searchTerm$.next(value);
    if (!value) {
      this.results = this.initialResults();
      this.updateFilteredResults();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveHighlight(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveHighlight(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const openInNewTab = event.shiftKey || event.ctrlKey || event.metaKey;
      this.executeSelection(openInNewTab);
      return;
    }

    if (event.key === 'Escape') {
      this.isOpen = false;
      this.highlightedIndex = -1;
      return;
    }
  }

  selectResult(result: GlobalSearchResult, openInNewTab = false, interaction: 'keyboard' | 'mouse' = 'mouse'): void {
    if (!this.isEnabled) {
      return;
    }

    const position = this.filteredResults.findIndex(item => item.id === result.id);
    this.searchRouter.open(result, {
      newTab: openInNewTab,
      query: this.query,
      position,
      interaction
    });
    this.reset();
  }

  getTypeLabel(type: GlobalSearchResult['type']): string {
    switch (type) {
      case 'client':
        return 'Cliente';
      case 'quote':
        return 'Cotización';
      case 'document':
        return 'Documento';
      case 'contract':
        return 'Contrato';
      default:
        return 'Resultado';
    }
  }

  isHighlighted(index: number): boolean {
    return index === this.highlightedIndex;
  }

  setFilter(filter: GlobalSearchType | 'all'): void {
    if (this.activeFilter === filter) {
      return;
    }
    this.activeFilter = filter;
    this.searchRouter.trackFilterChange(filter);
    this.updateFilteredResults();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcut(event: KeyboardEvent): void {
    if (!this.isEnabled) {
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'k':
          event.preventDefault();
          this.focusInput();
          return;
        case '/':
          event.preventDefault();
          this.focusInput('', true);
          return;
      }
    }
  }

  focusInput(prefill: string = this.query, selectAll = true): void {
    if (!this.isEnabled) {
      return;
    }
    if (this.searchInput) {
      this.searchInput.nativeElement.value = prefill;
      this.searchInput.nativeElement.focus();
      if (selectAll) {
        this.searchInput.nativeElement.select();
      }
      this.isOpen = true;
      if (prefill) {
        this.searchTerm$.next(prefill);
      }
    }
  }

  private moveHighlight(direction: 1 | -1): void {
    if (!this.filteredResults.length) {
      return;
    }
    const nextIndex = this.highlightedIndex + direction;
    if (nextIndex < 0) {
      this.highlightedIndex = this.filteredResults.length - 1;
    } else if (nextIndex >= this.filteredResults.length) {
      this.highlightedIndex = 0;
    } else {
      this.highlightedIndex = nextIndex;
    }
  }

  private executeSelection(openInNewTab: boolean): void {
    if (!this.filteredResults.length) {
      return;
    }
    const target = this.highlightedIndex >= 0 ? this.filteredResults[this.highlightedIndex] : this.filteredResults[0];
    this.selectResult(target, openInNewTab, 'keyboard');
  }

  private reset(): void {
    this.query = '';
    this.isOpen = false;
    this.highlightedIndex = -1;
    this.searchTerm$.next('');
    this.activeFilter = 'all';
    this.results = this.initialResults();
    this.updateFilteredResults();
  }

  private updateFilteredResults(): void {
    this.filteredResults = this.applyFilter(this.results, this.activeFilter);
    this.highlightedIndex = this.filteredResults.length ? 0 : -1;
    this.searchRouter.trackResultsView(this.filteredResults, {
      query: this.query,
      filter: this.activeFilter
    });
  }

  private applyFilter(results: GlobalSearchResult[], filter: GlobalSearchType | 'all'): GlobalSearchResult[] {
    if (filter === 'all') {
      return [...results];
    }
    return results.filter(result => result.type === filter);
  }

  private initialResults(): GlobalSearchResult[] {
    return this.recents.length ? this.recents : this.suggestions;
  }
}
