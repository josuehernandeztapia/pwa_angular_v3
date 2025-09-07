import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface PlateValidationResult {
  isValid: boolean;
  estado?: string;
  normalizedPlaca?: string;
  source?: 'local' | 'remote';
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PlatesValidationService {
  private http = inject(HttpClient);
  private baseUrl = (window as any)?.__BFF_BASE__ ?? '/api';

  // Centralized validators by estado (state)
  // Note: These are simplified representative patterns; expand as needed per official formats
  private estadoPatterns: Record<string, RegExp[]> = {
    'CDMX': [
      /^[A-Z]{3}\d{2}[A-Z]{2}$/,
      /^[A-Z]{3}\d{3}[A-Z]$/
    ],
    'MEXICO': [
      /^[A-Z]{3}\d{2}\d{2}$/,
      /^[A-Z]{2}\d{3}[A-Z]{2}$/
    ],
    'JALISCO': [
      /^[A-Z]{3}\d{4}$/
    ],
    'NUEVO_LEON': [
      /^[A-Z]{3}\d{3}[A-Z]$/
    ],
    'QUERETARO': [
      /^[A-Z]{3}\d{2}[A-Z]{2}$/
    ],
    'AGUASCALIENTES': [
      /^[A-Z]{3}\d{3}$/
    ]
  };

  private genericPatterns: RegExp[] = [
    /^[A-Z]{3}\d{3}[A-Z]$/,
    /^[A-Z]{3}\d{4}$/,
    /^[A-Z]{2}\d{3}[A-Z]{2}$/,
    /^[A-Z]{3}\d{4}$/
  ];
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

  validatePlacaFormat(placaInput: string, estado?: string): boolean {
    const value = this.normalizePlaca(placaInput);
    const patterns = estado && this.estadoPatterns[estado]
      ? this.estadoPatterns[estado]
      : this.genericPatterns;
    return patterns.some(p => p.test(value));
  }

  async verifyPlacaAsync(placaInput: string, estadoHint?: string): Promise<PlateValidationResult> {
    const normalized = this.normalizePlaca(placaInput);
    if (!this.validatePlacaFormat(normalized, estadoHint)) {
      return { isValid: false, normalizedPlaca: normalized, message: 'Formato inválido', source: 'local' };
    }

    // Try remote verification if endpoint available; fallback to local heuristic
    try {
      const params = new HttpParams().set('placa', normalized);
      const response: any = await this.http
        .get(`${this.baseUrl}/v1/plates/verify`, { params })
        .toPromise();

      if (response && typeof response.valid === 'boolean') {
        return {
          isValid: response.valid,
          estado: response.estado || estadoHint,
          normalizedPlaca: normalized,
          source: 'remote',
          message: response.message
        };
      }
    } catch (_e) {
      // no-op: fallback to local
    }

    // Local heuristic by prefix if remote not available
    const prefix = normalized.slice(0, 3);
    const stateMapping: { [key: string]: string } = {
      'ABC': 'CDMX', 'DEF': 'JALISCO', 'GHI': 'NUEVO_LEON',
      'JKL': 'QUERETARO', 'MNO': 'GUANAJUATO'
    };
    const estado = estadoHint || stateMapping[prefix] || 'MEXICO';

    // Validate again against selected state pattern
    const isValidForState = this.validatePlacaFormat(normalized, estado);
    await new Promise(res => setTimeout(res, 300));
    return { isValid: isValidForState, estado, normalizedPlaca: normalized, source: 'local' };
  }
}

