import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OfflineData, OfflineService } from '../../../services/offline.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-offline-queue-banner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './offline-queue-banner.component.html',
  styleUrls: ['./offline-queue-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfflineQueueBannerComponent implements OnInit, OnDestroy {
  @Input() contextLabel = 'acciones';
  @Input() endpointPrefix?: string;
  @Input() featureTag?: string;

  isOffline = false;
  pendingCount = 0;
  lastSyncMessage: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private flushTimeout: any = null;

  constructor(
    private readonly offline: OfflineService,
    private readonly analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.offline.online$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        this.isOffline = !isOnline;
      });

    this.offline.pendingRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(requests => {
        const relevant = requests.filter(request => this.isRelevant(request));
        this.pendingCount = relevant.length;
      });

    this.offline.processedRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (!this.isRelevant(result.request)) {
          return;
        }

        if (result.success && this.pendingCount === 0) {
          this.lastSyncMessage = `Sincronizamos la cola de ${this.contextLabel}.`;
          this.analytics.track('offline_queue_flush', {
            feature: this.featureTag ?? this.contextLabel,
            processed: (result.request.attempts ?? 0) + 1,
            remaining: this.pendingCount
          });
          if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
          }
          this.flushTimeout = setTimeout(() => {
            this.lastSyncMessage = null;
          }, 4000);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }

  private isRelevant(request: OfflineData): boolean {
    if (this.endpointPrefix) {
      return typeof request.endpoint === 'string' && request.endpoint.includes(this.endpointPrefix);
    }
    return true;
  }
}
