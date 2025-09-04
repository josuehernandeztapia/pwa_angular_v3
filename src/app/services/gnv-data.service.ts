import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface GNVConsumptionRecord {
  id?: string;
  driver_id: string;
  vehicle_id: string;
  station_id: string;
  station_name: string;
  timestamp: string;
  volume_leq: number; // Litros equivalentes cargados
  unit_price_per_leq: number; // Precio por litro equivalente
  total_cost: number;
  odometer_reading: number;
  transaction_reference: string; // Referencia de la estación
  receipt_number?: string;
  created_at?: string;
}

interface MonthlyConsumptionSummary {
  driver_id: string;
  month: string; // YYYY-MM
  total_volume_leq: number;
  total_cost: number;
  transaction_count: number;
  average_price_per_leq: number;
  first_charge_date: string;
  last_charge_date: string;
  stations_used: string[];
  overage_status?: 'pending' | 'calculated' | 'paid';
  overage_amount?: number;
  payment_link?: string;
  payment_status?: 'pending' | 'paid' | 'overdue';
}

interface GNVStation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  contact_phone?: string;
  active: boolean;
}

interface DriverGNVHistory {
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_info: {
    brand: string;
    model: string;
    year: number;
    plates: string;
  };
  total_consumption_leq: number;
  total_spent: number;
  months_active: number;
  average_monthly_consumption: number;
  preferred_stations: string[];
  last_charge: GNVConsumptionRecord;
}

@Injectable({
  providedIn: 'root'
})
export class GnvDataService {
  private readonly baseUrl = environment.apiUrl;
  // Use backend auth/session; no client API key

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // ===============================
  // CONSUMO - ALMACENAMIENTO
  // ===============================

