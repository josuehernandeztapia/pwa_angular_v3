import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { StockPosition, StockAlert, Market } from '../models/deliveries';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private http = inject(HttpClient);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';

  /**
   * Get current stock position for market and SKU
   */
  getPosition(market: Market, sku: string): Observable<StockPosition> {
    const params = { market, sku };
    return this.http.get<StockPosition>(`${this.baseUrl}/v1/stock/position`, { params })
      .pipe(
        catchError(this.handleError('get stock position'))
      );
  }

  /**
   * Get all stock positions for market
   */
  getAllPositions(market: Market): Observable<StockPosition[]> {
    const params = { market };
    return this.http.get<StockPosition[]>(`${this.baseUrl}/v1/stock/positions`, { params })
      .pipe(
        catchError(this.handleError('get all stock positions'))
      );
  }

  /**
   * Get stock alerts (reorder needed, stock out, etc.)
   */
  getAlerts(market?: Market): Observable<StockAlert[]> {
    const params: any = {};
    if (market) params.market = market;
    
    return this.http.get<StockAlert[]>(`${this.baseUrl}/v1/stock/alerts`, { params })
      .pipe(
        catchError(this.handleError('get stock alerts'))
      );
  }

  /**
   * Recompute stock forecast based on prospect pipeline
   * Triggers predictive stock analysis from Odoo + PWA data
   */
  recomputeForecast(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/v1/stock/forecast/recompute`, {})
      .pipe(
        catchError(this.handleError('recompute forecast'))
      );
  }

  /**
   * Update stock position manually (for ops)
   */
  updatePosition(market: Market, sku: string, updates: Partial<StockPosition>): Observable<StockPosition> {
    return this.http.patch<StockPosition>(`${this.baseUrl}/v1/stock/position/${market}/${sku}`, updates)
      .pipe(
        catchError(this.handleError('update stock position'))
      );
  }

  /**
   * Resolve stock alert
   */
  resolveAlert(alertId: string, resolution: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/v1/stock/alerts/${alertId}/resolve`, {
      resolution
    })
      .pipe(
        catchError(this.handleError('resolve stock alert'))
      );
  }

  /**
   * Get stock summary for dashboard
   */
  getSummary(market?: Market): Observable<{
    totalOnHand: number;
    totalOnOrder: number;
    alertsCount: number;
    reorderNeeded: number;
    stockValue: number;
    turnoverRate: number;
  }> {
    const params: any = {};
    if (market) params.market = market;
    
    return this.http.get<any>(`${this.baseUrl}/v1/stock/summary`, { params })
      .pipe(
        catchError(this.handleError('get stock summary'))
      );
  }

  /**
   * Generic error handler
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
// removed by clean-audit
      
      let userMessage = 'Error en el servicio de inventario';
      
      if (error.status === 404) {
        userMessage = 'Información de stock no encontrada';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para gestionar inventario';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud inválida';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor. Intenta más tarde';
      }

      return throwError(() => ({
        operation,
        originalError: error,
        userMessage,
        timestamp: new Date().toISOString()
      }));
    };
  }
}
// removed by clean-audit