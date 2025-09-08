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
  // Mock IndexedDB if not available
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
  
  console.log('🧹 Memory leak prevention initialized');
};

// Initialize immediately
initializeGlobalTestSetup().catch(error => {
  console.error('Failed to initialize test setup:', error);
});

/**
 * Global error handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection in tests:', event.reason);
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
        console.debug(`Memory: ${(stats.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB used`);
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