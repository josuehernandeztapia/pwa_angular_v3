import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { BusinessFlow } from '../../../models/types';
import {
  MarketPolicyContext,
  MarketPolicyMetadata,
  MarketPolicyService,
  PolicyClientType,
  PolicyMarket,
  RemoteMarketPolicyConfig
} from '../../../services/market-policy.service';
import { ToastService } from '../../../services/toast.service';
import { MonitoringService } from '../../../services/monitoring.service';

type PolicyDiffType =
  | 'market-added'
  | 'market-removed'
  | 'document-added'
  | 'document-removed'
  | 'document-updated'
  | 'metadata-changed';

interface PolicyDiffItem {
  market: string;
  type: PolicyDiffType;
  docId?: string;
  field?: string;
  before?: any;
  after?: any;
}

@Component({
  selector: 'app-market-policy-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './market-policy-admin.component.html',
  styleUrls: ['./market-policy-admin.component.scss']
})
export class MarketPolicyAdminComponent implements OnInit {
  isLoading = false;
  isSavingRemote = false;
  configText = '';
  parseError: string | null = null;
  lastUpdatedAt: string | null = null;
  private remoteSnapshot: RemoteMarketPolicyConfig | null = null;
  private sessionSnapshot: RemoteMarketPolicyConfig | null = null;
  isConfirmVisible = false;
  confirmMode: 'apply' | 'save' = 'apply';
  pendingDiff: PolicyDiffItem[] = [];
  pendingConfig: RemoteMarketPolicyConfig | null = null;


  readonly markets: Array<{ value: PolicyMarket; label: string }> = [
    { value: 'aguascalientes', label: 'Aguascalientes' },
    { value: 'edomex', label: 'EdoMex' },
    { value: 'otros', label: 'Otros' },
  ];

  readonly clientTypes: Array<{ value: PolicyClientType; label: string }> = [
    { value: 'individual', label: 'Individual' },
    { value: 'colectivo', label: 'Colectivo' },
  ];

  readonly saleTypes: Array<{ value: 'contado' | 'financiero'; label: string }> = [
    { value: 'contado', label: 'Contado' },
    { value: 'financiero', label: 'Financiero' },
  ];

  readonly market = signal<PolicyMarket>('aguascalientes');
  readonly clientType = signal<PolicyClientType>('individual');
  readonly saleType = signal<'contado' | 'financiero'>('financiero');

  readonly previewContext = computed<MarketPolicyContext>(() => ({
    market: this.market(),
    clientType: this.clientType(),
    saleType: this.saleType(),
    businessFlow: BusinessFlow.VentaPlazo,
    requiresIncomeProof: this.saleType() === 'financiero',
  }));

  readonly previewPolicy = computed(() => this.marketPolicy.getPolicyDocuments(this.previewContext()));
  readonly previewDocuments = computed(() => this.marketPolicy.toDocuments(this.previewPolicy()));
  readonly previewMetadata = computed<MarketPolicyMetadata>(() => this.marketPolicy.getPolicyMetadata(this.previewContext()));

  constructor(
    private readonly marketPolicy: MarketPolicyService,
    private readonly toast: ToastService,
    private readonly monitoring: MonitoringService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadRemoteConfig();
  }

  async loadRemoteConfig(): Promise<void> {
    this.isLoading = true;
    this.parseError = null;
    try {
      await this.marketPolicy.reloadRemotePolicies();
      const snapshot = this.marketPolicy.getRemoteConfigSnapshot();
      this.hydrateConfigText(snapshot);
      this.remoteSnapshot = this.cloneConfig(snapshot);
      this.sessionSnapshot = this.cloneConfig(snapshot);
      this.lastUpdatedAt = new Date().toISOString();
      this.toast.info('Políticas remotas sincronizadas.');
      this.monitoring.auditEvent('qa_market_policy_synced', {
        action: 'reload',
        markets: snapshot ? Object.keys(snapshot) : []
      });
    } catch (error) {
      this.parseError = 'No se pudo obtener la configuración remota. Se muestra la sesión actual.';
      const fallback = this.marketPolicy.getRemoteConfigSnapshot();
      this.hydrateConfigText(fallback);
      this.sessionSnapshot = this.cloneConfig(fallback);
    } finally {
      this.isLoading = false;
    }
  }

  applyChanges(): void {
    const parsed = this.parseConfigText();
    if (!parsed) {
      return;
    }

    const base = this.sessionSnapshot ?? this.remoteSnapshot;
    const diff = this.computePolicyDiff(base, parsed);
    if (!diff.length) {
      this.executeApply(parsed, diff);
      return;
    }

    this.openConfirm('apply', parsed, diff);
  }

