/**
 * 🚀 K6 Load Testing - Production Readiness Validation
 * Stress testing for enterprise-grade reliability
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 🎯 PERFORMANCE METRICS
const errorRate = new Rate('errors');
const responseTimetrend = new Trend('response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// 🏗️ TEST CONFIGURATIONS
export const options = {
  stages: [
    // Ramp-up: gradually increase load
    { duration: '2m', target: 20 },   // Ramp up to 20 users over 2 minutes
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 minutes
    { duration: '2m', target: 100 },  // Scale to 100 users over 2 minutes  
    { duration: '5m', target: 100 },  // Maintain 100 users for 5 minutes (peak load)
    { duration: '2m', target: 50 },   // Scale down to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  
  thresholds: {
    // 🎯 ENTERPRISE PERFORMANCE TARGETS
    'http_req_duration': ['p(95)<2000'],      // 95% of requests under 2s
    'http_req_duration{name:dashboard}': ['p(90)<1500'], // Dashboard under 1.5s
    'http_req_duration{name:cotizador}': ['p(90)<3000'], // Cotizador under 3s
    'errors': ['rate<0.05'],                  // Error rate under 5%
    'http_req_failed': ['rate<0.05'],         // Request failure rate under 5%
    'successful_requests': ['count>1000'],    // At least 1000 successful requests
  },
  
  // Resource limits
  discardResponseBodies: false,
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
};

// 🌐 BASE CONFIGURATION
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4200';
const BFF_URL = __ENV.BFF_URL || 'http://localhost:3001';

// 🎯 TEST SCENARIOS
const scenarios = {
  dashboard: {
    name: 'dashboard',
    url: `${BASE_URL}/#/dashboard`,
    weight: 30, // 30% of traffic
  },
  cotizador: {
    name: 'cotizador', 
    url: `${BASE_URL}/#/cotizador`,
    weight: 25, // 25% of traffic
  },
  simulator: {
    name: 'simulator',
    url: `${BASE_URL}/#/simulador`,
    weight: 20, // 20% of traffic
  },
  landing: {
    name: 'landing',
    url: `${BASE_URL}`,
    weight: 15, // 15% of traffic
  },
  api_health: {
    name: 'api_health',
    url: `${BFF_URL}/api/bff/webhooks/health`,
    weight: 10, // 10% of traffic
  }
};

// 🎲 REALISTIC USER BEHAVIOR PATTERNS
const userJourneys = [
  {
    name: 'prospect_user',
    steps: [
      { url: `${BASE_URL}`, name: 'landing' },
      { url: `${BASE_URL}/#/cotizador`, name: 'cotizador' },
      { url: `${BASE_URL}/#/simulador`, name: 'simulator' },
    ]
  },
  {
    name: 'advisor_user', 
    steps: [
      { url: `${BASE_URL}/#/dashboard`, name: 'dashboard' },
      { url: `${BASE_URL}/#/clientes`, name: 'clients' },
      { url: `${BASE_URL}/#/cotizador`, name: 'cotizador' },
      { url: `${BASE_URL}/#/reportes`, name: 'reports' },
    ]
  },
  {
    name: 'returning_user',
    steps: [
      { url: `${BASE_URL}/#/dashboard`, name: 'dashboard' },
      { url: `${BASE_URL}/#/simulador/tanda-colectiva`, name: 'tanda' },
    ]
  }
];

// 🛡️ HELPER FUNCTIONS
function selectRandomScenario() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (const [key, scenario] of Object.entries(scenarios)) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      return scenario;
    }
  }
  
  return scenarios.dashboard; // fallback
}

function selectRandomJourney() {
  return userJourneys[Math.floor(Math.random() * userJourneys.length)];
}

function validateResponse(response, expectedName) {
  const checks = check(response, {
    [`${expectedName}: status is 200`]: (r) => r.status === 200,
    [`${expectedName}: response time < 5s`]: (r) => r.timings.duration < 5000,
    [`${expectedName}: has content`]: (r) => r.body && r.body.length > 100,
    [`${expectedName}: no server errors`]: (r) => !r.body.includes('500') && !r.body.includes('error'),
  });

  // Record metrics
  errorRate.add(!checks);
  responseTimetrend.add(response.timings.duration);
  
  if (checks) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
  }

  return checks;
}

// 🎯 MAIN TEST FUNCTION
export default function() {
  const testStrategy = Math.random();
  
  if (testStrategy < 0.7) {
    // 70% - Single page load testing
    singlePageLoadTest();
  } else {
    // 30% - User journey testing  
    userJourneyTest();
  }
}

function singlePageLoadTest() {
  const scenario = selectRandomScenario();
  
  console.log(`Testing: ${scenario.name} -> ${scenario.url}`);
  
  const response = http.get(scenario.url, {
    headers: {
      'User-Agent': 'K6-LoadTest/1.0 (Conductores PWA Performance Testing)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Cache-Control': 'no-cache',
    },
    tags: {
      name: scenario.name,
      type: 'single_page'
    }
  });
  
  validateResponse(response, scenario.name);
  
  // Simulate user reading/interaction time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

function userJourneyTest() {
  const journey = selectRandomJourney();
  
  console.log(`Starting user journey: ${journey.name}`);
  
  for (let i = 0; i < journey.steps.length; i++) {
    const step = journey.steps[i];
    
    const response = http.get(step.url, {
      headers: {
        'User-Agent': 'K6-LoadTest/1.0 (User Journey)',
        'Referer': i > 0 ? journey.steps[i-1].url : undefined,
      },
      tags: {
        name: step.name,
        type: 'user_journey',
        journey: journey.name,
        step: i + 1
      }
    });
    
    validateResponse(response, `${journey.name}_${step.name}`);
    
    // Realistic delays between pages
    sleep(Math.random() * 2 + 2); // 2-4 seconds between pages
  }
}

// 🔄 API STRESS TESTING
export function apiStressTest() {
  console.log('Running API stress test');
  
  const endpoints = [
    { url: `${BFF_URL}/api/bff/webhooks/health`, name: 'webhook_health' },
    { url: `${BFF_URL}/api/bff/webhooks/stats`, name: 'webhook_stats' },
  ];
  
  endpoints.forEach(endpoint => {
    const response = http.get(endpoint.url, {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        name: endpoint.name,
        type: 'api'
      }
    });
    
    check(response, {
      [`API ${endpoint.name}: status is 200`]: (r) => r.status === 200,
      [`API ${endpoint.name}: response is JSON`]: (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      [`API ${endpoint.name}: fast response`]: (r) => r.timings.duration < 1000,
    });
  });
  
  sleep(1);
}

// 🎯 SETUP AND TEARDOWN
export function setup() {
  console.log('🚀 K6 Load Testing - Conductores PWA');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`BFF API: ${BFF_URL}`);
  console.log(`Test Duration: ~16 minutes`);
  console.log(`Peak Load: 100 concurrent users`);
  console.log('='.repeat(60));
  
  // Verify endpoints are reachable
  const healthCheck = http.get(`${BASE_URL}`, {
    timeout: '30s'
  });
  
  if (healthCheck.status !== 200) {
    console.error('❌ Application is not reachable. Please ensure it\'s running.');
    return null;
  }
  
  console.log('✅ Application is reachable. Starting load test...');
  return { startTime: Date.now() };
}

export function teardown(data) {
  if (data) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log('='.repeat(60));
    console.log('📊 K6 LOAD TEST COMPLETED');
    console.log('='.repeat(60));
    console.log(`Duration: ${Math.round(duration)}s`);
    console.log(`Successful Requests: ${successfulRequests.count || 0}`);
    console.log(`Failed Requests: ${failedRequests.count || 0}`);
    console.log('='.repeat(60));
  }
}

// 🎯 EXPORT CONFIGURATION FOR EXTERNAL USE
export { 
  scenarios, 
  userJourneys, 
  BASE_URL, 
  BFF_URL,
  validateResponse,
  selectRandomScenario
};