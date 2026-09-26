# Fursuit Head — New Zealand Fursuit Head Commission Platform

> A unified commerce platform for a New Zealand fursuit head brand: marketing site, ready-to-ship store, made-to-order and full-commission ordering, production scheduling, payment collection, shipping, and after-sales support.
> Built to the spec of *NZ Fursuit Platform Three-Phase Closed-Loop Requirements V4.0*: **RBAC first**, Go layered architecture, dual React frontends, MySQL, Redis.

[![Go](https://img.shields.io/badge/Go-1.22%2B-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![Gin](https://img.shields.io/badge/Gin-1.9.1-00ADD8?logo=gin&logoColor=white)](https://gin-gonic.com/)
[![GORM](https://img.shields.io/badge/GORM-1.25-00ADD8)](https://gorm.io/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5%20%2F%206-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. Repository Layout](#3-repository-layout)
- [4. Quick Start](#4-quick-start)
- [5. Environment Variables](#5-environment-variables)
- [6. Seed Data and Default Accounts](#6-seed-data-and-default-accounts)
- [7. API Reference](#7-api-reference)
- [8. RBAC Model](#8-rbac-model)
- [9. Business State Machines](#9-business-state-machines)
- [10. Frontend Applications](#10-frontend-applications)
- [11. Testing](#11-testing)
- [12. Security and Operations](#12-security-and-operations)
- [13. Known Issues](#13-known-issues)
- [14. Three-Phase Roadmap](#14-three-phase-roadmap)
- [15. Legal and Cultural Compliance](#15-legal-and-cultural-compliance)
- [16. License](#16-license)

---

## 1. Overview

A brand and e-commerce platform for **fursuit heads / kemono heads** serving New Zealand and international customers. Three commercial models run through one platform:

| Model | Description | Flow |
| --- | --- | --- |
| **Ready to Ship** | In-stock products | Browse → Cart → Checkout → Bank transfer / manual confirmation → Pick & pack → Ship |
| **Made to Order** | Standard-configuration custom builds | Configure → Order → Schedule → Produce → QC → Ship |
| **Full Commission** | Fully bespoke work | Application → Review → Cultural screening → Quote → Deposit → Production → Stage approvals → Final payment → Ship → After-sales |

Also included: **repair, refurbishment and replaceable-parts** services, plus **Māori culturally sensitive content** screening, review, and evidence retention.

**Core principle: RBAC first.** Permissions, resource-ownership checks, segregation of duties (a maker can never confirm their own payment), and audit logging are platform foundations from Phase 1 — the design explicitly forbids "hide the menu in the frontend while the API endpoint stays reachable."

---

## 2. Tech Stack

### Backend

- **Go 1.22+** / **Gin 1.9.1** / **GORM 1.25** with the MySQL driver
- **Redis 7** (go-redis/v9): rate limiting, session resolution, health checks
- **golang-jwt/jwt v5**: access tokens (HS256, carrying a `session_id`)
- **golang.org/x/crypto**: bcrypt password hashing
- **google/uuid**: file naming
- Layered architecture: `handler` (HTTP boundary) → `service` (business logic and transactions) → `repository` / `platform` (data access)

### Frontend (two independent SPAs)

- **React 18.3** + **React Router 6** + **Vite** (5.x for shop, 6.x for admin)
- **Tailwind CSS 4** via the `@tailwindcss/vite` plugin — no `tailwind.config.js`
- **axios** with interceptors for automatic Bearer token injection and 401-driven logout/redirect

### Infrastructure

- **Docker Compose**: MySQL 8.0, Redis 7, Mailpit (local SMTP inbox)
- **Playwright 1.62**: E2E suite with `shop` / `admin` / `api` projects

---

## 3. Repository Layout

```
fursuit_head/
├── docker-compose.yml              # MySQL + Redis + Mailpit
├── README.md
├── business_flow.png               # Business flow diagram
├── NZ_Fursuit_..._v4.0.docx        # Requirements specification (source of truth)
│
├── backend/                        # Go API service
│   ├── cmd/api/main.go             # Entry: DI wiring, routing, graceful shutdown
│   ├── go.mod / go.sum
│   ├── internal/
│   │   ├── config/                 # Environment-based configuration
│   │   ├── handler/                # HTTP layer (11 handlers)
│   │   ├── middleware/             # Session auth, RBAC, CORS, rate limit, security headers
│   │   ├── model/                  # GORM models
│   │   ├── platform/
│   │   │   ├── db/                 # MySQL connection pool
│   │   │   └── redis/              # Redis client
│   │   ├── repository/             # Session repository
│   │   ├── service/                # Business logic + state machines + transactions
│   │   └── dto/                    # Request/response DTOs
│   ├── migrations/                 # Ordered SQL migrations (init → 006)
│   └── uploads/                    # Runtime upload directory (gitignored)
│
├── frontend/
│   ├── shop/                       # Storefront (port 3000)
│   └── admin/                      # Admin console (port 3001)
│
├── tests/
│   ├── test_integration.sh         # Bash + curl integration suite (10 groups)
│   └── e2e/                        # Playwright E2E
│       ├── playwright.config.js
│       └── tests/{shop,admin,api}/
│
└── docs/requirements.txt           # Document tooling dependencies
```

---

## 4. Quick Start

### 4.1 Prerequisites

| Dependency | Version | Purpose |
| --- | --- | --- |
| Go | 1.22+ | Backend build |
| Node.js | 18+ (tested on 20.x) | Frontend build |
| Docker + Docker Compose | Any recent release | MySQL / Redis / Mailpit |

### 4.2 Start infrastructure services

```bash
docker compose up -d
docker compose ps          # wait until mysql and redis both report healthy
```

Compose mounts `backend/migrations/*.sql` into MySQL's `/docker-entrypoint-initdb.d/` in filename order, so **the schema and all seed data are created on first boot**.

| Service | Address | Notes |
| --- | --- | --- |
| MySQL | `localhost:3307` | Database `fursuit_platform`, user `root` / `password` |
| Redis | `localhost:6380` | No password |
| Mailpit UI | http://localhost:8025 | Local inbox for verification and reset links |
| Mailpit SMTP | `localhost:1025` | |

> ⚠️ Migrations only run when the MySQL **data volume is empty**. To reset:
> ```bash
> docker compose down -v && docker compose up -d
> ```

### 4.3 Start the backend

```bash
cd backend
go mod download
go run ./cmd/api
# → Server starting on port 8080
```

Build a binary instead:

```bash
go build -o fursuit-api ./cmd/api
./fursuit-api
```

Verify:

```bash
curl -s http://localhost:8080/health
# {"status":"ok","time":"...","checks":{"database":"ok","redis":"ok"}}
```

### 4.4 Start the frontends

In two terminals:

```bash
# Terminal 1 — storefront at http://localhost:3000
cd frontend/shop && npm install && npm run dev
```

```bash
# Terminal 2 — admin console at http://localhost:3001
cd frontend/admin && npm install && npm run dev
```

Both Vite configs proxy `/api` and `/uploads` to `http://localhost:8080`, so no CORS setup or frontend env vars are required.

Production build:

```bash
npm run build      # output in dist/
npm run preview
```

### 4.5 Local email verification

New accounts are created with status `pending_email` and must verify before they can log in. Mailpit does not send real mail, so retrieve tokens either from the UI at http://localhost:8025, or directly from the database:

```sql
SELECT email, LEFT(token, 12) AS token FROM email_verifications ORDER BY id DESC LIMIT 5;
UPDATE users SET status='active', email_verified_at=NOW() WHERE email='test@fursuit.nz';
```

---

## 5. Environment Variables

Configuration lives entirely in `backend/internal/config/config.go`. **Every value has a working default**, so the stack boots with no `.env` file. Production must override `JWT_SECRET`, `DB_PASSWORD` and the `DB_*` host settings.

| Variable | Default | Description |
| --- | --- | --- |
| `SERVER_PORT` | `8080` | API listen port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3307` | MySQL port (the Compose-mapped value) |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `password` | MySQL password |
| `DB_NAME` | `fursuit_platform` | Database name |
| `REDIS_ADDR` | `localhost:6380` | Redis address |
| `JWT_SECRET` | `fursuit-dev-secret-key-change-in-prod` | **HS256 signing secret — must be changed in production** |
| `FRONTEND_URL` | `http://localhost:3000` | CORS-allowed origin (3001 / 5173 / 5174 are also hardcoded as allowed) |
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL` | `168h` (7d) | Refresh token lifetime |
| `MAX_LOGIN_ATTEMPTS` | `5` | Failed logins before lockout |
| `LOCKOUT_DURATION` | `15m` | Account lockout duration |
| `RATE_LIMIT_WINDOW` | `1m` | Rate limit window |
| `RATE_LIMIT_MAX` | `30` | Max requests per window |
| `SMTP_HOST` | `localhost` | SMTP host |
| `SMTP_PORT` | `1025` | SMTP port |
| `SMTP_USER` | *(empty)* | SMTP username |
| `SMTP_PASSWORD` | *(empty)* | SMTP password |
| `SMTP_FROM` | `noreply@fursuit.local` | Sender address |
| `FILE_UPLOAD_PATH` | `./uploads` | Upload root (relative to `backend/`) |
| `MAX_FILE_SIZE_MB` | `20` | Per-file size limit |

---

## 6. Seed Data and Default Accounts

### 6.1 Default administrator

| Email | Password | Role |
| --- | --- | --- |
| `admin@fursuit.nz` | `admin123` | `super_admin` |

> ⚠️ Change this password immediately after first login. The account is inserted by `migrations/init.sql` as a bcrypt hash.

### 6.2 Seeded content

- **57 permissions** in `permissions`, grouped by module: `auth`, `products`, `categories`, `orders`, `commissions`, `milestones`, `quotes`, `payments`, `inventory`, `tickets`, `users`, `roles`, `pages`, `audit`, `reports`, `settings`, `cultural_reviews`, `privacy_requests`
- **11 system roles** in `roles`, all flagged `is_system = TRUE` and therefore undeletable
- **Role-permission mappings** carry a `scope` column supporting two data-visibility levels: `all` and `assigned`
- **Commission configuration**: open, 5 production slots, 0 booked, waitlist enabled, 50% minimum deposit, 14-day quote validity
- **Product category** seed data

### 6.3 Migration order

| File | Contents |
| --- | --- |
| `init.sql` | All base tables (users, products, orders, commissions, tickets, CMS, audit…) plus permissions, roles, the admin account and categories |
| `002_add_new_tables.sql` | Additional tables |
| `003_rbac_sessions.sql` | V4 RBAC alignment: 12 new permissions, 7 new roles, and **invalidation of all existing plaintext verification links and refresh tokens** |
| `004_order_integrity.sql` | Order integrity constraints |
| `005_private_files.sql` | Private file storage (`stored_files`) |
| `006_commission_workflow.sql` | V4 commission workflow: adds `cultural_decision`, `deposit_received_cents`, `final_received_cents`, `tracking_number`, `revision_count`, and the `commission_payments` table |

> `003` and `006` are **forward-only**: permission revocation and token invalidation cannot be safely reversed.

---

## 7. API Reference

Base path `/api/v1`. Uniform response envelope:

```jsonc
// success
{ "success": true, "data": { } }

// failure
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Insufficient permissions", "request_id": "..." } }
```

### 7.1 Public endpoints

| Method | Path | Description | Rate limited |
| --- | --- | --- | --- |
| POST | `/auth/register` | Register (queues a verification email) | ✅ |
| POST | `/auth/login` | Customer login | ✅ |
| POST | `/admin/auth/login` | Admin login (requires `auth.admin_login`) | ✅ |
| POST | `/auth/verify-email` | Submit a verification token | — |
| GET | `/auth/verify-email?token=` | Verify via emailed link | — |
| POST | `/auth/forgot-password` | Request a reset (returns success for unknown emails, preventing enumeration) | ✅ |
| POST | `/auth/reset-password` | Reset password with token | — |
| POST | `/auth/refresh-token` | Issue a new access token | — |
| GET | `/products` | Product list | — |
| GET | `/products/:id` | Product detail | — |
| GET | `/categories` | Category list | — |
| GET | `/pages/:slug` | CMS page content | — |
| GET | `/commission-config` | Open slots and deposit ratio | — |
| GET | `/files/:id/download` | Private file download (signed-link verified) | — |

### 7.2 Authenticated customer endpoints

| Method | Path |
| --- | --- |
| GET | `/auth/me` |
| POST | `/auth/logout` |
| POST | `/auth/change-password` |
| GET / POST / PUT / DELETE | `/me/cart`, `/me/cart/items[/:id]` |
| GET / POST / PUT / DELETE | `/me/addresses[/:id]` |
| GET / POST | `/me/orders`, `/me/orders/:id` |
| POST | `/me/orders/:id/cancel` |
| GET / POST / PUT | `/me/commissions[/:id]` |
| POST | `/me/commissions/:id/submit` (accepts `multipart/form-data`) |
| GET | `/me/commissions/:id/quotes` |
| POST | `/me/commissions/:id/quotes/:quoteId/accept` |
| POST | `/me/payments/upload` (bank transfer receipt) |
| GET | `/me/payments` |
| GET / POST | `/me/tickets`, `/me/tickets/:id/messages` |
| POST | `/upload` |
| GET | `/me/files/:id/link` |

### 7.3 Admin endpoints

Require a valid session **plus** `auth.admin_login` **plus** the route's registered permission.

| Module | Path prefix | Key operations |
| --- | --- | --- |
| Dashboard | `/admin/dashboard/*` | `stats`, `activity` |
| Users | `/admin/users[/:id]` | List, detail, update, orders, audit trail |
| Roles | `/admin/roles[/:id]` | Full CRUD plus `/admin/permissions` |
| Products | `/admin/products[/:id]` | Full CRUD |
| Orders | `/admin/orders[/:id]` | List, detail, `PUT /:id/status` |
| Commissions | `/admin/commissions[/:id]` | List, detail, update, `PUT /:id/assign` |
| Payments | `/admin/payments` | List, `PUT /:id/confirm` |
| Tickets | `/admin/tickets[/:id]` | List, detail, status change, reply |
| CMS | `/admin/pages[/:id]` | CRUD, `/versions`, `/approve`, `/rollback` |
| Audit | `/admin/audit` | Audit log |
| Settings | `/admin/commission-config` | GET / PUT production slot configuration |

### 7.4 Health checks

| Path | Description |
| --- | --- |
| `GET /health` | Readiness check including DB and Redis pings; returns `503` when degraded |
| `GET /health/live` | Liveness probe |
| `GET /health/ready` | Same as `/health` |

---

## 8. RBAC Model

### 8.1 The three-stage check chain

```
request → SessionAuth      (JWT signature + authoritative session lookup)
        → AdminAuthorization (must hold auth.admin_login)
        → RBACMiddleware    (permission lookup from the explicit route registry)
        → AssignedCommissionScope (makers only see commissions assigned to them)
        → Handler
```

### 8.2 Key design: an explicit route registry

`backend/internal/middleware/session.go` enumerates the required permission for **every** admin route:

```go
var AdminPermissions = map[string][]string{
    "GET /users":                    {"users.read"},
    "PUT /orders/:id/status":        {"orders.update"},
    "PUT /commissions/:id/assign":   {"commissions.assign"},
    "POST /pages/:id/approve":       {"pages.publish"},
    "PUT /commission-config":        {"settings.update_business"},
    // ...
}
```

**A newly added route that is not registered here is rejected with 403 — the design is fail-closed.** There is no code path where "someone forgot the permission check and it defaulted to allow."

### 8.3 Session as the source of truth

`SessionAuth` deliberately **ignores the roles and permissions carried inside the JWT**. It trusts only `user_id` and `session_id`, then re-resolves identity from the `user_sessions` table:

```go
identity, err := resolver.ResolveSession(ctx, claims.UserID, claims.SessionID)
```

Consequences: role changes, session revocation and forced logout take effect immediately rather than waiting for token expiry. The middleware also enforces `WithExpirationRequired()`, `WithIssuedAt()` and an `HS256` algorithm allowlist; anything missing or invalid yields 401.

### 8.4 Data scope

`role_permissions.scope` supports two visibility levels:

- `all` — unrestricted access to records
- `assigned` — only records related to the actor

The `maker` role uses `assigned` scope: it may only read and write commissions whose `maker_id` points at it, and unassigned records return `404` rather than `403`, so resource existence is not leaked.

### 8.5 The 11 system roles

| Role | Scope | Responsibility |
| --- | --- | --- |
| `super_admin` | all | Every permission |
| `admin` | all | All management permissions except `roles.*` |
| `customer_service` | all | Customer support: orders, commissions, quotes, tickets |
| `support` | all | Support desk (V4 split-out role) |
| `maker` | **assigned** | Maker: only their own commissions and milestones |
| `warehouse` | all | Warehouse: order shipping, inventory read and adjustment |
| `finance` | all | Finance: payment confirmation and refunds, reporting |
| `cultural_reviewer` | all | Māori cultural content review |
| `privacy_officer` | all | Privacy request handling under the Privacy Act |
| `content_editor` | all | CMS content editing |
| `customer` | — | Regular shopper (not a back-office role) |

**Segregation of duties:** `maker` does not hold `payments.confirm`. Only `finance` or `super_admin` can confirm a payment.

---

## 9. Business State Machines

Transitions are defined in `backend/internal/service/order_fsm.go` and `commission_fsm.go`. **Every transition runs inside a database transaction** and enforces:

- `SELECT ... FOR UPDATE` row locking
- **Optimistic version checks** (`current.Version != order.Version` → `concurrent modification`)
- Rejection of illegal transitions
- An append to `*_status_history` for the audit trail

### 9.1 Order state machine

```
awaiting_payment ──→ paid ──→ processing ──→ ready_to_ship ──→ shipped ──→ delivered ──→ completed
       │                                                          ▲
       └──→ cancelled                                             │
                                                                  │
refund_pending ──→ refunded        (a paid order cannot be cancelled directly)
```

Guard conditions:

| Target state | Precondition |
| --- | --- |
| `paid` | Confirmed payments must **sum exactly** to the order total |
| `cancelled` | No completed payment may exist; a cancellation reason is mandatory; stock is released |
| `shipped` | A tracking number is required |

### 9.2 Commission state machine (V4, 24 states)

```
draft → submitted ─┬→ needs_info ─→ submitted
                   ├→ screening ─→ cultural_review ─→ approved_for_quote → quoted
                   │      ↑            │                    ↓
                   └──────┴────────────┘                deposit_pending → scheduled
                                                                ↓
                              design_review ⇄ needs_revision (at most 2 rounds)
                                   ↓
                              materials → production → customer_review
                                   ↓                              ↓
                              quality_check ←──────────────────────┘
                                   ↓
                        final_payment_pending → ready_to_ship → shipped → completed
```

Guard conditions:

| Target state | Precondition |
| --- | --- |
| `approved_for_quote` | A culturally flagged commission **must** already have `cultural_decision` of `approved` or `conditional` |
| `scheduled` | Deposit confirmed (`deposit_received_cents > 0`) |
| `design_review` | A maker must be assigned |
| `ready_to_ship` | Final payment confirmed (`final_received_cents > 0`) |
| `shipped` | A tracking number is required |
| `needs_revision` | `revision_count < 2`, preventing unbounded rework loops |

### 9.3 Commission payments

The `commission_payments` table carries a **unique index** `one_payment_stage` on `(commission_id, type)`, so the database itself guarantees that the deposit and the final payment can each be confirmed only once. `confirmed_by` is a foreign key to `users`, satisfying both segregation of duties and traceability.

---

## 10. Frontend Applications

Two independent SPAs, each with its own `npm install` / `npm run dev` / `npm run build`.

### 10.1 Storefront — `frontend/shop` (port 3000)

| Route | Page | Access |
| --- | --- | --- |
| `/` | Home | Public |
| `/products` | Product listing | Public |
| `/products/:id` | Product detail | Public |
| `/cart` | Cart | Authenticated |
| `/checkout` | Checkout | Authenticated |
| `/login` `/register` `/verify-email` | Authentication | Public |
| `/forgot-password` `/reset-password` | Password recovery | Public |
| `/me/orders` | My orders | Authenticated |
| `/me/commissions` `/me/commissions/new` | My commissions / request wizard | Authenticated |
| `/me/*` | Account centre | Authenticated |

Shared components: `Layout`, `ProtectedRoute`, `StatusChip`, `Timeline`, `Modal`, `Stepper`, `Skeleton`, `Toast`, plus `ui/` primitives (`Button`, `Card`, `Input`, `Select`).

### 10.2 Admin console — `frontend/admin` (port 3001)

| Route | Page |
| --- | --- |
| `/login` | Admin login |
| `/users` `/users/:id` | User management |
| `/roles` `/roles/:id` | Roles and permissions |
| `/products` `/products/:id` | Product management |
| `/orders` `/orders/:id` | Order management |
| `/commissions` `/commissions/:id` `/commissions/config` | Commission management and slot configuration |
| `/payments` | Payment confirmation |
| `/tickets` `/tickets/:id` | Support tickets |
| `/content` | CMS pages |
| `/audit` | Audit log |

Shared components: `AdminLayout`, `DataTable`, `Modal`, `ProtectedRoute`, `StatusBadge`.

### 10.3 Frontend authorization

Each app keeps its own token storage and permission context (`store/authStore.jsx` + `store/tokenStore.js`); admin and storefront sessions are never shared. An axios response interceptor handles `401` uniformly by clearing credentials and redirecting to `/login`.

---

## 11. Testing

### 11.1 Go unit and integration tests

```bash
cd backend
go test ./...              # everything
go test ./internal/middleware/... -v
go test ./internal/service/... -run TestOrderFSM -v
go test -race ./...
```

Coverage:

| File | Covers |
| --- | --- |
| `middleware/middleware_test.go` | Auth, CORS, rate limiting, security headers |
| `middleware/session_test.go` | Session resolution, route permission registry, commission data scope |
| `service/auth_password_test.go` | Password policy and hashing |
| `service/auth_integration_test.go` | Register / login / lockout / refresh end to end |
| `service/order_fsm_test.go` | Order state machine transition matrix |
| `service/order_pricing_test.go` | Pricing calculation and stock deduction |
| `service/order_integration_test.go` | Order creation → payment → status transitions |
| `service/commission_fsm_test.go` | Commission state machine transition matrix |

### 11.2 Bash integration suite

Requires the backend to be running:

```bash
./tests/test_integration.sh
```

Ten groups: public endpoints → registration and email verification → login → current user → product management → user management → role management → cart operations → **RBAC enforcement** → audit logs.

Default credentials: admin `admin@fursuit.nz / admin123`, test customer `test@fursuit.nz / testpass123`.

### 11.3 Playwright E2E

```bash
cd tests/e2e
npm install
npx playwright install chromium

# requires backend 8080, shop 3000 and admin 3001 to be running
npx playwright test                    # all three projects
npx playwright test --project=api      # API only
npx playwright test --project=shop
npx playwright test --project=admin
npx playwright test --headed --debug    # debugging
```

| Project | baseURL | Covers |
| --- | --- | --- |
| `shop` | `http://localhost:3000` | Storefront pages, login form, navigation |
| `admin` | `http://localhost:3001` | Admin login, dashboard, sidebar |
| `api` | `http://localhost:8080` | Register/login/products/permissions/health checks/security headers — roughly 30 serialised cases |

Configuration: `timeout 30s`, `retries 1`, `workers 1`, automatic screenshots on failure, traces captured on retry.

---

## 12. Security and Operations

### 12.1 Security response headers

`SecurityHeadersMiddleware` injects the following on every response:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Request-ID: <uuid>          # RequestIDMiddleware
```

### 12.2 Rate limiting

`RateLimitMiddleware` implements a fixed-window counter using Redis `INCR` + `EXPIRE`, applied to registration, customer login, admin login and password-reset requests. Responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`; exceeding the limit returns `429` with a `Retry-After` header.

### 12.3 Brute-force protection

After `MAX_LOGIN_ATTEMPTS` consecutive failures (5 by default) the account is locked for `LOCKOUT_DURATION` (15 minutes by default).

### 12.4 File uploads

- Extension allowlist: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.pdf`
- Size capped by `MAX_FILE_SIZE_MB` (20 MB by default), enforced again via `http.MaxBytesReader`
- Public images are archived by `YYYY/MM/DD` and named with the first 16 hex characters of their SHA-256 digest — content-addressed, so duplicates collapse naturally
- **Private files** (`stored_files`) never land in a public path; downloads require a signed link and are checked against the file's owner

### 12.5 Email outbox

`EmailService.QueueEmail` only writes to the `email_outboxes` table; a background goroutine calls `ProcessOutbox()` every 30 seconds to deliver over SMTP. The benefit: an SMTP outage never blocks a business transaction, and a restart never loses queued mail.

### 12.6 Graceful shutdown

`SIGINT` / `SIGTERM` are handled, and `srv.Shutdown` allows up to 5 seconds for in-flight requests to complete.

### 12.7 Connection pooling

`SetMaxIdleConns(10)`, `SetMaxOpenConns(100)`, `SetConnMaxLifetime(1h)`.

---

## 13. Known Issues

**The commission state machine tests do not pass.** In `go test ./internal/service/`, `TestCommissionFSM_CanTransition` and `TestCommissionFSM_TransitionMatrix_Completeness` fail with 32 failing subtests.

Cause: the tests expect a broader V4 state machine than the `commissionAllowedTransitions` map in `commission_fsm.go` actually declares. Missing states and transitions:

- Missing states: `reviewing`, `deposit_received`, `in_progress`, `stage_review`, `stage_approved`, `final_review`, `revision_requested`, `disputed`
- Missing transitions: `final_review → disputed`, `revision_requested → disputed`, `disputed → in_progress`, `disputed → cancelled`

Note that `006_commission_workflow.sql` already folds these legacy states into `on_hold`, but **the state machine itself has not been extended to match**. Two ways to resolve:

1. Extend `commissionAllowedTransitions` to match the V4 requirements document, including a `disputed` branch
2. If those states are confirmed as retired in V4, update the test expectations instead

All other packages pass; `internal/middleware` is fully green.

---

## 14. Three-Phase Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| **Phase 1** — Launchable MVP closed loop | Authentication + RBAC, products and inventory, cart, orders, bank transfer with manual confirmation, commission intake and quoting, tickets, CMS, audit, cultural screening skeleton | Implemented |
| **Phase 2** — Operations, payments, logistics and compliance automation | Payment gateway integration, automatic shipping labels, refund workflow, automated privacy requests (Privacy Act), cultural review evidence chain | Partially implemented |
| **Phase 3** — Scale, growth and intelligent operations | Multi-channel marketing, analytics dashboards, repurchase and loyalty programmes, recommendations | Not started |

Phase 1 **explicitly excludes** real credit-card processing, automatic shipping labels, sophisticated marketing tooling and a 3D configurator. Instead it provides operable fallbacks — bank transfer with manual confirmation, hand-entered tracking numbers — so the business loop never breaks.

**Permanently out of scope:** offline POS, second-hand marketplace matching, multi-vendor marketplace functionality, auto-generated Māori cultural artwork without review, and storage of full card numbers.

---

## 15. Legal and Cultural Compliance

The system implements the following compliance baseline; the authoritative wording lives in Chapter 13 of the requirements document.

| Area | Implementation |
| --- | --- |
| Privacy | Full card numbers are never stored; private files use signed links with ownership checks; a `privacy_officer` role plus the `privacy_requests.manage` permission handle data-access requests |
| Māori culture | `cultural_flag` and `cultural_decision` columns; a `cultural_reviewer` role; a commission **cannot** reach `approved_for_quote` without cultural approval |
| Audit | An `audit_logs` table exposed at `GET /admin/audit`; every transition appends to `*_status_history`; a `request_id` threads through the whole request path |
| Segregation of duties | `maker` cannot confirm payments; role-permission mappings are auditable at the database layer |

> This repository translates official rules into system requirements. It does **not** replace professional advice from New Zealand lawyers, accountants or cultural advisors.

---

## 16. License

Internal project; no open-source license has been designated. The requirements document `NZ_Fursuit_Platform_Three_Phase_Closed_Loop_Requirements_RBAC_First_v4.0.docx` is the single source of truth — where code and documentation disagree, the document wins.
