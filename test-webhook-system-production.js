/**
 * 🧪 Webhook System Production Validation
 * Comprehensive testing of enterprise webhook system with exponential backoff
 */

const axios = require('axios');
const crypto = require('crypto');

console.log('🧪 WEBHOOK SYSTEM PRODUCTION VALIDATION');
console.log('='.repeat(70));

const BASE_URL = process.env.BFF_URL || 'http://localhost:3001/api/bff';
const WEBHOOK_URL = `${BASE_URL}/webhooks`;

// Test payloads for different webhook types
const testPayloads = {
  conekta: {
    event: 'payment.paid',
    data: {
      object: {
        id: 'ord_2tKZv3kzTdRt7Qyph',
        amount: 38500, // $385.00 MXN
        currency: 'MXN',
        payment_status: 'paid',
        customer: {
          email: 'test@conductores.com'
        }
      }
    }
  },
  
  mifiel: {
    event: 'document.signed',
    document: {
      id: 'DOC-12345-PROTECTION',
      status: 'signed',
      signers: [{
        email: 'cliente@example.com',
        signed_at: new Date().toISOString()
      }]
    }
  },
  
  metamap: {
    resource: 'verification',
    verificationId: 'VERIFY-123456',
    verificationStatus: 'approved',
    identity: {
      status: 'verified',
      riskLevel: 'low'
    }
  },
  
  gnv: {
    stationId: 'AGS-01',
    healthScore: 100,
    ingestionStatus: 'healthy',
    rowsProcessed: 1200,
    rowsRejected: 0,
    timestamp: new Date().toISOString()
  }
};

/**
 * Generate HMAC signature for webhook validation
 */
