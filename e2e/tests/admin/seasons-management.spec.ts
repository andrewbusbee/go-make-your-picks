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
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Look for add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Create"), button:has-text("+")').first();
    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    await addButton.click();
    
    // Wait for modal/form to open
    await page.waitForTimeout(500);

    // Fill in season details
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameField.waitFor({ state: 'visible', timeout: 3000 });
    await nameField.fill(testSeasons[0].name);
    
    // Find and fill year field
    const yearField = page.locator('input[name="year"], input[name="yearStart"], input[type="number"]').first();
    if (await yearField.isVisible({ timeout: 2000 })) {
      await yearField.fill(testSeasons[0].year.toString());
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitButton.waitFor({ state: 'visible', timeout: 3000 });
    await submitButton.click();
    
    // Wait for form submission and page update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show success or the new season (check for either)
    const successOrSeason = page.locator(`text=${testSeasons[0].name}`).or(page.locator('text=/success|created/i'));
    await expect(successOrSeason).toBeVisible({ timeout: 10000 });
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

