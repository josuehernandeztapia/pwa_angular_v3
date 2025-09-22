import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for API performance
const apiResponseTime = new Trend('api_response_time');
const apiSuccessRate = new Rate('api_success_rate');
const apiErrorCount = new Counter('api_error_count');
const apiThroughput = new Counter('api_throughput');
const concurrentUsers = new Gauge('concurrent_users');

export const options = {
  scenarios: {
    // API endpoint performance test
    api_performance: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 5 },    // Warm up
        { duration: '3m', target: 10 },   // Normal load
        { duration: '3m', target: 25 },   // High load
        { duration: '3m', target: 50 },   // Peak load
        { duration: '2m', target: 0 },    // Cool down
      ],
      tags: { test_type: 'api_performance' },
      exec: 'apiPerformanceTest'
    },
    
    // Database stress test through APIs
    database_stress: {
      executor: 'constant-arrival-rate',
      rate: 30, // 30 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 100,
      tags: { test_type: 'database_stress' },
      exec: 'databaseStressTest'
    },
    
    // Concurrent user simulation
    concurrent_users: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 200,
      maxDuration: '10m',
      tags: { test_type: 'concurrent_users' },
      exec: 'concurrentUsersTest'
    }
  },
  
  thresholds: {
    // API performance requirements
    api_response_time: ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    api_success_rate: ['rate>0.99'],                  // 99% success rate
    api_error_count: ['count<50'],                    // Less than 50 errors total
    
    // Throughput requirements
    api_throughput: ['rate>10'],                      // More than 10 req/s
    
    // HTTP-level thresholds
    http_req_duration: ['p(90)<800', 'p(95)<1200'],
    http_req_failed: ['rate<0.01'],                   // Less than 1% failure rate
    
    // Scenario-specific thresholds
    'http_req_duration{test_type:api_performance}': ['p(95)<1000'],
    'http_req_duration{test_type:database_stress}': ['p(95)<1500'],
    'http_req_duration{test_type:concurrent_users}': ['p(95)<2000'],
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test users for authentication
const testCredentials = {
  email: 'load-test@conductores.com',
  password: 'loadTestPassword123'
};

// Authentication helper
function getAuthToken() {
  const loginResponse = http.post(`${BASE_URL}/auth/login`, 
    JSON.stringify(testCredentials), 
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' }
    }
  );

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return body.token;
  }

  apiErrorCount.add(1);
  return null;
}

