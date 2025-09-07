import { Injectable } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  constructor(private swUpdate: SwUpdate) {
    this.initialize();
  }

  private initialize(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        const shouldReload = window.confirm('Hay una actualización disponible. ¿Actualizar ahora?');
        if (shouldReload) {
          this.swUpdate.activateUpdate().then(() => document.location.reload());
        }
      }
    });
  }
}

