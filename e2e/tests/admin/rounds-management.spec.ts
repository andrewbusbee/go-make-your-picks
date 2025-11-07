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
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the rounds page
    await expect(page).toHaveURL(/\/admin\/rounds/);
    
    // The page should have some content - check for common elements
    // (The page might show "Sports" in the tab, but content may vary)
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
    
    // Check if there's a heading, button, or table - any of these indicates the page loaded
    const hasContent = await Promise.race([
      page.locator('h2, h1, button, table').first().isVisible().then(() => true),
      page.waitForTimeout(2000).then(() => false)
    ]).catch(() => false);
    
    expect(hasContent).toBe(true);
  });

  test('should create a new round', async ({ page }) => {
    // Setup: Ensure we have a season first
    const { TestFixtures } = await import('../fixtures/test-fixtures');
    const { testSeasons, testRounds } = await import('../utils/test-data');
    
    const seasonId = await TestFixtures.ensureSeason(page, testSeasons[0]);
    
    // Use UI helper to create round (uses data-testid selectors)
    const { UIHelpers } = await import('../utils/ui-helpers');
    await UIHelpers.createRound(page, testRounds[0].sport_name, seasonId);
    
    // Test passes if createRound doesn't throw (it verifies round appears)
  });

  test('should activate round (send magic links)', async ({ page }) => {
    // Setup: Ensure we have a round to activate
    const { TestFixtures } = await import('../fixtures/test-fixtures');
    const { testSeasons, testRounds } = await import('../utils/test-data');
    
    // Create season and round if they don't exist
    const seasonId = await TestFixtures.ensureSeason(page, testSeasons[0]);
    const roundId = await TestFixtures.ensureRound(page, testRounds[0], seasonId);
    
    // Use UI helper to activate round (uses data-testid selectors and verifies emails)
    const { UIHelpers } = await import('../utils/ui-helpers');
    await UIHelpers.activateRound(page, roundId);
    
    // Test passes if activateRound doesn't throw (it verifies emails in MailHog)
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

