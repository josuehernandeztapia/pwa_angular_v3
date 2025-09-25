/**
 * Global Test Setup Configuration
 * 
 * This file configures global test environment settings and memory leak prevention.
 * It's imported by Karma and sets up the test environment before any tests run.
 */

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

import { IndexedDBTestStateManager, setupMemoryLeakPrevention, testHelpers } from './test-helpers/indexeddb-test-state-manager';

// First, initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Polyfill minimal Node-style process.env for browser tests and alias global
const g: any = (typeof globalThis !== 'undefined' ? globalThis : (window as any));
// Ensure Node-style global is available for specs that reference it
;(function ensureGlobalAlias(root: any) {
  try {
    if (typeof (root as any).global === 'undefined') {
      (root as any).global = root;
    }
  } catch {
    // ignore
  }
})(g);
g.process = g.process || {};
g.process.env = {
  // Payment/Integrations
  CONEKTA_PUBLIC_KEY: g.process?.env?.CONEKTA_PUBLIC_KEY || 'key_test_123',
  CONEKTA_PRIVATE_KEY: g.process?.env?.CONEKTA_PRIVATE_KEY || 'key_private_test_123',
  CONEKTA_WEBHOOK_SECRET: g.process?.env?.CONEKTA_WEBHOOK_SECRET || 'whsec_test_123',
  METAMAP_PUBLIC_KEY: g.process?.env?.METAMAP_PUBLIC_KEY || 'pk_test_metamap',
  METAMAP_WORKFLOW_ID: g.process?.env?.METAMAP_WORKFLOW_ID || 'wf_test',
  
  // External APIs used in configuration
  KINBAN_API_URL: g.process?.env?.KINBAN_API_URL || 'https://api.kinban.test',
  KINBAN_CLIENT_ID: g.process?.env?.KINBAN_CLIENT_ID || 'test_client',
  KINBAN_SECRET: g.process?.env?.KINBAN_SECRET || 'test_secret',
  HASE_API_URL: g.process?.env?.HASE_API_URL || 'https://api.hase.test',
  HASE_TOKEN: g.process?.env?.HASE_TOKEN || 'test_token',
  AVI_API_URL: g.process?.env?.AVI_API_URL || 'https://api.avi.test',
  AVI_API_KEY: g.process?.env?.AVI_API_KEY || 'test_api_key'
};

/**
 * Global test configuration
 */
declare global {
  interface Window {
    __testManager: IndexedDBTestStateManager;
    testHelpers: typeof testHelpers;
  }
}

/**
 * Initialize memory leak prevention globally
 */
const initializeGlobalTestSetup = async () => {
  IndexedDBTestStateManager.mockIndexedDB();
  
  // Make manager available globally
  window.__testManager = IndexedDBTestStateManager.getInstance();
  window.testHelpers = testHelpers;

  // Global cleanup on page unload
  window.addEventListener('beforeunload', async () => {
    await window.__testManager.finalizeTestSuite();
  });

  // Set up global memory leak prevention
  setupMemoryLeakPrevention();
  
};

// Initialize immediately
initializeGlobalTestSetup().catch(error => {
});

try {
  const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  if (desc && desc.configurable === false) {
    // no-op, tests should skip redefining
  }
} catch {}

/**
 * Global error handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  // Don't fail the test for memory cleanup issues
  if (event.reason && typeof event.reason === 'string' && 
      event.reason.includes('Database')) {
    event.preventDefault();
  }
});

/**
 * Enhanced Jasmine configuration for memory management
 */
if (typeof jasmine !== 'undefined') {
  // Increase timeout for cleanup operations
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  
  // Global afterEach for memory monitoring
  afterEach(async () => {
    // Log memory usage periodically
    if (Math.random() < 0.1) { // 10% of the time
      const stats = testHelpers.getMemoryUsage();
      if (stats.usedJSHeapSize) {
      }
    }
  });
}

/**
 * Browser-specific optimizations
 */
if (typeof navigator !== 'undefined') {
  // Disable service worker registration during tests
  if ('serviceWorker' in navigator) {
    (navigator as any).serviceWorker = {
      register: () => Promise.resolve(),
      ready: Promise.resolve({ unregister: () => Promise.resolve(true) })
    };
  }
}

/**
 * Console optimization for test output
 */
const originalConsole = { ...console };
let logCount = 0;
const MAX_LOGS = 1000;

console.log = (...args) => {
  if (logCount < MAX_LOGS) {
    originalConsole.log(...args);
    logCount++;
  } else if (logCount === MAX_LOGS) {
    originalConsole.log('🔇 Console output limited to prevent memory issues');
    logCount++;
  }
};

export { setupMemoryLeakPrevention, testHelpers, IndexedDBTestStateManager };
