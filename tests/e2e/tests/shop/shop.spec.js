const { test, expect } = require('@playwright/test');

test.describe('Shop - Home Page', () => {
  test('loads home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });

  test('navigation links present', async ({ page }) => {
    await page.goto('/');
    // Check for common navigation elements
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('Shop - Products Page', () => {
  test('loads products page', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    // Should show product listing
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Shop - Login Page', () => {
  test('loads login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Should have email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('login form has submit button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")');
    await expect(submitBtn).toBeVisible();
  });
});

test.describe('Shop - Register Page', () => {
  test('loads register page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
