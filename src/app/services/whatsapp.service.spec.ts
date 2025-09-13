import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WhatsappService } from './whatsapp.service';
import { environment } from '../../environments/environment';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let httpMock: HttpTestingController;
  
  const mockEnvironment = {
    apiUrl: 'http://localhost:3000/api'
  };
  
  const whatsappBaseUrl = 'https://graph.facebook.com/v18.0';
  const mockPhoneNumberId = 'test-phone-number-id';
  const mockAccessToken = 'test-access-token';
  const mockVerifyToken = 'test-verify-token';
  
  const mockWhatsAppResponse = {
    messaging_product: 'whatsapp',
    contacts: [{
      input: '525512345678',
      wa_id: '525512345678'
    }],
    messages: [{
      id: 'wamid.test123',
      message_status: 'accepted' as const
    }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WhatsappService]
    });
    
    service = TestBed.inject(WhatsappService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Mock environment
    spyOnProperty(environment, 'apiUrl', 'get').and.returnValue(mockEnvironment.apiUrl);
    
    // Mock globalThis.process.env for the service
    (globalThis as any).process = {
      env: {
        'WHATSAPP_PHONE_NUMBER_ID': mockPhoneNumberId,
        'WHATSAPP_ACCESS_TOKEN': mockAccessToken,
        'WHATSAPP_WEBHOOK_VERIFY_TOKEN': mockVerifyToken
      }
    };
    
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue('test-auth-token');
  });

  afterEach(() => {
    httpMock.verify();
    // Clean up globalThis.process mock
    delete (globalThis as any).process;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Core Messaging', () => {

    it('should send text message successfully', (done) => {
      const phoneNumber = '5512345678';
      const messageText = 'Hola, este es un mensaje de prueba';

      service.sendTextMessage(phoneNumber, messageText).subscribe(response => {
        expect(response.messages[0].message_status).toBe('accepted');
        expect(response.contacts[0].wa_id).toBe('525512345678');
        done();
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockAccessToken}`);
      expect(req.request.body).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '525512345678',
        type: 'text',
        text: { body: messageText }
      });

      req.flush(mockWhatsAppResponse);
    });

    it('should send template message successfully', (done) => {
      const phoneNumber = '525512345678';
      const templateName = 'welcome_message';
      const components = [{
        type: 'body' as const,
        parameters: [
          { type: 'text' as const, text: 'Juan Pérez' }
        ]
      }];

      service.sendTemplateMessage(phoneNumber, templateName, 'es_MX', components).subscribe(response => {
        expect(response.messages[0].message_status).toBe('accepted');
        done();
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.template.name).toBe(templateName);
      expect(req.request.body.template.language.code).toBe('es_MX');
      expect(req.request.body.template.components).toEqual(components);

      req.flush(mockWhatsAppResponse);
    });

    it('should handle message sending errors', (done) => {
      const phoneNumber = '5512345678';
      const messageText = 'Test message';

      service.sendTextMessage(phoneNumber, messageText).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid phone number format');
          done();
        }
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      req.flush({
        error: {
          message: 'Invalid phone number format'
        }
      }, {
        status: 400,
        statusText: 'Bad Request'
      });
    });
  });

  describe('Business Logic Templates', () => {
    it('should send payment notification', (done) => {
      const phoneNumber = '525512345678';
      const templateData = {
        client_name: 'María González',
        amount: 15000,
        due_date: '15 de Marzo, 2024',
        payment_link: 'pay.conductores.com/abc123',
        reference: 'REF-2024-001'
      };

      service.sendPaymentNotification(phoneNumber, templateData).subscribe(response => {
        expect(response.messages[0].message_status).toBe('accepted');
        done();
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.template.name).toBe('payment_notification');
      
      const bodyComponent = req.request.body.template.components.find((c: any) => c.type === 'body');
      expect(bodyComponent.parameters[0].text).toBe(templateData.client_name);
      expect(bodyComponent.parameters[1].currency.amount_1000).toBe(15000000);
      expect(bodyComponent.parameters[2].text).toBe(templateData.due_date);
      
      const buttonComponent = req.request.body.template.components.find((c: any) => c.type === 'button');
      expect(buttonComponent.parameters[0].text).toBe(templateData.payment_link);

      req.flush(mockWhatsAppResponse);
    });

    it('should send GNV overage notification', (done) => {
      const phoneNumber = '525512345678';
      const templateData = {
        client_name: 'Carlos Ruiz',
        month: 'Febrero 2024',
        overage_amount: 2500,
        total_consumption: 1200,
        payment_link: 'pay.conductores.com/gnv456'
      };

      service.sendGNVOverageNotification(phoneNumber, templateData).subscribe(response => {
        expect(response.messages[0].message_status).toBe('accepted');
        done();
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.template.name).toBe('gnv_overage_notification');
      
      const bodyComponent = req.request.body.template.components.find((c: any) => c.type === 'body');
      expect(bodyComponent.parameters[0].text).toBe(templateData.client_name);
      expect(bodyComponent.parameters[1].text).toBe(templateData.month);
      expect(bodyComponent.parameters[2].text).toBe('1200');
      expect(bodyComponent.parameters[3].currency.amount_1000).toBe(2500000);

      req.flush(mockWhatsAppResponse);
    });

    it('should send document pending notification', (done) => {
      const phoneNumber = '525512345678';
      const clientName = 'Ana López';
      const documentType = 'Identificación Oficial';
      const advisorName = 'Lic. Roberto Sánchez';

      service.sendDocumentPendingNotification(phoneNumber, clientName, documentType, advisorName)
        .subscribe(response => {
          expect(response.messages[0].message_status).toBe('accepted');
          done();
        });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.template.name).toBe('document_pending');
      
      const bodyComponent = req.request.body.template.components.find((c: any) => c.type === 'body');
      expect(bodyComponent.parameters[0].text).toBe(clientName);
      expect(bodyComponent.parameters[1].text).toBe(documentType);
      expect(bodyComponent.parameters[2].text).toBe(advisorName);

      req.flush(mockWhatsAppResponse);
    });

    it('should send contract approved notification', (done) => {
      const phoneNumber = '525512345678';
      const clientName = 'José Martínez';
      const contractNumber = 'CTR-2024-015';
      const advisorName = 'Lic. Carmen Flores';

      service.sendContractApprovedNotification(phoneNumber, clientName, contractNumber, advisorName)
        .subscribe(response => {
          expect(response.messages[0].message_status).toBe('accepted');
          done();
        });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.template.name).toBe('contract_approved');
      
      const bodyComponent = req.request.body.template.components.find((c: any) => c.type === 'body');
      expect(bodyComponent.parameters[0].text).toBe(clientName);
      expect(bodyComponent.parameters[1].text).toBe(contractNumber);
      expect(bodyComponent.parameters[2].text).toBe(advisorName);

      req.flush(mockWhatsAppResponse);
    });

    it('should send welcome message', (done) => {
      const phoneNumber = '525512345678';
      const clientName = 'Patricia Hernández';
      const advisorName = 'Lic. Miguel Ángel';
      const ecosystemName = 'Conductores Aguascalientes';

      service.sendWelcomeMessage(phoneNumber, clientName, advisorName, ecosystemName)
        .subscribe(response => {
          expect(response.messages[0].message_status).toBe('accepted');
          done();
        });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.template.name).toBe('welcome_message');
      
      const bodyComponent = req.request.body.template.components.find((c: any) => c.type === 'body');
      expect(bodyComponent.parameters[0].text).toBe(clientName);
      expect(bodyComponent.parameters[1].text).toBe(advisorName);
      expect(bodyComponent.parameters[2].text).toBe(ecosystemName);

      req.flush(mockWhatsAppResponse);
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format Mexican phone numbers correctly', () => {
      const testCases = [
        { input: '5512345678', expected: '525512345678' },
        { input: '525512345678', expected: '525512345678' },
        { input: '+52 55 1234 5678', expected: '525512345678' },
        { input: '(55) 1234-5678', expected: '525512345678' }
      ];

      testCases.forEach(({ input, expected }) => {
        service.sendTextMessage(input, 'test').subscribe();
        
        const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
        expect(req.request.body.to).toBe(expected);
        
        req.flush(mockWhatsAppResponse);
      });
    });

    it('should handle US phone numbers', () => {
      const usNumber = '15551234567'; // US number starting with 1
      
      service.sendTextMessage(usNumber, 'test').subscribe();
      
      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.to).toBe('15551234567');
      
      req.flush(mockWhatsAppResponse);
    });

    it('should handle already properly formatted numbers', () => {
      const properNumber = '525512345678';
      
      service.sendTextMessage(properNumber, 'test').subscribe();
      
      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.to).toBe(properNumber);
      
      req.flush(mockWhatsAppResponse);
    });
  });

  describe('Webhook Handling', () => {
    it('should verify webhook with correct token', () => {
      const challenge = 'test-challenge-string';
      const result = service.verifyWebhook('subscribe', mockVerifyToken, challenge);
      
      expect(result).toBe(challenge);
    });

    it('should reject webhook with incorrect token', () => {
      const challenge = 'test-challenge-string';
      const result = service.verifyWebhook('subscribe', 'wrong-token', challenge);
      
      expect(result).toBeNull();
    });

    it('should reject webhook with incorrect mode', () => {
      const challenge = 'test-challenge-string';
      const result = service.verifyWebhook('wrong-mode', mockVerifyToken, challenge);
      
      expect(result).toBeNull();
    });

    it('should process webhook with message status updates', () => {
      spyOn(console, 'log');
      
      const webhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry-id',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+525512345678',
                phone_number_id: mockPhoneNumberId
              },
              statuses: [{
                id: 'wamid.test123',
                status: 'delivered' as const,
                timestamp: '1640995200',
                recipient_id: '525587654321'
              }]
            }
          }]
        }]
      };

      service.processWebhook(webhook);

      // Verify that status update API call is made
      const req = httpMock.expectOne(`${mockEnvironment.apiUrl}/whatsapp/messages/wamid.test123/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.status).toBe('delivered');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-auth-token');
      
      req.flush({ success: true });
    });

    it('should process webhook with incoming messages', () => {
      spyOn(console, 'log');
      
      const webhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry-id',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+525512345678',
                phone_number_id: mockPhoneNumberId
              },
              messages: [{
                from: '525587654321',
                id: 'wamid.incoming123',
                timestamp: '1640995200',
                text: {
                  body: 'Hola, necesito información'
                },
                type: 'text' as const
              }]
            }
          }]
        }]
      };

      service.processWebhook(webhook);

      // Verify that incoming message API call is made
      const req = httpMock.expectOne(`${mockEnvironment.apiUrl}/whatsapp/messages/incoming`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.message.from).toBe('525587654321');
      expect(req.request.body.message.text.body).toBe('Hola, necesito información');
      
      req.flush({ success: true });
    });

    it('should handle webhook processing errors gracefully', () => {
      spyOn(console, 'error');
      
      const webhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry-id',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+525512345678',
                phone_number_id: mockPhoneNumberId
              },
              statuses: [{
                id: 'wamid.error123',
                status: 'failed' as const,
                timestamp: '1640995200',
                recipient_id: '525587654321'
              }]
            }
          }]
        }]
      };

      service.processWebhook(webhook);

      const req = httpMock.expectOne(`${mockEnvironment.apiUrl}/whatsapp/messages/wamid.error123/status`);
      req.error(new ErrorEvent('API Error'), { status: 500, statusText: 'Internal Server Error' });

      expect(console.error).toHaveBeenCalledWith('Failed to update status:', jasmine.any(Object));
    });
  });

  describe('Bulk Operations', () => {
    it('should send bulk payment notifications', (done) => {
      const notifications = [
        {
          phone: '525512345678',
          data: {
            client_name: 'Cliente 1',
            amount: 10000,
            due_date: '2024-03-15',
            payment_link: 'link1',
            reference: 'REF001'
          }
        },
        {
          phone: '525587654321',
          data: {
            client_name: 'Cliente 2',
            amount: 15000,
            due_date: '2024-03-15',
            payment_link: 'link2',
            reference: 'REF002'
          }
        }
      ];

      service.sendBulkPaymentNotifications(notifications).subscribe(result => {
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.results.length).toBe(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(true);
        done();
      });

      // Handle both HTTP requests
      const req1 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      const req2 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      
      req1.flush(mockWhatsAppResponse);
      req2.flush(mockWhatsAppResponse);
    });

    it('should handle partial failures in bulk operations', (done) => {
      const notifications = [
        {
          phone: '525512345678',
          data: {
            client_name: 'Cliente 1',
            amount: 10000,
            due_date: '2024-03-15',
            payment_link: 'link1',
            reference: 'REF001'
          }
        },
        {
          phone: 'invalid-phone',
          data: {
            client_name: 'Cliente 2',
            amount: 15000,
            due_date: '2024-03-15',
            payment_link: 'link2',
            reference: 'REF002'
          }
        }
      ];

      service.sendBulkPaymentNotifications(notifications).subscribe(result => {
        expect(result.successful).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        done();
      });

      const req1 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      const req2 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      
      req1.flush(mockWhatsAppResponse);
      req2.error(new ErrorEvent('Invalid phone'), { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Template Management', () => {
    it('should get template status', (done) => {
      const templateName = 'payment_notification';
      const mockTemplateResponse = {
        data: [{
          name: templateName,
          status: 'APPROVED',
          category: 'TRANSACTIONAL'
        }]
      };

      service.getTemplateStatus(templateName).subscribe(response => {
        expect(response.data[0].name).toBe(templateName);
        expect(response.data[0].status).toBe('APPROVED');
        done();
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/message_templates?name=${templateName}`);
      expect(req.request.method).toBe('GET');
      
      req.flush(mockTemplateResponse);
    });

    it('should handle template status errors', (done) => {
      const templateName = 'non_existent_template';

      service.getTemplateStatus(templateName).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('WhatsApp message failed');
          done();
        }
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/message_templates?name=${templateName}`);
      req.error(new ErrorEvent('Template not found'), { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Analytics & Reporting', () => {
    it('should get message analytics', (done) => {
      const startDate = '2024-03-01';
      const endDate = '2024-03-31';
      const mockAnalytics = {
        sent: 150,
        delivered: 142,
        read: 98,
        failed: 8
      };

      service.getMessageAnalytics(startDate, endDate).subscribe(analytics => {
        expect(analytics.sent).toBe(150);
        expect(analytics.delivered).toBe(142);
        done();
      });

      const req = httpMock.expectOne(`${mockEnvironment.apiUrl}/whatsapp/analytics?start_date=${startDate}&end_date=${endDate}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-auth-token');
      
      req.flush(mockAnalytics);
    });

    it('should get delivery report for specific message', (done) => {
      const messageId = 'wamid.test123';
      const mockReport = {
        message_id: messageId,
        status: 'delivered',
        delivered_at: '2024-03-15T10:30:00Z',
        read_at: '2024-03-15T10:35:00Z'
      };

      service.getDeliveryReport(messageId).subscribe(report => {
        expect(report.message_id).toBe(messageId);
        expect(report.status).toBe('delivered');
        done();
      });

      const req = httpMock.expectOne(`${mockEnvironment.apiUrl}/whatsapp/messages/${messageId}/report`);
      expect(req.request.method).toBe('GET');
      
      req.flush(mockReport);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', (done) => {
      service.sendTextMessage('5512345678', 'test').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('WhatsApp message failed');
          done();
        }
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      req.flush('Network error', {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    it('should handle API errors with detailed messages', (done) => {
      service.sendTextMessage('invalid-phone', 'test').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid phone number format');
          done();
        }
      });

      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      req.flush({
        error: {
          message: 'Invalid phone number format'
        }
      }, {
        status: 400,
        statusText: 'Bad Request'
      });
    });

    it('should retry failed requests', () => {
      // Enable 2 retries (original + 2 retries = 3 total)
      (service as any).setRetryCountForTests(2);
      service.sendTextMessage('5512345678', 'test').subscribe({
        next: () => {},
        error: () => {}
      });

      // First attempt
      const req1 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      req1.flush('Network error', { status: 500, statusText: 'Internal Server Error' });
      
      // First retry
      const req2 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      req2.flush('Network error', { status: 500, statusText: 'Internal Server Error' });
      
      // Second retry
      const req3 = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      req3.flush('Network error', { status: 500, statusText: 'Internal Server Error' });
      
      // Should have made 3 attempts total (original + 2 retries)
      expect(() => httpMock.verify()).not.toThrow();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty webhook entries', () => {
      const emptyWebhook = {
        object: 'whatsapp_business_account',
        entry: []
      };

      expect(() => service.processWebhook(emptyWebhook)).not.toThrow();
    });

    it('should handle webhook with no changes', () => {
      const webhookNoChanges = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry-id',
          changes: []
        }]
      };

      expect(() => service.processWebhook(webhookNoChanges)).not.toThrow();
    });

    it('should handle very long message text', () => {
      const longMessage = 'A'.repeat(4096); // Very long message
      
      service.sendTextMessage('5512345678', longMessage).subscribe();
      
      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.text.body).toBe(longMessage);
      
      req.flush(mockWhatsAppResponse);
    });

    it('should handle special characters in phone numbers', () => {
      const phoneWithSpecialChars = '+52 (55) 1234-5678 ext. 123';
      
      service.sendTextMessage(phoneWithSpecialChars, 'test').subscribe();
      
      const req = httpMock.expectOne(`${whatsappBaseUrl}/${mockPhoneNumberId}/messages`);
      expect(req.request.body.to).toBe('525512345678123'); // All non-numeric removed
      
      req.flush(mockWhatsAppResponse);
    });
  });
});
