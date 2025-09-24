# 🧪 WEBHOOK TESTING SCRIPTS - Complete QA Suite

**Conductores PWA | Webhook Integration Testing**

---

## 🎯 **OVERVIEW**

Scripts completos para QA testing de **todos los webhooks** con:
- ✅ Payloads válidos/erróneos  
- ✅ Expected results + validación HMAC
- ✅ Retry/backoff simulation
- ✅ NEON database verification queries

---

## 📋 **TESTING SETUP**

### **Environment Variables** (BFF .env.staging)
```bash
# Webhook Secrets
ODOO_WEBHOOK_SECRET=odoo_secret_staging_123
MIFIEL_WEBHOOK_SECRET=mifiel_secret_456
CONEKTA_WEBHOOK_SECRET=key_staging_conekta_789
METAMAP_WEBHOOK_SECRET=metamap_secret_abc
GNV_WEBHOOK_SECRET=gnv_secret_def

# BFF Webhook Base URL
BFF_BASE_URL=http://localhost:3000
```

### **HMAC Signature Generation** (Node.js helper)
```javascript
const crypto = require('crypto');

function generateHMAC(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Usage example
const signature = generateHMAC(payload, process.env.ODOO_WEBHOOK_SECRET);
console.log(`X-Signature: sha256=${signature}`);
```

---

## 🏢 **1. ODOO WEBHOOK TESTS**

### **Test 1.1: Invoice Paid - Valid Payload**
```bash
curl -X POST http://localhost:3000/bff/webhooks/odoo \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "invoice.paid",
    "invoice_id": "INV-2025-001",
    "amount": 38500.00,
    "client_id": "CLI-001",
    "payment_date": "2025-09-15T10:30:00Z",
    "currency": "MXN",
    "contract_id": "CNT-789"
  }'
```

**Expected Result**: 
```json
{
  "status": "success",
  "message": "Invoice payment processed",
  "webhook_id": "wh_12345"
}
```

### **Test 1.2: Contract Activated - Valid Payload**
```bash
curl -X POST http://localhost:3000/bff/webhooks/odoo \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "contract.activated",
    "contract_id": "CNT-789",
    "client_id": "CLI-001",
    "product_id": "PRD-AUTO-456",
    "activation_date": "2025-09-15T11:00:00Z",
    "monthly_payment": 6500.00
  }'
```

### **Test 1.3: Invalid HMAC - Should Fail**
```bash
curl -X POST http://localhost:3000/bff/webhooks/odoo \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=invalid_signature_123" \
  -d '{
    "event": "invoice.paid",
    "invoice_id": "INV-2025-002"
  }'
```

**Expected Result**: 
```json
{
  "error": "Invalid signature",
  "status": 401
}
```

---

## 📋 **2. MIFIEL WEBHOOK TESTS**

### **Test 2.1: Document Signed - Valid Payload**
```bash
curl -X POST http://localhost:3000/bff/webhooks/mifiel \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "document.signed",
    "document_id": "DOC-456",
    "signed_url": "https://api.mifiel.com/docs/signed/DOC-456.pdf",
    "client_id": "CLI-001",
    "contract_id": "CNT-789",
    "signed_at": "2025-09-15T12:00:00Z",
    "signers": [
      {
        "email": "cliente@example.com",
        "status": "signed"
      }
    ]
  }'
```

### **Test 2.2: Document Failed - Error Handling**
```bash
curl -X POST http://localhost:3000/bff/webhooks/mifiel \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "document.failed",
    "document_id": "DOC-457",
    "client_id": "CLI-001",
    "error_reason": "signer_declined",
    "failed_at": "2025-09-15T13:00:00Z"
  }'
```

---

## 💳 **3. CONEKTA WEBHOOK TESTS**

### **Test 3.1: Payment Succeeded - OXXO**
```bash
curl -X POST http://localhost:3000/bff/webhooks/conekta \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "order.paid",
    "data": {
      "object": {
        "id": "ord_2tKZHxtq5LqGbW24p",
        "amount": 3850000,
        "currency": "MXN",
        "customer_info": {
          "email": "cliente@example.com",
          "phone": "+525551234567"
        },
        "payment_status": "paid",
        "metadata": {
          "client_id": "CLI-001",
          "contract_id": "CNT-789"
        }
      }
    }
  }'
```

