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
    await expect(page.locator('text=/seasons/i')).toBeVisible();
  });

  test('should create a new season', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Create")').first();
    await addButton.click();

    // Fill in season details
    await page.fill('input[name="name"], input[placeholder*="name" i]', testSeasons[0].name);
    
    // Find and fill year field
    const yearField = page.locator('input[name="year"], input[type="number"]').first();
    if (await yearField.isVisible({ timeout: 2000 })) {
      await yearField.fill(testSeasons[0].year.toString());
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
    
    // Wait for success
    await page.waitForTimeout(2000);
    await expect(
      page.locator(`text=${testSeasons[0].name}`).or(page.locator('text=/success|created/i'))
    ).toBeVisible({ timeout: 5000 });
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

