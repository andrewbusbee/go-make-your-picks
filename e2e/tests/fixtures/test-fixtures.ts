// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { Page } from '@playwright/test';
import { AdminAuth, APIHelpers } from '../utils/test-helpers';
import { testPlayers, testSeasons, testRounds } from '../utils/test-data';

/**
 * Test Fixtures - Reusable setup functions for E2E tests
 * These ensure test data exists before tests run
 */

export class TestFixtures {
  /**
   * Ensure a player exists, creating it if needed
   */
  static async ensurePlayer(page: Page, playerData: typeof testPlayers[0]): Promise<void> {
    // Try to find player by email via API
    try {
      const token = await AdminAuth.getAuthToken(page);
      const players = await APIHelpers.authenticatedRequest('GET', '/admin/users', token);
      const existingPlayer = players.data.find((p: any) => p.email === playerData.email);
      
      if (existingPlayer) {
        console.log(`✓ Player ${playerData.email} already exists`);
        return;
      }
    } catch (error) {
      // If API fails, try UI approach
    }

    // Create player via UI
    console.log(`Creating player: ${playerData.name} (${playerData.email})`);
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
    await nameInput.fill(playerData.name);
    
    const emailInput = page.locator('[data-testid="player-email-input"]');
    await emailInput.waitFor({ state: 'visible', timeout: 3000 });
    await emailInput.fill(playerData.email);
    
    // Submit
    const saveButton = page.locator('[data-testid="save-player-button"]');
    await saveButton.click();
    
    // Wait for success
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify player was created
    const playerRow = page.locator(`text=${playerData.name}`);
    await playerRow.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`✓ Player ${playerData.name} created successfully`);
  }

  /**
   * Ensure a season exists, creating it if needed
   */
  static async ensureSeason(page: Page, seasonData: typeof testSeasons[0]): Promise<number> {
    // Try to find season by name via API
    try {
      const token = await AdminAuth.getAuthToken(page);
      const seasons = await APIHelpers.authenticatedRequest('GET', '/admin/seasons', token);
      const existingSeason = seasons.data.find((s: any) => s.name === seasonData.name);
      
      if (existingSeason) {
        console.log(`✓ Season ${seasonData.name} already exists (ID: ${existingSeason.id})`);
        return existingSeason.id;
      }
    } catch (error) {
      // If API fails, try UI approach
    }

    // Create season via UI
    console.log(`Creating season: ${seasonData.name} (${seasonData.year})`);
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
    await nameInput.fill(seasonData.name);
    
    // Fill year (assuming yearStart field exists)
    const yearInput = page.locator('input[name="yearStart"], input[type="number"]').first();
    if (await yearInput.isVisible({ timeout: 2000 })) {
      await yearInput.fill(seasonData.year.toString());
    }
    
    // Submit
    const saveButton = page.locator('[data-testid="save-season-button"]');
    await saveButton.click();
    
    // Wait for success
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get season ID from URL or page
    const seasonId = await this.getSeasonIdFromPage(page, seasonData.name);
    console.log(`✓ Season ${seasonData.name} created successfully (ID: ${seasonId})`);
    return seasonId;
  }

  /**
   * Get season ID from page (by finding the season card/row)
   */
  private static async getSeasonIdFromPage(page: Page, seasonName: string): Promise<number> {
    // Try to get from API
    try {
      const token = await AdminAuth.getAuthToken(page);
      const seasons = await APIHelpers.authenticatedRequest('GET', '/admin/seasons', token);
      const season = seasons.data.find((s: any) => s.name === seasonName);
      if (season) return season.id;
    } catch (error) {
      // Fallback to a default ID
    }
    return 1; // Fallback
  }

  /**
   * Ensure a round/sport exists, creating it if needed
   */
  static async ensureRound(page: Page, roundData: typeof testRounds[0], seasonId: number): Promise<number> {
    // Try to find round by sport_name via API
    try {
      const token = await AdminAuth.getAuthToken(page);
      const rounds = await APIHelpers.authenticatedRequest('GET', `/admin/seasons/${seasonId}/rounds`, token);
      const existingRound = rounds.data.find((r: any) => r.sport_name === roundData.sport_name);
      
      if (existingRound) {
        console.log(`✓ Round ${roundData.sport_name} already exists (ID: ${existingRound.id})`);
        return existingRound.id;
      }
    } catch (error) {
      // If API fails, try UI approach
    }

    // Create round via UI
    console.log(`Creating round: ${roundData.sport_name}`);
    await page.goto('/admin/rounds');
    await page.waitForLoadState('networkidle');
    
    // Select season if dropdown exists
    const seasonSelect = page.locator('select').first();
    if (await seasonSelect.isVisible({ timeout: 3000 })) {
      await seasonSelect.selectOption({ index: 0 }); // Select first season
      await page.waitForTimeout(1000);
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
    await nameInput.fill(roundData.sport_name);
    
    // Set lock date if field exists
    const dateField = page.locator('input[type="datetime-local"], input[type="date"]').first();
    if (await dateField.isVisible({ timeout: 2000 })) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dateString = futureDate.toISOString().slice(0, 16);
      await dateField.fill(dateString);
    }
    
    // Add teams if team input exists
    const teamInput = page.locator('input[placeholder*="team" i], input[name*="team" i]').first();
    if (await teamInput.isVisible({ timeout: 2000 })) {
      for (const team of roundData.teams.slice(0, 2)) {
        await teamInput.fill(team);
        await teamInput.press('Enter');
        await page.waitForTimeout(500);
      }
    }
    
    // Submit
    const saveButton = page.locator('[data-testid="save-sport-button"]');
    await saveButton.click();
    
    // Wait for success
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get round ID from API
    const roundId = await this.getRoundIdFromPage(page, roundData.sport_name, seasonId);
    console.log(`✓ Round ${roundData.sport_name} created successfully (ID: ${roundId})`);
    return roundId;
  }

  /**
   * Get round ID from page/API
   */
  private static async getRoundIdFromPage(page: Page, sportName: string, seasonId: number): Promise<number> {
    try {
      const token = await AdminAuth.getAuthToken(page);
      const rounds = await APIHelpers.authenticatedRequest('GET', `/admin/seasons/${seasonId}/rounds`, token);
      const round = rounds.data.find((r: any) => r.sport_name === sportName);
      if (round) return round.id;
    } catch (error) {
      // Fallback
    }
    return 1; // Fallback
  }

  /**
   * Setup complete test environment with all required data
   */
  static async setupTestEnvironment(page: Page): Promise<{
    playerId?: number;
    seasonId: number;
    roundId?: number;
  }> {
    console.log('🔧 Setting up test environment...');
    
    // Ensure admin is logged in
    await AdminAuth.loginViaUI(page);
    
    // Create player
    await this.ensurePlayer(page, testPlayers[0]);
    
    // Create season
    const seasonId = await this.ensureSeason(page, testSeasons[0]);
    
    // Create round
    const roundId = await this.ensureRound(page, testRounds[0], seasonId);
    
    console.log('✅ Test environment setup complete');
    return { seasonId, roundId };
  }
}

