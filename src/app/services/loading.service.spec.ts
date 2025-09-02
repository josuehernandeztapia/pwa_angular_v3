import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with loading false', (done) => {
      service.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        done();
      });
    });

    it('should return false for initial isLoading state', () => {
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Basic Loading Control', () => {
    it('should show loading', (done) => {
      service.show();

      service.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        expect(service.isLoading()).toBe(true);
        done();
      });
    });

    it('should hide loading', (done) => {
      service.show();
      service.hide();

      service.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        expect(service.isLoading()).toBe(false);
        done();
      });
    });

    it('should not show loading multiple times without identifiers', (done) => {
      let emissionCount = 0;
      
      service.loading$.subscribe(loading => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(loading).toBe(false); // Initial state
        } else if (emissionCount === 2) {
          expect(loading).toBe(true); // After first show
          done();
        } else {
          fail('Should not emit more than twice');
        }
      });

      service.show();
      service.show(); // Second show should not emit again
    });

    it('should not hide loading when already hidden', () => {
      let emissionCount = 0;
      
      service.loading$.subscribe(() => {
        emissionCount++;
      });

      service.hide(); // Hide when already false
      
      expect(emissionCount).toBe(1); // Only initial emission
    });
  });

  describe('Identifier-based Loading Control', () => {
    it('should show loading with identifier', (done) => {
      service.show('test-operation');

      service.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        done();
      });
    });

    it('should hide loading with identifier', (done) => {
      service.show('test-operation');
      service.hide('test-operation');

      service.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        done();
      });
    });

    it('should manage multiple identifiers', () => {
      service.show('operation-1');
      expect(service.isLoading()).toBe(true);

      service.show('operation-2');
      expect(service.isLoading()).toBe(true);

      service.hide('operation-1');
      expect(service.isLoading()).toBe(true); // Still loading due to operation-2

      service.hide('operation-2');
      expect(service.isLoading()).toBe(false); // Now fully hidden
    });

    it('should not add duplicate identifiers', () => {
      service.show('operation-1');
      service.show('operation-1'); // Duplicate
      service.show('operation-1'); // Another duplicate

      expect(service['loadingQueue'].length).toBe(1);
      expect(service['loadingQueue']).toContain('operation-1');
    });

    it('should handle hiding non-existent identifier', () => {
      service.show('operation-1');
      service.hide('non-existent'); // Should not affect existing operation

      expect(service.isLoading()).toBe(true);
      expect(service['loadingQueue']).toContain('operation-1');
    });

    it('should handle hiding identifier multiple times', () => {
      service.show('operation-1');
      service.hide('operation-1');
      service.hide('operation-1'); // Hide again

      expect(service.isLoading()).toBe(false);
      expect(service['loadingQueue'].length).toBe(0);
    });
  });

  describe('Force Hide Functionality', () => {
    it('should force hide loading even with active identifiers', (done) => {
      service.show('operation-1');
      service.show('operation-2');
      service.show('operation-3');

      expect(service.isLoading()).toBe(true);
      expect(service['loadingQueue'].length).toBe(3);

      service.forceHide();

      service.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        expect(service['loadingQueue'].length).toBe(0);
        done();
      });
    });

    it('should clear all identifiers on force hide', () => {
      service.show('operation-1');
      service.show('operation-2');
      
      service.forceHide();

      expect(service['loadingQueue'].length).toBe(0);
    });
  });

  describe('Duration-based Loading', () => {
    it('should show loading for specific duration', (done) => {
      const duration = 100; // 100ms
      
      service.showForDuration(duration);
      
      expect(service.isLoading()).toBe(true);

      setTimeout(() => {
        expect(service.isLoading()).toBe(false);
        done();
      }, duration + 10); // Add small buffer for timing
    });

    it('should show loading for duration with identifier', (done) => {
      const duration = 100;
      
      service.showForDuration(duration, 'timed-operation');
      
      expect(service.isLoading()).toBe(true);
      expect(service['loadingQueue']).toContain('timed-operation');

      setTimeout(() => {
        expect(service.isLoading()).toBe(false);
        expect(service['loadingQueue']).not.toContain('timed-operation');
        done();
      }, duration + 10);
    });

    it('should handle multiple timed operations', (done) => {
      service.showForDuration(50, 'fast-op');
      service.showForDuration(150, 'slow-op');

      expect(service.isLoading()).toBe(true);
      expect(service['loadingQueue'].length).toBe(2);

      setTimeout(() => {
        // After 75ms, fast-op should be done but slow-op still active
        expect(service.isLoading()).toBe(true);
        expect(service['loadingQueue'].length).toBe(1);
        expect(service['loadingQueue']).toContain('slow-op');
      }, 75);

      setTimeout(() => {
        // After 175ms, both should be done
        expect(service.isLoading()).toBe(false);
        expect(service['loadingQueue'].length).toBe(0);
        done();
      }, 175);
    });
  });

  describe('SetLoading Alias Method', () => {
    it('should show loading when setLoading(true)', (done) => {
      service.setLoading(true, 'alias-test');

      service.loading$.subscribe(loading => {
        expect(loading).toBe(true);
        expect(service['loadingQueue']).toContain('alias-test');
        done();
      });
    });

    it('should hide loading when setLoading(false)', (done) => {
      service.setLoading(true, 'alias-test');
      service.setLoading(false, 'alias-test');

      service.loading$.subscribe(loading => {
        expect(loading).toBe(false);
        expect(service['loadingQueue']).not.toContain('alias-test');
        done();
      });
    });

    it('should work without identifier', () => {
      service.setLoading(true);
      expect(service.isLoading()).toBe(true);

      service.setLoading(false);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid show/hide calls', () => {
      for (let i = 0; i < 10; i++) {
        service.show(`operation-${i}`);
      }

      expect(service.isLoading()).toBe(true);
      expect(service['loadingQueue'].length).toBe(10);

      for (let i = 0; i < 10; i++) {
        service.hide(`operation-${i}`);
      }

      expect(service.isLoading()).toBe(false);
      expect(service['loadingQueue'].length).toBe(0);
    });

    it('should handle mixed identifier and non-identifier operations', () => {
      service.show(); // No identifier
      service.show('operation-1'); // With identifier

      expect(service.isLoading()).toBe(true);

      service.hide(); // Hide non-identifier
      expect(service.isLoading()).toBe(true); // Still loading due to identifier

      service.hide('operation-1');
      expect(service.isLoading()).toBe(false);
    });

    it('should handle empty string identifier', () => {
      service.show('');
      service.show(''); // Duplicate empty string

      expect(service['loadingQueue'].length).toBe(1);
      expect(service['loadingQueue']).toContain('');

      service.hide('');
      expect(service.isLoading()).toBe(false);
    });

    it('should maintain state consistency after force hide', () => {
      service.show('operation-1');
      service.forceHide();

      // Try to hide the operation that was force-cleared
      service.hide('operation-1');

      expect(service.isLoading()).toBe(false);
      expect(service['loadingQueue'].length).toBe(0);
    });
  });

  describe('Observable Behavior', () => {
    it('should emit loading state changes', (done) => {
      const emissions: boolean[] = [];

      service.loading$.subscribe(loading => {
        emissions.push(loading);
        
        if (emissions.length === 3) {
          expect(emissions).toEqual([false, true, false]);
          done();
        }
      });

      service.show();
      service.hide();
    });

    it('should not emit duplicate states', (done) => {
      const emissions: boolean[] = [];

      service.loading$.subscribe(loading => {
        emissions.push(loading);
      });

      service.show();
      service.show(); // Should not cause new emission
      service.hide();

      setTimeout(() => {
        expect(emissions).toEqual([false, true, false]);
        done();
      }, 10);
    });

    it('should support multiple subscribers', (done) => {
      let subscriber1Emissions = 0;
      let subscriber2Emissions = 0;

      service.loading$.subscribe(() => {
        subscriber1Emissions++;
      });

      service.loading$.subscribe(() => {
        subscriber2Emissions++;
        
        if (subscriber2Emissions === 2) {
          expect(subscriber1Emissions).toBe(2);
          expect(subscriber2Emissions).toBe(2);
          done();
        }
      });

      service.show();
      service.hide();
    });
  });
});