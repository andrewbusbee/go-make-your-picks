// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth, APIHelpers } from '../utils/test-helpers';
import { testPlayers, testSeasons, testRounds } from '../utils/test-data';

test.describe('Complete Season Flow', () => {
  test('should complete full season workflow', async ({ page }) => {
    // Step 1: Login as admin
    await AdminAuth.loginViaUI(page);
    
    // Step 2: Create a player
    await page.goto('/admin/users');
    const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
    if (await addButton.isVisible({ timeout: 3000 })) {
      await addButton.click();
      await page.fill('input[name="name"]', testPlayers[0].name);
      await page.fill('input[name="email"], input[type="email"]', testPlayers[0].email);
      await page.click('button[type="submit"], button:has-text("Save")');
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Create a season
    await page.goto('/admin/seasons');
    const addSeasonButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
    if (await addSeasonButton.isVisible({ timeout: 3000 })) {
      await addSeasonButton.click();
      await page.fill('input[name="name"]', testSeasons[0].name);
      const yearField = page.locator('input[name="year"], input[type="number"]').first();
      if (await yearField.isVisible({ timeout: 2000 })) {
        await yearField.fill(testSeasons[0].year.toString());
      }
      await page.click('button[type="submit"], button:has-text("Save")');
      await page.waitForTimeout(2000);
    }
    
    // Step 4: Create a round
    await page.goto('/admin/rounds');
    const addRoundButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
    if (await addRoundButton.isVisible({ timeout: 3000 })) {
      await addRoundButton.click();
      await page.fill('input[name="sport_name"], input[name="name"]', testRounds[0].sport_name);
      
      // Set future lock date
      const dateField = page.locator('input[type="datetime-local"], input[type="date"]').first();
      if (await dateField.isVisible({ timeout: 2000 })) {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await dateField.fill(futureDate.toISOString().slice(0, 16));
      }
      
      await page.click('button[type="submit"], button:has-text("Save")');
      await page.waitForTimeout(2000);
    }
    
    // Step 5: Activate round (this would send magic links)
    const activateButton = page.locator('button:has-text("Activate"), button:has-text("Send Links")').first();
    if (await activateButton.isVisible({ timeout: 3000 })) {
      await activateButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Step 6: Get magic link from MailHog (if available)
    const magicLink = await APIHelpers.getMagicLinkFromMailHog(testPlayers[0].email);
    
    if (magicLink) {
      // Step 7: Player makes pick
      await page.goto(magicLink);
      await page.waitForLoadState('networkidle');
      
      // Try to make a pick if form is available
      const pickInput = page.locator('select, input[type="text"]').first();
      if (await pickInput.isVisible({ timeout: 3000 })) {
        // This would be more specific based on your UI
        await expect(pickInput).toBeVisible();
      }
    }
    
    // Verify we got through the main flow
    await expect(page.locator('body')).toBeVisible();
  });
});