  async persistChanges(): Promise<void> {
    const parsed = this.parseConfigText();
    if (!parsed || this.isSavingRemote) {
      return;
    }

    const diff = this.computePolicyDiff(this.remoteSnapshot, parsed);
    if (!diff.length) {
      await this.executeSave(parsed, diff);
      return;
    }

    this.openConfirm('save', parsed, diff);
  }

  updateMarket(value: PolicyMarket): void {
    this.market.set(value);
  }

  updateClientType(value: PolicyClientType): void {
    this.clientType.set(value);
  }

  updateSaleType(value: 'contado' | 'financiero'): void {
    this.saleType.set(value);
  }

  async confirmPendingAction(): Promise<void> {
    if (!this.pendingConfig) {
      this.cancelPendingAction();
      return;
    }

    const config = this.cloneConfig(this.pendingConfig);
    const diff = [...this.pendingDiff];
    const mode = this.confirmMode;

    this.isConfirmVisible = false;
    this.pendingConfig = null;
    this.pendingDiff = [];

    if (!config) {
      return;
    }

    if (mode === 'apply') {
      this.executeApply(config, diff);
    } else {
      await this.executeSave(config, diff);
    }
  }

  cancelPendingAction(): void {
    this.isConfirmVisible = false;
    this.pendingConfig = null;
    this.pendingDiff = [];
  }

  private openConfirm(mode: 'apply' | 'save', config: RemoteMarketPolicyConfig, diff: PolicyDiffItem[]): void {
    this.confirmMode = mode;
    this.pendingConfig = this.cloneConfig(config);
    this.pendingDiff = diff;
    this.isConfirmVisible = true;
  }

  private executeApply(config: RemoteMarketPolicyConfig, diff: PolicyDiffItem[]): void {
    try {
      this.marketPolicy.registerPoliciesFromRemoteConfig(config);
      this.sessionSnapshot = this.cloneConfig(config);
      this.hydrateConfigText(config);
      this.lastUpdatedAt = new Date().toISOString();
      this.toast.success('Políticas aplicadas para la sesión actual.');
      this.monitoring.auditEvent('qa_market_policy_applied_session', {
        action: 'apply_session',
        markets: Object.keys(config),
        diff,
      });
    } catch (error) {
      console.error('[MarketPolicyAdmin] executeApply failed', error);
      this.toast.error('No se pudieron aplicar las políticas en esta sesión.');
    }
  }

  private async executeSave(config: RemoteMarketPolicyConfig, diff: PolicyDiffItem[]): Promise<void> {
    if (this.isSavingRemote) {
      return;
    }

    this.isSavingRemote = true;
    try {
      await firstValueFrom(this.marketPolicy.savePoliciesToRemote(config));
      this.remoteSnapshot = this.cloneConfig(config);
      this.sessionSnapshot = this.cloneConfig(config);
      this.lastUpdatedAt = new Date().toISOString();
      this.toast.success('Políticas guardadas en el BFF.');
      this.monitoring.auditEvent('qa_market_policy_saved', {
        action: 'save_remote',
        markets: Object.keys(config),
        diff,
      });
    } catch (error) {
      console.error('[MarketPolicyAdmin] executeSave failed', error);
      this.toast.error('No se pudo guardar la configuración en el BFF.');
    } finally {
      this.isSavingRemote = false;
    }
  }

