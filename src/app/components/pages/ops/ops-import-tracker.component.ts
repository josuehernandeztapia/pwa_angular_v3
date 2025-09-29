import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IntegratedImportTrackerService, ImportTrackerMetrics, IntegratedImportStatus } from '../../../services/integrated-import-tracker.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';

@Component({
  selector: 'app-ops-import-tracker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './ops-import-tracker.component.html',
  styleUrls: ['./ops-import-tracker.component.scss']
})
export class OpsImportTrackerComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  metrics$: Observable<ImportTrackerMetrics> = of({
    totalActiveImports: 0,
    averageTransitTime: 0,
    onTimeDeliveryRate: 0,
    delayedImports: 0,
    milestoneStats: {} as any,
    monthlyImportVolume: [],
    delayTrends: []
  });

  status$: Observable<IntegratedImportStatus | null> = of(null);
  clientIdCtrl = new FormControl<string>('');
  currentClientId: string | null = null;

  milestoneKeys: (keyof IntegratedImportStatus)[] = [
    'pedidoPlanta',
    'unidadFabricada',
    'transitoMaritimo',
    'enAduana',
    'liberada'
  ] as any;

  readonly milestoneIcons: Partial<Record<keyof IntegratedImportStatus, IconName>> = {
    pedidoPlanta: 'factory',
    unidadFabricada: 'cube',
    transitoMaritimo: 'ship',
    enAduana: 'customs',
    liberada: 'check-circle'
  };

  constructor(private tracker: IntegratedImportTrackerService) {
    this.metrics$ = this.tracker.getImportTrackerMetrics().pipe(
      catchError(() => of({
        totalActiveImports: 0,
        averageTransitTime: 0,
        onTimeDeliveryRate: 0,
        delayedImports: 0,
        milestoneStats: {} as any,
        monthlyImportVolume: [],
        delayTrends: []
      }))
    );

    this.status$ = this.clientIdCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => this.currentClientId = (v || '').trim() || null),
      switchMap(v => v ? this.fetchStatus(v) : of(null))
    );
  }

  refresh(): void {
    const id = (this.clientIdCtrl.value || '').trim();
    if (id) {
      this.status$ = this.fetchStatus(id);
    }
  }

  private fetchStatus(clientId: string): Observable<IntegratedImportStatus | null> {
    return this.tracker.getIntegratedImportStatus(clientId).pipe(
      catchError(() => of(null))
    );
  }

  setMilestone(milestone: keyof IntegratedImportStatus, state: 'completed' | 'in_progress' | 'pending'): void {
    const id = (this.clientIdCtrl.value || '').trim();
    if (!id) return;
    if (!['pedidoPlanta','unidadFabricada','transitoMaritimo','enAduana','liberada'].includes(milestone as string)) return;
    this.tracker.updateImportMilestone(id, milestone as any, state).pipe(takeUntil(this.destroy$)).subscribe(() => this.refresh());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
