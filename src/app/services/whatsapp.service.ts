import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface WhatsAppMessage {
  recipient_type: 'individual';
  to: string; // Phone number with country code (e.g., "5215512345678")
  type: 'template' | 'text';
  template?: {
    name: string;
    language: {
      code: string; // e.g., "es_MX"
    };
    components: WhatsAppTemplateComponent[];
  };
  text?: {
    body: string;
  };
}

interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: WhatsAppParameter[];
  sub_type?: 'url';
  index?: number; // For buttons
}

interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename: string;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: {
    input: string;
    wa_id: string;
  }[];
  messages: {
    id: string;
    message_status: 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';
  }[];
}

interface WhatsAppWebhook {
  object: string;
  entry: {
    id: string;
    changes: {
      field: string;
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: {
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: any[];
        }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          text: {
            body: string;
          };
          type: 'text';
        }[];
      };
    }[];
  }[];
}

interface PaymentNotificationTemplate {
  client_name: string;
  amount: number;
  due_date: string;
  payment_link: string;
  reference: string;
}

interface GNVOverageTemplate {
  client_name: string;
  month: string;
  overage_amount: number;
  total_consumption: number;
  payment_link: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'] || 'your-phone-number-id';
  private readonly accessToken = process.env['WHATSAPP_ACCESS_TOKEN'] || 'your-access-token';
  private readonly webhookVerifyToken = process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] || 'your-verify-token';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    });
  }

  // ==============================
  // CORE MESSAGING
  // ==============================

  sendMessage(message: WhatsAppMessage): Observable<WhatsAppResponse> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    return this.http.post<WhatsAppResponse>(url, {
      messaging_product: 'whatsapp',
      ...message
    }, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  sendTextMessage(to: string, text: string): Observable<WhatsAppResponse> {
    const message: WhatsAppMessage = {
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: { body: text }
    };

    return this.sendMessage(message);
  }

  sendTemplateMessage(
    to: string, 
    templateName: string, 
    languageCode: string = 'es_MX',
    components: WhatsAppTemplateComponent[] = []
  ): Observable<WhatsAppResponse> {
    const message: WhatsAppMessage = {
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components
      }
    };

    return this.sendMessage(message);
  }

  // ==============================
  // BUSINESS LOGIC TEMPLATES
  // ==============================

  sendPaymentNotification(
    phoneNumber: string,
    templateData: PaymentNotificationTemplate
  ): Observable<WhatsAppResponse> {
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: templateData.client_name },
          { 
            type: 'currency', 
            currency: {
              fallback_value: `$${templateData.amount.toLocaleString('es-MX')}`,
              code: 'MXN',
              amount_1000: templateData.amount * 1000
            }
          },
          { type: 'text', text: templateData.due_date },
          { type: 'text', text: templateData.reference }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: templateData.payment_link }
        ]
      }
    ];

    return this.sendTemplateMessage(
      phoneNumber,
      'payment_notification', // Template name in WhatsApp Business
      'es_MX',
      components
    );
  }

  sendGNVOverageNotification(
    phoneNumber: string,
    templateData: GNVOverageTemplate
  ): Observable<WhatsAppResponse> {
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: templateData.client_name },
          { type: 'text', text: templateData.month },
          { type: 'text', text: templateData.total_consumption.toString() },
          { 
            type: 'currency', 
            currency: {
              fallback_value: `$${templateData.overage_amount.toLocaleString('es-MX')}`,
              code: 'MXN',
              amount_1000: templateData.overage_amount * 1000
            }
          }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: templateData.payment_link }
        ]
      }
    ];

    return this.sendTemplateMessage(
      phoneNumber,
      'gnv_overage_notification',
      'es_MX',
      components
    );
  }

  sendDocumentPendingNotification(
    phoneNumber: string,
    clientName: string,
    documentType: string,
    advisorName: string
  ): Observable<WhatsAppResponse> {
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: documentType },
          { type: 'text', text: advisorName }
        ]
      }
    ];

    return this.sendTemplateMessage(
      phoneNumber,
      'document_pending',
      'es_MX',
      components
    );
  }

  sendContractApprovedNotification(
    phoneNumber: string,
    clientName: string,
    contractNumber: string,
    advisorName: string
  ): Observable<WhatsAppResponse> {
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: contractNumber },
          { type: 'text', text: advisorName }
        ]
      }
    ];

    return this.sendTemplateMessage(
      phoneNumber,
      'contract_approved',
      'es_MX',
      components
    );
  }

  sendWelcomeMessage(
    phoneNumber: string,
    clientName: string,
    advisorName: string,
    ecosystemName: string
  ): Observable<WhatsAppResponse> {
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: clientName },
          { type: 'text', text: advisorName },
          { type: 'text', text: ecosystemName }
        ]
      }
    ];

    return this.sendTemplateMessage(
      phoneNumber,
      'welcome_message',
      'es_MX',
      components
    );
  }

  // ==============================
  // WEBHOOK HANDLING
  // ==============================

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  processWebhook(webhook: WhatsAppWebhook): void {
    webhook.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages') {
          // Process status updates
          if (change.value.statuses) {
            change.value.statuses.forEach(status => {
              this.handleMessageStatus(status);
            });
          }

          // Process incoming messages
          if (change.value.messages) {
            change.value.messages.forEach(message => {
              this.handleIncomingMessage(message);
            });
          }
        }
      });
    });
  }

  private handleMessageStatus(status: any): void {
    console.log('Message status update:', status);
    
    // Update message status in your database
    // This would typically call your backend API
    this.updateMessageStatus(status.id, status.status, status.timestamp).subscribe({
      next: (response) => console.log('Status updated:', response),
      error: (error) => console.error('Failed to update status:', error)
    });
  }

  private handleIncomingMessage(message: any): void {
    console.log('Incoming message:', message);
    
    // Process incoming message
    // This might trigger auto-responses or save to database
    this.processIncomingMessage(message).subscribe({
      next: (response) => console.log('Message processed:', response),
      error: (error) => console.error('Failed to process message:', error)
    });
  }

  private updateMessageStatus(messageId: string, status: string, timestamp: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/whatsapp/messages/${messageId}/status`, {
      status,
      timestamp
    }, {
      headers: { 'Authorization': `Bearer ${this.getBackendToken()}` }
    });
  }

  private processIncomingMessage(message: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/whatsapp/messages/incoming`, {
      message
    }, {
      headers: { 'Authorization': `Bearer ${this.getBackendToken()}` }
    });
  }

  // ==============================
  // UTILITY METHODS
  // ==============================

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with 52 for Mexico
    if (cleaned.startsWith('52')) {
      return cleaned;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      // Handle US numbers
      return cleaned;
    } else if (cleaned.length === 10) {
      // Add Mexico country code
      return '52' + cleaned;
    }
    
    return cleaned;
  }

  private getBackendToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  private handleError(error: any) {
    console.error('WhatsApp API Error:', error);
    
    let errorMessage = 'WhatsApp message failed';
    if (error.error && error.error.error) {
      errorMessage = error.error.error.message || errorMessage;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // ==============================
  // BULK OPERATIONS
  // ==============================

  sendBulkPaymentNotifications(
    notifications: { phone: string; data: PaymentNotificationTemplate }[]
  ): Observable<{ successful: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    return new Observable(observer => {
      const promises = notifications.map(async (notification) => {
        try {
          const result = await this.sendPaymentNotification(notification.phone, notification.data).toPromise();
          results.push({ phone: notification.phone, success: true, result });
          successful++;
        } catch (error) {
          results.push({ phone: notification.phone, success: false, error });
          failed++;
        }
      });

      Promise.all(promises).then(() => {
        observer.next({ successful, failed, results });
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  // ==============================
  // TEMPLATE MANAGEMENT
  // ==============================

  getTemplateStatus(templateName: string): Observable<any> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/message_templates`;
    
    return this.http.get(url, {
      headers: this.getHeaders(),
      params: { name: templateName }
    }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  // ==============================
  // ANALYTICS & REPORTING
  // ==============================

  getMessageAnalytics(startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/whatsapp/analytics`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { 'Authorization': `Bearer ${this.getBackendToken()}` }
    });
  }

  getDeliveryReport(messageId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/whatsapp/messages/${messageId}/report`, {
      headers: { 'Authorization': `Bearer ${this.getBackendToken()}` }
    });
  }
}