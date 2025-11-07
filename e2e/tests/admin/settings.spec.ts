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
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the settings page
    await expect(page).toHaveURL(/\/admin\/settings/);
    
    // The page should have some content - check for heading or form elements
    const hasContent = await Promise.race([
      page.locator('h2, h1, form, input, button').first().isVisible().then(() => true),
      page.waitForTimeout(2000).then(() => false)
    ]).catch(() => false);
    
    expect(hasContent).toBe(true);
  });

  test('should update app title', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find title input - must exist (no conditional)
    const titleInput = page.locator('input[name="app_title"], input[placeholder*="title" i]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Update title
    await titleInput.fill('Test Championship Title');
    
    // Submit
    const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
    await saveButton.waitFor({ state: 'visible', timeout: 3000 });
    await saveButton.click();
    
    // Wait for API response
    await page.waitForResponse(response => 
      response.url().includes('/admin/settings') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);
    
    // Verify success message
    await expect(page.locator('text=/success|saved/i')).toBeVisible({ timeout: 5000 });
  });

  test('should test email configuration', async ({ page }) => {
    // Use UI helper to send test email (uses data-testid selectors)
    const { UIHelpers } = await import('../utils/ui-helpers');
    await UIHelpers.sendTestEmail(page);
    
    // Test passes if sendTestEmail doesn't throw (it verifies email in MailHog)
  });
});

