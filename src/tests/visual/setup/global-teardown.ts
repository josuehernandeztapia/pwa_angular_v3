import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // No-op
}

export default globalTeardown;