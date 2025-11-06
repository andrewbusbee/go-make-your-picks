// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { Page, expect } from '@playwright/test';
import axios from 'axios';
import { testAdmin } from './test-data';

const API_BASE_URL = 'http://localhost:3003/api';

/**
 * Test configuration
 */
export const TEST_CONFIG = {
  baseURL: 'http://localhost:3003',
  apiURL: API_BASE_URL,
  // Use test admin credentials (set by global-setup.ts)
  defaultAdmin: {
    email: testAdmin.email,
    password: testAdmin.password,
    name: testAdmin.name,
  },
  mailhogURL: 'http://localhost:8025',
};

/**
 * Wait for the app to be ready
 */
export async function waitForAppReady(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Admin authentication helpers
 */
export class AdminAuth {
  /**
   * Login as admin via API and return token
   */
  static async loginViaAPI(email: string = TEST_CONFIG.defaultAdmin.email, password: string = TEST_CONFIG.defaultAdmin.password): Promise<string> {
    try {
      // First check if password is required
      const requestLoginResponse = await axios.post(`${API_BASE_URL}/auth/request-login`, {
        email,
      });

      if (requestLoginResponse.data.requiresPassword) {
        // Main admin - login with password
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password,
        });
        return loginResponse.data.token;
      } else {
        throw new Error('Admin requires magic link - use loginViaUI instead');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials');
      }
      throw error;
    }
  }

  /**
   * Login as admin via UI
   * Uses test credentials (admin2@yourdomain.com) by default, or default credentials if specified
   * Flow: Enter email → Click Continue → Enter password → Click Sign In
   */
  static async loginViaUI(page: Page, email: string = TEST_CONFIG.defaultAdmin.email, password: string = TEST_CONFIG.defaultAdmin.password) {
    await page.goto('/admin/login');
    
    // Enter email
    await page.fill('input[type="email"]', email);
    await page.click('button:has-text("Continue")');
    
    // Wait for password field and enter password
    const passwordField = page.locator('input[type="password"]');
    await passwordField.waitFor({ timeout: 5000 });
    await passwordField.fill(password);
    
    // Click Sign In (not "Login")
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/admin\/(getting-started|.*)/, { timeout: 10000 });
  }

  /**
   * Logout via UI
   */
  static async logoutViaUI(page: Page) {
    // Click logout button (usually in header/nav)
    await page.click('button:has-text("Logout"), a:has-text("Logout")');
    await page.waitForURL(/\/admin\/login/);
  }
}

/**
 * API helpers for direct backend testing
 */
export class APIHelpers {
  /**
   * Make authenticated API request
   */
  static async authenticatedRequest(method: string, endpoint: string, token: string, data?: any) {
    return axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
    });
  }

  /**
   * Create a test player
   */
  static async createPlayer(token: string, name: string, email: string) {
    const response = await APIHelpers.authenticatedRequest('POST', '/users', token, {
      name,
      email,
      is_active: true,
    });
    return response.data;
  }

  /**
   * Create a test season
   */
  static async createSeason(token: string, name: string, year: number) {
    const response = await APIHelpers.authenticatedRequest('POST', '/seasons', token, {
      name,
      year,
    });
    return response.data;
  }

  /**
   * Create a test round/sport
   */
  static async createRound(token: string, seasonId: number, roundData: any) {
    const response = await APIHelpers.authenticatedRequest('POST', `/seasons/${seasonId}/rounds`, token, roundData);
    return response.data;
  }

  /**
   * Activate a round (sends magic links)
   */
  static async activateRound(token: string, roundId: number) {
    const response = await APIHelpers.authenticatedRequest('POST', `/rounds/${roundId}/activate`, token);
    return response.data;
  }

  /**
   * Get magic link from MailHog
   */
  static async getMagicLinkFromMailHog(recipientEmail: string): Promise<string | null> {
    try {
      const response = await axios.get(`${TEST_CONFIG.mailhogURL}/api/v2/messages`);
      const messages = response.data.items;
      
      if (!messages || messages.length === 0) return null;
      
      // Find the most recent message to the recipient
      const message = messages
        .filter((msg: any) => {
          if (!msg.To || !Array.isArray(msg.To)) return false;
          return msg.To.some((to: any) => {
            const email = `${to.Mailbox}@${to.Domain}`;
            return email.toLowerCase() === recipientEmail.toLowerCase();
          });
        })
        .sort((a: any, b: any) => new Date(b.Created).getTime() - new Date(a.Created).getTime())[0];
      
      if (!message) return null;
      
      // Get full message content
      const messageResponse = await axios.get(`${TEST_CONFIG.mailhogURL}/api/v2/messages/${message.ID}`);
      const emailBody = messageResponse.data.Content.Body;
      
      // Extract magic link from email body (check both HTML and text)
      const bodyText = typeof emailBody === 'string' ? emailBody : (emailBody || '');
      const linkMatch = bodyText.match(/http:\/\/localhost:3003\/pick\/([a-zA-Z0-9]+)/);
      return linkMatch ? linkMatch[0] : null;
    } catch (error: any) {
      console.error('Error fetching magic link from MailHog:', error.message);
      return null;
    }
  }

  /**
   * Clear MailHog messages
   */
  static async clearMailHog() {
    try {
      await axios.delete(`${TEST_CONFIG.mailhogURL}/api/v1/messages`);
    } catch (error) {
      console.error('Error clearing MailHog:', error);
    }
  }
}

/**
 * Database helpers (for test data setup/cleanup)
 */
export class DatabaseHelpers {
  /**
   * Seed test data via API (if seed endpoint exists)
   */
  static async seedTestData(token: string) {
    try {
      const response = await APIHelpers.authenticatedRequest('POST', '/admin/seed', token, {});
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Seed endpoint not available - skipping seed data');
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete test data via API
   */
  static async deleteTestData(token: string) {
    try {
      await APIHelpers.authenticatedRequest('DELETE', '/admin/seed', token);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Delete seed endpoint not available');
      }
    }
  }
}

/**
 * Wait for element with retry
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp) {
  await page.waitForResponse((response) => {
    const url = response.url();
    if (typeof urlPattern === 'string') {
      return url.includes(urlPattern);
    }
    return urlPattern.test(url);
  });
}

/**
 * Take screenshot helper
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