### **Test 3.2: Payment Failed - Card Declined**
```bash
curl -X POST http://localhost:3000/bff/webhooks/conekta \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "charge.declined",
    "data": {
      "object": {
        "id": "ord_2tKZHxtq5LqGbW24q",
        "failure_code": "insufficient_funds",
        "failure_message": "La tarjeta no tiene fondos suficientes",
        "metadata": {
          "client_id": "CLI-001"
        }
      }
    }
  }'
```

---

## 🔍 **4. METAMAP KYC WEBHOOK TESTS**

### **Test 4.1: KYC Approved - Valid Identity**
```bash
curl -X POST http://localhost:3000/bff/webhooks/metamap \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "verification_completed",
    "verification_id": "VER-001-2025",
    "resource": "verification",
    "status": "approved",
    "client_id": "CLI-001",
    "verification_data": {
      "document_type": "national_id",
      "document_number": "ABCD123456EFG",
      "full_name": "Juan Pérez García",
      "date_of_birth": "1990-05-15",
      "confidence_score": 0.95
    }
  }'
```

### **Test 4.2: KYC Rejected - Document Issues**
```bash
curl -X POST http://localhost:3000/bff/webhooks/metamap \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "verification_completed",
    "verification_id": "VER-002-2025",
    "status": "rejected",
    "client_id": "CLI-002",
    "rejection_reasons": [
      "document_quality_poor",
      "face_mismatch"
    ]
  }'
```

---

## ⛽ **5. GNV STATION WEBHOOK TESTS**

### **Test 5.1: Daily T+1 Batch - Valid Data**
```bash
curl -X POST http://localhost:3000/bff/webhooks/gnv \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "daily_batch_uploaded",
    "station_id": "STN-001-CDMX",
    "batch_date": "2025-09-14",
    "total_transactions": 45,
    "total_volume": 1250.5,
    "total_revenue": 16500.75,
    "health_score": 0.87,
    "transactions": [
      {
        "folio": "TXN-001",
        "plate": "ABC-123-XYZ",
        "ibutton_id": "IBTN-567890",
        "volume_leq": 35.6,
        "price_per_liter": 13.25,
        "total_amount": 471.70,
        "recaudo": 300.00,
        "timestamp": "2025-09-14T08:15:00Z"
      },
      {
        "folio": "TXN-002", 
        "plate": "DEF-456-ABC",
        "ibutton_id": "IBTN-567891",
        "volume_leq": 28.3,
        "price_per_liter": 13.25,
        "total_amount": 374.98,
        "recaudo": 250.00,
        "timestamp": "2025-09-14T09:30:00Z"
      }
    ]
  }'
```

### **Test 5.2: Station Alert - Low Health Score**
```bash
curl -X POST http://localhost:3000/bff/webhooks/gnv \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=CALCULATED_HMAC_HERE" \
  -d '{
    "event": "station_alert",
    "station_id": "STN-002-GDL",
    "alert_type": "low_health_score",
    "health_score": 0.72,
    "threshold": 0.85,
    "alert_time": "2025-09-15T14:00:00Z",
    "issues": [
      "missing_transactions_12h",
      "pressure_below_threshold"
    ]
  }'
```

---

## 🔄 **6. RETRY/BACKOFF SIMULATION TESTS**

### **Test 6.1: Simulate BFF Timeout (503 Error)**
```bash
# Simulate temporary service unavailability
curl -X POST http://localhost:3000/bff/webhooks/simulate-timeout \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "odoo",
    "simulate_error": "service_unavailable",
    "duration_seconds": 10
  }'
```

### **Test 6.2: Force Retry Logic**
```bash
# Test retry mechanism
curl -X POST http://localhost:3000/bff/webhooks/test-retry \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_event_id": "wh_12345",
    "force_retry": true,
    "max_attempts": 3
  }'
```

---

## 🗃️ **7. NEON DATABASE VERIFICATION QUERIES**

### **Check Webhook Events Table**
```sql
-- Verify webhook was received and processed
SELECT 
  id, 
  provider, 
  payload->>'event' as event_type,
  status, 
  retries,
  received_at,
  processed_at
FROM webhook_events 
WHERE provider = 'odoo' 
ORDER BY received_at DESC 
LIMIT 10;
```

### **Check Contract Updates**
```sql
-- Verify contract was updated after Mifiel signature
SELECT 
  id,
  client_id,
  signed_url,
  status,
  updated_at
FROM contracts 
WHERE signed_url IS NOT NULL 
ORDER BY updated_at DESC 
LIMIT 5;
```

