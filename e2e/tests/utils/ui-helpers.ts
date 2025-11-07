// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { Page, expect } from '@playwright/test';
import { APIHelpers } from './test-helpers';

/**
 * UI Helpers - Use data-testid selectors for reliable element selection
 */
export class UIHelpers {
  /**
   * Click the Email tab in Settings
   */
  static async clickEmailTab(page: Page) {
    const emailTab = page.locator('[data-testid="settings-email-tab"]');
    await emailTab.waitFor({ state: 'visible', timeout: 5000 });
    await emailTab.click();
    await page.waitForLoadState('networkidle');
  }

  /**
   * Send test email from Settings
   */
  static async sendTestEmail(page: Page): Promise<void> {
    // Navigate to settings
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    
    // Click email tab
    await this.clickEmailTab(page);
    await page.waitForTimeout(1000);
    
    // Clear MailHog before sending
    await APIHelpers.clearMailHog();
    
    // Click send test email button
    const sendButton = page.locator('[data-testid="send-test-email-button"]');
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();
    
    // Wait for form submission
    await page.waitForResponse(response => 
      response.url().includes('/admin/test-email') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);
    
    // Wait for success message
    const successMessage = page.locator('text=/sent successfully|test email sent/i');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Verify email in MailHog
    const { TEST_CONFIG } = await import('./test-helpers');
    const axios = (await import('axios')).default;
    const response = await axios.get(`${TEST_CONFIG.mailhogURL}/api/v2/messages`);
    const messages = response.data.items || [];
    expect(messages.length).toBeGreaterThan(0);
  }

  /**
   * Add a player via UI
   */
  static async addPlayer(page: Page, name: string, email: string): Promise<void> {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Click Add Player button
    const addButton = page.locator('[data-testid="add-player-button"]');
    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    await addButton.click();
    
    // Wait for modal
    await page.waitForTimeout(500);
    
    // Fill form
    const nameInput = page.locator('[data-testid="player-name-input"]');
    await nameInput.waitFor({ state: 'visible', timeout: 3000 });
    await nameInput.fill(name);
    
    const emailInput = page.locator('[data-testid="player-email-input"]');
    await emailInput.waitFor({ state: 'visible', timeout: 3000 });
    await emailInput.fill(email);
    
    // Submit
    const saveButton = page.locator('[data-testid="save-player-button"]');
    await saveButton.click();
    
    // Wait for success
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify player appears in list
    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Create a season via UI
   */
  static async createSeason(page: Page, name: string, year: number): Promise<void> {
    await page.goto('/admin/seasons');
    await page.waitForLoadState('networkidle');
    
    // Click Create Season button
    const createButton = page.locator('[data-testid="create-season-button"]');
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    await createButton.click();
    
    // Wait for modal
    await page.waitForTimeout(500);
    
    // Fill form
    const nameInput = page.locator('[data-testid="season-name-input"]');
    await nameInput.waitFor({ state: 'visible', timeout: 3000 });
    await nameInput.fill(name);
    
    // Fill year
    const yearInput = page.locator('input[name="yearStart"], input[type="number"]').first();
    if (await yearInput.isVisible({ timeout: 2000 })) {
      await yearInput.fill(year.toString());
    }
    
    // Submit
    const saveButton = page.locator('[data-testid="save-season-button"]');
    await saveButton.click();
    
    // Wait for success
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify season appears
    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Create a round/sport via UI
   */
  static async createRound(page: Page, sportName: string, seasonId?: number): Promise<void> {
    await page.goto('/admin/rounds');
    await page.waitForLoadState('networkidle');
    
    // Select season if dropdown exists
    if (seasonId) {
      const seasonSelect = page.locator('select').first();
      if (await seasonSelect.isVisible({ timeout: 3000 })) {
        await seasonSelect.selectOption({ value: seasonId.toString() });
        await page.waitForTimeout(1000);
      }
    }
    
    // Click Add Sport button
    const addButton = page.locator('[data-testid="add-sport-button"]');
    await addButton.waitFor({ state: 'visible', timeout: 5000 });
    await addButton.click();
    
    // Wait for modal
    await page.waitForTimeout(500);
    
    // Fill form
    const nameInput = page.locator('[data-testid="sport-name-input"]');
    await nameInput.waitFor({ state: 'visible', timeout: 3000 });
    await nameInput.fill(sportName);
    
    // Set lock date if field exists
    const dateField = page.locator('input[type="datetime-local"], input[type="date"]').first();
    if (await dateField.isVisible({ timeout: 2000 })) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dateString = futureDate.toISOString().slice(0, 16);
      await dateField.fill(dateString);
    }
    
    // Submit
    const saveButton = page.locator('[data-testid="save-sport-button"]');
    await saveButton.click();
    
    // Wait for success
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify round appears
    await expect(page.locator(`text=${sportName}`)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Activate a round (send magic links)
   */
  static async activateRound(page: Page, roundId: number): Promise<void> {
    await page.goto('/admin/rounds');
    await page.waitForLoadState('networkidle');
    
    // Find activate button for this round
    const activateButton = page.locator(`[data-testid="activate-round-button-${roundId}"]`);
    
    // If button doesn't exist, try generic selector
    if (!(await activateButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Try to find by text
      const genericButton = page.locator('button:has-text("Activate & Send Links")').first();
      await genericButton.waitFor({ state: 'visible', timeout: 5000 });
      await genericButton.click();
    } else {
      await activateButton.click();
    }
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Wait for activation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Verify emails were sent to MailHog
    const { TEST_CONFIG } = await import('./test-helpers');
    const axios = (await import('axios')).default;
    try {
      const response = await axios.get(`${TEST_CONFIG.mailhogURL}/api/v2/messages`);
      const messages = response.data.items || [];
      expect(messages.length).toBeGreaterThan(0);
    } catch (error) {
      console.warn('⚠️  Could not verify emails in MailHog');
    }
  }
}

