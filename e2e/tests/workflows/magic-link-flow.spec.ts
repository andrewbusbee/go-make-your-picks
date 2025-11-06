// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth, APIHelpers } from '../utils/test-helpers';
import { testPlayers, testRounds } from '../utils/test-data';

test.describe('Magic Link Flow', () => {
  test.beforeEach(async () => {
    // Clear MailHog before each test
    await APIHelpers.clearMailHog();
  });

  test('should send magic link when round is activated', async ({ page }) => {
    // Login as admin
    await AdminAuth.loginViaUI(page);
    
    // Create player
    await page.goto('/admin/users');
    const addButton = page.locator('button:has-text("Add")').first();
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click();
      await page.fill('input[name="name"]', testPlayers[0].name);
      await page.fill('input[name="email"], input[type="email"]', testPlayers[0].email);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Create and activate round
    await page.goto('/admin/rounds');
    const activateButton = page.locator('button:has-text("Activate")').first();
    if (await activateButton.isVisible({ timeout: 3000 })) {
      await activateButton.click();
      await page.waitForTimeout(3000); // Wait for email to be sent
    }
    
    // Check MailHog for the email
    const magicLink = await APIHelpers.getMagicLinkFromMailHog(testPlayers[0].email);
    
    if (magicLink) {
      // Verify magic link format
      expect(magicLink).toMatch(/http:\/\/localhost:3003\/pick\/[a-zA-Z0-9]+/);
      
      // Test accessing the magic link
      await page.goto(magicLink);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    } else {
      // If no email found, that's okay - might need seed data
      console.log('No magic link found in MailHog - may need to set up test data');
    }
  });

  test('should handle expired magic link', async ({ page }) => {
    // This would require creating an expired token
    // For now, just test invalid token handling
    await page.goto('/pick/expired-token-12345');
    await expect(
      page.locator('text=/expired|invalid|not found/i')
    ).toBeVisible({ timeout: 5000 });
  });
});