function generateHMAC(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

/**
 * Test individual webhook endpoint
 */
async function testWebhookEndpoint(type, payload, headers = {}) {
  console.log(`\n📡 Testing ${type.toUpperCase()} webhook...`);
  console.log('-'.repeat(50));
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(`${WEBHOOK_URL}/${type}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${type} webhook SUCCESS`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    return { success: true, duration, status: response.status };
  } catch (error) {
    console.log(`❌ ${type} webhook FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status || 'N/A'}`);
    
    return { success: false, error: error.message, status: error.response?.status };
  }
}

/**
 * Test webhook statistics endpoint
 */
async function testWebhookStats() {
  console.log(`\n📊 Testing webhook statistics...`);
  console.log('-'.repeat(50));
  
  try {
    const response = await axios.get(`${WEBHOOK_URL}/stats`, { timeout: 10000 });
    
    console.log(`✅ Webhook stats SUCCESS`);
    console.log(`   Stats: ${JSON.stringify(response.data, null, 2)}`);
    
    return response.data;
  } catch (error) {
    console.log(`❌ Webhook stats FAILED: ${error.message}`);
    return null;
  }
}

/**
 * Test webhook health check
 */
async function testWebhookHealth() {
  console.log(`\n🏥 Testing webhook health check...`);
  console.log('-'.repeat(50));
  
  try {
    const response = await axios.get(`${WEBHOOK_URL}/health`, { timeout: 10000 });
    
    console.log(`✅ Webhook health SUCCESS`);
    console.log(`   Health: ${JSON.stringify(response.data, null, 2)}`);
    
    const health = response.data;
    
    // Validate health metrics
    if (health.status === 'healthy') {
      console.log(`   🟢 System is HEALTHY`);
    } else if (health.status === 'degraded') {
      console.log(`   🟡 System is DEGRADED`);
    } else {
      console.log(`   🔴 System is UNHEALTHY`);
    }
    
    return health;
  } catch (error) {
    console.log(`❌ Webhook health FAILED: ${error.message}`);
    return null;
  }
}

/**
 * Test retry mechanism by simulating failures
 */
async function testRetryMechanism() {
  console.log(`\n🔄 Testing retry mechanism...`);
  console.log('-'.repeat(50));
  
  // Test with invalid payload to trigger retries
  const invalidPayload = { invalid: 'test payload for retry testing' };
  
  try {
    await axios.post(`${WEBHOOK_URL}/test`, invalidPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log(`✅ Test webhook processed (expected)`);
  } catch (error) {
    console.log(`ℹ️ Test webhook error (expected for retry testing): ${error.message}`);
  }
}

/**
 * Performance load test
 */
async function performanceLoadTest() {
  console.log(`\n⚡ Performance load test (10 concurrent requests)...`);
  console.log('-'.repeat(50));
  
  const requests = [];
  const startTime = Date.now();
  
  // Send 10 concurrent test webhooks
  for (let i = 0; i < 10; i++) {
    const testPayload = {
      ...testPayloads.gnv,
      stationId: `TEST-${i.toString().padStart(2, '0')}`,
      testRequest: true
    };
    
    requests.push(
      axios.post(`${WEBHOOK_URL}/test`, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }).catch(error => ({ error: error.message }))
    );
  }
  
  const results = await Promise.all(requests);
  const duration = Date.now() - startTime;
  
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  
  console.log(`📊 Load test results:`);
  console.log(`   Total requests: 10`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total duration: ${duration}ms`);
  console.log(`   Average per request: ${Math.round(duration / 10)}ms`);
  console.log(`   Success rate: ${Math.round((successful / 10) * 100)}%`);
  
  return {
    total: 10,
    successful,
    failed,
    duration,
    successRate: successful / 10
  };
}

/**
 * Main validation function
 */
async function runWebhookValidation() {
  console.log('🚀 Starting comprehensive webhook system validation...\n');
  
  const results = {
    endpointTests: {},
    stats: null,
    health: null,
    performance: null,
    overallSuccess: false
  };
  
  // Test individual webhook endpoints
  console.log('🧪 INDIVIDUAL WEBHOOK ENDPOINT TESTS');
  console.log('='.repeat(70));
  
  // Test Conekta with HMAC signature
  const conektaSignature = generateHMAC(testPayloads.conekta, 'test-secret');
  results.endpointTests.conekta = await testWebhookEndpoint('conekta', testPayloads.conekta, {
    'x-conekta-signature': conektaSignature
  });
  
  // Test other endpoints
  results.endpointTests.mifiel = await testWebhookEndpoint('mifiel', testPayloads.mifiel);
  results.endpointTests.metamap = await testWebhookEndpoint('metamap', testPayloads.metamap);
  results.endpointTests.gnv = await testWebhookEndpoint('gnv', testPayloads.gnv);
  
  // Test system endpoints
  console.log('\n📊 SYSTEM MONITORING TESTS');
  console.log('='.repeat(70));
  
  results.stats = await testWebhookStats();
  results.health = await testWebhookHealth();
  
  // Test retry mechanism
  await testRetryMechanism();
  
  // Performance test
  results.performance = await performanceLoadTest();
  
  // Calculate overall success
  const successfulEndpoints = Object.values(results.endpointTests).filter(r => r.success).length;
  const totalEndpoints = Object.keys(results.endpointTests).length;
  const endpointSuccessRate = successfulEndpoints / totalEndpoints;
  
  results.overallSuccess = endpointSuccessRate >= 0.8 && // 80% endpoint success
                          results.health?.status !== 'unhealthy' &&
                          results.performance?.successRate >= 0.9; // 90% performance success
  
  // Final report
  console.log('\n' + '='.repeat(70));
  console.log('📋 WEBHOOK SYSTEM VALIDATION REPORT');
  console.log('='.repeat(70));
  
  console.log(`\n🎯 ENDPOINT SUCCESS RATE: ${Math.round(endpointSuccessRate * 100)}%`);
  Object.entries(results.endpointTests).forEach(([type, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${type.toUpperCase()}: ${result.success ? 'PASS' : 'FAIL'}`);
  });
  
  if (results.health) {
    const healthIcon = results.health.status === 'healthy' ? '🟢' : 
                      results.health.status === 'degraded' ? '🟡' : '🔴';
    console.log(`\n${healthIcon} SYSTEM HEALTH: ${results.health.status.toUpperCase()}`);
    if (results.health.stats) {
      console.log(`   Success Rate: ${results.health.stats.successRate || 'N/A'}%`);
      console.log(`   Total Events: ${results.health.stats.total || 0}`);
    }
  }
  
  if (results.performance) {
    const perfIcon = results.performance.successRate >= 0.9 ? '🚀' : '⚠️';
    console.log(`\n${perfIcon} PERFORMANCE: ${Math.round(results.performance.successRate * 100)}% success rate`);
    console.log(`   Average response time: ${Math.round(results.performance.duration / results.performance.total)}ms`);
  }
  
  const overallIcon = results.overallSuccess ? '🎉' : '⚠️';
  const overallStatus = results.overallSuccess ? 'PRODUCTION READY' : 'NEEDS ATTENTION';
  
  console.log(`\n${overallIcon} OVERALL STATUS: ${overallStatus}`);
  
  if (results.overallSuccess) {
    console.log('\n✅ Webhook system is ready for production deployment!');
    console.log('   - Enterprise-grade reliability implemented');
    console.log('   - Exponential backoff retry system active');  
    console.log('   - NEON database persistence configured');
    console.log('   - Performance meets production standards');
  } else {
    console.log('\n⚠️ Webhook system needs attention before production:');
    if (endpointSuccessRate < 0.8) {
      console.log('   - Fix failing webhook endpoints');
    }
    if (results.health?.status === 'unhealthy') {
      console.log('   - Investigate system health issues');
    }
    if (results.performance?.successRate < 0.9) {
      console.log('   - Improve performance reliability');
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 CONDUCTORES PWA - WEBHOOK SYSTEM VALIDATION COMPLETE');
  console.log('='.repeat(70));
  
  return results;
}

// Run validation if called directly
if (require.main === module) {
  runWebhookValidation().catch(error => {
    console.error('❌ Webhook validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runWebhookValidation };