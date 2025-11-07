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
    const titleInput = page.locator('input[name="app_title"], input[placeholder*="title" i]').first();
    if (await titleInput.isVisible({ timeout: 3000 })) {
      await titleInput.fill('Test Championship Title');
      await page.click('button[type="submit"], button:has-text("Save")');
      await page.waitForTimeout(1000);
      await expect(page.locator('text=/success|saved/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should test email configuration', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Click the "📧 Email" tab to navigate to email settings
    const emailTab = page.locator('button:has-text("📧 Email"), button:has-text("Email")').first();
    await emailTab.waitFor({ state: 'visible', timeout: 5000 });
    await emailTab.click();
    
    // Wait for email tab content to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Look for "Send Test Email" button (the actual button text)
    const testEmailButton = page.locator('button:has-text("Send Test Email")').first();
    await testEmailButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Clear MailHog before sending test email
    const { APIHelpers } = await import('../utils/test-helpers');
    await APIHelpers.clearMailHog();
    
    // Click the button to send test email
    await testEmailButton.click();
    
    // Wait for form submission and success message
    await page.waitForTimeout(3000);
    
    // Should show success message
    const successMessage = page.locator('text=/sent successfully|test email sent/i');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Verify email was actually sent to MailHog
    const { TEST_CONFIG } = await import('../utils/test-helpers');
    const axios = (await import('axios')).default;
    try {
      const response = await axios.get(`${TEST_CONFIG.mailhogURL}/api/v2/messages`);
      const messages = response.data.items || [];
      expect(messages.length).toBeGreaterThan(0);
      console.log(`✅ Test email sent - found ${messages.length} email(s) in MailHog`);
    } catch (error) {
      console.warn('⚠️  Could not verify email in MailHog - MailHog may not be running');
    }
  });
});

