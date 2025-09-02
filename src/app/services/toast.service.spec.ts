import { TestBed } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty toasts array', () => {
      expect(service.getToasts().length).toBe(0);
    });

    it('should have toasts$ observable', () => {
      expect(service.toasts$).toBeDefined();
    });
  });

  describe('Success Toast', () => {
    it('should create success toast with default duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('success');
        expect(toast.message).toBe('Operation successful');
        expect(toast.duration).toBe(3000);
        expect(toast.id).toBeTruthy();
        done();
      });

      service.success('Operation successful');
    });

    it('should create success toast with custom duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('success');
        expect(toast.duration).toBe(5000);
        done();
      });

      service.success('Custom success', 5000);
    });

    it('should add success toast to toasts array', () => {
      service.success('Test success');
      
      const toasts = service.getToasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Test success');
    });
  });

  describe('Error Toast', () => {
    it('should create error toast with default duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('error');
        expect(toast.message).toBe('Something went wrong');
        expect(toast.duration).toBe(5000);
        done();
      });

      service.error('Something went wrong');
    });

    it('should create error toast with custom duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('error');
        expect(toast.duration).toBe(8000);
        done();
      });

      service.error('Custom error', 8000);
    });
  });

  describe('Warning Toast', () => {
    it('should create warning toast with default duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('warning');
        expect(toast.message).toBe('Please be careful');
        expect(toast.duration).toBe(4000);
        done();
      });

      service.warning('Please be careful');
    });

    it('should create warning toast with custom duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('warning');
        expect(toast.duration).toBe(6000);
        done();
      });

      service.warning('Custom warning', 6000);
    });
  });

  describe('Info Toast', () => {
    it('should create info toast with default duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('info');
        expect(toast.message).toBe('Information message');
        expect(toast.duration).toBe(3000);
        done();
      });

      service.info('Information message');
    });

    it('should create info toast with custom duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.type).toBe('info');
        expect(toast.duration).toBe(2000);
        done();
      });

      service.info('Custom info', 2000);
    });
  });

  describe('Toast Management', () => {
    it('should generate unique IDs for different toasts', () => {
      service.success('First toast');
      service.error('Second toast');

      const toasts = service.getToasts();
      expect(toasts.length).toBe(2);
      expect(toasts[0].id).not.toBe(toasts[1].id);
    });

    it('should remove toast by ID', () => {
      service.success('Test toast');
      
      const toasts = service.getToasts();
      expect(toasts.length).toBe(1);
      
      const toastId = toasts[0].id;
      service.remove(toastId);

      const remainingToasts = service.getToasts();
      expect(remainingToasts.length).toBe(0);
    });

    it('should handle removing non-existent toast ID', () => {
      service.success('Test toast');
      
      expect(service.getToasts().length).toBe(1);
      
      service.remove('non-existent-id');
      
      expect(service.getToasts().length).toBe(1);
    });

    it('should remove only specified toast when multiple exist', () => {
      service.success('First toast');
      service.error('Second toast');
      service.warning('Third toast');

      const toasts = service.getToasts();
      expect(toasts.length).toBe(3);

      const secondToastId = toasts[1].id;
      service.remove(secondToastId);

      const remainingToasts = service.getToasts();
      expect(remainingToasts.length).toBe(2);
      expect(remainingToasts.find(t => t.id === secondToastId)).toBeUndefined();
      expect(remainingToasts[0].message).toBe('First toast');
      expect(remainingToasts[1].message).toBe('Third toast');
    });
  });

  describe('Auto-removal Functionality', () => {
    it('should auto-remove toast after specified duration', (done) => {
      const duration = 100; // Short duration for test
      
      service.success('Auto-remove toast', duration);
      
      expect(service.getToasts().length).toBe(1);

      setTimeout(() => {
        expect(service.getToasts().length).toBe(0);
        done();
      }, duration + 10); // Small buffer for timing
    });

    it('should auto-remove multiple toasts at different times', (done) => {
      service.success('Fast toast', 50);
      service.error('Slow toast', 150);

      expect(service.getToasts().length).toBe(2);

      setTimeout(() => {
        // After 75ms, fast toast should be gone, slow toast remains
        expect(service.getToasts().length).toBe(1);
        expect(service.getToasts()[0].message).toBe('Slow toast');
      }, 75);

      setTimeout(() => {
        // After 175ms, both should be gone
        expect(service.getToasts().length).toBe(0);
        done();
      }, 175);
    });

    it('should handle manual removal before auto-removal', (done) => {
      const duration = 200;
      
      service.success('Manual remove test', duration);
      
      const toasts = service.getToasts();
      expect(toasts.length).toBe(1);
      
      const toastId = toasts[0].id;
      
      setTimeout(() => {
        // Manually remove before auto-removal
        service.remove(toastId);
        expect(service.getToasts().length).toBe(0);
      }, 50);

      setTimeout(() => {
        // Should still be 0 after auto-removal time
        expect(service.getToasts().length).toBe(0);
        done();
      }, duration + 10);
    });
  });

  describe('Observable Behavior', () => {
    it('should emit toasts through observable', (done) => {
      const emittedToasts: Toast[] = [];

      service.toasts$.subscribe(toast => {
        emittedToasts.push(toast);
        
        if (emittedToasts.length === 3) {
          expect(emittedToasts[0].type).toBe('success');
          expect(emittedToasts[1].type).toBe('error');
          expect(emittedToasts[2].type).toBe('warning');
          done();
        }
      });

      service.success('Success message');
      service.error('Error message');
      service.warning('Warning message');
    });

    it('should support multiple subscribers', (done) => {
      let subscriber1Count = 0;
      let subscriber2Count = 0;

      service.toasts$.subscribe(() => {
        subscriber1Count++;
      });

      service.toasts$.subscribe(() => {
        subscriber2Count++;
        
        if (subscriber2Count === 2) {
          expect(subscriber1Count).toBe(2);
          expect(subscriber2Count).toBe(2);
          done();
        }
      });

      service.success('First toast');
      service.error('Second toast');
    });

    it('should emit each toast separately', (done) => {
      const messages: string[] = [];

      service.toasts$.subscribe(toast => {
        messages.push(toast.message);
        
        if (messages.length === 2) {
          expect(messages).toEqual(['First message', 'Second message']);
          done();
        }
      });

      service.info('First message');
      service.warning('Second message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.message).toBe('');
        expect(toast.type).toBe('info');
        done();
      });

      service.info('');
    });

    it('should handle very long message', (done) => {
      const longMessage = 'A'.repeat(1000);

      service.toasts$.subscribe(toast => {
        expect(toast.message).toBe(longMessage);
        expect(toast.message.length).toBe(1000);
        done();
      });

      service.success(longMessage);
    });

    it('should handle zero duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.duration).toBe(0);
        done();
      });

      service.success('Zero duration toast', 0);
    });

    it('should handle negative duration', (done) => {
      service.toasts$.subscribe(toast => {
        expect(toast.duration).toBe(-100);
        done();
      });

      service.error('Negative duration toast', -100);
    });

    it('should handle special characters in message', (done) => {
      const specialMessage = '!@#$%^&*()_+{}|:<>?[]\\;\'",./`~';

      service.toasts$.subscribe(toast => {
        expect(toast.message).toBe(specialMessage);
        done();
      });

      service.warning(specialMessage);
    });

    it('should handle rapid consecutive toasts', () => {
      for (let i = 0; i < 10; i++) {
        service.success(`Toast ${i}`);
      }

      const toasts = service.getToasts();
      expect(toasts.length).toBe(10);
      
      // Verify all toasts have unique IDs
      const ids = toasts.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Toast State Management', () => {
    it('should maintain correct state after multiple operations', () => {
      // Add multiple toasts
      service.success('Success 1');
      service.error('Error 1');
      service.warning('Warning 1');
      service.info('Info 1');

      expect(service.getToasts().length).toBe(4);

      // Remove specific toasts
      const toasts = service.getToasts();
      service.remove(toasts[1].id); // Remove Error 1
      service.remove(toasts[3].id); // Remove Info 1

      const remainingToasts = service.getToasts();
      expect(remainingToasts.length).toBe(2);
      expect(remainingToasts[0].message).toBe('Success 1');
      expect(remainingToasts[1].message).toBe('Warning 1');
    });

    it('should handle removing all toasts', () => {
      service.success('Toast 1');
      service.error('Toast 2');
      service.warning('Toast 3');

      const toasts = service.getToasts();
      expect(toasts.length).toBe(3);

      toasts.forEach(toast => {
        service.remove(toast.id);
      });

      expect(service.getToasts().length).toBe(0);
    });
  });
});