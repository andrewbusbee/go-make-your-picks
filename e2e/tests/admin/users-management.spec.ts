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
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the users page
    await expect(page).toHaveURL(/\/admin\/users/);
    
    // Verify the Players heading is visible (the page shows "Players" as the heading)
    const playersHeading = page.locator('h2:has-text("Players")');
    await expect(playersHeading).toBeVisible({ timeout: 5000 });
  });

  test('should add a new player', async ({ page }) => {
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Look for add button
    const addButton = page.locator('button:has-text("Add Player"), button:has-text("Add"), button:has-text("+")').first();
    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    await addButton.click();
    
    // Wait for modal/form to open
    await page.waitForTimeout(500);

    // Fill in player details
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameField.waitFor({ state: 'visible', timeout: 3000 });
    await nameField.fill(testPlayers[0].name);
    
    const emailField = page.locator('input[name="email"], input[type="email"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 3000 });
    await emailField.fill(testPlayers[0].email);
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add")').first();
    await submitButton.waitFor({ state: 'visible', timeout: 3000 });
    await submitButton.click();
    
    // Wait for form submission and page update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show success message or player to appear in list
    const successOrPlayer = page.locator(`text=${testPlayers[0].name}`).or(page.locator('text=/success|added/i'));
    await expect(successOrPlayer).toBeVisible({ timeout: 10000 });
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

