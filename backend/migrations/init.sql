-- Fursuit Platform Phase 1 MVP Schema
-- MySQL 8.0

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- RBAC Tables
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    scope VARCHAR(20) DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- User & Auth Tables
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    status ENUM('pending_email','active','suspended','deleted') DEFAULT 'pending_email',
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    marketing_consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT UNSIGNED,
    expires_at TIMESTAMP NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    type ENUM('register','password_reset') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Address Table
-- ============================================

CREATE TABLE IF NOT EXISTS addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(100),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) DEFAULT 'NZ',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Product & Catalog Tables
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED,
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(1000),
    base_price_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'NZD',
    gst_rate DECIMAL(5,2) DEFAULT 15.00,
    product_type ENUM('ready_to_ship','made_to_order','commission','service') DEFAULT 'ready_to_ship',
    status ENUM('draft','published','archived') DEFAULT 'draft',
    main_image_url VARCHAR(500),
    care_instructions TEXT,
    safety_notes TEXT,
    shipping_info TEXT,
    return_policy TEXT,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    weight_grams INT,
    estimated_days_min INT,
    estimated_days_max INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_products_category (category_id),
    INDEX idx_products_status (status),
    INDEX idx_products_type (product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(500),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price_cents BIGINT UNSIGNED NOT NULL,
    stock_on_hand INT UNSIGNED DEFAULT 0,
    stock_reserved INT UNSIGNED DEFAULT 0,
    attributes JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variants_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id BIGINT UNSIGNED NOT NULL,
    type ENUM('purchase','adjustment','reserved','released','sold','returned','scrapped') NOT NULL,
    quantity INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    note TEXT,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    INDEX idx_stock_variant (variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Cart Tables
-- ============================================

CREATE TABLE IF NOT EXISTS carts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cart_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    price_cents_snapshot BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cart_variant (cart_id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Order Tables
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending','paid','confirmed','processing','shipped','delivered','cancelled','refunded','partially_refunded') DEFAULT 'pending',
    subtotal_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,
    shipping_cents BIGINT UNSIGNED DEFAULT 0,
    tax_cents BIGINT UNSIGNED DEFAULT 0,
    total_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'NZD',
    shipping_address_id BIGINT UNSIGNED,
    billing_address JSON,
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(200),
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    notes TEXT,
    internal_notes TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    variant_name VARCHAR(200),
    sku VARCHAR(100),
    quantity INT UNSIGNED NOT NULL,
    unit_price_cents BIGINT UNSIGNED NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    total_cents BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor_id BIGINT UNSIGNED,
    reason TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Payment Tables
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    order_id BIGINT UNSIGNED NOT NULL,
    type ENUM('deposit','full','partial','refund') DEFAULT 'full',
    method ENUM('bank_transfer','online','manual') DEFAULT 'bank_transfer',
    status ENUM('pending','processing','completed','failed','cancelled','needs_review') DEFAULT 'pending',
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency VARCHAR(3) DEFAULT 'NZD',
    receipt_url VARCHAR(500),
    receipt_filename VARCHAR(255),
    bank_reference VARCHAR(200),
    notes TEXT,
    confirmed_by BIGINT UNSIGNED,
    confirmed_at TIMESTAMP NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Commission Tables
-- ============================================

CREATE TABLE IF NOT EXISTS commissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    commission_number VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    status ENUM('draft','submitted','needs_info','quoted','deposit_pending','deposit_paid','scheduled','design','materials','production','customer_review','qc','final_payment_pending','final_payment_paid','ready_to_ship','shipped','delivered','completed','cancelled','disputed') DEFAULT 'draft',
    character_name VARCHAR(200),
    character_species VARCHAR(100),
    style VARCHAR(100),
    size VARCHAR(50),
    features JSON,
    budget_min_cents BIGINT UNSIGNED,
    budget_max_cents BIGINT UNSIGNED,
    deadline_date DATE,
    description TEXT,
    reference_files JSON,
    copyright_declaration TEXT,
    cultural_flag BOOLEAN DEFAULT FALSE,
    cultural_notes TEXT,
    maker_id BIGINT UNSIGNED,
    estimated_start DATE,
    estimated_end DATE,
    internal_notes TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (maker_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_commissions_user (user_id),
    INDEX idx_commissions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    commission_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor_id BIGINT UNSIGNED,
    reason TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    commission_id BIGINT UNSIGNED NOT NULL,
    version INT DEFAULT 1,
    status ENUM('draft','sent','accepted','rejected','superseded','expired') DEFAULT 'draft',
    items JSON,
    subtotal_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,
    tax_cents BIGINT UNSIGNED DEFAULT 0,
    total_cents BIGINT UNSIGNED NOT NULL DEFAULT 0,
    deposit_percent INT DEFAULT 50,
    deposit_amount_cents BIGINT UNSIGNED DEFAULT 0,
    estimated_days INT,
    terms TEXT,
    expires_at TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- After-Sales / Support Ticket Tables
-- ============================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED,
    commission_id BIGINT UNSIGNED,
    type ENUM('after_sales','inquiry','complaint','return','refund','repair','replacement') NOT NULL,
    status ENUM('open','in_progress','waiting_customer','waiting_internal','resolved','closed') DEFAULT 'open',
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    subject VARCHAR(500) NOT NULL,
    assigned_to BIGINT UNSIGNED,
    sla_due_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tickets_status (status),
    INDEX idx_tickets_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    attachments JSON,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Audit Log (immutable)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id BIGINT UNSIGNED,
    before_state JSON,
    after_state JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    request_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_resource (resource_type, resource_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CMS / Content Pages
-- ============================================

CREATE TABLE IF NOT EXISTS pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(200) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT,
    status ENUM('draft','published','archived') DEFAULT 'draft',
    version INT DEFAULT 1,
    published_at TIMESTAMP NULL,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Commission Config (open/capacity)
-- ============================================

CREATE TABLE IF NOT EXISTS commission_config (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status ENUM('open','closed','waitlist') DEFAULT 'closed',
    max_slots INT DEFAULT 0,
    booked_slots INT DEFAULT 0,
    waitlist_enabled BOOLEAN DEFAULT FALSE,
    min_deposit_percent INT DEFAULT 50,
    quote_validity_days INT DEFAULT 14,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Seed Data: Permissions
-- ============================================

INSERT INTO permissions (code, name, description, module) VALUES
-- Auth
('auth.login', 'Login', 'Login to system', 'auth'),
('auth.register', 'Register', 'Register new account', 'auth'),

-- Products
('products.read', 'View Products', 'View product list and details', 'products'),
('products.create', 'Create Product', 'Create new product', 'products'),
('products.update', 'Update Product', 'Update product details', 'products'),
('products.delete', 'Delete Product', 'Delete a product', 'products'),
('products.publish', 'Publish Product', 'Publish/unpublish product', 'products'),

-- Categories
('categories.read', 'View Categories', 'View categories', 'categories'),
('categories.create', 'Create Category', 'Create category', 'categories'),
('categories.update', 'Update Category', 'Update category', 'categories'),
('categories.delete', 'Delete Category', 'Delete category', 'categories'),

-- Orders
('orders.read_own', 'View Own Orders', 'View own orders', 'orders'),
('orders.read', 'View All Orders', 'View all orders', 'orders'),
('orders.update', 'Update Orders', 'Update order status', 'orders'),
('orders.ship', 'Ship Orders', 'Ship orders', 'orders'),

-- Payments
('payments.read_own', 'View Own Payments', 'View own payments', 'payments'),
('payments.read', 'View All Payments', 'View all payments', 'payments'),
('payments.confirm', 'Confirm Payment', 'Confirm bank transfer', 'payments'),
('payments.refund', 'Refund Payment', 'Process refunds', 'payments'),

-- Commissions
('commissions.read_own', 'View Own Commissions', 'View own commissions', 'commissions'),
('commissions.read', 'View All Commissions', 'View all commissions', 'commissions'),
('commissions.create', 'Create Commission', 'Submit commission request', 'commissions'),
('commissions.update', 'Update Commission', 'Update commission details', 'commissions'),
('commissions.assign', 'Assign Maker', 'Assign maker to commission', 'commissions'),

-- Quotes
('quotes.read', 'View Quotes', 'View quotes', 'quotes'),
('quotes.create', 'Create Quote', 'Create and send quotes', 'quotes'),
('quotes.update', 'Update Quote', 'Update quote', 'quotes'),
('quotes.accept', 'Accept Quote', 'Accept quote (customer)', 'quotes'),

-- Support
('tickets.read', 'View Tickets', 'View support tickets', 'support'),
('tickets.create', 'Create Ticket', 'Create support ticket', 'support'),
('tickets.update', 'Update Tickets', 'Update ticket status', 'support'),

-- Users
('users.read', 'View Users', 'View user list', 'users'),
('users.update', 'Update Users', 'Update user details', 'users'),
('users.suspend', 'Suspend Users', 'Suspend user accounts', 'users'),

-- Roles & RBAC
('roles.read', 'View Roles', 'View roles', 'rbac'),
('roles.create', 'Create Role', 'Create roles', 'rbac'),
('roles.update', 'Update Role', 'Update roles', 'rbac'),
('roles.delete', 'Delete Role', 'Delete roles', 'rbac'),
('roles.assign', 'Assign Roles', 'Assign roles to users', 'rbac'),

-- Audit
('audit.read', 'View Audit Logs', 'View audit trail', 'audit'),

-- CMS
('pages.read', 'View Pages', 'View content pages', 'cms'),
('pages.create', 'Create Page', 'Create content pages', 'cms'),
('pages.update', 'Update Page', 'Update content pages', 'cms'),
('pages.delete', 'Delete Page', 'Delete content pages', 'cms'),
('pages.publish', 'Publish Page', 'Publish content pages', 'cms');

-- ============================================
-- Seed Data: Roles
-- ============================================

INSERT INTO roles (code, name, description, is_system) VALUES
('super_admin', 'Super Admin', 'Full system access', TRUE),
('admin', 'Admin', 'Administrative access', TRUE),
('customer_service', 'Customer Service', 'Customer support and quotes', TRUE),
('maker', 'Maker', 'Commission production', TRUE),
('customer', 'Customer', 'Standard customer', TRUE);

-- ============================================
-- Seed Data: Role-Permission mappings
-- ============================================

-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r, permissions p
WHERE r.code = 'super_admin';

-- Admin gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r, permissions p
WHERE r.code = 'admin'
AND p.code NOT IN ('roles.create', 'roles.delete', 'roles.assign')
AND p.code NOT LIKE 'roles.%';

-- Customer Service
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'all'
FROM roles r, permissions p
WHERE r.code = 'customer_service'
AND p.code IN (
    'products.read', 'categories.read',
    'orders.read', 'orders.update',
    'payments.read', 'payments.confirm',
    'commissions.read', 'commissions.update',
    'quotes.read', 'quotes.create', 'quotes.update',
    'tickets.read', 'tickets.create', 'tickets.update',
    'users.read', 'pages.read'
);

-- Maker
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'assigned'
FROM roles r, permissions p
WHERE r.code = 'maker'
AND p.code IN (
    'products.read', 'categories.read',
    'commissions.read', 'commissions.update',
    'quotes.read',
    'pages.read'
);

-- Customer
INSERT INTO role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'own'
FROM roles r, permissions p
WHERE r.code = 'customer'
AND p.code IN (
    'products.read', 'categories.read',
    'orders.read_own',
    'payments.read_own',
    'commissions.read_own', 'commissions.create',
    'quotes.accept',
    'tickets.create',
    'auth.login', 'auth.register'
);

-- ============================================
-- Seed Data: Default admin user
-- Password: admin123 (bcrypt)
-- ============================================

INSERT INTO users (email, password_hash, full_name, status, email_verified_at)
VALUES ('admin@fursuit.nz', '$2a$10$XRyZ9guJ7kitMtCw/Zgw8u3ltMdNsxcchdIK6oxSRjLIzrEqqKHYe', 'System Admin', 'active', NOW());

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@fursuit.nz' AND r.code = 'super_admin';

-- ============================================
-- Seed Data: Default commission config
-- ============================================

INSERT INTO commission_config (status, max_slots, booked_slots, waitlist_enabled, min_deposit_percent, quote_validity_days)
VALUES ('open', 5, 0, TRUE, 50, 14);

-- ============================================
-- Seed Data: Sample categories
-- ============================================

INSERT INTO categories (name, slug, description, sort_order) VALUES
('Fursuit Heads', 'fursuit-heads', 'Complete fursuit head pieces', 1),
('Kemono Heads', 'kemono-heads', 'Japanese kemono style heads', 2),
('Accessories', 'accessories', 'Fursuit accessories and add-ons', 3),
('Repair & Restoration', 'repair-restoration', 'Repair and restoration services', 4),
('Commission Slots', 'commission-slots', 'Custom commission availability', 5);
