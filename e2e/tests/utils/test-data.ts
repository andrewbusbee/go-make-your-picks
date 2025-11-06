// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

/**
 * Test data fixtures for E2E tests
 */

export const testPlayers = [
  { name: 'Test Player 1', email: 'testplayer1@example.com' },
  { name: 'Test Player 2', email: 'testplayer2@example.com' },
  { name: 'Test Player 3', email: 'testplayer3@example.com' },
];

export const testSeasons = [
  { name: '2025 Test Championship', year: 2025 },
  { name: '2026 Test Championship', year: 2026 },
];

export const testRounds = [
  {
    sport_name: 'Super Bowl',
    lock_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    teams: ['Kansas City Chiefs', 'San Francisco 49ers', 'Buffalo Bills', 'Dallas Cowboys'],
    allow_write_in: false,
    message: 'Test round message',
  },
  {
    sport_name: 'March Madness',
    lock_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    teams: ['Duke', 'North Carolina', 'Kentucky', 'UCLA'],
    allow_write_in: true,
    message: 'Test round with write-in enabled',
  },
];

export const testSettings = {
  app_title: 'Test Championship',
  app_tagline: 'Test Tagline',
};

/**
 * Test admin credentials
 * The default admin (admin@example.com) is changed to these credentials during first login
 * Password requirements: min 11 chars, uppercase, lowercase, number, special character (!)
 */
export const testAdmin = {
  email: 'admin2@yourdomain.com',
  password: 'Kx9mP@ssw0rd!',
  name: 'Test User',
  // Default admin credentials (used for first login only)
  defaultEmail: 'admin@example.com',
  defaultPassword: 'password',
};

