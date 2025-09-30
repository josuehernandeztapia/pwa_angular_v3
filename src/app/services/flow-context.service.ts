import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FlowContextEntry<T = any> {
  key: string;
  data: T;
  breadcrumbs?: string[];
  timestamp: number;
  expiresAt?: number | null;
}

export interface FlowContextOptions {
  breadcrumbs?: string[];
  /** Time to live in milliseconds */
  ttlMs?: number;
  /** Persist entry to storage (default true) */
  persist?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FlowContextService {
  private readonly storageKey = '__flow_context_state__';
  private readonly contexts = new Map<string, FlowContextEntry<any>>();
  private readonly breadcrumbsSubject = new BehaviorSubject<string[]>(['Dashboard']);
  private readonly contextsSubject = new BehaviorSubject<FlowContextEntry<any>[]>([]);

  readonly breadcrumbs$ = this.breadcrumbsSubject.asObservable();
  readonly contexts$ = this.contextsSubject.asObservable();

  constructor() {
    this.restoreFromStorage();
  }

  saveContext<T>(key: string, data: T, options: FlowContextOptions = {}): FlowContextEntry<T> {
    const persist = options.persist ?? true;
    const existing = this.contexts.get(key);
    const entry: FlowContextEntry<T> = {
      key,
      data: this.clone(data),
      breadcrumbs: options.breadcrumbs ?? existing?.breadcrumbs,
      timestamp: Date.now(),
      expiresAt: options.ttlMs ? Date.now() + options.ttlMs : existing?.expiresAt ?? null
    };

    this.contexts.set(key, entry);

    if (entry.breadcrumbs && entry.breadcrumbs.length) {
      this.setBreadcrumbs(entry.breadcrumbs);
    }

    if (persist) {
      this.persist();
    }

    this.emitContexts();

    return entry;
  }

  updateContext<T>(key: string, updater: (current: T | null) => T, options: FlowContextOptions = {}): FlowContextEntry<T> {
    const current = this.getContextData<T>(key);
    const next = updater(current);
    const existing = this.contexts.get(key);
    return this.saveContext(key, next, {
      breadcrumbs: options.breadcrumbs ?? existing?.breadcrumbs,
      ttlMs: options.ttlMs ?? (existing?.expiresAt ? existing.expiresAt - Date.now() : undefined),
      persist: options.persist
    });
  }

  getContext<T>(key: string): FlowContextEntry<T> | null {
    const entry = this.contexts.get(key) as FlowContextEntry<T> | undefined;
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.contexts.delete(key);
      this.persist();
      return null;
    }

    return entry;
  }

  getContextData<T>(key: string): T | null {
    const entry = this.getContext<T>(key);
    return entry ? this.clone(entry.data) : null;
  }

  clearContext(key: string, persist = true): void {
    if (this.contexts.delete(key) && persist) {
      this.persist();
    }
    this.emitContexts();
  }

  clearAll(): void {
    this.contexts.clear();
    this.persist();
    this.emitContexts();
  }

  setBreadcrumbs(breadcrumbs: string[]): void {
    if (!breadcrumbs || breadcrumbs.length === 0) {
      this.breadcrumbsSubject.next(['Dashboard']);
      return;
    }
    this.breadcrumbsSubject.next([...breadcrumbs]);
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window?.sessionStorage) {
      return;
    }

    try {
      const serialized = JSON.stringify(Array.from(this.contexts.values()));
      window.sessionStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      // Swallow storage errors (quota / private mode)
    }
  }

  private restoreFromStorage(): void {
    if (typeof window === 'undefined' || !window?.sessionStorage) {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(this.storageKey);
      if (!raw) {
        this.emitContexts();
        return;
      }

      const parsed: FlowContextEntry[] = JSON.parse(raw);
      const now = Date.now();
      parsed.forEach(entry => {
        if (entry.expiresAt && now > entry.expiresAt) {
          return;
        }
        this.contexts.set(entry.key, entry);
      });
      this.emitContexts();
    } catch (error) {
      // Ignore parse errors and start fresh
      this.contexts.clear();
      this.emitContexts();
    }
  }

  private clone<T>(value: T): T {
    if (value === undefined || value === null) {
      return value;
    }

    try {
      return structuredClone(value);
    } catch {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return value;
      }
    }
  }

  private emitContexts(): void {
    const snapshot = Array.from(this.contexts.values()).map(entry => ({
      ...entry,
      data: this.clone(entry.data)
    }));
    this.contextsSubject.next(snapshot);
  }
}
