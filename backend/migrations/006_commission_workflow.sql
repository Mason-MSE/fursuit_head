-- Forward-only migration to V4 workflow. Review migrated active commissions before resuming.
ALTER TABLE commissions MODIFY status VARCHAR(50) NOT NULL DEFAULT 'draft';
ALTER TABLE commissions ADD COLUMN cultural_decision VARCHAR(30) NOT NULL DEFAULT '', ADD COLUMN deposit_received_cents BIGINT UNSIGNED NOT NULL DEFAULT 0, ADD COLUMN final_received_cents BIGINT UNSIGNED NOT NULL DEFAULT 0, ADD COLUMN tracking_number VARCHAR(200) NOT NULL DEFAULT '', ADD COLUMN revision_count INT NOT NULL DEFAULT 0;
UPDATE commissions SET status='screening' WHERE status='reviewing';
UPDATE commissions SET status='design_review' WHERE status='design';
UPDATE commissions SET status='quality_check' WHERE status='qc';
UPDATE commissions SET status='on_hold' WHERE status IN ('deposit_paid','final_payment_paid','disputed','in_progress','deposit_received','stage_review','stage_approved','final_review','revision_requested','delivered');
CREATE TABLE commission_payments(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, commission_id BIGINT UNSIGNED NOT NULL, type VARCHAR(20) NOT NULL, amount_cents BIGINT UNSIGNED NOT NULL, reference VARCHAR(200) NOT NULL, confirmed_by BIGINT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY one_payment_stage(commission_id,type), FOREIGN KEY(commission_id) REFERENCES commissions(id), FOREIGN KEY(confirmed_by) REFERENCES users(id));
