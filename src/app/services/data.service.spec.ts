import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataService, PaginatedResult } from './data.service';
import { Client, BusinessFlow } from '../models/types';
import { CompleteBusinessScenario } from '../models/business';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

// removed by clean-audit
      service.dataState$.subscribe(state => {
        if (!state.loading) {
          expect(state.clients.length).toBeGreaterThan(0);
          expect(state.error).toBeNull();
          done();
        }
      });
    }, 3000);
  });

  describe('Client Management', () => {
    const mockClient: Partial<Client> = {
      name: 'Test Client',
      flow: BusinessFlow.VentaPlazo,
      status: 'Activo',
      healthScore: 85
    };

    it('should create a new client', (done) => {
      service.createClient(mockClient).subscribe({
        next: (client) => {
          expect(client).toBeTruthy();
          expect(client.name).toBe('Test Client');
          expect(client.flow).toBe(BusinessFlow.VentaPlazo);
          expect(client.id).toBeTruthy();
          done();
        },
        error: () => fail('Client creation should succeed')
      });
    });

    it('should get client by ID', (done) => {
      service.createClient(mockClient).subscribe({
        next: (createdClient) => {
          service.getClientById(createdClient.id).subscribe({
            next: (client) => {
              expect(client).toBeTruthy();
              expect(client!.id).toBe(createdClient.id);
              expect(client!.name).toBe('Test Client');
              done();
            }
          });
        }
      });
    });

    it('should return null for non-existent client ID', (done) => {
      service.getClientById('non-existent').subscribe({
        next: (client) => {
          expect(client).toBeNull();
          done();
        }
      });
    });

    it('should update existing client', (done) => {
      service.createClient(mockClient).subscribe({
        next: (createdClient) => {
          const updates = { name: 'Updated Client Name' };
          
          service.updateClient(createdClient.id, updates).subscribe({
            next: (updatedClient) => {
              expect(updatedClient.name).toBe('Updated Client Name');
              expect(updatedClient.id).toBe(createdClient.id);
              done();
            }
          });
        }
      });
    });

    it('should handle update of non-existent client', (done) => {
      service.updateClient('non-existent', { name: 'Test' }).subscribe({
        next: () => fail('Should throw error for non-existent client'),
        error: (error) => {
          expect(error.message).toContain('Client not found');
          done();
        }
      });
    });

    it('should delete client', (done) => {
      service.createClient(mockClient).subscribe({
        next: (createdClient) => {
          service.deleteClient(createdClient.id).subscribe({
            next: (success) => {
              expect(success).toBeTrue();
              
              // Verify client is deleted
              service.getClientById(createdClient.id).subscribe(client => {
                expect(client).toBeNull();
                done();
              });
            }
          });
        }
      });
    });

    it('should handle delete of non-existent client', (done) => {
      service.deleteClient('non-existent').subscribe({
        next: () => fail('Should throw error for non-existent client'),
        error: (error) => {
          expect(error.message).toContain('Client not found');
          done();
        }
      });
    });
  });

  describe('Client Pagination and Filtering', () => {
    beforeEach((done) => {
      // Wait for initial data to load
      service.dataState$.subscribe(state => {
        if (!state.loading) {
          done();
        }
      });
    });

    it('should get paginated clients', (done) => {
      service.getClients({ page: 1, limit: 2 }).subscribe(result => {
        expect(result.data.length).toBeLessThanOrEqual(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(2);
        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.totalPages).toBe(Math.ceil(result.total / 2));
        done();
      });
    });

    it('should handle empty pagination results', (done) => {
      service.getClients({ page: 999, limit: 10 }).subscribe(result => {
        expect(result.data.length).toBe(0);
        expect(result.page).toBe(999);
        done();
      });
    });

    it('should filter clients by status', (done) => {
      service.getClients({ 
        page: 1, 
        limit: 10, 
        filters: { status: 'Activo' } 
      }).subscribe(result => {
        result.data.forEach(client => {
          expect(client.status).toBe('Activo');
        });
        done();
      });
    });

    it('should sort clients by name', (done) => {
      service.getClients({
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      }).subscribe(result => {
        if (result.data.length > 1) {
          for (let i = 1; i < result.data.length; i++) {
            expect(result.data[i].name >= result.data[i-1].name).toBe(true);
          }
        }
        done();
      });
    });
  });

  describe('Scenario Management', () => {
    const mockScenario: CompleteBusinessScenario = {
      id: 'test-scenario',
      clientName: 'Test Client',
      flow: BusinessFlow.VentaPlazo,
      market: 'aguascalientes',
      stage: 'COTIZACION',
      seniorSummary: {
        title: 'Test Scenario',
        description: ['Test description'],
        keyMetrics: [],
        timeline: [],
        whatsAppMessage: 'Test message'
      }
    };

    it('should save new scenario', (done) => {
      service.saveScenario(mockScenario).subscribe({
        next: (scenario) => {
          expect(scenario).toEqual(mockScenario);
          done();
        },
        error: () => fail('Scenario save should succeed')
      });
    });

    it('should update existing scenario', (done) => {
      service.saveScenario(mockScenario).subscribe(() => {
        const updatedScenario = { 
          ...mockScenario, 
          seniorSummary: { 
            ...mockScenario.seniorSummary, 
            title: 'Updated Scenario' 
          } 
        };

        service.saveScenario(updatedScenario).subscribe({
          next: (scenario) => {
            expect(scenario.seniorSummary.title).toBe('Updated Scenario');
            done();
          }
        });
      });
    });

    it('should get scenarios by client', (done) => {
      service.saveScenario(mockScenario).subscribe(() => {
        service.getClientScenarios('Test Client').subscribe({
          next: (scenarios) => {
            expect(scenarios.length).toBeGreaterThan(0);
            expect(scenarios[0].clientName).toContain('Test Client');
            done();
          }
        });
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach((done) => {
      // Wait for initial data to load
      service.dataState$.subscribe(state => {
        if (!state.loading) {
          done();
        }
      });
    });

    it('should perform global search', (done) => {
      service.globalSearch('Juan').subscribe({
        next: (results) => {
          expect(results.total).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(results.clients)).toBe(true);
          expect(Array.isArray(results.scenarios)).toBe(true);
          
          // Check if search term appears in results
          results.clients.forEach(client => {
            expect(
              client.name.toLowerCase().includes('juan') ||
              client.status.toLowerCase().includes('juan')
            ).toBe(true);
          });
          done();
        }
      });
    });

    it('should return empty results for non-matching search', (done) => {
      service.globalSearch('NonExistentTerm').subscribe({
        next: (results) => {
          expect(results.total).toBe(0);
          expect(results.clients.length).toBe(0);
          expect(results.scenarios.length).toBe(0);
          done();
        }
      });
    });
  });

  describe('Dashboard Statistics', () => {
    beforeEach((done) => {
      // Wait for initial data to load
      service.dataState$.subscribe(state => {
        if (!state.loading) {
          done();
        }
      });
    });

    it('should get dashboard stats', (done) => {
      service.getDashboardStats().subscribe({
        next: (stats) => {
          expect(typeof stats.totalClients).toBe('number');
          expect(typeof stats.activeClients).toBe('number');
          expect(typeof stats.totalQuotes).toBe('number');
          expect(typeof stats.totalScenarios).toBe('number');
          expect(Array.isArray(stats.recentActivity)).toBe(true);
          
          stats.recentActivity.forEach(activity => {
            expect(activity.type).toBeTruthy();
            expect(activity.message).toBeTruthy();
            expect(activity.timestamp instanceof Date).toBe(true);
          });
          done();
        }
      });
    });
  });

  describe('Data Export', () => {
    beforeEach((done) => {
      // Wait for initial data to load
      service.dataState$.subscribe(state => {
        if (!state.loading) {
          done();
        }
      });
    });

    it('should export clients as JSON', (done) => {
      service.exportData('json', 'clients').subscribe({
        next: (blob) => {
          expect(blob instanceof Blob).toBe(true);
          expect(blob.type).toBe('application/json');
          done();
        }
      });
    });

    it('should export clients as CSV', (done) => {
      service.exportData('csv', 'clients').subscribe({
        next: (blob) => {
          expect(blob instanceof Blob).toBe(true);
          expect(blob.type).toBe('text/csv');
          done();
        }
      });
    });

    it('should export all data', (done) => {
      service.exportData('json', 'all').subscribe({
        next: (blob) => {
          expect(blob instanceof Blob).toBe(true);
          expect(blob.type).toBe('application/json');
          done();
        }
      });
    });

    it('should export scenarios', (done) => {
      service.exportData('json', 'scenarios').subscribe({
        next: (blob) => {
          expect(blob instanceof Blob).toBe(true);
          expect(blob.type).toBe('application/json');
          done();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in client creation', (done) => {
      // Spy on console.error to suppress error output during test
      spyOn(console, 'error');

      // Force an error by passing invalid data
      spyOn(service as any, 'updateDataState').and.throwError('Storage error');

      service.createClient({ name: 'Test' }).subscribe({
        next: () => fail('Should handle error'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });
    });

    it('should clear errors', (done) => {
      service.clearErrors();
      
      service.dataState$.subscribe(state => {
        expect(state.error).toBeNull();
        done();
      });
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data', (done) => {
      service.refreshData().subscribe({
        next: (success) => {
          expect(success).toBe(true);
          
          service.dataState$.subscribe(state => {
            if (!state.loading) {
              expect(state.clients.length).toBeGreaterThan(0);
              done();
            }
          });
        }
      });
    }, 3000);
  });

  describe('Private Helper Methods', () => {
    it('should apply filters correctly', () => {
      const testData = [
        { name: 'John', status: 'active' },
        { name: 'Jane', status: 'inactive' },
        { name: 'Bob', status: 'active' }
      ];

      const filtered = service['applyFilters'](testData, { status: 'active' });
      expect(filtered.length).toBe(2);
      expect(filtered.every(item => item.status === 'active')).toBe(true);
    });

    it('should apply sorting correctly', () => {
      const testData = [
        { name: 'Charlie', value: 3 },
        { name: 'Alice', value: 1 },
        { name: 'Bob', value: 2 }
      ];

      const sorted = service['applySorting'](testData, 'name', 'asc');
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');

      const sortedDesc = service['applySorting'](testData, 'value', 'desc');
      expect(sortedDesc[0].value).toBe(3);
      expect(sortedDesc[1].value).toBe(2);
      expect(sortedDesc[2].value).toBe(1);
    });

    it('should convert data to CSV', () => {
      const testData = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      const csv = service['convertToCSV'](testData);
      expect(csv).toContain('name,age,city');
      expect(csv).toContain('John,30,New York');
      expect(csv).toContain('Jane,25,Los Angeles');
    });

    it('should handle empty array in CSV conversion', () => {
      const csv = service['convertToCSV']([]);
      expect(csv).toBe('');
    });

    it('should handle CSV values with commas', () => {
      const testData = [
        { name: 'John Doe', description: 'A person, who lives in NY' }
      ];

      const csv = service['convertToCSV'](testData);
      expect(csv).toContain('"A person, who lives in NY"');
    });
  });
});
// removed by clean-audit