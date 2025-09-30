import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfflineService } from './offline.service';
import { ToastService } from './toast.service';

export type BoundaryIssueType = 'network-timeout' | 'ocr-failure' | 'offline-queued';
export type BoundaryIssueStatus = 'pending' | 'queued' | 'processing' | 'resolved' | 'failed';

export interface BoundaryIssueAction {
  id: string;
  label: string;
  kind?: 'primary' | 'secondary' | 'danger';
  run: (issue: BoundaryIssue) => Promise<void> | void;
}

export interface BoundaryIssueContext {
  module?: string;
  documentName?: string;
  clientId?: string;
  [key: string]: any;
}

export interface BoundaryIssue {
  id: string;
  type: BoundaryIssueType;
  message: string;
  status: BoundaryIssueStatus;
  attempts: number;
  createdAt: number;
  context?: BoundaryIssueContext;
  retry?: () => Promise<any>;
  actions?: BoundaryIssueAction[];
}

export interface NetworkTimeoutOptions {
  message: string;
  context?: BoundaryIssueContext;
  retry?: () => Promise<any>;
  queueRequest?: {
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    payload?: any;
  };
  onQueue?: () => Promise<any> | void;
  onSaveDraft?: () => Promise<any> | void;
}

export interface OcrFailureOptions {
  message: string;
  context?: BoundaryIssueContext;
  retry?: () => Promise<any>;
  processManually?: () => Promise<any> | void;
  skip?: () => Promise<any> | void;
}

@Injectable({ providedIn: 'root' })
export class ErrorBoundaryService {
  private readonly issuesSubject = new BehaviorSubject<BoundaryIssue[]>([]);
  readonly issues$ = this.issuesSubject.asObservable();

  constructor(
    private readonly offline: OfflineService,
    private readonly toast: ToastService
  ) {
    this.offline.online$.subscribe(isOnline => {
      if (isOnline) {
        this.flushQueuedIssues();
      }
    });
  }

  reportNetworkTimeout(options: NetworkTimeoutOptions): BoundaryIssue {
    const issue = this.createIssue('network-timeout', options.message, options.context);
    issue.retry = options.retry;
    issue.actions = [];

    if (options.retry) {
      issue.actions.push({
        id: 'retry',
        label: 'Reintentar',
        kind: 'primary',
        run: () => this.runRetry(issue.id, options.retry!)
      });
    }

    if (options.queueRequest) {
      issue.actions.push({
        id: 'work-offline',
        label: 'Trabajar offline',
        kind: 'secondary',
        run: () => {
          this.offline.storeOfflineRequest(
            options.queueRequest!.endpoint,
            options.queueRequest!.method ?? 'POST',
            options.queueRequest!.payload
          );
          Promise.resolve(options.onQueue?.()).catch(() => undefined);
          this.updateIssue(issue.id, { status: 'queued' });
          this.toast.info('La acción se agregó a la cola offline. Se sincronizará al volver la conexión.');
        }
      });
    }

    if (options.onSaveDraft) {
      issue.actions.push({
        id: 'save-draft',
        label: 'Guardar borrador',
        kind: 'secondary',
        run: async () => {
          await options.onSaveDraft!();
          this.resolveIssue(issue.id);
          this.toast.success('Borrador guardado. Puedes retomar cuando estés listo.');
        }
      });
    }

    this.pushIssue(issue);
    this.toast.warning(options.message, 5000);
    return issue;
  }

  reportOcrFailure(options: OcrFailureOptions): BoundaryIssue {
    const issue = this.createIssue('ocr-failure', options.message, options.context);
    issue.retry = options.retry;
    issue.actions = [];

    if (options.retry) {
      issue.actions.push({
        id: 'retry',
        label: 'Reintentar',
        kind: 'primary',
        run: () => this.runRetry(issue.id, options.retry!)
      });
    }

    if (options.processManually) {
      issue.actions.push({
        id: 'manual',
        label: 'Procesar manual',
        kind: 'secondary',
        run: async () => {
          await options.processManually!();
          this.resolveIssue(issue.id);
        }
      });
    }

    if (options.skip) {
      issue.actions.push({
        id: 'skip',
        label: 'Saltar',
        kind: 'secondary',
        run: async () => {
          await options.skip!();
          this.resolveIssue(issue.id);
          this.toast.info('El documento se marcó como pendiente manual.');
        }
      });
    }

    this.pushIssue(issue);
    this.toast.error(options.message, 5000);
    return issue;
  }

