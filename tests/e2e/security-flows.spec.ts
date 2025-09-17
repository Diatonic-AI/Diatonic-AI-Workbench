/**
 * End-to-End Security Flow Tests
 * Tests authentication flows, route guards, and user interface security
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
  adminEmail: 'admin@example.com',
  adminPassword: 'TestPassword123!',
  basicEmail: 'basic@example.com',
  basicPassword: 'TestPassword123!',
  timeout: 30000
};

test.describe('Authentication Security Flows', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Set up network monitoring
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`[E2E] ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('unauthenticated users should be redirected to login', async () => {
    // Try to access protected routes without authentication
    const protectedRoutes = [
      '/toolset',
      '/dashboard',
      '/lab',
      '/observatory',
      '/community',
      '/education'
    ];

    for (const route of protectedRoutes) {
      await page.goto(`${TEST_CONFIG.baseURL}${route}`);
      
      // Should be redirected to login or show login prompt
      await expect(page).toHaveURL(/.*\/(login|auth|signin).*/);
      
      // Or should show authentication required message
      const authElements = page.locator(
        'text="Sign in" | text="Login" | text="Authentication required" | [data-testid="login-form"]'
      );
      await expect(authElements.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('login form should validate input and handle errors', async () => {
    await page.goto(`${TEST_CONFIG.baseURL}/login`);

    // Test empty form submission
    await page.click('[data-testid="login-submit"]');
    
    const errorMessages = page.locator('[data-testid="error-message"] | .error | .invalid');
    await expect(errorMessages.first()).toBeVisible();

    // Test invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    const emailError = page.locator('text="Invalid email" | text="Please enter a valid email"');
    await expect(emailError.first()).toBeVisible();

    // Test invalid credentials
    await page.fill('[data-testid="email-input"]', 'fake@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    
    const credentialsError = page.locator(
      'text="Invalid credentials" | text="Authentication failed" | text="Incorrect username or password"'
    );
    await expect(credentialsError.first()).toBeVisible();
  });

  test('successful login should redirect to dashboard', async () => {
    await page.goto(`${TEST_CONFIG.baseURL}/login`);

    // Perform login
    await page.fill('[data-testid="email-input"]', TEST_CONFIG.basicEmail);
    await page.fill('[data-testid="password-input"]', TEST_CONFIG.basicPassword);
    await page.click('[data-testid="login-submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard.*/);
    
    // Should show authenticated user interface
    const userAvatar = page.locator('[data-testid="user-avatar"] | [data-testid="user-menu"] | .user-profile');
    await expect(userAvatar.first()).toBeVisible();
  });

  test('logout should clear session and redirect', async () => {
    // First login
    await loginAsBasicUser(page);

    // Logout
    await page.click('[data-testid="user-menu"] | [data-testid="logout-button"]');
    await page.click('[data-testid="logout-confirm"] | text="Logout" | text="Sign out"');

    // Should redirect to login or home
    await expect(page).toHaveURL(/.*\/(login|home|auth|\/$).*/);

    // Trying to access protected route should require re-authentication
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);
    await expect(page).toHaveURL(/.*\/(login|auth|signin).*/);
  });
});

test.describe('Role-Based Access Control', () => {
  let basicUserContext: BrowserContext;
  let adminUserContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Create contexts for different user roles
    basicUserContext = await browser.newContext();
    adminUserContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await basicUserContext.close();
    await adminUserContext.close();
  });

  test('basic user cannot access admin areas', async () => {
    const page = await basicUserContext.newPage();
    await loginAsBasicUser(page);

    // Try to access admin areas
    const adminRoutes = [
      '/admin',
      '/admin/users',
      '/admin/organizations',
      '/admin/permissions'
    ];

    for (const route of adminRoutes) {
      await page.goto(`${TEST_CONFIG.baseURL}${route}`);
      
      // Should show forbidden or redirect to dashboard
      const forbiddenIndicators = page.locator(
        'text="Access denied" | text="Forbidden" | text="403" | [data-testid="access-denied"]'
      );
      
      const isDashboardRedirect = await page.url().includes('/dashboard');
      const hasForbiddenMessage = await forbiddenIndicators.first().isVisible();
      
      expect(isDashboardRedirect || hasForbiddenMessage).toBeTruthy();
    }
  });

  test('admin user can access admin areas', async () => {
    const page = await adminUserContext.newPage();
    await loginAsAdminUser(page);

    // Access admin dashboard
    await page.goto(`${TEST_CONFIG.baseURL}/admin`);
    
    // Should show admin interface
    const adminElements = page.locator(
      '[data-testid="admin-dashboard"] | text="Admin Dashboard" | text="User Management"'
    );
    await expect(adminElements.first()).toBeVisible();
  });

  test('user permissions are enforced in UI', async () => {
    const basicPage = await basicUserContext.newPage();
    await loginAsBasicUser(basicPage);

    // Check that premium features show upgrade prompts
    await basicPage.goto(`${TEST_CONFIG.baseURL}/toolset`);
    
    const premiumFeatures = basicPage.locator('[data-testid="premium-feature"] | .pro-feature');
    const upgradePrompts = basicPage.locator(
      'text="Upgrade" | text="Pro" | [data-testid="upgrade-prompt"]'
    );
    
    if (await premiumFeatures.first().isVisible()) {
      await expect(upgradePrompts.first()).toBeVisible();
    }
  });
});

