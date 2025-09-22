import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of } from 'rxjs';
import { Client } from '../models/types';
import { VehicleUnit, ImportStatus } from '../models/postventa';

export interface VehicleAssignmentRequest {
  clientId: string;
  vin: string;
  serie: string;
  modelo: string;
  year: number;
  numeroMotor: string;
  transmission?: 'Manual' | 'Automatica';
  productionBatch?: string;
  factoryLocation?: string;
  assignedBy: string;
  notes?: string;
}

export interface VehicleAssignmentResult {
  success: boolean;
  assignedUnit?: VehicleUnit;
  client?: Client;
  error?: string;
}

/**
 * Servicio para asignar unidades específicas a clientes
 * en el milestone "unidadFabricada" del tracking de importación
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleAssignmentService {
  
  private assignmentUpdatesSubject = new BehaviorSubject<VehicleAssignmentResult | null>(null);
  public assignmentUpdates$ = this.assignmentUpdatesSubject.asObservable();

  /**
   * Asignar unidad específica al cliente
   * Se ejecuta cuando se completa el milestone "unidadFabricada"
   */
  assignVehicleToClient(request: VehicleAssignmentRequest): Observable<VehicleAssignmentResult> {
// removed by clean-audit
    
    try {
      // Crear la unidad con datos específicos
      const assignedUnit: VehicleUnit = {
        id: this.generateUnitId(),
        vin: request.vin,
        serie: request.serie,
        modelo: request.modelo,
        year: request.year,
        color: 'Blanco', // Solo blanco por ahora
        numeroMotor: request.numeroMotor,
        transmission: request.transmission,
        fuelType: 'Gasolina', // Solo gasolina por ahora
        assignedAt: new Date(),
        assignedBy: request.assignedBy,
        productionBatch: request.productionBatch,
        factoryLocation: request.factoryLocation,
        notes: request.notes
      };

      // Simular actualización del cliente (en producción sería API call)
      const result: VehicleAssignmentResult = {
        success: true,
        assignedUnit,
        client: this.updateClientWithAssignedUnit(request.clientId, assignedUnit)
      };

      // Notificar a subscribers
      this.assignmentUpdatesSubject.next(result);
      
// removed by clean-audit
        clientId: request.clientId,
        vin: assignedUnit.vin,
        serie: assignedUnit.serie,
        modelo: assignedUnit.modelo
      });

      return of(result);

    } catch (error) {
      const errorResult: VehicleAssignmentResult = {
        success: false,
        error: `Error asignando unidad: ${error}`
      };
      
// removed by clean-audit
      this.assignmentUpdatesSubject.next(errorResult);
      
      return of(errorResult);
    }
  }

  /**
   * Obtener información de la unidad asignada a un cliente
   */
  getAssignedVehicle(clientId: string): Observable<VehicleUnit | null> {
    // En producción, esto sería una API call
// removed by clean-audit
    
// removed by clean-audit
    
    try {
      const storedAssignments = localStorage.getItem('vehicle_assignments');
      if (storedAssignments) {
        const assignments = JSON.parse(storedAssignments);
        const clientAssignment = assignments[clientId];
        
        if (clientAssignment) {
// removed by clean-audit
          return of(clientAssignment);
        }
      }
      
// removed by clean-audit
      return of(null);
      
    } catch (error) {
// removed by clean-audit
      return of(null);
    }
  }

  /**
   * Listar todas las unidades asignadas
   */
  getAllAssignedVehicles(): Observable<{ [clientId: string]: VehicleUnit }> {
    try {
      const storedAssignments = localStorage.getItem('vehicle_assignments');
      const assignments = storedAssignments ? JSON.parse(storedAssignments) : {};
      
// removed by clean-audit
      return of(assignments);
      
    } catch (error) {
// removed by clean-audit
      return of({});
    }
  }

  /**
   * Validar que los datos de la unidad están completos
   */
  validateVehicleData(request: VehicleAssignmentRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.clientId?.trim()) {
      errors.push('ID del cliente es requerido');
    }

    if (!request.vin?.trim()) {
      errors.push('VIN es requerido');
    }

    if (!request.serie?.trim()) {
      errors.push('Serie es requerida');
    }

    if (!request.modelo?.trim()) {
      errors.push('Modelo es requerido');
    }

    if (!request.year || request.year < 2020 || request.year > new Date().getFullYear() + 2) {
      errors.push('Año debe estar entre 2020 y ' + (new Date().getFullYear() + 2));
    }

    if (!request.numeroMotor?.trim()) {
      errors.push('Número de motor es requerido');
    }

    if (!request.assignedBy?.trim()) {
      errors.push('Usuario asignador es requerido');
    }

    // Validar formato VIN (17 caracteres)
    if (request.vin && request.vin.length !== 17) {
      errors.push('VIN debe tener exactamente 17 caracteres');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Verificar si una unidad ya está asignada
   */
  isVehicleAlreadyAssigned(vin: string): Observable<{ assigned: boolean; clientId?: string }> {
    return this.getAllAssignedVehicles().pipe(
      map(assignments => {
        for (const [clientId, unit] of Object.entries(assignments)) {
          if (unit.vin === vin) {
            return { assigned: true, clientId };
          }
        }
        return { assigned: false };
      }),
      catchError(() => of({ assigned: false }))
    );
  }

  // Métodos privados
  private generateUnitId(): string {
    return 'unit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private updateClientWithAssignedUnit(clientId: string, unit: VehicleUnit): Client {
    // En producción, esto sería una API call para actualizar el cliente
    // Por ahora guardamos en localStorage para persistencia temporal
    
    try {
      const storedAssignments = localStorage.getItem('vehicle_assignments') || '{}';
      const assignments = JSON.parse(storedAssignments);
      
      assignments[clientId] = unit;
      localStorage.setItem('vehicle_assignments', JSON.stringify(assignments));
      
      // Simular objeto cliente actualizado
      const mockClient: Client = {
        id: clientId,
// removed by clean-audit
        avatarUrl: '',
        flow: 'VentaPlazo' as any,
        status: 'Activo',
        documents: [],
        events: [],
        importStatus: {
          pedidoPlanta: { status: 'completed' },
          unidadFabricada: { status: 'completed' },
          transitoMaritimo: { status: 'pending' },
          enAduana: { status: 'pending' },
          liberada: { status: 'pending' },
          entregada: { status: 'pending' },
          documentosTransferidos: { status: 'pending' },
          placasEntregadas: { status: 'pending' },
          assignedUnit: unit
        }
      };
      
      return mockClient;
      
    } catch (error) {
// removed by clean-audit
      throw error;
    }
  }
}
// removed by clean-audit