// API endpoint tests
function testClientAPIs(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Client APIs', () => {
    // GET /api/clients - List clients
    const clientsResponse = http.get(`${BASE_URL}/api/clients`, {
      headers,
      tags: { endpoint: 'clients_list', operation: 'read' }
    });

    const clientsSuccess = check(clientsResponse, {
      'clients list status 200': (r) => r.status === 200,
      'clients list response time < 800ms': (r) => r.timings.duration < 800,
      'clients list returns array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      }
    });

    apiSuccessRate.add(clientsSuccess);
    apiResponseTime.add(clientsResponse.timings.duration);
    apiThroughput.add(1);

    // POST /api/clients - Create client
    const newClient = {
      name: `Load Test Client ${Math.random().toString(36).substr(2, 9)}`,
      email: `loadtest${Date.now()}@example.com`,
      phone: `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
      rfc: `LTC${Date.now().toString().substr(-6)}ABC`,
      market: 'aguascalientes',
      flow: 'Venta a Plazo'
    };

    const createResponse = http.post(`${BASE_URL}/api/clients`, 
      JSON.stringify(newClient), 
      {
        headers,
        tags: { endpoint: 'clients_create', operation: 'create' }
      }
    );

    const createSuccess = check(createResponse, {
      'client create status 201': (r) => r.status === 201,
      'client create response time < 1s': (r) => r.timings.duration < 1000,
      'client create returns id': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.id !== undefined;
        } catch (e) {
          return false;
        }
      }
    });

    apiSuccessRate.add(createSuccess);
    apiResponseTime.add(createResponse.timings.duration);
    apiThroughput.add(1);

    // If client was created, test GET by ID and UPDATE
    if (createResponse.status === 201) {
      try {
        const createdClient = JSON.parse(createResponse.body);
        
        // GET /api/clients/:id - Get client details
        const detailResponse = http.get(`${BASE_URL}/api/clients/${createdClient.id}`, {
          headers,
          tags: { endpoint: 'clients_detail', operation: 'read' }
        });

        const detailSuccess = check(detailResponse, {
          'client detail status 200': (r) => r.status === 200,
          'client detail response time < 500ms': (r) => r.timings.duration < 500
        });

        apiSuccessRate.add(detailSuccess);
        apiResponseTime.add(detailResponse.timings.duration);
        apiThroughput.add(1);

        // PUT /api/clients/:id - Update client
        const updateData = {
          ...newClient,
          name: `${newClient.name} - Updated`,
          phone: `555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`
        };

        const updateResponse = http.put(`${BASE_URL}/api/clients/${createdClient.id}`,
          JSON.stringify(updateData),
          {
            headers,
            tags: { endpoint: 'clients_update', operation: 'update' }
          }
        );

        const updateSuccess = check(updateResponse, {
          'client update status 200': (r) => r.status === 200,
          'client update response time < 800ms': (r) => r.timings.duration < 800
        });

        apiSuccessRate.add(updateSuccess);
        apiResponseTime.add(updateResponse.timings.duration);
        apiThroughput.add(1);

      } catch (e) {
        apiErrorCount.add(1);
      }
    }
  });
}

function testQuoteAPIs(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Quote APIs', () => {
    // GET /api/quotes - List quotes
    const quotesResponse = http.get(`${BASE_URL}/api/quotes`, {
      headers,
      tags: { endpoint: 'quotes_list', operation: 'read' }
    });

    const quotesSuccess = check(quotesResponse, {
      'quotes list status 200': (r) => r.status === 200,
      'quotes list response time < 600ms': (r) => r.timings.duration < 600
    });

    apiSuccessRate.add(quotesSuccess);
    apiResponseTime.add(quotesResponse.timings.duration);
    apiThroughput.add(1);

    // GET /api/products - Get products catalog
    const productsResponse = http.get(`${BASE_URL}/api/products`, {
      headers,
      tags: { endpoint: 'products_catalog', operation: 'read' }
    });

    const productsSuccess = check(productsResponse, {
      'products status 200': (r) => r.status === 200,
      'products response time < 400ms': (r) => r.timings.duration < 400,
      'products returns array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      }
    });

    apiSuccessRate.add(productsSuccess);
    apiResponseTime.add(productsResponse.timings.duration);
    apiThroughput.add(1);

    // Create a test quote
    const newQuote = {
      clientId: 'test-client-001',
      productId: 'product-001',
      variant: 'premium',
      color: 'blanco',
      additionalFeatures: ['GPS'],
      downPayment: 50000,
      paymentTerms: 48
    };

    const quoteCreateResponse = http.post(`${BASE_URL}/api/quotes`,
      JSON.stringify(newQuote),
      {
        headers,
        tags: { endpoint: 'quotes_create', operation: 'create' }
      }
    );

    const quoteCreateSuccess = check(quoteCreateResponse, {
      'quote create handled': (r) => r.status === 201 || r.status === 400, // 400 if client doesn't exist
      'quote create response time < 1.2s': (r) => r.timings.duration < 1200
    });

    apiSuccessRate.add(quoteCreateSuccess);
    apiResponseTime.add(quoteCreateResponse.timings.duration);
    apiThroughput.add(1);
  });
}

function testDashboardAPIs(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Dashboard APIs', () => {
    // GET /api/dashboard/stats - Dashboard statistics
    const statsResponse = http.get(`${BASE_URL}/api/dashboard/stats`, {
      headers,
      tags: { endpoint: 'dashboard_stats', operation: 'read' }
    });

    const statsSuccess = check(statsResponse, {
      'dashboard stats status 200': (r) => r.status === 200,
      'dashboard stats response time < 300ms': (r) => r.timings.duration < 300,
      'dashboard stats has required fields': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.opportunitiesInPipeline !== undefined &&
                 data.activeContracts !== undefined;
        } catch (e) {
          return false;
        }
      }
    });

    apiSuccessRate.add(statsSuccess);
    apiResponseTime.add(statsResponse.timings.duration);
    apiThroughput.add(1);

    // GET /api/activity - Activity feed
    const activityResponse = http.get(`${BASE_URL}/api/activity?limit=20`, {
      headers,
      tags: { endpoint: 'activity_feed', operation: 'read' }
    });

    const activitySuccess = check(activityResponse, {
      'activity feed status 200': (r) => r.status === 200,
      'activity feed response time < 250ms': (r) => r.timings.duration < 250,
      'activity feed returns array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      }
    });

    apiSuccessRate.add(activitySuccess);
    apiResponseTime.add(activityResponse.timings.duration);
    apiThroughput.add(1);
  });
}

function testDocumentAPIs(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Document APIs', () => {
    // GET /api/document-requirements - Document requirements
    const requirementsResponse = http.get(`${BASE_URL}/api/document-requirements`, {
      headers,
      tags: { endpoint: 'document_requirements', operation: 'read' }
    });

    const requirementsSuccess = check(requirementsResponse, {
      'document requirements status 200': (r) => r.status === 200,
      'document requirements response time < 200ms': (r) => r.timings.duration < 200
    });

    apiSuccessRate.add(requirementsSuccess);
    apiResponseTime.add(requirementsResponse.timings.duration);
    apiThroughput.add(1);

    // GET /api/clients/test-client-001/documents - Client documents
    const clientDocsResponse = http.get(`${BASE_URL}/api/clients/test-client-001/documents`, {
      headers,
      tags: { endpoint: 'client_documents', operation: 'read' }
    });

    const clientDocsSuccess = check(clientDocsResponse, {
      'client documents handled': (r) => r.status === 200 || r.status === 404, // 404 if client doesn't exist
      'client documents response time < 400ms': (r) => r.timings.duration < 400
    });

    apiSuccessRate.add(clientDocsSuccess);
    apiResponseTime.add(clientDocsResponse.timings.duration);
    apiThroughput.add(1);

    // GET /api/documents/pending-review - Pending documents (admin endpoint)
    const pendingResponse = http.get(`${BASE_URL}/api/documents/pending-review`, {
      headers,
      tags: { endpoint: 'documents_pending', operation: 'read' }
    });

    const pendingSuccess = check(pendingResponse, {
      'pending documents handled': (r) => r.status === 200 || r.status === 403, // 403 if not admin
      'pending documents response time < 500ms': (r) => r.timings.duration < 500
    });

    apiSuccessRate.add(pendingSuccess);
    apiResponseTime.add(pendingResponse.timings.duration);
    apiThroughput.add(1);
  });
}

// API Performance Test - comprehensive endpoint testing
export function apiPerformanceTest() {
  concurrentUsers.add(1);
  
  const token = getAuthToken();
  if (!token) {
    apiErrorCount.add(1);
    return;
  }

  // Test all major API endpoints
  testDashboardAPIs(token);
  sleep(0.1);
  
  testClientAPIs(token);
  sleep(0.1);
  
  testQuoteAPIs(token);
  sleep(0.1);
  
  testDocumentAPIs(token);
  sleep(0.5);
  
  concurrentUsers.add(-1);
}

// Database Stress Test - high-frequency operations
export function databaseStressTest() {
  const token = getAuthToken();
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Rapid-fire read operations to stress database
  const endpoints = [
    '/api/clients',
    '/api/quotes', 
    '/api/dashboard/stats',
    '/api/activity',
    '/api/document-requirements'
  ];

  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`${BASE_URL}${randomEndpoint}`, {
    headers,
    tags: { endpoint: randomEndpoint.replace('/api/', ''), operation: 'read', test_type: 'db_stress' }
  });

  const success = check(response, {
    'db stress request successful': (r) => r.status === 200,
    'db stress response time < 1s': (r) => r.timings.duration < 1000
  });

  apiSuccessRate.add(success);
  apiResponseTime.add(response.timings.duration);
  apiThroughput.add(1);

  if (!success) {
    apiErrorCount.add(1);
  }
}

// Concurrent Users Test - simulate realistic user behavior
export function concurrentUsersTest() {
  concurrentUsers.add(1);
  
  const token = getAuthToken();
  if (!token) {
    concurrentUsers.add(-1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Simulate realistic user session
  group('User Session', () => {
    // 1. Load dashboard (every user does this)
    const dashboardResponse = http.get(`${BASE_URL}/api/dashboard/stats`, {
      headers,
      tags: { endpoint: 'dashboard_stats', operation: 'read', session_step: '1' }
    });
    
    check(dashboardResponse, {
      'session dashboard load': (r) => r.status === 200
    });
    
    apiThroughput.add(1);
    sleep(Math.random() * 2 + 1); // 1-3 seconds think time

    // 2. 80% chance to browse clients
    if (Math.random() < 0.8) {
      const clientsResponse = http.get(`${BASE_URL}/api/clients`, {
        headers,
        tags: { endpoint: 'clients_list', operation: 'read', session_step: '2' }
      });
      
      check(clientsResponse, {
        'session clients load': (r) => r.status === 200
      });
      
      apiThroughput.add(1);
      sleep(Math.random() * 3 + 1); // 1-4 seconds think time
      
      // 40% chance to view specific client
      if (Math.random() < 0.4 && clientsResponse.status === 200) {
        try {
          const clients = JSON.parse(clientsResponse.body);
          if (clients.length > 0) {
            const randomClient = clients[Math.floor(Math.random() * clients.length)];
            
            const clientDetailResponse = http.get(`${BASE_URL}/api/clients/${randomClient.id}`, {
              headers,
              tags: { endpoint: 'client_detail', operation: 'read', session_step: '3' }
            });
            
            check(clientDetailResponse, {
              'session client detail load': (r) => r.status === 200
            });
            
            apiThroughput.add(1);
            sleep(Math.random() * 4 + 2); // 2-6 seconds think time
          }
        } catch (e) {
          // Handle parsing errors gracefully
        }
      }
    }

    // 3. 60% chance to check quotes
    if (Math.random() < 0.6) {
      const quotesResponse = http.get(`${BASE_URL}/api/quotes`, {
        headers,
        tags: { endpoint: 'quotes_list', operation: 'read', session_step: '4' }
      });
      
      check(quotesResponse, {
        'session quotes load': (r) => r.status === 200
      });
      
      apiThroughput.add(1);
      sleep(Math.random() * 2 + 1);
    }

    // 4. 30% chance to check documents
    if (Math.random() < 0.3) {
      const documentsResponse = http.get(`${BASE_URL}/api/documents/pending-review`, {
        headers,
        tags: { endpoint: 'documents_pending', operation: 'read', session_step: '5' }
      });
      
      // This might return 403 for non-admin users
      check(documentsResponse, {
        'session documents request handled': (r) => r.status === 200 || r.status === 403
      });
      
      apiThroughput.add(1);
      sleep(Math.random() * 2 + 0.5);
    }

    // 5. Return to dashboard (common pattern)
    const finalDashboardResponse = http.get(`${BASE_URL}/api/dashboard/stats`, {
      headers,
      tags: { endpoint: 'dashboard_stats', operation: 'read', session_step: '6' }
    });
    
    check(finalDashboardResponse, {
      'session final dashboard load': (r) => r.status === 200
    });
    
    apiThroughput.add(1);
  });
  
  concurrentUsers.add(-1);
}

// Setup function
export function setup() {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
  
  // Verify API is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
// removed by clean-audit
  }
  
  return { 
    startTime: new Date(),
    baseUrl: BASE_URL
  };
}

// Teardown function
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
// removed by clean-audit
// removed by clean-audit
}
// removed by clean-audit