import { Injectable } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  // Emits when a new version is ready
  public readonly updateAvailable$ = new BehaviorSubject<boolean>(false);

  private latestEvent?: VersionEvent;
  private autoReloadTimerId: any;

  constructor(private swUpdate: SwUpdate) {
    this.initialize();
  }

  private initialize(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        this.latestEvent = event;
        this.updateAvailable$.next(true);

        // Conditional auto-reload: less disruptive when tab is hidden
        // If page is hidden, update soon; otherwise, consider delayed auto-update
        if (typeof document !== 'undefined') {
          if (document.visibilityState === 'hidden') {
            this.scheduleAutoReload(2000);
          } else {
            // Grace period to let the user click an Update CTA (banner)
            this.scheduleAutoReload(10000);
          }
        }
      }
    });
  }

  /** Trigger update immediately (used by UI banner CTA) */
  async updateNow(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    try {
      clearTimeout(this.autoReloadTimerId);
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch {
      // no-op: best-effort
    }
  }

  /** Schedule an automatic update with a small delay */
  private scheduleAutoReload(delayMs: number): void {
    clearTimeout(this.autoReloadTimerId);
    this.autoReloadTimerId = setTimeout(async () => {
      // Only auto-reload if still not updated and still enabled
      if (!this.swUpdate.isEnabled) return;
      try {
        await this.swUpdate.activateUpdate();
        document.location.reload();
      } catch {
        // swallow
      }
    }, delayMs);
  }
}

