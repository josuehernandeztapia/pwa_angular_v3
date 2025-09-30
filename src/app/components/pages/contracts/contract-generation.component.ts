import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { FlowContextService } from '../../../services/flow-context.service';
import { ContractContextSnapshot } from '../../../models/contract-context';

@Component({
  selector: 'app-contract-generation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="contract-generation">
      <h1>Generación de Contratos</h1>
      <p class="contract-generation__caption">
        Revisa el resumen antes de formalizar el contrato.
      </p>

      <article class="contract-generation__summary" *ngIf="context as ctx">
        <p><strong>Cliente:</strong> {{ ctx.clientId || 'No definido' }}</p>
        <p><strong>Documentos completos:</strong> {{ ctx.documentsComplete ? 'Sí' : 'Pendiente' }}</p>
        <p><strong>Protección aplicada:</strong> {{ ctx.protectionRequired ? (ctx.protectionApplied ? 'Sí' : 'No') : 'No requerida' }}</p>
        <p><strong>Pendientes offline:</strong> {{ ctx.pendingOfflineRequests }}</p>
      </article>

      <p *ngIf="!context" class="contract-generation__placeholder">
        No se encontró contexto de contrato. Regresa a Documentos para completar los pasos previos.
      </p>
    </section>
  `,
  styles: [
    `
      .contract-generation {
        display: grid;
        gap: 1rem;
        max-width: 640px;
        margin: 2rem auto;
        padding: 1.5rem;
        border-radius: 12px;
        background: var(--surface-dark, #1f2937);
        color: var(--text-light, #f9fafb);
      }
      .contract-generation__summary {
        border: 1px solid var(--border-dark, #374151);
        border-radius: 8px;
        padding: 1rem;
        background: var(--bg-dark, #111827);
      }
      .contract-generation__caption {
        margin: 0;
        color: var(--text-2, #d1d5db);
      }
      .contract-generation__placeholder {
        color: var(--warning-foreground, #f97316);
      }
    `
  ]
})
export class ContractGenerationComponent {
  context: ContractContextSnapshot | null;

  constructor(flowContext: FlowContextService) {
    this.context = flowContext.getContextData<ContractContextSnapshot>('contract');
  }
}
