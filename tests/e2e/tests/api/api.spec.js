const { test, expect } = require('@playwright/test');

const API = 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = 'admin@fursuit.nz';
const ADMIN_PASS = 'admin123';

// Shared state across all tests via test.beforeAll
let adminToken = '';
let productId = 0;

test.describe.serial('Full API E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Login as admin
    const res = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    adminToken = body.data.token;
  });

  const authHeaders = () => ({ Authorization: `Bearer ${adminToken}` });

  // ============ AUTH TESTS ============

  test('POST /auth/register - register new customer', async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: {
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        password_confirm: 'TestPassword123!',
        full_name: 'Test Customer',
        marketing_consent: false,
      },
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data.email).toBeTruthy();
  });

  test('POST /auth/register - reject short password', async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: {
        email: `short_${Date.now()}@example.com`,
        password: 'Short1!',
        password_confirm: 'Short1!',
        full_name: 'Short Pass',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /auth/register - reject weak password', async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: {
        email: `weak_${Date.now()}@example.com`,
        password: 'password123456',
        password_confirm: 'password123456',
        full_name: 'Weak Pass',
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /auth/login - admin login', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data.token).toBeTruthy();
    adminToken = body.data.token;
  });

  test('GET /auth/me - get current user', async ({ request }) => {
    const res = await request.get(`${API}/auth/me`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data.email).toBe(ADMIN_EMAIL);
    expect(body.data.roles).toBeTruthy();
    expect(body.data.permissions).toBeTruthy();
  });

  test('POST /auth/login - reject wrong password', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/forgot-password - returns success even for non-existent', async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: 'nonexistent@example.com' },
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ PRODUCT TESTS ============

  test('GET /products - list products', async ({ request }) => {
    const res = await request.get(`${API}/products`);
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /categories - list categories', async ({ request }) => {
    const res = await request.get(`${API}/categories`);
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('POST /admin/products - create product (admin)', async ({ request }) => {
    const res = await request.post(`${API}/admin/products`, {
      headers: authHeaders(),
      data: {
        name: 'Test Fursuit Head',
        slug: `test-head-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        base_price_cents: 150000,
        product_type: 'ready_to_ship',
        status: 'published',
        description: 'A high quality fursuit head',
        short_description: 'Premium fursuit head',
      },
    });
    const body = await res.json();
    console.log('Create product response:', JSON.stringify(body));
    expect(body.success).toBeTruthy();
    productId = body.data.id;
  });

  test('GET /products/:id - get product detail', async ({ request }) => {
    const res = await request.get(`${API}/products/${productId}`);
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data.name).toBe('Test Fursuit Head');
    expect(body.data.base_price_cents).toBe(150000);
  });

  // ============ RBAC TESTS ============

  test('admin can access admin endpoints', async ({ request }) => {
    const res = await request.get(`${API}/admin/users`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  test('unauthenticated user cannot access admin endpoints', async ({ request }) => {
    const res = await request.get(`${API}/admin/users`);
    expect(res.status()).toBe(401);
  });

  test('GET /admin/permissions - list permissions', async ({ request }) => {
    const res = await request.get(`${API}/admin/permissions`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeGreaterThan(10);
  });

  test('GET /admin/roles - list roles', async ({ request }) => {
    const res = await request.get(`${API}/admin/roles`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  // ============ HEALTH CHECK TESTS ============

  test('GET /health - liveness with DB and Redis', async ({ request }) => {
    const res = await request.get('http://localhost:8080/health');
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
    expect(body.checks.redis).toBe('ok');
  });

  test('GET /health/live - liveness probe', async ({ request }) => {
    const res = await request.get('http://localhost:8080/health/live');
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /health/ready - readiness probe', async ({ request }) => {
    const res = await request.get('http://localhost:8080/health/ready');
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
  });

  // ============ ADMIN DASHBOARD TESTS ============

  test('GET /admin/dashboard/stats', async ({ request }) => {
    const res = await request.get(`${API}/admin/dashboard/stats`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toHaveProperty('total_orders');
    expect(body.data).toHaveProperty('revenue');
    expect(body.data).toHaveProperty('active_commissions');
    expect(body.data).toHaveProperty('pending_tickets');
    expect(body.data).toHaveProperty('total_users');
    expect(body.data).toHaveProperty('pending_payments');
  });

  test('GET /admin/dashboard/activity', async ({ request }) => {
    const res = await request.get(`${API}/admin/dashboard/activity?limit=5`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  // ============ AUDIT LOG TESTS ============

  test('GET /admin/audit - list audit logs', async ({ request }) => {
    const res = await request.get(`${API}/admin/audit`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ CMS TESTS ============

  test('POST /admin/pages - create page', async ({ request }) => {
    const res = await request.post(`${API}/admin/pages`, {
      headers: authHeaders(),
      data: {
        slug: `test-page-${Date.now()}`,
        title: 'Test Page',
        content: '<p>Test content</p>',
      },
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ ORDER TESTS ============

  test('GET /admin/orders - list orders', async ({ request }) => {
    const res = await request.get(`${API}/admin/orders`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ COMMISSION TESTS ============

  test('GET /admin/commissions - list commissions', async ({ request }) => {
    const res = await request.get(`${API}/admin/commissions`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  test('GET /commission-config - get config', async ({ request }) => {
    const res = await request.get(`${API}/commission-config`);
    const body = await res.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toHaveProperty('status');
  });

  test('PUT /admin/commission-config - update config', async ({ request }) => {
    const res = await request.put(`${API}/admin/commission-config`, {
      headers: authHeaders(),
      data: {
        status: 'open',
        max_slots: 10,
        waitlist_enabled: true,
        min_deposit_percent: 50,
        quote_validity_days: 14,
      },
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ TICKET TESTS ============

  test('GET /admin/tickets - list tickets', async ({ request }) => {
    const res = await request.get(`${API}/admin/tickets`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ PAYMENT TESTS ============

  test('GET /admin/payments - list payments', async ({ request }) => {
    const res = await request.get(`${API}/admin/payments`, {
      headers: authHeaders(),
    });
    const body = await res.json();
    expect(body.success).toBeTruthy();
  });

  // ============ SECURITY HEADERS TESTS ============

  test('Response includes security headers', async ({ request }) => {
    const res = await request.get(`${API}/products`);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-frame-options']).toBe('DENY');
    expect(res.headers()['x-xss-protection']).toBe('1; mode=block');
  });

  test('Response includes X-Request-ID', async ({ request }) => {
    const res = await request.get(`${API}/products`);
    expect(res.headers()['x-request-id']).toBeTruthy();
  });

  // ============ ERROR FORMAT TESTS ============

  test('Error response has consistent format', async ({ request }) => {
    const res = await request.get(`${API}/products/999999`);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
    expect(body.error.code).toBeTruthy();
    expect(body.error.message).toBeTruthy();
  });
});
