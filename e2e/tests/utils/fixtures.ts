// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test as base } from '@playwright/test';
import { AdminAuth } from './test-helpers';

/**
 * Custom fixtures for Playwright tests
 */

type TestFixtures = {
  authenticatedPage: any;
};

export const test = base.extend<TestFixtures>({
  // Authenticated page fixture - page with admin already logged in
  authenticatedPage: async ({ page }, use) => {
    await AdminAuth.loginViaUI(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';

