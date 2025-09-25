import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const dashboardLoadTime = new Trend('dashboard_load_time');
const apiErrors = new Counter('api_errors');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - basic functionality with minimal load
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest'
    },
    
    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },   // Ramp up
        { duration: '5m', target: 10 },   // Stay at normal load
        { duration: '2m', target: 20 },   // Ramp up to high load
        { duration: '5m', target: 20 },   // Stay at high load
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest'
    },
    
    // Stress test - above normal capacity
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 20 },   // Below normal load
        { duration: '5m', target: 20 },
        { duration: '2m', target: 50 },   // Normal load
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },  // Around breaking point
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },  // Beyond breaking point
        { duration: '5m', target: 200 },
        { duration: '10m', target: 0 },   // Recovery
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest'
    },
    
    // Spike test - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },   // Normal load
        { duration: '30s', target: 200 }, // Spike!
        { duration: '30s', target: 200 }, // Stay spiked
        { duration: '30s', target: 10 },  // Return to normal
        { duration: '1m', target: 10 },   // Recovery
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest'
    }
  },
  
  thresholds: {
    // Overall performance requirements
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    
    // Custom metrics thresholds
    login_success_rate: ['rate>0.95'], // 95% login success rate
    dashboard_load_time: ['p(90)<3000'], // 90% dashboard loads under 3s
    api_errors: ['count<100'],          // Less than 100 API errors total
    
    // Scenario-specific thresholds
    'http_req_duration{test_type:smoke}': ['p(95)<1000'],
    'http_req_duration{test_type:load}': ['p(95)<2000'],
    'http_req_duration{test_type:stress}': ['p(95)<5000'],
  }
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4200';
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Test data
const testUsers = [
  { email: 'test1@conductores.com', password: 'testPassword123' },
  { email: 'test2@conductores.com', password: 'testPassword123' },
  { email: 'test3@conductores.com', password: 'testPassword123' },
  { email: 'advisor@conductores.com', password: 'advisorPassword123' },
  { email: 'manager@conductores.com', password: 'managerPassword123' }
];

// Helper function to get random user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Authentication helper
function authenticate() {
  const user = getRandomUser();
  
  const loginResponse = http.post(`${API_BASE_URL}/auth/login`, JSON.stringify(user), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'auth_login' }
  });

  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  loginSuccessRate.add(success);

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return body.token;
  }

  apiErrors.add(1);
  return null;
}