  resolveIssueByContext(contextMatcher: (issue: BoundaryIssue) => boolean): void {
    const issues = this.issuesSubject.value;
    const next = issues.map(issue => {
      if (contextMatcher(issue)) {
        return { ...issue, status: 'resolved' as BoundaryIssueStatus };
      }
      return issue;
    }).filter(issue => issue.status !== 'resolved');
    this.issuesSubject.next(next);
  }

  async retryIssue(id: string): Promise<void> {
    const issue = this.getIssue(id);
    if (!issue) {
      return;
    }

    const retryAction = issue.actions?.find(action => action.id === 'retry');
    if (retryAction) {
      await this.executeAction(id, retryAction.id);
      return;
    }

    if (issue.retry) {
      await this.runRetry(id, issue.retry);
    }
  }

  dismissIssue(id: string, message?: string): void {
    const issue = this.getIssue(id);
    if (!issue) {
      return;
    }

    this.removeIssue(id);

    if (message) {
      this.toast.info(message);
    }
  }

  async executeAction(issueId: string, actionId: string): Promise<void> {
    const issue = this.getIssue(issueId);
    if (!issue || !issue.actions?.length) {
      return;
    }

    const action = issue.actions.find(item => item.id === actionId);
    if (!action) {
      return;
    }

    const current = this.getIssue(issueId);
    if (!current) {
      return;
    }

    if (action.id === 'retry') {
      if (current.retry) {
        await this.runRetry(issueId, current.retry);
      }
      return;
    }

    try {
      await action.run(current);

      const updated = this.getIssue(issueId);
      if (!updated || updated.status === 'resolved') {
        this.removeIssue(issueId);
      } else {
        this.updateIssue(issueId, updated);
      }
    } catch (error) {
      this.incrementAttempts(issueId);
      this.toast.error('No se pudo completar la acción. Intenta nuevamente más tarde.');
    }
  }

  private createIssue(type: BoundaryIssueType, message: string, context?: BoundaryIssueContext): BoundaryIssue {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      message,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
      context,
      actions: []
    };
  }

  private pushIssue(issue: BoundaryIssue): void {
    const issues = [...this.issuesSubject.value, issue];
    this.issuesSubject.next(issues);
  }

  private getIssue(id: string): BoundaryIssue | null {
    return this.issuesSubject.value.find(issue => issue.id === id) ?? null;
  }

  private updateIssue(id: string, updates: Partial<BoundaryIssue>): void {
    const next = this.issuesSubject.value.map(issue =>
      issue.id === id ? { ...issue, ...updates } : issue
    );
    this.issuesSubject.next(next);
  }

  private resolveIssue(id: string): void {
    this.removeIssue(id);
  }

  private removeIssue(id: string): void {
    const next = this.issuesSubject.value.filter(issue => issue.id !== id);
    this.issuesSubject.next(next);
  }

  private incrementAttempts(id: string): void {
    const issue = this.getIssue(id);
    if (!issue) {
      return;
    }
    this.updateIssue(id, { attempts: issue.attempts + 1, status: 'pending' });
  }

  private async runRetry(id: string, retry: () => Promise<any>): Promise<void> {
    this.updateIssue(id, { status: 'processing' });
    try {
      await retry();
      this.resolveIssue(id);
      this.toast.success('Acción reintentada exitosamente');
    } catch (error) {
      this.incrementAttempts(id);
      this.toast.error('No se pudo completar el reintento. Intenta nuevamente más tarde.');
    }
  }

  private async flushQueuedIssues(): Promise<void> {
    const issues = this.issuesSubject.value.filter(issue => issue.status === 'queued');
    for (const issue of issues) {
      if (issue.retry) {
        await this.retryIssue(issue.id);
      } else {
        this.removeIssue(issue.id);
      }
    }
  }
}
