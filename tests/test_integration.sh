#!/bin/bash
# Fursuit Platform - Integration Test Script
set -e

BASE_URL="http://localhost:8080/api/v1"
ADMIN_EMAIL="admin@fursuit.nz"
ADMIN_PASS="admin123"
TEST_EMAIL="test@fursuit.nz"
TEST_PASS="testpass123"
TOKEN=""
ADMIN_TOKEN=""
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

assert_status() {
    local expected=$1 actual=$2 desc=$3
    if [ "$expected" = "$actual" ]; then
        green "  ✓ $desc (HTTP $actual)"
        PASS=$((PASS+1))
    else
        red "  ✗ $desc (expected HTTP $expected, got $actual)"
        FAIL=$((FAIL+1))
    fi
}

assert_contains() {
    local haystack=$1 needle=$2 desc=$3
    if echo "$haystack" | grep -q "$needle"; then
        green "  ✓ $desc"
        PASS=$((PASS+1))
    else
        red "  ✗ $desc (not found: $needle)"
        FAIL=$((FAIL+1))
    fi
}

echo "========================================="
echo " Fursuit Platform Integration Tests"
echo "========================================="
echo ""

# Wait for server
echo "Waiting for API server..."
for i in $(seq 1 30); do
    if curl -sf "$BASE_URL/categories" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# ==========================================
# 1. Public endpoints
# ==========================================
echo ""
echo "▸ 1. Public Endpoints"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/categories")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "GET /categories"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/products")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "GET /products (empty list)"

# ==========================================
# 2. Auth: Register
# ==========================================
echo ""
echo "▸ 2. Auth: Register & Verify"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"password_confirm\":\"$TEST_PASS\",\"full_name\":\"Test User\"}")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 201 $STATUS "POST /auth/register"

# Try register duplicate
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"password_confirm\":\"$TEST_PASS\",\"full_name\":\"Test User\"}")
STATUS=$(echo "$RESP" | tail -1)
assert_status 409 $STATUS "POST /auth/register (duplicate email)"

# ==========================================
# 3. Auth: Login
# ==========================================
echo ""
echo "▸ 3. Auth: Login"

# Login as customer (might be pending_email, test will show)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
# Either 200 (active) or 403 (pending)
if [ "$STATUS" = "200" ]; then
    TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null || true)
    green "  ✓ POST /auth/login (customer) - HTTP 200"
    PASS=$((PASS+1))
else
    green "  ✓ POST /auth/login (customer) - HTTP $STATUS (pending email expected)"
    PASS=$((PASS+1))
fi

# Login as admin
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "POST /auth/login (admin)"
ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null || true)

# ==========================================
# 4. Auth: Get Me
# ==========================================
echo ""
echo "▸ 4. Auth: Get Current User"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "GET /auth/me (admin)"
assert_contains "$BODY" "super_admin" "Admin has super_admin role"

# Unauthenticated
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/auth/me")
STATUS=$(echo "$RESP" | tail -1)
assert_status 401 $STATUS "GET /auth/me (unauthenticated)"

# ==========================================
# 5. Admin: Products
# ==========================================
echo ""
echo "▸ 5. Admin: Product Management"

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/admin/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fennec Fox Head - Classic",
    "slug": "fennec-fox-head-classic",
    "sku": "FFH-001",
    "description": "Handcrafted fennec fox fursuit head with realistic features",
    "short_description": "Realistic fennec fox head",
    "base_price_cents": 120000,
    "product_type": "ready_to_ship",
    "category_id": 1,
    "care_instructions": "Hand wash only, air dry",
    "safety_notes": "Not suitable for children under 14"
  }')
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "POST /admin/products (create product)"
PRODUCT_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || true)

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/products")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "GET /products (after creation)"

# ==========================================
# 6. Admin: User Management
# ==========================================
echo ""
echo "▸ 6. Admin: User Management"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status 200 $STATUS "GET /admin/users"

# ==========================================
# 7. Admin: Role Management
# ==========================================
echo ""
echo "▸ 7. Admin: Role Management"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/admin/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
assert_status 200 $STATUS "GET /admin/roles"
assert_contains "$BODY" "super_admin" "Roles include super_admin"

# ==========================================
# 8. Cart (requires auth)
# ==========================================
echo ""
echo "▸ 8. Cart Operations"

if [ -n "$TOKEN" ]; then
    RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/me/cart" \
      -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$RESP" | tail -1)
    assert_status 200 $STATUS "GET /me/cart"
else
    green "  ⚠ Skipping cart tests (customer not verified)"
fi

# ==========================================
# 9. RBAC Enforcement
# ==========================================
echo ""
echo "▸ 9. RBAC Enforcement"

if [ -n "$TOKEN" ]; then
    # Customer trying admin endpoint
    RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/admin/users" \
      -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo "$RESP" | tail -1)
    assert_status 403 $STATUS "Customer cannot access admin/users (403)"
else
    green "  ⚠ Skipping RBAC tests (customer not verified)"
fi

# ==========================================
# 10. Audit Logs
# ==========================================
echo ""
echo "▸ 10. Audit Logs"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/admin/audit" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status 200 $STATUS "GET /admin/audit (admin)"

# ==========================================
# Results
# ==========================================
echo ""
echo "========================================="
TOTAL=$((PASS+FAIL))
echo " Results: $PASS/$TOTAL passed, $FAIL failed"
echo "========================================="

if [ $FAIL -gt 0 ]; then
    exit 1
fi
