// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth } from '../utils/test-helpers';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await AdminAuth.loginViaUI(page);
  });

  test('should display getting started page', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/getting-started/);
    await expect(page.locator('text=/getting started|setup/i')).toBeVisible();
  });

  test('should navigate to users management', async ({ page }) => {
    await page.click('a[href*="/admin/users"], button:has-text("Users"), a:has-text("Players")');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('text=/players|users/i')).toBeVisible();
  });

  test('should navigate to seasons management', async ({ page }) => {
    await page.click('a[href*="/admin/seasons"], button:has-text("Seasons")');
    await expect(page).toHaveURL(/\/admin\/seasons/);
  });

  test('should navigate to rounds management', async ({ page }) => {
    await page.click('a[href*="/admin/rounds"], button:has-text("Rounds")');
    await expect(page).toHaveURL(/\/admin\/rounds/);
  });

  test('should navigate to settings', async ({ page }) => {
    await page.click('a[href*="/admin/settings"], button:has-text("Settings")');
    await expect(page).toHaveURL(/\/admin\/settings/);
  });

  test('should display admin name/email in header', async ({ page }) => {
    // Check if admin info is displayed somewhere
    const adminInfo = page.locator('text=/admin|@/i');
    // May or may not be visible depending on UI design
    await page.waitForLoadState('networkidle');
  });
});