### **Check Payment Transactions**
```sql  
-- Verify payment was recorded from Conekta
SELECT 
  id,
  client_id,
  amount,
  payment_method,
  status,
  conekta_order_id,
  created_at
FROM transactions 
WHERE payment_method = 'OXXO'
ORDER BY created_at DESC 
LIMIT 10;
```

### **Check GNV Health Scores**
```sql
-- Verify GNV station health calculation
SELECT 
  station_id,
  batch_date,
  total_transactions,
  health_score,
  created_at
FROM gnv_daily_reports 
WHERE health_score < 0.85 
ORDER BY batch_date DESC;
```

### **Check KYC Status Updates**
```sql
-- Verify KYC status from MetaMap
SELECT 
  id,
  email,
  kyc_status,
  kyc_verification_id,
  health_score,
  updated_at
FROM clients 
WHERE kyc_status = 'approved'
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## ⚡ **8. AUTOMATED TEST SUITE (Node.js)**

### **Complete Webhook Test Runner**
```javascript
// webhook-test-runner.js
const axios = require('axios');
const crypto = require('crypto');

class WebhookTestRunner {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async testWebhook(provider, endpoint, payload, secret, expectedStatus = 200) {
    try {
      const signature = this.generateSignature(payload, secret);
      
      const response = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `sha256=${signature}`
        }
      });

      const result = {
        provider,
        status: 'PASS',
        statusCode: response.status,
        expected: expectedStatus,
        payload: payload.event || payload.data?.object?.id
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result = {
        provider,
        status: 'FAIL', 
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      };
      
      this.results.push(result);
      return result;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Webhook Test Suite...\n');

    // Odoo Tests
    await this.testWebhook('odoo', '/bff/webhooks/odoo', {
      event: 'invoice.paid',
      invoice_id: 'TEST-INV-001',
      amount: 38500,
      client_id: 'CLI-TEST-001'
    }, process.env.ODOO_WEBHOOK_SECRET);

    // Mifiel Tests  
    await this.testWebhook('mifiel', '/bff/webhooks/mifiel', {
      event: 'document.signed',
      document_id: 'TEST-DOC-001',
      signed_url: 'https://test.mifiel.com/doc.pdf',
      client_id: 'CLI-TEST-001'
    }, process.env.MIFIEL_WEBHOOK_SECRET);

    // Conekta Tests
    await this.testWebhook('conekta', '/bff/webhooks/conekta', {
      event: 'order.paid',
      data: {
        object: {
          id: 'ord_test_001',
          amount: 3850000,
          currency: 'MXN',
          metadata: { client_id: 'CLI-TEST-001' }
        }
      }
    }, process.env.CONEKTA_WEBHOOK_SECRET);

    // Generate Report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 WEBHOOK TEST RESULTS:');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${(passed / this.results.length * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.provider}: ${result.status} (${result.statusCode})`);
    });
  }
}

// Run tests
const runner = new WebhookTestRunner('http://localhost:3000');
runner.runAllTests();
```

---

## 🎯 **9. POSTMAN COLLECTION EXPORT**

### **Collection Structure**
```json
{
  "info": {
    "name": "Conductores Webhooks",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "bff_base_url",
      "value": "http://localhost:3000"
    }
  ],
  "item": [
    {
      "name": "Odoo Webhooks",
      "item": [
        {
          "name": "Invoice Paid",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-Signature",
                "value": "sha256={{hmac_signature}}"
              }
            ],
            "url": "{{bff_base_url}}/bff/webhooks/odoo",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"event\": \"invoice.paid\",\n  \"invoice_id\": \"INV-TEST-001\"\n}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## ✅ **10. SUCCESS CRITERIA**

### **QA Validation Checklist**
- [ ] **HMAC Validation**: All webhooks reject invalid signatures (401)
- [ ] **Payload Processing**: Valid payloads return 200 with success message  
- [ ] **Database Persistence**: Events stored in `webhook_events` table
- [ ] **Business Logic**: Data correctly updated in respective tables
- [ ] **Retry Logic**: Failed webhooks retry with exponential backoff
- [ ] **Error Handling**: Invalid payloads return descriptive error messages
- [ ] **Health Score Calculation**: GNV health scores calculated correctly (>85% target)
- [ ] **Performance**: Webhook processing < 500ms average response time

### **Production Ready Metrics**
- **Webhook Success Rate**: >95%
- **Average Response Time**: <300ms  
- **Retry Success Rate**: >80%
- **Database Consistency**: 100% (no orphaned records)

---

**🎖️ Con estos scripts, QA puede validar completamente la robustez del sistema de webhooks y garantizar 95%+ reliability en producción.**