  // Registrar nueva carga (llamado desde la estación o app externa)
  recordConsumption(consumptionData: Omit<GNVConsumptionRecord, 'id' | 'created_at'>): Observable<GNVConsumptionRecord> {
    return this.http.post<GNVConsumptionRecord>(`${this.baseUrl}/gnv/consumption`, consumptionData, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  // Obtener historial de consumo por conductor
  getDriverConsumption(driverId: string, startDate?: string, endDate?: string): Observable<GNVConsumptionRecord[]> {
    let url = `${this.baseUrl}/gnv/drivers/${driverId}/consumption`;
    
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    return this.http.get<{ data: GNVConsumptionRecord[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => of(this.getMockDriverConsumption(driverId)))
    );
  }

  // Obtener consumo mensual resumido
  getMonthlyConsumption(driverId: string, month: string): Observable<MonthlyConsumptionSummary> {
    return this.http.get<MonthlyConsumptionSummary>(`${this.baseUrl}/gnv/drivers/${driverId}/monthly/${month}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.getMockMonthlySummary(driverId, month)))
    );
  }

  // Obtener consumo por vehículo
  getVehicleConsumption(vehicleId: string, startDate?: string, endDate?: string): Observable<GNVConsumptionRecord[]> {
    let url = `${this.baseUrl}/gnv/vehicles/${vehicleId}/consumption`;
    
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    return this.http.get<{ data: GNVConsumptionRecord[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => of(this.getMockVehicleConsumption(vehicleId)))
    );
  }

  // ===============================
  // CONSULTAS GENERALES
  // ===============================

  // Obtener todas las estaciones GNV disponibles
  getGNVStations(state?: string): Observable<GNVStation[]> {
    let url = `${this.baseUrl}/gnv/stations`;
    if (state) url += `?state=${state}`;

    return this.http.get<{ data: GNVStation[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => of(this.getMockStations(state)))
    );
  }

  // Obtener información de una estación específica
  getStationInfo(stationId: string): Observable<GNVStation> {
    return this.http.get<GNVStation>(`${this.baseUrl}/gnv/stations/${stationId}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => {
        const mockStations = this.getMockStations();
        return of(mockStations.find(s => s.id === stationId) || mockStations[0]);
      })
    );
  }

  // Historial completo del conductor
  getDriverGNVHistory(driverId: string): Observable<DriverGNVHistory> {
    return this.http.get<DriverGNVHistory>(`${this.baseUrl}/gnv/drivers/${driverId}/history`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.getMockDriverHistory(driverId)))
    );
  }

  // ===============================
  // REPORTES Y ESTADÍSTICAS
  // ===============================

  // Reporte mensual por empresa/ecosistema
  getEcosystemGNVReport(ecosystemId: string, month: string): Observable<{
    ecosystem_id: string;
    month: string;
    total_drivers: number;
    total_consumption_leq: number;
    total_cost: number;
    average_consumption_per_driver: number;
    top_consuming_drivers: { driver_id: string; consumption_leq: number }[];
    most_used_stations: { station_id: string; usage_count: number }[];
  }> {
    return this.http.get(`${this.baseUrl}/gnv/ecosystems/${ecosystemId}/report/${month}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.getMockEcosystemReport(ecosystemId, month)))
    );
  }

  // Estadísticas generales para dashboard
  getGNVDashboardStats(): Observable<{
    total_active_drivers: number;
    total_monthly_consumption: number;
    total_monthly_cost: number;
    average_price_per_leq: number;
    top_stations: { station_name: string; consumption_leq: number }[];
    consumption_trend: { month: string; consumption_leq: number }[];
  }> {
    return this.http.get(`${this.baseUrl}/gnv/dashboard/stats`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.getMockDashboardStats()))
    );
  }

  // ===============================
  // BUSQUEDAS Y FILTROS
  // ===============================

  // Buscar consumos por filtros múltiples
  searchConsumption(filters: {
    driver_ids?: string[];
    vehicle_ids?: string[];
    station_ids?: string[];
    start_date?: string;
    end_date?: string;
    min_volume?: number;
    max_volume?: number;
    limit?: number;
    offset?: number;
  }): Observable<{
    data: GNVConsumptionRecord[];
    total: number;
    page: number;
    per_page: number;
  }> {
    return this.http.post(`${this.baseUrl}/gnv/consumption/search`, filters, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of({
        data: this.getMockSearchResults(),
        total: 10,
        page: 1,
        per_page: 50
      }))
    );
  }

  // ===============================
  // UTILIDADES
  // ===============================

  // Calcular eficiencia de consumo (LEQ por 100km)
  calculateFuelEfficiency(consumptions: GNVConsumptionRecord[]): number {
    if (consumptions.length < 2) return 0;

    const totalVolume = consumptions.reduce((sum, c) => sum + c.volume_leq, 0);
    const totalKm = consumptions[consumptions.length - 1].odometer_reading - consumptions[0].odometer_reading;
    
    return totalKm > 0 ? (totalVolume / totalKm) * 100 : 0;
  }

  // Encontrar estaciones más utilizadas por conductor
  getDriverPreferredStations(driverId: string): Observable<{ station_id: string; station_name: string; usage_count: number; percentage: number }[]> {
    return this.getDriverConsumption(driverId).pipe(
      map(consumptions => {
        const stationUsage = consumptions.reduce((acc, consumption) => {
          acc[consumption.station_id] = acc[consumption.station_id] || {
            station_id: consumption.station_id,
            station_name: consumption.station_name,
            usage_count: 0
          };
          acc[consumption.station_id].usage_count++;
          return acc;
        }, {} as any);

        const total = consumptions.length;
        return Object.values(stationUsage)
          .map((station: any) => ({
            ...station,
            percentage: (station.usage_count / total) * 100
          }))
          .sort((a: any, b: any) => b.usage_count - a.usage_count);
      })
    );
  }

  // Error handling
  private handleError(error: any) {
    console.error('GNV Data Service Error:', error);
    return throwError(() => new Error('Error accessing GNV data'));
  }

  // ===============================
  // MOCK DATA PARA DESARROLLO
  // ===============================

  private getMockDriverConsumption(driverId: string): GNVConsumptionRecord[] {
    return [
      {
        id: '1',
        driver_id: driverId,
        vehicle_id: 'vehicle-001',
        station_id: 'gnv-ags-001',
        station_name: 'GNV Centro Aguascalientes',
        timestamp: new Date().toISOString(),
        volume_leq: 25.5,
        unit_price_per_leq: 14.50,
        total_cost: 369.75,
        odometer_reading: 125430,
        transaction_reference: 'TXN-AGS-20241201-001',
        receipt_number: 'REC-001234'
      },
      {
        id: '2',
        driver_id: driverId,
        vehicle_id: 'vehicle-001',
        station_id: 'gnv-ags-002',
        station_name: 'GNV Sur Aguascalientes',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        volume_leq: 30.0,
        unit_price_per_leq: 14.20,
        total_cost: 426.00,
        odometer_reading: 125180,
        transaction_reference: 'TXN-AGS-20241129-045'
      }
    ];
  }

  private getMockMonthlySummary(driverId: string, month: string): MonthlyConsumptionSummary {
    return {
      driver_id: driverId,
      month: month,
      total_volume_leq: 180.5,
      total_cost: 2567.25,
      transaction_count: 8,
      average_price_per_leq: 14.22,
      first_charge_date: `${month}-02T08:30:00Z`,
      last_charge_date: `${month}-28T16:45:00Z`,
      stations_used: ['gnv-ags-001', 'gnv-ags-002'],
      overage_status: 'pending',
      overage_amount: 245.50
    };
  }

  private getMockVehicleConsumption(vehicleId: string): GNVConsumptionRecord[] {
    return this.getMockDriverConsumption('driver-001');
  }

  private getMockStations(state?: string): GNVStation[] {
    const stations = [
      {
        id: 'gnv-ags-001',
        name: 'GNV Centro Aguascalientes',
        address: 'Av. López Mateos 1234',
        city: 'Aguascalientes',
        state: 'AGS',
        coordinates: { lat: 21.8853, lng: -102.2916 },
        contact_phone: '+52 449 123 4567',
        active: true
      },
      {
        id: 'gnv-em-001',
        name: 'GNV Ecatepec Norte',
        address: 'Av. Central 567',
        city: 'Ecatepec',
        state: 'EDOMEX',
        coordinates: { lat: 19.6011, lng: -99.0608 },
        contact_phone: '+52 55 987 6543',
        active: true
      }
    ];

    return state ? stations.filter(s => s.state === state) : stations;
  }

  private getMockDriverHistory(driverId: string): DriverGNVHistory {
    return {
      driver_id: driverId,
      driver_name: 'Juan Pérez',
      vehicle_id: 'vehicle-001',
      vehicle_info: {
        brand: 'Nissan',
        model: 'Urvan',
        year: 2022,
        plates: 'ABC-123-A'
      },
      total_consumption_leq: 2145.5,
      total_spent: 30467.25,
      months_active: 8,
      average_monthly_consumption: 268.2,
      preferred_stations: ['gnv-ags-001', 'gnv-ags-002'],
      last_charge: this.getMockDriverConsumption(driverId)[0]
    };
  }

  private getMockEcosystemReport(ecosystemId: string, month: string): any {
    return {
      ecosystem_id: ecosystemId,
      month: month,
      total_drivers: 12,
      total_consumption_leq: 3420.5,
      total_cost: 48567.25,
      average_consumption_per_driver: 285.04,
      top_consuming_drivers: [
        { driver_id: 'driver-001', consumption_leq: 425.5 },
        { driver_id: 'driver-002', consumption_leq: 398.2 }
      ],
      most_used_stations: [
        { station_id: 'gnv-ags-001', usage_count: 45 },
        { station_id: 'gnv-ags-002', usage_count: 32 }
      ]
    };
  }

  private getMockDashboardStats(): any {
    return {
      total_active_drivers: 156,
      total_monthly_consumption: 15420.5,
      total_monthly_cost: 219567.25,
      average_price_per_leq: 14.24,
      top_stations: [
        { station_name: 'GNV Centro AGS', consumption_leq: 2456.5 },
        { station_name: 'GNV Ecatepec Norte', consumption_leq: 1987.2 }
      ],
      consumption_trend: [
        { month: '2024-10', consumption_leq: 14567.5 },
        { month: '2024-11', consumption_leq: 15420.5 }
      ]
    };
  }

  private getMockSearchResults(): GNVConsumptionRecord[] {
    return this.getMockDriverConsumption('driver-001');
  }
}