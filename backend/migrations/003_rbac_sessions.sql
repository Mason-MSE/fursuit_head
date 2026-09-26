-- V4 RBAC alignment. Forward-only: revocations and token invalidation cannot be reversed safely.
-- Existing plaintext verification links are invalidated; request fresh links.
UPDATE email_verifications SET used_at=COALESCE(used_at,UTC_TIMESTAMP()), token=SHA2(token,256) WHERE LENGTH(token)<>64;
UPDATE refresh_tokens SET revoked_at=UTC_TIMESTAMP() WHERE revoked_at IS NULL;
INSERT IGNORE INTO permissions(code,name,module) VALUES('auth.admin_login','auth.admin_login','auth');
INSERT IGNORE INTO permissions(code,name,module) VALUES('commissions.read_assigned','commissions.read_assigned','commissions');
INSERT IGNORE INTO permissions(code,name,module) VALUES('milestones.update_assigned','milestones.update_assigned','milestones');
INSERT IGNORE INTO permissions(code,name,module) VALUES('reports.read','reports.read','reports');
INSERT IGNORE INTO permissions(code,name,module) VALUES('inventory.read','inventory.read','inventory');
INSERT IGNORE INTO permissions(code,name,module) VALUES('inventory.adjust','inventory.adjust','inventory');
INSERT IGNORE INTO permissions(code,name,module) VALUES('settings.read','settings.read','settings');
INSERT IGNORE INTO permissions(code,name,module) VALUES('settings.update_business','settings.update_business','settings');
INSERT IGNORE INTO permissions(code,name,module) VALUES('cultural_reviews.read','cultural_reviews.read','cultural_reviews');
INSERT IGNORE INTO permissions(code,name,module) VALUES('cultural_reviews.approve','cultural_reviews.approve','cultural_reviews');
INSERT IGNORE INTO permissions(code,name,module) VALUES('cultural_reviews.reject','cultural_reviews.reject','cultural_reviews');
INSERT IGNORE INTO permissions(code,name,module) VALUES('privacy_requests.manage','privacy_requests.manage','privacy_requests');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('support','Support',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='support';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='support' AND p.code IN ('auth.admin_login','products.read','orders.read','orders.update','commissions.read','commissions.update','quotes.read','quotes.create','quotes.update','tickets.read','tickets.update','users.read','pages.read');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('maker','Maker',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='maker';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'assigned' FROM roles r CROSS JOIN permissions p WHERE r.code='maker' AND p.code IN ('auth.admin_login','products.read','commissions.read_assigned','milestones.update_assigned');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('warehouse','Warehouse',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='warehouse';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='warehouse' AND p.code IN ('auth.admin_login','products.read','orders.read','orders.update','orders.ship','inventory.read','inventory.adjust');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('finance','Finance',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='finance';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='finance' AND p.code IN ('auth.admin_login','payments.read','payments.confirm','payments.refund','orders.read','reports.read');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('cultural_reviewer','Cultural Reviewer',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='cultural_reviewer';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='cultural_reviewer' AND p.code IN ('auth.admin_login','cultural_reviews.read','cultural_reviews.approve','cultural_reviews.reject');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('privacy_officer','Privacy Officer',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='privacy_officer';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='privacy_officer' AND p.code IN ('auth.admin_login','privacy_requests.manage','audit.read');
INSERT IGNORE INTO roles(code,name,is_system) VALUES('content_editor','Content Editor',TRUE);
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='content_editor';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='content_editor' AND p.code IN ('auth.admin_login','products.read','products.create','products.update','pages.read','pages.create','pages.update');
-- Preserve legacy support membership with the corrected support privileges.
DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='customer_service';
INSERT INTO role_permissions(role_id,permission_id,scope) SELECT legacy.id,rp.permission_id,rp.scope FROM roles legacy JOIN roles support ON support.code='support' JOIN role_permissions rp ON rp.role_id=support.id WHERE legacy.code='customer_service';
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='super_admin';
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope) SELECT r.id,p.id,'all' FROM roles r CROSS JOIN permissions p WHERE r.code='admin' AND p.code IN ('auth.admin_login','reports.read','settings.read','settings.update_business','roles.read','roles.assign');

ALTER TABLE users MODIFY status ENUM('pending_email','active','suspended','locked','deleted') DEFAULT 'pending_email';