// Dashboard load simulation
function loadDashboard(token) {
  const dashboardStart = new Date();
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Simulate dashboard page load
  group('Dashboard Page Load', () => {
    // Main dashboard HTML
    const pageResponse = http.get(`${BASE_URL}/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
      tags: { endpoint: 'dashboard_page' }
    });

    check(pageResponse, {
      'dashboard page loads': (r) => r.status === 200,
      'dashboard page load time < 2s': (r) => r.timings.duration < 2000
    });

    // Dashboard stats API call
    const statsResponse = http.get(`${API_BASE_URL}/api/dashboard/stats`, {
      headers,
      tags: { endpoint: 'dashboard_stats' }
    });

    check(statsResponse, {
      'stats API responds': (r) => r.status === 200,
      'stats response time < 500ms': (r) => r.timings.duration < 500,
      'stats contains required data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.opportunitiesInPipeline !== undefined && 
                 data.activeContracts !== undefined;
        } catch (e) {
          return false;
        }
      }
    });

    // Activity feed API call
    const activityResponse = http.get(`${API_BASE_URL}/api/activity`, {
      headers,
      tags: { endpoint: 'activity_feed' }
    });

    check(activityResponse, {
      'activity API responds': (r) => r.status === 200,
      'activity response time < 300ms': (r) => r.timings.duration < 300,
      'activity returns array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      }
    });

    // Calculate total dashboard load time
    const dashboardEnd = new Date();
    const totalLoadTime = dashboardEnd - dashboardStart;
    dashboardLoadTime.add(totalLoadTime);
  });
}

// Client management load simulation
function loadClientManagement(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Client Management', () => {
    // Load clients list
    const clientsResponse = http.get(`${API_BASE_URL}/api/clients`, {
      headers,
      tags: { endpoint: 'clients_list' }
    });

    check(clientsResponse, {
      'clients list loads': (r) => r.status === 200,
      'clients response time < 1s': (r) => r.timings.duration < 1000
    });

    // If clients exist, load one client detail
    if (clientsResponse.status === 200) {
      try {
        const clients = JSON.parse(clientsResponse.body);
        if (clients.length > 0) {
          const randomClient = clients[Math.floor(Math.random() * clients.length)];
          
          const clientDetailResponse = http.get(`${API_BASE_URL}/api/clients/${randomClient.id}`, {
            headers,
            tags: { endpoint: 'client_detail' }
          });

          check(clientDetailResponse, {
            'client detail loads': (r) => r.status === 200,
            'client detail response time < 800ms': (r) => r.timings.duration < 800
          });
        }
      } catch (e) {
        // Handle parsing errors
        apiErrors.add(1);
      }
    }
  });
}

// Quote management load simulation
function loadQuoteManagement(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Quote Management', () => {
    // Load quotes list
    const quotesResponse = http.get(`${API_BASE_URL}/api/quotes`, {
      headers,
      tags: { endpoint: 'quotes_list' }
    });

    check(quotesResponse, {
      'quotes list loads': (r) => r.status === 200,
      'quotes response time < 1s': (r) => r.timings.duration < 1000
    });

    // Load products catalog for quote creation
    const productsResponse = http.get(`${API_BASE_URL}/api/products`, {
      headers,
      tags: { endpoint: 'products_catalog' }
    });

    check(productsResponse, {
      'products catalog loads': (r) => r.status === 200,
      'products response time < 500ms': (r) => r.timings.duration < 500
    });
  });
}

// Document management load simulation
function loadDocumentManagement(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  group('Document Management', () => {
    // Load document requirements
    const requirementsResponse = http.get(`${API_BASE_URL}/api/document-requirements`, {
      headers,
      tags: { endpoint: 'document_requirements' }
    });

    check(requirementsResponse, {
      'document requirements load': (r) => r.status === 200,
      'requirements response time < 300ms': (r) => r.timings.duration < 300
    });

    // Load documents pending review (admin function)
    const pendingResponse = http.get(`${API_BASE_URL}/api/documents/pending-review`, {
      headers,
      tags: { endpoint: 'documents_pending' }
    });

    // This might return 403 for non-admin users, which is expected
    check(pendingResponse, {
      'pending documents request handled': (r) => r.status === 200 || r.status === 403
    });
  });
}

// Smoke test scenario - basic functionality validation
export function smokeTest() {
  const token = authenticate();
  if (!token) return;

  loadDashboard(token);
  sleep(1);

  loadClientManagement(token);
  sleep(1);
}

// Load test scenario - normal expected load
export function loadTest() {
  const token = authenticate();
  if (!token) return;

  // Simulate realistic user behavior
  loadDashboard(token);
  sleep(Math.random() * 2 + 1); // 1-3 seconds think time

  // 70% chance to view clients
  if (Math.random() < 0.7) {
    loadClientManagement(token);
    sleep(Math.random() * 3 + 2); // 2-5 seconds think time
  }

  // 50% chance to view quotes
  if (Math.random() < 0.5) {
    loadQuoteManagement(token);
    sleep(Math.random() * 2 + 1);
  }

  // 30% chance to view documents
  if (Math.random() < 0.3) {
    loadDocumentManagement(token);
    sleep(Math.random() * 2 + 1);
  }

  // Return to dashboard (common behavior)
  loadDashboard(token);
}

// Stress test scenario - higher load patterns
export function stressTest() {
  const token = authenticate();
  if (!token) return;

  // More aggressive usage patterns
  loadDashboard(token);
  sleep(Math.random() * 1 + 0.5); // Shorter think times

  // Simultaneous requests to multiple endpoints
  const requests = [
    ['GET', `${API_BASE_URL}/api/clients`, null],
    ['GET', `${API_BASE_URL}/api/quotes`, null],
    ['GET', `${API_BASE_URL}/api/dashboard/stats`, null],
    ['GET', `${API_BASE_URL}/api/activity`, null]
  ];

  const responses = http.batch(requests.map(([method, url, body]) => ({
    method,
    url,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  })));

  responses.forEach((response, index) => {
    check(response, {
      [`batch request ${index + 1} successful`]: (r) => r.status === 200 || r.status === 403
    });
  });

  sleep(0.5);
}

// Spike test scenario - sudden load increases
export function spikeTest() {
  const token = authenticate();
  if (!token) return;

  // Rapid-fire requests to simulate sudden user activity
  loadDashboard(token);
  loadClientManagement(token);
  loadQuoteManagement(token);
  
  // No sleep - immediate consecutive requests
  loadDashboard(token);
  
  sleep(0.1); // Minimal pause
}

// Setup function - runs once at the start
export function setup() {
  
  // Warm-up request to ensure services are ready
  const warmupResponse = http.get(`${BASE_URL}/`);
  
  return { 
    startTime: new Date(),
    baseUrl: BASE_URL,
    apiUrl: API_BASE_URL
  };
}

// Teardown function - runs once at the end
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
}
