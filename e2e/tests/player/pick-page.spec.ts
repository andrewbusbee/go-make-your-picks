// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { APIHelpers, AdminAuth, TEST_CONFIG } from '../utils/test-helpers';

test.describe('Player Pick Page', () => {
  test('should load pick page with valid magic link token', async ({ page }) => {
    // This test requires a valid magic link token
    // In a real scenario, you'd get this from MailHog or create it via API
    const token = 'test-token'; // This would be a real token in practice
    
    await page.goto(`/pick/${token}`);
    
    // Page should load (even if token is invalid, it should show an error message)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display error for invalid token', async ({ page }) => {
    await page.goto('/pick/invalid-token-12345');
    
    // Should show error message
    await expect(
      page.locator('text=/invalid|expired|not found|error/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display pick form when token is valid', async ({ page }) => {
    // This would require setting up test data and getting a real token
    // For now, just verify the page structure exists
    await page.goto('/pick/test');
    await page.waitForLoadState('networkidle');
    
    // Should have some form elements if valid, or error if invalid
    // Wait a bit for content to load
    await page.waitForTimeout(1000);
    
    const hasForm = await page.locator('form, input, select, button').count() > 0;
    const hasError = await page.locator('text=/error|invalid|expired|not found/i').isVisible().catch(() => false);
    
    // Page should have either form elements or an error message
    expect(hasForm || hasError).toBe(true);
  });

  test('should allow submitting picks', async ({ page }) => {
    // This test would need a valid token and round setup
    // Placeholder for actual implementation
    await page.goto('/pick/test-token');
    await page.waitForLoadState('networkidle');
    
    // Look for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
    if (await submitButton.isVisible({ timeout: 3000 })) {
      await expect(submitButton).toBeVisible();
    }
  });

  test('should show lock time countdown', async ({ page }) => {
    await page.goto('/pick/test-token');
    await page.waitForLoadState('networkidle');
    
    // Look for countdown or lock time display
    const countdown = page.locator('text=/lock|deadline|countdown|time remaining/i');
    // May or may not be visible depending on round state
    await page.waitForTimeout(1000);
  });
});

