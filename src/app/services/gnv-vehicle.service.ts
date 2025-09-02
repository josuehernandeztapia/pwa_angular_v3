import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

interface VehicleModel {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: 'microbus' | 'combi' | 'van' | 'truck';
  capacity: number; // passenger capacity
  fuel_type: 'gasoline' | 'diesel' | 'gnv' | 'hybrid';
  transmission: 'manual' | 'automatic';
  engine_size: string;
  price_range: {
    min: number;
    max: number;
    currency: 'MXN';
  };
  financing_available: boolean;
  gnv_compatible: boolean;
  gnv_conversion_cost?: number;
  specifications: {
    length: number; // meters
    width: number;
    height: number;
    weight: number; // kg
    fuel_tank_capacity: number; // liters
    gnv_tank_capacity?: number; // liters equivalent
  };
}

interface VehiclePrice {
  vehicle_id: string;
  base_price: number;
  gnv_conversion_price?: number;
  total_price: number;
  financing_options: FinancingOption[];
  last_updated: string;
}

interface FinancingOption {
  down_payment_percent: number;
  down_payment_amount: number;
  monthly_payment: number;
  term_months: number;
  interest_rate: number;
  total_interest: number;
  total_amount: number;
}

interface GNVConversion {
  id?: string;
  vehicle_id: string;
  conversion_type: 'basic' | 'premium' | 'commercial';
  tank_capacity: number; // liters equivalent
  installation_cost: number;
  certification_cost: number;
  total_cost: number;
  installation_time_days: number;
  warranty_months: number;
  annual_savings: number; // estimated fuel savings
  certified_installer: {
    name: string;
    location: string;
    phone: string;
    certification_number: string;
  };
}

