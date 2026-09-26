-- Migration 002: Add new tables and alter existing ones

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- Add columns to users table (safe checks)
-- ============================================

SET @dbname = DATABASE();

-- failed_login_attempts
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns
WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'failed_login_attempts';
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0 AFTER marketing_consent',
    'SELECT "Column failed_login_attempts already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- locked_until
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns
WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'locked_until';
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL AFTER failed_login_attempts',
    'SELECT "Column locked_until already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- login_provider
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns
WHERE table_schema = @dbname AND table_name = 'users' AND column_name = 'login_provider';
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN login_provider VARCHAR(20) DEFAULT ''local'' AFTER locked_until',
    'SELECT "Column login_provider already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- superseded_by on quotes
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns
WHERE table_schema = @dbname AND table_name = 'quotes' AND column_name = 'superseded_by';
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE quotes ADD COLUMN superseded_by BIGINT UNSIGNED NULL AFTER rejection_reason',
    'SELECT "Column superseded_by already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- Refresh Tokens (server-side sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_token_hash (token_hash),
    INDEX idx_refresh_user (user_id),
    INDEX idx_refresh_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Security Log
-- ============================================

CREATE TABLE IF NOT EXISTS security_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    event VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_seclog_user (user_id),
    INDEX idx_seclog_event (event),
    INDEX idx_seclog_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Commission Milestones
-- ============================================

CREATE TABLE IF NOT EXISTS commission_milestones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    commission_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    due_date TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_milestone_commission (commission_id),
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Commission Change Requests
-- ============================================

CREATE TABLE IF NOT EXISTS commission_change_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    commission_id BIGINT UNSIGNED NOT NULL,
    requested_by BIGINT UNSIGNED NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_changereq_commission (commission_id),
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Refund Records
-- ============================================

CREATE TABLE IF NOT EXISTS refund_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    reason TEXT,
    reference VARCHAR(200),
    processed_by BIGINT UNSIGNED NULL,
    processed_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'pending',
    audit_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_refund_payment (payment_id),
    INDEX idx_refund_order (order_id),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Email Outbox
-- ============================================

CREATE TABLE IF NOT EXISTS email_outboxes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `to` VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    retries INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_error TEXT,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emailout_status (status),
    INDEX idx_emailout_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Idempotency Records
-- ============================================

CREATE TABLE IF NOT EXISTS idempotency_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL,
    response JSON,
    user_id BIGINT UNSIGNED NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_idempotency_key (`key`),
    INDEX idx_idemp_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Page Versions (CMS)
-- ============================================

CREATE TABLE IF NOT EXISTS page_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    page_id BIGINT UNSIGNED NOT NULL,
    version INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    changed_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pagever_page (page_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
