import { Injectable } from '@angular/core';

export interface PlateValidationResult {
  isValid: boolean;
  estado?: string;
  normalizedPlaca?: string;
}

@Injectable({ providedIn: 'root' })
export class PlatesValidationService {
  normalizeVin(vin: string): string {
    if (!vin) return '';
    return vin.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  normalizePlaca(placa: string): string {
    if (!placa) return '';
    return placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  buildUniqueId(vin: string, placa: string): string {
    const v = this.normalizeVin(vin);
    const p = this.normalizePlaca(placa);
    return v && p ? `${v}+${p}` : '';
  }

  validatePlacaFormat(placaInput: string): boolean {
    const value = this.normalizePlaca(placaInput);
    const patterns: RegExp[] = [
      /^[A-Z]{3}\d{3}[A-Z]$/,
      /^[A-Z]{3}\d{4}$/,
      /^[A-Z]{2}\d{3}[A-Z]{2}$/,
      /^[A-Z]{3}\d{2}\d{2}$/
    ];
    return patterns.some(p => p.test(value));
  }

  async verifyPlacaAsync(placaInput: string): Promise<PlateValidationResult> {
    const normalized = this.normalizePlaca(placaInput);
    if (!this.validatePlacaFormat(normalized)) {
      return { isValid: false, normalizedPlaca: normalized };
    }

    // Simulated async verification and crude state mapping by prefix
    const prefix = normalized.slice(0, 3);
    const stateMapping: { [key: string]: string } = {
      'ABC': 'CDMX', 'DEF': 'JALISCO', 'GHI': 'NUEVO_LEON',
      'JKL': 'QUERETARO', 'MNO': 'GUANAJUATO'
    };
    const estado = stateMapping[prefix] || 'MEXICO';

    await new Promise(res => setTimeout(res, 400));
    return { isValid: true, estado, normalizedPlaca: normalized };
  }
}