test.describe('Session Security', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('session should persist across page reloads', async () => {
    await loginAsBasicUser(page);
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);

    // Reload page
    await page.reload();
    
    // Should remain authenticated
    await expect(page).toHaveURL(/.*\/dashboard.*/);
    const userElements = page.locator('[data-testid="user-avatar"] | [data-testid="user-menu"]');
    await expect(userElements.first()).toBeVisible();
  });

  test('expired session should require re-authentication', async () => {
    await loginAsBasicUser(page);
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);

    // Simulate expired token by clearing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB if used
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('amplify-datastore');
      }
    });

    // Try to make an authenticated request
    await page.reload();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/(login|auth|signin).*/);
  });

  test('concurrent sessions should be handled properly', async () => {
    // Login in first tab
    await loginAsBasicUser(page);
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);

    // Open second tab in same context
    const secondPage = await context.newPage();
    await secondPage.goto(`${TEST_CONFIG.baseURL}/dashboard`);

    // Both tabs should show authenticated state
    const firstPageUser = page.locator('[data-testid="user-menu"]');
    const secondPageUser = secondPage.locator('[data-testid="user-menu"]');
    
    await expect(firstPageUser.first()).toBeVisible();
    await expect(secondPageUser.first()).toBeVisible();

    await secondPage.close();
  });
});

test.describe('Security Headers and Protections', () => {
  test('should have proper security headers', async ({ request }) => {
    const response = await request.get(TEST_CONFIG.baseURL);
    
    const headers = response.headers();
    
    // Check for security headers
    expect(headers['x-frame-options'] || headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBeDefined();
    
    // CSP header (may be set via meta tag instead)
    const hasCSP = headers['content-security-policy'] || 
                   headers['content-security-policy-report-only'];
    expect(hasCSP).toBeDefined();
  });

  test('should prevent XSS in form inputs', async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseURL}/login`);

    const xssPayload = '<script>alert("XSS")</script>';
    
    // Try XSS in email field
    await page.fill('[data-testid="email-input"]', xssPayload);
    
    // Check that script doesn't execute
    const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    await page.click('[data-testid="login-submit"]');
    
    const alert = await alertPromise;
    expect(alert).toBeNull(); // No alert should have fired

    // Check that input is sanitized
    const emailValue = await page.inputValue('[data-testid="email-input"]');
    expect(emailValue).not.toContain('<script>');
  });
});

test.describe('API Authentication in Browser', () => {
  test('API calls should include proper authentication', async ({ page }) => {
    await loginAsBasicUser(page);

    // Monitor network requests
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('/v1/')) {
        apiCalls.push(request.url());
        
        // Check for Authorization header
        const authHeader = request.headers()['authorization'];
        expect(authHeader).toBeDefined();
        expect(authHeader).toMatch(/^Bearer \S+/);
      }
    });

    // Navigate to pages that make API calls
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);
    await page.goto(`${TEST_CONFIG.baseURL}/toolset`);

    // Wait for API calls to complete
    await page.waitForTimeout(2000);

    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('should handle API authentication errors gracefully', async ({ page, context }) => {
    await loginAsBasicUser(page);
    await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);

    // Intercept API calls and return 401
    await context.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication token expired'
        })
      });
    });

    // Try to trigger an API call
    await page.click('[data-testid="refresh-button"]').catch(() => {
      // Button might not exist, that's okay
    });
    
    // Should show error or redirect to login
    await page.waitForTimeout(2000);
    
    const errorElements = page.locator(
      'text="Session expired" | text="Please log in" | [data-testid="auth-error"]'
    );
    
    const isLoginRedirect = page.url().includes('/login');
    const hasErrorMessage = await errorElements.first().isVisible();
    
    expect(isLoginRedirect || hasErrorMessage).toBeTruthy();
  });
});

// Helper functions
async function loginAsBasicUser(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/login`);
  await page.fill('[data-testid="email-input"]', TEST_CONFIG.basicEmail);
  await page.fill('[data-testid="password-input"]', TEST_CONFIG.basicPassword);
  await page.click('[data-testid="login-submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL(/.*\/dashboard.*/, { timeout: TEST_CONFIG.timeout });
}

async function loginAsAdminUser(page: Page): Promise<void> {
  await page.goto(`${TEST_CONFIG.baseURL}/login`);
  await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminEmail);
  await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminPassword);
  await page.click('[data-testid="login-submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL(/.*\/dashboard.*/, { timeout: TEST_CONFIG.timeout });
}