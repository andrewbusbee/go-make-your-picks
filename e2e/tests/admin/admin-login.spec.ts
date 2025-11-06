// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth, TEST_CONFIG } from '../utils/test-helpers';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/admin\/getting-started/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.click('button:has-text("Continue")');
    
    // Wait for error message or password field
    await page.waitForTimeout(1000);
    
    // Either shows error or asks for password (which will fail)
    const errorMessage = page.locator('text=/invalid|error|incorrect/i');
    const passwordField = page.locator('input[type="password"]');
    
    if (await passwordField.isVisible({ timeout: 2000 })) {
      await passwordField.fill('wrongpassword');
      await page.click('button:has-text("Sign In")');
      await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
    } else {
      // Already showed error
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  // Note: Password change test moved to 00-admin-setup.spec.ts to run first

  test('should logout successfully', async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await AdminAuth.logoutViaUI(page);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should persist session on page reload', async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await page.reload();
    // Should still be logged in (not redirected to login)
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });
});

