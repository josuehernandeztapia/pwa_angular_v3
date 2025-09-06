// Minimal Playwright global setup to ensure server is reachable and disable animations
import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // No-op: the webServer in config handles starting the app
}

export default globalSetup;

