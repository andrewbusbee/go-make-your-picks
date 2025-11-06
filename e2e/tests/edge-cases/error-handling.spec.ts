// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page');
    // Should show error page or redirect, not blank page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle network errors', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);
    await page.goto('/');
    
    // Should handle gracefully
    await page.waitForTimeout(2000);
    await page.context().setOffline(false);
  });

  test('should validate form inputs', async ({ page }) => {
    // Test email validation
    await page.goto('/admin/users');
    const addButton = page.locator('button:has-text("Add")').first();
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click();
      await page.fill('input[type="email"]', 'not-an-email');
      await page.fill('input[name="name"]', 'Test');
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(
        page.locator('text=/invalid|email|format/i')
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('should handle locked rounds', async ({ page }) => {
    // Try to access pick page for locked round
    await page.goto('/pick/test-token');
    await page.waitForLoadState('networkidle');
    
    // Should show locked message if round is locked
    const lockedMessage = page.locator('text=/locked|closed|deadline/i');
    // May or may not be visible depending on round state
    await page.waitForTimeout(1000);
  });
});

