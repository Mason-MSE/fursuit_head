-- Additive migration; rollback by disabling new uploads, retain evidence files.
CREATE TABLE stored_files (
 id VARCHAR(36) PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(255) NOT NULL, path VARCHAR(1000) NOT NULL,
 mime VARCHAR(100) NOT NULL, sha256 CHAR(64) NOT NULL, size BIGINT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_stored_files_user(user_id), FOREIGN KEY(user_id) REFERENCES users(id)
);
