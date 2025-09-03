import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

declare var Conekta: any;

interface PaymentMethod {
  type: 'card' | 'cash' | 'bank_transfer' | 'spei';
  token?: string;
  card?: {
    number: string;
    name: string;
    exp_month: string;
    exp_year: string;
    cvc: string;
  };
  cash?: {
    type: 'oxxo' | 'seven_eleven' | 'extra' | 'sears' | 'farmacia_benavides';
  };
}

interface PaymentRequest {
  amount: number; // Amount in cents (pesos * 100)
  currency: 'MXN';
  description: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  payment_method: PaymentMethod;
  metadata?: {
    client_id?: string;
    contract_id?: string;
    payment_type?: 'down_payment' | 'monthly_payment' | 'penalty';
  };
}

interface PaymentResponse {
  id: string;
  status: 'pending_payment' | 'paid' | 'partially_paid' | 'refunded' | 'voided';
  amount: number;
  currency: string;
  description: string;
  payment_method: any;
  charges: any[];
  created_at: number;
  updated_at: number;
  checkout?: {
    id: string;
    url: string;
    expires_at: number;
  };
  metadata?: any;
}

interface ConektaCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  default_payment_source_id?: string;
  shipping_contacts?: any[];
  payment_sources?: any[];
}

interface SubscriptionPlan {
  id?: string;
  name: string;
  amount: number;
  currency: 'MXN';
  interval: 'week' | 'month';
  frequency: number;
  trial_period_days?: number;
  expiry_count?: number;
}

