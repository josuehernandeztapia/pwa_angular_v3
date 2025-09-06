import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConektaPaymentService } from './conekta-payment.service';
import { environment } from '../../environments/environment';

// Mock Conekta SDK
const mockConekta = {
  setPublicKey: jasmine.createSpy('setPublicKey'),
  setLanguage: jasmine.createSpy('setLanguage'),
  Token: {
    create: jasmine.createSpy('create').and.callFake((cardData, successCallback, errorCallback) => {
      // Simulate successful tokenization by default
      if (cardData.card.number === '4242424242424242') {
        successCallback({ id: 'tok_test_visa_4242' });
      } else if (cardData.card.number === '4000000000000002') {
        errorCallback({ message_to_purchaser: 'Tarjeta declinada' });
      } else {
        successCallback({ id: 'tok_test_' + Math.random().toString(36).substr(2, 9) });
      }
    })
  }
};

// Mock global Conekta
(window as any).Conekta = mockConekta;

describe('ConektaPaymentService', () => {
  let service: ConektaPaymentService;
  let httpMock: HttpTestingController;
  
  const mockEnvironment = {
    services: {
      conekta: {
        baseUrl: 'https://api.conekta.io',
        publicKey: 'key_test_123'
      }
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ConektaPaymentService
      ]
    });
    
    service = TestBed.inject(ConektaPaymentService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Mock environment by direct assignment for simplicity in tests
    (environment as any).services = {
      metamap: { clientId: 'test', flowId: 'test', baseUrl: 'test' },
      conekta: { publicKey: 'key_test_123', baseUrl: 'https://api.conekta.io' },
      mifiel: { appId: 'test', baseUrl: 'test' },
      openai: { apiKey: 'test', baseUrl: 'https://api.openai.com/v1', models: { transcription: 'gpt-4o-transcribe', fallback: 'whisper-1' } }
    } as any;
    
    // Mock process.env for Node.js environment
    if (typeof process !== 'undefined') {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        'CONEKTA_PRIVATE_KEY': 'key_private_test_123',
        'CONEKTA_WEBHOOK_SECRET': 'webhook_secret_test'
      };
    }
  });

  afterEach(() => {
    httpMock.verify();
    // Clean up DOM scripts
    const scripts = document.querySelectorAll('script[src*="conekta"]');
    scripts.forEach(script => script.remove());
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should load Conekta SDK on initialization', (done) => {
      // Wait for SDK loading
      setTimeout(() => {
        expect(mockConekta.setPublicKey).toHaveBeenCalledWith('key_test_123');
        expect(mockConekta.setLanguage).toHaveBeenCalledWith('es');
        done();
      }, 100);
    });
  });

  describe('Card Tokenization', () => {
    const validCardData = {
      number: '4242424242424242',
      name: 'Juan Perez',
      exp_month: '12',
      exp_year: '2025',
      cvc: '123'
    };

    it('should tokenize valid card successfully', async () => {
      const token = await service.tokenizeCard(validCardData);
      
      expect(token).toBe('tok_test_visa_4242');
      expect(mockConekta.Token.create).toHaveBeenCalledWith(
        { card: validCardData },
        jasmine.any(Function),
        jasmine.any(Function)
      );
    });

    it('should handle tokenization errors', async () => {
      const invalidCardData = {
        ...validCardData,
        number: '4000000000000002'
      };

      try {
        await service.tokenizeCard(invalidCardData);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Tokenization failed: Tarjeta declinada');
      }
    });

    it('should generate random tokens for other card numbers', async () => {
      const otherCardData = {
        ...validCardData,
        number: '5555555555554444'
      };

      const token = await service.tokenizeCard(otherCardData);
      
      expect(token).toContain('tok_test_');
      expect(token.length).toBeGreaterThan(10);
    });
  });

  describe('Payment Processing', () => {
    const mockPaymentRequest = {
      amount: 50000, // $500 MXN in cents
      currency: 'MXN' as const,
      description: 'Enganche vehicular',
      customer: {
        name: 'Juan Perez',
        email: 'juan@example.com',
        phone: '+525555555555'
      },
      payment_method: {
        type: 'card' as const,
        token: 'tok_test_visa_4242'
      },
      metadata: {
        client_id: 'client_123',
        contract_id: 'contract_456',
        payment_type: 'down_payment' as const
      }
    };

    const mockPaymentResponse = {
      id: 'ord_test_123',
      status: 'paid' as const,
      amount: 50000,
      currency: 'MXN',
      description: 'Enganche vehicular',
      payment_method: { type: 'card' },
      charges: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      metadata: mockPaymentRequest.metadata
    };

    it('should process card payment successfully', (done) => {
      service.processPayment(mockPaymentRequest).subscribe(response => {
        expect(response).toEqual(mockPaymentResponse);
        expect(response.status).toBe('paid');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        currency: 'MXN',
        customer_info: {
          name: 'Juan Perez',
          email: 'juan@example.com',
          phone: '+525555555555'
        },
        line_items: [{
          name: 'Enganche vehicular',
          unit_price: 50000,
          quantity: 1
        }],
        charges: [{
          payment_method: mockPaymentRequest.payment_method
        }],
        metadata: mockPaymentRequest.metadata
      });

      req.flush(mockPaymentResponse);
    });

    it('should handle payment processing errors', (done) => {
      const errorResponse = {
        error: {
          details: [
            { message: 'Insufficient funds' },
            { message: 'Card expired' }
          ]
        }
      };

      service.processPayment(mockPaymentRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Insufficient funds, Card expired');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders`);
      req.flush(errorResponse.error, { 
        status: 400, 
        statusText: 'Bad Request'
      });
    });
  });

  describe('Payment Links (Cash Payments)', () => {
    const mockPaymentLinkRequest = {
      amount: 25000,
      currency: 'MXN' as const,
      description: 'Pago mensual',
      customer: {
        name: 'Maria Garcia',
        email: 'maria@example.com'
      },
      payment_method: {
        type: 'cash' as const,
        cash: { type: 'oxxo' as const }
      },
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };

    const mockPaymentLinkResponse = {
      id: 'checkout_123',
      status: 'pending_payment' as const,
      amount: 25000,
      currency: 'MXN',
      description: 'Pago mensual',
      payment_method: { type: 'cash' },
      charges: [],
      created_at: Date.now(),
      updated_at: Date.now(),
      checkout: {
        id: 'checkout_123',
        url: 'https://pay.conekta.com/checkout_123',
        expires_at: mockPaymentLinkRequest.expires_at
      }
    };

    it('should create payment link for cash payments', (done) => {
      service.createPaymentLink(mockPaymentLinkRequest).subscribe(response => {
        expect(response.checkout).toBeTruthy();
        expect(response.checkout!.url).toContain('checkout_123');
        expect(response.status).toBe('pending_payment');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/checkouts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.allowed_payment_methods).toContain('cash');
      expect(req.request.body.orders_template.customer_info.name).toBe('Maria Garcia');

      req.flush(mockPaymentLinkResponse);
    });

    it('should set default expiration if not provided', (done) => {
      const requestWithoutExpiration: any = { ...mockPaymentLinkRequest };
      requestWithoutExpiration.expires_at = undefined;

      service.createPaymentLink(requestWithoutExpiration).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/checkouts`);
      expect(req.request.body.expires_at).toBeGreaterThan(Date.now());
      
      req.flush(mockPaymentLinkResponse);
    });
  });

  describe('Customer Management', () => {
    const mockCustomerData = {
      name: 'Carlos Rodriguez',
      email: 'carlos@example.com',
      phone: '+525544332211'
    };

    const mockCustomerResponse = {
      id: 'cus_test_123',
      ...mockCustomerData,
      default_payment_source_id: null,
      shipping_contacts: [],
      payment_sources: []
    };

    it('should create customer', (done) => {
      service.createCustomer(mockCustomerData).subscribe(customer => {
        expect(customer.id).toBe('cus_test_123');
        expect(customer.name).toBe(mockCustomerData.name);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCustomerData);

      req.flush(mockCustomerResponse);
    });

    it('should update customer', (done) => {
      const updates = { phone: '+525599887766' };

      service.updateCustomer('cus_test_123', updates).subscribe(customer => {
        expect(customer.phone).toBe(updates.phone);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers/cus_test_123`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);

      req.flush({ ...mockCustomerResponse, ...updates });
    });

    it('should get customer', (done) => {
      service.getCustomer('cus_test_123').subscribe(customer => {
        expect(customer.id).toBe('cus_test_123');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers/cus_test_123`);
      expect(req.request.method).toBe('GET');

      req.flush(mockCustomerResponse);
    });
  });

  describe('Subscription Management', () => {
    const mockPlanData = {
      name: 'Plan Mensual Básico',
      amount: 15000,
      currency: 'MXN' as const,
      interval: 'month' as const,
      frequency: 1
    };

    const mockPlanResponse = {
      id: 'plan_test_123',
      ...mockPlanData,
      trial_period_days: 0,
      expiry_count: null
    };

    const mockSubscriptionData = {
      plan_id: 'plan_test_123',
      customer_id: 'cus_test_123',
      subscription_start: Date.now()
    };

    const mockSubscriptionResponse = {
      id: 'sub_test_123',
      status: 'active' as const,
      ...mockSubscriptionData,
      billing_cycle_start: Date.now(),
      billing_cycle_end: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };

    it('should create subscription plan', (done) => {
      service.createSubscriptionPlan(mockPlanData).subscribe(plan => {
        expect(plan.id).toBe('plan_test_123');
        expect(plan.amount).toBe(15000);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/plans`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockPlanData);

      req.flush(mockPlanResponse);
    });

    it('should create subscription', (done) => {
      service.createSubscription(mockSubscriptionData).subscribe(subscription => {
        expect(subscription.id).toBe('sub_test_123');
        expect(subscription.status).toBe('active');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers/cus_test_123/subscriptions`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.plan).toBe('plan_test_123');

      req.flush(mockSubscriptionResponse);
    });

    it('should get subscription', (done) => {
      service.getSubscription('cus_test_123', 'sub_test_123').subscribe(subscription => {
        expect(subscription.id).toBe('sub_test_123');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers/cus_test_123/subscriptions/sub_test_123`);
      expect(req.request.method).toBe('GET');

      req.flush(mockSubscriptionResponse);
    });

    it('should pause subscription', (done) => {
      service.pauseSubscription('cus_test_123', 'sub_test_123').subscribe(subscription => {
        expect(subscription.status).toBe('paused');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers/cus_test_123/subscriptions/sub_test_123`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.status).toBe('paused');

      req.flush({ ...mockSubscriptionResponse, status: 'paused' });
    });

    it('should cancel subscription', (done) => {
      service.cancelSubscription('cus_test_123', 'sub_test_123').subscribe(subscription => {
        expect(subscription.status).toBe('canceled');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/customers/cus_test_123/subscriptions/sub_test_123`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.status).toBe('canceled');

      req.flush({ ...mockSubscriptionResponse, status: 'canceled' });
    });
  });

  describe('Payment History and Status', () => {
    const mockPaymentHistory = {
      data: [
        {
          id: 'ord_123',
          status: 'paid',
          amount: 50000,
          currency: 'MXN',
          description: 'Enganche',
          payment_method: { type: 'card' },
          charges: [],
          created_at: Date.now() - 86400000,
          updated_at: Date.now() - 86400000
        },
        {
          id: 'ord_124',
          status: 'pending_payment',
          amount: 15000,
          currency: 'MXN',
          description: 'Mensualidad',
          payment_method: { type: 'cash' },
          charges: [],
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]
    };

    it('should get payment history without customer filter', (done) => {
      service.getPaymentHistory().subscribe(payments => {
        expect(payments.length).toBe(2);
        expect(payments[0].id).toBe('ord_123');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders?limit=50`);
      expect(req.request.method).toBe('GET');

      req.flush(mockPaymentHistory);
    });

    it('should get payment history with customer filter', (done) => {
      service.getPaymentHistory('cus_test_123', 10).subscribe(payments => {
        expect(payments.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders?limit=10&customer_info.customer_id=cus_test_123`);
      expect(req.request.method).toBe('GET');

      req.flush(mockPaymentHistory);
    });

    it('should get payment status', (done) => {
      const mockPayment = mockPaymentHistory.data[0];

      service.getPaymentStatus('ord_123').subscribe(payment => {
        expect(payment.id).toBe('ord_123');
        expect(payment.status).toBe('paid');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders/ord_123`);
      expect(req.request.method).toBe('GET');

      req.flush(mockPayment);
    });
  });

  describe('Webhook Validation', () => {
    beforeEach(() => {
      // Mock crypto module for Node.js environment
      if (typeof require !== 'undefined') {
        const mockCrypto = {
          createHmac: jasmine.createSpy('createHmac').and.returnValue({
            update: jasmine.createSpy('update').and.returnValue({
              digest: jasmine.createSpy('digest').and.returnValue('expected_signature')
            })
          })
        };
        
        spyOn(require as any, 'crypto').and.returnValue(mockCrypto);
      }
    });

    it('should validate correct webhook signature', () => {
      const payload = '{"event": "order.paid"}';
      const signature = 'expected_signature';

      const isValid = service.validateWebhook(payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect webhook signature', () => {
      const payload = '{"event": "order.paid"}';
      const signature = 'wrong_signature';

      const isValid = service.validateWebhook(payload, signature);

      expect(isValid).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      spyOn(console, 'error');
      
      // Skip test in browser environment
      if (typeof require === 'undefined') {
        pending('Crypto module not available in browser environment');
        return;
      }
      
      // Mock crypto to throw error
      spyOn(require as any, 'crypto').and.throwError('Crypto error');

      const isValid = service.validateWebhook('payload', 'signature');

      expect(isValid).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Webhook validation error:', jasmine.any(Error));
    });
  });

  describe('Business Logic Helpers', () => {
    const mockClientData = {
      id: 'client_123',
      name: 'Ana Martinez',
      email: 'ana@example.com',
      phone: '+525566778899'
    };

    it('should create down payment link', (done) => {
      const amount = 75000;
      const contractId = 'contract_789';

      service.createDownPaymentLink(mockClientData, amount, contractId).subscribe(response => {
        expect(response.checkout).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/checkouts`);
      expect(req.request.body.orders_template.line_items[0].unit_price).toBe(7500000); // amount * 100
      expect(req.request.body.orders_template.metadata.payment_type).toBe('down_payment');
      expect(req.request.body.expires_at).toBeLessThan(Date.now() + (4 * 24 * 60 * 60 * 1000)); // Less than 4 days

      req.flush({
        id: 'checkout_down_123',
        checkout: { id: 'checkout_down_123', url: 'https://pay.conekta.com/checkout_down_123', expires_at: Date.now() },
        status: 'pending_payment',
        amount: 7500000,
        currency: 'MXN',
        description: `Enganche - Contrato ${contractId}`,
        payment_method: {},
        charges: [],
        created_at: Date.now(),
        updated_at: Date.now()
      });
    });

    it('should handle monthly payment setup errors', (done) => {
      const monthlyAmount = 15000;
      const contractId = 'contract_890';
      const startDate = new Date();

      service.setupMonthlyPayments(mockClientData, monthlyAmount, contractId, startDate).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Payment processing failed');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/plans`);
      req.error(new ErrorEvent('Plan creation failed'), { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Test Methods', () => {
    it('should create test payment with default amount', (done) => {
      service.createTestPayment().subscribe(response => {
        expect(response.amount).toBe(10000); // $100 MXN in cents
        expect(response.description).toBe('Pago de prueba');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders`);
      expect(req.request.body.line_items[0].unit_price).toBe(10000);
      expect(req.request.body.charges[0].payment_method.token).toBe('tok_test_visa_4242');
      expect(req.request.body.metadata.test).toBe('true');

      req.flush({
        id: 'ord_test_123',
        status: 'paid',
        amount: 10000,
        currency: 'MXN',
        description: 'Pago de prueba',
        payment_method: { type: 'card' },
        charges: [],
        created_at: Date.now(),
        updated_at: Date.now()
      });
    });

    it('should create test payment with custom amount', (done) => {
      service.createTestPayment(250).subscribe(response => {
        expect(response.amount).toBe(25000); // $250 MXN in cents
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders`);
      expect(req.request.body.line_items[0].unit_price).toBe(25000);

      req.flush({
        id: 'ord_test_124',
        status: 'paid',
        amount: 25000,
        currency: 'MXN',
        description: 'Pago de prueba',
        payment_method: { type: 'card' },
        charges: [],
        created_at: Date.now(),
        updated_at: Date.now()
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle errors with simple message', (done) => {
      const mockPaymentRequest = {
        amount: 10000,
        currency: 'MXN' as const,
        description: 'Test payment',
        customer: { name: 'Test', email: 'test@test.com' },
        payment_method: { type: 'card' as const, token: 'invalid_token' }
      };

      service.processPayment(mockPaymentRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Simple error message');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders`);
      req.flush({ message: 'Simple error message' }, {
        status: 400,
        statusText: 'Bad Request'
      });
    });

    it('should handle errors without structured response', (done) => {
      const mockPaymentRequest = {
        amount: 10000,
        currency: 'MXN' as const,
        description: 'Test payment',
        customer: { name: 'Test', email: 'test@test.com' },
        payment_method: { type: 'card' as const, token: 'invalid_token' }
      };

      service.processPayment(mockPaymentRequest).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Payment processing failed');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/payments/orders`);
      req.flush('Network error occurred', {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });
  });
});