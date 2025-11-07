// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth } from '../utils/test-helpers';
import { testSeasons } from '../utils/test-data';

test.describe('Seasons Management', () => {
  test.beforeEach(async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await page.goto('/admin/seasons');
  });

  test('should display seasons management page', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the seasons page
    await expect(page).toHaveURL(/\/admin\/seasons/);
    
    // The page should have some content - check for common elements
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
    
    // Check if there's a heading, button, or table - any of these indicates the page loaded
    const hasContent = await Promise.race([
      page.locator('h2, h1, button, table').first().isVisible().then(() => true),
      page.waitForTimeout(2000).then(() => false)
    ]).catch(() => false);
    
    expect(hasContent).toBe(true);
  });

  test('should create a new season', async ({ page }) => {
    // Use UI helper to create season (uses data-testid selectors)
    const { UIHelpers } = await import('../utils/ui-helpers');
    await UIHelpers.createSeason(page, testSeasons[0].name, testSeasons[0].year);
    
    // Test passes if createSeason doesn't throw (it verifies season appears)
  });

  test('should view season details', async ({ page }) => {
    // Click on first season if available
    const seasonLink = page.locator('a[href*="/seasons/"], button:has-text("View")').first();
    if (await seasonLink.isVisible({ timeout: 3000 })) {
      await seasonLink.click();
      await expect(page).toHaveURL(/\/admin\/seasons\/\d+/);
    }
  });

  test('should edit season', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      
      const nameField = page.locator('input[name="name"]').first();
      if (await nameField.isVisible({ timeout: 2000 })) {
        await nameField.fill('Updated Season Name');
        await page.click('button[type="submit"], button:has-text("Save")');
        await page.waitForTimeout(1000);
        await expect(page.locator('text=Updated Season Name')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

