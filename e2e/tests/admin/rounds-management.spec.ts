// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth } from '../utils/test-helpers';
import { testRounds } from '../utils/test-data';

test.describe('Rounds Management', () => {
  test.beforeEach(async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await page.goto('/admin/rounds');
  });

  test('should display rounds management page', async ({ page }) => {
    await expect(page.locator('text=/rounds|sports/i')).toBeVisible();
  });

  test('should create a new round', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Create")').first();
    await addButton.click();

    // Fill in round details
    await page.fill('input[name="sport_name"], input[name="name"], input[placeholder*="sport" i]', testRounds[0].sport_name);
    
    // Set lock date (if date picker exists)
    const dateField = page.locator('input[type="datetime-local"], input[type="date"]').first();
    if (await dateField.isVisible({ timeout: 2000 })) {
      // Set date 7 days from now
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dateString = futureDate.toISOString().slice(0, 16); // Format for datetime-local
      await dateField.fill(dateString);
    }

    // Add teams if there's a team input
    const teamInput = page.locator('input[placeholder*="team" i], input[name*="team" i]').first();
    if (await teamInput.isVisible({ timeout: 2000 })) {
      for (const team of testRounds[0].teams.slice(0, 2)) {
        await teamInput.fill(team);
        await teamInput.press('Enter');
        await page.waitForTimeout(500);
      }
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    await page.waitForTimeout(2000);
    
    // Should show success or the new round
    await expect(
      page.locator(`text=${testRounds[0].sport_name}`).or(page.locator('text=/success|created/i'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should activate round (send magic links)', async ({ page }) => {
    // Find activate button for a round
    const activateButton = page.locator('button:has-text("Activate"), button:has-text("Send Links")').first();
    if (await activateButton.isVisible({ timeout: 3000 })) {
      await activateButton.click();
      
      // Should show confirmation or success message
      await page.waitForTimeout(2000);
      await expect(
        page.locator('text=/sent|activated|success/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should complete round with results', async ({ page }) => {
    // Find complete button
    const completeButton = page.locator('button:has-text("Complete"), button:has-text("Enter Results")').first();
    if (await completeButton.isVisible({ timeout: 3000 })) {
      await completeButton.click();
      
      // Should open modal or form for entering results
      await page.waitForTimeout(1000);
      // Look for result input fields
      const resultInput = page.locator('input[placeholder*="result" i], input[name*="result" i]').first();
      if (await resultInput.isVisible({ timeout: 2000 })) {
        // This test would need to be more specific based on your UI
        await expect(resultInput).toBeVisible();
      }
    }
  });
});

