// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth, TEST_CONFIG } from '../utils/test-helpers';
import { testAdmin } from '../utils/test-data';

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

  test('should show magic link message for invalid email (security: prevents enumeration)', async ({ page }) => {
    // Enter an email that doesn't exist in the system
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.click('button:has-text("Continue")');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // For invalid emails, the system shows a generic success message to prevent email enumeration
    // This is correct security behavior - don't reveal if an email exists or not
    const successMessage = page.locator('text=/if an admin account|login link will be sent|magic link/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    
    // Should NOT show password field (only main admin gets password prompt)
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).not.toBeVisible({ timeout: 2000 });
  });

  test('should show error with wrong password for valid admin', async ({ page }) => {
    // Use the valid admin email (admin2@yourdomain.com - the only valid admin after setup)
    // This is the main admin that requires password login
    await page.fill('input[type="email"]', testAdmin.email);
    await page.click('button:has-text("Continue")');
    
    // Should show password field (main admin requires password)
    const passwordField = page.locator('input[type="password"]');
    await passwordField.waitFor({ timeout: 5000 });
    
    // Enter wrong password
    await passwordField.fill('wrongpassword');
    await page.click('button:has-text("Sign In")');
    
    // Should show error for incorrect password
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 });
  });

  // Note: Password change test moved to 00-admin-setup.spec.ts to run first

  test('should logout successfully', async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await AdminAuth.logoutViaUI(page);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should persist session on page reload', async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still be logged in (not redirected to login)
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 5000 });
    
    // Should be on an admin page
    await expect(page).toHaveURL(/\/admin\//, { timeout: 5000 });
  });
});

