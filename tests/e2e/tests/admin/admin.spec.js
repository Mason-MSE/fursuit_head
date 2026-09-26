const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = 'admin@fursuit.nz';
const ADMIN_PASS = 'admin123';

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]');
    return !btn || btn.textContent !== 'Signing in...';
  }, { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

test.describe('Admin - Login Page', () => {
  test('loads admin login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('Admin Panel');
  });

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('login form has submit button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });
});

test.describe.serial('Admin - Dashboard', () => {
  test('can login and see dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForFunction(() => !document.body.textContent.includes('Loading dashboard'), { timeout: 15000 });
    const body = await page.textContent('body');
    expect(body).toContain('Dashboard');
    expect(body).toContain('Total Orders');
    expect(body).toContain('Revenue');
    expect(body).toContain('Total Users');
  });

  test('dashboard shows quick actions', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForFunction(() => !document.body.textContent.includes('Loading dashboard'), { timeout: 15000 });
    const body = await page.textContent('body');
    expect(body).toContain('Quick Actions');
    expect(body).toContain('New Product');
  });

  test('navigation sidebar has all menu items', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForFunction(() => !document.body.textContent.includes('Loading dashboard'), { timeout: 15000 });
    const body = await page.textContent('body');
    expect(body).toContain('Products');
    expect(body).toContain('Orders');
    expect(body).toContain('Commissions');
    expect(body).toContain('Payments');
    expect(body).toContain('Users');
    expect(body).toContain('Roles');
    expect(body).toContain('Tickets');
    expect(body).toContain('Pages');
    expect(body).toContain('Audit Logs');
  });

  test('logout button visible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForFunction(() => !document.body.textContent.includes('Loading dashboard'), { timeout: 15000 });
    const logoutBtn = page.locator('button:has-text("Logout")');
    await expect(logoutBtn).toBeVisible();
  });

  test('user info shown in sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForFunction(() => !document.body.textContent.includes('Loading dashboard'), { timeout: 15000 });
    const body = await page.textContent('body');
    expect(body).toContain(ADMIN_EMAIL);
    expect(body).toContain('Super Admin');
  });
});
