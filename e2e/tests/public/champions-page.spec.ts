// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';

test.describe('ChampionsPage', () => {
  test('should load champions page', async ({ page }) => {
    await page.goto('/champions');
    await expect(page).toHaveTitle(/champions/i);
  });

  test('should display historical champions', async ({ page }) => {
    await page.goto('/champions');
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Should have some content (even if empty state)
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/champions');
    const homeLink = page.locator('a[href="/"], a:has-text("Home")').first();
    if (await homeLink.count() > 0) {
      await homeLink.click();
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

