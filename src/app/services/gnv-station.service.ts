import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, interval } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { ConektaPaymentService } from './conekta-payment.service';
import { environment } from '../../environments/environment';

interface GNVStation {
  id: string;
  name: string;
  location: {
    address: string;
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  current_price_per_m3: number; // precio actual por metro cúbico
  price_history: PriceHistory[];
  operating_hours: {
    open: string;
    close: string;
    days: string[];
  };
  services: string[];
  contact: {
    phone: string;
    email?: string;
  };
  capacity: {
    total_m3: number;
    available_m3: number;
    pressure_bar: number;
  };
  last_updated: string;
}

interface PriceHistory {
  timestamp: string;
  price_per_m3: number;
  volume_available: number;
}

interface VehicleConsumption {
  vehicle_id: string;
  driver_id: string;
  station_id: string;
  timestamp: string;
  volume_m3: number;
  unit_price: number;
  total_cost: number;
  odometer_reading: number;
  tank_level_before: number;
  tank_level_after: number;
  transaction_id: string;
  payment_method: 'credit' | 'cash' | 'fleet_card';
}

interface MonthlyConsumptionReport {
  driver_id: string;
  vehicle_id: string;
  month: string; // YYYY-MM
  total_volume_m3: number;
  total_cost: number;
  average_price_per_m3: number;
  total_km_driven: number;
  efficiency_m3_per_100km: number;
  transactions: VehicleConsumption[];
  overage_cost: number; // sobreprecio por exceso
  base_allowance: number; // allowance incluido en plan
  overage_rate: number; // tarifa por exceso
}

interface DriverFuelPlan {
  driver_id: string;
  plan_type: 'unlimited' | 'capped' | 'pay_per_use';
  monthly_allowance_m3: number;
  monthly_fee: number;
  overage_rate_per_m3: number;
  included_stations: string[];
  discount_percentage: number;
  billing_date: number; // día del mes (1-28)
  auto_payment: boolean;
  payment_method_id?: string;
}

interface RealTimeFuelData {
  vehicle_id: string;
  current_location: {
    lat: number;
    lng: number;
  };
  current_tank_level: number; // percentage
  estimated_range_km: number;
  nearest_stations: GNVStation[];
  recommended_station: GNVStation;
  estimated_cost_to_fill: number;
  last_refuel: {
    station_id: string;
    timestamp: string;
    volume_m3: number;
    cost: number;
  };
}

interface MonthlyBilling {
  driver_id: string;
  billing_period: string; // YYYY-MM
  base_fee: number;
  fuel_allowance_used: number;
  overage_volume: number;
  overage_cost: number;
  total_amount: number;
  due_date: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_link?: string;
  payment_reference?: string;
  transactions_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class GnvStationService {
  private readonly baseUrl = `${environment.apiUrl}/gnv`;
  
  constructor(
    private http: HttpClient,
    private conekta: ConektaPaymentService
  ) {
    // Iniciar polling de precios cada 5 minutos
    this.startPricePolling();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // Real-time Station Data
  getAllStations(state?: string): Observable<GNVStation[]> {
    let url = `${this.baseUrl}/stations`;
    if (state) {
      url += `?state=${state}`;
    }

    return this.http.get<{ data: GNVStation[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => of(this.getMockStations(state)))
    );
  }

  getStationById(stationId: string): Observable<GNVStation> {
    return this.http.get<GNVStation>(`${this.baseUrl}/stations/${stationId}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => {
        const mockStations = this.getMockStations();
        return of(mockStations.find(s => s.id === stationId) || mockStations[0]);
      })
    );
  }

  getCurrentPrices(stationIds?: string[]): Observable<{ station_id: string; current_price: number; timestamp: string }[]> {
    let url = `${this.baseUrl}/stations/prices`;
    if (stationIds) {
      url += `?stations=${stationIds.join(',')}`;
    }

    return this.http.get<{ data: any[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => {
        return of(this.getMockCurrentPrices(stationIds));
      })
    );
  }

  private startPricePolling(): void {
    interval(5 * 60 * 1000) // 5 minutos
      .pipe(
        switchMap(() => this.getCurrentPrices())
      )
      .subscribe({
        next: (prices) => {
          // Store prices in local storage for offline access
          localStorage.setItem('gnv_current_prices', JSON.stringify({
            data: prices,
            timestamp: Date.now()
          }));
        },
        error: (error) => console.error('Price polling error:', error)
      });
  }

  // Vehicle Consumption Tracking
  recordConsumption(consumptionData: Omit<VehicleConsumption, 'transaction_id'>): Observable<VehicleConsumption> {
    const data = {
      ...consumptionData,
      transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return this.http.post<VehicleConsumption>(`${this.baseUrl}/consumption`, data, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError((error) => {
        // Store locally for offline sync
        this.storeOfflineConsumption(data as VehicleConsumption);
        return throwError(() => error);
      })
    );
  }

  getVehicleConsumption(vehicleId: string, startDate: string, endDate: string): Observable<VehicleConsumption[]> {
    const url = `${this.baseUrl}/consumption/${vehicleId}?start=${startDate}&end=${endDate}`;

    return this.http.get<{ data: VehicleConsumption[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => of(this.getMockConsumption(vehicleId, startDate, endDate)))
    );
  }

  getDriverConsumption(driverId: string, month: string): Observable<VehicleConsumption[]> {
    const url = `${this.baseUrl}/drivers/${driverId}/consumption?month=${month}`;

    return this.http.get<{ data: VehicleConsumption[] }>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => of(this.getMockDriverConsumption(driverId, month)))
    );
  }

  // Real-time Vehicle Data
  getRealTimeFuelData(vehicleId: string): Observable<RealTimeFuelData> {
    return this.http.get<RealTimeFuelData>(`${this.baseUrl}/vehicles/${vehicleId}/fuel-status`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.getMockRealTimeFuelData(vehicleId)))
    );
  }

  // Fuel Plans Management
  getDriverFuelPlan(driverId: string): Observable<DriverFuelPlan> {
    return this.http.get<DriverFuelPlan>(`${this.baseUrl}/drivers/${driverId}/fuel-plan`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.getMockDriverFuelPlan(driverId)))
    );
  }

  updateDriverFuelPlan(driverId: string, planData: Partial<DriverFuelPlan>): Observable<DriverFuelPlan> {
    return this.http.put<DriverFuelPlan>(`${this.baseUrl}/drivers/${driverId}/fuel-plan`, planData, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => throwError(() => new Error('Failed to update fuel plan')))
    );
  }

  // Monthly Billing & Overage Calculation
  calculateMonthlyBilling(driverId: string, month: string): Observable<MonthlyBilling> {
    return this.http.get<MonthlyBilling>(`${this.baseUrl}/billing/${driverId}/${month}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => of(this.calculateMockMonthlyBilling(driverId, month)))
    );
  }

  generatePaymentLink(driverId: string, billingPeriod: string): Observable<{ payment_link: string; reference: string }> {
    return this.calculateMonthlyBilling(driverId, billingPeriod).pipe(
      switchMap((billing) => {
        if (billing.total_amount <= 0) {
          return of({ payment_link: '', reference: 'NO_CHARGE' });
        }

        // Get driver info for payment
        return this.getDriverInfo(driverId).pipe(
          switchMap((driver) => {
            return this.conekta.createPaymentLink({
              amount: Math.round(billing.total_amount * 100), // cents
              currency: 'MXN',
              description: `Facturación GNV ${billingPeriod} - ${driver.name}`,
              customer: {
                name: driver.name,
                email: driver.email,
                phone: driver.phone
              },
              payment_method: { type: 'cash', cash: { type: 'oxxo' } },
              metadata: {
                driver_id: driverId,
                billing_period: billingPeriod,
                payment_type: 'gnv_overage'
              }
            }).pipe(
              map((payment) => ({
                payment_link: payment.checkout?.url || '',
                reference: payment.id
              }))
            );
          })
        );
      })
    );
  }

  // Helper Methods
  private getDriverInfo(driverId: string): Observable<{ name: string; email: string; phone: string }> {
    // This would typically come from the main backend API
    return of({
      name: `Conductor ${driverId}`,
      email: `conductor${driverId}@conductores.com`,
      phone: '+52 55 1234 5678'
    });
  }

  private storeOfflineConsumption(consumption: VehicleConsumption): void {
    const stored = localStorage.getItem('offline_gnv_consumption') || '[]';
    const offlineData = JSON.parse(stored);
    offlineData.push(consumption);
    localStorage.setItem('offline_gnv_consumption', JSON.stringify(offlineData));
  }

  // Business Logic
  calculateOverageCost(consumption: VehicleConsumption[], fuelPlan: DriverFuelPlan): number {
    const totalVolume = consumption.reduce((sum, c) => sum + c.volume_m3, 0);
    const overage = Math.max(0, totalVolume - fuelPlan.monthly_allowance_m3);
    return overage * fuelPlan.overage_rate_per_m3;
  }

  findNearestStations(lat: number, lng: number, maxDistance: number = 10): Observable<GNVStation[]> {
    return this.getAllStations().pipe(
      map(stations => {
        return stations
          .map(station => {
            const distance = this.calculateDistance(
              lat, lng,
              station.location.coordinates.lat,
              station.location.coordinates.lng
            );
            return { ...station, distance };
          })
          .filter((station: any) => station.distance <= maxDistance)
          .sort((a: any, b: any) => a.distance - b.distance);
      })
    );
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Mock Data
  private getMockStations(state?: string): GNVStation[] {
    const stations: GNVStation[] = [
      {
        id: 'gnv-ags-001',
        name: 'GNV Centro Aguascalientes',
        location: {
          address: 'Av. López Mateos 1234',
          city: 'Aguascalientes',
          state: 'AGS',
          coordinates: { lat: 21.8853, lng: -102.2916 }
        },
        current_price_per_m3: 14.50,
        price_history: [
          { timestamp: new Date().toISOString(), price_per_m3: 14.50, volume_available: 1500 }
        ],
        operating_hours: { open: '06:00', close: '22:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
        services: ['full_service', 'self_service', 'fleet_cards'],
        contact: { phone: '+52 449 123 4567' },
        capacity: { total_m3: 2000, available_m3: 1500, pressure_bar: 200 },
        last_updated: new Date().toISOString()
      },
      {
        id: 'gnv-em-001',
        name: 'GNV Ecatepec',
        location: {
          address: 'Av. Central 567',
          city: 'Ecatepec',
          state: 'EDOMEX',
          coordinates: { lat: 19.6011, lng: -99.0608 }
        },
        current_price_per_m3: 15.20,
        price_history: [
          { timestamp: new Date().toISOString(), price_per_m3: 15.20, volume_available: 2800 }
        ],
        operating_hours: { open: '05:00', close: '23:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
        services: ['full_service', 'self_service', 'fleet_cards', '24h_emergency'],
        contact: { phone: '+52 55 987 6543' },
        capacity: { total_m3: 3500, available_m3: 2800, pressure_bar: 200 },
        last_updated: new Date().toISOString()
      }
    ];

    return state ? stations.filter(s => s.location.state === state) : stations;
  }

  private getMockCurrentPrices(stationIds?: string[]): { station_id: string; current_price: number; timestamp: string }[] {
    const allPrices = [
      { station_id: 'gnv-ags-001', current_price: 14.50, timestamp: new Date().toISOString() },
      { station_id: 'gnv-em-001', current_price: 15.20, timestamp: new Date().toISOString() }
    ];

    return stationIds ? allPrices.filter(p => stationIds.includes(p.station_id)) : allPrices;
  }

  private getMockConsumption(vehicleId: string, startDate: string, endDate: string): VehicleConsumption[] {
    return [
      {
        vehicle_id: vehicleId,
        driver_id: 'driver-001',
        station_id: 'gnv-ags-001',
        timestamp: new Date().toISOString(),
        volume_m3: 12.5,
        unit_price: 14.50,
        total_cost: 181.25,
        odometer_reading: 125430,
        tank_level_before: 25,
        tank_level_after: 95,
        transaction_id: 'txn_mock_001',
        payment_method: 'fleet_card'
      }
    ];
  }

  private getMockDriverConsumption(driverId: string, month: string): VehicleConsumption[] {
    return this.getMockConsumption('vehicle-001', month + '-01', month + '-31');
  }

  private getMockRealTimeFuelData(vehicleId: string): RealTimeFuelData {
    const mockStations = this.getMockStations();
    return {
      vehicle_id: vehicleId,
      current_location: { lat: 21.8853, lng: -102.2916 },
      current_tank_level: 35,
      estimated_range_km: 180,
      nearest_stations: mockStations,
      recommended_station: mockStations[0],
      estimated_cost_to_fill: 290.00,
      last_refuel: {
        station_id: 'gnv-ags-001',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        volume_m3: 18.5,
        cost: 268.25
      }
    };
  }

  private getMockDriverFuelPlan(driverId: string): DriverFuelPlan {
    return {
      driver_id: driverId,
      plan_type: 'capped',
      monthly_allowance_m3: 80,
      monthly_fee: 500,
      overage_rate_per_m3: 16.50,
      included_stations: ['gnv-ags-001', 'gnv-em-001'],
      discount_percentage: 5,
      billing_date: 5,
      auto_payment: true
    };
  }

  private calculateMockMonthlyBilling(driverId: string, month: string): MonthlyBilling {
    const consumption = this.getMockDriverConsumption(driverId, month);
    const plan = this.getMockDriverFuelPlan(driverId);
    
    const totalVolume = consumption.reduce((sum, c) => sum + c.volume_m3, 0);
    const overageVolume = Math.max(0, totalVolume - plan.monthly_allowance_m3);
    const overageCost = overageVolume * plan.overage_rate_per_m3;
    const totalAmount = plan.monthly_fee + overageCost;

    return {
      driver_id: driverId,
      billing_period: month,
      base_fee: plan.monthly_fee,
      fuel_allowance_used: Math.min(totalVolume, plan.monthly_allowance_m3),
      overage_volume: overageVolume,
      overage_cost: overageCost,
      total_amount: totalAmount,
      due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, plan.billing_date).toISOString(),
      payment_status: 'pending',
      transactions_count: consumption.length
    };
  }
}