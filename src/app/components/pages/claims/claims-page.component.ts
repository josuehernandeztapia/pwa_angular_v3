import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  ClaimRecord,
  ClaimStatus,
  ClaimType,
  ClaimsService
} from '../../../services/claims.service';
import { OfflineQueueBannerComponent } from '../../shared/offline-queue-banner/offline-queue-banner.component';

type ClaimFormMode = 'create' | 'edit';

type StatusFilter = ClaimStatus | 'all';

type ClaimsSummary = {
  total: number;
  open: number;
  inReview: number;
  closed: number;
  avgAmount: number;
};

@Component({
  selector: 'app-claims-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OfflineQueueBannerComponent],
  templateUrl: './claims-page.component.html',
  styleUrls: ['./claims-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ClaimsPageComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly claimsService = inject(ClaimsService);
  private readonly fb = inject(FormBuilder);

  private readonly allClaims = signal<ClaimRecord[]>([]);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly searchTerm = signal<string>('');
  readonly selectedClaimId = signal<string | null>(null);
  readonly formMode = signal<ClaimFormMode>('create');
  readonly summary = signal<ClaimsSummary>({ total: 0, open: 0, inReview: 0, closed: 0, avgAmount: 0 });

  readonly filteredClaims = computed(() => {
    const claims = this.allClaims();
    const status = this.statusFilter();
    const search = this.searchTerm().trim().toLowerCase();

    return claims.filter(claim => {
      if (status !== 'all' && claim.status !== status) {
        return false;
      }

      if (search) {
        const haystack = `${claim.folio} ${claim.clientName} ${claim.vehicleVin}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    });
  });

  readonly form: FormGroup = this.fb.group({
    clientName: ['', [Validators.required, Validators.minLength(3)]],
    vehicleVin: ['', [Validators.required, Validators.minLength(5)]],
    market: ['aguascalientes', Validators.required],
    type: ['warranty', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    description: ['']
  });

  readonly statusOptions: { label: string; value: ClaimStatus }[] = [
    { label: 'Abierta', value: 'open' },
    { label: 'En revisión', value: 'in_review' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
    { label: 'Cerrada', value: 'closed' }
  ];

  readonly typeOptions: { label: string; value: ClaimType }[] = [
    { label: 'Garantía', value: 'warranty' },
    { label: 'Mantenimiento', value: 'maintenance' },
    { label: 'Seguro', value: 'insurance' },
    { label: 'Servicio', value: 'service' }
  ];

  readonly marketOptions = [
    { label: 'Aguascalientes', value: 'aguascalientes' },
    { label: 'EdoMex', value: 'edomex' },
    { label: 'Otros', value: 'otros' }
  ];

  getTypeLabel(type: ClaimType): string {
    return this.typeOptions.find(option => option.value === type)?.label ?? '—';
  }

  constructor() {
    this.claimsService
      .getClaims()
      .pipe(takeUntil(this.destroy$))
      .subscribe(records => this.allClaims.set(records));

    this.claimsService
      .getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => this.summary.set(summary));

    effect(() => {
      const mode = this.formMode();
      if (mode === 'create') {
        this.form.reset({
          clientName: '',
          vehicleVin: '',
          market: 'aguascalientes',
          type: 'warranty',
          amount: 0,
          description: ''
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  onStatusFilterChange(value: string): void {
    const normalized = (value as StatusFilter) ?? 'all';
    this.statusFilter.set(normalized);
  }

  startCreate(): void {
    this.selectedClaimId.set(null);
    this.formMode.set('create');
    this.form.reset({
      clientName: '',
      vehicleVin: '',
      market: 'aguascalientes',
      type: 'warranty',
      amount: 0,
      description: ''
    });
  }

  editClaim(claim: ClaimRecord): void {
    this.selectedClaimId.set(claim.id);
    this.formMode.set('edit');
    this.form.patchValue({
      clientName: claim.clientName,
      vehicleVin: claim.vehicleVin,
      market: claim.market,
      type: claim.type,
      amount: claim.amount,
      description: claim.description ?? ''
    });
  }

  saveClaim(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    if (!this.selectedClaimId()) {
      this.claimsService
        .createClaim(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.startCreate();
        });
      return;
    }

    this.claimsService
      .updateClaim(this.selectedClaimId()!, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(updated => {
        if (updated) {
          this.editClaim(updated);
        }
      });
  }

  updateStatus(claim: ClaimRecord, status: string): void {
    const normalized = status as ClaimStatus;

    if (claim.status === normalized) {
      return;
    }

    this.claimsService
      .updateClaim(claim.id, { status: normalized })
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  closeClaim(claim: ClaimRecord): void {
    this.claimsService
      .closeClaim(claim.id, 'Cerrado manualmente desde UI de Claims')
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(amount ?? 0);
  }
}