  private computePolicyDiff(
    baseConfig: RemoteMarketPolicyConfig | null,
    nextConfig: RemoteMarketPolicyConfig
  ): PolicyDiffItem[] {
    const diffs: PolicyDiffItem[] = [];
    const base = baseConfig ?? {};
    const markets = new Set<string>([...Object.keys(base), ...Object.keys(nextConfig)]);

    markets.forEach(market => {
      const baseEntry = base[market];
      const nextEntry = nextConfig[market];

      if (!baseEntry && nextEntry) {
        diffs.push({ market, type: 'market-added' });
        return;
      }

      if (baseEntry && !nextEntry) {
        diffs.push({ market, type: 'market-removed' });
        return;
      }

      if (!baseEntry || !nextEntry) {
        return;
      }

      const baseDocs = new Map(baseEntry.documents.map(doc => [doc.id, doc]));
      const nextDocs = new Map(nextEntry.documents.map(doc => [doc.id, doc]));

      nextDocs.forEach((doc, id) => {
        const previous = baseDocs.get(id);
        if (!previous) {
          diffs.push({ market, type: 'document-added', docId: id });
          return;
        }

        if (
          previous.label !== doc.label ||
          Boolean(previous.optional) !== Boolean(doc.optional) ||
          (previous.tooltip ?? '') !== (doc.tooltip ?? '')
        ) {
          diffs.push({ market, type: 'document-updated', docId: id });
        }
      });

      baseDocs.forEach((_doc, id) => {
        if (!nextDocs.has(id)) {
          diffs.push({ market, type: 'document-removed', docId: id });
        }
      });

      const baseMeta = baseEntry.metadata ?? ({} as MarketPolicyMetadata);
      const nextMeta = nextEntry.metadata ?? ({} as MarketPolicyMetadata);

      if ((baseMeta.ocrThreshold ?? null) !== (nextMeta.ocrThreshold ?? null)) {
        diffs.push({
          market,
          type: 'metadata-changed',
          field: 'ocrThreshold',
          before: baseMeta.ocrThreshold ?? null,
          after: nextMeta.ocrThreshold ?? null,
        });
      }

      const baseProtection = baseMeta.protection?.required ?? false;
      const nextProtection = nextMeta.protection?.required ?? false;
      if (baseProtection !== nextProtection) {
        diffs.push({
          market,
          type: 'metadata-changed',
          field: 'protection.required',
          before: baseProtection,
          after: nextProtection,
        });
      }

      const baseIncome = baseMeta.income?.threshold ?? null;
      const nextIncome = nextMeta.income?.threshold ?? null;
      if (baseIncome !== nextIncome) {
        diffs.push({
          market,
          type: 'metadata-changed',
          field: 'income.threshold',
          before: baseIncome,
          after: nextIncome,
        });
      }

      const baseTanda = baseMeta.tanda;
      const nextTanda = nextMeta.tanda;
      if (Boolean(baseTanda) !== Boolean(nextTanda)) {
        diffs.push({
          market,
          type: 'metadata-changed',
          field: 'tanda.enabled',
          before: Boolean(baseTanda),
          after: Boolean(nextTanda),
        });
      } else if (baseTanda && nextTanda) {
        if (baseTanda.minMembers !== nextTanda.minMembers) {
          diffs.push({
            market,
            type: 'metadata-changed',
            field: 'tanda.minMembers',
            before: baseTanda.minMembers,
            after: nextTanda.minMembers,
          });
        }
        if (baseTanda.maxMembers !== nextTanda.maxMembers) {
          diffs.push({
            market,
            type: 'metadata-changed',
            field: 'tanda.maxMembers',
            before: baseTanda.maxMembers,
            after: nextTanda.maxMembers,
          });
        }
      }
    });

    return diffs;
  }

  private cloneConfig(config: RemoteMarketPolicyConfig | null): RemoteMarketPolicyConfig | null {
    return config ? JSON.parse(JSON.stringify(config)) : null;
  }

  formatDiff(diff: PolicyDiffItem): string {
    switch (diff.type) {
      case 'market-added':
        return `Mercado ${diff.market}: agregado.`;
      case 'market-removed':
        return `Mercado ${diff.market}: eliminado.`;
      case 'document-added':
        return `Mercado ${diff.market}: documento ${diff.docId} agregado.`;
      case 'document-removed':
        return `Mercado ${diff.market}: documento ${diff.docId} eliminado.`;
      case 'document-updated':
        return `Mercado ${diff.market}: documento ${diff.docId} actualizado.`;
      case 'metadata-changed':
        return `Mercado ${diff.market}: ${diff.field} ${diff.before ?? '—'} → ${diff.after ?? '—'}.`;
      default:
        return `Mercado ${diff.market}: cambio.`;
    }
  }

  private parseConfigText(): RemoteMarketPolicyConfig | null {
    this.parseError = null;

    try {
      const parsed = JSON.parse(this.configText || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.parseError = 'La estructura debe ser un objeto con políticas por clave.';
        return null;
      }
      return parsed as RemoteMarketPolicyConfig;
    } catch (error) {
      this.parseError = 'El JSON de políticas no es válido. Revisa comas y llaves.';
      return null;
    }
  }

  private hydrateConfigText(config: RemoteMarketPolicyConfig | null): void {
    const snapshot = config ?? {};
    const text = JSON.stringify(snapshot, null, 2);
    this.configText = text;
    this.sessionSnapshot = this.cloneConfig(config);
  }
}
