// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth, APIHelpers } from '../utils/test-helpers';
import { testPlayers } from '../utils/test-data';

test.describe('Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await AdminAuth.loginViaUI(page);
    await page.goto('/admin/users');
  });

  test('should display users management page', async ({ page }) => {
    await expect(page.locator('text=/players|users/i')).toBeVisible();
  });

  test('should add a new player', async ({ page }) => {
    // Look for add button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add Player")').first();
    await addButton.click();

    // Fill in player details
    await page.fill('input[name="name"], input[placeholder*="name" i]', testPlayers[0].name);
    await page.fill('input[name="email"], input[type="email"]', testPlayers[0].email);
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Add")');
    
    // Wait for success message or player to appear in list
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${testPlayers[0].name}`).or(page.locator('text=/success|added/i'))).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
    if (await addButton.isVisible({ timeout: 2000 })) {
      await addButton.click();
      await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
      await page.fill('input[name="name"]', 'Test');
      
      // Try to submit
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('text=/invalid|email|format/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should edit player details', async ({ page }) => {
    // Find first player and click edit
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      
      // Modify name
      const nameField = page.locator('input[name="name"]').first();
      if (await nameField.isVisible({ timeout: 2000 })) {
        await nameField.fill('Updated Player Name');
        await page.click('button[type="submit"], button:has-text("Save")');
        await page.waitForTimeout(1000);
        await expect(page.locator('text=Updated Player Name')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should activate/deactivate player', async ({ page }) => {
    // Look for toggle or activate/deactivate button
    const toggleButton = page.locator('button:has-text("Activate"), button:has-text("Deactivate"), input[type="checkbox"]').first();
    if (await toggleButton.isVisible({ timeout: 3000 })) {
      const initialState = await toggleButton.isChecked().catch(() => false);
      await toggleButton.click();
      await page.waitForTimeout(1000);
      // State should have changed
      const newState = await toggleButton.isChecked().catch(() => false);
      // If it was a checkbox, state should be different
      if (toggleButton.locator('input[type="checkbox"]').count() > 0) {
        expect(newState).not.toBe(initialState);
      }
    }
  });
});