interface Subscription {
  id?: string;
  status: 'active' | 'past_due' | 'canceled' | 'trial' | 'paused';
  plan_id: string;
  customer_id: string;
  trial_start?: number;
  trial_end?: number;
  billing_cycle_start?: number;
  billing_cycle_end?: number;
  subscription_start: number;
  subscription_end?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConektaPaymentService {
  private readonly baseUrl = environment.services.conekta.baseUrl;
  private readonly publicKey = environment.services.conekta.publicKey;
  private readonly privateKey = process.env['CONEKTA_PRIVATE_KEY'] || 'key_your-conekta-private-key';
  
  private isLoaded = false;

  constructor(private http: HttpClient) {
    this.loadConektaSDK();
  }

  private async loadConektaSDK(): Promise<void> {
    if (this.isLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.conekta.io/js/latest/conekta.js';
      script.onload = () => {
        Conekta.setPublicKey(this.publicKey);
        Conekta.setLanguage('es');
        this.isLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Conekta SDK'));
      document.head.appendChild(script);
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const auth = btoa(`${this.privateKey}:`);
    return new HttpHeaders({
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.conekta-v2.1.0+json'
    });
  }

  // Tokenize card for secure processing
  async tokenizeCard(cardData: {
    number: string;
    name: string;
    exp_month: string;
    exp_year: string;
    cvc: string;
  }): Promise<string> {
    await this.loadConektaSDK();

    return new Promise((resolve, reject) => {
      Conekta.Token.create({
        card: cardData
      }, (token: any) => {
        resolve(token.id);
      }, (error: any) => {
        reject(new Error(`Tokenization failed: ${error.message_to_purchaser}`));
      });
    });
  }

  // Process one-time payment
  processPayment(paymentData: PaymentRequest): Observable<PaymentResponse> {
    const url = `${this.baseUrl}/orders`;
    
    const orderData = {
      currency: paymentData.currency,
      customer_info: {
        name: paymentData.customer.name,
        email: paymentData.customer.email,
        phone: paymentData.customer.phone
      },
      line_items: [{
        name: paymentData.description,
        unit_price: paymentData.amount,
        quantity: 1
      }],
      charges: [{
        payment_method: paymentData.payment_method
      }],
      metadata: paymentData.metadata || {}
    };

    return this.http.post<PaymentResponse>(url, orderData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Create payment link for cash payments (OXXO, etc.)
  createPaymentLink(paymentData: PaymentRequest & { expires_at?: number }): Observable<PaymentResponse> {
    const url = `${this.baseUrl}/checkouts`;
    
    const checkoutData = {
      name: paymentData.description,
      description: `Pago para ${paymentData.customer.name}`,
      type: 'PaymentLink',
      recurrent: false,
      expires_at: paymentData.expires_at || (Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days
      orders_template: {
        currency: paymentData.currency,
        customer_info: {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          phone: paymentData.customer.phone
        },
        line_items: [{
          name: paymentData.description,
          unit_price: paymentData.amount,
          quantity: 1
        }],
        metadata: paymentData.metadata || {}
      },
      allowed_payment_methods: ['cash', 'card', 'bank_transfer']
    };

    return this.http.post<PaymentResponse>(url, checkoutData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Customer Management
  createCustomer(customerData: Omit<ConektaCustomer, 'id'>): Observable<ConektaCustomer> {
    const url = `${this.baseUrl}/customers`;
    
    return this.http.post<ConektaCustomer>(url, customerData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateCustomer(customerId: string, customerData: Partial<ConektaCustomer>): Observable<ConektaCustomer> {
    const url = `${this.baseUrl}/customers/${customerId}`;
    
    return this.http.put<ConektaCustomer>(url, customerData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getCustomer(customerId: string): Observable<ConektaCustomer> {
    const url = `${this.baseUrl}/customers/${customerId}`;
    
    return this.http.get<ConektaCustomer>(url, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Subscription Management for Monthly Payments
  createSubscriptionPlan(planData: Omit<SubscriptionPlan, 'id'>): Observable<SubscriptionPlan> {
    const url = `${this.baseUrl}/plans`;
    
    return this.http.post<SubscriptionPlan>(url, planData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  createSubscription(subscriptionData: Omit<Subscription, 'id' | 'status'>): Observable<Subscription> {
    const url = `${this.baseUrl}/customers/${subscriptionData.customer_id}/subscriptions`;
    
    const subData = {
      plan: subscriptionData.plan_id,
      trial_end: subscriptionData.trial_end,
      subscription_start: subscriptionData.subscription_start
    };

    return this.http.post<Subscription>(url, subData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getSubscription(customerId: string, subscriptionId: string): Observable<Subscription> {
    const url = `${this.baseUrl}/customers/${customerId}/subscriptions/${subscriptionId}`;
    
    return this.http.get<Subscription>(url, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateSubscription(customerId: string, subscriptionId: string, updates: Partial<Subscription>): Observable<Subscription> {
    const url = `${this.baseUrl}/customers/${customerId}/subscriptions/${subscriptionId}`;
    
    return this.http.put<Subscription>(url, updates, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  pauseSubscription(customerId: string, subscriptionId: string): Observable<Subscription> {
    return this.updateSubscription(customerId, subscriptionId, { status: 'paused' });
  }

  cancelSubscription(customerId: string, subscriptionId: string): Observable<Subscription> {
    return this.updateSubscription(customerId, subscriptionId, { status: 'canceled' });
  }

  // Payment History and Status
  getPaymentHistory(customerId?: string, limit: number = 50): Observable<PaymentResponse[]> {
    let url = `${this.baseUrl}/orders?limit=${limit}`;
    if (customerId) {
      url += `&customer_info.customer_id=${customerId}`;
    }
    
    return this.http.get<{ data: PaymentResponse[] }>(url, { headers: this.getAuthHeaders() })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  getPaymentStatus(orderId: string): Observable<PaymentResponse> {
    const url = `${this.baseUrl}/orders/${orderId}`;
    
    return this.http.get<PaymentResponse>(url, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Webhooks validation
  validateWebhook(payload: string, signature: string): boolean {
    // Implement webhook signature validation
    // This would typically use HMAC validation with your webhook secret
    try {
      const crypto = require('crypto');
      const webhookSecret = process.env['CONEKTA_WEBHOOK_SECRET'] || '';
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Webhook validation error:', error);
      return false;
    }
  }

  // Business Logic Helpers
  createDownPaymentLink(clientData: any, amount: number, contractId: string): Observable<PaymentResponse> {
    const paymentData: PaymentRequest = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'MXN',
      description: `Enganche - Contrato ${contractId}`,
      customer: {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone
      },
      payment_method: { type: 'cash', cash: { type: 'oxxo' } },
      metadata: {
        client_id: clientData.id,
        contract_id: contractId,
        payment_type: 'down_payment'
      }
    };

    return this.createPaymentLink({
      ...paymentData,
      expires_at: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days for down payment
    });
  }

  setupMonthlyPayments(clientData: any, monthlyAmount: number, contractId: string, startDate: Date): Observable<{ plan: SubscriptionPlan; subscription: Subscription }> {
    // First create the plan
    const planData: Omit<SubscriptionPlan, 'id'> = {
      name: `Plan Mensual - Contrato ${contractId}`,
      amount: Math.round(monthlyAmount * 100),
      currency: 'MXN',
      interval: 'month',
      frequency: 1
    };

    return this.createSubscriptionPlan(planData).pipe(
      map(async (plan) => {
        // Create customer if needed
        let customer: ConektaCustomer;
        try {
          customer = await this.createCustomer({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone
          }).toPromise();
        } catch (error) {
          // Customer might already exist, try to get it
          throw error;
        }

        // Create subscription
        const subscriptionData: Omit<Subscription, 'id' | 'status'> = {
          plan_id: plan.id!,
          customer_id: customer.id!,
          subscription_start: startDate.getTime()
        };

        const subscription = await this.createSubscription(subscriptionData).toPromise();

        return { plan, subscription };
      }),
      catchError(this.handleError)
    );
  }

  // Error handling
  private handleError(error: any) {
    let errorMessage = 'Payment processing failed';
    
    if (error.error && error.error.details) {
      errorMessage = error.error.details.map((detail: any) => detail.message).join(', ');
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('Conekta Payment Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Test methods for development
  createTestPayment(amount: number = 100): Observable<PaymentResponse> {
    return this.processPayment({
      amount: amount * 100, // $1.00 MXN in cents
      currency: 'MXN',
      description: 'Pago de prueba',
      customer: {
        name: 'Cliente de Prueba',
        email: 'test@conductores.com',
        phone: '+525555555555'
      },
      payment_method: {
        type: 'card',
        token: 'tok_test_visa_4242' // Test token
      }
    });
  }
}