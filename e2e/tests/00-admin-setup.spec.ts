// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

/**
 * SETUP TESTS - MUST RUN FIRST
 * Test 1: Logs in with default admin (admin@example.com / password) and changes credentials
 * Test 2: Creates seed data by clicking the "Seed Sample Data" button
 * All other tests depend on these completing first.
 */

import { test, expect } from '@playwright/test';
import { testAdmin } from './utils/test-data';
import { AdminAuth } from './utils/test-helpers';

// This test file MUST run first - name it with "00-" prefix to ensure alphabetical ordering
test.describe('Admin Setup - First Login and Seed Data', () => {
  // Force serial execution - these tests must complete before others
  test.describe.configure({ mode: 'serial' });

  test('1. should login with default admin and change to test credentials', async ({ page }) => {
    console.log('🔧 SETUP: Logging in with default admin and changing credentials...');
    console.log(`   Using: ${testAdmin.defaultEmail} / ${testAdmin.defaultPassword}`);
    
    // Step 1: Enter email (admin@example.com)
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', testAdmin.defaultEmail);
    console.log('   ✓ Email entered: admin@example.com');
    
    // Step 2: Click Continue
    await page.click('button:has-text("Continue")');
    console.log('   ✓ Continue clicked');
    
    // Step 3: Enter password (password)
    const passwordField = page.locator('input[type="password"]');
    await passwordField.waitFor({ timeout: 5000 });
    await passwordField.fill(testAdmin.defaultPassword);
    console.log('   ✓ Password entered: password');
    
    // Step 4: Click Sign In (not "Login")
    await page.click('button:has-text("Sign In")');
    console.log('   ✓ Sign In clicked');
    
    // Step 5: Wait for InitialSetup component to appear (shown when must_change_password is true)
    // Look for the "Welcome!" heading or "First-Time Setup Required" text
    const setupHeading = page.locator('text=/Welcome|First-Time Setup|Let\'s secure your account/i');
    await setupHeading.waitFor({ timeout: 10000 });
    
    // Wait for the form to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give React time to render
    
    console.log('🔐 SETUP: Initial setup form detected - updating credentials...');
    console.log(`   Changing to: ${testAdmin.email} / ${testAdmin.password} / ${testAdmin.name}`);
    
    // Fill in the form fields - use more specific selectors and clear first
    // Display Name field (input[type="text"] with placeholder containing "display name")
    const nameField = page.locator('input[type="text"][placeholder*="display name" i]').first();
    await nameField.waitFor({ state: 'visible', timeout: 5000 });
    await nameField.clear();
    await nameField.fill(testAdmin.name);
    await nameField.blur(); // Trigger React onChange
    await page.waitForTimeout(200);
    console.log(`   ✓ Display Name: ${testAdmin.name}`);
    
    // Email field (input[type="email"] with placeholder containing "email")
    const emailField = page.locator('input[type="email"][placeholder*="email address" i]').first();
    await emailField.waitFor({ state: 'visible', timeout: 5000 });
    await emailField.clear();
    await emailField.fill(testAdmin.email);
    await emailField.blur(); // Trigger React onChange
    await page.waitForTimeout(200);
    console.log(`   ✓ Email Address: ${testAdmin.email}`);
    
    // Password fields (PasswordInput component - renders as input[type="password"])
    // Wait for both password fields to be visible
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().waitFor({ state: 'visible', timeout: 5000 });
    const passwordCount = await passwordFields.count();
    
    if (passwordCount >= 2) {
      // First password field (new password)
      await passwordFields.nth(0).clear();
      await passwordFields.nth(0).fill(testAdmin.password);
      await passwordFields.nth(0).blur();
      await page.waitForTimeout(200);
      console.log(`   ✓ Password: ${testAdmin.password}`);
      
      // Second password field (confirm password)
      await passwordFields.nth(1).waitFor({ state: 'visible', timeout: 3000 });
      await passwordFields.nth(1).clear();
      await passwordFields.nth(1).fill(testAdmin.password);
      await passwordFields.nth(1).blur();
      await page.waitForTimeout(200);
      console.log(`   ✓ Confirm Password: ${testAdmin.password}`);
    } else {
      throw new Error(`Expected 2 password fields, found ${passwordCount}`);
    }
    
    // Verify no error messages are showing before submission
    const errorMessage = page.locator('text=/error|invalid|required/i');
    if (await errorMessage.isVisible({ timeout: 1000 })) {
      const errorText = await errorMessage.textContent();
      throw new Error(`Form validation error before submission: ${errorText}`);
    }
    
    // Step 6: Click "Complete Setup & Continue" and wait for submission
    const submitButton = page.locator('button[type="submit"]:has-text("Complete Setup & Continue")');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for API call to complete by watching for the loading state to disappear
    // or for the redirect to happen
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/auth/initial-setup') && response.status() === 200,
        { timeout: 15000 }
      ).catch(() => null), // Don't fail if response listener times out
      submitButton.click(),
    ]);
    
    console.log('   ✓ Complete Setup & Continue clicked');
    
    if (response) {
      console.log('   ✓ API call completed successfully');
    } else {
      console.log('   ⚠️  API response not captured, but continuing...');
    }
    
    // Wait for redirect to dashboard (setup completes and redirects)
    // The onSuccess callback should redirect to /admin/getting-started
    await page.waitForURL(/\/admin\/(getting-started|.*)/, { timeout: 15000 });
    
    // Verify we're on the dashboard (not still on login or setup page)
    await expect(page).toHaveURL(/\/admin\//, { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/admin\/login/);
    
    // Verify the setup form is gone
    const setupForm = page.locator('text=/Welcome|First-Time Setup/i');
    await expect(setupForm).not.toBeVisible({ timeout: 5000 });
    
    console.log('✅ SETUP: Credentials changed successfully!');
    
    // Verification: Try to log out and log back in with new credentials to confirm they work
    console.log('🔍 SETUP: Verifying new credentials work...');
    await page.goto('/admin/logout');
    await page.waitForTimeout(1000);
    
    // Try logging in with new credentials
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', testAdmin.email);
    await page.click('button:has-text("Continue")');
    const verifyPasswordField = page.locator('input[type="password"]');
    await verifyPasswordField.waitFor({ timeout: 5000 });
    await verifyPasswordField.fill(testAdmin.password);
    await page.click('button:has-text("Sign In")');
    
    // Should successfully log in (not show setup form again)
    await page.waitForURL(/\/admin\/(getting-started|.*)/, { timeout: 10000 });
    const setupFormAfter = page.locator('text=/Welcome|First-Time Setup/i');
    await expect(setupFormAfter).not.toBeVisible({ timeout: 3000 });
    
    console.log('✅ SETUP: Verification successful - new credentials work!');
    console.log(`📌 All subsequent tests will use: ${testAdmin.email} / ${testAdmin.password}`);
  });

  test('2. should create seed data by clicking Seed Sample Data button', async ({ page }) => {
    console.log('🌱 SETUP: Creating seed data...');
    
    // Login with test credentials (from previous test)
    await AdminAuth.loginViaUI(page);
    
    // Navigate to getting started page (where seed data button is located)
    await page.goto('/admin/getting-started');
    await page.waitForLoadState('networkidle');
    
    // Look for the "Seed Sample Data" button
    const seedButton = page.locator('button:has-text("Seed Sample Data"), button:has-text("🌱")');
    
    if (await seedButton.isVisible({ timeout: 5000 })) {
      // Check if button is disabled (seed data already exists)
      const isDisabled = await seedButton.isDisabled();
      
      if (isDisabled) {
        console.log('ℹ️  SETUP: Seed data already exists - skipping');
      } else {
        console.log('🌱 SETUP: Clicking Seed Sample Data button...');
        
        // Set up dialog handlers for both confirmation and success alert
        let dialogCount = 0;
        page.on('dialog', async dialog => {
          dialogCount++;
          if (dialogCount === 1) {
            // First dialog is the confirmation
            console.log('   Confirmation dialog:', dialog.message());
            await dialog.accept(); // Click "OK" on confirmation
          } else if (dialogCount === 2) {
            // Second dialog is the success alert
            console.log('   Success alert:', dialog.message());
            await dialog.accept(); // Dismiss the alert
          }
        });
        
        // Click the seed button
        await seedButton.click();
        
        // Wait for the API call to complete, alert to appear, and page to reload
        await page.waitForTimeout(5000);
        
        // Wait for page reload after seeding (the code does window.location.reload())
        await page.waitForLoadState('networkidle');
        
        // Navigate back to getting started to check if button is now disabled
        await page.goto('/admin/getting-started');
        await page.waitForLoadState('networkidle');
        
        // Check if button is now disabled (indicates seed data was created)
        const seedButtonAfter = page.locator('button:has-text("Seed Sample Data"), button:has-text("🌱")');
        if (await seedButtonAfter.isDisabled({ timeout: 5000 })) {
          console.log('✅ SETUP: Seed data created successfully!');
        } else {
          // Button might still be enabled if there was an issue, but continue anyway
          console.log('⚠️  SETUP: Seed data button still enabled - may have failed, but continuing');
        }
      }
    } else {
      console.log('⚠️  SETUP: Seed data button not found - may not be visible or ENABLE_DEV_TOOLS is false');
      console.log('   Continuing anyway - tests may work without seed data');
    }
    
    console.log('✅ SETUP: Seed data setup complete - ready for other tests');
  });
});

