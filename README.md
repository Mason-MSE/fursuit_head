# Fursuit Head — 新西兰兽装头套定制平台

> 品牌官网 + 现货商城 + Commission 定制 + 制作排期 + 收款 + 发货 + 售后的一体化电商平台。
> 技术路线遵循《NZ Fursuit Platform Three-Phase Closed-Loop Requirements V4.0》：**RBAC 优先**、Go 三层架构、React 双前端、MySQL、Redis。

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

## 目录

- [1. 项目定位](#1-项目定位)
- [2. 技术栈](#2-技术栈)
- [3. 目录结构](#3-目录结构)
- [4. 快速开始](#4-快速开始)
- [5. 环境变量](#5-环境变量)
- [6. 种子数据与默认账号](#6-种子数据与默认账号)
- [7. API 概览](#7-api-概览)
- [8. RBAC 权限模型](#8-rbac-权限模型)
- [9. 业务状态机](#9-业务状态机)
- [10. 前端应用](#10-前端应用)
- [11. 测试](#11-测试)
- [12. 安全与运维](#12-安全与运维)
- [13. 已知问题](#13-已知问题)
- [14. 三阶段路线图](#14-三阶段路线图)
- [15. 法律与文化合规](#15-法律与文化合规)
- [16. 许可](#16-许可)

---

## 1. 项目定位

面向新西兰及国际客户的 **兽装头套（Fursuit Head / Kemono Head）** 品牌官网与电商定制平台，支持三条业务主线：

| 业务类型 | 说明 | 主流程 |
| --- | --- | --- |
| **Ready to Ship** | 现货商品 | 浏览 → 加购 → 结算 → 银行转账/人工确认 → 备货 → 发货 |
| **Made to Order** | 标准配置定制 | 选配置 → 下单 → 排期 → 制作 → 质检 → 发货 |
| **Full Commission** | 完全定制 | 申请 → 审核 → 文化筛查 → 报价 → 订金 → 制作 → 阶段确认 → 尾款 → 发货 → 售后 |

另含 **维修 / 翻新 / 可替换部件** 服务，以及 **Māori 文化敏感内容**的筛查、审核与证据留存。

**设计原则：RBAC 先行。** 权限、资源所有权校验、审批分离（maker 无确认收款权）与审计日志从第一阶段即作为平台基础能力落地——不允许"前端隐藏菜单、后端接口仍可越权"。

---

## 2. 技术栈

### 后端

- **Go 1.22+** / **Gin 1.9.1** / **GORM 1.25** / MySQL 驱动
- **Redis 7**（go-redis/v9）：限流、会话缓存、健康检查
- **golang-jwt/jwt v5**：Access Token（HS256，带 `session_id`）
- **golang.org/x/crypto**：bcrypt 密码哈希
- **google/uuid**：文件命名
- 三层架构：`handler`（HTTP 边界）→ `service`（业务与事务）→ `repository` / `platform`（数据访问）

### 前端（双前端，独立部署、独立路由、独立权限上下文）

- **React 18.3** + **React Router 6** + **Vite**（shop 用 5.x，admin 用 6.x）
- **Tailwind CSS 4**（`@tailwindcss/vite` 插件，无 `tailwind.config.js`）
- **axios** + 拦截器（统一注入 Bearer Token、401 自动登出跳转）

### 基础设施

- **Docker Compose**：MySQL 8.0、Redis 7、Mailpit（本地 SMTP 收信箱）
- **Playwright 1.62**：E2E 测试（shop / admin / api 三个 project）

---

## 3. 目录结构

```
fursuit_head/
├── docker-compose.yml              # MySQL + Redis + Mailpit
├── README.md
├── business_flow.png               # 业务流程图
├── NZ_Fursuit_..._v4.0.docx        # 需求规格说明书（唯一事实来源）
│
├── backend/                        # Go API 服务
│   ├── cmd/api/main.go             # 入口：依赖装配、路由、优雅退出
│   ├── go.mod / go.sum
│   ├── internal/
│   │   ├── config/                 # 环境变量配置
│   │   ├── handler/                # HTTP 层（11 个 handler）
│   │   ├── middleware/             # 会话鉴权、RBAC、CORS、限流、安全头
│   │   ├── model/                  # GORM 模型
│   │   ├── platform/
│   │   │   ├── db/                 # MySQL 连接池
│   │   │   └── redis/              # Redis 客户端
│   │   ├── repository/             # 会话仓储
│   │   ├── service/                # 业务逻辑 + 状态机 + 事务
│   │   └── dto/                    # 请求/响应 DTO
│   ├── migrations/                 # 顺序执行的 SQL 迁移（init → 006）
│   └── uploads/                    # 运行时上传目录（已 gitignore）
│
├── frontend/
│   ├── shop/                       # 商城前台（端口 3000）
│   └── admin/                      # 管理后台（端口 3001）
│
├── tests/
│   ├── test_integration.sh         # Bash + curl 集成测试（10 组）
│   └── e2e/                        # Playwright E2E
│       ├── playwright.config.js
│       └── tests/{shop,admin,api}/
│
└── docs/requirements.txt           # 文档生成工具依赖
```

---

## 4. 快速开始

### 4.1 前置依赖

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Go | 1.22+ | 后端构建 |
| Node.js | 18+（实测 20.x） | 前端构建 |
| Docker + Docker Compose | 任意近期版本 | MySQL / Redis / Mailpit |

### 4.2 启动依赖服务

```bash
docker compose up -d
docker compose ps          # 等待 mysql、redis 均为 healthy
```

Compose 会自动把 `backend/migrations/*.sql` 按文件名顺序挂载到 MySQL 的 `/docker-entrypoint-initdb.d/`，**首次启动即完成建库建表与种子数据**。

| 服务 | 地址 | 说明 |
| --- | --- | --- |
| MySQL | `localhost:3307` | 库 `fursuit_platform`，用户 `root` / `password` |
| Redis | `localhost:6380` | 无密码 |
| Mailpit UI | http://localhost:8025 | 本地邮件收件箱（验证码、重置链接） |
| Mailpit SMTP | `localhost:1025` | |

> ⚠️ 迁移脚本仅在 MySQL **数据卷为空**时执行。若需重置：
> ```bash
> docker compose down -v && docker compose up -d
> ```

### 4.3 启动后端

```bash
cd backend
go mod download
go run ./cmd/api
# → Server starting on port 8080
```

构建二进制：

```bash
go build -o fursuit-api ./cmd/api
./fursuit-api
```

验证：

```bash
curl -s http://localhost:8080/health | jq
# {"status":"ok","time":"...","checks":{"database":"ok","redis":"ok"}}
```

### 4.4 启动前端

开两个终端：

```bash
# 终端 1 — 商城前台 http://localhost:3000
cd frontend/shop && npm install && npm run dev
```

```bash
# 终端 2 — 管理后台 http://localhost:3001
cd frontend/admin && npm install && npm run dev
```

两个前端的 Vite 配置都已把 `/api` 与 `/uploads` 代理到 `http://localhost:8080`，无需额外配置跨域或环境变量。

生产构建：

```bash
npm run build      # 产物在 dist/
npm run preview
```

### 4.5 邮件验证（本地）

注册后账号状态为 `pending_email`，需完成验证才能登录。Mailpit 不会自动发信，验证码/链接可在以下位置取得：

- Mailpit 界面：http://localhost:8025
- 或直接查库：
  ```sql
  SELECT email, LEFT(token, 12) AS token FROM email_verifications ORDER BY id DESC LIMIT 5;
  UPDATE users SET status='active', email_verified_at=NOW() WHERE email='test@fursuit.nz';
  ```

---

## 5. 环境变量

全部配置集中在 `backend/internal/config/config.go`，**每一项都有默认值**，无 `.env` 也能跑起来。生产环境必须覆盖 `JWT_SECRET`、`DB_PASSWORD`、`DB_*`。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SERVER_PORT` | `8080` | API 监听端口 |
| `DB_HOST` | `localhost` | MySQL 主机 |
| `DB_PORT` | `3307` | MySQL 端口（Compose 映射值） |
| `DB_USER` | `root` | MySQL 用户 |
| `DB_PASSWORD` | `password` | MySQL 密码 |
| `DB_NAME` | `fursuit_platform` | 数据库名 |
| `REDIS_ADDR` | `localhost:6380` | Redis 地址 |
| `JWT_SECRET` | `fursuit-dev-secret-key-change-in-prod` | **HS256 签名密钥，生产必改** |
| `FRONTEND_URL` | `http://localhost:3000` | CORS 允许来源（另硬编码允许 3001/5173/5174） |
| `ACCESS_TOKEN_TTL` | `15m` | Access Token 有效期 |
| `REFRESH_TOKEN_TTL` | `168h` (7d) | Refresh Token 有效期 |
| `MAX_LOGIN_ATTEMPTS` | `5` | 登录失败锁定阈值 |
| `LOCKOUT_DURATION` | `15m` | 账号锁定时长 |
| `RATE_LIMIT_WINDOW` | `1m` | 限流窗口 |
| `RATE_LIMIT_MAX` | `30` | 窗口内最大请求数 |
| `SMTP_HOST` | `localhost` | SMTP 主机 |
| `SMTP_PORT` | `1025` | SMTP 端口 |
| `SMTP_USER` | *(空)* | SMTP 用户名 |
| `SMTP_PASSWORD` | *(空)* | SMTP 密码 |
| `SMTP_FROM` | `noreply@fursuit.local` | 发件人 |
| `FILE_UPLOAD_PATH` | `./uploads` | 上传根目录（相对 `backend/`） |
| `MAX_FILE_SIZE_MB` | `20` | 单文件大小上限 |

---

## 6. 种子数据与默认账号

### 6.1 默认管理员

| 邮箱 | 密码 | 角色 |
| --- | --- | --- |
| `admin@fursuit.nz` | `admin123` | `super_admin` |

> ⚠️ 首次登录后立即修改密码。该账号由 `migrations/init.sql` 以 bcrypt 哈希写入。

### 6.2 种子内容

- **57 个权限**（`permissions`），按模块划分：`auth` / `products` / `categories` / `orders` / `commissions` / `milestones` / `quotes` / `payments` / `inventory` / `tickets` / `users` / `roles` / `pages` / `audit` / `reports` / `settings` / `cultural_reviews` / `privacy_requests`
- **11 个系统角色**（`roles`），`is_system = TRUE` 不可删除
- **角色-权限映射**带 `scope`（`all` / `assigned`）两级数据范围
- **Commission 配置**：开放中，5 个制作档期，已预订 0，允许候补，最少订金 50%，报价有效期 14 天
- **商品分类**种子数据

### 6.3 迁移文件顺序

| 文件 | 内容 |
| --- | --- |
| `init.sql` | 全部基础表（用户、商品、订单、Commission、工单、CMS、审计…）+ 权限/角色/管理员/分类种子 |
| `002_add_new_tables.sql` | 补充表 |
| `003_rbac_sessions.sql` | V4 RBAC 对齐：新增 12 权限 / 7 角色、**作废所有存量明文验证链接与 Refresh Token** |
| `004_order_integrity.sql` | 订单完整性约束 |
| `005_private_files.sql` | 私有文件（`stored_files`） |
| `006_commission_workflow.sql` | V4 Commission 工作流：新增 `cultural_decision` / `deposit_received_cents` / `final_received_cents` / `tracking_number` / `revision_count`，新增 `commission_payments` |

> `003` 与 `006` 均为**仅向前**迁移：撤销权限与令牌失效无法安全回滚。

---

## 7. API 概览

基础路径 `/api/v1`，统一响应包：

```jsonc
// 成功
{ "success": true, "data": { } }

// 失败
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Insufficient permissions", "request_id": "..." } }
```

### 7.1 公共端点

| 方法 | 路径 | 说明 | 限流 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 注册（触发验证邮件） | ✅ |
| POST | `/auth/login` | 顾客登录 | ✅ |
| POST | `/admin/auth/login` | 后台登录（校验 `auth.admin_login`） | ✅ |
| POST | `/auth/verify-email` | 提交验证令牌 | — |
| GET | `/auth/verify-email?token=` | 邮件链接验证 | — |
| POST | `/auth/forgot-password` | 申请重置（不存在也返回成功，防枚举） | ✅ |
| POST | `/auth/reset-password` | 用令牌重置密码 | — |
| POST | `/auth/refresh-token` | 刷新 Access Token | — |
| GET | `/products` | 商品列表 | — |
| GET | `/products/:id` | 商品详情 | — |
| GET | `/categories` | 分类列表 | — |
| GET | `/pages/:slug` | CMS 页面内容 | — |
| GET | `/commission-config` | 开放档期与订金比例 | — |
| GET | `/files/:id/download` | 私有文件下载（校验签名链接） | — |

### 7.2 顾客端点（需会话）

| 方法 | 路径 |
| --- | --- |
| GET | `/auth/me` |
| POST | `/auth/logout` |
| POST | `/auth/change-password` |
| GET/POST/PUT/DELETE | `/me/cart`、`/me/cart/items[/:id]` |
| GET/POST/PUT/DELETE | `/me/addresses[/:id]` |
| GET/POST | `/me/orders`、`/me/orders/:id` |
| POST | `/me/orders/:id/cancel` |
| GET/POST/PUT | `/me/commissions[/:id]` |
| POST | `/me/commissions/:id/submit`（支持 `multipart/form-data`） |
| GET | `/me/commissions/:id/quotes` |
| POST | `/me/commissions/:id/quotes/:quoteId/accept` |
| POST | `/me/payments/upload`（上传转账凭证） |
| GET | `/me/payments` |
| GET/POST | `/me/tickets`、`/me/tickets/:id/messages` |
| POST | `/upload` |
| GET | `/me/files/:id/link` |

### 7.3 管理端点（需会话 + `auth.admin_login` + 路由级权限）

| 模块 | 路径前缀 | 关键操作 |
| --- | --- | --- |
| 仪表盘 | `/admin/dashboard/*` | `stats`、`activity` |
| 用户 | `/admin/users[/:id]` | 列表、详情、更新、订单、审计轨迹 |
| 角色 | `/admin/roles[/:id]` | 增删改查 + `/admin/permissions` |
| 商品 | `/admin/products[/:id]` | 增删改查 |
| 订单 | `/admin/orders[/:id]` | 列表、详情、`PUT /:id/status` |
| Commission | `/admin/commissions[/:id]` | 列表、详情、更新、`PUT /:id/assign` |
| 支付 | `/admin/payments` | 列表、`PUT /:id/confirm` |
| 工单 | `/admin/tickets[/:id]` | 列表、详情、改状态、回消息 |
| CMS | `/admin/pages[/:id]` | 增删改查、`/versions`、`/approve`、`/rollback` |
| 审计 | `/admin/audit` | 审计日志 |
| 设置 | `/admin/commission-config` | GET / PUT 制作档期配置 |

### 7.4 健康检查

| 路径 | 说明 |
| --- | --- |
| `GET /health` | 就绪检查（含 DB + Redis ping），异常返回 `503` |
| `GET /health/live` | 存活探针 |
| `GET /health/ready` | 同 `/health` |

---

## 8. RBAC 权限模型

### 8.1 三层校验链

```
请求 → SessionAuth（JWT 验签 + 会话落库校验）
     → AdminAuthorization（必须有 auth.admin_login）
     → RBACMiddleware（按 路由 → 权限 显式注册表 校验）
     → AssignedCommissionScope（maker 只能看到分配给自己的 Commission）
     → Handler
```

### 8.2 关键设计：显式路由注册表

`backend/internal/middleware/session.go` 中的 `AdminPermissions` map 穷举了**每一条**管理路由对应的权限：

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

**新增路由若未在此注册，一律 403（fail-closed）**——不存在"忘了加权限判断就默认放行"的可能。

### 8.3 会话即真相源（Session as Source of Truth）

`SessionAuth` **不信任 JWT 里的角色与权限**，只信任 `user_id` + `session_id`，然后回查 `user_sessions` 表解析身份：

```go
identity, err := resolver.ResolveSession(ctx, claims.UserID, claims.SessionID)
```

好处：改角色 / 吊销会话 / 强制登出立即生效，无需等待 Token 过期。同时强制校验 `WithExpirationRequired()`、`WithIssuedAt()`、`HS256` 白名单，缺失或非法一律 401。

### 8.4 数据范围（Scope）

`role_permissions.scope` 支持两级可见性：

- `all` — 全量数据
- `assigned` — 仅与自己相关的记录

`maker` 角色即为 `assigned` scope：只能读写 `maker_id` 指向自己的 Commission，未分配的直接返回 `404`（而非 `403`，避免泄露资源存在性）。

### 8.5 11 个系统角色

| 角色 | scope | 职责 |
| --- | --- | --- |
| `super_admin` | all | 全部权限 |
| `admin` | all | 除 `roles.*` 外的管理权限 |
| `customer_service` | all | 客服：订单、Commission、报价、工单 |
| `support` | all | 客服（V4 细分角色） |
| `maker` | **assigned** | 制作师：仅自己的 Commission 与里程碑 |
| `warehouse` | all | 仓储：订单发货、库存查询与调整 |
| `finance` | all | 财务：支付确认/退款、报表 |
| `cultural_reviewer` | all | Māori 文化内容审核 |
| `privacy_officer` | all | 隐私请求（GDPR/Privacy Act）处理 |
| `content_editor` | all | CMS 内容编辑 |
| `customer` | — | 普通顾客（非后台角色） |

**职责分离要点**：`maker` 无 `payments.confirm` 权限——收款确认只能由 `finance` / `super_admin` 执行。

---

## 9. 业务状态机

状态流转定义在 `backend/internal/service/order_fsm.go` 与 `commission_fsm.go`，**所有流转都在数据库事务内执行**，并强制：

- `SELECT ... FOR UPDATE` 行锁
- **乐观锁版本校验**（`current.Version != order.Version` → `concurrent modification`）
- 非法流转直接报错
- 每次流转写入 `*_status_history` 审计轨迹

### 9.1 订单状态机

```
awaiting_payment ──→ paid ──→ processing ──→ ready_to_ship ──→ shipped ──→ delivered ──→ completed
       │                                                          ▲
       └──→ cancelled                                             │
                                                                  │
refund_pending ──→ refunded        （已付款订单不可直接 cancelled）
```

守卫条件：

| 目标状态 | 前置条件 |
| --- | --- |
| `paid` | 已确认支付总额 **必须等于** 订单总额 |
| `cancelled` | 不得存在已完成支付；必须提供取消原因；自动回滚库存 |
| `shipped` | 必须提供物流单号 |

### 9.2 Commission 状态机（V4，24 态）

```
draft → submitted ─┬→ needs_info ─→ submitted
                   ├→ screening ─→ cultural_review ─→ approved_for_quote → quoted
                   │      ↑            │                    ↓
                   └──────┴────────────┘                deposit_pending → scheduled
                                                                ↓
                              design_review ⇄ needs_revision（最多 2 轮）
                                   ↓
                              materials → production → customer_review
                                   ↓                              ↓
                              quality_check ←──────────────────────┘
                                   ↓
                        final_payment_pending → ready_to_ship → shipped → completed
```

守卫条件：

| 目标状态 | 前置条件 |
| --- | --- |
| `approved_for_quote` | 带文化标记的 Commission **必须**已有 `cultural_decision` = `approved` / `conditional` |
| `scheduled` | 已确认订金（`deposit_received_cents > 0`） |
| `design_review` | 已分配 Maker |
| `ready_to_ship` | 已确认尾款（`final_received_cents > 0`） |
| `shipped` | 必须有物流单号 |
| `needs_revision` | `revision_count < 2`（防止无限返工） |

### 9.3 Commission 收款

`commission_payments` 表对 `(commission_id, type)` 建**唯一索引** `one_payment_stage`，从数据库层面保证订金与尾款各只能确认一次；确认人 `confirmed_by` 外键指向 `users`，满足职责分离与可追溯。

---

## 10. 前端应用

两个独立 SPA，各自 `npm install` / `npm run dev` / `npm run build`。

### 10.1 商城前台 `frontend/shop`（端口 3000）

| 路由 | 页面 | 访问 |
| --- | --- | --- |
| `/` | 首页 | 公开 |
| `/products` | 商品列表 | 公开 |
| `/products/:id` | 商品详情 | 公开 |
| `/cart` | 购物车 | 需登录 |
| `/checkout` | 结算 | 需登录 |
| `/login` `/register` `/verify-email` | 认证 | 公开 |
| `/forgot-password` `/reset-password` | 密码找回 | 公开 |
| `/me/orders` | 我的订单 | 需登录 |
| `/me/commissions` `/me/commissions/new` | 我的定制 / 下单向导 | 需登录 |
| `/me/*` | 账户中心 | 需登录 |

组件：`Layout`、`ProtectedRoute`、`StatusChip`、`Timeline`、`Modal`、`Stepper`、`Skeleton`、`Toast`，以及 `ui/` 原子组件（`Button` / `Card` / `Input` / `Select`）。

### 10.2 管理后台 `frontend/admin`（端口 3001）

| 路由 | 页面 |
| --- | --- |
| `/login` | 后台登录 |
| `/users` `/users/:id` | 用户管理 |
| `/roles` `/roles/:id` | 角色与权限 |
| `/products` `/products/:id` | 商品管理 |
| `/orders` `/orders/:id` | 订单管理 |
| `/commissions` `/commissions/:id` `/commissions/config` | Commission 管理与档期配置 |
| `/payments` | 支付确认 |
| `/tickets` `/tickets/:id` | 工单 |
| `/content` | CMS 页面 |
| `/audit` | 审计日志 |

组件：`AdminLayout`、`DataTable`、`Modal`、`ProtectedRoute`、`StatusBadge`。

### 10.3 前端鉴权

两套独立的 token 存储与权限上下文（`store/authStore.jsx` + `store/tokenStore.js`），后台与前台互不共享会话。axios 响应拦截器统一处理 `401` → 清理凭证 → 跳转 `/login`。

---

## 11. 测试

### 11.1 Go 单元 / 集成测试

```bash
cd backend
go test ./...              # 全部
go test ./internal/middleware/... -v
go test ./internal/service/... -run TestOrderFSM -v
go test -race ./...
```

覆盖范围：

| 文件 | 覆盖内容 |
| --- | --- |
| `middleware/middleware_test.go` | 鉴权、CORS、限流、安全头 |
| `middleware/session_test.go` | 会话解析、路由权限注册表、Commission 数据范围 |
| `service/auth_password_test.go` | 密码策略、哈希 |
| `service/auth_integration_test.go` | 注册/登录/锁定/刷新全链路 |
| `service/order_fsm_test.go` | 订单状态机流转矩阵 |
| `service/order_pricing_test.go` | 价格计算、库存扣减 |
| `service/order_integration_test.go` | 下单 → 支付 → 状态流转 |
| `service/commission_fsm_test.go` | Commission 状态机流转矩阵 |

### 11.2 Bash 集成测试

需后端已启动：

```bash
./tests/test_integration.sh
```

10 组用例：公共端点 → 注册与邮箱验证 → 登录 → 当前用户 → 商品管理 → 用户管理 → 角色管理 → 购物车 → **RBAC 越权拦截** → 审计日志。

默认凭据：管理员 `admin@fursuit.nz / admin123`，测试顾客 `test@fursuit.nz / testpass123`。

### 11.3 Playwright E2E

```bash
cd tests/e2e
npm install
npx playwright install chromium

# 需先启动：后端 8080、shop 3000、admin 3001
npx playwright test                    # 全部三个 project
npx playwright test --project=api      # 仅 API
npx playwright test --project=shop
npx playwright test --project=admin
npx playwright test --headed --debug    # 调试
```

| Project | baseURL | 覆盖 |
| --- | --- | --- |
| `shop` | `http://localhost:3000` | 商城页面、登录表单、导航 |
| `admin` | `http://localhost:3001` | 后台登录、仪表盘、侧边栏 |
| `api` | `http://localhost:8080` | 注册/登录/商品/权限/健康检查/安全响应头（约 30 个用例，串行执行） |

配置：`timeout 30s`、`retries 1`、`workers 1`、失败自动截图、重试时记录 trace。

---

## 12. 安全与运维

### 12.1 安全响应头

`SecurityHeadersMiddleware` 为每个响应注入：

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

### 12.2 限流

`RateLimitMiddleware` 基于 Redis `INCR` + `EXPIRE` 的固定窗口计数，应用于注册、登录、后台登录、忘记密码。响应头返回 `X-RateLimit-Limit` / `X-RateLimit-Remaining`，超限返回 `429` 与 `Retry-After`。

### 12.3 暴力破解防护

连续登录失败达 `MAX_LOGIN_ATTEMPTS`（默认 5）次后锁定 `LOCKOUT_DURATION`（默认 15 分钟）。

### 12.4 文件上传

- 扩展名白名单：`.jpg` `.jpeg` `.png` `.gif` `.webp` `.pdf`
- 大小上限 `MAX_FILE_SIZE_MB`（默认 20MB），`http.MaxBytesReader` 双重限制
- 公开图片：按 `YYYY/MM/DD` 归档 + SHA-256 前 16 位命名（内容寻址，天然去重）
- **私有文件**（`stored_files`）：不落公开路径，下载需签名链接，且校验文件归属

### 12.5 邮件 Outbox

`EmailService.QueueEmail` 只写 `email_outboxes` 表，后台 goroutine **每 30 秒**调用 `ProcessOutbox()` 投递 SMTP。好处：SMTP 故障不阻塞业务事务，重启不丢邮件。

### 12.6 优雅退出

监听 `SIGINT` / `SIGTERM`，`srv.Shutdown` 最多等待 5 秒完成存量请求。

### 12.7 数据库连接池

`SetMaxIdleConns(10)` / `SetMaxOpenConns(100)` / `SetConnMaxLifetime(1h)`。

---

## 13. 已知问题

**Commission 状态机测试未通过。** `go test ./internal/service/` 中 `TestCommissionFSM_CanTransition` 与 `TestCommissionFSM_TransitionMatrix_Completeness` 失败（32 个子用例）。

原因：测试期望的 V4 状态机比 `commission_fsm.go` 中 `commissionAllowedTransitions` 更宽，缺少这些状态与流转：

- 缺失状态：`reviewing`、`deposit_received`、`in_progress`、`stage_review`、`stage_approved`、`final_review`、`revision_requested`、`disputed`
- 缺失流转：`final_review → disputed`、`revision_requested → disputed`、`disputed → in_progress`、`disputed → cancelled`

注意 `006_commission_workflow.sql` 已把这些旧状态统一迁移为 `on_hold`，但**状态机本身尚未同步扩展**。修复方向二选一：

1. 按 V4 需求文档补全 `commissionAllowedTransitions`（含 `disputed` 争议处理分支）
2. 若确认 V4 已废弃这些状态，则同步更新测试用例

其余模块测试通过（`internal/middleware` 全绿）。

---

## 14. 三阶段路线图

| 阶段 | 范围 | 状态 |
| --- | --- | --- |
| **阶段一**：可上线接单的 MVP 闭环 | 认证 + RBAC、商品与库存、购物车、订单、银行转账人工确认、Commission 申请与报价、工单、CMS、审计、文化筛查骨架 | 代码已实现 |
| **阶段二**：运营、支付、物流与合规自动化 | 自动支付网关、物流单号自动生成、退款流程、隐私请求（Privacy Act）自动化、文化审核证据链 | 部分实现 |
| **阶段三**：规模化、增长与智能运营 | 多渠道营销、数据看板、复购与会员体系、智能推荐 | 未开始 |

阶段一**明确不包含**：真实信用卡支付、自动物流标签、复杂营销工具、3D 配置器——但已通过"银行转账 + 人工确认""手工物流单号"提供可运营兜底，保证闭环不断点。

**平台长期不包含**：线下 POS、二手交易撮合、多商户 Marketplace、未经审核自动生成 Māori 文化图样、存储完整信用卡信息。

---

## 15. 法律与文化合规

代码实现对应的合规基线（完整条款见需求文档第 13 章）：

| 领域 | 系统实现 |
| --- | --- |
| 隐私 | 不存储完整信用卡号；私有文件签名链接 + 归属校验；`privacy_officer` 角色 + `privacy_requests.manage` 权限处理数据访问请求 |
| Māori 文化 | `cultural_flag` / `cultural_decision` 字段；`cultural_reviewer` 角色；未获文化审核通过**无法**进入 `approved_for_quote` |
| 审计 | `audit_logs` 表 + `GET /admin/audit`；状态流转写 `*_status_history`；`request_id` 全链路追踪 |
| 职责分离 | `maker` 无收款确认权；角色-权限映射在数据库层可审计 |

> 本仓库将官方规则转换为系统要求，但**不替代**新西兰律师、税务师或文化顾问的专业意见。

---

## 16. 许可

内部项目，暂未指定开源许可证。需求文档 `NZ_Fursuit_Platform_Three_Phase_Closed_Loop_Requirements_RBAC_First_v4.0.docx` 为项目唯一事实来源，代码与文档冲突时以文档为准。
