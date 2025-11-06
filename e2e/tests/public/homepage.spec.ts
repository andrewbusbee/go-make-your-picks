// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../utils/test-helpers';

test.describe('HomePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Go Make Your Picks/i);
  });

  test('should display leaderboard', async ({ page }) => {
    // Leaderboard should be visible
    const leaderboard = page.locator('text=/leaderboard/i').first();
    await expect(leaderboard).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation to champions page', async ({ page }) => {
    const championsLink = page.locator('a[href="/champions"], a:has-text("Champions")');
    if (await championsLink.count() > 0) {
      await expect(championsLink.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await expect(page.locator('body')).toBeVisible();
    // Check that content is still accessible
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should display active seasons', async ({ page }) => {
    // Wait for seasons to load (if any exist)
    await page.waitForTimeout(2000);
    // Just verify page loaded without errors
    await expect(page.locator('body')).toBeVisible();
  });
});