interface VehicleAvailability {
  vehicle_id: string;
  dealer_id: string;
  dealer_name: string;
  location: string;
  stock_quantity: number;
  delivery_days: number;
  contact_info: {
    phone: string;
    email: string;
    address: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GnvVehicleService {
  private readonly baseUrl = 'https://api.gnv.com.mx/v1';
  private readonly apiKey = process.env['GNV_API_KEY'] || 'gnv_api_key_here';
  
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Vehicle Catalog
  getVehicleModels(filters?: {
    category?: string;
    brand?: string;
    year_min?: number;
    year_max?: number;
    price_max?: number;
    gnv_compatible?: boolean;
  }): Observable<VehicleModel[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<{ data: VehicleModel[] }>(`${this.baseUrl}/vehicles`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => {
        // Return mock data for development
        return of(this.getMockVehicleModels(filters));
      })
    );
  }

  getVehicleModel(vehicleId: string): Observable<VehicleModel> {
    return this.http.get<VehicleModel>(`${this.baseUrl}/vehicles/${vehicleId}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => {
        // Return mock data
        const mockModels = this.getMockVehicleModels();
        const found = mockModels.find(v => v.id === vehicleId);
        return of(found || mockModels[0]);
      })
    );
  }

  // Pricing
  getVehiclePrice(vehicleId: string, includeGnv: boolean = true): Observable<VehiclePrice> {
    const params = new HttpParams().set('include_gnv', includeGnv.toString());

    return this.http.get<VehiclePrice>(`${this.baseUrl}/vehicles/${vehicleId}/pricing`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      retry(2),
      catchError(() => {
        return of(this.getMockVehiclePrice(vehicleId, includeGnv));
      })
    );
  }

  calculateFinancing(vehicleId: string, downPaymentPercent: number, termMonths: number): Observable<FinancingOption> {
    const data = {
      vehicle_id: vehicleId,
      down_payment_percent: downPaymentPercent,
      term_months: termMonths
    };

    return this.http.post<FinancingOption>(`${this.baseUrl}/financing/calculate`, data, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => {
        return of(this.calculateMockFinancing(vehicleId, downPaymentPercent, termMonths));
      })
    );
  }

  // GNV Conversion
  getGnvConversionOptions(vehicleId: string): Observable<GNVConversion[]> {
    return this.http.get<{ data: GNVConversion[] }>(`${this.baseUrl}/vehicles/${vehicleId}/gnv-conversions`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => {
        return of(this.getMockGnvConversions(vehicleId));
      })
    );
  }

  requestGnvInstallation(conversionData: Omit<GNVConversion, 'id'>): Observable<{ installation_id: string; estimated_date: string }> {
    return this.http.post<{ installation_id: string; estimated_date: string }>(`${this.baseUrl}/gnv-conversions/request`, conversionData, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(() => {
        return of({
          installation_id: `install_${Date.now()}`,
          estimated_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks
        });
      })
    );
  }

  // Vehicle Availability
  getVehicleAvailability(vehicleId: string, location?: string): Observable<VehicleAvailability[]> {
    let params = new HttpParams();
    if (location) {
      params = params.set('location', location);
    }

    return this.http.get<{ data: VehicleAvailability[] }>(`${this.baseUrl}/vehicles/${vehicleId}/availability`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      map(response => response.data),
      retry(2),
      catchError(() => {
        return of(this.getMockAvailability(vehicleId, location));
      })
    );
  }

  // Business Logic Helpers
  getRecommendedVehiclesForRoute(routeType: 'AGS' | 'EDOMEX', capacity: number): Observable<VehicleModel[]> {
    const filters = {
      category: routeType === 'AGS' ? 'microbus' : 'combi',
      gnv_compatible: true
    };

    return this.getVehicleModels(filters).pipe(
      map(vehicles => vehicles.filter(v => v.capacity >= capacity)),
      map(vehicles => vehicles.sort((a, b) => 
        // Sort by price efficiency (price per passenger)
        (a.price_range.min / a.capacity) - (b.price_range.min / b.capacity)
      ))
    );
  }

  calculateTotalCost(vehicleId: string, includeGnv: boolean, downPaymentPercent: number, termMonths: number): Observable<{
    vehicle_price: number;
    gnv_conversion: number;
    down_payment: number;
    monthly_payment: number;
    total_financing_cost: number;
    total_cost: number;
    estimated_monthly_fuel_savings: number;
    roi_months: number;
  }> {
    return this.getVehiclePrice(vehicleId, includeGnv).pipe(
      map(pricing => {
        const totalPrice = pricing.total_price;
        const downPayment = totalPrice * (downPaymentPercent / 100);
        const financedAmount = totalPrice - downPayment;
        
        // Simple financing calculation (should use actual API rates)
        const monthlyRate = 0.08 / 12; // 8% annual rate
        const monthlyPayment = financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
        const totalFinancingCost = monthlyPayment * termMonths;
        
        // GNV savings calculation
        const monthlyKm = 8000; // Average for transport
        const gasConsumption = 12; // km per liter
        const gnvConsumption = 8; // km per liter equivalent
        const gasPrice = 24; // pesos per liter
        const gnvPrice = 14; // pesos per liter equivalent
        
        const monthlyGasCost = (monthlyKm / gasConsumption) * gasPrice;
        const monthlyGnvCost = (monthlyKm / gnvConsumption) * gnvPrice;
        const monthlyFuelSavings = monthlyGasCost - monthlyGnvCost;
        
        const gnvConversionCost = pricing.gnv_conversion_price || 0;
        const roiMonths = gnvConversionCost > 0 ? Math.ceil(gnvConversionCost / monthlyFuelSavings) : 0;

        return {
          vehicle_price: pricing.base_price,
          gnv_conversion: gnvConversionCost,
          down_payment: downPayment,
          monthly_payment: monthlyPayment,
          total_financing_cost: totalFinancingCost,
          total_cost: totalPrice + totalFinancingCost - totalPrice,
          estimated_monthly_fuel_savings: monthlyFuelSavings,
          roi_months: roiMonths
        };
      })
    );
  }

  // Mock Data for Development
  private getMockVehicleModels(filters?: any): VehicleModel[] {
    const mockModels: VehicleModel[] = [
      {
        id: 'nissan-urvan-2024',
        brand: 'Nissan',
        model: 'Urvan',
        year: 2024,
        category: 'microbus',
        capacity: 15,
        fuel_type: 'gasoline',
        transmission: 'manual',
        engine_size: '2.5L',
        price_range: { min: 580000, max: 650000, currency: 'MXN' },
        financing_available: true,
        gnv_compatible: true,
        gnv_conversion_cost: 35000,
        specifications: {
          length: 5.23,
          width: 1.69,
          height: 1.99,
          weight: 2100,
          fuel_tank_capacity: 65,
          gnv_tank_capacity: 80
        }
      },
      {
        id: 'ford-transit-2024',
        brand: 'Ford',
        model: 'Transit',
        year: 2024,
        category: 'combi',
        capacity: 20,
        fuel_type: 'gasoline',
        transmission: 'manual',
        engine_size: '2.2L',
        price_range: { min: 720000, max: 800000, currency: 'MXN' },
        financing_available: true,
        gnv_compatible: true,
        gnv_conversion_cost: 42000,
        specifications: {
          length: 5.98,
          width: 2.03,
          height: 2.28,
          weight: 2400,
          fuel_tank_capacity: 80,
          gnv_tank_capacity: 100
        }
      },
      {
        id: 'chevrolet-n300-2024',
        brand: 'Chevrolet',
        model: 'N300',
        year: 2024,
        category: 'van',
        capacity: 8,
        fuel_type: 'gasoline',
        transmission: 'manual',
        engine_size: '1.2L',
        price_range: { min: 280000, max: 320000, currency: 'MXN' },
        financing_available: true,
        gnv_compatible: true,
        gnv_conversion_cost: 25000,
        specifications: {
          length: 3.73,
          width: 1.62,
          height: 1.90,
          weight: 1200,
          fuel_tank_capacity: 45,
          gnv_tank_capacity: 50
        }
      }
    ];

    if (!filters) return mockModels;

    return mockModels.filter(model => {
      if (filters.category && model.category !== filters.category) return false;
      if (filters.brand && model.brand.toLowerCase() !== filters.brand.toLowerCase()) return false;
      if (filters.year_min && model.year < filters.year_min) return false;
      if (filters.year_max && model.year > filters.year_max) return false;
      if (filters.price_max && model.price_range.min > filters.price_max) return false;
      if (filters.gnv_compatible !== undefined && model.gnv_compatible !== filters.gnv_compatible) return false;
      return true;
    });
  }

  private getMockVehiclePrice(vehicleId: string, includeGnv: boolean): VehiclePrice {
    const mockModels = this.getMockVehicleModels();
    const vehicle = mockModels.find(v => v.id === vehicleId) || mockModels[0];
    
    const basePrice = vehicle.price_range.min;
    const gnvPrice = includeGnv ? (vehicle.gnv_conversion_cost || 0) : 0;
    const totalPrice = basePrice + gnvPrice;

    return {
      vehicle_id: vehicleId,
      base_price: basePrice,
      gnv_conversion_price: gnvPrice,
      total_price: totalPrice,
      financing_options: [
        this.calculateMockFinancing(vehicleId, 20, 48),
        this.calculateMockFinancing(vehicleId, 30, 36),
        this.calculateMockFinancing(vehicleId, 40, 24)
      ],
      last_updated: new Date().toISOString()
    };
  }

  private calculateMockFinancing(vehicleId: string, downPaymentPercent: number, termMonths: number): FinancingOption {
    const price = this.getMockVehiclePrice(vehicleId, true);
    const downPayment = price.total_price * (downPaymentPercent / 100);
    const financedAmount = price.total_price - downPayment;
    
    const annualRate = 0.08; // 8%
    const monthlyRate = annualRate / 12;
    const monthlyPayment = financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    const totalInterest = (monthlyPayment * termMonths) - financedAmount;

    return {
      down_payment_percent: downPaymentPercent,
      down_payment_amount: downPayment,
      monthly_payment: Math.round(monthlyPayment),
      term_months: termMonths,
      interest_rate: annualRate,
      total_interest: Math.round(totalInterest),
      total_amount: Math.round(downPayment + (monthlyPayment * termMonths))
    };
  }

  private getMockGnvConversions(vehicleId: string): GNVConversion[] {
    return [
      {
        vehicle_id: vehicleId,
        conversion_type: 'basic',
        tank_capacity: 60,
        installation_cost: 25000,
        certification_cost: 3000,
        total_cost: 28000,
        installation_time_days: 3,
        warranty_months: 12,
        annual_savings: 24000,
        certified_installer: {
          name: 'GNV Centro AGS',
          location: 'Aguascalientes, AGS',
          phone: '+52 449 123 4567',
          certification_number: 'GNV-AGS-001'
        }
      },
      {
        vehicle_id: vehicleId,
        conversion_type: 'premium',
        tank_capacity: 80,
        installation_cost: 35000,
        certification_cost: 3000,
        total_cost: 38000,
        installation_time_days: 5,
        warranty_months: 24,
        annual_savings: 32000,
        certified_installer: {
          name: 'GNV Premium EdoMex',
          location: 'Ecatepec, EdoMex',
          phone: '+52 55 987 6543',
          certification_number: 'GNV-EM-002'
        }
      }
    ];
  }

  private getMockAvailability(vehicleId: string, location?: string): VehicleAvailability[] {
    const availabilities: VehicleAvailability[] = [
      {
        vehicle_id: vehicleId,
        dealer_id: 'dealer-ags-001',
        dealer_name: 'Automotriz del Bajío',
        location: 'Aguascalientes, AGS',
        stock_quantity: 5,
        delivery_days: 7,
        contact_info: {
          phone: '+52 449 555 0001',
          email: 'ventas@autobajio.com',
          address: 'Av. López Mateos 1234, Aguascalientes'
        }
      },
      {
        vehicle_id: vehicleId,
        dealer_id: 'dealer-em-001',
        dealer_name: 'Vehículos EdoMex',
        location: 'Ecatepec, EdoMex',
        stock_quantity: 8,
        delivery_days: 10,
        contact_info: {
          phone: '+52 55 555 0002',
          email: 'ventas@vehedomex.com',
          address: 'Av. Central 567, Ecatepec'
        }
      }
    ];

    return location ? availabilities.filter(a => a.location.includes(location)) : availabilities;
  }
}