import { Injectable } from '@angular/core';
import { BusinessFlow, Document, DocumentStatus } from '../models/types';

export interface DocumentHint {
  text: string;
  isCritical: boolean;
  isOptional: boolean;
  unlocks?: 'KYC' | 'Contrato';
  expiry?: { level: 'ok' | 'warning' | 'expired'; text: string } | null;
}

@Injectable({ providedIn: 'root' })
export class TooltipService {
  getDocumentHint(params: {
    market: 'aguascalientes' | 'edomex';
    flow: BusinessFlow;
    doc: Document;
  }): DocumentHint {
    const { market, flow, doc } = params;
    const name = (doc.name || '').toLowerCase();

    // Opcional si el nombre lo indica
    const isOptional = name.includes('opcional');

    // Críticos por flujo (desbloquean KYC/Contrato)
    const isFinancingFlow = flow !== BusinessFlow.VentaDirecta;
    if (isFinancingFlow && (name === 'ine vigente' || name === 'comprobante de domicilio')) {
      return {
        text: 'Prerrequisito para iniciar KYC biométrico.',
        isCritical: true,
        isOptional: false,
        unlocks: 'KYC',
        expiry: null
      };
    }

    if (isFinancingFlow && name.includes('verificación biométrica')) {
      return {
        text: 'KYC biométrico. Requerido para pasar a contrato.',
        isCritical: true,
        isOptional: false,
        unlocks: 'Contrato',
        expiry: null
      };
    }

    // EdoMex: críticos de agremiado
    if (market === 'edomex' && name.includes('carta aval')) {
      return {
        text: 'Documento crítico de ecosistema. Valida agremiado en ruta.',
        isCritical: true,
        isOptional: false,
        unlocks: undefined,
        expiry: this.computeExpiry(doc, 180)
      };
    }

    if (market === 'edomex' && name.includes('carta de antigüedad')) {
      return {
        text: 'Documento crítico. Acredita antigüedad en la ruta.',
        isCritical: true,
        isOptional: false,
        unlocks: undefined,
        expiry: this.computeExpiry(doc, 90)
      };
    }

    // Ecosistema/Ruta EdoMex (obligatorios)
    if (market === 'edomex' && (
      name.includes('acta constitutiva') ||
      name.includes('poderes') ||
      name.includes('ine representante') ||
      name.includes('constancia situación fiscal ruta')
    )) {
      return {
        text: 'Documento obligatorio del ecosistema/ruta.',
        isCritical: false,
        isOptional: false,
        unlocks: undefined,
        expiry: null
      };
    }

    // Defaults conocidos
    if (name.includes('tarjeta de circulación')) {
      return {
        text: 'Identifica la unidad. Obligatorio en varios flujos.',
        isCritical: false,
        isOptional: false,
        unlocks: undefined,
        expiry: null
      };
    }

    if (name.includes('copia de la factura')) {
      return {
        text: 'Documento adicional. Útil para validar propiedad del vehículo.',
        isCritical: false,
        isOptional: true,
        unlocks: undefined,
        expiry: null
      };
    }

    // Fallback
    return {
      text: isOptional ? 'Documento opcional.' : 'Documento requerido para completar expediente.',
      isCritical: false,
      isOptional,
      unlocks: undefined,
      expiry: null
    };
  }

  private computeExpiry(doc: Document, windowDays: number): { level: 'ok' | 'warning' | 'expired'; text: string } | null {
    const now = new Date();
    const anyDoc = doc as any;
    if (anyDoc?.expirationDate) {
      const exp = new Date(anyDoc.expirationDate);
      const diffDays = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return { level: 'expired', text: 'Vencido' };
      if (diffDays <= 14) return { level: 'warning', text: `Por expirar (${diffDays} días)` };
      return { level: 'ok', text: `Vigente (${diffDays} días)` };
    }
    if (anyDoc?.uploadedAt) {
      const uploaded = new Date(anyDoc.uploadedAt);
      const elapsed = Math.floor((now.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = windowDays - elapsed;
      if (remaining <= 0) return { level: 'expired', text: 'Vencido' };
      if (remaining <= 14) return { level: 'warning', text: `Por expirar (${remaining} días)` };
      return { level: 'ok', text: `Vigente (${remaining} días)` };
    }
    return null;
  }
}

