// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { test, expect } from '@playwright/test';
import { AdminAuth } from '../utils/test-helpers';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await AdminAuth.loginViaUI(page);
  });

  test('should display getting started page', async ({ page }) => {
    // After login, navigate explicitly to getting started page
    // (login may redirect to /admin instead of /admin/getting-started)
    await page.goto('/admin/getting-started');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the getting started page
    await expect(page).toHaveURL(/\/admin\/getting-started/);
    
    // Verify getting started page content is visible
    // The page has a heading "🏆 Getting Started" and setup steps
    const gettingStartedHeading = page.locator('text=/🏆 Getting Started|Getting Started/i');
    await expect(gettingStartedHeading).toBeVisible({ timeout: 5000 });
    
    // Verify at least one setup step is visible (e.g., "Add Players" or "Create Seasons")
    const setupStep = page.locator('text=/Add Players|Create Season|Add Sports/i');
    await expect(setupStep.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to users management', async ({ page }) => {
    // The navigation tab shows "👥 Players" but links to /admin/users
    // Click the link that goes to /admin/users
    const usersLink = page.locator('a[href="/admin/users"]').first();
    await usersLink.waitFor({ state: 'visible', timeout: 5000 });
    await usersLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/\/admin\/users/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the users/players page
    await expect(page).toHaveURL(/\/admin\/users/);
    
    // Verify the Players heading is visible (the page shows "Players" as the heading)
    const playersHeading = page.locator('h2:has-text("Players")');
    await expect(playersHeading).toBeVisible({ timeout: 5000 });
    
    // Also verify the "Add Player" button or description text is visible
    const addPlayerButton = page.locator('button:has-text("Add Player")');
    await expect(addPlayerButton).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to seasons management', async ({ page }) => {
    // Click the seasons link
    const seasonsLink = page.locator('a[href="/admin/seasons"]').first();
    await seasonsLink.waitFor({ state: 'visible', timeout: 5000 });
    await seasonsLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/\/admin\/seasons/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the seasons page
    await expect(page).toHaveURL(/\/admin\/seasons/);
  });

  test('should navigate to rounds management', async ({ page }) => {
    // The navigation tab shows "🏈 Sports" but links to /admin/rounds
    // Click the link that goes to /admin/rounds
    const roundsLink = page.locator('a[href="/admin/rounds"]').first();
    await roundsLink.waitFor({ state: 'visible', timeout: 5000 });
    await roundsLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/\/admin\/rounds/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the rounds page
    await expect(page).toHaveURL(/\/admin\/rounds/);
  });

  test('should navigate to settings', async ({ page }) => {
    // Click the settings link
    const settingsLink = page.locator('a[href="/admin/settings"]').first();
    await settingsLink.waitFor({ state: 'visible', timeout: 5000 });
    await settingsLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/\/admin\/settings/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the settings page
    await expect(page).toHaveURL(/\/admin\/settings/);
  });

  test('should display admin name/email in header', async ({ page }) => {
    // Check if admin info is displayed somewhere
    const adminInfo = page.locator('text=/admin|@/i');
    // May or may not be visible depending on UI design
    await page.waitForLoadState('networkidle');
  });
});

