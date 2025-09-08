import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface EcosystemUI {
  id: string;
  name: string;
  description: string;
  icon: string;
  activeClients: number;
  avgSavings: number; // percentage
}

@Injectable({ providedIn: 'root' })
export class EcosystemUiService {
  getEcosystemsForMarket(market: string): Observable<EcosystemUI[]> {
    // Mocked data for now; replace with API call later
    const base: EcosystemUI[] = [
      {
        id: 'centro',
        name: 'Centro Histórico',
        description: 'Zona céntrica con alta actividad comercial',
        icon: '🏛️',
        activeClients: 45,
        avgSavings: 85
      },
      {
        id: 'industrial',
        name: 'Zona Industrial',
        description: 'Área industrial con empresas manufactureras',
        icon: '🏭',
        activeClients: 32,
        avgSavings: 78
      },
      {
        id: 'residencial',
        name: 'Zona Residencial',
        description: 'Área residencial con familias trabajadoras',
        icon: '🏘️',
        activeClients: 28,
        avgSavings: 92
      }
    ];

    // For demo purposes, return the same list regardless of market
    return of(base).pipe(delay(300));
  }
}

