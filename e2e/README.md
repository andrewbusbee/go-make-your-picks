# E2E Tests for Go Make Your Picks

This directory contains end-to-end tests using Playwright.

## Setup

1. **Install dependencies:**
   ```bash
   npm run test:e2e:install
   ```

2. **Ensure Docker Compose is running:**
   ```bash
   docker-compose up -d
   ```

3. **Wait for app to be ready:**
   ```bash
   # Check health endpoint
   curl http://localhost:3003/api/healthz
   ```

## Running Tests

### From project root:
```bash
# Run all tests (headless)
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

### From e2e directory:
```bash
cd e2e

# Run all tests
npm test

# Run specific test file
npm test tests/admin/admin-login.spec.ts

# Run tests for specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run mobile tests
npm run test:mobile

# Run smoke tests only
npm run test:smoke

# View test report
npm run test:report
```

## Test Structure

```
e2e/
├── tests/
│   ├── admin/          # Admin dashboard tests
│   ├── player/         # Player-facing tests
│   ├── public/         # Public page tests
│   ├── workflows/     # End-to-end workflow tests
│   ├── edge-cases/    # Error handling and edge cases
│   └── utils/          # Test helpers and utilities
├── playwright.config.ts
└── package.json
```

## Test Configuration

Tests are configured to:
- Run against `http://localhost:3003`
- Use MailHog for email testing (captures emails at http://localhost:8025)
- Automatically start Docker Compose before tests
- Generate HTML reports and screenshots on failure
- Support multiple browsers (Chromium, Firefox, WebKit)
- Support mobile viewports

## Writing Tests

### Basic Test Example:
```typescript
import { test, expect } from '@playwright/test';
import { AdminAuth } from '../utils/test-helpers';

test('should login as admin', async ({ page }) => {
  await AdminAuth.loginViaUI(page);
  await expect(page).toHaveURL(/\/admin\/getting-started/);
});
```

### Using Fixtures:
```typescript
import { test, expect } from '../utils/fixtures';

test('should access admin dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/admin/users');
  // Already logged in!
});
```

## Test Data

Test data is defined in `tests/utils/test-data.ts`. Use these fixtures for consistent test data.

## MailHog Integration

Tests can retrieve magic links from MailHog:
```typescript
import { APIHelpers } from '../utils/test-helpers';

const magicLink = await APIHelpers.getMagicLinkFromMailHog('player@example.com');
await page.goto(magicLink);
```

## CI/CD

Tests run automatically in GitHub Actions on:
- Push to main branch
- Pull requests
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for configuration.

## Troubleshooting

**Tests fail to connect:**
- Ensure Docker Compose is running: `docker-compose ps`
- Check app is healthy: `curl http://localhost:3003/api/healthz`
- Wait longer for app startup (may take 30-60 seconds)

**Email tests fail:**
- Ensure MailHog is running: `docker-compose ps mailhog`
- Check MailHog UI: http://localhost:8025
- Clear MailHog before tests: `curl -X DELETE http://localhost:8025/api/v1/messages`

**Tests timeout:**
- Increase timeout in `playwright.config.ts`
- Check if app is under heavy load
- Verify database is ready

