// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth } from '../utils/test-helpers';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await page.goto('/admin/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('text=/settings|configuration/i')).toBeVisible();
  });

  test('should update app title', async ({ page }) => {
    const titleInput = page.locator('input[name="app_title"], input[placeholder*="title" i]').first();
    if (await titleInput.isVisible({ timeout: 3000 })) {
      await titleInput.fill('Test Championship Title');
      await page.click('button[type="submit"], button:has-text("Save")');
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/success|saved/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should test email configuration', async ({ page }) => {
    // Navigate to email settings if separate page
    const emailLink = page.locator('a[href*="email"], button:has-text("Email")').first();
    if (await emailLink.isVisible({ timeout: 2000 })) {
      await emailLink.click();
    }
    
    // Look for test email button
    const testEmailButton = page.locator('button:has-text("Test"), button:has-text("Send Test")').first();
    if (await testEmailButton.isVisible({ timeout: 3000 })) {
      await testEmailButton.click();
      await page.waitForTimeout(2000);
      // Should show success message
      await expect(
        page.locator('text=/sent|success|test email/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

